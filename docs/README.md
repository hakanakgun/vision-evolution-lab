# Documentation

Repository layout: application JavaScript lives under `src/`, static assets under `assets/`, repository automation under `.github/`, validation scripts under `scripts/`, maintenance/export utilities under `tools/`, and project reference material in this directory. The repository root is intentionally limited to the Pages entrypoint/release manifest plus standard community files.


This directory contains implementation and investigation notes that are too detailed or too temporary for the project README.

- [Architecture](ARCHITECTURE.md) — browser runtime layout, model loading, Model Storage downloads/deletion, caching, benchmark ownership, privacy, and freshness strategy.
- [Time Machine historical experiments](CLASSICAL_CV.md) — same-image flow for Hough (1962), Neocognitron-inspired responses (1980), Canny edges (1986), Harris corners (1988), MNIST digits, face and pedestrian detection, ORB features (2011), and AlexNet, including provenance and task boundaries.
- [Historical model milestones](MODEL_HISTORY.md) — source-backed timeline context, executable early task-specific experiments, and later paper-only references.
- [iOS / WebKit diagnostics](IOS_WEBKIT_DIAGNOSTICS.md) — the ongoing post-benchmark reload investigation, physical-device evidence, diagnostic modes, upstream research, and next experiments.
- [Maintenance and release workflow](MAINTENANCE.md) — source-of-truth checks, branching, validation, version/cache rules, squash merge, and exact-SHA Pages verification.

Stable project reference documents live alongside the implementation notes in this directory:

- [Design direction](DESIGN.md)
- [Benchmark methodology](BENCHMARK_METHODOLOGY.md)
- [Model catalog](MODEL_CATALOG.md)
- [Model sources and provenance](MODEL_SOURCES.md)
- [Third-party licenses](THIRD_PARTY_LICENSES.md)

- [Compact detector review](MODEL_REVIEW.md) — source-backed LW-DETR-tiny / D-FINE-N comparison and the decision to reuse existing browser adapters.
