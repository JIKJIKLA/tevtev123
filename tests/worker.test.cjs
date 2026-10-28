const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {buildWorker,MAX_ASSET}=require('../scripts/build-worker.cjs');
const {prepareAssetUpload,uploadAssetBuckets,workerMetadata}=require('../scripts/cloudflare-assets.cjs');
const staticWorker=import('../cloudflare/worker.mjs'),pasteWorker=import('../cloudflare/worker-paste.mjs');

test('asset deployment accepts only reviewed package bytes and a fixed Cloudflare upload destination',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nivet-worker-upload-')),htmlPath=path.join(temp,'game.html'),out=path.join(temp,'bundle');
 try{
  fs.writeFileSync(htmlPath,'<title>Nivet League upload check</title>');buildWorker({htmlPath,directory:out,build:'upload-test'});
  const prepared=prepareAssetUpload(out),hashes=Object.keys(prepared.files),accountId='a'.repeat(32);let calls=0;
  const session={jwt:'short-lived-upload-test',buckets:[hashes]};
  const uploaded=await uploadAssetBuckets({accountId,session,files:prepared.files,fetcher:async(url,options)=>{
   calls++;assert.equal(url,'https://api.cloudflare.com/client/v4/accounts/'+accountId+'/workers/assets/upload?base64=true');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer short-lived-upload-test');
   for(const hash of hashes){const blob=options.body.get(hash);assert.ok(blob instanceof Blob);assert.equal(Buffer.from(await blob.text(),'base64').length,prepared.files[hash].size);}
   return new Response(JSON.stringify({success:true,result:{jwt:'short-lived-completion-test'}}),{status:201});
  }});
  assert.equal(calls,1);assert.equal(uploaded.uploaded,2);const metadata=workerMetadata(prepared,uploaded.jwt);assert.equal(metadata.assets.jwt,'short-lived-completion-test');assert.deepEqual(metadata.bindings.map(b=>b.type),['assets','plain_text']);assert.deepEqual(metadata.assets.config.run_worker_first,['/health']);assert.equal(metadata.cache_options.enabled,false);
  await assert.rejects(uploadAssetBuckets({accountId,session:{jwt:'test',buckets:[['f'.repeat(32)]]},files:prepared.files}),/Unexpected asset hash/);
  fs.appendFileSync(path.join(out,'public/index.html'),'modified');assert.throws(()=>prepareAssetUpload(out),/changed after build/);
 }finally{const resolved=path.resolve(temp),base=path.resolve(os.tmpdir())+path.sep;if(!resolved.startsWith(base)||!path.basename(resolved).startsWith('nivet-worker-upload-'))throw Error('Unsafe test cleanup');fs.rmSync(resolved,{recursive:true,force:true});}
});

test('static Worker keeps health local, rejects unsupported methods and never proxies arbitrary paths',async()=>{
 const worker=(await staticWorker).default;let fetched=0;
 const env={GAME_BUILD:'test',ASSETS:{async fetch(request){fetched++;return new Response(request.method==='HEAD'?null:'game',{headers:{'Content-Type':'text/html'}});}}};
 const health=await worker.fetch(new Request('https://game.test/health'),env);assert.equal((await health.json()).build,'test');assert.equal(fetched,0);
 assert.equal((await worker.fetch(new Request('https://game.test/health',{method:'HEAD'}),env)).body,null);
 assert.equal((await worker.fetch(new Request('https://game.test/',{method:'POST'}),env)).status,405);
 assert.equal((await worker.fetch(new Request('https://game.test/https://elsewhere.test/private'),env)).status,404);
 const game=await worker.fetch(new Request('https://game.test/'),env);assert.equal(await game.text(),'game');assert.equal(fetched,1);
 assert.equal((await worker.fetch(new Request('https://game.test/'),{})).status,503);
});

test('paste Worker streams only the fixed game origin without forwarding credentials or query-selected upstreams',async()=>{
 const {createPasteWorker}=await pasteWorker;let call;
 const worker=createPasteWorker(async(url,options)=>{call={url,options};return new Response('game',{headers:{'Content-Type':'text/html','Set-Cookie':'private=yes',ETag:'v1'}});});
 const response=await worker.fetch(new Request('https://game.test/?url=https://evil.test',{headers:{Authorization:'secret',Cookie:'private=yes','If-None-Match':'v0'}}));
 assert.equal(call.url,'https://jikjikla.github.io/tevtev123/');assert.equal(call.options.headers.get('Authorization'),null);assert.equal(call.options.headers.get('Cookie'),null);assert.equal(call.options.headers.get('If-None-Match'),'v0');
 assert.equal(response.headers.get('Set-Cookie'),null);assert.equal(response.headers.get('ETag'),'v1');assert.equal(await response.text(),'game');
 assert.equal((await worker.fetch(new Request('https://game.test/api/secret'))).status,404);
 assert.equal((await worker.fetch(new Request('https://game.test/',{method:'PUT'}))).status,405);
 assert.equal((await worker.fetch(new Request('https://game.test/',{method:'HEAD'}))).body,null);
 const failed=createPasteWorker(async()=>{throw Error('private diagnostic');});const error=await failed.fetch(new Request('https://game.test/'));assert.equal(error.status,502);assert.doesNotMatch(await error.text(),/private diagnostic/);
});

test('Worker package preserves game bytes and rejects an unbuilt or oversized game',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'nivet-worker-test-')),htmlPath=path.join(temp,'game.html'),out=path.join(temp,'bundle');
 try{
  const input='<title>Nivet League Test</title><script>window.ready=true;</script>';fs.writeFileSync(htmlPath,input);
  const result=buildWorker({htmlPath,directory:out,build:'test'}),config=JSON.parse(fs.readFileSync(path.join(out,'wrangler.jsonc'),'utf8'));
  assert.equal(fs.readFileSync(path.join(out,'public/index.html'),'utf8'),input);assert.equal(result.bytes,Buffer.byteLength(input));assert.equal(config.vars.GAME_BUILD,'test');assert.deepEqual(config.assets.run_worker_first,['/health']);assert.equal(config.assets.binding,'ASSETS');
  assert.ok(fs.statSync(path.join(out,'worker.mjs')).size<5000);assert.equal(config.assets.not_found_handling,'none');assert.equal(config.assets.directory,'./public');
  fs.writeFileSync(htmlPath,'<title>Nivet League</title><!-- INLINE:game.js -->');assert.throws(()=>buildWorker({htmlPath,directory:out}),/Build the portable/);
  fs.truncateSync(htmlPath,MAX_ASSET+1);assert.throws(()=>buildWorker({htmlPath,directory:out}),/25 MiB/);
 }finally{
  const resolved=path.resolve(temp),base=path.resolve(os.tmpdir())+path.sep;if(!resolved.startsWith(base)||!path.basename(resolved).startsWith('nivet-worker-test-'))throw Error('Unsafe test cleanup');fs.rmSync(resolved,{recursive:true,force:true});
 }
});
