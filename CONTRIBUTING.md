# Contributing to Vision Evolution Lab

Thanks for helping improve the project. The goal is an **executable history of computer vision**: research context, browser-native inference, and reproducible measurements on the same user input.

## Before you start

- Search existing issues before opening a new one.
- For substantial features, model additions, architecture changes, or new dependencies, open an issue first so the scope can be discussed.
- Small fixes such as documentation, accessibility, browser compatibility, and obvious bugs can go directly to a pull request.

## Local development

There is no build step.

1. Clone the repository.
2. Serve the repository root over HTTP, for example:
   `python -m http.server 8000`
3. Open `http://localhost:8000`.

Camera access normally requires HTTPS or localhost.

## Basic checks

Before opening a pull request:

- Run `node scripts/validate.mjs`. It covers JavaScript syntax, DOM IDs, cache/version references, timeline/default-model integrity, Time Machine/inspection/Live Camera/Model Race capability contracts, Classical CV isolation/pinning, adapter hooks, runtime bootstrap policy, benchmark invariants, and local documentation links.
- If model runtime behavior changed, confirm the affected adapter still owns and releases its runtime without adding model-name branching to the generic benchmark path.
- Test image upload and at least one inference.
- If benchmark code changed, follow [BENCHMARK_METHODOLOGY.md](docs/BENCHMARK_METHODOLOGY.md), run the 20-run warm benchmark, and verify p50/p90/min-max/CV are populated.
- Test the affected layout at desktop width and a narrow mobile width.
- Do not add analytics or image-upload behavior without explicit discussion. User images and camera frames are intended to stay local.
- Keep unrelated changes out of the pull request.

## Model contributions

A runnable model must declare its capabilities in `src/models/models.js`, register a runtime adapter through `src/core/model-runtime.js`, and include enough provenance to audit it. A model opting into Time Machine must appear in the registry timeline; if it exposes Inside the Model, provide a truthful `inspection` contract for preview, tensor/pipeline text, comparison values, intermediate-data policy, and result note. Adapter-backed intermediate tensors require an explicit `inspectionData()` hook. A model opting into Live Camera must declare ordered `live` metadata and use the same runtime adapter; add `prepare()` when camera start should initialize the runtime before permission/frame processing. Models opting into Model Race must also provide unique race order/prefix metadata, presentation metrics, architecture text, and a work-canvas ID. These UI surfaces are generated from the contracts rather than model-name branches. Update `MODEL_SOURCES.md` and `MODEL_CATALOG.md` with:

- model/family and publication year;
- original paper or primary research source;
- implementation source;
- exact weights/checkpoint source and pinned revision where practical;
- code license and weights license;
- training dataset and any relevant dataset terms;
- model file size, precision, expected input layout and output schema;
- supported browser execution provider(s), such as WASM or WebGPU;
- any known browser/runtime limitations.

Do not assume that an implementation license automatically covers downloaded weights.

Classical CV additions must also pin the browser runtime and any downloaded classifier/cascade asset, document file-specific notices, keep task boundaries explicit, and clean up OpenCV.js/WASM objects rather than relying on JavaScript garbage collection.

For fair Model Race comparisons, document preprocessing, input resolution, confidence policy, warm-up/measurement method, and any backend differences.

## Pull requests

Keep pull requests focused. Explain:

- what changed;
- why it belongs in the project;
- how it was tested;
- browser/device limitations;
- licensing or provenance changes, if any.

Screenshots are useful for visual changes, but avoid uploading private or sensitive images.

## Conduct and security

Participation is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Do not report security vulnerabilities in a public issue; follow [SECURITY.md](SECURITY.md).
