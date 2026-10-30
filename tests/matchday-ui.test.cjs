const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),load=require('./harness.cjs');
function menu(){
 const g=load({source:true,full:true}),a=g.api,d=g.document;a.INTRO.active=false;a.LOADING.active=false;d.getElementById('intro').hidden=true;for(const child of d.getElementById('menu').children)child.inert=false;g.window.setTimeout=fn=>{fn();return 0;};a.setState({st:'MENU'});return{...g,a,d};
}
test('matchday player strip reflects real local name, earned title and XP without interpreting markup',()=>{
 const g=menu(),ctx=vm.createContext({SOC:{name:'<img src=x> DRIVER'},RIVAL_PREF:{title:'AERIAL ACE'},CAREER:{xp:1375},document:g.d,$:id=>g.d.getElementById(id)});vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/scene-ready.js'),'utf8')+'\nthis.sync=syncMenuDriver;',ctx);ctx.sync();
 const strip=g.d.querySelector('.menu-player-strip');assert.ok(strip);assert.equal(g.d.getElementById('menu-player-name').textContent,'<img src=x> DRIVER');assert.equal(g.d.getElementById('menu-player-name').querySelector('img'),null);assert.equal(g.d.getElementById('menu-player-title').textContent,'AERIAL ACE');assert.equal(g.d.getElementById('menu-player-level').textContent,'3');assert.equal(strip.style.getPropertyValue('--career-progress'),'75%');
 ctx.SOC.name='';ctx.CAREER.xp=1500;ctx.sync();assert.equal(g.d.getElementById('menu-player-name').textContent,'DRIVER');assert.equal(g.d.getElementById('menu-player-level').textContent,'4');assert.equal(strip.style.getPropertyValue('--career-progress'),'0%');
});
test('each illustrated destination keeps its real route and detached launch action',async()=>{
 const g=menu();await g.a.openPlaySelection();const buttons=Array.from(g.d.querySelectorAll('#play-panel .destination-tabs button'));assert.deepEqual(buttons.map(b=>b.id),['choose-quick','choose-offline','choose-online','choose-training']);
 for(const [route,target] of [['quick','quick-find'],['offline','go'],['online','host-match'],['training','sandbox-start']]){
  g.d.getElementById('choose-'+route).onclick();if(route==='online')g.d.getElementById('private-create').onclick();g.a.updateDeviceUI();assert.equal(buttons.filter(b=>b.getAttribute('aria-pressed')==='true').length,1);assert.equal(g.d.getElementById('choose-'+route).getAttribute('aria-pressed'),'true');assert.equal(g.a.getState().st,'MENU','Selecting a card unexpectedly launched the game');assert.equal(g.d.getElementById('mobile-playbar').hidden,false);
  const launch=g.d.getElementById(target),handler=launch.onclick;let count=0;launch.onclick=()=>count++;g.d.getElementById('mobile-play').onclick();assert.equal(count,1,route+' launched the wrong action');launch.onclick=handler;
 }
 assert.equal(buttons.some(b=>/COMPETITIVE|TOURNAMENT|ITEM SHOP/.test(b.textContent)),false,'Unimplemented destinations must not appear as functional cards');
});
test('player and party strip add no duplicated interactive IDs and do not displace the one launch action',()=>{
 const g=menu(),ids=new Set();for(const element of g.d.querySelectorAll('[id]')){assert.equal(ids.has(element.id),false,'Duplicate ID '+element.id);ids.add(element.id);}
 assert.equal(g.d.querySelectorAll('#party-toggle').length,1);assert.equal(g.d.querySelectorAll('#mobile-playbar').length,1);assert.equal(g.d.querySelectorAll('#mobile-play').length,1);assert.equal(g.d.querySelector('.menu-player-strip').querySelectorAll('button,input,select,[tabindex]').length,0,'Read-only profile data must not insert dead focus stops');assert.ok(g.d.getElementById('menu-player-name'));assert.ok(g.d.getElementById('menu-back'));
});
test('the bundled display font is an actual WOFF2 with redistributable license and local source',()=>{
 const root=path.resolve(__dirname,'..'),font=fs.readFileSync(path.join(root,'src/assets/rajdhani-medium.woff2')),license=fs.readFileSync(path.join(root,'src/assets/rajdhani-OFL.txt'),'utf8'),css=fs.readFileSync(path.join(root,'src/matchday-ui.css'),'utf8');assert.equal(font.subarray(0,4).toString('ascii'),'wOF2');assert.equal(font.length,15084);assert.match(license,/SIL OPEN FONT LICENSE Version 1\.1/);assert.ok(css.includes(license.trim()),'Portable CSS must retain the complete font license');assert.match(css,/src:url\('UIFONT:rajdhani'\) format\('woff2'\)/);assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g,''),/@import|url\(['"]?https?:\/\//);assert.equal((css.match(/background-image:url\("data:image\/svg\+xml,/g)||[]).length,4);
});
