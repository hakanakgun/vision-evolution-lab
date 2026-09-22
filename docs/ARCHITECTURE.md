# Architecture

## Scope

Vision Evolution Lab is a static, browser-native computer-vision application deployed on GitHub Pages. There is no application backend, account system, database, or analytics service.

The current runtime is intentionally client-side so users can compare computer-vision generations without uploading their image pixels to an application server.

## Main modules

- `index.html` — page structure, release freshness guard, diagnostic controls, and runtime script entrypoints.
- `models.js` — model registry, provenance/runtime metadata, preprocessing contracts, capability declarations, pinned revisions, backend policy, and label sets.
- `model-runtime.js` — runtime adapter registry and contract validation shared by Time Machine and Model Race.
- `model-loader.js` — raw ONNX asset loading, Cache API persistence, streamed progress, retry/fallback, and in-memory buffer ownership.
- `app.js` — Time Machine state, the SSD runtime adapter, image/camera flows, Inside the Model rendering, and shared browser diagnostics.
- `race.js` — Tiny YOLOv2, YOLOX-Nano, and RT-DETR runtime adapters, Model Race benchmarking, overlap comparison, and iOS regression diagnostics.
- `scripts/validate.mjs` — dependency-free repository contract checks used locally and by pull-request CI.

## Model capability and runtime adapter contract

Runnable model metadata lives in `models.js`. Each runnable model declares capabilities independently from its runtime implementation:

- `timeMachine` — boolean opt-in for Time Machine;
- `benchmark` — boolean opt-in for the warm benchmark contract;
- `live` — boolean opt-in, currently true only where Live Camera has a real implementation;
- `inspection` — a truthful inspection descriptor, or `false` when no inspection surface is exposed;
- `race` — comparison group, deterministic order, UI prefix/work-canvas ownership, and timing boundary.

Runtime behavior is registered through `model-runtime.js`. Every runnable adapter exposes the same minimum lifecycle:

- `run(source, canvas, options)`
- `release()`
- `backend()`
- optional `runtimeInfo()` and diagnostic backend choices

SSD registers its adapter in `app.js`; Tiny YOLOv2, YOLOX-Nano, and RT-DETR register theirs in `race.js`. Time Machine and the Model Race benchmark resolve runtimes through this registry instead of selecting implementations with model-name branches.

Model Race presentation is also capability-driven. Each `race` capability declares deterministic order, DOM prefix, work-canvas ownership, timing boundary, card/metric presentation, and architecture summary. `race.js` generates result cards, benchmark rows, pairwise-overlap cells, unmatched counters, architecture cards, and hidden work canvases from that metadata. Adding another model to the `general-object` comparison group no longer requires adding another static result card or pairwise overlap cell to `index.html`.

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

The production preference is WebGPU fp16 with WASM q8 fallback where supported. Diagnostic runs can explicitly lock the requested device.

RT-DETR timing is intentionally broader than the direct ORT model timings: the measured pipeline call includes Transformers.js processor/model/postprocessor work.

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

## Repository validation

Run `node scripts/validate.mjs` before opening a pull request. The same command runs in the `validate` GitHub Actions workflow.

The validation currently checks JavaScript syntax, inline scripts, static and generated DOM IDs, version/build/cache references, script order, runnable model capability/presentation contracts, unique race order/prefixes, adapter registration and group-release ownership, dynamic Model Race scaffolding, diagnostic isolation, iOS/desktop ORT bootstrap policy, 20-run benchmark invariants, confidence-retention guardrails, and local Markdown links.

