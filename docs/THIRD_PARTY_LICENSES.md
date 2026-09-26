# Third-party notices

## OpenCV.js 4.12.0 browser runtime

- Browser package: `@techstark/opencv-js@4.12.0-release.1`.
- Delivery: pinned jsDelivr npm URL, loaded lazily inside `src/history/classical-cv-worker.js`.
- Package repository: `TechStark/opencv-js`.
- Package metadata license: Apache-2.0.
- Package metadata/readme identify the distributed OpenCV.js binary with OpenCV 4.12.0.
- Purpose here: frontal-face cascade execution, HOG + linear SVM pedestrian detection, and digit-region proposals for the MNIST experiment.
- The runtime is not bundled in this repository.

OpenCV project licensing is Apache-2.0 for current OpenCV releases. Individual legacy source/data files can retain their own notices and those notices continue to apply.

### OpenCV frontal-face cascade data

- File: `haarcascade_frontalface_default.xml`.
- OpenCV release: 4.12.0.
- Exact source commit: `49486f61fb25722cbcf586b7f4320921d46fb38e`.
- Git blob SHA: `cbd1aa89e927d8d54b49fe666bf17244c3c46a7b`.
- Delivery: pinned jsDelivr GitHub URL; not bundled here.
- The file header credits Rainer Lienhart and contains an Intel License Agreement / BSD-style redistribution notice. Those file-specific terms remain applicable.

### OpenCV HOG default people detector

The HOG implementation and built-in `getDefaultPeopleDetector()` coefficients are used from the OpenCV.js distribution. Vision Evolution Lab does not ship a separate HOG/SVM weights file. Applicable OpenCV and legacy source notices remain upstream terms.

This project currently loads the following runtime dependency from a CDN.

## ONNX Runtime Web 1.30.0

- Project: Microsoft ONNX Runtime
- Package: `onnxruntime-web`
- Runtime CDN: jsDelivr
- License: MIT
- Upstream: `microsoft/onnxruntime`

Most model checkpoints are not bundled in this repository. YOLOv1 uses a derived dynamic-INT8 ONNX artifact published as a checksum-pinned GitHub Release after pinned-source export/golden/WASM validation. Tiny YOLOv2 is fetched from a pinned ONNX Model Zoo migration repository on Hugging Face; its repository metadata says Apache-2.0 while the imported model-card body says MIT, so both upstream statements are recorded rather than treated as one definitive weights-license claim. SSD-MobileNetV1, Faster R-CNN 2015, SSD 2016, DETR 2020, YOLOS-tiny, RT-DETR variants, D-FINE-N, and the MNIST task-reference model are fetched from pinned or official upstream sources. LW-DETR-tiny is the exception: its pinned Apache-2.0 source checkpoint is exported to a derived ONNX artifact, published in the repository’s GitHub Release, verified by exact size/SHA-256, and committed as `assets/models/lw-detr-tiny.onnx` for same-origin Pages delivery. YOLOX-Nano uses the official Megvii GitHub Release first and a pinned Apache-2.0 Hugging Face mirror only as a browser-fetch fallback. DETR's base model declares Apache-2.0, while its conversion repository has no independent license declaration. See [MODEL_SOURCES.md](MODEL_SOURCES.md) for provenance and model-specific license notes.

## MNIST digit task-reference checkpoint

- Repository: `onnx/models`.
- Pinned commit: `4f43949841cb55a0b98dc8fcd045431ccafd9f96`.
- File: `validated/vision/classification/mnist/model/mnist-12.onnx`; Git LFS content SHA-256 `5c688690f8bacf667d4c2074af5ad0646ca328d7ab03eccf944a65b320171bdd`.
- The repository root LICENSE is Apache-2.0. The MNIST README carries an MIT SPDX marker and states MIT in its License section. The prior Hugging Face representation likewise showed Apache-2.0 metadata and MIT in the model-card body. These declarations remain recorded without selecting one definitive weights-license claim.
- The checkpoint is fetched only when digit-like regions are found, then SHA-256 verified. It is not bundled in this repository.
- It illustrates the handwritten MNIST digit task. It is not the original 1998 LeNet-5 weights and does not provide general-object detection.

