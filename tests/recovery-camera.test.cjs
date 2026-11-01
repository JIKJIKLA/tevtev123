const test=require('node:test'),assert=require('node:assert/strict'),{cameraRig}=require('../scripts/measure-camera-fidelity.cjs');
test('close ball radius noise never switches ball camera to the car heading',()=>{
 for(const hz of [30,60,120]){const r=cameraRig();r.ctx.ballCam=true;for(let i=0;i<hz*3;i++){r.ball.position.set(0,.9125,3);r.step(1/hz);}const q=r.car.q.clone(),p=r.mesh.position.clone();let maxStep=0,last=r.ctx.cd.clone();
  for(let i=0;i<hz*2;i++){r.ball.position.set(0,.9125,i%2?1.99:2.01);r.step(1/hz);maxStep=Math.max(maxStep,r.ctx.cd.angleTo(last));last.copy(r.ctx.cd);}
  assert.ok(maxStep<.001,'one-centimetre radius noise must not cause a visible camera swing');assert.ok(r.ctx.cd.z>.999);assert.ok(r.car.q.equals(q)&&r.mesh.position.equals(p));
 }
});
test('legitimate partial wall support preserves wall framing; a real jump departs it',()=>{
 const r=cameraRig(),T=r.T;r.ctx.ballCam=true;r.mesh.position.set(40,5,0);r.car.n.set(-1,0,0);r.mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0,0,1),new T.Vector3(-1,0,0),new T.Vector3(0,-1,0)));r.car.q.copy(r.mesh.quaternion);r.ball.position.set(30,4,12);r.car.ground=1;r.car.wheelsOn=4;r.car.jl=0;for(let i=0;i<360;i++)r.step(1/120);const eye=r.cam.position.clone();
 for(let i=0;i<240;i++){r.car.ground=i%2?0:1;r.car.wheelsOn=i%2?2:3;r.step(1/120);assert.ok(r.VIEW.wallMix>.99);assert.ok(r.cam.position.distanceTo(eye)<.01,'same physical wall pose must not pump its viewing distance');}
 r.car.ground=0;r.car.wheelsOn=2;r.car.jl=.12;for(let i=0;i<120;i++)r.step(1/120);assert.ok(r.VIEW.wallMix<.001,'jump lock excludes lingering wheel reach');r.car.wheelsOn=0;r.car.jl=0;for(let i=0;i<120;i++)r.step(1/120);assert.ok(r.VIEW.wallMix<.001);
});
