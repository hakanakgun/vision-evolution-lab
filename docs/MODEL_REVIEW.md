# Compact detector review

Reviewed on 2026-10-08 for Architecture Explorer. This review concerns the existing pinned models; it does not add weights, change runtime eligibility, or reproduce a paper benchmark.

| Model | Research contribution | Source checkpoint | Browser contract |
| --- | --- | --- | --- |
| LW-DETR-tiny | Lightweight ViT encoder with interleaved window/global attention, a projector, and a shallow DETR decoder | [AnnaZhang/lwdetr_tiny_60e_coco](https://huggingface.co/AnnaZhang/lwdetr_tiny_60e_coco/tree/4b636b514dcf623f6eafc9e1ab63b8ad5c513925), 12.1M parameters, Apache-2.0 metadata | Existing 38,313,297-byte fp32 ONNX export, direct ONNX Runtime Web/WASM; custom CUDA kernels disabled |
| D-FINE-N | Iterative refinement of bounding-box distributions (FDR) and localization self-distillation during training (GO-LSD) | [ustc-community/dfine-nano-coco](https://huggingface.co/ustc-community/dfine-nano-coco/tree/066438d3d8f0da137a37b38fdf3368fd4afceced), 3.8M parameters in Hub metadata, Apache-2.0 | Existing [pinned ONNX Community conversion](https://huggingface.co/onnx-community/dfine_n_coco-ONNX/tree/e2b9c0f0884ee7c90b79feedfd30054e82ed634c), Transformers.js/WASM fp32 |

## Primary sources

- LW-DETR: [paper](https://arxiv.org/abs/2406.03459) and [official implementation](https://github.com/Atten4Vis/LW-DETR). The official repository reports 12.1M parameters and 42.6 COCO mAP (42.9 in its reimplementation) for tiny; these are upstream evaluation results.
- D-FINE: [paper](https://arxiv.org/abs/2410.13842) and [official implementation](https://github.com/Peterande/D-FINE). The official repository rounds nano to 4M parameters and reports 42.8 COCO AP. Its latency uses an NVIDIA T4, batch size 1, fp16, and TensorRT 10.4.0; it is not browser latency. The paper abstract's L/X results do not describe the nano checkpoint.

## Application decision

Keep both existing adapters and their declared capabilities. Their architectural ideas are useful side-by-side teaching examples; paper metrics do not justify a browser winner or wider runtime eligibility. Show links from the existing model registry in Architecture Explorer so readers can inspect each selected model's evidence without a new service, network fetch, or duplicate catalog.

The static GitHub Pages architecture remains appropriate for this scope: user images stay local, model delivery remains pinned and cached, and inference stays behind the existing adapter registry. A server, database, account system, or remote inference endpoint would add complexity without supporting this comparison workflow.

Full checkpoint hashes, preprocessing, output contracts, license distinctions, and physical-device limits remain in [MODEL_SOURCES.md](MODEL_SOURCES.md), [MODEL_CATALOG.md](MODEL_CATALOG.md), and [ARCHITECTURE.md](ARCHITECTURE.md).
