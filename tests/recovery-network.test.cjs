const test=require('node:test'),assert=require('node:assert/strict');
const {run,setup,frame,step,error,authority,clone}=require('../scripts/measure-recovery-network.cjs');
const near=(value,label)=>assert.ok(Math.abs(value)<1e-9,label+': '+value);
function exact(value,label){for(const[key,error]of Object.entries(value))if(key==='q')assert.ok(error<1e-6,label+' rotation');else near(error,label+' '+key);}

for(const scenario of['two-wheel-jump','wall-escape','buffered-landing','expired-buffer','chassis-floor','chassis-wall'])test('recovery reconstruction: '+scenario+' agrees for every body, roster and playlist',()=>{
 for(const size of[1,2,3])for(const mode of[0,1])for(const body of[0,1,2]){
  const label=`${scenario}/${size}v${size}/mode${mode}/body${body}`,r=run({scenario,size,mode,body,ticks:120,trace:true});
  assert.equal(r.maximumError,0,label+' exact intermediate authority/prediction state');assert.ok(r.maximumRotationError<1e-6,label+' intermediate quaternion');exact(r.afterStale,label+' saved-window replay');exact(r.final,label+' final acknowledged state');assert.equal(r.history,0);
  for(const row of r.trace){const s=row.server;assert.ok(s.p.concat(s.v,s.w,s.q,s.normal).every(Number.isFinite),label+' finite trajectory');assert.ok(s.supportTime>=0&&s.supportTime<=.1);assert.ok(s.jumpBuffer>=0&&s.jumpBuffer<=.08);assert.ok(s.canD===0||s.canD===1||typeof s.canD==='boolean');}
  if(scenario==='two-wheel-jump'){assert.ok(r.trace.slice(0,4).some(t=>t.server.jl>0),label+' real two-wheel support gives a useful escape');assert.equal(r.trace[0].server.canD,0,label+' a brief escape does not grant a new aerial dodge');}
  if(scenario==='wall-escape')assert.ok(r.trace.slice(41,50).some(t=>t.server.jl>0),label+' wall jump detaches');
  if(scenario==='buffered-landing'){assert.ok(r.trace.slice(0,3).some(t=>t.server.jumpBuffer>0),label+' exhausted press buffers briefly');assert.ok(r.trace.slice(0,12).some(t=>t.server.jl>0),label+' usable landing consumes the bounded buffer');}
  if(scenario==='expired-buffer'){assert.ok(r.trace[0].server.jumpBuffer>0,label+' first exhausted press is recorded');assert.ok(r.trace.slice(12).every(t=>t.server.jumpBuffer===0&&t.server.jl===0),label+' expired input never jumps later');}
  if(scenario==='chassis-floor'||scenario==='chassis-wall')assert.ok(r.trace.slice(0,12).some(t=>t.server.jl>0||t.server.autoFlipTime>0),label+' explicit surface-relative chassis recovery is not silently consumed');
 }
});

test('remote controls cannot supply support dwell, jump buffers or authoritative recovery resources',()=>{
 const s=setup({scenario:'expired-buffer'}),{a,p,c,car}=s;
 for(let tick=1;tick<=20;tick++){
  const controls={thr:0,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0},normal={seq:tick,round:a.MP.round,jump:0,held:false,paused:false,edge:false,controls};
  Object.assign(car.inp,controls);car.jp=car.jh=0;a.stepCar(car,a.DT);a.predictLocalBall(a.DT);
  p.input('local',{...normal,supportTime:.1,jumpBuffer:.08,driver:{s:{supportTime:.1,jumpBuffer:.08,canD:1}},controls:{...controls,supportTime:.1,jumpBuffer:.08,canD:1}});p.step();
  exact(error(s),'untrusted state tick'+tick);assert.equal(c.supportTime,0);assert.equal(c.jumpBuffer,0);assert.equal(c.canD,0);
 }
});

test('identical key-event and recovery histories retain exact authority equality under render frame grouping',()=>{
 const results=[];for(const hz of[30,60,120]){
  const s=setup({scenario:'wall-escape',size:3,mode:1,body:2});let tick=0;
  for(let render=0;render<hz;render++)for(let k=0;k<120/hz;k++){tick++;const input=frame(s,tick);step(s,input);exact(error(s),'frame grouping '+hz+'/'+tick);}
  results.push(JSON.stringify({p:s.car.p.toArray(),v:s.car.v.toArray(),q:s.car.q.toArray(),w:s.car.w.toArray(),n:s.car.n.toArray(),driver:s.a.packDriver(s.car)}));
 }
 assert.equal(results[0],results[1]);assert.equal(results[1],results[2]);
});

test('authority executes the Heatseeker planner and legal recovery controls for both teams at every difficulty and roster',()=>{
 for(const size of[1,2,3])for(const lvl of[0,1,2])for(const threatenedTeam of[0,1]){
  const p=authority()({size,mode:1,lvl,len:300,speed:1,gravity:1,unlimited:false});p.seats({});p.start();while(p.phase()==='COUNT')p.step();
  const {cars,ball}=p.inspect(),sign=threatenedTeam?1:-1;
  for(const c of cars){c.p.set((c.id>>1)*5,(c.body===2?.1705:.1701)+.015,(c.team?1:-1)*42);c.q.setFromAxisAngle({x:0,y:1,z:0},c.team?Math.PI/2:-Math.PI/2);c.v.set(0,0,0);c.w.set(0,0,0);c.wy=0;c.ground=c.wasG=1;c.supportTime=0;c.jumpBuffer=0;c.planT=0;c.prevP.copy(c.p);c.frameP.copy(c.p);c.prevQ.copy(c.q);c.frameQ.copy(c.q);}
  ball.p.set(1.5,2,sign*28);ball.v.set(-2,0,sign*24);ball.last=1-threatenedTeam;ball.lastPlayer=1-threatenedTeam;const threatened=cars.filter(c=>c.team===threatenedTeam),states=new Set();
  for(let tick=0;tick<180&&p.phase()==='PLAY';tick++){p.step();for(const c of cars){assert.ok(c.p.toArray().concat(c.v.toArray(),c.w.toArray(),c.q.toArray()).every(Number.isFinite));assert.ok(c.boost>=0&&c.boost<=100);for(const key of['thr','steer','pitch','yaw','roll','boost','ps'])assert.ok(Number.isFinite(c.inp[key])&&Math.abs(c.inp[key])<=1,'legal '+key);if(c.team===threatenedTeam&&c.ai.heatState)states.add(c.ai.heatState);}}
  assert.ok(threatened.length===size);assert.ok(states.has('INTERCEPT')||states.has('DEFEND')||states.has('COVER'),'authority uses defensive Heatseeker states at '+size+'/'+lvl+'/'+threatenedTeam);
  const snapshot=clone(p.state());assert.equal(snapshot.cars.length,size*2);assert.ok(snapshot.phase==='PLAY'||snapshot.phase==='GOAL');
 }
});
