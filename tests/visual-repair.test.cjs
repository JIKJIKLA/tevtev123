const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),load=require('./harness.cjs');
function presentation(){
 const T=load().api.THREE,pixels=new Uint8ClampedArray([180,184,173,255,40,45,43,255,180,120,60,255,55,162,132,255,0,0,0,255,10,180,15,255]);let canvases=0;
 const ctx={THREE:T,console,Uint8ClampedArray,cvs:(width,height)=>{canvases++;return{width,height,getContext:()=>({drawImage(){},getImageData:()=>({data:pixels.slice()}),putImageData(value){this.data=value.data;}})};},tex:c=>new T.CanvasTexture(c)};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/car-finish.js'),'utf8')+'\nthis.api={styleMatchBall,ballPortPixels};',ctx);return{T,...ctx.api,pixels,canvasCount:()=>canvases};
}
test('ball connector emission excludes foam, seams, warm panels, green and black atlas padding',()=>{
 const p=presentation(),before=p.pixels.slice(),mask=p.ballPortPixels(p.pixels);assert.deepEqual(p.pixels,before,'source artwork is immutable');assert.equal(mask.length,before.length);
 for(const i of [0,1,2,4,5])assert.equal(mask[i*4]+mask[i*4+1]+mask[i*4+2],0);assert.ok(mask[12]>0);for(let i=0;i<mask.length;i+=4){assert.equal(mask[i],mask[i+1]);assert.equal(mask[i],mask[i+2]);assert.equal(mask[i+3],255);}
});
test('ball styling owns one small connector mask and preserves the supplied albedo, UV transform, geometry and silhouette',()=>{
 const p=presentation(),T=p.T,original=new T.Texture({width:1024,height:1024});original.repeat.set(1.2,.9);original.offset.set(.02,.03);original.rotation=.12;original.flipY=false;
 const material=new T.MeshPhysicalMaterial({map:original,color:0xffffff}),geometry=new T.SphereGeometry(.9125,12,8),ball=new T.Mesh(geometry,material),positions=geometry.getAttribute('position').array.slice();
 p.styleMatchBall(ball);assert.equal(material.map,original);assert.equal(ball.geometry,geometry);assert.deepEqual(geometry.getAttribute('position').array,positions);assert.equal(material.transparent,false);assert.equal(material.opacity,1);assert.ok(material.roughness>=.45&&material.roughness<=.65);assert.ok(material.emissiveIntensity<=1);
 const mask=material.emissiveMap;assert.ok(mask?.isTexture);assert.notEqual(mask,original);assert.equal(mask.image.width,256);assert.equal(mask.image.height,256);assert.equal(mask.flipY,false);assert.equal(mask.repeat.x,original.repeat.x);assert.equal(mask.repeat.y,original.repeat.y);assert.equal(mask.offset.x,original.offset.x);assert.equal(mask.rotation,original.rotation);assert.equal(material.userData.ballPortMaskReady,true);const version=material.version;p.styleMatchBall(ball);assert.equal(material.emissiveMap,mask);assert.equal(material.version,version);assert.equal(p.canvasCount(),1);
});
test('missing image data retains a valid matte ball without a whole-sphere emissive replacement',()=>{
 const p=presentation(),T=p.T,map=new T.Texture(),material=new T.MeshStandardMaterial({map}),ball=new T.Mesh(new T.SphereGeometry(.9125),material);p.styleMatchBall(ball);assert.equal(material.map,map);assert.equal(material.emissiveMap,null);assert.equal(material.userData.ballPortMaskReady,false);assert.ok(material.emissiveIntensity<=.08);assert.equal(p.canvasCount(),0);
});
test('balanced diffuse stadium fill keeps the exact existing light and shadow-caster budget',()=>{
 const a=load({source:true}).api,T=a.THREE;
 for(const detail of [false,true]){const scene=new T.Scene(),renderer={shadowMap:{}},rig=a.stadiumLightRig(renderer,scene,detail),lights=[];scene.traverse(o=>{if(o.isLight)lights.push(o);});assert.equal(lights.length,detail?10:6);assert.deepEqual(lights.filter(l=>l.castShadow).map(l=>l.uuid),[rig.sun.uuid]);const hemisphere=lights.find(l=>l.isHemisphereLight),luma=c=>c.r*.2126+c.g*.7152+c.b*.0722;assert.ok(luma(hemisphere.groundColor)>.2,'diffuse ground return exposes downward-facing body structure');assert.ok(rig.sun.intensity<3);assert.ok(lights.some(l=>l.isDirectionalLight&&l!==rig.sun&&l.intensity>=1));assert.ok(rig.goalLights.every(l=>!l.castShadow));}
});
