// Match presentation owns camera/mesh poses only. Online kickoff and ball authority stay on the server.
const OPENING={pending:false,active:false,completed:false,elapsed:0,duration:7.2,target:new V3(),visuals:null};
const MATCH_FADE={element:null,active:false,previous:'MENU',out:0,opacity:0};
const KICKOFF_JOLT={age:99,key:''};
const openingPosition=new V3(),openingAim=new V3(),openingDesired=new V3(),openingRotation=new Qn(),openingSpin=new V3(.15,1,.25).normalize();
function openingEligible(){return !window.__TEVIN_SERVER__&&!MP.active&&!sandbox&&cinemaMotion();}
function resetMatchPresentation(arm=false){
 OPENING.pending=arm&&openingEligible();OPENING.active=OPENING.completed=false;OPENING.elapsed=0;KICKOFF_JOLT.age=99;KICKOFF_JOLT.key='';MATCH_FADE.active=false;MATCH_FADE.out=MATCH_FADE.opacity=0;MATCH_FADE.previous='MENU';
 if(MATCH_FADE.element)MATCH_FADE.element.style.opacity=0;if(OPENING.visuals)OPENING.visuals.group.visible=false;document.body.classList.remove('opening-cinematic');if($('opening-caption'))$('opening-caption').hidden=true;
}
function beginOpening(){
 const begin=OPENING.pending&&openingEligible();OPENING.pending=false;OPENING.active=begin;OPENING.elapsed=0;if(!begin)return false;
 OPENING.target.copy(ball.p);cnt=OPENING.duration;document.body.classList.add('opening-cinematic');if($('opening-caption'))$('opening-caption').hidden=false;return true;
}
function finishOpening(){
 if(!OPENING.active)return false;OPENING.active=false;OPENING.completed=true;if(!MP.active&&!window.__TEVIN_SERVER__){ball.p.copy(OPENING.target);ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);ball.v.set(0,0,0);ball.w.set(0,0,0);if(bm)bm.quaternion.identity();}
 if(OPENING.visuals){OPENING.visuals.group.visible=true;OPENING.visuals.drone.visible=false;for(const door of OPENING.visuals.doors)door.position.x=door.userData.sign*1.38;}document.body.classList.remove('opening-cinematic');if($('opening-caption'))$('opening-caption').hidden=true;cameraAnchorReady=false;return true;
}
function openingDeliveryPose(elapsed){
 const t=cl(elapsed,0,OPENING.duration),ease=cinemaEase,high=HH+1.45;let height;
 if(t<1.7)height=high;
 else if(t<4.05){const u=(t-1.7)/2.35;height=BR+(high-BR)*(1-u*u);}
 else if(t<4.85){const u=(t-4.05)/.8;height=BR+1.65*4*u*(1-u);}
 else if(t<5.45){const u=(t-4.85)/.6;height=BR+.5*4*u*(1-u);}
 else if(t<6.7){const u=(t-5.45)/1.25;height=BR+.12*Math.pow(1-u,3)*(1-Math.cos(u*Math.PI*4))*.5;}
 else height=BR;
 const open=ease(t/1.05)*(1-ease((t-2.6)/.9)),approach=ease(t/1.15),depart=ease((t-2.05)/1.7),handoff=ease((t-4.6)/2.3),spin=(t<4.05?t*.8:3.24+(t-4.05)*1.3)*(1-ease((t-5.45)/1.25));
 return{height,open,droneX:-7*(1-approach)+depart*9,droneY:HH+2.85+depart*1.1,droneZ:(1-approach)*-3.5+depart*4.5,grip:1-ease((t-1.42)/.28),handoff,spin,phase:t<1.7?'DRONE APPROACH':t<4.05?'BALL DELIVERY':t<6.7?'CENTERING THE BALL':'READY FOR KICKOFF'};
}
function createOpeningVisuals(){
 const group=new THREE.Group();group.name='First-match aerial ball delivery';const steel=new THREE.MeshStandardMaterial({color:0x24384a,metalness:.38,roughness:.66}),edge=new THREE.MeshStandardMaterial({color:0x718899,roughness:.62,metalness:.25}),dark=new THREE.MeshStandardMaterial({color:0x0b1520,roughness:.84}),light=new THREE.MeshBasicMaterial({color:0x72d9ff,toneMapped:false}),amber=new THREE.MeshBasicMaterial({color:0xffc572,toneMapped:false});
 const box=(parent,x,y,z,w,h,d,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
 const hatch=new THREE.Group();hatch.position.y=HH+.16;group.add(hatch);
 for(const sign of [-1,1]){box(hatch,sign*4.15,0,0,2.7,.35,11,steel);box(hatch,0,0,sign*4.15,5.6,.35,2.7,steel);box(hatch,sign*2.76,-.22,0,.09,.055,5.5,light);box(hatch,0,-.22,sign*2.76,5.5,.055,.09,light);box(hatch,sign*5.55,-.05,0,.12,.52,11.3,edge);box(hatch,0,-.05,sign*5.55,11.3,.52,.12,edge);}
 for(const x of [-4.9,4.9])for(const z of [-4.9,4.9])box(hatch,x,4.9,z,.08,9.8,.08,edge);
 for(const z of [-4.9,4.9]){box(hatch,0,9.85,z,99,.32,.38,steel);box(hatch,0,9.65,z,98,.06,.07,light);}
 const doors=[];for(const sign of [-1,1]){const door=new THREE.Group();door.userData.sign=sign;box(door,0,0,0,2.68,.19,5.35,edge);box(door,0,-.11,0,2.32,.035,4.96,dark);for(const z of [-2.15,2.15])box(door,0,-.14,z,2.1,.04,.09,amber);hatch.add(door);doors.push(door);}
 const drone=new THREE.Group();group.add(drone);box(drone,0,0,0,1.35,.32,1.05,steel);box(drone,0,.2,0,.78,.12,.6,edge);box(drone,0,-.2,.55,.55,.12,.06,light);
 const rotors=[],grips=[];
 for(const x of [-1.2,1.2])for(const z of [-1.05,1.05]){const arm=box(drone,x*.5,0,z*.5,1.7,.11,.12,edge);arm.rotation.y=-Math.atan2(z,x);const rotor=new THREE.Mesh(new THREE.TorusGeometry(.48,.042,5,24).rotateX(-Math.PI/2),steel);rotor.position.set(x,.1,z);drone.add(rotor);const spinning=new THREE.Group();spinning.position.set(x,.13,z);drone.add(spinning);const disc=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.012,20),new THREE.MeshBasicMaterial({color:0x638392,transparent:true,opacity:.28}));spinning.add(disc);box(spinning,0,0,0,.75,.022,.055,dark);rotors.push(spinning);box(drone,x,-.04,z,.12,.06,.12,light);}
 for(const sign of [-1,1]){const grip=new THREE.Group();grip.userData.sign=sign;box(grip,0,-.48,0,.08,.72,.11,edge);box(grip,-sign*.15,-.83,0,.36,.085,.18,amber);drone.add(grip);grips.push(grip);}
 for(const parent of [...doors,...grips,hatch,drone])batchMeshes(parent);group.visible=false;group.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});return{group,hatch,doors,drone,rotors,grips};
}
function updateOpeningVisuals(){
 const v=OPENING.visuals;if(!OPENING.active||st!=='COUNT'){if(v)v.group.visible=OPENING.completed&&!MP.active&&!sandbox&&st!=='MENU'&&st!=='END';return null;}OPENING.elapsed=cl(OPENING.duration-cnt,0,OPENING.duration);const pose=openingDeliveryPose(OPENING.elapsed);
 if(v){v.group.visible=true;v.group.position.set(OPENING.target.x,0,OPENING.target.z);for(const door of v.doors)door.position.x=door.userData.sign*(1.38+pose.open*2.85);v.drone.position.set(pose.droneX,pose.droneY,pose.droneZ);v.drone.rotation.z=Math.sin(OPENING.elapsed*2.1)*.025;for(const rotor of v.rotors)rotor.rotation.y=OPENING.elapsed*45;for(const grip of v.grips)grip.position.x=grip.userData.sign*(.8+(1-pose.grip)*.48);v.drone.visible=OPENING.elapsed<3.9;}
 bm.position.copy(OPENING.target);if(OPENING.elapsed<1.7){bm.position.x+=pose.droneX;bm.position.z+=pose.droneZ;}bm.position.y=pose.height;bm.quaternion.setFromAxisAngle(openingSpin,pose.spin);
 const label=$('opening-stage');if(label&&label.textContent!==pose.phase)label.textContent=pose.phase;if($('opening-progress'))$('opening-progress').style.setProperty('--progress',OPENING.elapsed/OPENING.duration);return pose;
}
function positionOpeningCamera(){
 if(!OPENING.active||st!=='COUNT')return;const p=openingDeliveryPose(OPENING.elapsed),target=OPENING.target;
 openingDesired.set(target.x+9.5,7.8,target.z-17.5).lerp(cam.position,p.handoff);openingAim.copy(bm.position);openingAim.y+=.25;openingAim.lerp(lookPos,p.handoff);constrainArenaCamera(target,openingDesired,cam.position);cam.lookAt(openingAim);cam.fov=58+(cam.fov-58)*p.handoff;cam.updateProjectionMatrix();
}
function goalFieldCameraPose(team,age,out,target){
 const attack=team===0?1:-1,u=cinemaEase(age/.65);out.set(10+u*1.4,5.3+u*.5,attack*(HZ-12-u*1.4));target.set(0,2.1,attack*(HZ-.5));
}
function startKickoffJolt(){if(window.__TEVIN_SERVER__)return;const key=MP.round+':'+score.join(':');if(key===KICKOFF_JOLT.key)return;KICKOFF_JOLT.key=key;KICKOFF_JOLT.age=0;}
function kickoffJoltOffset(age,out){const power=age>=0&&age<.42?Math.pow(1-age/.42,2):0;return out.set(Math.sin(age*83)*.033*power,Math.sin(age*107)*.022*power,0);}
function applyMatchCamera(dt){
 positionOpeningCamera();if(st==='GOAL'&&(!RIVALS.replay||RIVALS.replay.elapsed<0)){goalFieldCameraPose(RIVALS.goal?.team||0,1,openingDesired,openingAim);cam.position.copy(openingDesired);cam.lookAt(openingAim);bm.visible=false;cam.fov=62;cam.updateProjectionMatrix();}
 if(st==='PLAY'&&cinemaMotion()){KICKOFF_JOLT.age+=dt;cam.position.add(kickoffJoltOffset(KICKOFF_JOLT.age,openingPosition));}else if(st!=='COUNT')KICKOFF_JOLT.age=99;
}
function goalFadeSample(phase,remaining,previous,outAge){
 if(phase==='GOAL')return{opacity:cinemaEase((.45-remaining)/.45),out:0,active:true};
 if(previous==='GOAL'&&(phase==='COUNT'||phase==='END'))return{opacity:1,out:.45,active:true};
 if(outAge>0){const out=Math.max(0,outAge);return{opacity:cinemaEase(out/.45),out,active:true};}return{opacity:0,out:0,active:false};
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
 const caption=document.createElement('div');caption.id='opening-caption';caption.hidden=true;caption.innerHTML='<small>TEVIN LEAGUE / MATCH OPENING</small><strong id="opening-stage">DRONE APPROACH</strong><span id="opening-progress" aria-hidden="true"></span>';document.body.appendChild(caption);
}
