// Camera-only geometry queries. The solver and arena dimensions are never changed.
const VIEW={clipped:false,obscured:false,hold:0,wallMix:0,wallSide:1};
const viewAnchor=new V3(),viewEnd=new V3(),viewProbe=new V3(),viewOrigin=new V3(),viewRay=new V3(),viewInverse=new Qn();
function cameraInterior(point,radius=.42){
 for(let i=0;i<12;i++){surf(point);if(SS>=radius-1e-5)return;point.addScaledVector(SN,radius-SS+.002);}
}
function constrainArenaCamera(anchor,desired,out){
 viewAnchor.copy(anchor);cameraInterior(viewAnchor);viewEnd.copy(desired);cameraInterior(viewEnd);
 let clipped=viewEnd.distanceToSquared(desired)>.0025,previous=0;
 const steps=Math.min(100,Math.max(20,Math.ceil(viewAnchor.distanceTo(viewEnd)/.16)));
 for(let i=1;i<=steps;i++){
  const t=i/steps;viewProbe.lerpVectors(viewAnchor,viewEnd,t);surf(viewProbe);
  if(SS<.415){let lo=previous,hi=t;for(let j=0;j<8;j++){const mid=(lo+hi)/2;viewProbe.lerpVectors(viewAnchor,viewEnd,mid);surf(viewProbe);if(SS>=.42)lo=mid;else hi=mid;}viewEnd.lerpVectors(viewAnchor,viewEnd,lo);clipped=true;break;}
  previous=t;
 }
 out.copy(viewEnd);cameraInterior(out);return clipped;
}
function carBlocksBall(cameraPosition,ballPosition,car,mesh){
 if(cameraPosition.distanceToSquared(mesh.position)>100)return false;
 const body=bodyPhysics(car);viewInverse.copy(mesh.quaternion).invert();viewOrigin.copy(cameraPosition).sub(mesh.position).applyQuaternion(viewInverse);viewRay.copy(ballPosition).sub(cameraPosition).applyQuaternion(viewInverse);
 let enter=0,leave=1;
 for(let axis=0;axis<3;axis++){
  const o=viewOrigin.getComponent(axis)-body.center[axis],d=viewRay.getComponent(axis),half=body.half[axis]+(axis===1?.16:.15);
  if(Math.abs(d)<1e-7){if(Math.abs(o)>half)return false;continue;}
  let a=(-half-o)/d,b=(half-o)/d;if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);leave=Math.min(leave,b);if(enter>leave)return false;
 }
 return leave>.015&&enter<.985;
}
function prepareCameraFade(mesh){
 if(mesh.userData.cameraFade)return;const clones=new Map(),materials=[];
 const copy=original=>{if(clones.has(original))return clones.get(original);const material=original.clone();material.userData.cameraBaseOpaque=!original.transparent;material.transparent=true;materials.push({material,opacity:original.opacity??1,depthWrite:original.depthWrite});clones.set(original,material);return material;};
 mesh.traverse(o=>{if(o.material)o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);});
 mesh.userData.paintMaterials=(mesh.userData.paintMaterials||[]).map(m=>clones.get(m)||m);mesh.userData.cameraFade={materials,opacity:1};
}
function setCameraCarOpacity(mesh,opacity){
 prepareCameraFade(mesh);const state=mesh.userData.cameraFade,value=cl(Number.isFinite(opacity)?opacity:1,.33,1);state.opacity=value;
 for(const entry of state.materials){entry.material.opacity=entry.opacity*value;entry.material.depthWrite=value>.995&&entry.depthWrite;}
}
function resetViewFade(){VIEW.clipped=VIEW.obscured=false;VIEW.hold=VIEW.wallMix=0;for(const m of cm)if(m.userData.cameraFade)setCameraCarOpacity(m,1);document.body.classList.remove('camera-car-faded');}
function updateViewFade(dt,clipped,car,mesh){
 const blocked=ballCam&&carBlocksBall(cam.position,bm.position,car,mesh);VIEW.clipped=clipped;VIEW.obscured=blocked;
 if(clipped||blocked)VIEW.hold=.16;else VIEW.hold=Math.max(0,VIEW.hold-dt);
 const current=mesh.userData.cameraFade?.opacity??1,target=VIEW.hold>0?.33:1,next=current+(target-current)*(1-Math.exp(-dt*14));setCameraCarOpacity(mesh,Math.abs(next-target)<.006?target:next);
 document.body.classList.toggle('camera-car-faded',target<1);
}
const wallTangent=new V3(),wallDesired=new V3(),wallCarRay=new V3(),wallBallRay=new V3(),wallLook=new V3();
function wallCameraPose(position,normal,side,distance,out){
 wallTangent.crossVectors(Y3,normal);wallTangent.y=0;if(wallTangent.lengthSq()<.01)return out.copy(position).add(new V3(0,1,-4));wallTangent.normalize();
 return out.copy(position).addScaledVector(normal,.85).addScaledVector(wallTangent,side*cl(distance*2.6,6.5,9.5)).addScaledVector(Y3,1.05);
}
function wallBallTarget(cameraPosition,carPosition,ballPosition,out){
 wallCarRay.copy(carPosition).addScaledVector(Y3,.25).sub(cameraPosition).normalize();wallBallRay.copy(ballPosition).sub(cameraPosition).normalize();
 return out.copy(wallCarRay).add(wallBallRay).normalize().multiplyScalar(12).add(cameraPosition);
}
function positionWallCamera(car,position,desired,dt){
 const target=car.ground?cl((.8-Math.abs(car.n.y))/.6,0,1):0;VIEW.wallMix+=(target-VIEW.wallMix)*(1-Math.exp(-dt*9));if(VIEW.wallMix<.005)return;
 if(target>.01){wallTangent.crossVectors(Y3,car.n).normalize();wallCarRay.copy(cpos).sub(position);const along=wallCarRay.dot(wallTangent);if(Math.abs(along)>1.2)VIEW.wallSide=Math.sign(along);}
 wallCameraPose(position,car.n,VIEW.wallSide,cameraSettings.distance,wallDesired);desired.lerp(wallDesired,VIEW.wallMix);
}
function planGoalReplay(replay){
 const frames=replay.frames,first=frames[0].t,end=frames.at(-1).t,id=replay.focusCar??replay.scorer;
 let hit=NaN,best=Infinity,closest=first;
 for(let i=1;i<frames.length;i++){
  const a=frames[i-1],b=frames[i],p=b.cars[id]?.p;if(!p)continue;
  if(b.touches&&a.touches&&b.touches[id]>a.touches[id]||b.lastPlayer===id&&a.lastPlayer!==id)hit=b.t;
  const distance=Math.hypot(p[0]-b.ball[0],p[1]-b.ball[1],p[2]-b.ball[2]);if(distance<best){best=distance;closest=b.t;}
 }
 if(!Number.isFinite(hit))hit=best<2.8?closest:Math.max(first,end-1.1);hit=cl(hit,first,end-.025);
 const start=Math.max(first,hit-1.65),slowStart=Math.max(start,hit-.14),slowEnd=Math.min(end,hit+Math.min(.22,(end-hit)*.28));
 // Every flight reaches its goal at the end of the shot; short shots no longer leave a camera hold inside the net.
 const releaseDuration=PRESENTATION_TIMING.replayShot-4.35;
 replay.plan={start,hit,end,slowStart,slowEnd,releaseDuration};return replay.plan;
}
function captureReplayFrame(snapshot,time=RIVALS.time){
 const list=snapshot?snapshot.cars:cars;
 return{t:time,cars:snapshot?list.map(c=>({p:[c.x,c.y,c.z],q:c.q.slice()})):list.map(c=>({p:c.p.toArray(),q:c.q.toArray()})),ball:snapshot?snapshot.ball.p.slice():ball.p.toArray(),pads:snapshot?.pads?snapshot.pads.slice():PADS.map(p=>p.t),touches:list.map(c=>c.touches||0),lastPlayer:snapshot?snapshot.ball.lastPlayer:ball.lastPlayer};
}
function replayDirectorState(replay){
 const p=replay.plan||planGoalReplay(replay),t=cl(replay.elapsed,0,PRESENTATION_TIMING.replayShot);let time;
 if(t<.65)time=p.start+(p.slowStart-p.start)*.12*cinemaEase(t/.65);
 else if(t<2.35)time=p.start+(p.slowStart-p.start)*(.12+.88*((t-.65)/1.7));
 else if(t<4.35)time=p.slowStart+(p.slowEnd-p.slowStart)*((t-2.35)/2);
 else{const u=cl((t-4.35)/p.releaseDuration,0,1);time=p.slowEnd+(p.end-p.slowEnd)*(u+u*u)/2;}
 const follow=cinemaEase(t/.9),release=cinemaEase((t-4.35)/1.55),zoom=cinemaEase((t-1.8)/.95)*(1-release),ballFocus=cinemaEase((time-p.hit)/Math.max(.09,(p.slowEnd-p.hit)));
 return{time:cl(time,p.start,p.end),follow,release,zoom,ballFocus,slow:t>=2.35&&t<4.35,exploding:replay.elapsed>=PRESENTATION_TIMING.replayShot,impactAge:Math.max(0,replay.elapsed-PRESENTATION_TIMING.replayShot),fov:80-follow*16-zoom*15+release*8};
}
const replayCenter=new V3(0,13,0),replayTarget=new V3(),replayDesired=new V3(),replayOffset=new V3(),replayPose=new V3(),replayRotation=new Qn();
function positionReplayCamera(replay){
 const state=replayDirectorState(replay),car=cm[replay.focusCar??replay.scorer]?.position||bm.position,attack=replay.team===0?1:-1,side=car.x>0?-1:1;
 replayTarget.copy(car).lerp(bm.position,state.ballFocus);replayTarget.y+=.55;
 replayDesired.copy(replayTarget).add(replayOffset.set(side*(8-state.zoom*2+state.release*2),4.5-state.zoom+state.release*2,-attack*(11-state.zoom*2+state.release*3))).lerp(replayCenter,1-state.follow);
 replayDesired.z=cl(replayDesired.z,-HZ+3.5,HZ-3.5);replayTarget.z=cl(replayTarget.z,-HZ+.5,HZ-.5);
 if(state.exploding)goalFieldCameraPose(replay.team,state.impactAge,replayDesired,replayTarget);
 constrainArenaCamera(replayTarget,replayDesired,cam.position);cam.lookAt(replayTarget);cam.fov=state.exploding?62:cinemaMotion()?state.fov:70;cam.updateProjectionMatrix();return state;
}
const SCENE_CUT={element:null,animation:null};
function presentSceneCut(kind){
 if(window.__TEVIN_SERVER__||!cinemaMotion()||MATCH_FADE.active&&(kind==='live'||kind==='kickoff'))return;
 if(!SCENE_CUT.element){const el=document.createElement('div');el.id='scene-dissolve';el.setAttribute('aria-hidden','true');document.body.appendChild(el);SCENE_CUT.element=el;}
 SCENE_CUT.animation?.cancel();if(SCENE_CUT.element.animate)SCENE_CUT.animation=SCENE_CUT.element.animate([{opacity:0},{opacity:kind==='replay'?.86:.58,offset:.25},{opacity:0}],{duration:kind==='replay'?620:440,easing:'ease-in-out'});
}
