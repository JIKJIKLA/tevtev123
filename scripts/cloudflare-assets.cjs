// Deployment helper for the reviewed Nivet static-asset package. Long-lived
// account credentials stay in the connected Cloudflare tool. This helper accepts
// only a short-lived asset-session JWT and posts it to Cloudflare's fixed API.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const MIME={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8'};
function prepareAssetUpload(directory){
 const root=path.resolve(directory),release=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
 if(release.game!=='Nivet League'||typeof release.build!=='string')throw Error('Not a Nivet static package');
 const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
 if(config.name!=='nivet-league'||config.assets?.binding!=='ASSETS'||config.assets?.directory!=='./public'||config.assets?.run_worker_first?.join()!=='/health')throw Error('Unexpected Worker routing');
 const publicDir=path.join(root,'public'),allowed=new Set(['index.html','release.json','_headers']);
 for(const entry of fs.readdirSync(publicDir,{withFileTypes:true}))if(!allowed.has(entry.name)||!entry.isFile()||entry.isSymbolicLink())throw Error('Unexpected public package file');
 const manifest={},files={};for(const file of ['index.html','release.json']){
  const absolute=path.join(publicDir,file),bytes=fs.readFileSync(absolute),extension=path.extname(file).slice(1),hash=crypto.createHash('sha256').update(bytes.toString('base64')+extension).digest('hex').slice(0,32);
  if(bytes.length>25*1024*1024)throw Error('Static asset exceeds 25 MiB');
  if(file==='index.html'&&crypto.createHash('sha256').update(bytes).digest('hex')!==release.sha256)throw Error('Static package changed after build');
  manifest['/'+file]={hash,size:bytes.length};files[hash]={path:absolute,mime:MIME[path.extname(file)],size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
 }
 return{manifest,files,release,config,headers:fs.readFileSync(path.join(publicDir,'_headers'),'utf8'),script:fs.readFileSync(path.join(root,'worker.mjs'),'utf8')};
}
async function uploadAssetBuckets({accountId,session,files,fetcher=fetch}){
 if(!/^[a-f0-9]{32}$/.test(accountId)||!session||typeof session.jwt!=='string'||!Array.isArray(session.buckets))throw Error('Invalid upload session');
 const seen=new Set();for(const bucket of session.buckets){if(!Array.isArray(bucket)||!bucket.length)throw Error('Invalid upload bucket');for(const hash of bucket){if(!/^[a-f0-9]{32}$/.test(hash)||!files[hash]||seen.has(hash))throw Error('Unexpected asset hash');seen.add(hash);}}
 if(!session.buckets.length)return{jwt:session.jwt,uploaded:0};
 let completion;
 for(const bucket of session.buckets){
  const form=new FormData();for(const hash of bucket){const file=files[hash],bytes=fs.readFileSync(file.path);if(bytes.length!==file.size||crypto.createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('Asset changed during upload');form.append(hash,new Blob([bytes.toString('base64')],{type:file.mime}),hash);}
  const response=await fetcher('https://api.cloudflare.com/client/v4/accounts/'+accountId+'/workers/assets/upload?base64=true',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+session.jwt},body:form});
  let result;try{result=await response.json();}catch{throw Error('Cloudflare asset upload returned non-JSON status '+response.status);}
  if(!response.ok||!result.success)throw Error('Cloudflare asset upload failed (HTTP '+response.status+', code '+(result.errors?.[0]?.code||'unknown')+')');
  if(typeof result.result?.jwt==='string')completion=result.result.jwt;
 }
 if(!completion)throw Error('Cloudflare did not return an asset completion token');return{jwt:completion,uploaded:seen.size};
}
function workerMetadata(prepared,completionJwt){
 if(typeof completionJwt!=='string'||!completionJwt)throw Error('Missing asset completion token');
 return{main_module:'worker.mjs',compatibility_date:prepared.config.compatibility_date,compatibility_flags:prepared.config.compatibility_flags,
  bindings:[{type:'assets',name:'ASSETS'},{type:'plain_text',name:'GAME_BUILD',text:prepared.release.build}],
  assets:{jwt:completionJwt,config:{_headers:prepared.headers,html_handling:'auto-trailing-slash',not_found_handling:'none',run_worker_first:['/health']}},
  cache_options:{enabled:false},observability:{enabled:true,head_sampling_rate:.01}};
}
if(require.main===module){
 (async()=>{const [directory,sessionFile,completionFile]=process.argv.slice(2);if(!directory||!sessionFile||!completionFile)throw Error('Usage: node scripts/cloudflare-assets.cjs <built-package> <private-session.json> <private-completion.json>');
  const prepared=prepareAssetUpload(directory),session=JSON.parse(fs.readFileSync(sessionFile,'utf8')),result=await uploadAssetBuckets({accountId:session.accountId,session:session.result,files:prepared.files});
  fs.writeFileSync(completionFile,JSON.stringify({jwt:result.jwt}),{mode:0o600});console.log(JSON.stringify({uploaded:result.uploaded,build:prepared.release.build,completionSaved:true}));
 })().catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={prepareAssetUpload,uploadAssetBuckets,workerMetadata};
