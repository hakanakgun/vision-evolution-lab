(() => {
  'use strict';

  const api=window.VisionLab;
  if(!api || !window.ort) return;
  const $=id=>document.getElementById(id);

  const MODEL=Object.freeze({
    id:'yolox-nano-0.1.1rc0',
    sources:Object.freeze([
      Object.freeze({
        label:'GitHub official',
        url:'https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_nano.onnx',
        provenance:'Megvii-BaseDetection/YOLOX release 0.1.1rc0'
      }),
      Object.freeze({
        label:'HF mirror',
        url:'https://huggingface.co/Heliosoph/yolox-onnx/resolve/9206d80cbad9ed54986edeff8d7457eb5333882a/yolox_nano.onnx',
        provenance:'Heliosoph/yolox-onnx @ 9206d80cbad9ed54986edeff8d7457eb5333882a'
      })
    ]),
    assetId:42724905,
    bytes:3659407,
    input:416,
    nms:0.45,
    providers:['webgpu','wasm']
  });

  const COCO80=Object.freeze([
    'person','bicycle','car','motorcycle','airplane','bus','train','truck','boat','traffic light',
    'fire hydrant','stop sign','parking meter','bench','bird','cat','dog','horse','sheep','cow',
    'elephant','bear','zebra','giraffe','backpack','umbrella','handbag','tie','suitcase','frisbee',
    'skis','snowboard','sports ball','kite','baseball bat','baseball glove','skateboard','surfboard',
    'tennis racket','bottle','wine glass','cup','fork','knife','spoon','bowl','banana','apple',
    'sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake','chair','couch',
    'potted plant','bed','dining table','toilet','tv','laptop','mouse','remote','keyboard','cell phone',
    'microwave','oven','toaster','sink','refrigerator','book','clock','vase','scissors','teddy bear',
    'hair drier','toothbrush'
  ]);

  const state={image:null,buffer:null,session:null,provider:'',downloadMs:NaN,initMs:NaN,running:false,modelSource:''};

  function setStatus(text,kind=''){
    const el=$('race-status'); el.textContent=text; el.className=`status ${kind}`.trim();
  }
  function threshold(){ return api.getConfidence(); }
  function syncConfidence(){ $('race-confidence').textContent=threshold().toFixed(2); }
  syncConfidence();
  $('confidence').addEventListener('input',syncConfidence);

  function sourceDims(source){ return api.sourceSize(source); }

  async function fetchModel(){
    if(state.buffer) return state.buffer;
    const errors=[];
    for(const source of MODEL.sources){
      const start=performance.now();
      try{
        setStatus(`Downloading YOLOX-Nano from ${source.label}…`,'loading');
        const response=await fetch(source.url,{cache:'force-cache',mode:'cors'});
        if(!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer=await response.arrayBuffer();
        if(buffer.byteLength<1000000) throw new Error(`unexpected payload size ${buffer.byteLength} bytes`);
        state.downloadMs=performance.now()-start;
        state.buffer=buffer;
        state.modelSource=source.label;
        $('race-yolo-source').textContent=source.label;
        if(buffer.byteLength!==MODEL.bytes) console.warn('YOLOX asset byte size differs from official release metadata',buffer.byteLength,MODEL.bytes,source.provenance);
        return buffer;
      }catch(err){
        errors.push(`${source.label}: ${err && err.message ? err.message : String(err)}`);
        console.warn(`YOLOX download source failed: ${source.label}`,err);
      }
    }
    throw new Error(`YOLOX model download failed. ${errors.join(' | ')}`);
  }

  async function createSession(forceProvider=''){
    if(state.session && (!forceProvider || state.provider===forceProvider)) return state.session;
    const buffer=await fetchModel();
    const candidates=(forceProvider?[forceProvider]:MODEL.providers).filter(p=>p!=='webgpu'||navigator.gpu);
    let lastError;
    for(const provider of candidates){
      try{
        setStatus(`Initializing YOLOX on ${provider.toUpperCase()}…`,'loading');
        const start=performance.now();
        const session=await ort.InferenceSession.create(buffer,{executionProviders:[provider],graphOptimizationLevel:'all'});
        state.initMs=performance.now()-start;
        if(state.session && state.session!==session && typeof state.session.release==='function'){
          try{await state.session.release();}catch(e){console.warn('YOLOX previous session release failed',e);}
        }
        state.session=session; state.provider=provider;
        $('race-yolo-backend').textContent=provider.toUpperCase();
        $('race-yolo-startup').textContent=`${api.ms(state.downloadMs)} / ${api.ms(state.initMs)}`;
        return session;
      }catch(err){ lastError=err; console.warn(`YOLOX ${provider} session failed`,err); }
    }
    throw lastError||new Error('No compatible YOLOX execution provider was available.');
  }

  function prepare(source,outputCanvas){
    const {w,h}=sourceDims(source);
    if(!w||!h) throw new Error('Race image has no readable dimensions.');
    const size=MODEL.input;
    const ratio=Math.min(size/h,size/w);
    const rw=Math.max(1,Math.floor(w*ratio)), rh=Math.max(1,Math.floor(h*ratio));
    const work=$('race-yolo-work'); work.width=size; work.height=size;
    const ctx=work.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='rgb(114,114,114)'; ctx.fillRect(0,0,size,size); ctx.drawImage(source,0,0,rw,rh);
    const rgba=ctx.getImageData(0,0,size,size).data;
    const plane=size*size;
    const chw=new Float32Array(plane*3);
    for(let p=0,s=0;p<plane;p++,s+=4){
      chw[p]=rgba[s+2];
      chw[plane+p]=rgba[s+1];
      chw[plane*2+p]=rgba[s];
    }

    const displayScale=Math.min(1,640/Math.max(w,h));
    const dw=Math.max(1,Math.round(w*displayScale)), dh=Math.max(1,Math.round(h*displayScale));
    outputCanvas.width=dw; outputCanvas.height=dh;
    outputCanvas.getContext('2d').drawImage(source,0,0,dw,dh);
    return {tensor:new ort.Tensor('float32',chw,[1,3,size,size]),ratio,w,h};
  }

  async function runSession(session,tensor){
    const run=s=>s.run({[s.inputNames[0]]:tensor});
    try{return await run(session);}
    catch(err){
      if(state.provider!=='webgpu') throw err;
      console.warn('YOLOX WebGPU run failed; retrying on WASM',err);
      const old=state.session; state.session=null; state.provider='';
      if(old&&typeof old.release==='function'){try{await old.release();}catch(e){console.warn(e);}}
      const wasm=await createSession('wasm');
      setStatus('YOLOX WebGPU run failed; switched to WASM and retried.');
      return run(wasm);
    }
  }

  function decode(output,ratio,sourceW,sourceH){
    const data=output.data;
    const attrs=85;
    const expected=(52*52+26*26+13*13);
    const rows=Math.floor(data.length/attrs);
    if(rows!==expected) throw new Error(`Unexpected YOLOX output shape: ${rows} rows (expected ${expected}).`);
    const candidates=[];
    let row=0;
    for(const stride of [8,16,32]){
      const grid=MODEL.input/stride;
      for(let gy=0;gy<grid;gy++){
        for(let gx=0;gx<grid;gx++,row++){
          const o=row*attrs;
          const objectness=Number(data[o+4]);
          let cls=0,clsProb=-Infinity;
          for(let c=0;c<80;c++){
            const p=Number(data[o+5+c]);
            if(p>clsProb){clsProb=p;cls=c;}
          }
          const score=objectness*clsProb;
          if(score<threshold()) continue;
          const cx=(Number(data[o])+gx)*stride;
          const cy=(Number(data[o+1])+gy)*stride;
          const bw=Math.exp(Number(data[o+2]))*stride;
          const bh=Math.exp(Number(data[o+3]))*stride;
          const x1=Math.max(0,(cx-bw/2)/ratio), y1=Math.max(0,(cy-bh/2)/ratio);
          const x2=Math.min(sourceW,(cx+bw/2)/ratio), y2=Math.min(sourceH,(cy+bh/2)/ratio);
          if(x2<=x1||y2<=y1) continue;
          candidates.push({score,classId:cls,label:COCO80[cls],box:[y1/sourceH,x1/sourceW,y2/sourceH,x2/sourceW]});
        }
      }
    }
    candidates.sort((a,b)=>b.score-a.score);
    const kept=[];
    for(const d of candidates){
      if(kept.every(k=>iou(d.box,k.box)<=MODEL.nms)) kept.push(d);
      if(kept.length>=100) break;
    }
    return kept;
  }

  function iou(a,b){
    const top=Math.max(a[0],b[0]),left=Math.max(a[1],b[1]),bottom=Math.min(a[2],b[2]),right=Math.min(a[3],b[3]);
    const inter=Math.max(0,bottom-top)*Math.max(0,right-left);
    const aa=Math.max(0,a[2]-a[0])*Math.max(0,a[3]-a[1]);
    const bb=Math.max(0,b[2]-b[0])*Math.max(0,b[3]-b[1]);
    const union=aa+bb-inter;
    return union>0?inter/union:0;
  }

  async function runYolox(source,canvas){
    const session=await createSession();
    const totalStart=performance.now();
    const preStart=performance.now();
    const prep=prepare(source,canvas);
    const preMs=performance.now()-preStart;
    const infStart=performance.now();
    const results=await runSession(session,prep.tensor);
    const infMs=performance.now()-infStart;
    const postStart=performance.now();
    const output=results[session.outputNames[0]]||results[Object.keys(results)[0]];
    const detections=decode(output,prep.ratio,prep.w,prep.h);
    const visible=api.drawDetections(canvas,detections);
    const postMs=performance.now()-postStart;
    return {preMs,infMs,postMs,totalMs:performance.now()-totalStart,detections,visible,width:MODEL.input,height:MODEL.input};
  }

  function visible(detections){return detections.filter(d=>d.score>=threshold());}
  function compare(a,b){
    const aa=visible(a),bb=visible(b),used=new Set();
    let both=0;
    for(const old of aa){
      let best=-1,bestIou=0;
      for(let i=0;i<bb.length;i++){
        if(used.has(i)||bb[i].label!==old.label) continue;
        const v=iou(old.box,bb[i].box);
        if(v>=0.35&&v>bestIou){best=i;bestIou=v;}
      }
      if(best>=0){used.add(best);both++;}
    }
    return {both,ssdOnly:aa.length-both,yoloOnly:bb.length-both};
  }

  function useImage(img,label){
    state.image=img;
    $('race-run').disabled=false;
    $('race-ssd-empty').hidden=false;$('race-yolo-empty').hidden=false;
    $('race-ssd-canvas').hidden=true;$('race-yolo-canvas').hidden=true;
    setStatus(`${label} ready. Run both models with confidence ${threshold().toFixed(2)}.`);
  }

  $('race-image-file').addEventListener('change',event=>{
    const file=event.target.files&&event.target.files[0]; if(!file) return;
    if(!file.type.startsWith('image/')){setStatus('Please choose an image file.','error');return;}
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);useImage(img,file.name||'Race image');};
    img.onerror=()=>{URL.revokeObjectURL(url);setStatus('The selected race image could not be decoded.','error');};
    img.src=url;
  });

  $('race-use-current').addEventListener('click',()=>{
    const img=api.getImage();
    if(!img){setStatus('No Time Machine image is loaded yet.','error');return;}
    useImage(img,'Time Machine image');
  });

  function openRaceFor(model){
    const raceTab=document.querySelector('.tab[data-tab="model-race"]');
    if(raceTab) raceTab.click();
    if(model==='yolox'){
      const img=api.getImage();
      if(img) useImage(img,'Time Machine image');
      else setStatus('YOLOX-Nano selected from Time Machine. Choose a race image, then run the comparison.');
      setTimeout(()=>document.querySelector('.race-model:nth-of-type(2)')?.scrollIntoView({behavior:'smooth',block:'center'}),80);
    }
  }

  document.querySelectorAll('[data-runnable-model]').forEach(button=>{
    button.addEventListener('click',()=>{
      const model=button.dataset.runnableModel;
      document.querySelectorAll('.milestone').forEach(m=>m.classList.toggle('active',m===button));
      if(model==='ssd'){
        document.getElementById('image-stage')?.scrollIntoView({behavior:'smooth',block:'center'});
      }else if(model==='yolox'){
        openRaceFor('yolox');
      }
    });
  });

  $('race-run').addEventListener('click',async()=>{
    if(!state.image||state.running) return;
    state.running=true;$('race-run').disabled=true;$('race-use-current').disabled=true;
    syncConfidence();
    try{
      setStatus('Running SSD-MobileNet baseline…','loading');
      const ssdCanvas=$('race-ssd-canvas');
      const ssd=await api.runBaseline(state.image,ssdCanvas);
      $('race-ssd-empty').hidden=true;ssdCanvas.hidden=false;
      $('race-ssd-backend').textContent=(api.getBaselineProvider()||'WASM').toUpperCase();
      $('race-ssd-input').textContent=`${ssd.width}×${ssd.height}`;
      $('race-ssd-inf').textContent=api.ms(ssd.infMs);
      $('race-ssd-total').textContent=api.ms(ssd.totalMs);
      $('race-ssd-count').textContent=String(ssd.visible);

      setStatus('Running YOLOX-Nano with official preprocessing…','loading');
      const yCanvas=$('race-yolo-canvas');
      const yolo=await runYolox(state.image,yCanvas);
      $('race-yolo-empty').hidden=true;yCanvas.hidden=false;
      $('race-yolo-inf').textContent=api.ms(yolo.infMs);
      $('race-yolo-total').textContent=api.ms(yolo.totalMs);
      $('race-yolo-count').textContent=String(yolo.visible);
      const diff=compare(ssd.detections,yolo.detections);
      $('race-both').textContent=String(diff.both);
      $('race-ssd-only').textContent=String(diff.ssdOnly);
      $('race-yolo-only').textContent=String(diff.yoloOnly);
      setStatus(`Race complete: SSD ${ssd.visible} detections vs YOLOX ${yolo.visible}; ${diff.both} spatial/class matches.`);
    }catch(err){
      console.error(err);
      const message=err && err.message ? err.message : String(err);
      setStatus(message==='Load failed' ? 'YOLOX load failed in this browser. Both the official GitHub asset and pinned Hugging Face fallback were attempted; see console for details.' : message,'error');
    }finally{
      state.running=false;$('race-run').disabled=!state.image;$('race-use-current').disabled=false;
    }
  });
})();