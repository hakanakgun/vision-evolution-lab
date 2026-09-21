# Vision Evolution Lab

A static, browser-native computer vision lab built for GitHub Pages.

## v0.3.2

- Vision Time Machine now includes a sourced evolution atlas that separates runnable models from research-only transformer-era candidates. Runnable timeline milestones are interactive: SSD scrolls to its runner; YOLOX opens Model Race and reuses the current Time Machine image when available.
- Runnable SSD-MobileNetV1 INT8 object detection in the browser.
- ONNX Runtime Web with per-model execution-provider policy and run-time WebGPU → WASM recovery. The current SSD-MobileNetV1 INT8 baseline intentionally uses WASM because its dynamic-shape graph can initialize on ORT WebGPU but fail during `OrtRun()`.
- Local image upload. User pixels are not uploaded by this application.
- Startup costs are separated from current-run timings. An optional 20-run warm benchmark reports p50/median, p90, min–max, coefficient of variation (CV), p50 end-to-end, and approximate inference FPS.
- Inside the Model now includes a live input inspector showing the source image, actual SSD input pixels, tensor contract, and a native-preprocessing comparison against YOLOX.
- Live Camera mode with sequential inference and rolling latency measurements.
- Model Race is now executable: SSD-MobileNetV1 INT8 (2017 generation) vs official YOLOX-Nano ONNX (2021 anchor-free generation) on the same source image and confidence threshold, with per-model native preprocessing and detection-overlap matching.
- Mobile tab/timeline scroll affordances make hidden horizontal content discoverable.
- Runtime diagnostics expose browser/OS, logical CPU count, approximate device memory when available, WebGPU availability, WASM SIMD capability, configured WASM thread count, cross-origin isolation, and the current model input size.

There is no application backend, database, account system, or analytics in v0.3.2. The browser makes ordinary network requests to jsDelivr for ONNX Runtime Web, Hugging Face for the pinned SSD-MobileNet model, and the official Megvii YOLOX GitHub Release for YOLOX-Nano. If that release asset cannot be fetched by the browser, YOLOX falls back to a pinned Apache-2.0 Hugging Face mirror that states it hosts Megvii's published ONNX checkpoints.

## Runtime model

The first runnable baseline is `SSD-MobileNetV1-12 INT8` from ONNX Model Zoo. The second runnable model is the official `YOLOX-Nano` ONNX release asset from the Apache-2.0 YOLOX project. Both are fetched at runtime rather than redistributed in this repository.

See [MODEL_SOURCES.md](MODEL_SOURCES.md), [MODEL_CATALOG.md](MODEL_CATALOG.md), [BENCHMARK_METHODOLOGY.md](BENCHMARK_METHODOLOGY.md), and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

## Roadmap

Priority modes:

1. Vision Time Machine
2. Model Race
3. What Does the Model See? / Inside the Model
4. Live Camera Lab

Completed foundations now include the browser benchmark layer, two-model race, sourced evolution atlas, and preprocessing inspector. Next candidates are a transformer-era runnable compatibility spike, Failure Gallery, Classical CV vs AI, Efficiency Lab, Resolution Microscope, and deeper feature inspection.

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
