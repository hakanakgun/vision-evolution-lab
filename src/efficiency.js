(() => {
  'use strict';
  const registry=window.VisionModels,runtimes=window.VisionRuntimeRegistry,$=id=>document.getElementById(id);
  if(!registry||!runtimes)return;

  const mib=value=>Number.isFinite(value)?(value/1048576).toFixed(value/1048576<10?2:1)+' MiB':'—';
  const ms=value=>Number.isFinite(value)?value.toFixed(value<10?2:1)+' ms':'—';

  function raceEntries(){
    return runtimes.modelKeys
      .map(key=>({key,model:registry[key],race:runtimes.raceMeta(registry[key])}))
      .filter(entry=>entry.race?.group==='general-object')
      .sort((a,b)=>a.race.order-b.race.order);
  }

  function benchmarkSnapshot(){
    const snapshot=window.VisionRaceInsights?.snapshot?.();
    return snapshot&&typeof snapshot==='object'?snapshot:{};
  }

  function assetBytes(model,backend=''){
    if(Number.isFinite(model?.bytes))return model.bytes;
    const lower=String(backend).toLowerCase(),runtime=model?.runtime||{};
    if(lower.includes('webgpu')&&Number.isFinite(runtime.webgpu?.modelBytes))return runtime.webgpu.modelBytes;
    if(lower.includes('wasm')&&Number.isFinite(runtime.wasm?.modelBytes))return runtime.wasm.modelBytes;
    const candidates=[runtime.webgpu?.modelBytes,runtime.wasm?.modelBytes].filter(Number.isFinite);
    return candidates.length?Math.min(...candidates):NaN;
  }

  function assetLabel(model,backend=''){
    const runtime=model?.runtime||{};
    if(Number.isFinite(model?.bytes))return mib(model.bytes);
    const lower=String(backend).toLowerCase();
    if(lower.includes('webgpu')&&Number.isFinite(runtime.webgpu?.modelBytes))return mib(runtime.webgpu.modelBytes)+' · measured backend';
    if(lower.includes('wasm')&&Number.isFinite(runtime.wasm?.modelBytes))return mib(runtime.wasm.modelBytes)+' · measured backend';
    const values=[runtime.wasm?.modelBytes,runtime.webgpu?.modelBytes].filter(Number.isFinite).sort((a,b)=>a-b);
    if(values.length===2&&values[0]!==values[1])return mib(values[0])+'–'+mib(values[1]);
    return values.length?mib(values[0]):(model?.ui?.runtime?.bytesText||'not declared');
  }

  function rail(label,valueText,ratio,kind){
    const row=document.createElement('div');row.className='efficiency-rail-row';
    const top=document.createElement('div');top.className='efficiency-rail-label';
    const name=document.createElement('span');name.textContent=label;const value=document.createElement('b');value.textContent=valueText;top.append(name,value);
    const track=document.createElement('div');track.className='efficiency-rail';
    const fill=document.createElement('div');fill.className='efficiency-rail-fill '+kind;fill.style.width=Math.max(0,Math.min(100,ratio*100))+'%';track.appendChild(fill);
    row.append(top,track);return row;
  }

  function render(){
    const grid=$('efficiency-grid'),status=$('efficiency-status');if(!grid||!status)return;
    const entries=raceEntries(),snapshot=benchmarkSnapshot(),measured=entries.filter(entry=>snapshot[entry.key]);
    const footprintValues=entries.map(entry=>assetBytes(entry.model,snapshot[entry.key]?.backend)).filter(Number.isFinite);
    const latencyValues=measured.map(entry=>snapshot[entry.key]?.p50).filter(Number.isFinite);
    const maxBytes=Math.max(1,...footprintValues),maxLatency=Math.max(1,...latencyValues);
    grid.replaceChildren();

    for(const entry of entries){
      const result=snapshot[entry.key]||null,bytes=assetBytes(entry.model,result?.backend),card=document.createElement('article');
      card.className='card efficiency-card';card.dataset.efficiencyModel=entry.key;

      const head=document.createElement('div');head.className='efficiency-card-head';
      const titleWrap=document.createElement('div'),eyebrow=document.createElement('span'),title=document.createElement('h3'),backend=document.createElement('span');
      eyebrow.className='pill generation';eyebrow.textContent=String(entry.model.year||'model');title.textContent=entry.model.title;
      backend.className='tiny';backend.textContent=result?.backend||'benchmark not run';
      titleWrap.append(eyebrow,title);head.append(titleWrap,backend);card.appendChild(head);

      card.appendChild(rail('Runtime asset',assetLabel(entry.model,result?.backend),Number.isFinite(bytes)?bytes/maxBytes:0,'footprint'));
      card.appendChild(rail('Warm p50',result?ms(result.p50):'run Model Race ×20',result&&Number.isFinite(result.p50)?result.p50/maxLatency:0,'latency'));

      const details=document.createElement('div');details.className='efficiency-details';
      const items=[
        ['p90',result?ms(result.p90):'—'],
        ['p50 end-to-end',result?ms(result.total):'—'],
        ['Timing variation',result&&Number.isFinite(result.cv)?result.cv.toFixed(1)+'%':'—'],
        ['Timing boundary',entry.race.timingBoundary||'—']
      ];
      for(const [label,value] of items){const row=document.createElement('div');const key=document.createElement('span'),val=document.createElement('b');key.textContent=label;val.textContent=value;row.append(key,val);details.appendChild(row)}
      card.appendChild(details);grid.appendChild(card);
    }

    status.textContent=measured.length
      ? `Measured ${measured.length}/${entries.length} Model Race generations in this page session. Bars are normalized within the current set; they are not a score or ranking.`
      : `Runtime footprint metadata is available for ${entries.length} Model Race generations. Run Model Race ×20 to add warm latency from this device.`;
  }

  document.addEventListener('vision:racebenchmark',render);
  document.addEventListener('vision:tabchange',event=>{if(event.detail?.tab==='efficiency-lab')render()});
  window.VisionEfficiencyLab=Object.freeze({render});
  render();
})();