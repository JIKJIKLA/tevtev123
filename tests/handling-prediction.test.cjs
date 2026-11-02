const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./harness.cjs'),createPhysics=require('../server/physics.cjs');
const clone=value=>JSON.parse(JSON.stringify(value));
const near=(value,target=0,label='value')=>assert.ok(Math.abs(value-target)<1e-9,`${label}: ${value} versus ${target}`);

function setup(size,mode,body){
 const p=createPhysics({size,mode,len:300,speed:1,gravity:1,unlimited:false}),seats={};
 for(let id=0;id<size*2;id++)seats[id]={session:id===0?'local':'remote-'+id,body:id===0?body:id%3,color:id%2};
 p.seats(seats);p.start();for(let tick=0;tick<480;tick++)p.step();
 const g=load({source:true}),a=g.api;Object.assign(a.cfg,{size,mode,speed:1,gravity:1,unlimited:false});a.DED.active=true;Object.assign(a.MP,{active:true,loaded:true,role:'guest',slot:0,seats:clone(seats),round:p.state().round,received:-1,localPaused:false,closed:false});a.configureCars();a.setState({st:'PLAY',sandbox:false});
 const {cars,ball}=p.inspect(),c=cars[0];a.resetCar(c,-20,-15);c.q.identity();c.v.set(8,0,0);c.boost=100;
 for(const remote of cars.slice(1)){remote.p.set(-35+remote.id*10,a.bodyPhysics(remote).height+.015,35);remote.v.set(0,0,0);remote.q.identity();remote.w.set(0,0,0);remote.wy=0;remote.prevP.copy(remote.p);remote.frameP.copy(remote.p);remote.prevQ.copy(remote.q);remote.frameQ.copy(remote.q);}
 c.prevP.copy(c.p);c.frameP.copy(c.p);c.prevQ.copy(c.q);c.frameQ.copy(c.q);ball.p.set(0,.9125,0);ball.v.set(0,0,0);ball.w.set(0,0,0);ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);
 const initial=clone(p.state());a.MP.snapshot=clone(initial);a.dedState({state:initial,tick:0,ack:0,driver:clone(p.driver(0))});
 return{p,g,a,c,car:a.cars[0]};
}
function compare(s,label){
 const{p,a,c,car}=s;near(car.p.distanceTo(c.p),0,label+' position');near(car.v.distanceTo(c.v),0,label+' velocity');near(car.w.distanceTo(c.w),0,label+' angular velocity');near(car.wy,c.wy,label+' supported yaw');assert.ok(car.q.angleTo(c.q)<1e-6,label+' rotation');assert.equal(car.carriedPitch,c.carriedPitch,label+' carried pitch');
 near(a.ball.p.distanceTo(p.inspect().ball.p),0,label+' ball position');near(a.ball.v.distanceTo(p.inspect().ball.v),0,label+' ball velocity');near(a.ball.w.distanceTo(p.inspect().ball.w),0,label+' ball spin');
}

test('keyboard release/repress across an airborne authority snapshot replays exactly for every body, roster and playlist',()=>{
 for(const size of[1,2,3])for(const mode of[0,1])for(const body of[0,1,2]){
  const s=setup(size,mode,body),{p,a,c,car}=s,label=`${size}v${size}/mode${mode}/body${body}`;let jump=0,airborneCarry;
  assert.equal(p.inspect().cars.length,size*2,label+' authority roster');assert.equal(a.cars.length,size*2,label+' prediction roster');assert.equal(car.body,body,label+' profile body');
  for(let tick=1;tick<=84;tick++){
   // Produce controls through the real keyboard mapper. Holding drive before
   // takeoff carries intent; releasing it and pressing again is aerial input.
   a.keys.w=tick===60?0:1;a.keys[' ']=tick===13?1:0;a.human(car);const edge=tick===13;if(edge)jump++;
   const frame={seq:tick,round:a.MP.round,jump,held:tick===13,paused:false,edge,controls:{...car.inp}};
   assert.equal(frame.controls.coupledPitch,a.keys.w?1:0,label+' input origin');
   car.jp=edge?1:0;car.jh=frame.held?1:0;a.stepCar(car,a.DT);a.predictLocalBall(a.DT);a.DED.history.push(clone(frame));p.input('local',clone(frame));p.step();compare(s,label+' tick'+tick);
   if(tick===24){assert.equal(c.ground,0,label+' airborne snapshot');assert.equal(c.carriedPitch,1,label+' carried intent');assert.equal(p.driver(0).s.carriedPitch,1,label+' serialized intent');airborneCarry={state:clone(p.state()),tick,ack:tick,driver:clone(p.driver(0))};}
   if(tick===60)assert.equal(c.carriedPitch,0,label+' release clears carry');
   if(tick===61){assert.equal(c.ground,0,label+' repress is still airborne');assert.equal(c.carriedPitch,0,label+' repress stays deliberate');assert.ok(Math.abs(c.w.z)>1e-3,label+' repress produces immediate pitch response after one neutral tick');}
  }
  // Restoring the old carried state must not reinstate it after the pending
  // release/repress. Replay all60 unacknowledged real keyboard input frames.
  car.carriedPitch=-1;car.p.y+=.35;car.w.z+=1;car.q.multiply(new a.THREE.Quaternion().setFromAxisAngle(new a.THREE.Vector3(1,0,0),.2));a.dedState(airborneCarry);
  assert.equal(car.carriedPitch,0,label+' replay honors release/repress');assert.equal(a.DED.history.length,60,label+' replayed pending frames');compare(s,label+' corrected');
 }
});

test('carried keyboard state is range-checked on reconstruction and reset for respawn without changing independent axes',()=>{
 const s=setup(1,0,0),{a,car}=s;
 for(const value of[-1,0,1]){a.readDriver(car,{s:{carriedPitch:value}});assert.equal(car.carriedPitch,value);}
 for(const value of[-2,.5,2,Infinity,NaN,true,'1',null]){car.carriedPitch=1;a.readDriver(car,{s:{carriedPitch:value}});assert.equal(car.carriedPitch,1,'malformed authoritative carried state is ignored');}
 car.carriedPitch=-1;a.resetCar(car,0,0);assert.equal(car.carriedPitch,0,'respawn removes previous input intent');
 car.ground=car.wasG=0;car.p.y=3;car.v.set(0,0,0);Object.assign(car.inp,{thr:1,pitch:1,steer:0,yaw:0,roll:0,boost:0,ps:0,coupledPitch:0});a.stepCar(car,a.DT);
 assert.equal(car.carriedPitch,0);assert.ok(Math.abs(car.w.z)>1e-3,'independent aerial axis remains active');
});
