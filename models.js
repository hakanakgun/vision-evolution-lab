(() => {
  'use strict';
  const coco80=Object.freeze(['person','bicycle','car','motorcycle','airplane','bus','train','truck','boat','traffic light','fire hydrant','stop sign','parking meter','bench','bird','cat','dog','horse','sheep','cow','elephant','bear','zebra','giraffe','backpack','umbrella','handbag','tie','suitcase','frisbee','skis','snowboard','sports ball','kite','baseball bat','baseball glove','skateboard','surfboard','tennis racket','bottle','wine glass','cup','fork','knife','spoon','bowl','banana','apple','sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake','chair','couch','potted plant','bed','dining table','toilet','tv','laptop','mouse','remote','keyboard','cell phone','microwave','oven','toaster','sink','refrigerator','book','clock','vase','scissors','teddy bear','hair drier','toothbrush']);
  window.VisionModels=Object.freeze({
    version:'0.4.0',
    runtime:Object.freeze({ort:'1.30.0',transformersJs:'3.8.1',transformersJsUrl:'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1'}),
    labels:Object.freeze({coco80}),
    ssd:Object.freeze({
      id:'ssd-mobilenet-v1-12-int8',title:'SSD-MobileNetV1 INT8',year:2017,status:'runnable',family:'SSD + MobileNetV1',task:'object-detection',
      license:'permissive upstream; see MODEL_SOURCES.md',bytes:9542048,sha256:'2b79e6a7fb1ec6a33f332b9b10d82d9de4b7b49dcd26b5946921bb356895c954',maxSide:640,
      executionProviders:Object.freeze(['wasm']),
      providerNote:'WASM is intentional for this INT8 baseline: the current ORT WebGPU path can initialize this dynamic-shape graph but fail during OrtRun().',
      preprocessing:Object.freeze({resize:'aspect-preserving longest side ≤640',layout:'NHWC',dtype:'uint8',channels:'RGB',padding:'none'}),
      decoder:'SSD detection outputs',
      sources:Object.freeze([Object.freeze({label:'HF pinned',url:'https://huggingface.co/onnxmodelzoo/ssd_mobilenet_v1_12-int8/resolve/929618539097dbeb779c13aed75dfe346d016d48/ssd_mobilenet_v1_12-int8.onnx',provenance:'onnxmodelzoo/ssd_mobilenet_v1_12-int8 @ 929618539097dbeb779c13aed75dfe346d016d48'})])
    }),
    yolox:Object.freeze({
      id:'yolox-nano-0.1.1rc0',title:'YOLOX-Nano',year:2021,status:'runnable',family:'YOLOX Nano',task:'object-detection',license:'Apache-2.0',bytes:3659407,input:416,nms:0.45,
      executionProviders:Object.freeze(['webgpu','wasm']),
      preprocessing:Object.freeze({resize:'aspect-preserving',layout:'NCHW',dtype:'float32',channels:'BGR',padding:'top-left fill 114'}),
      decoder:'YOLOX strides 8/16/32 + class-agnostic NMS',
      sources:Object.freeze([
        Object.freeze({label:'HF pinned mirror',url:'https://huggingface.co/Heliosoph/yolox-onnx/resolve/9206d80cbad9ed54986edeff8d7457eb5333882a/yolox_nano.onnx?download=true',provenance:'Heliosoph/yolox-onnx @ 9206d80cbad9ed54986edeff8d7457eb5333882a'}),
        Object.freeze({label:'GitHub official',url:'https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_nano.onnx',provenance:'Megvii-BaseDetection/YOLOX release 0.1.1rc0'})
      ])
    }),
    rtdetr:Object.freeze({
      id:'rtdetr-r18vd-transformersjs',title:'RT-DETR R18',year:2023,status:'runnable',family:'RT-DETR',task:'object-detection',license:'Apache-2.0 base model',
      modelId:'onnx-community/rtdetr_r18vd',baseModel:'PekingU/rtdetr_r18vd',revision:'ec641af14c7cc8f93cd641a1458f498abbbbb533',parameters:'20.2M',input:640,
      preprocessing:Object.freeze({resize:'640×640 processor-managed',layout:'NCHW',dtype:'float32 input / quantized weights',channels:'RGB',rescale:'1/255',normalize:false,padding:'none'}),
      runtime:Object.freeze({webgpu:Object.freeze({device:'webgpu',dtype:'fp16',modelBytes:41400000}),wasm:Object.freeze({device:'wasm',dtype:'q8',modelBytes:21713196})}),
      decoder:'Transformers.js RT-DETR postprocessor',source:'https://huggingface.co/onnx-community/rtdetr_r18vd'
    })
  });
})();