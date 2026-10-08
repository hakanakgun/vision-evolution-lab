(()=>{
  'use strict';
  const registry=window.VisionModels,storage=window.VisionModelStorage,$=id=>document.getElementById(id);
  const list=$('cache-models');if(!list||!storage)return;
  const keys=window.VisionRuntimeRegistry.modelKeys;
  let operation=null,generation=0;
  const size=value=>Number.isFinite(value)&&value>0?window.VisionModelLoader.formatBytes(value):'Size not declared';
  const status=text=>{$('cache-status').textContent=text};
  const busy=()=>window.VisionLab?.isTimeMachineBusy()||window.VisionLab?.isCameraActive()||window.VisionRace?.isBusy()||window.VisionResolutionMicroscope?.isBusy();
  function button(text,action,key){
    const node=document.createElement('button');node.type='button';node.className='btn secondary';node.textContent=text;
    node.dataset.cacheAction=action;node.dataset.model=key;
    node.setAttribute('aria-label',text+' '+registry[key].title);node.disabled=Boolean(operation);
    node.addEventListener('click',()=>void perform(action,key));return node;
  }
  async function refresh(){
    const ticket=++generation;list.setAttribute('aria-busy','true');
    const rows=await Promise.all(keys.map(async key=>{
      try{return {key,info:await storage.inspect(registry[key])}}catch(error){return {key,info:{state:'Storage unavailable',stored:false,error:error.message}}}
    }));
    if(ticket!==generation)return;
    list.replaceChildren();
    for(const {key,info} of rows){
      const model=registry[key],row=document.createElement('article');row.className='cache-model';row.dataset.model=key;
      const heading=document.createElement('h3');heading.textContent=model.title;
      const detail=document.createElement('p');detail.className='tiny';
      detail.textContent=(model.ui?.runtime?.bytesText||size(model.bytes||model.runtime?.wasm?.modelBytes))+' · '+info.state;
      if(model.modelId)detail.textContent+=' · WASM'+(model.runtime?.webgpu?' + WebGPU files':'');
      const content=document.createElement('div');content.append(heading,detail);
      const actions=document.createElement('div');actions.className='cache-actions';
      const unavailable=info.state==='Storage unavailable';
      const download=button(info.stored?'Check / complete download':'Download model','download',key);download.disabled ||= unavailable;
      const remove=button('Delete saved files','delete',key);remove.disabled ||= unavailable||(!info.files&&!info.opfs);
      actions.append(download,remove);row.append(content,actions);list.append(row);
    }
    list.setAttribute('aria-busy','false');$('cache-refresh').disabled=Boolean(operation);
    if(navigator.storage?.estimate){
      try{
        const estimate=await navigator.storage.estimate();
        if(ticket===generation)$('cache-usage').textContent='This site uses approximately '+size(estimate.usage)+' of '+size(estimate.quota)+' available origin storage. Includes other site data.';
      }catch(_){$('cache-usage').textContent='Storage usage is not exposed by this browser.'}
    }
  }
  async function perform(action,key){
    if(operation)return;
    if(busy()){status('Stop the camera and finish the current inference or benchmark first.');return}
    const model=registry[key];
    if(action==='download'&&Number(model.bytes||model.runtime?.wasm?.modelBytes)>100*1048576&&!confirm('Download '+model.title+'? '+(model.ui?.runtime?.bytesText||size(model.bytes))+' of model data may be transferred.'))return;
    if(action==='delete'&&!confirm('Delete saved files for '+model.title+'? Running sessions are unaffected; a future load may download these files again.'))return;
    const controller=new AbortController();operation={key,controller};
    $('cache-cancel').hidden=action!=='download';$('cache-progress').hidden=action!=='download';$('cache-progress').removeAttribute('value');
    status((action==='download'?'Downloading ':'Deleting saved files for ')+model.title+'…');await refresh();
    try{
      if(action==='download')await storage.download(model,{signal:controller.signal,onProgress:info=>{
        const progress=$('cache-progress');
        if(Number.isFinite(info.percent))progress.value=Math.min(100,info.percent);else progress.removeAttribute('value');
        status(model.title+' · '+(info.label||'Model files')+' · '+size(info.loaded)+(info.total?' / '+size(info.total):''));
      }});
      else await storage.remove(model);
      status(action==='download'?model.title+' model files saved. Runtime files may still need a connection.':model.title+' saved files deleted. Existing running sessions are unaffected.');
    }catch(error){status(error.name==='AbortError'?'Download cancelled. Completed files remain reusable; incomplete files are not marked saved.':'Could not '+action+' '+model.title+': '+error.message)}
    finally{operation=null;$('cache-cancel').hidden=true;$('cache-progress').hidden=true;await refresh()}
  }
  $('cache-refresh').addEventListener('click',()=>{if(!operation)void refresh()});
  $('cache-cancel').addEventListener('click',()=>{operation?.controller.abort();status('Cancelling download…')});
  document.querySelector('[data-tab="model-cache"]').addEventListener('click',()=>void refresh());
  window.addEventListener('pagehide',()=>operation?.controller.abort());
  window.VisionModelCache=Object.freeze({refresh,isBusy:()=>Boolean(operation)});
})();