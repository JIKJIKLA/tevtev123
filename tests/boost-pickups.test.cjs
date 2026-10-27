const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function scene(){const a=load().api,T=a.THREE,texture=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1),pads=a.PADS.map(p=>({...p})),visuals=a.createBoostPickupSet(pads,{soft:texture,orb:texture,curtain:texture}),camera=new T.PerspectiveCamera();return{a,T,pads,visuals,camera,tick:(dt,options={})=>a.tickBoostPickupSet(visuals,dt,{camera,playing:true,...options})};}
function transform(T,mesh,i){const m=new T.Matrix4(),position=new T.Vector3(),scale=new T.Vector3();mesh.getMatrixAt(i,m);position.setFromMatrixPosition(m);scale.setFromMatrixScale(m);return{position,scale,m};}
test('all standard boost positions match the documented 34-pad field in centimeters',()=>{
 const a=load().api,expected=[[0,-4240,0],[-1792,-4184,0],[1792,-4184,0],[-3072,-4096,1],[3072,-4096,1],[-940,-3308,0],[940,-3308,0],[0,-2816,0],[-3584,-2484,0],[3584,-2484,0],[-1788,-2300,0],[1788,-2300,0],[-2048,-1036,0],[0,-1024,0],[2048,-1036,0],[-3584,0,1],[-1024,0,0],[1024,0,0],[3584,0,1],[-2048,1036,0],[0,1024,0],[2048,1036,0],[-1788,2300,0],[1788,2300,0],[-3584,2484,0],[3584,2484,0],[0,2816,0],[-940,3308,0],[940,3308,0],[-3072,4096,1],[3072,4096,1],[-1792,4184,0],[1792,4184,0],[0,4240,0]];
 const actual=Array.from(a.PADS,p=>[Math.round(p.x*100),Math.round(p.z*100),p.big].join(':')).sort();assert.deepEqual(actual,expected.map(p=>p.join(':')).sort());assert.equal(new Set(actual).size,34);
});
test('pickup housings have raised solid geometry, and the complete field uses eight instanced batches',()=>{
 const {a,T,visuals,pads,tick}=scene();tick(0);assert.equal(visuals.group.children.length,8);assert.ok(visuals.group.children.every(m=>m.isInstancedMesh));assert.equal(visuals.base.count,34);assert.equal(visuals.orbs.count,6);
 for(const geometry of [a.boostBaseGeometry(),a.boostLensGeometry(),a.boostCurtainGeometry()]){geometry.computeBoundingBox();assert.ok(geometry.boundingBox.max.y-geometry.boundingBox.min.y>.025);for(const key of ['position','normal','uv'])assert.ok(Array.from(geometry.getAttribute(key).array).every(Number.isFinite));}
 for(let i=0;i<pads.length;i++){const base=transform(T,visuals.base,i);assert.ok(Math.abs(base.position.x-pads[i].x)<1e-5);assert.ok(Math.abs(base.position.z-pads[i].z)<1e-5);if(pads[i].big)assert.ok(transform(T,visuals.orbs,visuals.records[i].bigIndex).position.y>1.4);}
});
test('collection darkens the pad, removes the pill and curtains, preserves the metal base, and respawns once',()=>{
 const {T,pads,visuals,tick}=scene();tick(0);const i=3,before=Array.from(visuals.base.instanceMatrix.array);pads[i].t=10;tick(.016);assert.equal(visuals.eventSerial,1);assert.equal(transform(T,visuals.orbs,visuals.records[i].bigIndex).scale.x,0);assert.equal(transform(T,visuals.curtains,i).scale.x,0);assert.deepEqual(Array.from(visuals.base.instanceMatrix.array),before);assert.ok(visuals.life.some(x=>x>0));
 for(let k=0;k<40;k++){pads[i].t-=.03;tick(.03);}assert.equal(visuals.eventSerial,1);assert.equal(visuals.life.some(x=>x>0),false);
 pads[i].t=0;tick(.05);assert.equal(visuals.eventSerial,2);assert.ok(transform(T,visuals.orbs,visuals.records[i].bigIndex).scale.x>0);tick(.05);assert.equal(visuals.eventSerial,2);
});
test('late join and replay snapshots update visuals without invented pickups or modifying authority timers',()=>{
 const {T,pads,visuals,tick,a}=scene(),timers=pads.map(()=>0);timers[3]=8;const before=JSON.stringify(pads);tick(.016,{timers});assert.equal(visuals.eventSerial,0);assert.equal(transform(T,visuals.orbs,0).scale.x,0);
 timers[3]=0;tick(.016,{timers,events:false,playing:false});timers[3]=9;tick(.016,{timers,events:false,playing:false});tick(.016,{timers});assert.equal(visuals.eventSerial,0);assert.equal(JSON.stringify(pads),before);assert.equal(timers[3],9);
 a.configureCars();a.PADS[3].t=7;const snapshot=a.mpSnapshot(),frame=a.captureReplayFrame(snapshot,4);snapshot.pads[3]=0;assert.equal(frame.pads[3],7);assert.equal(a.PADS[3].t,7);
});
test('simultaneous pickups stay in a fixed particle pool and reduced motion hides animated effects',()=>{
 const {pads,visuals,tick}=scene();tick(0);pads.forEach(p=>p.t=10);tick(.016);assert.equal(visuals.eventSerial,34);assert.ok(visuals.motes.count<=192);assert.equal(visuals.life.length,128);pads.forEach(p=>p.t=0);tick(.016);assert.ok(visuals.motes.count<=192);tick(.016,{motion:false});assert.equal(visuals.motes.count,0);assert.equal(visuals.pulses.instanceMatrix.array[0],0);
});
