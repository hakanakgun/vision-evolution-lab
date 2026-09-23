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
  models:read('models.js'),
  runtime:read('model-runtime.js'),
  loader:read('model-loader.js'),
  app:read('app.js'),
  race:read('race.js'),
  classical:read('classical-cv.js'),
  classicalWorker:read('classical-cv-worker.js'),
  history:read('docs/MODEL_HISTORY.md'),
  catalog:read('MODEL_CATALOG.md'),
  readme:read('README.md'),
  docsIndex:read('docs/README.md'),
  version:JSON.parse(read('version.json'))
};

for(const [name,code] of Object.entries({bootstrap:files.bootstrap,models:files.models,runtime:files.runtime,loader:files.loader,app:files.app,race:files.race,classical:files.classical,classicalWorker:files.classicalWorker})){
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
  ...files.classical.matchAll(/\$\('([^']+)'\)/g)
].map(match=>match[1]))];
const missingIds=literalRefs.filter(id=>!idSet.has(id)&&!generatedIds.has(id));
check(missingIds.length===0,`missing DOM ids: ${missingIds.join(', ')}`);

const {version,build}=files.version;
check(files.index.includes(`data-build="${build}"`),'index data-build does not match version.json');
check(files.index.includes(`const CURRENT_BUILD = '${build}'`),'CURRENT_BUILD does not match version.json');
for(const asset of ['styles.css','runtime-bootstrap.js','models.js','model-runtime.js','model-loader.js','app.js','race.js','classical-cv.js']){
  check(files.index.includes(`${asset}?v=${version}`),`cache-busted asset missing or stale: ${asset}`);
}
const scriptOrder=['runtime-bootstrap.js','models.js','model-runtime.js','model-loader.js','app.js','race.js','classical-cv.js'];
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
check(metadataRegistry.defaults?.timeMachine&&expectedTimeMachineKeys.includes(metadataRegistry.defaults.timeMachine),'default Time Machine model invalid');
check(files.index.includes('id="timeline-track"')&&files.index.includes('id="preprocess-table"'),'dynamic Time Machine/inspection containers missing');
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
check(JSON.stringify(liveKeys)==='["ssd"]','current Live Camera scope must remain SSD-only');
check(metadataRegistry.defaults?.live==='ssd','default Live Camera model must remain SSD');
check(files.index.includes('id="live-model-name"')&&files.index.includes('id="live-model-controls"'),'Live Camera metadata/selector containers missing');
check(files.app.includes("RuntimeRegistry.list({capability:'live'})")&&files.app.includes('adapter.run(video,canvas,{updateMain:false,live:true})'),'Live Camera is not runtime-adapter driven');
check(files.app.includes('prepare:()=>createSession()'),'SSD live adapter does not preserve pre-camera runtime preparation');
check(!files.app.includes('inferSource(video,canvas,{updateMain:false})'),'Live Camera still directly calls SSD inference');
check(files.app.includes('refreshLiveModels:renderLiveModels')&&files.race.includes('api.refreshLiveModels?.()'),'Live Camera registry refresh contract missing');
for(const item of timeMachineModels){
  if(item.inspection===false)continue;
  check(item.inspection&&item.inspection.preview&&item.inspection.pipeline&&item.inspection.comparison&&item.inspection.intermediate,`${item.key}: inspection presentation contract incomplete`);
}

