# Benchmark methodology

Vision Evolution Lab separates **research provenance**, **browser runtime measurements**, and **visual comparison** so they are not mistaken for the same kind of evidence.

## 1. Timing boundaries

The UI reports startup and per-run costs separately.

### Startup

- **Model transfer**: wall-clock time to fetch the model asset into page memory. Browser/network cache can materially change this value.
- **Session init**: time spent in ONNX Runtime session creation and graph/backend initialization, after transfer and integrity checks.
- Startup values are excluded from current-run end-to-end time and warm inference percentiles.

### Current run

- **Preprocess**: source-image resize / tensor preparation performed by the page.
- **Inference**: the awaited runtime model execution only.
- **Postprocess + draw**: output decoding, threshold/NMS where applicable, and overlay drawing.
- **End-to-end**: preprocess + inference + postprocess/draw for that run. The first run excludes model transfer, integrity verification, and session creation just like later runs.

## 2. Warm benchmark

The Time Machine benchmark runs **20 sequential warm executions** only for models that explicitly opt into the `benchmark` capability, after their model/session or pipeline already exists. The selected model, source image, and UI confidence threshold are locked for the full 20-run sample so interaction cannot mix benchmark populations.

Faster R-CNN R50-FPN INT8 and YOLOS-tiny initially remain Time Machine-only with `benchmark:false`, like other intentionally scoped research/reference runtimes. A successful single browser inference smoke does not establish that a 20-run benchmark is stable or meaningful on mobile/WebKit, so they must not be silently added to Model Race or the warm-benchmark population.

Reported values:

- p50 / median inference
- p90 inference
- inference min–max
- **Timing variation**: the coefficient of variation (population standard deviation ÷ mean) across the 20 inference runs, shown as a percentage. Lower values mean more consistent run times; this says nothing about detection accuracy.
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

The browser implementation contract is covered by a deterministic check: direct 416×416 stretch, RGBA alpha discard, RGB channel order, planar NCHW float32, and unchanged 0–255 pixel values. The upstream source still does not specify the intended normalization, so that final scale cannot be confirmed from its model card alone. The reported iPhone run and the bundled-image check establish that this path executes and produces measurable detections on the tested input; they do not prove that raw 0–255 is the original training/export convention.

| Model | Input | Layout | Dtype | Padding / resize |
| --- | --- | --- | --- | --- |
| Tiny YOLOv2 | 416×416 | NCHW | float32 | direct resize/stretch; no padding |
| SSD-MobileNetV1 INT8 | aspect-preserving, longest side ≤640 | NHWC | uint8 | no page-side padding |
| YOLOX-Nano | 416×416 | NCHW | float32 | aspect-preserving top-left letterbox, fill 114 |
| RT-DETR R18 | 640×640 | processor-managed NCHW | rescaled float input | resize to 640×640, no pad; Transformers.js processor/postprocessor |
| RT-DETRv2 R18 | 640×640 | processor-managed NCHW | RGB float input, rescale 1/255 | resize to 640×640, no pad; Transformers.js processor/postprocessor |

Therefore latency differences combine architecture/runtime differences with each model's native input contract. The UI exposes those contracts instead of presenting the race as a controlled academic benchmark.

### Model Race benchmark

After a successful race, the optional race benchmark executes 20 warm runs per model on the same source image with the UI confidence threshold locked. Tiny YOLOv2, SSD and YOLOX report isolated ONNX Runtime model execution in the p50/p90 columns. RT-DETR R18 and RT-DETRv2 R18 report the elapsed Transformers.js object-detection pipeline call, which includes processor/model/postprocessor work. The same distinction applies when either RT-DETR model is active in the Time Machine. The UI labels this instead of treating the numbers as identical timing boundaries. Feature-map rendering is disabled during warm benchmark loops so inspection work is not added to benchmark timing.

To bound peak memory on mobile browsers, Model Race discards already-created race runtimes before the benchmark, creates only the model currently being measured, performs one unmeasured warm-up inference, then records 20 warm runs and releases/disposes that runtime before moving to the next model. Session/pipeline initialization and the warm-up inference are excluded from the 20-run statistics. Raw ONNX ArrayBuffers are evicted from the page-memory cache after successful session creation; the browser Cache API copy remains available for later reloads.

