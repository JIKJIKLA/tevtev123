const test=require('node:test'),assert=require('node:assert/strict');
const {setup,run,clone}=require('../scripts/measure-recovery-network.cjs');
const near=(value,label)=>assert.ok(Math.abs(value)<1e-9,`${label}: ${value}`);

test('held driving input pitches immediately after a deliberate jump and replays across every body, roster and playlist',()=>{
 for(const size of[1,2,3])for(const mode of[0,1])for(const body of[0,1,2]){
  const label=`${size}v${size}/mode${mode}/body${body}`,r=run({size,mode,body,scenario:'held-jump',ticks:84,trace:true});
  assert.equal(r.maximumError,0,label+' exact authority/prediction state');assert.ok(r.maximumRotationError<1e-6,label+' rotation');
  const takeoff=r.trace.find(row=>row.input.edge);assert.ok(takeoff,label+' real keydown produced jump edge');assert.equal(takeoff.input.controls.thr,1);assert.equal(takeoff.input.controls.pitch,1);
  assert.ok(takeoff.server.jl>0,label+' deliberate jump releases tires');assert.ok(Math.abs(takeoff.server.w[2])>1e-3,label+' the same held W provides immediate intentional pitch');
  assert.ok(!Object.hasOwn(takeoff.input.controls,'coupledPitch'),label+' no hidden input-origin latch metadata');
  for(const [key,value]of Object.entries(r.afterStale))if(key==='q')assert.ok(value<1e-6,label+' reconstructed rotation');else near(value,label+' reconstructed '+key);
  for(const [key,value]of Object.entries(r.final))if(key==='q')assert.ok(value<1e-6,label+' final rotation');else near(value,label+' final '+key);
  assert.equal(r.history,0,label+' current acknowledgement drains history');
 }
});

test('support dwell and short jump buffer reconstruct with strict bounds and reset without restoring the retired pitch latch',()=>{
 const{a,car}=setup();
 for(const[key,max]of [['supportTime',.1],['jumpBuffer',.08]]){
  for(const value of[0,max/2,max]){a.readDriver(car,{s:{[key]:value}});assert.equal(car[key],value);}
  for(const value of[-.001,max+.001,Infinity,NaN,true,false,'0.04',null]){car[key]=max/2;a.readDriver(car,{s:{[key]:value}});assert.equal(car[key],max/2,key+' rejects '+String(value));}
 }
 car.supportTime=.06;car.jumpBuffer=.05;car.jdir.set(.6,.8,0);car.flipAxis.set(.6,0,-.8);
 const packet=clone(a.packDriver(car));assert.equal(packet.s.supportTime,.06);assert.equal(packet.s.jumpBuffer,.05);assert.ok(!Object.hasOwn(packet.s,'carriedPitch'));
 for(const derived of['surfaceSupport','tireLoad','loadedWheels','supportGap','controlTrace'])assert.ok(!Object.hasOwn(packet.s,derived),derived+' must be resampled or remain diagnostic');
 car.supportTime=car.jumpBuffer=0;car.jdir.set(0,0,0);car.flipAxis.set(0,0,0);a.readDriver(car,packet);assert.equal(car.supportTime,.06);assert.equal(car.jumpBuffer,.05);assert.deepEqual(Array.from(car.jdir.toArray()),[.6,.8,0]);assert.deepEqual(Array.from(car.flipAxis.toArray()),[.6,0,-.8]);
 a.readDriver(car,{s:{carriedPitch:1}});assert.ok(!Object.hasOwn(a.packDriver(car).s,'carriedPitch'),'legacy fields cannot reinstate an input latch');
 a.resetCar(car,0,0);assert.equal(car.supportTime,0);assert.equal(car.jumpBuffer,0);
});
