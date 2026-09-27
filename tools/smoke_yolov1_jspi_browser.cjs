#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const puppeteer = require("puppeteer-core");

const graphPath = path.resolve(process.argv[2] || "artifacts/yolov1-external-data/yolov1-voc20-int8-external.onnx");
const canonicalPath = path.resolve(process.argv[3] || "artifacts/yolov1-external-data/yolov1-voc20-int8.onnx");
const ortDist = path.resolve(process.argv[4] || path.join(path.dirname(require.resolve("onnxruntime-web/package.json")), "dist"));

function chromeExecutable() {
  for (const candidate of [
    process.env.CHROME_BIN,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("No Chrome/Chromium executable found on the CI runner.");
}

function sendFile(res, file, contentType) {
  const stat = fs.statSync(file);
  res.writeHead(200, {
    "content-type": contentType,
    "content-length": stat.size,
    "cache-control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
}

const html = `<!doctype html>
<meta charset="utf-8">
<title>YOLOv1 JSPI OPFS smoke</title>
<script type="module">
  window.__smoke = { status: "running" };
  try {
    if (typeof WebAssembly.Suspending !== "function" || typeof WebAssembly.promising !== "function") {
      throw new Error("Headless browser does not expose WebAssembly JSPI");
    }
    if (!navigator.storage || typeof navigator.storage.getDirectory !== "function") {
      throw new Error("Headless browser does not expose OPFS");
    }

    const ort = await import("/ort/ort.jspi.min.mjs");
    ort.env.wasm.wasmPaths = "/ort/";
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;

    const graphResponse = await fetch("/graph.onnx");
    if (!graphResponse.ok) throw new Error("graph HTTP " + graphResponse.status);
    const graph = new Uint8Array(await graphResponse.arrayBuffer());

    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle("yolov1-voc20-int8.onnx", { create: true });
    const writable = await handle.createWritable({ keepExistingData: false });
    const response = await fetch("/canonical.onnx");
    if (!response.ok || !response.body) throw new Error("canonical HTTP " + response.status);
    const reader = response.body.getReader();
    let offset = 0;
    try {
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        await writable.write({ type: "write", position: offset, data: item.value });
        offset += item.value.byteLength;
      }
      await writable.truncate(offset);
      await writable.close();
    } catch (error) {
      try { await writable.abort(); } catch (_) {}
      throw error;
    }

    const externalFile = await handle.getFile();
    if (externalFile.size !== 541358513) {
      throw new Error("OPFS canonical size mismatch: " + externalFile.size);
    }

    const initStarted = performance.now();
    const session = await ort.InferenceSession.create(graph, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "basic",
      enableCpuMemArena: false,
      enableMemPattern: false,
      executionMode: "sequential",
      extra: { session: { disable_prepacking: "1" } },
      externalData: [{ path: "yolov1-voc20-int8.onnx", data: externalFile }],
    });
    const initMs = performance.now() - initStarted;

    try {
      if (JSON.stringify(session.inputNames) !== '["images"]') throw new Error("input contract changed");
      if (JSON.stringify(session.outputNames) !== '["output"]') throw new Error("output contract changed");
      const input = new ort.Tensor("float32", new Float32Array(3 * 448 * 448), [1, 3, 448, 448]);
      const inferStarted = performance.now();
      const result = await session.run({ images: input });
      const inferMs = performance.now() - inferStarted;
      const output = result.output;
      if (!output || JSON.stringify(output.dims) !== "[1,24,98]") throw new Error("output shape changed");
      for (const value of output.data) {
        if (!Number.isFinite(value)) throw new Error("non-finite output");
      }
      window.__smoke = {
        status: "passed",
        jspi: true,
        opfs: true,
        graphBytes: graph.byteLength,
        externalFileBytes: externalFile.size,
        initMs: Math.round(initMs),
        inferenceMs: Math.round(inferMs),
      };
    } finally {
      await session.release();
    }
  } catch (error) {
    window.__smoke = {
      status: "failed",
      error: String(error && (error.stack || error.message) || error),
    };
  }
</script>`;

async function main() {
  assert.equal(fs.statSync(canonicalPath).size, 541358513);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(html);
      return;
    }
    if (url.pathname === "/graph.onnx") {
      sendFile(res, graphPath, "application/octet-stream");
      return;
    }
    if (url.pathname === "/canonical.onnx") {
      sendFile(res, canonicalPath, "application/octet-stream");
      return;
    }
    if (url.pathname.startsWith("/ort/")) {
      const name = path.basename(url.pathname);
      const file = path.join(ortDist, name);
      if (!file.startsWith(ortDist + path.sep) || !fs.existsSync(file)) {
        res.writeHead(404); res.end(); return;
      }
      const type = name.endsWith(".mjs") || name.endsWith(".js") ? "text/javascript" : "application/wasm";
      sendFile(res, file, type);
      return;
    }
    res.writeHead(404); res.end();
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromeExecutable(),
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    page.on("console", msg => console.log("browser:", msg.type(), msg.text()));
    page.on("pageerror", error => console.error("browser pageerror:", error));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(
      () => window.__smoke && window.__smoke.status !== "running",
      { timeout: 180000 }
    );
    const result = await page.evaluate(() => ({
      smoke: window.__smoke,
      userAgent: navigator.userAgent,
    }));
    console.log(JSON.stringify(result));
    assert.equal(result.smoke.status, "passed", result.smoke.error || "JSPI browser smoke failed");
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
