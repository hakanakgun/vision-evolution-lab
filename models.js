(() => {
  'use strict';
  const coco80=Object.freeze(['person','bicycle','car','motorcycle','airplane','bus','train','truck','boat','traffic light','fire hydrant','stop sign','parking meter','bench','bird','cat','dog','horse','sheep','cow','elephant','bear','zebra','giraffe','backpack','umbrella','handbag','tie','suitcase','frisbee','skis','snowboard','sports ball','kite','baseball bat','baseball glove','skateboard','surfboard','tennis racket','bottle','wine glass','cup','fork','knife','spoon','bowl','banana','apple','sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake','chair','couch','potted plant','bed','dining table','toilet','tv','laptop','mouse','remote','keyboard','cell phone','microwave','oven','toaster','sink','refrigerator','book','clock','vase','scissors','teddy bear','hair drier','toothbrush']);
  const voc20=Object.freeze(['aeroplane','bicycle','bird','boat','bottle','bus','car','cat','chair','cow','diningtable','dog','horse','motorbike','person','pottedplant','sheep','sofa','train','tvmonitor']);
  const vocCanonical=Object.freeze(['airplane','bicycle','bird','boat','bottle','bus','car','cat','chair','cow','dining table','dog','horse','motorcycle','person','potted plant','sheep','couch','train','tv']);
  const runtimeBootstrap=window.VisionRuntimeBootstrap||Object.freeze({ortVersion:'1.30.0',ortMode:'jsep',ortEntrypoint:'ort.webgpu.min.js',isIOS:false,reason:'legacy fallback'});
  const directOrtWebGPU=runtimeBootstrap.ortMode==='jsep';
  window.VisionModels=Object.freeze({
    version:'0.7.4',
    runtime:Object.freeze({ort:'1.30.0',directOrtMode:runtimeBootstrap.ortMode,directOrtEntrypoint:runtimeBootstrap.ortEntrypoint,directOrtReason:runtimeBootstrap.reason,transformersJs:'4.3.0',transformersJsUrl:'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0'}),
    labels:Object.freeze({coco80,voc20,vocCanonical}),
    tinyyolo:Object.freeze({
      id:'tiny-yolov2-voc-opset8',title:'Tiny YOLOv2',year:2016,status:'runnable',family:'Tiny YOLOv2',task:'object-detection',
      license:'upstream metadata Apache-2.0; model-card body MIT; see MODEL_SOURCES.md',bytes:66584576,sha256:'583fb7fdc948435ceac9fa82efc7708701efe8382a859a3dd46526b155f5f2ae',input:416,nms:0.40,
      revision:'869707e16e57006f97d98af54cfdc8a1d388ae61',anchors:Object.freeze([1.08,1.19,3.42,4.41,6.63,11.38,9.42,5.11,16.62,10.52]),
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:false,race:Object.freeze({enabled:true,group:'general-object',order:10,prefix:'tiny',workCanvasId:'race-tiny-work',timingBoundary:'ort-session'}),inspection:Object.freeze({mode:'final-grid',stages:Object.freeze(['preprocessing','final-grid'])})}),
      executionProviders:Object.freeze(['wasm']),
      providerNote:'WASM is the initial compatibility policy for this historical opset-8 export; physical iPhone/WebKit runtime validation is pending.',
      preprocessing:Object.freeze({resize:'direct resize to 416×416',layout:'NCHW',dtype:'float32',channels:'RGB',normalization:'raw 0–255 float input; upstream preprocessing field is blank',padding:'none'}),
      decoder:'YOLOv2 13×13 grid · 5 anchors · VOC20 softmax + class-aware NMS',
      ui:Object.freeze({subtitle:'Pascal VOC 20-class detection · ONNX · opset 8',provenance:'Pinned ONNX Model Zoo Tiny YOLOv2 export, migrated to Hugging Face. The checkpoint descends from a Core ML conversion of the original Darknet/Keras network; model-card license presentation is internally inconsistent and documented separately.',links:Object.freeze([Object.freeze({label:'YOLO9000 paper ↗',url:'https://arxiv.org/abs/1612.08242'}),Object.freeze({label:'Pinned model ↗',url:'https://huggingface.co/onnxmodelzoo/tinyyolov2-8/tree/869707e16e57006f97d98af54cfdc8a1d388ae61'}),Object.freeze({label:'License/provenance ↗',url:'MODEL_SOURCES.md#tiny-yolov2'})])}),
      sources:Object.freeze([Object.freeze({label:'HF ONNX Model Zoo pinned',url:'https://huggingface.co/onnxmodelzoo/tinyyolov2-8/resolve/869707e16e57006f97d98af54cfdc8a1d388ae61/tinyyolov2-8.onnx?download=true',provenance:'onnxmodelzoo/tinyyolov2-8 @ 869707e16e57006f97d98af54cfdc8a1d388ae61'})])
    }),
    ssd:Object.freeze({
      id:'ssd-mobilenet-v1-12-int8',title:'SSD-MobileNetV1 INT8',year:2017,status:'runnable',family:'SSD + MobileNetV1',task:'object-detection',
      license:'permissive upstream; see MODEL_SOURCES.md',bytes:9542048,sha256:'2b79e6a7fb1ec6a33f332b9b10d82d9de4b7b49dcd26b5946921bb356895c954',maxSide:640,
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:true,race:Object.freeze({enabled:true,group:'general-object',order:20,prefix:'ssd',workCanvasId:'input-canvas',timingBoundary:'ort-session'}),inspection:Object.freeze({mode:'preprocessing-only',stages:Object.freeze(['preprocessing'])})}),
      executionProviders:Object.freeze(['wasm']),
      providerNote:'WASM is intentional for this INT8 baseline: the current ORT WebGPU path can initialize this dynamic-shape graph but fail during OrtRun().',
      preprocessing:Object.freeze({resize:'aspect-preserving longest side ≤640',layout:'NHWC',dtype:'uint8',channels:'RGB',padding:'none'}),
      decoder:'SSD detection outputs',
      ui:Object.freeze({subtitle:'COCO object detection · ONNX · opset 12',provenance:'Pinned ONNX Model Zoo INT8 export trained on MS COCO 2017. Upstream model-card mAP: 0.2297.',links:Object.freeze([Object.freeze({label:'SSD paper ↗',url:'https://arxiv.org/abs/1512.02325'}),Object.freeze({label:'MobileNet paper ↗',url:'https://arxiv.org/abs/1704.04861'}),Object.freeze({label:'Model source ↗',url:'https://huggingface.co/onnxmodelzoo/ssd_mobilenet_v1_12-int8/tree/929618539097dbeb779c13aed75dfe346d016d48'}),Object.freeze({label:'License/provenance ↗',url:'MODEL_SOURCES.md#ssd-mobilenetv1-12-int8'})])}),
      sources:Object.freeze([Object.freeze({label:'HF pinned',url:'https://huggingface.co/onnxmodelzoo/ssd_mobilenet_v1_12-int8/resolve/929618539097dbeb779c13aed75dfe346d016d48/ssd_mobilenet_v1_12-int8.onnx',provenance:'onnxmodelzoo/ssd_mobilenet_v1_12-int8 @ 929618539097dbeb779c13aed75dfe346d016d48'})])
    }),
    yolox:Object.freeze({
      id:'yolox-nano-0.1.1rc0',title:'YOLOX-Nano',year:2021,status:'runnable',family:'YOLOX Nano',task:'object-detection',license:'Apache-2.0',bytes:3659407,input:416,nms:0.45,
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:false,race:Object.freeze({enabled:true,group:'general-object',order:30,prefix:'yolo',workCanvasId:'race-yolo-work',timingBoundary:'ort-session'}),inspection:Object.freeze({mode:'head-objectness',stages:Object.freeze(['preprocessing','stride-8-objectness','stride-16-objectness','stride-32-objectness'])})}),
      executionProviders:Object.freeze(directOrtWebGPU?['webgpu','wasm']:['wasm']),
      providerNote:directOrtWebGPU?'Direct ORT uses the JSEP-capable WebGPU bundle on this page, with WASM fallback.':'Direct ORT uses the standard non-JSEP WASM bundle on this page; WebGPU is intentionally disabled for YOLOX in this runtime mode.',
      preprocessing:Object.freeze({resize:'aspect-preserving',layout:'NCHW',dtype:'float32',channels:'BGR',padding:'top-left fill 114'}),
      decoder:'YOLOX strides 8/16/32 + class-agnostic NMS',
      ui:Object.freeze({subtitle:'COCO object detection · ONNX · anchor-free CNN',provenance:'Official Megvii YOLOX-Nano deployment checkpoint. Upstream reports 0.91M parameters and 25.8 COCO AP; browser inference keeps the official 416×416 preprocessing path.',links:Object.freeze([Object.freeze({label:'Official repo ↗',url:'https://github.com/Megvii-BaseDetection/YOLOX'}),Object.freeze({label:'Pinned mirror ↗',url:'https://huggingface.co/Heliosoph/yolox-onnx/tree/9206d80cbad9ed54986edeff8d7457eb5333882a'}),Object.freeze({label:'License/provenance ↗',url:'MODEL_SOURCES.md#yolox-nano'})])}),
      sources:Object.freeze([
        Object.freeze({label:'HF pinned mirror',url:'https://huggingface.co/Heliosoph/yolox-onnx/resolve/9206d80cbad9ed54986edeff8d7457eb5333882a/yolox_nano.onnx?download=true',provenance:'Heliosoph/yolox-onnx @ 9206d80cbad9ed54986edeff8d7457eb5333882a'}),
        Object.freeze({label:'GitHub official',url:'https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_nano.onnx',provenance:'Megvii-BaseDetection/YOLOX release 0.1.1rc0'})
      ])
    }),
    rtdetr:Object.freeze({
      id:'rtdetr-r18vd-transformersjs',title:'RT-DETR R18',year:2023,status:'runnable',family:'RT-DETR',task:'object-detection',license:'Apache-2.0 base model',
      modelId:'onnx-community/rtdetr_r18vd',baseModel:'PekingU/rtdetr_r18vd',revision:'ec641af14c7cc8f93cd641a1458f498abbbbb533',parameters:'20.2M',input:640,
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:false,race:Object.freeze({enabled:true,group:'general-object',order:40,prefix:'rt',workCanvasId:'race-rt-work',timingBoundary:'transformers-pipeline'}),inspection:Object.freeze({mode:'processor-contract-only',stages:Object.freeze(['preprocessing'])})}),
      preprocessing:Object.freeze({resize:'640×640 processor-managed',layout:'NCHW',dtype:'float32 input / quantized weights',channels:'RGB',rescale:'1/255',normalize:false,padding:'none'}),
      runtime:Object.freeze({webgpu:Object.freeze({device:'webgpu',dtype:'fp16',modelBytes:41400000}),wasm:Object.freeze({device:'wasm',dtype:'q8',modelBytes:21713196})}),
      decoder:'Transformers.js RT-DETR postprocessor',
      ui:Object.freeze({subtitle:'COCO object detection · Transformers.js · DETR',provenance:'PekingU RT-DETR R18 base model with the pinned Hugging Face ONNX Community conversion. The browser keeps the exact conversion revision and uses Transformers.js v4 native WebGPU runtime with WASM q8 fallback.',links:Object.freeze([Object.freeze({label:'Base model ↗',url:'https://huggingface.co/PekingU/rtdetr_r18vd'}),Object.freeze({label:'Pinned conversion ↗',url:'https://huggingface.co/onnx-community/rtdetr_r18vd/tree/ec641af14c7cc8f93cd641a1458f498abbbbb533'}),Object.freeze({label:'Official repo ↗',url:'https://github.com/lyuwenyu/RT-DETR'}),Object.freeze({label:'License/provenance ↗',url:'MODEL_SOURCES.md#rt-detr-r18'})])}),
      source:'https://huggingface.co/onnx-community/rtdetr_r18vd'
    })
  });
})();