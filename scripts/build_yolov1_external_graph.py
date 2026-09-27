#!/usr/bin/env python3
"""Build a small YOLOv1 ONNX graph that references the existing canonical ONNX bytes as external data.

The canonical 541 MB model is already split into checksum-pinned GitHub Pages chunks.
This script reconstructs those exact bytes for build-time validation, locates large
initializer raw-data payloads inside that canonical file, and emits a small graph whose
external-data offsets point back into the same canonical byte stream. No second 541 MB
weight artifact is created or committed.
"""

from __future__ import annotations

import gc
import hashlib
import json
import mmap
import shutil
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
from onnx import TensorProto, external_data_helper

ROOT = Path(__file__).resolve().parents[1]
PARTS_DIR = ROOT / "assets" / "models" / "yolov1"
WORK_DIR = ROOT / "artifacts" / "yolov1-external-data"
PUBLISH_DIR = PARTS_DIR
CANONICAL_NAME = "yolov1-voc20-int8.onnx"
GRAPH_NAME = "yolov1-voc20-int8-external.onnx"
MANIFEST_NAME = "external-data-manifest.json"
CANONICAL_BYTES = 541_358_513
CANONICAL_SHA256 = "122bf7462747d0cf140525ed6c1d90424d64cc10b8d96cf17905343ce0306d49"
MIN_EXTERNAL_BYTES = 64 * 1024
MAX_GRAPH_BYTES = 32 * 1024 * 1024
INPUT_SHAPE = [1, 3, 448, 448]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def reconstruct_canonical(target: Path) -> list[dict]:
    parts = sorted(PARTS_DIR.glob("part-*.bin"))
    if not parts:
        raise FileNotFoundError("YOLOv1 Pages chunks are missing")
    target.parent.mkdir(parents=True, exist_ok=True)
    metadata: list[dict] = []
    with target.open("wb") as output:
        for part in parts:
            size = part.stat().st_size
            digest = sha256(part)
            metadata.append({"file": part.name, "bytes": size, "sha256": digest})
            with part.open("rb") as source:
                shutil.copyfileobj(source, output, 8 * 1024 * 1024)
    if target.stat().st_size != CANONICAL_BYTES:
        raise RuntimeError(
            f"canonical size mismatch: expected {CANONICAL_BYTES}, got {target.stat().st_size}"
        )
    digest = sha256(target)
    if digest != CANONICAL_SHA256:
        raise RuntimeError(f"canonical SHA-256 mismatch: {digest}")
    return metadata


def find_unique_offset(blob: mmap.mmap, payload: bytes) -> int | None:
    first = blob.find(payload)
    if first < 0:
        return None
    if blob.find(payload, first + 1) >= 0:
        return None
    return first


def build_external_graph(canonical: Path, graph: Path) -> dict:
    model = onnx.load_model(canonical, load_external_data=False)
    externalized = []
    skipped = []
    with canonical.open("rb") as raw_file, mmap.mmap(
        raw_file.fileno(), 0, access=mmap.ACCESS_READ
    ) as blob:
        for tensor in model.graph.initializer:
            payload = tensor.raw_data
            size = len(payload)
            if size < MIN_EXTERNAL_BYTES:
                continue
            offset = find_unique_offset(blob, payload)
            if offset is None:
                skipped.append({"name": tensor.name, "bytes": size})
                continue
            tensor.ClearField("external_data")
            external_data_helper.set_external_data(
                tensor,
                location=CANONICAL_NAME,
                offset=offset,
                length=size,
            )
            tensor.ClearField("raw_data")
            tensor.data_location = TensorProto.EXTERNAL
            externalized.append({"name": tensor.name, "offset": offset, "bytes": size})

    graph.parent.mkdir(parents=True, exist_ok=True)
    onnx.save_model(model, graph)
    graph_bytes = graph.stat().st_size
    if graph_bytes > MAX_GRAPH_BYTES:
        raise RuntimeError(
            f"external graph remains too large: {graph_bytes} bytes > {MAX_GRAPH_BYTES}"
        )
    onnx.checker.check_model(str(graph), full_check=True)
    return {
        "externalizedTensors": len(externalized),
        "externalizedBytes": sum(item["bytes"] for item in externalized),
        "skippedLargeTensors": skipped,
        "graphBytes": graph_bytes,
        "graphSha256": sha256(graph),
    }


def run_ort(path: Path) -> np.ndarray:
    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    try:
        if [item.name for item in session.get_inputs()] != ["images"]:
            raise RuntimeError("YOLOv1 input contract changed")
        if [item.name for item in session.get_outputs()] != ["output"]:
            raise RuntimeError("YOLOv1 output contract changed")
        rng = np.random.default_rng(20260927)
        input_data = rng.random(INPUT_SHAPE, dtype=np.float32)
        output = session.run(["output"], {"images": input_data})[0]
        if list(output.shape) != [1, 24, 98] or not np.isfinite(output).all():
            raise RuntimeError(f"unexpected YOLOv1 output shape/content: {output.shape}")
        return output.copy()
    finally:
        del session
        gc.collect()


def main() -> None:
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    PUBLISH_DIR.mkdir(parents=True, exist_ok=True)
    canonical = WORK_DIR / CANONICAL_NAME
    graph = WORK_DIR / GRAPH_NAME

    print("Reconstructing canonical YOLOv1 from existing Pages chunks...", flush=True)
    parts = reconstruct_canonical(canonical)
    print("Building external-data alias graph...", flush=True)
    build = build_external_graph(canonical, graph)

    if build["externalizedBytes"] < CANONICAL_BYTES * 0.80:
        raise RuntimeError(
            "external-data graph did not move enough initializer bytes out of the protobuf"
        )

    print("Comparing canonical and external-data graphs with CPU ORT...", flush=True)
    baseline = run_ort(canonical)
    candidate = run_ort(graph)
    np.testing.assert_allclose(candidate, baseline, rtol=0, atol=0)

    published_graph = PUBLISH_DIR / GRAPH_NAME
    shutil.copy2(graph, published_graph)
    manifest = {
        "format": 1,
        "modelSha256": CANONICAL_SHA256,
        "modelBytes": CANONICAL_BYTES,
        "graph": {
            "url": f"assets/models/yolov1/{GRAPH_NAME}",
            "bytes": published_graph.stat().st_size,
            "sha256": sha256(published_graph),
        },
        "externalData": {
            "path": CANONICAL_NAME,
            "externalizedTensors": build["externalizedTensors"],
            "externalizedBytes": build["externalizedBytes"],
        },
        "build": {
            "minExternalTensorBytes": MIN_EXTERNAL_BYTES,
            "canonicalReconstructedFrom": parts,
            "skippedLargeTensors": build["skippedLargeTensors"],
            "validation": "CPU ORT deterministic-input output equality",
        },
    }
    (PUBLISH_DIR / MANIFEST_NAME).write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    report = {
        "canonical": {
            "bytes": CANONICAL_BYTES,
            "sha256": CANONICAL_SHA256,
        },
        "graph": manifest["graph"],
        "externalData": manifest["externalData"],
        "skippedLargeTensors": build["skippedLargeTensors"],
        "status": "passed",
    }
    (WORK_DIR / "report.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
