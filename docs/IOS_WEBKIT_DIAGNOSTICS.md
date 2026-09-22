# iOS / WebKit benchmark reload investigation

## Status

Open investigation. The memory/reload bug is **not fixed**.

On a physical iPhone running an iOS browser, repeated sequential benchmarking of all four detector runtimes can silently recreate the page. Most observed failures do not include an orderly `pagehide` and do not produce a catchable JavaScript exception before the new page instance starts.

The current working hypothesis is browser content-process termination under memory pressure or a related WebKit/runtime allocation problem. This remains a hypothesis, not a proven root cause.

## Symptom boundaries

Keep these distinctions explicit:

- model loaded != inference succeeded
- pipeline initialized != detections returned
- WebGPU available != graph execution stayed on WebGPU
- `dispose()` / `release()` returned != native/WASM/GPU memory was reclaimed immediately
- page recreation != JavaScript exception
- event-loop gap != crash proof

Apple exposes `WKNavigationDelegate.webViewWebContentProcessDidTerminate` to native WKWebView hosts specifically because web content runs in a separate process that may terminate independently of page JavaScript. A normal web page cannot directly receive that native delegate callback.

Primary reference:
- Apple WKNavigationDelegate, content-process termination: https://developer.apple.com/documentation/webkit/wknavigationdelegate/webviewwebcontentprocessdidterminate(_:)

## Current physical-device evidence

Latest completed diag9 reclamation evidence before the diag10 instrumentation patch:

- R1 — final RT resident, 0 ms inter-attempt delay: **10/10**
- R2 — final RT disposed, 0 ms delay: **10/10**
- R3 — final RT disposed, 3000 ms delay: **abrupt reload at attempt 7/10**
- R4 — final RT disposed, 10000 ms delay: **pending at the time of the checkpoint**

The R3 failure's last durable coarse stage was `rtdetr-start`. Immediately before that, SSD and YOLOX had completed and their release paths had returned. All model-resident booleans were OFF immediately before RT initialization.

The old recovery UI advanced the persistent matrix cursor to R4 and could therefore display `R4 1/10` even though the failure happened in R3 and R4 had not started. diag10 changed that presentation to show the failed case/attempt separately and the next case as pending. diag11 additionally accepts a deep durable critical stage during recovery only when its diagnostic attempt, matrix case, and case-attempt match the interrupted run; lightweight `diag=2` therefore cannot inherit a stale deep-stage record from an earlier `diag=3` session.

## What existing evidence does not support

Current evidence does **not** justify any of these conclusions:

- "RT-DETR resident memory is the root cause"
- "RT-DETR dispose is the root cause"
- "WebGPU is required for the failure"
- "0 ms cadence is the root cause"
- "3000 ms is sufficient reclaim time"
- "SSD is the leaking model because a failure once happened near SSD startup"

RT-DETR alone has completed 20-run WebGPU fp16 testing without reproducing the delayed page recreation. Full-four and all-WASM configurations have both reproduced failures. R1 and R2 can also complete 10/10.

The pattern remains compatible with a cumulative high-water mark, delayed reclamation, allocator fragmentation, runtime construction overhead, or a browser content-process memory threshold crossed by the next large allocation.

## Diagnostic modes

### diag=1

Basic lifecycle breadcrumbing.

### diag=2

Lightweight Black Box plus the existing all-WASM reclamation matrix:

- Tiny -> SSD -> YOLOX -> RT-DETR
- one unmeasured warm-up + 20 measured warm runs for each model
- 10 full attempts per case
- inter-model settle 0 ms
- R1 final RT resident / 0 ms inter-attempt delay
- R2 final RT dispose / 0 ms
- R3 final RT dispose / 3000 ms
- R4 final RT dispose / 10000 ms

### diag=3

Deep diagnostic mode keeps the same benchmark mechanics and adds evidence around the boundaries most likely to disappear during abrupt process death.

It records a bounded 200-event journal with:

- sequence number
- ISO wall-clock timestamp
- `performance.now()`
- benchmark attempt
- matrix case and case attempt
- model key
- phase
- requested and observed backend labels
- runtime-resident booleans
- bounded metadata

A separate lightweight durable critical-stage record is written for important transitions so the last boundary has a better chance of surviving a process termination. The full ring is checkpointed periodically instead of rewriting a large JSON snapshot after every event.

Deep mode also captures:

