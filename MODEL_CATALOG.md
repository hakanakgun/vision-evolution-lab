# Model catalog

Status meanings:

- **Runnable** — a general-object model is downloaded and executed in the browser by Vision Evolution Lab.
- **Runnable historical experiment** — a task-specific earlier method runs on the selected Time Machine image; it stays outside the general-object Model Race.
- **History only** — historical context is shown without loading a checkpoint or runtime.
- **Research** — current/recent research references or candidates; not downloaded or executed.
- **Candidate** — may become runnable only after browser compatibility plus checkpoint/license provenance are verified.

| Year | Model | Status | Architecture shift | Upstream license/provenance | Browser note |
| --- | --- | --- | --- | --- | --- |
| 1980 | Neocognitron-inspired feature response | Runnable historical experiment | oriented local responses + max pooling | Fukushima 1980 paper reference; no original weights used; CMU's separate 1992 simulator is documented as public domain but not redistributed | educational approximation; response map only, no object labels |
| 1998 | LeNet-era MNIST CNN reference | Runnable historical experiment | crop proposals + handwritten-digit CNN | pinned ONNX Model Zoo MNIST-12 opset-12 export and SHA-256 in `MODEL_SOURCES.md`; repository Apache-2.0 / model README MIT noted | digit crops only; later MNIST checkpoint, not original LeNet-5 weights |
| 2001 | Viola–Jones method family / OpenCV frontal-face cascade | Runnable historical experiment | boosted cascade with Haar-like features | pinned OpenCV 4.12.0 cascade; XML header credits Rainer Lienhart and carries Intel/BSD-style terms | OpenCV.js worker; representative of the method family, not the original paper weights |
| 2005 | HOG + linear SVM pedestrian detector | Runnable historical experiment | gradient descriptor + sliding-window linear classifier | OpenCV `HOGDescriptor.getDefaultPeopleDetector()`; OpenCV distribution/source notices | OpenCV.js worker; 64×128 default people detector; pedestrians only |
| 2012 | AlexNet | History only | deep CNN for large-scale image classification | Krizhevsky et al., NeurIPS 2012; paper reference only | image classification, no object boxes |
| 2014 | R-CNN | History only | region proposals plus CNN features and class-specific SVMs | Girshick et al., CVPR 2014; paper reference only | object-detection research reference; no checkpoint/runtime integrated |
| 2015 | Faster R-CNN | History only | region proposal network shares features with the detector | Ren et al., NeurIPS 2015; paper reference only | two-stage detector reference; no checkpoint/runtime integrated |
| 2016 | YOLOv1 | History only | unified single-stage grid-based detection | Redmon et al., CVPR 2016; paper reference only | arXiv preprint appeared in 2015; the timeline uses conference year 2016 |
| 2016 | SSD | History only | single-shot multi-scale dense detection | Liu et al., ECCV 2016; paper reference only | one-stage detector milestone; not the 2017 runnable SSD-MobileNet export |
| 2016 | Tiny YOLOv2 | Runnable | compact grid/anchor CNN detector | ONNX Model Zoo migration; pinned HF revision; Pascal VOC; upstream license metadata/body conflict documented | WASM compatibility policy; physical iPhone/WebKit runtime validation pending |
| 2017 | SSD-MobileNetV1 INT8 | Runnable | lightweight mobile backbone + SSD | pinned ONNX Model Zoo source; see `MODEL_SOURCES.md` | WASM policy because current ORT WebGPU path fails at run time for this export |
| 2020 | DETR | History only | transformer set prediction | Carion et al., ECCV 2020; paper reference only | end-to-end detector milestone; the runnable reference is later RT-DETR |
| 2021 | YOLOX-Nano | Runnable | anchor-free decoupled YOLO head | official Megvii project/release, Apache-2.0 | iOS: standard non-JSEP WASM; other platforms: WebGPU-first JSEP bundle with WASM fallback |
| 2023 | RT-DETR R18 | Runnable | real-time end-to-end DETR | base `PekingU/rtdetr_r18vd`: Apache-2.0, COCO, 20.2M params; HF Staff ONNX conversion `onnx-community/rtdetr_r18vd` | Transformers.js 4.3.0; native WebGPU fp16 first, WASM q8 fallback; physical iPhone/WebKit WebGPU fp16 inference + 20-run warm benchmark verified 2026-09-21 |
| 2024 | LW-DETR-tiny | Research / candidate | lightweight ViT encoder + shallow DETR decoder | Hugging Face `xbsu/LW-DETR`: Apache-2.0; official repo points to these weights | ONNX export exists upstream; browser operator/runtime fit not yet validated |
| 2024 | D-FINE-N | Research / candidate | fine-grained distribution refinement for DETR box regression | official code Apache-2.0; 4M / 42.8 AP reported upstream | checkpoint/dataset provenance and browser operator fit must be re-verified before runnable integration |

