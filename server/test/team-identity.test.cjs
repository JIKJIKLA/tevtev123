const {test}=require('node:test'),assert=require('node:assert/strict'),createPhysics=require('../physics.cjs');

test('authority keeps normal teams blue and orange across playlists, with personal paint as an explicit rule',()=>{
 for(const size of [1,2,3])for(const mode of [0,1])for(const teamColors of [true,false]){
  const p=createPhysics({size,mode,teamColors});
  p.seats({0:{session:'a',paint:0,body:0},1:{session:'b',paint:0xff43b5,body:1}});
  p.start();const cars=p.state().cars;
  assert.equal(cars[0].color,teamColors?0x2a6bff:0);
  assert.equal(cars[1].color,teamColors?0xff7a20:0xff43b5);
  assert.equal(cars.length,size*2);
 }
});
