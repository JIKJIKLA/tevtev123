const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),load=require('./harness.cjs');
const finishCode=fs.readFileSync(path.join(__dirname,'../src/car-finish.js'),'utf8');
function finishes(){const context=vm.createContext({});vm.runInContext(finishCode+'\nglobalThis.finish={styleCarSurfaces,carSurfaceRole};',context);return context.finish;}
function allMaterials(model){const set=new Set();model.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)set.add(m)});return [...set];}
function surfaceState(m){return JSON.stringify({color:m.color?.getHex(),roughness:m.roughness,metalness:m.metalness,envMapIntensity:m.envMapIntensity,clearcoat:m.clearcoat,clearcoatRoughness:m.clearcoatRoughness,opacity:m.opacity,transparent:m.transparent,map:m.map?.uuid,normalMap:m.normalMap?.uuid});}

test('all three imported bodies retain matte paint and texture ownership while separating readable chassis, trim and rubber roles',()=>{
 const a=load().api,finish=finishes(),renderer={isWebGPURenderer:false};
 for(const body of ['octane','fennec','dominus']){
  const assets=Object.fromEntries(['octaneBody','octaneChassis','fennecChassis','dominusChassis','tire','tireNormal','rim'].map(k=>[k,new a.THREE.Texture()]));const model=a.engine.importedCar(renderer,body,0x2867ff,assets);a.preparePaint(model,0x2867ff);
  const materials=allMaterials(model),paint=new Set(model.userData.paintMaterials),roles=new Map(materials.map(m=>[m,finish.carSurfaceRole(m,paint)])),unknown=new Map(materials.filter(m=>roles.get(m)==='other').map(m=>[m,surfaceState(m)]));
  assert.equal([...roles.values()].filter(x=>x==='glass').length,1);
  const maps=new Map(materials.map(m=>[m,[m.map,m.normalMap,m.roughnessMap,m.aoMap]]));
  assert.equal(finish.styleCarSurfaces(model,model.userData.paintMaterials),model);
  for(const [m,before]of unknown)assert.equal(surfaceState(m),before,'unrecognized materials remain untouched');
  for(const m of materials){assert.deepEqual([m.map,m.normalMap,m.roughnessMap,m.aoMap],maps.get(m));const role=roles.get(m);if(role==='rubber'||role==='trim'||role==='chassis')assert.ok(m.roughness>=.8&&m.metalness<=.12,'matte dark surface retains diffuse response');if(role==='glass'){assert.equal(m.roughness,.38);assert.equal(m.color.getHex(),0x07101b);}if(role==='rim')assert.ok(m.metalness>.4&&m.roughness>=.4);}
  for(const m of paint){assert.equal(m.color.getHex(),0x2867ff);assert.equal(m.roughness,.72);assert.equal(m.metalness,.04);assert.equal(m.clearcoat,0);}
  const states=new Map(materials.map(m=>[m,surfaceState(m)]));finish.styleCarSurfaces(model,model.userData.paintMaterials);for(const m of materials)assert.equal(surfaceState(m),states.get(m),'styling is idempotent');
 }
});

test('explicit surface names and narrow source signatures preserve custom dark artwork, glass color and lamp transparency',()=>{
 const T=load().api.THREE,finish=finishes(),model=new T.Group(),paint=new T.MeshPhysicalMaterial({color:0x07101b,metalness:.2,roughness:.2,clearcoat:.8});
 const window=new T.MeshPhysicalMaterial({color:0x101c2f,roughness:.12,clearcoat:.8,opacity:.68,transparent:true});window.name='Front Windscreen';
 const fallback=new T.MeshStandardMaterial({color:0x254963,metalness:.65,roughness:.15}),unknown=new T.MeshStandardMaterial({color:0x07101b,roughness:.95,metalness:0}),lamp=new T.MeshPhysicalMaterial({color:0x07101b,metalness:.2,roughness:.2,clearcoat:.8});lamp.name='Headlight glass';
 model.add(new T.Mesh(new T.BoxGeometry(),[paint,window,fallback,unknown,lamp]));const unchanged=new Map([unknown,lamp].map(m=>[m,surfaceState(m)]));
 finish.styleCarSurfaces(model,[paint]);assert.equal(window.roughness,.38);assert.equal(window.opacity,.68);assert.equal(window.transparent,true);assert.equal(window.color.getHex(),0x101c2f);assert.equal(fallback.roughness,.38);assert.equal(fallback.metalness,.65);
 for(const [m,before]of unchanged)assert.equal(surfaceState(m),before);assert.equal(paint.color.getHex(),0x07101b);assert.equal(paint.clearcoat,0);
});

