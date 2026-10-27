// Match presentation owns camera/mesh poses only. Online kickoff and ball authority stay on the server.
const OPENING={pending:false,active:false,completed:false,elapsed:0,duration:5.5,impact:2.5,roofY:30.5,target:new V3(),visuals:null};
const MATCH_FADE={element:null,active:false,previous:'MENU',out:0,opacity:0};
const KICKOFF_JOLT={age:99,key:''};
const openingPosition=new V3(),openingAim=new V3(),openingDesired=new V3(),openingSpin=new V3(.15,1,.25).normalize();
function openingEligible(){return !window.__TEVIN_SERVER__&&!MP.active&&!sandbox&&cinemaMotion();}
function resetMatchPresentation(arm=false){
 resetBombDrop(arm);clearFlyby();
 OPENING.pending=arm&&openingEligible();OPENING.active=OPENING.completed=false;OPENING.elapsed=0;KICKOFF_JOLT.age=99;KICKOFF_JOLT.key='';MATCH_FADE.active=false;MATCH_FADE.out=MATCH_FADE.opacity=0;MATCH_FADE.previous='MENU';
 if(MATCH_FADE.element)MATCH_FADE.element.style.opacity=0;if(OPENING.visuals){OPENING.visuals.drone.visible=OPENING.visuals.jet.visible=false;for(const d of OPENING.visuals.doors)d.position.x=d.userData.sign*1.61;}document.body.classList.remove('opening-cinematic');if($('opening-caption'))$('opening-caption').hidden=true;
}
function beginOpening(){
 const begin=OPENING.pending&&openingEligible();OPENING.pending=false;OPENING.active=begin;OPENING.elapsed=0;armBombDrop();if(!begin)return false;
 OPENING.target.copy(ball.p);cnt=OPENING.duration;document.body.classList.add('opening-cinematic');if($('opening-caption'))$('opening-caption').hidden=false;return true;
}
function finishOpening(){
 if(!OPENING.active)return false;OPENING.active=false;OPENING.completed=true;if(!MP.active&&!window.__TEVIN_SERVER__){ball.p.copy(OPENING.target);ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);ball.v.set(0,0,0);ball.w.set(0,0,0);if(bm)bm.quaternion.identity();}
 if(OPENING.visuals){OPENING.visuals.drone.visible=OPENING.visuals.jet.visible=false;for(const door of OPENING.visuals.doors)door.position.x=door.userData.sign*1.61;}clearFlyby();document.body.classList.remove('opening-cinematic');if($('opening-caption'))$('opening-caption').hidden=true;cameraAnchorReady=false;return true;
}
function openingDeliveryPose(elapsed){
 const t=cl(elapsed,0,OPENING.duration),ease=cinemaEase,high=OPENING.roofY+4,approach=ease(t/.65),depart=ease((t-.78)/1.25),droneY=high+1.45+(1-approach)*16.55+depart*18;let height;
 if(t<.75)height=high+(1-approach)*16.55;
 else if(t<2.5){const u=(t-.75)/1.75;height=BR+(high-BR)*(1-u*u);}
 else if(t<3.1){const u=(t-2.5)/.6;height=BR+.7*4*u*(1-u);}
 else if(t<3.55){const u=(t-3.1)/.45;height=BR+.17*4*u*(1-u);}
 else if(t<4.2){const u=(t-3.55)/.65;height=BR+.05*Math.pow(1-u,3)*(1-Math.cos(u*Math.PI*4))*.5;}
 else height=BR;
 const open=ease(t/.55)*(1-ease((t-1.6)/.55)),handoff=ease((t-2.7)/1.9),spin=(t<2.5?t:2.5+(t-2.5)*1.1)*(1-ease((t-3.55)/.65));
 return{height,open,handoff,spin,droneY,droneX:depart*10,droneZ:depart*12,grip:1-ease((t-.62)/.13),phase:t<.75?'SPECIAL DELIVERY':t<2.5?'BALL RELEASE':t<4.2?'CENTERING THE BALL':'READY FOR KICKOFF'};
}
function createOpeningVisuals(){
 const group=new THREE.Group();group.name='Fixed stadium roof and aerial delivery';const steel=new THREE.MeshStandardMaterial({color:0x263c4c,metalness:.35,roughness:.64}),edge=new THREE.MeshStandardMaterial({color:0x7f98a6,roughness:.55,metalness:.25}),light=new THREE.MeshBasicMaterial({color:0x79c5dc,toneMapped:false}),glass=new THREE.MeshStandardMaterial({color:0x91c4d3,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide,roughness:.25,metalness:.05,envMapIntensity:.45}),etch=new THREE.MeshBasicMaterial({color:0xd8f1f5,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});
 const box=(parent,x,y,z,w,h,d,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
 const roof=new THREE.Group();roof.position.y=OPENING.roofY;roof.name='Roof at the grandstand roofline';group.add(roof);const shape=new THREE.Shape();shape.moveTo(-47,-64);shape.lineTo(47,-64);shape.lineTo(47,64);shape.lineTo(-47,64);shape.closePath();
 for(const z of [-24,0,24]){const hole=new THREE.Path();hole.moveTo(-3.22,z-3.22);hole.lineTo(-3.22,z+3.22);hole.lineTo(3.22,z+3.22);hole.lineTo(3.22,z-3.22);hole.closePath();shape.holes.push(hole);}
 const roofGlass=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0x92b6ca,transparent:true,opacity:.055,depthWrite:false,side:THREE.DoubleSide}));roofGlass.rotation.x=-Math.PI/2;roof.add(roofGlass);
 for(const z of [-64,-27.24,-20.76,-3.24,3.24,20.76,27.24,64])box(roof,0,.08,z,94,.22,.16,steel);for(const x of [-47,-23,-3.24,3.24,23,47])box(roof,x,.08,0,.16,.22,128,steel);
 const doors=[],panes=[],hatches=[];
 for(const centerZ of [-24,0,24]){const hatch=new THREE.Group();hatch.position.z=centerZ;hatch.name='Fixed sliding roof hatch '+centerZ;roof.add(hatch);hatches.push(hatch);
  for(const sign of [-1,1]){box(hatch,0,0,sign*3.25,13.3,.22,.18,edge);box(hatch,0,-.13,sign*3.16,13.1,.025,.04,light);box(hatch,sign*6.6,0,0,.1,.2,6.7,steel);
   const door=new THREE.Group();door.name=(sign<0?'Left':'Right')+' sliding glass leaf';Object.assign(door.userData,{sign,centerZ});door.position.x=sign*1.61;
   const pane=box(door,0,0,0,3.12,.045,6.3,glass);pane.name='Tinted roof door';pane.renderOrder=2;panes.push(pane);
   for(const x of [-1.59,1.59]){box(door,x,0,0,.075,.12,6.4,edge);box(door,x,-.065,0,.025,.012,6.24,light);}for(const z of [-3.18,3.18])box(door,0,0,z,3.24,.12,.075,edge);
   for(const z of [-2.6,2.6])box(door,0,-.028,z,2.8,.004,.04,etch);box(door,-sign*1.2,-.028,0,.025,.004,4.8,etch);batchMeshes(door);hatch.add(door);doors.push(door);
  }batchMeshes(hatch);
 }batchMeshes(roof);
 const drone=new THREE.Group();drone.name='Delivery drone above the roof';group.add(drone);box(drone,0,0,0,1.6,.3,1.2,steel);box(drone,0,.2,0,.9,.12,.65,edge);box(drone,0,-.2,.62,.7,.08,.06,light);const rotors=[],grips=[];
 for(const x of [-1.5,1.5])for(const z of [-1.3,1.3]){const arm=box(drone,x*.5,0,z*.5,2,.1,.1,edge);arm.rotation.y=-Math.atan2(z,x);const ring=new THREE.Mesh(new THREE.TorusGeometry(.6,.04,5,24).rotateX(-Math.PI/2),steel);ring.position.set(x,.1,z);drone.add(ring);const rotor=new THREE.Group();rotor.position.set(x,.13,z);box(rotor,0,0,0,1.04,.02,.05,edge);drone.add(rotor);rotors.push(rotor);}
 for(const sign of [-1,1]){const grip=new THREE.Group();grip.userData.sign=sign;box(grip,0,-.62,0,.08,1,.13,edge);box(grip,-sign*.18,-1.13,0,.42,.08,.24,steel);drone.add(grip);grips.push(grip);}
 batchMeshes(drone);const jet=createJetVisual();group.add(jet);drone.visible=jet.visible=false;group.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});return{group,roof,hatches,doors,panes,drone,rotors,grips,jet};
}
function updateOpeningVisuals(){
 const v=OPENING.visuals;if(!OPENING.active||st!=='COUNT'){if(v){v.group.visible=true;v.drone.visible=v.jet.visible=false;}return null;}OPENING.elapsed=cl(OPENING.duration-cnt,0,OPENING.duration);const pose=openingDeliveryPose(OPENING.elapsed);
 if(v){const activeZ=Math.round(OPENING.target.z/24)*24;for(const door of v.doors)door.position.x=door.userData.sign*(1.61+(door.userData.centerZ===activeZ?pose.open*3.45:0));v.drone.visible=OPENING.elapsed<2.1;v.drone.position.set(pose.droneX,pose.droneY,OPENING.target.z+pose.droneZ);for(const rotor of v.rotors)rotor.rotation.y=OPENING.elapsed*65;for(const grip of v.grips)grip.position.x=grip.userData.sign*(.94+(1-pose.grip)*.6);updateJetFlyby(v,OPENING.elapsed);}
 bm.position.copy(OPENING.target);bm.position.y=pose.height;bm.quaternion.setFromAxisAngle(openingSpin,pose.spin);
 const label=$('opening-stage');if(label&&label.textContent!==pose.phase)label.textContent=pose.phase;if($('opening-progress'))$('opening-progress').style.setProperty('--progress',OPENING.elapsed/OPENING.duration);return pose;
}
function positionOpeningCamera(){
 if(!OPENING.active||st!=='COUNT')return;const p=openingDeliveryPose(OPENING.elapsed),target=OPENING.target;
 openingDesired.set(target.x+12,11,target.z-20).lerp(cam.position,p.handoff);openingAim.copy(bm.position);openingAim.y+=.25;openingAim.lerp(lookPos,p.handoff);constrainArenaCamera(target,openingDesired,cam.position);cam.lookAt(openingAim);const fly=jetFlybyPose(OPENING.elapsed,cinemaMotion());cam.position.x+=fly.shakeX;cam.position.y+=fly.shakeY;cam.fov=62+(cam.fov-62)*p.handoff;cam.updateProjectionMatrix();
}
function goalFieldCameraPose(team,age,out,target){
 const attack=team===0?1:-1,u=cinemaEase(age/.65);out.set(10+u*1.4,5.3+u*.5,attack*(HZ-12-u*1.4));target.set(0,2.1,attack*(HZ-.5));
}
function kickoffLabel(count){return count>3?'READY':Math.max(1,Math.ceil(count));}
function startKickoffJolt(){if(window.__TEVIN_SERVER__)return;const key=MP.round+':'+score.join(':');if(key===KICKOFF_JOLT.key)return;KICKOFF_JOLT.key=key;KICKOFF_JOLT.age=0;}
function kickoffJoltOffset(age,out){const power=age>=0&&age<.42?Math.pow(1-age/.42,2):0;return out.set(Math.sin(age*83)*.033*power,Math.sin(age*107)*.022*power,0);}
function applyMatchCamera(dt){
 positionOpeningCamera();if(st==='GOAL'&&(!RIVALS.replay||RIVALS.replay.elapsed<0)){goalFieldCameraPose(RIVALS.goal?.team||0,1,openingDesired,openingAim);cam.position.copy(openingDesired);cam.lookAt(openingAim);bm.visible=false;cam.fov=62;cam.updateProjectionMatrix();}
 if(st==='PLAY'&&cinemaMotion()){KICKOFF_JOLT.age+=dt;cam.position.add(kickoffJoltOffset(KICKOFF_JOLT.age,openingPosition));}else if(st!=='COUNT')KICKOFF_JOLT.age=99;
}
function goalFadeSample(phase,remaining,previous,outAge){
 if(phase==='GOAL')return{opacity:cinemaEase((.4-remaining)/.4),out:0,active:true};
 if(previous==='GOAL'&&(phase==='COUNT'||phase==='END'))return{opacity:1,out:.5,active:true};
 if(outAge>0){const out=Math.max(0,outAge);return{opacity:cinemaEase(out/.4),out,active:true};}return{opacity:0,out:0,active:false};
}
function updateGoalTransition(dt){
 if(window.__TEVIN_SERVER__||st==='PAUSE')return;const f=MATCH_FADE,result=goalFadeSample(st,gt,f.previous,Math.max(0,f.out-dt));Object.assign(f,result);f.previous=st;
 if(!f.element&&result.opacity>0){const el=document.createElement('div');el.id='match-dissolve';el.setAttribute('aria-hidden','true');document.body.appendChild(el);f.element=el;}if(f.element)f.element.style.opacity=result.opacity.toFixed(4);
}
function renderQuickChat(){
 const panel=$('quick-chat'),log=$('chat-log');if(!panel||!log)return;const color=teamHex(localPlayer().team);panel.style.setProperty('--chat-color',color);log.style.setProperty('--chat-color',color);
 const ready=RIVALS.time-RIVALS.chatAt>=1.2;for(let i=0;i<4;i++)if($('chat-'+i).disabled===ready)$('chat-'+i).disabled=!ready;const status=$('chat-ready');if(status)status.textContent=ready?'READY':'SENT';
 const signature=RIVALS.messages.map(m=>m.name+'\t'+m.text+'\t'+m.until).join('\n');if(log.dataset.messages===signature)return;log.dataset.messages=signature;log.replaceChildren();
 for(const m of RIVALS.messages){const row=document.createElement('div'),name=document.createElement('strong'),text=document.createElement('span'),tag=document.createElement('small');row.className='team-chat-message';row.dataset.own=String(m.name==='YOU');tag.textContent='TEAM';name.textContent=m.name;text.textContent=m.text;row.append(tag,name,text);log.appendChild(row);}
}
function setupMatchPresentationUI(){
 const summary=$('quick-chat').querySelector('summary');summary.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/></svg><span>QUICK CHAT<small id="chat-ready">READY</small></span><kbd>1–4</kbd>';
 const descriptions=['Claim the next touch','Cover your goal','Ask your team for space','Celebrate a teammate'];for(let i=0;i<4;i++){const button=$('chat-'+i);button.replaceChildren();const key=document.createElement('kbd'),label=document.createElement('span'),help=document.createElement('small');key.textContent=String(i+1);label.textContent=QUICK_CHAT[i];help.textContent=descriptions[i];button.append(key,label,help);}
 const caption=document.createElement('div');caption.id='opening-caption';caption.hidden=true;caption.innerHTML='<small>TEVIN LEAGUE / MATCH OPENING</small><strong id="opening-stage">SKYLIGHT OPENING</strong><span id="opening-progress" aria-hidden="true"></span>';document.body.appendChild(caption);
}
