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

- Run `node --check app.js`.
- Confirm the page has no duplicate HTML IDs.
- Test image upload and at least one inference.
- If benchmark code changed, follow [BENCHMARK_METHODOLOGY.md](BENCHMARK_METHODOLOGY.md), run the 20-run warm benchmark, and verify p50/p90/min-max/CV are populated.
- Test the affected layout at desktop width and a narrow mobile width.
- Do not add analytics or image-upload behavior without explicit discussion. User images and camera frames are intended to stay local.
- Keep unrelated changes out of the pull request.

## Model contributions

A runnable model must include enough provenance to audit it. Update `MODEL_SOURCES.md` and `MODEL_CATALOG.md` with:

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
