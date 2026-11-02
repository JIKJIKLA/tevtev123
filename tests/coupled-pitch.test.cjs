const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
// The10.6 latch policy was deliberately rejected: actual input now owns pitch
// immediately after a deliberate jump. Contact continuity owns tire stability.
function setup(){const g=load({source:true}),a=g.api,c=a.cars[0];g.window.__NIVET_CONTROL_TRACE__=true;a.configureCars();a.setState({st:'PLAY',sandbox:true});for(const other of a.cars)other.enabled=other===c;a.resetCar(c,0,0);c.q.identity();c.v.x=8;return{g,a,c,T:a.THREE};}
function up(s){return new s.T.Vector3(0,1,0).applyQuaternion(s.c.q).y;}
function keyboardStep(s,tick,{heldJump=false,freshPitch=false,flip=false,steerAfter=Infinity}={}){
 const {a,c}=s,released=freshPitch&&tick>=30&&tick<36;a.keys.w=released?0:1;a.keys.d=tick>=steerAfter?1:0;a.human(c);c.jp=tick===12||flip&&tick===36?1:0;c.jh=tick>=12&&tick<(heldJump?36:13)?1:0;a.stepCar(c,a.DT);
}
test('keyboard, analog and touch input mixing keeps clear raw axes without hidden pitch-origin metadata',()=>{
 const {a,c}=setup();a.keys.w=1;a.setPad({thr:.4,pitch:-.8});a.human(c);assert.equal(c.inp.thr,1);assert.equal(c.inp.pitch,1);assert.equal(c.inp.coupledPitch,undefined);
 a.keys.w=0;a.human(c);assert.equal(c.inp.thr,.4);assert.equal(c.inp.pitch,-.8);
 a.keys.arrowdown=1;a.human(c);assert.equal(c.inp.pitch,-1);a.keys.arrowdown=0;a.keys.w=a.keys.s=1;a.human(c);assert.equal(c.inp.pitch,-.8,'opposed digital keys leave the analog axis in control');
 a.keys.w=a.keys.s=0;a.setPad({thr:0,pitch:0});Object.assign(a.touchInput,{active:true,thr:.7,pitch:.7});a.human(c);assert.equal(c.inp.pitch,.7);assert.equal(c.inp.coupledPitch,undefined);
});
for(const heldJump of[false,true])test('a deliberate keyboard '+(heldJump?'held':'tap')+' jump immediately accepts still-held W as aerial pitch',()=>{
 const s=setup(),{a,c}=s;let airborne=0;for(let tick=0;tick<54;tick++){keyboardStep(s,tick,{heldJump});if(tick>=12&&!c.surfaceSupport){airborne++;assert.equal(c.controlTrace.traction,0,'no real support means no tire force');}if(tick===12){assert.ok(c.jl>0);assert.ok(c.w.z<-.001,'pitch starts on the deliberate takeoff tick without a release');assert.equal(c.controlTrace.effectivePitch,1);}}
 assert.ok(airborne>25);assert.ok(c.w.z<-3,'continued intentional pitch remains responsive');assert.ok(up(s)<.9,'the body rotates instead of invisibly latching driving intent');assert.equal(c.carriedPitch,undefined);assert.ok(a.carPenetration(c)<.005);
});
test('a held keyboard key, a fresh airborne key and independent controller pitch have identical airborne semantics',()=>{
 const independent=setup(),direct=setup(),keyboard=setup();for(const s of[independent,direct,keyboard]){s.c.p.y=6;s.c.wasG=s.c.ground=0;s.c.v.set(0,0,0);}
 for(let tick=0;tick<24;tick++){independent.a.setPad({pitch:1,thr:1});independent.a.human(independent.c);Object.assign(direct.c.inp,{pitch:1,thr:1});keyboard.a.keys.w=1;keyboard.a.human(keyboard.c);for(const s of[independent,direct,keyboard])s.a.stepCar(s.c,s.a.DT);}
 assert.ok(independent.c.w.z<-2);for(const s of[direct,keyboard]){assert.ok(s.c.q.angleTo(independent.c.q)<1e-6);assert.ok(s.c.w.distanceTo(independent.c.w)<1e-10);assert.ok(s.c.v.distanceTo(independent.c.v)<1e-10);}
});
test('raw keyboard direction still selects a front dodge and opposite pitch deliberately cancels it',()=>{
 const plain=setup();for(let tick=0;tick<=36;tick++)keyboardStep(plain,tick,{flip:true});assert.ok(plain.c.dT>0);assert.ok(plain.c.flipAxis.z<-.9);
 const a=setup(),b=setup();for(const s of[a,b]){s.c.p.y=6;s.c.ground=s.c.wasG=0;s.c.jp=1;Object.assign(s.c.inp,{pitch:1,thr:1});s.a.stepCar(s.c,s.a.DT);s.c.jp=0;}
 const before=a.c.v.x;for(let k=0;k<12;k++){a.c.inp.pitch=-1;b.c.inp.pitch=1;a.a.stepCar(a.c,a.a.DT);b.a.stepCar(b.c,b.a.DT);}assert.ok(Math.abs(a.c.w.z)<Math.abs(b.c.w.z)*.7);assert.ok(Math.abs(a.c.v.x-b.c.v.x)<.1);assert.ok(a.c.v.x<before+1);
});
test('authoritative driver packets no longer persist an indefinite keyboard-pitch latch',()=>{
 const{a,c}=setup();a.keys.w=1;a.human(c);a.stepCar(c,a.DT);const packet=JSON.parse(JSON.stringify(a.packDriver(c)));assert.equal(c.carriedPitch,undefined);assert.equal(packet.s.carriedPitch,undefined);assert.equal(c.inp.coupledPitch,undefined);assert.equal(packet.s.supportTime,c.supportTime);assert.equal(packet.s.jumpBuffer,c.jumpBuffer);a.resetCar(c,0,0);assert.equal(c.supportTime,0);assert.equal(c.jumpBuffer,0);
});
test('keyboard takeoff, actual aerial pitch and recovery inputs are identical across display frame groupings',()=>{
 const outcomes=[];for(const fps of[30,60,120]){const s=setup();let tick=0;for(let frame=0;frame<fps*2.5;frame++)for(let k=0;k<120/fps;k++,tick++)keyboardStep(s,tick,{freshPitch:true,steerAfter:210});const c=s.c;outcomes.push({p:c.p.toArray(),v:c.v.toArray(),w:c.w.toArray(),q:c.q.toArray(),wy:c.wy,ground:c.ground,wheels:c.wheelsOn,supportTime:c.supportTime,jumpBuffer:c.jumpBuffer});}assert.equal(JSON.stringify(outcomes[0]),JSON.stringify(outcomes[1]));assert.equal(JSON.stringify(outcomes[1]),JSON.stringify(outcomes[2]));
});
