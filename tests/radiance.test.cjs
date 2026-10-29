const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('radiance probe uses linear light and preserves HDR team lights without clipping the sky',()=>{
 const a=load().api;assert.equal(a.radianceLinear(0),0);assert.equal(a.radianceLinear(255),1);assert.ok(Math.abs(a.radianceLinear(128)-.21586)<.0001);
 const source=new Uint8Array(4*128*4);for(let i=0;i<source.length;i+=4)source.set([140,180,210,255],i);source.set([255,146,42,255],(63*4)*4);source.set([38,143,255,255],(63*4+1)*4);source.set([255,0,0,255],0);source.set([0,255,0,255],127*4*4);const result=a.stadiumRadiancePixels(source,4,128);assert.ok(Array.from(result).every(Number.isFinite));for(const i of [(64*4)*4,(64*4+1)*4+2])assert.ok(result[i]>1&&result[i]<2.5,'colored lights stay HDR without excessive peak energy');assert.equal(result[1],1);assert.equal(result[127*4*4],1);for(let i=3;i<result.length;i+=4)assert.equal(result[i],1);assert.equal(result.length,source.length);
});

test('stylized light rig keeps the existing lighting budget and only the sun can cast shadows',()=>{
 const a=load().api,T=a.THREE,palette=[0x175cff,0xff7a20];
 for(const detail of [false,true])for(const gpu of [false,true]){const scene=new T.Scene(),renderer={isWebGPURenderer:gpu,shadowMap:{}},rig=a.stadiumLightRig(renderer,scene,detail,palette),lights=[];scene.traverse(o=>{if(o.isLight)lights.push(o)});assert.equal(lights.length,detail?10:6);assert.deepEqual(lights.filter(o=>o.castShadow).map(o=>o.uuid),[rig.sun.uuid]);assert.ok(rig.sun.color.r>rig.sun.color.b);assert.ok(rig.sun.position.y>50);assert.ok(rig.sun.shadow.camera.left<=-14&&rig.sun.shadow.camera.right>=14);assert.equal(rig.sun.shadow.mapSize.x,detail?2048:1024);for(const lamp of rig.goalLights){assert.equal(lamp.color.getHex(),palette[lamp.userData.team]);assert.equal(lamp.castShadow,false);assert.ok(lamp.intensity>0&&lamp.distance<=42);}assert.equal(renderer.shadowMap.type,T.PCFShadowMap);}
});

test('goal source halos are finite, bounded and shared as one small geometry per team',()=>{
 const a=load().api,g=a.goalFrameHaloGeometry(),p=g.getAttribute('position');assert.ok(p.count<=12);assert.equal(g.index.count,18);for(const key of ['position','normal','uv'])assert.ok(Array.from(g.getAttribute(key).array).every(Number.isFinite));for(let i=0;i<p.count;i++){assert.equal(p.getZ(i),0);assert.ok(Math.abs(p.getX(i))<10);assert.ok(p.getY(i)>=-.3&&p.getY(i)<7.1);}
});

test('focused sunlight follows the rendered driver and garage car without following the simulation or airborne height',()=>{
 const T=load().api.THREE,player={id:2,p:new T.Vector3(-23,11,40)},models=[new T.Group(),new T.Group(),new T.Group()],renderer={shadowMap:{}},ctx={THREE:T,teamPalette:[0x2a6bff,0xff7a20],HZ:51.2,GX:8.93,GH:6.42,ren:renderer,cm:models,localPlayer:()=>player};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/radiance.js'),'utf8')+'\nthis.lighting={stadiumLightRig,updateStadiumShadow};',ctx);
 const scene=new T.Scene(),rig=ctx.lighting.stadiumLightRig(renderer,scene,false);ctx.sun=rig.sun;const offset=rig.sun.userData.shadowOffset.clone();models[2].position.set(6.2,4.3,-17.8);models[0].position.set(.3,.18,2.5);
 const check=(focus)=>{assert.deepEqual(Array.from(rig.sun.target.position.toArray()),[focus.x,0,focus.z]);assert.ok(rig.sun.position.clone().sub(rig.sun.target.position).distanceTo(offset)<1e-12,'sun direction stays constant as the shadow focus moves');assert.deepEqual(Array.from(new T.Vector3().setFromMatrixPosition(rig.sun.target.matrixWorld).toArray()),[focus.x,0,focus.z]);assert.equal(rig.sun.shadow.needsUpdate,true);assert.equal(renderer.shadowMap.needsUpdate,true);assert.equal(rig.sun.shadow.autoUpdate,false);};
 ctx.lighting.updateStadiumShadow();check(models[2].position);assert.notEqual(rig.sun.target.position.x,player.p.x,'the shadow does not lag behind rendered interpolation');
 rig.sun.shadow.needsUpdate=renderer.shadowMap.needsUpdate=false;ctx.lighting.updateStadiumShadow(true);check(models[0].position);
 models[2]=null;ctx.lighting.updateStadiumShadow();check(player.p);
 // During teardown or a failed graphics retry there is no owned shadow to update.
 ctx.sun=null;assert.doesNotThrow(()=>ctx.lighting.updateStadiumShadow());ctx.sun=rig.sun;ctx.ren=null;assert.doesNotThrow(()=>ctx.lighting.updateStadiumShadow());ctx.ren=renderer;delete rig.sun.userData.shadowOffset;assert.doesNotThrow(()=>ctx.lighting.updateStadiumShadow());
});
