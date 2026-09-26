#!/usr/bin/env python3
"""Build compact YOLOv1 browser candidates for the iOS/WebKit memory investigation.

Experiment-only. The published dynamic-INT8 export still contains the enormous
YOLOv1 locally-connected layer as FP32 because it exports as Einsum. This script
rewrites the exact local operation lok,nkl->nol into 49 independent
constant-weight MatMul operations and applies ORT MatMulNBits INT4 weight-only
quantization to those matrices. All other layers stay on the existing
dynamic-INT8 path.

No candidate is published by this script.
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
from onnx import helper, numpy_helper
from onnxruntime.quantization import QuantFormat, QuantType, quantize_dynamic
from onnxruntime.quantization.matmul_nbits_quantizer import (
    DefaultWeightOnlyQuantConfig,
    MatMulNBitsQuantizer,
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


def box_iou(a, b) -> float:
    top, left = max(a[0], b[0]), max(a[1], b[1])
    bottom, right = min(a[2], b[2]), min(a[3], b[3])
    intersection = max(0.0, bottom - top) * max(0.0, right - left)
    area_a = max(0.0, a[2] - a[0]) * max(0.0, a[3] - a[1])
    area_b = max(0.0, b[2] - b[0]) * max(0.0, b[3] - b[1])
    return intersection / max(1e-12, area_a + area_b - intersection)


def decode(output: np.ndarray, confidence: float = 0.2, nms: float = 0.45) -> list[dict]:
    data = np.asarray(output, dtype=np.float32).reshape(24, 98)
    candidates = []
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
    kept = []
    for item in candidates:
        if all(other["class_id"] != item["class_id"] or box_iou(other["box"], item["box"]) <= nms for other in kept):
            kept.append(item)
        if len(kept) >= 100:
            break
    return kept


def tensor_bytes(tensor) -> int:
    if tensor.raw_data:
        return len(tensor.raw_data)
    if tensor.float_data:
        return len(tensor.float_data) * 4
    if tensor.double_data:
        return len(tensor.double_data) * 8
    if tensor.int32_data:
        return len(tensor.int32_data) * 4
    if tensor.int64_data:
        return len(tensor.int64_data) * 8
    return 0


def graph_stats(path: Path) -> dict:
    model = onnx.load(str(path), load_external_data=False)
    ops = Counter(node.op_type for node in model.graph.node)
    initializers = [
        {
            "name": tensor.name,
            "bytes": tensor_bytes(tensor),
            "data_type": int(tensor.data_type),
            "dims": list(tensor.dims),
        }
        for tensor in model.graph.initializer
    ]
    initializers.sort(key=lambda item: item["bytes"], reverse=True)
    return {
        "op_counts": dict(sorted(ops.items())),
        "initializer_bytes_in_proto": sum(item["bytes"] for item in initializers),
        "top_initializers": initializers[:12],
        "opset": [{"domain": item.domain, "version": item.version} for item in model.opset_import],
    }


def validate_candidate(path: Path, dog: Path) -> dict:
    session_options = ort.SessionOptions()
    session_options.enable_cpu_mem_arena = False
    session_options.enable_mem_pattern = False
    session_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    session_options.add_session_config_entry("session.disable_prepacking", "1")
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
    value = report["artifacts"][key]
    print(f"{key}: {value['mib']} MiB · golden={value['ort']['dog_labels']}", flush=True)


def _attribute(node, name: str):
    for attribute in node.attribute:
        if attribute.name == name:
            value = helper.get_attribute_value(attribute)
            return value.decode("utf-8") if isinstance(value, bytes) else value
    return None


def rewrite_local_einsum_to_matmuls(model_path: Path, output_path: Path) -> dict:
    """Replace YOLOv1's local-layer Einsum with 49 equivalent 2-D MatMuls."""
    model = onnx.load(str(model_path))
    graph = model.graph
    initializer_by_name = {item.name: item for item in graph.initializer}
    consumers = Counter(name for node in graph.node for name in node.input if name)

    target = None
    weight_name = None
    activation_name = None
    for node in graph.node:
        if node.op_type != "Einsum" or _attribute(node, "equation") != "lok,nkl->nol":
            continue
        for index, input_name in enumerate(node.input):
            tensor = initializer_by_name.get(input_name)
            if tensor is not None and list(tensor.dims) == [49, 256, 9216]:
                target = node
                weight_name = input_name
                activation_name = node.input[1 - index]
                break
        if target is not None:
            break

    if target is None or weight_name is None or activation_name is None:
        equations = [
            {"name": node.name, "equation": _attribute(node, "equation"), "inputs": list(node.input)}
            for node in graph.node
            if node.op_type == "Einsum"
        ]
        raise RuntimeError(f"YOLOv1 local Einsum contract changed: {equations}")

    if consumers[weight_name] != 1:
        raise RuntimeError(f"YOLOv1 local weight has {consumers[weight_name]} consumers; expected 1.")

    weight_tensor = initializer_by_name[weight_name]
    source_weight_bytes = tensor_bytes(weight_tensor)
    weight = numpy_helper.to_array(weight_tensor)
    if weight.shape != (49, 256, 9216):
        raise RuntimeError(f"YOLOv1 local weight shape changed: {weight.shape}")

    output_name = target.output[0]
    prefix = (target.name or "yolov1_local_einsum").replace("/", "_")
    axes_name = prefix + "_unsqueeze_axes"
    generated_initializers = [
        numpy_helper.from_array(np.array([2], dtype=np.int64), name=axes_name)
    ]
    generated_nodes = []
    location_outputs = []

    for location in range(weight.shape[0]):
        index_name = f"{prefix}_index_{location}"
        local_weight_name = f"{prefix}_weight_{location}"
        gather_output = f"{prefix}_gather_{location}"
        matmul_output = f"{prefix}_matmul_{location}"
        unsqueeze_output = f"{prefix}_unsqueeze_{location}"

        generated_initializers.append(
            numpy_helper.from_array(np.array(location, dtype=np.int64), name=index_name)
        )
        local_weight = np.ascontiguousarray(weight[location].T, dtype=np.float32)
        generated_initializers.append(
            numpy_helper.from_array(local_weight, name=local_weight_name)
        )
        generated_nodes.extend(
            [
                helper.make_node(
                    "Gather",
                    [activation_name, index_name],
                    [gather_output],
                    axis=2,
                    name=f"{prefix}_Gather_{location}",
                ),
                helper.make_node(
                    "MatMul",
                    [gather_output, local_weight_name],
                    [matmul_output],
                    name=f"{prefix}_MatMul_{location}",
                ),
                helper.make_node(
                    "Unsqueeze",
                    [matmul_output, axes_name],
                    [unsqueeze_output],
                    name=f"{prefix}_Unsqueeze_{location}",
                ),
            ]
        )
        location_outputs.append(unsqueeze_output)

    generated_nodes.append(
        helper.make_node(
            "Concat",
            location_outputs,
            [output_name],
            axis=2,
            name=prefix + "_Concat",
        )
    )

    rewritten_nodes = []
    for node in graph.node:
        if node is target:
            rewritten_nodes.extend(generated_nodes)
        else:
            rewritten_nodes.append(node)

    kept_initializers = [item for item in graph.initializer if item.name != weight_name]
    del graph.node[:]
    graph.node.extend(rewritten_nodes)
    del graph.initializer[:]
    graph.initializer.extend(kept_initializers)
    graph.initializer.extend(generated_initializers)

    onnx.checker.check_model(model)
    onnx.save(model, str(output_path))
    del model, weight
    gc.collect()
    return {
        "equation": "lok,nkl->nol",
        "locations": 49,
        "outputs_per_location": 256,
        "patch": 9216,
        "source_weight": weight_name,
        "source_weight_bytes_fp32": source_weight_bytes,
        "matmuls": 49,
    }


