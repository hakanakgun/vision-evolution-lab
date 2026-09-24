# Vision Evolution Lab

An executable history of computer vision, running directly in the browser.

Live: https://hakanakgun.github.io/vision-evolution-lab/

## What it does

Vision Evolution Lab lets you run and compare object-detection generations without an application backend.

- **Vision Time Machine** opens with YOLOX-Nano as a lightweight fast-inference starting point; all runnable years remain selectable, including SSD 2016 and DETR 2020 reference checkpoints. One image stays selected while early task-specific experiments show pattern responses, handwritten digits, faces, or pedestrians.
- **Model Race** benchmarks the compatible runnable generations sequentially on the same image; cards, benchmark rows, and overlap cells are generated from model capabilities.
- **Inside the Model** explains each model's real preprocessing contract and only shows intermediate tensors that are actually exposed.
- **Live Camera** has its own model picker for the five live-capable detectors. It runs the selected detector locally with rolling latency measurements, processes frames sequentially without a frame queue, and can switch models while keeping the camera stream open.
- **Early history experiments** run inside Time Machine. Their task-specific outputs stay separate from the general-object models in Model Race.
- **D-FINE-N** runs as a Time Machine-only COCO reference through a pinned Transformers.js ONNX conversion on WASM fp32. Performance and iOS/WebKit compatibility have not been benchmarked.
- **LW-DETR-tiny** runs in Time Machine through a reproducibly exported, checksum-pinned ONNX checkpoint on ONNX Runtime Web/WASM fp32. It is excluded from Race, Live Camera, individual benchmarks, and Inside the Model. One user-reported iOS 18.7 / Brave-WebKit Benchmark ×20 completed on 2026-09-24; this does not establish broad device performance or user-image accuracy. See the iOS diagnostics.
- **Runtime diagnostics** expose browser/engine/runtime capabilities conservatively; hidden diagnostic-only modes remain available for iOS/WebKit regression analysis.

Selecting a model in Time Machine stays in Time Machine. Inside the Model follows the same active model. Live Camera keeps an independent model selection, so changing either view does not silently change the other.

## Runnable generations

| Year | Model | Dataset / labels | Main browser path |
| --- | --- | --- | --- |
| 2016 | Tiny YOLOv2 | Pascal VOC 20 | ONNX Runtime Web / WASM |
| 2017 | SSD-MobileNetV1 INT8 | COCO | ONNX Runtime Web / intentional WASM |
| 2021 | YOLOX-Nano | COCO | ONNX Runtime Web / standard WASM on iOS; WebGPU-first on desktop |
| 2023 | RT-DETR R18 | COCO | Transformers.js / WebGPU fp16 or WASM q8 |
| 2024-06 | LW-DETR-tiny | COCO · pinned checkpoint label map | Time Machine only · ONNX Runtime Web / WASM fp32 · 38.3 MB |
| 2024-07 | RT-DETRv2 R18 · research preview | COCO | Transformers.js / WebGPU fp16 or WASM int8 |
| 2024-10 | D-FINE-N | COCO | Time Machine only · Transformers.js / WASM fp32 |

Exact model revisions, licenses, provenance, preprocessing, and fallback rules are maintained in [MODEL_SOURCES.md](MODEL_SOURCES.md), [MODEL_CATALOG.md](MODEL_CATALOG.md), and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

## Earlier task-specific experiments

These experiments use the one image selected in Time Machine. They illustrate different tasks over time; their outputs are not a shared accuracy leaderboard.

| Year | Experiment | What appears on the image | Boundary |
| --- | --- | --- | --- |
| 1980 | Neocognitron-inspired feature hierarchy | Orientation response map with local max pooling | Educational approximation; no original trained weights or object labels |
| 1998 | LeNet-era MNIST CNN reference | Digit-like crop boxes with handwritten digit labels | A later MNIST CNN checkpoint, not original LeNet-5 weights; digits only |
| 2001 | Viola–Jones method family | Frontal-face cascade boxes | OpenCV cascade representative, not the paper's original trained weights |
| 2005 | HOG + linear SVM | Pedestrian boxes | OpenCV default people detector, not the paper's original checkpoint |
| 2012 | AlexNet | Top-five ImageNet class labels | Pinned ONNX Model Zoo INT8 checkpoint, 224×224 WASM classification; not the exact paper weights or an object detector |

The source stays in the browser. The 1998 digit experiment only classifies isolated handwritten digit crops; it does not detect general objects or arbitrary text. The historical methods stay outside Model Race because their tasks and outputs differ.

## Benchmark contract

Model Race locks the source image, model order, and confidence for the benchmark.

Each model performs:

