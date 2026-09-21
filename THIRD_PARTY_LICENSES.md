# Third-party notices

This project currently loads the following runtime dependency from a CDN.

## ONNX Runtime Web 1.30.0

- Project: Microsoft ONNX Runtime
- Package: `onnxruntime-web`
- Runtime CDN: jsDelivr
- License: MIT
- Upstream: `microsoft/onnxruntime`

Model checkpoints are not bundled in this repository. The browser fetches the SSD-MobileNet baseline from its pinned upstream model repository. YOLOX-Nano uses the official Megvii GitHub Release first and a pinned Apache-2.0 Hugging Face mirror only as a browser-fetch fallback. See [MODEL_SOURCES.md](MODEL_SOURCES.md) for provenance and model-specific license notes.

## YOLOX-Nano upstream project

- Project: Megvii YOLOX
- Upstream: `Megvii-BaseDetection/YOLOX`
- Repository license: Apache-2.0
- Primary model delivery: official GitHub Release asset, fetched at runtime.
- Browser fallback: `Heliosoph/yolox-onnx` on Hugging Face, Apache-2.0 metadata, revision `9206d80cbad9ed54986edeff8d7457eb5333882a`.
- The fallback model card states that its ONNX files are Megvii's published checkpoints and are not locally converted.

The original Vision Evolution Lab source code is licensed under the repository's [MIT License](LICENSE).
