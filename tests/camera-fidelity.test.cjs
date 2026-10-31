const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {cameraRig,metrics}=require('../scripts/measure-camera-fidelity.cjs');
const source=path.resolve(__dirname,'../src');

test('[correctness] collinear ball reversal turns monotonically at 30/60/120 Hz instead of locking the camera heading',()=>{
 const trajectories=[];
 for(const hz of [30,60,120]){const r=cameraRig(source);r.ctx.ballCam=true;r.ball.position.set(-10,.9125,0);let previous=0,crossing=null;
  for(let i=1;i<=hz;i++){r.step(1/hz);const yaw=Math.atan2(r.ctx.cd.z,r.ctx.cd.x);assert.ok(yaw>=previous-1e-10&&yaw<=Math.PI+1e-10);assert.ok(Math.abs(r.ctx.cd.length()-1)<1e-10);if(crossing===null&&yaw>=Math.PI/2)crossing=i/hz;previous=yaw;}
  // Retained first-order rate gives exactly ln(2)/10.6 to traverse half a turn;
  // crossing is observed on the next display frame, not an RL camera target.
  const analytic=Math.log(2)/(4+.55*12);assert.ok(crossing>=analytic-1e-9&&crossing<=analytic+1/hz+1e-9);trajectories.push(r.ctx.cd.toArray());
 }
 for(const state of trajectories)for(let i=0;i<3;i++)assert.ok(Math.abs(state[i]-trajectories[0][i])<1e-10);
});

test('[correctness] heading smoothing follows the short arc across the +/-pi seam and has finite antipodal/zero-vector fallbacks',()=>{
 const r=cameraRig(source),V=r.T.Vector3,current=new V(Math.cos(179*Math.PI/180),0,Math.sin(179*Math.PI/180)),target=new V(Math.cos(-179*Math.PI/180),0,Math.sin(-179*Math.PI/180));
 r.cameraHeadingStep(current,target,10,1/60);assert.ok(current.x<-.999,'the 2-degree seam crossing must not spin around the long arc');const unchanged=current.clone();r.cameraHeadingStep(current,new V(),10,1/60);assert.ok(current.distanceTo(unchanged)<1e-12);
 r.cameraHeadingStep(current.set(0,0,0),target,10,1/60);assert.ok(current.distanceTo(target)<1e-12);r.cameraHeadingStep(current,target.clone().negate(),10,0);assert.ok(current.toArray().every(Number.isFinite));
});

test('[readability approximation] a pure forward/backward pitch dodge does not swing car-camera yaw around mid-somersault',()=>{
 for(const direction of [-1,1]){const r=cameraRig(source);r.car.flipAxis=new r.T.Vector3(0,0,direction);r.ctx.ballCam=false;
  for(let i=0;i<=78;i++){r.car.dT=.65;r.mesh.quaternion.setFromAxisAngle(new r.T.Vector3(0,0,1),direction*Math.PI*2*i/78);r.step(1/120);assert.ok(r.ctx.cd.x>.999999&&Math.abs(r.ctx.cd.z)<1e-9);}
  // Releasing the flip phase and intentionally reversing yaw still turns the view.
  r.car.dT=0;r.mesh.quaternion.setFromAxisAngle(new r.T.Vector3(0,1,0),Math.PI);for(let i=0;i<120;i++)r.step(1/120);assert.ok(r.ctx.cd.x<-.999);
 }
});

