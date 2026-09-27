#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

async function main() {
  assert.equal(typeof WebAssembly.Suspending, "function", "Node runtime does not expose WebAssembly JSPI");
  assert.equal(typeof WebAssembly.promising, "function", "Node runtime does not expose WebAssembly JSPI promising()");
  assert.equal(typeof Blob, "function", "Node runtime does not expose Blob");

  const graphPath = process.argv[2] || "artifacts/yolov1-external-data/yolov1-voc20-int8-external.onnx";
  const canonicalPath = process.argv[3] || "artifacts/yolov1-external-data/yolov1-voc20-int8.onnx";
  const jspiEntry = require.resolve("onnxruntime-web/jspi");
  const ort = await import(pathToFileURL(jspiEntry).href);
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;

  const graph = new Uint8Array(fs.readFileSync(graphPath));
  const canonicalBuffer = fs.readFileSync(canonicalPath);
  const externalBlob = new Blob([canonicalBuffer], { type: "application/octet-stream" });
  assert.equal(externalBlob.size, 541358513);

  const started = performance.now();
  const session = await ort.InferenceSession.create(graph, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "basic",
    enableCpuMemArena: false,
    enableMemPattern: false,
    executionMode: "sequential",
    extra: { session: { disable_prepacking: "1" } },
    externalData: [{
      path: path.basename(canonicalPath),
      data: externalBlob,
    }],
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
      assert.ok(Number.isFinite(value), "YOLOv1 JSPI output contains a non-finite value");
    }
    console.log(JSON.stringify({
      backend: "onnxruntime-web/JSPI Blob externalData",
      jspi: true,
      graphBytes: graph.byteLength,
      externalBlobBytes: externalBlob.size,
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
