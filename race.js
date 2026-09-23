(() => {
  'use strict';
  const api=window.VisionLab,registry=window.VisionModels,loader=window.VisionModelLoader,runtimeRegistry=window.VisionRuntimeRegistry,BOOT=window.VisionRuntimeBootstrap||{};
  if(!api||!registry||!loader||!runtimeRegistry||!window.ort)return;
  const $=id=>document.getElementById(id),TINY=registry.tinyyolo,YOLO=registry.yolox,RT=registry.rtdetr,COCO80=registry.labels.coco80,VOC20=registry.labels.voc20,VOC_CANON=registry.labels.vocCanonical;
  const DIAG_MODE=new URLSearchParams(location.search).get('diag')||'',DEEP=DIAG_MODE==='3',DIAG=DIAG_MODE==='1'||DIAG_MODE==='2'||DEEP,BLACKBOX=DIAG_MODE==='2'||DEEP,DIAG_KEY='vel:race-diag-v1',BB_KEY='vel:race-diag-blackbox-v1',BB_DURABLE_KEY='vel:race-diag-durable-v1',BB_JOURNAL_KEY='vel:race-diag-journal-v1',BB_SELECTION_KEY='vel:race-diag-selection-v1',BB_SETTLE_KEY='vel:race-diag-settle-v1',BB_BACKEND_KEY='vel:race-diag-backends-v1',BB_ATTEMPT_KEY='vel:race-diag-attempt-v1',BB_MATRIX_KEY='vel:race-diag-reclaim-matrix-v2',BB_CRITICAL_KEY='vel:race-diag-critical-v1',BB_SEQ_KEY='vel:race-diag-seq-v1',BB_CRASH_KEY='vel:race-diag-crash-v1';
  let bbStage='page-ready',bbPrevious=null,bbEvents=[],bbPlan=[],bbBackendPlan={},bbAttempt=Number(readLocal(BB_ATTEMPT_KEY,0))||0,bbMatrix=readLocal(BB_MATRIX_KEY,null),bbCritical=readLocal(BB_CRITICAL_KEY,null),bbCrash=readLocal(BB_CRASH_KEY,null),bbEventSeq=Number(readLocal(BB_SEQ_KEY,0))||0,bbBenchmarkDoneWall=0,bbLastBeat=performance.now(),bbMaxGap=0,bbLastLifecycle='page-init',bbOrderlyExit=false,bbSettleMs=0,bbCurrentModel='',bbRequestedBackend='',bbLastAlloc={},matrixRunning=false,matrixStopRequested=false;
  const bbResident={},DIAGNOSTIC_BASELINE_KEYS=Object.freeze(['tinyyolo','ssd','yolox','rtdetr']),MATRIX_CASES=[{id:'R1',label:'resident · 0 ms',keepResident:true,delayMs:0},{id:'R2',label:'dispose · 0 ms',keepResident:false,delayMs:0},{id:'R3',label:'dispose · 3000 ms',keepResident:false,delayMs:3000},{id:'R4',label:'dispose · 10000 ms',keepResident:false,delayMs:10000}],MATRIX_ATTEMPTS=10;
  function readLocal(key,fallback=null){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch(_){return fallback}}
  function writeLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}}
  function readDiag(){if(!DIAG)return null;try{return JSON.parse(sessionStorage.getItem(DIAG_KEY)||'null')}catch(_){return null}}
  function showDiag(message){if(!DIAG)return;const el=$('race-diag-status');if(el){el.hidden=false;el.textContent=message}}
  function bbNavigation(){const n=performance.getEntriesByType?.('navigation')?.[0];return{type:n?.type||'unknown',activationStart:Number.isFinite(n?.activationStart)?n.activationStart:null}}
  function bbNavType(){return bbNavigation().type}
  function bbMemory(){const m=performance.memory;return m&&Number.isFinite(m.usedJSHeapSize)?(m.usedJSHeapSize/1048576).toFixed(1)+' MB JS heap':'N/A'}
  function bbWorkCanvases(){const parts=[];for(const spec of getRaceSpecs(null,null,{benchmarking:true})){if(!spec.workCanvasId)continue;const c=$(spec.workCanvasId);if(c)parts.push(`${spec.label} ${c.width}×${c.height}`)}return parts.length?parts.join(' · '):'—'}
  function diagModelLabel(key){return getRaceSpecs(null,null,{benchmarking:true}).find(x=>x.key===key)?.label||key}
  function bbResidentText(value){const entries=Object.entries(value||{});return entries.length?entries.map(([key,on])=>`${diagModelLabel(key)} ${on?'ON':'OFF'}`).join(' · '):'none'}
  function bbBackendPlanText(value){const entries=Object.entries(value||{});return entries.length?entries.map(([key,mode])=>`${diagModelLabel(key)} ${mode}`).join(' · '):'auto'}
  function bbBackendText(){const parts=[];for(const spec of getRaceSpecs(null,null,{benchmarking:true})){const value=String(spec.backend?.()||'').trim();if(value)parts.push(`${spec.label} ${value}`)}return parts.length?parts.join(' · '):'—'}
  function bbMatrixCrash(value){const results=value?.results||{};for(let i=MATRIX_CASES.length-1;i>=0;i--){const c=MATRIX_CASES[i],r=results[c.id];if(r?.status==='abrupt-reload')return{caseId:c.id,attempt:r.attempt,stage:r.stage||'unknown',at:r.at||value?.lastReloadAt||null}}return value===bbMatrix?bbCrash:null}
  function bbMatrixText(value){if(!value)return'idle';if(value.phase==='complete')return'finished · R1–R4';const def=MATRIX_CASES[value.caseIndex]||MATRIX_CASES.find(x=>x.id===value.currentCase),limit=value.attemptsPerCase||MATRIX_ATTEMPTS,crash=bbMatrixCrash(value);if(value.phase==='interrupted'){const next=def?` · next ${def.id} pending`:'';return crash?`interrupted after ${crash.caseId} ${crash.attempt}/${limit}${next}`:`interrupted${next}`}if(value.phase==='ready'&&!(value.currentAttempt>0)&&!(value.completedInCase>0))return def?`ready · ${def.id} pending · ${def.label}`:'ready';if(value.phase==='waiting'&&def){const done=value.completedInCase||0;return`waiting · ${def.id} ${done}/${limit} complete · next ${Math.min(done+1,limit)}/${limit} · ${def.label}`}const attempt=value.currentAttempt||((value.completedInCase||0)+1),suffix=def?`${def.id} ${Math.min(attempt,limit)}/${limit} · ${def.label}`:'done';return`${value.phase||'ready'} · ${suffix}`}
  function bbMatrixResultsText(value){if(!value)return'—';const results=value.results||{};return MATRIX_CASES.map(c=>{const r=results[c.id];if(!r)return`${c.id} pending`;if(r.status==='complete')return`${c.id} 10/10`;if(r.status==='abrupt-reload')return`${c.id} abrupt-reload@${r.attempt}`;return`${c.id} ${r.status||'unknown'}${r.attempt?`@${r.attempt}`:''}`}).join(' · ')}
  function bbSafeMeta(value,depth=0){if(value==null||typeof value==='number'||typeof value==='boolean')return value;if(typeof value==='string')return value.slice(0,600);if(depth>=2)return'[bounded]';if(Array.isArray(value))return value.slice(0,12).map(x=>bbSafeMeta(x,depth+1));const out={};for(const [k,v] of Object.entries(value).slice(0,24))out[k]=bbSafeMeta(v,depth+1);return out}
  function bbJournal(event,extra={},persist=!DEEP){if(!BLACKBOX)return;const matrixCase=bbMatrix?.currentCase||MATRIX_CASES[bbMatrix?.caseIndex]?.id||'',record={seq:++bbEventSeq,at:new Date().toISOString(),perfMs:Number(performance.now().toFixed(1)),event,attempt:bbAttempt,matrixCase,matrixAttempt:bbMatrix?.currentAttempt||0,model:extra.model||bbCurrentModel||'',phase:extra.phase||'',requestedBackend:extra.requestedBackend||bbRequestedBackend||'',actualBackend:extra.actualBackend||'',resident:{...bbResident}},meta=bbSafeMeta(extra);if(Object.keys(meta).length)record.meta=meta;bbEvents=[...bbEvents,record].slice(-(DEEP?200:40));writeLocal(BB_SEQ_KEY,bbEventSeq);if(persist)writeLocal(BB_JOURNAL_KEY,bbEvents)}
  function bbMemoryProxies(){const perf=performance.memory&&Number.isFinite(performance.memory.usedJSHeapSize)?{usedJSHeapBytes:performance.memory.usedJSHeapSize,totalJSHeapBytes:performance.memory.totalJSHeapSize||null,jsHeapSizeLimitBytes:performance.memory.jsHeapSizeLimit||null}:null,source=state.image?sourceDims(state.image):null,canvases=[];for(const spec of getRaceSpecs(null,null,{benchmarking:true})){if(!spec.workCanvasId)continue;const c=$(spec.workCanvasId);if(c)canvases.push({model:spec.key,width:c.width,height:c.height,estimatedRgbaBytes:c.width*c.height*4,estimated:true})}const ssd=api.getBaselineDiagnosticState?.()||null;return{processRss:'N/A',performanceMemory:perf,wasmMemory:'not-exposed-by-current-runtimes',sourceDimensions:source,canvases,rawModelBuffers:{tiny:{present:Boolean(state.tinyBuffer),bytes:state.tinyBuffer?.byteLength||0},ssd:ssd?{present:ssd.rawBufferPresent,bytes:ssd.rawBufferBytes}:null,yolox:{present:Boolean(state.yoloBuffer),bytes:state.yoloBuffer?.byteLength||0},rtdetr:{present:false,bytes:0,managedByTransformersJs:true}},runtimeObjects:{tinySession:Boolean(state.tinySession),ssdSession:ssd?.sessionPresent??null,yoloxSession:Boolean(state.yoloSession),rtPipeline:Boolean(state.rtPipe)},expectedAssetBytes:{tiny:TINY.bytes||null,ssd:registry.ssd.bytes||null,yolox:YOLO.bytes||null,rtdetr:RT.runtime[state.rtBackend]?.modelBytes||null},lastKnownAllocation:bbSafeMeta(bbLastAlloc)}}
  function bbSnapshot(){const nav=bbNavigation();return{stage:bbStage,attempt:bbAttempt,matrix:bbMatrix?{...bbMatrix}:null,heartbeatAt:new Date().toISOString(),secondsSinceBenchmark:bbBenchmarkDoneWall?Math.max(0,(Date.now()-bbBenchmarkDoneWall)/1000):null,maxEventLoopGapMs:Math.round(bbMaxGap),lastLifecycle:bbLastLifecycle,orderlyExit:bbOrderlyExit,navigationType:nav.type,navigationActivationStart:nav.activationStart,documentReadyState:document.readyState,visibilityState:document.visibilityState,plan:[...bbPlan],settleMs:bbSettleMs,backendPlan:{...bbBackendPlan},backends:bbBackendText(),resident:{...bbResident},workCanvases:bbWorkCanvases(),memory:bbMemory(),critical:DEEP?bbCritical:null}}
  function renderCrashBanner(){if(!BLACKBOX)return;const el=$('race-diag-crash');if(!el)return;const crash=bbMatrix?.phase==='interrupted'?bbMatrixCrash(bbMatrix):null;if(!crash){el.hidden=true;el.textContent='';return}const next=MATRIX_CASES[bbMatrix.caseIndex];el.hidden=false;el.textContent=`Abrupt reload detected · Case: ${crash.caseId} · Attempt: ${crash.attempt}/${bbMatrix.attemptsPerCase||MATRIX_ATTEMPTS} · Last durable stage: ${crash.stage||'unknown'}${next?` · Next: ${next.id} pending`:''}`}
  function renderBlackbox(){if(!BLACKBOX)return;const el=$('race-diag-blackbox');if(!el)return;el.hidden=false;const now=bbSnapshot(),prev=bbPrevious,tail=bbEvents.slice(-12).map(x=>x.at.slice(11,19)+'  '+x.event+(x.meta?.durationMs?(' · '+Math.round(x.meta.durationMs)+' ms'):(x.meta?.ms?(' · '+x.meta.ms+' ms'):''))).join('\n'),plan=x=>(x&&x.length?x.map(diagModelLabel).join(' → '):'—');renderCrashBanner();el.textContent=`DIAGNOSTIC BLACK BOX · diag=${DIAG_MODE}
CURRENT
stage: ${now.stage}
attempt: ${now.attempt}
matrix: ${bbMatrixText(now.matrix)}
matrix results: ${bbMatrixResultsText(now.matrix)}
plan: ${plan(now.plan)}
inter-model settle: ${now.settleMs} ms
backend probes: ${bbBackendPlanText(now.backendPlan)}
actual backends: ${now.backends}
heartbeat: ${now.heartbeatAt}
since benchmark: ${now.secondsSinceBenchmark===null?'—':now.secondsSinceBenchmark.toFixed(1)+' s'}
event-loop max gap: ${now.maxEventLoopGapMs} ms
lifecycle: ${now.lastLifecycle} · orderly pagehide: ${now.orderlyExit?'yes':'no'}
navigation: ${now.navigationType}
resident: ${bbResidentText(now.resident)}
work canvases: ${now.workCanvases} · memory: ${now.memory}

PREVIOUS
${prev?`stage: ${prev.stage||'unknown'}
attempt: ${prev.attempt??0}
matrix: ${bbMatrixText(prev.matrix)}
matrix results: ${bbMatrixResultsText(prev.matrix)}
plan: ${plan(prev.plan)}
inter-model settle: ${prev.settleMs??0} ms
backend probes: ${bbBackendPlanText(prev.backendPlan)}
actual backends: ${prev.backends||'—'}
last heartbeat: ${prev.heartbeatAt||'—'}
since benchmark: ${Number.isFinite(prev.secondsSinceBenchmark)?prev.secondsSinceBenchmark.toFixed(1)+' s':'—'}
event-loop max gap: ${prev.maxEventLoopGapMs??'—'} ms
lifecycle: ${prev.lastLifecycle||'—'} · orderly pagehide: ${prev.orderlyExit?'yes':'no'}
navigation: ${prev.navigationType||'—'}
resident: ${bbResidentText(prev.resident)}
work canvases: ${prev.workCanvases||prev.rtCanvas||'—'} · memory: ${prev.memory||'N/A'}`:'no previous snapshot'}

LAST EVENTS
${tail||'—'}`;}
  function writeDiag(stage,extra={}){if(!DIAG)return;if(BLACKBOX&&stage==='diagnostic-start'){bbPrevious=null;bbEvents=[];bbBenchmarkDoneWall=0;bbMaxGap=0;bbLastBeat=performance.now();bbOrderlyExit=false;writeLocal(BB_JOURNAL_KEY,bbEvents)}bbStage=stage;if(BLACKBOX&&stage==='diagnostic-results-rendered')bbBenchmarkDoneWall=Date.now();try{sessionStorage.setItem(DIAG_KEY,JSON.stringify({stage,at:new Date().toISOString(),orderlyExit:false,...extra}))}catch(_){}showDiag(`Diagnostic · current stage: ${stage}`);bbJournal('stage:'+stage,extra,false);if(BLACKBOX){if(DEEP){bbCritical={seq:bbEventSeq,at:new Date().toISOString(),perfMs:Number(performance.now().toFixed(1)),stage,attempt:bbAttempt,matrixCase:bbMatrix?.currentCase||MATRIX_CASES[bbMatrix?.caseIndex]?.id||'',matrixAttempt:bbMatrix?.currentAttempt||0,model:extra.model||bbCurrentModel||'',requestedBackend:extra.requestedBackend||bbRequestedBackend||'',meta:bbSafeMeta(extra)};writeLocal(BB_CRITICAL_KEY,bbCritical);if(bbEventSeq%8===0||stage.endsWith('-complete')||stage.includes('error'))writeLocal(BB_JOURNAL_KEY,bbEvents)}else writeLocal(BB_DURABLE_KEY,bbSnapshot())}renderBlackbox()}
  function deepStage(stage,extra={}){if(DEEP)writeDiag(stage,extra)}
  function boundedError(value){const err=value instanceof Error?value:null;return{name:String(err?.name||value?.name||'Error').slice(0,120),message:String(err?.message||value?.message||value||'unknown').slice(0,600),stack:String(err?.stack||value?.stack||'').slice(0,1800),currentStage:bbStage}}
  function markDiagExit(event){if(!DIAG)return;bbOrderlyExit=true;bbLastLifecycle='pagehide';bbJournal('pagehide',{persisted:Boolean(event?.persisted),visibility:document.visibilityState,readyState:document.readyState});try{const prev=readDiag()||{};sessionStorage.setItem(DIAG_KEY,JSON.stringify({...prev,orderlyExit:true,exitAt:new Date().toISOString(),persisted:Boolean(event?.persisted)}))}catch(_){}if(BLACKBOX){const snapshot=bbSnapshot();writeLocal(BB_KEY,snapshot);writeLocal(BB_JOURNAL_KEY,bbEvents);if(!DEEP)writeLocal(BB_DURABLE_KEY,snapshot)}}
  window.addEventListener('pagehide',markDiagExit);
  const state={image:null,sampleId:'',running:false,benchmarking:false,tinyBuffer:null,tinySession:null,tinyProvider:'',tinyDownloadMs:NaN,tinyInitMs:NaN,tinyCacheState:'',tinySource:'',tinySessionRuns:0,yoloBuffer:null,yoloSession:null,yoloProvider:'',yoloDownloadMs:NaN,yoloInitMs:NaN,yoloCacheState:'',yoloSource:'',yoloSessionRuns:0,rtPipe:null,rtBackend:'',rtDtype:'',rtLoadMs:NaN,rtCacheState:'',rtModule:null,rtPipeRuns:0,rtProgressKey:'',lastHeadMaps:null,lastRun:{}};
  if(DIAG){const previous=readDiag(),diagnostics=$('race-diagnostics'),diagButton=$('race-benchmark-diag'),disposeButton=$('race-dispose-diag');if(diagnostics)diagnostics.hidden=false;if(diagButton)diagButton.hidden=false;if(disposeButton)disposeButton.hidden=false;if(previous)showDiag(`Diagnostic · previous stage: ${previous.stage||'unknown'} · orderly pagehide: ${previous.orderlyExit?'yes':'no'}`);else showDiag('Diagnostic mode ready · no previous breadcrumb.');try{sessionStorage.setItem(DIAG_KEY,JSON.stringify({stage:'page-ready',at:new Date().toISOString(),orderlyExit:false}))}catch(_){}}
  if(BLACKBOX){const periodic=readLocal(BB_KEY),durable=readLocal(BB_DURABLE_KEY),critical=readLocal(BB_CRITICAL_KEY);bbCritical=critical||bbCritical;bbPrevious=durable?{...(periodic||{}),...durable}:periodic;if(DEEP&&critical)bbPrevious={...(bbPrevious||{}),stage:critical.stage||bbPrevious?.stage,attempt:critical.attempt??bbPrevious?.attempt,matrix:bbPrevious?.matrix||bbMatrix,critical};bbEvents=readLocal(BB_JOURNAL_KEY,[]).slice(-(DEEP?200:40));bbCrash=bbCrash||bbMatrixCrash(bbMatrix);bbJournal('page-init',{navigation:bbNavType(),readyState:document.readyState,visibility:document.visibilityState});renderBlackbox();window.addEventListener('pageshow',event=>{bbLastLifecycle='pageshow';bbJournal('pageshow',{persisted:Boolean(event.persisted),readyState:document.readyState,visibility:document.visibilityState});renderBlackbox()});window.addEventListener('beforeunload',()=>{bbLastLifecycle='beforeunload';bbJournal('beforeunload',{readyState:document.readyState,visibility:document.visibilityState});writeLocal(BB_KEY,bbSnapshot())});document.addEventListener('visibilitychange',()=>{bbLastLifecycle='visibility:'+document.visibilityState;bbJournal(bbLastLifecycle,{readyState:document.readyState,visibility:document.visibilityState});writeLocal(BB_KEY,bbSnapshot());renderBlackbox()});document.addEventListener('freeze',()=>{bbLastLifecycle='freeze';bbJournal('freeze',{readyState:document.readyState,visibility:document.visibilityState});writeLocal(BB_KEY,bbSnapshot())});document.addEventListener('resume',()=>{bbLastLifecycle='resume';bbJournal('resume',{readyState:document.readyState,visibility:document.visibilityState});writeLocal(BB_KEY,bbSnapshot());renderBlackbox()});if(DEEP){window.addEventListener('error',event=>writeDiag('window-error',{model:bbCurrentModel,error:boundedError(event.error||{name:'ErrorEvent',message:event.message})}));window.addEventListener('unhandledrejection',event=>writeDiag('unhandledrejection',{model:bbCurrentModel,error:boundedError(event.reason)}));if(api.setDiagnosticHook)api.setDiagnosticHook((event,meta)=>deepStage(event,{model:'ssd',phase:event,...(meta||{})}))}setInterval(()=>{const now=performance.now(),gap=Math.max(0,now-bbLastBeat-1000);bbLastBeat=now;if(gap>bbMaxGap)bbMaxGap=gap;if(gap>=1500)bbJournal('event-loop-gap',{ms:Math.round(gap)});writeLocal(BB_KEY,bbSnapshot());if(DEEP&&bbEventSeq%8===0)writeLocal(BB_JOURNAL_KEY,bbEvents);renderBlackbox()},1000)}
  const report=(model,event)=>api.reportRuntimeEvent?.(model,event);
  const ms=api.ms,threshold=()=>api.getConfidence(),retainThreshold=()=>api.getRetentionThreshold?api.getRetentionThreshold():0.1,syncConfidence=()=>{$('race-confidence').textContent=threshold().toFixed(2)};syncConfidence();$('confidence').addEventListener('input',()=>{syncConfidence();redrawRaceResults();});
  const setStatus=(text,kind='')=>{const el=$('race-status');el.textContent=text;el.className=`status ${kind}`.trim()},sourceDims=s=>api.sourceSize(s),sleepFrame=()=>new Promise(requestAnimationFrame),sleepMs=value=>new Promise(resolve=>setTimeout(resolve,value));
  const median=v=>{const a=[...v].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2},percentile=(v,p)=>{const a=[...v].sort((x,y)=>x-y);return a[Math.max(0,Math.min(a.length-1,Math.ceil(p*a.length)-1))]},cv=v=>{const m=v.reduce((a,b)=>a+b,0)/v.length,q=v.reduce((s,x)=>s+(x-m)**2,0)/v.length;return m>0?Math.sqrt(q)/m*100:NaN};
  function updateProgress(prefix,info){const pct=Number.isFinite(info.percent)?Math.max(0,Math.min(100,info.percent)):null,bar=$(`${prefix}-progress-bar`),text=$(`${prefix}-progress-text`);if(bar)bar.style.width=pct===null?'18%':`${pct.toFixed(1)}%`;if(text){const loaded=loader.formatBytes(info.loaded),total=loader.formatBytes(info.total);text.textContent=pct===null?`${loaded} downloaded`:`${pct.toFixed(0)}% · ${loaded} / ${total}`}}
  loader.status(TINY).then(x=>$('race-tiny-cache').textContent=x.source?`${x.state} · ${x.source}`:x.state).catch(()=>{});
  function evictTinyRawBuffer(){state.tinyBuffer=null;loader.evictMemory(TINY)}
  async function getTinyBuffer(){
    if(state.tinyBuffer){report('tinyyolo',{type:'runtime',backend:state.tinyProvider,downloadMs:0,initMs:state.tinyInitMs,bytes:TINY.bytes,cacheState:'memory',source:state.tinySource});return state.tinyBuffer}
    const r=await loader.load(TINY,{onState:x=>{state.tinyCacheState=x.state;state.tinySource=x.source||state.tinySource;$('race-tiny-cache').textContent=x.source?`${x.state} · ${x.source}`:x.state;if(x.source)$('race-tiny-source').textContent=x.source;report('tinyyolo',{type:'cache',text:x.source?`${x.state} · ${x.source}`:x.state})},onProgress:x=>{updateProgress('race-tiny',x);report('tinyyolo',{type:'progress',info:x})},onTrace:DEEP?(event,meta)=>deepStage('tiny-loader-'+event,{model:'tinyyolo',phase:event,...meta}):undefined});
    state.tinyBuffer=r.buffer;state.tinyDownloadMs=r.downloadMs;state.tinyCacheState=r.cacheState;state.tinySource=r.source;$('race-tiny-source').textContent=r.source;$('race-tiny-cache').textContent=`${r.cacheState} · ${r.source}`;report('tinyyolo',{type:'runtime',backend:state.tinyProvider,downloadMs:r.downloadMs,bytes:r.buffer.byteLength,cacheState:r.cacheState,source:r.source});if(DEEP)deepStage('tiny-arraybuffer-ready',{model:'tinyyolo',bytes:r.buffer.byteLength,cacheState:r.cacheState});return r.buffer
  }
  async function createTinySession(force=''){
    if(state.tinySession&&(!force||state.tinyProvider===force)){report('tinyyolo',{type:'runtime',backend:state.tinyProvider,downloadMs:0,initMs:state.tinyInitMs,bytes:TINY.bytes,cacheState:'memory',source:state.tinySource});return state.tinySession}
    if(DEEP)deepStage('tiny-runtime-init-start',{model:'tinyyolo',requestedBackend:force||'configured'});
    const buffer=await getTinyBuffer(),providers=(force?[force]:TINY.executionProviders).filter(p=>p!=='webgpu'||navigator.gpu);let lastError;
    for(const provider of providers)try{setStatus(`Initializing Tiny YOLOv2 on ${provider.toUpperCase()}…`,'loading');if(DEEP)deepStage('tiny-session-create-start',{model:'tinyyolo',requestedBackend:provider,bytes:buffer.byteLength});const t=performance.now(),session=await ort.InferenceSession.create(buffer,{executionProviders:[provider],graphOptimizationLevel:'all'});state.tinyInitMs=performance.now()-t;if(state.tinySession&&state.tinySession!==session&&typeof state.tinySession.release==='function')try{await state.tinySession.release()}catch(_){}state.tinySession=session;state.tinySessionRuns=0;state.tinyProvider=provider;if(DEEP)deepStage('tiny-session-create-complete',{model:'tinyyolo',requestedBackend:provider,actualBackend:provider,durationMs:state.tinyInitMs});const rawBytes=state.tinyBuffer?.byteLength||0;evictTinyRawBuffer();if(DEEP)deepStage('tiny-raw-buffer-reference-release',{model:'tinyyolo',actualBackend:provider,bytes:rawBytes,referencePresent:Boolean(state.tinyBuffer)});$('race-tiny-backend').textContent=provider.toUpperCase();$('race-tiny-startup').textContent=`${ms(state.tinyDownloadMs)} / ${ms(state.tinyInitMs)}`;report('tinyyolo',{type:'runtime',backend:provider,downloadMs:state.tinyDownloadMs,initMs:state.tinyInitMs,bytes:TINY.bytes,cacheState:state.tinyCacheState,source:state.tinySource});return session}catch(err){lastError=err;if(DEEP)deepStage('tiny-session-create-error',{model:'tinyyolo',requestedBackend:provider,error:boundedError(err)});console.warn('Tiny YOLOv2 provider failed',provider,err)}
    evictTinyRawBuffer();throw lastError||new Error('No compatible Tiny YOLOv2 execution provider.')
  }
  loader.status(YOLO).then(x=>$('race-yolo-cache').textContent=x.source?`${x.state} · ${x.source}`:x.state).catch(()=>{});
  function evictYoloRawBuffer(){state.yoloBuffer=null;loader.evictMemory(YOLO)}
  async function getYoloBuffer(){
    if(state.yoloBuffer){report('yolox',{type:'runtime',backend:state.yoloProvider,downloadMs:0,initMs:state.yoloInitMs,bytes:YOLO.bytes,cacheState:'memory',source:state.yoloSource});return state.yoloBuffer}
    const r=await loader.load(YOLO,{onState:x=>{state.yoloCacheState=x.state;state.yoloSource=x.source||state.yoloSource;$('race-yolo-cache').textContent=x.source?`${x.state} · ${x.source}`:x.state;if(x.source)$('race-yolo-source').textContent=x.source;report('yolox',{type:'cache',text:x.source?`${x.state} · ${x.source}`:x.state})},onProgress:x=>{updateProgress('race-yolo',x);report('yolox',{type:'progress',info:x})},onTrace:DEEP?(event,meta)=>deepStage('yolox-loader-'+event,{model:'yolox',phase:event,...meta}):undefined});
    state.yoloBuffer=r.buffer;state.yoloDownloadMs=r.downloadMs;state.yoloCacheState=r.cacheState;state.yoloSource=r.source;$('race-yolo-source').textContent=r.source;$('race-yolo-cache').textContent=`${r.cacheState} · ${r.source}`;report('yolox',{type:'runtime',backend:state.yoloProvider,downloadMs:r.downloadMs,bytes:r.buffer.byteLength,cacheState:r.cacheState,source:r.source});if(DEEP)deepStage('yolox-arraybuffer-ready',{model:'yolox',bytes:r.buffer.byteLength,cacheState:r.cacheState});return r.buffer
  }
  async function createYoloSession(force=''){
    if(state.yoloSession&&(!force||state.yoloProvider===force)){report('yolox',{type:'runtime',backend:state.yoloProvider,downloadMs:0,initMs:state.yoloInitMs,bytes:YOLO.bytes,cacheState:'memory',source:state.yoloSource});return state.yoloSession}
    if(DEEP)deepStage('yolox-runtime-init-start',{model:'yolox',requestedBackend:force||'configured'});
    const buffer=await getYoloBuffer(),providers=(force?[force]:YOLO.executionProviders).filter(p=>p!=='webgpu'||navigator.gpu);let lastError;
    for(const provider of providers)try{setStatus(`Initializing YOLOX on ${provider.toUpperCase()}…`,'loading');if(DEEP)deepStage('yolox-session-create-start',{model:'yolox',requestedBackend:provider,bytes:buffer.byteLength});const t=performance.now(),session=await ort.InferenceSession.create(buffer,{executionProviders:[provider],graphOptimizationLevel:'all'});state.yoloInitMs=performance.now()-t;if(state.yoloSession&&state.yoloSession!==session&&typeof state.yoloSession.release==='function')try{await state.yoloSession.release()}catch(_){}state.yoloSession=session;state.yoloSessionRuns=0;state.yoloProvider=provider;if(DEEP)deepStage('yolox-session-create-complete',{model:'yolox',requestedBackend:provider,actualBackend:provider,durationMs:state.yoloInitMs});const rawBytes=state.yoloBuffer?.byteLength||0;evictYoloRawBuffer();if(DEEP)deepStage('yolox-raw-buffer-reference-release',{model:'yolox',actualBackend:provider,bytes:rawBytes,referencePresent:Boolean(state.yoloBuffer)});$('race-yolo-backend').textContent=provider.toUpperCase();$('race-yolo-startup').textContent=`${ms(state.yoloDownloadMs)} / ${ms(state.yoloInitMs)}`;report('yolox',{type:'runtime',backend:provider,downloadMs:state.yoloDownloadMs,initMs:state.yoloInitMs,bytes:YOLO.bytes,cacheState:state.yoloCacheState,source:state.yoloSource});return session}catch(err){lastError=err;if(DEEP)deepStage('yolox-session-create-error',{model:'yolox',requestedBackend:provider,error:boundedError(err)});console.warn('YOLOX provider failed',provider,err)}
    evictYoloRawBuffer();throw lastError||new Error('No compatible YOLOX execution provider.')
  }
  function prepareDisplay(source,canvas){const {w,h}=sourceDims(source),scale=Math.min(1,640/Math.max(w,h));canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height)}
  function prepareTiny(source,canvas){const {w,h}=sourceDims(source),size=TINY.input;if(!w||!h)throw new Error('Race image has no readable dimensions.');const work=$('race-tiny-work');work.width=size;work.height=size;const ctx=work.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,size,size);const chw=window.VisionPreprocessing.packTinyRgbNchw(ctx.getImageData(0,0,size,size).data,size,size);prepareDisplay(source,canvas);return{tensor:new ort.Tensor('float32',chw,[1,3,size,size]),w,h}}
  async function runTinySession(session,tensor){const run=s=>s.run({[s.inputNames[0]]:tensor});try{return await run(session)}catch(err){if(state.tinyProvider!=='webgpu')throw err;console.warn('Tiny YOLOv2 WebGPU run failed; retrying WASM',err);const old=state.tinySession;state.tinySession=null;state.tinyProvider='';if(old&&typeof old.release==='function')try{await old.release()}catch(_){}return run(await createTinySession('wasm'))}}
  function prepareYolo(source,canvas){const {w,h}=sourceDims(source),size=YOLO.input;if(!w||!h)throw new Error('Race image has no readable dimensions.');const ratio=Math.min(size/h,size/w),rw=Math.max(1,Math.floor(w*ratio)),rh=Math.max(1,Math.floor(h*ratio)),work=$('race-yolo-work');work.width=size;work.height=size;const ctx=work.getContext('2d',{willReadFrequently:true});ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,size,size);ctx.drawImage(source,0,0,rw,rh);const rgba=ctx.getImageData(0,0,size,size).data,plane=size*size,chw=new Float32Array(plane*3);for(let p=0,s=0;p<plane;p++,s+=4){chw[p]=rgba[s+2];chw[plane+p]=rgba[s+1];chw[plane*2+p]=rgba[s]}prepareDisplay(source,canvas);return{tensor:new ort.Tensor('float32',chw,[1,3,size,size]),ratio,w,h}}
  async function runYoloSession(session,tensor,{forceBackend='',allowFallback=true}={}){const run=s=>s.run({[s.inputNames[0]]:tensor});try{return await run(session)}catch(err){if(state.yoloProvider!=='webgpu'||!allowFallback||forceBackend)throw err;console.warn('YOLOX WebGPU run failed; retrying WASM',err);const old=state.yoloSession;state.yoloSession=null;state.yoloProvider='';if(old&&typeof old.release==='function')try{await old.release()}catch(_){}return run(await createYoloSession('wasm'))}}
  function iou(a,b){const t=Math.max(a[0],b[0]),l=Math.max(a[1],b[1]),bt=Math.min(a[2],b[2]),r=Math.min(a[3],b[3]),inter=Math.max(0,bt-t)*Math.max(0,r-l),aa=Math.max(0,a[2]-a[0])*Math.max(0,a[3]-a[1]),bb=Math.max(0,b[2]-b[0])*Math.max(0,b[3]-b[1]),u=aa+bb-inter;return u>0?inter/u:0}
  const sigmoid=x=>1/(1+Math.exp(-Math.max(-60,Math.min(60,x))));
  function decodeTiny(output){const data=output&&output.data;if(!data||data.length!==125*13*13)throw new Error(`Unexpected Tiny YOLOv2 output: ${data?data.length:0} values; expected ${125*13*13}.`);const grid=13,attrs=25,anchors=TINY.anchors,candidates=[],at=(channel,y,x)=>Number(data[(channel*grid+y)*grid+x]);for(let gy=0;gy<grid;gy++)for(let gx=0;gx<grid;gx++)for(let b=0;b<5;b++){const ch=b*attrs,tx=at(ch,gy,gx),ty=at(ch+1,gy,gx),tw=Math.max(-20,Math.min(20,at(ch+2,gy,gx))),th=Math.max(-20,Math.min(20,at(ch+3,gy,gx))),obj=sigmoid(at(ch+4,gy,gx));let maxLogit=-Infinity;for(let c=0;c<20;c++)maxLogit=Math.max(maxLogit,at(ch+5+c,gy,gx));let sum=0,best=-1,bestExp=-Infinity;for(let c=0;c<20;c++){const e=Math.exp(at(ch+5+c,gy,gx)-maxLogit);sum+=e;if(e>bestExp){bestExp=e;best=c}}const classProb=sum>0?bestExp/sum:0,score=obj*classProb;if(score<retainThreshold())continue;const cx=(gx+sigmoid(tx))/grid,cy=(gy+sigmoid(ty))/grid,bw=Math.exp(tw)*anchors[b*2]/grid,bh=Math.exp(th)*anchors[b*2+1]/grid,top=Math.max(0,cy-bh/2),left=Math.max(0,cx-bw/2),bottom=Math.min(1,cy+bh/2),right=Math.min(1,cx+bw/2);if(bottom>top&&right>left)candidates.push({score,classId:best,sourceLabel:VOC20[best],label:VOC_CANON[best],box:[top,left,bottom,right]})}candidates.sort((a,b)=>b.score-a.score);const kept=[];for(const d of candidates){if(kept.every(k=>k.label!==d.label||iou(d.box,k.box)<=TINY.nms))kept.push(d);if(kept.length>=100)break}return kept}
  async function runTiny(source,canvas){const session=await createTinySession(),first=DEEP&&state.tinySessionRuns===0,ts=performance.now(),ps=performance.now();if(first)deepStage('tiny-first-preprocess-start',{model:'tinyyolo',actualBackend:state.tinyProvider});const prep=prepareTiny(source,canvas),preMs=performance.now()-ps;if(first){bbLastAlloc.tinyyolo={shape:[1,3,TINY.input,TINY.input],dtype:'float32',estimatedTensorBytes:TINY.input*TINY.input*3*4,estimated:true};deepStage('tiny-first-tensor-ready',{model:'tinyyolo',actualBackend:state.tinyProvider,...bbLastAlloc.tinyyolo})}const is=performance.now();if(first)deepStage('tiny-first-inference-start',{model:'tinyyolo',actualBackend:state.tinyProvider});const results=await runTinySession(session,prep.tensor),infMs=performance.now()-is;if(first)deepStage('tiny-first-inference-complete',{model:'tinyyolo',actualBackend:state.tinyProvider,durationMs:infMs});state.tinySessionRuns++;const post=performance.now(),output=results[session.outputNames[0]]||results[Object.keys(results)[0]],detections=decodeTiny(output),visible=api.drawDetections(canvas,detections),postMs=performance.now()-post;if(first)deepStage('tiny-first-postprocess-complete',{model:'tinyyolo',actualBackend:state.tinyProvider,retained:detections.length,visible});return{preMs,infMs,postMs,totalMs:performance.now()-ts,detections,visible,width:TINY.input,height:TINY.input,retained:detections.length,retentionThreshold:retainThreshold(),timingBoundary:'onnx-run'}}
  function decodeYolo(output,ratio,w,h){const data=output.data,attrs=85,expected=52*52+26*26+13*13,rows=Math.floor(data.length/attrs);if(rows!==expected)throw new Error(`Unexpected YOLOX output: ${rows} rows; expected ${expected}.`);const candidates=[],maps=[];let row=0;for(const stride of[8,16,32]){const grid=YOLO.input/stride,map=new Float32Array(grid*grid);let mi=0;for(let gy=0;gy<grid;gy++)for(let gx=0;gx<grid;gx++,row++,mi++){const o=row*attrs,obj=Number(data[o+4]);map[mi]=obj;let cls=0,cp=-Infinity;for(let c=0;c<80;c++){const p=Number(data[o+5+c]);if(p>cp){cp=p;cls=c}}const score=obj*cp;if(score<retainThreshold())continue;const cx=(Number(data[o])+gx)*stride,cy=(Number(data[o+1])+gy)*stride,bw=Math.exp(Number(data[o+2]))*stride,bh=Math.exp(Number(data[o+3]))*stride,x1=Math.max(0,(cx-bw/2)/ratio),y1=Math.max(0,(cy-bh/2)/ratio),x2=Math.min(w,(cx+bw/2)/ratio),y2=Math.min(h,(cy+bh/2)/ratio);if(x2>x1&&y2>y1)candidates.push({score,classId:cls,label:COCO80[cls],box:[y1/h,x1/w,y2/h,x2/w]})}maps.push({stride,grid,data:map})}candidates.sort((a,b)=>b.score-a.score);const kept=[];for(const d of candidates){if(kept.every(k=>iou(d.box,k.box)<=YOLO.nms))kept.push(d);if(kept.length>=100)break}state.lastHeadMaps=maps;return kept}
  async function runYolo(source,canvas,{forceBackend='',allowFallback=true}={}){const session=await createYoloSession(forceBackend),first=DEEP&&state.yoloSessionRuns===0,ts=performance.now(),ps=performance.now();if(first)deepStage('yolox-first-preprocess-start',{model:'yolox',requestedBackend:forceBackend||'auto',actualBackend:state.yoloProvider});const prep=prepareYolo(source,canvas),preMs=performance.now()-ps;if(first){bbLastAlloc.yolox={shape:[1,3,YOLO.input,YOLO.input],dtype:'float32',estimatedTensorBytes:YOLO.input*YOLO.input*3*4,estimated:true};deepStage('yolox-first-tensor-ready',{model:'yolox',actualBackend:state.yoloProvider,...bbLastAlloc.yolox})}const is=performance.now();if(first)deepStage('yolox-first-inference-start',{model:'yolox',actualBackend:state.yoloProvider});const results=await runYoloSession(session,prep.tensor,{forceBackend,allowFallback}),infMs=performance.now()-is;if(first)deepStage('yolox-first-inference-complete',{model:'yolox',actualBackend:state.yoloProvider,durationMs:infMs});state.yoloSessionRuns++;const post=performance.now(),output=results[session.outputNames[0]]||results[Object.keys(results)[0]],detections=decodeYolo(output,prep.ratio,prep.w,prep.h),visible=api.drawDetections(canvas,detections),postMs=performance.now()-post;if(first)deepStage('yolox-first-postprocess-complete',{model:'yolox',actualBackend:state.yoloProvider,retained:detections.length,visible});return{preMs,infMs,postMs,totalMs:performance.now()-ts,detections,visible,width:YOLO.input,height:YOLO.input,retained:detections.length,retentionThreshold:retainThreshold()}}
  async function importTransformers(){if(state.rtModule)return state.rtModule;if(DEEP)deepStage('rtdetr-transformers-module-import-start',{model:'rtdetr'});setStatus(`Loading pinned Transformers.js ${registry.runtime.transformersJs} runtime…`,'loading');state.rtModule=await import(registry.runtime.transformersJsUrl);state.rtModule.env.allowLocalModels=false;if('useWasmCache' in state.rtModule.env)state.rtModule.env.useWasmCache=true;if(DEEP)deepStage('rtdetr-transformers-module-ready',{model:'rtdetr'});return state.rtModule}
  async function rtCached(mod,device,dtype){try{if(mod.ModelRegistry&&typeof mod.ModelRegistry.is_pipeline_cached==='function')return await mod.ModelRegistry.is_pipeline_cached(RT.task,RT.modelId,{revision:RT.revision,device,dtype});if('caches'in window){for(const name of await caches.keys()){const cache=await caches.open(name),keys=await cache.keys();if(keys.some(r=>r.url.includes(RT.modelId)))return true}}}catch(_){}return false}
  function rtProgress(info){const bar=$('race-rt-progress-bar'),text=$('race-rt-progress-text');let pct=Number(info&&info.progress);if(Number.isFinite(pct)&&pct<=1)pct*=100;if(Number.isFinite(pct))bar.style.width=`${Math.max(0,Math.min(100,pct)).toFixed(1)}%`;const file=info&&info.file?String(info.file).split('/').pop():'model files',loaded=Number(info&&info.loaded),total=Number(info&&info.total);if(Number.isFinite(loaded)&&Number.isFinite(total)&&total>0)text.textContent=`${file} · ${(loaded/total*100).toFixed(0)}% · ${loader.formatBytes(loaded)} / ${loader.formatBytes(total)}`;else if(info&&info.status)text.textContent=`${info.status} · ${file}`;if(DEEP&&Number.isFinite(loaded)&&Number.isFinite(total)&&total>0&&loaded>=total){const key=`${file}:${total}`;if(state.rtProgressKey!==key){state.rtProgressKey=key;deepStage('rtdetr-model-file-complete',{model:'rtdetr',file:file.slice(0,180),bytes:total})}}report('rtdetr',{type:'progress',info:{percent:Number.isFinite(pct)?pct:undefined,loaded,total}})}
  async function createRT(force=''){
    if(state.rtPipe&&(!force||state.rtBackend===force)){const cfg=RT.runtime[state.rtBackend]||{};report('rtdetr',{type:'runtime',backend:state.rtBackend,dtype:state.rtDtype,initMs:state.rtLoadMs,bytes:cfg.modelBytes,cacheState:'memory',source:`HF pinned ${RT.revision}`});return state.rtPipe}
    if(DEEP)deepStage('rtdetr-pipeline-request-start',{model:'rtdetr',requestedBackend:force||'auto'});
    const mod=await importTransformers(),attempts=force?[RT.runtime[force]]:(navigator.gpu?[RT.runtime.webgpu,RT.runtime.wasm]:[RT.runtime.wasm]);let lastError;
    for(const cfg of attempts)try{
      if(DEEP)deepStage('rtdetr-cache-lookup-start',{model:'rtdetr',requestedBackend:cfg.device,dtype:cfg.dtype});
      const cached=await rtCached(mod,cfg.device,cfg.dtype);
      if(DEEP)deepStage('rtdetr-cache-lookup-complete',{model:'rtdetr',requestedBackend:cfg.device,dtype:cfg.dtype,cached});
      $('race-rt-cache').textContent=cached?'browser cache':'network/cache miss';$('race-rt-backend').textContent=cfg.device.toUpperCase();$('race-rt-asset').textContent=`${cfg.dtype} · ~${loader.formatBytes(cfg.modelBytes)}`;setStatus(`Loading RT-DETR R18 on ${cfg.device.toUpperCase()} (${cfg.dtype})…`,'loading');
      state.rtProgressKey='';if(DEEP)deepStage('rtdetr-pipeline-construction-start',{model:'rtdetr',requestedBackend:cfg.device,dtype:cfg.dtype,expectedModelBytes:cfg.modelBytes,navigatorGpu:Boolean(navigator.gpu),deviceLostTelemetry:'unavailable-library-owned-device'});
      const t=performance.now(),pipe=await mod.pipeline(RT.task,RT.modelId,{device:cfg.device,dtype:cfg.dtype,revision:RT.revision,progress_callback:rtProgress});
      state.rtLoadMs=performance.now()-t;state.rtPipe=pipe;state.rtPipeRuns=0;state.rtBackend=cfg.device;state.rtDtype=cfg.dtype;state.rtCacheState=cached?'browser cache':'cached after load';if(DEEP)deepStage('rtdetr-pipeline-ready',{model:'rtdetr',requestedBackend:cfg.device,actualBackend:cfg.device,dtype:cfg.dtype,durationMs:state.rtLoadMs});
      $('race-rt-load').textContent=ms(state.rtLoadMs);$('race-rt-cache').textContent=state.rtCacheState;$('race-rt-progress-bar').style.width='100%';$('race-rt-progress-text').textContent='Ready';report('rtdetr',{type:'runtime',backend:cfg.device,dtype:cfg.dtype,initMs:state.rtLoadMs,bytes:cfg.modelBytes,cacheState:state.rtCacheState,source:`HF pinned ${RT.revision}`});return pipe
    }catch(err){lastError=err;if(DEEP)deepStage('rtdetr-pipeline-attempt-error',{model:'rtdetr',requestedBackend:cfg?.device||force||'auto',dtype:cfg?.dtype||'',error:boundedError(err)});console.warn('RT-DETR load attempt failed',cfg,err);state.rtPipe=null}
    throw lastError||new Error('RT-DETR could not be loaded.')
  }
  async function runRT(source,canvas,{forceBackend='',allowFallback=true}={}){
    let pipe=await createRT(forceBackend),first=DEEP&&state.rtPipeRuns===0;
    const {w,h}=sourceDims(source),maxSide=RT.input||640,stageScale=Math.min(1,maxSide/Math.max(w,h)),stageW=Math.max(1,Math.round(w*stageScale)),stageH=Math.max(1,Math.round(h*stageScale)),work=$('race-rt-work');
    if(first)deepStage('rtdetr-staging-canvas-start',{model:'rtdetr',requestedBackend:forceBackend||'auto',actualBackend:state.rtBackend,source:{width:w,height:h}});
    work.width=stageW;work.height=stageH;work.getContext('2d').drawImage(source,0,0,stageW,stageH);if(first){bbLastAlloc.rtdetr={stagingCanvas:{width:stageW,height:stageH,estimatedRgbaBytes:stageW*stageH*4,estimated:true},pipelineInputTensor:'managed-inside-transformers-js'};deepStage('rtdetr-staging-canvas-ready',{model:'rtdetr',actualBackend:state.rtBackend,...bbLastAlloc.rtdetr})}
    let output,infMs;
    try{const t=performance.now();if(first)deepStage('rtdetr-first-pipeline-inference-start',{model:'rtdetr',actualBackend:state.rtBackend,dtype:state.rtDtype,boundary:'Transformers.js processor + model + postprocessor'});output=await pipe(work,{threshold:retainThreshold()});infMs=performance.now()-t;if(first)deepStage('rtdetr-first-pipeline-inference-complete',{model:'rtdetr',actualBackend:state.rtBackend,dtype:state.rtDtype,durationMs:infMs});}
    catch(err){
      if(state.rtBackend!=='webgpu'||!allowFallback||forceBackend)throw err;
      console.warn('RT-DETR WebGPU inference failed; retrying WASM q8',err);
      if(state.rtPipe&&typeof state.rtPipe.dispose==='function')try{await state.rtPipe.dispose()}catch(_){}
      state.rtPipe=null;state.rtBackend='';state.rtDtype='';state.rtPipeRuns=0;
      pipe=await createRT('wasm');const t=performance.now();output=await pipe(work,{threshold:retainThreshold()});infMs=performance.now()-t;
    }
    state.rtPipeRuns++;
    const list=Array.isArray(output)&&Array.isArray(output[0])?output[0]:output,raw=Array.isArray(list)?list:[],clamp=v=>Math.max(0,Math.min(1,v));
    const detections=raw.map(x=>({score:Number(x.score),label:String(x.label),classId:-1,box:[Number(x.box?.ymin)/stageH,Number(x.box?.xmin)/stageW,Number(x.box?.ymax)/stageH,Number(x.box?.xmax)/stageW]})).filter(x=>Number.isFinite(x.score)&&x.box.every(Number.isFinite)).map(x=>({...x,box:x.box.map(clamp)})).filter(x=>x.box[2]>x.box[0]&&x.box[3]>x.box[1]);
    const droppedInvalid=raw.length-detections.length;prepareDisplay(source,canvas);const p=performance.now(),visible=api.drawDetections(canvas,detections),postMs=performance.now()-p;if(first)deepStage('rtdetr-first-postprocess-complete',{model:'rtdetr',actualBackend:state.rtBackend,dtype:state.rtDtype,rawCount:raw.length,retained:detections.length,droppedInvalid,visible});
    return{preMs:NaN,infMs,postMs,totalMs:infMs+postMs,detections,visible,width:RT.input,height:RT.input,timingBoundary:'transformers-pipeline',rawCount:raw.length,retained:detections.length,droppedInvalid,retentionThreshold:retainThreshold()};
  }
  async function releaseTinyRuntime(){const session=state.tinySession,rawBytes=state.tinyBuffer?.byteLength||0,methodPresent=Boolean(session&&typeof session.release==='function'),provider=state.tinyProvider||'';state.tinySession=null;state.tinySessionRuns=0;evictTinyRawBuffer();if(!session){if(DEEP&&rawBytes)deepStage('tiny-raw-buffer-reference-release',{model:'tinyyolo',bytes:rawBytes,referencePresent:false});return}const start=performance.now();if(DEEP)deepStage('tiny-release-start',{model:'tinyyolo',actualBackend:provider,methodPresent,jsReferenceNull:true});try{if(methodPresent)await session.release();if(DEEP)deepStage('tiny-release-complete',{model:'tinyyolo',actualBackend:provider,methodPresent,jsReferenceNull:true,durationMs:performance.now()-start})}catch(err){if(DEEP)deepStage('tiny-release-error',{model:'tinyyolo',actualBackend:provider,methodPresent,error:boundedError(err),durationMs:performance.now()-start});console.warn('Tiny YOLOv2 session release failed',err)}}
  async function releaseYoloRuntime(){const session=state.yoloSession,rawBytes=state.yoloBuffer?.byteLength||0,methodPresent=Boolean(session&&typeof session.release==='function'),provider=state.yoloProvider||'';state.yoloSession=null;state.yoloSessionRuns=0;evictYoloRawBuffer();if(!session){if(DEEP&&rawBytes)deepStage('yolox-raw-buffer-reference-release',{model:'yolox',bytes:rawBytes,referencePresent:false});return}const start=performance.now();if(DEEP)deepStage('yolox-release-start',{model:'yolox',actualBackend:provider,methodPresent,jsReferenceNull:true});try{if(methodPresent)await session.release();if(DEEP)deepStage('yolox-release-complete',{model:'yolox',actualBackend:provider,methodPresent,jsReferenceNull:true,durationMs:performance.now()-start})}catch(err){if(DEEP)deepStage('yolox-release-error',{model:'yolox',actualBackend:provider,methodPresent,error:boundedError(err),durationMs:performance.now()-start});console.warn('YOLOX session release failed',err)}}
  async function releaseRTRuntime(){const pipe=state.rtPipe,methodPresent=Boolean(pipe&&typeof pipe.dispose==='function'),backend=state.rtBackend||'',dtype=state.rtDtype||'';state.rtPipe=null;state.rtPipeRuns=0;if(!pipe)return;const start=performance.now();if(DEEP)deepStage('rtdetr-release-start',{model:'rtdetr',actualBackend:backend,dtype,methodPresent,jsReferenceNull:true});try{if(methodPresent)await pipe.dispose();if(DEEP)deepStage('rtdetr-release-complete',{model:'rtdetr',actualBackend:backend,dtype,methodPresent,jsReferenceNull:true,durationMs:performance.now()-start})}catch(err){if(DEEP)deepStage('rtdetr-release-error',{model:'rtdetr',actualBackend:backend,dtype,methodPresent,error:boundedError(err),durationMs:performance.now()-start});console.warn('RT-DETR pipeline dispose failed',err)}}
  function createRtResearchAdapter(modelKey){
    const model=registry[modelKey],meta=model.capabilities.race;let pipe=null,backend='',dtype='',loadMs=NaN;
    async function create(force=''){
      if(pipe&&(!force||backend===force))return pipe;
      const module=await importTransformers(),choices=force?[model.runtime[force]]:(navigator.gpu?[model.runtime.webgpu,model.runtime.wasm]:[model.runtime.wasm]);let lastError;
      for(const cfg of choices){if(!cfg)continue;try{
        $(`race-${meta.prefix}-backend`).textContent=cfg.device.toUpperCase();$(`race-${meta.prefix}-asset`).textContent=`${cfg.dtype} · ~${loader.formatBytes(cfg.modelBytes)}`;
        setStatus(`Loading ${model.title} on ${cfg.device.toUpperCase()} (${cfg.dtype})…`,'loading');
        const started=performance.now();pipe=await module.pipeline(model.task,model.modelId,{device:cfg.device,dtype:cfg.dtype,revision:model.revision,progress_callback:progress=>{
          const value=Number(progress?.progress),status=String(progress?.status||'').replaceAll('_',' ');
          if(Number.isFinite(value))$(`race-${meta.prefix}-progress-bar`).style.width=`${Math.max(0,Math.min(100,value))}%`;
          if(status)$(`race-${meta.prefix}-progress-text`).textContent=status;
        }});
        loadMs=performance.now()-started;backend=cfg.device;dtype=cfg.dtype;
        $(`race-${meta.prefix}-load`).textContent=ms(loadMs);$(`race-${meta.prefix}-cache`).textContent='pipeline loaded';
        $(`race-${meta.prefix}-progress-bar`).style.width='100%';$(`race-${meta.prefix}-progress-text`).textContent='Ready';return pipe;
      }catch(error){lastError=error;pipe=null;console.warn(`${model.title} pipeline load failed`,cfg,error)}}
      throw lastError||new Error(`${model.title} could not be loaded.`);
    }
    async function run(source,canvas,{forceBackend='',allowFallback=true}={}){
      let active=await create(forceBackend);const {w,h}=sourceDims(source),scale=Math.min(1,model.input/Math.max(w,h)),width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale)),work=$(meta.workCanvasId);
      work.width=width;work.height=height;work.getContext('2d').drawImage(source,0,0,width,height);
      let output,infMs;const started=performance.now();
      try{output=await active(work,{threshold:retainThreshold()});infMs=performance.now()-started}
      catch(error){if(backend!=='webgpu'||!allowFallback||forceBackend)throw error;console.warn(`${model.title} WebGPU inference failed; retrying WASM q8`,error);if(pipe&&typeof pipe.dispose==='function')try{await pipe.dispose()}catch(_){}pipe=null;backend='';dtype='';active=await create('wasm');const retryStarted=performance.now();output=await active(work,{threshold:retainThreshold()});infMs=performance.now()-retryStarted}
      const raw=Array.isArray(output)&&Array.isArray(output[0])?output[0]:output,list=Array.isArray(raw)?raw:[],clamp=value=>Math.max(0,Math.min(1,value));
      const detections=list.map(item=>({score:Number(item.score),label:String(item.label),classId:-1,box:[Number(item.box?.ymin)/height,Number(item.box?.xmin)/width,Number(item.box?.ymax)/height,Number(item.box?.xmax)/width]}))
        .filter(item=>Number.isFinite(item.score)&&item.box.every(Number.isFinite)).map(item=>({...item,box:item.box.map(clamp)})).filter(item=>item.box[2]>item.box[0]&&item.box[3]>item.box[1]);
      prepareDisplay(source,canvas);const drawStarted=performance.now(),visible=api.drawDetections(canvas,detections),postMs=performance.now()-drawStarted;
      return{preMs:NaN,infMs,postMs,totalMs:infMs+postMs,detections,visible,width:model.input,height:model.input,timingBoundary:'transformers-pipeline',rawCount:list.length,retained:detections.length,retentionThreshold:retainThreshold()};
    }
    async function release(){const old=pipe;pipe=null;backend='';dtype='';if(old&&typeof old.dispose==='function')try{await old.dispose()}catch(error){console.warn(`${model.title} pipeline dispose failed`,error)}}
    return{run,release,backend:()=>`${backend.toUpperCase()} ${dtype}`.trim(),runtimeInfo:()=>({backend,dtype,initMs:loadMs,bytes:model.runtime[backend]?.modelBytes,cacheState:pipe?'memory':'runtime released',source:`HF pinned ${model.revision}`}),diagnosticBackends:()=>[{value:'auto',label:'Auto'},{value:'webgpu',label:'WebGPU fp16',available:()=>Boolean(navigator.gpu)},{value:'wasm',label:'WASM int8'}]};
  }
  function registerRaceRuntimeAdapters(){
    if(!runtimeRegistry.get('tinyyolo'))runtimeRegistry.register('tinyyolo',{
      run:(source,canvas)=>runTiny(source,canvas),
      release:releaseTinyRuntime,
      backend:()=>state.tinyProvider.toUpperCase(),
      runtimeInfo:()=>({backend:state.tinyProvider,downloadMs:state.tinyDownloadMs,initMs:state.tinyInitMs,bytes:TINY.bytes,cacheState:state.tinyCacheState,source:state.tinySource})
    });
    if(!runtimeRegistry.get('yolox'))runtimeRegistry.register('yolox',{
      run:(source,canvas,options={})=>{const {benchmarking,...runtimeOptions}=options;return runYolo(source,canvas,runtimeOptions)},
      release:releaseYoloRuntime,
      backend:()=>state.yoloProvider.toUpperCase(),
      runtimeInfo:()=>({backend:state.yoloProvider,downloadMs:state.yoloDownloadMs,initMs:state.yoloInitMs,bytes:YOLO.bytes,cacheState:state.yoloCacheState,source:state.yoloSource}),
      inspectionData:()=>state.lastHeadMaps,
      diagnosticBackends:()=>registry.runtime.directOrtMode==='jsep'?[{value:'auto',label:'Auto'},{value:'webgpu',label:'WebGPU',available:()=>Boolean(navigator.gpu)},{value:'wasm',label:'WASM · JSEP bundle'}]:[{value:'auto',label:'Auto · standard WASM'},{value:'wasm',label:'WASM · standard bundle'}]
    });
    if(!runtimeRegistry.get('rtdetr'))runtimeRegistry.register('rtdetr',{
      run:(source,canvas,options={})=>runRT(source,canvas,options),
      release:releaseRTRuntime,
      backend:()=>state.rtBackend.toUpperCase()+' '+state.rtDtype,
      runtimeInfo:()=>{const cfg=RT.runtime[state.rtBackend]||{};return{backend:state.rtBackend,dtype:state.rtDtype,initMs:state.rtLoadMs,bytes:cfg.modelBytes,cacheState:state.rtCacheState,source:`HF pinned ${RT.revision}`}},
      diagnosticBackends:()=>[{value:'auto',label:'Auto'},{value:'webgpu',label:'WebGPU fp16',available:()=>Boolean(navigator.gpu)},{value:'wasm',label:'WASM q8'}]
    });
    if(!runtimeRegistry.get('rtdetrv2'))runtimeRegistry.register('rtdetrv2',createRtResearchAdapter('rtdetrv2'));
    runtimeRegistry.assertRegistered({capability:'race',group:'general-object'});
    runtimeRegistry.assertRegistered({capability:'timeMachine'});
    runtimeRegistry.assertRegistered({capability:'live'});
    api.refreshLiveModels?.();
  }
  registerRaceRuntimeAdapters();

  function getRaceSpecs(source,canvas,{benchmarking=false}={}){
    return runtimeRegistry.list({capability:'race',group:'general-object'}).map(adapter=>{
      const race=runtimeRegistry.raceMeta(adapter.model);
      return{key:adapter.key,prefix:race.prefix,label:adapter.model.title,model:adapter.model,race,workCanvasId:race.workCanvasId,timingBoundary:race.timingBoundary,backend:adapter.backend,diagnosticBackends:adapter.diagnosticBackends(),run:(options={},targetCanvas=canvas)=>adapter.run(source,targetCanvas,{benchmarking,...(options||{})}),release:adapter.release};
    });
  }
  function appendText(parent,tag,text,className=''){const el=document.createElement(tag);if(className)el.className=className;el.textContent=text;parent.appendChild(el);return el}
  function renderRaceScaffold(){
    const specs=getRaceSpecs(null,null,{benchmarking:true}),results=$('race-results'),bench=$('race-benchmark-body'),diff=$('race-diff-grid'),architecture=$('race-architecture'),work=$('race-work-canvases');
    if(!results||!bench||!diff||!architecture||!work)throw new Error('Model Race scaffold containers are missing.');
    results.replaceChildren();bench.replaceChildren();diff.replaceChildren();architecture.replaceChildren();
    const years=specs.map(spec=>Number(spec.model.year)).filter(Number.isFinite),from=years.length?Math.min(...years):'',to=years.length?Math.max(...years):'';
    $('race-intro-eyebrow').textContent=from&&to?`Executable comparison · ${from} → ${to}`:'Executable comparison';
    $('race-intro-title').textContent=`${specs.length} detector generation${specs.length===1?'':'s'}, one image`;
    $('race-benchmark-title').textContent=`Same device, ${specs.length} generation${specs.length===1?'':'s'}`;
    $('race-overlap-eyebrow').textContent=`${specs.length}-model detection overlap`;
    for(const spec of specs){
      const card=document.createElement('article');card.className=`card race-model ${spec.race.cardClass||''}`.trim();card.dataset.raceModel=spec.key;
      const head=document.createElement('div');head.className='side-head';const left=document.createElement('div');
      appendText(left,'span',spec.race.badge||String(spec.model.year||''),`pill ${spec.race.badgeClass||''}`.trim());appendText(left,'h2',spec.label);
      const backend=appendText(head,'div','not loaded','tiny');backend.id=`race-${spec.prefix}-backend`;head.prepend(left);card.appendChild(head);
      const stage=document.createElement('div');stage.className='race-stage';const canvas=document.createElement('canvas');canvas.id=`race-${spec.prefix}-canvas`;canvas.hidden=true;
      const empty=appendText(stage,'div',spec.race.emptyText||'Waiting for a race image.','empty');empty.id=`race-${spec.prefix}-empty`;stage.prepend(canvas);card.appendChild(stage);
      const metrics=document.createElement('div');metrics.className='metrics';
      for(const metric of spec.race.metrics||[]){
        const row=document.createElement('div');row.className='metric';appendText(row,'span',metric.label);
        const value=appendText(row,'b',metric.value??metric.initial??'—');if(metric.slot){value.id=`race-${spec.prefix}-${metric.slot}`;value.dataset.raceInitial=metric.initial??'—';}
        metrics.appendChild(row);
      }
      card.appendChild(metrics);
      if(spec.race.progress){
        const progress=document.createElement('div');progress.className='model-progress';const bar=document.createElement('div');bar.className='model-progress-bar';bar.id=`race-${spec.prefix}-progress-bar`;progress.appendChild(bar);card.appendChild(progress);
        const caption=appendText(card,'div',spec.race.progressText||'Model not loaded.','progress-caption');caption.id=`race-${spec.prefix}-progress-text`;
      }
      if(Array.isArray(spec.model.ui?.links)&&spec.model.ui.links.length){
        const links=document.createElement('div');links.className='links race-links';
        for(const link of spec.model.ui.links){const a=document.createElement('a');a.href=link.url;a.textContent=link.label;if(/^https?:/i.test(link.url)){a.target='_blank';a.rel='noreferrer'}links.appendChild(a)}
        card.appendChild(links);
      }
      results.appendChild(card);

      const row=document.createElement('div');row.className='race-benchmark-row';appendText(row,'span',spec.label);
      for(const slot of['backend','p50','p90','total','cv']){const cell=appendText(row,'b','—');cell.id=`rb-${spec.prefix}-${slot}`;}
      bench.appendChild(row);

      const arch=document.createElement('div');appendText(arch,'strong',spec.label);appendText(arch,'span',spec.race.architecture||spec.model.family||'');architecture.appendChild(arch);

      if(spec.workCanvasId&&!$(spec.workCanvasId)){const hiddenCanvas=document.createElement('canvas');hiddenCanvas.id=spec.workCanvasId;hiddenCanvas.hidden=true;work.appendChild(hiddenCanvas)}
    }
    for(let i=0;i<specs.length;i++)for(let j=i+1;j<specs.length;j++){
      const a=specs[i],b=specs[j],cell=document.createElement('div');appendText(cell,'span',`${a.label} ↔ ${b.label} matches`);const value=appendText(cell,'b','—');value.id=`race-match-${a.prefix}-${b.prefix}`;diff.appendChild(cell);
    }
    for(const spec of specs){const cell=document.createElement('div');appendText(cell,'span',`${spec.label} unmatched by other models`);const value=appendText(cell,'b','—');value.id=`race-only-${spec.prefix}`;diff.appendChild(cell)}
  }
  renderRaceScaffold();
  async function releaseRaceRuntimes(exceptKey=''){const released=await runtimeRegistry.releaseAll({exceptKey,capability:'race',group:'general-object'});if(BLACKBOX)for(const key of released)bbResident[key]=false}
  function getDiagnosticSelection(){
    const specs=getRaceSpecs(null,null,{benchmarking:true});
    if(!BLACKBOX)return specs.map(x=>x.key);
    const boxes=[...document.querySelectorAll('[data-diag-model]')];
    const keys=boxes.filter(x=>x.checked).map(x=>x.dataset.diagModel).filter(key=>specs.some(s=>s.key===key));
    writeLocal(BB_SELECTION_KEY,keys);
    return keys;
  }
  function getDiagnosticBackendSelection(){const out={};document.querySelectorAll('[data-diag-backend]').forEach(select=>{if(select.value&&select.value!=='auto')out[select.dataset.diagBackend]=select.value});writeLocal(BB_BACKEND_KEY,out);return out}
  async function copyText(value,button){if(!button)return false;let copied=false;try{if(navigator.clipboard&&typeof navigator.clipboard.writeText==='function'){await navigator.clipboard.writeText(value);copied=true}}catch(_){}if(!copied){const area=document.createElement('textarea');area.value=value;area.readOnly=true;area.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';document.body.appendChild(area);area.focus();area.select();area.setSelectionRange(0,area.value.length);try{copied=document.execCommand('copy')}catch(_){}area.remove()}const originalText=button.textContent;button.textContent=copied?'Copied':'Copy failed';setTimeout(()=>{button.textContent=originalText},1200);return copied}
  async function copyBlackbox(){const el=$('race-diag-blackbox'),button=$('race-diag-copy');if(!el||!button)return;await copyText(el.textContent||'',button)}
  function fullDiagnosticPayload(){const ssd=api.getBaselineDiagnosticState?.()||{};return{schema:'vision-evolution-lab-diagnostic-v2',build:document.documentElement.dataset.build||'unknown',diagnosticMode:DIAG_MODE,userAgent:String(navigator.userAgent||'').slice(0,600),runtimeConfig:{ortVersion:registry.runtime.ort,ortMode:registry.runtime.directOrtMode||BOOT.ortMode||'unknown',ortEntrypoint:registry.runtime.directOrtEntrypoint||BOOT.ortEntrypoint||'unknown',ortSelectionReason:registry.runtime.directOrtReason||BOOT.reason||'unknown',ortOverride:BOOT.override||'',isIOS:Boolean(BOOT.isIOS),actualOrtWasmArtifact:(registry.runtime.directOrtMode||BOOT.ortMode)==='standard-wasm'?'ort-wasm-simd-threaded.wasm':'ort-wasm-simd-threaded.jsep.wasm',wasmThreads:ssd.wasmThreads??null,transformersJsVersion:registry.runtime.transformersJs},capabilities:{navigatorGpu:Boolean(navigator.gpu),cacheApi:'caches'in window,performanceMemory:Boolean(performance.memory),hardwareConcurrency:navigator.hardwareConcurrency||null,deviceMemory:navigator.deviceMemory||null,crossOriginIsolated:Boolean(window.crossOriginIsolated)},matrix:bbMatrix,previous:bbPrevious,critical:bbCritical,crash:bbMatrixCrash(bbMatrix),snapshot:bbSnapshot(),memoryProxies:bbMemoryProxies(),events:bbEvents.slice(-(DEEP?200:40)),notes:{processRss:'not exposed by browser',wasmMemory:'not exposed by current runtime APIs',httpCacheHit:'not reliably exposed by fetch; app Cache API hit/miss is logged separately',ortArtifactInference:'artifact family follows the selected official ORT bundle; the browser does not expose native process RSS or allocator ownership',webgpuDeviceLost:'not observed because the diagnostic does not create a second adapter/device for library-owned WebGPU runtimes',imagePixelsPersisted:false,localFilePathPersisted:false}}}
  async function copyFullDiagnostic(){const button=$('race-diag-copy-full');if(!button)return;await copyText(JSON.stringify(fullDiagnosticPayload(),null,2),button)}
  function saveMatrix(next){bbMatrix={...next,ortMode:registry.runtime.directOrtMode||BOOT.ortMode||'unknown'};writeLocal(BB_MATRIX_KEY,bbMatrix);updateMatrixControls();renderBlackbox()}
  function updateMatrixControls(){if(!BLACKBOX)return;const run=$('race-diag-matrix'),stop=$('race-diag-matrix-stop'),status=$('race-diag-matrix-status');if(!run||!stop||!status)return;const resumable=bbMatrix&&bbMatrix.active&&['ready','interrupted','stopped','error','waiting'].includes(bbMatrix.phase);run.textContent=resumable?'Resume reclamation matrix':'Run reclamation matrix R1–R4 ×10';run.disabled=!state.image||state.benchmarking||matrixRunning;stop.disabled=!matrixRunning;status.textContent='Matrix: '+bbMatrixText(bbMatrix)+' · '+bbMatrixResultsText(bbMatrix)}
  function applyMatrixCase(def){document.querySelectorAll('[data-diag-model]').forEach(x=>x.checked=DIAGNOSTIC_BASELINE_KEYS.includes(x.dataset.diagModel));const settle=$('race-diag-settle');bbSettleMs=0;if(settle)settle.value='0';writeLocal(BB_SETTLE_KEY,0);for(const [key,mode] of Object.entries({yolox:'wasm',rtdetr:'wasm'})){const select=document.querySelector(`[data-diag-backend="${key}"]`);if(!select||![...select.options].some(x=>x.value===mode))throw new Error(`Matrix ${def.id}: ${key} ${mode} backend is unavailable.`);select.value=mode}bbPlan=getDiagnosticSelection();bbBackendPlan=getDiagnosticBackendSelection();renderBlackbox()}
  function stopBackendMatrix(){if(!matrixRunning)return;matrixStopRequested=true;if(bbMatrix)saveMatrix({...bbMatrix,phase:'stopping'});setStatus('Reclamation matrix will stop after the current ×20 attempt.','loading')}
  function recoverInterruptedMatrix(){if(!bbMatrix||!bbMatrix.active||!['running','stopping','waiting'].includes(bbMatrix.phase))return;if(bbMatrix.phase==='waiting'){saveMatrix({...bbMatrix,phase:'interrupted',interruptedAt:new Date().toISOString()});return}const abrupt=bbPrevious&&!bbPrevious.orderlyExit,def=MATRIX_CASES[bbMatrix.caseIndex]||MATRIX_CASES.find(x=>x.id===bbMatrix.currentCase);if(!abrupt||!def){saveMatrix({...bbMatrix,phase:'interrupted',interruptedAt:new Date().toISOString()});return}const caseAttempt=bbMatrix.currentAttempt||((bbMatrix.completedInCase||0)+1),criticalMatches=DEEP&&bbCritical&&Number(bbCritical.attempt)===Number(bbPrevious.attempt)&&bbCritical.matrixCase===def.id&&Number(bbCritical.matrixAttempt)===Number(caseAttempt),crash={caseId:def.id,attempt:caseAttempt,stage:(criticalMatches?bbCritical.stage:'')||bbPrevious.stage||'unknown',at:new Date().toISOString()},results={...(bbMatrix.results||{}),[def.id]:{status:'abrupt-reload',attempt:crash.attempt,stage:crash.stage,at:crash.at}},nextCaseIndex=(bbMatrix.caseIndex||0)+1,done=nextCaseIndex>=MATRIX_CASES.length;bbCrash=crash;writeLocal(BB_CRASH_KEY,crash);saveMatrix({...bbMatrix,results,lastCrash:crash,active:!done,phase:done?'complete':'interrupted',caseIndex:nextCaseIndex,completedInCase:0,currentAttempt:0,waitUntil:0,lastReloadAt:crash.at})}
  async function runBackendMatrix(){if(!BLACKBOX||!state.image||state.benchmarking||matrixRunning)return;matrixRunning=true;matrixStopRequested=false;let current=bbMatrix;if(!current||!current.active||current.phase==='complete'){bbCrash=null;writeLocal(BB_CRASH_KEY,null);current={active:true,phase:'ready',caseIndex:0,completedInCase:0,currentAttempt:0,attemptsPerCase:MATRIX_ATTEMPTS,results:{},startedAt:new Date().toISOString()}}else current={...current,active:true,phase:'ready'};saveMatrix(current);try{while(bbMatrix&&bbMatrix.active&&bbMatrix.caseIndex<MATRIX_CASES.length){if(matrixStopRequested)break;const def=MATRIX_CASES[bbMatrix.caseIndex];applyMatrixCase(def);const remaining=Math.max(0,Number(bbMatrix.waitUntil||0)-Date.now());if(remaining>0){saveMatrix({...bbMatrix,phase:'waiting'});setStatus(`Matrix ${def.id} · waiting ${Math.ceil(remaining/1000)} s before next attempt…`,'loading');await sleepMs(remaining);if(matrixStopRequested)break;saveMatrix({...bbMatrix,phase:'ready',waitUntil:0})}const attempt=(bbMatrix.completedInCase||0)+1;saveMatrix({...bbMatrix,phase:'running',currentCase:def.id,currentAttempt:attempt,lastStartedAt:new Date().toISOString()});setStatus(`Matrix ${def.id} · attempt ${attempt}/${bbMatrix.attemptsPerCase} · ${def.label}`,'loading');const ok=await benchmarkRace(true,{keepFinalResident:def.keepResident});if(!ok){saveMatrix({...bbMatrix,phase:'error',active:true,lastError:'benchmark-error'});break}const caseDone=attempt>=bbMatrix.attemptsPerCase,results={...(bbMatrix.results||{})};if(caseDone)results[def.id]={status:'complete',attempts:attempt,at:new Date().toISOString()};const nextCaseIndex=caseDone?bbMatrix.caseIndex+1:bbMatrix.caseIndex,done=nextCaseIndex>=MATRIX_CASES.length,delayMs=!caseDone?def.delayMs:0,waitUntil=delayMs?Date.now()+delayMs:0;saveMatrix({...bbMatrix,results,active:!done,phase:done?'complete':delayMs?'waiting':'ready',caseIndex:nextCaseIndex,completedInCase:caseDone?0:attempt,currentAttempt:0,waitUntil,lastCompletedAt:new Date().toISOString(),lastError:''});if(done){setStatus('Reclamation matrix finished; see per-case results.');break}if(matrixStopRequested){saveMatrix({...bbMatrix,active:true,phase:'stopped'});break}if(delayMs){setStatus(`Matrix ${def.id} · waiting ${delayMs/1000} s for reclamation…`,'loading');await sleepMs(delayMs);if(matrixStopRequested)break;saveMatrix({...bbMatrix,phase:'ready',waitUntil:0})}await sleepFrame()}}finally{if(matrixStopRequested&&bbMatrix&&bbMatrix.active&&bbMatrix.phase!=='stopped')saveMatrix({...bbMatrix,phase:'stopped'});matrixRunning=false;matrixStopRequested=false;updateMatrixControls()}}
  function setupDiagnosticControls(){
    if(!BLACKBOX)return;
    const diagnostics=$('race-diagnostics'),tools=$('race-blackbox-tools'),wrap=$('race-diag-controls'),models=$('race-diag-models'),backends=$('race-diag-backends'),settle=$('race-diag-settle'),copyRow=$('race-diag-copy-row'),copyButton=$('race-diag-copy'),copyFullButton=$('race-diag-copy-full'),matrixButton=$('race-diag-matrix'),matrixStop=$('race-diag-matrix-stop');
    if(!diagnostics||!tools||!wrap||!models)return;
    const specs=getRaceSpecs(null,null,{benchmarking:true}),known=new Set(specs.map(x=>x.key)),saved=readLocal(BB_SELECTION_KEY,null),selected=Array.isArray(saved)?saved.filter(x=>known.has(x)):specs.map(x=>x.key),settleOptions=[0,250,1000,3000],savedSettle=Number(readLocal(BB_SETTLE_KEY,0)),savedBackends=readLocal(BB_BACKEND_KEY,{});
    bbSettleMs=settleOptions.includes(savedSettle)?savedSettle:0;if(settle){settle.value=String(bbSettleMs);settle.addEventListener('change',()=>{const next=Number(settle.value);bbSettleMs=settleOptions.includes(next)?next:0;writeLocal(BB_SETTLE_KEY,bbSettleMs);renderBlackbox()})}
    models.replaceChildren();
    for(const spec of specs){
      const label=document.createElement('label'),box=document.createElement('input'),text=document.createElement('span');
      label.style.cssText='display:inline-flex;align-items:center;gap:5px;margin:2px 10px 2px 0';
      box.type='checkbox';box.dataset.diagModel=spec.key;box.checked=selected.includes(spec.key);
      box.addEventListener('change',()=>{bbPlan=getDiagnosticSelection();renderBlackbox()});
      text.textContent=spec.label;label.append(box,text);models.appendChild(label);
    }
    if(backends){backends.replaceChildren();for(const spec of specs){if(!Array.isArray(spec.diagnosticBackends)||!spec.diagnosticBackends.length)continue;const label=document.createElement('label'),select=document.createElement('select'),text=document.createElement('span');label.style.cssText='display:inline-flex;align-items:center;gap:6px;margin:4px 12px 2px 0';select.dataset.diagBackend=spec.key;text.textContent=spec.label+' backend';for(const option of spec.diagnosticBackends){if(option.available&&!option.available())continue;const el=document.createElement('option');el.value=option.value;el.textContent=option.label;select.appendChild(el)}const savedMode=savedBackends&&savedBackends[spec.key];select.value=[...select.options].some(x=>x.value===savedMode)?savedMode:'auto';select.addEventListener('change',()=>{bbBackendPlan=getDiagnosticBackendSelection();renderBlackbox()});label.append(text,select);backends.appendChild(label)}}
    const setAll=checked=>{models.querySelectorAll('[data-diag-model]').forEach(x=>x.checked=checked);bbPlan=getDiagnosticSelection();renderBlackbox()};
    $('race-diag-all').addEventListener('click',()=>setAll(true));
    $('race-diag-none').addEventListener('click',()=>setAll(false));
    recoverInterruptedMatrix();bbCrash=bbCrash||bbMatrixCrash(bbMatrix);diagnostics.hidden=false;tools.hidden=false;if(copyButton)copyButton.addEventListener('click',copyBlackbox);if(copyFullButton)copyFullButton.addEventListener('click',copyFullDiagnostic);if(matrixButton)matrixButton.addEventListener('click',runBackendMatrix);if(matrixStop)matrixStop.addEventListener('click',stopBackendMatrix);bbPlan=getDiagnosticSelection();bbBackendPlan=getDiagnosticBackendSelection();for(const spec of specs)if(!(spec.key in bbResident))bbResident[spec.key]=false;updateMatrixControls();renderBlackbox();
  }
  function setDiagnosticControlsDisabled(disabled){if(!BLACKBOX)return;document.querySelectorAll('[data-diag-model],[data-diag-backend]').forEach(x=>x.disabled=disabled);$('race-diag-all').disabled=disabled;$('race-diag-none').disabled=disabled;const settle=$('race-diag-settle');if(settle)settle.disabled=disabled;updateMatrixControls()}
  const visible=d=>d.filter(x=>x.score>=threshold());
  function compare(a,b){const aa=visible(a),bb=visible(b),used=new Set();let both=0;for(const old of aa){let best=-1,bi=0;for(let i=0;i<bb.length;i++){if(used.has(i)||bb[i].label!==old.label)continue;const v=iou(old.box,bb[i].box);if(v>=.35&&v>bi){best=i;bi=v}}if(best>=0){used.add(best);both++}}return{both,aOnly:aa.length-both,bOnly:bb.length-both}}
  function hasMatch(det,list){return list.some(other=>other.label===det.label&&iou(det.box,other.box)>=.35)}
  function currentRaceSpecs(){return getRaceSpecs(null,null,{benchmarking:false})}
  async function updateAccuracy(){
    const body=$('race-accuracy-body'),note=$('race-accuracy-note');if(!body||!note)return;
    if(state.sampleId!=='coco397133'){body.replaceChildren();note.textContent='Ground-truth scoring is available for the bundled COCO validation image only. Other inputs remain a visual/runtime comparison.';return}
    const specs=currentRaceSpecs(),completed=specs.filter(spec=>Array.isArray(state.lastRun[spec.key]?.detections));
    if(!completed.length){body.replaceChildren();note.textContent='Run the Model Race to populate this same-image ground-truth check.';return}
    let data;try{const response=await fetch('assets/benchmark/coco-val-000000397133.annotations.json',{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);data=await response.json()}catch(error){note.textContent='COCO sample annotations could not be loaded: '+String(error.message||error);return}
    const allTargets=data.instances.map(item=>({label:item.label,box:[item.bbox[1]/data.height,item.bbox[0]/data.width,(item.bbox[1]+item.bbox[3])/data.height,(item.bbox[0]+item.bbox[2])/data.width]}));
    body.replaceChildren();for(const spec of completed){
      const targets=spec.key==='tinyyolo'?allTargets.filter(item=>registry.labels.vocCanonical.includes(item.label)):allTargets;
      const result=window.VisionDetectionMetrics.evaluate(state.lastRun[spec.key].detections,targets,{confidence:threshold(),iouThreshold:.5}),row=document.createElement('div');row.className='race-benchmark-row accuracy-row';
      for(const text of [spec.label,`${(result.precision*100).toFixed(1)}%`,`${(result.recall*100).toFixed(1)}%`,`${(result.f1*100).toFixed(1)}%`,`${result.truePositives} / ${result.falsePositives} / ${result.falseNegatives}`]){const cell=document.createElement(text===spec.label?'span':'b');cell.textContent=text;row.appendChild(cell)}body.appendChild(row);
    }
    const partial=completed.length<specs.length?` Showing ${completed.length}/${specs.length} models; failed or not-yet-run models are omitted.`:'';
    note.textContent=`COCO val 397133 · confidence ≥ ${threshold().toFixed(2)} · same class and IoU ≥ 0.50. Tiny YOLOv2 is scored only on the ${allTargets.filter(item=>registry.labels.vocCanonical.includes(item.label)).length} ground-truth boxes whose classes overlap Pascal VOC; other models use all ${allTargets.length}. Single-image precision / recall / F1 is not COCO AP or a general model ranking.${partial}`;
  }
  function updateOverlap(){
    const specs=currentRaceSpecs();
    if(!specs.length||!specs.every(spec=>Array.isArray(state.lastRun[spec.key]?.detections)))return;
    for(let i=0;i<specs.length;i++)for(let j=i+1;j<specs.length;j++){
      const a=specs[i],b=specs[j],cell=$(`race-match-${a.prefix}-${b.prefix}`);
      if(cell)cell.textContent=String(compare(state.lastRun[a.key].detections,state.lastRun[b.key].detections).both);
    }
    for(const spec of specs){
      const own=visible(state.lastRun[spec.key].detections),others=specs.filter(other=>other.key!==spec.key).map(other=>visible(state.lastRun[other.key].detections));
      const unmatched=own.filter(det=>others.every(list=>!hasMatch(det,list))).length,cell=$(`race-only-${spec.prefix}`);
      if(cell)cell.textContent=String(unmatched);
    }
  }
  function updateRaceCard(spec,result){
    const empty=$(`race-${spec.prefix}-empty`),canvas=$(`race-${spec.prefix}-canvas`),backend=$(`race-${spec.prefix}-backend`);
    if(empty)empty.hidden=true;if(canvas)canvas.hidden=false;if(backend)backend.textContent=spec.backend()||'—';
    const set=(slot,value)=>{const el=$(`race-${spec.prefix}-${slot}`);if(el)el.textContent=value};
    if(Number.isFinite(result.width)&&Number.isFinite(result.height))set('input',result.width+'×'+result.height);
    set('inf',ms(result.infMs));set('total',ms(result.totalMs));set('count',String(result.visible));
    if(Number.isFinite(result.retained))set('retained',Number.isFinite(result.retentionThreshold)?result.retained+' @ ≥'+result.retentionThreshold.toFixed(2):String(result.retained));
    if(Number.isFinite(result.droppedInvalid))set('invalid',String(result.droppedInvalid));
  }
  function redrawRaceResults(){
    if(!state.image||state.running||state.benchmarking)return;
    let redrawn=false;
    for(const spec of currentRaceSpecs()){
      const run=state.lastRun[spec.key];if(!run)continue;
      const canvas=$(`race-${spec.prefix}-canvas`);if(!canvas)continue;
      prepareDisplay(state.image,canvas);run.visible=api.drawDetections(canvas,run.detections);const count=$(`race-${spec.prefix}-count`);if(count)count.textContent=String(run.visible);redrawn=true;
    }
    if(redrawn){updateOverlap();updateAccuracy();setStatus('Confidence '+threshold().toFixed(2)+' applied to retained race outputs without new inference.')}
  }
  function resetRaceUi(){
    for(const spec of currentRaceSpecs()){
      const empty=$(`race-${spec.prefix}-empty`),canvas=$(`race-${spec.prefix}-canvas`),backend=$(`race-${spec.prefix}-backend`);
      if(empty)empty.hidden=false;if(canvas)canvas.hidden=true;if(backend)backend.textContent='not loaded';
      document.querySelectorAll(`#race-results [id^="race-${spec.prefix}-"][data-race-initial]`).forEach(el=>{el.textContent=el.dataset.raceInitial||'—'});
      const bar=$(`race-${spec.prefix}-progress-bar`),caption=$(`race-${spec.prefix}-progress-text`);if(bar)bar.style.width='0%';if(caption)caption.textContent=spec.race.progressText||'Model not loaded.';
    }
    document.querySelectorAll('#race-benchmark-body b,#race-diff-grid b').forEach(el=>{el.textContent='—'});
    $('race-benchmark-note').textContent='Not benchmarked yet.';
    $('race-accuracy-body').replaceChildren();$('race-accuracy-note').textContent='Load the bundled COCO validation image and run the race to compare detections with its 19 official ground-truth boxes. This single image is a smoke test, not a dataset benchmark or model ranking.';
  }
  function useImage(img,label,sampleId=''){
    const specs=currentRaceSpecs();state.image=img;state.sampleId=sampleId;state.lastRun={};$('race-run').disabled=false;$('race-benchmark').disabled=true;
    if(DIAG){$('race-benchmark-diag').disabled=false;$('race-dispose-diag').disabled=true}
    resetRaceUi();setStatus(label+' ready. Run '+specs.length+' detector generation'+(specs.length===1?'':'s')+' with confidence '+threshold().toFixed(2)+'.');updateMatrixControls();
  }
  $('race-image-file').addEventListener('change',e=>{const file=e.target.files&&e.target.files[0];if(!file)return;if(!file.type.startsWith('image/')){setStatus('Please choose an image file.','error');return}const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);useImage(img,file.name||'Race image')};img.onerror=()=>{URL.revokeObjectURL(url);setStatus('The selected race image could not be decoded.','error')};img.src=url});
  $('race-use-coco-sample').addEventListener('click',()=>{
    const button=$('race-use-coco-sample'),img=new Image();button.disabled=true;
    img.onload=()=>{button.disabled=false;useImage(img,'COCO 2017 val image 397133','coco397133')};
    img.onerror=()=>{button.disabled=false;setStatus('The bundled COCO validation sample could not be loaded.','error')};
    img.src='assets/benchmark/coco-val-000000397133.jpg';
  });
  $('race-use-current').addEventListener('click',()=>{const img=api.getImage();if(!img){setStatus('No Time Machine image is loaded yet.','error');return}useImage(img,'Time Machine image')});
  async function runRace(){
    if(!state.image||state.running)return;
    state.running=true;const image=state.image,specs=getRaceSpecs(image,null,{benchmarking:false});
    $('race-image-file').disabled=true;$('confidence').disabled=true;$('race-run').disabled=true;$('race-benchmark').disabled=true;$('race-use-current').disabled=true;$('race-use-coco-sample').disabled=true;syncConfidence();
    try{
      await releaseRaceRuntimes();
      for(const spec of specs){
        setStatus('Running '+spec.label+'…','loading');
        const canvas=$(`race-${spec.prefix}-canvas`);if(!canvas)throw new Error(`Missing race canvas for ${spec.label}.`);
        try{const result=await spec.run({},canvas);state.lastRun[spec.key]=result;updateRaceCard(spec,result)}
        finally{await spec.release();if(BLACKBOX)bbResident[spec.key]=false}
      }
      updateOverlap();await updateAccuracy();
      const summary=specs.map(spec=>spec.label+' '+(state.lastRun[spec.key]?.visible??0)).join(', ');
      setStatus('Race complete: '+summary+'. Pairwise overlap is shown below.');$('race-benchmark').disabled=false;if(DIAG)$('race-benchmark-diag').disabled=false;
    }catch(err){console.error(err);await updateAccuracy();setStatus(err&&err.message?err.message:String(err),'error')}
    finally{state.running=false;$('race-image-file').disabled=false;$('confidence').disabled=false;$('race-run').disabled=!state.image;$('race-use-current').disabled=false;$('race-use-coco-sample').disabled=false}
  }
  $('race-run').addEventListener('click',runRace);
  async function runModel(model,source,canvas,{benchmarking=false}={}){const adapter=runtimeRegistry.get(model);if(!adapter)throw new Error(`Unknown runnable model: ${model}`);return adapter.run(source,canvas,{benchmarking})}
  function getRuntimeInfo(model){return runtimeRegistry.get(model)?.runtimeInfo?.()||{}}
  function setBench(prefix,backend,samples){const root=$(`rb-${prefix}-backend`);if(!root)return;const inf=samples.map(x=>x.infMs),tot=samples.map(x=>x.totalMs);root.textContent=backend;$(`rb-${prefix}-p50`).textContent=ms(median(inf));$(`rb-${prefix}-p90`).textContent=ms(percentile(inf,.9));$(`rb-${prefix}-total`).textContent=ms(median(tot));$(`rb-${prefix}-cv`).textContent=`${cv(inf).toFixed(1)}%`}
  async function benchmarkRace(diagnostic=false,options={}){
    if(!state.image||state.benchmarking)return;
    const image=state.image,hidden=document.createElement('canvas'),allSpecs=getRaceSpecs(image,hidden,{benchmarking:true}),selectedKeys=diagnostic?getDiagnosticSelection():allSpecs.map(x=>x.key),specs=allSpecs.filter(x=>selectedKeys.includes(x.key));
    if(!specs.length){setStatus('Select at least one diagnostic model.','error');return}
    const traceKey=diagnostic?specs[specs.length-1].key:'',keepFinalResident=diagnostic&&options.keepFinalResident!==false,keepKey=keepFinalResident?traceKey:'',runs=20,settleMs=diagnostic?bbSettleMs:0,backendPlan=diagnostic?{...bbBackendPlan}:{};let keptResident=false,benchmarkSucceeded=false;
    state.benchmarking=true;bbPlan=specs.map(x=>x.key);
    $('race-image-file').disabled=true;$('race-use-current').disabled=true;$('race-use-coco-sample').disabled=true;$('confidence').disabled=true;$('race-benchmark').disabled=true;$('race-run').disabled=true;
    if(DIAG){$('race-benchmark-diag').disabled=true;$('race-dispose-diag').disabled=true}
    if(diagnostic){bbAttempt+=1;writeLocal(BB_ATTEMPT_KEY,bbAttempt);setDiagnosticControlsDisabled(true);writeDiag('diagnostic-start',{attempt:bbAttempt,plan:[...bbPlan],keepResident:keepKey||null,settleMs,backendPlan})}
    try{
      await releaseRaceRuntimes();
      if(diagnostic)writeDiag('pre-benchmark-cleanup-complete',{plan:[...bbPlan],settleMs,backendPlan});
      for(let specIndex=0;specIndex<specs.length;specIndex++){
        const spec=specs[specIndex],samples=[],requestedBackend=backendPlan[spec.key]||'auto',runOptions=requestedBackend==='auto'?{}:{forceBackend:requestedBackend,allowFallback:false};bbCurrentModel=spec.key;bbRequestedBackend=requestedBackend;
        try{
          if(diagnostic)writeDiag(spec.key+'-start');
          $('race-benchmark-note').textContent=spec.label+': warm-up…';
          await spec.run(runOptions);if(BLACKBOX)bbResident[spec.key]=true;
          if(diagnostic)writeDiag(spec.key+'-warmup-complete');
          await sleepFrame();
          for(let i=0;i<runs;i++){
            const runNo=i+1,traceRun=diagnostic&&spec.key===traceKey;
            $('race-benchmark-note').textContent=spec.label+': '+runNo+'/'+runs+' warm runs…';
            if(traceRun)writeDiag(spec.key+'-run-'+runNo+'-start',{run:runNo,runs});
            const result=await spec.run(runOptions);samples.push({infMs:result.infMs,totalMs:result.totalMs});
            if(traceRun)writeDiag(spec.key+'-run-'+runNo+'-complete',{run:runNo,runs});
            await sleepFrame();
          }
          setBench(spec.prefix,spec.backend(),samples);
          if(diagnostic)writeDiag(spec.key+'-20-complete');
        }finally{
          if(diagnostic&&spec.key===keepKey){
            keptResident=true;writeDiag(spec.key+'-dispose-skipped',{keptResident:true});
          }else if(spec.release){
            if(diagnostic)writeDiag(spec.key+'-dispose-start');
            await spec.release();if(BLACKBOX)bbResident[spec.key]=false;
            if(diagnostic)writeDiag(spec.key+'-dispose-complete');
          }
          hidden.width=1;hidden.height=1;await sleepFrame();if(DEEP&&diagnostic)deepStage(spec.key+'-post-release-frame',{model:spec.key,requestedBackend,configuredWaitMs:settleMs});
          if(diagnostic&&settleMs>0&&specIndex<specs.length-1){writeDiag(spec.key+'-settle-start',{model:spec.key,requestedBackend,settleMs});await sleepMs(settleMs);await sleepFrame();writeDiag(spec.key+'-settle-complete',{model:spec.key,requestedBackend,settleMs})}
        }
      }
      const kept=specs[specs.length-1];
      const boundaries=specs.map(spec=>spec.label+': '+spec.timingBoundary).join(' · ');
      $('race-benchmark-note').textContent=diagnostic?(keepFinalResident?`Diagnostic complete: ${kept.label} intentionally remains resident. Wait 30 seconds; use “Dispose resident” only for a separate disposal probe.`:`Diagnostic complete: ${kept.label} will be disposed before the attempt returns.`):`20 sequential warm runs per model complete. Source image and UI confidence were locked. Only one model runtime was kept resident at a time; startup remains excluded. Timing boundaries: ${boundaries}.`;
      setStatus(diagnostic?`Diagnostic ×20 complete · plan: ${specs.map(x=>x.label).join(' → ')} · ${keepFinalResident?kept.label+' resident':'final runtime disposed'}.`:`${specs.length}-generation warm benchmark complete.`);
      if(diagnostic){writeDiag('diagnostic-results-rendered',{plan:[...bbPlan],keptResident:keepKey||null});$('race-dispose-diag').disabled=!keepFinalResident}benchmarkSucceeded=true
    }catch(err){
      console.error(err);if(diagnostic)writeDiag('diagnostic-error',{message:err&&err.message?err.message:String(err),plan:[...bbPlan]});
      $('race-benchmark-note').textContent='Benchmark failed: '+(err.message||err);setStatus(err.message||String(err),'error');
    }finally{
      if(diagnostic){writeDiag('diagnostic-finally-start',{keepResident:keptResident?keepKey:null});await releaseRaceRuntimes(keptResident?keepKey:'');writeDiag(keptResident?'diagnostic-finally-complete-'+keepKey+'-resident':'diagnostic-finally-complete-no-resident',{keepResident:keptResident?keepKey:null});setDiagnosticControlsDisabled(false)}
      else await releaseRaceRuntimes();
      hidden.width=1;hidden.height=1;bbCurrentModel='';bbRequestedBackend='';state.benchmarking=false;$('race-image-file').disabled=false;$('race-use-current').disabled=false;$('race-use-coco-sample').disabled=false;$('confidence').disabled=false;$('race-benchmark').disabled=false;$('race-run').disabled=false;if(DIAG)$('race-benchmark-diag').disabled=false;updateMatrixControls();
    }
    return benchmarkSucceeded;
  }
  async function diagnosticDisposeResident(){if(!DIAG||state.benchmarking)return;writeDiag('manual-resident-dispose-start',{resident:{...bbResident}});$('race-dispose-diag').disabled=true;setStatus('Diagnostic: disposing resident race runtimes now…','loading');try{await releaseRaceRuntimes();writeDiag('manual-resident-dispose-complete');setStatus('Diagnostic: resident runtime disposal completed without reload.')}catch(err){writeDiag('manual-resident-dispose-error',{message:err&&err.message?err.message:String(err)});setStatus(err.message||String(err),'error')}}
  setupDiagnosticControls();
  $('race-benchmark').addEventListener('click',()=>benchmarkRace(false));
  $('race-benchmark-diag').addEventListener('click',()=>benchmarkRace(true));
  $('race-dispose-diag').addEventListener('click',diagnosticDisposeResident);
  window.VisionRace=Object.freeze({runRace,benchmarkRace,runModel,getRuntimeInfo,getHeadMaps:()=>state.lastHeadMaps,getRTBackend:()=>state.rtBackend});
})();
