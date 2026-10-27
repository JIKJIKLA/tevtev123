const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('radiance probe uses linear light and preserves HDR team lights without clipping the sky',()=>{
 const a=load().api;assert.equal(a.radianceLinear(0),0);assert.equal(a.radianceLinear(255),1);assert.ok(Math.abs(a.radianceLinear(128)-.21586)<.0001);
 const source=new Uint8Array(4*128*4);for(let i=0;i<source.length;i+=4)source.set([140,180,210,255],i);source.set([255,146,42,255],(63*4)*4);source.set([38,143,255,255],(63*4+1)*4);source.set([255,0,0,255],0);source.set([0,255,0,255],127*4*4);const result=a.stadiumRadiancePixels(source,4,128);assert.ok(Array.from(result).every(Number.isFinite));for(const i of [(64*4)*4,(64*4+1)*4+2])assert.ok(result[i]>1&&result[i]<2.5,'colored lights stay HDR without excessive peak energy');assert.equal(result[1],1);assert.equal(result[127*4*4],1);for(let i=3;i<result.length;i+=4)assert.equal(result[i],1);assert.equal(result.length,source.length);
});

test('stylized light rig keeps the existing lighting budget and only the sun can cast shadows',()=>{
 const a=load().api,T=a.THREE,palette=[0x175cff,0xff7a20];
 for(const detail of [false,true])for(const gpu of [false,true]){const scene=new T.Scene(),renderer={isWebGPURenderer:gpu,shadowMap:{}},rig=a.stadiumLightRig(renderer,scene,detail,palette),lights=[];scene.traverse(o=>{if(o.isLight)lights.push(o)});assert.equal(lights.length,detail?10:6);assert.deepEqual(lights.filter(o=>o.castShadow).map(o=>o.uuid),detail?[rig.sun.uuid]:[]);assert.ok(rig.sun.color.r>rig.sun.color.b);assert.ok(rig.sun.position.y>50);assert.ok(rig.sun.shadow.camera.left< -51&&rig.sun.shadow.camera.right>51);assert.equal(rig.sun.shadow.mapSize.x,2048);for(const lamp of rig.goalLights){assert.equal(lamp.color.getHex(),palette[lamp.userData.team]);assert.equal(lamp.castShadow,false);assert.ok(lamp.intensity>0&&lamp.distance<=42);}assert.equal(renderer.shadowMap.type,T.PCFShadowMap);}
});

test('goal source halos are finite, bounded and shared as one small geometry per team',()=>{
 const a=load().api,g=a.goalFrameHaloGeometry(),p=g.getAttribute('position');assert.ok(p.count<=12);assert.equal(g.index.count,18);for(const key of ['position','normal','uv'])assert.ok(Array.from(g.getAttribute(key).array).every(Number.isFinite));for(let i=0;i<p.count;i++){assert.equal(p.getZ(i),0);assert.ok(Math.abs(p.getX(i))<10);assert.ok(p.getY(i)>=-.3&&p.getY(i)<7.1);}
});
