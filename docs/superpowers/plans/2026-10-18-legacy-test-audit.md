# Legacy code and test audit plan

> **For agentic workers:** Use independent read-only audits for reachability, tests/CI, and runtime correctness. The coordinating agent owns integration and final verification.

**Goal:** Remove only proven unreachable legacy code, fix reproduced defects, and retain meaningful regression coverage.

**Architecture:** Keep the existing static application and classic-script registry. Trace HTML, generated DOM, global APIs, workers, events, diagnostics, manual tools, and workflows before classifying code as unused.

**Tech stack:** Browser JavaScript, dependency-free Node validation/tests, isolated Puppeteer tooling, Python model export utilities.

**Spec:** User request of 2026-10-18: deep test audit; prove obsolescence before deletion; fix genuine bugs; preserve coverage; run checks and report blockers.

## Global constraints

- Base: GitHub `main` at `881c9c412c41c0ac8a4fb9381a0565e82d162ef9`, v0.27.1.
- Preserve the warm mobile UI, top/always-open timeline, YOLOX default, independent Live Camera state, and local-only user pixels.
- Preserve user/untracked files and model assets. Do not add application dependencies or change model contracts without evidence.
- A zero textual reference alone is insufficient for dynamic code; a passing static check is insufficient for runtime claims.
- Prepare a reviewable branch/PR. Merge and production deployment are outside this audit request.

## Review focus

- Navigation while asynchronous camera startup is pending must cancel the old start and stop any late stream.
- Cancelled/failed transfers must not poison reusable model cache entries or bypass retries.
- Manual model smoke/export tools remain supported if their workflow still calls them.
- Removed CSS must have no surviving static or generated DOM consumer and an identifiable retired owner.
- Missing browser/runtime access must remain a visible blocker, never a skipped assertion counted as a pass.

### Task 1: Establish the baseline and map consumers

- [x] Read repository rules, architecture, maintenance, and current main/open PR/issue state.
- [x] Run `node scripts/validate.mjs`; record the unmodified baseline.
- [x] Trace production code, tests, and CI independently with read-only subagents.
- [x] Run the existing browser suite with isolated test tooling, recording environment failures separately.

### Task 2: Prove removals and reproduce bugs

- [x] Record removal candidates with current references and the history of their retired consumer.
- [x] Add small behavioral regression tests against real scripts for each reproduced bug before fixing it.
- [x] Observe intended failures. Do not weaken assertions or broaden error allowlists to obtain green checks.
- [x] Keep supported diagnostic/model smoke paths and coverage that still protect current contracts.

### Task 3: Integrate the smallest patch

- [x] Remove only proven dead rules/helpers; fix reproduced root causes.
- [x] Wire new dependency-free checks into CI and document how to run them.
- [x] Update relevant runtime/maintenance docs and version/cache mirrors if application files change.

### Task 4: Verify and report

- [x] Run targeted regressions and `node scripts/validate.mjs` after the final patch.
- [x] Run the existing browser suite and relevant model checks where dependencies/access permit.
- [x] Review the complete diff and obtain a fresh independent review.
- [x] Document removed items, retained coverage, commands/results, untested paths, and blockers; prepare the PR without deploying.

Delivery: draft PR #76; implementation commit `3dc24d1` passed validation/browser workflow `39107019628` and YOLOv1 external-data workflow `39107019621`. See the dated audit report for the local certificate blocker and physical-device/benchmark coverage limits.
