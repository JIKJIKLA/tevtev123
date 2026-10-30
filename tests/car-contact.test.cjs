const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function match(){const g=load({source:true}),a=g.api;a.cfg.size=1;a.cfg.mode=0;a.configureCars();a.setState({st:'PLAY',sandbox:true});for(const c of a.cars){a.resetCar(c,0,0);c.q.identity();}return {...g,a,first:a.cars[0],second:a.cars[1]};}
function energy(a,c){const I=a.bodyPhysics(c).inertia;return .5*a.PHYS.car.mass*c.v.lengthSq()+.5*(I.x*c.w.x*c.w.x+I.y*c.w.y*c.w.y+I.z*c.w.z*c.w.z);}
function snapshot(c){return JSON.stringify({p:c.p.toArray(),v:c.v.toArray(),w:c.w.toArray(),q:c.q.toArray(),wy:c.wy});}

test('separated measured boxes never bump through the old width-radius vertical envelope',()=>{
 const {a,first:c,second:d}=match();
 for(let bodyA=0;bodyA<3;bodyA++)for(let bodyB=0;bodyB<3;bodyB++){
  c.body=bodyA;d.body=bodyB;const A=a.bodyPhysics(c),B=a.bodyPhysics(d);c.q.identity();d.q.setFromAxisAngle(new a.THREE.Vector3(0,1,0),.7);c.p.set(0,3,0);d.p.set(.1,3+A.center[1]-B.center[1]+A.half[1]+B.half[1]+.04,.1);c.ground=d.ground=0;c.v.set(1,0,0);d.v.set(-1,-6,0);c.w.set(0,0,0);d.w.set(0,0,0);const before=[snapshot(c),snapshot(d)];a.carPair(c,d);assert.deepEqual([snapshot(c),snapshot(d)],before,'body pair '+bodyA+'/'+bodyB);
 }
});

test('normal car contacts use equal 180 kg mass, low restitution and conserve momentum without a launch',()=>{
 const {a,first:c,second:d}=match();assert.equal(a.PHYS.car.mass,180);assert.equal(a.PHYS.ball.mass,30);assert.equal(a.PHYS.car.carE,.1);assert.equal(a.PHYS.car.carMu,.09);
 for(let body=0;body<3;body++){
  c.body=d.body=body;a.resetCar(c,0,0);a.resetCar(d,0,0);c.q.identity();d.q.identity();const box=a.bodyPhysics(c);d.p.x=box.half[0]*2-.02;c.v.set(10,0,0);d.v.set(0,0,0);const total=c.v.clone().add(d.v),beforeEnergy=energy(a,c)+energy(a,d),separation=c.p.distanceTo(d.p);a.carPair(c,d);
  assert.ok(c.v.clone().add(d.v).distanceTo(total)<1e-10);assert.ok(Math.abs(c.v.x-4.5)<1e-10);assert.ok(Math.abs(d.v.x-5.5)<1e-10);assert.equal(c.v.y,0);assert.equal(d.v.y,0);assert.equal(c.w.length(),0);assert.equal(d.w.length(),0);assert.ok(energy(a,c)+energy(a,d)<beforeEnergy*.51);assert.ok(c.p.distanceTo(d.p)-separation<.021,'one bounded correction rather than repeated sphere shoves');
 }
});

test('rotated box side faces collide only at their actual projected extent',()=>{
 const {a,first:c,second:d}=match(),Y=new a.THREE.Vector3(0,1,0);c.q.identity();d.q.setFromAxisAngle(Y,Math.PI/2);const A=a.bodyPhysics(c),B=a.bodyPhysics(d);c.p.set(0,3,0);d.p.set(A.center[0]+A.half[0]+B.half[2]+.03,3,.138757);c.ground=d.ground=0;c.v.set(8,0,0);d.v.set(0,0,0);const before=[snapshot(c),snapshot(d)];a.carPair(c,d);assert.deepEqual([snapshot(c),snapshot(d)],before,'nearby side face with a gap must remain clear');
 d.p.x-=.05;a.carPair(c,d);assert.ok(d.v.x>0,'the same rotated face transfers momentum once actually overlapping');assert.ok(c.v.clone().add(d.v).distanceTo(new a.THREE.Vector3(8,0,0))<1e-9);assert.ok(c.w.length()<=5.500001&&d.w.length()<=5.500001);
});

