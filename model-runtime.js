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
    const race=raceMeta(model);
    if(race){
      if(!race.group)errors.push('race.group missing');
      if(!race.prefix)errors.push('race.prefix missing');
      if(!race.workCanvasId)errors.push('race.workCanvasId missing');
      if(!race.timingBoundary)errors.push('race.timingBoundary missing');
      if(!Number.isFinite(race.order))errors.push('race.order missing');
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

  function validate(options={}){
    const expected=expectedKeys(options),registered=expected.filter(key=>adapters.has(key)),missing=expected.filter(key=>!adapters.has(key));
    const errors=[];
    for(const key of expected)for(const error of validateModelContract(key))errors.push(`${key}: ${error}`);
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
