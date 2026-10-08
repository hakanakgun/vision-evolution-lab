(()=>{
  'use strict';
  const registry=window.VisionModels,loader=window.VisionModelLoader;
  const resolve=value=>new URL(value,location.href).href;
  const cancelled=()=>new DOMException('Download cancelled.','AbortError');
  const check=signal=>{if(signal?.aborted)throw cancelled()};
  function plan(model){
    if(model.modelId){
      const suffix={fp32:'',fp16:'_fp16',q8:'_quantized',q4:'_q4'};
      const variants=[...new Set(Object.values(model.runtime||{}).map(item=>item?.dtype).filter(dtype=>Object.hasOwn(suffix,dtype)))];
      const base='https://huggingface.co/'+model.modelId+'/resolve/'+model.revision+'/';
      return {cache:'transformers-cache',groups:[['config.json','preprocessor_config.json',...variants.map(dtype=>'onnx/model'+suffix[dtype]+'.onnx')].map(file=>base+file)]};
    }
    return {cache:loader.cacheName,groups:(model.sources||[]).map(source=>(source.parts?.length?source.parts.map(part=>resolve(part.url)):[resolve(source.url||source.cacheKey)]))};
  }
  async function inspect(model){
    const spec=plan(model);
    if(!('caches'in window))return {state:'Storage unavailable',stored:false,files:0};
    // Do not create a cache just to inspect it.
    const names=await caches.keys(),cache=names.includes(spec.cache)?await caches.open(spec.cache):null;
    let files=0,stored=false;
    if(cache)for(const group of spec.groups){
      let count=0;for(const url of group)if(await cache.match(url))count++;
      files+=count;if(count===group.length&&group.length)stored=true;
    }
    let opfs=false;
    if(model.externalData?.enabled)opfs=(await window.VisionExternalDataStore.status(model)).state==='persistent cache';
    return {state:opfs?'Saved in OPFS':stored?'Model files saved':files?'Partially saved':'Not downloaded',stored:stored||opfs,files,opfs};
  }
  async function remove(model){
    const spec=plan(model),names=await caches.keys();
    if(names.includes(spec.cache)){
      const cache=await caches.open(spec.cache);
      // Remove only this pinned model's entries, never a shared runtime cache.
      const urls=new Set(spec.groups.flat());
      if(model.modelId){
        const prefix='https://huggingface.co/'+model.modelId+'/resolve/'+model.revision+'/';
        for(const request of await cache.keys())if(request.url.startsWith(prefix))urls.add(request.url);
      }
      for(const url of urls)await cache.delete(url);
    }
    if(model.externalData?.enabled&&navigator.storage?.getDirectory){
      const root=await navigator.storage.getDirectory();
      for(const name of [model.externalData.opfsName,model.externalData.opfsName+'.json']){
        try{await root.removeEntry(name)}catch(error){if(error.name!=='NotFoundError')throw error}
      }
    }
    loader.evictMemory(model);
  }
  async function download(model,{signal,onProgress}={}){
    check(signal);
    if(!('caches'in window))throw new Error('Persistent model storage is unavailable.');
    if(model.externalData?.enabled&&window.VisionExternalDataStore.support().opfs){
      await window.VisionExternalDataStore.prepare(model,{signal,onProgress});
      check(signal);return;
    }
    if(!model.modelId){
      try{await loader.load(model,{signal,onProgress})}finally{loader.evictMemory(model)}
      const result=await inspect(model);
      if(!result.stored)throw new Error('Download completed, but model files could not be saved. Check available storage.');
      return;
    }
    const spec=plan(model),cache=await caches.open(spec.cache),urls=spec.groups[0];
    for(let index=0;index<urls.length;index++){
      check(signal);const url=urls[index];
      if(await cache.match(url))continue;
      const response=await fetch(url,{signal,mode:'cors'});
      if(!response.ok)throw new Error('Model file download failed: HTTP '+response.status);
      const total=Number(response.headers.get('content-length'))||0;
      let loaded=0;
      const reader=response.body?.getReader();
      const stream=reader?new ReadableStream({
        async pull(controller){
          try{
            check(signal);const result=await reader.read();check(signal);
            if(result.done){controller.close();return}
            loaded+=result.value.byteLength;
            onProgress?.({loaded,total,percent:total?loaded/total*100:null,label:'File '+(index+1)+' / '+urls.length});
            controller.enqueue(result.value);
          }catch(error){controller.error(error)}
        },
        cancel:reason=>reader.cancel(reason)
      }):response.body;
      try{
        await cache.put(url,new Response(stream,{headers:response.headers}));
        check(signal);
      }catch(error){
        await cache.delete(url);
        if(signal?.aborted)throw cancelled();
        throw error;
      }
    }
    if(!(await inspect(model)).stored)throw new Error('Model files were not saved.');
  }
  window.VisionModelStorage=Object.freeze({plan,inspect,download,remove});
})();