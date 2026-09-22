# Third-party notices

This project currently loads the following runtime dependency from a CDN.

## ONNX Runtime Web 1.30.0

- Project: Microsoft ONNX Runtime
- Package: `onnxruntime-web`
- Runtime CDN: jsDelivr
- License: MIT
- Upstream: `microsoft/onnxruntime`

Model checkpoints are not bundled in this repository. Tiny YOLOv2 is fetched from a pinned ONNX Model Zoo migration repository on Hugging Face; its repository metadata says Apache-2.0 while the imported model-card body says MIT, so both upstream statements are recorded rather than treated as one definitive weights-license claim. The browser fetches the SSD-MobileNet baseline from its pinned upstream model repository. YOLOX-Nano uses the official Megvii GitHub Release first and a pinned Apache-2.0 Hugging Face mirror only as a browser-fetch fallback. See [MODEL_SOURCES.md](MODEL_SOURCES.md) for provenance and model-specific license notes.

## Tiny YOLOv2 upstream checkpoint

- Repository: `onnxmodelzoo/tinyyolov2-8` on Hugging Face.
- Pinned revision: `869707e16e57006f97d98af54cfdc8a1d388ae61`.
- File SHA-256: `583fb7fdc948435ceac9fa82efc7708701efe8382a859a3dd46526b155f5f2ae`.
- Repository metadata: Apache-2.0.
- Imported model-card body: MIT.
- Training dataset reported upstream: Pascal VOC.
- Delivery: fetched at runtime; not bundled in this repository.

## YOLOX-Nano upstream project

- Project: Megvii YOLOX
- Upstream: `Megvii-BaseDetection/YOLOX`
- Repository license: Apache-2.0
- Primary model delivery: official GitHub Release asset, fetched at runtime.
- Browser fallback: `Heliosoph/yolox-onnx` on Hugging Face, Apache-2.0 metadata, revision `9206d80cbad9ed54986edeff8d7457eb5333882a`.
- The fallback model card states that its ONNX files are Megvii's published checkpoints and are not locally converted.

The original Vision Evolution Lab source code is licensed under the repository's [MIT License](LICENSE).


## Hugging Face Transformers.js 4.3.0

- Project: Hugging Face Transformers.js
- Browser import: jsDelivr, pinned to `@huggingface/transformers@4.3.0`
- Purpose here: browser preprocessing, ONNX execution, postprocessing, cache/progress integration for RT-DETR R18. v4 uses the newer native WebGPU runtime/EP; WASM remains available as fallback.
- Upstream package/project terms remain their own.

## RT-DETR R18 browser conversion

- Base model: `PekingU/rtdetr_r18vd`
- Base model license: Apache-2.0
- Browser conversion: `onnx-community/rtdetr_r18vd`
- Pinned conversion revision: `ec641af14c7cc8f93cd641a1458f498abbbbb533`
- The conversion is referenced from Hugging Face at runtime and is not bundled in this repository.
