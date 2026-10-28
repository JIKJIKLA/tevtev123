const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');

test('imported tyre tracks align to the measured axle contacts without stretching car height or length',()=>{
 const a=load().api,T=a.THREE;
 for(const [body,name] of ['octane','fennec','dominus'].entries()){
  const visual=a.engine.importedCar({isWebGPURenderer:false},name,0x2c69ec),spec=a.bodyPhysics({body});
  visual.remove(visual.userData.f);const original=new T.Box3().setFromObject(visual).getSize(new T.Vector3());visual.add(visual.userData.f);
  const model=a.fitCarVisual(visual,{body});visual.remove(visual.userData.f);model.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),centers=visual.userData.wheels.map(w=>w.getWorldPosition(new T.Vector3()));
  const mid=centers.reduce((sum,p)=>sum+p.z,0)/centers.length,track=centers.reduce((sum,p)=>sum+Math.abs(p.z-mid)*2,0)/centers.length;
  const target=spec.wheels.reduce((sum,p)=>sum+Math.abs(p[2])*2,0)/spec.wheels.length;
  assert.ok(Math.abs(track-target)<1e-6,name+' visual tyres do not match axle contacts');
  assert.ok(Math.abs(size.x-spec.half[0]*2*1.06)<1e-6,name+' length changed');
  assert.ok(Math.abs(size.y/size.x-original.y/original.x)<1e-6,name+' height proportion changed');
  assert.ok(Math.abs(bounds.min.y+spec.height)<1e-6,name+' tyres float above wheel baseline');
  assert.ok(model.userData.trackScale>=.85&&model.userData.trackScale<=1.2,name+' fitting distorted the silhouette');
 }
});

test('new drivers receive the wider field view while saved camera tuning remains intact',()=>{
 const fresh=load({full:true}).api.cameraSettings;
 assert.equal(fresh.fov,110);assert.equal(fresh.distance,2.7);assert.equal(fresh.height,1);assert.equal(fresh.angle,3);assert.equal(fresh.shake,false);
 const camera={fov:98,distance:3.2,height:1.4,angle:6,stiffness:.8,shake:true},saved=load({full:true,storage:{'tevin.controls.v9':JSON.stringify({camera})}}).api.cameraSettings;
 for(const [key,value] of Object.entries(camera))assert.equal(saved[key],value,key+' preference overwritten');
});

test('portrait garage fitting preserves enough horizontal view to contain the entire car',()=>{
 const a=load().api,normal=a.showroomViewDistance(2.55,16/9);
 assert.equal(normal,2.55);
 for(const aspect of [390/844,430/932,768/1024]){
  const distance=a.showroomViewDistance(2.55,aspect),horizontalSpan=2*distance*Math.tan(43*Math.PI/360)*aspect;
  assert.ok(horizontalSpan>1.7,'portrait view crops a car footprint');
 }
});
