const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'src',name),'utf8');
let html=read('shell.html');
for(const name of ['base','blue','orange'])html=html.replaceAll('HUD:'+name,'data:image/png;base64,'+fs.readFileSync(path.join(root,'src/hud',name+'.png')).toString('base64'));
html=html.replace('<!-- INLINE:menu-design.css -->',()=>read('menu-design.css')+'\n'+read('gauges.css')+'\n'+read('presentation-upgrade.css'));
html=html.replace('<!-- INLINE:precision.css -->',()=>read('precision.css')+'\n'+read('aftershock.css')+'\n'+read('rivals.css')+'\n'+read('cinematics.css')+'\n'+read('secret.css')+'\n'+read('paint.css')+'\n'+read('celebration.css')+'\n'+read('device.css'));
for(const file of ['bootstrap.js','engine.bundle.js','game.js']) {
 // The recovered 8.2 artifact retains the original bundled engine and embedded assets.
 // Keep it byte-for-byte: it is also the release recovery copy.
 let code=file==='engine.bundle.js'?[...read('legacy-8.2.html').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)][1][1]:read(file);
 code=code.replace(/\/\/ INLINE:([\w.-]+\.js)/g,(_,part)=>read(part));
 code=code.replace('SKY:stadium',()=> 'data:image/jpeg;base64,'+fs.readFileSync(path.join(root,'src/assets/stadium-clouds-2k.jpg')).toString('base64'));
 if(file==='engine.bundle.js')code=require('./patch-grass.cjs')(code);
 new vm.Script(code,{filename:file});
 html=html.replace('<!-- INLINE:'+file+' -->',()=>code);
}
if(/<!-- INLINE:|\/\/ INLINE:/.test(html))throw Error('Unresolved build include');
fs.writeFileSync(path.join(root,'index.html'),html);
console.log('Built portable index.html ('+(Buffer.byteLength(html)/1e6).toFixed(2)+' MB)');
