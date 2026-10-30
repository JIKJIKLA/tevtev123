const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),load=require('./harness.cjs');
function cameraScene(){
 const a=load().api,T=a.THREE,mesh=new T.Group(),body=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial()),car={...a.cars[0],enabled:true,demoTime:0},classes=new Set();mesh.add(body);mesh.userData.paintMaterials=[body.material];mesh.position.set(0,.5,0);
 const camera=new T.PerspectiveCamera(77.55,16/9,.1,700),ball=new T.Object3D(),ctx={V3:T.Vector3,Qn:T.Quaternion,Y3:new T.Vector3(0,1,0),BR:.9125,bodyPhysics:a.bodyPhysics,cl:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),cam:camera,bm:ball,ballCam:true,cm:[mesh],document:{body:{classList:{toggle:(key,value)=>value?classes.add(key):classes.delete(key),remove:key=>classes.delete(key)}}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/camera-director.js'),'utf8')+'\nthis.api={VIEW,carBlocksBall,carBallOcclusion,cameraInsideCar,updateViewFade,resetViewFade,keepCarInFrame};',ctx);
 camera.position.set(0,.5+a.bodyPhysics(car).center[1],-4);ball.position.set(0,camera.position.y,6);return{ctx,a,T,mesh,body,car,camera,ball,classes,...ctx.api};
}

test('wall corrections alone and ball-disk edge grazes leave the car fully opaque',()=>{
 const s=cameraScene(),{ctx,camera,ball,car,mesh,updateViewFade,carBallOcclusion,carBlocksBall}=s;const original=s.body.material;
 ball.position.x=8;for(let i=0;i<120;i++)updateViewFade(1/60,true,car,mesh);assert.equal(mesh.userData.cameraFade,undefined);assert.equal(s.body.material,original);assert.equal(s.VIEW.obscured,false);assert.equal(s.VIEW.clipped,true);
 ball.position.x=2.4;const fraction=carBallOcclusion(camera.position,ball.position,car,mesh);assert.ok(fraction>0&&fraction<5/9,'edge rays may touch the silhouette without covering most of the ball');assert.equal(carBlocksBall(camera.position,ball.position,car,mesh),false);for(let i=0;i<120;i++)updateViewFade(1/60,false,car,mesh);assert.equal(mesh.userData.cameraFade,undefined);
 ball.position.x=0;ctx.ballCam=false;for(let i=0;i<120;i++)updateViewFade(1/60,true,car,mesh);assert.equal(mesh.userData.cameraFade,undefined,'car camera is not faded just because ball lies behind the body');
});

test('sustained ball obstruction fades gently, a one-frame crossing does not, and clear views restore promptly',()=>{
 const {camera,ball,car,mesh,updateViewFade,resetViewFade,VIEW,classes,body}=cameraScene();
 updateViewFade(1/60,false,car,mesh);ball.position.x=8;updateViewFade(1/60,false,car,mesh);assert.equal(mesh.userData.cameraFade,undefined,'one transient crossing does not create transparent materials');
 ball.position.x=0;for(let i=0;i<3;i++)updateViewFade(1/60,false,car,mesh);assert.equal(mesh.userData.cameraFade,undefined,'short obstruction dwell keeps opaque materials');
 for(let i=0;i<45;i++)updateViewFade(1/60,false,car,mesh);assert.equal(mesh.userData.cameraFade.opacity,.33);assert.equal(body.material.transparent,true);assert.equal(classes.has('camera-car-faded'),true);
 ball.position.x=2.4;for(let i=0;i<25;i++)updateViewFade(1/60,true,car,mesh);assert.equal(mesh.userData.cameraFade.opacity,1,'edge-only overlap and wall proximity do not prolong the fade');assert.equal(body.material.transparent,false);assert.equal(body.material.depthWrite,true);assert.equal(classes.has('camera-car-faded'),false);
 ball.position.x=0;for(let i=0;i<20;i++)updateViewFade(1/60,false,car,mesh);resetViewFade();assert.equal(mesh.userData.cameraFade.opacity,1);assert.equal(VIEW.hold,0);assert.equal(VIEW.blockedFor,0);
});

