(() => {
  'use strict';
  const registry=window.VisionModels,runtimes=window.VisionRuntimeRegistry,lab=window.VisionLab,loader=window.VisionModelLoader,$=id=>document.getElementById(id);
  if(!registry||!runtimes||!lab)return;

  const LEVELS=Object.freeze([
    Object.freeze({key:'original',label:'Original',maxSide:null}),
    Object.freeze({key:'640',label:'640 px detail',maxSide:640}),
    Object.freeze({key:'320',label:'320 px detail',maxSide:320}),
    Object.freeze({key:'160',label:'160 px detail',maxSide:160})
  ]);
  let running=false,lastModel='',lastSource=null;

  function ms(value){return Number.isFinite(value)?value.toFixed(value<10?2:1)+' ms':'—'}
  function iou(a,b){
    const top=Math.max(a[0],b[0]),left=Math.max(a[1],b[1]),bottom=Math.min(a[2],b[2]),right=Math.min(a[3],b[3]);
    const intersection=Math.max(0,bottom-top)*Math.max(0,right-left);
    const areaA=Math.max(0,a[2]-a[0])*Math.max(0,a[3]-a[1]),areaB=Math.max(0,b[2]-b[0])*Math.max(0,b[3]-b[1]);
    const union=areaA+areaB-intersection;return union>0?intersection/union:0;
  }
  function visibleDetections(result,confidence){
    return Array.isArray(result?.detections)?result.detections.filter(item=>Number.isFinite(item.score)&&item.score>=confidence&&Array.isArray(item.box)&&item.box.length===4):[];
  }
  function matchBaseline(baseline,current,iouThreshold=.5){
    const matched=new Set();let matches=0;
    for(const detection of [...current].sort((a,b)=>b.score-a.score)){
      let best=-1,bestIou=iouThreshold;
      for(let index=0;index<baseline.length;index++){
        if(matched.has(index)||baseline[index].label!==detection.label)continue;
        const overlap=iou(baseline[index].box,detection.box);
        if(overlap>=bestIou){best=index;bestIou=overlap}
      }
      if(best>=0){matched.add(best);matches++}
    }
    return matches;
  }
  function sourceSize(source){return lab.sourceSize(source)}
  function detailSource(source,maxSide){
    if(!maxSide)return source;
    const {w,h}=sourceSize(source);if(!w||!h)throw new Error('Source image has no readable dimensions.');
    const scale=Math.min(1,maxSide/Math.max(w,h)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
    canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);
    return canvas;
  }
  function status(message,kind=''){
    const el=$('resolution-status');if(!el)return;el.textContent=message;el.className=('status '+kind).trim();
  }
  function setContext(){
    const image=lab.getImage(),model=registry[lab.getActiveModel()],history=lab.getHistoryExperiment?.()||'';
    const context=$('resolution-context'),run=$('resolution-run');if(!context||!run)return;
    if(history){context.textContent='Historical task experiment selected in Time Machine. Resolution Microscope currently works with runnable AI detector models only.';run.disabled=true;return}
    if(!image||!model){context.textContent='Choose an image in Time Machine first.';run.disabled=true;return}
    const {w,h}=sourceSize(image);context.textContent=`${model.title} · source ${w}×${h} · confidence ${lab.getConfidence().toFixed(2)} · native model preprocessing unchanged`;run.disabled=running||lab.isTimeMachineBusy?.()===true;
  }
  function buildCard(level,model){
    const card=document.createElement('article');card.className='card resolution-card';card.dataset.resolutionLevel=level.key;
    const head=document.createElement('div');head.className='resolution-card-head';
    const wrap=document.createElement('div'),pill=document.createElement('span'),title=document.createElement('h3'),runtime=document.createElement('span');
    pill.className='pill generation';pill.textContent=level.label;title.textContent=model.title;runtime.className='tiny';runtime.textContent='waiting';
    wrap.append(pill,title);head.append(wrap,runtime);card.appendChild(head);
    const stage=document.createElement('div');stage.className='resolution-stage';const canvas=document.createElement('canvas');canvas.hidden=true;const empty=document.createElement('div');empty.className='empty';empty.textContent='Not run yet';stage.append(canvas,empty);card.appendChild(stage);
    const details=document.createElement('div');details.className='resolution-details';
    const rows={};
    for(const [key,label] of [['source','Source detail'],['count','Detections'],['matches','Matches vs original'],['inf','Inference'],['total','End-to-end']]){
      const row=document.createElement('div'),name=document.createElement('span'),value=document.createElement('b');name.textContent=label;value.textContent='—';row.append(name,value);details.appendChild(row);rows[key]=value;
    }
    card.appendChild(details);return{card,canvas,empty,runtime,rows};
  }
  function clearResults(){
    const grid=$('resolution-grid');if(grid)grid.replaceChildren();lastModel='';lastSource=null;
  }
  async function runMicroscope(){
    if(running||lab.isTimeMachineBusy?.())return;
    const source=lab.getImage(),modelKey=lab.getActiveModel(),model=registry[modelKey],history=lab.getHistoryExperiment?.()||'';
    if(history){status('Switch back to a runnable AI detector in Time Machine before using Resolution Microscope.','error');setContext();return}
    if(!source||!model){status('Choose an image in Time Machine first.','error');setContext();return}
    const adapter=runtimes.get(modelKey);if(!adapter){status('The active model runtime is not registered. Reload the page and try again.','error');return}

    if(model.downloadPolicy?.enabled&&loader?.status){
      const cache=await loader.status(model);
      if(cache.state==='not cached'){
        status(`${model.title} has a large uncached model transfer. Run it once from Time Machine first so the normal download warning/cancel flow is preserved.`,'error');
        return;
      }
    }

    running=true;lastModel=modelKey;lastSource=source;const runButton=$('resolution-run'),grid=$('resolution-grid'),confidence=lab.getConfidence();
    if(runButton)runButton.disabled=true;if(grid)grid.replaceChildren();
    const cards=new Map();for(const level of LEVELS){const view=buildCard(level,model);cards.set(level.key,view);grid.appendChild(view.card)}
    status(`Running ${model.title} across four source-detail levels…`,'loading');

    let baseline=[];
    try{
      for(const level of LEVELS){
        const view=cards.get(level.key),variant=detailSource(source,level.maxSide),dims=sourceSize(variant);
        view.runtime.textContent='running…';view.rows.source.textContent=dims.w+'×'+dims.h;
        const result=await adapter.run(variant,view.canvas,{confidence,benchmarking:false});
        view.canvas.hidden=false;view.empty.hidden=true;view.runtime.textContent=adapter.backend?.()||'runtime';
        const visible=visibleDetections(result,confidence);
        if(level.key==='original')baseline=visible;
        const matches=level.key==='original'?null:matchBaseline(baseline,visible,.5);
        view.rows.count.textContent=String(visible.length);
        view.rows.matches.textContent=level.key==='original'?'baseline':`${matches} / ${baseline.length}`;
        view.rows.inf.textContent=ms(result.infMs);view.rows.total.textContent=ms(result.totalMs);
        await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
      }
      status(`Resolution sweep complete for ${model.title} at confidence ${confidence.toFixed(2)}. Match counts compare each degraded source with this run's original-source detections; they are not ground truth.`);
    }catch(error){
      console.error(error);status(error?.message||String(error),'error');
    }finally{
      running=false;if(runButton)runButton.disabled=false;setContext();
    }
  }

  $('resolution-run')?.addEventListener('click',()=>void runMicroscope());
  document.addEventListener('vision:tabchange',event=>{
    if(event.detail?.tab!=='resolution-microscope')return;
    const source=lab.getImage(),model=lab.getActiveModel();
    if(lastModel&&(lastModel!==model||lastSource!==source))clearResults();
    setContext();
  });
  window.VisionResolutionMicroscope=Object.freeze({run:runMicroscope,clear:clearResults});
  setContext();
})();