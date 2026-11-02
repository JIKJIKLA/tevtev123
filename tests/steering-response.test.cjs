const test=require('node:test'),assert=require('node:assert/strict'),{run,fresh,input}=require('../scripts/measure-steering-response.cjs');
for(const name of ['turn-low','turn-medium','turn-high'])test('ordinary steering responds immediately and remains supported at '+name.replace('turn-','')+' speed',()=>{
 const r=run(name);assert.equal(r.firstSteeringSeconds,1/120);assert.ok(r.headingChange>2,'holding steer makes a continuous useful turn');assert.equal(r.minRoofUp,1);assert.ok(r.maxLateralSlip<1,'ordinary tire grip keeps a normal turn predictable');assert.equal(r.contactStateChanges,0);assert.ok(r.final.wheels>=3&&r.final.reportedGround);assert.ok(r.maxResidualPenetration<.005);
});
test('powerslide release with continued steering restores grip through finite tire force',()=>{
 const s=fresh(),{a,c}=s;c.v.x=14;let releaseSlip,afterSlip,biggestReleaseChange=0,prior=0;for(let k=0;k<180;k++){
  Object.assign(c.inp,input('slide-release-turn',k));a.stepCar(c,a.DT);const right=new s.T.Vector3(0,0,1).applyQuaternion(c.q),slip=c.v.dot(right);if(k===71)releaseSlip=Math.abs(slip);if(k>=72&&k<84)biggestReleaseChange=Math.max(biggestReleaseChange,Math.abs(slip-prior));if(k===119)afterSlip=Math.abs(slip);prior=slip;assert.ok(a.carPenetration(c)<.005);
 }
 assert.ok(releaseSlip>2,'the fixture actually enters a slide');assert.ok(biggestReleaseChange<1,'release does not erase lateral momentum in one tick');assert.ok(afterSlip<releaseSlip*.5,'continuing the turn regains predictable grip');assert.ok(c.ground&&c.wheelsOn>=3);assert.ok(Math.abs(c.wy)>.5);
});
test('braking crosses once into reverse and reverse steering stays responsive',()=>{
 const s=fresh(),{a,c}=s;c.v.x=8;let crossings=0,last=Math.sign(c.v.x),firstReverse=null;for(let k=0;k<180;k++){
  Object.assign(c.inp,input('brake-reverse',k));a.stepCar(c,a.DT);const forward=new s.T.Vector3(1,0,0).applyQuaternion(c.q),v=c.v.dot(forward),sign=Math.sign(v);if(sign&&sign!==last){crossings++;last=sign;}if(v<-.5&&firstReverse===null)firstReverse=k;assert.ok(new s.T.Vector3(0,1,0).applyQuaternion(c.q).y>.99);assert.ok(c.ground);
 }
 assert.equal(crossings,1,'holding reverse must not oscillate between drive directions');assert.ok(firstReverse!==null&&firstReverse<60);assert.ok(c.wy<-.5,'steering correctly changes yaw while reversing');assert.ok(c.v.length()>3);
});