1. one unmeasured warm-up,
2. 20 measured warm runs,
3. runtime release before the next model in the normal race path.

The benchmark reports p50, p90, min-max, run-to-run timing variation, p50 end-to-end time, and approximate inference FPS. Timing variation is the coefficient of variation: lower values mean more consistent inference times, not higher accuracy.

Pairwise same-class IoU overlap is a disagreement/overlap diagnostic, not an accuracy metric.

Model Race includes one licensed COCO 2017 validation image for repeatable smoke tests. It reports per-image precision, recall and F1 against 19 official boxes at IoU ≥ 0.50 and the current confidence. Tiny YOLOv2 is scored only on the four boxes from classes shared with Pascal VOC. This is not COCO AP or a dataset-level benchmark. See [Benchmark samples](BENCHMARK_SAMPLES.md) for attribution and scope.

See [BENCHMARK_METHODOLOGY.md](BENCHMARK_METHODOLOGY.md).

## Browser runtime

The application is static and browser-native:

- no application backend,
- no database or account system,
- no analytics service,
- most model binaries are fetched at runtime; the verified LW-DETR-tiny ONNX export is served as a same-origin static Pages asset,
- user image pixels are processed locally by the application.

Current runtime versions are pinned in the repository. Release/cache behavior and runtime ownership are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## iOS / WebKit runtime status

The repeated four-model benchmark reload issue is mitigated by using the standard non-JSEP ONNX Runtime WASM bundle for Tiny YOLOv2, SSD-MobileNetV1 INT8, and YOLOX-Nano on iOS. Desktop keeps the WebGPU/JSEP-capable bundle, while RT-DETR remains on its independent Transformers.js runtime.

On 2026-09-22, the updated iOS path completed five consecutive full four-model Benchmark ×20 runs on the user's physical iPhone/Brave session without an abrupt reload. On 2026-09-23, the user also completed a five-model ×20 run and Model Race, including the RT-DETRv2 R18 research preview, on iOS 18.7 / Brave-WebKit. These results support the tested device path; they do not prove the historical WebKit/JSEP root cause or universal stability across iOS devices and versions.

Live Camera has an independent selector for its five eligible detectors; changing Time Machine no longer changes the active camera model. SSD 2016 and DETR are intentionally Time Machine-only; their mobile-device latency and memory behavior have not yet been tested. Sustained per-model camera testing on physical iOS devices is still pending. See [the iOS test checklist](docs/IOS_WEBKIT_DIAGNOSTICS.md#physical-ios-tests-still-pending).

The normal 1 warm-up + 20 measured-run benchmark contract is unchanged. The diagnostic modes remain available for regression analysis.

Investigation history and upstream WebKit/ONNX Runtime/Transformers.js evidence are in [docs/IOS_WEBKIT_DIAGNOSTICS.md](docs/IOS_WEBKIT_DIAGNOSTICS.md).

## Documentation

See [docs/README.md](docs/README.md) for the documentation map.

Stable repository references:

- [Benchmark methodology](BENCHMARK_METHODOLOGY.md)
- [Benchmark samples](BENCHMARK_SAMPLES.md)
- [Model catalog](MODEL_CATALOG.md)
- [Model sources and provenance](MODEL_SOURCES.md)
- [Third-party licenses](THIRD_PARTY_LICENSES.md)
- [Time Machine historical experiments](docs/CLASSICAL_CV.md)

## Roadmap

Current priority order:

1. Vision Time Machine
2. Model Race
3. Inside the Model
4. Live Camera
5. Efficiency Lab
6. Resolution Microscope
7. Architecture Explorer

Failure Gallery is deferred until a broader, rights-reviewed ground-truth set is available and the user wants to evaluate it.

The iOS/WebKit reload mitigation has passed the current physical-device regression test. Further diagnostic work is only needed if the issue recurs; the roadmap can return to feature work.

## Local development

No build step is required. Before serving or opening a pull request, run:

`node scripts/validate.mjs`

Then serve the repository directory with a local HTTP server. Camera access generally requires HTTPS or localhost.

Runnable models declare capability metadata and register through a shared runtime-adapter contract. Time Machine timeline entries, Inside the Model presentation, native-preprocessing comparison, Live Camera model eligibility, Model Race cards, benchmark rows, and pairwise-overlap structure are generated from those contracts. Sequential adapter release keeps runtime residency bounded as more model generations are added.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening substantial changes and follow the [Code of Conduct](CODE_OF_CONDUCT.md).

Security reports should follow [SECURITY.md](SECURITY.md).

The original project code is released under the [MIT License](LICENSE). Model weights, datasets, papers, and third-party runtimes keep their own terms.
