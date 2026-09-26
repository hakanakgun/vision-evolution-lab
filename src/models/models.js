(() => {
  'use strict';
  const coco80=Object.freeze(['person','bicycle','car','motorcycle','airplane','bus','train','truck','boat','traffic light','fire hydrant','stop sign','parking meter','bench','bird','cat','dog','horse','sheep','cow','elephant','bear','zebra','giraffe','backpack','umbrella','handbag','tie','suitcase','frisbee','skis','snowboard','sports ball','kite','baseball bat','baseball glove','skateboard','surfboard','tennis racket','bottle','wine glass','cup','fork','knife','spoon','bowl','banana','apple','sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake','chair','couch','potted plant','bed','dining table','toilet','tv','laptop','mouse','remote','keyboard','cell phone','microwave','oven','toaster','sink','refrigerator','book','clock','vase','scissors','teddy bear','hair drier','toothbrush']);
  const voc20=Object.freeze(['aeroplane','bicycle','bird','boat','bottle','bus','car','cat','chair','cow','diningtable','dog','horse','motorbike','person','pottedplant','sheep','sofa','train','tvmonitor']);
  const vocCanonical=Object.freeze(['airplane','bicycle','bird','boat','bottle','bus','car','cat','chair','cow','dining table','dog','horse','motorcycle','person','potted plant','sheep','couch','train','tv']);
  const runtimeBootstrap=window.VisionRuntimeBootstrap||Object.freeze({ortVersion:'1.30.0',ortMode:'jsep',ortEntrypoint:'ort.webgpu.min.js',isIOS:false,reason:'legacy fallback'});
  const directOrtWebGPU=runtimeBootstrap.ortMode==='jsep';
  window.VisionModels=Object.freeze({
    version:'0.18.0',
    runtime:Object.freeze({ort:'1.30.0',directOrtMode:runtimeBootstrap.ortMode,directOrtEntrypoint:runtimeBootstrap.ortEntrypoint,directOrtReason:runtimeBootstrap.reason,transformersJs:'4.3.0',transformersJsUrl:'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0'}),
    labels:Object.freeze({coco80,voc20,vocCanonical}),
    defaults:Object.freeze({timeMachine:'yolox',live:'yolox'}),
    timeline:Object.freeze([
      Object.freeze({year:1980,title:'Neocognitron',note:'run · early pattern-response demo',kind:'history-experiment',experiment:'neocognitron',evolution:'Hierarchical local receptive fields and pooling introduced a shift-tolerant pattern-recognition idea before modern supervised CNN object detectors.'}),
      Object.freeze({year:1998,title:'LeNet-era MNIST CNN',note:'run · handwritten digits only',kind:'history-experiment',experiment:'mnist-digits',evolution:'Learned convolutional features replaced hand-written image rules for a narrow recognition task: isolated handwritten digits.'}),
      Object.freeze({year:2001,title:'Viola–Jones',note:'run · frontal-face cascade',kind:'history-experiment',experiment:'viola-jones',evolution:'Hand-designed Haar-like features, an AdaBoost-selected cascade and fast rejection made real-time frontal-face detection practical, but the detector remains task-specific.'}),
      Object.freeze({year:2005,title:'HOG + SVM',note:'run · pedestrian detector',kind:'history-experiment',experiment:'hog-pedestrians',evolution:'Local gradient-orientation histograms describe human shape more robustly than raw pixels, while a linear SVM and sliding window still target one hand-engineered task.'}),
      Object.freeze({year:2012,title:'AlexNet',note:'run · ImageNet top-5 classification',kind:'history-experiment',experiment:'alexnet-classification',evolution:'Deep learned visual representations scaled to large-category image classification; this milestone recognizes whole images rather than localizing objects.'}),
      Object.freeze({year:2014,title:'R-CNN',note:'history only · region proposals + CNN',kind:'historical'}),
      Object.freeze({year:2015,model:'fasterrcnn',title:'Faster R-CNN',note:'run · two-stage RPN · WASM INT8',kind:'runnable',evolution:'Region proposals became learned: a Region Proposal Network shares convolutional features with a second-stage RoI classifier/regressor instead of relying on an external proposal algorithm.'}),
      Object.freeze({year:2016,model:'yolov1',title:'YOLOv1',note:'run · VOC20 · large 516 MB download',kind:'runnable',evolution:'Object detection becomes a single neural-network regression problem: one 448×448 pass predicts a 7×7 grid of boxes and Pascal VOC classes without a separate proposal stage.'}),
      Object.freeze({year:2016,model:'ssd2016',title:'SSD · ResNet-34 INT8',note:'reference checkpoint · COCO · WASM',kind:'runnable',evolution:'Single-shot dense prediction removes a separate proposal stage and predicts classes and boxes across multiple feature scales.'}),
      Object.freeze({year:2016,model:'tinyyolo',title:'Tiny YOLOv2',note:'tap to run · VOC20',kind:'runnable',evolution:'A compact one-stage grid-and-anchor detector predicts boxes, objectness and classes in one network pass, trading some accuracy for real-time efficiency.'}),
      Object.freeze({year:2017,model:'ssd',title:'SSD + MobileNet',note:'tap to run',kind:'runnable',evolution:'MobileNet makes single-shot object detection practical on constrained devices by pairing lightweight depthwise-separable CNN features with SSD heads.'}),
      Object.freeze({year:2020,month:5,model:'detr',title:'DETR · ResNet-50',note:'reference checkpoint · COCO · WASM q8',kind:'runnable',className:'transformer',evolution:'Detection becomes direct set prediction: learned object queries and bipartite matching replace anchor design and the traditional page-side NMS pipeline.'}),
      Object.freeze({year:2021,month:6,model:'yolos',title:'YOLOS-tiny',note:'run · pure ViT detector · WASM q4',kind:'runnable',className:'transformer',evolution:'A plain Vision Transformer is used as the detector itself: image patches and detection tokens share one transformer sequence instead of relying on a CNN backbone.'}),
      Object.freeze({year:2021,month:7,model:'yolox',title:'YOLOX-Nano',note:'tap to run',kind:'runnable',evolution:'Modern one-stage YOLO becomes anchor-free and separates classification from box regression in a decoupled head, retaining a compact real-time CNN path.'}),
      Object.freeze({year:2023,month:4,model:'rtdetr',title:'RT-DETR R18',note:'tap to run',kind:'runnable',className:'transformer',evolution:'Query-based end-to-end DETR detection is redesigned for real-time use, keeping set prediction while reducing the latency gap to one-stage detectors.'}),
      Object.freeze({year:2024,month:6,model:'lwdetr',title:'LW-DETR-tiny',note:'run · Time Machine · WASM fp32',kind:'runnable',className:'transformer',evolution:'A lightweight DETR design reduces encoder/decoder cost while retaining query-based end-to-end predictions for smaller deployment targets.'}),
      Object.freeze({year:2024,month:7,model:'rtdetrv2',title:'RT-DETRv2 R18',note:'research preview · tap to run',kind:'runnable',className:'transformer',evolution:'RT-DETRv2 refines the real-time DETR training and deployment recipe while preserving end-to-end query-based detection without page-side NMS.'}),
      Object.freeze({year:2024,month:10,model:'dfine',title:'D-FINE-N',note:'tap to run · Time Machine',kind:'runnable',className:'transformer',evolution:'A compact modern end-to-end detector focuses on finer box-regression modeling while keeping a deployment-oriented transformer detection pipeline.'})
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
    yolov1:Object.freeze({
      id:'yolov1-voc20-int8-browser',title:'YOLOv1',year:2016,status:'runnable',family:'YOLOv1 · original full Darknet architecture',task:'object-detection',
      license:'Darknet architecture/weights public domain; LibreYOLO conversion tooling MIT; see docs/MODEL_SOURCES.md',bytes:541358513,sha256:'122bf7462747d0cf140525ed6c1d90424d64cc10b8d96cf17905343ce0306d49',input:448,nms:0.45,
      sourceCheckpoint:Object.freeze({repository:'LibreYOLO/LibreYOLO1b',revision:'4349c7a823974cea5d29c5f306a99bcf441ef437',file:'LibreYOLO1b.pt',bytes:777058063,sha256:'90a9ec72a3961fae7860c54eca5ae000e1d85b3659628cf3fb8b2e2a770d5575'}),
      converter:Object.freeze({repository:'LibreYOLO/libreyolo',revision:'c25f6dffb521ea60bc0f63ae3dffb168a7edc466'}),
      downloadPolicy:Object.freeze({enabled:true,warningBytes:100*1048576,reason:'Large historical full-network checkpoint'}),
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:false,race:false,inspection:Object.freeze({
        mode:'decoded-output-contract',stages:Object.freeze(['preprocessing','decoded-output']),
        input:'448×448',resize:'direct stretch',tensor:'float32 · NCHW',channels:'RGB',normalization:'divide by 255',
        preview:Object.freeze({mode:'stretch',width:448,height:448,caption:'YOLOv1 448×448 direct-stretch preview'}),
        shape:Object.freeze({layout:'NCHW',channels:3}),
        pipeline:Object.freeze({
          step2:Object.freeze({title:'Direct 448×448 stretch',text:'The full image is stretched to the fixed square input used by YOLOv1’s fully-connected head; it is not letterboxed.'}),
          step3:Object.freeze({title:'RGB / 255 tensor',text:'Canvas RGB values are normalized to 0–1 and packed as float32 NCHW.'}),
          step4:Object.freeze({title:'7×7 single-pass detector',text:'The exported graph decodes the original two-box-per-cell YOLOv1 head into 98 xyxy box candidates plus 20 Pascal VOC class scores; the page applies class-aware NMS.'})
        }),
        comparison:Object.freeze({label:'YOLOv1',input:'448×448',resize:'direct stretch',padding:'none',layout:'NCHW',dtype:'float32 input · INT8 weights',channels:'RGB · /255'}),
        intermediate:Object.freeze({title:'YOLOv1 internal grid activations are not exported',subtitle:'The browser graph exposes 98 decoded box candidates and VOC class scores, not the original dense 7×7×30 head tensor.',note:'No synthetic feature maps or grid activations are shown.',data:'none',status:'Real decoded detections exposed · internal activations not exposed'}),
        resultNote:'The graph emits decoded 448-input-pixel xyxy boxes and VOC scores. The page retains candidates to the UI slider floor and applies class-aware NMS at IoU 0.45.'
      })}),
      executionProviders:Object.freeze(['wasm']),
      providerNote:'WASM is the initial compatibility policy. The 516 MB INT8 model is intentionally Time Machine-only; physical iPhone/WebKit memory and sustained inference have not been validated.',
      preprocessing:Object.freeze({resize:'direct stretch to 448×448',layout:'NCHW',dtype:'float32 input / dynamic INT8 weights',channels:'RGB',normalization:'divide by 255',padding:'none'}),
      decoder:'98 decoded xyxy candidates · Pascal VOC 20 scores · class-aware NMS IoU 0.45',
      ui:Object.freeze({subtitle:'Pascal VOC 20-class detection · original YOLOv1 architecture · ONNX/WASM',provenance:'Derived browser export of the full original YOLOv1 architecture. A pinned LibreYOLO checkpoint is exported at a pinned converter revision, dynamically INT8-quantized, checked on the canonical dog/bicycle/car image, and opened with ONNX Runtime Web WASM in the same publication workflow. The exact published asset is pinned by byte size and SHA-256.',runtime:Object.freeze({initLabel:'Session init',bytesText:'516.3 MB · INT8 weights · large download',cacheInitial:'checking large model cache',benchmarkBoundary:'20 warm ONNX Runtime Web/WASM runs after the one-time model transfer and session initialization.'}),links:Object.freeze([Object.freeze({label:'YOLOv1 paper ↗',url:'https://arxiv.org/abs/1506.02640'}),Object.freeze({label:'Pinned source checkpoint ↗',url:'https://huggingface.co/LibreYOLO/LibreYOLO1b/tree/4349c7a823974cea5d29c5f306a99bcf441ef437'}),Object.freeze({label:'Converter source ↗',url:'https://github.com/LibreYOLO/libreyolo/tree/c25f6dffb521ea60bc0f63ae3dffb168a7edc466'}),Object.freeze({label:'License/provenance ↗',url:'docs/MODEL_SOURCES.md#yolov1'})])}),
      sources:Object.freeze([Object.freeze({label:'GitHub Pages · verified YOLOv1 INT8 chunks',provenance:'Same-origin chunks reconstructed from GitHub Release yolov1-browser-int8-122bf7462747 · final SHA-256 122bf7462747d0cf140525ed6c1d90424d64cc10b8d96cf17905343ce0306d49',parts:Object.freeze([
        Object.freeze({url:'assets/models/yolov1/part-00.bin',bytes:95000000}),
        Object.freeze({url:'assets/models/yolov1/part-01.bin',bytes:95000000}),
        Object.freeze({url:'assets/models/yolov1/part-02.bin',bytes:95000000}),
        Object.freeze({url:'assets/models/yolov1/part-03.bin',bytes:95000000}),
        Object.freeze({url:'assets/models/yolov1/part-04.bin',bytes:95000000}),
        Object.freeze({url:'assets/models/yolov1/part-05.bin',bytes:66358513})
      ])})])
    }),
    tinyyolo:Object.freeze({
      id:'tiny-yolov2-voc-opset8',title:'Tiny YOLOv2',year:2016,status:'runnable',family:'Tiny YOLOv2',task:'object-detection',
      license:'upstream metadata Apache-2.0; model-card body MIT; see docs/MODEL_SOURCES.md',bytes:66584576,sha256:'583fb7fdc948435ceac9fa82efc7708701efe8382a859a3dd46526b155f5f2ae',input:416,nms:0.40,
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
      ui:Object.freeze({subtitle:'Pascal VOC 20-class detection · ONNX · opset 8',provenance:'Pinned ONNX Model Zoo Tiny YOLOv2 export, migrated to Hugging Face. The checkpoint descends from a Core ML conversion of the original Darknet/Keras network; model-card license presentation is internally inconsistent and documented separately.',links:Object.freeze([Object.freeze({label:'YOLO9000 paper ↗',url:'https://arxiv.org/abs/1612.08242'}),Object.freeze({label:'Pinned model ↗',url:'https://huggingface.co/onnxmodelzoo/tinyyolov2-8/tree/869707e16e57006f97d98af54cfdc8a1d388ae61'}),Object.freeze({label:'License/provenance ↗',url:'docs/MODEL_SOURCES.md#tiny-yolov2'})])}),
      sources:Object.freeze([Object.freeze({label:'HF ONNX Model Zoo pinned',url:'https://huggingface.co/onnxmodelzoo/tinyyolov2-8/resolve/869707e16e57006f97d98af54cfdc8a1d388ae61/tinyyolov2-8.onnx?download=true',provenance:'onnxmodelzoo/tinyyolov2-8 @ 869707e16e57006f97d98af54cfdc8a1d388ae61'})])
    }),
    ssd:Object.freeze({
      id:'ssd-mobilenet-v1-12-int8',title:'SSD-MobileNetV1 INT8',year:2017,status:'runnable',family:'SSD + MobileNetV1',task:'object-detection',
      license:'permissive upstream; see docs/MODEL_SOURCES.md',bytes:9542048,sha256:'2b79e6a7fb1ec6a33f332b9b10d82d9de4b7b49dcd26b5946921bb356895c954',maxSide:640,
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
      ui:Object.freeze({subtitle:'COCO object detection · ONNX · opset 12',provenance:'Pinned ONNX Model Zoo INT8 export trained on MS COCO 2017. Upstream model-card mAP: 0.2297.',links:Object.freeze([Object.freeze({label:'SSD paper ↗',url:'https://arxiv.org/abs/1512.02325'}),Object.freeze({label:'MobileNet paper ↗',url:'https://arxiv.org/abs/1704.04861'}),Object.freeze({label:'Model source ↗',url:'https://huggingface.co/onnxmodelzoo/ssd_mobilenet_v1_12-int8/tree/929618539097dbeb779c13aed75dfe346d016d48'}),Object.freeze({label:'License/provenance ↗',url:'docs/MODEL_SOURCES.md#ssd-mobilenetv1-12-int8'})])}),
      sources:Object.freeze([Object.freeze({label:'HF pinned',url:'https://huggingface.co/onnxmodelzoo/ssd_mobilenet_v1_12-int8/resolve/929618539097dbeb779c13aed75dfe346d016d48/ssd_mobilenet_v1_12-int8.onnx',provenance:'onnxmodelzoo/ssd_mobilenet_v1_12-int8 @ 929618539097dbeb779c13aed75dfe346d016d48'})])
    }),
    fasterrcnn:Object.freeze({
      id:'fasterrcnn-r50-fpn-12-int8',title:'Faster R-CNN · ResNet-50 FPN INT8',year:2015,status:'runnable',family:'Faster R-CNN · two-stage region proposal network',task:'object-detection',
      license:'HF metadata Apache-2.0; model-card body MIT; upstream maskrcnn-benchmark MIT; see docs/MODEL_SOURCES.md',bytes:44631113,sha256:'95f67f5f6249f4804f1302367dd88cee32bf47713b9858cc6d8ba835548f9b8e',revision:'c4c979ff5c8043967de03c97daef7b54663182eb',
      capabilities:Object.freeze({timeMachine:true,benchmark:false,live:false,race:false,inspection:Object.freeze({
        mode:'two-stage-output-contract',stages:Object.freeze(['preprocessing','rpn-internal','final-detections']),
        input:'short edge 800 · long edge ≤1333 · pad to ×32',resize:'aspect preserve · short 800 / long ≤1333',tensor:'float32 · CHW',channels:'BGR',normalization:'subtract [102.9801,115.9465,122.7717]',
        preview:Object.freeze({mode:'short-long-pad32',shortSide:800,longSide:1333,multiple:32,caption:'Faster R-CNN resized + zero-padded input preview'}),
        shape:Object.freeze({layout:'NCHW',channels:3}),
        pipeline:Object.freeze({
          step2:Object.freeze({title:'Resize + pad',text:'The source is resized toward an 800 px short edge, capped at 1333 px on the long edge, then zero-padded to multiples of 32.'}),
          step3:Object.freeze({title:'Shared features + RPN',text:'BGR pixels are mean-subtracted. Inside the model, the Region Proposal Network proposes candidate regions from shared backbone/FPN features.'}),
          step4:Object.freeze({title:'RoI heads → final detections',text:'Second-stage RoI heads classify and refine proposals. This pinned ONNX export exposes final boxes, labels and scores; it does not expose proposal coordinates.'})
        }),
        comparison:Object.freeze({label:'Faster R-CNN',input:'dynamic · 800/1333',resize:'aspect preserve',padding:'bottom/right · ×32',layout:'CHW',dtype:'float32 input · INT8 weights',channels:'BGR · mean subtraction'}),
        intermediate:Object.freeze({title:'RPN proposals are internal to this export',subtitle:'The two-stage architecture uses learned proposals, but the pinned browser graph exports only final boxes, labels and scores.',note:'Proposal coordinates or RoI feature tensors are not fabricated. An inspectable export with those outputs is required to visualize them.',emptyText:'Real final detections are available after a run; RPN proposal tensors are not exported by this checkpoint.',data:'none',status:'Final detections exposed · RPN proposals not exported'}),
        resultNote:'The runtime summary above reports the actual final detections returned by the pinned graph; no synthetic proposals are shown.'
      })}),
      executionProviders:Object.freeze(['wasm']),
      providerNote:'WASM is intentional for operator coverage. The upstream dynamic-shape export has a known portability issue; this adapter follows the documented 800/1333 resize and 32-pixel padding contract and remains Time Machine-only pending broader browser/device validation.',
      preprocessing:Object.freeze({resize:'aspect preserve · shortest edge target 800 · longest edge capped at 1333',layout:'CHW',dtype:'float32 input / INT8 weights',channels:'BGR',normalization:'raw 0–255 minus [102.9801,115.9465,122.7717]',padding:'bottom/right zeros to multiples of 32'}),
      decoder:'Pinned ONNX outputs: xyxy boxes, one-based COCO labels, scores · no page-side NMS',
      ui:Object.freeze({subtitle:'COCO object detection · two-stage RPN + RoI head · ONNX INT8/WASM',provenance:'Pinned ONNX Model Zoo Faster R-CNN R50-FPN INT8 reference checkpoint derived from maskrcnn-benchmark and evaluated on COCO. It is a later reference checkpoint, not the original 2015 paper weights. The migrated repository says Apache-2.0 in metadata while the imported model card says MIT; both are recorded.',runtime:Object.freeze({initLabel:'Session init',bytesText:'44.6 MB · INT8 weights',cacheInitial:'checking pinned model'}),links:Object.freeze([Object.freeze({label:'Faster R-CNN paper ↗',url:'https://arxiv.org/abs/1506.01497'}),Object.freeze({label:'Pinned ONNX checkpoint ↗',url:'https://huggingface.co/onnxmodelzoo/FasterRCNN-12-int8/tree/c4c979ff5c8043967de03c97daef7b54663182eb'}),Object.freeze({label:'Known export issue ↗',url:'https://github.com/onnx/models/issues/691'}),Object.freeze({label:'License/provenance ↗',url:'docs/MODEL_SOURCES.md#faster-r-cnn-2015-reference'})])}),
      sources:Object.freeze([Object.freeze({label:'HF pinned · FasterRCNN-12 INT8',url:'https://huggingface.co/onnxmodelzoo/FasterRCNN-12-int8/resolve/c4c979ff5c8043967de03c97daef7b54663182eb/FasterRCNN-12-int8.onnx',provenance:'onnxmodelzoo/FasterRCNN-12-int8 @ c4c979ff5c8043967de03c97daef7b54663182eb'})])
    }),
    ssd2016:Object.freeze({
      id:'ssd-resnet34-12-int8',title:'SSD · ResNet-34 INT8',year:2016,status:'runnable',family:'SSD · Single Shot MultiBox Detector',task:'object-detection',license:'Apache-2.0 repository; checkpoint lineage described in docs/MODEL_SOURCES.md',bytes:20485276,sha256:'56d2c03a8c74c03f704509ccfcd91763991c6e1b92f63da730fb2b3d07565453',input:1200,
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:false,race:false,inspection:Object.freeze({mode:'preprocessing-only',stages:Object.freeze(['preprocessing']),input:'1200×1200',resize:'direct stretch',tensor:'float32 · NCHW',channels:'RGB',normalization:'ImageNet mean/std after 1/255',preview:Object.freeze({mode:'stretch',width:640,height:640,caption:'SSD 2016 direct-stretch preview'}),shape:Object.freeze({layout:'NCHW',channels:3}),pipeline:Object.freeze({step2:Object.freeze({title:'Direct resize',text:'The source is stretched to 1200×1200, matching the pinned export input.'}),step3:Object.freeze({title:'Normalized RGB tensor',text:'RGB pixels are packed as float32 NCHW and normalized with ImageNet mean and standard deviation.'}),step4:Object.freeze({title:'SSD detections',text:'The pinned ResNet-34 INT8 export returns COCO boxes, labels and scores.'})}),comparison:Object.freeze({label:'SSD · ResNet-34',input:'1200×1200',resize:'direct stretch',padding:'none',layout:'NCHW',dtype:'float32',channels:'RGB · ImageNet normalization'}),intermediate:Object.freeze({title:'SSD intermediate tensors not exported',subtitle:'This graph exposes detections rather than selected backbone activations.',note:'No intermediate feature maps are fabricated.',data:'none',status:'Intermediate activations not exposed'}),resultNote:'Upstream graph returns postprocessed detections; no page-side NMS is added.'})}),
      executionProviders:Object.freeze(['wasm']),preprocessing:Object.freeze({resize:'direct stretch to 1200×1200',layout:'NCHW',dtype:'float32',channels:'RGB',rescale:'1/255 then ImageNet mean/std',padding:'none'}),decoder:'Pinned ONNX outputs: normalized xyxy boxes, one-based COCO labels, scores',
      ui:Object.freeze({subtitle:'SSD 2016 design · ResNet-34 INT8 · COCO reference checkpoint',provenance:'Represents the 2016 SSD architecture with a later ONNX Model Zoo ResNet-34 INT8 checkpoint trained on COCO 2017. It is not the original paper checkpoint; see the pinned source and license notes.',runtime:Object.freeze({initLabel:'Session init',bytesText:'20.5 MB · INT8 weights',cacheInitial:'checking pinned model'}),links:Object.freeze([Object.freeze({label:'SSD paper ↗',url:'https://arxiv.org/abs/1512.02325'}),Object.freeze({label:'Pinned ONNX checkpoint ↗',url:'https://huggingface.co/onnxmodelzoo/ssd-12-int8/tree/bf6cc24948f7cf6c50127798c33d900813678b4e'}),Object.freeze({label:'License/provenance ↗',url:'docs/MODEL_SOURCES.md#ssd-2016-reference'})])}),
      sources:Object.freeze([Object.freeze({label:'HF pinned · SSD-12 INT8',url:'https://huggingface.co/onnxmodelzoo/ssd-12-int8/resolve/bf6cc24948f7cf6c50127798c33d900813678b4e/ssd-12-int8.onnx',provenance:'onnxmodelzoo/ssd-12-int8 @ bf6cc24948f7cf6c50127798c33d900813678b4e'})])
    }),
    detr:Object.freeze({
      id:'detr-resnet50-xenova-q8',title:'DETR · ResNet-50',year:2020,status:'runnable',family:'DETR · Transformer set prediction',task:'object-detection',license:'Apache-2.0 base model; conversion license not independently declared',modelId:'Xenova/detr-resnet-50',baseModel:'facebook/detr-resnet-50',revision:'8be7ab59ff663484ee9ba2e8d8f267330d5ad03e',input:640,
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:false,race:false,inspection:Object.freeze({mode:'processor-contract-only',stages:Object.freeze(['preprocessing']),input:'source staging ≤640; processor-managed',resize:'aspect-preserving stage; Transformers.js processor resize',tensor:'float32 · NCHW',channels:'RGB',normalization:'processor-managed',preview:Object.freeze({mode:'aspect-max',maxSide:640,caption:'DETR staged image · processor resizes internally'}),shape:Object.freeze({layout:'NCHW',channels:3}),pipeline:Object.freeze({step2:Object.freeze({title:'Stage image',text:'The source is aspect-preservingly staged at up to 640 px; the Transformers.js processor performs model-specific resizing.'}),step3:Object.freeze({title:'Processor tensor',text:'Transformers.js handles RGB conversion, normalization and tensor layout.'}),step4:Object.freeze({title:'Object-query set prediction',text:'Learned object queries are decoded into a fixed prediction set and trained with bipartite matching; the Transformers.js pipeline returns postprocessed detections without page-side NMS.'})}),comparison:Object.freeze({label:'DETR · ResNet-50',input:'processor-managed',resize:'processor-managed',padding:'processor-managed',layout:'NCHW',dtype:'float32',channels:'RGB'}),intermediate:Object.freeze({title:'DETR query tensors not exposed',subtitle:'The active Transformers.js pipeline returns final detections, not per-query logits, boxes, decoder states or attention tensors.',note:'The query-based architecture is described from the verified model/runtime contract; no query or attention visualization is fabricated.',emptyText:'Final detections are observable, but individual object-query tensors are not exposed by this production pipeline.',data:'none',status:'Query internals not exposed'}),resultNote:'Transformers.js performs DETR postprocessing; no page-side NMS is added.'})}),
      preprocessing:Object.freeze({resize:'processor-managed after max-640 staging',layout:'NCHW',dtype:'float32 input / q8 weights',channels:'RGB',padding:'processor-managed'}),runtime:Object.freeze({wasm:Object.freeze({device:'wasm',dtype:'q8',modelBytes:43102531})}),decoder:'Transformers.js DETR object-detection pipeline',
      ui:Object.freeze({subtitle:'DETR 2020 · ResNet-50 · COCO · Transformers.js',provenance:'Pinned Xenova Transformers.js conversion of facebook/detr-resnet-50, whose base checkpoint is Apache-2.0. The conversion repository does not independently state a license. This is a later COCO 2017 reference checkpoint, not the exact paper weights.',runtime:Object.freeze({initLabel:'Pipeline load',bytesText:'43.1 MB q8',cacheInitial:'managed by pipeline',managedTransferWhenMissing:true,inferenceBoundaryNote:'Inference includes Transformers.js processor, model and postprocessor work.'}),links:Object.freeze([Object.freeze({label:'DETR paper ↗',url:'https://arxiv.org/abs/2005.12872'}),Object.freeze({label:'Pinned Transformers.js model ↗',url:'https://huggingface.co/Xenova/detr-resnet-50/tree/8be7ab59ff663484ee9ba2e8d8f267330d5ad03e'}),Object.freeze({label:'Base model ↗',url:'https://huggingface.co/facebook/detr-resnet-50'}),Object.freeze({label:'License/provenance ↗',url:'docs/MODEL_SOURCES.md#detr-2020-reference'})])})
    }),
    yolos:Object.freeze({
      id:'yolos-tiny-transformersjs-q4',title:'YOLOS-tiny',year:2021,status:'runnable',family:'YOLOS · vanilla Vision Transformer',task:'object-detection',
      license:'Apache-2.0 base checkpoint; HUST code MIT; conversion license not independently declared',modelId:'Xenova/yolos-tiny',baseModel:'hustvl/yolos-tiny',revision:'e2f9c7673f0fa61849efe2b56a0d7774779ebb9d',baseRevision:'95a90f3c189fbfca3bcfc6d7315b9e84d95dc2de',sha256:'a3e0b7d8931274aee8af01dc31b35d9c379247bdb7c86eaf222090728c4a894b',
      capabilities:Object.freeze({timeMachine:true,benchmark:false,live:false,race:false,inspection:Object.freeze({
        mode:'transformer-contract-only',stages:Object.freeze(['preprocessing','patch-sequence','set-prediction']),
        input:'≤640 stage · processor short edge 512 / long ≤1333',resize:'processor-managed after aspect-preserving stage',tensor:'float32 · NCHW',channels:'RGB',normalization:'1/255 + ImageNet mean/std',
        preview:Object.freeze({mode:'aspect-max',maxSide:640,caption:'YOLOS browser staging preview · processor resizes internally'}),
        shape:Object.freeze({layout:'NCHW',channels:3}),
        pipeline:Object.freeze({
          step2:Object.freeze({title:'Processor resize',text:'The browser stages the source at up to 640 px; the YOLOS processor then applies its model-specific aspect resize and normalization.'}),
          step3:Object.freeze({title:'Patch + detection tokens',text:'Image patches and learned detection tokens enter a plain Vision Transformer sequence rather than a CNN feature pyramid.'}),
          step4:Object.freeze({title:'Transformer set prediction',text:'Detection tokens produce scored boxes through the Transformers.js object-detection pipeline.'})
        }),
        comparison:Object.freeze({label:'YOLOS-tiny',input:'processor-managed',resize:'short 512 / long ≤1333',padding:'processor-managed',layout:'NCHW',dtype:'float32 input · q4 weights',channels:'RGB · ImageNet normalization'}),
        intermediate:Object.freeze({title:'YOLOS token/attention tensors not exposed',subtitle:'The current Transformers.js production pipeline returns postprocessed detections, not patch-token, detection-token or attention activations.',note:'No attention map or token activation is synthesized. A separately inspectable model/export is required for that view.',emptyText:'The transformer pipeline is shown from its verified contract; internal token and attention tensors are not exposed.',data:'none',status:'Transformer internals not exposed'}),
        resultNote:'Final detections are real pipeline outputs; internal transformer activations are not displayed.'
      })}),
      executionProviders:Object.freeze(['wasm']),
      preprocessing:Object.freeze({resize:'processor-managed · shortest edge 512, longest edge 1333 after ≤640 staging',layout:'NCHW',dtype:'float32 input / q4 weights',channels:'RGB',normalization:'1/255 + ImageNet mean/std',padding:'processor-managed'}),
      runtime:Object.freeze({wasm:Object.freeze({device:'wasm',dtype:'q4',modelBytes:7809003})}),
      decoder:'Transformers.js YOLOS object-detection pipeline · DETR-style bipartite set prediction',
      ui:Object.freeze({subtitle:'COCO object detection · pure ViT · Transformers.js q4/WASM',provenance:'Pinned Transformers.js q4 conversion of HUST YOLOS-tiny. The Apache-2.0 base checkpoint is a vanilla ViT detector pretrained on ImageNet-1k and fine-tuned on COCO 2017; the browser conversion repository does not independently declare a license.',runtime:Object.freeze({initLabel:'Pipeline load',bytesText:'7.81 MB q4',cacheInitial:'managed by pipeline',managedTransferWhenMissing:true,inferenceBoundaryNote:'Inference includes Transformers.js processor, model and postprocessor work.'}),links:Object.freeze([Object.freeze({label:'YOLOS paper ↗',url:'https://arxiv.org/abs/2106.00666'}),Object.freeze({label:'Pinned browser model ↗',url:'https://huggingface.co/Xenova/yolos-tiny/tree/e2f9c7673f0fa61849efe2b56a0d7774779ebb9d'}),Object.freeze({label:'Pinned base model ↗',url:'https://huggingface.co/hustvl/yolos-tiny/tree/95a90f3c189fbfca3bcfc6d7315b9e84d95dc2de'}),Object.freeze({label:'License/provenance ↗',url:'docs/MODEL_SOURCES.md#yolos-tiny'})])})
    }),
    yolox:Object.freeze({
      id:'yolox-nano-0.1.1rc0',title:'YOLOX-Nano',year:2021,status:'runnable',family:'YOLOX Nano',task:'object-detection',license:'Apache-2.0',bytes:3659407,input:416,nms:0.45,
      capabilities:Object.freeze({timeMachine:true,benchmark:true,live:Object.freeze({enabled:true,order:30,summary:'Sequential inference · WASM · no frame queue',forceBackend:'wasm'}),race:Object.freeze({
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
      decoder:'YOLOX strides 8/16/32 + class-aware NMS',
      ui:Object.freeze({subtitle:'COCO object detection · ONNX · anchor-free CNN',provenance:'Official Megvii YOLOX-Nano deployment checkpoint. Upstream reports 0.91M parameters and 25.8 COCO AP; browser inference keeps the official 416×416 preprocessing path.',links:Object.freeze([Object.freeze({label:'Official repo ↗',url:'https://github.com/Megvii-BaseDetection/YOLOX'}),Object.freeze({label:'Pinned mirror ↗',url:'https://huggingface.co/Heliosoph/yolox-onnx/tree/9206d80cbad9ed54986edeff8d7457eb5333882a'}),Object.freeze({label:'License/provenance ↗',url:'docs/MODEL_SOURCES.md#yolox-nano'})])}),
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
          step4:Object.freeze({title:'Query-based RT-DETR decoder',text:'The end-to-end detector turns decoder queries into a prediction set and returns scored boxes without page-side NMS.'})
        }),
        comparison:Object.freeze({label:'RT-DETR R18',input:'640×640',resize:'processor resize',padding:'none',layout:'NCHW',dtype:'float input',channels:'RGB · 1/255'}),
        intermediate:Object.freeze({title:'RT-DETR query tensors not exposed',subtitle:'The production pipeline exposes final detections but not decoder-query logits, boxes, states or attention tensors.',note:'Query-based set prediction is described from the model contract; an inspectable export is required before any query/attention tensor can be visualized.',emptyText:'Final detections are observable; individual RT-DETR query tensors are not exposed by this production pipeline.',data:'none',status:'Query internals not exposed'}),
        resultNote:'No page-side NMS is added.'
      })}),
      preprocessing:Object.freeze({resize:'640×640 processor-managed',layout:'NCHW',dtype:'float32 input / quantized weights',channels:'RGB',rescale:'1/255',normalize:false,padding:'none'}),
      runtime:Object.freeze({webgpu:Object.freeze({device:'webgpu',dtype:'fp16',modelBytes:41400000}),wasm:Object.freeze({device:'wasm',dtype:'q8',modelBytes:21713196})}),
      decoder:'Transformers.js RT-DETR postprocessor',
      ui:Object.freeze({runtime:Object.freeze({initLabel:'Pipeline load',bytesText:'~21.7 MB q8 / 41.4 MB fp16',cacheInitial:'checked at load',managedTransferWhenMissing:true,inferenceBoundaryNote:'RT-DETR inference is the Transformers.js pipeline call, including processor/model/postprocessor work.',benchmarkBoundary:'p50, p90, min–max and run-to-run timing variation from 20 warm Transformers.js pipeline calls; pipeline/model load excluded.'}),subtitle:'COCO object detection · Transformers.js · DETR',provenance:'PekingU RT-DETR R18 base model with the pinned Hugging Face ONNX Community conversion. The browser keeps the exact conversion revision and uses Transformers.js v4 native WebGPU runtime with WASM q8 fallback.',links:Object.freeze([Object.freeze({label:'Base model ↗',url:'https://huggingface.co/PekingU/rtdetr_r18vd'}),Object.freeze({label:'Pinned conversion ↗',url:'https://huggingface.co/onnx-community/rtdetr_r18vd/tree/ec641af14c7cc8f93cd641a1458f498abbbbb533'}),Object.freeze({label:'Official repo ↗',url:'https://github.com/lyuwenyu/RT-DETR'}),Object.freeze({label:'License/provenance ↗',url:'docs/MODEL_SOURCES.md#rt-detr-r18'})])}),
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
          step4:Object.freeze({title:'RT-DETRv2 query decoder',text:'The end-to-end query decoder predicts a set of scored boxes; page-side NMS is not added.'})
        }),
        comparison:Object.freeze({label:'RT-DETRv2 R18',input:'640×640',resize:'processor resize',padding:'none',layout:'NCHW',dtype:'float input',channels:'RGB · 1/255'}),
        intermediate:Object.freeze({title:'RT-DETRv2 query tensors not exposed',subtitle:'The production pipeline returns detections without exposing individual decoder-query logits, boxes, states or attention tensors.',note:'No query or attention visualization is fabricated; a separately inspectable export is required.',emptyText:'Final detections are observable; individual RT-DETRv2 query tensors are not exposed.',data:'none',status:'Query internals not exposed'}),
        resultNote:'No page-side NMS is added.'
      })}),
      preprocessing:Object.freeze({resize:'640×640 processor-managed',layout:'NCHW',dtype:'float32 input / quantized weights',channels:'RGB',rescale:'1/255',normalize:false,padding:'none'}),
      runtime:Object.freeze({webgpu:Object.freeze({device:'webgpu',dtype:'fp16',modelBytes:40750249}),wasm:Object.freeze({device:'wasm',dtype:'q8',modelBytes:20991219})}),
      decoder:'Transformers.js RT-DETRv2 postprocessor',
      ui:Object.freeze({runtime:Object.freeze({initLabel:'Pipeline load',bytesText:'~21.0 MB int8 / 40.8 MB fp16',cacheInitial:'checked at load',managedTransferWhenMissing:true,inferenceBoundaryNote:'Inference is the Transformers.js processor/model/postprocessor call.',benchmarkBoundary:'p50, p90, min–max and run-to-run timing variation from 20 warm Transformers.js pipeline calls; pipeline/model load excluded.'}),subtitle:'COCO object detection · Transformers.js · RT-DETRv2',provenance:'PekingU RT-DETRv2 R18 COCO checkpoint with the pinned Hugging Face ONNX Community conversion. A user-reported iOS 18.7 / Brave-WebKit run on 2026-09-23 completed WebGPU fp16 inference and a 20-run warm benchmark; broader device/sample validation remains pending.',links:Object.freeze([Object.freeze({label:'Base model ↗',url:'https://huggingface.co/PekingU/rtdetr_v2_r18vd'}),Object.freeze({label:'Pinned ONNX conversion ↗',url:'https://huggingface.co/onnx-community/rtdetr_v2_r18vd-ONNX/tree/936f90b6a476c6da4dfe053fc521af55285976ba'}),Object.freeze({label:'Official implementation ↗',url:'https://github.com/lyuwenyu/RT-DETR'}),Object.freeze({label:'License/provenance ↗',url:'docs/MODEL_SOURCES.md#rt-detrv2-r18'})])}),
      source:'https://huggingface.co/onnx-community/rtdetr_v2_r18vd-ONNX'
    }),
    lwdetr:Object.freeze({
      id:'lw-detr-tiny-coco-onnx',title:'LW-DETR-tiny',year:2024,status:'runnable',family:'LW-DETR',task:'object-detection',license:'Apache-2.0',parameters:'12.1M',input:640,bytes:38313297,sha256:'dadac1a335e108a5d1a52c4ac0280cd9b71ea2f7c39400e2d532f3a1f663dea0',
      sourceModel:'AnnaZhang/lwdetr_tiny_60e_coco',sourceRevision:'4b636b514dcf623f6eafc9e1ab63b8ad5c513925',labels:Object.freeze(["N/A","person","bicycle","car","motorcycle","airplane","bus","train","truck","boat","traffic light","fire hydrant","street sign","stop sign","parking meter","bench","bird","cat","dog","horse","sheep","cow","elephant","bear","zebra","giraffe","hat","backpack","umbrella","shoe","eye glasses","handbag","tie","suitcase","frisbee","skis","snowboard","sports ball","kite","baseball bat","baseball glove","skateboard","surfboard","tennis racket","bottle","plate","wine glass","cup","fork","knife","spoon","bowl","banana","apple","sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake","chair","couch","potted plant","bed","mirror","dining table","window","desk","toilet","door","tv","laptop","mouse","remote","keyboard","cell phone","microwave","oven","toaster","sink","refrigerator","blender","book","clock","vase","scissors","teddy bear","hair drier","toothbrush"]),
      capabilities:Object.freeze({timeMachine:true,benchmark:false,live:Object.freeze({enabled:true,order:70,summary:'WASM fp32 · slow on tested iPhone · no frame queue'}),race:false,inspection:Object.freeze({
        mode:'query-output-contract',stages:Object.freeze(['preprocessing','query-output-contract']),
        input:'640×640',resize:'direct stretch',tensor:'float32 · NCHW',channels:'RGB',normalization:'1/255 + ImageNet mean/std',
        preview:Object.freeze({mode:'stretch',width:640,height:640,caption:'LW-DETR 640×640 prepared-input preview'}),shape:Object.freeze({layout:'NCHW',channels:3}),
        pipeline:Object.freeze({
          step2:Object.freeze({title:'640×640 preprocessing',text:'The direct ONNX path stretches to 640×640 and applies the verified ImageNet normalization contract.'}),
          step3:Object.freeze({title:'Lightweight encoder + queries',text:'LW-DETR reduces transformer cost while retaining a query-based DETR-style prediction path.'}),
          step4:Object.freeze({title:'logits + pred_boxes',text:'The pinned ONNX graph returns real logits and normalized predicted boxes; the adapter decodes top query/class pairs without page-side NMS.'})
        }),
        comparison:Object.freeze({label:'LW-DETR-tiny',input:'640×640',resize:'direct stretch',padding:'none',layout:'NCHW',dtype:'float32',channels:'RGB · ImageNet normalization'}),
        intermediate:Object.freeze({title:'LW-DETR raw query outputs are consumed, not visualized',subtitle:'The ONNX graph exposes logits and pred_boxes, but the current adapter decodes them immediately and does not retain copies for the inspector.',note:'No synthetic query map is shown. A future inspector may retain a bounded summary of those real outputs without changing inference.',emptyText:'Real logits and pred_boxes feed the decoder, but this inspector currently shows the verified output contract rather than duplicating those tensors.',data:'none',status:'Real query outputs consumed · not retained for visualization'}),
        resultNote:'Final detections are decoded from the graph’s real logits and pred_boxes; no page-side NMS is applied.'
      })}),
      runtime:Object.freeze({wasm:Object.freeze({device:'wasm',dtype:'fp32',modelBytes:38313297})}),executionProviders:Object.freeze(['wasm']),
      preprocessing:Object.freeze({resize:'direct stretch to 640×640',layout:'NCHW',dtype:'float32',channels:'RGB',rescale:'1/255 then ImageNet mean/std',padding:'none'}),
      decoder:'Deformable DETR: sigmoid scores · global top 100 query/class pairs · normalized cxcywh · no NMS',
      ui:Object.freeze({runtime:Object.freeze({initLabel:'ONNX session',bytesText:'38.3 MB · fp32 ONNX',cacheInitial:'checking pinned model',inferenceBoundaryNote:'Inference is the ONNX Runtime Web WASM run.',benchmarkBoundary:'Time Machine and Live Camera inference; excluded from Model Race, individual benchmark, and Inside the Model.'}),subtitle:'COCO object detection · direct ONNX · WASM fp32',provenance:'Apache-2.0 LW-DETR-tiny checkpoint exported to ONNX with custom CUDA kernels disabled. This pinned browser conversion is served from a same-origin GitHub Pages asset to avoid cross-origin release-fetch failures. It is enabled in Time Machine and Live Camera while remaining excluded from Model Race, individual benchmark, and Inside the Model. One user-reported iOS 18.7 / Brave-WebKit Benchmark ×20 completed on 2026-09-24; broad device performance, user-image accuracy, and compatibility remain unverified.',links:Object.freeze([Object.freeze({label:'LW-DETR paper ↗',url:'https://arxiv.org/abs/2406.03459'}),Object.freeze({label:'Base checkpoint ↗',url:'https://huggingface.co/AnnaZhang/lwdetr_tiny_60e_coco/tree/4b636b514dcf623f6eafc9e1ab63b8ad5c513925'}),Object.freeze({label:'Pinned ONNX release ↗',url:'https://github.com/hakanakgun/vision-evolution-lab/releases/tag/lw-detr-tiny-4604afc2e4a1-1'}),Object.freeze({label:'Provenance ↗',url:'docs/MODEL_SOURCES.md#lw-detr-tiny'})])}),
      sources:Object.freeze([Object.freeze({label:'Pinned GitHub Pages asset',url:'assets/models/lw-detr-tiny.onnx?sha256=dadac1a335e108a5d1a52c4ac0280cd9b71ea2f7c39400e2d532f3a1f663dea0',provenance:'Same-origin Pages copy of release lw-detr-tiny-4604afc2e4a1-1 · SHA-256 verified'})])
    }),
    dfine:Object.freeze({
      id:'dfine-n-coco-transformersjs',title:'D-FINE-N',year:2024,status:'runnable',family:'D-FINE',task:'object-detection',license:'Apache-2.0',
      modelId:'onnx-community/dfine_n_coco-ONNX',baseModel:'ustc-community/dfine-nano-coco',baseRevision:'066438d3d8f0da137a37b38fdf3368fd4afceced',revision:'e2b9c0f0884ee7c90b79feedfd30054e82ed634c',parameters:'3.8M',input:640,bytes:15300000,sha256:'0f684f409618ee8a822410e754a29caa817d1aa16283ce89cad936d0a48e2f35',
      capabilities:Object.freeze({timeMachine:true,benchmark:false,live:Object.freeze({enabled:true,order:60,summary:'WASM fp32 · mobile performance unverified · no frame queue'}),race:false,inspection:Object.freeze({
        mode:'transformer-contract-only',stages:Object.freeze(['preprocessing','end-to-end-detection']),
        input:'640×640',resize:'processor resize',tensor:'float32 · NCHW',channels:'RGB',normalization:'1/255 + ImageNet mean/std',
        preview:Object.freeze({mode:'stretch',width:640,height:640,caption:'D-FINE processor-equivalent 640×640 preview'}),shape:Object.freeze({layout:'NCHW',channels:3}),
        pipeline:Object.freeze({
          step2:Object.freeze({title:'Processor resize',text:'Transformers.js prepares a 640×640 normalized RGB tensor for the pinned D-FINE-N conversion.'}),
          step3:Object.freeze({title:'End-to-end detector',text:'The model follows a DETR-style query-based detection path with fine-grained box-regression modeling.'}),
          step4:Object.freeze({title:'Postprocessed detections',text:'The production Transformers.js pipeline returns scored boxes to the browser overlay.'})
        }),
        comparison:Object.freeze({label:'D-FINE-N',input:'640×640',resize:'processor resize',padding:'none',layout:'NCHW',dtype:'float32',channels:'RGB · ImageNet normalization'}),
        intermediate:Object.freeze({title:'D-FINE query/regression tensors not exposed',subtitle:'The current Transformers.js pipeline returns final detections rather than internal query states or regression distributions.',note:'No internal tensor visualization is fabricated.',emptyText:'The verified pipeline contract is shown; internal query and regression tensors are not exposed by this runtime surface.',data:'none',status:'Query/regression internals not exposed'}),
        resultNote:'Final detections are real pipeline outputs; internal query/regression tensors are not displayed.'
      })}),
      runtime:Object.freeze({wasm:Object.freeze({device:'wasm',dtype:'fp32',modelBytes:15300000})}),
      preprocessing:Object.freeze({resize:'640×640 processor resize',layout:'NCHW',dtype:'float32',channels:'RGB',rescale:'1/255 then ImageNet mean/std',padding:'none'}),
      decoder:'Transformers.js D-FINE postprocessor',
      ui:Object.freeze({runtime:Object.freeze({initLabel:'Pipeline load',bytesText:'~15.3 MB · fp32 ONNX',cacheInitial:'checked at load',managedTransferWhenMissing:true,inferenceBoundaryNote:'Inference is the Transformers.js processor/model/postprocessor call.',benchmarkBoundary:'Time Machine and Live Camera inference; excluded from Model Race and individual benchmarks.'}),subtitle:'COCO object detection · Transformers.js · WASM fp32',provenance:'USTC D-FINE-N COCO checkpoint with the pinned ONNX Community Transformers.js conversion. The upstream COCO model and code declare Apache-2.0. Objects365-derived variants are not used. This model is enabled in Time Machine and Live Camera; browser performance and iOS/WebKit Live Camera behavior have not yet been benchmarked.',links:Object.freeze([Object.freeze({label:'D-FINE paper ↗',url:'https://arxiv.org/abs/2410.13842'}),Object.freeze({label:'Base model ↗',url:'https://huggingface.co/ustc-community/dfine-nano-coco/tree/066438d3d8f0da137a37b38fdf3368fd4afceced'}),Object.freeze({label:'Pinned ONNX conversion ↗',url:'https://huggingface.co/onnx-community/dfine_n_coco-ONNX/tree/e2b9c0f0884ee7c90b79feedfd30054e82ed634c'}),Object.freeze({label:'Official repo ↗',url:'https://github.com/Peterande/D-FINE'}),Object.freeze({label:'License/provenance ↗',url:'docs/MODEL_SOURCES.md#d-fine-n'})])}),
      source:'https://huggingface.co/onnx-community/dfine_n_coco-ONNX'
    })
  });
})();
