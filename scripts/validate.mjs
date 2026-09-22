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

const inlineScripts=[...files.index.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]);
for(const [index,code] of inlineScripts.entries()){
  try{new Function(code)}catch(error){fail(`index inline script #${index+1}: ${error.message}`)}
}

const ids=[...files.index.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
const duplicateIds=[...new Set(ids.filter((id,index,list)=>list.indexOf(id)!==index))];
check(duplicateIds.length===0,`duplicate DOM ids: ${duplicateIds.join(', ')}`);

const idSet=new Set(ids);
const staticRefs=[...new Set([
  ...files.app.matchAll(/\$\('([^']+)'\)/g),
  ...files.race.matchAll(/\$\('([^']+)'\)/g)
].map(match=>match[1]))];
const missingIds=staticRefs.filter(id=>!idSet.has(id));
check(missingIds.length===0,`missing static DOM ids: ${missingIds.join(', ')}`);

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

function loadModelContracts(ortMode='standard-wasm'){
  const window={VisionRuntimeBootstrap:{ortVersion:'1.30.0',ortMode,ortEntrypoint:ortMode==='jsep'?'ort.webgpu.min.js':'ort.wasm.min.js',isIOS:ortMode!=='jsep',reason:'validation'}};
  const context={window,Object,Map,Set,Number,Boolean,Array,Error};
  vm.runInNewContext(files.models,context,{filename:'models.js'});
  vm.runInNewContext(files.runtime,context,{filename:'model-runtime.js'});
  return window;
}

for(const mode of ['standard-wasm','jsep']){
  const window=loadModelContracts(mode),registry=window.VisionModels,runtimes=window.VisionRuntimeRegistry;
  check(registry&&runtimes,'model/runtime registry failed to initialize');
  const runnable=runtimes.modelKeys;
  check(runnable.length>0,'no runnable models declared');
  for(const key of runnable){
    const model=registry[key],cap=model.capabilities;
    check(cap&&cap.timeMachine===true,`${key}: timeMachine capability missing`);
    check(typeof cap.benchmark==='boolean',`${key}: benchmark capability missing`);
    check(typeof cap.live==='boolean',`${key}: live capability missing`);
    check(cap.inspection&&typeof cap.inspection.mode==='string',`${key}: inspection capability missing`);
    if(runtimes.capabilityEnabled(model,'race')){
      const race=runtimes.raceMeta(model);
      check(race&&race.group&&Number.isFinite(race.order)&&race.prefix&&race.workCanvasId&&race.timingBoundary,`${key}: race metadata incomplete`);
    }
    runtimes.register(key,{run:async()=>({}),release:async()=>{},backend:()=>''});
  }
  check(runtimes.assertRegistered({capability:'race',group:'general-object'})===true,`${mode}: race adapters failed contract validation`);
  const orders=runtimes.list({capability:'race',group:'general-object'}).map(adapter=>adapter.model.capabilities.race.order);
  check(orders.every((value,index)=>index===0||orders[index-1]<=value),`${mode}: race order is not deterministic`);
}
const standard=loadModelContracts('standard-wasm').VisionModels;
const jsep=loadModelContracts('jsep').VisionModels;
check(JSON.stringify(standard.yolox.executionProviders)==='["wasm"]','standard-WASM YOLOX providers regressed');
check(JSON.stringify(jsep.yolox.executionProviders)==='["webgpu","wasm"]','JSEP YOLOX providers regressed');

function simulateBootstrap({ua,platform,maxTouchPoints,search=''}) {
  const writes=[],window={};
  const context={
    window,
    navigator:{userAgent:ua,platform,maxTouchPoints},
    location:{search},
    document:{write:value=>writes.push(value)},
    URLSearchParams
  };
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

check(files.app.includes("RuntimeRegistry.register('ssd'"),'SSD adapter is not registered');
for(const key of ['tinyyolo','yolox','rtdetr'])check(files.race.includes(`runtimeRegistry.register('${key}'`),`${key} adapter is not registered`);
check(files.race.includes("runtimeRegistry.list({capability:'race',group:'general-object'})"),'Model Race is not registry-driven');
check(!files.app.includes("if(model==='ssd')return inferSource"),'Time Machine still bypasses the runtime adapter for SSD');
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

console.log(`validate: PASS · ${files.version.version} · ${windowSummary()}`);

function windowSummary(){
  const window=loadModelContracts('standard-wasm');
  return `${window.VisionRuntimeRegistry.modelKeys.length} runnable model contracts`;
}
