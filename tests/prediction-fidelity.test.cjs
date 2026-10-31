const test=require('node:test'),assert=require('node:assert/strict');
const {setup,runProfile,clone}=require('../scripts/measure-network-fidelity.cjs');
const near=(value,target,tolerance=1e-10)=>assert.ok(Math.abs(value-target)<=tolerance,`${value} versus ${target}`);

test('consistency: every dynamic driver scalar and direction survives the authority packet roundtrip',()=>{
 const {a,c,car}=setup('aerial-dodge');
 Object.assign(c,{handbrake:.45,autoFlipTime:.13,autoFlipSign:-1,ballHitCooldown:1/120,jumped:1,jHoldTime:.125,dT:.3,dcd:.4});c.jdir.set(.6,.8,0);c.flipAxis.set(.6,0,-.8);
 const packet=clone(a.packDriver(c));for(const key of Object.keys(packet.s))car[key]=typeof packet.s[key]==='boolean'?!packet.s[key]:-999;
 car.jdir.set(0,0,0);car.flipAxis.set(0,0,0);a.readDriver(car,packet);
 for(const [key,value]of Object.entries(packet.s))assert.equal(car[key],value,key);
 assert.deepEqual(Array.from(car.jdir.toArray()),[.6,.8,0]);assert.deepEqual(Array.from(car.flipAxis.toArray()),[.6,0,-.8]);
 for(const key of ['handbrake','autoFlipTime','autoFlipSign','ballHitCooldown'])assert.ok(Object.hasOwn(packet.s,key),key+' omitted');
 a.readDriver(car,{s:{handbrake:NaN,autoFlipTime:Infinity},jdir:[2,0,0],flipAxis:[0,Infinity,0]});near(car.handbrake,.45);near(car.autoFlipTime,.13);assert.deepEqual(Array.from(car.jdir.toArray()),[.6,.8,0]);
});

for(const scenario of ['ground','hard-touch','awkward-landing','aerial-dodge'])test('consistency: '+scenario+' replays identical inputs through delayed, jittered and discarded downstream snapshots',()=>{
 const result=runProfile({scenario,delay:12,jitter:[0,5,2,8],dropEvery:5});
 assert.equal(result.dropped,12);assert.equal(result.delivered,44);assert.equal(result.maxCarError,0);assert.equal(result.maxBallError,0);assert.ok(result.maxRotationError<1e-6);assert.equal(result.maxCorrection,0);assert.equal(result.finalCarError,0);assert.equal(result.finalBallError,0);assert.equal(result.historyAfterFinal,0);assert.ok(result.localMoved);assert.ok(result.maxHistory<=28);
 if(scenario==='hard-touch')assert.equal(result.localTouchTick,2,'hit is predicted before the first delayed snapshot arrives');
});

test('consistency: a wrong local pose and boost are corrected by authority then unacknowledged inputs are replayed',()=>{
 const {p,a,c,car}=setup(),Z={thr:0,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0};let old;
 for(let tick=1;tick<=24;tick++){
  const frame={seq:tick,round:a.MP.round,jump:0,held:false,paused:false,controls:{...Z,thr:1,boost:tick<18?1:0,ps:tick>12?1:0,steer:tick>12?.6:0},edge:false};
  Object.assign(car.inp,frame.controls);a.stepCar(car,a.DT);a.predictLocalBall(a.DT);a.DED.history.push(clone(frame));p.input('local',clone(frame));p.step();
  if(tick===8)old={state:clone(p.state()),tick,ack:tick,driver:clone(p.driver(0))};
 }
 car.p.x+=1.25;car.v.z+=2;car.boost=1;car.q.setFromAxisAngle(new a.THREE.Vector3(0,1,0),.25);assert.ok(car.p.distanceTo(c.p)>1);
 a.dedState(old);near(car.p.distanceTo(c.p),0);near(car.v.distanceTo(c.v),0);near(car.q.angleTo(c.q),0,1e-6);near(car.boost,c.boost);assert.equal(a.DED.history.length,16);assert.ok(a.DED.offset.length()>1,'visual continuity is separate from corrected physics');
 const accepted=a.MP.received;old.state.seq=accepted;a.dedState(old);assert.equal(a.MP.received,accepted);near(car.p.distanceTo(c.p),0);
});

test('stability: nonzero synthetic uplink and downstream disruption converge after inputs drain, without claiming latency parity',()=>{
 const result=runProfile({scenario:'hard-touch',uplink:12,uplinkJitter:[0,5,2,8],delay:12,jitter:[0,5,2,8],dropEvery:5});
 assert.equal(result.finalCarError,0);assert.equal(result.finalBallError,0);assert.equal(result.historyAfterFinal,0);assert.ok(result.maxCarError>0,'authority has not yet consumed future local inputs');
 for(const sample of result.trajectory)assert.ok(Object.values(sample).every(Number.isFinite));assert.ok(result.maxHistory<120,'under the production history limit');
 // Deliberately no “small correction” assertion: this adverse trace currently
 // reaches about 0.8m corrections and is reported as a remaining limitation.
});

test('regression: remote car bumps remain authority-owned and a snapshot restores their recoil',()=>{
 const {p,a,c,car}=setup(),remote=p.inspect().cars[1];a.resetCar(c,0,0);c.q.identity();c.v.set(10,0,0);a.resetCar(remote,1.1,0);remote.q.identity();remote.enabled=true;a.cars[1].enabled=true;
 let state=clone(p.state());a.dedState({state,tick:0,ack:0,driver:clone(p.driver(0))});a.stepCar(car,a.DT);a.predictLocalBall(a.DT);p.step();
 assert.ok(c.v.x<car.v.x-1,'authority resolves the remote car while local prediction deliberately does not');state=clone(p.state());a.dedState({state,tick:1,ack:0,driver:clone(p.driver(0))});near(car.p.distanceTo(c.p),0);near(car.v.distanceTo(c.v),0);
});
