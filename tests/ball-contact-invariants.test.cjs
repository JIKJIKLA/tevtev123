const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
const R=.9125,MC=180,MB=30,IB=.4*MB*R*R;
function setup(){const {api:a}=load({source:true});a.configureCars();a.cfg.mode=0;a.setState({st:'PLAY',sandbox:true});a.PHYS.hit.extraScale=0;return {a,T:a.THREE,c:a.cars[0],b:a.ball};}
function normalClosing(c,b,T,n,r){const omega=c.ground?c.n.clone().multiplyScalar(-c.wy):c.w.clone().applyQuaternion(c.q);return omega.cross(r).add(c.v).sub(b.w.clone().cross(n.clone().multiplyScalar(-R)).add(b.v)).dot(n);}
function energy(a,c,b){const I=a.bodyPhysics(c).inertia;return .5*MC*c.v.lengthSq()+.5*(c.ground?I.y*c.wy*c.wy:I.x*c.w.x*c.w.x+I.y*c.w.y*c.w.y+I.z*c.w.z*c.w.z)+.5*MB*b.v.lengthSq()+.5*IB*b.w.lengthSq();}
function momentum(c,b){return c.v.clone().multiplyScalar(MC).addScaledVector(b.v,MB);}
function angularMomentum(a,c,b,arm,n){const I=a.bodyPhysics(c).inertia;return c.w.clone().multiply(new a.THREE.Vector3(I.x,I.y,I.z)).applyQuaternion(c.q).addScaledVector(b.w,IB).add(arm.clone().addScaledVector(n,R).cross(b.v.clone().multiplyScalar(MB)));}
function generator(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

test('regression: a valid grazing sphere/OBB face contact cannot disappear when the free sticking impulse has negative Jn',()=>{
 const {a,c,b,T}=setup(),spec=a.bodyPhysics({body:1});c.body=1;c.enabled=true;c.ground=0;c.p.set(0,5,0);
 c.q.fromArray([-.7189591208712992,-.2514437282015966,-.6227625285375871,-.17899907014708605]);c.v.fromArray([-8.503523297189307,6.199368951248453,-1.4807948371938857]);c.w.fromArray([.5343642476946115,-.8784701810218394,.8940705684944987]);b.v.fromArray([-.7148407488130033,.1747179813683033,.9200730207376182]);b.w.fromArray([-.9830207703635097,-.1756533752195537,-.9622513819485903]);
 const n=new T.Vector3(.09788576919510539,.584503350614196,.8054652129731371),r=new T.Vector3(.515262514805094,.21381819484611986,.7025476357970726),local=r.clone().applyQuaternion(c.q.clone().invert()).sub(new T.Vector3(...spec.center));
 assert.ok(Math.abs(local.x-spec.half[0])<1e-12);assert.ok(Math.abs(local.y)<spec.half[1]&&Math.abs(local.z)<spec.half[2]);assert.ok(n.clone().applyQuaternion(c.q.clone().invert()).distanceTo(new T.Vector3(1,0,0))<1e-12);
 b.p.copy(c.p).add(r).addScaledVector(n,R-1e-6);c.ballHitCooldown=0;const before=energy(a,c,b),p=momentum(c,b),bv=b.v.clone();assert.ok(Math.abs(normalClosing(c,b,T,n,r)-.20005979684554331)<1e-12);
 // Exercise the actual overlap detector, not only a synthetic impulse call.
 a.carBall(c);assert.ok(b.v.distanceTo(bv)>.1,'the detected contact must transfer momentum');assert.ok(Math.abs(normalClosing(c,b,T,n,r))<1e-10);assert.ok(momentum(c,b).distanceTo(p)<1e-9);assert.ok(energy(a,c,b)<before);
});

test('physical invariants: seeded face/edge/corner contacts conserve momentum, dissipate energy and stop closing under the friction cone',()=>{
 const {a,c,b,T}=setup(),rand=generator(982451653),vec=s=>new T.Vector3((rand()*2-1)*s,(rand()*2-1)*s,(rand()*2-1)*s);let normalChecks=0,slidingContacts=0;
 for(let sample=0;sample<12000;sample++){
  c.body=sample%3;c.ground=0;c.q.setFromEuler(new T.Euler(rand()*Math.PI*2,rand()*Math.PI*2,rand()*Math.PI*2));const spec=a.bodyPhysics(c),face=sample%6,axis=face>>1,sign=face%2?1:-1;
  const point=vec(1).multiply(new T.Vector3(...spec.half)),localNormal=new T.Vector3().setComponent(axis,sign);point.setComponent(axis,sign*spec.half[axis]);
  // Face contacts plus rounded sphere contact with a true OBB edge/corner.
  if(sample%3){const other=(axis+1)%3;point.setComponent(other,spec.half[other]);localNormal.setComponent(other,rand());}
  if(sample%3===2){const other=(axis+2)%3;point.setComponent(other,-spec.half[other]);localNormal.setComponent(other,-rand());}
  const n=localNormal.normalize().applyQuaternion(c.q),r=point.add(new T.Vector3(...spec.center)).applyQuaternion(c.q),armB=n.clone().multiplyScalar(-R),t=vec(1);t.addScaledVector(n,-t.dot(n)).normalize().multiplyScalar(rand()*12);
  c.w.copy(vec(.6));b.v.copy(vec(1));b.w.copy(vec(.6));c.v.copy(t).addScaledVector(n,sample%2?.001+rand()*.2:1+rand()*6).sub(c.w.clone().applyQuaternion(c.q).cross(r)).add(b.w.clone().cross(armB)).add(b.v);c.ballHitCooldown=0;
  // Also cover the frictionless limit and a low-friction cone without changing defaults.
  a.PHYS.hit.mu=[0,.25,2][sample%3];const before=energy(a,c,b),p=momentum(c,b),L=angularMomentum(a,c,b,r,n),carBefore=c.v.clone(),ballBefore=b.v.clone();
  assert.ok(normalClosing(c,b,T,n,r)>0);a.applyBallCarImpulse(c,n,r,r.clone().addScaledVector(n,R));
  const after=energy(a,c,b);assert.ok(after<=before+1e-8,`sample ${sample}: physical energy gained ${after-before}`);assert.ok(momentum(c,b).distanceTo(p)<1e-8,`sample ${sample}: linear momentum`);
  const impulse=b.v.clone().sub(ballBefore).multiplyScalar(MB),Jn=impulse.dot(n),Jt=impulse.clone().addScaledVector(n,-Jn).length();assert.ok(Jn>=-1e-9);assert.ok(Jt<=a.PHYS.hit.mu*Jn+1e-8,`sample ${sample}: impulse leaves cone`);if(Math.abs(Jt-a.PHYS.hit.mu*Jn)<1e-8)slidingContacts++;
  assert.ok(c.v.distanceTo(carBefore)>0,'approaching contact must have nonzero impulse');
  // Explicit angular-speed caps may remove angular momentum and alter point velocity.
  if(c.w.length()<5.5-1e-7&&b.w.length()<6-1e-7){assert.ok(angularMomentum(a,c,b,r,n).distanceTo(L)<1e-8,`sample ${sample}: angular momentum`);assert.ok(Math.abs(normalClosing(c,b,T,n,r))<1e-9,`sample ${sample}: residual closing`);normalChecks++;}
 }
 assert.ok(normalChecks>11000,`too many capped fixtures: ${normalChecks}`);assert.ok(slidingContacts>4000,'exercise sliding rather than only sticking');
});

test('supported-car approximation: aligned tire support retains zero closing contact response and physical momentum',()=>{
 const {a,c,b,T}=setup(),rand=generator(31337),vec=s=>new T.Vector3((rand()*2-1)*s,(rand()*2-1)*s,(rand()*2-1)*s);a.PHYS.hit.mu=2;
 for(let sample=0;sample<500;sample++){
  c.body=sample%3;c.ground=1;c.q.setFromEuler(new T.Euler(rand(),rand()*6,rand()));c.n.set(0,1,0).applyQuaternion(c.q);c.wy=(rand()-.5)*.6;c.w.set(0,0,0);const spec=a.bodyPhysics(c),r=new T.Vector3(spec.center[0]+spec.half[0],spec.center[1]+(rand()-.5)*spec.half[1],(rand()-.5)*spec.half[2]).applyQuaternion(c.q),n=new T.Vector3(1,0,0).applyQuaternion(c.q);
  c.v.copy(vec(2)).addScaledVector(n,6);b.v.copy(vec(1));b.w.copy(vec(.3));c.ballHitCooldown=0;const before=energy(a,c,b),p=momentum(c,b);assert.ok(normalClosing(c,b,T,n,r)>0);a.applyBallCarImpulse(c,n,r,r.clone().addScaledVector(n,R));assert.ok(energy(a,c,b)<=before+1e-8);assert.ok(momentum(c,b).distanceTo(p)<1e-8);assert.ok(Math.abs(normalClosing(c,b,T,n,r))<1e-9);
 }
 // Tilted, misaligned multi-wheel support is an external suspension constraint;
 // this test does not pretend that case is an isolated rigid-body experiment.
});
