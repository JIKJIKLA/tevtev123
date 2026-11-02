'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),load=require('../tests/harness.cjs');
const root=path.resolve(__dirname,'..'),baseline=path.resolve(root,'../../outputs/recovery-baseline-10.6.0');
const policyRoot=path.resolve(root,'../../outputs/heatseeker-policy-only-source/src');
function fingerprint(source=path.join(root,'src')){const hashes={};for(const name of fs.readdirSync(source).filter(n=>n.endsWith('.js')&&n!=='engine.bundle.js').sort())hashes[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(source,name))).digest('hex');return hashes;}
function preparePolicyOnly(){
 fs.mkdirSync(policyRoot,{recursive:true});for(const name of fs.readdirSync(path.join(baseline,'src')).filter(n=>n.endsWith('.js')&&n!=='engine.bundle.js'))fs.copyFileSync(path.join(baseline,'src',name),path.join(policyRoot,name));
 let old=fs.readFileSync(path.join(baseline,'src/game.js'),'utf8'),current=fs.readFileSync(path.join(root,'src/game.js'),'utf8');
 for(const[start,end]of[['function planBot(c){','function bot(c){'],['function bot(c){','// ---------- bounded, success-gated player imitation ----------'],['function teamPlan(c){','// Inspired by the published Heatseeker rules'],['const recoveryController=','// The boost decorator runs after tactical']]){
  const a=old.indexOf(start),b=old.indexOf(end,a+start.length),c=current.indexOf(start),d=current.indexOf(end,c+start.length);if([a,b,c,d].some(n=>n<0))throw Error('Policy-only splice marker changed: '+start);old=old.slice(0,a)+current.slice(c,d)+old.slice(b);
 }
 old=old.replace('// Planner blackboard and behavior nodes are built once.','// INLINE:heatseeker-ai.js\n\n// Planner blackboard and behavior nodes are built once.');
 fs.writeFileSync(path.join(policyRoot,'game.js'),old);for(const name of ['heatseeker-ai.js','rivals.js'])fs.copyFileSync(path.join(root,'src',name),path.join(policyRoot,name));
 return{description:'QA-only overlay: frozen10.6vehicle/ball/input physics and assets, with only candidate planBot/bot/teamPlan/recovery callback/claim guard and distinct Heatseeker module. It is never a release build.',source:fingerprint(policyRoot)};
}
function fresh(version='current',size=1,level=1){
 const options=version==='10.6.0'||version==='policy-only'?{source:true,sourceRoot:version==='10.6.0'?path.join(baseline,'src'):policyRoot,htmlPath:path.join(baseline,'index.html')}:{source:true};
 const g=load(options),a=g.api;g.window.__TEVIN_SERVER__=true;a.cfg.mode=1;a.cfg.size=size;a.cfg.lvl=level;a.configureCars();a.setState({st:'PLAY',sandbox:false,score:[0,0],tl:60});
 for(const c of a.cars){const rank=c.id>>1,sign=c.team?1:-1;a.resetCar(c,rank===0?0:rank===1?-5.1:5.1,sign*(51.2-(rank?rank===1?4.2:7.2:9)));c.q.setFromAxisAngle(new a.THREE.Vector3(0,1,0),sign*Math.PI/2);c.prevQ.copy(c.q);c.frameQ.copy(c.q);c.boost=60;}
 a.heat.server=-1;return{...g,a};
}
function random(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function shot(a,team,kind,seed){const r=random(seed),sign=team?1:-1,speed=kind==='backboard'?40:kind==='high'?34:kind==='curve'?28:22;
 const p=kind==='backboard'?[20,2.5,-sign*48]:kind==='unreachable'?[0,5.1,sign*47]:kind==='curve'?[-sign*(12+r()*5),2.5+r(),sign*8]:kind==='high'?[sign*(r()-.5)*10,3+r()*1.5,sign*15]:[sign*(r()-.5)*8,1.1+r()*.5,sign*12];
 a.ball.p.fromArray(p);a.ball.prevP.copy(a.ball.p);a.ball.v.set(kind==='curve'?sign*(15+r()*6):kind==='backboard'?0:(r()-.5)*5,kind==='high'?3:0,kind==='backboard'?-sign*speed:sign*speed);a.ball.w.set(0,0,0);a.ball.last=kind==='backboard'?team:1-team;a.ball.lastPlayer=kind==='backboard'?team:1-team;a.heat.target=kind==='backboard'?-sign:sign;a.heat.speed=speed;a.heat.cooldown=0;
 return{position:a.ball.p.toArray(),velocity:a.ball.v.toArray(),heat:{...a.heat}};
}
function runRally(version,{size=1,level=1,team=1,kind='curve',seed=123,ticks=960}={}){
 const g=fresh(version,size,level),a=g.a,initial=shot(a,team,kind,seed),last=new Map(a.cars.map(c=>[c.id,{touch:c.touches,save:false,role:'',p:c.p.clone()}]));
 let attempts=0,saves=0,touches=0,double=0,stranded=0,switches=0,homeError=0,homeSamples=0,jumps=0,invalid=0,steps=0;
 for(;steps<ticks&&a.getState().st==='PLAY';steps++){
  const incomingBefore=a.heat.target===(team?1:-1);a.sim(a.DT);
  const defenders=a.cars.filter(c=>c.enabled&&c.team===team),commits=defenders.filter(c=>c.ai.mode==='SAVE');
  if(commits.some((c,i)=>commits.slice(i+1).some(x=>x.ai.intercept.distanceTo(c.ai.intercept)<7)))double++;
  for(const c of defenders){const prev=last.get(c.id),saving=c.ai.mode==='SAVE',role=c.ai.heatRole||c.ai.mode;
   if(saving&&!prev.save)attempts++;
   if(c.touches>prev.touch){touches+=c.touches-prev.touch;if(incomingBefore)saves+=c.touches-prev.touch;}
   if(prev.role&&role!==prev.role)switches++;
   if(c.jp)jumps++;
   const contact=c.surfaceSupport||c.ground||c.hullContact>0||c.wheelsOn>0;
   if(contact&&c.p.distanceTo(c.ai.target)>3&&c.v.length()<.6)stranded+=a.DT;
   if(steps>60&&a.heat.target===(team?-1:1)&&!saving&&c.ai.mode!=='COMMIT'){
    const rank=c.id>>1,x=rank===0?0:rank===1?-5.1:5.1,z=(team?1:-1)*(51.2-(rank?rank===1?4.2:7.2:9));homeError+=Math.hypot(c.p.x-x,c.p.z-z);homeSamples++;
   }
   if(![...c.p.toArray(),...c.v.toArray(),...c.q.toArray(),...Object.values(c.inp)].every(x=>typeof x==='number'&&Number.isFinite(x)))invalid++;
   prev.touch=c.touches;prev.save=saving;prev.role=role;prev.p.copy(c.p);
  }
 }
 const score=a.getState().score;
 return{version,size,level,team,kind,seed,initial,seconds:steps*a.DT,defenderCarSeconds:steps*a.DT*size,interceptionAttempts:attempts,successfulDefensiveTouches:saves,defenderTouches:touches,goalsConceded:score[1-team],doubleCommitSeconds:double*a.DT,strandedCarSeconds:stranded,roleSwitches:switches,jumpEdges:jumps,meanOutgoingPositionError:homeSamples?homeError/homeSamples:null,outgoingPositionSamples:homeSamples,invalidSamples:invalid,final:{score,ball:a.ball.p.toArray(),cars:a.cars.filter(c=>c.team===team).map(c=>({id:c.id,p:c.p.toArray(),mode:c.ai.mode,state:c.ai.heatState||null,target:c.ai.target.toArray(),touches:c.touches}))}};
}
function reproduce(version){
 const{a,cars,context}=(()=>{const g=fresh(version);return{...g,cars:g.a.cars};})(),c=cars[1];
 shot(a,1,'curve',123);a.planBot(c);c.planT=10;c.ai.mode='DEFEND';c.ai.target.copy(c.p);c.v.set(0,0,0);a.bot(c);const stationary={throttle:c.inp.thr,boost:c.inp.boost,position:c.p.toArray()};
 const g=fresh(version,2),b=g.a,d=b.cars[1];b.ball.last=0;b.ball.lastPlayer=0;b.ball.p.set(0,1.5,34);b.ball.v.set(0,0,28);b.heat.target=1;b.heat.speed=28;b.cars[3].p.set(-15,.2,28);b.RIVALS.claim={team:1,slot:3,until:100};d.ai.yieldUntil=100;b.planBot(d);
 return{version,stationary,claimedEmergency:{mode:d.ai.mode,state:d.ai.heatState||null,target:d.ai.target.toArray(),intercept:d.ai.intercept.toArray()}};
}
function summarize(runs){const exposure=runs.reduce((s,r)=>s+r.defenderCarSeconds,0),stranded=runs.reduce((s,r)=>s+r.strandedCarSeconds,0),switches=runs.reduce((s,r)=>s+r.roleSwitches,0);return{runs:runs.length,rallySeconds:runs.reduce((s,r)=>s+r.seconds,0),defenderCarSeconds:exposure,interceptionAttempts:runs.reduce((s,r)=>s+r.interceptionAttempts,0),successfulDefensiveTouches:runs.reduce((s,r)=>s+r.successfulDefensiveTouches,0),defenderTouches:runs.reduce((s,r)=>s+r.defenderTouches,0),goalsConceded:runs.reduce((s,r)=>s+r.goalsConceded,0),doubleCommitSeconds:runs.reduce((s,r)=>s+r.doubleCommitSeconds,0),strandedCarSeconds:stranded,lowSpeedAwayFraction:stranded/Math.max(1e-9,exposure),roleSwitches:switches,roleSwitchesPerCarMinute:switches*60/Math.max(1e-9,exposure),invalidSamples:runs.reduce((s,r)=>s+r.invalidSamples,0),meanOutgoingPositionError:runs.reduce((s,r)=>s+(r.meanOutgoingPositionError||0)*r.outgoingPositionSamples,0)/Math.max(1,runs.reduce((s,r)=>s+r.outgoingPositionSamples,0))};}
if(require.main===module){const compact=process.argv.includes('--quick'),scenarios=[],sourceAtStart=fingerprint(),policyOnly=process.argv.includes('--policy-only')?preparePolicyOnly():null;for(const size of compact?[1,2]:[1,2,3])for(const level of compact?[1]:[0,1,2])for(const team of [0,1])for(const kind of compact?['low','curve']:['low','curve','high','backboard'])scenarios.push({size,level,team,kind,seed:1701+size*100+level*10+(kind==='curve'?1:kind==='high'?2:kind==='backboard'?3:0),ticks:960});const before=scenarios.map(s=>runRally('10.6.0',s)),after=scenarios.map(s=>runRally('current',s)),aiOnly=policyOnly?scenarios.map(s=>runRally('policy-only',s)):null,sourceAtEnd=fingerprint();if(before.some((r,i)=>JSON.stringify(r.initial)!==JSON.stringify(after[i].initial)))throw Error('Unequal initial shot scenario');const report={description:'Identical seeded initial shots and fixed120Hz simulation; no shot or ball tuning changes. All active seats use ordinary bot controls. Full source comparison includes support/recovery changes in the integrated candidate.',metrics:{successfulDefensiveTouches:'A physical defender touch while the live homing target before that tick threatens its own goal; does not require a SAVE label.',doubleCommitSeconds:'Two or more SAVE controllers simultaneously target points less than7metres apart.',strandedCarSeconds:'Raw low-speed(<.6m/s) time in actual contact while more than3metres from its current target; includes startup and short braking/turning phases, not proof of a persistent stall.',roleSwitches:'Raw changes to INTERCEPTOR/COVER/GOALKEEPER or baseline mode; higher touch counts and longer rallies create more legitimate changes. Compare exposure-normalized rate as well.',meanOutgoingPositionError:'Distance to a fixed independent defensive home lane, while the ball heads away and the car is not attacking or saving.'},sourceStable:JSON.stringify(sourceAtStart)===JSON.stringify(sourceAtEnd),sourceAtStart,sourceAtEnd,policyOnly,reproductions:[reproduce('10.6.0'),reproduce('current')],before:summarize(before),after:summarize(after),...(aiOnly?{aiOnly:summarize(aiOnly)}:{}),runs:{before,after,...(aiOnly?{aiOnly}:{})}};const target=path.resolve(root,process.argv.find(x=>x.endsWith('.json'))||'docs/measurements/heatseeker-defense.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({target,sourceStable:report.sourceStable,before:report.before,after:report.after,aiOnly:report.aiOnly,reproductions:report.reproductions},null,2));if(!report.sourceStable)process.exitCode=2;}
module.exports={fresh,shot,runRally,reproduce,summarize,fingerprint,preparePolicyOnly};
