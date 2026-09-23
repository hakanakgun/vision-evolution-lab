# Documentation

This directory contains implementation and investigation notes that are too detailed or too temporary for the project README.

- [Architecture](ARCHITECTURE.md) — browser runtime layout, model loading, caching, benchmark ownership, privacy, and freshness strategy.
- [Classical CV vs AI](CLASSICAL_CV.md) — OpenCV.js worker isolation, Viola–Jones-era cascade/HOG execution, provenance, task boundaries, and cleanup rules.
- [Historical model milestones](MODEL_HISTORY.md) — source-backed timeline context, original task differences, and why older references are not runnable or directly comparable.
- [iOS / WebKit diagnostics](IOS_WEBKIT_DIAGNOSTICS.md) — the ongoing post-benchmark reload investigation, physical-device evidence, diagnostic modes, upstream research, and next experiments.

Repository-level reference documents remain at the root because they are stable project contracts:

- [Benchmark methodology](../BENCHMARK_METHODOLOGY.md)
- [Model catalog](../MODEL_CATALOG.md)
- [Model sources and provenance](../MODEL_SOURCES.md)
- [Third-party licenses](../THIRD_PARTY_LICENSES.md)