const classicalTimeline=(metadataRegistry.timeline||[]).filter(entry=>entry.jump==='classical-cv');
check(classicalTimeline.length===2&&classicalTimeline.some(entry=>entry.year===2001&&entry.title==='Viola–Jones')&&classicalTimeline.some(entry=>entry.year===2005&&entry.title==='HOG + SVM'),'classical timeline links missing or changed');
check(classicalTimeline.every(entry=>!entry.model),'classical methods must not become Time Machine model keys');
const historicalMilestones=(metadataRegistry.timeline||[]).filter(entry=>entry.kind==='historical');
const expectedHistoricalMilestones=[[1980,'Neocognitron'],[1998,'LeNet-5'],[2012,'AlexNet'],[2014,'R-CNN'],[2015,'Faster R-CNN'],[2016,'YOLOv1'],[2016,'SSD'],[2020,'DETR']];
check(historicalMilestones.length===expectedHistoricalMilestones.length,'history-only timeline milestone count changed');
for(const [year,title] of expectedHistoricalMilestones)check(historicalMilestones.some(entry=>entry.year===year&&entry.title===title),`history-only milestone missing: ${year} ${title}`);
check(historicalMilestones.every(entry=>!entry.model&&!entry.jump&&entry.note?.startsWith('history only ·')),'history-only milestones must not select or load a runtime');
check((metadataRegistry.timeline||[]).every((entry,index,entries)=>index===0||entries[index-1].year<=entry.year),'Time Machine timeline must remain chronologically sorted');
check(files.app.includes("entry.kind==='historical'?'historical-only':''")&&files.styles.includes('.milestone.historical-only .dot'),'history-only milestones must have a distinct non-runnable timeline treatment');
check(files.index.includes('History-only milestones show their original task')&&files.index.includes('do not load or benchmark a model'),'Time Machine must explain the history-only task boundary');
check(files.catalog.includes('| 1980 | Neocognitron | History only |')&&files.catalog.includes('| 2016 | YOLOv1 | History only |')&&files.catalog.includes('| 2020 | DETR | History only |'),'model catalog must distinguish historical-only entries');
check(files.readme.includes('history-only milestones')&&files.docsIndex.includes('[Historical model milestones](MODEL_HISTORY.md)'),'README/docs map must explain and link to historical milestones');
for(const source of ['https://doi.org/10.1007/BF00344251','https://yann.lecun.com/exdb/publis/pdf/lecun-01a.pdf','https://papers.nips.cc/paper_files/paper/2012/hash/c399862d3b9d6b76c8436e924a68c45b-Abstract.html','https://openaccess.thecvf.com/content_cvpr_2014/html/Girshick_Rich_Feature_Hierarchies_2014_CVPR_paper.html','https://proceedings.neurips.cc/paper/2015/hash/14bfa6bb14875e45bba028a21ed38046-Abstract.html','https://openaccess.thecvf.com/content_cvpr_2016/html/Redmon_You_Only_Look_CVPR_2016_paper.html'])check(files.history.includes(source),`historical primary-paper source missing: ${source}`);
check(metadataWindow.VisionRuntimeRegistry.modelKeys.length===4,'classical methods must not enter the general runtime/model registry');
check(timeMachineModels.length===4,'classical methods must not enter the Time Machine model set');
check(files.index.includes('data-tab="classical-cv"')&&files.index.includes('id="classical-cv"'),'Classical CV tab/panel missing');
for(const id of ['classical-image-file','classical-use-current','classical-run','classical-release','classical-status','classical-face-canvas','classical-hog-canvas','classical-ai-canvas','classical-person-overlap','classical-runtime-state'])check(files.index.includes(`id="${id}"`),`Classical CV DOM contract missing: ${id}`);
check(files.app.includes("new CustomEvent('vision:tabchange'"),'generic tab lifecycle event missing');
check(files.classical.includes("document.addEventListener('vision:tabchange'")&&files.classical.includes("if(tab!=='classical-cv'&&state.worker)disposeWorker"),'Classical CV worker is not released on tab leave');
check(files.classical.includes("window.addEventListener('pagehide'")&&files.classical.includes("state.worker.terminate()"),'Classical CV worker page-exit cleanup missing');
check(files.classical.includes('await runtimes.releaseAll()')&&files.classical.includes('finally{await adapter.release()}'),'AI reference runtime ownership/release contract missing');
const classicalRunStart=files.classical.indexOf('async function runComparison()'),classicalRunEnd=files.classical.indexOf("$('classical-image-file').addEventListener",classicalRunStart),classicalRunBody=files.classical.slice(classicalRunStart,classicalRunEnd);
check(classicalRunStart>=0&&classicalRunBody.indexOf('await runAi(source)')>=0&&classicalRunBody.indexOf('await runAi(source)')<classicalRunBody.indexOf('await ensureWorker()'),'AI reference must run and release before OpenCV worker initialization');
check(files.classical.includes("adapter.run(source,$('classical-ai-canvas'),{updateMain:false})"),'Classical AI reference must use the active runtime adapter outside benchmark semantics');
check(files.classical.includes("bestIou=.35"),'HOG/AI person overlap IoU threshold changed');
check(files.classical.includes("d.label==='person'&&d.score>=confidence()"),'HOG/AI overlap must use retained AI person detections at current UI confidence');
check(files.classical.includes("WORK_MAX=640"),'Classical CV browser working-image cap changed');
check(files.classical.includes("classical-cv-worker.js?v=${VERSION}")&&files.classical.includes("VERSION='0.8.3'"),'Classical CV worker cache/version pin missing');
check(!files.index.includes('cdn.jsdelivr.net/npm/@techstark/opencv-js')&&!/<script[^>]+src=["'][^"']*opencv(?:\.min)?\.js/i.test(files.index),'OpenCV.js must remain lazy and worker-only');
check(!/<script[^>]+src=["'][^"']*classical-cv-worker\.js/i.test(files.index),'Classical CV worker must not be loaded as a page script');
check(files.classicalWorker.includes("@techstark/opencv-js@4.12.0-release.1/dist/opencv.js"),'OpenCV.js runtime pin changed');
check(files.classicalWorker.includes("49486f61fb25722cbcf586b7f4320921d46fb38e/data/haarcascades/haarcascade_frontalface_default.xml"),'frontal-face cascade commit pin changed');
check(files.classicalWorker.includes("new cv.CascadeClassifier()")&&files.classicalWorker.includes("classifier.detectMultiScale"),'frontal-face cascade execution missing');
check(files.classicalWorker.includes("new cv.HOGDescriptor()")&&files.classicalWorker.includes("cv.HOGDescriptor.getDefaultPeopleDetector()")&&files.classicalWorker.includes("hog.setSVMDetector(detectorMat)")&&files.classicalWorker.includes("new cv.DoubleVector()")&&files.classicalWorker.includes("hog.detectMultiScale(rgb,rects,weights,0,"),'HOG + SVM detector execution missing');
check(files.classicalWorker.includes("new cv.Mat(detectorSize,1,cv.CV_32FC1)")&&files.classicalWorker.includes("detectorMat.data32F[index]=detector.get(index)")&&files.classicalWorker.includes("safeDelete(detectorMat)"),'OpenCV FloatVector detector must be copied to and cleaned up as CV_32FC1 Mat');
check(files.classicalWorker.includes("const detectorSize=detector.size()")&&files.classicalWorker.includes("if(!Number.isInteger(detectorSize)||detectorSize<1)"),'OpenCV HOG detector coefficients must be validated through their FloatVector size');
check(files.classicalWorker.includes("cv.FS_createDataFile"),'cascade virtual-filesystem installation missing');
check(files.classicalWorker.includes("finally{")&&files.classicalWorker.includes("safeDelete(weights)")&&files.classicalWorker.includes("safeDelete(detectorMat)"),'OpenCV.js explicit cleanup contract missing');
check(files.classical.includes("disposeWorker('after leaving Classical CV')"),'Classical worker lifecycle label missing');

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

console.log(`validate: PASS · ${files.version.version} · ${timeMachineModels.length} Time Machine models · ${liveKeys.length} live models · ${raceModels.length} race models · Classical CV worker · dynamic UI`);
