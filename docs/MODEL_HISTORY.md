# Historical model milestones

## How to read the timeline

The Time Machine keeps one selected image while users move through its history. The 1980 pattern-response preview, 1998 MNIST digit task, 2001 face cascade, 2005 pedestrian detector, 2012 AlexNet classifier, and 2025 DINOv3 patch-feature experiment run on that same image, each with its native task and output. Historical experiments do not change the selected general-object AI model or enter Model Race.

For older milestones, the timeline shows the year only. Recent research entries show the first public paper month where verified; release-only milestones use the source-backed release month and are labelled as such. This is not necessarily the model-weight date. YOLOv1 is dated 2016 for its CVPR paper; its arXiv preprint appeared in 2015. These entries are a selected lineage, not a claim that computer vision followed a single path.

## Milestones

| Year | Model or method | Original task / contribution | In-app treatment | What it should not be confused with |
| --- | --- | --- | --- | --- |
| 1980 | Neocognitron-inspired preview | Orientation responses followed by local max pooling. | Runnable · feature map | Educational approximation with fixed filters; no original trained weights or object labels. |
| 1998 | LeNet-era MNIST CNN reference | Handwritten-digit classification on candidate image crops. | Runnable · digits only | Later ONNX Model Zoo checkpoint, not original LeNet-5 weights; it does not detect general objects or arbitrary printed text. |
| 2001 | Viola–Jones | Boosted cascade family for rapid frontal-face detection; the app uses a later OpenCV cascade representative. | Runnable · face boxes | The OpenCV XML is not the original paper's trained weights. |
| 2005 | HOG + linear SVM | Hand-crafted gradient descriptor with a sliding-window pedestrian classifier; the app uses OpenCV's default people detector. | Runnable · pedestrian boxes | Pedestrian detection, not general-object detection or the exact original paper weights. |
| 2012 | AlexNet | Deep CNN for 1,000-class ImageNet classification. | Runnable · top-five class labels | BVLC AlexNet-family INT8 checkpoint, not the exact 2012 paper weights; full-image classification, no object boxes. |
| 2014 | R-CNN | Selective-search region proposals classified with CNN features and class-specific SVMs. | History only | A region-based detector, not a one-pass detector or a runnable app model. |
| 2015 | Faster R-CNN · ResNet-50 FPN INT8 | A learned Region Proposal Network shares convolutional features with a two-stage detection network. | Runnable · Time Machine only | Later ONNX Model Zoo COCO reference checkpoint, not original 2015 paper weights; known dynamic-shape portability risk remains. |
| 2016 | YOLOv1 | Unified grid-based, single-stage object detection. | Runnable · Time Machine only | Full original-architecture VOC20 network exported through pinned LibreYOLO tooling to a 516.3 MiB dynamic-INT8 ONNX graph; large download and physical-mobile limits are explicit. |
| 2016 | SSD · ResNet-34 INT8 | Single-shot multi-scale object detection. | Runnable · COCO reference checkpoint | Later ONNX Model Zoo COCO 2017 ResNet-34 export, not the original paper weights; Time Machine only. |
| 2020 | DETR · ResNet-50 | Transformer-based set prediction for object detection. | Runnable · q8/WASM reference checkpoint | Pinned Xenova conversion of the Apache-2.0 Facebook base, not asserted to be the exact paper weights; Time Machine only. |
| 2021-06 | YOLOS-tiny | Vanilla Vision Transformer transferred directly to object detection. | Runnable · Time Machine only | Pinned q4 Transformers.js conversion; iOS/WebKit and broad browser validation pending. |
| 2021-07 | YOLOX-Nano | Anchor-free detector with a decoupled head. | Runnable | Month follows the first public arXiv paper; not a release date. |
| 2023-04 | RT-DETR R18 | Real-time end-to-end DETR detector. | Runnable | Month follows the first public arXiv paper. |
| 2024-06 | LW-DETR-tiny | Lightweight ViT encoder and shallow DETR decoder. | Runnable · Time Machine + Benchmark ×20 + Live Camera | Pinned Apache-2.0 checkpoint exported to a verified ONNX graph; WASM fp32; physical iPhone / Brave-WebKit / iOS 18.7 ×20 runs completed on 2026-09-24 and 2026-09-27; sustained Live Camera stability and broad compatibility remain unverified. |
| 2024-07 | RT-DETRv2 R18 | Revised real-time DETR training recipe. | Research preview · runnable | Month follows the first public arXiv paper. |
| 2024-10 | D-FINE-N | Fine-grained distribution refinement for DETR box regression. | Runnable · Time Machine + Benchmark ×20 + Live Camera | Pinned COCO ONNX conversion; WASM fp32; physical iPhone / Brave-WebKit / iOS 18.7 ×20 completed on 2026-09-27; sustained Live Camera stability remains unverified. |
| 2024-12 | DEIM | Research-only | Improved DETR matching and training convergence. | [DEIM paper](https://arxiv.org/abs/2412.04234) · [official repository](https://github.com/ShihuaHuang95/DEIM) | Paper milestone; no browser checkpoint integrated. |
| 2025-02 | YOLOv12 | Research-only | Attention-centric design within the YOLO detector family. | [paper](https://arxiv.org/abs/2502.12524) · [official repository](https://github.com/sunsmarterjie/yolov12) | Hybrid design; not treated as a pure CNN-versus-transformer boundary. |
| 2025-03 | YOLOE | Research-only | Text- and visual-prompt open-vocabulary detection/segmentation. | [paper](https://arxiv.org/abs/2503.07465) · [official repository](https://github.com/THU-MIG/yoloe) | Prompted task differs from the fixed COCO detector interface. |
| 2025-03 | DEIM-Nano | Research-only | Compact 640×640 DEIM variant; the paper family follows DEIM’s December 2024 work. | [DEIM project](https://github.com/ShihuaHuang95/DEIM) | Candidate only; export, artifact hash, license and browser runtime are not yet pinned here. |
| 2025-08 | DINOv3 ViT-S/16 | Self-supervised visual representation with dense patch features. | Runnable historical experiment · 14×14 patch cosine similarity | Feature extraction only; no detector or classifier head, labels, masks, or confidence. [Paper](https://arxiv.org/abs/2508.10104) · [Meta page](https://ai.meta.com/research/publications/dinov3/) |
| 2025-09 | DEIMv2 | Research-only | DINOv3-era features for larger variants and pruned HGNetv2 for Atto/Femto/Pico/Nano. | [paper](https://arxiv.org/abs/2509.20787) · [official repository](https://github.com/Intellindust-AI-Lab/DEIMv2) | Small candidates are promising; custom license and exact browser export need review. |
| 2025-11 | RF-DETR Nano | Research preview · runnable | Neural-architecture-search real-time detection transformer family. | [paper](https://arxiv.org/abs/2511.09554) · [official repository](https://github.com/roboflow/rf-detr) | Pinned ONNX Community conversion; Time Machine and individual warm benchmark only; Live Camera/Model Race remain disabled pending device checks. |
| 2025-11 | SAM 3 | Research-only | Concept-prompted detection, segmentation and tracking for images/videos. | [paper](https://arxiv.org/abs/2511.16719) · [Meta page](https://ai.meta.com/research/publications/sam-3-segment-anything-with-concepts/) · [repository](https://github.com/facebookresearch/sam3) | Promptable masks and identities are a separate task, not a box-detector adapter. |
| 2026-01 | YOLO26-Nano | Research-only | End-to-end detection with an NMS-free deployment path. | [official model docs](https://docs.ultralytics.com/models/yolo26) | January is the source-backed release month, not a paper date; conversion/license terms need review. |
| 2026-03 | EdgeCrafter | Research-only | Compact ViTs distilled for task-specific dense prediction: detection, instance segmentation and pose. | [paper](https://arxiv.org/abs/2603.18739) · [official repository](https://github.com/Intellindust-AI-Lab/EdgeCrafter) | Dense task outputs and its custom license need review before a browser integration. |
| 2026-03-27 | SAM 3.1 | Research-only | Object Multiplex for joint multi-object video tracking. | [official release notes](https://github.com/facebookresearch/sam3/blob/main/RELEASE_SAM3p1.md) · [repository](https://github.com/facebookresearch/sam3) | Release date; video tracking/masks are separate from Time Machine’s still-image box detector. |

## Primary papers
- Huang et al., “DEIM: DETR with Improved Matching for Fast Convergence,” arXiv (2024), [paper](https://arxiv.org/abs/2412.04234).
- Fukushima, “Neocognitron: A Self-Organizing Neural Network Model for a Mechanism of Pattern Recognition Unaffected by Shift in Position,” *Biological Cybernetics* (1980), [DOI: 10.1007/BF00344251](https://doi.org/10.1007/BF00344251).
- LeCun et al., “Gradient-Based Learning Applied to Document Recognition,” *Proceedings of the IEEE* (1998), [paper](https://yann.lecun.com/exdb/publis/pdf/lecun-01a.pdf).
- Viola & Jones, “Rapid Object Detection using a Boosted Cascade of Simple Features” (2001), [paper](https://doi.org/10.1109/CVPR.2001.990517).
- Dalal & Triggs, “Histograms of Oriented Gradients for Human Detection” (2005), [CVPR paper](https://doi.org/10.1109/CVPR.2005.177).
- Krizhevsky, Sutskever & Hinton, “ImageNet Classification with Deep Convolutional Neural Networks,” NeurIPS (2012), [paper](https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html).
- Girshick et al., “Rich Feature Hierarchies for Accurate Object Detection and Semantic Segmentation,” CVPR (2014), [paper](https://openaccess.thecvf.com/content_cvpr_2014/html/Girshick_Rich_Feature_Hierarchies_2014_CVPR_paper.html).
- Ren et al., “Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks,” NeurIPS (2015), [paper](https://proceedings.neurips.cc/paper/2015/hash/14bfa6bb14875e45bba028a21ed38046-Abstract.html).
- Redmon et al., “You Only Look Once: Unified, Real-Time Object Detection,” CVPR (2016), [paper](https://openaccess.thecvf.com/content_cvpr_2016/html/Redmon_You_Only_Look_CVPR_2016_paper.html).
- Liu et al., “SSD: Single Shot MultiBox Detector,” ECCV (2016), [Google Research publication record](https://research.google/pubs/ssd-single-shot-multibox-detector/).
- Carion et al., “End-to-End Object Detection with Transformers,” ECCV (2020), [ECVA paper](https://www.ecva.net/papers/eccv_2020/papers_ECCV/html/832_ECCV_2020_paper.php).
- Fang et al., “You Only Look at One Sequence: Rethinking Transformer in Vision through Object Detection,” arXiv (2021), [paper](https://arxiv.org/abs/2106.00666).

These are bibliographic links. Historical detector references fetch their separately pinned ONNX/Transformers.js assets only when selected. YOLOv1 uses a derived browser export of the pinned full-network checkpoint; Faster R-CNN, SSD and DETR references are later checkpoints rather than original paper weights. Task-specific MNIST and OpenCV assets are likewise loaded only when their experiment is selected.
