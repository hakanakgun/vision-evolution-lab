#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const {after,test}=require('node:test');

const root=path.resolve(__dirname,'..');
const assetName='lw-detr-tiny.onnx';
const assetPath=path.join(root,'assets','models',assetName);
const original=fs.readFileSync(assetPath);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const originalDigest=digest(original);

// The validator reads fixtures through symlinks; only the selected model file is
// replaced. No source file or repository asset is changed by these checks.
function linkDirectory(source,target,excluded){
  fs.mkdirSync(target,{recursive:true});
  for(const entry of fs.readdirSync(source,{withFileTypes:true})){
    if(excluded.has(entry.name))continue;
    fs.symlinkSync(path.join(source,entry.name),path.join(target,entry.name),entry.isDirectory()?'dir':'file');
  }
}

function validateWithAsset(replacement){
  const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'vision-validation-test-'));
  try{
    linkDirectory(root,fixture,new Set(['assets','.git']));
    linkDirectory(path.join(root,'assets'),path.join(fixture,'assets'),new Set(['models']));
    const modelsPath=path.join(fixture,'assets','models');
    linkDirectory(path.join(root,'assets','models'),modelsPath,new Set([assetName]));
    const fixtureAsset=path.join(modelsPath,assetName);
    if(replacement==='original')fs.symlinkSync(assetPath,fixtureAsset,'file');
    else if(replacement)fs.writeFileSync(fixtureAsset,replacement);
    const result=spawnSync(process.execPath,[path.join(root,'scripts','validate.mjs')],{cwd:fixture,encoding:'utf8',timeout:30000});
    assert.ifError(result.error);
    assert.equal(result.signal,null,'validator must exit without a signal');
    return result;
  }finally{
    fs.rmSync(fixture,{recursive:true,force:true});
  }
}

test('repository validation accepts the original LW-DETR Pages asset',()=>{
  const result=validateWithAsset('original');
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/validate: PASS/);
});

test('repository validation rejects a missing LW-DETR Pages asset',()=>{
  const result=validateWithAsset(null);
  assert.notEqual(result.status,0,'missing shipped model must fail validation');
  assert.match(result.stderr,/LW-DETR Pages asset is missing/);
});

test('repository validation rejects a truncated LW-DETR Pages asset',()=>{
  const result=validateWithAsset(original.subarray(0,8));
  assert.notEqual(result.status,0,'truncated shipped model must fail validation');
  assert.match(result.stderr,/LW-DETR Pages asset size mismatch/);
});

test('repository validation rejects same-size LW-DETR Pages asset corruption',()=>{
  const corrupt=Buffer.from(original);
  corrupt[Math.floor(corrupt.length/2)]^=1;
  assert.equal(corrupt.length,original.length);
  const result=validateWithAsset(corrupt);
  assert.notEqual(result.status,0,'same-size corrupt model must fail validation');
  assert.match(result.stderr,/LW-DETR Pages asset checksum mismatch/);
});

after(()=>{
  const current=fs.readFileSync(assetPath);
  assert.equal(current.length,original.length,'original model size must remain unchanged');
  assert.equal(digest(current),originalDigest,'original model bytes must remain unchanged');
});