def build_local_int4(
    dynamic_int8_path: Path,
    output_path: Path,
    block_size: int,
    report: dict,
    dog: Path,
) -> None:
    rewritten = OUT / f"yolov1-voc20-dynamic-int8-local-matmuls-b{block_size}.onnx"
    try:
        print(f"Building dynamic INT8 + local INT4 block={block_size} candidate…", flush=True)
        started = time.perf_counter()
        rewrite = rewrite_local_einsum_to_matmuls(dynamic_int8_path, rewritten)
        config = DefaultWeightOnlyQuantConfig(
            block_size=block_size,
            is_symmetric=True,
            accuracy_level=4,
            quant_format=QuantFormat.QOperator,
            op_types_to_quantize=("MatMul",),
            quant_axes=(("MatMul", 0),),
            bits=4,
        )
        quantizer = MatMulNBitsQuantizer(model=str(rewritten), algo_config=config)
        quantizer.process()
        quantizer.model.save_model_to_file(str(output_path))
        key = f"dynamic_int8_local_int4_b{block_size}"
        record(report, key, output_path, dog, started)
        report["artifacts"][key]["rewrite"] = rewrite
    finally:
        try:
            rewritten.unlink()
        except FileNotFoundError:
            pass
        gc.collect()


def main() -> None:
    report = {
        "purpose": "YOLOv1 compact browser candidates for iOS/WebKit memory-pressure mitigation",
        "source": {
            "hf_repo": HF_REPO,
            "hf_revision": HF_REVISION,
            "hf_filename": HF_FILENAME,
            "libreyolo_revision": LIBREYOLO_REVISION,
        },
        "artifacts": {},
        "errors": {},
    }

    from libreyolo import LibreYOLO

    print("Downloading pinned YOLOv1 checkpoint…", flush=True)
    pt_path = Path(hf_hub_download(repo_id=HF_REPO, filename=HF_FILENAME, revision=HF_REVISION))
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
    exported = Path(model.export(format="onnx", imgsz=448, dynamic=False, simplify=False, opset=13)).resolve()
    fp32 = OUT / "yolov1-voc20-fp32.onnx"
    shutil.copy2(exported, fp32)
    record(report, "fp32", fp32, dog, export_started)
    del model
    gc.collect()

    dynamic_path = OUT / "yolov1-voc20-dynamic-int8.onnx"
    try:
        print("Building published dynamic INT8 baseline…", flush=True)
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
        report_path = OUT / "report.json"
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        return

    for block_size in (32, 128):
        output = OUT / f"yolov1-voc20-dynamic-int8-local-int4-b{block_size}.onnx"
        key = f"dynamic_int8_local_int4_b{block_size}"
        try:
            build_local_int4(dynamic_path, output, block_size, report, dog)
        except Exception as error:
            report["errors"][key] = f"{type(error).__name__}: {error}"
            print(report["errors"][key], flush=True)

    report_path = OUT / "report.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
