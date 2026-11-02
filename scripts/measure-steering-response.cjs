// Identical controller inputs across immutable handling baselines and current
// source. This is a fixed-step solver probe, never a native-input/FPS benchmark.
const fs=require('node:fs'),path=require('node:path'),load=require('../tests/harness.cjs');
const archives={'10.3':'fidelity-baseline-10.3.0','10.4':'control-baseline-10.4.0','10.5':'handling-baseline-10.5.0'};
function fresh(version='current'){
 const htmlPath=archives[version]&&path.resolve(__dirname,'../../../outputs',archives[version],'index.html');if(htmlPath&&!fs.existsSync(htmlPath))throw Error('Missing immutable handling baseline: '+htmlPath);
 const g=load(htmlPath?{htmlPath}:{source:true}),a=g.api,T=a.THREE,c=a.cars[0];g.window.__NIVET_CONTROL_TRACE__=true;Object.assign(a.cfg,{mode:0,size:1,speed:1,gravity:1,unlimited:false});a.configureCars();a.setState({st:'PLAY',sandbox:true});for(const other of a.cars)other.enabled=other===c;a.resetCar(c,0,0);c.q.identity();c.v.x=8;c.boost=100;a.ball.p.set(-25,8,25);a.ball.v.set(0,0,0);a.ball.w.set(0,0,0);return{g,a,c,T};
}
const scenarios={
 'turn-low':{speed:3,steer:1,ticks:240},'turn-medium':{speed:8,steer:1,ticks:240},'turn-high':{speed:20,steer:1,ticks:240},
 'slide-release-turn':{speed:14,ticks:180},'brake-reverse':{speed:8,ticks:180},
 'tap-jump-drive':{jump:12,jumpHold:1,ticks:300},'held-jump-drive':{jump:12,jumpHold:24,ticks:300},
 'jump-drive-land-steer':{jump:12,jumpHold:1,steerAfter:120,ticks:300},
 'front-flip-drive-turn':{jump:12,jumpHold:1,dodge:36,steerAfter:210,ticks:360},
 'fresh-pitch-in-air':{jump:12,jumpHold:1,releaseStart:30,releaseEnd:36,ticks:180},
 'independent-pitch':{jump:12,jumpHold:1,independent:true,ticks:180},
 'already-air-explicit-pitch':{air:true,ticks:48},
 'ball-impact-then-turn':{ball:true,speed:16,steerAfter:1,ticks:180}
};
function input(name,tick){
 const cfg=scenarios[name],i={thr:1,pitch:1,steer:cfg.steer||0,yaw:cfg.steer||0,roll:0,ps:0,boost:0,coupledPitch:cfg.independent?0:1};
 if(Number.isFinite(cfg.steerAfter)&&tick>=cfg.steerAfter)i.steer=i.yaw=.7;
 if(name==='slide-release-turn'){i.ps=tick<72?1:0;i.steer=i.yaw=tick<72?1:.5;}
 if(name==='brake-reverse'){i.thr=i.pitch=-1;i.steer=i.yaw=tick>=120?.7:0;}
 if(cfg.releaseStart!==undefined&&tick>=cfg.releaseStart&&tick<cfg.releaseEnd)i.thr=i.pitch=i.coupledPitch=0;
 return i;
}
const round=n=>Number(n.toFixed(9)),array=v=>v.toArray().map(round);
function observe(s){const{a,c,T}=s,f=new T.Vector3(1,0,0).applyQuaternion(c.q),r=new T.Vector3(0,0,1).applyQuaternion(c.q),w=c.w.clone().applyQuaternion(c.q),yaw=c.ground?c.wy:-w.dot(c.n);return{p:array(c.p),v:array(c.v),w:array(c.w),q:array(c.q),normal:array(c.n),roofUp:round(new T.Vector3(0,1,0).applyQuaternion(c.q).y),heading:Math.atan2(f.z,f.x),yawRate:round(yaw),speed:round(c.v.length()),forwardSpeed:round(c.v.dot(f)),slip:round(c.v.dot(r)),wheels:c.wheelsOn||0,reportedGround:!!c.ground,carriedPitch:c.carriedPitch??null,branch:c.controlTrace?.branch||(c.ground?'legacy-ground':c.wheelsOn&&!c.jl?'legacy-partial':'legacy-air'),normalSpeed:round(c.v.dot(c.n)),penetration:round(a.carPenetration(c)),trace:c.controlTrace||null};}
function run(name,version='current',full=false){
 const cfg=scenarios[name];if(!cfg)throw Error('Unknown steering scenario '+name);const s=fresh(version),{a,c}=s;c.v.x=cfg.speed??8;if(cfg.air){c.p.y=6;c.ground=c.wasG=0;c.v.set(0,0,0);}if(cfg.ball)a.ball.p.set(1.6,.9125,0);
 let seenAir=false,firstStable=null,firstWheel=null,firstPitch=null,firstRoof=null,firstSteering=null,heading=0,lastHeading=0,minUp=1,maxSlip=0,maxSpin=0,maxPenetration=0,roofDownTicks=0,contactChanges=0,lastState='',releaseSlip=null;const branches={},events=[],samples=[],frames=[];
 for(let tick=0;tick<cfg.ticks;tick++){
  Object.assign(c.inp,input(name,tick));c.jp=tick===cfg.jump||tick===cfg.dodge?1:0;c.jh=cfg.jump!==undefined&&tick>=cfg.jump&&tick<cfg.jump+cfg.jumpHold?1:0;a.stepCar(c,a.DT);if(cfg.ball)a.ballSub(a.DT);const v=observe(s),t=(tick+1)*a.DT;
  heading+=Math.atan2(Math.sin(v.heading-lastHeading),Math.cos(v.heading-lastHeading));lastHeading=v.heading;minUp=Math.min(minUp,v.roofUp);maxSlip=Math.max(maxSlip,Math.abs(v.slip));maxSpin=Math.max(maxSpin,c.w.length());maxPenetration=Math.max(maxPenetration,v.penetration);if(v.roofUp<0)roofDownTicks++;
  if(!c.ground&&tick>=(cfg.jump??0))seenAir=true;if(seenAir&&v.wheels&&firstWheel===null)firstWheel=t;if(seenAir&&v.wheels>=3&&c.ground&&v.roofUp>.95&&firstStable===null)firstStable=t;
  if(!c.ground&&Math.abs(c.w.z)>.02&&firstPitch===null)firstPitch={tick,time:round(t),roofUp:v.roofUp,angular:v.w};if(v.roofUp<0&&firstRoof===null)firstRoof={tick,time:round(t),branch:v.branch};if(Math.abs(c.inp.steer)>.1&&Math.abs(v.yawRate)>.05&&firstSteering===null)firstSteering=t;
  const state=v.branch+'/'+v.wheels;branches[v.branch]=(branches[v.branch]||0)+1;if(state!==lastState){if(lastState)contactChanges++;events.push({tick,time:round(t),state,roofUp:v.roofUp,normalSpeed:v.normalSpeed,pitchRate:v.w[2],yawRate:v.yawRate,carriedPitch:v.carriedPitch});lastState=state;}
  if(name==='slide-release-turn'&&tick===101)releaseSlip=v.slip;if(tick%24===0||tick===cfg.ticks-1)samples.push({tick,time:round(t),...v,trace:undefined});if(full)frames.push({tick,time:round(t),input:{...c.inp},...v});
 }
 const final=observe(s);return{name,version,conditions:cfg,ticks:cfg.ticks,firstActualWheelAfterDeparture:firstWheel,firstStableThreeWheels:firstStable,firstAirPitch:firstPitch,firstRoofDown:firstRoof,firstSteeringSeconds:firstSteering,headingChange:round(heading),minRoofUp:minUp,maxLateralSlip:maxSlip,maxLocalAngularSpeed:round(maxSpin),maxResidualPenetration:maxPenetration,roofDownSeconds:round(roofDownTicks*a.DT),contactStateChanges:contactChanges,slipQuarterSecondAfterRelease:releaseSlip,branches,events,samples,final:{...final,trace:undefined},...(full?{frames}:{})};
}
function measure(versions=['10.3','10.4','10.5','current']){return{conditions:{units:'metres/seconds',simulationHz:120,body:0,arena:'Soccar, default gravity/speed, one enabled car, ball isolated except impact case',input:'Keyboard-style W has thr=1,pitch=1,coupledPitch=1; A/D have steer=yaw. Historical versions ignore the new origin metadata. Independent-axis cases use coupledPitch=0. These are actual solver inputs, not native browser events.',firstStableDefinition:'After leaving support, actual >=3 wheels, reported ground, roofUp>.95; older one-wheel full-ground recovery is recorded separately.',limitations:'Different controllers can recover by different trajectories. No screen, camera, hardware FPS or proprietary-fidelity claim is inferred. Frozen archive files are required for historical measurements.'},records:versions.flatMap(v=>Object.keys(scenarios).map(n=>run(n,v)))};}
if(require.main===module){const versions=process.argv[2]?process.argv[2].split(','):undefined,result=measure(versions);if(process.argv[3])fs.writeFileSync(path.resolve(process.argv[3]),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.records.map(({name,version,minRoofUp,firstStableThreeWheels,firstAirPitch,firstRoofDown,maxLocalAngularSpeed,roofDownSeconds,slipQuarterSecondAfterRelease})=>({name,version,minRoofUp,firstStableThreeWheels,firstAirPitch,firstRoofDown,maxLocalAngularSpeed,roofDownSeconds,slipQuarterSecondAfterRelease})),null,2));}
module.exports={fresh,input,observe,run,measure,scenarios};