Both RT-DETR variants use an aspect-preserving staging canvas whose longest side is capped at the model input size (640 px) before the Transformers.js processor. This avoids retaining a second full-resolution RGBA backing store for large phone photos. The staging resize is outside the reported pipeline timing; the processor still owns the final model tensor preparation. RT-DETRv2 is wired as a research preview and has not yet completed live-device inference validation.

### Confidence retention

The slider minimum is also the internal retention floor. Tiny YOLOv2 decoding, YOLOX decoding and the RT-DETR Transformers.js pipeline retain detections down to that floor, while the current UI threshold is applied during draw/comparison. This allows threshold changes within the slider range to re-filter existing outputs without a new inference. SSD already exposes its decoded detections before the UI draw threshold. The retention floor is not an accuracy claim and does not change the benchmark's user-visible confidence contract.

## 5. Detection overlap is not accuracy

The Model Race overlap summary matches boxes when:

- class label is the same; and
- intersection-over-union (IoU) is at least 0.35.

The UI reports pairwise match counts across the currently runnable models plus, for each model, detections unmatched by all other runnable models at the current threshold. With the current five-model set, that is ten pairwise comparisons. Tiny YOLOv2 is a Pascal VOC 20-class detector while the other runnable models use COCO labels; only legacy VOC naming synonyms are canonicalized to equivalent COCO-style names for overlap. COCO-only classes cannot match Tiny YOLOv2.

Without ground-truth annotations this does **not** establish which model is correct.

## 6. Limited bundled-image quality check

For the bundled COCO 2017 image 397133 only, the page compares visible predictions at the current confidence against the 19 official COCO instance boxes. A prediction is a true positive when it has the same class as one still-unmatched ground-truth box and IoU ≥ 0.50. Matching is one-to-one, in descending prediction-score order. Precision, recall, F1 and TP/FP/FN are shown per model.

Tiny YOLOv2 is a Pascal VOC 20-class checkpoint, so its score uses only the four COCO annotations whose classes overlap VOC: two persons, one bottle and one dining table. Objects in COCO-only classes are excluded from its false-negative count. All other runnable models are evaluated against all 19 boxes.

This single crowded kitchen image is a smoke test for the current image and threshold. It does not compute COCO AP, represent the validation distribution, resolve annotation ambiguities, or support a general model ranking. Uploading a different image disables ground-truth scoring.

## 7. Historical task-specific experiment timing

The 1980, 1998, 2001, and 2005 historical experiments run on the current Time Machine image. They remain outside the general-object 20-run Model Race because their tasks and outputs differ.

Their reported work is separated into these boundaries:

- **Working image** — aspect-preserving copy capped at 640 px on its longest side.
- **OpenCV startup** — dedicated worker creation plus lazy OpenCV.js import/runtime initialization.
- **Cascade asset** — first fetch/install of the pinned frontal-face XML into the OpenCV virtual filesystem.
- **Digit proposals** — OpenCV contour search for small candidate crops; this may miss or propose non-digit regions.
- **MNIST load** — pinned model transfer plus WASM ONNX session creation, displayed separately from per-crop inference.
- **Method inference** — the cascade/HOG call, the 28×28 CNN calls, or the fixed-filter pattern response computation.

The digit experiment terminates its OpenCV worker before it loads the ONNX session, so the two WASM contexts are not intentionally held at the same time. The MNIST 0.70 score cutoff is only a display filter, not calibrated confidence. A zero-result run is valid and does not establish dataset-level accuracy.

No cross-task spatial overlap or accuracy claim is computed between digit, face, pedestrian, and general-object methods. Annotated ground truth and task-appropriate evaluation datasets are required for accuracy claims.

## 8. Research metrics

Paper/model-card AP, parameter counts, FLOPs, and vendor latency are shown only with their upstream context. They are not directly substituted for measurements from the current browser.

Do not compare a paper's TensorRT/T4 latency with this page's browser WASM/WebGPU latency as if they were the same benchmark.

## 9. Reproducibility checklist

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

## 10. What this is not

Vision Evolution Lab is an educational and engineering comparison environment, not a replacement for COCO/ImageNet evaluation tooling. Dataset-level accuracy claims require the relevant annotated evaluation set and its official metric implementation.
