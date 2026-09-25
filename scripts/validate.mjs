import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const fail=message=>{throw new Error(message)};
const check=(condition,message)=>{if(!condition)fail(message)};

const files={
  index:read('index.html'),
  styles:read('assets/css/styles.css'),
  bootstrap:read('src/core/runtime-bootstrap.js'),
  preprocessing:read('src/core/preprocessing.js'),
  metrics:read('src/core/detection-metrics.js'),
  models:read('src/models/models.js'),
  runtime:read('src/core/model-runtime.js'),
  loader:read('src/core/model-loader.js'),
  app:read('src/app.js'),
  historicalDetectors:read('src/models/historical-detectors.js'),
  lwdetrPostprocess:read('src/models/lwdetr-postprocess.js'),
  race:read('src/models/race.js'),
  historyExperiments:read('src/history/history-experiments.js'),
  classicalWorker:read('src/history/classical-cv-worker.js'),
  history:read('docs/MODEL_HISTORY.md'),
  historicalDocs:read('docs/CLASSICAL_CV.md'),
  architecture:read('docs/ARCHITECTURE.md'),
  methodology:read('docs/BENCHMARK_METHODOLOGY.md'),
  sources:read('docs/MODEL_SOURCES.md'),
  licenses:read('docs/THIRD_PARTY_LICENSES.md'),
  catalog:read('docs/MODEL_CATALOG.md'),
  readme:read('README.md'),
  docsIndex:read('docs/README.md'),
  version:JSON.parse(read('version.json'))
};

for(const [name,code] of Object.entries({bootstrap:files.bootstrap,preprocessing:files.preprocessing,metrics:files.metrics,models:files.models,runtime:files.runtime,loader:files.loader,app:files.app,historicalDetectors:files.historicalDetectors,lwdetrPostprocess:files.lwdetrPostprocess,race:files.race,historyExperiments:files.historyExperiments,classicalWorker:files.classicalWorker})){
  try{new Function(code)}catch(error){fail(`${name}.js syntax: ${error.message}`)}
}
let relativeLoaderUrl='',relativeLoaderProgress=[];
const relativeLoaderWindow={location:{href:'https://hakanakgun.github.io/vision-evolution-lab/'}};
vm.runInNewContext(files.loader,{window:relativeLoaderWindow,URL,Map,performance,fetch:async url=>{
  relativeLoaderUrl=String(url);let sent=false;
  return{ok:true,headers:{get:name=>name==='content-length'?'4':null},body:{getReader:()=>({read:async()=>{if(sent)return{done:true};sent=true;return{done:false,value:Uint8Array.from([1,2,3,4,5,6,7,8])}}})}};
}},{filename:'model-loader-relative-url-test.js'});
const relativeLoaderResult=await relativeLoaderWindow.VisionModelLoader.load({id:'relative-model-url-test',bytes:8,sources:[{label:'relative test',url:'assets/models/test.onnx'}]},{onProgress:value=>relativeLoaderProgress.push(value)});
const relativeLoaderFinalProgress=relativeLoaderProgress.at(-1);
check(relativeLoaderUrl==='https://hakanakgun.github.io/vision-evolution-lab/assets/models/test.onnx'&&relativeLoaderResult.buffer.byteLength===8,'model loader must resolve relative source URLs against the current page origin');
check(relativeLoaderFinalProgress?.loaded===8&&relativeLoaderFinalProgress.total===8&&relativeLoaderFinalProgress.percent===100,'streamed progress must use expected uncompressed model bytes instead of a smaller content-length');

for(const [index,code] of [...files.index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).entries()){
  try{new Function(code)}catch(error){fail(`index inline script #${index+1}: ${error.message}`)}
}

function loadModelContracts(ortMode='standard-wasm'){
  const window={VisionRuntimeBootstrap:{ortVersion:'1.30.0',ortMode,ortEntrypoint:ortMode==='jsep'?'ort.webgpu.min.js':'ort.wasm.min.js',isIOS:ortMode!=='jsep',reason:'validation'}};
  const context={window,Object,Map,Set,Number,Boolean,Array,Error};
  vm.runInNewContext(files.models,context,{filename:'models.js'});
  vm.runInNewContext(files.runtime,context,{filename:'model-runtime.js'});
  return window;
}

const metadataWindow=loadModelContracts('standard-wasm');
const metadataRegistry=metadataWindow.VisionModels;
const raceModels=metadataWindow.VisionRuntimeRegistry.modelKeys
  .map(key=>({key,model:metadataRegistry[key],race:metadataWindow.VisionRuntimeRegistry.raceMeta(metadataRegistry[key])}))
  .filter(entry=>entry.race&&entry.race.group==='general-object')
  .sort((a,b)=>a.race.order-b.race.order);
const timeMachineModels=(metadataRegistry.timeline||[])
  .filter(entry=>entry.model)
  .map(entry=>({entry,key:entry.model,model:metadataRegistry[entry.model],inspection:metadataRegistry[entry.model]?.capabilities?.inspection}));

const preprocessingWindow={};vm.runInNewContext(files.preprocessing,{window:preprocessingWindow,Float32Array,TypeError,Number,Object},{filename:'preprocessing.js'});
const tinyPixels=preprocessingWindow.VisionPreprocessing.packTinyRgbNchw(Uint8Array.from([10,20,30,255,40,50,60,128]),2,1);
check(tinyPixels instanceof Float32Array&&JSON.stringify([...tinyPixels])==='[10,40,20,50,30,60]','Tiny input packer must emit RGB planar float32 pixels and ignore alpha');
const metricsWindow={};vm.runInNewContext(files.metrics,{window:metricsWindow,Number,Array,Set,Object},{filename:'detection-metrics.js'});
const metricCheck=metricsWindow.VisionDetectionMetrics.evaluate([
  {label:'person',score:.9,box:[0,0,.5,.5]},
  {label:'person',score:.8,box:[0,0,.5,.5]},
  {label:'cat',score:.7,box:[.5,.5,1,1]}
],[{label:'person',box:[0,0,.5,.5]},{label:'dog',box:[.5,.5,1,1]}],{confidence:.4,iouThreshold:.5});
check(metricCheck.truePositives===1&&metricCheck.falsePositives===2&&metricCheck.falseNegatives===1&&metricCheck.f1===.4,'limited detection metric must enforce one-to-one, same-class IoU matches');

