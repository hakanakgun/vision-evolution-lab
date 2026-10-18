#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const {createHash,webcrypto}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const cacheName='vision-evolution-model-assets-v2';
const origin='https://example.test/vision-lab/';
const bytes=Uint8Array.from([1,2,3,4,5,6,7,8]);
const sha256=value=>createHash('sha256').update(value).digest('hex');
const resolve=value=>new URL(value,origin).href;
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done});return{promise,resolve}};
const response=value=>new Response(value,{headers:{'content-length':String(value.byteLength)}});

// Only browser boundaries are substituted: the production loader and storage
// modules execute unchanged, with real Response/ReadableStream/Web Crypto APIs.
function createCache(){
  const entries=new Map();
  return{
    match:async url=>entries.get(String(url))?.clone(),
    put:async(url,value)=>{const buffer=await value.arrayBuffer();entries.set(String(url),new Response(buffer,{headers:value.headers}))},
    delete:async url=>entries.delete(String(url)),
    keys:async()=>[...entries.keys()].map(url=>({url}))
  };
}

function createOpfs(){
  const files=new Map();
  const missing=()=>new DOMException('File not found.','NotFoundError');
  return{
    getFileHandle:async(name,{create=false}={})=>{
      if(!files.has(name)){if(!create)throw missing();files.set(name,new Uint8Array())}
      return{
        getFile:async()=>{if(!files.has(name))throw missing();return new Blob([files.get(name)])},
        createWritable:async()=>{
          let data=new Uint8Array();
          return{
            write:async value=>{
              if(typeof value==='string'){data=new TextEncoder().encode(value);return}
              const next=new Uint8Array(Math.max(data.length,value.position+value.data.byteLength));
              next.set(data);next.set(value.data,value.position);data=next;
            },
            truncate:async length=>{data=data.slice(0,length)},
            close:async()=>{files.set(name,data)},
            abort:async()=>{}
          };
        }
      };
    },
    removeEntry:async name=>{if(!files.delete(name))throw missing()}
  };
}

function harness(fetch,{crypto=webcrypto}={}){
  const stores=new Map(),caches={
    open:async name=>{if(!stores.has(name))stores.set(name,createCache());return stores.get(name)},
    keys:async()=>[...stores.keys()]
  };
  const window={location:{href:origin},caches,VisionModels:{}};
  const directory=createOpfs();
  const context=vm.createContext({
    window,location:window.location,caches,fetch,URL,performance,Response,ReadableStream,
    DOMException,crypto,navigator:{storage:{getDirectory:async()=>directory}},
    requestAnimationFrame:callback=>setImmediate(callback),console:{warn(){}}
  });
  const load=file=>vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  load('src/core/model-loader.js');load('src/core/external-data-store.js');load('src/core/model-storage.js');
  return{loader:window.VisionModelLoader,storage:window.VisionModelStorage,external:window.VisionExternalDataStore,caches,directory};
}

function directModel(sources=[{label:'fixture',url:'model.onnx'}]){
  return{id:'direct-fixture',bytes:bytes.byteLength,sources};
}

for(const streamed of [true,false])test(`a truncated ${streamed?'streamed':'arrayBuffer'} model is retried before it is saved`,async()=>{
  const requests=[];
  const env=harness(async(url,options)=>{
    requests.push({url,options});const data=requests.length===1?bytes.slice(0,6):bytes;
    return streamed?response(data):{ok:true,status:200,headers:new Headers(),body:null,arrayBuffer:async()=>data.buffer};
  });
  await env.storage.download(directModel());
  const saved=await(await(await env.caches.open(cacheName)).match(resolve('model.onnx'))).arrayBuffer();
  assert.deepEqual(new Uint8Array(saved),bytes);
  assert.equal(requests.length,2);
  assert.equal(requests[1].options.cache,'no-store');
  assert.ok(new URL(requests[1].url).searchParams.has('_retry'));
});

test('a truncated cached model is evicted and replaced from network',async()=>{
  let requests=0;const env=harness(async()=>{requests++;return response(bytes)});
  const cache=await env.caches.open(cacheName);await cache.put(resolve('model.onnx'),response(bytes.slice(0,6)));
  const loaded=await env.loader.load(directModel());
  assert.deepEqual(new Uint8Array(loaded.buffer),bytes);
  assert.equal(requests,1);
  assert.equal((await(await cache.match(resolve('model.onnx'))).arrayBuffer()).byteLength,8);
});

test('a persistently truncated download is not reported saved or retained in memory',async()=>{
  let requests=0;const env=harness(async()=>{requests++;return response(bytes.slice(0,6))});
  const model=directModel();
  await assert.rejects(env.storage.download(model),/size mismatch/);
  assert.equal(requests,2);
  assert.equal((await env.storage.inspect(model)).stored,false);
  assert.equal((await env.loader.status(model)).state,'not cached');
});

