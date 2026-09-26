#!/usr/bin/env python3
"""Build smaller YOLOv1 browser candidates for the iOS/WebKit memory investigation.

This is an experiment-only script. It regenerates the pinned full YOLOv1 export,
then compares the existing dynamic-INT8 path with:
  1) static UINT8/INT8 QOperator quantization across the CNN/FC graph;
  2) 4-bit weight-only MatMul quantization where the exported graph permits it.

No candidate is published by this script. The workflow validates each output on
native CPU ORT and then separately with onnxruntime-web/WASM.
"""

from __future__ import annotations

import gc
import hashlib
import json
import shutil
import time
from collections import Counter
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
from PIL import Image
from huggingface_hub import hf_hub_download
from onnxruntime.quantization import (
    CalibrationDataReader,
    CalibrationMethod,
    QuantFormat,
    QuantType,
    quantize_dynamic,
    quantize_static,
)

HF_REPO = "LibreYOLO/LibreYOLO1b"
HF_REVISION = "4349c7a823974cea5d29c5f306a99bcf441ef437"
HF_FILENAME = "LibreYOLO1b.pt"
LIBREYOLO_REVISION = "c25f6dffb521ea60bc0f63ae3dffb168a7edc466"
INPUT_SHAPE = [1, 3, 448, 448]
VOC20 = [
    "aeroplane", "bicycle", "bird", "boat", "bottle", "bus", "car", "cat", "chair", "cow",
    "diningtable", "dog", "horse", "motorbike", "person", "pottedplant", "sheep", "sofa", "train", "tvmonitor",
]
REQUIRED_GOLDEN = {"dog", "bicycle", "car"}

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts" / "yolov1-compact"
OUT.mkdir(parents=True, exist_ok=True)
CALIBRATION_IMAGES = [
    ROOT / "assets" / "benchmark" / "coco-val-000000397133.jpg",
    ROOT / "assets" / "benchmark" / "coco-val-000000017029.jpg",
    ROOT / "assets" / "benchmark" / "coco-val-000000013348.jpg",
    ROOT / "assets" / "benchmark" / "coco-val-000000000872.jpg",
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def mib(size: int) -> float:
    return size / 1024 / 1024


def preprocess_image(path: Path) -> np.ndarray:
    with Image.open(path) as image:
        rgb = image.convert("RGB").resize((448, 448), Image.Resampling.BILINEAR)
        array = np.asarray(rgb, dtype=np.float32) / 255.0
    return np.transpose(array, (2, 0, 1))[None, ...]


def box_iou(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> float:
    top, left = max(a[0], b[0]), max(a[1], b[1])
    bottom, right = min(a[2], b[2]), min(a[3], b[3])
    intersection = max(0.0, bottom - top) * max(0.0, right - left)
    area_a = max(0.0, a[2] - a[0]) * max(0.0, a[3] - a[1])
    area_b = max(0.0, b[2] - b[0]) * max(0.0, b[3] - b[1])
    return intersection / max(1e-12, area_a + area_b - intersection)


def decode(output: np.ndarray, confidence: float = 0.2, nms: float = 0.45) -> list[dict]:
    data = np.asarray(output, dtype=np.float32).reshape(24, 98)
    candidates: list[dict] = []
    for prediction in range(98):
        x1, y1, x2, y2 = (
            float(data[0, prediction]),
            float(data[1, prediction]),
            float(data[2, prediction]),
            float(data[3, prediction]),
        )
        scores = data[4:, prediction]
        class_id = int(np.argmax(scores))
        score = float(scores[class_id])
        if not np.isfinite([x1, y1, x2, y2, score]).all() or score < confidence:
            continue
        box = (
            max(0.0, min(1.0, y1 / 448.0)),
            max(0.0, min(1.0, x1 / 448.0)),
            max(0.0, min(1.0, y2 / 448.0)),
            max(0.0, min(1.0, x2 / 448.0)),
        )
        if box[2] <= box[0] or box[3] <= box[1]:
            continue
        candidates.append({"class_id": class_id, "label": VOC20[class_id], "score": score, "box": box})
    candidates.sort(key=lambda item: item["score"], reverse=True)
    kept: list[dict] = []
    for item in candidates:
        if all(other["class_id"] != item["class_id"] or box_iou(other["box"], item["box"]) <= nms for other in kept):
            kept.append(item)
        if len(kept) >= 100:
            break
    return kept


def graph_stats(path: Path) -> dict:
    model = onnx.load(str(path), load_external_data=False)
    ops = Counter(node.op_type for node in model.graph.node)
    initializer_bytes = 0
    dtypes = Counter()
    for tensor in model.graph.initializer:
        if tensor.raw_data:
            size = len(tensor.raw_data)
        else:
            size = 0
            if tensor.float_data:
                size += len(tensor.float_data) * 4
            if tensor.int32_data:
                size += len(tensor.int32_data) * 4
            if tensor.int64_data:
                size += len(tensor.int64_data) * 8
        initializer_bytes += size
        dtypes[str(tensor.data_type)] += 1
    return {
        "op_counts": dict(sorted(ops.items())),
        "initializer_bytes_in_proto": initializer_bytes,
        "initializer_dtype_counts": dict(sorted(dtypes.items())),
        "opset": [{"domain": item.domain, "version": item.version} for item in model.opset_import],
    }


def validate_candidate(path: Path, dog: Path) -> dict:
    session_options = ort.SessionOptions()
    session_options.enable_cpu_mem_arena = False
    session_options.enable_mem_pattern = False
    started = time.perf_counter()
    session = ort.InferenceSession(str(path), sess_options=session_options, providers=["CPUExecutionProvider"])
    init_s = time.perf_counter() - started
    try:
        input_meta = session.get_inputs()[0]
        zero = np.zeros(INPUT_SHAPE, dtype=np.float32)
        run_started = time.perf_counter()
        zero_output = session.run(None, {input_meta.name: zero})[0]
        zero_s = time.perf_counter() - run_started
        dog_output = session.run(None, {input_meta.name: preprocess_image(dog)})[0]
        detections = decode(dog_output)
        labels = sorted({item["label"] for item in detections})
        return {
            "input": {"name": input_meta.name, "shape": input_meta.shape, "type": input_meta.type},
            "outputs": [
                {"name": meta.name, "shape": meta.shape, "type": meta.type}
                for meta in session.get_outputs()
            ],
            "zero_output_shape": list(zero_output.shape),
            "session_init_s": round(init_s, 3),
            "zero_input_inference_s": round(zero_s, 3),
            "dog_labels": labels,
            "golden_required_present": sorted(REQUIRED_GOLDEN & set(labels)),
            "golden_pass": REQUIRED_GOLDEN.issubset(labels),
        }
    finally:
        del session
        gc.collect()


class ImageCalibrationReader(CalibrationDataReader):
    def __init__(self, paths: list[Path]) -> None:
        self.paths = paths
        self.index = 0

    def get_next(self):
        if self.index >= len(self.paths):
            return None
        path = self.paths[self.index]
        self.index += 1
        return {"images": preprocess_image(path)}

    def rewind(self):
        self.index = 0


def record(report: dict, key: str, path: Path, dog: Path, started: float) -> None:
    report["artifacts"][key] = {
        "file": path.name,
        "bytes": path.stat().st_size,
        "mib": round(mib(path.stat().st_size), 1),
        "sha256": sha256(path),
        "build_s": round(time.perf_counter() - started, 3),
        "graph": graph_stats(path),
        "ort": validate_candidate(path, dog),
    }
    print(
        f"{key}: {report['artifacts'][key]['mib']} MiB · "
        f"golden={report['artifacts'][key]['ort']['dog_labels']}",
        flush=True,
    )


def main() -> None:
    report: dict = {
        "purpose": "YOLOv1 compact browser candidates for iOS/WebKit memory-pressure mitigation",
        "source": {
            "hf_repo": HF_REPO,
            "hf_revision": HF_REVISION,
            "hf_filename": HF_FILENAME,
            "libreyolo_revision": LIBREYOLO_REVISION,
        },
        "calibration_images": [str(path.relative_to(ROOT)) for path in CALIBRATION_IMAGES],
        "artifacts": {},
        "errors": {},
    }

    from libreyolo import LibreYOLO

    print("Downloading pinned YOLOv1 checkpoint…", flush=True)
    pt_path = Path(
        hf_hub_download(repo_id=HF_REPO, filename=HF_FILENAME, revision=HF_REVISION)
    )
    report["source"]["checkpoint_bytes"] = pt_path.stat().st_size
    report["source"]["checkpoint_sha256"] = sha256(pt_path)

    dog = ROOT / "_libreyolo" / "tests" / "fixtures" / "dog.jpg"
    if not dog.exists():
        raise FileNotFoundError(f"Pinned LibreYOLO dog fixture is missing: {dog}")

    print("Loading pinned checkpoint and checking native golden…", flush=True)
    model = LibreYOLO(str(pt_path))
    native = model.predict(str(dog), conf=0.2)
    native = native[0] if isinstance(native, list) else native
    native_labels = sorted({model.names[int(value)] for value in native.boxes.cls})
    report["native_golden_labels"] = native_labels
    if not REQUIRED_GOLDEN.issubset(native_labels):
        raise RuntimeError(f"Native YOLOv1 golden changed: {native_labels}")

    print("Exporting fixed 448×448 FP32 ONNX…", flush=True)
    export_started = time.perf_counter()
    exported = Path(
        model.export(format="onnx", imgsz=448, dynamic=False, simplify=False, opset=13)
    ).resolve()
    fp32 = OUT / "yolov1-voc20-fp32.onnx"
    shutil.copy2(exported, fp32)
    record(report, "fp32", fp32, dog, export_started)
    del model
    gc.collect()

    dynamic_path = OUT / "yolov1-voc20-dynamic-int8.onnx"
    try:
        print("Building dynamic INT8 baseline…", flush=True)
        started = time.perf_counter()
        quantize_dynamic(
            model_input=str(fp32),
            model_output=str(dynamic_path),
            weight_type=QuantType.QInt8,
            per_channel=True,
        )
        record(report, "dynamic_int8", dynamic_path, dog, started)
    except Exception as error:
        report["errors"]["dynamic_int8"] = f"{type(error).__name__}: {error}"
        print(report["errors"]["dynamic_int8"], flush=True)

    static_path = OUT / "yolov1-voc20-static-u8s8.onnx"
    try:
        print("Building static U8/S8 QOperator candidate…", flush=True)
        started = time.perf_counter()
        reader = ImageCalibrationReader(CALIBRATION_IMAGES)
        quantize_static(
            model_input=str(fp32),
            model_output=str(static_path),
            calibration_data_reader=reader,
            quant_format=QuantFormat.QOperator,
            activation_type=QuantType.QUInt8,
            weight_type=QuantType.QInt8,
            per_channel=True,
            reduce_range=False,
            calibrate_method=CalibrationMethod.MinMax,
            extra_options={
                "ActivationSymmetric": False,
                "WeightSymmetric": True,
            },
        )
        record(report, "static_u8s8", static_path, dog, started)
    except Exception as error:
        report["errors"]["static_u8s8"] = f"{type(error).__name__}: {error}"
        print(report["errors"]["static_u8s8"], flush=True)

    int4_path = OUT / "yolov1-voc20-matmul-int4.onnx"
    try:
        print("Building MatMul INT4 weight-only candidate…", flush=True)
        started = time.perf_counter()
        from onnxruntime.quantization import matmul_4bits_quantizer, quant_utils

        config = matmul_4bits_quantizer.DefaultWeightOnlyQuantConfig(
            block_size=128,
            is_symmetric=True,
            accuracy_level=4,
            quant_format=QuantFormat.QOperator,
            op_types_to_quantize=("MatMul",),
            quant_axes=(("MatMul", 0),),
            bits=4,
        )
        model_for_int4 = quant_utils.load_model_with_shape_infer(fp32)
        quantizer = matmul_4bits_quantizer.MatMul4BitsQuantizer(
            model_for_int4,
            nodes_to_exclude=None,
            nodes_to_include=None,
            algo_config=config,
        )
        quantizer.process()
        quantizer.model.save_model_to_file(str(int4_path), False)
        record(report, "matmul_int4", int4_path, dog, started)
    except Exception as error:
        report["errors"]["matmul_int4"] = f"{type(error).__name__}: {error}"
        print(report["errors"]["matmul_int4"], flush=True)

    report_path = OUT / "report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
