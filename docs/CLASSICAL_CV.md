# Classical CV vs AI

## Scope

The Classical CV vs AI lab makes two pre-deep-learning detector families executable in the browser without pretending that they are the same task as the modern general-object detectors.

The module runs:

- a frontal-face cascade representative of the Viola–Jones cascade era;
- HOG + linear SVM pedestrian detection;
- the currently selected Time Machine AI detector as a modern contextual reference.

The same source image is used, but each method keeps its native task, detector, and preprocessing. Results are not treated as an accuracy leaderboard.

## Runtime isolation

OpenCV.js is loaded only when the user runs the classical comparison.

The classical detector runtime lives in `classical-cv-worker.js`, a dedicated Web Worker. The worker:

1. lazily imports the pinned OpenCV.js build;
2. receives a downscaled RGBA copy of the local image;
3. constructs/deletes OpenCV objects within each run;
4. returns only rectangles/timing metadata to the page;
5. is terminated when the user leaves the Classical CV tab, presses **Release OpenCV**, or the page exits.

This isolates the OpenCV.js/WASM context from the direct-ORT and Transformers.js runtime objects. Worker termination is the ownership boundary; it is still the browser that decides when native/WASM pages are physically reclaimed.

The AI reference is deliberately executed first and its adapter is released before OpenCV.js is initialized. This avoids keeping an AI model runtime resident while starting the classical WASM runtime.

## Browser working image

The classical worker receives an aspect-preserving working copy capped at 640 px on the longest side. The original local image is not uploaded.

This resize is a browser practicality choice, not a historical-algorithm claim. The UI reports the working dimensions used for both classical detectors.

## Viola–Jones-era face cascade

The implementation uses `cv.CascadeClassifier` with OpenCV's `haarcascade_frontalface_default.xml`.

Important provenance distinction:

- Viola & Jones (2001) introduced the boosted cascade framework and rapid Haar-like feature evaluation.
- The OpenCV frontal-face XML used here is a later OpenCV-distributed trained cascade created by Rainer Lienhart.
- Vision Evolution Lab therefore labels it **Viola–Jones method family / OpenCV frontal-face cascade** and does not call it the original 2001 paper weights.

Pinned cascade source:

- OpenCV release: 4.12.0
- exact OpenCV commit: `49486f61fb25722cbcf586b7f4320921d46fb38e`
- file: `data/haarcascades/haarcascade_frontalface_default.xml`
- Git blob SHA: `cbd1aa89e927d8d54b49fe666bf17244c3c46a7b`
- delivery: fetched at runtime from jsDelivr's GitHub mirror; not bundled in this repository
- file header: Intel License Agreement / permissive BSD-style redistribution terms

The worker converts RGBA to grayscale, applies histogram equalization, and calls `detectMultiScale` with scale factor 1.1 and 3 minimum neighbors.

## HOG + linear SVM pedestrian detector

The implementation uses:

- `cv.HOGDescriptor`
- `cv.HOGDescriptor.getDefaultPeopleDetector()`, whose `FloatVector` coefficients are copied to a `CV_32FC1` matrix before `setSVMDetector()` in the pinned OpenCV.js binding.
- the default 64×128 detection window
- a `cv.DoubleVector` output for per-window scores, as required by the pinned OpenCV.js binding;
- multi-scale sliding-window detection

The HOG implementation is the OpenCV implementation of the Dalal–Triggs descriptor/object detector family. The built-in default people detector coefficients are supplied by OpenCV.js; Vision Evolution Lab does not redistribute a separate SVM model file.

The project does not claim that the embedded detector coefficients are the exact original paper training artifact. OpenCV's API documents them as its default classifier trained for people detection for 64×128 windows.

## OpenCV.js build

The browser worker imports:

`@techstark/opencv-js@4.12.0-release.1/dist/opencv.js`

from jsDelivr.

The package declares Apache-2.0 and states that its OpenCV.js binary is sourced from the OpenCV 4.12.0 documentation build. The package has zero runtime dependencies. OpenCV 4.5.0 and later are distributed under Apache-2.0 at the project level; individual legacy data/source files can retain their own notices, which are documented separately.

The OpenCV.js build is single-file WebAssembly and is not downloaded until this module is used.

## Task-aware comparison

Only HOG vs AI `person` detections receive a spatial overlap count. A match requires same class and IoU >= 0.35, mirroring the Model Race overlap threshold.

That overlap is evidence of spatial agreement, not correctness.

The face cascade is not directly scored against the modern general-object detectors because the current AI models do not expose a `face` class. Showing a made-up equivalence between face rectangles and person boxes would be misleading.

## Timing

The classical cards report:

- OpenCV worker startup separately;
- cascade asset load separately for the face detector;
- detector execution time separately.

They are not inserted into the 20-run general-object Model Race because:

- face detection and pedestrian detection are different tasks;
- their label spaces differ;
- their runtime/preprocessing contracts differ materially;
- the goal is historical method execution, not a fake apples-to-apples benchmark.

## Memory and cleanup

Every `cv.Mat`, `cv.RectVector`, classifier/HOG object, and temporary detector object created by the worker is deleted in `finally` blocks when the binding exposes `.delete()`.

This is required because OpenCV.js/WASM objects are not reclaimed by JavaScript garbage collection alone.
