const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function match(){const g=load({source:true}),a=g.api;a.cfg.size=1;a.cfg.mode=0;a.configureCars();a.setState({st:'PLAY',sandbox:false});for(const c of a.cars){a.resetCar(c,0,0);c.q.identity();}a.ball.p.set(0,7,12);return{...g,a,attacker:a.cars[0],victim:a.cars[1]};}
function hit(a,attacker,victim,speed=23){attacker.p.set(0,.19,0);victim.p.set(1.2,.19,0);attacker.v.set(speed,0,0);victim.v.set(0,0,0);attacker.q.identity();victim.q.identity();a.carPair(attacker,victim);}

test('front-bumper supersonic opponent collision demolishes once and preserves roster',()=>{
 const {a,attacker,victim}=match();hit(a,attacker,victim);assert.equal(victim.demoTime,3);assert.equal(victim.demoSeq,1);assert.equal(victim.demoBy,attacker.id);assert.equal(victim.enabled,true);assert.equal(attacker.demoTime,0);assert.equal(victim.v.length(),0);a.carPair(attacker,victim);assert.equal(victim.demoSeq,1);
});

test('slow bumps, reverse and side scrapes, teammates and locally predicted contacts cannot demo',()=>{
 for(const kind of ['slow','reverse','side','teammate','client']){
  const {a,attacker,victim}=match();if(kind==='teammate')victim.team=attacker.team;if(kind==='client'){a.DED.active=true;Object.assign(a.MP,{active:true,role:'guest'});}
  if(kind==='side'){attacker.p.set(0,.19,0);victim.p.set(0,.19,.65);attacker.v.set(0,0,23);a.carPair(attacker,victim);}
  else hit(a,attacker,victim,kind==='slow'?21.9:kind==='reverse'?-23:23);
  assert.equal(victim.demoTime,0,kind);assert.equal(victim.demoSeq,0,kind);
 }
});

test('demolished car is inert, cannot touch ball/pads, and respawns after exactly three seconds',()=>{
 const {a,attacker,victim}=match();hit(a,attacker,victim);victim.touches=8;victim.goals=2;victim.boost=0;const point=victim.p.clone();a.ball.p.copy(point).add(new a.THREE.Vector3(1,0,0));a.ball.v.set(-10,0,0);const before=a.ball.v.clone();a.carBall(victim);assert.ok(a.ball.v.equals(before));
 const pad=a.PADS[0];victim.p.set(pad.x,.19,pad.z);a.padStep(a.DT);assert.equal(victim.boost,0);victim.p.copy(point);
 for(let i=0;i<359;i++){victim.jp=victim.jh=1;Object.assign(victim.inp,{thr:1,boost:1});a.stepCar(victim,a.DT);assert.equal(victim.v.length(),0);assert.equal(victim.p.distanceTo(point),0);}
 assert.ok(victim.demoTime>0);a.stepCar(victim,a.DT);assert.equal(victim.demoTime,0);assert.equal(victim.respawnSeq,1);assert.equal(victim.demoSeq,1);assert.equal(victim.touches,8);assert.equal(victim.goals,2);assert.equal(victim.boost,33);assert.ok([23.04,26.88].includes(Math.abs(victim.p.x)));assert.equal(victim.p.z,46.08);assert.ok(victim.q.clone().angleTo(new a.THREE.Quaternion().setFromAxisAngle(new a.THREE.Vector3(0,1,0),Math.PI/2))<1e-6);assert.ok(a.carPenetration(victim)<.001);
});

test('both playlists and all team sizes retain demolition and safe deterministic own-goal respawns',()=>{
 for(const size of [1,2,3])for(const mode of [0,1]){
  const {a}=match();a.cfg.size=size;a.cfg.mode=mode;a.configureCars();const attacker=a.cars[0],victim=a.cars[1];for(const c of a.cars){a.resetCar(c,c.id*3,0);c.q.identity();}hit(a,attacker,victim);assert.equal(victim.demoTime,3,size+'v'+size+'/'+mode);for(let i=0;i<360;i++)a.stepCar(victim,a.DT);assert.equal(victim.demoTime,0);assert.equal(victim.p.z,46.08);assert.equal(a.cars.length,size*2);
 }
});

test('demo packet validation and interpolation snap respawns instead of crossing the field',()=>{
 const {a,victim}=match(),before=a.carPacket(victim),after={...before,x:26.88,z:46.08,demoSeq:1,respawnSeq:1,demoTime:0};a.mpReadCar(victim,after,.1,.05,before);assert.equal(victim.p.x,26.88);assert.equal(victim.p.z,46.08);assert.equal(victim.respawnSeq,1);
 for(const bad of [{demoTime:NaN},{demoTime:4},{demoSeq:-1},{respawnSeq:.5},{demoBy:7},{supersonic:'true'}])assert.equal(a.packetValid({...after,...bad}),false);assert.equal(a.packetValid(after),true);
 const dead={...after,demoTime:.01};a.mpReadCar(victim,dead,1,0);a.DED.active=true;a.stepCar(victim,.02);assert.ok(victim.demoTime>0,'prediction respawned without authority');assert.equal(victim.respawnSeq,1);
});

test('authority respawn clears local correction history so a returned car cannot rubber-band',()=>{
 const {a,victim}=match();a.DED.active=true;Object.assign(a.MP,{active:true,loaded:true,role:'guest',slot:1,round:0});victim.demoSeq=1;victim.demoTime=.1;victim.respawnSeq=0;const state=a.mpSnapshot();state.phase='PLAY';state.round=0;state.seq=10;Object.assign(state.cars[1],{x:23.04,z:46.08,demoTime:0,demoSeq:1,respawnSeq:1});a.MP.snapshot={...state,seq:9};a.DED.history=[{seq:2,round:0,controls:{thr:1},edge:false,held:false}];a.DED.outbox=[{seq:2}];const driver=a.packDriver(victim);Object.assign(driver.s,{demoTime:0,demoSeq:1,respawnSeq:1});a.dedState({state,tick:120,ack:0,driver});assert.equal(a.DED.history.length,0);assert.equal(a.DED.outbox.length,0);assert.equal(a.DED.offset.length(),0);assert.equal(victim.p.x,23.04);assert.equal(victim.p.z,46.08);
});

test('boost taps burn for the measured minimum burst and neutral air control retains axis damping only',()=>{
 const {a,attacker:c}=match();a.resetCar(c,0,0);c.q.identity();c.boost=100;c.inp.boost=1;a.stepCar(c,a.DT);c.inp.boost=0;for(let i=1;i<12;i++)a.stepCar(c,a.DT);assert.ok(Math.abs(c.boost-96.67)<.001);assert.equal(c.bst,1);a.stepCar(c,a.DT);assert.equal(c.bst,0);assert.ok(Math.abs(c.boost-96.67)<.001);
 a.resetCar(c,0,0);c.p.y=10;c.wasG=c.ground=0;c.w.set(0,1,0);for(let i=0;i<12;i++)a.stepCar(c,a.DT);assert.ok(c.w.y>.8&&c.w.y<.85,'neutral yaw applies extra arcade damping: '+c.w.y);
 c.v.set(22.5,0,0);a.updateSupersonic(c,a.DT);assert.equal(c.supersonic,true);c.v.set(21.5,0,0);for(let i=0;i<119;i++)a.updateSupersonic(c,a.DT);assert.equal(c.supersonic,true);a.updateSupersonic(c,.02);assert.equal(c.supersonic,false);
});
