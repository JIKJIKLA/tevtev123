const test=require('node:test'),assert=require('node:assert/strict'),createPhysics=require('../physics.cjs');
test('corrected standard pads refill and synchronize for every team size and playlist',()=>{
 for(const size of [1,2,3])for(const mode of [0,1]){
  const p=createPhysics({size,mode}),world=p.inspect();p.start();for(let i=0;i<500&&p.phase()!=='PLAY';i++)p.step();assert.equal(p.phase(),'PLAY');world.cars.forEach(c=>c.enabled=false);const c=world.cars[0];c.enabled=true;
  const place=(x,z)=>{c.p.set(x,.19,z);c.v.set(0,0,0);c.w.set(0,0,0);c.q.identity();c.boost=0;};
  place(-9.4+1.435,-33.08);p.step();let s=p.state();assert.equal(s.cars[0].boost,12);assert.equal(s.pads[5],4);
  place(-30.72,-40.96);p.step();s=p.state();assert.equal(s.cars[0].boost,100);assert.equal(s.pads[3],10);assert.equal(s.pads.length,34);
  p.step();assert.ok(p.state().pads[3]<10);assert.ok(p.state().pads[3]>9.9);
 }
});
