(() => {
  'use strict';
  const CACHE_NAME='vision-evolution-model-assets-v2',memory=new Map();
  const resolveSourceUrl=source=>new URL(source.url,window.location.href).href;
  const formatBytes=v=>{if(!Number.isFinite(v)||v<=0)return '—';const mb=v/1048576;return mb>=1?`${mb.toFixed(mb<10?2:1)} MB`:`${(v/1024).toFixed(0)} KB`;};
  const abortError=()=>{const error=new Error('Model download cancelled.');error.name='AbortError';return error};
  const throwIfAborted=signal=>{if(signal?.aborted)throw abortError()};
  async function openCache(){if(!('caches'in window))return null;try{return await caches.open(CACHE_NAME)}catch(_){return null}}
  async function readResponse(response,onProgress,label,expectedBytes=0,signal){
    throwIfAborted(signal);
    const headerTotal=Number(response.headers.get('content-length'))||0,expectedTotal=Number(expectedBytes)||0,total=expectedTotal>0?expectedTotal:headerTotal;
    if(!response.body||!response.body.getReader){const buffer=await response.arrayBuffer();throwIfAborted(signal);onProgress?.({label,loaded:buffer.byteLength,total:total||buffer.byteLength,percent:total?Math.min(100,buffer.byteLength/total*100):100});return buffer}
    const reader=response.body.getReader(),fixed=total>0?new Uint8Array(total):null,chunks=fixed?null:[];let loaded=0;
    try{
      while(true){
        throwIfAborted(signal);
        const {done,value}=await reader.read();if(done)break;
        throwIfAborted(signal);
        if(fixed){
          if(loaded+value.byteLength>fixed.byteLength)throw new Error(`response exceeded expected payload size ${fixed.byteLength}`);
          fixed.set(value,loaded);
        }else chunks.push(value);
        loaded+=value.byteLength;onProgress?.({label,loaded,total,percent:total?Math.min(100,loaded/total*100):null});
      }
    }catch(error){
      try{await reader.cancel()}catch(_){}
      if(error?.name==='AbortError'||signal?.aborted)throw abortError();
      throw error;
    }
    let buffer;
    if(fixed){
      if(loaded!==fixed.byteLength)buffer=fixed.slice(0,loaded).buffer;
      else buffer=fixed.buffer;
    }else{
      const merged=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){merged.set(chunk,offset);offset+=chunk.byteLength}buffer=merged.buffer;
    }
    throwIfAborted(signal);
    onProgress?.({label,loaded,total:total||loaded,percent:total?Math.min(100,loaded/total*100):100});return buffer;
  }
  async function putCache(url,buffer,type){const cache=await openCache();if(!cache)return false;try{await cache.put(url,new Response(buffer,{headers:{'content-type':type||'application/octet-stream','content-length':String(buffer.byteLength)}}));return true}catch(err){console.warn('Model cache write failed',err);return false}}
  async function load(model,{onState,onProgress,onTrace,signal}={}){
    const trace=(event,meta={})=>{try{onTrace?.(event,meta)}catch(_){}};
    throwIfAborted(signal);
    if(memory.has(model.id)){const hit=memory.get(model.id);trace('memory-hit',{source:hit.source,bytes:hit.buffer.byteLength});onState?.({state:'memory',source:hit.source});onProgress?.({label:hit.source,loaded:hit.buffer.byteLength,total:hit.buffer.byteLength,percent:100});return {...hit,cacheState:'memory',downloadMs:0}}
    trace('cache-open-start');const cache=await openCache();throwIfAborted(signal);trace('cache-open-complete',{available:Boolean(cache)});
    if(cache)for(const source of model.sources||[]){try{throwIfAborted(signal);trace('cache-match-start',{source:source.label});const response=await cache.match(resolveSourceUrl(source));throwIfAborted(signal);if(!response){trace('cache-match-miss',{source:source.label});continue}trace('cache-match-hit',{source:source.label});onState?.({state:'cache',source:source.label});const t=performance.now(),buffer=await readResponse(response,onProgress,source.label,model.bytes,signal);trace('arraybuffer-obtained',{source:source.label,origin:'app-cache',bytes:buffer.byteLength});const hit={buffer,source:source.label,cacheState:'browser cache',downloadMs:performance.now()-t,bytes:buffer.byteLength};memory.set(model.id,hit);return hit}catch(err){if(err?.name==='AbortError'||signal?.aborted){trace('cache-read-abort',{source:source.label});throw abortError()}trace('cache-read-error',{source:source.label,name:err?.name||'Error',message:String(err?.message||err).slice(0,300)});console.warn('Model cache read failed',source.label,err)}}
    const errors=[];
    for(const source of model.sources||[])for(let attempt=0;attempt<2;attempt++){const t=performance.now();try{
      throwIfAborted(signal);onState?.({state:'network',source:source.label,attempt:attempt+1});trace('fetch-start',{source:source.label,attempt:attempt+1,fetchCacheMode:attempt?'no-store':'default',httpCacheHit:'not-exposed'});const canonicalUrl=resolveSourceUrl(source),url=new URL(canonicalUrl);if(attempt)url.searchParams.set('_retry',String(Date.now()));
      const response=await fetch(url.href,{mode:'cors',cache:attempt?'no-store':'default',signal});throwIfAborted(signal);trace('fetch-response',{source:source.label,attempt:attempt+1,status:response.status,contentLength:Number(response.headers.get('content-length'))||null,httpCacheHit:'not-exposed'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const type=response.headers.get('content-type')||'application/octet-stream',buffer=await readResponse(response,onProgress,source.label,model.bytes,signal);trace('arraybuffer-obtained',{source:source.label,origin:'fetch',bytes:buffer.byteLength});
      if(model.bytes&&buffer.byteLength<Math.min(model.bytes*.7,1000000))throw new Error(`unexpected payload size ${buffer.byteLength}`);
      throwIfAborted(signal);const hit={buffer,source:source.label,cacheState:'network',downloadMs:performance.now()-t,bytes:buffer.byteLength};memory.set(model.id,hit);trace('cache-write-start',{source:source.label,bytes:buffer.byteLength});const stored=await putCache(canonicalUrl,buffer,type);trace('cache-write-complete',{source:source.label,stored});return hit;
    }catch(err){if(err?.name==='AbortError'||signal?.aborted){trace('fetch-abort',{source:source.label,attempt:attempt+1});throw abortError()}const message=err&&err.message?err.message:String(err);trace('fetch-error',{source:source.label,attempt:attempt+1,name:err?.name||'Error',message:message.slice(0,300)});errors.push(`${source.label} attempt ${attempt+1}: ${message}`);console.warn('Model source failed',source.label,attempt+1,err)}}
    throw new Error(`Model download failed. ${errors.join(' | ')}`);
  }
  async function status(model){if(memory.has(model.id))return{state:'memory',source:memory.get(model.id).source};const cache=await openCache();if(cache)for(const source of model.sources||[]){try{if(await cache.match(resolveSourceUrl(source)))return{state:'browser cache',source:source.label}}catch(_){}}return{state:'not cached',source:''}}
  function evictMemory(modelOrId){const id=typeof modelOrId==='string'?modelOrId:modelOrId&&modelOrId.id;return id?memory.delete(id):false}
  window.VisionModelLoader=Object.freeze({load,status,evictMemory,formatBytes,cacheName:CACHE_NAME});
})();