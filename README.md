# Vision Evolution Lab

An executable history of computer vision, running directly in the browser.

Live: https://hakanakgun.github.io/vision-evolution-lab/

## What it does

Vision Evolution Lab lets you run and compare object-detection generations without an application backend.

- **Vision Time Machine** switches the active runnable generation in place.
- **Model Race** benchmarks four generations sequentially on the same image.
- **Inside the Model** explains each model's real preprocessing contract and only shows intermediate tensors that are actually exposed.
- **Live Camera** runs local browser inference with rolling latency measurements.
- **Runtime diagnostics** expose browser/engine/runtime capabilities conservatively, with additional diagnostic-only modes for the ongoing iOS/WebKit memory investigation.

Selecting a model in Time Machine stays in Time Machine. Inside the Model follows the same active model.

## Runnable generations

| Year | Model | Dataset / labels | Main browser path |
| --- | --- | --- | --- |
| 2016 | Tiny YOLOv2 | Pascal VOC 20 | ONNX Runtime Web / WASM |
| 2017 | SSD-MobileNetV1 INT8 | COCO | ONNX Runtime Web / intentional WASM |
| 2021 | YOLOX-Nano | COCO | ONNX Runtime Web / standard WASM on iOS; WebGPU-first on desktop |
| 2023 | RT-DETR R18 | COCO | Transformers.js / WebGPU fp16 or WASM q8 |

Exact model revisions, licenses, provenance, preprocessing, and fallback rules are maintained in [MODEL_SOURCES.md](MODEL_SOURCES.md), [MODEL_CATALOG.md](MODEL_CATALOG.md), and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

## Benchmark contract

Model Race locks the source image, model order, and confidence for the benchmark.

Each model performs:

1. one unmeasured warm-up,
2. 20 measured warm runs,
3. runtime release before the next model in the normal race path.

The benchmark reports p50, p90, min-max, coefficient of variation, p50 end-to-end time, and approximate inference FPS.

Pairwise same-class IoU overlap is a disagreement/overlap diagnostic, not an accuracy metric.

See [BENCHMARK_METHODOLOGY.md](BENCHMARK_METHODOLOGY.md).

## Browser runtime

The application is static and browser-native:

- no application backend,
- no database or account system,
- no analytics service,
- model binaries are fetched at runtime,
- user image pixels are processed locally by the application.

Current runtime versions are pinned in the repository. Release/cache behavior and runtime ownership are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## iOS / WebKit diagnostic status

The repeated four-model benchmark can still trigger an abrupt page recreation on physical iPhone/WebKit runs. The root cause is not yet proven and the bug is **not fixed**.

The current build also changes the iOS runtime architecture: Tiny YOLOv2, SSD-MobileNetV1 INT8, and YOLOX-Nano use the standard non-JSEP ONNX Runtime WASM bundle on iOS, while desktop keeps the WebGPU/JSEP-capable bundle. RT-DETR remains on its independent Transformers.js runtime. The normal 1 warm-up + 20 measured-run benchmark contract is unchanged.

Investigation history, physical-device evidence, upstream WebKit/ONNX Runtime/Transformers.js research, and the next experiments are in [docs/IOS_WEBKIT_DIAGNOSTICS.md](docs/IOS_WEBKIT_DIAGNOSTICS.md).

## Documentation

See [docs/README.md](docs/README.md) for the documentation map.

Stable repository references:

- [Benchmark methodology](BENCHMARK_METHODOLOGY.md)
- [Model catalog](MODEL_CATALOG.md)
- [Model sources and provenance](MODEL_SOURCES.md)
- [Third-party licenses](THIRD_PARTY_LICENSES.md)

## Roadmap

Current priority order:

1. Vision Time Machine
2. Model Race
3. Inside the Model
4. Live Camera
5. Failure Gallery
6. Efficiency Lab
7. Classical CV vs AI
8. Resolution Microscope
9. Architecture Explorer

The iOS/WebKit benchmark reload investigation remains the current P0 before returning to Classical CV work.

## Local development

No build step is required. Serve the repository directory with a local HTTP server.

Camera access generally requires HTTPS or localhost.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening substantial changes and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Security reports should follow [SECURITY.md](SECURITY.md).

The original project code is released under the [MIT License](LICENSE). Model weights, datasets, papers, and third-party runtimes keep their own terms.
