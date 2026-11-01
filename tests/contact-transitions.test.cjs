const test=require('node:test'),assert=require('node:assert/strict');
const {fresh,supportedPose,run,state}=require('../scripts/measure-contact-control.cjs');
function input(s,value){Object.assign(s.c.inp,{thr:1,pitch:1,steer:0,yaw:0,roll:0,boost:0,ps:0},value);}
function tick(s,n=1){for(let k=0;k<n;k++)s.a.stepCar(s.c,s.a.DT);return s.c.controlTrace;}
function angularYaw(s){return-s.c.w.clone().applyQuaternion(s.c.q).dot(s.c.n);}

test('contact regression: one and two real wheel contacts retain bounded steering authority instead of dropping yaw to zero',()=>{
 const results=[];for(const [roll,pitch,wheels]of [[.3,.15,1],[0,.15,2],[.1,.1,3],[0,0,4]]){const s=fresh();supportedPose(s,roll,pitch);input(s,{steer:1,yaw:1});const before=s.c.wy,tr=tick(s),after=s.c.ground?s.c.wy:angularYaw(s);assert.equal(s.c.wheelsOn,wheels);assert.ok(after>before,'first supported tick must respond to steering');assert.equal(tr.branch,wheels<3?'partial':'stable');assert.equal(tr.recoveryTorque,0,'wheel steering must not compete with hull autoroll');assert.equal(s.c.canJ,wheels>=3?1:0);results.push(after);}
 assert.ok(results[0]<results[1]&&results[1]<results[2],'partial contacts do not receive full four-wheel steering');assert.ok(Math.abs(results[2]-results[3])<1e-10,'three/four wheel stable driving remains identical');
});

test('contact regression: a brief actual support loss transfers yaw momentum and never grants phantom tire traction',()=>{
 const s=fresh();s.c.p.y=s.a.bodyPhysics(s.c).height+.145;input(s,{steer:1,yaw:1});const before=s.c.wy,tr=tick(s);assert.equal(s.c.wheelsOn,0);assert.equal(s.c.ground,0);assert.equal(s.c.wasG,false);assert.equal(s.c.canJ,0);assert.equal(tr.branch,'air');assert.equal(tr.traction,0);assert.ok(angularYaw(s)>before*.9,'support loss must not discard existing turning momentum');assert.ok(s.c.v.y<0,'a real departure remains subject to gravity');
});

test('contact regression: deliberate jump input immediately relinquishes tire steering even while sampled wheels are near the field',()=>{
 const s=fresh();input(s,{steer:1,yaw:1});s.c.jp=s.c.jh=1;const tr=tick(s);assert.ok(s.c.jl>0);assert.equal(s.c.ground,0);assert.equal(s.c.wasG,false);assert.equal(tr.branch,'air');assert.equal(tr.traction,0);assert.ok(s.c.v.y>2);assert.equal(s.c.canJ,0);assert.equal(s.c.canD,1);
});

test('control regression: explicit roll remains available on a partial contact and suppresses competing recovery torque',()=>{
 const poses=[];for(const roll of [-1,0,1]){const s=fresh();supportedPose(s,.3,.15);s.c.wy=0;input(s,{roll});for(let k=0;k<20;k++){const tr=tick(s);if(roll)assert.equal(tr.recoveryTorque,0);assert.ok(s.a.carPenetration(s.c)<.005);}poses.push(s.c.q.clone());}assert.ok(poses[0].angleTo(poses[1])>.05&&poses[1].angleTo(poses[2])>.05,'opposed explicit inputs must produce distinct constrained trajectories');
});

test('landing regression: diagonal/side landings regain supported driving with no ordinary-control gap and bounded penetration',()=>{
 for(const name of ['side-landing','diagonal-landing']){const r=run(name,'current',240,true);assert.equal(r.noControllerSeconds,0);assert.ok(r.firstStableSupport!==null);assert.ok(r.firstStableSupport-r.firstWheelContact<.75,'wheel touchdown must recover ordinary supported driving promptly');assert.ok(r.final.ground);assert.ok(r.final.speed>5,'recovery retains useful forward momentum');assert.ok(r.maxPenetration<.005);for(const f of r.trace)assert.ok(['air','partial','stable','hull','dodge','auto-flip'].includes(f.branch));}
});

