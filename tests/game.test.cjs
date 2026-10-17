const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('headless engine and gameplay initialize',()=>{const {api}=load();assert.equal(api.PROTOCOL,4);assert.equal(api.PADS.length,34);});
test('complete menu boots with camera and binding settings',()=>{const g=load({full:true});assert.equal(g.document.querySelectorAll('.binding-button').length,10);assert.equal(g.document.querySelectorAll('.camera-row').length,5);assert.equal(g.api.cfg.hi,0);assert.equal(g.api.cfg.models,1);});
function setup(){const g=load(),a=g.api;a.configureCars();a.setState({st:'PLAY',sandbox:true});a.cars[1].enabled=false;const c=a.cars[0];a.resetCar(c,0,0);c.q.identity();return {...g,a,c};}
function drive(a,c,seconds,input){Object.assign(c.inp,input);for(let k=0;k<Math.round(seconds/a.DT);k++){a.stepCar(c,a.DT);c.p.x=0;c.p.z=0;}return c;}
test('measured throttle, coast and separate boost rates reach expected velocities',()=>{
 const {a,c}=setup();drive(a,c,4,{thr:1});assert.ok(c.v.x>14&&c.v.x<14.12,String(c.v.x));
 c.v.set(10,0,0);drive(a,c,1,{thr:0});assert.ok(Math.abs(c.v.x-4.75)<.03,String(c.v.x));
 c.v.set(0,0,0);c.boost=100;drive(a,c,1,{thr:0,boost:1});assert.ok(c.v.x>15.9&&c.v.x<16.4,String(c.v.x));assert.ok(Math.abs(c.boost-66.7)<.01);
 drive(a,c,1,{boost:1});assert.ok(Math.abs(c.v.length()-23)<.1);
});
test('boost pad count, coordinates, cylindrical bounds and cooldowns',()=>{
 const {a,c}=setup();assert.equal(a.PADS.filter(p=>p.big).length,6);assert.equal(a.PADS.filter(p=>!p.big).length,28);
 const small=a.PADS[0];c.p.set(small.x+1.43,.2,small.z);c.boost=0;a.padStep(a.DT);assert.equal(c.boost,12);assert.equal(small.t,4);
 a.padStep(a.DT);assert.equal(c.boost,12);c.p.x=small.x+1.45;assert.equal(a.padContains(small,c),false);c.p.x=small.x;c.p.y=1.66;assert.equal(a.padContains(small,c),false);
 const large=a.PADS.find(p=>p.big);c.p.set(large.x,.2,large.z);a.padStep(a.DT);assert.equal(c.boost,100);assert.equal(large.t,10);
});
test('tap jump, held jump, double jump and landing remain finite',()=>{
 function jump(held,twice){const {a,c}=setup();let peak=0;c.jp=1;c.jh=held?1:0;for(let k=0;k<240;k++){if(twice&&k===26)c.jp=1;a.stepCar(c,a.DT);peak=Math.max(peak,c.p.y);assert.ok(c.p.toArray().every(Number.isFinite));}return{peak,c,a};}
 const tap=jump(false,false),hold=jump(true,false),double=jump(true,true);
 assert.ok(hold.peak>tap.peak+.5,JSON.stringify([tap.peak,hold.peak]));assert.ok(double.peak>hold.peak+.5);assert.ok(Math.abs(hold.c.p.y-.1851)<.05);assert.ok(hold.c.ground);
});
test('standard kickoff positions and body hitbox differences',()=>{
 const {a}=setup();a.cfg.size=3;a.configureCars();a.cars.forEach(c=>a.spawnCar(c));
 assert.equal(a.cars[0].p.z,-25.6);assert.equal(a.cars[2].p.z,-38.4);assert.equal(a.cars[4].p.z,-46.08);
 assert.equal(a.bodyPhysics({body:0}).half[0],a.bodyPhysics({body:1}).half[0]);assert.ok(a.bodyPhysics({body:2}).half[0]>a.bodyPhysics({body:0}).half[0]);
});
test('zero-second ball remains alive, ground contact ends match',()=>{
 const {a,c}=setup();c.enabled=false;a.setState({sandbox:false,score:[1,0],tl:.001});a.ball.p.set(0,5,0);a.ball.v.set(0,0,0);a.advanceMatchClock(a.DT);assert.equal(a.getState().st,'PLAY');assert.equal(a.getState().tl,0);
 a.ball.p.set(0,.9126,0);a.ball.v.set(0,-2,0);a.ballSub(a.DT);assert.equal(a.getState().st,'END');
});
test('tied expiry starts overtime with fresh kickoff and zero clock',()=>{
 const {a,c}=setup();c.enabled=false;a.setState({sandbox:false,score:[2,2],tl:0});a.ball.p.set(0,.9126,0);a.ball.v.set(0,-1,0);a.ballSub(a.DT);assert.equal(a.getState().ot,1);assert.equal(a.getState().st,'COUNT');assert.equal(a.getState().tl,0);
});
test('ball prediction follows the same linear drag and gravity as actual flight',()=>{
 const {a,c}=setup();c.enabled=false;a.ball.p.set(0,8,0);a.ball.v.set(7,5,4);a.ball.w.set(0,0,0);a.predictBall(1);const predicted=a.forecast().at(-1);for(let k=0;k<120;k++)a.ballSub(a.DT);const error=a.ball.p.distanceTo(new a.THREE.Vector3(...predicted));assert.ok(error<.002,String(error));
 a.ball.w.set(20,30,40);a.ballSub(a.DT);assert.ok(a.ball.w.length()<=6.00001);
});
test('keyboard remapping and analog controller feed the same player inputs',()=>{
 const {a,c}=setup();a.bindings.boost='KeyF';assert.equal(a.mappedKey({code:'KeyF',key:'f'}),'shift');assert.equal(a.mappedKey({code:'ShiftLeft',key:'Shift'}),'unbound:ShiftLeft');
 a.setPad({thr:.7,steer:.4,pitch:-.5,roll:1,boost:1,jump:true});a.human(c);assert.equal(c.inp.thr,.7);assert.equal(c.inp.steer,.4);assert.equal(c.inp.roll,1);assert.equal(c.jh,1);
});
test('reject malformed multiplayer vectors and incompatible queue tickets',()=>{
 const {a}=setup();const packet={x:0,y:1,z:0,boost:30,q:[0,0,0,1],v:[0,0,0],w:[0,0,0],n:[0,1,0]};assert.ok(a.packetValid(packet));assert.equal(a.packetValid({...packet,v:[NaN,0,0]}),false);assert.equal(a.packetValid({...packet,q:[0,0,0,0]}),false);
 const member=id=>({session:id}),ticket=(id,protocol)=>({protocol,seen:100,created:100,members:[member(id)]});assert.equal(a.queuePlan({a:ticket('a',3),b:ticket('b',4)},1,101),null);assert.ok(a.queuePlan({a:ticket('a',4),b:ticket('b',4)},1,101));
});
test('3v3 simulation soak preserves finite state and arena constraints',()=>{
 const {a}=setup();a.cfg.size=3;a.cfg.lvl=2;a.cfg.allies=2;a.cfg.enemies=3;a.configureCars();a.kickoff();a.setState({st:'PLAY',sandbox:true});
 for(let k=0;k<3600;k++){a.sim(a.DT);if(a.getState().st==='GOAL'){a.kickoff();a.setState({st:'PLAY'});}for(const c of a.cars){assert.ok(c.p.toArray().every(Number.isFinite));assert.ok(c.v.length()<23.1);assert.ok(a.carPenetration(c)<.02);}assert.ok(a.ball.p.toArray().every(Number.isFinite));}
});
test('physics stays consistent at 30, 60 and 120 display frames per second',()=>{
 const positions=[];for(const fps of [30,60,120]){const {a}=setup();a.keys.w=1;a.ball.p.set(0,5,20);a.ball.v.set(0,0,0);a.frame(1000);for(let i=1;i<=fps;i++)a.frame(1000+i*1000/fps);positions.push(a.cars[0].p.x);}
 assert.ok(Math.max(...positions)-Math.min(...positions)<.001,JSON.stringify(positions));
});
test('fast wall impacts do not escape the arena',()=>{
 const {a,c}=setup();c.p.set(39,.2,0);c.q.identity();c.v.set(23,0,0);for(let i=0;i<240;i++){a.stepCar(c,a.DT);assert.ok(a.carPenetration(c)<.02);assert.ok(c.p.x<40.96);}
});
test('imported cars match their collision footprint and wheel baseline',()=>{
 const g=load(),a=g.api,E=g.window.TevinEngine;for(let body=0;body<3;body++){
  const visual=E.importedCar({isWebGPURenderer:false},['octane','fennec','dominus'][body],0x55aaff),model=a.fitCarVisual(visual,{body});visual.remove(visual.userData.f);
  const box=new E.THREE.Box3().setFromObject(model),spec=a.bodyPhysics({body});assert.ok(Math.abs(box.min.y+spec.height)<1e-6);assert.ok(Math.abs(box.max.x-box.min.x-spec.half[0]*2*1.06)<1e-6);assert.ok(model.userData.wheels.length>=4);
 }
});
test('a last-second equalizer transitions to overtime after celebration',()=>{
 const {a}=setup();a.setState({st:'GOAL',sandbox:false,score:[1,1],tl:0,ot:0});a.frame(1000);assert.equal(a.getState().ot,1);assert.equal(a.getState().st,'COUNT');
});
