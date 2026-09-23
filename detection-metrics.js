(() => {
  'use strict';

  function iou(a, b) {
    const top = Math.max(a[0], b[0]), left = Math.max(a[1], b[1]);
    const bottom = Math.min(a[2], b[2]), right = Math.min(a[3], b[3]);
    const intersection = Math.max(0, bottom - top) * Math.max(0, right - left);
    const areaA = Math.max(0, a[2] - a[0]) * Math.max(0, a[3] - a[1]);
    const areaB = Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
    const union = areaA + areaB - intersection;
    return union > 0 ? intersection / union : 0;
  }

  function evaluate(predictions, groundTruth, { confidence = 0, iouThreshold = 0.5 } = {}) {
    const candidates = predictions
      .filter(item => Number.isFinite(item.score) && item.score >= confidence && Array.isArray(item.box) && item.box.length === 4)
      .slice()
      .sort((a, b) => b.score - a.score);
    const matched = new Set();
    let truePositives = 0;
    for (const prediction of candidates) {
      let bestIndex = -1, bestIou = iouThreshold;
      for (let index = 0; index < groundTruth.length; index++) {
        const target = groundTruth[index];
        if (matched.has(index) || target.label !== prediction.label) continue;
        const overlap = iou(prediction.box, target.box);
        if (overlap >= bestIou) { bestIndex = index; bestIou = overlap; }
      }
      if (bestIndex >= 0) { matched.add(bestIndex); truePositives++; }
    }
    const falsePositives = candidates.length - truePositives;
    const falseNegatives = groundTruth.length - truePositives;
    const precision = candidates.length ? truePositives / candidates.length : 0;
    const recall = groundTruth.length ? truePositives / groundTruth.length : 0;
    const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
    return Object.freeze({
      truePositives, falsePositives, falseNegatives,
      predictions: candidates.length, groundTruth: groundTruth.length,
      precision, recall, f1, iouThreshold
    });
  }

  window.VisionDetectionMetrics = Object.freeze({ evaluate });
})();
