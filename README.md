# Vision Evolution Lab

A static, browser-native computer vision lab built for GitHub Pages.

## v0.2.0

- Vision Time Machine shell with research provenance.
- Runnable SSD-MobileNetV1 INT8 object detection in the browser.
- ONNX Runtime Web with per-model execution-provider policy and run-time WebGPU → WASM recovery. The current SSD-MobileNetV1 INT8 baseline intentionally uses WASM because its dynamic-shape graph can initialize on ORT WebGPU but fail during `OrtRun()`.
- Local image upload. User pixels are not uploaded by this application.
- Startup costs are separated from current-run timings. An optional 20-run warm benchmark reports p50/median, p90, min–max, coefficient of variation (CV), p50 end-to-end, and approximate inference FPS.
- Inside the Model pipeline view based on the actual preprocessing path.
- Live Camera mode with sequential inference and rolling latency measurements.
- Model Race is now executable: SSD-MobileNetV1 INT8 (2017 generation) vs official YOLOX-Nano ONNX (2021 anchor-free generation) on the same source image and confidence threshold, with per-model native preprocessing and detection-overlap matching.
- Mobile tab/timeline scroll affordances make hidden horizontal content discoverable.
- Runtime diagnostics expose browser/OS, logical CPU count, approximate device memory when available, WebGPU availability, WASM SIMD capability, configured WASM thread count, cross-origin isolation, and the current model input size.

There is no application backend, database, account system, or analytics in v0.2. The browser makes ordinary network requests to jsDelivr for ONNX Runtime Web, Hugging Face for the pinned SSD-MobileNet model, and the official Megvii YOLOX GitHub Release for YOLOX-Nano.

## Runtime model

The first runnable baseline is `SSD-MobileNetV1-12 INT8` from ONNX Model Zoo. The second runnable model is the official `YOLOX-Nano` ONNX release asset from the Apache-2.0 YOLOX project. Both are fetched at runtime rather than redistributed in this repository.

See [MODEL_SOURCES.md](MODEL_SOURCES.md) and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

## Roadmap

Priority modes:

1. Vision Time Machine
2. Model Race
3. What Does the Model See? / Inside the Model
4. Live Camera Lab

Later candidates: Browser AI Benchmark, Failure Gallery, Classical CV vs AI, Efficiency Lab, Resolution Microscope, and Architecture Explorer.

## Local development

No build step is required. Serve the repository directory with a local HTTP server. Camera access generally requires HTTPS or localhost.

## Community

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening substantial changes, follow the [Code of Conduct](CODE_OF_CONDUCT.md), and use the issue/PR templates for reproducible reports. Security issues should follow [SECURITY.md](SECURITY.md).

The original project code is released under the [MIT License](LICENSE). Model weights, datasets, papers, and third-party runtimes keep their own terms; see [MODEL_SOURCES.md](MODEL_SOURCES.md) and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
