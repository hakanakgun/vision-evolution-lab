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
  version:JSON.parse(read('version.json'))
};

for(const [name,code] of Object.entries({bootstrap:files.bootstrap,models:files.models,runtime:files.runtime,loader:files.loader,app:files.app,race:files.race})){
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
  ...files.race.matchAll(/\$\('([^']+)'\)/g)
].map(match=>match[1]))];
const missingIds=literalRefs.filter(id=>!idSet.has(id)&&!generatedIds.has(id));
check(missingIds.length===0,`missing DOM ids: ${missingIds.join(', ')}`);

const {version,build}=files.version;
check(files.index.includes(`data-build="${build}"`),'index data-build does not match version.json');
check(files.index.includes(`const CURRENT_BUILD = '${build}'`),'CURRENT_BUILD does not match version.json');
for(const asset of ['styles.css','runtime-bootstrap.js','models.js','model-runtime.js','model-loader.js','app.js','race.js']){
  check(files.index.includes(`${asset}?v=${version}`),`cache-busted asset missing or stale: ${asset}`);
}
const scriptOrder=['runtime-bootstrap.js','models.js','model-runtime.js','model-loader.js','app.js','race.js'];
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
    check(typeof cap.live==='boolean',`${key}: live capability missing`);
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
for(const item of timeMachineModels){
  if(item.inspection===false)continue;
  check(item.inspection&&item.inspection.preview&&item.inspection.pipeline&&item.inspection.comparison&&item.inspection.intermediate,`${item.key}: inspection presentation contract incomplete`);
}

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

console.log(`validate: PASS · ${files.version.version} · ${timeMachineModels.length} Time Machine models · ${raceModels.length} race models · dynamic UI`);
