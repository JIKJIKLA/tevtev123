const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,'../src',name),'utf8');
function lifecycle(){
 const game=source('game.js'),code=game.slice(game.indexOf('function dispose3d(){'),game.indexOf('async function build3d(')),warnings=[],elements=new Map(),ctx={console:{warn:(...args)=>warnings.push(args)},FORCE_GL:false,ENGINE:{status:{}},scene:null,ren:null,cam:null,sun:null,pipeline:null,grassM:null,envTarget:null,inited:0,graphicsPreset:-1,GT:null,GU:null,PITCH_TEXTURE:null,TURF_SURFACE_ASSETS:null,assetTextures:null,cm:[],WM:[],windFlags:[],contactShadows:[],goalLights:[],bm:null,pts:null,garageStage:null,FX:null,
  MATCH_EFFECTS:{rings:[],smoke:[]},OPENING:{},BOMB:{},BOOST_PICKUPS:{},RIVALS:{},SHOWROOM:{ready:false},resetCelebrationEffects(){},clearMatchEffects(){},document:{body:{classList:{add(){},remove(){}}}},
  $(id){if(!elements.has(id))elements.set(id,{classList:{add(){},remove(){}},replaceChildren(){},cloneNode(){return this},replaceWith(){}});return elements.get(id);}};
 vm.createContext(ctx);vm.runInContext(code+'\nthis.api={dispose3d,init3d};',ctx);return{ctx,api:ctx.api,warnings};
}
function resource(){return{calls:0,dispose(){this.calls++;}};}
function allocate(ctx,gpu=false){
 const map=Object.assign(resource(),{isTexture:true}),unused=Object.assign(resource(),{isTexture:true}),background=Object.assign(resource(),{isTexture:true}),geometry=resource(),material=Object.assign(resource(),{map}),targetTexture=Object.assign(resource(),{isTexture:true}),target=Object.assign(resource(),{texture:targetTexture});
 target.dispose=function(){this.calls++;this.texture.dispose()};material.envMap=targetTexture;
 const shadowTexture=Object.assign(resource(),{isTexture:true}),shadow=Object.assign(resource(),{texture:shadowTexture});shadow.dispose=function(){this.calls++;this.texture.dispose()};
 const renderer=Object.assign(resource(),{isWebGPURenderer:gpu,losses:0,forceContextLoss(){this.losses++}}),pipeline=resource();
 renderer.dispose=function(){assert.equal(ctx.inited,0);assert.equal(ctx.scene,null);assert.equal(ctx.ren,null);this.calls++};
 Object.assign(ctx,{scene:{background,traverse(fn){fn({geometry,material});fn({geometry,material:[material]})}},ren:renderer,envTarget:target,sun:{shadow:{map:shadow}},pipeline,GT:map,PITCH_TEXTURE:map,assetTextures:{used:map,unused},FX:{maps:{soft:map}},inited:0});
 return{map,unused,background,geometry,material,targetTexture,target,shadowTexture,shadow,renderer,pipeline};
}
test('partial graphics teardown frees shared and unused maps once and survives repeated cleanup',()=>{
 const {ctx,api}=lifecycle(),objects=allocate(ctx,true);ctx.inited=1;ctx.SHOWROOM.ready=true;api.dispose3d();api.dispose3d();
 for(const value of Object.values(objects))assert.equal(value.calls,1);assert.equal(objects.renderer.losses,1);assert.equal(ctx.assetTextures,null);assert.equal(ctx.PITCH_TEXTURE,null);assert.equal(ctx.bm,null);assert.equal(ctx.pts,null);assert.equal(ctx.SHOWROOM.ready,false);assert.equal(ctx.graphicsPreset,-1);
});
test('two-tier turf and shared photographic/contact maps release once across a quality rebuild',()=>{
 const {ctx,api,warnings}=lifecycle(),original=allocate(ctx),surface=Object.fromEntries(['diffuse','normal','roughness'].map(name=>[name,Object.assign(resource(),{isTexture:true})])),carContact=Object.assign(resource(),{isTexture:true}),ballContact=Object.assign(resource(),{isTexture:true});
 const layers=Array.from({length:2},()=>({geometry:resource(),material:Object.assign(resource(),{map:original.map})})),pitch=Object.assign(resource(),{map:original.map,turfDetailMap:surface.diffuse,normalMap:surface.normal,roughnessMap:surface.roughness}),contactMaterials=[carContact,carContact,ballContact].map(map=>Object.assign(resource(),{map}));
 const oldTraverse=ctx.scene.traverse;ctx.scene.traverse=fn=>{oldTraverse(fn);fn({material:pitch});for(const layer of layers)fn(layer);for(const material of contactMaterials)fn({material});};
 ctx.TURF_SURFACE_ASSETS=surface;ctx.grassM={children:layers};ctx.GU={paint:{value:original.map},layers:[{},{}]};ctx.inited=1;
 api.dispose3d();api.dispose3d();
 for(const value of [...Object.values(original),...Object.values(surface),carContact,ballContact,pitch,...layers.flatMap(layer=>[layer.geometry,layer.material]),...contactMaterials])assert.equal(value.calls,1);
 assert.equal(ctx.TURF_SURFACE_ASSETS,null);assert.equal(ctx.GU,null);assert.equal(ctx.grassM,null);assert.equal(ctx.contactShadows.length,0);assert.equal(warnings.length,0);
});
test('failed WebGPU and WebGL attempts release their own scenes before a successful retry',async()=>{
 const {ctx,api}=lifecycle(),attempts=[],errors=[Error('WebGPU shader failure'),Error('WebGL shader failure')];
 ctx.build3d=async forceGL=>{const value=allocate(ctx,!forceGL);attempts.push({forceGL,value});if(errors.length)throw errors.shift();ctx.inited=1;return'ready';};
 await assert.rejects(api.init3d(),/WebGL shader failure/);assert.deepEqual(attempts.map(a=>a.forceGL),[false,true]);for(const attempt of attempts)for(const value of Object.values(attempt.value))assert.equal(value.calls,1);assert.match(ctx.ENGINE.status.fallbackReason,/WebGPU shader failure/);
 assert.equal(await api.init3d(true),'ready');assert.equal(attempts.length,3);assert.equal(attempts[2].value.renderer.calls,0);assert.equal(ctx.inited,1);
});
test('a WebGL-only failure cleans the partial renderer without retrying or masking the load error',async()=>{
 const {ctx,api}=lifecycle();let attempts=0,objects;ctx.build3d=async()=>{attempts++;objects=allocate(ctx);throw Error('Car texture unavailable')};
 await assert.rejects(api.init3d(true),/Car texture unavailable/);assert.equal(attempts,1);assert.equal(objects.renderer.calls,1);assert.equal(ctx.ren,null);
});
test('failed preload is retryable and an optional body failure preserves a ready arena with a retry message',async()=>{
 const {ctx,api}=lifecycle(),message={textContent:''};let failMain=true,failWarm=true,initializations=0,removed=0,tempGeometry,tempMaterial;
 Object.assign(ctx,{starting:false,LOADING:{active:false},INTRO:{enabled:false},BODY_IDS:['octane','fennec'],BODY_NAMES:['Octane','Fennec'],cfg:{body:0},cars:[{}],loadingBegin:async()=>1,loadingStage:async()=>{},loadingEnd:async()=>{},loadingAbort(){},configureCars(){},introMessage(){},bodyPhysics:()=>({height:.4}),
  graphicsDeadline:async work=>work,createCarVisual(){tempGeometry=resource();tempMaterial=resource();return{position:{set(){}},traverse(fn){fn({geometry:tempGeometry,material:tempMaterial})}};}});
 const lookup=ctx.$;ctx.$=id=>id==='start-status'?message:lookup(id);
 ctx.init3d=async()=>{initializations++;const objects=allocate(ctx);if(failMain){failMain=false;throw Error('Selected body compilation failed')}ctx.inited=1;ctx.scene.add=()=>{};ctx.scene.remove=()=>removed++;objects.renderer.compileAsync=async()=>{if(failWarm)throw Error('Alternate body compilation failed')};};
 vm.runInContext(source('preload.js')+'\nthis.preloadAPI={preloadArena,enterArenaHome,warmPreloadCar};',ctx);
 await ctx.preloadAPI.preloadArena();assert.match(message.textContent,/Play can retry: Selected body compilation failed/);assert.equal(ctx.inited,0);assert.equal(ctx.starting,false);
 await ctx.preloadAPI.preloadArena();assert.equal(initializations,2);assert.equal(ctx.inited,1);assert.equal(ctx.SHOWROOM.ready,true);assert.equal(tempGeometry.calls,1);assert.equal(tempMaterial.calls,1);assert.equal(removed,1);assert.match(message.textContent,/Arena ready\. Fennec preview will retry when selected/);
 failWarm=false;await ctx.preloadAPI.warmPreloadCar(1);assert.equal(tempGeometry.calls,1);assert.equal(tempMaterial.calls,1);assert.equal(removed,2);await ctx.preloadAPI.preloadArena();assert.equal(initializations,2);api.dispose3d();
});
test('a stalled optional shader compile has a deadline and a completed compile clears its timer',async()=>{
 const ctx=vm.createContext({setTimeout,clearTimeout});vm.runInContext(source('renderer.js')+'\nthis.deadline=graphicsDeadline;',ctx);
 await assert.rejects(ctx.deadline(new Promise(()=>{}),'Fennec preview',5),/Fennec preview timed out.*retry/);assert.equal(await ctx.deadline(Promise.resolve('ready'),'Octane preview',5000),'ready');
});
test('optional body cleanup stays with the original scene if graphics recovery replaces it during compilation',async()=>{
 const {ctx}=lifecycle();let resolve,removedOld=0,removedNew=0,geometry=resource(),material=resource();const arena={add(){},remove(){removedOld++}},renderer={compileAsync:()=>new Promise(r=>resolve=r)};
 Object.assign(ctx,{scene:arena,ren:renderer,cam:{},BODY_NAMES:['Octane','Fennec'],cars:[{}],bodyPhysics:()=>({height:.4}),graphicsDeadline:async work=>work,createCarVisual:()=>({position:{set(){}},traverse:fn=>fn({geometry,material})})});
 vm.runInContext(source('preload.js')+'\nthis.warm=warmPreloadCar;',ctx);const work=ctx.warm(1);ctx.scene={remove(){removedNew++}};ctx.ren={};ctx.ENGINE.status.warming=true;resolve();await assert.rejects(work,/Graphics changed/);assert.equal(removedOld,1);assert.equal(removedNew,0);assert.equal(geometry.calls,1);assert.equal(material.calls,1);assert.equal(ctx.ENGINE.status.warming,true);
});