## License policy

A permissive repository license is necessary but not automatically sufficient to add a downloadable model to the app.

Before a candidate becomes runnable, verify:

1. exact checkpoint source and revision;
2. checkpoint/weights terms, not only source-code terms;
3. training/pretraining dataset terms;
4. redistribution requirements if the model will be mirrored;
5. browser runtime compatibility;
6. model input/output and postprocessing contract.

The current app avoids redistributing model binaries: runnable models are fetched from pinned or official upstream sources.

## Current selection rationale

## Early task-specific experiments in Time Machine

### LeNet-era MNIST digit task

The pinned MNIST CNN is a later ONNX Model Zoo reference for the handwritten-digit task, not original LeNet-5 weights. OpenCV proposes digit-like crops; a 28×28 WASM CNN classifies each crop into 0–9. If proposals are absent or scores stay below the display filter, the UI says the experiment recognizes isolated handwritten digits only. Printed text and arbitrary objects are outside its scope. See [MODEL_SOURCES.md](MODEL_SOURCES.md) for exact artifact and license presentation.

### Neocognitron-inspired pattern response

The 1980 entry produces a feature-response overlay from fixed oriented filters and local max pooling. It is explicitly an educational approximation without original Neocognitron weights or object labels. The public-domain 1992 CMU simulator is a separate archive and is not redistributed.

### Viola–Jones method family / OpenCV frontal-face cascade

The runnable 2001-era entry uses OpenCV's `haarcascade_frontalface_default.xml` on the selected Time Machine image. The pinned XML is a later OpenCV-distributed trained frontal-face cascade created by Rainer Lienhart; Vision Evolution Lab does not present it as the original Viola–Jones paper's trained artifact.

### HOG + linear SVM

The runnable 2005-era entry uses OpenCV's `HOGDescriptor` with `getDefaultPeopleDetector()` and its default 64×128 pedestrian window on the same selected image. It represents the Dalal–Triggs HOG + linear-classifier family without claiming that OpenCV's embedded coefficients are the original paper training artifact.

Face detection, pedestrian detection, handwritten-digit classification, pattern response, and general-object detection remain different tasks. They are not scored against each other and do not enter Model Race.


### Tiny YOLOv2

Added as the first pre-2017 runnable generation. It gives the timeline a real 2016 detector with a materially different 13×13 grid/anchor output and Pascal VOC 20-class label space. The exact ONNX Model Zoo export is pinned rather than mirrored locally. Because the upstream Hugging Face metadata says Apache-2.0 while the model-card body says MIT, the repository records both statements instead of collapsing them into a single checkpoint-license claim. The browser integration starts with WASM for compatibility; physical iPhone/WebKit inference and benchmark evidence remain pending.

### SSD-MobileNetV1 INT8

Kept as the historical mobile baseline because it is small and exposes the practical browser constraints of an older detector export.

### YOLOX-Nano

Chosen as the second runnable generation because the official Apache-2.0 project ships a compact ONNX Runtime deployment asset (0.91M parameters, 416×416, 25.8 COCO AP reported upstream).

### RT-DETR R18

Promoted to runnable because the Apache-2.0 PekingU base model has a Hugging Face Staff ONNX conversion explicitly tagged for Transformers.js object detection. The pinned graph exposed the legacy ONNX Runtime Web/JSEP `AveragePool ceil()` limitation during earlier real iPhone inference even after model load succeeded. The same checkpoint revision now runs through Transformers.js 4.3.0/native WebGPU EP with WASM q8 fallback. Physical iPhone/WebKit testing on 2026-09-21 completed real WebGPU fp16 inference and a 20-run warm benchmark without reproducing the legacy failure; this remains device-specific compatibility evidence rather than a universal browser guarantee.

### LW-DETR / D-FINE

Remain research-only. They still represent important transformer-era transitions, but this project has not promoted their exact checkpoints to the same browser/provenance confidence level.
