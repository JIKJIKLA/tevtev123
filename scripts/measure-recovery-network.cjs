// Shared-authority recovery probes. Synthetic input/snapshot delivery is not an
// internet-latency or subjective-feel measurement.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const load=require('../tests/harness.cjs'),createPhysics=require('../server/physics.cjs');
const root=path.resolve(__dirname,'..'),baseline=path.resolve(root,'../../outputs/recovery-baseline-10.6.0');
const clone=value=>JSON.parse(JSON.stringify(value));
function authority(version='current'){
 if(version==='current')return createPhysics;
 if(version!=='10.6.0')throw Error('Unknown immutable version '+version);
 // Resolve third-party libraries from the maintained checkout while keeping
 // __dirname and every source read inside the immutable baseline.
 const filename=path.join(baseline,'server/physics.cjs'),mod={exports:{}};
 const resolve=name=>name==='linkedom'?require('linkedom'):require(name);
 vm.runInThisContext('(function(require,module,exports,__filename,__dirname){'+fs.readFileSync(filename,'utf8')+'\n})',{filename})(resolve,mod,mod.exports,filename,path.dirname(filename));
 return mod.exports;
}
function game(version='current'){
 return load(version==='current'?{source:true}:{source:true,htmlPath:path.join(baseline,'index.html'),sourceRoot:path.join(baseline,'src')});
}
function syncPose(c){c.q.normalize();c.prevP.copy(c.p);c.frameP.copy(c.p);c.renderP.copy(c.p);c.prevQ.copy(c.q);c.frameQ.copy(c.q);}
function pose(a,c,name){
 const T=a.THREE;a.resetCar(c,-20,-15);c.q.identity();c.v.set(0,0,0);c.w.set(0,0,0);c.wy=0;c.boost=100;
 if(name==='held-jump'){c.v.set(8,0,0);}
 else if(name==='two-wheel-jump'){
  c.q.setFromEuler(new T.Euler(0,0,.15));c.p.y=-Math.min(...a.bodyPhysics(c).wheels.map(p=>new T.Vector3(...p).applyQuaternion(c.q).y))+.015;
  c.ground=c.wasG=0;c.canJ=c.canD=0;
 }else if(name==='wall-escape'){
  c.q.setFromAxisAngle(new T.Vector3(0,0,1),Math.PI/2).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),.45));
  c.p.set(40.96-Math.max(...a.bodyPhysics(c).wheels.map(p=>new T.Vector3(...p).applyQuaternion(c.q).x))-.015,10,-15);c.n.set(-1,0,0);c.ground=c.wasG=0;c.canJ=c.canD=0;
 }else if(name==='buffered-landing'){
  c.p.y=a.bodyPhysics(c).height+.13;c.v.set(4,-3.5,0);c.ground=c.wasG=0;c.canJ=c.canD=0;
 }else if(name==='expired-buffer'){
  c.p.y=3;c.v.set(0,0,0);c.ground=c.wasG=0;c.canJ=c.canD=0;
 }else if(name==='chassis-floor'){
  c.q.setFromAxisAngle(new T.Vector3(1,0,0),Math.PI);c.p.y=-Math.min(...a.bodyPhysics(c).hull.map(p=>p.clone().applyQuaternion(c.q).y))+.005;c.ground=c.wasG=0;c.canJ=c.canD=0;
 }else if(name==='chassis-wall'){
  c.q.setFromAxisAngle(new T.Vector3(0,0,1),-Math.PI/2);c.p.set(40.96-Math.max(...a.bodyPhysics(c).hull.map(p=>p.clone().applyQuaternion(c.q).x))-.005,10,-15);c.n.set(-1,0,0);c.ground=c.wasG=0;c.canJ=c.canD=0;
 }else throw Error('Unknown recovery scenario '+name);
 syncPose(c);
}
function setup({size=1,mode=0,body=0,scenario='held-jump',version='current'}={}){
 const settings={size,mode,lvl:1,len:300,speed:1,gravity:1,unlimited:false};
 const p=authority(version)(settings),seats={};for(let id=0;id<size*2;id++)seats[id]={session:id===0?'local':'remote-'+id,body:id===0?body:id%3,color:id%2};p.seats(seats);p.start();for(let tick=0;tick<480;tick++)p.step();
 const g=game(version),a=g.api;Object.assign(a.cfg,settings);a.DED.active=true;Object.assign(a.MP,{active:true,loaded:true,role:'guest',slot:0,seats:clone(seats),round:p.state().round,received:-1,jump:0,localPaused:false,closed:false});a.configureCars();a.setState({st:'PLAY',sandbox:false});a.INTRO.active=false;a.LOADING.active=false;
 const {cars,ball}=p.inspect(),c=cars[0];pose(a,c,scenario);
 for(const remote of cars.slice(1)){a.resetCar(remote,-35+remote.id*10,35);remote.q.identity();syncPose(remote);}
 ball.p.set(-20,.9125,30);ball.v.set(0,0,0);ball.w.set(0,0,0);ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);ball.last=-1;ball.lastPlayer=-1;
 const initial=clone(p.state());a.MP.snapshot=clone(initial);let now=1000;g.window.performance.now=()=>now;a.dedState({state:initial,tick:0,ack:0,driver:clone(p.driver(0))});
 return{p,g,a,c,car:a.cars[0],scenario,version,held:new Set(),lastJump:0,setNow:value=>now=value};
}
const KEY={w:['w','KeyW'],s:['s','KeyS'],a:['a','KeyA'],d:['d','KeyD'],jump:[' ','Space'],boost:['Shift','ShiftLeft'],slide:['c','KeyC']};
function key(s,name,down){const e=new s.g.Event(down?'keydown':'keyup',{bubbles:true,cancelable:true}),[key,code]=KEY[name];Object.defineProperties(e,{key:{value:key},code:{value:code},repeat:{value:false}});s.g.dispatch(e);}
function desiredKeys(s,tick){
 const name=s.scenario,result=[];
 if(name==='held-jump'){if(tick<=55)result.push('w');if(tick>=5&&tick<=7)result.push('jump');if(tick>=70&&tick<100)result.push('d');}
 if(name==='two-wheel-jump'){if(tick>=1&&tick<=3)result.push('jump');if(tick>=35)result.push('w');if(tick>=50&&tick<75)result.push('d');}
 if(name==='wall-escape'){if(tick<22)result.push('w');else if(tick<42)result.push('s');if(tick>=42&&tick<=45)result.push('jump');if(tick>=65)result.push('d');}
 if(['buffered-landing','expired-buffer','chassis-floor','chassis-wall'].includes(name)){if(tick===1)result.push('jump');if(tick>=55)result.push('w');if(tick>=75&&tick<100)result.push('d');}
 return result;
}
function frame(s,tick,desired=desiredKeys(s,tick)){
 const next=new Set(desired);for(const name of s.held)if(!next.has(name))key(s,name,false);for(const name of next)if(!s.held.has(name))key(s,name,true);s.held=next;
 s.a.human(s.car);const jump=s.a.MP.jump,edge=jump>s.lastJump;s.lastJump=jump;
 return{seq:tick,round:s.a.MP.round,jump,held:!!s.car.jh,paused:false,edge,controls:{...s.car.inp}};
}
const SCALARS=['wy','canJ','canD','jt','jl','jAge','jumped','jHoldTime','dT','dcd','aT','cT','wasG','ground','handbrake','autoFlipTime','autoFlipSign','supportTime','jumpBuffer'];
const numeric=value=>Number.isFinite(value)||typeof value==='boolean';
function error(s){const{a,p,c,car}=s,b=p.inspect().ball;return{p:car.p.distanceTo(c.p),v:car.v.distanceTo(c.v),w:car.w.distanceTo(c.w),q:car.q.angleTo(c.q),normal:car.n.distanceTo(c.n),jdir:car.jdir.distanceTo(c.jdir),flipAxis:car.flipAxis.distanceTo(c.flipAxis),scalar:Math.max(0,...SCALARS.filter(k=>numeric(c[k])&&numeric(car[k])).map(k=>Math.abs(Number(car[k])-Number(c[k])))),ballP:a.ball.p.distanceTo(b.p),ballV:a.ball.v.distanceTo(b.v),ballW:a.ball.w.distanceTo(b.w)};}
function step(s,input){const{a,car,p}=s;Object.assign(car.inp,input.controls);car.jp=input.edge?1:0;car.jh=input.held?1:0;a.stepCar(car,a.DT);a.predictLocalBall(a.DT);a.DED.history.push(clone(input));p.input('local',clone(input));p.step();s.setNow(1000+input.seq*1000/120);return error(s);}
function run(options={}){
 const s=setup(options),ticks=options.ticks||120,trace=[],snapshots=[];let maximum=0,rotationMaximum=0,maximumHistory=0,deliveredSnapshots=0,old;
 const recordError=e=>{maximum=Math.max(maximum,...Object.entries(e).filter(([key])=>key!=='q').map(([,value])=>value));rotationMaximum=Math.max(rotationMaximum,e.q);};
 for(let tick=1;tick<=ticks;tick++){
  const input=frame(s,tick),e=step(s,input);recordError(e);maximumHistory=Math.max(maximumHistory,s.a.DED.history.length);
  const packet={state:clone(s.p.state()),tick,ack:tick,driver:clone(s.p.driver(0))};if(tick===2)old=packet;if(tick%4===0)snapshots.push({due:tick+12+(tick%12)/4,packet});
  while(snapshots.length&&snapshots[0].due<=tick){s.a.dedState(snapshots.shift().packet);deliveredSnapshots++;recordError(error(s));}
  trace.push({tick,input,server:{p:s.c.p.toArray(),v:s.c.v.toArray(),w:s.c.w.toArray(),q:s.c.q.toArray(),normal:s.c.n.toArray(),wheels:s.c.wheelsOn,loadedWheels:s.c.loadedWheels,tireLoad:s.c.tireLoad,surfaceSupport:s.c.surfaceSupport,ground:s.c.ground,supportTime:s.c.supportTime,jumpBuffer:s.c.jumpBuffer,canJ:s.c.canJ,canD:s.c.canD,jl:s.c.jl,autoFlipTime:s.c.autoFlipTime,flipAxis:s.c.flipAxis.toArray()},error:e,afterDelivery:error(s)});
 }
 // A stale support/buffer snapshot must reconstruct before all unacknowledged
 // inputs, including an already buffered or surface-relative recovery press.
 // Rebuild the separately saved pending-input window for the reconstruction
 // subtest. Production rejects stale sequence numbers; this does not bypass
 // that rule in the timed-delivery profile above or in production code.
 s.a.MP.received=-1;s.a.MP.snapshot=clone(old.state);s.a.DED.history=trace.map(row=>clone(row.input));
 s.car.p.x+=.8;s.car.w.z+=.6;s.car.supportTime=.099;s.car.jumpBuffer=.079;s.a.dedState(old);
 const afterStale=error(s);s.a.dedState({state:clone(s.p.state()),tick:ticks,ack:ticks,driver:clone(s.p.driver(0))});const final=error(s);
 return{version:s.version,scenario:s.scenario,size:options.size||1,mode:options.mode||0,body:options.body||0,ticks,maximumError:maximum,maximumRotationError:rotationMaximum,maximumHistory,deliveredSnapshots,afterStale,final,history:s.a.DED.history.length,...(options.trace?{trace}:{})};
}
if(require.main===module){const rows=[],matrix=process.argv.includes('--matrix'),out=process.argv.slice(2).find(arg=>!arg.startsWith('--'));for(const scenario of ['held-jump','two-wheel-jump','wall-escape','buffered-landing','expired-buffer','chassis-floor','chassis-wall'])for(const size of(matrix?[1,2,3]:[1]))for(const mode of[0,1])for(const body of(matrix?[0,1,2]:[0]))rows.push(run({scenario,size,mode,body,trace:false}));const result={conditions:'Native key-event handler and human mapper; source client and isolated authority; synthetic12tick+jitter downstream; every post-simulation and post-delivery state checked; no uplink delay, no internet-latency or feel claim. Remote cars use neutral inputs away from the local trajectory. Saved-window reconstruction separately rebuilds the captured unacknowledged history; production stale-sequence rejection is not changed.',cases:rows.length,maximumError:Math.max(...rows.map(r=>r.maximumError)),maximumRotationError:Math.max(...rows.map(r=>r.maximumRotationError)),rows};if(out)fs.writeFileSync(path.resolve(out),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({cases:result.cases,maximumError:result.maximumError,maximumRotationError:result.maximumRotationError,out},null,2));}
module.exports={setup,pose,game,authority,syncPose,frame,desiredKeys,step,error,run,clone,SCALARS};
