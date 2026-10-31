const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function car(){const g=load({source:true}),a=g.api;a.cfg.size=1;a.cfg.mode=0;a.cfg.speed=1;a.cfg.gravity=1;a.cfg.unlimited=false;a.configureCars();a.setState({st:'PLAY',sandbox:true});for(const c of a.cars)c.enabled=false;const c=a.cars[0];c.enabled=true;a.resetCar(c,0,0);c.q.identity();c.boost=100;return{...g,a,c,T:a.THREE};}
function air(s,y=12){s.c.p.set(0,y,0);s.c.wasG=s.c.ground=0;return s;}
const near=(v,target,tol,label)=>assert.ok(Math.abs(v-target)<=tol,(label||'value')+': '+v+' versus '+target+' ± '+tol);
function ticks(s,count,input={}){Object.assign(s.c.inp,input);for(let k=0;k<count;k++)s.a.stepCar(s.c,s.a.DT);return s.c;}
function pose(c){return{p:c.p.toArray(),v:c.v.toArray(),q:c.q.toArray(),w:c.w.toArray(),canD:c.canD,dT:c.dT,dcd:c.dcd,handbrake:c.handbrake};}

test('fidelity: straight throttle, braking, coast and separate air throttle retain independently measured curves',()=>{
 for(const [speed,target]of [[0,16],[5,10.8571428571],[10,5.7142857143],[14,1.6],[14.1,0]]){const s=car();s.c.v.x=speed;ticks(s,1,{thr:1});near((s.c.v.x-speed)/s.a.DT,target,.02,'throttle acceleration at '+speed);}
 let s=car();s.c.v.x=10;ticks(s,30,{thr:-1});near(s.c.v.x,1.25,.03,'3500 uu/s² braking');s=car();s.c.v.x=10;ticks(s,120);near(s.c.v.x,4.75,.03,'525 uu/s² coasting');
 for(const [thr,target]of [[1,2/3],[-1,-1/3]]){s=air(car());ticks(s,12,{thr});near(s.c.v.x/.1,target,.002,'air throttle');}
 s=car();ticks(s,120,{boost:1});near(s.c.boost,66.7,.04,'boost use');let target=0;for(let k=0;k<120;k++){const throttle=target<14?16-14.4/14*target:target<14.1?1.6*(14.1-target)/.1:0;target+=(throttle+29.75/3)/120;}near(s.c.v.x,target,.00001,'independent boost/throttle force integration');
});

test('fidelity: flat tap and held jump trajectories agree with the independent RLBot force sum',()=>{
 for(const held of [false,true]){const s=car(),start=s.c.p.y;let vy=2.92,height=start;s.c.jp=1;s.c.jh=held?1:0;for(let k=0;k<84;k++){if(k<(held?24:3))vy+=14.6/120;if(k<3)vy-=3.25/120;vy-=6.5/120;height+=vy/120;ticks(s,1);near(s.c.v.y,vy,.00002,'jump vertical velocity tick '+k);near(s.c.p.y,height,.00002,'jump height tick '+k);}}
});

test('fidelity: directional dodge impulse depends on forward speed and direction, including roll input',()=>{
 for(const speed of [-10,0,10,20])for(const [input,axis]of [[{pitch:1},'forward'],[{pitch:-1},'back'],[{yaw:1},'side'],[{roll:1},'side'],[{pitch:1,yaw:1},'diagonal']]){
  const s=air(car());s.c.v.x=speed;s.c.jp=1;Object.assign(s.c.inp,input);ticks(s,1);const forward=axis==='forward'?1:axis==='back'?-1:axis==='diagonal'?Math.SQRT1_2:0,side=axis==='side'?1:axis==='diagonal'?Math.SQRT1_2:0,backward=Math.abs(speed)<1?forward<0:(forward>=0)!==(speed>=0),ratio=Math.abs(speed)/23;
  let vx=speed+forward*5*(backward?16/15*(1+1.5*ratio):1),vz=side*5*(1+.9*ratio),vy=-6.5/120,scale=Math.min(1,23/Math.hypot(vx,vy,vz));near(s.c.v.x,vx*scale,.00001,axis+' X at '+speed);near(s.c.v.z,vz*scale,.00001,axis+' Z at '+speed);near(s.c.v.y,vy*scale,.00001,'no instant vertical deletion');assert.equal(s.c.canD,0);
 }
});

test('fidelity: dodge classification uses the shared L1 threshold rather than a low Euclidean threshold',()=>{
 for(const [input,directional]of [[{pitch:.49},false],[{pitch:.5},true],[{pitch:.3,yaw:.3},true],[{roll:.5},true]]){const s=air(car());s.c.jp=1;ticks(s,1,input);assert.equal(s.c.dT>0,directional);if(!directional)near(s.c.v.y,2.92-6.5/120,.00001,'neutral second jump');}
});

test('fidelity: falling velocity survives the first 0.15 seconds of a dodge, then receives timed damping',()=>{
 const s=air(car(),15);s.c.v.y=-6;s.c.jp=1;let vy=-6;for(let k=1;k<=32;k++){vy-=6.5/120;const age=k/120;if(age+1e-9>=.15&&(vy<0||age<.21-1e-9))vy*=.65;ticks(s,1,k===1?{pitch:1}:{});near(s.c.v.y,vy,.00001,'dodge vertical velocity tick '+k);if(k===1)assert.ok(s.c.v.y<-6,'no instantaneous upward correction');}
 const rising=air(car(),8);rising.c.v.y=20;rising.c.jp=1;let previous=0;for(let k=0;k<60;k++){ticks(rising,1,{yaw:1});if(k===25)previous=rising.c.v.y;if(k===26&&previous>0)near(rising.c.v.y,previous-6.5/120,.00001,'upward damping ends after 0.21 seconds');}
});

