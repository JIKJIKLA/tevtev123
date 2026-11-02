// Kept at the historical filename so the removed10.6 latch policy is explicitly
// replaced by immediate, ordinary airborne input plus exact reconciliation.
const test=require('node:test'),assert=require('node:assert/strict'),{setup,clone}=require('../scripts/measure-network-fidelity.cjs');
const near=(v,t=0)=>assert.ok(Math.abs(v-t)<1e-9,v+' versus '+t);
function compare(s){const{a,p,c,car}=s;for(const key of['p','v','w','n','jdir','flipAxis'])near(car[key].distanceTo(c[key]));assert.ok(car.q.angleTo(c.q)<1e-6);near(car.wy,c.wy);for(const key of['supportTime','jumpBuffer','canJ','canD','jl','dT','autoFlipTime'])near(Number(car[key]),Number(c[key]));near(a.ball.p.distanceTo(p.inspect().ball.p));near(a.ball.v.distanceTo(p.inspect().ball.v));}

test('ordinary held keyboard pitch remains active through an airborne authority snapshot and pending-input replay',()=>{
 const s=setup(),{p,a,c,car}=s;c.v.set(8,0,0);a.dedState({state:clone(p.state()),tick:0,ack:0,driver:clone(p.driver(0))});let jump=0,old;
 for(let tick=1;tick<=84;tick++){
  a.keys.w=1;a.human(car);const edge=tick===13;if(edge)jump++;const frame={seq:tick,round:a.MP.round,jump,held:tick===13,paused:false,edge,controls:{...car.inp}};
  car.jp=edge?1:0;car.jh=frame.held?1:0;a.stepCar(car,a.DT);a.predictLocalBall(a.DT);a.DED.history.push(clone(frame));p.input('local',clone(frame));p.step();compare(s);
  if(tick===13)assert.ok(Math.abs(c.w.z)>1e-3,'deliberate jump receives held pitch immediately');
  if(tick===24){assert.ok(Math.abs(c.w.z)>1,'held W has not been silently suppressed');assert.ok(!Object.hasOwn(p.driver(0).s,'carriedPitch'));old={state:clone(p.state()),tick,ack:tick,driver:clone(p.driver(0))};}
 }
 car.w.z=-2;car.p.y+=.25;car.supportTime=.099;car.jumpBuffer=.079;a.dedState(old);compare(s);assert.equal(a.DED.history.length,60);
});

test('independent pitch retains the same response across airborne authority reconstruction and replay',()=>{
 const s=setup('aerial-dodge'),{p,a,c,car}=s;let old;for(let tick=1;tick<=40;tick++){
  const frame={seq:tick,round:a.MP.round,jump:0,held:false,paused:false,edge:false,controls:{thr:1,pitch:1,steer:0,yaw:0,roll:0,boost:0,ps:0}};
  Object.assign(car.inp,frame.controls);car.jp=0;car.jh=0;a.stepCar(car,a.DT);a.predictLocalBall(a.DT);a.DED.history.push(clone(frame));p.input('local',clone(frame));p.step();if(tick===8)old={state:clone(p.state()),tick,ack:tick,driver:clone(p.driver(0))};
 }
 assert.ok(Math.abs(c.w.z)>3,'intentional aerial pitch remains active');car.q.identity();car.supportTime=.08;car.jumpBuffer=.06;a.dedState(old);compare(s);
});
