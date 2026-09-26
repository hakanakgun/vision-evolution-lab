# Historical model milestones

## How to read the timeline

The Time Machine keeps one selected image while users move through its history. The 1980 pattern-response preview, 1998 MNIST digit task, 2001 face cascade, 2005 pedestrian detector, and 2012 AlexNet classifier run on that same image, each with its native task and output. Historical experiments do not change the selected general-object AI model or enter Model Race.

For older milestones, the timeline shows the year only. Recent model entries show the first public arXiv paper month where verified; this is not necessarily the model-weight or software release date. YOLOv1 is dated 2016 for its CVPR paper; its arXiv preprint appeared in 2015. These entries are a selected lineage, not a claim that computer vision followed a single path.

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
| 2024-06 | LW-DETR-tiny | Lightweight ViT encoder and shallow DETR decoder. | Runnable · Time Machine + Live Camera | Pinned Apache-2.0 checkpoint exported to a verified ONNX graph; WASM fp32; one user-reported iOS 18.7 / Brave-WebKit ×20 benchmark completed, while sustained Live Camera stability and broad compatibility remain unverified. |
| 2024-07 | RT-DETRv2 R18 | Revised real-time DETR training recipe. | Research preview · runnable | Month follows the first public arXiv paper. |
| 2024-10 | D-FINE-N | Fine-grained distribution refinement for DETR box regression. | Runnable · Time Machine + Live Camera | Pinned COCO ONNX conversion; WASM fp32; Live Camera is enabled, but mobile performance and iOS/WebKit camera stability have not been benchmarked. |

## Primary papers

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
