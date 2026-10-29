const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function arena(){
 const g=load({source:true}),create=g.document.createElement.bind(g.document);
 // Canvas pixels are a browser visual check. These tests exercise the generated
 // geometry/material ownership, resource bounds and physical-opening clearance.
 g.document.createElement=(tag,...args)=>{const element=create(tag,...args);if(tag.toLowerCase()==='canvas'){
  const gradient={addColorStop(){}},context=new Proxy({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient,measureText:()=>({width:10})},{get:(object,key)=>key in object?object[key]:()=>{}});element.getContext=()=>context;
 }return element;};return g;
}
function finiteGeometry(geometry){for(const name of ['position','normal','uv']){const a=geometry.getAttribute(name);assert.ok(a,name);assert.ok(Array.from(a.array).every(Number.isFinite),name+' has a nonfinite component');}}

test('rounded layered goal surrounds never narrow the unchanged rectangular collision mouth',()=>{
 const {api:a}=arena(),GX=8.92755,GH=6.42775;
 for(const geometry of [a.goalSurroundGeometry(),a.goalTunnelRibGeometry(),a.goalSurroundGeometry(.32,.095,.12)]){
  finiteGeometry(geometry);const positions=geometry.getAttribute('position');assert.ok(positions.count<3000);assert.ok(positions.count>100);
  for(let i=0;i<positions.count;i++){const x=Math.abs(positions.getX(i)),y=positions.getY(i);if(y>=0&&y<GH)assert.ok(x>GX+.06,'Decorative frame entered the collision opening');assert.ok(x<GX+2);assert.ok(y<GH+2);}
 }
});

test('full seated crowd silhouettes remain small shared finite geometry with a bounded per-fan cost',()=>{
 const {api:a}=arena(),geometry=a.championshipFanGeometry();finiteGeometry(geometry);assert.equal(geometry.getAttribute('position').count,26);assert.equal(geometry.index.count/3,48);geometry.computeBoundingBox();const size=geometry.boundingBox.getSize(new a.THREE.Vector3());assert.ok(size.x>=.65&&size.x<=.7&&size.y<=.75&&size.z>=.49&&size.z<=.51);assert.notEqual(geometry.type,'SphereGeometry');
});

test('packed seating doubles actual row occupancy with the same four shared crowd draws and clear aisles',()=>{
 const {api:a}=arena(),T=a.THREE,stadium=a.engine.championshipStadium({isWebGPURenderer:false},[0x2a6bff,0xff7a20],false),original=[];
 stadium.traverse(o=>{if(o.isInstancedMesh)original.push(o)});assert.equal(original.length,4);const poses=original.map(o=>{const matrix=new T.Matrix4();o.getMatrixAt(0,matrix);return {count:o.count,matrix}}),oldGeometry=original[0].geometry;let disposals=0;oldGeometry.addEventListener('dispose',()=>disposals++);
 a.styleChampionshipStadium(stadium);const crowd=[],risers=[],facades=[];stadium.traverse(o=>{if(o.isInstancedMesh)crowd.push(o);if(o.name==='Seating row riser')risers.push(o);if(o.name==='Recessed service concourse bays')facades.push(o);assert.ok(!o.isLight);});
 assert.equal(crowd.length,4);assert.equal(crowd.reduce((sum,o)=>sum+o.count,0),13104);assert.equal(disposals,1);assert.equal(new Set(crowd.map(o=>o.geometry)).size,1);assert.equal(risers.length,18);assert.equal(facades.length,3);assert.equal(new Set(facades.map(o=>o.material)).size,1);
 for(let k=0;k<4;k++){
  const o=crowd[k],left=new T.Matrix4(),right=new T.Matrix4();assert.equal(o.count,poses[k].count*2);assert.equal(o.castShadow,false);assert.equal(o.receiveShadow,false);o.getMatrixAt(0,left);o.getMatrixAt(1,right);const lp=new T.Vector3().setFromMatrixPosition(left),rp=new T.Vector3().setFromMatrixPosition(right);assert.ok(Math.abs(lp.distanceTo(rp)-.54)<.00001,'Pairs no longer share a properly spaced seat slot');assert.ok(Array.from(o.instanceMatrix.array).every(Number.isFinite));assert.ok(Array.from(o.instanceColor.array).every(Number.isFinite));
  for(let i=0;i<o.count;i++){o.getMatrixAt(i,left);const p=new T.Vector3().setFromMatrixPosition(left);assert.ok(Math.abs(p.x)>41||Math.abs(p.z)>52,'Crowd entered the playable field');}
 }
 assert.ok(crowd.reduce((sum,o)=>sum+o.count*o.geometry.index.count/3,0)<650000,'Crowd exceeded its instanced triangle allowance');
 for(const o of [...risers,...facades]){finiteGeometry(o.geometry);assert.ok(o.geometry.getAttribute('position').count<600);assert.equal(o.material.transparent,false);}
});

