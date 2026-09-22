# Vision Evolution Lab

An executable history of computer vision, running directly in the browser.

Live: https://hakanakgun.github.io/vision-evolution-lab/

## What it does

Vision Evolution Lab lets you run and compare object-detection generations without an application backend.

- **Vision Time Machine** switches the active runnable generation in place.
- **Model Race** benchmarks the compatible runnable generations sequentially on the same image; cards, benchmark rows, and overlap cells are generated from model capabilities.
- **Inside the Model** explains each model's real preprocessing contract and only shows intermediate tensors that are actually exposed.
- **Live Camera** runs local browser inference with rolling latency measurements.
- **Runtime diagnostics** expose browser/engine/runtime capabilities conservatively; hidden diagnostic-only modes remain available for iOS/WebKit regression analysis.

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

## iOS / WebKit runtime status

The repeated four-model benchmark reload issue is mitigated by using the standard non-JSEP ONNX Runtime WASM bundle for Tiny YOLOv2, SSD-MobileNetV1 INT8, and YOLOX-Nano on iOS. Desktop keeps the WebGPU/JSEP-capable bundle, while RT-DETR remains on its independent Transformers.js runtime.

On 2026-09-22, the updated iOS path completed five consecutive full four-model Benchmark ×20 runs on the user's physical iPhone/Brave session without an abrupt reload. This is strong device-level validation of the mitigation, but it does not prove the historical WebKit/JSEP root cause or universal stability across all iOS devices and versions.

The normal 1 warm-up + 20 measured-run benchmark contract is unchanged. The diagnostic modes remain available for regression analysis.

Investigation history and upstream WebKit/ONNX Runtime/Transformers.js evidence are in [docs/IOS_WEBKIT_DIAGNOSTICS.md](docs/IOS_WEBKIT_DIAGNOSTICS.md).

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

The iOS/WebKit reload mitigation has passed the current physical-device regression test. Further diagnostic work is only needed if the issue recurs; the roadmap can return to feature work.

## Local development

No build step is required. Before serving or opening a pull request, run:

`node scripts/validate.mjs`

Then serve the repository directory with a local HTTP server. Camera access generally requires HTTPS or localhost.

Runnable models declare capability metadata and register through a shared runtime-adapter contract. Model Race presentation and pairwise-overlap structure are generated from those capabilities, while sequential adapter release keeps runtime residency bounded as more model generations are added.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening substantial changes and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Security reports should follow [SECURITY.md](SECURITY.md).

The original project code is released under the [MIT License](LICENSE). Model weights, datasets, papers, and third-party runtimes keep their own terms.
