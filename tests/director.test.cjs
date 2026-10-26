const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('camera sweeps stay inside walls, rounded corners, ceiling and goal pockets without moving the anchor',()=>{
 const a=load().api,V=a.THREE.Vector3;
 for(const [p,d] of [[[0,.5,0],[50,5,0]],[[40,8,0],[46,9,-5]],[[0,19,0],[0,25,5]],[[37,2,47],[47,4,57]],[[0,2,58],[12,9,65]]]){
  const anchor=new V(...p),desired=new V(...d),out=new V();assert.equal(a.constrainArenaCamera(anchor,desired,out),true);a.surf(out);assert.ok(a.getState().penetration>=.415,JSON.stringify(out));assert.deepEqual(Array.from(anchor.toArray()),p);
  for(let i=0;i<=100;i++){const probe=anchor.clone().lerp(out,i/100);a.surf(probe);assert.ok(a.getState().penetration>=.405,'camera path crossed a wall');}
 }
 const out=new V();assert.equal(a.constrainArenaCamera(new V(0,.5,0),new V(4,3,-6),out),false);assert.deepEqual(Array.from(out.toArray()),[4,3,-6]);
});
test('camera fade is isolated from shared opponent materials and restores the original paint and depth writing',()=>{
 const a=load().api,T=a.THREE,material=new T.MeshStandardMaterial({color:0x123456}),car=new T.Mesh(new T.BoxGeometry(),material),opponent=new T.Mesh(new T.BoxGeometry(),material);car.userData.paintMaterials=[material];a.setCameraCarOpacity(car,.33);
 assert.notEqual(car.material,opponent.material);assert.equal(car.material.opacity,.33);assert.equal(opponent.material.opacity,1);assert.equal(car.material.depthWrite,false);assert.equal(car.userData.paintMaterials[0],car.material);a.setCameraCarOpacity(car,1);assert.equal(car.material.opacity,1);assert.equal(car.material.depthWrite,true);assert.equal(car.material.color.getHex(),0x123456);
});
test('the car fades for a blocked ball ray and stays solid when the ball is in front or clear beside it',()=>{
 const a=load().api,T=a.THREE,c=a.cars[0],mesh=new T.Object3D();mesh.position.set(0,.5,0);const height=.5+a.bodyPhysics(c).center[1],camera=new T.Vector3(0,height,-4);
 assert.equal(a.carBlocksBall(camera,new T.Vector3(0,height,6),c,mesh),true);assert.equal(a.carBlocksBall(camera,new T.Vector3(0,height,-2),c,mesh),false);assert.equal(a.carBlocksBall(camera,new T.Vector3(8,height,6),c,mesh),false);mesh.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2);assert.equal(a.carBlocksBall(camera,new T.Vector3(0,height,6),c,mesh),true);
});
test('replay locates the final recorded hit, follows the car then the ball, and eases its slow-motion zoom back out',()=>{
 const a=load().api,frames=Array.from({length:181},(_,i)=>{const t=i/30;return{t,cars:[{p:[0,.5,t*5],q:[0,0,0,1]}],ball:[0,.9,t<3?t*5+1:16+(t-3)*12],touches:[t>=3?1:0],lastPlayer:t>=3?0:-1};}),r={frames,elapsed:0,scorer:0,focusCar:0,team:0};a.planGoalReplay(r);assert.equal(r.plan.hit,3);assert.equal(a.replayDirectorState(r).follow,0);
 let previous=-Infinity;for(let i=0;i<=660;i++){r.elapsed=i/100;const s=a.replayDirectorState(r);assert.ok(s.time>=previous-1e-9&&s.time<=6);assert.ok(s.fov>=45&&s.fov<=85);previous=s.time;}
 r.elapsed=1;const approach=a.replayDirectorState(r);r.elapsed=3.8;const slow=a.replayDirectorState(r);r.elapsed=6.6;const release=a.replayDirectorState(r);assert.equal(approach.ballFocus,0);assert.equal(slow.slow,true);assert.ok(slow.zoom>.8);assert.ok(slow.fov<approach.fov);assert.equal(release.ballFocus,1);assert.ok(release.fov>slow.fov);assert.equal(release.time,6);
});
test('ball camera can look down to the pitch from a wall or aerial without modifying either body',()=>{const a=load().api,T=a.THREE,car=new T.Vector3(38,10,0),ball=new T.Vector3(20,1,0),out=new T.Vector3();a.cameraBallTarget(car,ball,out);assert.ok(out.y<car.y);assert.deepEqual(Array.from(car.toArray()),[38,10,0]);assert.deepEqual(Array.from(ball.toArray()),[20,1,0]);});
test('the wall orbit frames both the car and a ball across the field while the camera remains inside',()=>{
 const a=load().api,T=a.THREE,car=new T.Vector3(40,8,0),ball=new T.Vector3(-10,1,0),normal=new T.Vector3(-1,0,0),position=new T.Vector3(),target=new T.Vector3();a.wallCameraPose(car,normal,1,2.7,position);a.surf(position);assert.ok(a.getState().penetration>.42);a.wallBallTarget(position,car,ball,target);const fov=2*Math.atan(Math.tan(104*Math.PI/360)/(16/9))*180/Math.PI,camera=new T.PerspectiveCamera(fov,16/9,.1,700);camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld();for(const p of [car,ball]){const projected=p.clone().project(camera);assert.ok(Math.abs(projected.x)<.98&&Math.abs(projected.y)<.98,'wall framing lost one of its subjects');}
});
test('online replay recording and its terminal frame use authority time even when the client display is throttled',()=>{const a=load().api;a.configureCars();a.DED.active=true;Object.assign(a.MP,{active:true,role:'guest',slot:0});a.setState({st:'PLAY',sandbox:false});a.RIVALS.time=1000;for(let i=0;i<15;i++)a.replayRecord(a.mpSnapshot(),i/30);assert.equal(a.RIVALS.ring.at(-1).t,14/30);a.RIVALS.replayStamp=.5;a.setState({st:'GOAL',score:[1,0]});a.rivalsGoal({id:7,team:0,scorer:0,assist:-1,speed:40});assert.equal(a.RIVALS.replay.frames.at(-1).t,.5);assert.ok(a.RIVALS.replay.plan.end<1);});