- window `error`
- `unhandledrejection`
- `pageshow.persisted`
- `pagehide.persisted`
- visibility and ready state
- navigation entry type and activation start when exposed
- `freeze` / `resume` if the browser dispatches them
- Cache API hit/miss boundaries
- model fetch boundaries without asset URLs
- raw model-buffer byte lengths and reference release
- ORT session create/release boundaries
- release method presence and measured release duration
- first-run tensor/canvas allocation estimates when shape/dtype are known
- RT-DETR module import, cache lookup, pipeline construction, staging-canvas, first pipeline call, and pipeline release boundaries

The diagnostic export does not claim to know process RSS. `performance.memory` remains unavailable where the browser does not expose it. WASM linear-memory bytes are only valid if an actual runtime object exposes them.

## Important new upstream finding: "forced WASM" is not necessarily standard ORT WASM

The page currently loads:

`onnxruntime-web@1.30.0/dist/ort.webgpu.min.js`

ONNX Runtime's current source and deployment documentation distinguish the standard WASM artifact from the JSEP-enabled WASM artifact used by its WebGPU-capable browser distribution:

- standard: `ort-wasm-simd-threaded.wasm`
- JSEP-capable: `ort-wasm-simd-threaded.jsep.wasm`

References:
- ORT environment/source comments for JSEP vs default WASM artifacts: https://github.com/microsoft/onnxruntime/blob/main/js/common/lib/env.ts
- ORT WASM import logic selecting the JSEP artifact in a JSEP-enabled build: https://github.com/microsoft/onnxruntime/blob/main/js/web/lib/wasm/wasm-utils-import.ts
- ORT deployment artifact table: https://onnxruntime.ai/docs/tutorials/web/deploy.html
- ORT WebGPU setup explicitly uses `ort.webgpu.min.js`: https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html
- jsDelivr 1.30.0 distribution contains both standard and JSEP artifacts: https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/

This matters because the existing all-WASM matrix forces the **execution provider** to WASM, but the page still bootstraps the WebGPU/JSEP-capable ORT distribution.

Therefore diag9's all-WASM result does **not** yet rule out a JSEP-build-specific Safari/WebKit problem.

This is currently the highest-value new experimental distinction.

## Upstream reports with similar symptoms

These reports are evidence of related failure classes, not proof that this repository has the same root cause.

### 1. Transformers.js: increasing memory followed by iOS crashes

Transformers.js issue #1242 reports v3.2.2 crashing on iOS 18.3.2 in both Safari and Chrome while macOS memory grows above 10 GB in the same examples.

https://github.com/huggingface/transformers.js/issues/1242

Relevance: high symptom similarity, different Transformers.js version and models.

### 2. Transformers.js: Safari page reload loop with WASM

Issue #1241 reports an iPad on iOS 18.3.2 repeatedly reloading the page while loading/running `onnx-community/whisper-base`, including WASM configurations.

https://github.com/huggingface/transformers.js/issues/1241

Relevance: high reload-pattern similarity, different model/workload.

### 3. Transformers.js: mobile page restart after model load

Issue #973 describes Transformers.js on iPhone restarting the page after model loading with no usable page-level logs.

https://github.com/huggingface/transformers.js/issues/973

Relevance: similar silent restart behavior, older stack.

### 4. ONNX Runtime: Safari/WebKit 26 JSEP memory growth and iOS process crashes

ORT issue #26827 reports Safari/WebKit CPU and memory remaining elevated after inference, growing from 1 GB upward and eventually ending in iOS WebProcess termination. The report says the behavior persisted even when `session.release()` was called.

The report also says its standard non-JSEP WASM configuration was stable, while JSEP configurations including WASM-only execution reproduced the problem.

https://github.com/microsoft/onnxruntime/issues/26827

Relevance: very high to the current ORT/JSEP hypothesis. It is still a different model and test harness.

### 5. ONNX Runtime: release does not guarantee leak-free reclamation

ORT issue #21673 reports retained memory after `InferenceSession.release()` in the web runtime.

https://github.com/microsoft/onnxruntime/issues/21673

Relevance: supports the distinction between a release call returning and all underlying memory becoming reclaimable. It does not establish the specific iOS failure.

### 6. WebKit memory-pressure machinery explicitly has kill paths

Current WebKit source contains memory-pressure policies, footprint measurements, memory-release attempts, and process-limit callbacks such as `didExceedActiveMemoryLimit`.

References:
- https://github.com/WebKit/WebKit/blob/main/Source/WTF/wtf/MemoryPressureHandler.cpp
- https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/WebProcessProxy.h
- https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/MemoryRelease.cpp

WebKit source also notes that on iOS heap growth is controlled using process memory footprint:

