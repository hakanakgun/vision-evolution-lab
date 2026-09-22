# Architecture

## Scope

Vision Evolution Lab is a static, browser-native computer-vision application deployed on GitHub Pages. There is no application backend, account system, database, or analytics service.

The current runtime is intentionally client-side so users can compare computer-vision generations without uploading their image pixels to an application server.

## Main modules

- `index.html` — page structure, release freshness guard, diagnostic controls, and runtime script entrypoints.
- `models.js` — model registry, model metadata, preprocessing contracts, pinned revisions, backend policy, and label sets.
- `model-loader.js` — raw ONNX asset loading, Cache API persistence, streamed progress, retry/fallback, and in-memory buffer ownership.
- `app.js` — Time Machine active-model state, SSD baseline runtime, image/camera flows, Inside the Model rendering, and shared browser diagnostics.
- `race.js` — Tiny YOLOv2, YOLOX-Nano, and RT-DETR runtimes, Model Race benchmarking, overlap comparison, and temporary iOS diagnostic runners.

## Runtime entrypoints

### ONNX Runtime Web

The page currently loads:

`onnxruntime-web@1.30.0/dist/ort.webgpu.min.js`

The application then pins `ort.env.wasm.wasmPaths` to the same 1.30.0 distribution directory.

When the page is not cross-origin isolated, `ort.env.wasm.numThreads` is forced to 1. With cross-origin isolation, the app may use up to four threads based on `navigator.hardwareConcurrency`.

Tiny YOLOv2 and SSD-MobileNetV1 INT8 are intentionally WASM. YOLOX-Nano supports WebGPU/WASM selection in diagnostics. A provider label such as `wasm` describes the requested ONNX Runtime execution provider; it does not by itself prove which ONNX Runtime distribution artifact or native allocator path was active underneath it.

### Transformers.js

RT-DETR R18 is loaded through pinned Transformers.js 4.3.0 using the pinned `onnx-community/rtdetr_r18vd` revision declared in `models.js`.

The production preference is WebGPU fp16 with WASM q8 fallback where supported. Diagnostic runs can explicitly lock the requested device.

RT-DETR timing is intentionally broader than the direct ORT model timings: the measured pipeline call includes Transformers.js processor/model/postprocessor work.

## Runtime ownership

Normal Model Race is sequential:

1. initialize one model runtime,
2. execute one unmeasured warm-up,
3. execute 20 measured warm runs,
4. render/store benchmark results,
5. release that runtime before moving to the next model.

Raw ONNX `ArrayBuffer` references are dropped after ORT session construction and the model loader's in-memory entry is evicted. This reduces retained JavaScript references but is not evidence that browser-native, WASM, GPU, or allocator memory has already been reclaimed.

RT-DETR uses an aspect-preserving staging canvas capped at 640 px on the longest side so the race does not retain a second full-resolution source image.

## Model selection and UI state

Time Machine owns the active runnable model. Selecting a generation does not navigate to Model Race.

Inside the Model follows the same active model:

- Tiny YOLOv2 shows its real preprocessing contract and the final detection grid contract.
- SSD shows native preprocessing and does not invent deeper tensors.
- YOLOX shows real pre-NMS detection-head objectness maps at strides 8/16/32; these are not backbone feature maps.
- RT-DETR shows the processor contract and does not claim encoder/decoder activations are exposed.

## Benchmark contract

Model Race locks the source image, model order, and confidence for the duration of a benchmark.

Each model performs one unmeasured warm-up and 20 measured warm runs. Initialization is outside the measured warm-run timing. YOLOX feature-map rendering is excluded from benchmark timing.

The UI confidence threshold filters retained outputs. Runtime retention must not regress to using the current UI threshold as the model's retention floor.

Pairwise overlap uses same-class IoU >= 0.35. It is a disagreement/overlap diagnostic, not an accuracy metric.

See [BENCHMARK_METHODOLOGY.md](../BENCHMARK_METHODOLOGY.md) for the stable benchmark contract.

## Model assets, cache, and provenance

Raw model binaries are fetched at runtime rather than redistributed in the repository.

`model-loader.js` distinguishes:

- in-memory reuse,
- application Cache API hit/miss,
- network fetch,
- retry,
- streamed transfer progress.

The browser's HTTP-cache hit/miss is not inferred when the Fetch API does not expose it.

Model implementation license, checkpoint terms, dataset terms, runtime license, pinned revision, provenance, redistribution status, and attribution are documented separately in [MODEL_SOURCES.md](../MODEL_SOURCES.md) and [THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md).

## Privacy boundaries

User image pixels are processed in the browser and are not intentionally persisted to diagnostic storage.

Temporary diagnostics may persist bounded runtime metadata such as timestamps, stage names, dimensions, backend labels, estimated allocation sizes, and lifecycle state. They must not persist image pixels, local file paths, tokens, or sensitive asset URLs.

## Release freshness

GitHub Pages does not provide repository-level control over response headers such as `Cache-Control`. The application therefore uses a small client-side freshness guard:

1. each published release updates `version.json`,
2. on `pageshow` and when the tab becomes visible, the page requests `version.json` with `cache: "no-store"` and a unique freshness query,
3. if the manifest build differs from the build embedded in loaded HTML, the page replaces the current URL with a unique build/freshness URL,
4. CSS and JavaScript files use release-version query strings.

This cannot make a release visible before GitHub Pages finishes deploying it. It only reduces the risk of an already-open mobile tab remaining indefinitely stale after the new deployment exists.

A service worker is intentionally not used solely for cache invalidation because a misconfigured service worker would add another persistent cache layer.

## Temporary diagnostics

`?diag=1` provides the basic lifecycle probe.

`?diag=2` provides the lightweight Black Box and the existing all-WASM R1-R4 reclamation matrix.

`?diag=3` adds bounded deep, crash-safe telemetry. It is diagnostic-only and must not change the normal benchmark contract.

See [IOS_WEBKIT_DIAGNOSTICS.md](IOS_WEBKIT_DIAGNOSTICS.md).