const ids=[...files.index.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
const duplicateIds=[...new Set(ids.filter((id,index,list)=>list.indexOf(id)!==index))];
check(duplicateIds.length===0,`duplicate DOM ids: ${duplicateIds.join(', ')}`);
const idSet=new Set(ids);

const generatedIds=new Set();
for(const {race} of raceModels){
  for(const suffix of ['backend','canvas','empty'])generatedIds.add(`race-${race.prefix}-${suffix}`);
  for(const metric of race.metrics||[])if(metric.slot)generatedIds.add(`race-${race.prefix}-${metric.slot}`);
  if(race.progress){generatedIds.add(`race-${race.prefix}-progress-bar`);generatedIds.add(`race-${race.prefix}-progress-text`)}
  for(const suffix of ['backend','p50','p90','total','cv'])generatedIds.add(`rb-${race.prefix}-${suffix}`);
  if(race.workCanvasId)generatedIds.add(race.workCanvasId);
  generatedIds.add(`race-only-${race.prefix}`);
}
for(let i=0;i<raceModels.length;i++)for(let j=i+1;j<raceModels.length;j++)generatedIds.add(`race-match-${raceModels[i].race.prefix}-${raceModels[j].race.prefix}`);

const literalRefs=[...new Set([
  ...files.app.matchAll(/\$\('([^']+)'\)/g),
  ...files.historicalDetectors.matchAll(/\$\('([^']+)'\)/g),
  ...files.race.matchAll(/\$\('([^']+)'\)/g),
  ...files.historyExperiments.matchAll(/\$\('([^']+)'\)/g)
].map(match=>match[1]))];
const missingIds=literalRefs.filter(id=>!idSet.has(id)&&!generatedIds.has(id));
check(missingIds.length===0,`missing DOM ids: ${missingIds.join(', ')}`);
check(idSet.has('live-model-select')&&idSet.has('live-model-status'),'Live Camera model picker controls are missing');
for(const id of ['camera-flip','camera-zoom-controls','camera-zoom-out','camera-zoom-reset','camera-zoom-in'])check(idSet.has(id),'Live Camera device control missing: '+id);
check(files.app.includes("function liveModelKeys()")&&files.app.includes("state.liveModel===modelKey"),'Live Camera must use its independent live model state');

const {version,build}=files.version;
check(files.index.includes(`data-build="${build}"`),'index data-build does not match version.json');
check(files.index.includes(`const CURRENT_BUILD = '${build}'`),'CURRENT_BUILD does not match version.json');
for(const asset of ['assets/css/styles.css','src/core/runtime-bootstrap.js','src/core/preprocessing.js','src/core/detection-metrics.js','src/models/models.js','src/core/model-runtime.js','src/core/model-loader.js','src/app.js','src/models/lwdetr-postprocess.js','src/models/historical-detectors.js','src/models/race.js','src/history/history-experiments.js']){
  check(files.index.includes(`${asset}?v=${version}`),`cache-busted asset missing or stale: ${asset}`);
}
const scriptOrder=['src/core/runtime-bootstrap.js','src/core/preprocessing.js','src/models/models.js','src/core/detection-metrics.js','src/core/model-runtime.js','src/core/model-loader.js','src/app.js','src/models/lwdetr-postprocess.js','src/models/historical-detectors.js','src/models/race.js','src/history/history-experiments.js'];
let previous=-1;
for(const script of scriptOrder){
  const current=files.index.indexOf(script);
  check(current>=0,`script missing from index: ${script}`);
  check(current>previous,`script order invalid near ${script}`);
  previous=current;
}

for(const mode of ['standard-wasm','jsep']){
  const window=loadModelContracts(mode),registry=window.VisionModels,runtimes=window.VisionRuntimeRegistry;
  check(registry&&runtimes,'model/runtime registry failed to initialize');
  check(runtimes.modelKeys.length>0,'no runnable models declared');
  for(const key of runtimes.modelKeys){
    const model=registry[key],cap=model.capabilities;
    check(cap&&typeof cap.timeMachine==='boolean',`${key}: timeMachine capability must be boolean`);
    check(typeof cap.benchmark==='boolean',`${key}: benchmark capability missing`);
    check(cap.live===false||(cap.live&&typeof cap.live==='object'&&Number.isFinite(cap.live.order)&&cap.live.summary),`${key}: live capability must be false or declare ordered metadata`);
    check(cap.inspection===false||(cap.inspection&&typeof cap.inspection.mode==='string'),`${key}: inspection capability must be false or declare a mode`);
    if(runtimes.capabilityEnabled(model,'race')){
      const race=runtimes.raceMeta(model);
      check(race&&race.group&&Number.isFinite(race.order)&&race.prefix&&race.workCanvasId&&race.timingBoundary,`${key}: race metadata incomplete`);
      check(race.badge&&race.emptyText&&race.architecture,`${key}: race presentation metadata incomplete`);
      check(Array.isArray(race.metrics)&&race.metrics.length>0,`${key}: race metrics missing`);
    }
    const adapter={run:async()=>({}),release:async()=>{},backend:()=>''};
    if(cap.inspection?.intermediate?.data==='adapter')adapter.inspectionData=()=>[];
    runtimes.register(key,adapter);
  }
  check(runtimes.assertRegistered({capability:'race',group:'general-object'})===true,`${mode}: race adapters failed contract validation`);
  check(runtimes.assertRegistered({capability:'timeMachine'})===true,`${mode}: Time Machine adapters failed contract validation`);
  check(runtimes.assertRegistered({capability:'live'})===true,`${mode}: Live Camera adapters failed contract validation`);
  const liveAdapters=runtimes.list({capability:'live'});
  const liveOrders=liveAdapters.map(adapter=>runtimes.liveMeta(adapter.model)?.order);
  check(liveOrders.every((value,index)=>index===0||liveOrders[index-1]<value),`${mode}: live order is not strictly increasing`);
  const ordered=runtimes.list({capability:'race',group:'general-object'});
  const orders=ordered.map(adapter=>adapter.model.capabilities.race.order);
  const prefixes=ordered.map(adapter=>adapter.model.capabilities.race.prefix);
  check(orders.every((value,index)=>index===0||orders[index-1]<value),`${mode}: race order is not strictly increasing`);
  check(new Set(prefixes).size===prefixes.length,`${mode}: race prefixes are not unique`);
}
const standard=loadModelContracts('standard-wasm').VisionModels;
const jsep=loadModelContracts('jsep').VisionModels;
check(JSON.stringify(standard.yolox.executionProviders)==='["wasm"]','standard-WASM YOLOX providers regressed');
check(JSON.stringify(jsep.yolox.executionProviders)==='["webgpu","wasm"]','JSEP YOLOX providers regressed');
check(metadataRegistry.yolox.capabilities.live?.forceBackend==='wasm','YOLOX Live Camera must stay on the verified WASM path');
check(files.app.includes("function liveRuntimeOptions(adapter)")&&files.app.includes("adapter.prepare?.(liveRuntimeOptions(adapter))")&&files.app.includes("adapter.run(video,canvas,{updateMain:false,...liveRuntimeOptions(adapter)})"),'Live Camera must honor capability-declared runtime options without model-name branching');
check(files.race.includes("prepare:(options={})=>createYoloSession(options.forceBackend||'')"),'YOLOX adapter prepare must honor requested live backend');
check(files.race.includes("for(let c=0;c<80;c++){const score=obj*Number(data[o+5+c])")&&files.race.includes("k.classId!==d.classId||iou(d.box,k.box)<=YOLO.nms")&&!files.race.includes("kept.every(k=>iou(d.box,k.box)<=YOLO.nms)"),'YOLOX postprocessing must preserve per-class scores and use class-aware NMS');

const releaseWindow=loadModelContracts('standard-wasm'),released=[];
for(const key of releaseWindow.VisionRuntimeRegistry.modelKeys){
  const model=releaseWindow.VisionModels[key],adapter={run:async()=>({}),release:async()=>{released.push(key)},backend:()=>''};
  if(model.capabilities?.inspection?.intermediate?.data==='adapter')adapter.inspectionData=()=>[];
  releaseWindow.VisionRuntimeRegistry.register(key,adapter);
}
const expectedReleased=releaseWindow.VisionRuntimeRegistry.list({capability:'race',group:'general-object'}).map(adapter=>adapter.key).filter(key=>key!=='ssd');
await releaseWindow.VisionRuntimeRegistry.releaseAll({exceptKey:'ssd',capability:'race',group:'general-object'});
check(JSON.stringify(released)===JSON.stringify(expectedReleased),'runtime releaseAll ownership/order regressed');

function simulateBootstrap({ua,platform,maxTouchPoints,search=''}) {
  const writes=[],window={};
  const context={window,navigator:{userAgent:ua,platform,maxTouchPoints},location:{search},document:{write:value=>writes.push(value)},URLSearchParams};
  vm.runInNewContext(files.bootstrap,context,{filename:'runtime-bootstrap.js'});
  return{config:window.VisionRuntimeBootstrap,writes};
}
const ios=simulateBootstrap({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X)',platform:'iPhone',maxTouchPoints:5});
const desktop=simulateBootstrap({ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36',platform:'MacIntel',maxTouchPoints:0});
const forceJsep=simulateBootstrap({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X)',platform:'iPhone',maxTouchPoints:5,search:'?ort=jsep'});
const forceWasm=simulateBootstrap({ua:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',platform:'MacIntel',maxTouchPoints:0,search:'?ort=wasm'});
check(ios.config.ortMode==='standard-wasm'&&ios.writes[0]?.includes('ort.wasm.min.js'),'iOS bootstrap must select standard WASM');
check(desktop.config.ortMode==='jsep'&&desktop.writes[0]?.includes('ort.webgpu.min.js'),'desktop bootstrap must select JSEP/WebGPU');
check(forceJsep.config.ortMode==='jsep','?ort=jsep override failed');
check(forceWasm.config.ortMode==='standard-wasm','?ort=wasm override failed');

const expectedTimeMachineKeys=metadataWindow.VisionRuntimeRegistry.modelKeys.filter(key=>metadataWindow.VisionRuntimeRegistry.capabilityEnabled(metadataRegistry[key],'timeMachine'));
const timelineKeys=timeMachineModels.map(item=>item.key);
check(new Set(timelineKeys).size===timelineKeys.length,'Time Machine timeline contains duplicate runnable models');
check(expectedTimeMachineKeys.every(key=>timelineKeys.includes(key))&&timelineKeys.every(key=>expectedTimeMachineKeys.includes(key)),'Time Machine timeline/model capability membership mismatch');
check(metadataRegistry.defaults?.timeMachine==='yolox'&&expectedTimeMachineKeys.includes(metadataRegistry.defaults.timeMachine),'Time Machine must open on the lightweight YOLOX-Nano starting model');
check(files.index.includes('id="timeline-track"')&&files.index.includes('id="preprocess-table"'),'dynamic Time Machine/inspection containers missing');
check(files.index.includes('class="timeline-scroll" data-scroll-area role="region" tabindex="0"')&&files.index.includes('aria-describedby="timeline-help"')&&files.index.includes('id="timeline-selection"'),'timeline scroll region and selection label must be accessible');
check(files.index.includes('id="active-model-title">YOLOX-Nano')&&files.index.includes('id="rerun" disabled>Run YOLOX-Nano')&&files.index.includes('id="inside-active-model">YOLOX-Nano'),'initial Time Machine and inspector labels must match the default model');
check(files.app.includes("button.setAttribute('aria-pressed',String(selected))")&&files.app.includes("$('timeline-selection').textContent=")&&!files.app.includes('track.style.minWidth'),'timeline selection state must stay synchronized without page-width expansion');
check(files.styles.includes('.timeline .milestone{appearance:none')&&files.styles.includes('.timeline .timeline-scroll{')&&files.styles.includes('scroll-snap-type:x proximity')&&files.styles.includes('prefers-reduced-motion:reduce'),'timeline controls must use the responsive, reduced-motion rail styles');
check(!files.index.includes('data-runnable-model=')&&!files.index.includes('class="preprocess-row'),'static Time Machine timeline or preprocessing rows returned');
check(files.app.includes('function renderTimeline()')&&files.app.includes('function renderPreprocessingComparison()'),'Time Machine presentation is not registry-driven');
check(files.app.includes('function inspectionFor(modelKey)')&&!files.app.includes('INSIDE_SPECS'),'Inside the Model is not capability-driven');
for(const key of ['tinyyolo','yolox','rtdetr'])check(!files.app.includes(`modelKey==='${key}'`)&&!files.app.includes(`state.activeModel==='${key}'`),`app.js restored model-name inspection/presentation branch for ${key}`);
check(!files.app.includes("benchmarkModel==='rtdetr'"),'Time Machine benchmark boundary returned to RT-DETR key branching');
check(files.runtime.includes("runtime adapter missing inspectionData()"),'inspection-data adapter contract is not enforced');
check(files.race.includes('inspectionData:()=>state.lastHeadMaps'),'YOLOX real inspection adapter hook missing');
check(files.app.includes('function renderScalarHeatmaps')&&files.app.includes('function renderInspectionData'),'generic inspection renderer missing');
check(!files.index.includes('id="feature-s8"')&&!files.index.includes('id="feature-s16"')&&!files.index.includes('id="feature-s32"'),'fixed YOLOX feature-map canvases returned');
check(!files.race.includes('function renderHeadMaps')&&!files.race.includes('renderFeatures'),'inspection rendering leaked back into inference runtime');
check(files.race.includes("runtimeRegistry.assertRegistered({capability:'timeMachine'})"),'Time Machine adapter completeness is not asserted at startup');
check(files.race.includes("runtimeRegistry.assertRegistered({capability:'live'})"),'Live Camera adapter completeness is not asserted after runtime registration');
const liveKeys=metadataWindow.VisionRuntimeRegistry.modelKeys.filter(key=>metadataWindow.VisionRuntimeRegistry.capabilityEnabled(metadataRegistry[key],'live'));
check(JSON.stringify(liveKeys)==='["tinyyolo","ssd","yolox","rtdetr","rtdetrv2","lwdetr","dfine"]','the seven approved detectors must be eligible for Live Camera');
check(metadataRegistry.defaults?.live===metadataRegistry.defaults?.timeMachine,'default Live Camera model must follow the Time Machine default');
check(files.index.includes('id="live-model-name"')&&files.index.includes('id="live-model-controls"')&&files.index.includes('id="live-model-select"'),'Live Camera metadata/model picker containers missing');
check(files.app.includes("RuntimeRegistry.validate({capability:'live'}).expected")&&files.app.includes('adapter.run(video,canvas,{updateMain:false,...liveRuntimeOptions(adapter)})'),'Live Camera is not capability/runtime-adapter driven');
check(files.app.includes('function currentLiveAdapter(){return RuntimeRegistry.get(state.liveModel)}'),'Live Camera must use its independent live model state');
check(!files.app.includes('selectActiveModel(key,{scroll:false})'),'Live Camera model choices must not mutate Time Machine selection');
check(files.app.includes('state.liveModel!==modelKey')&&files.app.includes('token!==state.cameraStartToken'),'Live Camera start must cancel when its selected model or camera token changes');
check(files.app.includes('await previousAdapter?.release()')&&files.app.includes('await state.liveInference.catch(()=>{})'),'switching live models must release the old runtime after any current camera inference finishes');
check(files.app.includes('await state.runtimeTransition.catch(()=>{})')&&files.app.includes('state.liveInference=framePromise'),'Time Machine inference and Live Camera must serialize model-runtime transitions');
check(files.app.includes('previousAdapter.prepare?.()')&&files.app.includes("if(!restored&&state.live)stopCamera("),'failed live-model switches must attempt rollback and stop the camera if rollback fails');
const benchmarkFunction=files.app.slice(files.app.indexOf('async function runBenchmark()'),files.app.indexOf("$('image-file').addEventListener('change'"));
const cameraStartFunction=files.app.slice(files.app.indexOf('async function startCamera()'),files.app.indexOf('async function liveLoop('));
const cameraSwitchFunction=files.app.slice(files.app.indexOf('async function switchCamera()'),files.app.indexOf('function renderLiveModels()'));
const cameraZoomFunction=files.app.slice(files.app.indexOf('async function applyCameraZoom('),files.app.indexOf('function stepCameraZoom('));
check(!benchmarkFunction.includes('cameraStartToken'),'benchmark error handling must not use Live Camera cancellation state');
check(cameraStartFunction.includes('if(token!==state.cameraStartToken')&&cameraStartFunction.includes("requestCameraStream(state.cameraFacing,{exact:false})"),'Live Camera start must honor cancellation and request the selected facing mode');
check(files.app.includes("facingMode:exact?{exact:facing}:{ideal:facing}")&&files.app.includes("device.kind==='videoinput'"),'camera facing controls must use Media Capture facingMode and permission-scoped video-device discovery');
check(cameraSwitchFunction.includes('await state.liveInference.catch(()=>{})')&&cameraSwitchFunction.indexOf('stopMediaStream(oldStream)')<cameraSwitchFunction.indexOf("requestCameraStream(targetFacing,{exact:true})"),'camera switching must settle inference and stop the old track before requesting the opposite facing mode');
check(cameraSwitchFunction.includes("requestCameraStream(previousFacing,{exact:true})")&&cameraSwitchFunction.includes('Camera switch rollback failed'),'failed camera switching must attempt to reacquire the previous facing mode');
check(files.app.includes("getCapabilities()")&&files.app.includes("capabilities.zoom?.min")&&files.app.includes("getSettings?.()"),'camera zoom controls must derive their range/current value from the active MediaStreamTrack');
check(cameraZoomFunction.includes("track.applyConstraints({zoom:target})")&&files.app.includes("state.cameraFacing==='environment'?state.cameraZoom:null"),'rear-camera zoom must use track constraints and stay hidden when the active rear track has no zoom capability');
check(files.app.includes('function cameraZoomLevels(range)')&&files.app.includes('function nextCameraZoom(range,direction)')&&!files.app.includes('(max-min)/20')&&!files.app.includes('zoom.tapStep'),'camera zoom +/- controls must step through clean capability-bounded levels instead of equal fractional slices');
check(files.app.includes("Number(value.toFixed(1)).toString()+'×'"),'camera zoom UI must avoid noisy hundredth-level labels');
check(files.app.includes('prepare:()=>createSession()'),'SSD live adapter does not preserve pre-camera runtime preparation');
for(const [key,needle] of [['tinyyolo','prepare:()=>createTinySession()'],['yolox','prepare:()=>createYoloSession()'],['rtdetr','prepare:()=>createRT()'],['rtdetrv2','prepare:()=>create()']])check(files.race.includes(needle),`${key}: Live Camera adapter does not prepare its runtime before camera access`);
check(files.historicalDetectors.includes("return{run,prepare,release,backend:()=> 'WASM fp32'")&&files.historicalDetectors.includes("return{run,prepare:load,release,backend:()=> 'WASM fp32'"),'LW-DETR and D-FINE Live Camera adapters must prepare their runtime before camera access');
check(!files.app.includes('inferSource(video,canvas,{updateMain:false})'),'Live Camera still directly calls SSD inference');
check(files.app.includes('refreshLiveModels:renderLiveModels')&&files.race.includes('api.refreshLiveModels?.()'),'Live Camera registry refresh contract missing');
for(const item of timeMachineModels){
  if(item.inspection===false)continue;
  check(item.inspection&&item.inspection.preview&&item.inspection.pipeline&&item.inspection.comparison&&item.inspection.intermediate,`${item.key}: inspection presentation contract incomplete`);
}


const historyExperiments=metadataRegistry.historyExperiments||{};
const experimentEntries=(metadataRegistry.timeline||[]).filter(entry=>entry.kind==='history-experiment');
const expectedExperiments=[
  [1980,'neocognitron','Neocognitron'],
  [1998,'mnist-digits','LeNet-era MNIST CNN'],
  [2001,'viola-jones','Viola–Jones'],
  [2005,'hog-pedestrians','HOG + SVM'],
  [2012,'alexnet-classification','AlexNet']
];
check(experimentEntries.length===expectedExperiments.length,'Time Machine historical experiment count changed');
check(Object.keys(historyExperiments).length===expectedExperiments.length,'historical experiment registry count changed');
for(const [year,key,title] of expectedExperiments){
  const entry=experimentEntries.find(item=>item.year===year&&item.experiment===key);
  const spec=historyExperiments[key];
  check(entry&&entry.title===title,'historical experiment timeline entry missing: '+year+' '+title);
  check(spec&&spec.year===year&&spec.input==='image'&&spec.task&&spec.output&&spec.runner,'historical experiment metadata incomplete: '+key);
  check(!entry.model&&!entry.jump,'historical experiment must stay outside model registry and tab navigation: '+key);
}
check(historyExperiments['mnist-digits'].model?.repository==='onnx/models','pinned MNIST Model Zoo source missing');
check(historyExperiments['mnist-digits'].model?.revision==='4f43949841cb55a0b98dc8fcd045431ccafd9f96','MNIST Model Zoo source revision changed');
check(historyExperiments['mnist-digits'].model?.file==='mnist-12.onnx'&&historyExperiments['mnist-digits'].model?.opset===12&&historyExperiments['mnist-digits'].model?.bytes===26143,'MNIST must use the pinned opset-12 compatible export');
check(historyExperiments['mnist-digits'].model?.sha256==='5c688690f8bacf667d4c2074af5ad0646ca328d7ab03eccf944a65b320171bdd','MNIST Model Zoo model checksum changed');
check(historyExperiments['mnist-digits'].model?.url==='https://media.githubusercontent.com/media/onnx/models/4f43949841cb55a0b98dc8fcd045431ccafd9f96/validated/vision/classification/mnist/model/mnist-12.onnx','MNIST download must stay on the pinned Model Zoo artifact');
check(historyExperiments['mnist-digits'].model?.provider==='wasm'&&historyExperiments['mnist-digits'].model?.licenseMetadata==='Apache-2.0'&&historyExperiments['mnist-digits'].model?.licenseCard==='MIT','MNIST model runtime or license ambiguity must remain disclosed');
const alexnet=historyExperiments['alexnet-classification'];
check(alexnet?.runner==='alexnet-image-classification'&&alexnet.task==='1000-class ImageNet image classification'&&alexnet.output==='top-5-labels','AlexNet must remain a same-image classifier outside detection semantics');
check(alexnet.model?.repository==='onnxmodelzoo/bvlcalexnet-12-int8'&&alexnet.model?.revision==='99a443a03ecc3576ebd2d94aae33f8f5522b969c'&&alexnet.model?.bytes===60984008&&alexnet.model?.opset===12,'AlexNet ONNX checkpoint source/revision/size/opset pin changed');
check(alexnet.model?.sha256==='d53bbedf100be79277cf55d78c72bdcb67d88786988561bf5d530f038e443c7b'&&alexnet.model?.provider==='wasm','AlexNet ONNX model integrity or browser provider pin changed');
check(alexnet.model?.input?.width===224&&alexnet.model?.input?.height===224&&alexnet.model?.input?.layout==='NCHW'&&alexnet.model?.input?.channels==='BGR'&&alexnet.model?.input?.mean?.join(',')==='103.939,116.779,123.68','AlexNet input preprocessing contract changed');
check(alexnet.model?.labels==='assets/models/imagenet-1k-labels.json'&&alexnet.model?.labelsSha256==='495a1f028e7b3b1878dbc4ec2e66f9a9a9c89c48abb007a9c954faa13571c33a','AlexNet ImageNet label map pin changed');
check(exists(alexnet.model.labels)&&JSON.parse(read(alexnet.model.labels)).length===1000,'AlexNet must ship a complete 1,000-class label map');
check(createHash('sha256').update(fs.readFileSync(path.join(root,alexnet.model.labels))).digest('hex')===alexnet.model.labelsSha256,'AlexNet bundled label map checksum changed');
const historicalMilestones=(metadataRegistry.timeline||[]).filter(entry=>entry.kind==='historical');
const expectedHistoricalMilestones=[[2014,'R-CNN'],[2015,'Faster R-CNN'],[2016,'YOLOv1']];
check(historicalMilestones.length===expectedHistoricalMilestones.length,'paper-only timeline milestone count changed');
for(const [year,title] of expectedHistoricalMilestones)check(historicalMilestones.some(entry=>entry.year===year&&entry.title===title),'paper-only milestone missing: '+year+' '+title);
check(historicalMilestones.every(entry=>!entry.model&&!entry.jump&&entry.note?.startsWith('history only ·')),'paper-only milestones must not select or load a runtime');
check((metadataRegistry.timeline||[]).every((entry,index,entries)=>index===0||entries[index-1].year<entry.year||(entries[index-1].year===entry.year&&(entries[index-1].month||0)<=(entry.month||0))),'Time Machine timeline must remain chronologically sorted by year and optional month');
check((metadataRegistry.timeline||[]).filter(entry=>entry.month).every(entry=>Number.isInteger(entry.month)&&entry.month>=1&&entry.month<=12),'timeline months must be valid calendar month numbers');
for(const [year,month,title] of [[2020,5,'DETR · ResNet-50'],[2021,7,'YOLOX-Nano'],[2023,4,'RT-DETR R18'],[2024,6,'LW-DETR-tiny'],[2024,7,'RT-DETRv2 R18'],[2024,10,'D-FINE-N']])check(metadataRegistry.timeline.some(entry=>entry.year===year&&entry.month===month&&entry.title===title),'timeline month missing or incorrect: '+title);
check(files.app.includes("entry.kind==='historical'?'historical-only':''")&&files.styles.includes('.milestone.historical-only .dot'),'paper-only milestones must keep a distinct timeline treatment');
check(files.app.includes('entry.experiment===state.historyExperiment')&&files.app.includes('data-history-experiment')&&files.app.includes('runnable&&!state.historyExperiment&&entry.model===state.activeModel'),'selected experiment timeline state is missing or also highlights a stale AI year');
check(files.index.includes('Historical experiment · same image')&&historyExperiments['mnist-digits'].note.includes('isolated handwritten digits')&&alexnet.note.includes('does not locate objects'),'Time Machine must explain task-specific same-image classifier boundaries');
check(files.catalog.includes('| 1980 | Neocognitron-inspired feature response | Runnable historical experiment |')&&files.catalog.includes('| 1998 | LeNet-era MNIST CNN reference | Runnable historical experiment |')&&files.catalog.includes('| 2001 | Viola–Jones method family / OpenCV frontal-face cascade | Runnable historical experiment |')&&files.catalog.includes('| 2005 | HOG + linear SVM pedestrian detector | Runnable historical experiment |')&&files.catalog.includes('| 2012 | AlexNet · ImageNet classification | Runnable historical experiment |'),'catalog must distinguish runnable historical experiments');
check(files.readme.includes('one image selected in Time Machine')&&files.docsIndex.includes('[Time Machine historical experiments](CLASSICAL_CV.md)'),'README/docs map must describe and link to same-image history experiments');
for(const source of ['https://doi.org/10.1007/BF00344251','https://yann.lecun.com/exdb/publis/pdf/lecun-01a.pdf','https://doi.org/10.1109/CVPR.2001.990517','https://doi.org/10.1109/CVPR.2005.177','https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html','https://openaccess.thecvf.com/content_cvpr_2014/html/Girshick_Rich_Feature_Hierarchies_2014_CVPR_paper.html','https://proceedings.neurips.cc/paper/2015/hash/14bfa6bb14875e45bba028a21ed38046-Abstract.html','https://openaccess.thecvf.com/content_cvpr_2016/html/Redmon_You_Only_Look_CVPR_2016_paper.html','https://research.google/pubs/ssd-single-shot-multibox-detector/','https://www.ecva.net/papers/eccv_2020/papers_ECCV/html/832_ECCV_2020_paper.php'])check(files.history.includes(source),'historical primary-paper source missing: '+source);
check(metadataWindow.VisionRuntimeRegistry.modelKeys.length===9,'Time Machine registry should contain five race models and four historical detectors');
check(timeMachineModels.length===9,'Time Machine must expose nine runnable model generations');
for(const [key,year,title] of [['ssd2016',2016,'SSD · ResNet-34 INT8'],['detr',2020,'DETR · ResNet-50']]){
  const model=metadataRegistry[key],entry=metadataRegistry.timeline.find(item=>item.model===key);
  check(model&&entry&&entry.year===year&&entry.title===title,'historical detector timeline entry missing: '+key);
  check(model.capabilities.timeMachine&&model.capabilities.benchmark&&model.capabilities.live===false&&model.capabilities.race===false,`${key}: historical detectors must be Time Machine/individual benchmark only`);
  check(!metadataWindow.VisionRuntimeRegistry.capabilityEnabled(model,'race')&&!metadataWindow.VisionRuntimeRegistry.capabilityEnabled(model,'live'),`${key}: historical detector entered Model Race or Live Camera`);
}
check(metadataRegistry.ssd2016.bytes===20485276&&metadataRegistry.ssd2016.sha256==='56d2c03a8c74c03f704509ccfcd91763991c6e1b92f63da730fb2b3d07565453','SSD 2016 pinned artifact integrity metadata changed');
check(metadataRegistry.detr.revision==='8be7ab59ff663484ee9ba2e8d8f267330d5ad03e'&&metadataRegistry.detr.runtime.wasm.dtype==='q8','DETR must stay on its pinned q8/WASM conversion');
const lw=metadataRegistry.lwdetr,lwEntry=metadataRegistry.timeline.find(item=>item.model==='lwdetr');
check(lwEntry?.year===2024&&lwEntry.month===6&&lwEntry.kind==='runnable','LW-DETR-tiny June 2024 Time Machine entry is missing');
check(lw.bytes===38313297&&lw.sha256==='dadac1a335e108a5d1a52c4ac0280cd9b71ea2f7c39400e2d532f3a1f663dea0'&&lw.runtime.wasm.device==='wasm'&&lw.runtime.wasm.dtype==='fp32','LW-DETR artifact integrity metadata or WASM fp32 path changed');
check(lw.sources?.some(source=>source.url===`assets/models/lw-detr-tiny.onnx?sha256=${lw.sha256}`),'LW-DETR must use the checksum-pinned same-origin Pages asset');
check(lw.sourceModel==='AnnaZhang/lwdetr_tiny_60e_coco'&&lw.sourceRevision==='4b636b514dcf623f6eafc9e1ab63b8ad5c513925'&&lw.labels.length===91,'LW-DETR checkpoint revision or label map changed');
const lwLive=metadataWindow.VisionRuntimeRegistry.liveMeta(lw);
check(lw.capabilities.timeMachine&&!lw.capabilities.benchmark&&lwLive?.order===70&&!lw.capabilities.race&&!lw.capabilities.inspection,'LW-DETR must remain Time Machine + Live Camera only');
check(files.historicalDetectors.includes("runtimes.register('lwdetr'")&&files.historicalDetectors.includes("executionProviders:['wasm']")&&files.historicalDetectors.includes("JSON.stringify(logits.dims)!=='[1,100,91]'"),'LW-DETR adapter must use verified WASM and pinned input/output contracts');
check(files.historicalDetectors.includes("sourceLabel=model.sources?.[0]?.label||'Pinned ONNX asset'")&&files.historicalDetectors.includes('source:runtimeSource'),'LW-DETR runtime must show the actual Pages delivery source separately from checkpoint provenance');
check(files.historicalDetectors.includes('const sessionStarted=performance.now()')&&files.historicalDetectors.includes('initMs=sessionInitMs'),'LW-DETR session initialization timing must start after transfer and checksum verification');
check(files.historicalDetectors.includes('totalMs=preMs+infMs+postMs'),'LW-DETR end-to-end must sum only current-run stages, excluding startup');
check(files.historicalDetectors.includes('inputWidth:640,inputHeight:640')&&files.app.includes('Number.isFinite(result.inputWidth)'),'LW-DETR must report the actual 640×640 model tensor, not the aspect-preserved display canvas');
const decodeWindow={};vm.runInNewContext(files.lwdetrPostprocess,{window:decodeWindow,Float32Array,TypeError,RangeError,Number,Array,Math,Object},{filename:'lwdetr-postprocess.js'});
const decoded=decodeWindow.VisionLwDetrPostprocess.decode(new Float32Array([0,1,2,0,1.5,.5]),new Float32Array([.5,.5,.4,.4,.25,.75,.2,.3]),{labels:['N/A','person','cat'],width:640,height:480,threshold:.8,topK:3});
check(decoded.rawCount===3&&decoded.detections.length===2&&decoded.detections[0].label==='cat'&&decoded.detections[0].classId===2&&decoded.detections[1].label==='person'&&decoded.detections[1].classId===1,'LW-DETR postprocessor must sigmoid and globally rank query/class pairs');
check(decoded.detections[0].box.every((value,index)=>Math.abs(value-[.3,.3,.7,.7][index])<1e-6),'LW-DETR cxcywh-to-normalized-yxyx conversion changed');
const dfine=metadataRegistry.dfine,dfineEntry=metadataRegistry.timeline.find(item=>item.model==='dfine');
check(dfineEntry?.year===2024&&dfineEntry.month===10&&dfineEntry.kind==='runnable','D-FINE-N October 2024 Time Machine entry is missing');
check(dfine.modelId==='onnx-community/dfine_n_coco-ONNX'&&dfine.revision==='e2b9c0f0884ee7c90b79feedfd30054e82ed634c'&&dfine.baseRevision==='066438d3d8f0da137a37b38fdf3368fd4afceced','D-FINE-N base/conversion revisions must stay pinned');
check(dfine.bytes===15300000&&dfine.sha256==='0f684f409618ee8a822410e754a29caa817d1aa16283ce89cad936d0a48e2f35'&&dfine.runtime.wasm.device==='wasm'&&dfine.runtime.wasm.dtype==='fp32','D-FINE-N size/source integrity metadata or WASM fp32 path changed');
const dfineLive=metadataWindow.VisionRuntimeRegistry.liveMeta(dfine);
check(dfine.capabilities.timeMachine&&!dfine.capabilities.benchmark&&dfineLive?.order===60&&!dfine.capabilities.race&&!dfine.capabilities.inspection,'D-FINE-N must remain Time Machine + Live Camera only');
check(files.historicalDetectors.includes("runtimes.register('lwdetr'")&&files.historicalDetectors.includes("runtimes.register('dfine'")&&files.historicalDetectors.includes("model.modelId,{device:'wasm',dtype:'fp32',revision:model.revision"),'D-FINE-N and LW-DETR adapters must use their pinned runtime paths');
check(files.historicalDetectors.includes("const keepLiveKey=event.detail?.tab==='live-camera'?api.getLiveModel?.()||'':''")&&files.historicalDetectors.includes('releaseHistoricalRuntimes(keepLiveKey)'),'Live Camera must preserve its selected historical-detector runtime while releasing the others');
check(files.historicalDetectors.includes("runtimes.register('ssd2016'")&&files.historicalDetectors.includes("runtimes.register('detr'")&&files.historicalDetectors.includes("executionProviders:['wasm']")&&files.historicalDetectors.includes("subtle.digest('SHA-256'"),'historical model adapters must register SSD, use WASM, and checksum SSD weights');
check((files.index.match(/id="image-file"/g)||[]).length===1,'Time Machine must keep one shared image input');
check(!files.index.includes('data-tab="classical-cv"')&&!files.index.includes('id="classical-cv"'),'separate Classical CV tab/panel must not return');
for(const id of ['history-experiment-panel','history-experiment-title','history-experiment-description','history-experiment-note','history-runtime-state','history-input-size','history-output-count','history-preprocess','history-inference','history-load','history-classification','history-classification-results','history-run','history-release','history-status'])check(files.index.includes('id="'+id+'"'),'historical experiment DOM contract missing: '+id);
check(files.index.includes('id="image-canvas"')&&files.historyExperiments.includes("getContext('2d')"),'historical experiments must render on the shared Time Machine canvas');
check(files.app.includes("new CustomEvent('vision:tabchange'"),'generic tab lifecycle event missing');
check(files.historyExperiments.includes("document.addEventListener('vision:tabchange'")&&files.historyExperiments.includes("event.detail?.tab!=='time-machine'"),'historical runtimes must release after leaving Time Machine');
check(files.historyExperiments.includes("window.addEventListener('pagehide'")&&files.historyExperiments.includes("state.worker.terminate()"),'historical worker page-exit cleanup missing');
const historySelectStart=files.app.indexOf('function selectHistoryExperiment('),historySelectEnd=files.app.indexOf('function updateScrollCue(',historySelectStart),historySelectBody=files.app.slice(historySelectStart,historySelectEnd);
check(historySelectStart>=0&&historySelectEnd>historySelectStart&&!historySelectBody.includes('state.activeModel='),'historical timeline selection must not change the active AI model');
check(historySelectBody.includes('resetRunMetrics()')&&historySelectBody.includes('resetStartupMetrics()')&&historySelectBody.includes("$('active-model-title').textContent=spec.year+' · '+spec.title")&&historySelectBody.includes('updateInsideModelUI(state.activeModel,null,state.image)'),'historical experiment selection must clear stale AI measurements while preserving Inside the Model selection');
const uploadedStart=files.app.indexOf('async function runUploaded()'),uploadedEnd=files.app.indexOf('function percentile(',uploadedStart),uploadedBody=files.app.slice(uploadedStart,uploadedEnd);
check(uploadedStart>=0&&uploadedEnd>uploadedStart&&uploadedBody.includes('await state.historyTransition')&&uploadedBody.includes('VisionHistoryExperiments.run(state.historyExperiment,state.image)')&&uploadedBody.includes('Historical experiment complete'),'the selected historical experiment must run through the shared Time Machine image flow');
check(files.app.includes("state.historyExperiment='';")&&files.app.includes('VisionHistoryExperiments?.clear?.()'),'switching back to an AI model must clear historical result state');
check(files.app.includes('if(!state.historyExperiment)redrawUploaded()'),'AI confidence slider must not redraw historical outputs');
check(files.app.includes('state.historyExperiment) return'),'AI benchmark must not route historical methods into Model Race');
check(files.historyExperiments.includes('await runtimes.releaseAll()'),'historical runtime must release AI adapters before its own execution');
check(!files.historyExperiments.includes('adapter.run'),'historical experiment module must not construct a fake AI reference comparison');
check(files.historyExperiments.includes('DIGIT_SCORE_FLOOR=.70'),'digit display-score floor changed');
check(files.historyExperiments.includes("spec.runner==='alexnet-image-classification'")&&files.historyExperiments.includes("executionProviders:['wasm']")&&files.historyExperiments.includes("session.inputNames[0]!=='data_0'||session.outputNames[0]!=='prob_1'"),'AlexNet must use its pinned ONNX contract with WASM and validate graph I/O');
check(files.historyExperiments.includes("tensor[i]=rgba[offset+2]-mean[0]")&&files.historyExperiments.includes("tensor[plane*2+i]=rgba[offset]-mean[2]")&&files.historyExperiments.includes('[1,3,224,224]'),'AlexNet preprocessing must match the pinned 224×224 BGR NCHW contract');
check(files.historyExperiments.includes("subtle.digest('SHA-256',buffer)")&&files.historyExperiments.includes('model.bytes'),'AlexNet weights must be size- and checksum-verified before session creation');
check(files.historyExperiments.includes("labels.length!==1000")&&files.historyExperiments.includes('labelsSha256')&&files.historyExperiments.includes('.slice(0,5)'),'AlexNet must verify 1,000 labels and display top five classes');
check(files.historyExperiments.includes('releaseAlexNetSession()')&&files.historyExperiments.includes('state.alexnetAbort.abort()'),'AlexNet browser memory and in-flight download cleanup missing');
check(files.historyExperiments.includes("score '+Math.round(item.score*100)+'%'"),'digit output must identify its raw model score separately from AI confidence');
check(files.historyExperiments.includes('model.sha256')&&files.historyExperiments.includes("subtle.digest('SHA-256',buffer)"),'MNIST ONNX model must be checksum-verified before session creation');
check(files.historyExperiments.includes('model.bytes&&buffer.byteLength!==model.bytes'),'MNIST ONNX model must match its pinned file size before session creation');
check(files.historyExperiments.includes("executionProviders:['wasm']"),'MNIST ONNX session must use the standard WASM provider');
check(files.historyExperiments.includes('side=28')&&files.historyExperiments.includes('new Float32Array(side*side)')&&files.historyExperiments.includes('[1,1,28,28]'),'MNIST tensor must be grayscale float 28×28 NCHW');
check(files.historyExperiments.includes('isolated handwritten digits only')&&files.historyExperiments.includes('arbitrary text')&&historyExperiments['mnist-digits'].note.includes('not calibrated confidence'),'digit task limitation and no-result explanation must be explicit');
const digitStart=files.historyExperiments.indexOf('async function runDigits('),experimentStart=files.historyExperiments.indexOf('async function runExperiment('),digitBody=files.historyExperiments.slice(digitStart,experimentStart);
check(digitStart>=0&&digitBody.indexOf("runWorker('digits'")>=0&&digitBody.indexOf("runWorker('digits'")<digitBody.indexOf('disposeWorker(')&&digitBody.indexOf('disposeWorker(')<digitBody.indexOf('loadDigitSession(spec)'),'digit region proposals must finish and release OpenCV before loading MNIST');
check(files.historyExperiments.includes('function patternResponse(')&&files.historyExperiments.includes('max-pooling')&&historyExperiments.neocognitron.note.includes('not a trained Neocognitron checkpoint'),'1980 experiment must be a disclosed code preview without invented weights');
check(historyExperiments.neocognitron.runner==='pattern-response'&&historyExperiments['mnist-digits'].runner==='mnist-digit-cnn'&&historyExperiments['viola-jones'].runner==='opencv-face'&&historyExperiments['hog-pedestrians'].runner==='opencv-hog'&&files.historyExperiments.includes("spec.runner==='pattern-response'")&&files.historyExperiments.includes("spec.runner==='mnist-digit-cnn'"),'historical runner adapters must dispatch through task metadata');
check(files.historyExperiments.includes('src/history/classical-cv-worker.js?v=')&&files.historyExperiments.includes('VERSION=registry.version'),'worker cache version must match release metadata');
check(!files.index.includes('cdn.jsdelivr.net/npm/@techstark/opencv-js')&&!/<script[^>]+src=["'][^"']*opencv(?:\.min)?\.js/i.test(files.index),'OpenCV.js must remain lazy and worker-only');
check(!/<script[^>]+src=["'][^"']*classical-cv-worker\.js/i.test(files.index),'OpenCV worker must not be loaded as a page script');
check(files.classicalWorker.includes("@techstark/opencv-js@4.12.0-release.1/dist/opencv.js"),'OpenCV.js runtime pin changed');
check(files.classicalWorker.includes("49486f61fb25722cbcf586b7f4320921d46fb38e/data/haarcascades/haarcascade_frontalface_default.xml"),'frontal-face cascade commit pin changed');
check(files.classicalWorker.includes("new cv.CascadeClassifier()")&&files.classicalWorker.includes('classifier.detectMultiScale'),'frontal-face cascade execution missing');
check(files.classicalWorker.includes("new cv.HOGDescriptor()")&&files.classicalWorker.includes("cv.HOGDescriptor.getDefaultPeopleDetector()")&&files.classicalWorker.includes('hog.setSVMDetector(detectorMat)')&&files.classicalWorker.includes('hog.detectMultiScale'),'HOG + SVM detector execution missing');
check(files.classicalWorker.includes('findContours')&&files.classicalWorker.includes('cv.RETR_EXTERNAL')&&files.classicalWorker.includes('runDigitCandidates')&&files.classicalWorker.includes('boxes'),'OpenCV digit region proposal operation missing');
check(files.classicalWorker.includes("new cv.Mat(detectorSize,1,cv.CV_32FC1)")&&files.classicalWorker.includes("detectorMat.data32F[index]=detector.get(index)")&&files.classicalWorker.includes("safeDelete(detectorMat)"),'OpenCV FloatVector detector must be copied to and cleaned up as CV_32FC1 Mat');
check(files.classicalWorker.includes("const detectorSize=detector.size()")&&files.classicalWorker.includes("if(!Number.isInteger(detectorSize)||detectorSize<1)"),'OpenCV HOG detector coefficients must be validated through their FloatVector size');
check(files.classicalWorker.includes("cv.FS_createDataFile"),'cascade virtual-filesystem installation missing');
check(files.classicalWorker.includes('finally{')&&files.classicalWorker.includes('safeDelete(weights)')&&files.classicalWorker.includes('safeDelete(detectorMat)'),'OpenCV.js explicit cleanup contract missing');
check(files.historyExperiments.includes('disposeWorker()')&&files.historyExperiments.includes('state.worker.terminate()'),'historical OpenCV worker cleanup missing');
check(!files.index.includes('Classical CV vs AI')&&!files.index.includes('classical-face-canvas'),'obsolete separate comparison UI must remain removed');


check(files.index.includes('id="race-results"')&&files.index.includes('id="race-benchmark-body"')&&files.index.includes('id="race-diff-grid"')&&files.index.includes('id="race-architecture"'),'dynamic Model Race containers missing');
check(!files.index.includes('id="race-tiny-canvas"')&&!files.index.includes('id="rb-tiny-backend"')&&!files.index.includes('id="race-match-tiny-ssd"'),'static four-model Model Race markup returned');
check(files.race.includes('function renderRaceScaffold()')&&files.race.includes("runtimeRegistry.list({capability:'race',group:'general-object'})"),'Model Race scaffold is not registry-driven');
check(files.race.includes('for(let i=0;i<specs.length;i++)for(let j=i+1;j<specs.length;j++)'),'pairwise overlap is not generated from the runtime model set');
check(!files.race.includes('state.lastRun.tiny')&&!files.race.includes('state.lastRun.yolo')&&!files.race.includes("for(const k of['tiny','ssd','yolo','rt'])"),'four-model result aliases returned');
check(files.race.includes('await releaseRaceRuntimes();')&&files.race.includes('finally{await spec.release();'),'normal Model Race is not sequentially releasing adapters');

check(files.index.includes('id="race-diagnostics" hidden'),'diagnostic UI parent must be hidden by default');
check(files.index.includes('id="race-blackbox-tools" hidden'),'black-box tools must be hidden independently of diagnostic status');
check(files.styles.includes('[hidden]{display:none!important}'),'cross-browser hidden guard missing');
check(files.race.includes("if(diagnostics)diagnostics.hidden=false"),'diagnostic mode does not reveal its status parent');
check(files.race.includes("tools.hidden=false"),'black-box mode does not explicitly reveal black-box tools');
check(files.race.includes("DIAGNOSTIC_BASELINE_KEYS=Object.freeze(['tinyyolo','ssd','yolox','rtdetr'])"),'historical reclamation matrix scope is not pinned');
check(!files.index.includes('race-diag-copy-row" hidden style="')&&!files.index.includes('race-diag-copy-row" style="'),'diagnostic copy row must not override hidden layout inline');

check(files.app.includes("RuntimeRegistry.register('ssd'"),'SSD adapter is not registered');
for(const key of ['tinyyolo','yolox','rtdetr'])check(files.race.includes(`runtimeRegistry.register('${key}'`),`${key} adapter is not registered`);
check(files.race.includes("runtimeRegistry.register('rtdetrv2',createRtResearchAdapter('rtdetrv2'))"),'RT-DETRv2 research adapter is not registered');
check(!files.app.includes("if(model==='ssd')return inferSource"),'Time Machine still bypasses the runtime adapter for SSD');
check(!files.app.includes("['tinyyolo','ssd','yolox','rtdetr'].includes(key)"),'Time Machine selection still hard-codes runnable model keys');
check(files.race.includes('runs=20'),'Model Race measured-run count changed');
check(files.app.includes('const RUNS=20'),'Time Machine measured-run count changed');
check(!files.app.includes('threshold: currentUiThreshold')&&!files.race.includes('threshold: currentUiThreshold'),'UI threshold leaked into retained inference contract');

function walk(dir){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const rel=path.relative(root,path.join(dir,entry.name));
    return entry.isDirectory()?walk(path.join(dir,entry.name)):[rel];
  });
}
const markdown=walk(root).filter(file=>file.endsWith('.md')&&!file.startsWith('.git/'));
const broken=[];
for(const file of markdown){
  const text=read(file);
  for(const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
    let target=match[1].trim();
    if(!target||/^(https?:|mailto:|#)/i.test(target))continue;
    target=target.split('#')[0].split('?')[0];
    if(!target)continue;
    const resolved=path.normalize(path.join(path.dirname(file),target));
    if(!exists(resolved))broken.push(`${file} -> ${target}`);
  }
}
check(broken.length===0,`broken local markdown links: ${broken.join(' | ')}`);

console.log(`validate: PASS · ${files.version.version} · ${timeMachineModels.length} AI Time Machine models · ${Object.keys(historyExperiments).length} historical experiments · ${liveKeys.length} live models · ${raceModels.length} race models · shared-image UI`);
