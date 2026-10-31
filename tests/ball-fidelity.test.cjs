const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function setup(){const g=load({source:true}),a=g.api;a.cfg.mode=0;a.cfg.size=1;a.configureCars();a.setState({st:'PLAY',sandbox:true});for(const c of a.cars){c.enabled=false;a.resetCar(c,0,0);c.q.identity();}return{g,a,c:a.cars[0],b:a.ball,T:a.THREE};}
const near=(actual,target,tolerance=1e-9)=>assert.ok(Math.abs(actual-target)<=tolerance,`${actual} versus ${target} (tolerance ${tolerance})`);
function central(a,c,b,extra){c.enabled=true;c.ground=0;c.p.set(0,5,0);c.q.identity();c.v.set(8,0,0);c.w.set(0,0,0);c.ballHitCooldown=0;b.p.set(1.6125,5,0);b.v.set(0,0,0);b.w.set(0,0,0);a.PHYS.hit.extraScale=extra;}
function energy(a,c,b){const I=a.bodyPhysics(c).inertia;return .5*a.PHYS.car.mass*c.v.lengthSq()+.5*(I.x*c.w.x*c.w.x+I.y*c.w.y*c.w.y+I.z*c.w.z*c.w.z)+.5*a.PHYS.ball.mass*b.v.lengthSq()+.5*.4*a.PHYS.ball.mass*.9125**2*b.w.lengthSq();}

test('model fidelity: the independently published hit-speed curve transfers UU to metres at each knot',()=>{
 const {a}=setup();for(const [speed,scale] of [[0,.65],[2.5,.65],[5,.65],[14,.60],[23,.55],[34.5,.425],[46,.30],[70,.30]])near(a.ballExtraScale(speed),scale,1e-12);
});

test('model fidelity: physical central contact is inelastic, mass balanced and the measured extra impulse affects only the ball',()=>{
 const {a,c,b,T}=setup(),normal=new T.Vector3(1,0,0),arm=new T.Vector3(.7,0,0),relative=new T.Vector3(1.6125,0,0);
 central(a,c,b,0);a.applyBallCarImpulse(c,normal,arm,relative);const car=c.v.clone(),physical=b.v.clone();near(physical.x,8*180/210);near(car.x,8*180/210);near(180*car.x+30*physical.x,180*8);near(c.w.length()+b.w.length(),0);
 central(a,c,b,1);a.applyBallCarImpulse(c,normal,arm,relative);near(c.v.x,car.x);near(b.v.x-physical.x,8*(.65-3*.1/18));near(b.v.y,0);near(b.v.z,0);
});

test('model fidelity: off-center physical contact uses angular point velocity without creating physical collision energy',()=>{
 const {a,c,b,T}=setup();central(a,c,b,0);c.q.setFromAxisAngle(new T.Vector3(0,1,0),.4);c.v.set(6,.2,.1);c.w.set(.1,.2,-.1);b.v.set(0,.1,0);b.w.set(.1,-.2,.1);
 const n=new T.Vector3(1,0,0),r=new T.Vector3(.7,.15,.1),rel=new T.Vector3(1.6125,.15,.1),before=energy(a,c,b),momentum=c.v.clone().multiplyScalar(180).addScaledVector(b.v,30);
 a.applyBallCarImpulse(c,n,r,rel);assert.ok(energy(a,c,b)<=before+1e-8);assert.ok(c.v.clone().multiplyScalar(180).addScaledVector(b.v,30).distanceTo(momentum)<1e-8);
 const carAngular=c.w.clone().applyQuaternion(c.q),pointC=carAngular.cross(r).add(c.v),pointB=b.w.clone().cross(n.clone().multiplyScalar(-.9125)).add(b.v);assert.ok(pointC.distanceTo(pointB)<1e-8,'uncapped high-friction inelastic contact equalizes full surface velocity');
});

