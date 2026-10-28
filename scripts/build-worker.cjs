// Package the exact browser build as a Cloudflare static asset plus small JS.
// It never deploys, creates resources, changes billing or uploads credentials.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),MAX_ASSET=25*1024*1024;
function buildWorker({htmlPath=path.join(root,'index.html'),directory=path.resolve(root,'../../outputs/nivet-cloudflare'),build=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version}={}){
 const source=path.resolve(htmlPath),output=path.resolve(directory),stat=fs.statSync(source);
 if(!stat.isFile()||stat.size>MAX_ASSET)throw Error('The game must be a file no larger than Cloudflare’s 25 MiB static-asset limit.');
 const html=fs.readFileSync(source);
 if(!/<title>Nivet League\b/.test(html.toString())||html.includes(Buffer.from('<!-- INLINE:')))throw Error('Build the portable Nivet game first: node scripts/build.cjs');
 const sha256=crypto.createHash('sha256').update(html).digest('hex'),config=JSON.parse(fs.readFileSync(path.join(root,'cloudflare/wrangler.jsonc'),'utf8'));
 config.vars.GAME_BUILD=String(build);fs.mkdirSync(path.join(output,'public'),{recursive:true});
 fs.copyFileSync(source,path.join(output,'public/index.html'));
 for(const file of ['worker.mjs','worker-paste.mjs'])fs.copyFileSync(path.join(root,'cloudflare',file),path.join(output,file));
 fs.copyFileSync(path.join(root,'cloudflare/headers.txt'),path.join(output,'public/_headers'));
 fs.writeFileSync(path.join(output,'wrangler.jsonc'),JSON.stringify(config,null,2)+'\n');
 const manifest={game:'Nivet League',build:String(build),bytes:html.length,sha256,staticAssetLimit:MAX_ASSET,multiplayer:'wss://tevin-161-153-26-154.sslip.io/play',deployment:'prepared locally; not deployed'};
 fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(output,'public/release.json'),JSON.stringify({game:manifest.game,build:manifest.build,sha256})+'\n');
 return{directory:output,...manifest};
}
if(require.main===module){try{console.log(JSON.stringify(buildWorker(process.argv[2]?{directory:process.argv[2]}:{}),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={buildWorker,MAX_ASSET};
