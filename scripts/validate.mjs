import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const fail=message=>{throw new Error(message)};
const check=(condition,message)=>{if(!condition)fail(message)};

const files={
  index:read('index.html'),
  styles:read('styles.css'),
  bootstrap:read('runtime-bootstrap.js'),
  preprocessing:read('preprocessing.js'),
  metrics:read('detection-metrics.js'),
  models:read('models.js'),
  runtime:read('model-runtime.js'),
  loader:read('model-loader.js'),
  app:read('app.js'),
  race:read('race.js'),
  historyExperiments:read('history-experiments.js'),
  classicalWorker:read('classical-cv-worker.js'),
  history:read('docs/MODEL_HISTORY.md'),
  historicalDocs:read('docs/CLASSICAL_CV.md'),
  architecture:read('docs/ARCHITECTURE.md'),
  methodology:read('BENCHMARK_METHODOLOGY.md'),
  sources:read('MODEL_SOURCES.md'),
  licenses:read('THIRD_PARTY_LICENSES.md'),
  catalog:read('MODEL_CATALOG.md'),
  readme:read('README.md'),
  docsIndex:read('docs/README.md'),
  version:JSON.parse(read('version.json'))
};

for(const [name,code] of Object.entries({bootstrap:files.bootstrap,preprocessing:files.preprocessing,metrics:files.metrics,models:files.models,runtime:files.runtime,loader:files.loader,app:files.app,race:files.race,historyExperiments:files.historyExperiments,classicalWorker:files.classicalWorker})){
  try{new Function(code)}catch(error){fail(`${name}.js syntax: ${error.message}`)}
}
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
  ...files.race.matchAll(/\$\('([^']+)'\)/g),
  ...files.historyExperiments.matchAll(/\$\('([^']+)'\)/g)
].map(match=>match[1]))];
const missingIds=literalRefs.filter(id=>!idSet.has(id)&&!generatedIds.has(id));
check(missingIds.length===0,`missing DOM ids: ${missingIds.join(', ')}`);

