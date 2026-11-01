const test=require('node:test'),assert=require('node:assert/strict');
const {fresh,observation,freeDodge,driveDodge,direction,gripRelease,slideTurn,controlAvailability}=require('../scripts/measure-dodge-recovery.cjs');

test('regression: neutral front/back/side dodges complete a single controlled rotation and do not retain substantial carry spin',()=>{
 for(const kind of ['front','back','side']){const r=freeDodge('current',kind),end=r.frames.find(f=>f.t===.65),later=r.frames.find(f=>f.t===1);assert.ok(Math.abs(Math.abs(end.rotation)-2*Math.PI)<.08,kind+' must complete the requested flip');assert.ok(end.roof>.98,kind+' ends with its original roof orientation');assert.ok(later.roof>.98,kind+' must not tip over from residual actuator spin');assert.ok(Math.hypot(...end.w)<.6);assert.ok(r.roofDown<.4,kind+' does not remain roof-down after the active flip');assert.ok(r.maxSpin<=10,'a finite actuator, not runaway angular velocity');}
});

test('regression: a normal jump/dodge/landing retains steering and forward momentum',()=>{
 for(const kind of ['front','back','side']){const r=driveDodge('current',kind,false);assert.ok(r.landing&&r.landing.t<1.45,kind+' returns to supported control promptly');assert.ok(r.landing.roof>.9);assert.ok(r.roofDown<.4);assert.ok(r.frames.every(f=>f.penetration<.02));
  const s=fresh(),{a,c}=s;c.v.x=10;let landed=false;
  for(let k=0;k<240;k++){Object.assign(c.inp,{thr:1,pitch:k===24?(kind==='back'?-1:kind==='front'?1:0):0,yaw:k===24&&kind==='side'?1:0});c.jp=k===0||k===24?1:0;c.jh=k<12?1:0;a.stepCar(c,a.DT);if(k>24&&c.ground){landed=true;break;}}
  assert.ok(landed);const before=observation(s);Object.assign(c.inp,{thr:1,steer:.7,yaw:.7,pitch:0});for(let k=0;k<18;k++)a.stepCar(c,a.DT);const after=observation(s),heading=Math.atan2(Math.sin(after.heading-before.heading),Math.cos(after.heading-before.heading));assert.ok(heading>.03,kind+' responds to steering after landing');assert.ok(after.forward>before.forward*.6,kind+' preserves useful landing momentum');
 }
});

test('regression: opposite-pitch cancellation changes rotation without adding another launch, and orthogonal control survives the phase exit',()=>{
 for(const kind of ['front','back']){const plain=freeDodge('current',kind),cancel=freeDodge('current',kind,true),p=plain.frames.find(f=>f.t===.65),q=cancel.frames.find(f=>f.t===.65);assert.ok(Math.abs(q.rotation)<Math.abs(p.rotation)*.5);for(let i=0;i<3;i++)assert.ok(Math.abs(p.v[i]-q.v[i])<1e-10);}
 const s=fresh(),{a,c}=s;c.p.y=12;c.ground=c.wasG=0;c.dT=.001;c.dcd=.001;c.flipAxis.set(0,0,-1);c.w.set(2,1,-3);a.stepCar(c,a.DT);assert.ok(Math.abs(c.w.x-2)<1e-12&&Math.abs(c.w.y-1)<1e-12,'completed pitch actuator preserves orthogonal player rotation');assert.ok(Math.abs(c.w.z)<.25,'only actuator-axis carry is braked');
});

test('regression: pitch/yaw/roll accept new input immediately after the finite dodge phase',()=>{
 const records=controlAvailability();for(const r of records)assert.ok(r.response>.01,`${r.axis} remains responsive at ${r.time}s, rather than an unexplained post-flip lock`);
});

test('regression: duplicate or opposed air-roll bindings cannot erase or skew the steering dodge direction',()=>{
 const straight=direction('current',{yaw:1}),opposed=direction('current',{yaw:1,roll:-1}),diagonal=direction('current',{pitch:1,yaw:1}),duplicate=direction('current',{pitch:1,yaw:1,roll:1});for(let i=0;i<3;i++){assert.ok(Math.abs(straight.v[i]-opposed.v[i])<1e-12);assert.ok(Math.abs(diagonal.v[i]-duplicate.v[i])<1e-12);}assert.ok(Math.hypot(...opposed.v)>4,'steering input still requests a real dodge');const roll=direction('current',{roll:1});assert.ok(roll.v[2]>4,'roll-only fallback remains supported');
});

test('regression: powerslide release regains useful lateral grip without flattening momentum',()=>{
 const release=gripRelease();assert.ok(release.frames[0].lateral>5.8,'initial slip is removed by bounded tyre forces');assert.ok(release.settled>=.1&&release.settled<=.3,'within one30Hz displayframe of the older .267s release response');const quarter=release.frames.find(f=>f.t===.25);assert.ok(Math.abs(quarter.lateral)<.75);const turn=slideTurn(),atOne=turn.frames.find(f=>f.t===1),later=turn.frames.find(f=>f.t===1.5);assert.ok(Math.abs(atOne.lateral)<4.5,'combined turn/release recovers useful grip');assert.ok(later.forward>atOne.forward,'boost can accelerate after the slide');assert.ok(turn.frames.every(f=>f.penetration<.02&&Math.hypot(...f.v)<=23.00001));
});

test('stability: ordinary aerials retain their angular bound outside the deliberate dodge actuator',()=>{const s=fresh(),{a,c}=s;c.p.y=12;c.ground=c.wasG=0;c.w.set(12,9,-11);for(let k=0;k<120;k++){Object.assign(c.inp,{pitch:.7,yaw:-.8,roll:.9});a.stepCar(c,a.DT);assert.equal(c.dT,0);assert.ok(c.w.length()<=5.500001);assert.ok(c.p.toArray().every(Number.isFinite));}});

test('combined recovery: holding forward through a dodge still permits partial-contact steering and a supported turn',()=>{
 const s=fresh(),{a,c,g}=s;g.window.__NIVET_CONTROL_TRACE__=true;c.v.x=10;
 let firstStable=null,steeredPartial=false;
 for(let k=0;k<300;k++){
  // Native keyboard W drives and pitches in the air. Keep both intents held,
  // then steer before touchdown instead of making the favorable neutral-pitch
  // assumption used to isolate the finite rotation actuator above.
  Object.assign(c.inp,{thr:1,pitch:1,steer:k>=150?.7:0,yaw:k>=150?.7:0,roll:0,boost:0,ps:0});c.jp=k===0||k===24?1:0;c.jh=k<12?1:0;a.stepCar(c,a.DT);
  assert.ok(['air','partial','stable','hull','dodge','auto-flip'].includes(c.controlTrace.branch));
  if(k>=150&&c.controlTrace.branch==='partial'&&Math.abs(c.controlTrace.steeringTarget)>.1)steeredPartial=true;
  if(k>24&&c.ground&&firstStable===null)firstStable=(k+1)*a.DT;
  assert.ok(a.carPenetration(c)<.005);assert.ok(c.p.toArray().every(Number.isFinite));
 }
 assert.ok(steeredPartial,'steering must act before full support returns');assert.ok(firstStable!==null&&firstStable<2.5,'the combined recovery must settle into an ordinary turn');
 const end=observation(s);assert.ok(end.ground&&end.wheels>=3);assert.ok(end.heading>.5,'holding forward must not suppress the requested turn');assert.ok(end.forward>8,'a usable recovery keeps driving momentum');
});
