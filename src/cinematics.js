// Presentation only: never changes physics or network snapshots.
function cinemaMotion(){return RIVAL_PREF.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches}
function cinemaEase(t){t=cl(t,0,1);return t*t*(3-2*t)}
function syncCinema(){
 const motion=cinemaMotion(),body=document.body;
 body.classList.toggle('cinema-motion',motion);body.classList.toggle('cinema-still',!motion);
 if(!motion||st!=='GOAL'||!RIVALS.replay||MP.localPaused)body.classList.remove('cinema-replay');
}
function cinemaMessage(el){
 if(!cinemaMotion()||!el.animate)return;
 for(const animation of el.getAnimations())animation.cancel();
 el.animate([{scale:'1.16',opacity:0},{scale:'1',opacity:1}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'});
}
function positionDriverTag(el,position,camera,project,width,height){
 project.copy(position);project.y+=1.45;project.project(camera);
 if(!Number.isFinite(project.x+project.y+project.z)||project.z<=-1||project.z>=1||Math.abs(project.x)>.92||Math.abs(project.y)>.86)return false;
 const scale=cl(1.08-position.distanceTo(camera.position)*.004,.76,1.04);
 el.style.transform=`translate3d(${((project.x*.5+.5)*width).toFixed(2)}px,${((-project.y*.5+.5)*height).toFixed(2)}px,0) translate(-50%,-100%) scale(${scale.toFixed(3)})`;
 return true;
}