## AlexNet ImageNet classification checkpoint

- Repository: `onnxmodelzoo/bvlcalexnet-12-int8` on Hugging Face, revision `99a443a03ecc3576ebd2d94aae33f8f5522b969c`.
- File: `bvlcalexnet-12-int8.onnx`; size 60,984,008 bytes; SHA-256 `d53bbedf100be79277cf55d78c72bdcb67d88786988561bf5d530f038e443c7b`.
- Hugging Face model repository metadata says Apache-2.0. The imported Model Zoo model-card body says BSD-3. The declarations are inconsistent; this app records both and does not claim a definitive checkpoint license.
- The ONNX checkpoint is fetched at runtime, pinned to the revision above, and SHA-256 verified. It is not bundled in the repository.
- The small ImageNet synset-label mapping is bundled in `assets/models/imagenet-1k-labels.json` from the ONNX Model Zoo's `synset.txt` sample asset. Its source does not publish a separate license statement; the file is used solely to map model output indices to the standard class names. SHA-256: `495a1f028e7b3b1878dbc4ec2e66f9a9a9c89c48abb007a9c954faa13571c33a`.
- The in-app runner follows Intel Neural Compressor's pinned evaluation preprocessing and uses ONNX Runtime Web 1.30.0 under its existing MIT notice above.

## YOLOv1 browser export

- Original architecture and pretrained Darknet weights: upstream YOLO/Darknet public-domain declaration.
- Pinned converted source checkpoint: `LibreYOLO/LibreYOLO1b@4349c7a823974cea5d29c5f306a99bcf441ef437`.
- Conversion tooling: `LibreYOLO/libreyolo@c25f6dffb521ea60bc0f63ae3dffb168a7edc466`; upstream repository license MIT.
- Derived runtime artifact: `yolov1-voc20-int8.onnx`, 541,358,513 bytes, SHA-256 `122bf7462747d0cf140525ed6c1d90424d64cc10b8d96cf17905343ce0306d49`, published under GitHub Release `yolov1-browser-int8-122bf7462747`.
- The project is an individual non-commercial educational/demo project. Provenance is still retained explicitly; Pascal VOC dataset terms are separate from code/model terms.

## Tiny YOLOv2 upstream checkpoint

- Repository: `onnxmodelzoo/tinyyolov2-8` on Hugging Face.
- Pinned revision: `869707e16e57006f97d98af54cfdc8a1d388ae61`.
- File SHA-256: `583fb7fdc948435ceac9fa82efc7708701efe8382a859a3dd46526b155f5f2ae`.
- Repository metadata: Apache-2.0.
- Imported model-card body: MIT.
- Training dataset reported upstream: Pascal VOC.
- Delivery: fetched at runtime; not bundled in this repository.

## YOLOX-Nano upstream project

- Project: Megvii YOLOX
- Upstream: `Megvii-BaseDetection/YOLOX`
- Repository license: Apache-2.0
- Primary model delivery: official GitHub Release asset, fetched at runtime.
- Browser fallback: `Heliosoph/yolox-onnx` on Hugging Face, Apache-2.0 metadata, revision `9206d80cbad9ed54986edeff8d7457eb5333882a`.
- The fallback model card states that its ONNX files are Megvii's published checkpoints and are not locally converted.

The original Vision Evolution Lab source code is licensed under the repository's [MIT License](../LICENSE).

## COCO validation benchmark and sanity-suite samples

The repository bundles four images from the **COCO 2017 validation split** for repeatable browser-regression checks. COCO's image metadata reports image-license id 4 for all four, corresponding to [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). Each adjacent annotation JSON preserves the COCO image URL, original Flickr image URL, dimensions, and image-license metadata so provenance remains inspectable.

