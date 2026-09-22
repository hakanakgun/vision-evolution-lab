(()=>{
  const ORT_VERSION='1.30.0';
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

  // Keep ORT parser-blocking so downstream scripts preserve their previous
  // startup order and lifecycle handlers are registered before initial pageshow.
  document.write('<script src="'+ortUrl+'"></'+'script>');
})();
