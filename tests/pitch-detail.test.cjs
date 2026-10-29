const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function surface(g){const T=g.api.THREE,normal=new T.Texture();return {diffuse:new T.Texture(),normal,roughness:new T.Texture()};}
test('photographic micro detail keeps field paint separate, tiles at physical scale and owns its textures on WebGL',()=>{
 const g=load(),a=g.api,T=a.THREE,assets=surface(g),m=new T.MeshStandardMaterial({map:new T.Texture(),normalMap:new T.Texture()}),old=m.normalMap;let releases=0;old.dispose=()=>releases++;a.applyPitchDetail(m,assets,{isWebGPURenderer:false});assert.equal(releases,1);assert.equal(m.map!==assets.diffuse,true);assert.equal(m.turfDetailMap,assets.diffuse);assert.equal(m.normalMap,assets.normal);assert.equal(m.roughnessMap,assets.roughness);assert.equal(m.normalScale.x,.32);
 const shader={uniforms:{},fragmentShader:'#include <color_fragment>'};m.onBeforeCompile(shader);assert.equal(shader.uniforms.turfDetail.value,assets.diffuse);assert.ok(Math.abs(shader.uniforms.turfDetailRepeat.value.x-32.768)<1e-8);assert.ok(Math.abs(shader.uniforms.turfDetailRepeat.value.y-40.96)<1e-8);assert.match(shader.fragmentShader,/diffuseColor.rgb\*=clamp/);assert.match(shader.fragmentShader,/\.55,1.3/);
});
test('the actual pinned WebGPU engine exposes the same restrained texture-detail bridge',()=>{
 const g=load(),a=g.api,T=a.THREE,E=g.window.TevinEngine,assets=surface(g),m=E.standardMaterial({isWebGPURenderer:true},{map:new T.Texture()});a.applyPitchDetail(m,assets,{isWebGPURenderer:true});assert.equal(typeof E.pitchDetail,'function');assert.ok(m.colorNode?.isNode);assert.equal(m.userData.turfTile,2.5);assert.equal(m.turfDetailMap,assets.diffuse);
});
test('a partial turf image failure frees successful maps, retries cleanly, and reuses one completed surface set',async()=>{
 const created=[],requests=[],warnings=[];let rejectNormal=true;
 class TextureLoader{loadAsync(url){requests.push(url);if(rejectNormal&&url==='TURF:normal')return Promise.reject(Error('decode unavailable'));const texture={disposals:0,repeat:{set(x,y){this.x=x;this.y=y}},dispose(){this.disposals++}};created.push(texture);return Promise.resolve(texture);}}
 const ctx=vm.createContext({THREE:{TextureLoader,SRGBColorSpace:'srgb',NoColorSpace:'data',RepeatWrapping:'repeat'},HX:40.96,HZ:51.2,console:{warn:(...args)=>warnings.push(args)}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/pitch-detail.js'),'utf8')+'\nglobalThis.surfaceAPI={loadTurfSurfaceAssets,cache:()=>TURF_SURFACE_ASSETS};',ctx);const a=ctx.surfaceAPI;
 assert.equal(await a.loadTurfSurfaceAssets(),null);assert.equal(a.cache(),null);assert.equal(warnings.length,1);for(const texture of created)assert.equal(texture.disposals,1);
 rejectNormal=false;const surface=await a.loadTurfSurfaceAssets();assert.equal(created.length,5);assert.equal(surface.diffuse.colorSpace,'srgb');assert.equal(surface.normal.colorSpace,'data');assert.equal(surface.roughness.colorSpace,'data');
 for(const key of ['normal','roughness']){assert.ok(Math.abs(surface[key].repeat.x-32.768)<1e-8);assert.ok(Math.abs(surface[key].repeat.y-40.96)<1e-8);assert.equal(surface[key].wrapS,'repeat');assert.equal(surface[key].disposals,0);}
 assert.equal(await a.loadTurfSurfaceAssets(),surface);assert.equal(requests.length,6,'the cached success creates no duplicate image resources');
});
