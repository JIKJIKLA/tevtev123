const test=require('node:test'),assert=require('node:assert/strict'),{setup,clone}=require('../scripts/measure-network-fidelity.cjs');
const near=(v,t=0)=>assert.ok(Math.abs(v-t)<1e-9,v+' versus '+t);
test('reconciliation restores carried keyboard intent before replaying airborne pending input',()=>{
 const {p,a,c,car}=setup();c.v.set(8,0,0);a.dedState({state:clone(p.state()),tick:0,ack:0,driver:clone(p.driver(0))});let jump=0,old;
 for(let tick=1;tick<=84;tick++){
  const edge=tick===13;if(edge)jump++;const frame={seq:tick,round:a.MP.round,jump,held:tick===13,paused:false,edge,controls:{thr:1,pitch:1,steer:0,yaw:0,roll:0,boost:0,ps:0,coupledPitch:1}};
  Object.assign(car.inp,frame.controls);car.jp=edge?1:0;car.jh=frame.held?1:0;a.stepCar(car,a.DT);a.predictLocalBall(a.DT);a.DED.history.push(clone(frame));p.input('local',clone(frame));p.step();
  near(car.p.distanceTo(c.p));near(car.w.distanceTo(c.w));assert.ok(car.q.angleTo(c.q)<1e-6);assert.equal(car.carriedPitch,c.carriedPitch);
  if(tick===24){assert.equal(c.carriedPitch,1);assert.equal(p.driver(0).s.carriedPitch,1);assert.equal(car.ground,0);old={state:clone(p.state()),tick,ack:tick,driver:clone(p.driver(0))};}
 }
 const expected=c.q.clone();car.carriedPitch=0;car.w.z=-2;car.p.y+=.25;a.dedState(old);
 assert.equal(car.carriedPitch,1);near(car.p.distanceTo(c.p));near(car.v.distanceTo(c.v));near(car.w.distanceTo(c.w));assert.ok(car.q.angleTo(expected)<1e-6);near(car.wy,c.wy);assert.equal(a.DED.history.length,60);
 near(a.ball.p.distanceTo(p.inspect().ball.p));near(a.ball.v.distanceTo(p.inspect().ball.v));
});

test('independent pitch remains independent across an airborne authority snapshot and replay',()=>{
 const {p,a,c,car}=setup('aerial-dodge');let old;for(let tick=1;tick<=40;tick++){
  const frame={seq:tick,round:a.MP.round,jump:0,held:false,paused:false,edge:false,controls:{thr:1,pitch:1,steer:0,yaw:0,roll:0,boost:0,ps:0,coupledPitch:0}};
  Object.assign(car.inp,frame.controls);car.jp=0;car.jh=0;a.stepCar(car,a.DT);a.predictLocalBall(a.DT);a.DED.history.push(clone(frame));p.input('local',clone(frame));p.step();if(tick===8)old={state:clone(p.state()),tick,ack:tick,driver:clone(p.driver(0))};
 }
 assert.equal(c.carriedPitch,0);assert.ok(Math.abs(c.w.z)>3,'the intentional aerial pitch is still active');car.carriedPitch=1;car.q.identity();a.dedState(old);assert.equal(car.carriedPitch,0);near(car.p.distanceTo(c.p));near(car.w.distanceTo(c.w));assert.ok(car.q.angleTo(c.q)<1e-6);
});