- `assets/benchmark/coco-val-000000397133.jpg` — COCO image 397133, 640 × 427. Original title: “Kitchen”; photographer: Maggie W (`maggiew` on Flickr). [Flickr source](https://www.flickr.com/photos/maggiew/6255196340/) · [COCO image](https://images.cocodataset.org/val2017/000000397133.jpg). License: CC BY 2.0. SHA-256: `09e1d25c75f7879bdaa69c327fece5cabacd53939c8c2ef9e87f1c97a2e478c4`.
- `assets/benchmark/coco-val-000000017029.jpg` — COCO image 17029, 640 × 640. Original Flickr asset recorded by COCO: `farm8.staticflickr.com/7304/8746020648_f1e2075b86_z.jpg`. [COCO image](https://images.cocodataset.org/val2017/000000017029.jpg). License metadata: CC BY 2.0.
- `assets/benchmark/coco-val-000000013348.jpg` — COCO image 13348, 640 × 427. Original Flickr asset recorded by COCO: `farm9.staticflickr.com/8286/7733450942_0da3e941b4_z.jpg`. [COCO image](https://images.cocodataset.org/val2017/000000013348.jpg). License metadata: CC BY 2.0.
- `assets/benchmark/coco-val-000000000872.jpg` — COCO image 872, 621 × 640. Original Flickr asset recorded by COCO: `farm9.staticflickr.com/8447/7805810128_605424213d_z.jpg`. [COCO image](https://images.cocodataset.org/val2017/000000000872.jpg). License metadata: CC BY 2.0.

For the three additional images, the COCO instance metadata used to construct the suite does not include creator-name fields; the repository therefore preserves the original Flickr asset URLs rather than inventing creator attribution.

### COCO validation annotations

- Manifest: `assets/benchmark/sanity-suite.json`.
- Annotation files: the four adjacent `coco-val-*.annotations.json` files referenced by that manifest.
- Source: official COCO 2017 `instances_val2017.json` instance boxes for image ids 397133, 17029, 13348, and 872. Crowd annotations are excluded from the fixed suite.
- Annotation license: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); attribution: COCO Consortium / Microsoft COCO dataset.
- Image licenses remain the image-specific CC BY 2.0 terms above.
- The page uses these boxes for deterministic same-class IoU matching only. The four-image sanity suite is not the COCO evaluation API, does not compute COCO AP, and is not a representative validation set or model ranking.


## Hugging Face Transformers.js 4.3.0

- Project: Hugging Face Transformers.js
- Browser import: jsDelivr, pinned to `@huggingface/transformers@4.3.0`
- Purpose here: browser preprocessing, ONNX execution, postprocessing, cache/progress integration for DETR, YOLOS-tiny, RT-DETR R18, RT-DETRv2 R18 and D-FINE-N. v4 uses the newer native WebGPU runtime/EP; WASM is used by historical references and remains available as fallback.
- Upstream package/project terms remain their own.

## Faster R-CNN 2015 browser checkpoint

- Model repository: `onnxmodelzoo/FasterRCNN-12-int8`, pinned revision `c4c979ff5c8043967de03c97daef7b54663182eb`.
- File: `FasterRCNN-12-int8.onnx`, 44,631,113 bytes; SHA-256 `95f67f5f6249f4804f1302367dd88cee32bf47713b9858cc6d8ba835548f9b8e`.
- Hugging Face repository metadata says Apache-2.0 while the imported Model Zoo card says MIT. The upstream `facebookresearch/maskrcnn-benchmark` implementation is MIT. These declarations are recorded separately; no definitive weights-license interpretation is asserted here.
- Training/evaluation dataset reported upstream: MS COCO; dataset terms remain separate.
- Runtime fetch only; not bundled or redistributed by this repository.

## YOLOS-tiny browser conversion

- Base model: `hustvl/yolos-tiny`, pinned revision `95a90f3c189fbfca3bcfc6d7315b9e84d95dc2de`; base repository metadata declares Apache-2.0.
- Official HUST YOLOS code repository: MIT.
- Browser conversion: `Xenova/yolos-tiny`, pinned revision `e2f9c7673f0fa61849efe2b56a0d7774779ebb9d`; the conversion repository does not independently declare a license.
- q4 ONNX asset: 7,809,003 bytes; SHA-256 `a3e0b7d8931274aee8af01dc31b35d9c379247bdb7c86eaf222090728c4a894b`.
- Upstream model card reports ImageNet-1k pretraining and COCO 2017 fine-tuning; those dataset terms remain separate from code/model license declarations.
- Runtime fetch only through Transformers.js; not bundled here.

## SSD 2016 browser checkpoint

- Model repository: `onnxmodelzoo/ssd-12-int8` on Hugging Face, pinned revision `bf6cc24948f7cf6c50127798c33d900813678b4e`.
- Upstream repository metadata license: Apache-2.0.
- File: `ssd-12-int8.onnx`, 20,485,276 bytes; SHA-256 `56d2c03a8c74c03f704509ccfcd91763991c6e1b92f63da730fb2b3d07565453`.
- This is a later COCO 2017 ResNet-34 INT8 reference checkpoint for the 2016 SSD design, not original paper weights.
- Fetched and checksum-verified in browser; not bundled or redistributed here.

## DETR 2020 browser conversion

- Base model: `facebook/detr-resnet-50` (Apache-2.0; COCO 2017).
- Browser conversion: `Xenova/detr-resnet-50`, pinned revision `8be7ab59ff663484ee9ba2e8d8f267330d5ad03e`.
- Quantized asset: `onnx/model_quantized.onnx`, 43,102,531 bytes; SHA-256 `cae09a307ed9247da7e2ce8bcf81522a6817f1ea2e82b9c4dde59f5964b62b4f`.
- Base repository declares Apache-2.0; conversion repository does not independently state a license. Runtime fetch only; not bundled here.

## RT-DETR R18 browser conversion

- Base model: `PekingU/rtdetr_r18vd`
- Base model license: Apache-2.0
- Browser conversion: `onnx-community/rtdetr_r18vd`
- Pinned conversion revision: `ec641af14c7cc8f93cd641a1458f498abbbbb533`
- The conversion is referenced from Hugging Face at runtime and is not bundled in this repository.

## D-FINE-N COCO browser conversion

- Base checkpoint: `ustc-community/dfine-nano-coco`, pinned revision `066438d3d8f0da137a37b38fdf3368fd4afceced`; repository metadata declares Apache-2.0 and COCO.
- Browser conversion: `onnx-community/dfine_n_coco-ONNX`, pinned revision `e2b9c0f0884ee7c90b79feedfd30054e82ed634c`; upstream provides a Transformers.js object-detection pipeline conversion.
- Runtime fetch only; WASM fp32; approximate upstream size 15.3 MB; SHA-256 `0f684f409618ee8a822410e754a29caa817d1aa16283ce89cad936d0a48e2f35`.
- The app selects the COCO checkpoint and does not use Objects365-derived variants. This attribution records upstream repository declarations; it is not independent legal advice. Browser performance and iOS/WebKit have not been tested.

## RT-DETRv2 R18 browser conversion

- Base model: `PekingU/rtdetr_v2_r18vd` (Apache-2.0; COCO).
- Browser conversion: `onnx-community/rtdetr_v2_r18vd-ONNX` (Apache-2.0 metadata).
- Pinned conversion revision: `936f90b6a476c6da4dfe053fc521af55285976ba`.
- fp16 asset SHA-256: `2922e7137689ac648cd99f0aa33b885d681fd981302ac5c77ed9a4ee946eaa36`.
- Quantized asset SHA-256: `4b839c46187b77fc620c770de0be6790637b98afde9b386232b0fcf74382eb3`.
- The pinned ONNX files are fetched at runtime and are not bundled in this repository.
