const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),load=require('./harness.cjs'),T=load().api.THREE;
const code=fs.readFileSync(path.join(__dirname,'../src/scene-ready.js'),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject};};
const tick=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
function populate(ctx){
 ctx.ren={};ctx.scene=new T.Group();ctx.cam={};ctx.pipeline={refreshes:0,refreshVisibility(){this.refreshes++;}};
 ctx.cm=Array.from({length:6},()=>{const m=new T.Group(),part=new T.Object3D();part.visible=false;m.add(part);m.visible=false;ctx.scene.add(m);return m;});
 const group=()=>{const g=new T.Group();g.visible=false;ctx.scene.add(g);return g;};ctx.OPENING={visuals:{group:group()}};ctx.BOMB={visuals:{group:group()}};ctx.FX={group:group()};ctx.CELEBRATION={group:group()};ctx.MATCH_EFFECTS={group:group()};ctx.RIVALS={visuals:{group:group()}};ctx.BOOST_PICKUPS={visuals:{group:group()}};
 ctx.pts=new T.InstancedMesh(new T.PlaneGeometry(),new T.MeshBasicMaterial(),3);ctx.pts.count=0;ctx.pts.visible=false;ctx.scene.add(ctx.pts);
}
function scene(){
 const calls=[],stages=[],ctx={cfg:{hi:0,models:1,size:1},teamPalette:[0x2a6bff,0xff7a20],cars:[{id:0,enabled:true,body:0},{id:1,enabled:true,body:1}],loadingStage:async(...a)=>{stages.push(a);},ENGINE:{prewarm:async(...a)=>{calls.push(a);}}};populate(ctx);vm.createContext(ctx);vm.runInContext(code+'\nthis.api={SCENE_WARM,graphicsKey,visualSeatSpec,syncVisualSeats,warmSceneOnce};',ctx);return{ctx,calls,stages,...ctx.api};
}

test('one six-seat scene and warmed effects are reused across active rosters without recompilation',async()=>{
 const s=scene(),{ctx,calls,warmSceneOnce,syncVisualSeats}=s;const models=ctx.cm.slice(),key=s.graphicsKey();await warmSceneOnce();assert.equal(calls.length,1);assert.equal(calls[0][4].length,6);
 for(const size of [3,1,2,3]){ctx.cfg.size=size;ctx.cars=Array.from({length:size*2},(_,id)=>({id,enabled:true,body:id%3}));syncVisualSeats();await warmSceneOnce();assert.equal(calls.length,1);assert.equal(s.graphicsKey(),key,'roster size does not invalidate graphic ownership');for(let i=0;i<6;i++){assert.equal(ctx.cm[i],models[i]);assert.equal(ctx.cm[i].visible,i<size*2);}}
 ctx.cfg.hi=1;assert.notEqual(s.graphicsKey(),key);ctx.cfg.hi=0;ctx.cfg.models=0;assert.notEqual(s.graphicsKey(),key);
 const fallback=s.visualSeatSpec(5);assert.equal(fallback.id,5);assert.equal(fallback.enabled,true,'existing active seats retain their physics specification');ctx.cars.length=2;const unused=s.visualSeatSpec(5);assert.equal(unused.id,5);assert.equal(unused.enabled,false);assert.equal(unused.team,1);assert.equal(unused.body,2);
});

test('failed asynchronous warmup restores every visibility flag and zero particle count and can retry',async()=>{
 const s=scene(),{ctx,warmSceneOnce,SCENE_WARM}=s,gate=deferred();let count=0;ctx.FX.group.add(ctx.pts);ctx.ENGINE.prewarm=async(...args)=>{count++;assert.equal(args[4].length,6);for(const m of args[4]){assert.equal(m.visible,true);assert.equal(m.children[0].visible,true);}assert.equal(ctx.pts.visible,true);assert.equal(ctx.pts.count,1);if(count===1)await gate.promise;};
 const work=warmSceneOnce();await tick();assert.equal(count,1);assert.equal(SCENE_WARM.job!==null,true);gate.reject(Error('Pipeline upload failed'));await assert.rejects(work,/Pipeline upload failed/);
 for(const m of ctx.cm){assert.equal(m.visible,false,'failed preparation restores even inactive roots whose physics seat is enabled');assert.equal(m.children[0].visible,false);}assert.equal(ctx.FX.group.visible,false);assert.equal(ctx.pts.visible,false);assert.equal(ctx.pts.count,0);assert.equal(SCENE_WARM.job,null);assert.equal(SCENE_WARM.owner,null);
 await warmSceneOnce();assert.equal(count,2);assert.equal(ctx.cm[0].visible,true);assert.equal(ctx.cm[2].visible,false);assert.equal(ctx.cm[0].children[0].visible,false);assert.equal(ctx.pts.count,0);assert.equal(ctx.pts.visible,false);
});

test('concurrent warm requests for the same graphics context share one pending preparation',async()=>{
 const s=scene(),{ctx,warmSceneOnce,SCENE_WARM}=s,gate=deferred();let calls=0;ctx.ENGINE.prewarm=async()=>{calls++;await gate.promise;};const first=warmSceneOnce('first'),second=warmSceneOnce('second');await tick();assert.equal(calls,1);assert.equal(s.stages.length,1);assert.equal(SCENE_WARM.job.owner,ctx.ren);gate.resolve();await Promise.all([first,second]);assert.equal(SCENE_WARM.job,null);await warmSceneOnce();assert.equal(calls,1);
});

