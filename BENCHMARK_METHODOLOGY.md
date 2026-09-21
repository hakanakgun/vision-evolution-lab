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

The current benchmark runs **20 sequential inferences** after the model/session already exists.

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

| Model | Input | Layout | Dtype | Padding / resize |
| --- | --- | --- | --- | --- |
| SSD-MobileNetV1 INT8 | aspect-preserving, longest side ≤640 | NHWC | uint8 | no page-side padding |
| YOLOX-Nano | 416×416 | NCHW | float32 | aspect-preserving top-left letterbox, fill 114 |

Therefore latency differences combine architecture/runtime differences with each model's native input contract. The UI exposes those contracts instead of presenting the race as a controlled academic benchmark.

## 5. Detection overlap is not accuracy

The Model Race overlap summary matches boxes when:

- class label is the same; and
- intersection-over-union (IoU) is at least 0.35.

`SSD-only` or `YOLOX-only` means only that the other model did not produce a matching detection above the current threshold.

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
