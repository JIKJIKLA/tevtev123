// Controlled snapshot delivery/replay checks, not a real-network RTT benchmark.
const fs=require('node:fs'),path=require('node:path'),load=require('../tests/harness.cjs'),createPhysics=require('../server/physics.cjs');
const Z={thr:0,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0};
const clone=value=>JSON.parse(JSON.stringify(value));
function controls(tick){return{...Z,thr:1,pitch:1,boost:tick<45?1:0,steer:tick>=80&&tick<160?.7:tick>=180?-.35:0,yaw:tick>=80&&tick<160?.7:tick>=180?-.35:0,ps:tick>=80&&tick<145?1:0};}
function setup(scenario='ground'){
 const p=createPhysics({size:1,mode:0,len:300,speed:1,gravity:1,unlimited:false});p.seats({0:{session:'local',body:0,color:0},1:{session:'remote',body:0,color:1}});p.start();for(let i=0;i<480;i++)p.step();
 const g=load({source:true}),a=g.api;a.configureCars();Object.assign(a.cfg,{mode:0,size:1,speed:1,gravity:1,unlimited:false});a.DED.active=true;Object.assign(a.MP,{active:true,loaded:true,role:'guest',slot:0,round:p.state().round,received:-1,localPaused:false,closed:false});a.setState({st:'PLAY',sandbox:false});
 const {cars,ball}=p.inspect(),c=cars[0];a.resetCar(c,-20,-15);c.q.identity();c.prevQ.copy(c.q);c.frameQ.copy(c.q);c.boost=100;cars[1].enabled=false;ball.p.set(5,.9125,5);ball.v.set(0,0,0);ball.w.set(0,0,0);ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);
 if(scenario==='hard-touch'){c.v.set(18,0,0);ball.p.set(-18.2,.9125,-15);ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);}
 if(scenario==='awkward-landing'){c.p.y=3;c.q.setFromAxisAngle(new a.THREE.Vector3(0,0,1),.95);c.prevQ.copy(c.q);c.frameQ.copy(c.q);c.v.set(8,-5,1);c.ground=c.wasG=0;c.canJ=0;c.canD=1;}
 if(scenario==='aerial-dodge'){c.p.y=3;c.v.set(10,1,0);c.ground=c.wasG=0;c.canJ=0;c.canD=1;}
 c.prevP.copy(c.p);c.frameP.copy(c.p);const state=clone(p.state());a.MP.snapshot=clone(state);a.MP.round=state.round;a.cars[1].enabled=false;let now=1000;g.window.performance.now=()=>now;a.dedState({state,tick:0,ack:0,driver:clone(p.driver(0))});
 return{p,g,a,c,car:a.cars[0],setNow:value=>now=value};
}
function runProfile({scenario='ground',delay=0,jitter=[0],dropEvery=0,ticks=240,uplink=0,uplinkJitter=[0]}={}){
 const s=setup(scenario),{p,a,c,car}=s,packets=[],inputs=[],trajectory=[],corrections=[];let jump=0,lastDue=0,lastInputDue=0,ack=0,applied={seq:0,round:a.MP.round,jump:0,held:false,paused:false,controls:{...Z}},delivered=0,dropped=0,maxCarError=0,maxBallError=0,maxRotationError=0,maxCorrection=0,maxHistory=0,localTouchTick=null;
 const initialX=car.p.x;
 for(let tick=1;tick<=ticks;tick++){
  const input=controls(tick),edge=scenario==='aerial-dodge'&&tick===12;if(edge)jump++;const held=scenario==='aerial-dodge'&&tick>=12&&tick<30,frame={seq:tick,round:a.MP.round,jump,held,paused:false,controls:input,edge};
  Object.assign(car.inp,input);car.jp=edge?1:0;car.jh=held?1:0;a.stepCar(car,a.DT);a.predictLocalBall(a.DT);a.DED.history.push(clone(frame));maxHistory=Math.max(maxHistory,a.DED.history.length);
  // Ordered application delivery; consume at most one queued input each fixed
  // step, reusing the last applied input on starvation like server/main.cjs.
  const inputDue=Math.max(lastInputDue,tick+uplink+uplinkJitter[(tick-1)%uplinkJitter.length]);lastInputDue=inputDue;inputs.push({due:inputDue,frame:clone(frame)});
  if(inputs.length&&inputs[0].due<=tick){applied=inputs.shift().frame;ack=applied.seq;}p.input('local',applied);p.step();if(localTouchTick===null&&a.ball.lastPlayer===0)localTouchTick=tick;
  if(tick%4===0){const packet={state:clone(p.state()),tick,ack,driver:clone(p.driver(0))},serial=tick/4;if(dropEvery&&serial%dropEvery===0)dropped++;else{const due=Math.max(lastDue,tick+delay+jitter[(serial-1)%jitter.length]);lastDue=due;packets.push({due,packet});}}
  s.setNow(1000+tick*1000/120);
  while(packets.length&&packets[0].due<=tick){const packet=packets.shift().packet,before=car.p.clone(),ballBefore=a.ball.p.clone();a.dedState(packet);delivered++;const correction=before.distanceTo(car.p);maxCorrection=Math.max(maxCorrection,correction);corrections.push({tick,ack:packet.ack,car:correction,ball:ballBefore.distanceTo(a.ball.p),history:a.DED.history.length});}
  const carError=car.p.distanceTo(c.p),ballError=a.ball.p.distanceTo(p.inspect().ball.p),rotationError=car.q.angleTo(c.q);maxCarError=Math.max(maxCarError,carError);maxBallError=Math.max(maxBallError,ballError);maxRotationError=Math.max(maxRotationError,rotationError);
  trajectory.push({tick,carError,ballError,rotationError,clientBoost:car.boost,serverBoost:c.boost});
 }
 // An authoritative current state with all inputs acknowledged must converge
 // exactly, even after skipped application snapshots or a local perturbation.
 let flushTick=ticks;while(inputs.length){flushTick++;if(inputs[0].due<=flushTick){applied=inputs.shift().frame;ack=applied.seq;}p.input('local',applied);p.step();}
 const finalPacket={state:clone(p.state()),tick:flushTick,ack,driver:clone(p.driver(0))};a.dedState(finalPacket);
 return{scenario,profile:{snapshotHz:30,physicsHz:120,downstreamDelayTicks:delay,jitterTicks:jitter,discardEverySnapshot:dropEvery,uplinkDelayTicks:uplink,uplinkJitterTicks:uplinkJitter,ticks},delivered,dropped,maxHistory,localMoved:car.p.x!==initialX,localTouchTick,maxCarError,maxBallError,maxRotationError,maxCorrection,finalCarError:car.p.distanceTo(c.p),finalBallError:a.ball.p.distanceTo(p.inspect().ball.p),historyAfterFinal:a.DED.history.length,trajectory,corrections};
}
function measure(){const profiles=[];for(const scenario of ['ground','hard-touch','awkward-landing','aerial-dodge'])for(const timing of [{delay:0},{delay:6,jitter:[0,2,1,4]},{delay:12,jitter:[0,5,2,8],dropEvery:5},{uplink:6,uplinkJitter:[0,2,1,4],delay:6,jitter:[0,2,1,4]},{uplink:12,uplinkJitter:[0,5,2,8],delay:12,jitter:[0,5,2,8],dropEvery:5}])profiles.push(runProfile({scenario,...timing}));return{conditions:'Two isolated shared solvers (server/physics.cjs authority and source browser harness); synthetic ordered application input/snapshot scheduling, no socket, no remote player; discarded application snapshots are not WebSocket packet loss. Nonzero uplink advances authority at wall time while inputs arrive late; final convergence is measured after all queued inputs are consumed and a current snapshot is applied.',profiles:profiles.map(({trajectory,corrections,...value})=>value)};}
if(require.main===module){const result=measure();if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
module.exports={setup,runProfile,measure,clone};
