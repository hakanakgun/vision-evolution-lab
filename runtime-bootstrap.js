(()=>{
  const ORT_VERSION='1.30.0';
  const APP_VERSION='0.7.4-diag12';
  const params=new URLSearchParams(location.search);
  const ua=navigator.userAgent||'';
  const isIOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const requested=params.get('ort');
  const override=requested==='jsep'||requested==='wasm'?requested:'';
  const ortMode=override==='jsep'?'jsep':override==='wasm'?'standard-wasm':isIOS?'standard-wasm':'jsep';
  const ortEntrypoint=ortMode==='jsep'?'ort.webgpu.min.js':'ort.wasm.min.js';
  const ortUrl=`https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/${ortEntrypoint}`;
  const reason=override?'query override':isIOS?'iOS memory-safety policy':'desktop acceleration policy';

  window.VisionRuntimeBootstrap=Object.freeze({
    ortVersion:ORT_VERSION,
    ortMode,
    ortEntrypoint,
    ortUrl,
    override:override||'',
    isIOS,
    reason
  });

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.onload=()=>resolve(src);
      script.onerror=()=>reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function boot(){
    await loadScript(ortUrl);
    for(const src of [
      `models.js?v=${APP_VERSION}`,
      `model-loader.js?v=${APP_VERSION}`,
      `app.js?v=${APP_VERSION}`,
      `race.js?v=${APP_VERSION}`
    ]) await loadScript(src);
  }

  boot().catch(error=>{
    console.error('Runtime bootstrap failed',error);
    const el=document.getElementById('unsupported');
    if(el){
      el.textContent='Browser runtime failed to initialize. Reload the page or try a current Safari, Chrome, Edge, Firefox, or Brave build.';
      el.classList.add('show');
    }
  });
})();
