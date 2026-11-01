'use strict';
// Summarize recorded native-input browser traces. This reads evidence; it does
// not drive a browser, synthesize a successful trajectory or alter the solver.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const directory=path.resolve(process.argv[2]||'../../outputs');
const destination=path.resolve(process.argv[3]||'docs/measurements/browser-control.json');
const families=['touch-turn','slide-jump','wall-exit','dodge-challenge'];
const knownBranches=new Set(['stable','partial','air','hull','dodge','auto-flip']);
const nativeInputs={
 'touch-turn':['W1500ms','W+A40ms','W+D40ms','Shift+W1500ms','Escape pause'],
 'slide-jump':['W+C+A350ms','W450ms','W+Space90ms','W1500ms','W+D450ms','Escape pause'],
 'wall-exit':['W450ms','Space110ms','Q450ms','Right900ms','W+A500ms','Escape pause'],
 'dodge-challenge':['Space90ms','W110ms','W+Space70ms','W1500ms','Shift+W800ms','W+A200ms','Escape pause']
};
const exploratoryInputs={...nativeInputs,'touch-turn':['W1250ms','W+A100ms','W+D100ms','Shift+W1500ms','Escape pause'],'dodge-challenge':['Space90ms','W110ms','W+Space70ms','W1500ms','Shift+W700ms','W+A300ms','Escape pause']};
const round=x=>Number(x.toFixed(9));
function summarize(filename,family){
 const bytes=fs.readFileSync(path.join(directory,filename)),raw=JSON.parse(bytes),ticks=raw.ticks;
 if(!ticks?.length)throw Error('Empty native trace: '+filename);
 const dt=ticks[0].trace.dt,time=i=>round(i*dt),first=ticks[0],last=ticks.at(-1);
 const branches={},wheels={},inputEvents=[],branchEvents=[],touchEvents=[];
 let priorInput='',priorBranch='',touches=first.touches,unclassified=0,nonFinite=0,invalidRequiredNumericFields=0,maxPenetration=0,maxAngular=0,maxProjection=0,maxHullImpulse=0,maxRecoveryTorque=0;
 const scan=v=>{if(typeof v==='number'&&!Number.isFinite(v))nonFinite++;else if(v&&typeof v==='object')for(const x of Object.values(v))scan(x);};
 for(let i=0;i<ticks.length;i++){
  const tick=ticks[i],tr=tick.trace;scan(tick);
  // JSON serializes NaN/Infinity as null, so a generic number scan alone is
  // insufficient. Validate required numeric columns explicitly after parsing.
  for(const value of[tick.time,tick.up,tick.touches,tr.dt,tr.wy,tr.wheels,tr.angularSpeed,tr.penetration])if(!Number.isFinite(value))invalidRequiredNumericFields++;
  for(const [values,size]of[[tick.p,3],[tick.q,4],[tick.ball,3],[tr.v,3],[tr.w,3],[tr.normal,3]]){if(!Array.isArray(values)||values.length!==size)invalidRequiredNumericFields++;else for(const value of values)if(!Number.isFinite(value))invalidRequiredNumericFields++;}
  branches[tr.branch]=(branches[tr.branch]||0)+1;wheels[tr.wheels]=(wheels[tr.wheels]||0)+1;
  if(!knownBranches.has(tr.branch))unclassified++;
  maxPenetration=Math.max(maxPenetration,tr.penetration||0);maxAngular=Math.max(maxAngular,tr.angularSpeed||0);maxProjection=Math.max(maxProjection,tr.positionProjection||0);maxHullImpulse=Math.max(maxHullImpulse,tr.hullImpulse||0);maxRecoveryTorque=Math.max(maxRecoveryTorque,Math.abs(tr.recoveryTorque||0));
  const input=JSON.stringify(tr.input);if(input!==priorInput){inputEvents.push({tick:i,seconds:time(i),input:tr.input,yawRate:tr.wy,branch:tr.branch});priorInput=input;}
  if(tr.branch!==priorBranch){branchEvents.push({tick:i,seconds:time(i),branch:tr.branch,wheels:tr.wheels,roofUp:tick.up,normal:tr.normal,jumpLock:tr.jumpLock,dodgeRemaining:tr.dodgeTime});priorBranch=tr.branch;}
  if(tick.touches>touches)touchEvents.push({tick:i,seconds:time(i),from:touches,to:tick.touches,branch:tr.branch,wheels:tr.wheels,roofUp:tick.up,position:tick.p});touches=tick.touches;
 }
 const wallIndex=ticks.findIndex(x=>x.trace.traction>0&&Math.abs(x.trace.normal[1])<.7&&['stable','partial'].includes(x.trace.branch));
 const wallDeparture=wallIndex<0?-1:ticks.findIndex((x,i)=>i>wallIndex&&x.trace.branch==='air');
 const adjusted=wallDeparture<0?-1:ticks.findIndex((x,i)=>i>wallDeparture&&(Math.abs(x.trace.input.roll)>.1||Math.abs(x.trace.input.yaw)>.1||Math.abs(x.trace.input.pitch)>.1));
 const jumpIndex=ticks.findIndex(x=>x.trace.jumpLock>0);
 const slideIndex=ticks.findIndex(x=>x.trace.input.ps>.1);
 const afterJumpStable=jumpIndex<0?-1:ticks.findIndex((x,i)=>i>jumpIndex&&x.trace.branch==='stable'&&x.trace.jumpLock===0&&x.trace.normal[1]>.7&&x.up>.95);
 const afterLandingSteer=afterJumpStable<0?-1:ticks.findIndex((x,i)=>i>afterJumpStable&&Math.abs(x.trace.input.steer)>.1&&Math.abs(x.trace.wy)>.05);
 const lastDodge=ticks.reduce((r,x,i)=>x.trace.branch==='dodge'?i:r,-1);
 const stableAfterDodge=lastDodge<0?-1:ticks.findIndex((x,i)=>i>lastDodge&&x.trace.branch==='stable'&&x.up>.95);
 const touchAfterDodge=stableAfterDodge<0?null:touchEvents.find(x=>x.tick>stableAfterDodge)||null;
 const finalSupported=last.trace.branch==='stable'&&last.trace.wheels>=3&&last.up>.95;
 let sequenceAccepted=false,acceptance;
 if(family==='touch-turn'){
  const turnBetween=touchEvents.length>=2&&ticks.some((x,i)=>i>touchEvents[0].tick&&i<touchEvents.at(-1).tick&&Math.abs(x.trace.input.steer)>.1);
  sequenceAccepted=touchEvents.reduce((s,x)=>s+x.to-x.from,0)>=2&&turnBetween&&finalSupported;
  acceptance={twoNewTouches:touchEvents.reduce((s,x)=>s+x.to-x.from,0)>=2,steeringBetweenNewTouches:turnBetween,finalSupported};
 }else if(family==='slide-jump'){
  sequenceAccepted=slideIndex>=0&&jumpIndex>slideIndex&&afterJumpStable>jumpIndex&&afterLandingSteer>afterJumpStable&&finalSupported;
  acceptance={slideTick:slideIndex,jumpTick:jumpIndex,supportedLandingTick:afterJumpStable,steeringAfterLandingTick:afterLandingSteer,finalSupported};
 }else if(family==='wall-exit'){
  const floor=adjusted<0?-1:ticks.findIndex((x,i)=>i>adjusted&&x.trace.branch==='stable'&&x.trace.normal[1]>.7&&x.up>.95);
  sequenceAccepted=wallIndex>=0&&wallDeparture>wallIndex&&adjusted>wallDeparture&&floor>adjusted&&finalSupported;
  acceptance={actualWallSupportTick:wallIndex,airDepartureTick:wallDeparture,aerialAdjustmentTick:adjusted,fieldLandingTick:floor,finalSupported};
 }else{
  sequenceAccepted=lastDodge>=0&&stableAfterDodge>lastDodge&&!!touchAfterDodge&&finalSupported;
  acceptance={lastDodgeTick:lastDodge,supportedRecoveryTick:stableAfterDodge,challengeAfterRecovery:touchAfterDodge,finalSupported};
 }
 sequenceAccepted=sequenceAccepted&&invalidRequiredNumericFields===0&&unclassified===0;
 return{file:filename,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),family,exploratoryAttempt:filename.includes('-attempt'),build:raw.summary.build,scenario:raw.summary.scenario,conditions:{buffer:raw.summary.buffer,viewport:raw.summary.viewport,quality:raw.summary.quality,simulationHz:1/dt,initialPose:{position:first.p,quaternion:first.q},nativeKeyPlan:(filename.includes('-attempt')?exploratoryInputs:nativeInputs)[family]},ticks:ticks.length,simulatedSeconds:round(ticks.length*dt),initialTouchCounter:first.touches,finalTouchCounter:last.touches,newTouches:last.touches-first.touches,touchEvents,branches,wheelSamples:wheels,unclassifiedControlTicks:unclassified,nonFiniteNumbers:nonFinite,invalidRequiredNumericFields,maxResidualPenetrationMetres:maxPenetration,maxLocalAngularRate:maxAngular,maxPositionProjectionMetres:maxProjection,maxHullImpulseNs:maxHullImpulse,maxRecoveryTorque,final:{position:last.p,velocity:last.trace.v,wheels:last.trace.wheels,branch:last.trace.branch,roofUp:last.up},inputEvents,branchEvents,acceptance,sequenceAccepted};
}
const records=[];
for(const family of families){const names=fs.readdirSync(directory).filter(f=>new RegExp('^grip-playtest-'+family+'(?:-attempt\\d+)?\\.json$').test(f)).sort();for(const name of names)records.push(summarize(name,family));}
const report={conditions:'Desktop Chromium156, WebGL2, Windows Ryzen75800X/RadeonRX6700XT,1280x720 drawing buffer/viewport, Chromebook preset. Developer buttons prepare starting poses; actual subsequent native keyboard input, simulation, collisions and cameras use production source. Traces are actual sampled native-input runs, not scripted successful trajectories. Touch counters persist across pose resets: only increments after the first recorded sample count as new touches. Unclassified-control coverage is a trace integrity check, not a proof of subjective feel.',limitations:['Initial-position buttons do not establish a normal-menu kickoff or an independently driven wall approach.','No physical Chromebook, phone/controller or independent multi-device testing is represented.','Short desktop clips do not certify every skill, input combination, recovery or proprietary-game fidelity.','Actual input transitions include tool/event scheduling gaps; planned key durations are descriptive, not a solver-time schedule.','Frame histories are retained in local raw evidence; fixed-workload renderer profiling is reported separately and no FPS/latency claim is inferred here.'],records};
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output:destination,records:records.map(x=>({file:x.file,ticks:x.ticks,newTouches:x.newTouches,sequenceAccepted:x.sequenceAccepted,maxResidualPenetrationMetres:x.maxResidualPenetrationMetres,unclassifiedControlTicks:x.unclassifiedControlTicks}))},null,2));
