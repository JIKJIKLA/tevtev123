const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('automatic graphics are independent of Chromebook quality; fallback uses a fresh canvas',async()=>{
 const {api:a}=load();let count=0,first;
 const result=await a.rendererWithFallback((canvas,force)=>{first=canvas;assert.equal(force,false);throw Error('WebGPU and default WebGL failed');},()=>({id:++count}),canvas=>{assert.notEqual(canvas,first);return 'compatible';});
 assert.equal(result,'compatible');assert.equal(count,2);
});
test('graphics exhaustion reports both failures; explicit WebGL preference is respected',async()=>{
 const {api:a}=load();await assert.rejects(a.rendererWithFallback((canvas,force)=>{assert.equal(force,true);throw Error('first');},()=>({}),()=>{throw Error('second');},true),/first \/ second/);
});
test('title Play opens selection without a graphics device, then lobby return clears loading gate',async()=>{
 const g=load({full:true});g.window.setTimeout=fn=>{fn();return 0};
 await g.api.openPlaySelection();assert.equal(g.api.LOADING.active,false);assert.equal(g.document.getElementById('intro').hidden,true);assert.equal(g.document.getElementById('play-panel').hidden,false);
 const children=Array.from(g.document.getElementById('play-panel').children);assert.ok(children.findIndex(e=>e.id==='mode-rows')<children.findIndex(e=>e.className==='destination-tabs'));
 await g.api.quit();assert.equal(g.api.LOADING.active,false);assert.equal(g.document.getElementById('home-panel').hidden,false);
});
test('spectrum separates bass from treble and a bass hit decays instead of flashing constantly',()=>{
 const {api:a}=load(),bins=new Uint8Array(1024);bins[3]=255;assert.ok(a.spectrumEnergy(bins,48000,2048,30,160)>.3);assert.equal(a.spectrumEnergy(bins,48000,2048,3000,8000),0);
 const state={level:0,average:.1,pulse:0,lastBeat:-1};a.advanceMusicEnvelope(state,.8,1/30,1);assert.ok(state.pulse>.5);const peak=state.pulse;
 for(let i=1;i<31;i++)a.advanceMusicEnvelope(state,0,1/30,1+i/30);assert.ok(state.pulse<peak*.01);assert.ok(Number.isFinite(state.level));
});
