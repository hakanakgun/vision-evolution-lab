# Vision Evolution Lab

A static, browser-native computer vision lab built for GitHub Pages.

## v0.1

- Vision Time Machine shell with research provenance.
- Runnable SSD-MobileNetV1 INT8 object detection in the browser.
- ONNX Runtime Web with per-model execution-provider policy and run-time WebGPU → WASM recovery. The current SSD-MobileNetV1 INT8 baseline intentionally uses WASM because its dynamic-shape graph can initialize on ORT WebGPU but fail during `OrtRun()`.
- Local image upload. User pixels are not uploaded by this application.
- Separate model transfer, session initialization, preprocessing, inference, postprocessing, and end-to-end timings.
- Inside the Model pipeline view based on the actual preprocessing path.
- Live Camera mode with sequential inference and rolling latency measurements.
- Model Race UI prepared for the second architecture.

There is no application backend, database, account system, or analytics in v0.1. The browser still makes ordinary network requests to jsDelivr for ONNX Runtime Web and to Hugging Face for the model file.

## Runtime model

The first runnable baseline is `SSD-MobileNetV1-12 INT8` from ONNX Model Zoo, pinned to a specific upstream revision. The model is fetched at runtime rather than redistributed in this repository.

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
