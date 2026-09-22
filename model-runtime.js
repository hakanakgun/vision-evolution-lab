(()=>{
  'use strict';
  const registry=window.VisionModels;
  if(!registry)return;

  const modelKeys=Object.freeze(Object.keys(registry).filter(key=>registry[key]&&registry[key].status==='runnable'));
  const adapters=new Map();

  function modelFor(key){
    const model=registry[key];
    if(!model||model.status!=='runnable')throw new Error(`Unknown runnable model: ${key}`);
    return model;
  }

  function capabilityValue(model,capability){
    return model.capabilities&&Object.prototype.hasOwnProperty.call(model.capabilities,capability)
      ? model.capabilities[capability]
      : null;
  }

  function capabilityEnabled(model,capability){
    const value=capabilityValue(model,capability);
    if(value&&typeof value==='object')return value.enabled!==false;
    return value===true;
  }

  function raceMeta(model){
    const race=capabilityValue(model,'race');
    return race&&typeof race==='object'&&race.enabled!==false?race:null;
  }

  function validateModelContract(key){
    const model=modelFor(key),cap=model.capabilities;
    const errors=[];
    if(!cap||typeof cap!=='object')errors.push('capabilities missing');
    if(typeof cap?.timeMachine!=='boolean')errors.push('timeMachine capability must be boolean');
    if(typeof cap?.benchmark!=='boolean')errors.push('benchmark capability must be boolean');
    if(typeof cap?.live!=='boolean')errors.push('live capability must be boolean');
    if(!(cap?.inspection===false||(cap?.inspection&&typeof cap.inspection==='object')))errors.push('inspection capability must be false or an object');
    if(cap?.inspection&&typeof cap.inspection==='object'){
      const inspection=cap.inspection;
      if(!inspection.mode)errors.push('inspection.mode missing');
      if(!Array.isArray(inspection.stages))errors.push('inspection.stages missing');
      if(!inspection.input||!inspection.resize||!inspection.tensor||!inspection.channels||!inspection.normalization)errors.push('inspection display contract incomplete');
      if(!inspection.preview?.mode||!inspection.preview?.caption)errors.push('inspection.preview incomplete');
      else if(inspection.preview.mode==='aspect-max'&&!Number.isFinite(inspection.preview.maxSide))errors.push('inspection.preview.maxSide missing');
      else if(['stretch','letterbox-top-left'].includes(inspection.preview.mode)&&(!Number.isFinite(inspection.preview.width)||!Number.isFinite(inspection.preview.height)))errors.push('inspection.preview dimensions missing');
      if(!inspection.shape?.layout||!Number.isFinite(inspection.shape?.channels))errors.push('inspection.shape incomplete');
      for(const step of ['step2','step3','step4'])if(!inspection.pipeline?.[step]?.title||!inspection.pipeline?.[step]?.text)errors.push(`inspection.pipeline.${step} incomplete`);
      for(const field of ['label','input','resize','padding','layout','dtype','channels'])if(!inspection.comparison?.[field])errors.push(`inspection.comparison.${field} missing`);
      if(!inspection.intermediate?.title||!inspection.intermediate?.subtitle||!inspection.intermediate?.note||!inspection.intermediate?.data)errors.push('inspection.intermediate incomplete');
      else if(inspection.intermediate.data==='adapter'&&(!inspection.intermediate.renderer||!inspection.intermediate.statusEmpty||!inspection.intermediate.statusReady))errors.push('inspection adapter renderer/statuses missing');
      else if(inspection.intermediate.data!=='adapter'&&!inspection.intermediate.status)errors.push('inspection unavailable status missing');
      if(!inspection.resultNote)errors.push('inspection.resultNote missing');
    }
    const race=raceMeta(model);
    if(race){
      if(!race.group)errors.push('race.group missing');
      if(!race.prefix)errors.push('race.prefix missing');
      if(!race.workCanvasId)errors.push('race.workCanvasId missing');
      if(!race.timingBoundary)errors.push('race.timingBoundary missing');
      if(!Number.isFinite(race.order))errors.push('race.order missing');
      if(!race.badge)errors.push('race.badge missing');
      if(!race.emptyText)errors.push('race.emptyText missing');
      if(!race.architecture)errors.push('race.architecture missing');
      if(!Array.isArray(race.metrics)||!race.metrics.length)errors.push('race.metrics missing');
      else{
        const slots=new Set();
        for(const metric of race.metrics){
          if(!metric||!metric.label)errors.push('race metric label missing');
          if(metric&&metric.slot){
            if(slots.has(metric.slot))errors.push(`duplicate race metric slot: ${metric.slot}`);
            slots.add(metric.slot);
          }else if(metric&&metric.value==null)errors.push('race metric needs slot or value');
        }
      }
    }
    return errors;
  }

  function register(key,adapter){
    const model=modelFor(key);
    const contractErrors=validateModelContract(key);
    if(contractErrors.length)throw new Error(`${key} model contract invalid: ${contractErrors.join(', ')}`);
    if(!adapter||typeof adapter!=='object')throw new Error(`${key} runtime adapter missing`);
    for(const method of ['run','release','backend']){
      if(typeof adapter[method]!=='function')throw new Error(`${key} runtime adapter missing ${method}()`);
    }
    if(model.capabilities?.inspection?.intermediate?.data==='adapter'&&typeof adapter.inspectionData!=='function')throw new Error(`${key} runtime adapter missing inspectionData()`);
    if(adapters.has(key))throw new Error(`Runtime adapter already registered: ${key}`);
    const frozen=Object.freeze({
      key,
      model,
      capabilities:model.capabilities,
      run:adapter.run,
      release:adapter.release,
      backend:adapter.backend,
      runtimeInfo:typeof adapter.runtimeInfo==='function'?adapter.runtimeInfo:()=>({backend:adapter.backend()}),
      diagnosticBackends:typeof adapter.diagnosticBackends==='function'?adapter.diagnosticBackends:()=>[],
      inspectionData:typeof adapter.inspectionData==='function'?adapter.inspectionData:()=>null,
      renderFeatures:adapter.renderFeatures!==false,
      handlesMainUi:adapter.handlesMainUi===true
    });
    adapters.set(key,frozen);
    return frozen;
  }

  function get(key){return adapters.get(key)||null}

  function expectedKeys({capability='',group=''}={}){
    const keys=modelKeys.filter(key=>{
      const model=registry[key];
      if(capability&&!capabilityEnabled(model,capability))return false;
      if(group){
        const race=raceMeta(model);
        if(!race||race.group!==group)return false;
      }
      return true;
    });
    if(capability==='race'||group)keys.sort((a,b)=>(raceMeta(registry[a])?.order??9999)-(raceMeta(registry[b])?.order??9999));
    return keys;
  }

  function list(options={}){
    return expectedKeys(options).map(key=>adapters.get(key)).filter(Boolean);
  }

  async function releaseAll({exceptKey='',capability='',group=''}={}){
    const released=[];
    for(const adapter of list({capability,group})){
      if(adapter.key===exceptKey)continue;
      await adapter.release();
      released.push(adapter.key);
    }
    return Object.freeze(released);
  }

  function validateRegistryContract(){
    const errors=[],timeline=registry.timeline,defaults=registry.defaults||{};
    if(!Array.isArray(timeline)||!timeline.length)errors.push('timeline missing');
    else{
      const seenModels=new Set();let previousYear=-Infinity;
      for(const entry of timeline){
        if(!Number.isFinite(entry?.year)||!entry?.title)errors.push('timeline entry incomplete');
        if(Number.isFinite(entry?.year)&&entry.year<previousYear)errors.push('timeline must be chronological');
        if(Number.isFinite(entry?.year))previousYear=entry.year;
        if(entry?.model){
          if(seenModels.has(entry.model))errors.push(`timeline model duplicated: ${entry.model}`);else seenModels.add(entry.model);
          if(!modelKeys.includes(entry.model))errors.push(`timeline model is not runnable: ${entry.model}`);
          else if(!capabilityEnabled(registry[entry.model],'timeMachine'))errors.push(`timeline model is not Time Machine enabled: ${entry.model}`);
        }
      }
      for(const key of modelKeys.filter(key=>capabilityEnabled(registry[key],'timeMachine')))if(!seenModels.has(key))errors.push(`Time Machine model missing from timeline: ${key}`);
    }
    if(!defaults.timeMachine||!modelKeys.includes(defaults.timeMachine)||!capabilityEnabled(registry[defaults.timeMachine],'timeMachine'))errors.push('defaults.timeMachine invalid');
    return errors;
  }

  function validate(options={}){
    const expected=expectedKeys(options),registered=expected.filter(key=>adapters.has(key)),missing=expected.filter(key=>!adapters.has(key));
    const errors=validateRegistryContract();
    for(const key of expected)for(const error of validateModelContract(key))errors.push(`${key}: ${error}`);
    if(options.capability==='race'||options.group){
      const seenOrder=new Map(),seenPrefix=new Map();
      for(const key of expected){
        const race=raceMeta(registry[key]);if(!race)continue;
        if(seenOrder.has(race.order))errors.push(`${key}: race.order duplicates ${seenOrder.get(race.order)}`);else seenOrder.set(race.order,key);
        if(seenPrefix.has(race.prefix))errors.push(`${key}: race.prefix duplicates ${seenPrefix.get(race.prefix)}`);else seenPrefix.set(race.prefix,key);
      }
    }
    return Object.freeze({expected:Object.freeze(expected),registered:Object.freeze(registered),missing:Object.freeze(missing),errors:Object.freeze(errors)});
  }

  function assertRegistered(options={}){
    const result=validate(options);
    if(result.errors.length)throw new Error(`Model runtime contract invalid: ${result.errors.join(' | ')}`);
    if(result.missing.length)throw new Error(`Missing runtime adapters: ${result.missing.join(', ')}`);
    return true;
  }

  window.VisionRuntimeRegistry=Object.freeze({
    modelKeys,
    register,
    get,
    list,
    releaseAll,
    validate,
    assertRegistered,
    capabilityEnabled,
    raceMeta
  });
})();
