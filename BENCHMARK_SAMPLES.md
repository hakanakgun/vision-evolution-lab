# Benchmark samples

## Bundled image

Model Race can load `assets/benchmark/coco-val-000000397133.jpg` with **Use COCO val sample**. It is COCO 2017 validation image 397133 (640 × 427), titled “Kitchen,” by Maggie W (`maggiew` on Flickr), and is distributed under [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). The image file's SHA-256 is `09e1d25c75f7879bdaa69c327fece5cabacd53939c8c2ef9e87f1c97a2e478c4`. See [third-party notices](THIRD_PARTY_LICENSES.md) for attribution and source links.

This is a repeatable smoke-test input for the COCO models. Tiny YOLOv2 uses Pascal VOC labels and is only scored against the four COCO instances from shared classes (two persons, one bottle and one dining table).

## Ground-truth check

`assets/benchmark/coco-val-000000397133.annotations.json` contains the 19 official COCO validation boxes for this image, derived from `instances_val2017.json` and licensed under CC BY 4.0. The UI reports per-image precision, recall, F1 and TP/FP/FN at IoU ≥ 0.50, same class and the current confidence threshold. This is not a replacement for the COCO evaluation API and is not a dataset-level accuracy result.

## Scope

The repository contains one image, not a representative validation set. Model Race reports runtime, model-to-model overlap, and the limited per-image ground-truth check above. Treat quality results as a smoke test only.

No Pascal VOC image is currently bundled. VOC images originate from Flickr and remain subject to each photo's individual reuse terms. A VOC sample should be added only after its source photo and redistribution license are verified.