test('renderer replacement during the loading stage cannot mix old renderer and new scene resources',async()=>{
 const s=scene(),{ctx,warmSceneOnce,SCENE_WARM}=s,gate=deferred(),old={owner:ctx.ren,scene:ctx.scene,models:ctx.cm,pipe:ctx.pipeline};let stages=0;ctx.loadingStage=async()=>{if(++stages===1)await gate.promise;};
 const stale=warmSceneOnce(),staleResult=assert.rejects(stale,/Graphics changed/);await tick();populate(ctx);const owner=ctx.ren,arena=ctx.scene,camera=ctx.cam,pipe=ctx.pipeline;const current=warmSceneOnce();await current;assert.equal(s.calls.length,1);assert.equal(s.calls[0][0],owner);assert.equal(s.calls[0][1],arena);assert.equal(s.calls[0][2],camera);assert.equal(s.calls[0][3],pipe);assert.equal(SCENE_WARM.owner,owner);
 gate.resolve();await staleResult;assert.equal(old.pipe.refreshes,0);for(const model of old.models)assert.equal(model.visible,false);assert.equal(SCENE_WARM.owner,owner);assert.equal(SCENE_WARM.job,null);
});

test('renderer replacement during GPU work does not block or clear the replacement renderer preparation',async()=>{
 const s=scene(),{ctx,warmSceneOnce,SCENE_WARM}=s,gate=deferred(),old={owner:ctx.ren,models:ctx.cm,points:ctx.pts,pipe:ctx.pipeline};let calls=0;ctx.ENGINE.prewarm=async(owner)=>{calls++;if(owner===old.owner)await gate.promise;};
 const stale=warmSceneOnce(),staleResult=assert.rejects(stale,/Graphics changed/);await tick();assert.equal(calls,1);populate(ctx);const owner=ctx.ren,pipe=ctx.pipeline;await warmSceneOnce();assert.equal(calls,2,'new context warms without waiting for an obsolete GPU job');assert.equal(SCENE_WARM.owner,owner);const refreshes=pipe.refreshes;
 gate.resolve();await staleResult;assert.equal(pipe.refreshes,refreshes,'old cleanup never refreshes the replacement pipeline');assert.equal(SCENE_WARM.owner,owner);assert.equal(SCENE_WARM.job,null);assert.equal(old.points.count,0);for(const m of old.models)assert.equal(m.visible,false);
});

test('new car models or effect roots invalidate readiness and only actually prepared roots are recorded',async()=>{
 const s=scene(),{ctx,warmSceneOnce}=s;await warmSceneOnce();assert.equal(s.calls.length,1);const replacement=new T.Group();ctx.cm[0]=replacement;await warmSceneOnce();assert.equal(s.calls.length,2);assert.equal(s.calls[1][4][0],replacement);await warmSceneOnce();assert.equal(s.calls.length,2);
 ctx.BOMB.visuals.group=new T.Group();await warmSceneOnce();assert.equal(s.calls.length,3);const owner=ctx.ren;ctx.pipeline={refreshVisibility(){}};await warmSceneOnce();assert.equal(ctx.ren,owner);assert.equal(s.calls.length,4,'a replacement pipeline is prepared even on a reused renderer');
});

test('model replacement while a warm job is pending coalesces a fresh pass for the new model',async()=>{
 const s=scene(),{ctx,warmSceneOnce}=s,gate=deferred(),original=ctx.cm[0];let count=0;ctx.ENGINE.prewarm=async(...args)=>{s.calls.push(args);if(++count===1)await gate.promise;};
 const first=warmSceneOnce();await tick();const replacement=new T.Group();ctx.cm[0]=replacement;const second=warmSceneOnce();gate.resolve();await Promise.all([first,second]);assert.equal(count,2);assert.equal(s.calls[0][4][0],original);assert.equal(s.calls[1][4][0],replacement);await warmSceneOnce();assert.equal(count,2);
});

test('a pipeline replaced on the same scene waits for stale visibility staging cleanup before retrying',async()=>{
 const s=scene(),{ctx,warmSceneOnce}=s,gate=deferred(),oldPipeline=ctx.pipeline;let calls=0;ctx.ENGINE.prewarm=async(owner,arena,camera,pipe)=>{calls++;if(pipe===oldPipeline)await gate.promise;};
 const stale=warmSceneOnce(),staleResult=assert.rejects(stale,/Graphics changed/);await tick();ctx.pipeline={refreshVisibility(){}};const replacement=warmSceneOnce();await tick();assert.equal(calls,1,'shared scene objects are not staged by overlapping jobs');gate.resolve();await Promise.all([staleResult,replacement]);assert.equal(calls,2);assert.equal(ctx.FX.group.visible,false);assert.equal(ctx.pts.count,0);assert.equal(ctx.pts.visible,false);assert.equal(ctx.cm[0].children[0].visible,false);
});

test('a rejected loading stage does not reveal scene objects and leaves warmup retryable',async()=>{
 const s=scene(),{ctx,warmSceneOnce,SCENE_WARM}=s;let first=true;ctx.loadingStage=async()=>{if(first){first=false;throw Error('Loading interrupted');}};await assert.rejects(warmSceneOnce(),/Loading interrupted/);assert.equal(SCENE_WARM.job,null);assert.equal(s.calls.length,0);for(const m of ctx.cm)assert.equal(m.visible,false);assert.equal(ctx.pts.count,0);await warmSceneOnce();assert.equal(s.calls.length,1);
});
