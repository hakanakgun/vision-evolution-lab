(() => {
  'use strict';
  const coco80=Object.freeze(['person','bicycle','car','motorcycle','airplane','bus','train','truck','boat','traffic light','fire hydrant','stop sign','parking meter','bench','bird','cat','dog','horse','sheep','cow','elephant','bear','zebra','giraffe','backpack','umbrella','handbag','tie','suitcase','frisbee','skis','snowboard','sports ball','kite','baseball bat','baseball glove','skateboard','surfboard','tennis racket','bottle','wine glass','cup','fork','knife','spoon','bowl','banana','apple','sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake','chair','couch','potted plant','bed','dining table','toilet','tv','laptop','mouse','remote','keyboard','cell phone','microwave','oven','toaster','sink','refrigerator','book','clock','vase','scissors','teddy bear','hair drier','toothbrush']);
  const voc20=Object.freeze(['aeroplane','bicycle','bird','boat','bottle','bus','car','cat','chair','cow','diningtable','dog','horse','motorbike','person','pottedplant','sheep','sofa','train','tvmonitor']);
  const vocCanonical=Object.freeze(['airplane','bicycle','bird','boat','bottle','bus','car','cat','chair','cow','dining table','dog','horse','motorcycle','person','potted plant','sheep','couch','train','tv']);
  const runtimeBootstrap=window.VisionRuntimeBootstrap||Object.freeze({ortVersion:'1.30.0',ortMode:'jsep',ortEntrypoint:'ort.webgpu.min.js',isIOS:false,reason:'legacy fallback'});
  const directOrtWebGPU=runtimeBootstrap.ortMode==='jsep';
  window.VisionModels=Object.freeze({
    version:'0.11.0',
    runtime:Object.freeze({ort:'1.30.0',directOrtMode:runtimeBootstrap.ortMode,directOrtEntrypoint:runtimeBootstrap.ortEntrypoint,directOrtReason:runtimeBootstrap.reason,transformersJs:'4.3.0',transformersJsUrl:'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0'}),
    labels:Object.freeze({coco80,voc20,vocCanonical}),
    defaults:Object.freeze({timeMachine:'yolox',live:'yolox'}),
    timeline:Object.freeze([
      Object.freeze({year:1980,title:'Neocognitron',note:'run · early pattern-response demo',kind:'history-experiment',experiment:'neocognitron'}),
      Object.freeze({year:1998,title:'LeNet-era MNIST CNN',note:'run · handwritten digits only',kind:'history-experiment',experiment:'mnist-digits'}),
      Object.freeze({year:2001,title:'Viola–Jones',note:'run · frontal-face cascade',kind:'history-experiment',experiment:'viola-jones'}),
      Object.freeze({year:2005,title:'HOG + SVM',note:'run · pedestrian detector',kind:'history-experiment',experiment:'hog-pedestrians'}),
      Object.freeze({year:2012,title:'AlexNet',note:'run · ImageNet top-5 classification',kind:'history-experiment',experiment:'alexnet-classification'}),
      Object.freeze({year:2014,title:'R-CNN',note:'history only · region proposals + CNN',kind:'historical'}),
      Object.freeze({year:2015,title:'Faster R-CNN',note:'history only · learned proposals',kind:'historical'}),
      Object.freeze({year:2016,title:'YOLOv1',note:'history only · single-stage detector',kind:'historical'}),
      Object.freeze({year:2016,model:'ssd2016',title:'SSD · ResNet-34 INT8',note:'reference checkpoint · COCO · WASM',kind:'runnable'}),
      Object.freeze({year:2016,model:'tinyyolo',title:'Tiny YOLOv2',note:'tap to run · VOC20',kind:'runnable'}),
      Object.freeze({year:2017,model:'ssd',title:'SSD + MobileNet',note:'tap to run',kind:'runnable'}),
      Object.freeze({year:2020,model:'detr',title:'DETR · ResNet-50',note:'reference checkpoint · COCO · WASM q8',kind:'runnable',className:'transformer'}),
      Object.freeze({year:2021,model:'yolox',title:'YOLOX-Nano',note:'tap to run',kind:'runnable'}),
      Object.freeze({year:2023,model:'rtdetr',title:'RT-DETR R18',note:'tap to run',kind:'runnable',className:'transformer'}),
      Object.freeze({year:2024,model:'rtdetrv2',title:'RT-DETRv2 R18',note:'research preview · tap to run',kind:'runnable',className:'transformer'}),
      Object.freeze({year:2024,title:'LW-DETR',note:'research',kind:'research'}),
      Object.freeze({year:2024,title:'D-FINE',note:'research',kind:'research'})
    ]),
    historyExperiments:Object.freeze({
      'neocognitron':Object.freeze({
        id:'neocognitron',year:1980,title:'Neocognitron · pattern-response preview',runner:'pattern-response',input:'image',task:'hierarchical visual pattern response',output:'response-map',
        description:'An early pattern-recognition idea explored on this image through oriented responses and local max pooling.',
        note:'Educational approximation with fixed edge filters and pooling. It is not a trained Neocognitron checkpoint and does not return object labels.'
      }),
      'mnist-digits':Object.freeze({
        id:'mnist-digits',year:1998,title:'LeNet-era · MNIST digit CNN reference',runner:'mnist-digit-cnn',input:'image',task:'handwritten-digit-recognition',output:'digit-boxes',
        description:'Searches for digit-like regions, then classifies each crop with an MNIST convolutional network.',
        note:'This later ONNX Model Zoo checkpoint illustrates the handwritten-digit task; it is not the original 1998 LeNet-5 weights. It only recognizes isolated handwritten digits, not general objects or arbitrary printed text. Region proposals may miss digits or include non-digits. The displayed softmax score is a filter, not calibrated confidence.',
        model:Object.freeze({
          repository:'onnx/models',revision:'4f43949841cb55a0b98dc8fcd045431ccafd9f96',file:'mnist-12.onnx',bytes:26143,opset:12,
          url:'https://media.githubusercontent.com/media/onnx/models/4f43949841cb55a0b98dc8fcd045431ccafd9f96/validated/vision/classification/mnist/model/mnist-12.onnx',
          sha256:'5c688690f8bacf667d4c2074af5ad0646ca328d7ab03eccf944a65b320171bdd',
          licenseMetadata:'Apache-2.0',licenseCard:'MIT',provider:'wasm'
        })
      }),
      'viola-jones':Object.freeze({
        id:'viola-jones',year:2001,title:'Viola–Jones method family · frontal-face cascade',runner:'opencv-face',input:'image',task:'frontal-face-detection',output:'boxes',workerMethod:'face',
        description:'Runs the pinned OpenCV frontal-face cascade on the same Time Machine image.',
        note:'A representative of the Viola–Jones method family. The later OpenCV cascade weights are not the original 2001 paper artifact.'
      }),
      'hog-pedestrians':Object.freeze({
        id:'hog-pedestrians',year:2005,title:'HOG + linear SVM · pedestrian detector',runner:'opencv-hog',input:'image',task:'pedestrian-detection',output:'boxes',workerMethod:'hog',
        description:'Runs OpenCV HOG with its default 64×128 people detector on the same Time Machine image.',
        note:'Detects pedestrians only. OpenCV’s embedded coefficients are not claimed to be the exact original Dalal–Triggs training artifact.'
      }),
      'alexnet-classification':Object.freeze({
        id:'alexnet-classification',year:2012,title:'AlexNet · ImageNet classification',runner:'alexnet-image-classification',input:'image',task:'1000-class ImageNet image classification',output:'top-5-labels',
        description:'Resizes the selected image to AlexNet’s 224×224 input, then runs the pinned ONNX Model Zoo INT8 checkpoint in ONNX Runtime Web WASM.',
        note:'This is a browser-runnable BVLC AlexNet-family checkpoint, not the exact 2012 paper weights. Top-5 values are model scores, not calibrated confidence. Image classification returns labels only; it does not locate objects or draw boxes.',
        model:Object.freeze({
          repository:'onnxmodelzoo/bvlcalexnet-12-int8',revision:'99a443a03ecc3576ebd2d94aae33f8f5522b969c',file:'bvlcalexnet-12-int8.onnx',bytes:60984008,opset:12,
          url:'https://huggingface.co/onnxmodelzoo/bvlcalexnet-12-int8/resolve/99a443a03ecc3576ebd2d94aae33f8f5522b969c/bvlcalexnet-12-int8.onnx',
          sha256:'d53bbedf100be79277cf55d78c72bdcb67d88786988561bf5d530f038e443c7b',
          input:Object.freeze({width:224,height:224,layout:'NCHW',dtype:'float32',sourceResize:'direct stretch',channels:'BGR',mean:Object.freeze([103.939,116.779,123.68]),scale:1}),
          labels:'assets/models/imagenet-1k-labels.json',labelsSha256:'495a1f028e7b3b1878dbc4ec2e66f9a9a9c89c48abb007a9c954faa13571c33a',provider:'wasm',licenseMetadata:'Apache-2.0',licenseCard:'BSD-3-Clause'
        })
      })
    }),
    tinyyolo:Object.freeze({
      id:'tiny-yolov2-voc-opset8',title:'Tiny YOLOv2',year:2016,status:'runnable',family:'Tiny YOLOv2',task:'object-detection',
      license:'upstream metadata Apache-2.0; model-card body MIT; see MODEL_SOURCES.md',bytes:66584576,sha256:'583fb7fdc948435ceac9fa82efc7708701efe8382a859a3dd46526b155f5f2ae',input:416,nms:0.40,
      revision:'869707e16e57006f97d98af54cfdc8a1d388ae61',anchors:Object.freeze([1.08,1.19,3.42,4.41,6.63,11.38,9.42,5.11,16.62,10.52]),
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:Object.freeze({enabled:true,order:20,summary:'Sequential inference · no frame queue'}),race:Object.freeze({
        enabled:true,group:'general-object',order:10,prefix:'tiny',workCanvasId:'race-tiny-work',timingBoundary:'ort-session',
        badge:'2016 · VOC20',badgeClass:'',cardClass:'',emptyText:'Pinned ONNX Model Zoo export · Pascal VOC 20 classes · ~63.5 MB.',progress:true,progressText:'Model not loaded.',
        architecture:'5 anchors · 13×13 grid · Pascal VOC 20-class CNN detector',
        metrics:Object.freeze([
          Object.freeze({label:'Input',value:'416×416'}),Object.freeze({label:'Model file',value:'~63.5 MB'}),Object.freeze({label:'Dataset',value:'Pascal VOC'}),
          Object.freeze({label:'Asset source',slot:'source',initial:'—'}),Object.freeze({label:'Cache',slot:'cache',initial:'checking…'}),Object.freeze({label:'Transfer / init',slot:'startup',initial:'—'}),
          Object.freeze({label:'Inference',slot:'inf',initial:'—'}),Object.freeze({label:'End-to-end',slot:'total',initial:'—'}),Object.freeze({label:'Detections',slot:'count',initial:'—'})
        ])
      }),inspection:Object.freeze({
        mode:'final-grid',stages:Object.freeze(['preprocessing','final-grid']),
        input:'416×416',resize:'direct stretch to 416×416',tensor:'float32 · NCHW',channels:'RGB',normalization:'raw 0–255 float input',
        preview:Object.freeze({mode:'stretch',width:416,height:416,caption:'Tiny YOLOv2 416×416 direct-resize preview'}),
        shape:Object.freeze({layout:'NCHW',channels:3}),
        pipeline:Object.freeze({
          step2:Object.freeze({title:'Direct resize',text:'The source is resized directly to 416×416, matching the exact-export runtime convention rather than letterboxed.'}),
          step3:Object.freeze({title:'RGB tensor',text:'Canvas RGB byte values are packed as float32 NCHW. Upstream preprocessing documentation is incomplete, so this is explicitly recorded as a validation-sensitive contract.'}),
          step4:Object.freeze({title:'YOLOv2 grid head',text:'A 13×13 grid predicts 5 anchors per cell, each with box/objectness plus 20 Pascal VOC class logits.'})
        }),
        comparison:Object.freeze({label:'Tiny YOLOv2',input:'416×416',resize:'direct stretch',padding:'none',layout:'NCHW',dtype:'float32',channels:'RGB · raw pixels'}),
        intermediate:Object.freeze({title:'Tiny YOLOv2 intermediate tensors not exported',subtitle:'The current export exposes the final 125×13×13 detection grid, not selected backbone activations.',note:'No simulated feature maps are shown; selected real intermediate outputs would require an inspectable export.',data:'none',status:'Intermediate activations not exposed'}),
        resultNote:'UI threshold changes redraw retained outputs without new inference.'
      })}),
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
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:Object.freeze({enabled:true,order:10,summary:'Sequential inference · no frame queue'}),race:Object.freeze({
        enabled:true,group:'general-object',order:20,prefix:'ssd',workCanvasId:'input-canvas',timingBoundary:'ort-session',
        badge:'2017 baseline',badgeClass:'',cardClass:'',emptyText:'Waiting for a race image.',progress:false,
        architecture:'predefined anchors · lightweight CNN backbone · single-shot dense prediction',
        metrics:Object.freeze([
          Object.freeze({label:'Input',slot:'input',initial:'dynamic ≤640'}),Object.freeze({label:'Model file',value:'9.10 MB'}),
          Object.freeze({label:'Inference',slot:'inf',initial:'—'}),Object.freeze({label:'End-to-end',slot:'total',initial:'—'}),Object.freeze({label:'Detections',slot:'count',initial:'—'})
        ])
      }),inspection:Object.freeze({
        mode:'preprocessing-only',stages:Object.freeze(['preprocessing']),
        input:'dynamic ≤640',resize:'aspect preserve ≤640',tensor:'uint8 · NHWC',channels:'RGB',normalization:'none',
        preview:Object.freeze({mode:'aspect-max',maxSide:640,caption:'SSD prepared-input preview'}),
        shape:Object.freeze({layout:'NHWC',channels:3}),
        pipeline:Object.freeze({
          step2:Object.freeze({title:'Aspect resize',text:'Longest side is capped at 640 px while preserving aspect ratio.'}),
          step3:Object.freeze({title:'RGB tensor',text:'Canvas RGBA becomes uint8 NHWC RGB data.'}),
          step4:Object.freeze({title:'SSD + MobileNet',text:'MobileNet extracts features; SSD predicts classes, scores and boxes in one pass.'})
        }),
        comparison:Object.freeze({label:'SSD-MobileNet',input:'dynamic ≤640',resize:'aspect preserve',padding:'none',layout:'NHWC',dtype:'uint8',channels:'RGB'}),
        intermediate:Object.freeze({title:'SSD intermediate tensors not exported',subtitle:'The current ONNX output exposes detections, not selected backbone activations.',note:'A separate inspectable SSD export is required before deeper activations can be shown truthfully.',data:'none',status:'Intermediate activations not exposed'}),
        resultNote:'UI threshold changes redraw retained outputs without new inference.'
      })}),
      executionProviders:Object.freeze(['wasm']),
      providerNote:'WASM is intentional for this INT8 baseline: the current ORT WebGPU path can initialize this dynamic-shape graph but fail during OrtRun().',
      preprocessing:Object.freeze({resize:'aspect-preserving longest side ≤640',layout:'NHWC',dtype:'uint8',channels:'RGB',padding:'none'}),
      decoder:'SSD detection outputs',
      ui:Object.freeze({subtitle:'COCO object detection · ONNX · opset 12',provenance:'Pinned ONNX Model Zoo INT8 export trained on MS COCO 2017. Upstream model-card mAP: 0.2297.',links:Object.freeze([Object.freeze({label:'SSD paper ↗',url:'https://arxiv.org/abs/1512.02325'}),Object.freeze({label:'MobileNet paper ↗',url:'https://arxiv.org/abs/1704.04861'}),Object.freeze({label:'Model source ↗',url:'https://huggingface.co/onnxmodelzoo/ssd_mobilenet_v1_12-int8/tree/929618539097dbeb779c13aed75dfe346d016d48'}),Object.freeze({label:'License/provenance ↗',url:'MODEL_SOURCES.md#ssd-mobilenetv1-12-int8'})])}),
      sources:Object.freeze([Object.freeze({label:'HF pinned',url:'https://huggingface.co/onnxmodelzoo/ssd_mobilenet_v1_12-int8/resolve/929618539097dbeb779c13aed75dfe346d016d48/ssd_mobilenet_v1_12-int8.onnx',provenance:'onnxmodelzoo/ssd_mobilenet_v1_12-int8 @ 929618539097dbeb779c13aed75dfe346d016d48'})])
    }),
    ssd2016:Object.freeze({
      id:'ssd-resnet34-12-int8',title:'SSD · ResNet-34 INT8',year:2016,status:'runnable',family:'SSD · Single Shot MultiBox Detector',task:'object-detection',license:'Apache-2.0 repository; checkpoint lineage described in MODEL_SOURCES.md',bytes:20485276,sha256:'56d2c03a8c74c03f704509ccfcd91763991c6e1b92f63da730fb2b3d07565453',input:1200,
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:false,race:false,inspection:Object.freeze({mode:'preprocessing-only',stages:Object.freeze(['preprocessing']),input:'1200×1200',resize:'direct stretch',tensor:'float32 · NCHW',channels:'RGB',normalization:'ImageNet mean/std after 1/255',preview:Object.freeze({mode:'stretch',width:640,height:640,caption:'SSD 2016 direct-stretch preview'}),shape:Object.freeze({layout:'NCHW',channels:3}),pipeline:Object.freeze({step2:Object.freeze({title:'Direct resize',text:'The source is stretched to 1200×1200, matching the pinned export input.'}),step3:Object.freeze({title:'Normalized RGB tensor',text:'RGB pixels are packed as float32 NCHW and normalized with ImageNet mean and standard deviation.'}),step4:Object.freeze({title:'SSD detections',text:'The pinned ResNet-34 INT8 export returns COCO boxes, labels and scores.'})}),comparison:Object.freeze({label:'SSD · ResNet-34',input:'1200×1200',resize:'direct stretch',padding:'none',layout:'NCHW',dtype:'float32',channels:'RGB · ImageNet normalization'}),intermediate:Object.freeze({title:'SSD intermediate tensors not exported',subtitle:'This graph exposes detections rather than selected backbone activations.',note:'No intermediate feature maps are fabricated.',data:'none',status:'Intermediate activations not exposed'}),resultNote:'Upstream graph returns postprocessed detections; no page-side NMS is added.'})}),
      executionProviders:Object.freeze(['wasm']),preprocessing:Object.freeze({resize:'direct stretch to 1200×1200',layout:'NCHW',dtype:'float32',channels:'RGB',rescale:'1/255 then ImageNet mean/std',padding:'none'}),decoder:'Pinned ONNX outputs: normalized xyxy boxes, one-based COCO labels, scores',
      ui:Object.freeze({subtitle:'SSD 2016 design · ResNet-34 INT8 · COCO reference checkpoint',provenance:'Represents the 2016 SSD architecture with a later ONNX Model Zoo ResNet-34 INT8 checkpoint trained on COCO 2017. It is not the original paper checkpoint; see the pinned source and license notes.',runtime:Object.freeze({initLabel:'Session init',bytesText:'20.5 MB · INT8 weights',cacheInitial:'checking pinned model'}),links:Object.freeze([Object.freeze({label:'SSD paper ↗',url:'https://arxiv.org/abs/1512.02325'}),Object.freeze({label:'Pinned ONNX checkpoint ↗',url:'https://huggingface.co/onnxmodelzoo/ssd-12-int8/tree/bf6cc24948f7cf6c50127798c33d900813678b4e'}),Object.freeze({label:'License/provenance ↗',url:'MODEL_SOURCES.md#ssd-2016-reference'})])}),
      sources:Object.freeze([Object.freeze({label:'HF pinned · SSD-12 INT8',url:'https://huggingface.co/onnxmodelzoo/ssd-12-int8/resolve/bf6cc24948f7cf6c50127798c33d900813678b4e/ssd-12-int8.onnx',provenance:'onnxmodelzoo/ssd-12-int8 @ bf6cc24948f7cf6c50127798c33d900813678b4e'})])
    }),
    detr:Object.freeze({
      id:'detr-resnet50-xenova-q8',title:'DETR · ResNet-50',year:2020,status:'runnable',family:'DETR · Transformer set prediction',task:'object-detection',license:'Apache-2.0 base model; conversion license not independently declared',modelId:'Xenova/detr-resnet-50',baseModel:'facebook/detr-resnet-50',revision:'8be7ab59ff663484ee9ba2e8d8f267330d5ad03e',input:640,
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:false,race:false,inspection:Object.freeze({mode:'processor-contract-only',stages:Object.freeze(['preprocessing']),input:'source staging ≤640; processor-managed',resize:'aspect-preserving stage; Transformers.js processor resize',tensor:'float32 · NCHW',channels:'RGB',normalization:'processor-managed',preview:Object.freeze({mode:'aspect-max',maxSide:640,caption:'DETR staged image · processor resizes internally'}),shape:Object.freeze({layout:'NCHW',channels:3}),pipeline:Object.freeze({step2:Object.freeze({title:'Stage image',text:'The source is aspect-preservingly staged at up to 640 px; the Transformers.js processor performs model-specific resizing.'}),step3:Object.freeze({title:'Processor tensor',text:'Transformers.js handles RGB conversion, normalization and tensor layout.'}),step4:Object.freeze({title:'DETR set prediction',text:'ResNet-50 encoder-decoder predicts scored object sets; the pipeline performs postprocessing.'})}),comparison:Object.freeze({label:'DETR · ResNet-50',input:'processor-managed',resize:'processor-managed',padding:'processor-managed',layout:'NCHW',dtype:'float32',channels:'RGB'}),intermediate:Object.freeze({title:'DETR intermediate tensors not exposed',subtitle:'The production pipeline exposes final detections only.',note:'Encoder/decoder activations are not available from this pipeline.',data:'none',status:'Intermediate activations not exposed'}),resultNote:'Transformers.js performs DETR postprocessing; no page-side NMS is added.'})}),
      preprocessing:Object.freeze({resize:'processor-managed after max-640 staging',layout:'NCHW',dtype:'float32 input / q8 weights',channels:'RGB',padding:'processor-managed'}),runtime:Object.freeze({wasm:Object.freeze({device:'wasm',dtype:'q8',modelBytes:43102531})}),decoder:'Transformers.js DETR object-detection pipeline',
      ui:Object.freeze({subtitle:'DETR 2020 · ResNet-50 · COCO · Transformers.js',provenance:'Pinned Xenova Transformers.js conversion of facebook/detr-resnet-50, whose base checkpoint is Apache-2.0. The conversion repository does not independently state a license. This is a later COCO 2017 reference checkpoint, not the exact paper weights.',runtime:Object.freeze({initLabel:'Pipeline load',bytesText:'43.1 MB q8',cacheInitial:'managed by pipeline',managedTransferWhenMissing:true,inferenceBoundaryNote:'Inference includes Transformers.js processor, model and postprocessor work.'}),links:Object.freeze([Object.freeze({label:'DETR paper ↗',url:'https://arxiv.org/abs/2005.12872'}),Object.freeze({label:'Pinned Transformers.js model ↗',url:'https://huggingface.co/Xenova/detr-resnet-50/tree/8be7ab59ff663484ee9ba2e8d8f267330d5ad03e'}),Object.freeze({label:'Base model ↗',url:'https://huggingface.co/facebook/detr-resnet-50'}),Object.freeze({label:'License/provenance ↗',url:'MODEL_SOURCES.md#detr-2020-reference'})])})
    }),
    yolox:Object.freeze({
      id:'yolox-nano-0.1.1rc0',title:'YOLOX-Nano',year:2021,status:'runnable',family:'YOLOX Nano',task:'object-detection',license:'Apache-2.0',bytes:3659407,input:416,nms:0.45,
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:Object.freeze({enabled:true,order:30,summary:'Sequential inference · no frame queue'}),race:Object.freeze({
        enabled:true,group:'general-object',order:30,prefix:'yolo',workCanvasId:'race-yolo-work',timingBoundary:'ort-session',
        badge:'2021 anchor-free',badgeClass:'generation',cardClass:'',emptyText:'Official Apache-2.0 project release · ONNX 3.49 MB.',progress:true,progressText:'Model not loaded.',
        architecture:'anchor-free head · decoupled classification/regression · modern real-time CNN detector',
        metrics:Object.freeze([
          Object.freeze({label:'Input',value:'416×416'}),Object.freeze({label:'Model file',value:'3.49 MB'}),Object.freeze({label:'Asset source',slot:'source',initial:'—'}),
          Object.freeze({label:'Cache',slot:'cache',initial:'checking…'}),Object.freeze({label:'Transfer / init',slot:'startup',initial:'—'}),Object.freeze({label:'Inference',slot:'inf',initial:'—'}),
          Object.freeze({label:'End-to-end',slot:'total',initial:'—'}),Object.freeze({label:'Detections',slot:'count',initial:'—'})
        ])
      }),inspection:Object.freeze({
        mode:'head-objectness',stages:Object.freeze(['preprocessing','stride-8-objectness','stride-16-objectness','stride-32-objectness']),
        input:'416×416',resize:'aspect preserve · top-left letterbox',tensor:'float32 · NCHW',channels:'BGR',normalization:'none · 0–255',
        preview:Object.freeze({mode:'letterbox-top-left',width:416,height:416,fill:114,caption:'YOLOX 416×416 letterbox preview'}),
        shape:Object.freeze({layout:'NCHW',channels:3}),
        pipeline:Object.freeze({
          step2:Object.freeze({title:'Letterbox resize',text:'Aspect-preserving resize into 416×416 with top-left placement and fill value 114.'}),
          step3:Object.freeze({title:'BGR tensor',text:'Pixels become float32 NCHW in BGR channel order.'}),
          step4:Object.freeze({title:'YOLOX detection head',text:'Anchor-free decoupled head predicts boxes, objectness and classes across three strides.'})
        }),
        comparison:Object.freeze({label:'YOLOX-Nano',input:'416×416',resize:'aspect preserve',padding:'top-left · 114',layout:'NCHW',dtype:'float32',channels:'BGR'}),
        intermediate:Object.freeze({title:'Real YOLOX detection-head maps',subtitle:'Pre-NMS objectness tensors from the latest YOLOX inference.',note:'These are real exported detection-head objectness values at strides 8/16/32. They are not backbone feature maps.',data:'adapter',renderer:'scalar-heatmaps',statusEmpty:'Run YOLOX to populate real objectness tensors.',statusReady:'Live from latest YOLOX inference'}),
        resultNote:'UI threshold changes redraw retained outputs without new inference.'
      })}),
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
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:Object.freeze({enabled:true,order:40,summary:'Sequential inference · no frame queue'}),race:Object.freeze({
        enabled:true,group:'general-object',order:40,prefix:'rt',workCanvasId:'race-rt-work',timingBoundary:'transformers-pipeline',
        badge:'2023 transformer',badgeClass:'transformer-pill',cardClass:'transformer-model',emptyText:'Hugging Face ONNX Community · Transformers.js-ready conversion of Apache-2.0 PekingU RT-DETR R18.',progress:true,progressText:'Transformers.js model not loaded.',
        architecture:'end-to-end set prediction · transformer detector · no page-side NMS',
        metrics:Object.freeze([
          Object.freeze({label:'Input',value:'640×640 processor'}),Object.freeze({label:'Parameters',value:'20.2M'}),Object.freeze({label:'Runtime asset',slot:'asset',initial:'fp16/q8'}),
          Object.freeze({label:'Cache',slot:'cache',initial:'checking…'}),Object.freeze({label:'Load',slot:'load',initial:'—'}),Object.freeze({label:'Pipeline',slot:'inf',initial:'—'}),
          Object.freeze({label:'End-to-end',slot:'total',initial:'—'}),Object.freeze({label:'Detections',slot:'count',initial:'—'}),Object.freeze({label:'Retained outputs',slot:'retained',initial:'—'}),
          Object.freeze({label:'Invalid boxes dropped',slot:'invalid',initial:'—'})
        ])
      }),inspection:Object.freeze({
        mode:'processor-contract-only',stages:Object.freeze(['preprocessing']),
        input:'640×640',resize:'processor resize · no pad',tensor:'float32 · NCHW',channels:'RGB',normalization:'rescale 1/255',
        preview:Object.freeze({mode:'stretch',width:640,height:640,caption:'Processor-equivalent 640×640 preview'}),
        shape:Object.freeze({layout:'NCHW',channels:3}),
        pipeline:Object.freeze({
          step2:Object.freeze({title:'Processor resize',text:'Transformers.js resizes the source to 640×640 without page-side padding.'}),
          step3:Object.freeze({title:'Processor tensor',text:'RGB pixels are rescaled by 1/255 and arranged as float NCHW input.'}),
          step4:Object.freeze({title:'RT-DETR',text:'End-to-end transformer set prediction returns scored boxes without page-side NMS.'})
        }),
        comparison:Object.freeze({label:'RT-DETR R18',input:'640×640',resize:'processor resize',padding:'none',layout:'NCHW',dtype:'float input',channels:'RGB · 1/255'}),
        intermediate:Object.freeze({title:'RT-DETR intermediate tensors not exposed',subtitle:'The production pipeline exposes detections but not selected encoder/decoder activations.',note:'A separate inspectable ONNX export is required for truthful RT-DETR intermediate activation visualization.',data:'none',status:'Intermediate activations not exposed'}),
        resultNote:'No page-side NMS is added.'
      })}),
      preprocessing:Object.freeze({resize:'640×640 processor-managed',layout:'NCHW',dtype:'float32 input / quantized weights',channels:'RGB',rescale:'1/255',normalize:false,padding:'none'}),
      runtime:Object.freeze({webgpu:Object.freeze({device:'webgpu',dtype:'fp16',modelBytes:41400000}),wasm:Object.freeze({device:'wasm',dtype:'q8',modelBytes:21713196})}),
      decoder:'Transformers.js RT-DETR postprocessor',
      ui:Object.freeze({runtime:Object.freeze({initLabel:'Pipeline load',bytesText:'~21.7 MB q8 / 41.4 MB fp16',cacheInitial:'checked at load',managedTransferWhenMissing:true,inferenceBoundaryNote:'RT-DETR inference is the Transformers.js pipeline call, including processor/model/postprocessor work.',benchmarkBoundary:'p50, p90, min–max and run-to-run timing variation from 20 warm Transformers.js pipeline calls; pipeline/model load excluded.'}),subtitle:'COCO object detection · Transformers.js · DETR',provenance:'PekingU RT-DETR R18 base model with the pinned Hugging Face ONNX Community conversion. The browser keeps the exact conversion revision and uses Transformers.js v4 native WebGPU runtime with WASM q8 fallback.',links:Object.freeze([Object.freeze({label:'Base model ↗',url:'https://huggingface.co/PekingU/rtdetr_r18vd'}),Object.freeze({label:'Pinned conversion ↗',url:'https://huggingface.co/onnx-community/rtdetr_r18vd/tree/ec641af14c7cc8f93cd641a1458f498abbbbb533'}),Object.freeze({label:'Official repo ↗',url:'https://github.com/lyuwenyu/RT-DETR'}),Object.freeze({label:'License/provenance ↗',url:'MODEL_SOURCES.md#rt-detr-r18'})])}),
      source:'https://huggingface.co/onnx-community/rtdetr_r18vd'
    }),
    rtdetrv2:Object.freeze({
      id:'rtdetrv2-r18vd-transformersjs',title:'RT-DETRv2 R18',year:2024,status:'runnable',family:'RT-DETRv2',task:'object-detection',license:'Apache-2.0',
      modelId:'onnx-community/rtdetr_v2_r18vd-ONNX',baseModel:'PekingU/rtdetr_v2_r18vd',revision:'936f90b6a476c6da4dfe053fc521af55285976ba',parameters:'20M',input:640,
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:Object.freeze({enabled:true,order:50,summary:'Sequential inference · no frame queue'}),race:Object.freeze({
        enabled:true,group:'general-object',order:50,prefix:'rtv2',workCanvasId:'race-rtv2-work',timingBoundary:'transformers-pipeline',
        badge:'2024 research preview',badgeClass:'transformer-pill',cardClass:'transformer-model',emptyText:'Pinned ONNX Community conversion · RT-DETRv2 R18 · COCO.',progress:true,progressText:'Transformers.js model not loaded.',
        architecture:'end-to-end set prediction · improved DETR training · no page-side NMS',
        metrics:Object.freeze([
          Object.freeze({label:'Input',value:'640×640 processor'}),Object.freeze({label:'Parameters',value:'~20M'}),Object.freeze({label:'Runtime asset',slot:'asset',initial:'fp16/int8'}),
          Object.freeze({label:'Cache',slot:'cache',initial:'checking…'}),Object.freeze({label:'Load',slot:'load',initial:'—'}),Object.freeze({label:'Pipeline',slot:'inf',initial:'—'}),
          Object.freeze({label:'End-to-end',slot:'total',initial:'—'}),Object.freeze({label:'Detections',slot:'count',initial:'—'}),Object.freeze({label:'Retained outputs',slot:'retained',initial:'—'})
        ])
      }),inspection:Object.freeze({
        mode:'processor-contract-only',stages:Object.freeze(['preprocessing']),
        input:'640×640',resize:'processor resize · no pad',tensor:'float32 · NCHW',channels:'RGB',normalization:'rescale 1/255 · no mean/std normalization',
        preview:Object.freeze({mode:'stretch',width:640,height:640,caption:'Processor-equivalent 640×640 preview'}),shape:Object.freeze({layout:'NCHW',channels:3}),
        pipeline:Object.freeze({
          step2:Object.freeze({title:'Processor resize',text:'Transformers.js resizes the source to 640×640 without page-side padding.'}),
          step3:Object.freeze({title:'Processor tensor',text:'RGB pixels are rescaled by 1/255 and arranged as float NCHW input, without mean/std normalization.'}),
          step4:Object.freeze({title:'RT-DETRv2',text:'The end-to-end transformer predicts scored boxes; page-side NMS is not added.'})
        }),
        comparison:Object.freeze({label:'RT-DETRv2 R18',input:'640×640',resize:'processor resize',padding:'none',layout:'NCHW',dtype:'float input',channels:'RGB · 1/255'}),
        intermediate:Object.freeze({title:'RT-DETRv2 intermediate tensors not exposed',subtitle:'The production pipeline exposes detections but not selected encoder/decoder activations.',note:'Intermediate activations are not fabricated; an inspectable ONNX export is required to expose them.',data:'none',status:'Intermediate activations not exposed'}),
        resultNote:'No page-side NMS is added.'
      })}),
      preprocessing:Object.freeze({resize:'640×640 processor-managed',layout:'NCHW',dtype:'float32 input / quantized weights',channels:'RGB',rescale:'1/255',normalize:false,padding:'none'}),
      runtime:Object.freeze({webgpu:Object.freeze({device:'webgpu',dtype:'fp16',modelBytes:40750249}),wasm:Object.freeze({device:'wasm',dtype:'q8',modelBytes:20991219})}),
      decoder:'Transformers.js RT-DETRv2 postprocessor',
      ui:Object.freeze({runtime:Object.freeze({initLabel:'Pipeline load',bytesText:'~21.0 MB int8 / 40.8 MB fp16',cacheInitial:'checked at load',managedTransferWhenMissing:true,inferenceBoundaryNote:'Inference is the Transformers.js processor/model/postprocessor call.',benchmarkBoundary:'p50, p90, min–max and run-to-run timing variation from 20 warm Transformers.js pipeline calls; pipeline/model load excluded.'}),subtitle:'COCO object detection · Transformers.js · RT-DETRv2',provenance:'PekingU RT-DETRv2 R18 COCO checkpoint with the pinned Hugging Face ONNX Community conversion. User-reported iOS/WebKit test confirms one WebGPU fp16 inference run; repeat-run benchmark and broader device/sample validation are pending.',links:Object.freeze([Object.freeze({label:'Base model ↗',url:'https://huggingface.co/PekingU/rtdetr_v2_r18vd'}),Object.freeze({label:'Pinned ONNX conversion ↗',url:'https://huggingface.co/onnx-community/rtdetr_v2_r18vd-ONNX/tree/936f90b6a476c6da4dfe053fc521af55285976ba'}),Object.freeze({label:'Official implementation ↗',url:'https://github.com/lyuwenyu/RT-DETR'}),Object.freeze({label:'License/provenance ↗',url:'MODEL_SOURCES.md#rt-detrv2-r18'})])}),
      source:'https://huggingface.co/onnx-community/rtdetr_v2_r18vd-ONNX'
    })
  });
})();