test('contact regression: real two-tire collision interrupts inward flip actuation without resetting the second jump early',()=>{
 const s=fresh();s.c.p.y=.31;s.c.q.setFromAxisAngle(new s.T.Vector3(0,0,1),.2);s.c.v.set(5,-1,0);s.c.ground=s.c.wasG=0;s.c.wy=0;s.c.jp=1;input(s,{thr:0,pitch:1});tick(s);let stop=null,reset=null;for(let k=0;k<120;k++){input(s,{thr:0,pitch:0});const tr=tick(s);if(tr.tireDodgeStop&&!stop){stop={time:(k+2)*s.a.DT,wheels:s.c.wheelsOn,canD:s.c.canD};assert.ok(s.c.wheelsOn<3);assert.equal(s.c.canD,0,'partial constraint cannot award a jump reset');assert.equal(s.c.dT,0);}if(s.c.ground){reset=(k+2)*s.a.DT;assert.equal(s.c.canD,1);break;}}assert.ok(stop,'actual tire collision must constrain inward scripted rotation');assert.ok(reset!==null&&reset<.75);assert.ok(s.c.v.x>8,'the dodge momentum is retained instead of flattening motion');
 const hovering=fresh();hovering.c.p.y=3;hovering.c.ground=hovering.c.wasG=0;hovering.c.canJ=0;hovering.c.canD=1;hovering.c.jp=1;input(hovering,{thr:0,pitch:1});tick(hovering,20);assert.ok(hovering.c.dT>0,'no phantom surface may terminate a genuine aerial flip');
});

test('recovery regression: neutral roof contact stays neutral while an explicit roof jump can recover',()=>{
 const s=fresh();s.c.p.y=.7;s.c.q.setFromAxisAngle(new s.T.Vector3(1,0,0),Math.PI);s.c.v.set(0,0,0);s.c.wy=0;s.c.ground=s.c.wasG=0;input(s,{thr:0,pitch:0});for(let k=0;k<120;k++){const tr=tick(s);assert.equal(tr.recoveryTorque,0);assert.ok(s.a.carPenetration(s.c)<.005);}assert.ok(new s.T.Vector3(0,1,0).applyQuaternion(s.c.q).y<-.98);s.c.jp=1;tick(s,180);assert.ok(s.c.ground);assert.ok(new s.T.Vector3(0,1,0).applyQuaternion(s.c.q).y>.98);
});

test('combined regression: wall-to-floor, corner traversal and impact followed by steering retain control and containment',()=>{
 for(const name of ['wall-floor','corner-drive','ball-hit-steer','jump-drive-land']){const r=run(name,'current',360,true);assert.equal(r.noControllerSeconds,0);assert.ok(r.maxPenetration<.005);assert.ok(r.final.speed>1);assert.ok(r.final.p.every(Number.isFinite));if(name==='wall-floor'){assert.ok(r.final.normal[1]>.9);assert.ok(r.final.p[1]<1);}if(name==='ball-hit-steer'){assert.ok(r.samples[1].actualYaw>.1);assert.ok(Math.abs(r.final.heading)>.1);}}
});

test('determinism: complete partial-contact and recovery input sequences agree across render frame groupings',()=>{
 const results=[];for(const hz of [30,60,120]){const s=fresh();supportedPose(s,.3,.15);let tickIndex=0;for(let frame=0;frame<hz*2;frame++)for(let sub=0;sub<120/hz;sub++,tickIndex++){input(s,{steer:tickIndex<80?.8:-.4,yaw:tickIndex<80?.8:-.4,ps:tickIndex>=40&&tickIndex<90?1:0,boost:tickIndex>=120?1:0});if(tickIndex===140)s.c.jp=1;tick(s);}results.push(JSON.stringify(state(s)));}assert.equal(results[0],results[1]);assert.equal(results[1],results[2]);
});

test('developer contact instrumentation is opt-in and is never serialized as persistent gameplay state',()=>{
 const s=fresh();s.window.__NIVET_CONTROL_TRACE__=false;delete s.c.controlTrace;input(s,{});tick(s);assert.equal(s.c.controlTrace,undefined);s.window.__NIVET_CONTROL_TRACE__=true;tick(s);assert.ok(s.c.controlTrace.input);assert.ok(s.c.controlTrace.normal);assert.equal(s.a.packDriver(s.c).controlTrace,undefined);assert.equal(s.a.packDriver(s.c).s.controlTrace,undefined);
});
