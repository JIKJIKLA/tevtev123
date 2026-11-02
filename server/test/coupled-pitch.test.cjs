const test=require('node:test'),assert=require('node:assert/strict'),{controls}=require('../main.cjs');
test('keyboard pitch-origin metadata is an explicit boolean-sized integer, not another analog force',()=>{
 assert.equal(controls({thr:1,pitch:1,coupledPitch:1}).coupledPitch,1);assert.equal(controls({pitch:1,coupledPitch:0}).coupledPitch,0);assert.equal(controls({pitch:1}).coupledPitch,0);
 for(const value of [-1,.5,2,Infinity,NaN,'1',true,{}])assert.throws(()=>controls({thr:1,pitch:1,coupledPitch:value}),/coupled pitch/);
 const packet=controls({thr:1,pitch:1,coupledPitch:1,carriedPitch:999,position:{x:900}});assert.equal(packet.carriedPitch,undefined);assert.equal(packet.position,undefined);assert.equal(packet.thr,1);assert.equal(packet.pitch,1);
});
