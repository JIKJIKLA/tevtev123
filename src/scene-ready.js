// The arena has six visual seats irrespective of the active physics roster.
const VISUAL_SEATS=6;
const SCENE_WARM={owner:null,models:new WeakSet(),job:null};
const SCENE_WARM_CONTEXT=new WeakMap();
function graphicsKey(){return cfg.hi+cfg.models*2;}
function visualSeatSpec(index){return cars[index]||{id:index,team:index%2,body:index%3,color:teamPalette[index%2],enabled:false};}
function syncVisualSeats(){for(let i=0;i<cm.length;i++)cm[i].visible=!!cars[i]?.enabled;}
async function warmSceneOnce(label='Preparing kickoff effects'){
 const owner=ren,arena=scene,camera=cam,renderPipeline=pipeline;if(!owner||!arena)return;
 const models=cm.slice(),points=pts,roots=[...models,OPENING.visuals?.group,BOMB.visuals?.group,FX?.group,CELEBRATION.group,MATCH_EFFECTS.group,RIVALS.visuals?.group,BOOST_PICKUPS.visuals?.group,points].filter(Boolean),context=SCENE_WARM_CONTEXT.get(owner);
 const current=()=>ren===owner&&scene===arena&&cam===camera&&pipeline===renderPipeline;
 if(SCENE_WARM.owner===owner&&context?.arena===arena&&context.camera===camera&&context.pipeline===renderPipeline&&roots.every(m=>SCENE_WARM.models.has(m)))return;
 const pending=SCENE_WARM.job;
 if(pending?.arena===arena){
  // Scene staging changes shared visibility/counts. A replacement pipeline or
  // camera on the same graph waits for old staging cleanup; a wholly new arena
  // can prepare independently of an obsolete renderer job.
  const same=pending.owner===owner&&pending.camera===camera&&pending.pipeline===renderPipeline;
  try{await pending;}catch(error){if(same)throw error;}
  if(!current())throw Error('Graphics changed during preparation. Please retry Play.');return warmSceneOnce(label);
 }
 const job=(async()=>{
  await loadingStage(92,label);if(!current())throw Error('Graphics changed during preparation. Please retry Play.');const saved=[],seen=new Set();let succeeded=false;
  try{
   for(const root of roots)root.traverse(o=>{if(seen.has(o))return;seen.add(o);saved.push({object:o,visible:o.visible,count:o.isInstancedMesh?o.count:undefined});o.visible=true;if(o.isInstancedMesh&&o.count===0)o.count=1;});
   renderPipeline.refreshVisibility?.();await ENGINE.prewarm(owner,arena,camera,renderPipeline,models,points);if(!current())throw Error('Graphics changed during preparation. Please retry Play.');
   const previous=SCENE_WARM_CONTEXT.get(owner);if(SCENE_WARM.owner!==owner||previous?.arena!==arena||previous.camera!==camera||previous.pipeline!==renderPipeline)SCENE_WARM.models=new WeakSet();SCENE_WARM.owner=owner;SCENE_WARM_CONTEXT.set(owner,{arena,camera,pipeline:renderPipeline});for(const root of roots)SCENE_WARM.models.add(root);succeeded=true;
  }finally{for(const s of saved){s.object.visible=s.visible;if(s.count!==undefined)s.object.count=s.count;}if(current()){if(succeeded)syncVisualSeats();renderPipeline.refreshVisibility?.();}}
 })();Object.assign(job,{owner,arena,camera,pipeline:renderPipeline});SCENE_WARM.job=job;try{await job;}finally{if(SCENE_WARM.job===job)SCENE_WARM.job=null;}
 // A body/effect can be replaced during asynchronous shader preparation. Only
 // captured roots were warmed; coalesce a fresh pass for anything now missing.
 return warmSceneOnce(label);
}

function syncMenuDriver(){const name=$('menu-player-name'),title=$('menu-player-title'),level=$('menu-player-level'),strip=document.querySelector('.menu-player-strip');if(name)name.textContent=SOC.name||'DRIVER';if(title)title.textContent=RIVAL_PREF.title;if(level)level.textContent=String(1+Math.floor(CAREER.xp/500));strip?.style.setProperty('--career-progress',(CAREER.xp%500/5)+'%');}
