# Model catalog

Status meanings:

- **Runnable** — downloaded and executed in the browser by Vision Evolution Lab.
- **Research** — referenced in the history/evolution UI, but not downloaded or executed.
- **Candidate** — may become runnable only after browser compatibility plus checkpoint/license provenance are verified.

| Year | Model | Status | Architecture shift | Upstream license/provenance | Browser note |
| --- | --- | --- | --- | --- | --- |
| 2016 | SSD | Research | single-shot multi-scale dense detection | paper reference | historical milestone |
| 2017 | SSD-MobileNetV1 INT8 | Runnable | lightweight mobile backbone + SSD | pinned ONNX Model Zoo source; see `MODEL_SOURCES.md` | WASM policy because current ORT WebGPU path fails at run time for this export |
| 2020 | DETR | Research | transformer set prediction | paper reference | historical milestone |
| 2021 | YOLOX-Nano | Runnable | anchor-free decoupled YOLO head | official Megvii project/release, Apache-2.0 | WebGPU-first with WASM fallback |
| 2023 | RT-DETR R18 | Research / candidate | real-time end-to-end DETR | Hugging Face `PekingU/rtdetr_r18vd`: Apache-2.0, COCO, 20.2M params | browser compatibility not yet promoted to runnable |
| 2024 | LW-DETR-tiny | Research / candidate | lightweight ViT encoder + shallow DETR decoder | Hugging Face `xbsu/LW-DETR`: Apache-2.0; official repo points to these weights | ONNX export exists upstream; browser operator/runtime fit not yet validated |
| 2024 | D-FINE-N | Research / candidate | fine-grained distribution refinement for DETR box regression | official code Apache-2.0; 4M / 42.8 AP reported upstream | checkpoint/dataset provenance and browser operator fit must be re-verified before runnable integration |

## License policy

A permissive repository license is necessary but not automatically sufficient to add a downloadable model to the app.

Before a candidate becomes runnable, verify:

1. exact checkpoint source and revision;
2. checkpoint/weights terms, not only source-code terms;
3. training/pretraining dataset terms;
4. redistribution requirements if the model will be mirrored;
5. browser runtime compatibility;
6. model input/output and postprocessing contract.

The current app avoids redistributing model binaries: runnable models are fetched from pinned or official upstream sources.

## Current selection rationale

### SSD-MobileNetV1 INT8

Kept as the historical mobile baseline because it is small and exposes the practical browser constraints of an older detector export.

### YOLOX-Nano

Chosen as the second runnable generation because the official Apache-2.0 project ships a compact ONNX Runtime deployment asset (0.91M parameters, 416×416, 25.8 COCO AP reported upstream).

### RT-DETR / LW-DETR / D-FINE

Kept research-only for now. They represent the transformer-era transition more faithfully than adding another closely related YOLO/CNN detector, but a candidate is not promoted merely because a paper/repository exists.
