# Legacy code and test audit · 2026-10-18

Baseline: GitHub `main` at `881c9c412c41c0ac8a4fb9381a0565e82d162ef9` (v0.27.1). The baseline had no open PRs/issues; its validate and architecture-browser jobs succeeded in [run 39042390298](https://github.com/hakanakgun/vision-evolution-lab/actions/runs/39042390298). This audit prepares v0.27.2 on a review branch; it does not authorize production deployment.

## Method and removal evidence

Four independent investigations covered production reachability, tests/workflows, core storage correctness, and app lifecycle. A separate reviewer inspected the integrated patch. Searches included HTML, generated DOM/class names, classic-script globals, registry dispatch, workers, event listeners, diagnostics, manual tools, and Git history. No runtime/test file was removed merely because it had no ES import or an old name.

The following **11 CSS class groups** have no current consumer in `index.html` or `src/`. The cited ancestor commits removed their owning UI. Only the unused selectors were removed; adjoining active rules and the modern timeline remain.

| Removed class groups | Evidence that their owner was retired |
| --- | --- |
| `race-slot`, `placeholder` | `05b4c13` replaced the original placeholder Model Race articles with executable results. |
| `research-card`, `research-pill` | `f87918a` made D-FINE runnable; `e2423d7` replaced the last LW-DETR research card. |
| `race-diag-actions` | `24a6e47` removed the R1–R4 matrix controls. Active `race-diag-copy-row` rules were preserved. |
| `timeline-cue` | `de3cfef` removed its timeline element. Current scroll-state handling remains consumed by the navigation gradient. |
| `timeline-overview`, `timeline-overview-main`, `timeline-label`, `timeline-current`, `timeline-scroll-note` | `5fb9569` replaced the old header DOM. Descendant and media rules for these classes were removed too. |

The unused local `registry` alias in `src/core/model-storage.js` was removed. Public bridge helpers and capability/runtime fields were retained: repository silence alone does not establish a safe public-API removal. The non-iOS YOLOv1 `legacy-buffer` fallback and dynamically loaded classical worker remain supported.

One exact formatter-source spelling assertion was replaced with six behavioral cases. Renaming its local `mb` variable preserved independently checked outputs but failed the old text guard. Decimal-unit outputs and invalid/missing sizes are now tested without prescribing local variable names.

**No complete test or smoke tool was proven obsolete.** Every existing test/smoke tool has an active PR/main or explicit manual workflow caller. The earlier Node-only JSPI Blob smoke was already removed by `fd456bc`; `f204aa3` deliberately preserved the manual LW-DETR export pipeline. Those supported checks were kept.

## Reproduced defects and fixes

| Area | Observed failure before the fix | Current protection |
| --- | --- | --- |
| Camera startup | Leaving Live Camera during preparation/permission could start a camera and inference in a hidden panel. Stale playback/metadata could detach a replacement stream or clear its busy state. | Attempt-token cancellation, stream-owned cleanup, current-attempt busy state; 15 real-script lifecycle tests, including successful start, denial, Stop, pagehide, flip and rollback. |
| Model Storage navigation | Keyboard/group activation bypassed the tab-click refresh, leaving an empty or stale inventory. | One shared `vision:tabchange` listener; four tests cover first activation, return, pointer single-refresh and unrelated navigation. |
| Direct ONNX storage | Short or same-size corrupt bytes could be saved/reused; adapter rejection left the poisoned cache in place. | Exact declared byte length and configured SHA-256 on direct network/cache/memory data, scoped eviction, existing retry/fallback. |
| Transfer cancellation | Cancellation while persistence/final inventory was pending could return success. | Abort checks after verification/persistence/inventory; fully completed files remain reusable, partials are not saved. |
| Multipart/OPFS recovery | A malformed newly cached part poisoned the retry; an invalid cached external-data chunk repeatedly failed without reaching valid network bytes. | Failed multipart cache entries are removed; invalid external chunks get one verified network repair; failed OPFS writes remove partial files. Nineteen core tests cover these storage/integrity paths. |
| Shipped LW-DETR validation | Missing, truncated or same-size-corrupt Pages model bytes passed ordinary repository validation. | Existence/size/SHA-256 checks against registry metadata. Four subprocess fixture tests run the actual validator and verify the original asset is unchanged. |
| YOLOv1 INT8 publication gate | The exporter recorded required classes without rejecting an INT8 candidate missing them. | Native/FP32/INT8 share the existing bicycle/car/dog minimum-label gate. Six standard-library tests accept canonical/extra labels and reject empty/missing labels. |

The accepted canonical YOLOv1 INT8 run already reported `['bicycle', 'car', 'dog']` for the current 541,358,513-byte SHA-pinned artifact: [run 36227875129, job 108365279350](https://github.com/hakanakgun/vision-evolution-lab/actions/runs/36227875129/job/108365279350). The new gate preserves that acceptance criterion. A rejected candidate is deleted by the existing exporter error path; the required downstream ORT smoke cannot publish a missing file.

Browser failure reporting now retains the original error, console errors and failed requests in `report.json` before rethrowing. Assertions and the existing narrow optional-tokenizer-probe allowance were not weakened.

## Verification

| Check | Result and scope |
| --- | --- |
| Unmodified `node scripts/validate.mjs` | Passed at v0.27.1. |
| RED/GREEN | Before fixes: camera 9 expected failures; cache navigation 2; initial core storage 11; direct SHA follow-up 5; LW corruption 3. YOLO helper tests failed before implementation. The final suites pass. |
| `node --test tools/test_camera_lifecycle.cjs tools/test_model_cache_ui.cjs tools/test_model_storage.cjs tools/test_validation.cjs` | Passed: 42 tests, zero failures/skips. Executes actual scripts with controlled browser boundaries and the real validator subprocess. |
| `python3 -B -S tools/test_yolov1_feasibility.py -v` | Passed: six tests with site packages disabled; no model dependencies/download/export. |
| `node scripts/validate.mjs` | Passed at candidate v0.27.2, including version/cache mirrors and committed LW-DETR bytes. |
| `NODE_PATH=/tmp/vision-audit-ort/node_modules node tools/smoke_lw_detr_ort_web.cjs assets/models/lw-detr-tiny.onnx` | Passed with isolated pinned ONNX Runtime Web 1.30.0: the actual bundled graph executes on WASM and returns finite `logits [1,100,91]` and `pred_boxes [1,100,4]`. This zero-input graph check does not establish real-image detection accuracy or browser compatibility. |
| `node --check tools/test_architecture_explorer_browser.cjs`; `git diff --check` | Passed. |
| Existing browser suite, local Chrome | Failed before app initialization: pinned ORT CDN request returned `net::ERR_CERT_AUTHORITY_INVALID`. Isolated Puppeteer/Chrome installation resolved missing local tooling; certificate validation was retained. Structured failure evidence identifies the actual blocked request. This is not a passing UI/inference check. |

The dependency-free Node and Python suites now run in PR/main validation. The full existing browser suite and model workflows remain enabled.

## Remaining limits and follow-up

- Local browser end-to-end validation is blocked by CDN certificate trust. CI browser results must be evaluated for the exact review commit; baseline main success does not validate this patch.
- Physical iPhone/WebKit camera, storage, memory and sustained inference were not tested in this session. Controlled media/OPFS fixtures do not establish device compatibility.
- The full YOLOv1 exporter and model-conversion pipeline were not rerun. The tiny label tests verify gate logic, not new model quality. No model assets or preprocessing/output contracts changed.
- Benchmark run-count source guards remain weaker than deterministic invocation tests: changing actual loop counts while leaving their expected text in comments can pass static checks. They were retained because removing them would lose current protection. A dedicated follow-up should execute Model Race warm-up plus 20 measured calls, Time Machine measured counts, sequential release and diagnostic snapshot isolation with controlled adapters.
- The existing JSPI smoke tests ORT/Blob compatibility using its own OPFS code. New tests exercise real app external-data failure/recovery with tiny fixtures, but they do not exhaust native OPFS quota/transaction behavior, persistent-marker reuse or a full 516 MiB download.
- Direct hash validation adds startup work, and existing historical adapters still perform their own checksum checks. Warm session inference is unchanged; the YOLOv1 multipart path has a regression asserting per-part hashing without a new full-model digest. Measure startup on a physical device before optimizing this further.
- The previously reported RF-DETR zero-detection behavior remains unresolved; finite outputs/detection counts in UI smoke checks are not accuracy evidence.

Review should focus on async stream ownership, scoped cache repair and real-browser acceptance. The safest rollback is reverting the review commit, preserving model assets and browser data; no cache-wide migration or deletion was introduced.
