// Reproducible mechanism probes, not a claim of recorded-game parity.
const fs=require('node:fs'),path=require('node:path'),load=require('../tests/harness.cjs');
const baseline=path.resolve(__dirname,'../../../outputs/fidelity-baseline-10.3.0/index.html');
function fresh(variant='current'){
 if(variant==='baseline'&&!fs.existsSync(baseline))throw Error('The archived 10.3.0 index.html is required for an honest before/after comparison: '+baseline);
 const options=variant==='baseline'?{htmlPath:baseline}:{source:true};
 const g=load(options),a=g.api;a.cfg.mode=0;a.cfg.size=1;a.configureCars();a.setState({st:'PLAY',sandbox:true});for(const c of a.cars){c.enabled=false;a.resetCar(c,0,0);c.q.identity();}a.ball.p.set(0,8,0);a.ball.v.set(0,0,0);a.ball.w.set(0,0,0);return {g,a,c:a.cars[0],b:a.ball};
}
const vec=v=>v.toArray().map(x=>Number(x.toFixed(9)));
function capture(a,c,b){return {ball:{p:vec(b.p),v:vec(b.v),w:vec(b.w),speed:b.v.length()},car:{p:vec(c.p),v:vec(c.v),w:vec(c.w),wy:c.wy},touches:c.touches};}
const CONTACTS=[
 {name:'gentle-ground-bumper',speed:1,ground:true},
 {name:'ground-straight-10',speed:10,ground:true},
 {name:'ground-full-speed',speed:23,ground:true},
 {name:'air-front-centered',speed:10},
 {name:'air-angled-corner',speed:15,corner:true},
 {name:'hood-catch',speed:0,face:'roof',ballVelocity:[2,-4,0]},
 {name:'side-swipe',speed:0,face:'side',velocity:[0,0,10]},
 {name:'underside-touch',speed:0,face:'under',velocity:[0,-8,0]},
 {name:'rising-aerial',speed:13,velocity:[13,6,0],ballVelocity:[-2,-2,0]},
 {name:'falling-aerial',speed:10,velocity:[10,-7,0],ballVelocity:[-4,2,0]},
 {name:'moving-ball-challenge',speed:23,ballVelocity:[-20,0,0]},
 {name:'rotating-front-contact',speed:8,angular:[0,0,-3]}
];
function contactScenario(spec,variant){
 const {a,c,b}=fresh(variant),h=a.bodyPhysics(c),T=a.THREE;c.enabled=true;c.ground=spec.ground?1:0;c.p.set(0,spec.ground?h.height:4,0);c.q.identity();c.v.fromArray(spec.velocity||[spec.speed,0,0]);c.w.fromArray(spec.angular||[0,0,0]);c.wy=0;
 const center=new T.Vector3(...h.center).add(c.p),half=h.half,R=.9125;
 if(spec.face==='roof')b.p.copy(center).add(new T.Vector3(0,half[1]+R-.005,0));
 else if(spec.face==='under')b.p.copy(center).add(new T.Vector3(0,-half[1]-R+.005,0));
 else if(spec.face==='side')b.p.copy(center).add(new T.Vector3(0,0,half[2]+R-.005));
 else if(spec.corner)b.p.copy(center).add(new T.Vector3(half[0]+R*.8-.005,0,half[2]+R*.6));
 else if(spec.ground){const dy=R-(center.y+half[1]);b.p.set(center.x+half[0]+Math.sqrt(R*R-dy*dy)-.005,R,0);}
 else b.p.copy(center).add(new T.Vector3(half[0]+R-.005,0,0));
 b.v.fromArray(spec.ballVelocity||[0,0,0]);b.w.set(0,0,0);const initial=capture(a,c,b);a.carBall(c);const outgoing=capture(a,c,b);c.enabled=false;const trajectory=[];for(let tick=1;tick<=120;tick++){a.ballSub(a.DT);if([12,60,120].includes(tick))trajectory.push({t:tick*a.DT,p:vec(b.p),v:vec(b.v),w:vec(b.w)});}return {name:spec.name,initial,outgoing,trajectory};
}
function bounceScenario(name,variant,velocity,spin,normal='floor'){
 const {a,b,c}=fresh(variant),R=.9125;b.p.set(0,normal==='floor'?R+.002:5,0);b.v.fromArray(velocity);b.w.fromArray(spin);if(normal==='wall')b.p.x=40.96-R-.002;if(normal==='ceiling')b.p.y=20.48-R-.002;
 const initial=capture(a,c,b);a.ballSub(a.DT);return {name,initial,outgoing:capture(a,c,b)};
}
function rollingScenario(variant,goal=false){const {a,b}=fresh(variant);b.p.set(0,.9125,goal?46:0);b.v.set(goal?0:4,0,goal?4:0);b.w.set(goal?4/.9125:0,0,goal?0:-4/.9125);let peak=b.p.y;const samples=[];for(let tick=1;tick<=360;tick++){a.ballSub(a.DT);peak=Math.max(peak,b.p.y);if(tick%30===0)samples.push({t:tick*a.DT,p:vec(b.p),v:vec(b.v),w:vec(b.w)});}return {peakRise:peak-.9125,samples};}
function dribbleScenario(variant){const {a,b,c}=fresh(variant),box=a.bodyPhysics(c);c.enabled=true;c.ground=1;c.p.set(0,box.height,0);c.q.identity();c.v.set(8,0,0);b.p.set(box.center[0],c.p.y+box.center[1]+box.half[1]+.9125+.002,0);b.v.set(8,0,0);b.w.set(0,0,0);const samples=[];for(let tick=1;tick<=120;tick++){c.prevP.copy(c.p);c.prevQ.copy(c.q);c.p.x+=8*a.DT;c.v.set(8,0,0);c.w.set(0,0,0);c.wy=0;c.ballHitCooldown=Math.max(0,(c.ballHitCooldown||0)-a.DT);a.stepBall(a.DT);if(tick%12===0)samples.push({t:tick*a.DT,relativeP:vec(b.p.clone().sub(c.p)),v:vec(b.v),w:vec(b.w),touches:c.touches});}return {conditions:'Controlled kinematic 8 m/s car; matching initial ball velocity on hood; tests sustained contact response, not player steering or full suspension.',samples};}
function measure(variant='current'){
 const contacts=CONTACTS.map(s=>contactScenario(s,variant)),bounces=[bounceScenario('floor-oblique',variant,[8,-10,2],[1,.4,-2]),bounceScenario('floor-gentle',variant,[2,-1,0],[0,0,0]),bounceScenario('wall-oblique',variant,[10,2,8],[1,.4,-2],'wall'),bounceScenario('ceiling-oblique',variant,[8,10,2],[1,.4,-2],'ceiling')];
 const {a,b}=fresh(variant);b.p.set(0,12,0);b.v.set(10,2,0);b.w.set(.5,1,2);const free=[];for(let i=1;i<=120;i++){a.ballSub(a.DT);if([12,60,120].includes(i))free.push({t:i*a.DT,p:vec(b.p),v:vec(b.v),w:vec(b.w)});}
 return {variant,conditions:{dt:1/120,units:'metres, seconds, kilograms, radians',axes:'world Y up, local +X forward, local +Z right',mode:'standard Soccar; direct isolated contact followed by free ball steps',referenceLimits:'No fresh Rocket League recording was available; authored measurement equations and pinned simulator source only.'},contacts,bounces,free,rolling:rollingScenario(variant),goalEntrance:rollingScenario(variant,true),dribble:dribbleScenario(variant)};
}
if(require.main===module){const variant=process.argv[2]||'current',out=process.argv[3],result=measure(variant);if(out)fs.writeFileSync(path.resolve(out),JSON.stringify(result,null,2));console.log(JSON.stringify({variant,contacts:result.contacts.map(x=>({name:x.name,speed:x.outgoing.ball.speed,velocity:x.outgoing.ball.v,spin:x.outgoing.ball.w,carVelocity:x.outgoing.car.v})),bounces:result.bounces,free:result.free},null,2));}
module.exports={fresh,CONTACTS,contactScenario,bounceScenario,measure};
