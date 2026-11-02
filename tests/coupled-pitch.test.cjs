const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function setup(){const g=load({source:true}),a=g.api,c=a.cars[0];g.window.__NIVET_CONTROL_TRACE__=true;a.configureCars();a.setState({st:'PLAY',sandbox:true});for(const other of a.cars)other.enabled=other===c;a.resetCar(c,0,0);c.q.identity();c.v.x=8;return{g,a,c,T:a.THREE};}
function up(s){return new s.T.Vector3(0,1,0).applyQuaternion(s.c.q).y;}
function keyboardStep(s,tick,{heldJump=false,freshPitch=false,flip=false,steerAfter=Infinity}={}){
 const {a,c}=s,released=freshPitch&&tick>=30&&tick<36;a.keys.w=released?0:1;a.keys.d=tick>=steerAfter?1:0;a.human(c);c.jp=tick===12||flip&&tick===36?1:0;c.jh=tick>=12&&tick<(heldJump?36:13)?1:0;a.stepCar(c,a.DT);
}

test('input intent: only the digital driving axis that wins input mixing is tagged as coupled pitch',()=>{
 const s=setup(),{a,c}=s;a.keys.w=1;a.setPad({thr:.4,pitch:-.8});a.human(c);assert.equal(c.inp.thr,1);assert.equal(c.inp.pitch,1);assert.equal(c.inp.coupledPitch,1);
 a.keys.w=0;a.human(c);assert.equal(c.inp.thr,.4);assert.equal(c.inp.pitch,-.8);assert.equal(c.inp.coupledPitch,0);
 a.keys.arrowdown=1;a.human(c);assert.equal(c.inp.pitch,-1);assert.equal(c.inp.coupledPitch,1);
 a.keys.arrowdown=0;a.keys.w=a.keys.s=1;a.human(c);assert.equal(c.inp.pitch,-.8);assert.equal(c.inp.coupledPitch,0,'opposed digital keys leave the independent analog axis in control');
 a.keys.w=a.keys.s=0;a.setPad({thr:0,pitch:0});Object.assign(a.touchInput,{active:true,thr:.7,pitch:.7});a.human(c);assert.equal(c.inp.pitch,.7);assert.equal(c.inp.coupledPitch,0,'touch interpretation is preserved by this keyboard repair');
});

for(const heldJump of [false,true])test('ordinary keyboard '+(heldJump?'held':'tap')+' jump carries driving intent, stays airborne without traction and lands ready to steer',()=>{
 const s=setup(),{a,c}=s;let airborne=0,landing=null,lowestUp=1,maxSteering=0;for(let tick=0;tick<300;tick++){
  keyboardStep(s,tick,{heldJump,steerAfter:heldJump?210:110});lowestUp=Math.min(lowestUp,up(s));
  if(tick>12&&!c.ground){airborne++;assert.equal(c.controlTrace?.traction||0,0,'a deliberate jump must not receive tire grip');}
  if(tick>20&&c.ground&&landing===null)landing=tick;
  if(landing!==null&&tick>landing)maxSteering=Math.max(maxSteering,Math.abs(c.wy));
 }
 assert.ok(airborne>90,'the jump follows a real unsupported arc');assert.ok(landing!==null&&landing<240,'the normal jump reaches useful support inside two seconds');assert.ok(lowestUp>.98,'holding accelerate must not turn a basic jump into a roof landing');assert.ok(maxSteering>.5,'the driver can turn immediately after landing');assert.ok(c.ground&&c.wheelsOn>=3);assert.ok(c.v.length()>5,'recovery retains useful driving momentum');assert.ok(a.carPenetration(c)<.005);
});

