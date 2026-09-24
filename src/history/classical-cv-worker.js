'use strict';

const OPENCV_URL='https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.12.0-release.1/dist/opencv.js';
const CASCADE_URL='https://cdn.jsdelivr.net/gh/opencv/opencv@49486f61fb25722cbcf586b7f4320921d46fb38e/data/haarcascades/haarcascade_frontalface_default.xml';
const CASCADE_FILE='haarcascade_frontalface_default.xml';

let cvPromise=null;
let cascadeReady=false;
let cascadeBytes=0;
let cascadeLoadMs=NaN;

function safeDelete(value){try{value?.delete?.()}catch(_){}}

async function getCv(){
  if(cvPromise)return cvPromise;
  cvPromise=(async()=>{
    const started=performance.now();
    importScripts(OPENCV_URL);
    let module=self.cv;
    if(!module)throw new Error('OpenCV.js did not expose cv in the worker.');
    if(module instanceof Promise)module=await module;
    else if(!module.Mat){
      await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('OpenCV.js runtime initialization timed out.')),30000);
        const previous=module.onRuntimeInitialized;
        module.onRuntimeInitialized=()=>{clearTimeout(timeout);try{previous?.()}catch(_){}resolve()};
      });
    }
    if(!module.Mat||!module.HOGDescriptor||!module.CascadeClassifier)throw new Error('Required OpenCV.js object-detection bindings are unavailable.');
    self.cv=module;
    return{cv:module,startupMs:performance.now()-started};
  })().catch(error=>{cvPromise=null;throw error});
  return cvPromise;
}

