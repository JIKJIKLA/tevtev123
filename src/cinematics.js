// Presentation only: never changes physics or network snapshots.
function cinemaMotion(){return RIVAL_PREF.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches}
function cinemaEase(t){t=cl(t,0,1);return t*t*(3-2*t)}
function syncCinema(){
 const motion=cinemaMotion(),body=document.body;
 if(!motion||st==='PAUSE'||!OPENING.active)body.classList.remove('jet-impact');
 body.classList.toggle('cinema-motion',motion);body.classList.toggle('cinema-still',!motion);
 if(!motion||st!=='GOAL'||!RIVALS.replay||MP.localPaused)body.classList.remove('cinema-replay');
}
function cinemaMessage(el){
 if(!cinemaMotion()||!el.animate)return;
 for(const animation of el.getAnimations())animation.cancel();
 el.animate([{scale:'1.12',translate:'0 0',opacity:0},{scale:'1.02',translate:'-2px 0',opacity:1,offset:.45},{scale:'1',translate:'2px 0',offset:.65},{scale:'1',translate:'-1px 0',offset:.8},{scale:'1',translate:'0 0'}],{duration:300,easing:'ease-out'});
}
function positionDriverTag(el,position,camera,project,width,height){
 project.copy(position);project.y+=1.15;project.project(camera);
 if(!Number.isFinite(project.x+project.y+project.z)||project.z<=-1||project.z>=1||Math.abs(project.x)>.92||Math.abs(project.y)>.86)return false;
 const scale=cl(1.08-position.distanceTo(camera.position)*.004,.76,1.04);
 el.style.transform=`translate3d(${((project.x*.5+.5)*width).toFixed(2)}px,${((-project.y*.5+.5)*height).toFixed(2)}px,0) translate(-50%,-100%) scale(${scale.toFixed(3)})`;
 return true;
}

function replayPlaybackTime(r){return replayDirectorState(r).time;}
