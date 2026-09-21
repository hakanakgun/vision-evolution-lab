# Third-party notices

This project currently loads the following runtime dependency from a CDN.

## ONNX Runtime Web 1.30.0

- Project: Microsoft ONNX Runtime
- Package: `onnxruntime-web`
- Runtime CDN: jsDelivr
- License: MIT
- Upstream: `microsoft/onnxruntime`

Model checkpoints are not bundled in this repository. The browser currently fetches the SSD-MobileNet baseline from its pinned upstream model repository and YOLOX-Nano from the official Megvii YOLOX GitHub release. See [MODEL_SOURCES.md](MODEL_SOURCES.md) for provenance and model-specific license notes.

## YOLOX-Nano upstream project

- Project: Megvii YOLOX
- Upstream: `Megvii-BaseDetection/YOLOX`
- Repository license: Apache-2.0
- Model delivery: official GitHub Release asset, fetched at runtime and not redistributed here.

The original Vision Evolution Lab source code is licensed under the repository's [MIT License](LICENSE).
