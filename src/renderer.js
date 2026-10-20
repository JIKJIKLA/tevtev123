// Renderer choice is independent of visual quality. Never reuse a canvas whose
// context type was claimed by a failed WebGPU/WebGL initialization.
async function rendererWithFallback(create, fresh, lightweight, forceGL=false) {
 const failures=[];
 for(const attempt of [()=>create(fresh(),forceGL),()=>lightweight(fresh())]) {
  try { return await attempt(); } catch(error) { failures.push(error.message||String(error)); }
 }
 throw new Error('No usable WebGPU or WebGL2 device. '+failures.join(' / '));
}
function freshGameCanvas(){const old=$('cv'),next=old.cloneNode(false);next.width=1;next.height=1;old.replaceWith(next);return next;}
async function createGameRenderer(forceGL){
 return rendererWithFallback(
  (canvas,gl)=>ENGINE.createRenderer(canvas,true,gl),freshGameCanvas,
  canvas=>{const result=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,stencil:false,powerPreference:'default',failIfMajorPerformanceCaveat:false});ENGINE.status.backend='WebGL2 compatibility';return result;},forceGL);
}
function graphicsFailure(error){
 const panel=$('graphics-error');panel.hidden=false;
 $('graphics-error-detail').textContent='Your browser could not provide a 3D graphics context. Automatic graphics and a lighter WebGL2 fallback were both tried. Open the game in a normal Chrome or Edge tab with graphics acceleration enabled, then retry.';
 $('graphics-error-technical').textContent=error.message||String(error);
 $('start-status').textContent='Graphics unavailable — see the recovery options above.';
}
async function retryGraphics(){
 if(starting||LOADING.active)return;starting=true;let id;
 try{$('graphics-error').hidden=true;id=await loadingBegin('RECONNECTING GRAPHICS','Checking your graphics device',false);configureCars();await init3d();await loadingEnd(id);$('start-status').textContent='Graphics ready. Choose your match to continue.';}
 catch(error){loadingAbort(id);try{dispose3d()}catch(_){}graphicsFailure(error)}finally{starting=false}
}
