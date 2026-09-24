(() => {
  'use strict';
  const api=window.VisionLab,registry=window.VisionModels,runtimes=window.VisionRuntimeRegistry;
  if(!api||!registry||!runtimes)return;

  const $=id=>document.getElementById(id),VERSION=registry.version||'0.11.0',WORK_MAX=640,DIGIT_SCORE_FLOOR=.70;
  const state={worker:null,workerReady:null,pending:new Map(),seq:0,runToken:0,running:false,digitSession:null,alexnetSession:null,alexnetAbort:null,imagenetLabels:null,result:null,image:null};

  const ms=value=>Number.isFinite(value)?value.toFixed(1)+' ms':'—';
  const setText=(id,value)=>{const element=$(id);if(element)element.textContent=String(value)};
  const setStatus=(message,kind='')=>{const element=$('history-status');if(!element)return;element.textContent=message;element.className=`status ${kind}`.trim()};
  const setRuntime=value=>setText('history-runtime-state',value);
  const clearClassification=()=>{const section=$('history-classification'),list=$('history-classification-results');if(section)section.hidden=true;if(list)list.replaceChildren()};

  function workingImage(source){
    const size=api.sourceSize(source),scale=Math.min(1,WORK_MAX/Math.max(size.w,size.h)),width=Math.max(1,Math.round(size.w*scale)),height=Math.max(1,Math.round(size.h*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(source,0,0,width,height);
    return{canvas,width,height,imageData:context.getImageData(0,0,width,height)};
  }

  function drawBase(source,width,height){
    const canvas=$('image-canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d');context.clearRect(0,0,width,height);context.drawImage(source,0,0,width,height);
    canvas.hidden=false;$('image-empty').hidden=true;
    return canvas;
  }

  function drawBoxes(source,width,height,boxes,labelFor){
    const canvas=drawBase(source,width,height),context=canvas.getContext('2d');
    context.lineWidth=Math.max(2,width/280);context.font=`600 ${Math.max(12,Math.round(width/42))}px system-ui,sans-serif`;context.textBaseline='top';
    for(const item of boxes){
      const box=item.box||item,x=Math.max(0,box.x),y=Math.max(0,box.y),w=Math.max(0,Math.min(width-x,box.width)),h=Math.max(0,Math.min(height-y,box.height));
      const label=labelFor(item),textWidth=context.measureText(label).width+12,textHeight=Math.max(22,width/34);
      context.strokeStyle='#1d6f63';context.fillStyle='rgba(29,111,99,.13)';context.strokeRect(x,y,w,h);context.fillRect(x,y,w,h);
      context.fillStyle='#171915';context.fillRect(x,Math.max(0,y-textHeight),Math.min(width-x,textWidth),textHeight);
      context.fillStyle='#fff';context.fillText(label,x+6,Math.max(1,y-textHeight+3));
    }
    return canvas;
  }

  function poolMax(source,width,height){
    const outWidth=Math.ceil(width/2),outHeight=Math.ceil(height/2),out=new Float32Array(outWidth*outHeight);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const target=(Math.floor(y/2)*outWidth)+Math.floor(x/2),value=source[y*width+x];
      if(value>out[target])out[target]=value;
    }
    return{data:out,width:outWidth,height:outHeight};
  }

  function patternResponse(imageData,width,height){
    const start=performance.now(),rgba=imageData.data,gray=new Float32Array(width*height);
    for(let i=0,p=0;i<gray.length;i++,p+=4)gray[i]=rgba[p]*.299+rgba[p+1]*.587+rgba[p+2]*.114;
    const filters=[
      [-1,0,1,-2,0,2,-1,0,1],
      [-1,-2,-1,0,0,0,1,2,1],
      [-2,-1,0,-1,0,1,0,1,2],
      [0,1,2,-1,0,1,-2,-1,0]
    ];
    const response=new Float32Array(width*height);
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      let strongest=0;
      for(const filter of filters){
        let total=0,k=0;
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)total+=gray[(y+dy)*width+x+dx]*filter[k++];
        strongest=Math.max(strongest,Math.abs(total));
      }
      response[y*width+x]=Math.min(1,strongest/1020);
    }
    const first=poolMax(response,width,height),second=poolMax(first.data,first.width,first.height);
    return{map:second,width,height,durationMs:performance.now()-start};
  }

  function drawPattern(source,work,output){
    const canvas=drawBase(source,work.width,work.height),layer=document.createElement('canvas');
    layer.width=output.map.width;layer.height=output.map.height;
    const context=layer.getContext('2d'),image=context.createImageData(layer.width,layer.height);
    for(let i=0;i<output.map.data.length;i++){
      const value=Math.max(0,Math.min(1,output.map.data[i])),offset=i*4;
      image.data[offset]=Math.round(191+64*value);image.data[offset+1]=Math.round(75+90*value);image.data[offset+2]=Math.round(43+40*value);
      image.data[offset+3]=Math.round(Math.max(0,value-.08)*165);
    }
    context.putImageData(image,0,0);
    const target=canvas.getContext('2d');target.imageSmoothingEnabled=false;target.drawImage(layer,0,0,work.width,work.height);
  }

  function rejectPending(message){
    for(const item of state.pending.values())item.reject(new Error(message));
    state.pending.clear();
  }

  function disposeWorker(reason='released'){
    if(state.worker){state.worker.terminate();state.worker=null}
    state.workerReady=null;rejectPending('OpenCV worker '+reason+'.');
  }

  function workerRequest(type,payload={},transfer=[]){
    return new Promise((resolve,reject)=>{
      if(!state.worker){reject(new Error('OpenCV worker is not available.'));return}
      const id=++state.seq;state.pending.set(id,{resolve,reject});
      try{state.worker.postMessage({id,type,...payload},transfer)}
      catch(error){state.pending.delete(id);reject(error)}
    });
  }

  async function ensureWorker(){
    if(state.workerReady)return state.workerReady;
    const started=performance.now();
    state.worker=new Worker(`src/history/classical-cv-worker.js?v=${VERSION}`);
    state.worker.onmessage=event=>{
      const message=event.data||{},pending=state.pending.get(message.id);if(!pending)return;
      state.pending.delete(message.id);
      if(message.ok)pending.resolve(message);else pending.reject(new Error(message.error?.message||'OpenCV worker failed.'));
    };
    state.worker.onerror=event=>{
      const message=event.message||'OpenCV worker failed.';rejectPending(message);disposeWorker('after error');setRuntime('worker error');
    };
    state.workerReady=workerRequest('init').then(info=>{
      const elapsed=performance.now()-started;setRuntime('OpenCV.js '+(info.opencvVersion||'4.12.0')+' ready');
      return{...info,elapsed};
    }).catch(error=>{disposeWorker('after initialization failure');throw error});
    return state.workerReady;
  }

  async function runWorker(method,work){
    await ensureWorker();
    const pixels=work.imageData.data.slice().buffer;
    return workerRequest('run',{method,width:work.width,height:work.height,pixels},[pixels]);
  }

  async function releaseDigitSession(){
    const session=state.digitSession;state.digitSession=null;
    if(session&&typeof session.release==='function')try{await session.release()}catch(error){console.warn('Historical digit session release failed',error)}
  }

  async function releaseAlexNetSession(){
    if(state.alexnetAbort){state.alexnetAbort.abort();state.alexnetAbort=null}
    const session=state.alexnetSession;state.alexnetSession=null;
    if(session&&typeof session.release==='function')try{await session.release()}catch(error){console.warn('Historical AlexNet session release failed',error)}
  }

  async function releaseAll({status='released'}={}){
    state.runToken++;state.running=false;disposeWorker();
    await Promise.all([releaseDigitSession(),releaseAlexNetSession()]);
    if(status)setRuntime(status);
  }

  function softmax(logits){
    const max=Math.max(...logits),exp=logits.map(value=>Math.exp(value-max)),sum=exp.reduce((a,b)=>a+b,0);
    return exp.map(value=>value/(sum||1));
  }

  function prepareDigitTensor(canvas,box){
    const side=28,crop=document.createElement('canvas');crop.width=side;crop.height=side;
    const context=crop.getContext('2d',{willReadFrequently:true});context.fillStyle='#fff';context.fillRect(0,0,side,side);
    const margin=Math.max(2,Math.round(Math.max(box.width,box.height)*.12)),x=Math.max(0,box.x-margin),y=Math.max(0,box.y-margin);
    const right=Math.min(canvas.width,box.x+box.width+margin),bottom=Math.min(canvas.height,box.y+box.height+margin);
    const cropWidth=Math.max(1,right-x),cropHeight=Math.max(1,bottom-y),scale=20/Math.max(cropWidth,cropHeight),drawWidth=cropWidth*scale,drawHeight=cropHeight*scale;
    context.drawImage(canvas,x,y,cropWidth,cropHeight,(side-drawWidth)/2,(side-drawHeight)/2,drawWidth,drawHeight);
    const rgba=context.getImageData(0,0,side,side).data,gray=new Uint8Array(side*side);let borderTotal=0,borderCount=0,overall=0;
    for(let py=0;py<side;py++)for(let px=0;px<side;px++){
      const index=py*side+px,offset=index*4,value=Math.round(rgba[offset]*.299+rgba[offset+1]*.587+rgba[offset+2]*.114);
      gray[index]=value;overall+=value;
      if(px<2||py<2||px>=side-2||py>=side-2){borderTotal+=value;borderCount++}
    }
    const darkInk=borderTotal/borderCount>overall/gray.length,output=new Float32Array(side*side);
    for(let i=0;i<output.length;i++)output[i]=darkInk?(255-gray[i])/255:gray[i]/255;
    return output;
  }

  async function loadDigitSession(spec){
    if(!window.ort?.InferenceSession||!window.crypto?.subtle)throw new Error('ONNX Runtime Web or secure SHA-256 support is unavailable.');
    const model=spec.model,started=performance.now(),response=await fetch(model.url,{mode:'cors',cache:'default'});
    if(!response.ok)throw new Error('MNIST model download failed: HTTP '+response.status);
    const buffer=await response.arrayBuffer();
    if(buffer.byteLength<10000)throw new Error('MNIST model download was smaller than the expected ONNX asset.');
    if(model.bytes&&buffer.byteLength!==model.bytes)throw new Error('MNIST model size did not match the pinned ONNX asset.');
    const digest=await window.crypto.subtle.digest('SHA-256',buffer),actual=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
    if(actual!==model.sha256)throw new Error('MNIST model SHA-256 verification failed; the unverified model was discarded.');
    const session=await window.ort.InferenceSession.create(new Uint8Array(buffer),{executionProviders:['wasm']});
    state.digitSession=session;
    return{session,elapsedMs:performance.now()-started,bytes:buffer.byteLength};
  }

  async function loadAlexNetSession(spec,runId){
    if(!window.ort?.InferenceSession||!window.crypto?.subtle)throw new Error('ONNX Runtime Web or secure SHA-256 support is unavailable.');
    const model=spec.model,started=performance.now(),controller=new AbortController();state.alexnetAbort=controller;
    let session=null;
    try{
      const response=await fetch(model.url,{mode:'cors',cache:'default',signal:controller.signal});
      if(!response.ok)throw new Error('AlexNet model download failed: HTTP '+response.status);
      const buffer=await response.arrayBuffer();
      if(runId!==state.runToken)return null;
      if(buffer.byteLength!==model.bytes)throw new Error('AlexNet model size did not match the pinned ONNX asset.');
      const digest=await window.crypto.subtle.digest('SHA-256',buffer),actual=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
      if(actual!==model.sha256)throw new Error('AlexNet model SHA-256 verification failed; the unverified model was discarded.');
      session=await window.ort.InferenceSession.create(new Uint8Array(buffer),{executionProviders:['wasm']});
      if(runId!==state.runToken){await session.release();return null}
      if(session.inputNames[0]!=='data_0'||session.outputNames[0]!=='prob_1')throw new Error('AlexNet ONNX input/output contract did not match the pinned checkpoint.');
      state.alexnetSession=session;session=null;
      return{session:state.alexnetSession,elapsedMs:performance.now()-started,bytes:buffer.byteLength};
    }finally{
      if(session)try{await session.release()}catch{}
      if(state.alexnetAbort===controller)state.alexnetAbort=null;
    }
  }

  async function loadImageNetLabels(spec){
    if(state.imagenetLabels)return state.imagenetLabels;
    const response=await fetch(new URL(spec.model.labels,location.href),{cache:'default'});
    if(!response.ok)throw new Error('ImageNet label list failed to load: HTTP '+response.status);
    const buffer=await response.arrayBuffer(),digest=await window.crypto.subtle.digest('SHA-256',buffer),actual=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
    if(actual!==spec.model.labelsSha256)throw new Error('ImageNet label list SHA-256 verification failed.');
    const labels=JSON.parse(new TextDecoder().decode(buffer));
    if(!Array.isArray(labels)||labels.length!==1000||labels.some(item=>typeof item?.label!=='string'||!item.label))throw new Error('ImageNet label list must contain exactly 1,000 named classes.');
    state.imagenetLabels=labels;return labels;
  }

  function prepareAlexNetTensor(work,model){
    const {width,height,mean}=model.input,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    context.drawImage(work.canvas,0,0,width,height);
    const rgba=context.getImageData(0,0,width,height).data,plane=width*height,tensor=new Float32Array(3*plane);
    for(let i=0;i<plane;i++){
      const offset=i*4;
      tensor[i]=rgba[offset+2]-mean[0];
      tensor[plane+i]=rgba[offset+1]-mean[1];
      tensor[plane*2+i]=rgba[offset]-mean[2];
    }
    return tensor;
  }

  async function runAlexNet(spec,source,runId){
    const work=workingImage(source),prepStart=performance.now(),input=prepareAlexNetTensor(work,spec.model),preprocessMs=performance.now()-prepStart;
    setRuntime('Loading pinned AlexNet INT8 ONNX model · WASM');setStatus('Preparing the pinned AlexNet checkpoint and ImageNet labels…','loading');
    const labelsPromise=loadImageNetLabels(spec),loadedPromise=state.alexnetSession?Promise.resolve({session:state.alexnetSession,elapsedMs:0,bytes:spec.model.bytes,reused:true}):loadAlexNetSession(spec,runId);
    const [labels,loaded]=await Promise.all([labelsPromise,loadedPromise]);
    if(runId!==state.runToken||!loaded)return;
    setRuntime('AlexNet ONNX INT8 session ready · WASM');
    const session=loaded.session,inferenceStart=performance.now(),outputs=await session.run({[session.inputNames[0]]:new window.ort.Tensor('float32',input,[1,3,224,224])}),scores=outputs[session.outputNames[0]]?.data;
    const inferenceMs=performance.now()-inferenceStart;
    if(runId!==state.runToken)return;
    if(!scores||scores.length!==1000||Array.from(scores).some(value=>!Number.isFinite(Number(value))||Number(value)<0||Number(value)>1))throw new Error('AlexNet ONNX output did not contain 1,000 finite ImageNet probabilities.');
    const probabilitySum=Array.from(scores).reduce((sum,value)=>sum+Number(value),0);
    if(Math.abs(probabilitySum-1)>.01)throw new Error('AlexNet output did not match its pinned 1,000-class probability contract.');
    const top=Array.from(scores,(score,index)=>({score:Number(score),index})).sort((a,b)=>b.score-a.score).slice(0,5);
    const results=$('history-classification-results'),section=$('history-classification');results.replaceChildren();
    for(const item of top){
      const row=document.createElement('li'),label=document.createElement('span'),score=document.createElement('b');
      label.textContent=labels[item.index].label;score.textContent=(item.score*100).toFixed(1)+'%';row.append(label,score);results.appendChild(row);
    }
    section.hidden=false;drawBase(source,work.width,work.height);state.result={kind:'classification',source,work,top};
    setText('history-input-size',work.width+'×'+work.height+' → 224×224');setText('history-output-count','Top 5 · 1,000 ImageNet classes');
    setText('history-preprocess',ms(preprocessMs)+' · direct resize + BGR means');setText('history-inference',ms(inferenceMs));
    setText('history-load',loaded.reused?'cached session':ms(loaded.elapsedMs)+' · '+(loaded.bytes/1e6).toFixed(1)+' MB');
    setStatus('AlexNet ranked the full image against 1,000 ImageNet classes. Scores are not calibrated confidence; no object boxes are produced.');
  }

  async function runDigits(spec,source,runId){
    const work=workingImage(source),proposals=await runWorker('digits',work);
    if(runId!==state.runToken)return;
    const proposalMs=Number(proposals.proposalMs)||0;
    disposeWorker('after digit-region proposal');
    setRuntime('Loading pinned MNIST ONNX model · WASM');
    setStatus('Digit-like regions found. Verifying and loading the pinned MNIST model…','loading');
    if(!proposals.boxes.length){
      drawBase(source,work.width,work.height);state.result={kind:'digits',source,work,detections:[]};
      setText('history-input-size',work.width+'×'+work.height+' · working image');setText('history-output-count','0 digit-like regions');
      setText('history-preprocess',ms(proposalMs));setText('history-inference','—');setText('history-load','skipped · no candidates');
      setRuntime('OpenCV worker released · model not loaded');
      setStatus('No digit-like regions were found. This experiment recognizes isolated handwritten digits only; it does not detect general objects or arbitrary text.');
      return;
    }
    const prepStart=performance.now(),tensors=proposals.boxes.map(box=>({box,tensor:prepareDigitTensor(work.canvas,box)})),cropPrepMs=performance.now()-prepStart;
    if(runId!==state.runToken)return;
    const loaded=await loadDigitSession(spec);
    if(runId!==state.runToken){await releaseDigitSession();return}
    setRuntime('MNIST ONNX session ready · WASM');
    const session=loaded.session,inputName=session.inputNames[0],outputName=session.outputNames[0],detections=[],inferenceStart=performance.now();
    for(const item of tensors){
      if(runId!==state.runToken)return;
      const tensor=new window.ort.Tensor('float32',item.tensor,[1,1,28,28]),outputs=await session.run({[inputName]:tensor}),logits=Array.from(outputs[outputName]?.data||[]);
      if(logits.length<10||logits.slice(0,10).some(value=>!Number.isFinite(Number(value))))throw new Error('MNIST ONNX output did not contain ten finite digit scores.');
      const probabilities=softmax(logits.slice(0,10));let digit=0;
      for(let i=1;i<probabilities.length;i++)if(probabilities[i]>probabilities[digit])digit=i;
      detections.push({box:item.box,digit,score:probabilities[digit]});
    }
    const inferenceMs=performance.now()-inferenceStart;
    if(runId!==state.runToken)return;
    state.result={kind:'digits',source,work,detections};
    const visible=detections.filter(item=>item.score>=DIGIT_SCORE_FLOOR);
    drawBoxes(source,work.width,work.height,visible,item=>item.digit+' · score '+Math.round(item.score*100)+'%');
    setText('history-input-size',work.width+'×'+work.height+' → 28×28 crops');
    setText('history-output-count',visible.length+' digit'+(visible.length===1?'':'s')+' · '+detections.length+' candidates');
    setText('history-preprocess',ms(proposalMs+cropPrepMs));setText('history-inference',ms(inferenceMs));setText('history-load',ms(loaded.elapsedMs)+' · '+Math.round(loaded.bytes/1024)+' KB');
    if(visible.length)setStatus(visible.length+' handwritten digit candidate'+(visible.length===1?'':'s')+' shown. The model only classifies digit crops; this is not general object detection.');
    else setStatus('No digit candidate reached the 70% display score. This experiment recognizes isolated handwritten digits only; it does not detect general objects or arbitrary text.');
  }

  async function runExperiment(key,source){
    const spec=registry.historyExperiments?.[key];if(!spec)throw new Error('Historical image experiment is not registered.');
    if(!source)throw new Error('Choose an image in Time Machine first.');
    if(state.running)throw new Error('A historical experiment is already running.');
    const runId=++state.runToken;state.running=true;state.image=source;state.result=null;
    setText('history-experiment-title',spec.year+' · '+spec.title);setText('history-experiment-description',spec.description||'This historical method runs on the selected Time Machine image.');
    setText('history-experiment-note',spec.note||'This method keeps its own task and output type.');
    setText('history-input-size','Preparing…');setText('history-output-count','—');setText('history-preprocess','—');setText('history-inference','—');setText('history-load','—');
    $('history-classification').hidden=true;$('history-classification-results').replaceChildren();
    const initialWork=workingImage(source);drawBase(source,initialWork.width,initialWork.height);
    setRuntime('Releasing active model runtimes…');setStatus('Preparing the selected historical method on the current image…','loading');
    try{
      await Promise.all([releaseDigitSession(),releaseAlexNetSession()]);
      await runtimes.releaseAll();
      if(runId!==state.runToken)return;
      if(spec.runner==='pattern-response'){
        disposeWorker();const work=workingImage(source),response=patternResponse(work.imageData,work.width,work.height);
        if(runId!==state.runToken)return;
        drawPattern(source,work,response);state.result={kind:'pattern',source,work};
        setText('history-input-size',work.width+'×'+work.height+' · working image');setText('history-output-count','4 orientations · 2 max-pooling stages');
        setText('history-preprocess','grayscale + oriented filters');setText('history-inference',ms(response.durationMs));setText('history-load','not applicable · no weights');
        setRuntime('CPU feature preview · no checkpoint');
        setStatus('Pattern-response preview complete. The overlay shows local edge-pattern responses, not recognized objects.');
      }else if(spec.workerMethod==='face'||spec.workerMethod==='hog'){
        const work=workingImage(source),workerInfo=await ensureWorker();
        if(runId!==state.runToken)return;
        const result=await runWorker(spec.workerMethod,work);
        if(runId!==state.runToken)return;
        drawBoxes(source,work.width,work.height,result.boxes,()=>spec.workerMethod==='face'?'frontal face':'person');
        setText('history-input-size',work.width+'×'+work.height+' · working image');setText('history-output-count',result.boxes.length+' '+(spec.workerMethod==='face'?'face':'pedestrian')+(result.boxes.length===1?'':'s'));
        setText('history-preprocess',spec.workerMethod==='face'?'RGBA → grayscale → histogram equalization':'RGBA → RGB → 64×128 sliding windows');setText('history-inference',ms(result.inferenceMs));
        const assetMs=Number.isFinite(result.asset?.loadMs)?result.asset.loadMs:workerInfo.elapsed;
        setText('history-load',result.asset?(result.asset.reused?'cached cascade':ms(assetMs)+' · cascade'):ms(workerInfo.elapsed)+' · OpenCV.js');
        setStatus(result.boxes.length?result.boxes.length+' task-specific region'+(result.boxes.length===1?'':'s')+' found. This method does not detect general objects.':'Completed with 0 regions. This detector only searches for '+(spec.workerMethod==='face'?'frontal faces.':'pedestrians.'));
      }else if(spec.runner==='mnist-digit-cnn'){
        await runDigits(spec,source,runId);
      }else if(spec.runner==='alexnet-image-classification'){
        await runAlexNet(spec,source,runId);
      }else throw new Error('No browser runner is registered for this historical experiment.');
    }catch(error){
      if(runId!==state.runToken) return;
      disposeWorker('after experiment failure');await Promise.all([releaseDigitSession(),releaseAlexNetSession()]);setRuntime('error');
      setStatus(error?.message||String(error),'error');throw error;
    }finally{
      if(runId===state.runToken)state.running=false;
    }
  }

  function clear(){
    state.result=null;state.image=null;clearClassification();
    return releaseAll({status:'released'});
  }

  function reset(){
    state.result=null;state.image=null;clearClassification();
    return releaseAll({status:'not loaded'});
  }

  async function release(){
    await releaseAll({status:'released'});
    setStatus(state.result?'Historical runtime released. The displayed result remains available; run again to reinitialize.':'Historical runtime released. Run the selected experiment to initialize it again.');
  }

  document.addEventListener('vision:tabchange',event=>{
    if(event.detail?.tab!=='time-machine')void release();
  });
  window.addEventListener('pagehide',()=>void releaseAll({status:'released'}));
  setRuntime('not loaded');

  window.VisionHistoryExperiments=Object.freeze({run:runExperiment,clear,reset,release,isRunning:()=>state.running});
})();
