# AGENTS.md

These instructions apply to the whole repository unless a deeper `AGENTS.md` overrides them.

## Project contract

Vision Evolution Lab is a static, browser-native GitHub Pages app: **“An executable history of computer vision.”**

- Keep the existing warm, light, mobile-first editorial UI. See [DESIGN.md](DESIGN.md).
- Time Machine opens with YOLOX-Nano. Do not change that default unless the task explicitly requires it.
- Live Camera has its own model selection. Do not silently couple it back to Time Machine.
- Historical experiments keep their native tasks and outputs. Do not turn face, pedestrian, digit, classification, or pattern-response experiments into a shared object-detection or accuracy leaderboard.
- User images and camera frames stay local to the browser.

## Before editing

1. Treat the current GitHub `main` branch as source of truth. Verify the current HEAD and relevant open PRs/issues before meaningful work.
2. If working in a local clone, inspect applicable `AGENTS.md` files and `git status`; preserve unrelated/user changes.
3. Read [docs/README.md](docs/README.md), then only the documents relevant to the task.
4. Prefer the smallest safe patch. Do not add dependencies, models, assets, diagnostics, or broad refactors unless the task needs them.

## Where detailed rules live

- Architecture/runtime ownership: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Development, validation, release, and deployment: [docs/MAINTENANCE.md](docs/MAINTENANCE.md)
- Benchmark contract: [BENCHMARK_METHODOLOGY.md](BENCHMARK_METHODOLOGY.md)
- Model status/capabilities: [MODEL_CATALOG.md](MODEL_CATALOG.md)
- Model provenance/checkpoints: [MODEL_SOURCES.md](MODEL_SOURCES.md)
- Licenses/redistribution: [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)
- Historical experiments: [docs/CLASSICAL_CV.md](docs/CLASSICAL_CV.md)
- Timeline/history: [docs/MODEL_HISTORY.md](docs/MODEL_HISTORY.md)
- iOS/WebKit evidence and pending tests: [docs/IOS_WEBKIT_DIAGNOSTICS.md](docs/IOS_WEBKIT_DIAGNOSTICS.md)

## Implementation rules

- Keep model eligibility capability-driven through `models.js` and `model-runtime.js`; avoid model-name branching in generic UI/benchmark paths.
- Do not fabricate intermediate activations, backend behavior, accuracy, compatibility, or memory reclamation.
- Keep these distinctions explicit: loaded ≠ inference succeeded; WebGPU available ≠ graph ran on WebGPU; detection count ≠ accuracy; paper metrics ≠ browser measurements.
- For a new or changed dependency/model/asset, verify source, exact revision/SHA where practical, code and weights licenses separately, dataset terms, preprocessing, output contract, and browser runtime support.
- If behavior or a model contract changes, update the relevant README/catalog/provenance/benchmark docs in the same patch.

## Validation and delivery

- Run `node scripts/validate.mjs`.
- Run the smallest relevant functional check for the changed path. Keep static validation, browser testing, benchmark testing, and physical-device testing distinct.
- For meaningful changes, use a branch + pull request and squash merge after checks pass.
- Do not claim deployment success until GitHub Pages succeeds for the exact merged `main` SHA; for runtime/UI changes, verify the served site when possible.
- Report unrun or unavailable checks explicitly rather than implying they passed.
