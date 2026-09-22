(() => {
  'use strict';
  const api=window.VisionLab,registry=window.VisionModels,runtimes=window.VisionRuntimeRegistry;
  if(!api||!registry||!runtimes)return;
  const $=id=>document.getElementById(id),VERSION='0.8.0',WORK_MAX=640;
  const state={image:null,running:false,worker:null,workerReady:null,pending:new Map(),seq:0,aiResult:null,aiModel:'',workerInitMs:NaN};

  const ms=value=>Number.isFinite(value)?value.toFixed(1)+' ms':'—';
  const sourceSize=source=>api.sourceSize(source);
  const confidence=()=>api.getConfidence();
  const setStatus=(text,kind='')=>{const el=$('classical-status');if(!el)return;el.textContent=text;el.className=`status ${kind}`.trim()};
  const setText=(id,text)=>{const el=$(id);if(el)el.textContent=text};

  function workingImage(source){
    const {w,h}=sourceSize(source),scale=Math.min(1,WORK_MAX/Math.max(w,h)),width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(source,0,0,width,height);
    return{canvas,width,height,imageData:canvas.getContext('2d').getImageData(0,0,width,height)};
  }

  function drawBase(canvas,source,width,height){
    canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);ctx.drawImage(source,0,0,width,height);canvas.hidden=false;
  }

  function drawClassical(canvas,source,width,height,boxes,label){
    drawBase(canvas,source,width,height);
    const ctx=canvas.getContext('2d');ctx.lineWidth=Math.max(2,width/260);ctx.font=`600 ${Math.max(12,Math.round(width/42))}px system-ui,sans-serif`;ctx.textBaseline='top';
    for(const box of boxes){
      const x=Math.max(0,box.x),y=Math.max(0,box.y),w=Math.max(0,Math.min(width-x,box.width)),h=Math.max(0,Math.min(height-y,box.height));
      ctx.strokeStyle='#1d6f63';ctx.fillStyle='rgba(29,111,99,.12)';ctx.strokeRect(x,y,w,h);ctx.fillRect(x,y,w,h);
      const text=label,tw=ctx.measureText(text).width+12,th=Math.max(22,width/34);ctx.fillStyle='#171915';ctx.fillRect(x,Math.max(0,y-th),tw,th);ctx.fillStyle='#fff';ctx.fillText(text,x+6,Math.max(1,y-th+3));
    }
  }

  function normalizedBoxes(boxes,width,height){
    return boxes.map(box=>({box:[box.y/height,box.x/width,(box.y+box.height)/height,(box.x+box.width)/width]}));
  }
  function iou(a,b){
    const y1=Math.max(a[0],b[0]),x1=Math.max(a[1],b[1]),y2=Math.min(a[2],b[2]),x2=Math.min(a[3],b[3]),inter=Math.max(0,y2-y1)*Math.max(0,x2-x1);
    const aa=Math.max(0,a[2]-a[0])*Math.max(0,a[3]-a[1]),bb=Math.max(0,b[2]-b[0])*Math.max(0,b[3]-b[1]);
    return inter/(aa+bb-inter||1);
  }
  function overlapPeople(hogBoxes,aiDetections,width,height){
    const classical=normalizedBoxes(hogBoxes,width,height),ai=(aiDetections||[]).filter(d=>d.label==='person'&&d.score>=confidence()),used=new Set();let matches=0;
    for(const item of classical){let best=-1,bestIou=.35;for(let i=0;i<ai.length;i++){if(used.has(i))continue;const value=iou(item.box,ai[i].box);if(value>=bestIou){best=i;bestIou=value}}if(best>=0){used.add(best);matches++}}
    return{matches,hog:classical.length,ai:ai.length};
  }

  function rejectPending(message){
    for(const {reject} of state.pending.values())reject(new Error(message));state.pending.clear();
  }
  function disposeWorker(reason='released'){
    if(state.worker){state.worker.terminate();state.worker=null}
    state.workerReady=null;state.workerInitMs=NaN;rejectPending('OpenCV worker '+reason+'.');setText('classical-runtime-state','released');
  }
  function workerRequest(type,payload={},transfer=[]){
    return new Promise((resolve,reject)=>{
      if(!state.worker)return reject(new Error('OpenCV worker is not available.'));
      const id=++state.seq;state.pending.set(id,{resolve,reject});
      state.worker.postMessage({id,type,...payload},transfer);
    });
  }
  async function ensureWorker(){
    if(state.workerReady)return state.workerReady;
    const started=performance.now();
    state.worker=new Worker(`classical-cv-worker.js?v=${VERSION}`);
    state.worker.onmessage=event=>{
      const message=event.data||{},pending=state.pending.get(message.id);if(!pending)return;state.pending.delete(message.id);
      if(message.ok)pending.resolve(message);else pending.reject(new Error(message.error?.message||'Classical CV worker failed.'));
    };
    state.worker.onerror=event=>{const message=event.message||'OpenCV worker failed.';rejectPending(message);disposeWorker('after error')};
    state.workerReady=workerRequest('init').then(info=>{state.workerInitMs=performance.now()-started;setText('classical-runtime-state','ready · OpenCV.js '+(info.opencvVersion||'4.12.0'));return info}).catch(error=>{disposeWorker('after initialization failure');throw error});
    return state.workerReady;
  }
  async function runWorker(method,work){
    await ensureWorker();
    const bytes=work.imageData.data.slice().buffer;
    return workerRequest('run',{method,width:work.width,height:work.height,pixels:bytes},[bytes]);
  }

  function setSource(source,label){
    state.image=source;state.aiResult=null;state.aiModel='';state.aiDisplay=null;state.lastHog=[];$('classical-run').disabled=false;
    for(const id of ['classical-face-canvas','classical-hog-canvas','classical-ai-canvas']){const canvas=$(id);canvas.hidden=true}
    for(const id of ['classical-face-empty','classical-hog-empty','classical-ai-empty'])$(id).hidden=false;
    for(const id of ['classical-face-input','classical-face-init','classical-face-asset','classical-face-inf','classical-face-count','classical-hog-input','classical-hog-init','classical-hog-inf','classical-hog-count','classical-ai-input','classical-ai-backend','classical-ai-inf','classical-ai-count'])setText(id,'—');
    setText('classical-person-overlap','—');setText('classical-ai-reference','Current Time Machine model at run start');setStatus(label+' ready. Run the task-aware comparison.');
  }

  function setRunning(on){
    state.running=on;
    for(const id of ['classical-image-file','classical-use-current','classical-run','classical-release']){const el=$(id);if(el)el.disabled=on||(!state.image&&id==='classical-run')}
  }

  async function runAi(source){
    const key=api.getActiveModel(),adapter=runtimes.get(key),model=registry[key];if(!adapter||!model)throw new Error('Active AI runtime is unavailable.');
    state.aiModel=key;setText('classical-ai-title',model.title);setText('classical-ai-reference',model.title+' · locked for this run');
    await runtimes.releaseAll();
    try{
      const result=await adapter.run(source,$('classical-ai-canvas'),{benchmarking:true,updateMain:false});
      state.aiResult=result;state.aiDisplay={width:$('classical-ai-canvas').width,height:$('classical-ai-canvas').height};
      const info=adapter.runtimeInfo?.()||{},backend=info.dtype?`${info.backend||adapter.backend()} · ${info.dtype}`:(info.backend||adapter.backend()||'—');
      setText('classical-ai-input',Number.isFinite(result.width)&&Number.isFinite(result.height)?result.width+'×'+result.height:'native');
      setText('classical-ai-backend',String(backend).toUpperCase());setText('classical-ai-inf',ms(result.infMs));setText('classical-ai-count',String(result.visible));
      $('classical-ai-empty').hidden=true;$('classical-ai-canvas').hidden=false;
      return result;
    }finally{await adapter.release()}
  }

  function redrawAi(){
    if(!state.image||!state.aiResult)return;
    const canvas=$('classical-ai-canvas'),width=state.aiDisplay?.width||canvas.width||sourceSize(state.image).w,height=state.aiDisplay?.height||canvas.height||sourceSize(state.image).h;
    drawBase(canvas,state.image,width,height);state.aiResult.visible=api.drawDetections(canvas,state.aiResult.detections);setText('classical-ai-count',String(state.aiResult.visible));
    const work=workingImage(state.image),overlap=overlapPeople(state.lastHog||[],state.aiResult.detections,work.width,work.height);setText('classical-person-overlap',`${overlap.matches} match · HOG ${overlap.hog} · AI person ${overlap.ai}`);
  }

  async function runComparison(){
    if(!state.image||state.running)return;
    setRunning(true);setStatus('Running the AI reference first so its runtime can be released before OpenCV.js loads…','loading');
    try{
      const source=state.image,work=workingImage(source);
      const ai=await runAi(source);
      setStatus('AI reference released. Loading isolated OpenCV.js worker…','loading');
      await ensureWorker();
      setText('classical-face-init',ms(state.workerInitMs));setText('classical-hog-init','reused');
      setText('classical-face-input',work.width+'×'+work.height);setText('classical-hog-input',work.width+'×'+work.height);

      setStatus('Running Viola–Jones-era frontal-face cascade…','loading');
      const face=await runWorker('face',work);drawClassical($('classical-face-canvas'),source,work.width,work.height,face.boxes,'face');
      $('classical-face-empty').hidden=true;setText('classical-face-asset',face.asset?.reused?'memory':(Number.isFinite(face.asset?.loadMs)?ms(face.asset.loadMs):'loaded'));setText('classical-face-inf',ms(face.inferenceMs));setText('classical-face-count',String(face.boxes.length));

      setStatus('Running HOG + linear SVM pedestrian detector…','loading');
      const hog=await runWorker('hog',work);state.lastHog=hog.boxes;drawClassical($('classical-hog-canvas'),source,work.width,work.height,hog.boxes,'person');
      $('classical-hog-empty').hidden=true;setText('classical-hog-inf',ms(hog.inferenceMs));setText('classical-hog-count',String(hog.boxes.length));

      const overlap=overlapPeople(hog.boxes,ai.detections,work.width,work.height);
      setText('classical-person-overlap',`${overlap.matches} match · HOG ${overlap.hog} · AI person ${overlap.ai}`);
      setStatus('Comparison complete. The source image was shared, but each method kept its native task and preprocessing. Counts and overlap are evidence, not accuracy labels.');
    }catch(error){
      console.error(error);setStatus(error.message||String(error),'error');
    }finally{setRunning(false)}
  }

  $('classical-image-file').addEventListener('change',event=>{
    const file=event.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){setStatus('Please choose an image file.','error');return}
    const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);setSource(img,'Local image')};img.onerror=()=>{URL.revokeObjectURL(url);setStatus('The selected image could not be decoded.','error')};img.src=url;
  });
  $('classical-use-current').addEventListener('click',()=>{const image=api.getImage();if(!image){setStatus('Time Machine has no image yet. Choose an image here or run one there first.','error');return}setSource(image,'Time Machine image')});
  $('classical-run').addEventListener('click',runComparison);
  $('classical-release').addEventListener('click',()=>{disposeWorker();setStatus('OpenCV.js worker released. The next classical run will initialize it again.')});
  $('confidence').addEventListener('input',redrawAi);
  document.addEventListener('vision:tabchange',event=>{
    const tab=event.detail?.tab;
    if(tab==='classical-cv'&&!state.image){const image=api.getImage();if(image)setSource(image,'Time Machine image')}
    if(tab!=='classical-cv'&&state.worker)disposeWorker('after leaving Classical CV');
  });
  window.addEventListener('pagehide',()=>disposeWorker('on pagehide'));
  setText('classical-runtime-state','not loaded');
})();