test('regression: repeated substeps cannot multiply the extra ball power impulse in one or adjacent ticks',()=>{
 const {a,c,b,T}=setup(),n=new T.Vector3(1,0,0),r=new T.Vector3(.7,0,0),p=new T.Vector3(1.6125,0,0),reset=()=>{c.v.set(8,0,0);c.w.set(0,0,0);b.v.set(0,0,0);b.w.set(0,0,0);};central(a,c,b,1);a.applyBallCarImpulse(c,n,r,p);const full=b.v.x;near(c.ballHitCooldown,2*a.DT);reset();a.applyBallCarImpulse(c,n,r,p);near(b.v.x,8*180/210);
 a.stepCar(c,a.DT);reset();a.applyBallCarImpulse(c,n,r,p);near(b.v.x,8*180/210);a.stepCar(c,a.DT);reset();a.applyBallCarImpulse(c,n,r,p);near(b.v.x,full);
});

test('model fidelity: floor, wall and ceiling bounce match the independently measured slip equation in world Y-up axes',()=>{
 const {a,T}=setup();const cases=[{v:[8,-10,2],w:[1,.4,-2],n:[0,1,0]},{v:[10,2,8],w:[1,.4,-2],n:[-1,0,0]},{v:[8,10,2],w:[1,.4,-2],n:[0,-1,0]}];
 for(const item of cases){const v=new T.Vector3(...item.v),w=new T.Vector3(...item.w),n=new T.Vector3(...item.n),normalSpeed=-v.dot(n),slip=n.clone().cross(w).multiplyScalar(.9125).add(v).addScaledVector(n,normalSpeed),dv=slip.clone().multiplyScalar(-.285*Math.min(1,2*normalSpeed/slip.length())),expectedV=v.clone().addScaledVector(n,1.6*normalSpeed).add(dv),expectedW=w.clone().add(dv.clone().cross(n).multiplyScalar(1/(.4*.9125)));
  a.ballSurfaceBounce(v,w,n);assert.ok(v.distanceTo(expectedV)<1e-10);assert.ok(w.distanceTo(expectedW)<1e-10);
 }
});

test('model fidelity and numerical stability are separate: one metre-per-second bounces rebound, gravity-sized resting contacts settle',()=>{
 const {a,T}=setup(),n=new T.Vector3(0,1,0),v=new T.Vector3(0,-1,0),w=new T.Vector3();a.ballSurfaceBounce(v,w,n);near(v.y,.6);v.set(0,-.05,0);a.ballSurfaceBounce(v,w,n);near(v.y,0);
});

test('regression: a rolling ball crosses the visible flat goal entrance without the old invisible ramp hop',()=>{
 for(const sign of [-1,1])for(const x of [0,7.8]){const {a,b}=setup();b.p.set(x,.9125,46*sign);b.v.set(0,0,4*sign);b.w.set(4/.9125*sign,0,0);let peak=0;for(let tick=0;tick<360;tick++){a.ballSub(a.DT);peak=Math.max(peak,b.p.y);assert.ok(Math.abs(b.v.y)<1e-9);}near(peak,.9125,1e-10);assert.ok(b.p.z*sign>55,'the ball must actually traverse the goal entrance');}
});

test('model fidelity: rolling no-slip drag has no arbitrary additional angular damping',()=>{
 const {a,b}=setup();b.p.set(0,.9125,0);b.v.set(4,0,0);b.w.set(0,0,-4/.9125);const before=15*b.v.lengthSq()+6*.9125**2*b.w.lengthSq();for(let i=0;i<120;i++)a.ballSub(a.DT);
 const expected=4*Math.exp(-a.PHYS.ball.drag/1.4);near(b.v.x,expected,.003);assert.ok(15*b.v.lengthSq()+6*.9125**2*b.w.lengthSq()<=before);near(b.p.y,.9125,1e-10);
});

test('regression: authority, local-ball prediction and bot forecast share bounce behavior while outcomes remain authority-only',()=>{
 const {a,b,c,T}=setup();b.p.set(0,2,0);b.v.set(7,-4,1);b.w.set(1,.5,-2);a.predictBall(1);const predicted=new T.Vector3(...a.forecast().at(-1));for(let i=0;i<120;i++)a.ballSub(a.DT);assert.ok(b.p.distanceTo(predicted)<.003);
 const initial={p:[39.9,3,0],v:[14,-1,4],w:[.3,.2,1]},run=predicted=>{b.p.fromArray(initial.p);b.v.fromArray(initial.v);b.w.fromArray(initial.w);for(let i=0;i<120;i++)predicted?a.predictLocalBall(a.DT):a.ballSub(a.DT);return [...b.p.toArray(),...b.v.toArray(),...b.w.toArray()];};
 c.enabled=false;assert.deepEqual(run(true),run(false));a.DED.active=true;Object.assign(a.MP,{active:true,role:'guest',slot:0});a.setState({sandbox:false,tl:0,score:[1,0]});b.p.set(0,.913,0);b.v.set(0,-2,0);a.ballSub(a.DT,true);assert.equal(a.getState().st,'PLAY');assert.deepEqual(Array.from(a.getState().score),[1,0]);
});