test('dark source tyre and chassis atlases supply their own reflectance instead of receiving a second dark tint',()=>{
 const a=load().api,finish=finishes(),T=a.THREE,renderer={isWebGPURenderer:false},luma=c=>c.r*.2126+c.g*.7152+c.b*.0722;
 for(const body of ['octane','fennec','dominus']){
  const maps=Object.fromEntries(['octaneChassis','fennecChassis','dominusChassis','tire'].map(k=>[k,new T.Texture()]));
  const textured=a.engine.importedCar(renderer,body,0x2867ff,maps),solid=a.engine.importedCar(renderer,body,0x2867ff,{});
  for(const model of [textured,solid]){a.preparePaint(model,0x2867ff);finish.styleCarSurfaces(model);}
  for(const role of ['rubber','chassis']){
   const imported=allMaterials(textured).find(m=>m.userData.surfaceRole===role),fallback=allMaterials(solid).find(m=>m.userData.surfaceRole===role);
   assert.ok(imported.map,'actual imported surface retains its original artwork');assert.equal(fallback.map,null);
   // These atlases already contain the low reflectance of rubber and recesses.
   // A neutral multiplier must retain most of it, while the untextured material
   // still supplies a suitably dark solid colour rather than painting tyres white.
   assert.ok(luma(imported.color)>.85,'textured source is double-darkened');assert.ok(luma(fallback.color)<.3,'untextured dark surface lost its reflectance');
   assert.ok(luma(imported.color)>3*luma(fallback.color));assert.equal(imported.emissiveIntensity,1);assert.equal(imported.emissive.getHex(),0,'readability comes from diffuse response, not emissive tyres');
  }
 }
});

function showroomScene(){
 const T=load().api.THREE,context={BR:.9125,inited:1,OPENING:{},RIVALS:{},previewTime:0,st:'MENU',INTRO:{active:false},garageStage:{visible:true},grassM:{visible:false},cam:new T.PerspectiveCamera(),score:[1,0],cars:[{enabled:true,team:0,color:0x2867ff},{enabled:true,team:1,color:0xff7820}],cm:[new T.Group(),new T.Group()],bm:new T.Group(),contactShadows:Array.from({length:3},()=>new T.Mesh(new T.PlaneGeometry(),new T.MeshBasicMaterial())),cfg:{hi:0},bodyPhysics:()=>({height:.1701}),paintCar:()=>{},driverPaint:()=>0x2867ff,Y3:new T.Vector3(0,1,0),innerWidth:1366,innerHeight:768,updateWind:()=>{},updateStadiumShadow:()=>{},pts:{},updateBoostPickups:()=>{},ren:{shadowMap:{}},sun:{shadow:{}},pipeline:{render:()=>{}},cl:(v,lo,hi)=>Math.max(lo,Math.min(hi,v))};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/showroom.js'),'utf8')+'\nglobalThis.preview={SHOWROOM,renderShowcase};',context);return {context,T,...context.preview};
}
test('showroom translation moves the car, contact shadow and camera aim together without changing orbit proportions',()=>{
 const {context:c,T,SHOWROOM,renderShowcase}=showroomScene();
 for(const [yaw,distance,pitch] of [[.15,2.55,.12],[1.3,4.1,.2]]){
  Object.assign(SHOWROOM,{yaw,distance,pitch});renderShowcase(1/60);assert.equal(c.cm[0].position.z,2.5);assert.equal(c.contactShadows[0].position.z,2.5);assert.equal(c.contactShadows[0].rotation.y,yaw);assert.equal(c.cam.position.z,2.5+distance*.65);assert.equal(c.cam.position.x,distance*.76);assert.equal(c.cm[0].position.y,.1861);assert.equal(c.cm[1].visible,false);
  const actual=c.cam.getWorldDirection(new T.Vector3()),wanted=new T.Vector3(0,.38,2.5).sub(c.cam.position).normalize();assert.ok(actual.distanceTo(wanted)<1e-10,'camera aim stays on translated car');
 }
});
test('the title and victory camera retain their existing field framing',()=>{
 const {context:c,renderShowcase}=showroomScene();c.INTRO.active=true;renderShowcase(1/60);assert.equal(c.cm[0].visible,false);assert.equal(c.bm.visible,true);assert.equal(c.bm.position.z,-8);assert.equal(c.cam.position.z,13);
 c.INTRO.active=false;c.st='END';renderShowcase(1/60);assert.equal(c.cm[0].position.z,0);assert.equal(c.contactShadows[0].position.z,0);assert.equal(c.cam.position.z,7);assert.equal(c.cm[0].visible,true);assert.equal(c.cm[1].visible,false);
});
