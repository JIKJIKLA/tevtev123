// Controlled Nivet regression fixtures, not a proprietary-engine fidelity score.
const fs=require('fs'),path=require('path'),load=require('../tests/harness.cjs');
const VERSIONS={'10.3.0':'fidelity-baseline-10.3.0','10.4.0':'control-baseline-10.4.0'};
function fresh(version='current'){
 const archived=VERSIONS[version]&&path.resolve(__dirname,'../../../outputs/'+VERSIONS[version]+'/index.html');
 if(archived&&!fs.existsSync(archived))throw Error('Missing immutable baseline '+archived);
 const g=load(archived?{htmlPath:archived}:{source:true}),a=g.api;a.cfg.size=1;a.cfg.mode=0;a.cfg.unlimited=false;a.configureCars();a.setState({st:'PLAY',sandbox:true});g.window.__NIVET_CONTROL_TRACE__=true;
 for(const c of a.cars)c.enabled=false;const c=a.cars[0];c.enabled=true;a.resetCar(c,0,0);c.q.identity();c.v.set(10,0,0);c.wy=1.2;c.boost=100;a.ball.p.set(-20,8,20);a.ball.v.set(0,0,0);a.ball.w.set(0,0,0);return{...g,a,c,T:a.THREE};
}
function supportedPose(s,roll,pitch=0){const{a,c,T}=s;c.q.setFromEuler(new T.Euler(roll,0,pitch));c.p.y=-Math.min(...a.bodyPhysics(c).wheels.map(p=>new T.Vector3(...p).applyQuaternion(c.q).y))+.015;}
const INPUT={thr:1,pitch:1,steer:1,yaw:1,roll:0,ps:0,boost:0};
const SCENARIOS={
 'four-wheel-steer':s=>supportedPose(s,0),
 'three-wheel-steer':s=>supportedPose(s,.1,.1),
 'two-wheel-steer':s=>supportedPose(s,0,.15),
 'one-wheel-steer':s=>supportedPose(s,.3,.15),
 'brief-support-loss':s=>{s.c.p.y=s.a.bodyPhysics(s.c).height+.145;},
 'side-landing':s=>{s.c.p.y=2;s.c.q.setFromAxisAngle(new s.T.Vector3(1,0,0),1.3);s.c.v.set(8,-5,0);s.c.ground=s.c.wasG=0;s.c.wy=0;},
 'diagonal-landing':s=>{s.c.p.y=2;s.c.q.setFromEuler(new s.T.Euler(.65,0,.3));s.c.v.set(10,-5,0);s.c.ground=s.c.wasG=0;s.c.wy=0;},
 'slide-release':s=>{s.c.v.set(12,0,5);s.c.wy=0;},
 'jump-drive-land':s=>{s.c.v.set(8,0,0);s.c.wy=0;},
 'wall-floor':s=>{s.c.p.set(40.96-s.a.bodyPhysics(s.c).height-.015,10,0);s.c.q.setFromAxisAngle(new s.T.Vector3(0,0,1),Math.PI/2);s.c.n.set(-1,0,0);s.c.v.set(0,-10,0);s.c.wy=0;},
 'corner-drive':s=>{s.c.p.set(34,s.a.bodyPhysics(s.c).height+.015,38);s.c.q.setFromAxisAngle(new s.T.Vector3(0,1,0),-Math.PI/4);s.c.v.set(10.6,0,10.6);s.c.wy=0;},
 'ball-hit-steer':s=>{s.c.v.set(16,0,0);s.c.wy=0;s.a.ball.p.set(1.6,.9125,0);},
 'roof-jump':s=>{s.c.p.y=.7;s.c.q.setFromAxisAngle(new s.T.Vector3(1,0,0),Math.PI);s.c.v.set(0,0,0);s.c.wy=0;s.c.ground=s.c.wasG=0;}
};
function inputFor(name,tick){const i={...INPUT};if(name==='slide-release'){i.ps=tick<36?1:0;i.steer=i.yaw=tick<36?1:0;}if(name==='wall-floor'){i.thr=i.pitch=-1;i.steer=i.yaw=.25;}if(name==='corner-drive'){i.steer=i.yaw=tick<60?.1:.7;}if(name==='roof-jump')Object.keys(i).forEach(k=>i[k]=0);if(name==='ball-hit-steer')i.steer=i.yaw=tick>0?1:0;return i;}
const rounded=v=>v.toArray().map(x=>Number(x.toFixed(9)));
function state(s){const{a,c,T}=s,w=c.w.clone().applyQuaternion(c.q),forward=new T.Vector3(1,0,0).applyQuaternion(c.q),right=new T.Vector3().crossVectors(forward,c.n).normalize();return{wheels:c.wheelsOn??0,ground:c.ground,wasSupport:c.wasG,wy:c.wy,actualYaw:c.ground?c.wy:-w.dot(c.n),angular:c.w.length(),speed:c.v.length(),slip:Math.abs(c.v.dot(right)),heading:Math.atan2(forward.z,forward.x),up:new T.Vector3(0,1,0).applyQuaternion(c.q).dot(c.n),p:rounded(c.p),v:rounded(c.v),w:rounded(c.w),q:rounded(c.q),normal:rounded(c.n),canJump:!!c.canJ,canDodge:!!c.canD,penetration:a.carPenetration(c)};}
function run(name,version='current',ticks=240,fullTrace=false){const s=fresh(version),{a,c}=s;if(!SCENARIOS[name])throw Error('Unknown scenario '+name);SCENARIOS[name](s);let noControllerTicks=0,maxAngular=0,maxPenetration=0,firstContact=null,firstStable=null,contactChanges=0,lastWheels=null,slipAfterRelease=null,gripAfterRelease=null;const trace=[],states={},samples=[];let first;
 for(let tick=0;tick<ticks;tick++){
  Object.assign(c.inp,inputFor(name,tick));if(name==='jump-drive-land'){c.jp=tick===12?1:0;c.jh=tick>=12&&tick<30?1:0;}if(name==='roof-jump'&&tick===60)c.jp=1;
  a.stepCar(c,a.DT);if(name==='ball-hit-steer')a.ballSub(a.DT);
  const value=state(s),t=(tick+1)*a.DT,branch=c.controlTrace?.branch||(c.ground?'driving':version==='10.4.0'&&c.wheelsOn&&!c.jl&&c.dT<=0?'no-ordinary-controller':c.hullContact?'hull':'air');if(!first)first=value;
  states[branch]=(states[branch]||0)+1;if(branch==='no-ordinary-controller')noControllerTicks++;if(value.wheels&&firstContact===null)firstContact=t;if(value.ground&&firstStable===null)firstStable=t;if(lastWheels!==null&&lastWheels!==value.wheels)contactChanges++;lastWheels=value.wheels;maxAngular=Math.max(maxAngular,value.angular);maxPenetration=Math.max(maxPenetration,value.penetration);
  if(name==='slide-release'&&tick>=36){if(slipAfterRelease===null&&value.slip<.5)slipAfterRelease=(tick-36+1)*a.DT;if(gripAfterRelease===null&&c.grip>=a.PHYS.ground.gripF*.9)gripAfterRelease=(tick-36+1)*a.DT;}
  if(tick%30===0||tick===ticks-1)samples.push({time:t,...value,branch});if(fullTrace)trace.push({time:t,...value,branch,control:c.controlTrace||null});
 }
 return{name,version,ticks,first,final:state(s),states,noControllerSeconds:version==='10.3.0'?null:noControllerTicks*a.DT,maxAngular,maxPenetration,firstWheelContact:firstContact,firstStableSupport:firstStable,contactChanges,slipBelowHalfAfterRelease:slipAfterRelease,grip90AfterRelease:gripAfterRelease,samples,...(fullTrace?{trace}:{})};
}
function measure(version='current'){return{version,conditions:'120Hz; Soccar; body0; deterministic positions/inputs; no bots; no rendering/camera contribution. One/two-wheel fixture gaps15mm, v10m/s, incoming yaw1.2rad/s. Baselines are immutable original built HTML, current is current source. No proprietary-game performance/parity claim.',scenarios:Object.keys(SCENARIOS).map(name=>run(name,version))};}
if(require.main===module){const version=process.argv[2]||'current',out=process.argv[3],data=measure(version);if(out)fs.writeFileSync(path.resolve(out),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(data.scenarios.map(x=>({name:x.name,firstWheels:x.first.wheels,firstYaw:x.first.actualYaw,blind:x.noControllerSeconds,stable:x.firstStableSupport,maxAngular:x.maxAngular,penetration:x.maxPenetration,slipAfterRelease:x.slipBelowHalfAfterRelease,grip90:x.grip90AfterRelease})),null,2));}
module.exports={fresh,supportedPose,state,run,measure,SCENARIOS,inputFor};
