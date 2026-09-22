# Vision Evolution Lab

A static, browser-native computer vision lab built for GitHub Pages.

## v0.7.2-diag5

- Vision Time Machine uses one active-model runner. Selecting Tiny YOLOv2 (2016), SSD-MobileNet (2017), YOLOX-Nano (2021), or RT-DETR R18 (2023) keeps the user in Time Machine and switches model metadata, preprocessing, runtime/cache state, inference, and warm benchmark behavior in place.
- Runnable SSD-MobileNetV1 INT8 object detection in the browser.
- Runnable Tiny YOLOv2 (2016) adds the pre-2017 executable generation: pinned ONNX Model Zoo opset-8 export, Pascal VOC 20 classes, 416×416 float32 NCHW input, WASM compatibility policy, and YOLOv2 grid decoding in-page.
- ONNX Runtime Web with per-model execution-provider policy and run-time WebGPU → WASM recovery. The current SSD-MobileNetV1 INT8 baseline intentionally uses WASM because its dynamic-shape graph can initialize on ORT WebGPU but fail during `OrtRun()`.
- Local image upload. User pixels are not uploaded by this application.
- Startup costs are separated from current-run timings. An optional 20-run warm benchmark reports p50/median, p90, min–max, coefficient of variation (CV), p50 end-to-end, and approximate inference FPS.
- Model Race benchmark memory is hardened for iOS/WebKit: raw ONNX buffers are evicted after session creation, RT-DETR uses a ≤640 px aspect-preserving staging canvas instead of a full-resolution duplicate, and the four benchmark groups release their runtime before the next model starts.
- Temporary iOS diagnostic: `?diag=1` keeps the basic lifecycle probe; `?diag=2` adds a model-agnostic diagnostic planner generated from the Model Race runtime adapters. Any subset of registered race models can run in race order, with the final selected runtime intentionally left resident. Diagnostic adapters may expose backend-isolation choices; RT-DETR currently offers Auto, forced WebGPU fp16, and forced WASM q8. A forced backend disables RT-DETR's normal WebGPU → WASM fallback so the probe isolates one execution path. The diagnostic also retains the 0/250/1000/3000 ms inter-model settle probe and now records start/complete breadcrumbs for every measured run of the final selected runtime. The persistent Black Box records the selected plan, backend probe, actual backends, settle value, heartbeat age, lifecycle/navigation state, runtime residency, work-canvas sizes, available JS-memory telemetry, and the last 40 diagnostic events. Normal Model Race behavior is unchanged; this instrumentation is temporary and does not claim the iOS reload is fixed.
- Inside the Model follows the active Time Machine model, including Tiny YOLOv2. It shows each model's native preprocessing contract and prepared-input preview; YOLOX additionally exposes real pre-NMS detection-head objectness maps at strides 8/16/32, while Tiny YOLOv2/SSD/RT-DETR explicitly state that deeper intermediate tensors are not yet exported.
- Live Camera mode with sequential inference and rolling latency measurements.
- Model Race is now a four-generation comparison: Tiny YOLOv2 (2016, Pascal VOC20), SSD-MobileNetV1 INT8 (2017), YOLOX-Nano (2021), and RT-DETR R18 (2023, Transformers.js/ONNX), with a 20-run warm benchmark, six pairwise overlap counts, and per-model unmatched counts. Tiny YOLOv2 legacy VOC label synonyms are canonicalized only for overlap with the COCO models; the differing label spaces remain visible and are not treated as accuracy evidence. The UI confidence threshold is applied to retained outputs so slider changes can redraw retained detections without rerunning inference; run/benchmark operations lock source, model and confidence.
- Mobile tab/timeline scroll affordances make hidden horizontal content discoverable.
- Runtime diagnostics expose browser identity conservatively, engine, UA-reported OS/platform, logical CPU count, approximate device memory when available, WebGPU availability, WASM SIMD capability, configured WASM thread count, cross-origin isolation, and the current model input size. On iOS the UI distinguishes WebKit engine facts from browser-brand inference because third-party browsers may mask their brand.
- Central model registry (`models.js`) owns model URLs/IDs, year, license note, preprocessing contract, decoder, backend policy, and pinned revisions.
- Shared cache-aware model loader (`model-loader.js`) adds streamed download progress, Cache API persistence, retry/fallback, and visible cache state for raw ONNX assets.

There is no application backend, database, account system, or analytics in v0.7.1. The browser makes ordinary network requests to jsDelivr for ONNX Runtime Web, Hugging Face for the pinned Tiny YOLOv2 and SSD-MobileNet models, and the official Megvii YOLOX GitHub Release for YOLOX-Nano. If that release asset cannot be fetched by the browser, YOLOX falls back to a pinned Apache-2.0 Hugging Face mirror that states it hosts Megvii's published ONNX checkpoints.

## Runtime model

The earliest runnable generation is the pinned ONNX Model Zoo `Tiny YOLOv2` opset-8 export (2016), followed by `SSD-MobileNetV1-12 INT8`, the official `YOLOX-Nano` ONNX release asset, and pinned RT-DETR R18 ONNX conversion. Model binaries are fetched at runtime rather than redistributed in this repository.

See [MODEL_SOURCES.md](MODEL_SOURCES.md), [MODEL_CATALOG.md](MODEL_CATALOG.md), [BENCHMARK_METHODOLOGY.md](BENCHMARK_METHODOLOGY.md), and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

## Roadmap

Priority modes:

1. Vision Time Machine
2. Model Race
3. What Does the Model See? / Inside the Model
4. Live Camera Lab

Completed foundations now include the browser benchmark layer, four-model race, sourced evolution atlas, active-model preprocessing inspector, and a Time Machine active-model runner. Physical iPhone/WebKit validation on 2026-09-21 confirmed RT-DETR R18 inference and a 20-run warm benchmark on native WebGPU fp16 with the pinned checkpoint; this is device evidence, not a guarantee for every WebKit build. Tiny YOLOv2 browser integration is statically validated in v0.7.0 but still requires first physical-device runtime/benchmark evidence. Next candidates include Failure Gallery, Classical CV vs AI, Efficiency Lab, Resolution Microscope, and deeper feature inspection.

## Local development

No build step is required. Serve the repository directory with a local HTTP server. Camera access generally requires HTTPS or localhost.

## Community

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening substantial changes, follow the [Code of Conduct](CODE_OF_CONDUCT.md), and use the issue/PR templates for reproducible reports. Security issues should follow [SECURITY.md](SECURITY.md).

The original project code is released under the [MIT License](LICENSE). Model weights, datasets, papers, and third-party runtimes keep their own terms; see [MODEL_SOURCES.md](MODEL_SOURCES.md) and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).


## Freshness / cache strategy

GitHub Pages does not provide repository-level control over HTTP response headers such as `Cache-Control`. To reduce stale-page behavior on mobile browsers, the app uses a small client-side freshness guard:

1. Every published release updates `version.json`.
2. On `pageshow` and when the tab becomes visible, the page requests `version.json` with `cache: "no-store"` and a unique `_fresh` query parameter.
3. If the manifest build differs from the build embedded in the loaded HTML, the page replaces its URL with a unique `_build` / `_fresh` URL.
4. CSS and JavaScript files also use release-version query strings.

This cannot make a release visible before GitHub Pages finishes deploying it, but once the new deployment is available it prevents a previously loaded page from remaining stale indefinitely. The first release containing this guard may still need one cache-busted visit; later releases self-check automatically.

Do not add a service worker solely for cache invalidation: a misconfigured service worker can become another source of stale content.
