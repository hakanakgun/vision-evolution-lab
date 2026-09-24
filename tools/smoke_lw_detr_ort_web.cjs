#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const ort = require("onnxruntime-web");

async function main() {
  const modelPath = process.argv[2] || "lw-detr-tiny.onnx";
  ort.env.wasm.numThreads = 1;
  const bytes = new Uint8Array(fs.readFileSync(modelPath));
  const session = await ort.InferenceSession.create(bytes, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  try {
    assert.deepEqual(session.inputNames, ["pixel_values"]);
    assert.deepEqual(session.outputNames, ["logits", "pred_boxes"]);
    const input = new ort.Tensor(
      "float32",
      new Float32Array(3 * 640 * 640),
      [1, 3, 640, 640]
    );
    const output = await session.run({ pixel_values: input });
    assert.equal(output.logits.dims.length, 3);
    assert.equal(output.logits.dims[0], 1);
    assert.ok(output.logits.dims[1] > 0 && output.logits.dims[2] > 1);
    assert.deepEqual(output.pred_boxes.dims, [1, output.logits.dims[1], 4]);
    for (const name of ["logits", "pred_boxes"]) {
      for (const value of output[name].data) {
        assert.ok(Number.isFinite(value), name + " contains a non-finite value");
      }
    }
    console.log(JSON.stringify({
      backend: "onnxruntime-web/WASM",
      input: session.inputNames,
      logits: output.logits.dims,
      pred_boxes: output.pred_boxes.dims,
      status: "passed"
    }));
  } finally {
    await session.release();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