test('an invalid primary source still falls back to the next source',async()=>{
  const requests=[];
  const env=harness(async url=>{requests.push(url);return response(new URL(url).pathname.endsWith('primary.onnx')?bytes.slice(0,6):bytes)});
  const model=directModel([{label:'primary',url:'primary.onnx'},{label:'fallback',url:'fallback.onnx'}]);
  const loaded=await env.loader.load(model);
  assert.deepEqual(new Uint8Array(loaded.buffer),bytes);
  assert.equal(loaded.source,'fallback');
  assert.equal(requests.length,3);
});

test('a malformed multipart network response cannot poison its retry cache',async()=>{
  let requests=0;const env=harness(async()=>response(++requests===1?bytes.slice(0,6):bytes));
  const model=directModel([{label:'multipart',parts:[{url:'part.bin',bytes:8,sha256:sha256(bytes)}]}]);
  const loaded=await env.loader.load(model);
  assert.deepEqual(new Uint8Array(loaded.buffer),bytes);
  assert.equal(requests,2);
});

test('a same-size checksum failure is retried before direct files are saved',async()=>{
  let requests=0;const bad=Uint8Array.from(bytes,value=>value+1);
  const env=harness(async()=>response(++requests===1?bad:bytes)),model={...directModel(),sha256:sha256(bytes)};
  await env.storage.download(model);
  const saved=await(await(await env.caches.open(cacheName)).match(resolve('model.onnx'))).arrayBuffer();
  assert.deepEqual(new Uint8Array(saved),bytes);
  assert.equal(requests,2);
});

test('a same-size corrupt direct cache entry is evicted and repaired',async()=>{
  let requests=0;const env=harness(async()=>{requests++;return response(bytes)}),model={...directModel(),sha256:sha256(bytes)};
  const cache=await env.caches.open(cacheName);await cache.put(resolve('model.onnx'),response(Uint8Array.from(bytes,value=>value+1)));
  const loaded=await env.loader.load(model);
  assert.deepEqual(new Uint8Array(loaded.buffer),bytes);
  assert.equal(requests,1);
});

test('a persistently wrong direct checksum is not saved',async()=>{
  let requests=0;const env=harness(async()=>{requests++;return response(Uint8Array.from(bytes,value=>value+1))});
  const model={...directModel(),sha256:sha256(bytes)};
  await assert.rejects(env.storage.download(model),/SHA-256 mismatch/);
  assert.equal(requests,2);
  assert.equal((await env.storage.inspect(model)).stored,false);
  assert.equal((await env.loader.status(model)).state,'not cached');
});

test('a mutated direct memory buffer is repaired from the valid persistent copy',async()=>{
  let requests=0;const env=harness(async()=>{requests++;return response(bytes)}),model={...directModel(),sha256:sha256(bytes)};
  const first=await env.loader.load(model);new Uint8Array(first.buffer)[0]=0;
  const repaired=await env.loader.load(model);
  assert.deepEqual(new Uint8Array(repaired.buffer),bytes);
  assert.equal(repaired.cacheState,'browser cache');
  assert.equal(requests,1);
});

test('an abort during direct checksum verification stops before memory or persistence',async()=>{
  const controller=new AbortController();let requests=0;
  const crypto={subtle:{digest:async(...args)=>{const digest=await webcrypto.subtle.digest(...args);controller.abort();return digest}}};
  const env=harness(async()=>{requests++;return response(bytes)},{crypto}),model={...directModel(),sha256:sha256(bytes)};
  await assert.rejects(env.loader.load(model,{signal:controller.signal}),{name:'AbortError'});
  assert.equal(requests,1);
  assert.equal((await env.loader.status(model)).state,'not cached');
});

test('multipart models keep per-part verification without an added full-buffer or memory-hit digest',async()=>{
  let digests=0;const crypto={subtle:{digest:async(...args)=>{digests++;return webcrypto.subtle.digest(...args)}}};
  const env=harness(async()=>response(bytes),{crypto});
  const model={...directModel([{label:'parts',parts:[{url:'part.bin',bytes:8,sha256:sha256(bytes)}]}]),sha256:sha256(bytes)};
  await env.loader.load(model);const reused=await env.loader.load(model);
  assert.equal(reused.cacheState,'memory');
  assert.equal(digests,1);
});

