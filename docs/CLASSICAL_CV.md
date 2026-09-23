# Historical image experiments in Time Machine

## Scope

Time Machine keeps one locally selected image while the user moves through the early timeline. Selecting a runnable historical experiment processes that same image and draws the method's native output on the main image canvas.

The first four experiments cover different tasks and output types:

- **1980 · Neocognitron-inspired pattern response** — an educational response map built from fixed edge orientations and two local max-pooling stages. It has no original trained weights and makes no object-label claims.
- **1998 · LeNet-era MNIST CNN reference** — proposes digit-like crops, then classifies each crop as a handwritten digit from 0 to 9. The checkpoint is a later ONNX Model Zoo MNIST CNN, not LeNet-5's original 1998 weights.
- **2001 · Viola–Jones method family** — a frontal-face cascade.
- **2005 · HOG + linear SVM** — a pedestrian detector.

The methods have different native tasks. Face detection, pedestrian detection, handwritten-digit classification, feature responses, and general-object detection are not interchangeable and are not presented as one accuracy leaderboard. The 1998, 2001, and 2005 methods remain outside Model Race.

## Shared image and browser working copy

There is one Time Machine image picker. The original file stays in browser memory and is not uploaded. Historical methods process an aspect-preserving copy capped at 640 px on its longest side for browser practicality. This cap is an implementation choice, not a historical algorithm requirement.

Clicking an earlier milestone with no image selected opens its method details and asks for an image. Choosing an image afterward runs the selected method automatically. Clicking another historical milestone reuses the same selected image. A historical experiment does not change the selected AI model; clicking a general-object model returns Time Machine to its regular AI controls.

## 1980 · Neocognitron-inspired pattern response

A small browser implementation computes four oriented 3×3 edge responses on grayscale pixels, combines their local maximum, and applies two 2×2 max-pooling stages. The result is drawn as a response overlay on the selected image.

The original Neocognitron was a self-organizing hierarchical pattern-recognition network. A public-domain 1992 C simulator is listed by the CMU Artificial Intelligence Repository, but this project does not redistribute that simulator or claim to load its trained weights. The on-page preview is an educational approximation of hierarchical local responses; it is not an exact Neocognitron implementation or an object detector.

Primary reference: Fukushima, “Neocognitron: A Self-Organizing Neural Network Model for a Mechanism of Pattern Recognition Unaffected by Shift in Position,” *Biological Cybernetics* (1980), [DOI 10.1007/BF00344251](https://doi.org/10.1007/BF00344251). The CMU archive records its separate 1992 simulator as public domain: [NeoCognitron simulator](https://www.cs.cmu.edu/afs/cs/project/ai-repository/ai/areas/neural/systems/neocog/0.html).

## 1998 · handwritten-digit experiment

The digit experiment uses the pinned `onnxmodelzoo/mnist-1` ONNX model as a runnable MNIST task reference. The model card documents a float32 `1×1×28×28` grayscale input with black background/white foreground and a ten-logit output; the browser applies softmax to get digit scores.

This model is not original LeNet-5 trained weights. Its model card says it was trained in CNTK from the “CNTK 103D: Convolutional Neural Network with MNIST” tutorial and describes alternating convolution and max-pooling layers. The UI therefore calls it a **LeNet-era MNIST CNN reference**, not the original 1998 checkpoint.

Before classification, the isolated OpenCV worker uses Otsu thresholding in both polarities and external contours to propose small digit-like regions. The ONNX model classifies each proposed crop. Display boxes require a 0.70 softmax score; that display cutoff is an illustration filter, not calibrated confidence. The displayed softmax score is not calibrated confidence. Crop proposals may miss digits in photos or produce non-digit regions with a high score.

If no crop candidate is found, the model is not downloaded. If no candidate reaches the display cutoff, the panel says that this model recognizes isolated handwritten digits only and is not a general-object detector. Printed text, signs, serial numbers, and digits inside natural scenes may not match MNIST preprocessing.

Pinned asset and preprocessing details are in [MODEL_SOURCES.md](../MODEL_SOURCES.md). The model file is fetched on demand from the pinned Hugging Face revision and verified against its SHA-256 before ONNX Runtime opens it.

## 2001 · Viola–Jones method family / frontal-face cascade

The worker loads OpenCV.js `4.12.0-release.1` only when a user runs the method. It fetches the exact OpenCV 4.12.0 `haarcascade_frontalface_default.xml` revision, converts RGBA to grayscale, applies histogram equalization, and runs `CascadeClassifier.detectMultiScale` with scale factor 1.1, minNeighbors 3, and a 24×24 minimum window.

The cascade XML is a later OpenCV-distributed asset credited to Rainer Lienhart. It is a runnable representative of the Viola–Jones method family, not the original 2001 paper's trained weights. Exact pin and file-specific terms are documented in [MODEL_SOURCES.md](../MODEL_SOURCES.md) and [THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md).

## 2005 · HOG + linear SVM pedestrian detector

The worker uses OpenCV's `HOGDescriptor` and `getDefaultPeopleDetector()`. The default window is 64×128; `detectMultiScale` uses 8×8 stride, 8×8 padding, scale 1.05, and group threshold 2. The coefficients are supplied by OpenCV.js; this repository does not claim they are the exact Dalal–Triggs paper checkpoint.

A zero-result run is valid. It means that this detector returned no pedestrian boxes under this method and input; it does not establish image-level accuracy.

## Runtime and memory ownership

- OpenCV.js is loaded by `classical-cv-worker.js` only after one of the region-based historical methods runs.
- The worker receives only the downscaled pixel copy; it returns rectangles and timings.
- OpenCV objects such as `cv.Mat`, `cv.MatVector`, `cv.RectVector`, classifiers, and HOG objects are deleted in cleanup paths when the binding exposes `.delete()`.
- The MNIST ONNX session is loaded only after digit-like regions are proposed; the OpenCV worker is terminated before session initialization.
- Historical experiments release registered AI adapters before running. The experiment does not change Time Machine's selected general-object model.
- Leaving Time Machine, **Release historical runtime**, or page exit terminates the worker and releases any MNIST session. Returning to Time Machine keeps the displayed result but a new run initializes the runtime again.

This separation keeps the four general-object adapters, Model Race's 1 warm-up + 20 measured runs, Live Camera's SSD-only contract, and the existing ONNX/WebGPU/WASM policies unchanged.

## Future multimodal experiments

Historical experiment metadata declares an image input, task, and output type. That allows a future VLM adapter to accept an image plus a prompt and return text or grounded text while keeping it outside the general-object Model Race until an equivalent task contract exists. No VLM dependency or model is loaded in this release.
