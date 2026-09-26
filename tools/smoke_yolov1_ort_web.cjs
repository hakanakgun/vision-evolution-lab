#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const ort = require("onnxruntime-web");

async function main() {
  const modelPath = process.argv[2] || "artifacts/yolov1-feasibility/yolov1-voc20-int8.onnx";
  ort.env.wasm.numThreads = 1;
  const bytes = new Uint8Array(fs.readFileSync(modelPath));
  const started = performance.now();
  const session = await ort.InferenceSession.create(bytes, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  const initMs = performance.now() - started;
  try {
    assert.deepEqual(session.inputNames, ["images"]);
    assert.deepEqual(session.outputNames, ["output"]);
    const input = new ort.Tensor(
      "float32",
      new Float32Array(3 * 448 * 448),
      [1, 3, 448, 448]
    );
    const inferStarted = performance.now();
    const result = await session.run({ images: input });
    const inferMs = performance.now() - inferStarted;
    assert.deepEqual(result.output.dims, [1, 24, 98]);
    for (const value of result.output.data) {
      assert.ok(Number.isFinite(value), "YOLOv1 output contains a non-finite value");
    }
    console.log(JSON.stringify({
      backend: "onnxruntime-web/WASM",
      bytes: bytes.byteLength,
      input: session.inputNames,
      output: result.output.dims,
      initMs: Math.round(initMs),
      inferenceMs: Math.round(inferMs),
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
