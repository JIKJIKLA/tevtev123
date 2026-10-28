const {test}=require('node:test'),assert=require('node:assert/strict'),createPhysics=require('../physics.cjs');

test('dedicated authority publishes demolition, ignores destroyed inputs, then publishes a clean respawn for every playlist/size',()=>{
 for(const size of [1,2,3])for(const mode of [0,1]){
  const p=createPhysics({size,mode});p.seats({0:{session:'a',body:0},1:{session:'b',body:1}});p.start();for(let i=0;i<500&&p.phase()!=='PLAY';i++)p.step();assert.equal(p.phase(),'PLAY');
  const world=p.inspect(),a=world.cars[0],b=world.cars[1];for(const c of world.cars)c.enabled=c===a||c===b;
  a.p.set(0,.19,0);a.v.set(23,0,0);a.q.identity();b.p.set(1.2,.19,0);b.v.set(0,0,0);b.q.identity();world.ball.p.set(0,15,30);world.ball.v.set(0,0,0);p.step();let state=p.state();
  assert.equal(state.cars[1].demoSeq,1,size+'v'+size+'/'+mode);assert.equal(state.cars[1].demoTime,3);assert.equal(p.driver(1).s.demoTime,3);assert.equal(state.cars.length,size*2);
  a.enabled=false;p.input('b',{round:state.round,jump:1,held:true,controls:{thr:1,boost:1}});for(let i=0;i<359;i++)p.step();state=p.state();assert.ok(state.cars[1].demoTime>0);assert.equal(Math.hypot(...state.cars[1].v),0);p.step();state=p.state();assert.equal(state.cars[1].demoTime,0);assert.equal(state.cars[1].respawnSeq,1);assert.equal(state.cars[1].demoSeq,1);assert.equal(state.cars[1].boost,33);assert.equal(state.cars[1].z,46.08);assert.ok([23.04,26.88].includes(Math.abs(state.cars[1].x)));assert.equal(Math.hypot(...state.cars[1].v),0);
 }
});