test('cancelling a partial direct transfer rejects without retry or a saved partial',async()=>{
  const controller=new AbortController();let requests=0;
  const env=harness(async()=>{
    requests++;
    return new Response(new ReadableStream({start(stream){stream.enqueue(bytes.slice(0,4));stream.enqueue(bytes.slice(4));stream.close()}}));
  });
  const model=directModel();
  await assert.rejects(env.storage.download(model,{signal:controller.signal,onProgress:()=>controller.abort()}),{name:'AbortError'});
  assert.equal(requests,1);
  assert.equal((await env.storage.inspect(model)).stored,false);
});

test('cancelling during direct persistence rejects while the completed file remains reusable',async()=>{
  const started=deferred(),finish=deferred(),controller=new AbortController();let requests=0;
  const env=harness(async()=>{requests++;return response(bytes)}),cache=await env.caches.open(cacheName),put=cache.put;
  cache.put=async(...args)=>{started.resolve();await finish.promise;return put(...args)};
  const model=directModel(),pending=env.loader.load(model,{signal:controller.signal});
  await started.promise;controller.abort();finish.resolve();
  await assert.rejects(pending,{name:'AbortError'});
  assert.equal(requests,1);
  assert.equal((await env.storage.inspect(model)).stored,true);
  assert.equal((await env.loader.status(model)).state,'browser cache');
});

test('cancelling during the final storage inventory check is not reported as success',async()=>{
  const started=deferred(),finish=deferred(),controller=new AbortController();
  const env=harness(async()=>response(bytes)),keys=env.caches.keys;
  env.caches.keys=async()=>{started.resolve();await finish.promise;return keys()};
  const pending=env.storage.download(directModel(),{signal:controller.signal});
  await started.promise;controller.abort();finish.resolve();
  await assert.rejects(pending,{name:'AbortError'});
});

function externalFixture(){
  const graph=Uint8Array.of(9),model={
    ...directModel([{label:'parts',parts:[{url:'part.bin',bytes:8,sha256:sha256(bytes)}]}]),sha256:sha256(bytes),
    externalData:{enabled:true,manifestUrl:'manifest.json',opfsName:'fixture.bin'}
  };
  const manifest={format:1,modelBytes:8,modelSha256:model.sha256,graph:{url:'graph.onnx',bytes:1,sha256:sha256(graph)},externalData:{path:'weights.bin'}};
  return{model,graph,manifest};
}

for(const fault of ['size','checksum'])test(`an external-data cached part with a bad ${fault} is recovered from network`,async()=>{
  const {model,graph,manifest}=externalFixture(),requests=[];
  const env=harness(async(url,options)=>{
    if(url===resolve('manifest.json'))return Response.json(manifest);
    if(url===resolve('graph.onnx'))return response(graph);
    requests.push({url,options});return response(bytes);
  });
  const cache=await env.caches.open(cacheName),bad=fault==='size'?bytes.slice(0,6):Uint8Array.from(bytes,value=>value+1);
  await cache.put(resolve('part.bin'),response(bad));
  const prepared=await env.external.prepare(model);
  assert.deepEqual(new Uint8Array(await prepared.file.arrayBuffer()),bytes);
  assert.equal(requests.length,1);
  assert.equal(requests[0].options.cache,'no-store');
  assert.equal(await cache.match(resolve('part.bin')),undefined);
  assert.equal((await env.external.status(model)).state,'persistent cache');
});

test('a failed external-data repair removes partial OPFS files and can recover on the next run',async()=>{
  const {model,graph,manifest}=externalFixture();let repair=false,partRequests=0;
  const env=harness(async url=>{
    if(url===resolve('manifest.json'))return Response.json(manifest);
    if(url===resolve('graph.onnx'))return response(graph);
    partRequests++;return response(repair?bytes:bytes.slice(0,6));
  });
  const cache=await env.caches.open(cacheName);await cache.put(resolve('part.bin'),response(bytes.slice(0,6)));
  await assert.rejects(env.external.prepare(model),/size mismatch/);
  assert.equal(await cache.match(resolve('part.bin')),undefined);
  assert.equal((await env.external.status(model)).state,'not cached');
  await assert.rejects(env.directory.getFileHandle('fixture.bin'),{name:'NotFoundError'});
  repair=true;
  assert.deepEqual(new Uint8Array(await(await env.external.prepare(model)).file.arrayBuffer()),bytes);
  assert.equal(partRequests,2);
});

test('pipeline size estimates are not treated as exact direct-model byte contracts',async()=>{
  const env=harness(async()=>response(bytes));
  const model={modelId:'test/fixture',revision:'pinned',bytes:15_300_000,sha256:'0'.repeat(64),runtime:{wasm:{dtype:'fp32',modelBytes:15_300_000}}};
  await env.storage.download(model);
  assert.equal((await env.storage.inspect(model)).stored,true);
});
