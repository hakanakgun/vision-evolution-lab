  (() => {
    'use strict';

    const REGISTRY = window.VisionModels;
    const MODEL = REGISTRY && REGISTRY.ssd;
    const ModelLoader = window.VisionModelLoader;
    const RuntimeRegistry = window.VisionRuntimeRegistry;
    if(!REGISTRY || !MODEL || !ModelLoader || !RuntimeRegistry) throw new Error('Model registry/runtime/loader failed to initialize.');

    const COCO = Object.freeze({1:'person',2:'bicycle',3:'car',4:'motorcycle',5:'airplane',6:'bus',7:'train',8:'truck',9:'boat',10:'traffic light',11:'fire hydrant',13:'stop sign',14:'parking meter',15:'bench',16:'bird',17:'cat',18:'dog',19:'horse',20:'sheep',21:'cow',22:'elephant',23:'bear',24:'zebra',25:'giraffe',27:'backpack',28:'umbrella',31:'handbag',32:'tie',33:'suitcase',34:'frisbee',35:'skis',36:'snowboard',37:'sports ball',38:'kite',39:'baseball bat',40:'baseball glove',41:'skateboard',42:'surfboard',43:'tennis racket',44:'bottle',46:'wine glass',47:'cup',48:'fork',49:'knife',50:'spoon',51:'bowl',52:'banana',53:'apple',54:'sandwich',55:'orange',56:'broccoli',57:'carrot',58:'hot dog',59:'pizza',60:'donut',61:'cake',62:'chair',63:'couch',64:'potted plant',65:'bed',67:'dining table',70:'toilet',72:'tv',73:'laptop',74:'mouse',75:'remote',76:'keyboard',77:'cell phone',78:'microwave',79:'oven',80:'toaster',81:'sink',82:'refrigerator',84:'book',85:'clock',86:'vase',87:'scissors',88:'teddy bear',89:'hair drier',90:'toothbrush'});

    const $ = id => document.getElementById(id);
    const DEFAULT_MODEL = REGISTRY.defaults?.timeMachine || Object.keys(REGISTRY).find(key=>REGISTRY[key]?.status==='runnable'&&RuntimeRegistry.capabilityEnabled(REGISTRY[key],'timeMachine')) || 'yolox';
    const DEFAULT_LIVE_MODEL = REGISTRY.defaults?.live || RuntimeRegistry.modelKeys.find(key=>RuntimeRegistry.capabilityEnabled(REGISTRY[key],'live')) || '';
    const state = {activeModel:DEFAULT_MODEL,liveModel:DEFAULT_LIVE_MODEL,cameraStartToken:0,cameraFacing:'environment',cameraCanFlip:false,cameraZoom:null,cameraZoomChanging:false,liveInference:Promise.resolve(),liveTransition:Promise.resolve(),liveLoopToken:0,liveSwitching:false,runtimeTransition:Promise.resolve(),session:null, provider:'', modelBuffer:null, image:null, lastResults:null, lastRunResult:null, lastDims:null, live:false, stream:null, liveSamples:[], liveFrameCount:0,inferenceCount:0,running:false,benchmarking:false,historyExperiment:'',historyTransition:Promise.resolve(),modelDownloadController:null,modelDownloadConsentResolver:null,modelDownloadModel:''};

    if (!window.ort || !window.WebAssembly) {
      $('unsupported').textContent = 'This browser is missing WebAssembly or ONNX Runtime failed to load. Try a current Chrome, Edge, Safari, or Firefox build.';
      $('unsupported').classList.add('show');
      return;
    }

    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
    const WASM_THREADS = window.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    ort.env.wasm.numThreads = WASM_THREADS;

    function ms(v){ return Number.isFinite(v) ? `${v.toFixed(v < 10 ? 2 : 1)} ms` : '—'; }
    function bytes(v){ if(!v) return '—'; const mb=v/1048576; return `${mb.toFixed(mb<10?2:1)} MB`; }
    function setStatus(message, kind=''){ const el=$('status'); el.textContent=message; el.className=`status ${kind}`.trim(); }
    function setMetric(id,value){ $(id).textContent=value; }
    function activeModel(){ return REGISTRY[state.activeModel] || MODEL; }
    function resetRunMetrics(){['m-pre','m-inf','m-post','m-total','m-count'].forEach(id=>setMetric(id,'—'));setMetric('m-run-label','not run');state.lastResults=null;state.lastRunResult=null;state.lastDims=null;state.inferenceCount=0;}
    function resetStartupMetrics(){setMetric('m-download','—');setMetric('m-init','—');$('m-progress-bar').style.width='0%';$('m-progress-text').textContent='No model transfer yet.';$('backend-badge').textContent='Not loaded';}
    function drawSourceOnly(source=state.image){if(!source)return;const canvas=$('image-canvas'),{w,h}=sourceSize(source),scale=Math.min(1,640/Math.max(w,h));canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);$('image-empty').hidden=true;canvas.hidden=false;}
    function renderProvenance(model){const ui=model.ui||{};$('active-provenance-title').textContent=model.title;$('active-provenance-text').textContent=ui.provenance||`${model.family} · ${model.license}`;const links=$('active-provenance-links');links.replaceChildren();for(const link of ui.links||[]){const a=document.createElement('a');a.href=link.url;a.textContent=link.label;a.target='_blank';a.rel='noreferrer';links.appendChild(a);}}
    function updateActiveModelUI(){const model=activeModel(),ui=model.ui||{},runtimeUi=ui.runtime||{},inspection=model.capabilities?.inspection;$('active-model-title').textContent=model.title;$('active-model-subtitle').textContent=ui.subtitle||`${model.task} · ${model.family}`;$('rerun').textContent=`Run ${model.title}`;$('m-transfer-label').textContent='Model transfer';$('m-init-label').textContent=runtimeUi.initLabel||'Session init';setMetric('m-bytes',runtimeUi.bytesText||bytes(model.bytes));setMetric('m-cache',runtimeUi.cacheInitial||'checking…');setMetric('d-input',inspection&&typeof inspection==='object'?inspection.input:(model.input?`${model.input}×${model.input}`:'dynamic'));$('input-size').textContent=state.image?'Source ready · not run':'No input';renderProvenance(model);updateInsideModelUI(state.activeModel,state.lastRunResult,state.image);}
    async function updateActiveCacheState(){const key=state.activeModel,model=activeModel();if(!Array.isArray(model.sources)||!model.sources.length)return;try{const info=await ModelLoader.status(model);if(state.activeModel===key)setMetric('m-cache',info.source?`${info.state} · ${info.source}`:info.state);}catch(_){}}
    function selectActiveModel(key,{scroll=true}={}){
      if(state.running||state.benchmarking){setStatus('Finish the current run or benchmark before switching models.');return;}
      if(!REGISTRY[key]||!RuntimeRegistry.capabilityEnabled(REGISTRY[key],'timeMachine'))return;
      const previousKey=state.activeModel;
      state.historyExperiment='';state.historyTransition=Promise.resolve(window.VisionHistoryExperiments?.clear?.());state.activeModel=key;syncHistoryControls();
      if(previousKey!==key){const previousAdapter=RuntimeRegistry.get(previousKey);state.runtimeTransition=state.runtimeTransition.catch(()=>{}).then(async()=>{if(state.live&&state.liveModel===previousKey)return;await state.liveInference.catch(()=>{});await previousAdapter?.release();}).catch(error=>console.warn('Previous model runtime release failed',error));}
      resetRunMetrics();resetBenchmark();resetStartupMetrics();updateActiveModelUI();updateActiveCacheState();renderLiveModels();
      if(state.image){
        drawSourceOnly();
        setStatus('Running '+activeModel().title+' on the current Time Machine image…','loading');
        void runUploaded();
      }else setStatus(activeModel().title+' selected. Choose an image to run this generation.');
      if(scroll)$('image-stage')?.scrollIntoView({behavior:'smooth',block:'center'});
    }
    function reportRuntimeEvent(model,event){if(model!==state.activeModel||!event)return;if(event.type==='progress')updateMainModelProgress(event.info||{});if(event.type==='cache')setMetric('m-cache',event.text||'checking…');if(event.type==='runtime'){if(event.backend)$('backend-badge').textContent=event.dtype?`${String(event.backend).toUpperCase()} · ${event.dtype}`:String(event.backend).toUpperCase();if(Number.isFinite(event.downloadMs))setMetric('m-download',ms(event.downloadMs));if(Number.isFinite(event.initMs))setMetric('m-init',ms(event.initMs));if(event.bytes)setMetric('m-bytes',bytes(event.bytes));if(event.source)setMetric('m-cache',event.cacheState?`${event.cacheState} · ${event.source}`:event.source);}}
    let diagnosticHook=null,baselineSessionRuns=0;
    function traceDiagnostic(event,meta={}){if(typeof diagnosticHook!=='function')return;try{diagnosticHook(event,meta)}catch(_){}}

    function supportsWasmSimd(){
      try{
        const probe=Uint8Array.from([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,8,1,6,0,65,0,253,15,11]);
        return WebAssembly.validate(probe);
      }catch(_){ return false; }
    }
    async function detectBrowser(){
      const ua=navigator.userAgent,brands=navigator.userAgentData&&navigator.userAgentData.brands?navigator.userAgentData.brands:[],braveBrand=brands.find(function(x){return /Brave/i.test(x.brand||'');});
      if(braveBrand)return 'Brave '+(braveBrand.version||'')+' · '+(/iPhone|iPad|iPod/.test(ua)?'WebKit':'Blink');
      if(navigator.brave&&typeof navigator.brave.isBrave==='function'){try{if(await navigator.brave.isBrave())return /iPhone|iPad|iPod/.test(ua)?'Brave · WebKit':'Brave';}catch(_){}}
      const match=function(re,name){const m=ua.match(re);return m?name+' '+m[1]:'';};
      if(/iPhone|iPad|iPod/.test(ua))return match(/CriOS\/([\d.]+)/,'Chrome iOS')||match(/FxiOS\/([\d.]+)/,'Firefox iOS')||match(/EdgiOS\/([\d.]+)/,'Edge iOS')||match(/OPiOS\/([\d.]+)/,'Opera iOS')||(/Version\/([\d.]+).*Safari/.test(ua)?'Safari-compatible · brand may be masked':'iOS browser · brand not exposed');
      return match(/Edg\/([\d.]+)/,'Edge')||match(/Chrome\/([\d.]+)/,'Chrome')||match(/Firefox\/([\d.]+)/,'Firefox')||match(/Version\/([\d.]+).*Safari/,'Safari')||'Unknown';
    }
    function detectEngine(){const ua=navigator.userAgent;if(/iPhone|iPad|iPod/.test(ua))return 'WebKit · iOS required';if(/Edg|Chrome/.test(ua))return 'Blink';if(/Firefox/.test(ua))return 'Gecko';if(/Safari/.test(ua))return 'WebKit';return 'not exposed';}
    function detectOS(){const ua=navigator.userAgent;if(/iPhone|iPad|iPod/.test(ua)){const m=ua.match(/OS ([\d_]+)/);return m?'iOS · UA '+m[1].replaceAll('_','.'):'iOS · version not exposed';}if(/Windows NT/.test(ua)){const m=ua.match(/Windows NT ([\d.]+)/);return m?'Windows NT '+m[1]:'Windows';}if(/Mac OS X/.test(ua)){const m=ua.match(/Mac OS X ([\d_]+)/);return m?'macOS '+m[1].replaceAll('_','.'):'macOS';}if(/Android/.test(ua)){const m=ua.match(/Android ([\d.]+)/);return m?'Android '+m[1]:'Android';}if(/Linux/.test(ua))return 'Linux';return (navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||'Unknown';}
    async function populateDiagnostics(){const runtime=REGISTRY.runtime||{},mode=runtime.directOrtMode||'unknown',entry=runtime.directOrtEntrypoint||'unknown';setMetric('d-browser','detecting…');setMetric('d-engine',detectEngine());setMetric('d-os',detectOS());setMetric('d-cpu',navigator.hardwareConcurrency?String(navigator.hardwareConcurrency):'not exposed');setMetric('d-memory',navigator.deviceMemory?'~'+navigator.deviceMemory+' GB':'not exposed');setMetric('d-webgpu',navigator.gpu?'available':'unavailable');setMetric('d-ort',(mode==='standard-wasm'?'standard WASM · ':'JSEP/WebGPU · ')+entry);setMetric('d-simd',supportsWasmSimd()?'supported':'unavailable');setMetric('d-threads',String(WASM_THREADS));setMetric('d-isolated',window.crossOriginIsolated?'yes':'no');setMetric('d-browser',await detectBrowser());}
    populateDiagnostics();

    function timeMachineEntries(){
      return (REGISTRY.timeline||[]).filter(entry=>!entry.model||(REGISTRY[entry.model]&&RuntimeRegistry.capabilityEnabled(REGISTRY[entry.model],'timeMachine')));
    }
    function timelineDate(entry){const month=Number(entry?.month),names=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return Number.isInteger(month)&&month>=1&&month<=12?`${names[month-1]} ${entry.year}`:String(entry?.year??'');}
    function timelineModelEntry(key){return (REGISTRY.timeline||[]).find(entry=>entry.model===key)||REGISTRY[key]||{};}
    function timelineExperimentEntry(key){return (REGISTRY.timeline||[]).find(entry=>entry.experiment===key)||REGISTRY.historyExperiments?.[key]||{};}
    function updateEvolutionNote(){
      const entry=state.historyExperiment?timelineExperimentEntry(state.historyExperiment):timelineModelEntry(state.activeModel),text=entry?.evolution||'This milestone keeps its native task and runtime contract; no broader capability is inferred.';
      $('timeline-evolution-title').textContent='What changed in this generation?';
      $('timeline-evolution-text').textContent=text;
    }
    function renderTimeline(){
      const track=$('timeline-track'),entries=timeMachineEntries();if(!track)return;
      track.replaceChildren();
      for(const entry of entries){
        const runnable=Boolean(entry.model),experiment=Boolean(entry.experiment),jump=Boolean(entry.jump),item=document.createElement(runnable||experiment||jump?'button':'div');
        item.className=['milestone',runnable?'runnable runnable-launch':'',experiment?'historical-experiment':'',jump?'module-launch':'',entry.kind==='research'?'research-only':'',entry.kind==='historical'?'historical-only':'',entry.className||'',runnable&&!state.historyExperiment&&entry.model===state.activeModel?'active':'',experiment&&entry.experiment===state.historyExperiment?'active':''].filter(Boolean).join(' ');
        if(runnable){item.type='button';item.dataset.runnableModel=entry.model;item.setAttribute('aria-label','Select '+entry.title+' '+timelineDate(entry));item.setAttribute('aria-pressed',String(!state.historyExperiment&&entry.model===state.activeModel))}
        else if(experiment){item.type='button';item.dataset.historyExperiment=entry.experiment;item.setAttribute('aria-label','Run '+entry.title+' on the current Time Machine image');item.setAttribute('aria-pressed',String(entry.experiment===state.historyExperiment))}
        else if(jump){item.type='button';item.dataset.jump=entry.jump;item.setAttribute('aria-label','Open '+entry.title)}
        const dot=document.createElement('div');dot.className='dot';const year=document.createElement('div');year.className='year';year.textContent=timelineDate(entry);
        const strong=document.createElement('strong');strong.textContent=entry.title;const note=document.createElement('span');note.textContent=entry.note||'';
        item.append(dot,year,strong,note);track.appendChild(item);
      }
    }
    function timeMachineInspectionModels(){
      const seen=new Set(),out=[];
      for(const entry of timeMachineEntries()){if(!entry.model||seen.has(entry.model))continue;const model=REGISTRY[entry.model],inspection=model?.capabilities?.inspection;if(!inspection||typeof inspection!=='object'||!inspection.comparison)continue;seen.add(entry.model);out.push({key:entry.model,model,inspection})}
      return out;
    }
    function renderPreprocessingComparison(){
      const table=$('preprocess-table'),items=timeMachineInspectionModels();if(!table)return;table.replaceChildren();
      const fields=[['Input','input'],['Resize','resize'],['Padding','padding'],['Layout','layout'],['Dtype','dtype'],['Channel order','channels']],minWidth=Math.max(560,120+items.length*118);
      const makeRow=(label,field,head=false)=>{const row=document.createElement('div');row.className='preprocess-row'+(head?' preprocess-head':'');row.style.gridTemplateColumns=`.65fr repeat(${Math.max(1,items.length)},1fr)`;row.style.minWidth=minWidth+'px';const first=document.createElement('span');first.textContent=label;row.appendChild(first);for(const item of items){const cell=document.createElement('b');cell.textContent=head?(item.inspection.comparison.label||item.model.title):(item.inspection.comparison[field]||'—');row.appendChild(cell)}table.appendChild(row)};
      makeRow('',null,true);for(const [label,field] of fields)makeRow(label,field,false);
    }
    renderTimeline();renderPreprocessingComparison();

    function selectTab(id){
      document.querySelectorAll('.tab').forEach(btn => btn.setAttribute('aria-selected', String(btn.dataset.tab === id)));
      document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('active', panel.id === id));
      if(id !== 'live-camera' && state.live) stopCamera();
      document.dispatchEvent(new CustomEvent('vision:tabchange',{detail:{tab:id}}));
    }
    document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => selectTab(btn.dataset.tab)));
    document.querySelectorAll('[data-jump]').forEach(btn => btn.addEventListener('click', () => selectTab(btn.dataset.jump)));
    document.querySelectorAll('[data-history-experiment]').forEach(btn=>btn.addEventListener('click',()=>selectHistoryExperiment(btn.dataset.historyExperiment)));
    $('history-run').addEventListener('click',()=>void runUploaded());
    $('history-release').addEventListener('click',()=>void window.VisionHistoryExperiments?.release());
    function syncHistoryControls(){
      const active=Boolean(state.historyExperiment),spec=REGISTRY.historyExperiments?.[state.historyExperiment];
      $('history-experiment-panel').hidden=!active;$('rerun').hidden=active;$('benchmark').hidden=active;
      $('confidence').disabled=active||state.running||state.benchmarking;
      $('history-run').disabled=!state.image||state.running||state.benchmarking||!active;
      document.querySelectorAll('[data-runnable-model]').forEach(button=>{const selected=!active&&button.dataset.runnableModel===state.activeModel;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected))});
      document.querySelectorAll('[data-history-experiment]').forEach(button=>{const selected=button.dataset.historyExperiment===state.historyExperiment;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected))});
      $('timeline-selection').textContent=active&&spec?spec.year+' · '+spec.title:timelineDate(timelineModelEntry(state.activeModel))+' · '+activeModel().title;
      updateEvolutionNote();
      if(active&&spec){
        $('history-experiment-title').textContent=spec.year+' · '+spec.title;
        $('history-experiment-description').textContent=spec.description||'This historical method runs on the selected Time Machine image.';
        $('history-experiment-note').textContent=spec.note||'This method keeps its native task and output type.';
        if(!state.image)$('history-status').textContent='Choose an image above, then run this experiment on the same image.';
      }
    }
    function selectHistoryExperiment(key,{scroll=true}={}){
      if(state.running||state.benchmarking)return;
      if(!REGISTRY.historyExperiments?.[key])return;
      if(key!=='alexnet-classification'){$('history-classification').hidden=true;$('history-classification-results').replaceChildren()}
      state.historyExperiment=key;syncHistoryControls();
      const spec=REGISTRY.historyExperiments[key];
      resetRunMetrics();resetBenchmark();resetStartupMetrics();updateInsideModelUI(state.activeModel,null,state.image);
      $('active-model-title').textContent=spec.year+' · '+spec.title;
      $('active-model-subtitle').textContent=spec.task+' · historical experiment';
      $('input-size').textContent=state.image?'Same source image · historical experiment':'No input';
      if(state.image){setStatus('Running '+spec.title+' on the current Time Machine image…','loading');void runUploaded();}
      else setStatus(spec.title+' selected. Choose one image above to run this historical method.');
      if(scroll)$('image-stage')?.scrollIntoView({behavior:'smooth',block:'center'});
    }
    syncHistoryControls();

    function updateScrollCue(shell){
      const area=shell.querySelector('[data-scroll-area]');
      if(!area) return;
      const canScroll=area.scrollWidth>area.clientWidth+2;
      const atEnd=area.scrollLeft+area.clientWidth>=area.scrollWidth-6;
      shell.classList.toggle('can-scroll',canScroll);
      shell.classList.toggle('at-end',!canScroll||atEnd);
    }
    document.querySelectorAll('[data-scroll-shell]').forEach(shell=>{
      const area=shell.querySelector('[data-scroll-area]');
      if(area) area.addEventListener('scroll',()=>updateScrollCue(shell),{passive:true});
      updateScrollCue(shell);
    });
    window.addEventListener('resize',()=>document.querySelectorAll('[data-scroll-shell]').forEach(updateScrollCue));

    function updateMainModelProgress(info){
      const pct=Number.isFinite(info.percent)?Math.max(0,Math.min(100,info.percent)):null;
      const bar=$('m-progress-bar');if(bar)bar.style.width=pct===null?'18%':`${pct.toFixed(1)}%`;
      const text=$('m-progress-text');if(text)text.textContent=pct===null?`${bytes(info.loaded)} downloaded`:`${pct.toFixed(0)}% · ${bytes(info.loaded)} / ${bytes(info.total)}`;
      if(state.modelDownloadController&&state.modelDownloadModel===state.activeModel){
        const warning=$('model-download-warning'),warningText=$('model-download-warning-text');
        warning?.classList.add('downloading');
        if(warningText)warningText.textContent=pct===null
          ?`${bytes(info.loaded)} downloaded. You can cancel this transfer without uploading your image.`
          :`${pct.toFixed(0)}% · ${bytes(info.loaded)} / ${bytes(info.total)} downloaded. You can cancel this transfer at any time.`;
      }
    }
    function networkTransferHint(){
      const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
      if(!connection)return{cellular:false,saveData:false,text:'This browser does not expose whether the connection is Wi-Fi or cellular.'};
      const type=String(connection.type||'').toLowerCase(),cellular=type==='cellular',saveData=connection.saveData===true;
      if(cellular&&saveData)return{cellular,saveData,text:'The browser reports a cellular connection with Data Saver enabled.'};
      if(cellular)return{cellular,saveData,text:'The browser reports a cellular connection.'};
      if(saveData)return{cellular,saveData,text:'The browser reports Data Saver enabled; connection type is not treated as cellular unless explicitly exposed.'};
      if(type)return{cellular,saveData,text:`The browser reports connection type: ${type}.`};
      return{cellular,saveData,text:'Connection type is not exposed by this browser.'};
    }
    function largeDownloadPolicy(model){const policy=model?.downloadPolicy;if(!policy||policy.enabled===false)return null;const threshold=Number(policy.warningBytes)||100*1048576;return Number(model?.bytes)>=threshold?policy:null}
    function hideModelDownloadWarning(){
      const warning=$('model-download-warning');if(warning){warning.hidden=true;warning.classList.remove('downloading')}
      const go=$('model-download-continue'),cancel=$('model-download-cancel');if(go)go.hidden=false;if(cancel)cancel.textContent='Not now';
    }
    function settleModelDownloadConsent(value){
      const resolve=state.modelDownloadConsentResolver;state.modelDownloadConsentResolver=null;
      if(resolve)resolve(Boolean(value));
    }
    async function confirmLargeModelDownload(model){
      const policy=largeDownloadPolicy(model);if(!policy)return true;
      const cache=await ModelLoader.status(model).catch(()=>({state:'not cached'}));
      if(cache.state==='memory'||cache.state==='browser cache')return true;
      const hint=networkTransferHint(),warning=$('model-download-warning'),title=$('model-download-warning-title'),text=$('model-download-warning-text'),go=$('model-download-continue'),cancel=$('model-download-cancel');
      if(!warning||!title||!text||!go||!cancel)return true;
      title.textContent=hint.cellular?'Large model · cellular data warning':'Large model download';
      const prefix=`${model.title} requires about ${bytes(model.bytes)} before local inference can start.`;
      text.textContent=`${prefix} ${hint.text} The transfer stays on your device cache; your selected image is not uploaded.`;
      go.textContent=`Download ${bytes(model.bytes)}`;go.hidden=false;cancel.textContent='Not now';warning.classList.remove('downloading');warning.hidden=false;
      return await new Promise(resolve=>{state.modelDownloadConsentResolver=resolve});
    }
    function beginModelDownload(model){
      const policy=largeDownloadPolicy(model);if(!policy)return null;
      const controller=new AbortController();state.modelDownloadController=controller;state.modelDownloadModel=state.activeModel;
      const warning=$('model-download-warning'),go=$('model-download-continue'),cancel=$('model-download-cancel'),title=$('model-download-warning-title');
      if(warning){warning.hidden=false;warning.classList.add('downloading')}if(go)go.hidden=true;if(cancel)cancel.textContent='Cancel download';if(title)title.textContent='Downloading '+model.title;
      return controller;
    }
    function endModelDownload(){
      state.modelDownloadController=null;state.modelDownloadModel='';hideModelDownloadWarning();
    }
    $('model-download-continue')?.addEventListener('click',()=>settleModelDownloadConsent(true));
    $('model-download-cancel')?.addEventListener('click',()=>{
      if(state.modelDownloadController){state.modelDownloadController.abort();return}
      settleModelDownloadConsent(false);hideModelDownloadWarning();
    });
    async function fetchModel(){
      if(state.modelBuffer){if(state.activeModel==='ssd'){setMetric('m-download',ms(0));setMetric('m-bytes',bytes(state.modelBuffer.byteLength));setMetric('m-cache','memory');}traceDiagnostic('ssd-raw-buffer-reuse',{bytes:state.modelBuffer.byteLength});return {buffer:state.modelBuffer,downloadMs:0,cacheState:'memory'};}
      setStatus('Loading the pinned SSD checkpoint…','loading');
      const result=await ModelLoader.load(MODEL,{onState:info=>setMetric('m-cache',info.state+(info.source?` · ${info.source}`:'')),onProgress:updateMainModelProgress,onTrace:diagnosticHook?(event,meta)=>traceDiagnostic('ssd-loader-'+event,meta):undefined});
      state.modelBuffer=result.buffer;traceDiagnostic('ssd-arraybuffer-obtained',{bytes:result.buffer.byteLength,cacheState:result.cacheState});setMetric('m-download',ms(result.downloadMs));setMetric('m-bytes',bytes(result.buffer.byteLength));setMetric('m-cache',`${result.cacheState} · ${result.source}`);return result;
    }
    ModelLoader.status(MODEL).then(info=>setMetric('m-cache',info.source?`${info.state} · ${info.source}`:info.state)).catch(()=>{});
    function releaseBaselineRawBuffer(){const had=Boolean(state.modelBuffer),bufferBytes=state.modelBuffer?.byteLength||0;state.modelBuffer=null;ModelLoader.evictMemory(MODEL);if(had)traceDiagnostic('ssd-raw-buffer-reference-release',{bytes:bufferBytes,referencePresent:false})}
    async function releaseBaselineRuntime(){const session=state.session,methodPresent=Boolean(session&&typeof session.release==='function'),provider=state.provider||'';state.session=null;baselineSessionRuns=0;releaseBaselineRawBuffer();if(!session)return;const start=performance.now();traceDiagnostic('ssd-release-start',{provider,methodPresent,jsReferenceNull:true});try{if(methodPresent)await session.release();traceDiagnostic('ssd-release-complete',{provider,methodPresent,jsReferenceNull:true,durationMs:performance.now()-start})}catch(err){traceDiagnostic('ssd-release-error',{provider,methodPresent,name:err?.name||'Error',message:String(err?.message||err).slice(0,300),durationMs:performance.now()-start});console.warn('Baseline session release failed',err)}}

    async function createSession(forceProvider=''){
      if(state.session && (!forceProvider || state.provider===forceProvider)){if(state.activeModel==='ssd'){$('backend-badge').textContent=state.provider.toUpperCase();setMetric('m-init','reused');setMetric('m-cache','memory');}if(baselineSessionRuns===0)traceDiagnostic('ssd-session-reuse',{provider:state.provider||'',freshInit:false});return state.session;}
      traceDiagnostic('ssd-runtime-init-start',{requestedProvider:forceProvider||'configured'});
      const {buffer}=await fetchModel();traceDiagnostic('ssd-session-buffer-ready',{bytes:buffer.byteLength});
      const configured=MODEL.executionProviders || (navigator.gpu ? ['webgpu','wasm'] : ['wasm']);
      const candidates=forceProvider ? [forceProvider] : configured.filter(provider => provider !== 'webgpu' || navigator.gpu);
      let lastError;
      for(const provider of candidates){
        try{
          setStatus(`Initializing ${provider.toUpperCase()} session…`, 'loading');traceDiagnostic('ssd-session-create-start',{provider,bytes:buffer.byteLength});
          const start=performance.now();
          const session=await ort.InferenceSession.create(buffer, {executionProviders:[provider], graphOptimizationLevel:'all'});
          const initMs=performance.now()-start;
          const previous=state.session;
          state.session=session; state.provider=provider;baselineSessionRuns=0;traceDiagnostic('ssd-session-create-complete',{provider,durationMs:initMs,freshInit:true});
          if(previous && previous!==session && typeof previous.release==='function'){
            try{ await previous.release(); }catch(releaseError){ console.warn('Session release failed', releaseError); }
          }
          releaseBaselineRawBuffer();
          setMetric('m-init', ms(initMs));
          $('backend-badge').textContent=provider.toUpperCase();
          const note=MODEL.providerNote && provider==='wasm' ? ` ${MODEL.providerNote}` : ' First inference can include backend compilation overhead.';
          setStatus(`Model ready on ${provider.toUpperCase()}.${note}`);
          return session;
        }catch(err){ lastError=err;traceDiagnostic('ssd-session-create-error',{provider,name:err?.name||'Error',message:String(err?.message||err).slice(0,300)}); console.warn(`Provider ${provider} failed`, err); }
      }
      releaseBaselineRawBuffer();
      throw lastError || new Error('No compatible execution provider was available.');
    }

    function sourceSize(source){
      if(source instanceof HTMLVideoElement) return {w:source.videoWidth,h:source.videoHeight};
      return {w:source.naturalWidth || source.width,h:source.naturalHeight || source.height};
    }

    function prepareSource(source, targetCanvas){
      const {w,h}=sourceSize(source);
      if(!w || !h) throw new Error('Input has no readable dimensions.');
      const scale=Math.min(1, MODEL.maxSide/Math.max(w,h));
      const width=Math.max(1,Math.round(w*scale));
      const height=Math.max(1,Math.round(h*scale));
      const input=$('input-canvas');
      input.width=width; input.height=height;
      targetCanvas.width=width; targetCanvas.height=height;
      const ictx=input.getContext('2d',{willReadFrequently:true});
      const vctx=targetCanvas.getContext('2d');
      ictx.drawImage(source,0,0,width,height);
      vctx.drawImage(source,0,0,width,height);
      const rgba=ictx.getImageData(0,0,width,height).data;
      const rgb=new Uint8Array(width*height*3);
      for(let s=0,d=0;s<rgba.length;s+=4){rgb[d++]=rgba[s];rgb[d++]=rgba[s+1];rgb[d++]=rgba[s+2];}
      state.lastDims={sourceW:w,sourceH:h,width,height};
      return {rgb,width,height};
    }

    function inspectionFor(modelKey){const model=REGISTRY[modelKey];const inspection=model?.capabilities?.inspection;return inspection&&typeof inspection==='object'?inspection:null}
    function prepareInsidePreview(modelKey,source){
      if(!source)return null;const spec=inspectionFor(modelKey);if(!spec)return null;
      const size=sourceSize(source),w=size.w,h=size.h,src=$('inside-source-preview'),preview=$('inside-input-preview'),maxPreview=420,srcScale=Math.min(1,maxPreview/Math.max(w,h));
      src.width=Math.max(1,Math.round(w*srcScale));src.height=Math.max(1,Math.round(h*srcScale));src.getContext('2d').drawImage(source,0,0,src.width,src.height);
      const cfg=spec.preview||{},ctx=preview.getContext('2d');let iw,ih;
      if(cfg.mode==='aspect-max'){const scale=Math.min(1,(cfg.maxSide||640)/Math.max(w,h));iw=Math.max(1,Math.round(w*scale));ih=Math.max(1,Math.round(h*scale));preview.width=iw;preview.height=ih;ctx.drawImage(source,0,0,iw,ih)}
      else if(cfg.mode==='letterbox-top-left'){iw=cfg.width||416;ih=cfg.height||416;preview.width=iw;preview.height=ih;const fill=Number.isFinite(cfg.fill)?cfg.fill:114;ctx.fillStyle=`rgb(${fill},${fill},${fill})`;ctx.fillRect(0,0,iw,ih);const ratio=Math.min(iw/w,ih/h),rw=Math.max(1,Math.floor(w*ratio)),rh=Math.max(1,Math.floor(h*ratio));ctx.drawImage(source,0,0,rw,rh)}
      else if(cfg.mode==='short-long-pad32'){const shortSide=cfg.shortSide||800,longSide=cfg.longSide||1333,ratio=Math.min(shortSide/Math.min(w,h),longSide/Math.max(w,h)),rw=Math.max(1,Math.floor(w*ratio)),rh=Math.max(1,Math.floor(h*ratio)),multiple=cfg.multiple||32;iw=Math.ceil(rw/multiple)*multiple;ih=Math.ceil(rh/multiple)*multiple;preview.width=iw;preview.height=ih;ctx.fillStyle='rgb(0,0,0)';ctx.fillRect(0,0,iw,ih);ctx.drawImage(source,0,0,rw,rh)}
      else{iw=cfg.width||640;ih=cfg.height||640;preview.width=iw;preview.height=ih;ctx.drawImage(source,0,0,iw,ih)}
      src.hidden=false;preview.hidden=false;$('inside-source-empty').hidden=true;$('inside-input-empty').hidden=true;setMetric('inside-source-size',w+'×'+h);setMetric('inside-model-size',iw+'×'+ih);return{w,h,iw,ih};
    }
    function insideShape(spec,dims){if(!dims)return'No image yet';const shape=spec.shape||{},channels=shape.channels||3;return shape.layout==='NHWC'?`1 × ${dims.ih} × ${dims.iw} × ${channels}`:`1 × ${channels} × ${dims.ih} × ${dims.iw}`}
    function renderScalarHeatmaps(maps){
      const grid=$('feature-map-grid');grid.replaceChildren();
      for(const map of maps){
        if(!map||!Number.isFinite(map.grid)||!map.data)continue;
        const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption'),size=208;
        canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d'),tiny=document.createElement('canvas');tiny.width=map.grid;tiny.height=map.grid;const tctx=tiny.getContext('2d'),img=tctx.createImageData(map.grid,map.grid);
        let max=0;for(const value of map.data)if(Number.isFinite(value)&&value>max)max=value;const denominator=max||1;
        for(let i=0;i<map.data.length;i++){const value=Math.max(0,Math.min(1,Number(map.data[i]||0)/denominator)),offset=i*4;img.data[offset]=Math.round(28+value*210);img.data[offset+1]=Math.round(48+value*160);img.data[offset+2]=Math.round(42+value*70);img.data[offset+3]=255}
        tctx.putImageData(img,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(tiny,0,0,size,size);caption.textContent=map.label||((Number.isFinite(map.stride)?'stride '+map.stride+' · ':'')+map.grid+'×'+map.grid);figure.append(canvas,caption);grid.appendChild(figure);
      }
    }
    function renderInspectionData(spec,data){
      const grid=$('feature-map-grid');
      if(spec.intermediate.renderer==='scalar-heatmaps'&&Array.isArray(data)&&data.length){renderScalarHeatmaps(data);grid.hidden=false;$('inside-intermediate-empty').hidden=true;return true}
      grid.replaceChildren();grid.hidden=true;$('inside-intermediate-empty').hidden=false;return false;
    }
    function showUnavailableInspection(model,source){
      $('inside-active-model').textContent=model.title;$('inside-active-contract').textContent='Following Time Machine selection · inspection surface not exposed';
      $('inside-step2-title').textContent='Model-specific preprocessing';$('inside-step2-text').textContent='No inspectable preprocessing presentation is registered for this model.';
      $('inside-step3-title').textContent='Runtime tensor';$('inside-step3-text').textContent='Tensor presentation is intentionally unavailable rather than inferred.';
      $('inside-step4-title').textContent=model.family||'Model';$('inside-step4-text').textContent='Run-time detections remain available through Time Machine.';
      for(const [id,value] of [['inside-resize-policy','not exposed'],['inside-tensor','not exposed'],['inside-channels','not exposed'],['inside-normalization','not exposed'],['inside-model-size','—']])setMetric(id,value);
      $('inside-size').textContent='Inspection unavailable';$('inside-input-caption').textContent='Inspection unavailable';$('inside-source-preview').hidden=true;$('inside-input-preview').hidden=true;$('inside-source-empty').hidden=false;$('inside-input-empty').hidden=false;
      if(source){const size=sourceSize(source);setMetric('inside-source-size',size.w+'×'+size.h);$('inside-source-empty').textContent='Source available · inspection disabled'}else{setMetric('inside-source-size','—');$('inside-source-empty').textContent='Source image'}
      $('feature-map-grid').hidden=true;$('inside-intermediate-empty').hidden=false;$('inside-intermediate-title').textContent=model.title+' intermediate tensors not exposed';$('inside-intermediate-subtitle').textContent='No inspection adapter registered';$('inside-intermediate-note').textContent='No simulated intermediate tensors are shown.';$('feature-map-status').textContent='Intermediate activations not exposed';$('inside-summary').textContent=model.title+' selected. This model has no registered Inside the Model presentation contract.';
    }
    function updateInsideModelUI(modelKey,result,source){
      modelKey=modelKey||state.activeModel;result=result||null;source=source||state.image;const model=REGISTRY[modelKey]||activeModel(),spec=inspectionFor(modelKey);if(!spec){showUnavailableInspection(model,source);return}
      $('inside-active-model').textContent=model.title;$('inside-active-contract').textContent='Following Time Machine selection · '+spec.input+' · '+spec.tensor;
      for(const [slot,idTitle,idText] of [['step2','inside-step2-title','inside-step2-text'],['step3','inside-step3-title','inside-step3-text'],['step4','inside-step4-title','inside-step4-text']]){const step=spec.pipeline[slot];$(idTitle).textContent=step.title;$(idText).textContent=step.text}
      setMetric('inside-resize-policy',spec.resize);setMetric('inside-tensor',spec.tensor);setMetric('inside-channels',spec.channels);setMetric('inside-normalization',spec.normalization);$('inside-input-caption').textContent=spec.preview.caption;
      const dims=prepareInsidePreview(modelKey,source);if(dims)$('inside-size').textContent=insideShape(spec,dims);else{$('inside-size').textContent='No image yet';$('inside-source-preview').hidden=true;$('inside-input-preview').hidden=true;$('inside-source-empty').hidden=false;$('inside-input-empty').hidden=false;setMetric('inside-source-size','—');setMetric('inside-model-size',spec.input)}
      const adapter=RuntimeRegistry.get(modelKey),inspectionData=result?adapter?.inspectionData?.():null,expectsData=spec.intermediate.data==='adapter',hasRenderedData=expectsData&&renderInspectionData(spec,inspectionData);
      if(!expectsData)renderInspectionData(spec,null);$('inside-intermediate-title').textContent=spec.intermediate.title;$('inside-intermediate-subtitle').textContent=spec.intermediate.subtitle;$('inside-intermediate-note').textContent=spec.intermediate.note;
      $('inside-intermediate-empty').textContent=expectsData?(spec.intermediate.statusEmpty||'Run the model to populate real inspection data.'):(spec.intermediate.emptyText||'This model exposes its real preprocessing contract and detections, but no registered intermediate activation tensor.');
      $('feature-map-status').textContent=expectsData?(hasRenderedData?(spec.intermediate.statusReady||'Live inspection data available'):(spec.intermediate.statusEmpty||'Run the model to populate real inspection data.')):(spec.intermediate.status||'Intermediate activations not exposed');
      if(result){const retained=Number.isFinite(result.retained)?result.retained:(result.detections?result.detections.length:0),visible=Number.isFinite(result.visible)?result.visible:0,inf=Number.isFinite(result.infMs)?' · inference '+ms(result.infMs):'',invalid=Number.isFinite(result.droppedInvalid)&&result.droppedInvalid>0?' · dropped '+result.droppedInvalid+' invalid boxes':'';$('inside-summary').textContent=model.title+': '+visible+' visible at UI confidence '+Number($('confidence').value).toFixed(2)+' · '+retained+' retained outputs'+invalid+inf+'. '+spec.resultNote}else $('inside-summary').textContent=model.title+' selected. The preview reflects its native preprocessing contract; run the model to populate runtime output details.';
    }

    function pick(results, text){
      const key=Object.keys(results).find(name => name.toLowerCase().includes(text));
      if(!key) throw new Error(`Expected model output not found: ${text}`);
      return results[key];
    }

    function decode(results){
      const num=pick(results,'num_detections').data;
      const boxes=pick(results,'detection_boxes').data;
      const scores=pick(results,'detection_scores').data;
      const classes=pick(results,'detection_classes').data;
      const count=Math.min(Math.round(Number(num[0] || scores.length)), scores.length, 100);
      const out=[];
      for(let i=0;i<count;i++){
        const o=i*4;
        const classId=Math.round(Number(classes[i]));
        out.push({score:Number(scores[i]),classId,label:COCO[classId] || `class ${classId}`,box:[Number(boxes[o]),Number(boxes[o+1]),Number(boxes[o+2]),Number(boxes[o+3])]});
      }
      return out;
    }

    function drawDetections(canvas,detections,confidence=Number($('confidence').value)){
      const ctx=canvas.getContext('2d');
      const threshold=Number(confidence);
      const kept=detections.filter(d=>d.score>=threshold);
      ctx.lineWidth=Math.max(2,canvas.width/280);
      ctx.font=`600 ${Math.max(12,Math.round(canvas.width/42))}px system-ui,sans-serif`;
      ctx.textBaseline='top';
      for(const d of kept){
        const [top,left,bottom,right]=d.box;
        const x=Math.max(0,left*canvas.width), y=Math.max(0,top*canvas.height);
        const w=Math.min(canvas.width-x,(right-left)*canvas.width), h=Math.min(canvas.height-y,(bottom-top)*canvas.height);
        const label=`${d.label} ${(d.score*100).toFixed(0)}%`;
        const tw=ctx.measureText(label).width+12, th=Math.max(22,canvas.width/34);
        ctx.strokeStyle='#1d6f63';ctx.fillStyle='rgba(29,111,99,.13)';ctx.strokeRect(x,y,w,h);ctx.fillRect(x,y,w,h);
        ctx.fillStyle='#171915';ctx.fillRect(x,Math.max(0,y-th),tw,th);
        ctx.fillStyle='#fff';ctx.fillText(label,x+6,Math.max(1,y-th+3));
      }
      return kept.length;
    }

    async function runWithProviderFallback(session,tensor){
      const run = current => current.run({[current.inputNames[0]]:tensor});
      try{
        return {results:await run(session),session,fallback:false};
      }catch(err){
        if(state.provider!=='webgpu') throw err;
        console.warn('WebGPU OrtRun failed; retrying this inference on WASM', err);
        const failedSession=state.session;
        state.session=null; state.provider='';
        if(failedSession && typeof failedSession.release==='function'){
          try{ await failedSession.release(); }catch(releaseError){ console.warn('WebGPU session release failed', releaseError); }
        }
        const wasmSession=await createSession('wasm');
        setStatus('WebGPU initialized but failed during inference; switched to WASM for this model.');
        return {results:await run(wasmSession),session:wasmSession,fallback:true};
      }
    }

    async function inferSource(source,targetCanvas,{updateMain=true,confidence}={}){
      const session=await createSession(),firstForSession=baselineSessionRuns===0;
      const totalStart=performance.now();
      const preStart=performance.now();if(firstForSession)traceDiagnostic('ssd-first-preprocess-start',{provider:state.provider||''});
      const {rgb,width,height}=prepareSource(source,targetCanvas);
      const tensor=new ort.Tensor('uint8',rgb,[1,height,width,3]);
      const preMs=performance.now()-preStart;
      if(firstForSession)traceDiagnostic('ssd-first-tensor-ready',{provider:state.provider||'',shape:[1,height,width,3],dtype:'uint8',estimatedTensorBytes:rgb.byteLength,estimated:true,canvas:{width,height,estimatedRgbaBytes:width*height*4,estimated:true},preprocessMs:preMs});
      const infStart=performance.now();if(firstForSession)traceDiagnostic('ssd-first-inference-start',{provider:state.provider||''});
      const runResult=await runWithProviderFallback(session,tensor);
      const results=runResult.results;
      const infMs=performance.now()-infStart;if(firstForSession)traceDiagnostic('ssd-first-inference-complete',{provider:state.provider||'',durationMs:infMs});
      baselineSessionRuns++;
      const postStart=performance.now();
      const detections=decode(results);
      const visible=drawDetections(targetCanvas,detections,confidence);
      const postMs=performance.now()-postStart;
      if(firstForSession)traceDiagnostic('ssd-first-postprocess-complete',{provider:state.provider||'',retained:detections.length,visible});
      const totalMs=performance.now()-totalStart;
      const summaryResult={preMs:preMs,infMs:infMs,postMs:postMs,totalMs:totalMs,visible:visible,detections:detections,width:width,height:height,retained:detections.length,retentionThreshold:Number($('confidence').min)||0.1};
      if(updateMain){
        state.lastResults=detections;
        state.inferenceCount++;
        setMetric('m-run-label',state.inferenceCount===1?'first inference':`warm run #${state.inferenceCount}`);
        setMetric('m-pre',ms(preMs));setMetric('m-inf',ms(infMs));setMetric('m-post',ms(postMs));setMetric('m-total',ms(totalMs));setMetric('m-count',String(visible));
        $('input-size').textContent=`${width} × ${height} input`;
        setMetric('d-input',`${width}×${height}`);
        state.lastRunResult=summaryResult;updateInsideModelUI(state.activeModel,summaryResult,source);
        setStatus(`${visible} detection${visible===1?'':'s'} above confidence ${Number($('confidence').value).toFixed(2)}. User pixels stayed in this browser.`);
      }
      return summaryResult;
    }

    function redrawUploaded(){if(!state.image||!state.lastResults)return;const canvas=$('image-canvas');drawSourceOnly();const count=drawDetections(canvas,state.lastResults);setMetric('m-count',String(count));if(state.lastRunResult){state.lastRunResult.visible=count;updateInsideModelUI(state.activeModel,state.lastRunResult,state.image);}setStatus(`${count} detection${count===1?'':'s'} above confidence ${Number($('confidence').value).toFixed(2)}. Retained outputs were re-filtered without new inference.`);}
    function applyExternalRun(model,result,targetCanvas){const runtime=RuntimeRegistry.get(model)?.runtimeInfo?.()||{},modelMeta=REGISTRY[model]||{},runtimeUi=modelMeta.ui?.runtime||{},size=sourceSize(state.image),w=size.w,h=size.h;state.lastResults=result.detections;state.lastRunResult=Object.assign({},result);state.lastDims={sourceW:w,sourceH:h,width:targetCanvas.width,height:targetCanvas.height};state.inferenceCount++;setMetric('m-run-label',state.inferenceCount===1?'first inference':'warm run #'+state.inferenceCount);setMetric('m-pre',ms(result.preMs));setMetric('m-inf',ms(result.infMs));setMetric('m-post',ms(result.postMs));setMetric('m-total',ms(result.totalMs));setMetric('m-count',String(result.visible));const inputWidth=Number.isFinite(result.inputWidth)?result.inputWidth:result.width,inputHeight=Number.isFinite(result.inputHeight)?result.inputHeight:result.height;$('input-size').textContent=inputWidth+' × '+inputHeight+' model input';setMetric('d-input',inputWidth+'×'+inputHeight);if(runtime.backend)$('backend-badge').textContent=runtime.dtype?runtime.backend.toUpperCase()+' · '+runtime.dtype:runtime.backend.toUpperCase();if(Number.isFinite(runtime.downloadMs))setMetric('m-download',ms(runtime.downloadMs));else if(runtimeUi.managedTransferWhenMissing)setMetric('m-download','managed by pipeline');if(Number.isFinite(runtime.initMs))setMetric('m-init',ms(runtime.initMs));if(runtime.bytes)setMetric('m-bytes',bytes(runtime.bytes));if(runtime.cacheState)setMetric('m-cache',runtime.source?runtime.cacheState+' · '+runtime.source:runtime.cacheState);updateInsideModelUI(model,state.lastRunResult,state.image);const boundary=runtimeUi.inferenceBoundaryNote?' '+runtimeUi.inferenceBoundaryNote:'';setStatus(result.visible+' detection'+(result.visible===1?'':'s')+' above confidence '+Number($('confidence').value).toFixed(2)+'.'+boundary);}
    async function runActiveModel(source,targetCanvas,{updateMain=true,benchmarking=false,downloadSignal}={}){const model=state.activeModel,adapter=RuntimeRegistry.get(model);if(!adapter)throw new Error('Active model runtime is not ready. Reload the page and try again.');const result=await adapter.run(source,targetCanvas,{benchmarking,updateMain,downloadSignal});if(updateMain&&!adapter.handlesMainUi&&model===state.activeModel)applyExternalRun(model,result,targetCanvas);return result;}
    async function runUploaded(){
      if(!state.image||state.running||state.benchmarking)return;
      state.running=true;$('image-file').disabled=true;$('confidence').disabled=true;$('rerun').disabled=true;$('benchmark').disabled=true;$('history-run').disabled=true;
      let controller=null;
      try{
        await state.historyTransition;
        await state.runtimeTransition;
        if(state.historyExperiment){
          if(!window.VisionHistoryExperiments)throw new Error('Historical experiment runtime is unavailable.');
          await window.VisionHistoryExperiments.run(state.historyExperiment,state.image);
          setStatus('Historical experiment complete. See its task-specific result above.');
        }else{
          const model=activeModel(),allowed=await confirmLargeModelDownload(model);
          if(!allowed){setStatus(model.title+' was not downloaded. Choose another generation or run it later.');return}
          controller=beginModelDownload(model);
          await runActiveModel(state.image,$('image-canvas'),{downloadSignal:controller?.signal});
        }
      }catch(err){
        if(err?.name==='AbortError')setStatus('Model download cancelled. The selected image stayed local.');
        else{console.error(err);setStatus(err.message||String(err),'error');}
      }finally{
        if(controller&&state.modelDownloadController===controller)endModelDownload();
        state.running=false;$('image-file').disabled=false;$('rerun').disabled=!state.image;$('benchmark').disabled=!state.image;
        syncHistoryControls();
      }
    }

    function percentile(values,p){
      if(!values.length) return NaN;
      const sorted=[...values].sort((a,b)=>a-b);
      const index=Math.max(0,Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1));
      return sorted[index];
    }
    function median(values){
      if(!values.length) return NaN;
      const sorted=[...values].sort((a,b)=>a-b);
      const mid=Math.floor(sorted.length/2);
      return sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
    }
    function resetBenchmark(){
      ['b-inf-med','b-inf-p90','b-inf-range','b-cv','b-total-med','b-fps'].forEach(id=>setMetric(id,'—'));
      $('benchmark-note').textContent='Run one image first, then Benchmark ×20. Startup time is excluded.';
    }
    async function runBenchmark(){
      if(!state.image || state.benchmarking || state.historyExperiment) return;
      state.benchmarking=true;
      $('image-file').disabled=true;
      $('confidence').disabled=true;
      $('benchmark').disabled=true;
      $('rerun').disabled=true;
      const canvas=$('benchmark-canvas');
      const benchmarkImage=state.image;
      const benchmarkModel=state.activeModel;
      const samples=[];
      try{
        await state.runtimeTransition;
        const RUNS=20;
        setStatus(`Running ${RUNS} warm measurements on the same image…`,'loading');
        for(let i=0;i<RUNS;i++){
          const r=await runActiveModel(benchmarkImage,canvas,{updateMain:false,benchmarking:true});
          samples.push(r);
          $('benchmark-note').textContent=`Warm benchmark: ${i+1}/${RUNS} complete. Startup time is excluded.`;
          await new Promise(requestAnimationFrame);
        }
        const inf=samples.map(x=>x.infMs), total=samples.map(x=>x.totalMs);
        const infMed=median(inf);
        const infP90=percentile(inf,.90);
        const mean=inf.reduce((a,b)=>a+b,0)/inf.length;
        const variance=inf.reduce((sum,x)=>sum+(x-mean)*(x-mean),0)/inf.length;
        const cv=mean>0?Math.sqrt(variance)/mean*100:NaN;
        setMetric('b-inf-med',ms(infMed));
        setMetric('b-inf-p90',ms(infP90));
        setMetric('b-inf-range',`${ms(Math.min(...inf))} – ${ms(Math.max(...inf))}`);
        setMetric('b-cv',Number.isFinite(cv)?`${cv.toFixed(1)}%`:'—');
        setMetric('b-total-med',ms(median(total)));
        setMetric('b-fps',infMed>0?(1000/infMed).toFixed(1):'—');
        $('benchmark-note').textContent=REGISTRY[benchmarkModel]?.ui?.runtime?.benchmarkBoundary||'p50, p90, min–max and run-to-run timing variation from 20 sequential warm runs; model transfer and session init excluded.';
        setStatus(`Warm benchmark complete: p50 inference ${ms(infMed)}, p90 ${ms(infP90)}, CV ${cv.toFixed(1)}%.`);
      }catch(err){
        console.error(err);
        setStatus(err.message || String(err),'error');
        $('benchmark-note').textContent='Benchmark failed; current-run metrics were left unchanged.';
      }finally{
        state.benchmarking=false;
        $('image-file').disabled=false;
        $('confidence').disabled=false;
        $('benchmark').disabled=!state.image;
        $('rerun').disabled=!state.image;
      }
    }

    $('image-file').addEventListener('change', async event => {
      const file=event.target.files && event.target.files[0]; if(!file) return;
      if(!file.type.startsWith('image/')){setStatus('Please choose an image file.','error');return;}
      const url=URL.createObjectURL(file); const img=new Image();
      img.onload=async()=>{URL.revokeObjectURL(url);state.image=img;state.historyTransition=Promise.resolve(window.VisionHistoryExperiments?.reset?.());resetBenchmark();$('image-empty').hidden=true;$('image-canvas').hidden=false;await runUploaded();};
      img.onerror=()=>{URL.revokeObjectURL(url);setStatus('The selected image could not be decoded.','error');};
      img.src=url;
    });
    document.querySelectorAll('[data-runnable-model]').forEach(btn=>btn.addEventListener('click',()=>selectActiveModel(btn.dataset.runnableModel)));
    $('rerun').addEventListener('click',runUploaded);
    $('benchmark').addEventListener('click',runBenchmark);
    $('confidence').addEventListener('input',()=>{$('confidence-value').textContent=Number($('confidence').value).toFixed(2);if(!state.historyExperiment)redrawUploaded();});
    $('live-confidence').addEventListener('input',()=>{$('live-confidence-value').textContent=Number($('live-confidence').value).toFixed(2);});

    function liveModelKeys(){return RuntimeRegistry.validate({capability:'live'}).expected}
    function currentLiveAdapter(){return RuntimeRegistry.get(state.liveModel)}
    function liveRuntimeOptions(adapter){const meta=RuntimeRegistry.liveMeta(adapter?.model),forceBackend=meta?.forceBackend||'',confidence=Number($('live-confidence').value);return forceBackend?{live:true,confidence,forceBackend,allowFallback:false}:{live:true,confidence}}
    function currentCameraTrack(){return state.stream?.getVideoTracks?.()[0]||null}
    function resetLiveMetrics(){for(const id of ['live-inf','live-total','live-fps','live-count'])$(id).textContent='—';$('live-frames').textContent='0';state.liveSamples=[];state.liveFrameCount=0}
    function setLiveStatus(message,kind=''){const el=$('live-model-status');el.textContent=message||'';el.className=`tiny live-model-status ${kind}`.trim()}
    function formatZoom(value){return Number.isFinite(value)?Number(value.toFixed(1)).toString()+'×':'—'}
    function cameraFacingName(){return state.cameraFacing==='user'?'Front':'Rear'}
    function stopMediaStream(stream){for(const track of stream?.getTracks?.()||[])try{track.stop()}catch(_){}}
    function cameraConstraints(facing,{exact=false}={}){return{video:{facingMode:exact?{exact:facing}:{ideal:facing},width:{ideal:1280},height:{ideal:720}},audio:false}}
    function requestCameraStream(facing,options={}){return navigator.mediaDevices.getUserMedia(cameraConstraints(facing,options))}
    function quantizeCameraZoom(range,value){
      let next=Math.max(range.min,Math.min(range.max,value));
      if(range.step>0)next=range.min+Math.round((next-range.min)/range.step)*range.step;
      return Math.max(range.min,Math.min(range.max,next));
    }
    function cameraZoomLevels(range){
      const epsilon=Math.max(1e-6,range.step/2),levels=[];
      const add=requested=>{const value=quantizeCameraZoom(range,requested);if(!levels.some(item=>Math.abs(item-value)<=epsilon))levels.push(value)};
      if(range.min<1)add(0.5);
      if(range.min<=1&&range.max>=1)add(1);
      for(let value=Math.max(2,Math.ceil(range.min));value<=Math.floor(range.max+epsilon);value++)add(value);
      if(levels.length<2){add(range.min);add(range.max)}
      return levels.sort((a,b)=>a-b);
    }
    function nextCameraZoom(range,direction){
      const epsilon=Math.max(1e-6,range.step/2),levels=cameraZoomLevels(range);
      return direction>0?levels.find(value=>value>range.value+epsilon):levels.slice().reverse().find(value=>value<range.value-epsilon);
    }
    function readCameraZoom(track){
      if(state.cameraFacing!=='environment'||typeof track?.getCapabilities!=='function')return null;
      let capabilities={},settings={};try{capabilities=track.getCapabilities()||{}}catch(_){return null}try{settings=track.getSettings?.()||{}}catch(_){}
      const min=Number(capabilities.zoom?.min),max=Number(capabilities.zoom?.max),rawStep=Number(capabilities.zoom?.step);
      if(!Number.isFinite(min)||!Number.isFinite(max)||max<=min)return null;
      const step=Number.isFinite(rawStep)&&rawStep>0?rawStep:0,base={min,max,step};
      const defaultValue=quantizeCameraZoom(base,1),rawValue=Number(settings.zoom),value=quantizeCameraZoom(base,Number.isFinite(rawValue)?rawValue:defaultValue);
      return{min,max,step,defaultValue,value};
    }
    async function refreshCameraTrackState(requestedFacing=state.cameraFacing){
      const track=currentCameraTrack();if(!track){state.cameraCanFlip=false;state.cameraZoom=null;renderCameraControls();return}
      let settings={};try{settings=track.getSettings?.()||{}}catch(_){}
      if(settings.facingMode==='user'||settings.facingMode==='environment')state.cameraFacing=settings.facingMode;else state.cameraFacing=requestedFacing;
      state.cameraCanFlip=false;
      if(typeof navigator.mediaDevices?.enumerateDevices==='function'){
        try{const devices=await navigator.mediaDevices.enumerateDevices();state.cameraCanFlip=devices.filter(device=>device.kind==='videoinput').length>1}catch(_){}
      }
      state.cameraZoom=readCameraZoom(track);renderCameraControls();
    }
    function cameraFeatureSummary(){
      const zoom=state.cameraZoom&&state.cameraFacing==='environment'?` · zoom ${formatZoom(state.cameraZoom.min)}–${formatZoom(state.cameraZoom.max)}`:'';
      return cameraFacingName()+' camera'+zoom;
    }
    function renderCameraControls(){
      const flip=$('camera-flip'),zoomControls=$('camera-zoom-controls'),out=$('camera-zoom-out'),reset=$('camera-zoom-reset'),inc=$('camera-zoom-in');
      const showFlip=state.live&&state.cameraCanFlip;
      flip.hidden=!showFlip;flip.disabled=state.liveSwitching||state.cameraZoomChanging;flip.textContent=state.cameraFacing==='environment'?'↻ Front':'↻ Rear';
      flip.setAttribute('aria-label',state.cameraFacing==='environment'?'Switch to front camera':'Switch to rear camera');
      const zoom=state.cameraFacing==='environment'?state.cameraZoom:null,showZoom=state.live&&Boolean(zoom);
      zoomControls.hidden=!showZoom;
      if(!zoom)return;
      out.disabled=state.liveSwitching||state.cameraZoomChanging||!Number.isFinite(nextCameraZoom(zoom,-1));
      inc.disabled=state.liveSwitching||state.cameraZoomChanging||!Number.isFinite(nextCameraZoom(zoom,1));
      reset.disabled=state.liveSwitching||state.cameraZoomChanging;
      reset.textContent=formatZoom(zoom.value);
      reset.setAttribute('aria-label',`Reset camera zoom to ${formatZoom(zoom.defaultValue)}. Current zoom ${formatZoom(zoom.value)}`);
      zoomControls.setAttribute('aria-label',`Rear camera zoom ${formatZoom(zoom.min)} to ${formatZoom(zoom.max)}`);
    }
    async function attachCameraStream(stream,requestedFacing){
      const video=$('camera-video');video.srcObject=stream;
      try{await video.play()}catch(error){video.srcObject=null;stopMediaStream(stream);throw error}
      state.stream=stream;await refreshCameraTrackState(requestedFacing);
      $('live-size').textContent=`${video.videoWidth} × ${video.videoHeight} camera`;
    }
    async function applyCameraZoom(value){
      if(!state.live||state.liveSwitching||state.cameraZoomChanging||state.cameraFacing!=='environment')return;
      const track=currentCameraTrack(),zoom=state.cameraZoom;if(!track||!zoom||typeof track.applyConstraints!=='function')return;
      const target=quantizeCameraZoom(zoom,value);if(Math.abs(target-zoom.value)<1e-6)return;
      state.cameraZoomChanging=true;renderCameraControls();
      try{
        await track.applyConstraints({zoom:target});
        if(!state.live||currentCameraTrack()!==track)return;
        let settings={};try{settings=track.getSettings?.()||{}}catch(_){}
        const actual=Number(settings.zoom);
        state.cameraZoom={...zoom,value:quantizeCameraZoom(zoom,Number.isFinite(actual)?actual:target)};
        setLiveStatus(`Rear camera zoom ${formatZoom(state.cameraZoom.value)}. ${currentLiveAdapter()?.model.title||'Model'} remains active.`);
      }catch(error){
        console.error('Camera zoom change failed',error);if(state.live&&currentCameraTrack()===track)setLiveStatus('This camera reported zoom support but rejected the requested zoom value.','error');
      }finally{state.cameraZoomChanging=false;renderCameraControls()}
    }
    function stepCameraZoom(direction){const zoom=state.cameraZoom;if(!zoom)return;const target=nextCameraZoom(zoom,direction);if(Number.isFinite(target))void applyCameraZoom(target)}
    async function switchCamera(){
      if(!state.live||state.liveSwitching||state.cameraZoomChanging||!state.cameraCanFlip)return;
      const adapter=currentLiveAdapter(),modelKey=state.liveModel,previousFacing=state.cameraFacing,targetFacing=previousFacing==='environment'?'user':'environment',token=++state.cameraStartToken;
      if(!adapter)return;
      state.liveSwitching=true;state.liveLoopToken++;renderLiveModels();renderCameraControls();setLiveStatus('Switching to '+(targetFacing==='user'?'front':'rear')+' camera…');
      try{
        state.liveTransition=state.liveTransition.catch(()=>{}).then(async()=>{
          await state.runtimeTransition.catch(()=>{});await state.liveInference.catch(()=>{});
          const oldStream=state.stream;state.stream=null;$('camera-video').srcObject=null;stopMediaStream(oldStream);state.cameraCanFlip=false;state.cameraZoom=null;renderCameraControls();
          const stream=await requestCameraStream(targetFacing,{exact:true});
          if(token!==state.cameraStartToken||!state.live){stopMediaStream(stream);return}
          await attachCameraStream(stream,targetFacing);
          resetLiveMetrics();
          if(state.live&&state.liveModel===modelKey)liveLoop(adapter,modelKey,++state.liveLoopToken);
        });
        await state.liveTransition;
        if(token!==state.cameraStartToken||!state.live)return;
        setLiveStatus(`${adapter.model.title} is active. ${cameraFeatureSummary()}. Model runtime stayed loaded while the camera reopened.`);
      }catch(error){
        console.error('Camera switch failed',error);
        if(token!==state.cameraStartToken||!state.live)return;
        let restored=false;
        try{
          const rollback=await requestCameraStream(previousFacing,{exact:true});
          if(token!==state.cameraStartToken||!state.live){stopMediaStream(rollback);return}
          await attachCameraStream(rollback,previousFacing);resetLiveMetrics();liveLoop(adapter,modelKey,++state.liveLoopToken);restored=true;
        }catch(rollbackError){console.error('Camera switch rollback failed',rollbackError)}
        if(!restored&&state.live)stopCamera('Camera switch failed and the previous camera could not be restored.');
        else if(restored)setLiveStatus((targetFacing==='user'?'Front':'Rear')+' camera could not be opened. '+cameraFacingName()+' camera was restored.','error');
      }finally{state.liveSwitching=false;renderLiveModels();renderCameraControls()}
    }
    function renderLiveModels(){
      const keys=liveModelKeys(),select=$('live-model-select'),label=$('live-model-name');
      select.replaceChildren();
      for(const key of keys){const option=document.createElement('option');option.value=key;option.textContent=REGISTRY[key].title;select.appendChild(option)}
      if(!keys.length){
        state.liveModel='';label.textContent='No live-capable runtime registered';select.disabled=true;$('camera-start').disabled=true;$('live-backend').textContent='Not available';renderCameraControls();return;
      }
      if(!keys.includes(state.liveModel))state.liveModel=keys.includes(DEFAULT_LIVE_MODEL)?DEFAULT_LIVE_MODEL:keys[0];
      select.value=state.liveModel;
      const model=REGISTRY[state.liveModel],adapter=currentLiveAdapter(),meta=RuntimeRegistry.liveMeta(model);
      label.textContent=model.title+' · '+(meta?.summary||'Sequential inference');
      select.disabled=state.liveSwitching;
      $('camera-start').disabled=state.live||state.liveSwitching||!adapter;
      if(!adapter&&!state.liveSwitching)$('live-backend').textContent='Runtime loading';
      renderCameraControls();
    }
    async function selectLiveModel(key){
      if(state.liveSwitching||key===state.liveModel)return;
      const adapter=RuntimeRegistry.get(key);
      if(!adapter||!RuntimeRegistry.capabilityEnabled(adapter.model,'live')){renderLiveModels();return}
      const previousKey=state.liveModel,previousAdapter=RuntimeRegistry.get(previousKey),wasLive=state.live;
      if(!wasLive){
        state.liveModel=key;resetLiveMetrics();$('live-backend').textContent='Not loaded';renderLiveModels();setLiveStatus(adapter.model.title+' selected. Start camera when ready.');return;
      }
      state.liveSwitching=true;state.liveLoopToken++;renderLiveModels();setLiveStatus('Loading '+adapter.model.title+'…');
      try{
        state.liveTransition=state.liveTransition.catch(()=>{}).then(async()=>{
          await state.runtimeTransition.catch(()=>{});
          await state.liveInference.catch(()=>{});
          await previousAdapter?.release();
          try{await adapter.prepare?.(liveRuntimeOptions(adapter))}catch(error){try{await adapter.release?.()}catch(_){}throw error}
          state.liveModel=key;resetLiveMetrics();setLiveBackend(adapter);renderLiveModels();
          if(state.live)liveLoop(adapter,key,++state.liveLoopToken);
        });
        await state.liveTransition;
        setLiveStatus(state.live?adapter.model.title+' is active. Camera stream stayed open.':adapter.model.title+' selected. Start camera when ready.');
      }catch(err){
        console.error(err);
        let restored=false;
        if(wasLive&&state.live&&previousAdapter){
          try{
            await previousAdapter.prepare?.(liveRuntimeOptions(previousAdapter));
            state.liveModel=previousKey;resetLiveMetrics();setLiveBackend(previousAdapter);liveLoop(previousAdapter,previousKey,++state.liveLoopToken);restored=true;
          }catch(rollbackError){console.error('Live Camera rollback failed',rollbackError)}
        }else state.liveModel=previousKey;
        if(!restored&&state.live)stopCamera('Model switch failed and the previous runtime could not be restored.');
        else setLiveStatus(restored?adapter.model.title+' could not be loaded. '+previousAdapter.model.title+' is still active.':'Could not select '+adapter.model.title+'.','error');
      }finally{
        state.liveSwitching=false;renderLiveModels();
      }
    }
    function setLiveBackend(adapter){
      const runtime=adapter?.runtimeInfo?.()||{},backend=runtime.backend||'';
      if(backend)$('live-backend').textContent=runtime.dtype?String(backend).toUpperCase()+' · '+runtime.dtype:String(backend).toUpperCase();
      else if(adapter?.backend){const value=adapter.backend();if(value)$('live-backend').textContent=String(value)}
    }
    async function startCamera(){
      if(state.live||state.liveSwitching)return;
      const modelKey=state.liveModel,token=++state.cameraStartToken,adapter=currentLiveAdapter();
      if(!adapter){renderLiveModels();setLiveStatus('Live Camera runtime is still loading.','error');return}
      $('camera-start').disabled=true;setLiveStatus('Loading '+adapter.model.title+'…');
      try{
        await state.liveTransition.catch(()=>{});
        await state.runtimeTransition.catch(()=>{});
        if(token!==state.cameraStartToken||state.liveModel!==modelKey)return;
        await adapter.prepare?.(liveRuntimeOptions(adapter));
        if(token!==state.cameraStartToken||state.liveModel!==modelKey)return;
        setLiveBackend(adapter);
        const stream=await requestCameraStream(state.cameraFacing,{exact:false});
        if(token!==state.cameraStartToken||state.liveModel!==modelKey){stopMediaStream(stream);return}
        await attachCameraStream(stream,state.cameraFacing);
        if(token!==state.cameraStartToken||state.liveModel!==modelKey){stopMediaStream(state.stream);state.stream=null;return}
        state.live=true;resetLiveMetrics();
        $('camera-empty').hidden=true;$('camera-canvas').hidden=false;$('live-badge').classList.add('on');$('camera-stop').disabled=false;
        renderLiveModels();renderCameraControls();setLiveStatus(`${adapter.model.title} is running locally. ${cameraFeatureSummary()}.`);
        liveLoop(adapter,modelKey,++state.liveLoopToken);
      }catch(err){
        if(token!==state.cameraStartToken)return;
        console.error(err);
        stopMediaStream(state.stream);state.stream=null;
        const video=$('camera-video');video.srcObject=null;$('camera-empty').hidden=false;$('camera-empty').innerHTML=`<strong>Camera unavailable</strong>${(err.message||String(err)).replace(/[<>]/g,'')}`;renderLiveModels();renderCameraControls();setLiveStatus('Camera could not start with '+adapter.model.title+'.','error');
      }
    }

    async function liveLoop(adapter,modelKey,loopToken){
      const video=$('camera-video'),canvas=$('camera-canvas');
      while(state.live&&state.liveModel===modelKey&&state.liveLoopToken===loopToken){
        await new Promise(requestAnimationFrame);
        if(!state.live||state.liveModel!==modelKey||state.liveLoopToken!==loopToken||video.readyState<2)continue;
        let framePromise;
        try{
          framePromise=Promise.resolve(adapter.run(video,canvas,{updateMain:false,...liveRuntimeOptions(adapter)}));state.liveInference=framePromise;
          const r=await framePromise;
          if(!state.live||state.liveModel!==modelKey||state.liveLoopToken!==loopToken)continue;
          state.liveFrameCount++;
          state.liveSamples.push(r);if(state.liveSamples.length>20)state.liveSamples.shift();
          const avg=key=>state.liveSamples.reduce((sum,item)=>sum+item[key],0)/state.liveSamples.length;
          const ai=avg('infMs'),at=avg('totalMs');
          $('live-inf').textContent=ms(ai);$('live-total').textContent=ms(at);$('live-fps').textContent=ai>0?(1000/ai).toFixed(1):'—';$('live-count').textContent=String(r.visible);$('live-frames').textContent=String(state.liveFrameCount);setLiveBackend(adapter);
        }catch(err){
          console.error(err);stopCamera('Live inference stopped for '+adapter.model.title+'.');$('camera-empty').hidden=false;$('camera-empty').innerHTML=`<strong>Live inference stopped</strong>${(err.message||String(err)).replace(/[<>]/g,'')}`;
        }finally{if(framePromise&&state.liveInference===framePromise)state.liveInference=Promise.resolve();}
      }
    }

    function stopCamera(message=''){
      state.cameraStartToken++;state.liveLoopToken++;state.live=false;stopMediaStream(state.stream);state.stream=null;state.cameraCanFlip=false;state.cameraZoom=null;state.cameraZoomChanging=false;
      const video=$('camera-video');video.srcObject=null;$('live-badge').classList.remove('on');$('camera-stop').disabled=true;$('camera-canvas').hidden=true;$('camera-empty').hidden=false;$('live-size').textContent='Camera off';renderLiveModels();renderCameraControls();
      setLiveStatus(typeof message==='string'&&message?message:(state.liveModel&&REGISTRY[state.liveModel]?REGISTRY[state.liveModel].title+' remains selected.':'Camera stopped.'));
    }
    $('live-model-select').addEventListener('change',event=>selectLiveModel(event.target.value));
    $('camera-start').addEventListener('click',startCamera);$('camera-stop').addEventListener('click',()=>stopCamera());
    $('camera-flip').addEventListener('click',()=>void switchCamera());
    $('camera-zoom-out').addEventListener('click',()=>stepCameraZoom(-1));$('camera-zoom-in').addEventListener('click',()=>stepCameraZoom(1));$('camera-zoom-reset').addEventListener('click',()=>{if(state.cameraZoom)void applyCameraZoom(state.cameraZoom.defaultValue)});

    window.VisionLab = Object.freeze({
      getImage:()=>state.image,
      getConfidence:()=>Number($('confidence').value),
      getBaselineProvider:()=>state.provider || '',
      releaseBaselineRuntime,
      runBaseline:(source,canvas)=>inferSource(source,canvas,{updateMain:false}),
      drawDetections,
      sourceSize,
      ms,
      bytes,
      getActiveModel:()=>state.activeModel,
      selectActiveModel,
      getLiveModel:()=>state.liveModel,
      selectLiveModel,
      refreshLiveModels:renderLiveModels,
      reportRuntimeEvent,
      setDiagnosticHook:hook=>{diagnosticHook=typeof hook==='function'?hook:null;},
      getBaselineDiagnosticState:()=>({sessionPresent:Boolean(state.session),provider:state.provider||'',rawBufferPresent:Boolean(state.modelBuffer),rawBufferBytes:state.modelBuffer?.byteLength||0,sessionRuns:baselineSessionRuns,wasmThreads:WASM_THREADS}),
      getRetentionThreshold:()=>Number($('confidence').min)||0.1
    });

    RuntimeRegistry.register('ssd',{
      run:(source,canvas,{updateMain=false,confidence}={})=>inferSource(source,canvas,{updateMain,confidence}),
      prepare:()=>createSession(),
      release:releaseBaselineRuntime,
      backend:()=>(state.provider||'wasm').toUpperCase(),
      runtimeInfo:()=>({backend:state.provider||'wasm',bytes:MODEL.bytes,sessionPresent:Boolean(state.session),rawBufferPresent:Boolean(state.modelBuffer),rawBufferBytes:state.modelBuffer?.byteLength||0,sessionRuns:baselineSessionRuns,wasmThreads:WASM_THREADS}),
      handlesMainUi:true
    });

    updateActiveModelUI();updateActiveCacheState();renderLiveModels();
    window.addEventListener('pagehide',()=>{state.modelDownloadController?.abort();settleModelDownloadConsent(false);stopCamera()});
  })();
