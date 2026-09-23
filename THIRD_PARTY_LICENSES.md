# Third-party notices

## OpenCV.js 4.12.0 browser runtime

- Browser package: `@techstark/opencv-js@4.12.0-release.1`.
- Delivery: pinned jsDelivr npm URL, loaded lazily inside `classical-cv-worker.js`.
- Package repository: `TechStark/opencv-js`.
- Package metadata license: Apache-2.0.
- Package metadata/readme identify the distributed OpenCV.js binary with OpenCV 4.12.0.
- Purpose here: frontal-face cascade execution, HOG + linear SVM pedestrian detection, and digit-region proposals for the MNIST experiment.
- The runtime is not bundled in this repository.

OpenCV project licensing is Apache-2.0 for current OpenCV releases. Individual legacy source/data files can retain their own notices and those notices continue to apply.

### OpenCV frontal-face cascade data

- File: `haarcascade_frontalface_default.xml`.
- OpenCV release: 4.12.0.
- Exact source commit: `49486f61fb25722cbcf586b7f4320921d46fb38e`.
- Git blob SHA: `cbd1aa89e927d8d54b49fe666bf17244c3c46a7b`.
- Delivery: pinned jsDelivr GitHub URL; not bundled here.
- The file header credits Rainer Lienhart and contains an Intel License Agreement / BSD-style redistribution notice. Those file-specific terms remain applicable.

### OpenCV HOG default people detector

The HOG implementation and built-in `getDefaultPeopleDetector()` coefficients are used from the OpenCV.js distribution. Vision Evolution Lab does not ship a separate HOG/SVM weights file. Applicable OpenCV and legacy source notices remain upstream terms.

This project currently loads the following runtime dependency from a CDN.

## ONNX Runtime Web 1.30.0

- Project: Microsoft ONNX Runtime
- Package: `onnxruntime-web`
- Runtime CDN: jsDelivr
- License: MIT
- Upstream: `microsoft/onnxruntime`

Model checkpoints are not bundled in this repository. Tiny YOLOv2 is fetched from a pinned ONNX Model Zoo migration repository on Hugging Face; its repository metadata says Apache-2.0 while the imported model-card body says MIT, so both upstream statements are recorded rather than treated as one definitive weights-license claim. The browser fetches SSD-MobileNetV1 and the MNIST task-reference model from pinned upstream repositories. YOLOX-Nano uses the official Megvii GitHub Release first and a pinned Apache-2.0 Hugging Face mirror only as a browser-fetch fallback. See [MODEL_SOURCES.md](MODEL_SOURCES.md) for provenance and model-specific license notes.

## MNIST digit task-reference checkpoint

- Repository: `onnx/models`.
- Pinned commit: `4f43949841cb55a0b98dc8fcd045431ccafd9f96`.
- File: `validated/vision/classification/mnist/model/mnist-12.onnx`; Git LFS content SHA-256 `5c688690f8bacf667d4c2074af5ad0646ca328d7ab03eccf944a65b320171bdd`.
- The repository root LICENSE is Apache-2.0. The MNIST README carries an MIT SPDX marker and states MIT in its License section. The prior Hugging Face representation likewise showed Apache-2.0 metadata and MIT in the model-card body. These declarations remain recorded without selecting one definitive weights-license claim.
- The checkpoint is fetched only when digit-like regions are found, then SHA-256 verified. It is not bundled in this repository.
- It illustrates the handwritten MNIST digit task. It is not the original 1998 LeNet-5 weights and does not provide general-object detection.

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
