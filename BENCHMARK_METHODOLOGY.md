# Benchmark methodology

Vision Evolution Lab separates **research provenance**, **browser runtime measurements**, and **visual comparison** so they are not mistaken for the same kind of evidence.

## 1. Timing boundaries

The UI reports startup and per-run costs separately.

### Startup

- **Model transfer**: wall-clock time to fetch the model asset into page memory. Browser/network cache can materially change this value.
- **Session init**: ONNX Runtime session creation and graph/backend initialization.
- Startup values are not included in warm inference percentiles.

### Current run

- **Preprocess**: source-image resize / tensor preparation performed by the page.
- **Inference**: the awaited runtime model execution only.
- **Postprocess + draw**: output decoding, threshold/NMS where applicable, and overlay drawing.
- **End-to-end**: preprocess + inference + postprocess/draw for that run.

## 2. Warm benchmark

The Time Machine benchmark runs **20 sequential warm executions** for whichever runnable model is active after its model/session or pipeline already exists. The selected model, source image, and UI confidence threshold are locked for the full 20-run sample so interaction cannot mix benchmark populations.

Reported values:

- p50 / median inference
- p90 inference
- inference min–max
- coefficient of variation (CV)
- p50 end-to-end
- approximate inference FPS = 1000 / p50 inference milliseconds

The page yields to the browser between runs with `requestAnimationFrame`. Results are still affected by browser scheduling, thermal state, power policy, background activity, and runtime/backend implementation.

## 3. Device/runtime context

Record the browser and device context shown beside a result:

- browser/version
- OS/platform as exposed by the browser
- logical CPU count
- approximate device memory when exposed
- WebGPU availability
- WASM SIMD support
- configured WASM thread count
- `crossOriginIsolated`
- model input dimensions

GitHub Pages is normally not cross-origin isolated, so multi-threaded WASM can be unavailable even on multi-core hardware.

## 4. Model Race fairness

Model Race fixes:

- the same **source image**
- the same user-visible confidence threshold
- the same browser/device session

It does **not** force the same tensor preprocessing.

That is deliberate. Each model receives the preprocessing expected by its upstream deployment path:

Tiny YOLOv2's upstream model card leaves its preprocessing subsection blank. The original Core ML conversion lineage documents 0–1 image scaling, while the migrated ONNX export exposes a float32 NCHW tensor interface and contemporary exact-export implementations pack resized image bytes into that interface. Vision Evolution Lab therefore treats its current raw-float browser packing as validation-sensitive and does not call it field-verified until the target browser produces sensible detections.

| Model | Input | Layout | Dtype | Padding / resize |
| --- | --- | --- | --- | --- |
| Tiny YOLOv2 | 416×416 | NCHW | float32 | direct resize/stretch; no padding |
| SSD-MobileNetV1 INT8 | aspect-preserving, longest side ≤640 | NHWC | uint8 | no page-side padding |
| YOLOX-Nano | 416×416 | NCHW | float32 | aspect-preserving top-left letterbox, fill 114 |
| RT-DETR R18 | 640×640 | processor-managed NCHW | rescaled float input | resize to 640×640, no pad; Transformers.js processor/postprocessor |

Therefore latency differences combine architecture/runtime differences with each model's native input contract. The UI exposes those contracts instead of presenting the race as a controlled academic benchmark.

### Four-model race benchmark

After a successful race, the optional race benchmark executes 20 warm runs per model on the same source image with the UI confidence threshold locked. Tiny YOLOv2, SSD and YOLOX report isolated ONNX Runtime model execution in the p50/p90 columns. RT-DETR reports the elapsed Transformers.js object-detection pipeline call, which includes its processor/model/postprocessor path. The same distinction applies when RT-DETR is the active Time Machine model. The UI labels this instead of treating the numbers as identical timing boundaries. Feature-map rendering is disabled during warm benchmark loops so inspection work is not added to benchmark timing.

To bound peak memory on mobile browsers, Model Race discards already-created race runtimes before the benchmark, creates only the model currently being measured, performs one unmeasured warm-up inference, then records 20 warm runs and releases/disposes that runtime before moving to the next model. Session/pipeline initialization and the warm-up inference are excluded from the 20-run statistics. Raw ONNX ArrayBuffers are evicted from the page-memory cache after successful session creation; the browser Cache API copy remains available for later reloads.

RT-DETR also uses an aspect-preserving staging canvas whose longest side is capped at the model input size (640 px) before the Transformers.js processor. This avoids retaining a second full-resolution RGBA backing store for large phone photos. The staging resize is outside the reported RT-DETR pipeline timing; the processor still owns the final model tensor preparation.

### Confidence retention

The slider minimum is also the internal retention floor. Tiny YOLOv2 decoding, YOLOX decoding and the RT-DETR Transformers.js pipeline retain detections down to that floor, while the current UI threshold is applied during draw/comparison. This allows threshold changes within the slider range to re-filter existing outputs without a new inference. SSD already exposes its decoded detections before the UI draw threshold. The retention floor is not an accuracy claim and does not change the benchmark's user-visible confidence contract.

## 5. Detection overlap is not accuracy

The Model Race overlap summary matches boxes when:

- class label is the same; and
- intersection-over-union (IoU) is at least 0.35.

The UI reports all six pairwise match counts across Tiny YOLOv2, SSD, YOLOX and RT-DETR plus, for each model, detections unmatched by all other three models at the current threshold. Tiny YOLOv2 is a Pascal VOC 20-class detector while the other runnable models use COCO labels; only legacy VOC naming synonyms are canonicalized to equivalent COCO-style names for overlap. COCO-only classes cannot match Tiny YOLOv2.

Without ground-truth annotations this does **not** establish which model is correct.

## 6. Research metrics

Paper/model-card AP, parameter counts, FLOPs, and vendor latency are shown only with their upstream context. They are not directly substituted for measurements from the current browser.

Do not compare a paper's TensorRT/T4 latency with this page's browser WASM/WebGPU latency as if they were the same benchmark.

## 7. Reproducibility checklist

For a useful shared result, record:

1. model/version;
2. source image dimensions;
3. browser/version and OS/device;
4. execution backend;
5. model input resolution and preprocessing;
6. confidence threshold;
7. startup values separately from warm values;
8. p50/p90/min–max/CV from the 20-run warm benchmark;
9. whether the tab was foreground and the device was on battery / low-power mode if relevant.

## 8. What this is not

Vision Evolution Lab is an educational and engineering comparison environment, not a replacement for COCO/ImageNet evaluation tooling. Dataset-level accuracy claims require the relevant annotated evaluation set and its official metric implementation.
