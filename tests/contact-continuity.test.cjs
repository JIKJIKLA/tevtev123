const test=require('node:test'),assert=require('node:assert/strict');
const {fresh,run,angularCycle,stepRecord,pose}=require('../scripts/measure-contact-continuity.cjs');

test('loaded four-wheel curve contacts cannot become free flight solely from center outward velocity',()=>{
 const result=run('wall-return');assert.equal(result.loadedAirTicks,0);assert.ok(result.maxAngular<.2,'continuous actual tire support bounds curve-frame adjustment without an input latch');assert.ok(result.final.ground&&result.final.up>.99);assert.ok(result.maxPenetration<.005);
 // This uses the integrated wall-to-floor trajectory, not a synthetic gate value.
 const loadedFast=result.trace.filter(t=>t.gate.wheels>=3&&t.gate.minGap<=.015&&t.gate.outward>1);assert.ok(loadedFast.length>0,'the reproduced center-velocity counterexample remains exercised');for(const t of loadedFast)assert.equal(t.branch,'stable');
});

test('the actual-tip exception releases unsupported outward motion and never keeps tire force after a deliberate jump',()=>{
 const extended=run('outward-extended','current',0,23,15);assert.equal(extended.first.branch,'air');assert.equal(extended.first.traction,0);assert.equal(extended.trace[1].wheels,0);
 const loaded=run('outward-loaded','current',0,23,15);assert.equal(loaded.first.branch,'stable');assert.equal(loaded.trace[1].branch,'air');assert.equal(loaded.trace[1].traction,0);assert.ok(loaded.trace.slice(3).every(t=>!t.wheels&&t.traction===0),'a brief real loaded tip cannot latch traction into clear air');
 const jumped=run('deliberate-jump','current',0,23,40),takeoff=jumped.trace[12];assert.ok(takeoff.gate.wheels>=3);assert.equal(takeoff.branch,'air');assert.equal(takeoff.traction,0);assert.ok(jumped.trace.slice(12).every(t=>t.traction===0));
});

test('brief physical support loss preserves responsive input without phantom traction or an indefinite pitch latch',()=>{
 const result=run('brief-bounce');const airborne=result.trace.filter(t=>t.tick>=20&&t.branch==='air');assert.ok(airborne.length>0);assert.ok(airborne.every(t=>t.traction===0));assert.ok(result.maxAngular<.5,'the short actual departure remains recoverable instead of accumulating a roof flip');assert.ok(result.final.ground&&result.final.up>.99);
});

test('all three bodies keep loaded curve contact and recover field driving over a useful speed range',()=>{
 for(const body of [0,1,2])for(const speed of [8,14,23]){const r=run('wall-return','current',body,speed,240);assert.equal(r.loadedAirTicks,0,'body '+body+' speed '+speed);assert.ok(r.maxPenetration<.005);assert.ok(r.final.up>.98&&r.final.ground);assert.ok(Math.hypot(...r.final.v)>1,'the return must retain driving momentum');}
});

test('repeated stable-partial-air-partial-stable classification preserves one angular store on floor and walls',()=>{
 for(const surface of ['floor','wall'])for(const body of [0,1,2]){const r=angularCycle(surface,body);assert.ok(r.maximumYawError<1e-9,'no duplicated/reversed yaw: '+surface+'/'+body);assert.deepEqual(r.trace.slice(0,5).map(t=>t.wheels),[4,2,0,2,4]);for(const t of r.trace)if(t.ground)assert.equal(Math.hypot(...t.w),0,'stable yaw lives in wy exactly once');}
});

test('contact-point impulse reads the current angular representation with the same sign in ground and air',()=>{
 const results=[];for(const ground of [1,0]){const s=fresh(),{a,c,T}=s;c.p.set(0,3,0);c.q.setFromAxisAngle(new T.Vector3(0,1,0),.4);c.n.set(0,1,0);c.ground=ground;c.v.set(10,0,0);c.wy=1.2;if(ground)c.w.set(0,0,0);else c.w.set(0,-1.2,0).applyQuaternion(c.q.clone().invert());a.ball.p.set(1,3,.3);a.ball.v.set(0,0,0);a.ball.w.set(0,0,0);const approach=a.applyBallCarImpulse(c,new T.Vector3(1,0,0),new T.Vector3(.6,0,.3),new T.Vector3(1,0,.3));assert.ok(Math.abs(approach-9.64)<1e-9,'contact velocity includes existing supported yaw');const yaw=ground?c.wy:-c.w.clone().applyQuaternion(c.q).dot(c.n);results.push({approach,yaw,v:c.v.toArray(),ball:a.ball.v.toArray()});}for(const key of ['approach','yaw'])assert.ok(Math.abs(results[0][key]-results[1][key])<1e-9);for(const key of ['v','ball'])for(let k=0;k<3;k++)assert.ok(Math.abs(results[0][key][k]-results[1][key][k])<1e-9);
});

test('fixed contact, jump and steering trajectory is independent of render frame grouping',()=>{
 const results=[];for(const hz of [30,60,120]){const s=fresh(),{a,c}=s;pose(s,'wall-return',14);let tick=0;for(let frame=0;frame<hz*2;frame++)for(let k=0;k<120/hz;k++,tick++){Object.assign(c.inp,{thr:-1,pitch:-1,steer:tick>90?.5:0,yaw:tick>90?.5:0,coupledPitch:1});if(tick===160)c.jp=1;c.jh=tick>=160&&tick<166?1:0;stepRecord(s,tick);}results.push(JSON.stringify({p:c.p.toArray(),q:c.q.toArray(),v:c.v.toArray(),w:c.w.toArray(),wy:c.wy,carriedPitch:c.carriedPitch,ground:c.ground,wheels:c.wheelsOn}));}assert.equal(results[0],results[1]);assert.equal(results[1],results[2]);
});
