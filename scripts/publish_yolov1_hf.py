#!/usr/bin/env python3
"""Optionally publish the verified YOLOv1 browser candidate to Hugging Face.

The workflow is a no-op when HF_TOKEN is not configured as a GitHub Actions
secret. When configured, it creates/updates a public model repository under the
authenticated Hugging Face user and records the immutable Hub revision.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from huggingface_hub import HfApi, create_repo

ROOT = Path(__file__).resolve().parents[1]
MODEL = ROOT / "artifacts" / "yolov1-feasibility" / "yolov1-voc20-int8.onnx"
REPORT = ROOT / "artifacts" / "yolov1-feasibility" / "report.json"
OUT = ROOT / "artifacts" / "yolov1-feasibility" / "hf-publish.json"


def main() -> None:
    token = os.environ.get("HF_TOKEN", "").strip()
    if not token:
        OUT.write_text(json.dumps({"published": False, "reason": "HF_TOKEN not configured"}, indent=2) + "\n")
        print("HF_TOKEN is not configured; skipping Hugging Face publication.")
        return

    if not MODEL.exists() or not REPORT.exists():
        raise FileNotFoundError("Verified YOLOv1 artifacts are missing.")

    api = HfApi(token=token)
    identity = api.whoami()
    namespace = identity.get("name") or identity.get("fullname")
    if not namespace:
        raise RuntimeError("Could not resolve Hugging Face username from HF_TOKEN.")

    repo_id = f"{namespace}/vision-evolution-yolov1"
    create_repo(repo_id, repo_type="model", private=False, exist_ok=True, token=token)

    report = json.loads(REPORT.read_text())
    int8 = report["artifacts"]["int8"]
    readme = f"""---
license: other
library_name: onnxruntime
pipeline_tag: object-detection
tags:
- yolov1
- pascal-voc
- onnx
- browser
---

# Vision Evolution Lab · YOLOv1 browser export

Non-commercial educational/demo artifact for
[Vision Evolution Lab](https://github.com/hakanakgun/vision-evolution-lab).

- Architecture: original full YOLOv1, Pascal VOC 20 classes, fixed 448×448.
- Source checkpoint: `{report["source"]["hf_repo"]}` at
  `{report["source"]["hf_revision"]}`.
- Export tooling: LibreYOLO at
  `{report["source"]["libreyolo_revision"]}`.
- Browser candidate: dynamic INT8 ONNX.
- Bytes: `{int8["bytes"]}`.
- SHA-256: `{int8["sha256"]}`.
- ONNX contract: `images [1,3,448,448]` → `output [1,24,98]`.
- Preprocess: RGB, direct stretch to 448×448, float32 / 255.
- Output: xyxy boxes in 448×448 input-pixel coordinates plus 20 VOC class
  scores. Page-side class-aware NMS is required.

The Darknet/YOLOv1 architecture and original weights are public-domain according
to the upstream YOLO license. LibreYOLO conversion tooling is separately
licensed by its upstream project. See the Vision Evolution Lab provenance docs
for the pinned chain and limitations.
"""
    (ROOT / "artifacts" / "yolov1-feasibility" / "README.md").write_text(readme)

    api.upload_file(
        path_or_fileobj=str(MODEL),
        path_in_repo="yolov1-voc20-int8.onnx",
        repo_id=repo_id,
        repo_type="model",
        commit_message="Publish verified YOLOv1 browser candidate",
    )
    api.upload_file(
        path_or_fileobj=str(ROOT / "artifacts" / "yolov1-feasibility" / "README.md"),
        path_in_repo="README.md",
        repo_id=repo_id,
        repo_type="model",
        commit_message="Document YOLOv1 browser candidate",
    )
    info = api.repo_info(repo_id=repo_id, repo_type="model")
    result = {
        "published": True,
        "repo_id": repo_id,
        "revision": info.sha,
        "filename": "yolov1-voc20-int8.onnx",
        "bytes": int8["bytes"],
        "sha256": int8["sha256"],
    }
    OUT.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