test('a clipped camera inside the body fades immediately while demolished or hidden cars do not request fades',()=>{
 const s=cameraScene(),{ctx,camera,car,mesh,ball,updateViewFade,resetViewFade}=s;ctx.ballCam=false;camera.position.copy(mesh.position);camera.position.x+=s.a.bodyPhysics(car).center[0];camera.position.y+=s.a.bodyPhysics(car).center[1];ball.position.x=8;
 assert.equal(s.cameraInsideCar(camera.position,car,mesh),true);updateViewFade(1/60,true,car,mesh);assert.ok(mesh.userData.cameraFade.opacity<1);resetViewFade();
 car.demoTime=1;for(let i=0;i<30;i++)updateViewFade(1/60,true,car,mesh);assert.equal(mesh.userData.cameraFade.opacity,1);car.demoTime=0;mesh.visible=false;for(let i=0;i<30;i++)updateViewFade(1/60,true,car,mesh);assert.equal(mesh.userData.cameraFade.opacity,1);
});

test('high-ball framing preserves the visible car footprint without altering saved camera settings or body transforms',()=>{
 const {a,T,camera,car,mesh,keepCarInFrame}=cameraScene();mesh.position.set(0,a.bodyPhysics(car).height,0);mesh.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2);camera.position.set(0,1.17,-2.7);camera.lookAt(0,8,14);camera.updateMatrixWorld();const p=mesh.position.clone(),q=mesh.quaternion.clone(),fov=camera.fov,position=camera.position.clone();
 const wheel=()=>a.bodyPhysics(car).wheels.map(w=>new T.Vector3(...w).applyQuaternion(mesh.quaternion).add(mesh.position).project(camera));assert.ok(wheel().some(w=>w.y<-.95),'the original elevated aim crops the wheels');assert.equal(keepCarInFrame(camera,car,mesh),true);for(const w of wheel())assert.ok(w.y>=-.881&&w.y<.85,'framing keeps wheel contact points within the vertical safe region');
 assert.equal(camera.fov,fov);assert.deepEqual(camera.position.toArray(),position.toArray());assert.deepEqual(mesh.position.toArray(),p.toArray());assert.deepEqual(mesh.quaternion.toArray(),q.toArray());assert.equal(keepCarInFrame(camera,car,mesh),false,'already corrected framing remains stable');
 camera.lookAt(0,.6,14);camera.updateMatrixWorld();const ordinary=camera.quaternion.clone();assert.equal(keepCarInFrame(camera,car,mesh),false);assert.deepEqual(camera.quaternion.toArray(),ordinary.toArray());
});

test('framing remains finite for rolled wall poses, portrait aspect and close camera safety limits',()=>{
 const {a,T,camera,car,mesh,keepCarInFrame}=cameraScene();for(const body of [0,1,2])for(const aspect of [16/9,9/16]){
  car.body=body;camera.aspect=aspect;camera.updateProjectionMatrix();mesh.position.set(39,8,0);mesh.quaternion.setFromEuler(new T.Euler(.3,.7,Math.PI/2));camera.position.set(37.9,9.3,-7);camera.lookAt(-10,1,0);camera.updateMatrixWorld();keepCarInFrame(camera,car,mesh);assert.ok(camera.quaternion.toArray().every(Number.isFinite));assert.ok(camera.position.toArray().every(Number.isFinite));
 }
 camera.position.copy(mesh.position);camera.lookAt(mesh.position.clone().add(new T.Vector3(0,0,1)));camera.updateMatrixWorld();assert.equal(keepCarInFrame(camera,car,mesh),false,'inside-body cameras do not flip their viewing direction to chase impossible bounds');
});