const {version,build}=files.version;
check(files.index.includes(`data-build="${build}"`),'index data-build does not match version.json');
check(files.index.includes(`const CURRENT_BUILD = '${build}'`),'CURRENT_BUILD does not match version.json');
for(const asset of ['styles.css','runtime-bootstrap.js','preprocessing.js','detection-metrics.js','models.js','model-runtime.js','model-loader.js','app.js','race.js','history-experiments.js']){
  check(files.index.includes(`${asset}?v=${version}`),`cache-busted asset missing or stale: ${asset}`);
}
const scriptOrder=['runtime-bootstrap.js','preprocessing.js','models.js','detection-metrics.js','model-runtime.js','model-loader.js','app.js','race.js','history-experiments.js'];
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
check(JSON.stringify(liveKeys)==='["tinyyolo","ssd","yolox","rtdetr","rtdetrv2"]','all runnable Time Machine detectors must be eligible for Live Camera');
check(metadataRegistry.defaults?.live===metadataRegistry.defaults?.timeMachine,'default Live Camera model must follow the Time Machine default');
check(files.index.includes('id="live-model-name"')&&files.index.includes('id="live-model-controls"'),'Live Camera metadata/selector containers missing');
check(files.app.includes("RuntimeRegistry.list({capability:'live'})")&&files.app.includes('adapter.run(video,canvas,{updateMain:false,live:true})'),'Live Camera is not runtime-adapter driven');
check(files.app.includes('function currentLiveAdapter(){return RuntimeRegistry.get(state.activeModel)}'),'Live Camera must use the active Time Machine model');
check(files.app.includes('selectActiveModel(key,{scroll:false})'),'Live Camera model choices must update Time Machine selection');
check(files.app.includes('state.cameraStartToken++')&&files.app.includes('token!==state.cameraStartToken'),'Live Camera start must cancel when Time Machine selection changes');
check(files.app.includes('prepare:()=>createSession()'),'SSD live adapter does not preserve pre-camera runtime preparation');
for(const [key,needle] of [['tinyyolo','prepare:()=>createTinySession()'],['yolox','prepare:()=>createYoloSession()'],['rtdetr','prepare:()=>createRT()'],['rtdetrv2','prepare:()=>create()']])check(files.race.includes(needle),`${key}: Live Camera adapter does not prepare its runtime before camera access`);
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
  [2005,'hog-pedestrians','HOG + SVM']
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
const historicalMilestones=(metadataRegistry.timeline||[]).filter(entry=>entry.kind==='historical');
const expectedHistoricalMilestones=[[2012,'AlexNet'],[2014,'R-CNN'],[2015,'Faster R-CNN'],[2016,'YOLOv1'],[2016,'SSD'],[2020,'DETR']];
check(historicalMilestones.length===expectedHistoricalMilestones.length,'paper-only timeline milestone count changed');
for(const [year,title] of expectedHistoricalMilestones)check(historicalMilestones.some(entry=>entry.year===year&&entry.title===title),'paper-only milestone missing: '+year+' '+title);
check(historicalMilestones.every(entry=>!entry.model&&!entry.jump&&entry.note?.startsWith('history only ·')),'paper-only milestones must not select or load a runtime');
check((metadataRegistry.timeline||[]).every((entry,index,entries)=>index===0||entries[index-1].year<=entry.year),'Time Machine timeline must remain chronologically sorted');
check(files.app.includes("entry.kind==='historical'?'historical-only':''")&&files.styles.includes('.milestone.historical-only .dot'),'paper-only milestones must keep a distinct timeline treatment');
check(files.app.includes('entry.experiment===state.historyExperiment')&&files.app.includes('data-history-experiment')&&files.app.includes('runnable&&!state.historyExperiment&&entry.model===state.activeModel'),'selected experiment timeline state is missing or also highlights a stale AI year');
check(files.index.includes('Historical experiment · same image')&&historyExperiments['mnist-digits'].note.includes('isolated handwritten digits'),'Time Machine must explain shared-image and digit-task scope');
check(files.catalog.includes('| 1980 | Neocognitron-inspired feature response | Runnable historical experiment |')&&files.catalog.includes('| 1998 | LeNet-era MNIST CNN reference | Runnable historical experiment |')&&files.catalog.includes('| 2001 | Viola–Jones method family / OpenCV frontal-face cascade | Runnable historical experiment |')&&files.catalog.includes('| 2005 | HOG + linear SVM pedestrian detector | Runnable historical experiment |'),'catalog must distinguish runnable historical experiments');
check(files.readme.includes('one image selected in Time Machine')&&files.docsIndex.includes('[Time Machine historical experiments](CLASSICAL_CV.md)'),'README/docs map must describe and link to same-image history experiments');
for(const source of ['https://doi.org/10.1007/BF00344251','https://yann.lecun.com/exdb/publis/pdf/lecun-01a.pdf','https://doi.org/10.1109/CVPR.2001.990517','https://doi.org/10.1109/CVPR.2005.177','https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html','https://openaccess.thecvf.com/content_cvpr_2014/html/Girshick_Rich_Feature_Hierarchies_2014_CVPR_paper.html','https://proceedings.neurips.cc/paper/2015/hash/14bfa6bb14875e45bba028a21ed38046-Abstract.html','https://openaccess.thecvf.com/content_cvpr_2016/html/Redmon_You_Only_Look_CVPR_2016_paper.html','https://research.google/pubs/ssd-single-shot-multibox-detector/','https://www.ecva.net/papers/eccv_2020/papers_ECCV/html/832_ECCV_2020_paper.php'])check(files.history.includes(source),'historical primary-paper source missing: '+source);
check(metadataWindow.VisionRuntimeRegistry.modelKeys.length===5,'historical methods must not enter the general runtime/model registry');
check(timeMachineModels.length===5,'historical methods must not enter the AI Time Machine model set');
check((files.index.match(/id="image-file"/g)||[]).length===1,'Time Machine must keep one shared image input');
check(!files.index.includes('data-tab="classical-cv"')&&!files.index.includes('id="classical-cv"'),'separate Classical CV tab/panel must not return');
for(const id of ['history-experiment-panel','history-experiment-title','history-experiment-description','history-experiment-note','history-runtime-state','history-input-size','history-output-count','history-preprocess','history-inference','history-load','history-run','history-release','history-status'])check(files.index.includes('id="'+id+'"'),'historical experiment DOM contract missing: '+id);
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
check(files.historyExperiments.includes('classical-cv-worker.js?v=')&&files.historyExperiments.includes('VERSION=registry.version'),'worker cache version must match release metadata');
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
