(() => {
  'use strict';
  const registry=window.VisionModels,runtimes=window.VisionRuntimeRegistry,lab=window.VisionLab,$=id=>document.getElementById(id);
  if(!registry||!runtimes)return;

  function entries(){
    const seen=new Set(),items=[];
    for(const timeline of registry.timeline||[]){
      if(!timeline.model||seen.has(timeline.model))continue;
      const model=registry[timeline.model];
      if(!model||model.status!=='runnable'||!runtimes.capabilityEnabled(model,'timeMachine'))continue;
      const inspection=model.capabilities?.inspection;
      if(!inspection||typeof inspection!=='object')continue;
      seen.add(timeline.model);items.push({key:timeline.model,timeline,model,inspection});
    }
    return items;
  }
  function raceArchitecture(model){
    const race=runtimes.raceMeta(model);return race?.architecture||model.family||'—';
  }
  function capabilitySummary(model){
    const parts=['Time Machine'];
    if(model.capabilities?.benchmark)parts.push('×20 benchmark');
    if(runtimes.capabilityEnabled(model,'race'))parts.push('Model Race');
    if(runtimes.capabilityEnabled(model,'live'))parts.push('Live Camera');
    return parts.join(' · ');
  }
  function runtimeSummary(model){
    if(Array.isArray(model.executionProviders)&&model.executionProviders.length)return model.executionProviders.map(x=>String(x).toUpperCase()).join(' → ');
    if(model.runtime?.webgpu&&model.runtime?.wasm)return 'WebGPU '+model.runtime.webgpu.dtype+' → WASM '+model.runtime.wasm.dtype;
    if(model.runtime?.wasm)return 'WASM '+model.runtime.wasm.dtype;
    return model.ui?.subtitle||'Runtime documented in model catalog';
  }
  function makeRow(label,value){
    const row=document.createElement('div');row.className='architecture-row';
    const key=document.createElement('span'),text=document.createElement('b');key.textContent=label;text.textContent=value||'—';row.append(key,text);return row;
  }
  function renderProfile(slot,key){
    const item=entries().find(entry=>entry.key===key),root=$('architecture-profile-'+slot);if(!item||!root)return;
    const {model,timeline,inspection}=item,intermediate=inspection.intermediate||{},pipeline=inspection.pipeline||{};
    root.replaceChildren();
    const head=document.createElement('div');head.className='architecture-profile-head';
    const titleWrap=document.createElement('div'),date=document.createElement('span'),title=document.createElement('h3'),runtime=document.createElement('span');
    date.className='pill generation';date.textContent=timeline.month?String(timeline.year)+' · '+String(timeline.month).padStart(2,'0'):String(timeline.year);
    title.textContent=model.title;runtime.className='tiny';runtime.textContent=runtimeSummary(model);titleWrap.append(date,title);head.append(titleWrap,runtime);root.appendChild(head);
    const family=document.createElement('div');family.className='architecture-family';family.textContent=raceArchitecture(model);root.appendChild(family);
    const flow=document.createElement('div');flow.className='architecture-flow';
    for(const [number,step] of [['01',{title:'Input contract',text:inspection.input+' · '+inspection.resize}],['02',pipeline.step2],['03',pipeline.step3],['04',pipeline.step4],['05',{title:'Observable output',text:inspection.resultNote}]]){
      const node=document.createElement('div');node.className='architecture-node';const n=document.createElement('span'),name=document.createElement('strong'),copy=document.createElement('p');n.className='step-num';n.textContent=number;name.textContent=step?.title||'Not declared';copy.textContent=step?.text||'No additional architecture detail is declared for this step.';node.append(n,name,copy);flow.appendChild(node);
    }
    root.appendChild(flow);
    const details=document.createElement('div');details.className='architecture-details';
    details.append(
      makeRow('Tensor',inspection.tensor),
      makeRow('Channels / normalization',inspection.normalization?inspection.channels+' · '+inspection.normalization:inspection.channels),
      makeRow('Intermediate evidence',intermediate.status||intermediate.statusReady||'Not exposed'),
      makeRow('Capabilities',capabilitySummary(model))
    );
    root.appendChild(details);
    const note=document.createElement('div');note.className='note architecture-note';note.textContent=intermediate.note||'No deeper intermediate tensor claim is made.';root.appendChild(note);
    const action=document.createElement('button');action.className='btn secondary architecture-open';action.type='button';action.textContent='Select '+model.title+' in Time Machine';
    action.addEventListener('click',()=>{lab?.selectActiveModel?.(key,{scroll:false});document.querySelector('[data-tab="time-machine"]')?.click()});root.appendChild(action);
  }
  function populate(){
    const items=entries(),a=$('architecture-a'),b=$('architecture-b');if(!a||!b)return;
    for(const select of [a,b]){select.replaceChildren();for(const item of items){const option=document.createElement('option');option.value=item.key;option.textContent=(item.timeline.month?item.timeline.year+'-'+String(item.timeline.month).padStart(2,'0'):item.timeline.year)+' · '+item.model.title;select.appendChild(option)}}
    a.value=items.some(item=>item.key==='fasterrcnn')?'fasterrcnn':items[0]?.key||'';
    b.value=items.some(item=>item.key==='rtdetr')?'rtdetr':items.at(-1)?.key||'';
    const render=()=>{renderProfile('a',a.value);renderProfile('b',b.value);$('architecture-status').textContent='Comparing declared browser contracts only. No inference, hidden-layer reconstruction, or synthetic architecture tensor is used.'};
    a.addEventListener('change',render);b.addEventListener('change',render);render();
  }
  document.addEventListener('vision:tabchange',event=>{if(event.detail?.tab==='architecture-explorer')populate()});
  window.VisionArchitectureExplorer=Object.freeze({render:populate});
  populate();
})();