test('a fresh keyboard pitch press in flight and an independent controller axis retain actual aerial rotation',()=>{
 const held=setup(),fresh=setup();for(let tick=0;tick<61;tick++){keyboardStep(held,tick);keyboardStep(fresh,tick,{freshPitch:true});}
 assert.ok(Math.abs(held.c.w.z)<1e-8);assert.ok(fresh.c.w.z<-2,'release/repress explicitly starts sustained aerial pitch');assert.ok(up(fresh)<up(held)-.03);
 const independent=setup(),untagged=setup(),freshAir=setup();for(const s of [independent,untagged,freshAir]){s.c.p.y=6;s.c.wasG=s.c.ground=0;s.c.v.set(0,0,0);}
 for(let tick=0;tick<24;tick++){
  independent.a.setPad({pitch:1,thr:1});independent.a.human(independent.c);Object.assign(untagged.c.inp,{pitch:1,thr:1,coupledPitch:0});freshAir.a.keys.w=1;freshAir.a.human(freshAir.c);independent.a.stepCar(independent.c,independent.a.DT);untagged.a.stepCar(untagged.c,untagged.a.DT);freshAir.a.stepCar(freshAir.c,freshAir.a.DT);
 }
 assert.equal(independent.c.inp.coupledPitch,0);assert.ok(independent.c.w.z<-2);assert.ok(independent.c.q.angleTo(untagged.c.q)<1e-6);assert.ok(independent.c.w.distanceTo(untagged.c.w)<1e-10,'the independent controller path retains its existing response');
 assert.equal(freshAir.c.inp.coupledPitch,1);assert.equal(freshAir.c.carriedPitch,0);assert.ok(freshAir.c.w.distanceTo(independent.c.w)<1e-10,'a fresh airborne keyboard press retains the same full pitch response');
});

test('carried driving pitch leaves raw front-dodge direction and deliberate flip cancellation intact',()=>{
 const plain=setup();let phaseSeen=false;for(let tick=0;tick<120;tick++){keyboardStep(plain,tick,{flip:true});if(tick===36){assert.ok(plain.c.dT>0);assert.ok(plain.c.flipAxis.z<-.9);phaseSeen=true;}}
 assert.ok(phaseSeen);assert.ok(up(plain)>.95,'an ordinary front flip finishes without continued inherited pitch');
 // Directly exercise opposite input inside an active phase: no second linear impulse.
 const a=setup(),b=setup();for(const s of [a,b]){s.c.p.y=6;s.c.ground=s.c.wasG=0;s.c.jp=1;Object.assign(s.c.inp,{pitch:1,coupledPitch:1,thr:1});s.a.stepCar(s.c,s.a.DT);s.c.jp=0;}
 const before=a.c.v.x;for(let k=0;k<12;k++){a.c.inp.pitch=-1;b.c.inp.pitch=1;a.a.stepCar(a.c,a.a.DT);b.a.stepCar(b.c,b.a.DT);}assert.ok(Math.abs(a.c.w.z)<Math.abs(b.c.w.z)*.7);assert.ok(Math.abs(a.c.v.x-b.c.v.x)<.1);assert.ok(a.c.v.x<before+1,'cancel does not manufacture another dodge launch');
});

test('the carried-pitch state roundtrips through authoritative driver packets and rejects malformed intent',()=>{
 const {a,c}=setup();a.keys.w=1;a.human(c);a.stepCar(c,a.DT);assert.equal(c.carriedPitch,1);const packet=JSON.parse(JSON.stringify(a.packDriver(c)));assert.equal(packet.s.carriedPitch,1);c.carriedPitch=-1;a.readDriver(c,packet);assert.equal(c.carriedPitch,1);
 for(const value of [Infinity,NaN,.5,2,true,'1']){a.readDriver(c,{s:{carriedPitch:value}});assert.equal(c.carriedPitch,1);}a.readDriver(c,{s:{carriedPitch:0}});assert.equal(c.carriedPitch,0);a.resetCar(c,0,0);assert.equal(c.carriedPitch,0);
});

test('keyboard takeoff, release/repress and landing remain identical across display frame groupings',()=>{
 const outcomes=[];for(const fps of [30,60,120]){const s=setup();let tick=0;for(let frame=0;frame<fps*2.5;frame++)for(let k=0;k<120/fps;k++,tick++)keyboardStep(s,tick,{freshPitch:true,steerAfter:210});const c=s.c;outcomes.push({p:c.p.toArray(),v:c.v.toArray(),w:c.w.toArray(),q:c.q.toArray(),wy:c.wy,ground:c.ground,wheels:c.wheelsOn,carriedPitch:c.carriedPitch});}assert.equal(JSON.stringify(outcomes[0]),JSON.stringify(outcomes[1]));assert.equal(JSON.stringify(outcomes[1]),JSON.stringify(outcomes[2]));
});