test('fidelity/stability: flips accelerate under torque and obey the same 5.5 rad/s limit as free aerials',()=>{
 const s=air(car());s.c.jp=1;ticks(s,1,{pitch:1});near(s.c.w.z,-224/120,.00001,'initial forward-flip torque response');for(let k=0;k<180;k++){ticks(s,1);assert.ok(s.c.w.length()<=5.500001);}
 const f=air(car());ticks(f,1,{pitch:.4,yaw:.5,roll:.7});const scale=2*Math.PI*1000/65536;near(f.c.w.x,.7*400*scale/120,1e-10);near(f.c.w.y,-.5*95*scale/120,1e-10);near(f.c.w.z,-.4*130*scale/120,1e-10);
});

test('integration: flip cancellation removes pitch torque without creating another linear impulse',()=>{
 function run(cancel){const s=air(car());s.c.jp=1;ticks(s,8,{pitch:1});const before=s.c.v.clone();ticks(s,24,{pitch:cancel?-1:1});return{s,before};}
 const plain=run(false),cancel=run(true);assert.ok(Math.abs(cancel.s.c.w.z)<Math.abs(plain.s.c.w.z)*.7);near(cancel.s.c.v.x,cancel.before.x,1e-10);near(cancel.s.c.v.z,cancel.before.z,1e-10);near(cancel.s.c.v.x,plain.s.c.v.x,1e-10);
});

test('fidelity: handbrake grip state ramps in 0.2 seconds and recovers in 0.5 seconds',()=>{
 const s=car();ticks(s,12,{ps:1});near(s.c.handbrake,.5,1e-10);ticks(s,12);near(s.c.handbrake,1,1e-10);ticks(s,30,{ps:0});near(s.c.handbrake,.5,1e-10);ticks(s,30);near(s.c.handbrake,0,1e-10);
});

test('correctness: a neutral roof remains a recovery opportunity; an explicit roof jump self-rights',()=>{
 const s=car();s.c.q.setFromAxisAngle(new s.T.Vector3(1,0,0),Math.PI);ticks(s,240);const up=new s.T.Vector3(0,1,0);assert.ok(up.applyQuaternion(s.c.q).y<-.98,'no passive timed pose correction');s.c.jp=1;ticks(s,120);assert.ok(up.set(0,1,0).applyQuaternion(s.c.q).y>.98,'roof-jump torque is a deliberate recovery');assert.ok(s.c.ground);assert.ok(s.a.carPenetration(s.c)<.02);
});

test('fidelity: only renewed three-wheel support resets the jump/dodge state',()=>{
 const s=car();s.c.q.setFromAxisAngle(new s.T.Vector3(1,0,0),65*Math.PI/180);s.c.canD=0;s.c.jumped=1;s.c.jAge=2;ticks(s,1);assert.ok(s.c.wheelsOn<3);assert.equal(s.c.canD,0);s.c.q.identity();s.c.p.set(0,s.a.bodyPhysics(s.c).height+.015,0);s.c.w.set(0,0,0);ticks(s,1);assert.ok(s.c.wheelsOn>=3);assert.equal(s.c.canD,1);assert.equal(s.c.dcd,0);
 const ceiling=car();ceiling.c.q.setFromAxisAngle(new ceiling.T.Vector3(1,0,0),Math.PI);ceiling.c.p.set(0,20.48-ceiling.a.bodyPhysics(ceiling.c).height-.015,0);ceiling.c.n.set(0,-1,0);ticks(ceiling,1);ceiling.c.p.y=19.9;ticks(ceiling,240);assert.equal(ceiling.c.jumped,0);assert.equal(ceiling.c.canD,1,'driving/falling off a surface does not start the jump expiry timer');ceiling.c.jp=1;ticks(ceiling,1,{pitch:1});assert.ok(ceiling.c.dT>0);
});

test('integration: an ordinary near-floor dodge can produce a wavedash contact reset without a trick button',()=>{
 const s=air(car(),.31);s.c.q.setFromAxisAngle(new s.T.Vector3(0,0,1),.2);s.c.v.set(5,-1,0);s.c.jp=1;ticks(s,1,{pitch:1});assert.ok(s.c.v.x>9);let reset=false;for(let k=0;k<120;k++){ticks(s,1,{pitch:0});assert.ok(s.a.carPenetration(s.c)<.02);if(s.c.ground){reset=true;assert.equal(s.c.dT,0);assert.equal(s.c.dcd,0);assert.equal(s.c.canD,1);break;}}assert.ok(reset,'the standard wheel contact state resets the flip');
});

test('regression/stability: combined slide/boost and aerial inputs are deterministic across display groupings',()=>{
 const result=[];for(const fps of [30,60,120]){const s=car();let tick=0;for(let frame=0;frame<fps*2;frame++)for(let k=0;k<120/fps;k++,tick++){if(tick===126)s.c.jp=1;Object.assign(s.c.inp,tick<60?{thr:1,pitch:0,steer:0,yaw:0,roll:0,ps:0,boost:0}:tick<120?{thr:1,pitch:0,steer:1,yaw:0,roll:0,ps:1,boost:0}:{thr:1,pitch:.3,steer:0,yaw:.3,roll:0,ps:0,boost:1});s.c.jh=tick>=126&&tick<145?1:0;ticks(s,1);assert.ok(s.a.carPenetration(s.c)<.02);assert.ok(s.c.w.length()<=5.500001);}result.push(pose(s.c));}assert.equal(JSON.stringify(result[0]),JSON.stringify(result[1]));assert.equal(JSON.stringify(result[1]),JSON.stringify(result[2]));
});