test('[settings contract] wall camera preserves saved trailing distance, height and FOV instead of adding a separate long orbit and zoom',()=>{
 const r=cameraRig(source),V=r.T.Vector3,p=new V(40,8,0),n=new V(-1,0,0),eye=new V();
 for(const distance of [2,2.7,4])for(const height of [.8,1,2]){r.wallCameraPose(p,n,1,distance,eye,height);assert.ok(Math.abs(eye.z-p.z-distance)<1e-10);assert.ok(Math.abs(eye.y-p.y-height)<1e-10);assert.ok(Math.abs(eye.x-p.x+.85)<1e-10);}
 const target=new V();r.wallCameraPose(p,n,1,2.7,eye);r.wallBallTarget(eye,p,new V(-10,1,0),target);r.cam.position.copy(eye);r.cam.lookAt(target);r.cam.updateMatrixWorld();for(const point of [p,new V(-10,1,0)]){const screen=point.clone().project(r.cam);assert.ok(Math.abs(screen.x)<.98&&Math.abs(screen.y)<.98,'default wall view keeps both subjects visible at the shorter saved distance');}
 r.mesh.position.copy(p);r.car.n.copy(n);r.ctx.cameraSettings.fov=80;r.ctx.ballCam=true;r.ball.position.set(-10,1,0);for(let i=0;i<240;i++)r.step(1/60);const horizontal=2*Math.atan(Math.tan(r.cam.fov*Math.PI/360)*r.cam.aspect)*180/Math.PI;assert.ok(Math.abs(horizontal-80)<.001);assert.equal(r.ctx.cameraSettings.fov,80);
});

test('[correctness] distant ball targeting removes parallax while close overhead and goal-side paths remain finite and contained',()=>{
 const r=cameraRig(source),V=r.T.Vector3,target=new V(),car=new V(0,.17,0),ball=new V(50,8,0);r.cameraBallTarget(car,ball,target);assert.ok(target.distanceTo(ball)<1e-12);assert.deepEqual(Array.from(car.toArray()),[0,.17,0]);
 r.ctx.ballCam=true;r.ball.position.copy(ball);for(let i=0;i<180;i++)r.step(1/60);const facing=new V();r.cam.getWorldDirection(facing);assert.ok(facing.dot(ball.clone().sub(r.cam.position).normalize())>1-1e-10);
 for(const [p,b,n] of [[[0,.2,0],[0,12,0],[0,1,0]],[[40,8,0],[-10,1,0],[-1,0,0]],[[36.5,19.9,0],[5,2,12],[0,-1,0]],[[0,2,58],[7,.92,50],[0,1,0]],[[37,3,47],[31,7,44],[-.7,.2,-.7]]]){r.mesh.position.fromArray(p);r.ball.position.fromArray(b);r.car.n.fromArray(n).normalize();for(let i=0;i<120;i++){r.step(1/60);r.ctx.surf(r.cam.position);assert.ok(r.ctx.SS>=.415,'camera must stay within the same arena clearance constraint');assert.ok(r.cam.position.toArray().every(Number.isFinite));assert.ok(r.cam.quaternion.toArray().every(Number.isFinite));}}
});

test('[regression] the 16:9-normalized projection convention and saved stiffness response remain explicit, with no new claimed reference curve',()=>{
 const r=cameraRig(source);assert.ok(Math.abs(r.gameplayVerticalFov(110)-77.55214222201174)<1e-8);for(const value of [80,95,110]){const vertical=r.gameplayVerticalFov(value),horizontal=2*Math.atan(Math.tan(vertical*Math.PI/360)*(16/9))*180/Math.PI;assert.ok(Math.abs(horizontal-value)<1e-10);}
 const slow=cameraRig(source),fast=cameraRig(source);for(const rig of [slow,fast]){rig.ctx.ballCam=true;rig.ball.position.set(0,.9125,10);}slow.ctx.cameraSettings.stiffness=.1;fast.ctx.cameraSettings.stiffness=1;for(let i=0;i<6;i++){slow.step(1/60);fast.step(1/60);}assert.ok(fast.ctx.cd.z>slow.ctx.cd.z);
});

test('[stability] the controlled curved floor-wall-ceiling path remains continuous and inside the arena',()=>{
 const result=metrics(source);assert.equal(result.traversal.finite,true);assert.ok(result.traversal.minInterior>=.415);assert.ok(result.traversal.maxRelativeCameraStep<.2,'per-frame relative camera movement must remain bounded on the warmed continuous pose path');
});
