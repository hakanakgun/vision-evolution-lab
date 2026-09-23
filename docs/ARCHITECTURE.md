# Architecture

## Scope

Vision Evolution Lab is a static, browser-native computer-vision application deployed on GitHub Pages. There is no application backend, account system, database, or analytics service.

The current runtime is intentionally client-side so users can compare computer-vision generations without uploading their image pixels to an application server.

## Main modules

- `index.html` — page structure, release freshness guard, diagnostic controls, and runtime script entrypoints.
- `models.js` — five general-object Model Race models, two Time Machine-only historical detector models, and separate task-specific history-experiment metadata, provenance, preprocessing contracts, pinned revisions, and labels.
- `model-runtime.js` — runtime adapter registry and contract validation shared by Time Machine, Live Camera, and Model Race.
- `model-loader.js` — raw ONNX asset loading, Cache API persistence, streamed progress, retry/fallback, and in-memory buffer ownership.
- `app.js` — Time Machine state, SSD-MobileNet runtime adapter, capability-driven Live Camera orchestration, Inside the Model rendering, and shared browser diagnostics.
- `historical-detectors.js` — checksum-verified SSD 2016 ONNX and pinned DETR q8 Transformers.js adapters, both limited to Time Machine.
- `race.js` — Tiny YOLOv2, YOLOX-Nano, and RT-DETR runtime adapters, Model Race benchmarking, overlap comparison, and iOS regression diagnostics.
- `history-experiments.js` — Time Machine historical experiment runners for a pattern-response preview, MNIST digit crops, frontal-face cascade, and HOG pedestrian detection.
- `classical-cv-worker.js` — lazy OpenCV.js WASM runtime, frontal-face cascade, HOG pedestrian detection, and explicit OpenCV object cleanup.
- `scripts/validate.mjs` — dependency-free repository contract checks used locally and by pull-request CI.

## Model capability and runtime adapter contract

Runnable model metadata lives in `models.js`. Each runnable model declares capabilities independently from its runtime implementation:

- `timeMachine` — boolean opt-in for Time Machine;
- `benchmark` — boolean opt-in for the warm benchmark contract;
- `live` — `false` or ordered live-camera metadata; all five runnable general-object detectors are live-capable;
- `inspection` — a truthful inspection descriptor, or `false` when no inspection surface is exposed;
- `race` — comparison group, deterministic order, UI prefix/work-canvas ownership, and timing boundary.

Runtime behavior is registered through `model-runtime.js`. Every runnable adapter exposes the same minimum lifecycle:

- `run(source, canvas, options)`
- `release()`
- `backend()`
- optional `prepare()` for pre-run initialization
- optional `runtimeInfo()`, inspection data, and diagnostic backend choices

SSD registers its adapter in `app.js`; Tiny YOLOv2, YOLOX-Nano, and RT-DETR register theirs in `race.js`. Time Machine and the Model Race benchmark resolve runtimes through this registry instead of selecting implementations with model-name branches.

Model Race presentation is also capability-driven. Each `race` capability declares deterministic order, DOM prefix, work-canvas ownership, timing boundary, card/metric presentation, and architecture summary. `race.js` generates result cards, benchmark rows, pairwise-overlap cells, unmatched counters, architecture cards, and hidden work canvases from that metadata. Adding another model to the `general-object` comparison group no longer requires adding another static result card or pairwise overlap cell to `index.html`.

Live Camera resolves its model from the active Time Machine selection through the same runtime registry. The `live` capability marks eligible detectors and provides presentation metadata; the camera has no separate model choice. Camera start calls the selected adapter's optional `prepare()` hook before requesting camera access, and each frame goes through `adapter.run(..., {live:true})`. The loop processes one frame at a time without queuing; changing the Time Machine selection stops the current stream, waits for any in-flight camera inference, releases the previous model runtime, and cancels a pending camera start. Time Machine inference and camera start wait for the model transition to finish before preparing the newly selected runtime. Tiny YOLOv2, SSD-MobileNetV1 INT8, YOLOX-Nano, RT-DETR R18, and RT-DETRv2 R18 are enabled. Sustained physical-iOS camera testing is still pending.

## Historical experiments in Time Machine

Historical experiments consume the current Time Machine source image and render their task-specific output onto the same image canvas. Selecting one does not replace the active general-object model, so Inside the Model continues to follow the selected runnable AI model.

These experiments are registered under `models.js:historyExperiments`, outside `VisionRuntimeRegistry`. Each history experiment declares an image input, its task, and an output type such as a response map or labeled boxes. A future image-and-prompt VLM can add a text or grounded-text output adapter without changing the general-object race contract; no VLM runtime is loaded now.

Before a history experiment runs, the registered AI adapters are released. The 2001 face cascade, 2005 HOG detector, and 1998 digit-region proposal stage use a dedicated worker that lazily imports pinned OpenCV.js. The worker receives an aspect-preserving image capped at 640 px on its longest side and returns only region boxes and timings. It deletes OpenCV objects within each run.

For the digit experiment, the OpenCV worker is terminated after candidate extraction and before the pinned MNIST-12 ONNX opset-12 session is initialized. The model is SHA-256 checked and uses ONNX Runtime Web's WASM provider. This avoids intentionally keeping OpenCV WASM and the digit-model runtime resident together.

Leaving Time Machine, pressing **Release historical runtime**, or navigating away terminates the OpenCV worker and releases the digit ONNX session. Worker termination defines the JavaScript ownership boundary; it does not prove the browser has already returned native/WASM pages to the operating system.

The 1980 feature response is an educational approximation using fixed orientation filters and local max pooling. It is not a trained Neocognitron checkpoint. The 1998 checkpoint illustrates the handwritten-digit task from the LeNet era; it is not original 1998 LeNet-5 weights. Face and pedestrian outputs retain their own tasks and are not compared to each other as accuracy evidence.

