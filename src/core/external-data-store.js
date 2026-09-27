(() => {
  'use strict';

  const loader=window.VisionModelLoader;
  if(!loader)throw new Error('External-data store requires VisionModelLoader.');

  const resolveUrl=value=>new URL(value,window.location.href).href;
  const abortError=()=>{const error=new Error('Model download cancelled.');error.name='AbortError';return error};
  const throwIfAborted=signal=>{if(signal?.aborted)throw abortError()};
  const yieldToBrowser=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  const supportsOpfs=()=>Boolean(navigator.storage&&typeof navigator.storage.getDirectory==='function');
  const supportsCrypto=()=>Boolean(globalThis.crypto?.subtle);
  const sha256Hex=async bytes=>{if(!supportsCrypto())throw new Error('SHA-256 verification is unavailable in this browser.');const digest=await crypto.subtle.digest('SHA-256',bytes);return[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('')};

  function config(model){
    const value=model?.externalData;
    if(!value?.enabled)throw new Error('External-data model configuration is unavailable.');
    if(!value.manifestUrl||!value.opfsName)throw new Error('External-data model configuration is incomplete.');
    return value;
  }

  async function rootDirectory(){
    if(!supportsOpfs())throw new Error('Origin Private File System is unavailable in this browser.');
    return navigator.storage.getDirectory();
  }

  async function readJsonFile(root,name){
    try{
      const handle=await root.getFileHandle(name),file=await handle.getFile();
      return JSON.parse(await file.text());
    }catch(_){return null}
  }

  async function removeEntry(root,name){try{await root.removeEntry(name)}catch(_){}}

  async function status(model){
    if(!model?.externalData?.enabled||!supportsOpfs())return{state:'not cached',source:''};
    const spec=config(model),root=await rootDirectory(),marker=await readJsonFile(root,spec.opfsName+'.json');
    if(!marker||marker.modelSha256!==model.sha256||Number(marker.modelBytes)!==Number(model.bytes))return{state:'not cached',source:''};
    try{
      const handle=await root.getFileHandle(spec.opfsName),file=await handle.getFile();
      if(file.size!==Number(model.bytes))return{state:'not cached',source:''};
      return{state:'persistent cache',source:'OPFS external data'};
    }catch(_){return{state:'not cached',source:''}}
  }

  async function fetchManifest(model,signal){
    const spec=config(model),url=resolveUrl(spec.manifestUrl);
    const response=await fetch(url,{cache:'no-store',credentials:'same-origin',signal});throwIfAborted(signal);
    if(!response.ok)throw new Error(`External-data manifest HTTP ${response.status}.`);
    const manifest=await response.json();throwIfAborted(signal);
    if(manifest?.format!==1)throw new Error('External-data manifest format is unsupported.');
    if(manifest.modelSha256!==model.sha256||Number(manifest.modelBytes)!==Number(model.bytes))throw new Error('External-data manifest does not match the pinned YOLOv1 model.');
    if(!manifest.graph?.url||!Number(manifest.graph.bytes)||!/^[0-9a-f]{64}$/.test(manifest.graph.sha256||''))throw new Error('External-data graph metadata is incomplete.');
    if(!manifest.externalData?.path)throw new Error('External-data path is missing from the manifest.');
    return manifest;
  }

  async function fetchGraph(manifest,signal){
    const response=await fetch(resolveUrl(manifest.graph.url),{cache:'default',credentials:'same-origin',signal});throwIfAborted(signal);
    if(!response.ok)throw new Error(`External-data graph HTTP ${response.status}.`);
    const buffer=await response.arrayBuffer();throwIfAborted(signal);
    if(buffer.byteLength!==Number(manifest.graph.bytes))throw new Error(`External-data graph size mismatch (${buffer.byteLength} bytes).`);
    const hash=await sha256Hex(buffer);throwIfAborted(signal);
    if(hash!==manifest.graph.sha256)throw new Error('External-data graph SHA-256 verification failed.');
    return new Uint8Array(buffer);
  }

  async function cachedOrNetworkResponse(part,cache,signal){
    const canonicalUrl=resolveUrl(part.url);
    if(cache){
      try{
        const hit=await cache.match(canonicalUrl);throwIfAborted(signal);
        if(hit)return{response:hit,origin:'app-cache'};
      }catch(error){if(error?.name==='AbortError'||signal?.aborted)throw abortError()}
    }
    const response=await fetch(canonicalUrl,{mode:'cors',cache:'default',signal});throwIfAborted(signal);
    if(!response.ok)throw new Error(`External-data part HTTP ${response.status}.`);
    return{response,origin:'network'};
  }

  async function materialize(model,manifest,{signal,onProgress,onState}={}){
    const spec=config(model),root=await rootDirectory(),existing=await status(model);
    if(existing.state==='persistent cache'){
      const handle=await root.getFileHandle(spec.opfsName),file=await handle.getFile();
      onState?.(existing);onProgress?.({label:'OPFS external data',loaded:model.bytes,total:model.bytes,percent:100});
      return{file,cacheState:'persistent cache',source:'OPFS external data',downloadMs:0};
    }

    const source=(model.sources||[]).find(item=>Array.isArray(item?.parts)&&item.parts.length);
    if(!source)throw new Error('External-data source chunks are unavailable.');
    const total=Number(model.bytes)||source.parts.reduce((sum,part)=>sum+Number(part.bytes||0),0);
    if(total<=0)throw new Error('External-data source size is unavailable.');

    await removeEntry(root,spec.opfsName+'.json');
    await removeEntry(root,spec.opfsName);
    const handle=await root.getFileHandle(spec.opfsName,{create:true}),writable=await handle.createWritable({keepExistingData:false});
    let offset=0,allCached=true,cache=null;
    try{if('caches'in window)cache=await caches.open(loader.cacheName)}catch(_){}

    const started=performance.now();
    try{
      for(let index=0;index<source.parts.length;index++){
        throwIfAborted(signal);
        const part=source.parts[index],expected=Number(part.bytes)||0;
        if(expected<=0||!/^[0-9a-f]{64}$/.test(part.sha256||''))throw new Error(`External-data part ${index+1} metadata is incomplete.`);
        const {response,origin}=await cachedOrNetworkResponse(part,cache,signal);
        if(origin!=='app-cache')allCached=false;
        onState?.({state:origin==='app-cache'?'cache':'network',source:source.label,part:index+1,parts:source.parts.length});
        let buffer=await response.arrayBuffer();throwIfAborted(signal);
        if(buffer.byteLength!==expected)throw new Error(`External-data part ${index+1} size mismatch: expected ${expected}, got ${buffer.byteLength}.`);
        const hash=await sha256Hex(buffer);throwIfAborted(signal);
        if(hash!==part.sha256)throw new Error(`External-data part ${index+1} SHA-256 mismatch.`);
        const bytes=new Uint8Array(buffer);
        await writable.write({type:'write',position:offset,data:bytes});throwIfAborted(signal);
        offset+=bytes.byteLength;
        onProgress?.({label:source.label,loaded:offset,total,percent:Math.min(100,offset/total*100)});
        buffer=null;
        await yieldToBrowser();
      }
      if(offset!==total)throw new Error(`External-data file size mismatch: expected ${total}, got ${offset}.`);
      await writable.truncate(total);
      await writable.close();
    }catch(error){
      try{await writable.abort()}catch(_){}
      await removeEntry(root,spec.opfsName);
      await removeEntry(root,spec.opfsName+'.json');
      if(error?.name==='AbortError'||signal?.aborted)throw abortError();
      throw error;
    }

    const file=await handle.getFile();
    if(file.size!==total){await removeEntry(root,spec.opfsName);throw new Error('External-data OPFS file size verification failed.');}
    const markerHandle=await root.getFileHandle(spec.opfsName+'.json',{create:true}),markerWritable=await markerHandle.createWritable({keepExistingData:false});
    await markerWritable.write(JSON.stringify({format:1,modelSha256:model.sha256,modelBytes:model.bytes,completedAt:new Date().toISOString()}));
    await markerWritable.close();
    return{file,cacheState:allCached?'browser cache → OPFS':'network → OPFS',source:'OPFS external data',downloadMs:performance.now()-started};
  }

  async function prepare(model,options={}){
    if(!supportsOpfs()||!supportsCrypto())throw new Error('The low-memory external-data path requires OPFS and Web Crypto.');
    const manifest=await fetchManifest(model,options.signal);
    const stored=await materialize(model,manifest,options);
    const graph=await fetchGraph(manifest,options.signal);
    return{...stored,graph,externalPath:manifest.externalData.path,manifest};
  }

  window.VisionExternalDataStore=Object.freeze({
    prepare,
    status,
    support:()=>Object.freeze({opfs:supportsOpfs(),crypto:supportsCrypto()})
  });
})();
