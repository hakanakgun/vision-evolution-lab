  (() => {
    'use strict';

    const MODEL = Object.freeze({
      id: 'ssd-mobilenet-v1-12-int8',
      url: 'https://huggingface.co/onnxmodelzoo/ssd_mobilenet_v1_12-int8/resolve/929618539097dbeb779c13aed75dfe346d016d48/ssd_mobilenet_v1_12-int8.onnx',
      sha256: '2b79e6a7fb1ec6a33f332b9b10d82d9de4b7b49dcd26b5946921bb356895c954',
      maxSide: 640,
      executionProviders: ['wasm'],
      providerNote: 'WASM is intentional for this INT8 baseline: the current ORT WebGPU path can initialize this dynamic-shape graph but fail during OrtRun().'
    });

    const COCO = Object.freeze({1:'person',2:'bicycle',3:'car',4:'motorcycle',5:'airplane',6:'bus',7:'train',8:'truck',9:'boat',10:'traffic light',11:'fire hydrant',13:'stop sign',14:'parking meter',15:'bench',16:'bird',17:'cat',18:'dog',19:'horse',20:'sheep',21:'cow',22:'elephant',23:'bear',24:'zebra',25:'giraffe',27:'backpack',28:'umbrella',31:'handbag',32:'tie',33:'suitcase',34:'frisbee',35:'skis',36:'snowboard',37:'sports ball',38:'kite',39:'baseball bat',40:'baseball glove',41:'skateboard',42:'surfboard',43:'tennis racket',44:'bottle',46:'wine glass',47:'cup',48:'fork',49:'knife',50:'spoon',51:'bowl',52:'banana',53:'apple',54:'sandwich',55:'orange',56:'broccoli',57:'carrot',58:'hot dog',59:'pizza',60:'donut',61:'cake',62:'chair',63:'couch',64:'potted plant',65:'bed',67:'dining table',70:'toilet',72:'tv',73:'laptop',74:'mouse',75:'remote',76:'keyboard',77:'cell phone',78:'microwave',79:'oven',80:'toaster',81:'sink',82:'refrigerator',84:'book',85:'clock',86:'vase',87:'scissors',88:'teddy bear',89:'hair drier',90:'toothbrush'});

    const $ = id => document.getElementById(id);
    const state = {session:null, provider:'', modelBuffer:null, image:null, lastResults:null, lastDims:null, live:false, stream:null, liveSamples:[], liveFrameCount:0,inferenceCount:0,benchmarking:false};

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

    function supportsWasmSimd(){
      try{
        const probe=Uint8Array.from([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,8,1,6,0,65,0,253,15,11]);
        return WebAssembly.validate(probe);
      }catch(_){ return false; }
    }
    function detectBrowser(){
      const ua=navigator.userAgent;
      const match=(re,name)=>{const m=ua.match(re);return m?`${name} ${m[1]}`:'';};
      return match(/Edg\/([\d.]+)/,'Edge') ||
        match(/CriOS\/([\d.]+)/,'Chrome iOS') ||
        match(/Chrome\/([\d.]+)/,'Chrome') ||
        match(/FxiOS\/([\d.]+)/,'Firefox iOS') ||
        match(/Firefox\/([\d.]+)/,'Firefox') ||
        match(/Version\/([\d.]+).*Safari/,'Safari') || 'Unknown';
    }
    function detectOS(){
      const ua=navigator.userAgent;
      if(/iPhone|iPad|iPod/.test(ua)){
        const m=ua.match(/OS ([\d_]+)/);
        return m?`iOS ${m[1].replaceAll('_','.')}`:'iOS';
      }
      if(/Windows NT/.test(ua)){
        const m=ua.match(/Windows NT ([\d.]+)/);
        return m?`Windows NT ${m[1]}`:'Windows';
      }
      if(/Mac OS X/.test(ua)){
        const m=ua.match(/Mac OS X ([\d_]+)/);
        return m?`macOS ${m[1].replaceAll('_','.')}`:'macOS';
      }
      if(/Android/.test(ua)){
        const m=ua.match(/Android ([\d.]+)/);
        return m?`Android ${m[1]}`:'Android';
      }
      if(/Linux/.test(ua)) return 'Linux';
      return navigator.userAgentData?.platform || navigator.platform || 'Unknown';
    }
    function populateDiagnostics(){
      setMetric('d-browser',detectBrowser());
      setMetric('d-os',detectOS());
      setMetric('d-cpu',navigator.hardwareConcurrency?String(navigator.hardwareConcurrency):'not exposed');
      setMetric('d-memory',navigator.deviceMemory?`~${navigator.deviceMemory} GB`:'not exposed');
      setMetric('d-webgpu',navigator.gpu?'available':'unavailable');
      setMetric('d-simd',supportsWasmSimd()?'supported':'unavailable');
      setMetric('d-threads',String(WASM_THREADS));
      setMetric('d-isolated',window.crossOriginIsolated?'yes':'no');
    }
    populateDiagnostics();

    function selectTab(id){
      document.querySelectorAll('.tab').forEach(btn => btn.setAttribute('aria-selected', String(btn.dataset.tab === id)));
      document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('active', panel.id === id));
      if(id !== 'live-camera' && state.live) stopCamera();
    }
    document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => selectTab(btn.dataset.tab)));
    document.querySelectorAll('[data-jump]').forEach(btn => btn.addEventListener('click', () => selectTab(btn.dataset.jump)));

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

    async function fetchModel(){
      if(state.modelBuffer) return {buffer:state.modelBuffer, downloadMs:0, cachedInMemory:true};
      setStatus('Downloading the pinned model checkpoint…', 'loading');
      const start=performance.now();
      const response=await fetch(MODEL.url, {cache:'force-cache'});
      if(!response.ok) throw new Error(`Model download failed: HTTP ${response.status}`);
      const buffer=await response.arrayBuffer();
      const downloadMs=performance.now()-start;
      state.modelBuffer=buffer;
      setMetric('m-download', ms(downloadMs));
      setMetric('m-bytes', bytes(buffer.byteLength));
      return {buffer,downloadMs,cachedInMemory:false};
    }

    async function createSession(forceProvider=''){
      if(state.session && (!forceProvider || state.provider===forceProvider)) return state.session;
      const {buffer}=await fetchModel();
      const configured=MODEL.executionProviders || (navigator.gpu ? ['webgpu','wasm'] : ['wasm']);
      const candidates=forceProvider ? [forceProvider] : configured.filter(provider => provider !== 'webgpu' || navigator.gpu);
      let lastError;
      for(const provider of candidates){
        try{
          setStatus(`Initializing ${provider.toUpperCase()} session…`, 'loading');
          const start=performance.now();
          const session=await ort.InferenceSession.create(buffer, {executionProviders:[provider], graphOptimizationLevel:'all'});
          const initMs=performance.now()-start;
          const previous=state.session;
          state.session=session; state.provider=provider;
          if(previous && previous!==session && typeof previous.release==='function'){
            try{ await previous.release(); }catch(releaseError){ console.warn('Session release failed', releaseError); }
          }
          setMetric('m-init', ms(initMs));
          $('backend-badge').textContent=provider.toUpperCase();
          $('live-backend').textContent=provider.toUpperCase();
          const note=MODEL.providerNote && provider==='wasm' ? ` ${MODEL.providerNote}` : ' First inference can include backend compilation overhead.';
          setStatus(`Model ready on ${provider.toUpperCase()}.${note}`);
          return session;
        }catch(err){ lastError=err; console.warn(`Provider ${provider} failed`, err); }
      }
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

    function drawDetections(canvas,detections){
      const ctx=canvas.getContext('2d');
      const threshold=Number($('confidence').value);
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

    async function inferSource(source,targetCanvas,{updateMain=true}={}){
      const session=await createSession();
      const totalStart=performance.now();
      const preStart=performance.now();
      const {rgb,width,height}=prepareSource(source,targetCanvas);
      const tensor=new ort.Tensor('uint8',rgb,[1,height,width,3]);
      const preMs=performance.now()-preStart;
      const infStart=performance.now();
      const runResult=await runWithProviderFallback(session,tensor);
      const results=runResult.results;
      const infMs=performance.now()-infStart;
      const postStart=performance.now();
      const detections=decode(results);
      const visible=drawDetections(targetCanvas,detections);
      const postMs=performance.now()-postStart;
      const totalMs=performance.now()-totalStart;
      if(updateMain){
        state.lastResults=detections;
        state.inferenceCount++;
        setMetric('m-run-label',state.inferenceCount===1?'first inference':`warm run #${state.inferenceCount}`);
        setMetric('m-pre',ms(preMs));setMetric('m-inf',ms(infMs));setMetric('m-post',ms(postMs));setMetric('m-total',ms(totalMs));setMetric('m-count',String(visible));
        $('input-size').textContent=`${width} × ${height} input`;
        setMetric('d-input',`${width}×${height}`);
        $('inside-size').textContent=`1 × ${height} × ${width} × 3`;
        $('inside-summary').innerHTML=`<div><span class="pill">Real tensor</span><h2 style="margin:10px 0 6px">uint8 · NHWC</h2><p style="margin:0">Source ${state.lastDims.sourceW}×${state.lastDims.sourceH} → model input ${width}×${height}. Preprocess ${ms(preMs)}, inference ${ms(infMs)}.</p></div>`;
        setStatus(`${visible} detection${visible===1?'':'s'} above confidence ${Number($('confidence').value).toFixed(2)}. User pixels stayed in this browser.`);
      }
      return {preMs,infMs,postMs,totalMs,visible,detections,width,height};
    }

    function redrawUploaded(){
      if(!state.image || !state.lastResults) return;
      const canvas=$('image-canvas');
      const {width,height}=state.lastDims;
      canvas.width=width; canvas.height=height;
      canvas.getContext('2d').drawImage(state.image,0,0,width,height);
      const count=drawDetections(canvas,state.lastResults);
      setMetric('m-count',String(count));
      setStatus(`${count} detection${count===1?'':'s'} above confidence ${Number($('confidence').value).toFixed(2)}. Threshold changes only redraw existing model outputs.`);
    }

    async function runUploaded(){
      if(!state.image || state.benchmarking) return;
      $('rerun').disabled=true;
      $('benchmark').disabled=true;
      try{ await inferSource(state.image,$('image-canvas')); }
      catch(err){ console.error(err); setStatus(err.message || String(err),'error'); }
      finally{
        $('rerun').disabled=false;
        $('benchmark').disabled=!state.image;
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
      if(!state.image || state.benchmarking) return;
      state.benchmarking=true;
      $('benchmark').disabled=true;
      $('rerun').disabled=true;
      const canvas=$('benchmark-canvas');
      const samples=[];
      try{
        const RUNS=20;
        setStatus(`Running ${RUNS} warm measurements on the same image…`,'loading');
        for(let i=0;i<RUNS;i++){
          const r=await inferSource(state.image,canvas,{updateMain:false});
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
        $('benchmark-note').textContent='p50, p90, min–max and CV from 20 sequential warm runs; model transfer and session init excluded.';
        setStatus(`Warm benchmark complete: p50 inference ${ms(infMed)}, p90 ${ms(infP90)}, CV ${cv.toFixed(1)}%.`);
      }catch(err){
        console.error(err);
        setStatus(err.message || String(err),'error');
        $('benchmark-note').textContent='Benchmark failed; current-run metrics were left unchanged.';
      }finally{
        state.benchmarking=false;
        $('benchmark').disabled=!state.image;
        $('rerun').disabled=!state.image;
      }
    }

    $('image-file').addEventListener('change', async event => {
      const file=event.target.files && event.target.files[0]; if(!file) return;
      if(!file.type.startsWith('image/')){setStatus('Please choose an image file.','error');return;}
      const url=URL.createObjectURL(file); const img=new Image();
      img.onload=async()=>{URL.revokeObjectURL(url);state.image=img;resetBenchmark();$('image-empty').hidden=true;$('image-canvas').hidden=false;await runUploaded();};
      img.onerror=()=>{URL.revokeObjectURL(url);setStatus('The selected image could not be decoded.','error');};
      img.src=url;
    });
    $('rerun').addEventListener('click',runUploaded);
    $('benchmark').addEventListener('click',runBenchmark);
    $('confidence').addEventListener('input',()=>{$('confidence-value').textContent=Number($('confidence').value).toFixed(2);redrawUploaded();});

    async function startCamera(){
      if(state.live) return;
      try{
        await createSession();
        const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}},audio:false});
        const video=$('camera-video'); video.srcObject=stream; await video.play();
        state.stream=stream;state.live=true;state.liveSamples=[];state.liveFrameCount=0;
        $('camera-empty').hidden=true;$('camera-canvas').hidden=false;$('live-badge').classList.add('on');$('camera-start').disabled=true;$('camera-stop').disabled=false;
        $('live-size').textContent=`${video.videoWidth} × ${video.videoHeight} camera`;
        liveLoop();
      }catch(err){console.error(err);$('camera-empty').innerHTML=`<strong>Camera unavailable</strong>${(err.message||String(err)).replace(/[<>]/g,'')}`;}
    }

    async function liveLoop(){
      const video=$('camera-video'),canvas=$('camera-canvas');
      while(state.live){
        await new Promise(requestAnimationFrame);
        if(!state.live || video.readyState<2) continue;
        try{
          const r=await inferSource(video,canvas,{updateMain:false});
          state.liveFrameCount++;
          state.liveSamples.push(r);if(state.liveSamples.length>20)state.liveSamples.shift();
          const avg=(key)=>state.liveSamples.reduce((s,x)=>s+x[key],0)/state.liveSamples.length;
          const ai=avg('infMs'),at=avg('totalMs');
          $('live-inf').textContent=ms(ai);$('live-total').textContent=ms(at);$('live-fps').textContent=ai>0?(1000/ai).toFixed(1):'—';$('live-count').textContent=String(r.visible);$('live-frames').textContent=String(state.liveFrameCount);
        }catch(err){console.error(err);stopCamera();$('camera-empty').hidden=false;$('camera-empty').innerHTML=`<strong>Live inference stopped</strong>${(err.message||String(err)).replace(/[<>]/g,'')}`;}
      }
    }

    function stopCamera(){
      state.live=false;if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null;}
      const video=$('camera-video');video.srcObject=null;$('live-badge').classList.remove('on');$('camera-start').disabled=false;$('camera-stop').disabled=true;$('camera-canvas').hidden=true;$('camera-empty').hidden=false;$('live-size').textContent='Camera off';
    }
    $('camera-start').addEventListener('click',startCamera);$('camera-stop').addEventListener('click',stopCamera);

    window.VisionLab = Object.freeze({
      getImage:()=>state.image,
      getConfidence:()=>Number($('confidence').value),
      getBaselineProvider:()=>state.provider || '',
      runBaseline:(source,canvas)=>inferSource(source,canvas,{updateMain:false}),
      drawDetections,
      sourceSize,
      ms,
      bytes
    });

    window.addEventListener('pagehide',stopCamera);
  })();
