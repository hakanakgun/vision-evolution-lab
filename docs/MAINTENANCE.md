# Repository maintenance and release workflow

This document is the operational companion to [CONTRIBUTING.md](../CONTRIBUTING.md). It describes how maintainers and coding agents should change, validate, merge, and publish the repository without duplicating architecture or model-specific documentation.

## Source of truth and scope

- GitHub `main` is the source of truth. A handoff SHA is a checkpoint, not an instruction to overwrite newer work.
- Check the current `main` HEAD and relevant open PRs/issues before starting meaningful work.
- In a local checkout, inspect `git status` and preserve unrelated changes.
- Keep patches narrow. Do not opportunistically refactor adjacent code or add diagnostics/dependencies/assets without a task-driven reason.

Detailed product/runtime constraints live in [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN.md](DESIGN.md), and the model reference documents linked from [README.md](README.md).

## Branch and pull-request flow

For meaningful code, runtime, model, or documentation-contract changes:

1. Branch from the verified current `main`.
2. Make the smallest sufficient patch.
3. Run repository validation and task-specific checks.
4. Review the complete diff for unrelated changes and stale documentation.
5. Open a focused PR describing behavior, evidence, limits, and any provenance/license impact.
6. Merge with **squash** after required checks pass.

Small typo-only documentation fixes may use the same flow without changing the app version.

## Version and cache contract

`version.json` is the app release manifest. `index.html` mirrors its build identifier and cache-busting query version; `scripts/validate.mjs` checks that they agree.

- Bump the app version when shipped client/runtime behavior or cache-busted application assets change.
- Documentation-only or agent-guidance changes do not require an app version bump unless they are intentionally part of an app release.
- Do not hand-edit only one version reference. Update the manifest and all validated mirrors together.

## Required validation

Always run:

`node scripts/validate.mjs`

Then add the smallest check that can fail for the changed behavior:

- UI/layout: affected desktop width plus narrow mobile width.
- Model/runtime: at least one real inference on the affected adapter.
- Benchmark logic: follow [BENCHMARK_METHODOLOGY.md](BENCHMARK_METHODOLOGY.md) and keep initialization outside warm-run measurements.
- iOS/WebKit-sensitive runtime work: follow [IOS_WEBKIT_DIAGNOSTICS.md](IOS_WEBKIT_DIAGNOSTICS.md); do not substitute desktop simulation for physical-device evidence.
- Provenance/model changes: reconcile [MODEL_CATALOG.md](MODEL_CATALOG.md), [MODEL_SOURCES.md](MODEL_SOURCES.md), and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

The `validate` workflow also runs `tools/test_architecture_explorer_browser.cjs` in headless Chrome at 1440×1000 and 390×844. It checks the compared pair across tab returns, all declared model profiles and links, keyboard focus, layout containment, Time Machine navigation, historical-task control/metric scoping, and AI-model re-entry while keeping Live Camera independent. The desktop pass also runs a real D-FINE inference and checks that end-to-end time is the sum of the displayed measured phases; startup remains separate. Test-only Puppeteer tooling is installed under the runner's temporary directory; the application gains no runtime dependency. Screenshots and a JSON report are uploaded as a seven-day CI artifact. On a `main` push, the same check waits for the expected `version.json` build and exercises the public Pages release. This is desktop Chrome with a mobile viewport, not physical-iPhone or WebKit coverage.

Treat syntax/static validation, browser execution, benchmark results, and physical-device tests as separate evidence classes.

## Merge and deployment verification

After merge:

1. Record the exact squash-merged `main` SHA.
2. Confirm the `validate` workflow succeeds for that SHA.
3. Confirm GitHub Pages **build**, **deploy**, and **report-build-status** succeed for that same SHA.
4. For runtime/UI releases, check the public Pages site and its release/build marker when the environment permits.
5. Only then describe the change as deployed/live.

A successful PR check alone is not deployment evidence.

## LW-DETR Pages asset workflow

`.github/workflows/publish-lwdetr-pages-model.yml` runs when relevant LW-DETR model metadata changes. It downloads the pinned release asset, verifies exact size/SHA-256, and only creates a protected-branch candidate if the committed same-origin Pages asset is stale.

Do not bypass that verification or directly replace the binary without reconciling [MODEL_SOURCES.md](MODEL_SOURCES.md) and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

## YOLOv1 external-data graph workflow

`.github/workflows/yolov1-external-data.yml` rebuilds the small YOLOv1 external-data graph from the committed checksum-pinned Pages chunks on relevant pull requests or manual runs. It reconstructs and verifies the canonical 541,358,513-byte model, converts large embedded initializer payloads into external-data offset references to the same canonical byte stream, validates deterministic CPU-ORT output equality, runs an ONNX Runtime Web external-data smoke, runs repository validation, and fails if the regenerated graph/manifest differ from the committed copies. The workflow uses pinned graph-tool/runtime versions and never commits or publishes another copy of the 516.3 MiB weights.

Generate the graph with `python scripts/build_yolov1_external_graph.py` on a development branch, review the manifest, and commit the generated small graph + manifest through the normal PR flow. Do not hand-edit either generated file. A browser/runtime change does not alter the canonical YOLOv1 model SHA unless the model itself is intentionally republished and provenance is updated.

## Evidence discipline

Do not turn limited evidence into broader claims:

- one device/session/image is not general compatibility or accuracy;
- a returned `release()`/`dispose()` call is not proof of native/WASM/GPU memory reclamation;
- detection count is not ground truth;
- upstream paper metrics are not measurements of this browser implementation.

When a check was not run, say so.

## Model Storage verification

The Chrome UI check also checks the visible timeline legend and 12-row Model Storage layout. Tiny deterministic assets exercise direct Cache API reuse, pinned Transformers.js cache keys, cancellation cleanup and scoped deletion preserving unrelated entries. A real pinned YOLOX and YOLOS-tiny downloads are then checked across page reload and deleted through the UI. No inference is needed for this storage-only path. Evidence includes Model Storage screenshots at desktop and mobile widths; physical iOS/WebKit storage behavior remains a separate check.
