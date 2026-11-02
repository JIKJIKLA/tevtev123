'use strict';
// Analyze actual native-input traces. No browser driving or solver mutation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const directory=path.resolve(process.argv[2]||'../../outputs');
const destination=path.resolve(process.argv[3]||'docs/measurements/handling-browser.json');
const explicit=process.argv.slice(4);
const round=(n,d=8)=>Number.isFinite(n)?Number(n.toFixed(d)):null;
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
const length=a=>Math.hypot(...a);
const subtract=(a,b)=>a.map((x,i)=>x-b[i]);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const physicalInputSchedules=new Map();
function multiply(a,b){return[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];}
function poseAngular(pre,post,dt){let d=multiply(post,[-pre[0],-pre[1],-pre[2],pre[3]]);if(d[3]<0)d=d.map(x=>-x);const m=Math.hypot(d[0],d[1],d[2]);if(m<1e-12)return[0,0,0];const k=2*Math.atan2(m,d[3])/m/dt;return[d[0]*k,d[1]*k,d[2]*k];}
function percentile(a,p){const n=a.filter(Number.isFinite).sort((x,y)=>x-y);return n.length?round(n[Math.min(n.length-1,Math.floor(n.length*p))]):null;}
function analyze(file){
 const absolute=path.isAbsolute(file)?file:path.join(directory,file),bytes=fs.readFileSync(absolute),raw=JSON.parse(bytes),ticks=raw.ticks;
 if(!raw.summary||!ticks?.length||!ticks[0].pre||!ticks[0].post)throw Error('Not a complete handling browser trace: '+absolute);
 const r={file:path.basename(absolute),sha256:crypto.createHash('sha256').update(bytes).digest('hex'),build:raw.summary.build,scenario:raw.summary.scenario,camera:raw.summary.cameraMode,conditions:{viewport:raw.summary.viewport,buffer:raw.summary.buffer,quality:raw.summary.quality,cameraSettings:raw.summary.cameraSettings,initial:raw.summary.initial,inputPlan:raw.summary.inputPlan},ticks:ticks.length,seconds:round(ticks.reduce((n,x)=>n+x.dt,0)),stopReason:raw.summary.stopReason,invalidNumericFields:0,branches:{},wheels:{},inputTransitions:[],branchTransitions:[],touches:[],steeringSegments:[],coupledPitchDuringUnsupportedDriveCandidates:[],normalVelocityCutoffCandidates:[]};
 let previousInput='',previousBranch='',lastTouches=raw.summary.initial?.touches??ticks[0].pre.touches,maxPen=0,maxAngular=0,maxYawJump=0,maxHeadingStep=0,maxSlip=0,segment=null;
 const allSlip=[],signedSlip=[],suspendedPitch=[];
 for(let i=0;i<ticks.length;i++){
  const t=ticks[i],s=t.post,pre=t.pre,input=t.trace?.input||s.input,branch=t.trace?.branch||'untraced',omega=poseAngular(pre.q,s.q,t.dt),yaw=-dot(omega,s.normal),dt=t.dt;
  for(const n of[t.time,dt,s.up,s.forwardSpeed,s.lateralSpeed,s.normalSpeed,s.wy,s.penetration,...s.p,...s.q,...s.v,...s.w,...s.normal,...pre.p,...pre.q])if(!Number.isFinite(n))r.invalidNumericFields++;
  r.branches[branch]=(r.branches[branch]||0)+1;r.wheels[s.wheels]=(r.wheels[s.wheels]||0)+1;
  const mark={tick:i,seconds:round(t.time),branch,wheels:s.wheels,normal:s.normal,forwardSpeed:round(s.forwardSpeed),lateralSpeed:round(s.lateralSpeed),wy:round(s.wy),measuredPoseYaw:round(yaw),normalSpeed:round(s.normalSpeed),alignment:round(s.alignment),jumpLock:round(s.jumpLock),dodgeTime:round(s.dodgeTime)};
  const inputString=JSON.stringify(input);if(inputString!==previousInput){r.inputTransitions.push({...mark,input});previousInput=inputString;}
  if(branch!==previousBranch){r.branchTransitions.push({...mark,from:previousBranch||null,preGround:pre.ground,preWheels:pre.wheels,preWy:round(pre.wy),postW:s.w,poseAngular:omega.map(x=>round(x)),input});previousBranch=branch;}
  if(s.touches>lastTouches)r.touches.push({...mark,from:lastTouches,to:s.touches,position:s.p,input});lastTouches=s.touches;
  maxPen=Math.max(maxPen,s.penetration);maxAngular=Math.max(maxAngular,length(omega));maxYawJump=Math.max(maxYawJump,Math.abs(s.wy-pre.wy));maxHeadingStep=Math.max(maxHeadingStep,Math.abs(wrap(s.heading-pre.heading)));maxSlip=Math.max(maxSlip,Math.abs(s.lateralSpeed));allSlip.push(Math.abs(s.lateralSpeed));signedSlip.push(s.lateralSpeed);
  // A diagnostic candidate, never an automatic assertion that aerial control
  // was incorrect. Review clearance, support history and actual jump intent.
  const drivePitch=Math.abs(input.thr)>.05&&input.pitch*input.thr>0;
  if(drivePitch&&!pre.jumpEdge&&s.jumpLock<=0&&!s.ground&&s.normal[1]>.85&&pre.wasSupport&&Math.abs(s.w[2]-pre.w[2])>.01){r.coupledPitchDuringUnsupportedDriveCandidates.push({...mark,preClearance:pre.clearance,clearance:s.clearance,pitchDelta:round(s.w[2]-pre.w[2]),input});}
  if(s.wheels>0&&s.alignment>.45&&s.normalSpeed>.8&&s.normalSpeed<1.2)r.normalVelocityCutoffCandidates.push({...mark,input});
  const sign=Math.sign(input.steer),supported=s.wheels>0&&s.alignment>.45&&s.jumpLock<=0;
  if(sign){
   if(!segment||segment.sign!==sign){if(segment)r.steeringSegments.push(segment);segment={startTick:i,startSeconds:round(t.time),sign,endTick:i,requestedInput:input.steer,supportedTicks:0,totalTicks:0,firstSupportedResponseTick:null,firstSupportedResponseDelaySeconds:null,headingChange:0,maxSlip:0,measuredYawRange:[Infinity,-Infinity],forwardSpeedRange:[Infinity,-Infinity]};}
   segment.endTick=i;segment.totalTicks++;segment.headingChange+=wrap(s.heading-pre.heading);segment.maxSlip=Math.max(segment.maxSlip,Math.abs(s.lateralSpeed));segment.measuredYawRange[0]=Math.min(segment.measuredYawRange[0],yaw);segment.measuredYawRange[1]=Math.max(segment.measuredYawRange[1],yaw);segment.forwardSpeedRange[0]=Math.min(segment.forwardSpeedRange[0],s.forwardSpeed);segment.forwardSpeedRange[1]=Math.max(segment.forwardSpeedRange[1],s.forwardSpeed);
   if(supported){segment.supportedTicks++;const wanted=Math.sign(input.steer*(s.forwardSpeed<-.5?-1:1));if(segment.firstSupportedResponseTick===null&&yaw*wanted>.01){segment.firstSupportedResponseTick=i;segment.firstSupportedResponseDelaySeconds=round((i-segment.startTick)*dt);}}
  }else if(segment){r.steeringSegments.push(segment);segment=null;}
  if(!s.ground&&drivePitch)suspendedPitch.push(s.w[2]);
 }
 if(segment)r.steeringSegments.push(segment);
 for(const s of r.steeringSegments){s.headingChange=round(s.headingChange);s.maxSlip=round(s.maxSlip);s.measuredYawRange=s.measuredYawRange.map(x=>round(x));s.forwardSpeedRange=s.forwardSpeedRange.map(x=>round(x));}
 r.metrics={maxResidualPenetrationMetres:round(maxPen,10),maxMeasuredPoseAngularRate:round(maxAngular),maxYawStateChangePerTick:round(maxYawJump),maxHeadingChangePerTick:round(maxHeadingStep),maxLateralSpeed:round(maxSlip),lateralSpeedP50:percentile(allSlip,.5),lateralSpeedP95:percentile(allSlip,.95),unsupportedCoupledPitchRange:suspendedPitch.length?[round(Math.min(...suspendedPitch)),round(Math.max(...suspendedPitch))]:null};
 const first=(fn,start=-1)=>ticks.findIndex((t,i)=>i>start&&fn(t,i));
 const hasForward=first(t=>t.post.forwardSpeed>3&&(t.trace?.input||t.post.input).thr>0);
 const turn=first(t=>Math.abs((t.trace?.input||t.post.input).steer)>.05,hasForward);
 const braking=first(t=>(t.trace?.input||t.post.input).thr<-.05&&t.post.forwardSpeed>0,turn);
 const reversing=first(t=>(t.trace?.input||t.post.input).thr<-.05&&t.post.forwardSpeed<-.5,braking);
 const slide=first(t=>(t.trace?.input||t.post.input).ps>.05);
 const release=first(t=>(t.trace?.input||t.post.input).ps<=.05,slide);
 const releaseDrive=first(t=>(t.trace?.input||t.post.input).thr>.05,release);
 const releaseTurn=first(t=>Math.abs((t.trace?.input||t.post.input).steer)>.05,releaseDrive);
 const jump=first(t=>t.pre.jumpEdge>0&&t.post.jumpLock>0);
 const landing=jump<0?-1:first(t=>t.post.ground&&t.post.normal[1]>.7&&t.post.jumpLock<=0,jump);
 const landedSteer=landing<0?-1:first(t=>Math.abs((t.trace?.input||t.post.input).steer)>.05&&t.post.ground&&Math.abs(t.post.wy)>.05,landing-1);
 const dodge=first(t=>t.trace?.branch==='dodge'||t.post.dodgeTime>0);
 const lastDodge=ticks.reduce((n,t,i)=>t.trace?.branch==='dodge'||t.post.dodgeTime>0?i:n,-1);
 const flipLanding=lastDodge<0?-1:first(t=>t.post.ground&&t.post.normal[1]>.7&&t.post.jumpLock<=0,lastDodge);
 const flipTurn=flipLanding<0?-1:first(t=>Math.abs((t.trace?.input||t.post.input).steer)>.05&&t.post.ground,flipLanding-1);
 const initialAim=flipTurn<0?null:ticks[flipTurn].post.ballAngle,bestAim=flipTurn<0?null:Math.min(...ticks.slice(flipTurn).map(t=>t.post.ballAngle));
 const wall=first(t=>t.post.wheels>0&&t.post.alignment>.45&&Math.abs(t.post.normal[1])<.7&&t.post.jumpLock<=0);
 const field=wall<0?-1:first(t=>t.post.ground&&t.post.normal[1]>.9,wall);
 const fieldDrive=field<0?-1:first(t=>(t.trace?.input||t.post.input).thr>.05&&length(subtract(t.post.p,ticks[field].post.p))>.5,field);
 const firstTouch=r.touches[0]?.tick??-1,secondTouch=r.touches[1]?.tick??-1;
 const touchControl=firstTouch<0?-1:first(t=>t.post.ground&&Math.abs((t.trace?.input||t.post.input).steer)>.05&&Math.abs(t.post.wy)>.05,firstTouch);
 const final=ticks.at(-1).post;
 r.observedSequence={};
 switch(r.scenario){
  case'DRIVE / REVERSE':r.observedSequence={forwardTick:hasForward,turnTick:turn,brakingTick:braking,reverseTick:reversing,allActionsObserved:hasForward>=0&&turn>hasForward&&braking>turn&&reversing>braking};break;
  case'SLIDE / TURN':r.observedSequence={slideTick:slide,releaseTick:release,accelerateAfterReleaseTick:releaseDrive,turnAfterReleaseTick:releaseTurn,allActionsObserved:slide>=0&&release>slide&&releaseDrive>=release&&releaseTurn>=releaseDrive};break;
  case'JUMP / LAND':r.observedSequence={jumpTick:jump,supportedLandingTick:landing,steeringAtOrAfterLandingTick:landedSteer,allActionsObserved:jump>=0&&landing>jump&&landedSteer>=landing};break;
  case'FLIP / TURN':r.observedSequence={dodgeTick:dodge,lastDodgeTick:lastDodge,supportedLandingTick:flipLanding,turnTick:flipTurn,targetAngleAtTurn:round(initialAim),bestTargetAngleAfterTurn:round(bestAim),targetAngleReduced:initialAim!==null&&bestAim<initialAim-.05,allActionsObserved:dodge>=0&&flipLanding>lastDodge&&flipTurn>=flipLanding&&bestAim<initialAim-.05};break;
  case'WALL / FIELD':r.observedSequence={wallSupportTick:wall,fieldSupportTick:field,continuedDrivingTick:fieldDrive,allActionsObserved:wall>=0&&field>wall&&fieldDrive>field};break;
  case'BALL / SECOND':r.observedSequence={firstTouchTick:firstTouch,supportedSteeringAfterFirstTouchTick:touchControl,secondTouchTick:secondTouch,allActionsObserved:firstTouch>=0&&touchControl>firstTouch&&secondTouch>touchControl};break;
  default:r.observedSequence={allActionsObserved:null,note:'Additional diagnostic scenario; no six-sequence ordering claim'};
 }
 r.final={p:final.p,v:final.v,forwardSpeed:round(final.forwardSpeed),lateralSpeed:round(final.lateralSpeed),w:final.w,wy:round(final.wy),wheels:final.wheels,ground:final.ground,up:round(final.up),touches:final.touches};
 physicalInputSchedules.set(r.file,JSON.stringify(ticks.map(t=>{const input={...(t.trace?.input||t.post.input)};delete input.coupledPitch;return{input,jumpEdge:!!t.pre.jumpEdge,jumpHeld:!!t.post.jumpHeld,keyboard:t.keyboard};})));
 r.handlingVerdict='Requires human review of trajectories, steering segments and discontinuity candidates; observing the actions or eventual support is not a claim of good feel.';
 return r;
}
const names=explicit.length?explicit:fs.readdirSync(directory).filter(x=>/^handling-(?:playtest-|before-|after-).*\.json$/.test(x)).sort();
const records=names.map(analyze),comparisons=[];
for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
 const a=records[i],b=records[j];if(a.scenario!==b.scenario||a.camera!==b.camera||a.build===b.build)continue;
 const pose=s=>JSON.stringify({p:s.conditions.initial.p,q:s.conditions.initial.q,v:s.conditions.initial.v,w:s.conditions.initial.w,wy:s.conditions.initial.wy});
 comparisons.push({a:a.file,b:b.file,scenario:a.scenario,camera:a.camera,exactInitialPose:pose(a)===pose(b),sameCameraSettings:JSON.stringify(a.conditions.cameraSettings)===JSON.stringify(b.conditions.cameraSettings),sameViewport:JSON.stringify(a.conditions.viewport)===JSON.stringify(b.conditions.viewport),sameInputTickSchedule:JSON.stringify(a.inputTransitions.map(x=>({tick:x.tick,input:x.input})))===JSON.stringify(b.inputTransitions.map(x=>({tick:x.tick,input:x.input}))),samePhysicalInputTickScheduleIncludingJump:physicalInputSchedules.get(a.file)===physicalInputSchedules.get(b.file),note:'Native keyboard/tool scheduling can differ. Physical schedule comparison checks every tick, including jump edges, held jump and recorded keys, while excluding only the new coupledPitch input-origin metadata. The original schema-sensitive comparison is retained separately. Only identical initial states and physical tick schedules support an exact deterministic before/after comparison.'});
}
const report={purpose:'Actual native-input movement investigation. This analyzer reports complete action ordering, per-tick angular/contact/steering evidence and review candidates. It never substitutes eventual upright state or test pass counts for human handling assessment.',limitations:['Prepared initial poses do not establish an independently driven approach or normal-menu kickoff.','Controller and physical Chromebook coverage must be stated separately by the operator.','Diagnostic camera follows translation with a fixed world offset; normal car/ball cameras use unchanged production code.','Candidate drive-pitch and velocity-cutoff events require review; a genuine wall departure or aerial input may be correct.','Native event scheduling is not guaranteed identical across runs; automated source probes provide exact tick schedule comparisons.','Trace instrumentation adds work; these runs do not establish production FPS or input latency.'],records,comparisons};
fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output:destination,records:records.map(x=>({file:x.file,build:x.build,scenario:x.scenario,camera:x.camera,ticks:x.ticks,observed:x.observedSequence.allActionsObserved,coupledPitchCandidates:x.coupledPitchDuringUnsupportedDriveCandidates.length,invalid:x.invalidNumericFields})),comparisons:comparisons.length},null,2));
module.exports={analyze,poseAngular};
