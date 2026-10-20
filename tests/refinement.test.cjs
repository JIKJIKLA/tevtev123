const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('a stationary uphill wall car can accelerate away from gravity rollback',()=>{
 const a=load().api;a.configureCars();const c=a.cars[0];a.resetCar(c,0,0);c.p.set(40.96-.1851,8,0);c.q.setFromAxisAngle(new a.THREE.Vector3(0,0,1),Math.PI/2);c.n.set(-1,0,0);c.wasG=true;c.v.set(0,0,0);c.inp.thr=1;
 for(let k=0;k<120;k++){a.stepCar(c,a.DT);assert.ok(a.carPenetration(c)<.02)}assert.ok(c.p.y>10,'wall car stalled at '+c.p.y);assert.ok(c.v.y>3);
});
test('car art retains native proportions instead of independent axis stretching',()=>{
 const g=load(),a=g.api,E=g.window.TevinEngine;for(let body=0;body<3;body++){const visual=E.importedCar({isWebGPURenderer:false},['octane','fennec','dominus'][body],0x55aaff);a.fitCarVisual(visual,{body});assert.equal(visual.scale.x,visual.scale.y);assert.equal(visual.scale.x,visual.scale.z)}
});
test('fresh visits and Play cannot opt into music; Settings persists the explicit choice',async()=>{
 const g=load({full:true});g.window.setTimeout=fn=>{fn();return 0};assert.equal(g.api.INTRO.enabled,false);assert.equal(g.api.INTRO.media,null);await g.api.introPlay();assert.equal(g.api.INTRO.media,null);
 const toggle=g.document.getElementById('music-enabled');toggle.checked=true;toggle.onchange();assert.equal(g.storage.get('tevin-music-enabled-v1'),'true');toggle.checked=false;toggle.onchange();assert.equal(g.api.INTRO.enabled,false);assert.equal(g.storage.get('tevin-music-enabled-v1'),'false');
});

test('saved music opt-in restores on next visit while legacy volume never opts in',()=>{assert.equal(load({full:true,storage:{'tevin-music-enabled-v1':'true'}}).api.INTRO.enabled,true);assert.equal(load({full:true,storage:{'tevin-intro-v2':JSON.stringify({music:1})}}).api.INTRO.enabled,false)});
