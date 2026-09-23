# Historical model milestones

## How to read the timeline

The Time Machine separates runnable models from history-only paper milestones. A history-only entry is displayed to explain a method's role and original task; it has no bundled or downloaded checkpoint, does not change the active model, and does not enter Model Race.

The year shown is the peer-reviewed publication year where available. YOLOv1 is dated 2016 for its CVPR paper; its arXiv preprint appeared in 2015. These entries are a selected lineage, not a claim that computer vision followed a single path.

## Milestones

| Year | Model or method | Original task / contribution | What it should not be confused with |
| --- | --- | --- | --- |
| 1980 | Neocognitron | Self-organizing hierarchical visual-pattern recognition with tolerance to position shifts. | Not a general-object detector and not identical to a modern supervised CNN. |
| 1998 | LeNet-5 | Gradient-trained convolutional network for document and handwritten-digit recognition. | Digit classification, not object localization. |
| 2001 | Viola–Jones | Boosted cascade family for rapid face detection; the runnable app uses a later OpenCV cascade representative. | The app does not claim the OpenCV XML contains the original paper's trained weights. |
| 2005 | HOG + linear SVM | Hand-crafted gradient descriptor with a sliding-window pedestrian classifier; the app uses OpenCV's default people detector. | Pedestrian detection, not general-object detection or the exact original paper weights. |
| 2012 | AlexNet | Deep CNN for 1,000-class ImageNet classification. | Image classification, not bounding-box detection. |
| 2014 | R-CNN | Selective-search region proposals classified with CNN features and class-specific SVMs. | A region-based detector, not a one-pass detector or a runnable app model. |
| 2015 | Faster R-CNN | A learned Region Proposal Network shares convolutional features with a two-stage detection network. | A distinct two-stage design, not a directly comparable speed/accuracy result to the current browser models. |
| 2016 | YOLOv1 | Unified grid-based, single-stage object detection. | The timeline reference is paper-only; the runnable 2016 model in this app is Tiny YOLOv2. |
| 2016 | SSD | Single-shot multi-scale object detection. | The history marker is not the 2017 runnable SSD-MobileNetV1 INT8 export. |
| 2020 | DETR | Transformer-based set prediction for object detection. | The history marker is not the later runnable RT-DETR R18 model. |

## Primary papers

- Fukushima, “Neocognitron: A Self-Organizing Neural Network Model for a Mechanism of Pattern Recognition Unaffected by Shift in Position,” *Biological Cybernetics* (1980), [DOI: 10.1007/BF00344251](https://doi.org/10.1007/BF00344251).
- LeCun et al., “Gradient-Based Learning Applied to Document Recognition,” *Proceedings of the IEEE* (1998), [paper](https://yann.lecun.com/exdb/publis/pdf/lecun-01a.pdf).
- Viola & Jones, “Rapid Object Detection using a Boosted Cascade of Simple Features” (2001), [paper](https://www.merl.com/publications/docs/TR2004-043.pdf).
- Dalal & Triggs, “Histograms of Oriented Gradients for Human Detection” (2005), [CVPR paper](https://lear.inrialpes.fr/people/triggs/pubs/Dalal-cvpr05.pdf).
- Krizhevsky, Sutskever & Hinton, “ImageNet Classification with Deep Convolutional Neural Networks,” NeurIPS (2012), [paper](https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html).
- Girshick et al., “Rich Feature Hierarchies for Accurate Object Detection and Semantic Segmentation,” CVPR (2014), [paper](https://openaccess.thecvf.com/content_cvpr_2014/html/Girshick_Rich_Feature_Hierarchies_2014_CVPR_paper.html).
- Ren et al., “Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks,” NeurIPS (2015), [paper](https://proceedings.neurips.cc/paper/2015/hash/14bfa6bb14875e45bba028a21ed38046-Abstract.html).
- Redmon et al., “You Only Look Once: Unified, Real-Time Object Detection,” CVPR (2016), [paper](https://openaccess.thecvf.com/content_cvpr_2016/html/Redmon_You_Only_Look_CVPR_2016_paper.html).

These are bibliographic links only. No paper text, source code, model weights, or additional runtime dependency is redistributed by these timeline entries.
