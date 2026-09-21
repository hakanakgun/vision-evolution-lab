(() => {
  'use strict';
  const CACHE_NAME='vision-evolution-model-assets-v2',memory=new Map();
  const formatBytes=v=>{if(!Number.isFinite(v)||v<=0)return '—';const mb=v/1048576;return mb>=1?`${mb.toFixed(mb<10?2:1)} MB`:`${(v/1024).toFixed(0)} KB`;};
  async function openCache(){if(!('caches'in window))return null;try{return await caches.open(CACHE_NAME)}catch(_){return null}}
  async function readResponse(response,onProgress,label){
    const total=Number(response.headers.get('content-length'))||0;
    if(!response.body||!response.body.getReader){const buffer=await response.arrayBuffer();onProgress?.({label,loaded:buffer.byteLength,total:total||buffer.byteLength,percent:100});return buffer}
    const reader=response.body.getReader(),chunks=[];let loaded=0;
    while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.byteLength;onProgress?.({label,loaded,total,percent:total?loaded/total*100:null})}
    const merged=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.byteLength}
    onProgress?.({label,loaded,total:total||loaded,percent:100});return merged.buffer;
  }
  async function putCache(url,buffer,type){const cache=await openCache();if(!cache)return false;try{await cache.put(url,new Response(buffer.slice(0),{headers:{'content-type':type||'application/octet-stream','content-length':String(buffer.byteLength)}}));return true}catch(err){console.warn('Model cache write failed',err);return false}}
  async function load(model,{onState,onProgress}={}){
    if(memory.has(model.id)){const hit=memory.get(model.id);onState?.({state:'memory',source:hit.source});onProgress?.({label:hit.source,loaded:hit.buffer.byteLength,total:hit.buffer.byteLength,percent:100});return {...hit,cacheState:'memory',downloadMs:0}}
    const cache=await openCache();
    if(cache)for(const source of model.sources||[]){try{const response=await cache.match(source.url);if(!response)continue;onState?.({state:'cache',source:source.label});const t=performance.now(),buffer=await readResponse(response,onProgress,source.label);const hit={buffer,source:source.label,cacheState:'browser cache',downloadMs:performance.now()-t,bytes:buffer.byteLength};memory.set(model.id,hit);return hit}catch(err){console.warn('Model cache read failed',source.label,err)}}
    const errors=[];
    for(const source of model.sources||[])for(let attempt=0;attempt<2;attempt++){const t=performance.now();try{
      onState?.({state:'network',source:source.label,attempt:attempt+1});const url=new URL(source.url);if(attempt)url.searchParams.set('_retry',String(Date.now()));
      const response=await fetch(url.href,{mode:'cors',cache:attempt?'no-store':'default'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const type=response.headers.get('content-type')||'application/octet-stream',buffer=await readResponse(response,onProgress,source.label);
      if(model.bytes&&buffer.byteLength<Math.min(model.bytes*.7,1000000))throw new Error(`unexpected payload size ${buffer.byteLength}`);
      const hit={buffer,source:source.label,cacheState:'network',downloadMs:performance.now()-t,bytes:buffer.byteLength};memory.set(model.id,hit);await putCache(source.url,buffer,type);return hit;
    }catch(err){const message=err&&err.message?err.message:String(err);errors.push(`${source.label} attempt ${attempt+1}: ${message}`);console.warn('Model source failed',source.label,attempt+1,err)}}
    throw new Error(`Model download failed. ${errors.join(' | ')}`);
  }
  async function status(model){if(memory.has(model.id))return{state:'memory',source:memory.get(model.id).source};const cache=await openCache();if(cache)for(const source of model.sources||[]){try{if(await cache.match(source.url))return{state:'browser cache',source:source.label}}catch(_){}}return{state:'not cached',source:''}}
  window.VisionModelLoader=Object.freeze({load,status,formatBytes,cacheName:CACHE_NAME});
})();