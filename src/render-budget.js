// Presentation-only. Never change DT, controls, physics work or match clocks.
const RENDER_BUDGET={scale:1,ema:1/60,slow:0,fast:0,cooldown:0,samples:0,changes:0,reason:'native'};
let resolutionPolicy='auto';
try{if(localStorage.getItem('nivet.resolution.v1')==='native')resolutionPolicy='native';}catch(_){}
function resetRenderBudget(state=RENDER_BUDGET,keepScale=false){state.scale=keepScale?state.scale:1;state.ema=1/60;state.slow=state.fast=state.cooldown=state.samples=0;state.reason=keepScale?'resumed':'native';return state.scale;}
function renderBudgetStep(state,seconds,active,policy='auto',quality=0){
 if(policy==='native'){if(state.scale!==1){state.scale=1;state.changes++;}state.slow=state.fast=0;state.reason='native';return state.scale;}
 // Background suspension and warm-up gaps are not GPU samples. Keep the chosen
 // scale but demand fresh sustained evidence after returning to active play.
 if(!active||!Number.isFinite(seconds)||seconds<=0||seconds>.25){resetRenderBudget(state,true);return state.scale;}
 state.samples++;state.ema+=(seconds-state.ema)*(1-Math.exp(-seconds/1.2));state.cooldown=Math.max(0,state.cooldown-seconds);
 state.slow=state.ema>1/40?state.slow+seconds:0;state.fast=state.ema<1/56?state.fast+seconds:0;
 const floor=quality?.9:.8;
 if(state.scale<floor){state.scale=floor;state.changes++;state.cooldown=3;state.slow=state.fast=0;}
 if(state.cooldown<=0&&state.slow>=1.5&&state.scale>floor){state.scale=Math.max(floor,Math.round((state.scale-.05)*100)/100);state.changes++;state.cooldown=3;state.reason='sustained slow frames';state.slow=state.fast=0;}
 else if(state.cooldown<=0&&state.fast>=8&&state.scale<1){state.scale=Math.min(1,Math.round((state.scale+.025)*1000)/1000);state.changes++;state.cooldown=8;state.reason='sustained headroom';state.slow=state.fast=0;}
 return state.scale;
}
function setResolutionPolicy(value){resolutionPolicy=value==='native'?'native':'auto';try{localStorage.setItem('nivet.resolution.v1',resolutionPolicy);}catch(_){}resetRenderBudget();renderScale=1;if(inited){ren.setPixelRatio(pixelRatio());pipeline?.resize(innerWidth,innerHeight,pixelRatio());}if($('resolution-policy'))$('resolution-policy').value=resolutionPolicy;}
function setupResolutionUI(){const select=$('resolution-policy');if(!select)return;select.value=resolutionPolicy;select.onchange=()=>setResolutionPolicy(select.value);}
