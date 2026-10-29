const SHOWROOM={yaw:.15,pitch:.12,distance:2.55,drag:false,x:0,y:0,ready:false};
const SHOWROOM_FIELD_Z=2.5;
function resetShowroom(){SHOWROOM.yaw=.15;SHOWROOM.pitch=.12;SHOWROOM.distance=2.55;}
function setupShowroomControls(){
 const region=$('car-inspect');
 region.addEventListener('pointerdown',e=>{if(st!=='MENU'||INTRO.active||!['home','garage'].includes(menuScreen))return;SHOWROOM.drag=true;SHOWROOM.x=e.clientX;SHOWROOM.y=e.clientY;region.setPointerCapture?.(e.pointerId);region.focus();});
 region.addEventListener('pointermove',e=>{if(!SHOWROOM.drag)return;SHOWROOM.yaw+=(e.clientX-SHOWROOM.x)*.009;SHOWROOM.pitch=cl(SHOWROOM.pitch+(e.clientY-SHOWROOM.y)*.003,.08,.65);SHOWROOM.x=e.clientX;SHOWROOM.y=e.clientY;});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])region.addEventListener(event,()=>SHOWROOM.drag=false);
 region.addEventListener('wheel',e=>{if(st!=='MENU'||INTRO.active)return;e.preventDefault();SHOWROOM.distance=cl(SHOWROOM.distance+e.deltaY*.002,2.1,4.6)},{passive:false});
 region.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='ArrowLeft')SHOWROOM.yaw-=.14;if(e.key==='ArrowRight')SHOWROOM.yaw+=.14;if(e.key==='ArrowUp')SHOWROOM.distance=Math.max(2.1,SHOWROOM.distance-.15);if(e.key==='ArrowDown')SHOWROOM.distance=Math.min(4.6,SHOWROOM.distance+.15)}});
 $('preview-car').onclick=()=>{resetShowroom();if(!inited)previewGarage()};
}
// Preserve the car's screen width on portrait displays instead of cropping tyres.
function showroomViewDistance(distance,aspect){return distance*Math.max(1,.95/Math.max(.25,aspect));}
function renderShowcase(dt){
 if(!inited)return;if(OPENING.visuals){OPENING.visuals.group.visible=true;OPENING.visuals.airshow.group.visible=false;}if(RIVALS.visuals)RIVALS.visuals.group.visible=false;previewTime+=dt;const ending=st==='END',title=INTRO.active&&!ending;
 // The same pitch is retained behind every menu. Cars stand at their real wheel baseline.
 garageStage.visible=false;grassM.visible=true;cam.fov=ending?62:title?60:43;cam.updateProjectionMatrix();
 const winner=score[0]>score[1]?0:1,count=cars.filter(c=>c.enabled&&c.team===winner).length,fieldZ=ending||title?0:SHOWROOM_FIELD_Z;let n=0;
 for(let k=0;k<cm.length;k++){const m=cm[k],c=cars[k];m.visible=ending?c.enabled&&c.team===winner:!title&&k===0;paintCar(k,ending?c.color:driverPaint(cfg));if(m.visible){const x=ending?(n++-(count-1)/2)*2:0;m.position.set(x,bodyPhysics(c).height+.016,fieldZ);m.quaternion.setFromAxisAngle(Y3,ending?Math.PI*.4:SHOWROOM.yaw);if(m.userData.f)m.userData.f.visible=false;}}
 bm.visible=title;if(title)bm.position.set(0,BR,-8);
 for(let k=0;k<contactShadows.length;k++){const shadow=contactShadows[k],m=cm[k];shadow.visible=!!m?.visible;if(shadow.visible){shadow.position.set(m.position.x,.018,m.position.z);shadow.material.opacity=.5;shadow.scale.setScalar(1);shadow.rotation.y=ending?Math.PI*.4:SHOWROOM.yaw;}}
 if(cam.view?.enabled)cam.clearViewOffset();
 if(ending){const fit=Math.max(1,1.05/(innerWidth/innerHeight));cam.position.set(1.5*fit,2.4,7*fit);cam.lookAt(0,.5,0)}
 else if(title){cam.position.set(8,.7,13);cam.lookAt(0,1,-16)}
 else{const offset=innerWidth>800?-.12:0;cam.setViewOffset(innerWidth,innerHeight,innerWidth*offset,0,innerWidth,innerHeight);const d=showroomViewDistance(SHOWROOM.distance,innerWidth/innerHeight);cam.position.set(d*.76,.36+d*SHOWROOM.pitch,fieldZ+d*.65);cam.lookAt(0,.38,fieldZ)}
 updateWind(dt,true);pts.count=0;updateBoostPickups(dt,null,false);updateStadiumShadow(true);pipeline.render();
}
