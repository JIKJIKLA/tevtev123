// Heatseeker uses a defensive planner of its own. It observes the same ball
// integrator and actuates ordinary controls; it never changes a ball/car pose.
const HEAT_AI={at:-100,age:0,key:'',revision:0,duration:4,arc:Array.from({length:81},()=>new V3()),velocity:Array.from({length:81},()=>new V3()),teams:[{owner:-1,until:0},{owner:-1,until:0}]};
function resetHeatBotState(c){const ai=c.ai;ai.reverseDrive=false;ai.progressDistance=NaN;ai.progressMode='';ai.heatNoProgress=0;ai.heatState='';ai.heatRole='';ai.heatReachable=ai.heatAerial=ai.urgent=false;ai.heatSignal='';ai.heatThreatTime=-1;ai.heatThreatPoint=null;ai.heatAirTarget=null;ai.heatPlanAt=ai.heatJumpLead=0;}
function botHasSurface(c){return typeof c.surfaceSupport==='boolean'?c.surfaceSupport:!!(c.ground||c.wheelsOn>0&&!c.jl&&c.n.lengthSq()>.9&&new V3(0,1,0).applyQuaternion(c.q).dot(c.n)>.45);}
function heatBallSignal(){return [heat.target,heat.speed,heat.server,ball.last,ball.lastPlayer,...cars.map(c=>[c.id,c.enabled?1:0,carDemolished(c)?1:0,c.un>0?1:0,(c.ai.heatNoProgress||0)>1?1:0,c.lastTouchAt].join(':')),Math.sign(ball.v.z),cfg.size,cfg.lvl,PHYS.g].join('|');}
function heatForecast(){
 const cache=HEAT_AI,now=simTime,key=heatBallSignal();
 const reset=now<cache.at||kickoffAge+.05<cache.age;
 const sample=Math.min(80,Math.max(0,Math.round((now-cache.at)/.05))),surprise=cache.at>=0&&(cache.arc[sample].distanceToSquared(ball.p)>2.25||cache.velocity[sample].distanceToSquared(ball.v)>25);
 if(reset){for(const team of cache.teams){team.owner=-1;team.until=0;}cache.at=-100;}
 // Shared across all bots. Touches, homing/backboard changes and unexpected
 // impacts invalidate immediately; ordinary observation refreshes at 12.5Hz.
 if(key===cache.key&&now-cache.at<.08&&!surprise)return cache;
 const forecast=predictBall(4),step=forecast.duration/40;
 for(let k=0;k<81;k++){
  const j=Math.min(39,k>>1),u=k===80?1:(k%2)*.5,u2=u*u,u3=u2*u,p=cache.arc[k],v=cache.velocity[k];
  p.copy(BOT_PATH[j]).multiplyScalar(2*u3-3*u2+1).addScaledVector(BOT_VEL[j],(u3-2*u2+u)*step).addScaledVector(BOT_PATH[j+1],-2*u3+3*u2).addScaledVector(BOT_VEL[j+1],(u3-u2)*step);
  v.copy(BOT_VEL[j]).lerp(BOT_VEL[j+1],u);
 }
 cache.at=now;cache.age=kickoffAge;cache.key=key;cache.duration=forecast.duration;cache.revision++;
 return cache;
}
function heatGoalThreat(forecast){
 const step=forecast.duration/80;
 for(let k=1;k<forecast.arc.length;k++){
  const a=forecast.arc[k-1],b=forecast.arc[k];
  for(const sign of [-1,1]){
   const plane=sign*(HZ+BR),da=sign*(a.z-plane),db=sign*(b.z-plane);
   if(da>0||db<0||db<=da)continue;
   const u=cl(-da/(db-da),0,1),x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u;
   if(Math.abs(x)<=GX-BR&&y>=BR-.01&&y<=GH-BR)return{team:sign>0?1:0,sign,time:(k-1+u)*step,point:new V3(x,y,plane),index:k};
  }
 }
 return null;
}
function heatJumpLead(c,y){
 const top=c.p.y+bodyPhysics(c).center[1]+bodyPhysics(c).half[1]+BR,need=y-top;
 if(need<=.07)return 0;
 // The shared jump impulse/hold/gravity give the reachable rising envelope.
 const impulse=PHYS.jump.jump/PHYS.car.mass,hold=PHYS.jump.holdF/PHYS.car.mass-PHYS.g,holdT=PHYS.jump.holdT;
 for(let t=.025;t<=.9;t+=.025){const h=t<=holdT?impulse*t+.5*hold*t*t:impulse*holdT+.5*hold*holdT*holdT+(impulse+hold*holdT)*(t-holdT)-.5*PHYS.g*(t-holdT)**2;if(h>=need)return t;}
 return Infinity;
}
function heatTravelTime(c,p){
 const dx=p.x-c.p.x,dz=p.z-c.p.z,dist=Math.hypot(dx,dz),forward=new V3(1,0,0).applyQuaternion(c.q),flat=Math.hypot(forward.x,forward.z),facing=dist>.01&&flat>.01?cl((dx*forward.x+dz*forward.z)/(dist*flat),-1,1):1;
 const angle=Math.acos(facing),reverse=dist<6&&facing<-.65&&c.v.length()<5,turn=(reverse?Math.PI-angle:angle)*.22;
 const v0=cl((c.v.x*dx+c.v.z*dz)/(dist||1),0,23*cfg.speed),max=(cfg.lvl?23:14)*cfg.speed,acc=(cfg.lvl&&c.boost>8?18:11)*cfg.speed,run=Math.max(0,(max*max-v0*v0)/(2*acc));
 const travel=dist<run?(Math.sqrt(v0*v0+2*acc*dist)-v0)/acc:Math.max(0,(max-v0)/acc)+(dist-run)/max;
 const recovering=!botHasSurface(c)&&c.p.y>1.5?.2:0,stranded=(c.ai.heatNoProgress||0)>.8?.8:0;
 return travel+turn+recovering+stranded+Math.max(0,c.p.y-3)*.08;
}
function heatReachable(c,forecast,threat){
 if(carDemolished(c)||c.un>0||(c.ai.heatNoProgress||0)>1)return null;
 const sign=c.team?1:-1,step=forecast.duration/80,last=Math.min(80,Math.ceil(threat.time/step));
 let best=null;
 for(let k=1;k<=last;k++){
  const p=forecast.arc[k],time=k*step;if(p.z*sign<18||p.z*sign>HZ+.1||Math.abs(p.x)>GX+5)continue;
  const lead=heatJumpLead(c,p.y),jumpReach=Number.isFinite(lead)&&lead<=time+.03;
  const aerial=cfg.lvl===2&&p.y<7&&c.boost>28&&time>.55&&p.y<c.p.y+1.3+time*5;
  if(!jumpReach&&!aerial)continue;
  const eta=heatTravelTime(c,p),margin=time-eta;
  if(margin<-.07)continue;
  const score=time+.12*eta+Math.max(0,p.y-2.5)*.03;
  if(!best||score<best.score)best={point:p.clone(),time,eta,lead:jumpReach?lead:.55,aerial:!jumpReach&&aerial,score};
 }
 return best;
}
function heatHuman(c){return window.__TEVIN_SERVER__||MP.active?!!MP.seats[c.id]:c===localPlayer();}
function heatTeamAssignment(c,forecast,threat){
 const team=HEAT_AI.teams[c.team],mates=cars.filter(x=>x.enabled&&x.team===c.team&&!carDemolished(x)),candidates=[];
 for(const mate of mates){
  const reach=heatReachable(mate,forecast,threat);if(!reach)continue;
  const claim=RIVALS.claim,claimed=claim&&claim.until>simTime&&claim.team===c.team&&claim.slot===mate.id;
  // Human coverage uses observed motion or a reachable explicit claim. An idle
  // human elsewhere cannot silently reserve the only necessary emergency save.
  if(heatHuman(mate)&&!claimed&&mate.v.length()<1&&mate.p.distanceTo(reach.point)>4)continue;
  const score=reach.eta+(claimed&&threat.time>.8?-.15:0)+(mate.ai.heatNoProgress||0)*.2;
  candidates.push({car:mate,reach,score});
 }
 candidates.sort((a,b)=>a.score-b.score||a.car.id-b.car.id);
 let chosen=candidates[0]||null,prior=candidates.find(x=>x.car.id===team.owner);
 if(prior&&simTime<team.until&&prior.score<(chosen?.score??Infinity)+.35)chosen=prior;
 if(chosen&&chosen.car.id!==team.owner){team.owner=chosen.car.id;team.until=simTime+.35;}else if(!chosen){team.owner=-1;team.until=0;}
 return{owner:team.owner,reach:chosen?.reach||null,mates};
}
function heatHomeTarget(c,rank=0,threat=null){
 const sign=c.team?1:-1,side=rank===1?-1:1,center=cl((threat?.point.x??ball.p.x)*.3,-3.2,3.2);
 c.ai.target.set(rank?side*5.1:center,.8,sign*(HZ-(rank?rank===1?4.2:7.2:9)));
 c.ai.intercept.copy(c.ai.target);c.ai.time=0;c.ai.arrive=true;
}
function planHeatseeker(c){
 const ai=c.ai,forecast=heatForecast(),sign=c.team?1:-1;
 ai.control=false;ai.commit=0;ai.urgent=false;ai.heatReachable=false;ai.heatAerial=false;ai.heatJumpLead=0;ai.heatPlanAt=simTime;ai.heatForecastRevision=forecast.revision;ai.heatSignal=heatBallSignal();
 const mates=cars.filter(x=>x.enabled&&x.team===c.team&&!carDemolished(x)).sort((a,b)=>a.id-b.id),rank=mates.indexOf(c);
 if(ball.last<0){
  const server=heat.server>=0?heat.server:cars.filter(x=>x.enabled&&!carDemolished(x)).sort((a,b)=>a.p.distanceToSquared(ball.p)-b.p.distanceToSquared(ball.p)||a.id-b.id)[0]?.id;
  if(c.id===server){ai.heatState='SERVE';ai.mode='COMMIT';ai.target.copy(ball.p);ai.target.z-=sign*.65;ai.intercept.copy(ball.p);ai.arrive=false;ai.heatRole='SERVER';}
  else{heatHomeTarget(c,Math.max(0,rank));ai.heatState='DEFEND';ai.mode='DEFEND';ai.heatRole='COVER';}
  return;
 }
 const crossing=heatGoalThreat(forecast),threat=crossing?.team===c.team?crossing:null;
 ai.heatThreatTime=threat?.time??-1;ai.heatThreatPoint=threat?threat.point.toArray():null;
 if(threat){
  const assignment=heatTeamAssignment(c,forecast,threat),owner=assignment.owner;
  ai.heatRole=owner===c.id?'INTERCEPTOR':'COVER';
  if(owner===c.id&&assignment.reach){
   const reach=assignment.reach;ai.heatState='INTERCEPT';ai.mode='SAVE';ai.urgent=true;ai.heatReachable=true;ai.heatAerial=reach.aerial;ai.heatJumpLead=reach.lead;ai.intercept.copy(reach.point);ai.target.copy(reach.point);ai.target.y=.8;ai.time=reach.time;ai.arrive=false;
  }else{
   const covers=assignment.mates.filter(x=>x.id!==owner).sort((a,b)=>a.id-b.id),coverRank=covers.indexOf(c);
   heatHomeTarget(c,owner<0?Math.max(0,rank):1+Math.max(0,coverRank),threat);ai.heatState=owner<0?'DEFEND':'COVER';ai.mode=owner<0?'DEFEND':'SUPPORT';
  }
 }else{
  HEAT_AI.teams[c.team].owner=-1;HEAT_AI.teams[c.team].until=0;
  heatHomeTarget(c,Math.max(0,rank));ai.heatState=heat.target===-sign?'REPOSITION':'DEFEND';ai.mode=rank?'SUPPORT':'DEFEND';ai.heatRole=rank?'COVER':'GOALKEEPER';
 }
 if(c.un>0||(ai.heatNoProgress||0)>1){ai.heatState='RECOVERY';ai.mode='RECOVER';ai.heatReachable=false;}
}
function heatInterceptJump(c){
 const ai=c.ai,i=c.inp,remaining=ai.time-Math.max(0,simTime-(ai.heatPlanAt||0)),flat=Math.hypot(ai.intercept.x-c.p.x,ai.intercept.z-c.p.z);
 if(!c.bs&&ai.heatReachable&&ai.mode==='SAVE'&&ai.strikeCD<=0&&botHasSurface(c)&&c.n.y>.75&&ai.heatJumpLead>0&&remaining>-.04&&remaining<=ai.heatJumpLead+.07&&flat<=Math.max(1.7,c.v.length()*Math.max(0,remaining)+1.2)){
  c.bs=4;c.bt=0;c.jp=c.jh=1;ai.strikeCD=.8;ai.heatAirTarget=ai.intercept.toArray();
 }
 if(c.bs!==4)return false;
 c.bt+=DT;c.jh=c.bt<PHYS.jump.holdT?1:0;
 if(!botHasSurface(c)){
  _iq.copy(c.q).invert();botU.copy(Y3).applyQuaternion(_iq);
  i.pitch=cl(botU.x*ai.tune.airGain*.65+c.w.z*.2,-1,1);i.roll=cl(botU.z*ai.tune.airGain*.65-c.w.x*.2,-1,1);i.yaw=cl(c.w.y*.15,-1,1);
  i.boost=0;
  if(ai.heatAerial&&ai.heatReachable&&c.bt<.9&&c.boost>0){botLocal.copy(ai.intercept).sub(c.p).applyQuaternion(_iq).normalize();i.pitch=cl(-botLocal.y*ai.tune.airGain+c.w.z*.18,-1,1);i.yaw=cl(botLocal.z*ai.tune.airGain+c.w.y*.18,-1,1);i.boost=botLocal.x>.8?1:0;}
 }
 if(c.bt>1.8||botHasSurface(c)&&c.bt>.25){c.bs=0;c.jh=0;}
 return true;
}
