// Same keyboard-style inputs through immutable baselines and current source.
// A solver regression probe, not a native-input latency or subjective feel test.
const fs=require('node:fs'),path=require('node:path');
const {fresh,observation}=require('./measure-dodge-recovery.cjs');
const BRANCHES=new Set(['air','partial','stable','hull','dodge','auto-flip']);
function measure(){
 const records=[];
 for(const variant of ['10.3','10.4','current'])for(const input of ['neutral-after-dodge','forward-held','forward-held-then-steer']){
  const s=fresh(variant),{a,c}=s;c.v.x=10;s.g.window.__NIVET_CONTROL_TRACE__=true;
  let firstStable=null,firstWheel=null,controllerGapTicks=0;const samples=[];
  for(let k=0;k<360;k++){
   Object.assign(c.inp,{thr:1,pitch:input==='neutral-after-dodge'?(k===24?1:0):1,steer:input==='forward-held-then-steer'&&k>=150?.7:0,yaw:input==='forward-held-then-steer'&&k>=150?.7:0,roll:0,boost:0,ps:0});
   c.jp=k===0||k===24?1:0;c.jh=k<12?1:0;a.stepCar(c,a.DT);
   if(k>24&&c.ground&&firstStable===null)firstStable=(k+1)/120;
   if(k>24&&c.wheelsOn>0&&firstWheel===null)firstWheel=(k+1)/120;
   if(variant==='10.4'&&c.wheelsOn>0&&!c.ground&&!c.jl&&c.dT<=0)controllerGapTicks++;
   if(variant==='current'&&!BRANCHES.has(c.controlTrace?.branch))controllerGapTicks++;
   if([119,179,239,299].includes(k)){
    const o=observation(s);samples.push({time:(k+1)/120,wheels:o.wheels,ground:o.ground,roof:o.roof,heading:o.heading,position:o.p,velocity:o.v,angular:o.w,penetration:o.penetration,branch:c.controlTrace?.branch||null});
   }
  }
  records.push({variant,input,firstWheel,firstStable,ordinaryControllerGapSeconds:variant==='10.3'?null:controllerGapTicks/120,samples});
 }
 return{conditions:{simulationHz:120,body:0,initialPosition:[0,fresh().a.BODY_PHYSICS[0].height+.015,0],initialForwardSpeed:10,initialQuaternion:[0,0,0,1],jumpTicks:[0,24],heldJumpTicks:[0,11],throttle:1,boost:0,powerslide:0,steerStartsAtTick:150,steerValue:.7,ball:'No ball interaction is advanced in this car-controller-only probe.',baselines:'Immutable 10.3/10.4 built HTML loaded by scripts/measure-dodge-recovery.cjs fresh(); candidate current source',notes:'All input profiles run360fixed steps. Samples stop at2.5s to avoid interpreting subsequent straight-driving wall contact as flat-field recovery. Gaps in10.4are inferred conservatively from its branch conditions; candidate gaps count an absent/unknown explicit control branch. Native browser responsiveness and subjective feel remain separate gates.'},records};
}
if(require.main===module){const result=measure();if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.records.map(({samples,...record})=>record),null,2));}
module.exports={measure};