test('goal tunnels and cage trim batch into a bounded static budget with no new lights or roof-hatch geometry',()=>{
 const {api:a}=arena(),scene=new a.THREE.Scene(),goals=a.decorateArenaGoals(scene),walls=a.buildArenaWallStructure(scene);let lights=0,meshCount=0,vertices=0,transparent=0;
 scene.traverse(object=>{if(object.isLight)lights++;if(object.isMesh){meshCount++;vertices+=object.geometry.getAttribute('position').count;if(object.material.transparent)transparent++;assert.equal(object.castShadow,false);finiteGeometry(object.geometry);}});
 assert.equal(lights,0);assert.equal(goals.children.length,8);assert.equal(walls.children.length,4);assert.equal(meshCount,12);assert.equal(transparent,2);assert.ok(vertices<50000,'Static architecture exceeded its geometry budget');
 for(const group of [goals,walls])group.traverse(object=>{if(!object.isMesh)return;const p=object.geometry.getAttribute('position');object.updateMatrixWorld(true);for(let i=0;i<p.count;i++){const point=new a.THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(object.matrixWorld);assert.ok(point.y<25,'Wall/goal detail unexpectedly reached the fixed roof hatch');if(!object.material.transparent&&Math.abs(Math.abs(point.z)-51.2)<.8&&point.y>0&&point.y<6.42775)assert.ok(Math.abs(point.x)>=8.92755,'A goal-mouth solid blocked legal play');}});
 const teamMaterials=new Set();scene.traverse(object=>{if(object.material?.userData.team!==undefined)teamMaterials.add(object.material.userData.team);});assert.deepEqual([...teamMaterials].sort(),[0,1]);
});

test('shared stadium materials receive one architectural treatment regardless of mesh reuse',()=>{
 const {api:a}=arena(),T=a.THREE;
 function treatment(count){const stadium=new T.Group(),material=new T.MeshStandardMaterial({color:0x596b7b,roughness:.55,metalness:.65});for(let i=0;i<count;i++){const mesh=new T.Mesh(new T.BoxGeometry(1,1,1),material);mesh.position.set(60+i,12,0);stadium.add(mesh);}a.styleChampionshipStadium(stadium);return material;}
 const single=treatment(1),reused=treatment(28);assert.equal(single.color.getHex(),reused.color.getHex());assert.equal(single.roughness,reused.roughness);assert.equal(single.metalness,reused.metalness);assert.ok(reused.roughness>=.7);assert.ok(reused.envMapIntensity<.3);
});

test('daylight terraces use warm concrete reflectance while roof and recesses retain depth',()=>{
 const {api:a}=arena(),T=a.THREE,stadium=new T.Group(),terrace=new T.MeshStandardMaterial({color:0x263b48,roughness:.91}),roof=new T.MeshStandardMaterial({color:0x263b48,roughness:.62,metalness:.35}),steel=new T.MeshStandardMaterial({color:0x263b48,roughness:.52,metalness:.65});
 for(const material of [terrace,roof,steel])stadium.add(new T.Mesh(new T.BoxGeometry(1,1,1),material));a.styleChampionshipStadium(stadium);
 const luminance=color=>.2126*color.r+.7152*color.g+.0722*color.b;
 assert.ok(luminance(terrace.color)>.3,'Terrace albedo is still dark paint rather than concrete');assert.ok(terrace.color.r>=terrace.color.b,'Concrete drifted back to navy');assert.ok(luminance(roof.color)<luminance(terrace.color)*.25,'Roof lost the recessed shade contrast');assert.ok(luminance(steel.color)>.2);for(const material of [terrace,roof,steel]){assert.ok(material.roughness>=.78);assert.ok(material.envMapIntensity<=.24);}let lights=0;stadium.traverse(object=>{if(object.isLight)lights++;});assert.equal(lights,0);
});
