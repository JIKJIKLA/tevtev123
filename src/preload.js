let preloadJob=null;
async function preloadArena(){
 if(preloadJob)return preloadJob;
 preloadJob=(async()=>{starting=true;let id;try{
  id=await loadingBegin('WELCOME TO TEVIN LEAGUE','Preparing the arena, cars and match effects',false);
  configureCars();await init3d();
  // Compile the other body materials now so garage changes can reuse shader programs.
  for(let body=0;body<BODY_IDS.length;body++){if(body===cfg.body)continue;await loadingStage(92+body*2,'Preparing '+BODY_NAMES[body]);const model=createCarVisual({...cars[0],body});model.position.set(0,bodyPhysics({body}).height+.016,0);scene.add(model);ENGINE.status.warming=true;try{if(ren.compileAsync)await ren.compileAsync(scene,cam);else ren.compile?.(scene,cam)}finally{ENGINE.status.warming=false;scene.remove(model);const geos=new Set(),mats=new Set();model.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:[o.material])if(mat)mats.add(mat)});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose())}}
  $('menu').classList.add('live-preview');document.body.classList.add('arena-ready');SHOWROOM.ready=true;
  await loadingEnd(id);introMessage(INTRO.enabled?'ARENA READY · PRESS START':'ARENA READY · MUSIC OFF');
 }catch(e){loadingAbort(id);$('start-status').textContent='Arena preload failed. Play can retry: '+e.message;console.warn(e)}finally{starting=false}})();return preloadJob;
}
async function enterArenaHome(){
 if(starting||LOADING.active)return;starting=true;let id;
 try{id=await loadingBegin('YOUR ARENA','Your car. Your next match.',!!inited);INTRO.active=false;$('intro').hidden=true;for(const child of $('menu').children)child.inert=false;showMenuScreen('home');if(!inited)await init3d();$('menu').classList.add('live-preview');document.body.classList.add('arena-ready');await loadingEnd(id);$('nav-play').focus?.()}
 catch(e){loadingAbort(id);$('start-status').textContent='Could not prepare the arena: '+e.message}finally{starting=false}
}
