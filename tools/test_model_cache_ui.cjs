#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');
const {setImmediate:nextTurn}=require('node:timers/promises');

const source=fs.readFileSync(path.join(__dirname,'../src/model-cache.js'),'utf8');

// Only the browser DOM and storage boundary are substituted. The listeners,
// refresh lifecycle, and inventory rendering execute the production script.
class Element extends EventTarget{
  constructor(){super();this.children=[];this.dataset={};this.attributes=new Map();this.value='';this.disabled=false;this.hidden=false;this.text='';}
  setAttribute(name,value){this.attributes.set(name,String(value));}
  getAttribute(name){return this.attributes.get(name)??null;}
  removeAttribute(name){this.attributes.delete(name);}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;this.text='';}
  set textContent(value){this.text=String(value);this.children=[];}
  get textContent(){return this.text+this.children.map(child=>child.textContent).join('');}
}

function createPage(){
  const nodes=new Map(),tab=new Element(),document=new EventTarget(),window=new EventTarget();
  const node=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
  Object.assign(document,{getElementById:node,createElement:()=>new Element(),querySelector:selector=>{
    assert.equal(selector,'[data-tab="model-cache"]');return tab;
  }});
  let stored=false,inspections=0;
  Object.assign(window,{
    VisionModels:{yolox:{title:'YOLOX-Nano',bytes:3490000}},
    VisionRuntimeRegistry:{modelKeys:['yolox']},
    VisionModelLoader:{formatBytes:value=>String(value)+' bytes'},
    VisionModelStorage:{inspect:async()=>{
      inspections++;return{state:stored?'model files saved':'not cached',stored,files:Number(stored)};
    }}
  });
  const activate=tabId=>document.dispatchEvent(Object.assign(new Event('vision:tabchange'),{detail:{tab:tabId}}));
  // app.js dispatches this same event for pointer, keyboard and group selection;
  // its click listener is registered before model-cache.js is initialized.
  tab.addEventListener('click',()=>activate('model-cache'));
  vm.runInNewContext(source,{document,window,navigator:{},console},{filename:'src/model-cache.js'});
  return{
    activate,
    click:()=>tab.dispatchEvent(new Event('click')),
    saved:value=>{stored=value;},
    inspections:()=>inspections,
    inventory:node('cache-models')
  };
}

test('shared tab activation renders Model Storage without a pointer click',async()=>{
  const page=createPage();
  page.activate('model-cache');
  await nextTurn();
  assert.match(page.inventory.textContent,/YOLOX-Nano.*not cached/);
  assert.equal(page.inventory.getAttribute('aria-busy'),'false');
  assert.equal(page.inspections(),1);
});

test('returning through shared navigation reads the current saved-file state',async()=>{
  const page=createPage();
  page.click();
  await nextTurn();
  assert.match(page.inventory.textContent,/not cached/);
  page.activate('time-machine');
  page.saved(true);
  page.activate('model-cache');
  await nextTurn();
  assert.match(page.inventory.textContent,/model files saved/);
  assert.equal(page.inspections(),2);
});

test('a pointer tab activation refreshes inventory exactly once',async()=>{
  const page=createPage();
  page.click();
  await nextTurn();
  assert.match(page.inventory.textContent,/YOLOX-Nano.*not cached/);
  assert.equal(page.inspections(),1);
});

test('activating another panel does not refresh Model Storage',async()=>{
  const page=createPage();
  page.activate('architecture-explorer');
  await nextTurn();
  assert.equal(page.inspections(),0);
  assert.equal(page.inventory.textContent,'');
});
