# Benchmark samples

## Bundled image

Model Race can load `assets/benchmark/coco-val-000000397133.jpg` with **Use COCO val sample**. It is COCO 2017 validation image 397133 (640 × 427), titled “Kitchen,” by Maggie W (`maggiew` on Flickr), and is distributed under [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). The image file's SHA-256 is `09e1d25c75f7879bdaa69c327fece5cabacd53939c8c2ef9e87f1c97a2e478c4`. See [third-party notices](THIRD_PARTY_LICENSES.md) for attribution and source links.

This is a repeatable smoke-test input for SSD-MobileNetV1, YOLOX-Nano, and RT-DETR R18, whose declared label domain is COCO. Tiny YOLOv2 uses Pascal VOC labels; this COCO image can exercise its shared `person` class, but it is out of domain for that model.

## Scope

The repository contains one image, not a representative validation set. Model Race displays runtime and model-to-model overlap; it does not compare predictions against this image's ground-truth annotations or calculate AP/accuracy. Treat results as a smoke test only.

No Pascal VOC image is currently bundled. VOC images originate from Flickr and remain subject to each photo's individual reuse terms. A VOC sample should be added only after its source photo and redistribution license are verified.