test('stability: full-speed aerial challenges and rotated contacts stay finite and enforce ball speed/spin caps immediately',()=>{
 const {a,b,c,T}=setup();c.enabled=true;c.ground=0;for(let i=0;i<24;i++){a.resetCar(c,0,0);c.p.set(0,5,0);c.ground=0;c.q.setFromAxisAngle(new T.Vector3(0,1,0),i*.19);c.v.set(23,0,0);c.w.set(0,2,-2);const box=a.bodyPhysics(c),point=new T.Vector3(box.center[0]+box.half[0]+.9125-.02,box.center[1],0).applyQuaternion(c.q).add(c.p);b.p.copy(point);b.v.set(-40,0,0);b.w.set(0,0,0);a.carBall(c);assert.ok([...b.v.toArray(),...b.w.toArray(),...c.v.toArray(),...c.w.toArray()].every(Number.isFinite));assert.ok(b.v.length()<=60.000001);assert.ok(b.w.length()<=6.000001);assert.ok(c.v.length()<=23.000001);assert.ok(c.w.length()<=5.500001);}
});

test('regression: Soccar contacts are mirror-symmetric and never steer toward a hidden goal target',()=>{
 const run=side=>{const {a,b,c}=setup(),box=a.bodyPhysics(c);c.enabled=true;c.p.set(0,4,0);c.q.identity();c.ground=0;c.v.set(15,0,0);b.p.set(box.center[0]+box.half[0]+.9125*.8-.005,4+box.center[1],side*(box.half[2]+.9125*.6));b.v.set(0,0,0);b.w.set(0,0,0);a.carBall(c);return {v:b.v.toArray(),w:b.w.toArray()};};const left=run(-1),right=run(1);for(let i=0;i<3;i++){near(left.v[i],right.v[i]*(i===2?-1:1),1e-8);near(left.w[i],right.w[i]*(i===2?1:-1),1e-8);}
});

test('stability: swept high-speed ball/car and arena contacts remain contained at ceiling, walls, corners and posts',()=>{
 const {a,b,c,T}=setup();for(let shot=0;shot<20;shot++){b.p.set(0,5,0);b.v.set(Math.sin(shot*2.4)*55,Math.cos(shot*.7)*18,Math.cos(shot*2.4)*55).setLength(60);b.w.set(1,.5,2);for(let i=0;i<240;i++){a.stepBall(a.DT);a.surf(b.p);assert.ok(a.getState().penetration>=.9125-.002,'ball must remain inside the rounded arena');assert.ok(b.v.length()<=60.000001);assert.ok(b.w.length()<=6.000001);}}
 c.enabled=true;a.resetCar(c,0,0);c.p.set(23*a.DT,4,0);c.prevP.set(0,4,0);c.q.identity();c.prevQ.copy(c.q);c.ground=0;c.v.set(23,0,0);b.p.set(1.7,4+a.bodyPhysics(c).center[1],0);b.v.set(-60,0,0);b.w.set(0,0,0);a.stepBall(a.DT);assert.ok(c.touches>0);assert.ok(b.v.x>0,'fast relative motion must register the contact');
});

test('determinism: repeated isolated contact sequences produce identical floating-point state',()=>{
 const run=()=>{const {a,b,c}=setup();c.enabled=true;c.ground=0;c.p.set(0,4,0);c.v.set(12,2,1);b.p.set(1.6,4.2,.3);b.v.set(-5,0,0);b.w.set(0,0,0);for(let i=0;i<60;i++){a.stepCar(c,a.DT);a.stepBall(a.DT);}return JSON.stringify([c.p.toArray(),c.q.toArray(),c.v.toArray(),c.w.toArray(),b.p.toArray(),b.v.toArray(),b.w.toArray()]);};assert.equal(run(),run());
});
