const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),load=require('./harness.cjs');
const finishCode=fs.readFileSync(path.join(__dirname,'../src/car-finish.js'),'utf8');
function finishes(){const context=vm.createContext({});vm.runInContext(finishCode+'\nglobalThis.finish={styleCarSurfaces,carSurfaceRole};',context);return context.finish;}
function allMaterials(model){const set=new Set();model.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)set.add(m)});return [...set];}
function surfaceState(m){return JSON.stringify({color:m.color?.getHex(),roughness:m.roughness,metalness:m.metalness,envMapIntensity:m.envMapIntensity,clearcoat:m.clearcoat,clearcoatRoughness:m.clearcoatRoughness,opacity:m.opacity,transparent:m.transparent,map:m.map?.uuid,normalMap:m.normalMap?.uuid});}

test('all three actual imported bodies soften only their window role and preserve matte paint, rubber and chrome',()=>{
 const a=load().api,finish=finishes(),renderer={isWebGPURenderer:false};
 for(const body of ['octane','fennec','dominus']){
  const model=a.engine.importedCar(renderer,body,0x2867ff);a.preparePaint(model,0x2867ff);
  const materials=allMaterials(model),paint=new Set(model.userData.paintMaterials),glass=materials.filter(m=>finish.carSurfaceRole(m,paint)==='glass');
  assert.equal(glass.length,1,body+' has one shared imported window material');
  const preserved=new Map(materials.filter(m=>!glass.includes(m)).map(m=>[m,surfaceState(m)]));
  assert.equal(finish.styleCarSurfaces(model,model.userData.paintMaterials),model);
  for(const m of glass){assert.equal(m.roughness,.38);assert.equal(m.clearcoat,.1);assert.equal(m.clearcoatRoughness,.55);assert.equal(m.envMapIntensity,.3);assert.equal(m.color.getHex(),0x07101b);}
  for(const [m,before] of preserved)assert.equal(surfaceState(m),before,body+' retains other surface properties');
  for(const m of paint){assert.equal(m.roughness,.72);assert.equal(m.metalness,.04);assert.equal(m.clearcoat,0);}
  finish.styleCarSurfaces(model,model.userData.paintMaterials);assert.equal(glass[0].roughness,.38,'repeated styling is stable after recognizing the role');
 }
});

test('surface names and legacy fallback glass are recognized without broad dark-color heuristics',()=>{
 const T=load().api.THREE,finish=finishes(),model=new T.Group(),paint=new T.MeshPhysicalMaterial({color:0x07101b,metalness:.2,roughness:.2,clearcoat:.8});
 const window=new T.MeshPhysicalMaterial({color:0x101c2f,roughness:.12,clearcoat:.8,opacity:.68,transparent:true});window.name='Front Windscreen';
 const fallback=new T.MeshStandardMaterial({color:0x254963,metalness:.65,roughness:.15}),rubber=new T.MeshStandardMaterial({color:0x07101b,roughness:.95,metalness:0}),lamp=new T.MeshPhysicalMaterial({color:0x07101b,metalness:.2,roughness:.2,clearcoat:.8});lamp.name='Headlight glass';
 model.add(new T.Mesh(new T.BoxGeometry(),[paint,window,fallback,rubber,lamp]));const unchanged=new Map([paint,rubber,lamp].map(m=>[m,surfaceState(m)]));
 finish.styleCarSurfaces(model,[paint]);assert.equal(window.roughness,.38);assert.equal(window.opacity,.68);assert.equal(window.transparent,true);assert.equal(fallback.roughness,.38);assert.equal(fallback.metalness,.65);
 for(const [m,before] of unchanged)assert.equal(surfaceState(m),before);
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