async function ensureCascade(cv){
  if(cascadeReady)return{bytes:cascadeBytes,loadMs:cascadeLoadMs,reused:true};
  const started=performance.now();
  const response=await fetch(CASCADE_URL,{cache:'force-cache'});
  if(!response.ok)throw new Error(`Cascade download failed: HTTP ${response.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  try{cv.FS_unlink('/'+CASCADE_FILE)}catch(_){}
  cv.FS_createDataFile('/',CASCADE_FILE,bytes,true,false,false);
  const classifier=new cv.CascadeClassifier();
  try{
    if(!classifier.load(CASCADE_FILE)||classifier.empty())throw new Error('OpenCV could not load the frontal-face cascade.');
  }finally{safeDelete(classifier)}
  cascadeReady=true;cascadeBytes=bytes.byteLength;cascadeLoadMs=performance.now()-started;
  return{bytes:cascadeBytes,loadMs:cascadeLoadMs,reused:false};
}

function makeRgbaMat(cv,width,height,pixels){
  const src=new cv.Mat(height,width,cv.CV_8UC4);
  src.data.set(new Uint8Array(pixels));
  return src;
}

function rectsToArray(vector){
  const out=[];
  for(let i=0;i<vector.size();i++){
    const rect=vector.get(i);
    out.push({x:rect.x,y:rect.y,width:rect.width,height:rect.height});
  }
  return out;
}

async function runFace(cv,width,height,pixels){
  const asset=await ensureCascade(cv);
  const src=makeRgbaMat(cv,width,height,pixels),gray=new cv.Mat(),faces=new cv.RectVector(),classifier=new cv.CascadeClassifier();
  try{
    cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY,0);
    cv.equalizeHist(gray,gray);
    if(!classifier.load(CASCADE_FILE)||classifier.empty())throw new Error('Frontal-face cascade is unavailable.');
    const started=performance.now();
    classifier.detectMultiScale(gray,faces,1.1,3,0,new cv.Size(24,24),new cv.Size(0,0));
    return{boxes:rectsToArray(faces),inferenceMs:performance.now()-started,asset};
  }finally{
    safeDelete(classifier);safeDelete(faces);safeDelete(gray);safeDelete(src);
  }
}

async function runHog(cv,width,height,pixels){
  const src=makeRgbaMat(cv,width,height,pixels),rgb=new cv.Mat(),rects=new cv.RectVector(),hog=new cv.HOGDescriptor();
  let detector=null,detectorMat=null,weights=null;
  try{
    cv.cvtColor(src,rgb,cv.COLOR_RGBA2RGB,0);
    detector=cv.HOGDescriptor.getDefaultPeopleDetector();
    const detectorSize=detector.size();
    if(!Number.isInteger(detectorSize)||detectorSize<1)throw new Error('OpenCV default people detector is empty.');
    detectorMat=new cv.Mat(detectorSize,1,cv.CV_32FC1);
    for(let index=0;index<detectorSize;index++)detectorMat.data32F[index]=detector.get(index);
    hog.setSVMDetector(detectorMat);
    const started=performance.now();
    weights=new cv.DoubleVector();
    hog.detectMultiScale(rgb,rects,weights,0,new cv.Size(8,8),new cv.Size(8,8),1.05,2,false);
    return{boxes:rectsToArray(rects),inferenceMs:performance.now()-started};
  }finally{
    safeDelete(weights);safeDelete(detectorMat);safeDelete(detector);safeDelete(hog);safeDelete(rects);safeDelete(rgb);safeDelete(src);
  }
}

function boxIoU(a,b){
  const x1=Math.max(a.x,b.x),y1=Math.max(a.y,b.y),x2=Math.min(a.x+a.width,b.x+b.width),y2=Math.min(a.y+a.height,b.y+b.height);
  const inter=Math.max(0,x2-x1)*Math.max(0,y2-y1),union=a.width*a.height+b.width*b.height-inter;
  return inter/(union||1);
}

function candidateBoxes(cv,binary,width,height){
  const contours=new cv.MatVector(),hierarchy=new cv.Mat();
  const found=[];
  try{
    cv.findContours(binary,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_SIMPLE);
    for(let index=0;index<contours.size();index++){
      const contour=contours.get(index);
      try{
        const rect=cv.boundingRect(contour),area=rect.width*rect.height,ratio=rect.width/Math.max(1,rect.height);
        if(rect.x<=1||rect.y<=1||rect.x+rect.width>=width-1||rect.y+rect.height>=height-1)continue;
        if(rect.width<6||rect.height<11||area<45||rect.width>width*.28||rect.height>height*.78||ratio<.12||ratio>2.4)continue;
        const splitCount=ratio>1.05?Math.max(1,Math.min(8,Math.round(ratio/.62))):1;
        if(splitCount>1&&rect.width/splitCount>=6&&rect.width/splitCount<=rect.height*1.2){
          const partWidth=rect.width/splitCount;
          for(let part=0;part<splitCount;part++)found.push({x:Math.round(rect.x+part*partWidth),y:rect.y,width:Math.round(part===splitCount-1?rect.x+rect.width-(rect.x+part*partWidth):partWidth),height:rect.height});
        }else found.push({x:rect.x,y:rect.y,width:rect.width,height:rect.height});
      }finally{safeDelete(contour)}
    }
  }finally{safeDelete(hierarchy);safeDelete(contours)}
  return found;
}

async function runDigitCandidates(cv,width,height,pixels){
  if(!cv.MatVector||typeof cv.findContours!=='function'||typeof cv.boundingRect!=='function')throw new Error('OpenCV contour bindings are unavailable for digit-region proposals.');
  const src=makeRgbaMat(cv,width,height,pixels),gray=new cv.Mat(),all=[];
  const started=performance.now();
  try{
    cv.cvtColor(src,gray,cv.COLOR_RGBA2GRAY,0);
    for(const flag of [cv.THRESH_BINARY|cv.THRESH_OTSU,cv.THRESH_BINARY_INV|cv.THRESH_OTSU]){
      const binary=new cv.Mat();
      try{
        cv.threshold(gray,binary,0,255,flag);
        all.push(...candidateBoxes(cv,binary,width,height));
      }finally{safeDelete(binary)}
    }
    all.sort((a,b)=>b.width*b.height-a.width*a.height);
    const unique=[];
    for(const box of all){
      if(unique.some(other=>boxIoU(box,other)>.82))continue;
      unique.push(box);
      if(unique.length>=32)break;
    }
    unique.sort((a,b)=>a.x-b.x||a.y-b.y);
    return{boxes:unique,proposalMs:performance.now()-started};
  }finally{safeDelete(gray);safeDelete(src)}
}

self.onmessage=async event=>{
  const message=event.data||{},id=message.id;
  try{
    const loaded=await getCv(),cv=loaded.cv;
    if(message.type==='init'){
      self.postMessage({id,ok:true,type:'init',startupMs:loaded.startupMs,opencvVersion:'4.12.0'});
      return;
    }
    if(message.type!=='run')throw new Error('Unknown classical CV worker request.');
    const width=Number(message.width),height=Number(message.height);
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||!message.pixels)throw new Error('Invalid image payload.');
    const result=message.method==='face'
      ?await runFace(cv,width,height,message.pixels)
      :message.method==='hog'
        ?await runHog(cv,width,height,message.pixels)
        :message.method==='digits'
          ?await runDigitCandidates(cv,width,height,message.pixels)
          :(()=>{throw new Error('Unknown historical image method.');})();
    self.postMessage({id,ok:true,type:'result',method:message.method,width,height,...result});
  }catch(error){
    self.postMessage({id,ok:false,error:{name:error?.name||'Error',message:String(error?.message||error).slice(0,800)}});
  }
};