See [CLASSICAL_CV.md](CLASSICAL_CV.md) for method details and provenance.

## Runtime entrypoints

### ONNX Runtime Web

Direct ORT models no longer use one bundle on every platform.

`runtime-bootstrap.js` selects exactly one ONNX Runtime Web 1.30.0 classic bundle before `models.js`, `app.js`, and `race.js` execute:

- iOS / iPadOS default: `ort.wasm.min.js` — standard non-JSEP WASM distribution.
- Other platforms default: `ort.webgpu.min.js` — JSEP/WebGPU-capable distribution so YOLOX can retain its WebGPU-first path.
- Diagnostic override: `?ort=wasm` forces the standard WASM bundle.
- Diagnostic override: `?ort=jsep` forces the JSEP/WebGPU-capable bundle.

The bootstrap uses a parser-ordered script insertion. It intentionally avoids loading both ORT distributions into one page/process because that would add another WASM/native runtime and contaminate the memory question.

Tiny YOLOv2 and SSD-MobileNetV1 INT8 always request the WASM execution provider. YOLOX requests WebGPU first only when the selected direct-ORT bundle is JSEP-capable; under the standard WASM bundle its provider list is WASM-only.

The application pins `ort.env.wasm.wasmPaths` to the matching 1.30.0 distribution directory. When the page is not cross-origin isolated, `ort.env.wasm.numThreads` is forced to 1. With cross-origin isolation, the app may use up to four threads based on `navigator.hardwareConcurrency`.

This policy is an iOS memory-safety mitigation based on upstream ONNX Runtime evidence that Safari/WebKit can exhibit persistent CPU/memory growth in JSEP mode even when the requested execution provider is WASM. It is not evidence that the reload bug is fixed.


### Transformers.js

RT-DETR R18 is loaded through pinned Transformers.js 4.3.0 using the pinned `onnx-community/rtdetr_r18vd` revision declared in `models.js`.

RT-DETRv2 R18 uses the same pipeline contract with its separate pinned ONNX Community revision. A user-reported iOS/WebKit WebGPU fp16 run succeeded; it remains a research preview while repeat-run, multi-image and broader device validation are pending.

The production preference is WebGPU fp16 with WASM q8 fallback where supported. Diagnostic runs can explicitly lock the requested device.

Both RT-DETR variants have a broader timing boundary than the direct ORT models: the measured pipeline call includes Transformers.js processor/model/postprocessor work. RT-DETRv2's iOS screenshot reports one 1.216 s inference; its 20-run warm benchmark has not yet been recorded.

## Runtime ownership

Normal Model Race is sequential:

Normal Model Race and the benchmark both use sequential runtime ownership. Before a race starts, registered race runtimes are released. Each normal race adapter is released after its result has been retained for drawing/comparison; benchmark runs likewise release between models. The shared `model-runtime.js` registry owns group release semantics. This prevents model count from turning into resident-runtime count.

1. initialize one model runtime,
2. execute one unmeasured warm-up,
3. execute 20 measured warm runs,
4. render/store benchmark results,
5. release that runtime before moving to the next model.

Raw ONNX `ArrayBuffer` references are dropped after ORT session construction and the model loader's in-memory entry is evicted. This reduces retained JavaScript references but is not evidence that browser-native, WASM, GPU, or allocator memory has already been reclaimed.

RT-DETR uses an aspect-preserving staging canvas capped at 640 px on the longest side so the race does not retain a second full-resolution source image.

## Model selection and UI state

Time Machine owns the active runnable model. Selecting a generation does not navigate to Model Race.

The timeline itself is registry-driven. `models.js` owns chronological entries, the default Time Machine AI model, and a separate `historyExperiments` table. Time Machine opens with YOLOX-Nano as a lightweight fast-inference starting point; Live Camera follows this active selection. General-object model entries reference runtime model keys; earlier task-specific experiments reference their own runner metadata. Selecting an experiment does not change the active AI model. `app.js` renders the timeline and derives selection eligibility from the `timeMachine` capability instead of a model-name allow-list.

Inside the Model follows the same active model through the `inspection` capability contract. The contract declares the native input/preprocessing presentation, tensor shape/layout, pipeline explanation, comparison-table values, preview strategy, intermediate-data policy, and result note. `app.js` renders these fields generically.

- Tiny YOLOv2 declares preprocessing plus its final-grid contract, but no simulated backbone activations.
- SSD declares native preprocessing and no deeper exported activations.
- YOLOX declares real adapter-supplied pre-NMS detection-head objectness maps at strides 8/16/32; these are not backbone feature maps.
- RT-DETR declares the processor contract and no encoder/decoder activation export.

A model may set `inspection:false`; the inspector then reports that no inspection surface is registered rather than inventing one. Adapter-backed intermediate data requires an explicit `inspectionData()` runtime hook. The native-preprocessing comparison table is generated from the same inspection metadata, so adding another Time Machine model does not require another static HTML column.

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

## Repository validation

Run `node scripts/validate.mjs` before opening a pull request. The same command runs in the `validate` GitHub Actions workflow.

The validation currently checks JavaScript syntax, inline scripts, static and generated DOM IDs, version/build/cache references, script order, timeline/default-model integrity, runnable model capability/presentation contracts, inspection preview/pipeline/comparison contracts, adapter-backed inspection hooks, unique race order/prefixes, adapter registration and group-release ownership, dynamic Time Machine/Inside the Model/Model Race scaffolding, diagnostic isolation, iOS/desktop ORT bootstrap policy, 20-run benchmark invariants, confidence-retention guardrails, and local Markdown links.
