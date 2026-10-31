// Deterministic vehicle probes. Numbers are observations, not proof of engine parity.
const fs=require('node:fs'),path=require('node:path'),load=require('../tests/harness.cjs');
const BASELINE=path.resolve(__dirname,'../../../outputs/fidelity-baseline-10.3.0/index.html');
function measure(options={}){
 const g=load(options),a=g.api,T=a.THREE,c=a.cars[0],Y=new T.Vector3(0,1,0),X=new T.Vector3(1,0,0);
 a.cfg.mode=0;a.cfg.speed=1;a.cfg.gravity=1;a.cfg.unlimited=false;a.configureCars();a.setState({st:'PLAY',sandbox:true});
 function reset(air=false){a.resetCar(c,0,0);c.q.identity();c.body=0;c.v.set(0,0,0);if(air){c.p.y=10;c.ground=c.wasG=0;}return c;}
 const snap=()=>({p:c.p.toArray(),v:c.v.toArray(),w:c.w.toArray(),q:c.q.toArray(),ground:c.ground,wheels:c.wheelsOn,canD:c.canD,boost:c.boost});
 function drive(seconds,input,initial=0){reset();c.boost=100;c.v.x=initial;Object.assign(c.inp,input);for(let k=0;k<Math.round(seconds/a.DT);k++){a.stepCar(c,a.DT);c.p.x=c.p.z=0;}return snap();}
 const report={build:a.BUILD||'see artifact manifest',units:'metres, seconds; local +X forward, +Y roof, +Z right; 120 Hz',ground:{},air:{},dodge:[],jump:{},contact:{},integration:{}};
 for(const speed of [0,5,10,14,14.1]){reset();c.v.x=speed;c.inp.thr=1;a.stepCar(c,a.DT);report.ground['accelAt'+speed]=(c.v.x-speed)/a.DT;}
 report.ground.forward1=drive(1,{thr:1}).v[0];report.ground.forward4=drive(4,{thr:1}).v[0];report.ground.reverse4=drive(4,{thr:-1}).v[0];report.ground.brakeQuarter=drive(.25,{thr:-1},10).v[0];report.ground.coast1=drive(1,{thr:0},10).v[0];report.ground.boost1=drive(1,{boost:1}).v[0];report.ground.boostUse1=100-drive(1,{boost:1}).boost;
 for(const speed of [5,10,15,20]){reset();c.inp.steer=1;for(let k=0;k<120;k++){c.v.set(speed,0,0).applyQuaternion(c.q);a.stepCar(c,a.DT);c.p.x=c.p.z=0;}report.ground['yawAt'+speed]=c.wy;}
 for(const input of [-1,0,1]){reset(true);c.inp.thr=input;for(let k=0;k<12;k++)a.stepCar(c,a.DT);report.air['throttle'+input]=c.v.x/.1;}
 for(const held of [false,true]){reset();c.jp=1;c.jh=held?1:0;let peak=c.p.y,peakTime=0;const samples=[];for(let k=0;k<180;k++){a.stepCar(c,a.DT);if(c.p.y>peak){peak=c.p.y;peakTime=(k+1)*a.DT;}if([11,23,47,83,119].includes(k))samples.push({time:(k+1)*a.DT,y:c.p.y,vy:c.v.y});}report.jump[held?'held':'tap']={peak,peakTime,samples};}
 for(const speed of [0,10,-10,20])for(const [name,input]of [['forward',{pitch:1}],['backward',{pitch:-1}],['side',{yaw:1}],['diagonal',{pitch:1,yaw:1}],['roll',{roll:1}],['smallAnalog',{pitch:.3}]]){reset(true);c.v.set(speed,-6,0);c.canD=1;Object.assign(c.inp,input);c.jp=1;a.stepCar(c,a.DT);const samples=[{time:a.DT,...snap()}];for(let k=1;k<30;k++){a.stepCar(c,a.DT);if([17,24,29].includes(k))samples.push({time:(k+1)*a.DT,...snap()});}report.dodge.push({speed,name,samples});}
 for(const roll of [80,180]){reset();c.q.setFromAxisAngle(X,roll*Math.PI/180);for(let k=0;k<240;k++)a.stepCar(c,a.DT);report.contact['neutralRoll'+roll]={up:Y.clone().applyQuaternion(c.q).y,...snap()};}
 reset(true);c.inp.pitch=.7;for(let k=0;k<60;k++)a.stepCar(c,a.DT);report.air.pitchHalfSecond=snap();
 // These are combined-input regression scenarios; no independent RL trajectory is claimed.
 reset();const combined=[];for(let k=0;k<360;k++){Object.assign(c.inp,k<120?{thr:1,pitch:1,steer:0,yaw:0,ps:0,boost:0}:k<240?{thr:1,pitch:1,steer:1,yaw:1,ps:1,boost:0}:{thr:1,pitch:1,steer:0,yaw:0,ps:0,boost:1});a.stepCar(c,a.DT);c.p.x=c.p.z=0;if(k%60===59)combined.push({time:(k+1)*a.DT,...snap()});}report.integration.driveSlideBoost=combined;
 reset(true);c.p.y=1.5;c.q.setFromAxisAngle(Y,Math.PI/2);c.v.set(12,-3,0);c.inp.ps=1;for(let k=0;k<120;k++)a.stepCar(c,a.DT);report.integration.sidewaysPowerslideLanding=snap();
 return report;
}
if(require.main===module){const baseline=process.argv.includes('--baseline'),result=measure(baseline?{htmlPath:BASELINE}:{source:true});const dest=process.argv.find(x=>x.startsWith('--out='));if(dest)fs.writeFileSync(path.resolve(dest.slice(6)),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));}
module.exports={measure,BASELINE};
