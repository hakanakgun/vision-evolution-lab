#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const puppeteer=require('puppeteer-core');
const root=process.cwd(),manifest=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
const output=path.resolve(process.env.VISION_UI_EVIDENCE||path.join(require('node:os').tmpdir(),'vision-ui-evidence'));
fs.mkdirSync(output,{recursive:true});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function chromeExecutable(){
  const candidate=[process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].filter(Boolean).find(file=>fs.existsSync(file));
  assert.ok(candidate,'Chrome/Chromium must be available');return candidate;
}
async function main(){
  let server,browser;
  const errors=[],results=[];
  try{
    let target=process.env.VISION_LAB_URL;
    if(!target){
      const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.md':'text/plain'};
      server=http.createServer((req,res)=>{
        const pathname=new URL(req.url,'http://localhost').pathname;
        const file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
        if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
        res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
        fs.createReadStream(file).pipe(res);
      });
      await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      target='http://127.0.0.1:'+server.address().port+'/';
    }else{
      target=target.endsWith('/')?target:target+'/';
      // Main CI can start before Pages deployment. Wait only for this exact release.
      let ready=false;
      for(let attempt=0;attempt<36;attempt++){
        try{
          const response=await fetch(new URL('version.json?_check='+Date.now(),target),{signal:AbortSignal.timeout(10000),cache:'no-store'});
          if(response.ok&&(await response.json()).build===manifest.build){ready=true;break;}
        }catch(error){console.log('Waiting for Pages:',error.message);}
        await pause(5000);
      }
      assert.ok(ready,'Pages did not serve the expected build '+manifest.build);
    }
    browser=await puppeteer.launch({executablePath:chromeExecutable(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
    for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
      const page=await browser.newPage();
      await page.setViewport(viewport);
      await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
      page.on('pageerror',error=>errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
      try{
        await page.goto(target,{waitUntil:'networkidle2',timeout:60000});
        await page.waitForFunction(()=>window.VisionLab&&window.VisionArchitectureExplorer,{timeout:30000});
        assert.equal(await page.title(),'Vision Evolution Lab');
        assert.equal(await page.$eval('html',el=>el.dataset.build),manifest.build);
        assert.equal(await page.evaluate(()=>window.VisionLab.getActiveModel()),'yolox');
        assert.equal(await page.evaluate(()=>Boolean(window.VisionLab.getImage())),false);
        const tab=async name=>{
          const selector='[data-tab="'+name+'"]';
          await page.$eval(selector,el=>el.scrollIntoView({block:'nearest',inline:'nearest'}));
          await page.click(selector);
          await page.waitForSelector('#'+name+'.active');
        };
        await tab('architecture-explorer');
        await page.select('#architecture-a','lwdetr');await page.select('#architecture-b','dfine');
        for(let count=0;count<5;count++){await tab('time-machine');await tab('architecture-explorer');}
        assert.deepEqual(await page.evaluate(()=>['architecture-a','architecture-b'].map(id=>document.getElementById(id).value)),['lwdetr','dfine']);
        assert.match(await page.$eval('#architecture-status',el=>el.textContent),/LW-DETR-tiny.*D-FINE-N/);
        const links=await page.$$eval('#architecture-profile-a .architecture-links a',nodes=>nodes.map(el=>({href:el.href,rel:el.rel,label:el.getAttribute('aria-label')})));
        assert.ok(links.some(link=>link.href==='https://arxiv.org/abs/2406.03459'));
        assert.ok(links.every(link=>link.rel==='noopener noreferrer'&&link.label.includes('LW-DETR-tiny')));
        await page.focus('#architecture-a');await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(()=>document.activeElement.id),'architecture-b');
        const focus=await page.$eval('#architecture-b',el=>{const style=getComputedStyle(el);return {width:style.outlineWidth,style:style.outlineStyle};});
        assert.equal(focus.width,'2px');assert.equal(focus.style,'solid');
        const layout=await page.evaluate(()=>{
          const selectors=document.querySelector('.architecture-selectors').getBoundingClientRect();
          const a=document.getElementById('architecture-profile-a').getBoundingClientRect();
          const b=document.getElementById('architecture-profile-b').getBoundingClientRect();
          const action=document.querySelector('#architecture-profile-a .architecture-open').getBoundingClientRect();
          return {overflow:document.documentElement.scrollWidth>innerWidth+1,selectorsInside:selectors.right<=innerWidth+1,stacked:b.top>=a.bottom-1,sideBySide:Math.abs(a.top-b.top)<1,actionInside:action.right<=a.right+1&&action.left>=a.left-1};
        });
        assert.equal(layout.overflow,false);assert.ok(layout.selectorsInside&&layout.actionInside);
        assert.ok(viewport.width<850?layout.stacked:layout.sideBySide);
        await page.$eval('#architecture-explorer',el=>el.scrollIntoView({block:'start'}));
        await page.screenshot({path:path.join(output,'architecture-'+viewport.width+'.png'),fullPage:true});
        await page.$eval('#architecture-profile-a .architecture-open',el=>el.scrollIntoView({block:'center'}));
        await page.click('#architecture-profile-a .architecture-open');
        await page.waitForSelector('#time-machine.active');
        assert.equal(await page.evaluate(()=>window.VisionLab.getActiveModel()),'lwdetr');
        assert.equal(await page.evaluate(()=>window.VisionLab.getLiveModel()),'yolox');
        await tab('architecture-explorer');
        assert.equal(await page.$eval('#architecture-a',el=>el.value),'lwdetr');
        // Every declared model must render its own profile and registry links.
        const keys=await page.$$eval('#architecture-a option',options=>options.map(option=>option.value));
        for(const key of keys){
          await page.select('#architecture-a',key);
          assert.equal(await page.$eval('#architecture-profile-a h3',el=>el.textContent),await page.evaluate(key=>window.VisionModels[key].title,key));
          assert.equal(await page.$$eval('#architecture-profile-a .architecture-links a',nodes=>nodes.length),await page.evaluate(key=>window.VisionModels[key].ui.links.length,key));
        }
        results.push({viewport,status:'PASS',models:keys.length,build:manifest.build});
      }catch(error){
        await page.screenshot({path:path.join(output,'failure-'+viewport.width+'.png'),fullPage:true}).catch(()=>{});
        throw error;
      }finally{await page.close();}
    }
    assert.deepEqual(errors,[],'Browser errors');
    const report={url:target,build:manifest.build,browser:await browser.version(),results,errors};
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
    console.log('Architecture Explorer browser checks: PASS '+JSON.stringify(report));
  }finally{
    if(browser)await browser.close();
    if(server)await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