test('off-center airborne bump transfers angular momentum without creating kinetic energy',()=>{
 const {a,first:c,second:d}=match();c.p.set(0,3,0);d.p.set(1.1,3,.4);c.ground=d.ground=0;c.v.set(10,0,3);d.v.set(-1,0,-1);c.w.set(0,.3,0);d.w.set(0,0,0);const momentum=c.v.clone().add(d.v),beforeEnergy=energy(a,c)+energy(a,d);a.carPair(c,d);
 assert.ok(c.v.clone().add(d.v).distanceTo(momentum)<1e-10);assert.ok(energy(a,c)+energy(a,d)<=beforeEnergy+1e-8);assert.ok(c.w.length()+d.w.length()>.3,'off-center contact has a real inertia response');assert.ok(c.w.length()<=5.500001&&d.w.length()<=5.500001);assert.ok([...c.v.toArray(),...d.v.toArray(),...c.w.toArray(),...d.w.toArray()].every(Number.isFinite));
});

test('human-style throttle and steering recover one-wheel, sideways and roof landings without tumbling',()=>{
 const {a,first:c}=match(),X=new a.THREE.Vector3(1,0,0),up=new a.THREE.Vector3();
 for(let body=0;body<3;body++)for(const roll of [65,80,90,120,180]){
  c.body=body;a.resetCar(c,0,0);c.q.setFromAxisAngle(X,roll*Math.PI/180);c.v.set(8,0,0);Object.assign(c.inp,{thr:1,pitch:1,steer:.2,yaw:.2});let maximumStep=0;
  for(let k=0;k<240;k++){const previous=c.q.clone();a.stepCar(c,a.DT);maximumStep=Math.max(maximumStep,previous.angleTo(c.q));assert.ok(a.carPenetration(c)<.02);assert.ok(c.v.length()<=23.00001);}
  assert.ok(up.set(0,1,0).applyQuaternion(c.q).y>.98,'body '+body+' roll '+roll+' did not regain a driving pose');assert.equal(c.ground,1);assert.ok(c.wheelsOn>=3);assert.ok(c.v.x>5);assert.ok(maximumStep<.25,'recovery must remain continuous, not an orientation teleport');
 }
});

test('genuine aerial inputs and intentional contact air-roll remain active; wheel-grip wall climbing remains stable',()=>{
 const {a,first:c}=match(),T=a.THREE;a.resetCar(c,0,0);c.p.y=8;c.wasG=c.ground=0;c.q.setFromAxisAngle(new T.Vector3(1,0,0),1.1);Object.assign(c.inp,{roll:.7,yaw:.5,pitch:.4});a.stepCar(c,a.DT);assert.ok(Math.abs(c.w.x-.7*38.34*a.DT)<1e-10);assert.ok(Math.abs(c.w.y+.5*9.11*a.DT)<1e-10);assert.ok(Math.abs(c.w.z+.4*12.46*a.DT)<1e-10);
 a.resetCar(c,0,0);c.q.setFromAxisAngle(new T.Vector3(1,0,0),80*Math.PI/180);c.v.set(2,0,0);Object.assign(c.inp,{roll:1});for(let k=0;k<20;k++)a.stepCar(c,a.DT);assert.ok(c.w.x>1,'explicit roll must bypass floor-recovery assistance');
 for(let body=0;body<3;body++){c.body=body;a.resetCar(c,0,0);c.p.set(40.96-a.bodyPhysics(c).height-.015,8,0);c.q.setFromAxisAngle(new T.Vector3(0,0,1),Math.PI/2);c.n.set(-1,0,0);c.wasG=true;Object.assign(c.inp,{thr:1,pitch:1});for(let k=0;k<120;k++){a.stepCar(c,a.DT);assert.ok(a.carPenetration(c)<.02);}assert.ok(c.p.y>10);assert.ok(c.v.y>3);}
});

test('both playlists and all roster sizes retain finite mass contacts through a shared six-car soak',()=>{
 for(const size of [1,2,3])for(const mode of [0,1]){
  const {a}=match();a.cfg.size=size;a.cfg.mode=mode;a.cfg.lvl=2;a.cfg.allies=2;a.cfg.enemies=3;a.configureCars();a.kickoff();a.setState({st:'PLAY',sandbox:true});for(const c of a.cars)c.body=c.id%3;
  for(let k=0;k<720;k++){a.sim(a.DT);if(a.getState().st==='GOAL'||a.getState().st==='END'){a.kickoff();a.setState({st:'PLAY'});}for(const c of a.cars){assert.ok([...c.p.toArray(),...c.v.toArray(),...c.q.toArray(),...c.w.toArray()].every(Number.isFinite));assert.ok(c.v.length()<23.1);assert.ok(a.carPenetration(c)<.025);}}
 }
});
