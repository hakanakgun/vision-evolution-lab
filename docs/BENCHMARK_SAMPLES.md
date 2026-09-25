# Benchmark samples

## Bundled visual sample

Model Race can load `assets/benchmark/coco-val-000000397133.jpg` with **Use COCO val sample**. It is COCO 2017 validation image 397133 (640 × 427), titled “Kitchen,” by Maggie W (`maggiew` on Flickr), distributed under [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). The image file's SHA-256 is `09e1d25c75f7879bdaa69c327fece5cabacd53939c8c2ef9e87f1c97a2e478c4`.

This image keeps the existing visual single-image ground-truth check. Tiny YOLOv2 uses Pascal VOC labels and is scored only against annotations from classes shared with Pascal VOC.

## Fixed four-image sanity suite

`assets/benchmark/sanity-suite.json` defines a deterministic browser-regression set from the official COCO 2017 validation split:

| COCO image id | Size | Ground-truth instances | Selected classes |
| --- | --- | ---: | --- |
| 397133 | 640 × 427 | 19 | person, bottle, dining table, kitchen objects |
| 17029 | 640 × 640 | 4 | dog, car, frisbee |
| 13348 | 640 × 427 | 12 | airplane, person, truck |
| 872 | 621 × 640 | 4 | person, sports ball, baseball glove |

Each adjacent `.annotations.json` file retains the official COCO image id, COCO image URL, original Flickr image URL, dimensions, per-image license metadata, and official instance boxes used by this project. The four selected images all report COCO image-license id 4, **CC BY 2.0**. The COCO instance annotations are distributed under **CC BY 4.0**.

The **Accuracy sanity ×4** action fixes confidence at 0.40, matches the same canonical class at IoU ≥ 0.50, sums TP/FP/FN over all four images, then derives precision, recall, and F1. Tiny YOLOv2 is evaluated only on annotations whose classes overlap Pascal VOC.

## Scope

The four-image suite is deliberately small. It is intended to catch browser implementation regressions in preprocessing, decoding, label mapping, thresholding, or runtime behavior. It is **not COCO AP** or AP50, does **not** reproduce the COCO evaluation API, does not represent the validation distribution, and does not establish a general model ranking.

The original single-image quality card remains useful for inspecting one visible scene; the four-image sanity suite adds a slightly broader deterministic regression surface. Neither should be presented as paper-level or dataset-level accuracy.

See [third-party notices](THIRD_PARTY_LICENSES.md) for license/source details and [benchmark methodology](BENCHMARK_METHODOLOGY.md) for the matching contract.
