const test=require('node:test'),assert=require('node:assert/strict'),{controls}=require('../main.cjs');
test('removed pitch-latch metadata and recovery resources cannot enter the authoritative control schema',()=>{
 //10.7 intentionally removes the old pitch-origin flag. Real pitch is always
 // an analog player command; it no longer needs a carried-key state machine.
 const packet=controls({thr:1,pitch:1,coupledPitch:1,carriedPitch:999,supportTime:999,jumpBuffer:999,position:{x:900}});
 assert.deepEqual(packet,{thr:1,steer:0,pitch:1,yaw:0,roll:0,boost:0,ps:0});
 for(const key of ['thr','steer','pitch','yaw','roll','boost','ps'])for(const value of [-2,2,Infinity,NaN,'1',true,{}])assert.throws(()=>controls({[key]:value}),/Invalid control value/);
});
