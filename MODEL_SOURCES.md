# Model sources and provenance

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
