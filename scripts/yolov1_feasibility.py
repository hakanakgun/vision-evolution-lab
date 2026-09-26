#!/usr/bin/env python3
"""Reproducible YOLOv1 export feasibility check for browser use.

This script intentionally keeps conversion out of the browser product path.
It downloads a pinned LibreYOLO checkpoint, exports fixed-shape ONNX, attempts
dynamic INT8 weight quantization, and validates both artifacts with CPU ORT.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import sys
import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from huggingface_hub import hf_hub_download

HF_REPO = "LibreYOLO/LibreYOLO1b"
HF_REVISION = "4349c7a823974cea5d29c5f306a99bcf441ef437"
HF_FILENAME = "LibreYOLO1b.pt"
LIBREYOLO_REVISION = "c25f6dffb521ea60bc0f63ae3dffb168a7edc466"
INPUT_SHAPE = [1, 3, 448, 448]

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "yolov1-feasibility"
OUT.mkdir(parents=True, exist_ok=True)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def mib(size: int) -> float:
    return size / 1024 / 1024


def validate_ort(path: Path) -> dict:
    started = time.perf_counter()
    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    init_s = time.perf_counter() - started
    input_meta = session.get_inputs()[0]
    feeds = {input_meta.name: np.zeros(INPUT_SHAPE, dtype=np.float32)}
    run_started = time.perf_counter()
    outputs = session.run(None, feeds)
    run_s = time.perf_counter() - run_started
    return {
        "input": {"name": input_meta.name, "shape": input_meta.shape, "type": input_meta.type},
        "outputs": [
            {"name": meta.name, "shape": meta.shape, "type": meta.type}
            for meta in session.get_outputs()
        ],
        "actual_output_shapes": [list(value.shape) for value in outputs],
        "session_init_s": round(init_s, 3),
        "zero_input_inference_s": round(run_s, 3),
    }


def main() -> None:
    report: dict = {
        "source": {
            "hf_repo": HF_REPO,
            "hf_revision": HF_REVISION,
            "hf_filename": HF_FILENAME,
            "libreyolo_revision": LIBREYOLO_REVISION,
        },
        "input_shape": INPUT_SHAPE,
        "artifacts": {},
    }

    print("Downloading pinned LibreYOLO1b checkpoint…", flush=True)
    pt_path = Path(
        hf_hub_download(
            repo_id=HF_REPO,
            filename=HF_FILENAME,
            revision=HF_REVISION,
        )
    )
    report["source"]["checkpoint_bytes"] = pt_path.stat().st_size
    report["source"]["checkpoint_sha256"] = sha256(pt_path)
    print(
        f"Checkpoint: {mib(pt_path.stat().st_size):.1f} MiB · "
        f"sha256={report['source']['checkpoint_sha256']}",
        flush=True,
    )

    from libreyolo import LibreYOLO

    print("Loading checkpoint…", flush=True)
    model = LibreYOLO(str(pt_path))
    print("Exporting fixed 448x448 FP32 ONNX…", flush=True)
    export_started = time.perf_counter()
    exported = Path(
        model.export(
            format="onnx",
            imgsz=448,
            dynamic=False,
            simplify=False,
            opset=13,
        )
    ).resolve()
    report["export_seconds"] = round(time.perf_counter() - export_started, 3)
    if not exported.exists():
        raise FileNotFoundError(f"LibreYOLO returned missing export: {exported}")

    fp32 = OUT / "yolov1-voc20-fp32.onnx"
    shutil.copy2(exported, fp32)
    report["artifacts"]["fp32"] = {
        "bytes": fp32.stat().st_size,
        "sha256": sha256(fp32),
        "ort": validate_ort(fp32),
    }
    print(f"FP32 ONNX: {mib(fp32.stat().st_size):.1f} MiB", flush=True)

    int8 = OUT / "yolov1-voc20-int8.onnx"
    try:
        from onnxruntime.quantization import QuantType, quantize_dynamic

        print("Attempting dynamic INT8 weight quantization…", flush=True)
        quant_started = time.perf_counter()
        quantize_dynamic(
            model_input=str(fp32),
            model_output=str(int8),
            weight_type=QuantType.QInt8,
            per_channel=True,
        )
        report["int8_quantize_seconds"] = round(time.perf_counter() - quant_started, 3)
        report["artifacts"]["int8"] = {
            "bytes": int8.stat().st_size,
            "sha256": sha256(int8),
            "ort": validate_ort(int8),
        }
        print(f"INT8 ONNX: {mib(int8.stat().st_size):.1f} MiB", flush=True)
    except Exception as error:
        report["int8_error"] = f"{type(error).__name__}: {error}"
        print(f"INT8 quantization failed: {report['int8_error']}", file=sys.stderr, flush=True)
        if int8.exists():
            int8.unlink()

    report_path = OUT / "report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
