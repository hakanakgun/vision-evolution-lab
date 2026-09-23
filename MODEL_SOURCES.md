# Model sources and provenance

## Early Time Machine experiments

### 1980 · Neocognitron-inspired pattern-response preview

- Historical reference: Fukushima, *Biological Cybernetics* (1980), [paper DOI](https://doi.org/10.1007/BF00344251).
- In-browser behavior: four fixed 3×3 orientation responses, max combination, and two 2×2 local max-pooling stages.
- This is an educational feature-response approximation, not the original self-organizing Neocognitron code or a trained checkpoint.
- The CMU Artificial Intelligence Repository lists a distinct 1992 C simulator as public domain. Vision Evolution Lab does not redistribute that archive or claim to execute it; see the [CMU archive record](https://www.cs.cmu.edu/afs/cs/project/ai-repository/ai/areas/neural/systems/neocog/0.html).

### 1998 era · MNIST digit CNN reference

- Historical task: LeNet-5-era handwritten digit classification; LeNet-5 was introduced for document recognition.
- Browser checkpoint: ONNX Model Zoo MNIST-12, fetched only after digit-like image regions are proposed.
- Pinned source commit: `4f43949841cb55a0b98dc8fcd045431ccafd9f96` in the official `onnx/models` repository.
- Repository path: `validated/vision/classification/mnist/model/mnist-12.onnx`. ONNX Model Zoo lists ONNX 1.9, opset 12, and 1.1% top-1 error for this export.
- Git LFS content SHA-256: `5c688690f8bacf667d4c2074af5ad0646ca328d7ab03eccf944a65b320171bdd`; file size: 26,143 bytes.
- Source: trained with CNTK following the “CNTK 103D: Convolutional Neural Network with MNIST” tutorial. This later MNIST CNN reference is not original 1998 LeNet-5 trained weights.
- Input and output: float32 `1×1×28×28` grayscale input scaled to [0,1], with a black background and white digit strokes; output is ten pre-softmax scores. The browser keeps the existing crop preparation, applies softmax, and displays crops scoring at least 0.70.
- The 0.70 display cutoff is not calibrated confidence. Region proposals are a browser experiment and can miss digits or classify non-digits.
- The earlier Hugging Face representation declared Apache-2.0 in repository metadata and MIT in the model-card body. The direct ONNX Model Zoo source has an Apache-2.0 repository license and an MIT declaration in the MNIST README. Both source-level statements are recorded; this project does not present one as a definitive weights license.
- The model is fetched at runtime from the pinned Git LFS URL and SHA-256 verified before session creation; it is not bundled in this repository.
- The superseded `mnist-1.onnx` artifact is associated with ONNX Model Zoo issue [#439](https://github.com/onnx/models/issues/439), which records the same `Block386:Div(1)` not-implemented error. The active opset-12 model replaces that legacy graph.
- This task is limited to isolated handwritten digits. It does not detect general objects or promise OCR of printed text.

### 2001 · Viola–Jones method family / OpenCV frontal-face cascade

- Historical method: Viola & Jones, *Rapid Object Detection using a Boosted Cascade of Simple Features* (2001).
- Browser implementation: OpenCV.js `CascadeClassifier`, loaded lazily in a dedicated Web Worker.
- Runtime package: `@techstark/opencv-js@4.12.0-release.1`, package metadata license Apache-2.0.
- Cascade source: OpenCV 4.12.0, exact commit `49486f61fb25722cbcf586b7f4320921d46fb38e`.
- File: `data/haarcascades/haarcascade_frontalface_default.xml`; Git blob `cbd1aa89e927d8d54b49fe666bf17244c3c46a7b`.
- Header credits Rainer Lienhart and contains an Intel License Agreement / BSD-style notice.
- The later OpenCV cascade represents the method family; it is not the original paper's trained weights.

### 2005 · HOG + linear SVM pedestrian detector

- Historical method: Dalal & Triggs, *Histograms of Oriented Gradients for Human Detection* (2005).
- Browser implementation: OpenCV.js `HOGDescriptor` with `getDefaultPeopleDetector()`.
- Default detector window: 64×128; 8×8 stride, 8×8 padding, scale 1.05, group threshold 2.
- OpenCV supplies the detector coefficients; this repository does not redistribute a separate SVM weights file or claim the embedded coefficients are the exact original paper checkpoint.

### Task and runtime boundary

All four early experiments operate on the same Time Machine source image but retain different tasks and output types. They remain outside the general-object Model Race. There is no accuracy leaderboard or cross-task box overlap.

OpenCV.js loads on demand in `classical-cv-worker.js`; the worker receives an aspect-preserving copy capped at 640 px on its longest side and returns only boxes/timings or digit-region proposals. Before a history experiment runs, registered AI adapters are released. For digit classification, the OpenCV worker is terminated before the ONNX Runtime WASM session is loaded.

## Tiny YOLOv2

- Purpose: earliest runnable detector generation in Vision Evolution Lab, representing 2016-era YOLOv2 grid/anchor detection.
- Architecture family: Tiny YOLOv2, 9 convolutional layers and 6 max-pooling layers according to the upstream model card.
- Paper: *YOLO9000: Better, Faster, Stronger*, Redmon & Farhadi, 2016.
- Dataset reported upstream: Pascal VOC; 20 object classes.
- Upstream repository: `onnxmodelzoo/tinyyolov2-8` on Hugging Face, part of the ONNX Model Zoo migration.
- Pinned revision: `869707e16e57006f97d98af54cfdc8a1d388ae61`.
- File: `tinyyolov2-8.onnx`.
- File SHA-256 reported by Hugging Face/Xet: `583fb7fdc948435ceac9fa82efc7708701efe8382a859a3dd46526b155f5f2ae`.
- Reported asset size: approximately 63.5 MB.
- ONNX version/opset reported upstream: ONNX 1.3 / opset 8.
- Input: float32 NCHW `1×3×416×416` RGB.
- Output: `1×125×13×13`, representing 5 anchors × (4 box values + objectness + 20 class logits) for each 13×13 grid cell.
- Anchors: `1.08,1.19`, `3.42,4.41`, `6.63,11.38`, `9.42,5.11`, `16.62,10.52`.
- Conversion lineage reported upstream: Darknet → Keras → Core ML → ONNX through ONNXMLTools.
- Browser runtime policy: ONNX Runtime Web WASM initially. This historical opset-8 export has not yet completed physical iPhone/WebKit runtime validation in this project.

### Preprocessing note

The upstream ONNX Model Zoo card leaves its `Preprocessing` subsection empty. The Core ML conversion source says YOLO expects input pixels in 0–1 and used `image_scale=1/255`; the migrated ONNX file instead exposes a float32 NCHW tensor interface. A contemporary independent implementation reports matching ONNX Runtime outputs while directly packing resized image bytes into NCHW floats. Vision Evolution Lab currently follows that exact-export convention: direct 416×416 resize, RGB float32 NCHW, raw 0–255 browser pixel values. Because the upstream ONNX preprocessing contract is incomplete, this remains an explicit implementation assumption until physical-browser detections validate it.

### Postprocessing

The page decodes the 13×13 grid with the upstream VOC anchors, sigmoid box/objectness transforms, softmax over the 20 class logits, and class-aware NMS at IoU 0.40. Detections are retained down to the UI slider minimum (0.10), then the current UI confidence is applied during drawing/comparison so threshold changes can redraw without rerunning inference.

For four-model overlap only, legacy VOC label synonyms such as `aeroplane`, `motorbike`, `diningtable`, `pottedplant`, `sofa`, and `tvmonitor` are mapped to equivalent COCO-style display names. This does not make the training label spaces equivalent; Tiny YOLOv2 still cannot predict COCO-only classes.

### License note

The Hugging Face repository metadata currently declares `apache-2.0`, while the imported ONNX Model Zoo model-card body states `MIT`. This is internally inconsistent upstream. Both are permissive, but Vision Evolution Lab does not infer a single definitive weights license from that conflict. The binary is not redistributed by this repository; the browser fetches the exact pinned upstream asset. Re-check canonical terms before bundling, mirroring, modifying, or commercially redistributing the checkpoint. Pascal VOC dataset terms are separate from model/code terms.

## SSD-MobileNetV1-12 INT8

- Purpose: first runnable object-detection baseline.
- Architecture family: SSD detector with MobileNetV1 backbone.
- Format: ONNX, opset 12, INT8 quantized checkpoint.
- Training data reported by the upstream model card: MS COCO 2017 train/validation data.
- Upstream repository: `onnxmodelzoo/ssd_mobilenet_v1_12-int8` on Hugging Face.
- Pinned upstream revision: `929618539097dbeb779c13aed75dfe346d016d48`.
- File: `ssd_mobilenet_v1_12-int8.onnx`.
- Upstream SHA-256 reported for the model file: `2b79e6a7fb1ec6a33f332b9b10d82d9de4b7b49dcd26b5946921bb356895c954`.
- Upstream model-card metric: mAP 0.2297. This is a reported upstream benchmark, not a measurement made by this site.
- SSD paper: *SSD: Single Shot MultiBox Detector*, Liu et al., 2016.
- MobileNet paper: *MobileNets: Efficient Convolutional Neural Networks for Mobile Vision Applications*, Howard et al., 2017.

### License note

The current Hugging Face repository metadata labels the model `apache-2.0`, while the imported model-card text also contains an MIT SPDX/license statement. Both are permissive licenses, but the upstream presentation is internally inconsistent.

For v0.1 this repository does **not** redistribute the model binary. The browser retrieves the pinned checkpoint directly from the upstream repository. Before bundling, mirroring, modifying, or commercially redistributing the checkpoint, verify the canonical license and notice requirements from the upstream maintainers.

Training-dataset terms are separate from code/model licenses and should be reviewed independently before using benchmark data or training data beyond this research/demo context.


## YOLOX-Nano

- Purpose: second runnable detector for Model Race and the 2021 anchor-free real-time CNN generation.
- Architecture family: YOLOX Nano, anchor-free YOLO detector with a decoupled detection head.
- Paper: *YOLOX: Exceeding YOLO Series in 2021*, Ge et al., 2021.
- Official repository: `Megvii-BaseDetection/YOLOX`.
- Repository license: Apache-2.0.
- Official ONNX Runtime documentation reports YOLOX-Nano at 0.91M parameters, 1.08 GFLOPs, 416×416 test size, and 25.8 COCO mAP.
- Official release tag: `0.1.1rc0`, published by the YOLOX project.
- Release asset: `yolox_nano.onnx`.
- GitHub release asset ID: `42724905`.
- Release API size: 3,659,407 bytes (3.49 MiB).
- Model input: float32 NCHW 1×3×416×416 using the official top-left padded preprocessing path with pixel value 114.
- Primary runtime source: official Megvii GitHub Release asset.
- Browser fallback source: Hugging Face `Heliosoph/yolox-onnx`, pinned to revision `9206d80cbad9ed54986edeff8d7457eb5333882a`. Its model card identifies the repository as Apache-2.0 and states that the ONNX checkpoints are Megvii's published YOLOX checkpoints rather than local conversions.
- Postprocessing follows the official ONNX Runtime demo: strides 8/16/32, YOLOX grid decode, objectness × class probability, and class-agnostic NMS at IoU 0.45.
- Training/benchmark dataset reported by the official project: MS COCO.

### License note

The official YOLOX repository is Apache-2.0 and the ONNX file is distributed directly as an asset of the official YOLOX GitHub release. The release page does not state a separate restrictive license for the ONNX asset. Vision Evolution Lab does **not** bundle this binary. The browser first requests the official release asset; if browser/CORS behavior blocks that path, it tries the pinned Apache-2.0 Hugging Face mirror documented above.

If this project later redistributes or modifies YOLOX weights instead of referencing the official asset, re-check upstream notices and model-weight terms at that time. Dataset terms remain separate from the project/model code license.


## Transformer-era model sources

RT-DETR R18 is runnable. LW-DETR and D-FINE remain research-only candidates and are not downloaded or executed by the current site.

### RT-DETR R18

- Status: runnable from v0.4.0.
- Base Hugging Face model: `PekingU/rtdetr_r18vd`.
- Base metadata: Apache-2.0, COCO, Transformers object-detection model, approximately 20.2M parameters.
- Browser ONNX conversion: `onnx-community/rtdetr_r18vd`, identified by Hugging Face as a Transformers.js / ONNX conversion of the PekingU base model.
- Pinned ONNX conversion revision: `ec641af14c7cc8f93cd641a1458f498abbbbb533`.
- That revision contains fp16 (~41.4 MB) and q8/uint8 (~21.7 MB) variants.
- The pinned preprocessor resizes to 640×640, rescales by 1/255, does not normalize, and does not pad.
- Runtime policy: WebGPU + fp16 first; WASM + q8 fallback.
- Official implementation: `lyuwenyu/RT-DETR`, Apache-2.0.
- Vision Evolution Lab uses Transformers.js for processor/model/postprocessor compatibility instead of reimplementing RT-DETR decoding by hand.
- Runtime from v0.5.0: Transformers.js 4.3.0. The previous 3.8.1 path reproduced ONNX Runtime Web's known RT-DETR `AveragePool ceil()` limitation in real iPhone inference. This is the same RT-DETR/WebGPU failure class documented in `microsoft/onnxruntime#21206`; later ONNX Runtime guidance in `#29070` directs browser users away from legacy JSEP to the native WebGPU EP. Transformers.js v4 adopts that native runtime while preserving the same pinned model revision and WASM q8 fallback.
- Physical iPhone/WebKit validation on 2026-09-21 completed real RT-DETR inference and a 20-run warm benchmark on WebGPU fp16. This verifies that tested device/runtime path; it does not prove compatibility across all WebKit versions or devices.

#### RT-DETR license/provenance note

The base model repository explicitly declares Apache-2.0 and COCO. The ONNX Community repository is a Hugging Face Staff conversion whose model card identifies `PekingU/rtdetr_r18vd` as the base model and marks it for Transformers.js. The browser references the pinned Hub conversion at runtime; the binary is not redistributed by this repository.

### LW-DETR-tiny

- Official implementation: `Atten4Vis/LW-DETR`, Apache-2.0.
- Official repository points model downloads to Hugging Face `xbsu/LW-DETR`.
- Hugging Face repository metadata: Apache-2.0.
- Upstream reports 12.1M parameters, 11.2 GFLOPs and 42.6 (42.9 reimplementation) COCO mAP for LW-DETR-tiny.
- Upstream provides ONNX export tooling, but this project has not yet validated its ONNX graph in ONNX Runtime Web.

### D-FINE-N

- Official implementation: `Peterande/D-FINE`, Apache-2.0.
- Upstream reports 4M parameters, 7 GFLOPs and 42.8 COCO AP for D-FINE-N.
- D-FINE's own documentation warns that Objects365-trained/pretrained checkpoints may have separate dataset terms.
- The current site therefore treats D-FINE as research-only until the exact checkpoint, pretraining chain, and browser graph are re-verified.
