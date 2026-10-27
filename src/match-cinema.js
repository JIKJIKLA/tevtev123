// Match presentation owns camera/mesh poses only. Online kickoff and ball authority stay on the server.
const OPENING={pending:false,active:false,completed:false,elapsed:0,duration:6.4,impact:3.45,target:new V3(),visuals:null};
const MATCH_FADE={element:null,active:false,previous:'MENU',out:0,opacity:0};
const KICKOFF_JOLT={age:99,key:''};
const openingPosition=new V3(),openingAim=new V3(),openingDesired=new V3(),openingSpin=new V3(.15,1,.25).normalize();
function openingEligible(){return !window.__TEVIN_SERVER__&&!MP.active&&!sandbox&&cinemaMotion();}
function resetMatchPresentation(arm=false){
 resetBombDrop(arm);
 OPENING.pending=arm&&openingEligible();OPENING.active=OPENING.completed=false;OPENING.elapsed=0;KICKOFF_JOLT.age=99;KICKOFF_JOLT.key='';MATCH_FADE.active=false;MATCH_FADE.out=MATCH_FADE.opacity=0;MATCH_FADE.previous='MENU';
 if(MATCH_FADE.element)MATCH_FADE.element.style.opacity=0;if(OPENING.visuals)OPENING.visuals.group.visible=false;document.body.classList.remove('opening-cinematic');if($('opening-caption'))$('opening-caption').hidden=true;
}
function beginOpening(){
 const begin=OPENING.pending&&openingEligible();OPENING.pending=false;OPENING.active=begin;OPENING.elapsed=0;armBombDrop();if(!begin)return false;
 OPENING.target.copy(ball.p);cnt=OPENING.duration;document.body.classList.add('opening-cinematic');if($('opening-caption'))$('opening-caption').hidden=false;return true;
}
function finishOpening(){
 if(!OPENING.active)return false;OPENING.active=false;OPENING.completed=true;if(!MP.active&&!window.__TEVIN_SERVER__){ball.p.copy(OPENING.target);ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);ball.v.set(0,0,0);ball.w.set(0,0,0);if(bm)bm.quaternion.identity();}
 if(OPENING.visuals){OPENING.visuals.group.visible=true;for(const door of OPENING.visuals.doors)door.position.x=door.userData.sign*1.49;}document.body.classList.remove('opening-cinematic');if($('opening-caption'))$('opening-caption').hidden=true;cameraAnchorReady=false;return true;
}
function openingDeliveryPose(elapsed){
 const t=cl(elapsed,0,OPENING.duration),ease=cinemaEase,high=HH+1.45;let height;
 if(t<1.15)height=high;
 else if(t<3.45){const u=(t-1.15)/2.3;height=BR+(high-BR)*(1-u*u);}
 else if(t<4.2){const u=(t-3.45)/.75;height=BR+1.35*4*u*(1-u);}
 else if(t<4.75){const u=(t-4.2)/.55;height=BR+.34*4*u*(1-u);}
 else if(t<5.8){const u=(t-4.75)/1.05;height=BR+.08*Math.pow(1-u,3)*(1-Math.cos(u*Math.PI*4))*.5;}
 else height=BR;
 const open=ease(t/.95)*(1-ease((t-2.2)/1)),handoff=ease((t-3.9)/2.2),spin=(t<3.45?t*.8:2.76+(t-3.45)*1.1)*(1-ease((t-4.75)/1.05));
 return{height,open,handoff,spin,phase:t<1.15?'SKYLIGHT OPENING':t<3.45?'BALL RELEASE':t<5.8?'CENTERING THE BALL':'READY FOR KICKOFF'};
}
function createOpeningVisuals(){
 const group=new THREE.Group();group.name='Sliding glass skylight';const steel=new THREE.MeshStandardMaterial({color:0x263c4c,metalness:.35,roughness:.64}),edge=new THREE.MeshStandardMaterial({color:0x7f98a6,roughness:.55,metalness:.25}),light=new THREE.MeshBasicMaterial({color:0x79c5dc,toneMapped:false}),glass=new THREE.MeshStandardMaterial({color:0x91c4d3,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide,roughness:.25,metalness:.05,envMapIntensity:.45}),etch=new THREE.MeshBasicMaterial({color:0xd8f1f5,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});
 const box=(parent,x,y,z,w,h,d,material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
 const hatch=new THREE.Group();hatch.position.y=HH+.16;group.add(hatch);
 for(const sign of [-1,1]){box(hatch,sign*3.1,0,0,.15,.25,6.35,steel);box(hatch,0,0,sign*3.12,12.65,.2,.2,steel);box(hatch,0,-.13,sign*3.05,12.5,.025,.035,light);box(hatch,sign*6.3,0,0,.12,.22,6.35,edge);}
 for(const x of [-6.2,6.2])for(const z of [-3.12,3.12])box(hatch,x,4.9,z,.055,9.8,.055,edge);
 for(const z of [-3.12,3.12]){box(hatch,0,9.85,z,99,.25,.28,steel);box(hatch,0,9.7,z,98,.025,.035,light);}
 const doors=[],panes=[];for(const sign of [-1,1]){const door=new THREE.Group();door.name=(sign<0?'Left':'Right')+' sliding glass leaf';door.userData.sign=sign;door.position.x=sign*1.49;
  const pane=box(door,0,0,0,2.92,.045,5.8,glass);pane.name='Tinted glass';pane.renderOrder=2;panes.push(pane);
  for(const x of [-1.49,1.49]){box(door,x,0,0,.075,.12,5.97,edge);box(door,x,-.065,0,.025,.012,5.8,light);}for(const z of [-2.96,2.96])box(door,0,0,z,3.05,.12,.075,edge);
  for(const z of [-2.3,2.3])box(door,0,-.028,z,2.5,.004,.045,etch);box(door,-sign*1.1,-.03,0,.025,.006,4.5,etch);box(door,-sign*1.44,-.09,0,.11,.08,.5,steel);
  batchMeshes(door);hatch.add(door);doors.push(door);
 }batchMeshes(hatch);group.visible=false;group.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});return{group,hatch,doors,panes};
}
function updateOpeningVisuals(){
 const v=OPENING.visuals;if(!OPENING.active||st!=='COUNT'){if(v)v.group.visible=OPENING.completed&&!MP.active&&!sandbox&&st!=='MENU'&&st!=='END';return null;}OPENING.elapsed=cl(OPENING.duration-cnt,0,OPENING.duration);const pose=openingDeliveryPose(OPENING.elapsed);
 if(v){v.group.visible=true;v.group.position.set(OPENING.target.x,0,OPENING.target.z);for(const door of v.doors)door.position.x=door.userData.sign*(1.49+pose.open*3.3);}
 bm.position.copy(OPENING.target);bm.position.y=pose.height;bm.quaternion.setFromAxisAngle(openingSpin,pose.spin);
 const label=$('opening-stage');if(label&&label.textContent!==pose.phase)label.textContent=pose.phase;if($('opening-progress'))$('opening-progress').style.setProperty('--progress',OPENING.elapsed/OPENING.duration);return pose;
}
function positionOpeningCamera(){
 if(!OPENING.active||st!=='COUNT')return;const p=openingDeliveryPose(OPENING.elapsed),target=OPENING.target;
 openingDesired.set(target.x+9.5,7.8,target.z-17.5).lerp(cam.position,p.handoff);openingAim.copy(bm.position);openingAim.y+=.25;openingAim.lerp(lookPos,p.handoff);constrainArenaCamera(target,openingDesired,cam.position);cam.lookAt(openingAim);cam.fov=58+(cam.fov-58)*p.handoff;cam.updateProjectionMatrix();
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
