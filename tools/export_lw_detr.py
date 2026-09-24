#!/usr/bin/env python3
"""Export pinned LW-DETR-tiny to a fixed-shape ONNX graph and verify parity."""
from __future__ import annotations

import hashlib
import json
import os
import platform
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import torch
import transformers
from PIL import Image
from transformers import AutoConfig, AutoImageProcessor, AutoModelForObjectDetection

MODEL_ID = "AnnaZhang/lwdetr_tiny_60e_coco"
REVISION = "4b636b514dcf623f6eafc9e1ab63b8ad5c513925"
TRANSFORMERS_VERSION = "5.13.1"
INPUT_SIZE = 640
OUTPUT = Path("lw-detr-tiny.onnx")
MANIFEST = Path("lw-detr-tiny-manifest.json")


class FixedSquareExport(torch.nn.Module):
    """Expose raw LW-DETR logits and normalized cxcywh boxes for browser decoding."""

    def __init__(self, model: torch.nn.Module) -> None:
        super().__init__()
        self.model = model
        self.register_buffer(
            "pixel_mask",
            torch.ones((1, INPUT_SIZE, INPUT_SIZE), dtype=torch.bool),
            persistent=False,
        )

    def forward(self, pixel_values: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        output = self.model(pixel_values=pixel_values, pixel_mask=self.pixel_mask)
        return output.logits, output.pred_boxes


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    if transformers.__version__ != TRANSFORMERS_VERSION:
        raise RuntimeError(
            f"Expected transformers {TRANSFORMERS_VERSION}, found {transformers.__version__}"
        )
    torch.set_num_threads(max(1, int(os.environ.get("LW_DETR_TORCH_THREADS", "2"))))
    torch.manual_seed(7)
    np.random.seed(7)

    processor = AutoImageProcessor.from_pretrained(
        MODEL_ID, revision=REVISION, use_fast=False
    )
    config = AutoConfig.from_pretrained(MODEL_ID, revision=REVISION)
    if hasattr(config, "disable_custom_kernels"):
        config.disable_custom_kernels = True
    model = AutoModelForObjectDetection.from_pretrained(
        MODEL_ID,
        revision=REVISION,
        config=config,
        trust_remote_code=False,
        attn_implementation="eager",
    ).cpu().eval()

    # A deterministic image exercises the exact processor contract at 640×640.
    pixels = np.random.default_rng(7).integers(
        0, 256, size=(INPUT_SIZE, INPUT_SIZE, 3), dtype=np.uint8
    )
    encoded = processor(images=Image.fromarray(pixels, mode="RGB"), return_tensors="pt")
    pixel_values = encoded["pixel_values"].cpu().contiguous()
    if tuple(pixel_values.shape) != (1, 3, INPUT_SIZE, INPUT_SIZE):
        raise RuntimeError(f"Unexpected processor shape: {tuple(pixel_values.shape)}")

    wrapper = FixedSquareExport(model).eval()
    with torch.inference_mode():
        reference_logits, reference_boxes = wrapper(pixel_values)
    if reference_logits.ndim != 3 or reference_boxes.shape[-1] != 4:
        raise RuntimeError(
            f"Unexpected LW-DETR outputs: logits={tuple(reference_logits.shape)}, "
            f"boxes={tuple(reference_boxes.shape)}"
        )

    torch.onnx.export(
        wrapper,
        (pixel_values,),
        str(OUTPUT),
        input_names=["pixel_values"],
        output_names=["logits", "pred_boxes"],
        opset_version=17,
        do_constant_folding=True,
        dynamo=False,
    )

    graph = onnx.load(str(OUTPUT), load_external_data=True)
    onnx.checker.check_model(graph, full_check=True)
    session = ort.InferenceSession(
        str(OUTPUT), providers=["CPUExecutionProvider"]
    )
    if session.get_inputs()[0].name != "pixel_values":
        raise RuntimeError(f"Unexpected ONNX inputs: {session.get_inputs()}")
    actual_logits, actual_boxes = session.run(
        ["logits", "pred_boxes"],
        {"pixel_values": pixel_values.numpy()},
    )
    np.testing.assert_allclose(
        actual_logits, reference_logits.numpy(), rtol=3e-4, atol=3e-4
    )
    np.testing.assert_allclose(
        actual_boxes, reference_boxes.numpy(), rtol=2e-3, atol=1e-3
    )
    if not np.isfinite(actual_logits).all() or not np.isfinite(actual_boxes).all():
        raise RuntimeError("ONNX Runtime produced non-finite outputs")

    labels = {str(key): str(value) for key, value in model.config.id2label.items()}
    manifest = {
        "source_model": MODEL_ID,
        "source_revision": REVISION,
        "license": "Apache-2.0",
        "transformers": transformers.__version__,
        "torch": torch.__version__,
        "onnx_opset": 17,
        "input": {
            "name": "pixel_values",
            "shape": [1, 3, INPUT_SIZE, INPUT_SIZE],
            "layout": "NCHW",
            "dtype": "float32",
            "preprocessing": {
                "resize": "direct to 640x640",
                "color": "RGB",
                "rescale": "1/255",
                "mean": [0.485, 0.456, 0.406],
                "std": [0.229, 0.224, 0.225],
            },
        },
        "outputs": {
            "logits": list(actual_logits.shape),
            "pred_boxes": list(actual_boxes.shape),
            "box_format": "normalized cxcywh",
        },
        "labels": labels,
        "onnx_bytes": OUTPUT.stat().st_size,
        "onnx_sha256": sha256_file(OUTPUT),
        "verification": {
            "onnx_checker": "passed",
            "onnxruntime_cpu_parity": "passed",
            "rtol": 3e-4,
            "atol": 3e-4,
        },
        "export_host": platform.platform(),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    print("LW-DETR ONNX export and CPU parity validation passed.")


if __name__ == "__main__":
    main()
