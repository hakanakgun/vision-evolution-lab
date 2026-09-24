(() => {
  'use strict';

  function packTinyRgbNchw(rgba, width, height) {
    if (!rgba || !Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || rgba.length !== width * height * 4) {
      throw new TypeError('Tiny YOLOv2 input must be a width × height RGBA pixel buffer.');
    }
    const plane = width * height;
    const chw = new Float32Array(plane * 3);
    for (let pixel = 0, source = 0; pixel < plane; pixel++, source += 4) {
      chw[pixel] = rgba[source];
      chw[plane + pixel] = rgba[source + 1];
      chw[plane * 2 + pixel] = rgba[source + 2];
    }
    return chw;
  }

  window.VisionPreprocessing = Object.freeze({ packTinyRgbNchw });
})();