https://github.com/WebKit/WebKit/blob/main/Source/JavaScriptCore/runtime/Options.cpp

Do **not** convert generic WebKit source thresholds into a claimed iPhone hard memory limit. iOS can impose process/resource limits that are device-, OS-, state-, and host-dependent, and the web page does not observe the native footprint directly.

### 7. Emscripten: Safari/WASM allocation and reclaim edge cases

Emscripten issue #19374 describes Safari/iOS/macOS out-of-memory behavior after repeated reloads with shared WASM memory. It is not a direct match because this project's current non-isolated path uses one WASM thread, but it demonstrates that large WASM memory lifecycles can exhibit Safari-specific reclaim behavior.

https://github.com/emscripten-core/emscripten/issues/19374

Emscripten's deployment guide also warns that WebAssembly needs large contiguous linear memory and that address-space fragmentation can make allocations fail even when aggregate free memory appears sufficient:

https://github.com/emscripten-core/emscripten/blob/main/site/source/docs/compiling/Deploying-Pages.rst

Relevance: useful mechanism-level context, not root-cause evidence.

## Brave on iOS

Do not infer Blink merely from the Brave brand.

Apple's current App Review rule says web-browsing apps use WebKit unless they receive an alternative-engine entitlement. Apple documents alternative-engine entitlements for specific regions.

https://developer.apple.com/app-store/review/guidelines/
https://developer.apple.com/support/alternative-browser-engines/

Brave's own iOS material historically documents WKWebView constraints, and current source still contains WKWebView-specific paths. Brave's "Chromium Web Views on iOS" parent issue describes that architecture as a path toward Blink in eligible regions rather than proof that every Brave iOS page is Blink.

References:
- https://github.com/brave/brave-browser/wiki/Blocking-goals-and-policy
- https://github.com/brave/brave-browser/issues/42837
- https://github.com/brave/brave-core/blob/master/ios/brave-ios/Sources/UserAgent/UserAgentBuilder.swift

For this project, the runtime UI should continue separating browser brand from engine evidence and should not label an iOS Brave session as Blink without direct evidence.

## Next experiments

### First: preserve R4 information value

If the existing diag9 R4 state can still be completed on the same deployed build, complete it before replacing that build. If it is resumed after a new deployment, record that the experiment spans two builds and is no longer byte-identical.

### Then: use diag=3 for the next full-four crash

The purpose is to narrow `rtdetr-start` into a boundary such as:

- Transformers.js module import
- RT cache lookup
- pipeline construction
- individual model-file completion
- staging-canvas creation
- first pipeline invocation
- pipeline release

If failures cluster at one boundary, stop expanding the matrix and investigate that lifecycle.

### Highest-value new A/B: JSEP-capable ORT bundle vs standard ORT WASM bundle

Do not load both ORT bundles into the same page/process for this experiment; that would contaminate the memory question.

Use separate page loads/build modes:

A. current `ort.webgpu.min.js`, Tiny/SSD/YOLOX forced to WASM  
B. standard `ort.wasm.min.js`, Tiny/SSD/YOLOX forced to WASM

Start with repeated `Tiny -> SSD -> YOLOX` sequences and keep RT-DETR out of the first comparison.

If A reproduces and B remains stable across repeated equivalent runs, the ORT JSEP-capable build becomes a much stronger suspect.

Only after that comparison should RT-DETR be added back to determine whether Transformers.js is independently contributing to the process high-water mark.

### If R4 also fails

Delay alone is insufficient. Prefer isolation sequences that test one hypothesis at a time:

- Tiny only repeated
- SSD only repeated
- YOLOX only repeated
- RT only repeated
- Tiny -> SSD repeated
- SSD -> YOLOX repeated
- YOLOX -> RT repeated

Avoid brute-forcing every combination without a specific hypothesis.

## Diagnostic limits

Page JavaScript cannot reliably observe:

- WebContent process RSS
- native allocator fragmentation
- iOS jetsam/resource-limit reason
- WKNavigationDelegate's native termination callback
- exact native/GPU reclamation timing after `release()`
- library-owned WebGPU `GPUDevice.lost` unless the library exposes its device
- HTTP-cache hit/miss in a portable, authoritative way

Those values must remain unavailable rather than being synthesized.

## Privacy

Diagnostic storage and export must remain bounded and must not include:

- user image pixels
- local file paths
- access tokens
- cookies
- sensitive URLs

Public dependency/model identifiers and version strings are acceptable when needed to reproduce the runtime configuration.
