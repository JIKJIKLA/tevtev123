// Match presentation owns camera/mesh poses only. Online kickoff and ball authority stay on the server.
const OPENING={pending:false,active:false,completed:false,elapsed:0,duration:5,impact:2.25,roofY:30.5,target:new V3(),visuals:null};
const MATCH_FADE={element:null,active:false,previous:'MENU',out:0,opacity:0};
const KICKOFF_JOLT={age:99,key:''};
const openingPosition=new V3(),openingAim=new V3(),openingDesired=new V3(),openingSpin=new V3(.15,1,.25).normalize();
function openingEligible(){return !window.__TEVIN_SERVER__&&!MP.active&&!sandbox&&cinemaMotion();}
function resetMatchPresentation(arm=false){
 resetBombDrop(arm);clearFlyby();
 OPENING.pending=arm&&openingEligible();OPENING.active=OPENING.completed=false;OPENING.elapsed=0;KICKOFF_JOLT.age=99;KICKOFF_JOLT.key='';MATCH_FADE.active=false;MATCH_FADE.out=MATCH_FADE.opacity=0;MATCH_FADE.previous='MENU';
 if(MATCH_FADE.element)MATCH_FADE.element.style.opacity=0;if(OPENING.visuals){OPENING.visuals.airshow.group.visible=false;for(const d of OPENING.visuals.doors)d.position.x=d.userData.sign*1.61;}document.body.classList.remove('opening-cinematic');if($('opening-caption'))$('opening-caption').hidden=true;
}
function beginOpening(){
 const begin=OPENING.pending&&openingEligible();OPENING.pending=false;OPENING.active=begin;OPENING.elapsed=0;armBombDrop();if(!begin)return false;
 OPENING.target.copy(ball.p);cnt=OPENING.duration;document.body.classList.add('opening-cinematic');if($('opening-caption'))$('opening-caption').hidden=false;return true;
}
function finishOpening(){
 if(!OPENING.active)return false;OPENING.active=false;OPENING.completed=true;if(!MP.active&&!window.__TEVIN_SERVER__){ball.p.copy(OPENING.target);ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);ball.v.set(0,0,0);ball.w.set(0,0,0);if(bm)bm.quaternion.identity();}
 if(OPENING.visuals){OPENING.visuals.airshow.group.visible=false;for(const door of OPENING.visuals.doors)door.position.x=door.userData.sign*1.61;}clearFlyby();document.body.classList.remove('opening-cinematic');if($('opening-caption'))$('opening-caption').hidden=true;cameraAnchorReady=false;return true;
}
function openingDeliveryPose(elapsed){
 const t=cl(elapsed,0,OPENING.duration),ease=cinemaEase,high=54.5;let height;
 if(t<OPENING.impact){const u=t/OPENING.impact;height=BR+(high-BR)*(1-u*u);}
 else if(t<3.35){const u=(t-OPENING.impact)/(3.35-OPENING.impact);height=BR+2.05*4*u*(1-u);}
 else if(t<4.12){const u=(t-3.35)/.77;height=BR+.56*4*u*(1-u);}
 else if(t<OPENING.duration){const u=(t-4.12)/(OPENING.duration-4.12);height=BR+.14*Math.pow(1-u,3)*Math.pow(Math.sin(u*Math.PI*1.5),2);}
 else height=BR;
 const open=ease((t-.15)/.65)*(1-ease((t-1.85)/.55)),handoff=ease((t-2.05)/2.35),spin=t*(1-ease((t-OPENING.impact)/(OPENING.duration-OPENING.impact)));
 return{height,open,handoff,spin,phase:t<1.3?'EYES TO THE SKY':t<2.25?'AIRSHOW / SPLIT':t<4.12?'BALL INBOUND':'READY FOR KICKOFF'};
}
function createOpeningVisuals(){
 const group=new THREE.Group();group.name='Fixed stadium roof and independent ball drop';const steel=new THREE.MeshStandardMaterial({color:0x263c4c,metalness:.35,roughness:.64}),edge=new THREE.MeshStandardMaterial({color:0x7f98a6,roughness:.55,metalness:.25}),light=new THREE.MeshBasicMaterial({color:0x79c5dc,toneMapped:false}),glass=new THREE.MeshStandardMaterial({color:0x91c4d3,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide,roughness:.25,metalness:.05,envMapIntensity:.65}),etch=new THREE.MeshBasicMaterial({color:0xd8f1f5,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});
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
 const airshow=createAirshowVisuals();group.add(airshow.group);group.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});return{group,roof,hatches,doors,panes,airshow};
}
function updateOpeningVisuals(){
 const v=OPENING.visuals;if(!OPENING.active||st!=='COUNT'){if(v){v.group.visible=true;v.airshow.group.visible=false;}clearFlyby();return null;}OPENING.elapsed=cl(OPENING.duration-cnt,0,OPENING.duration);const pose=openingDeliveryPose(OPENING.elapsed);
 if(v){const activeZ=Math.round(OPENING.target.z/24)*24;for(const door of v.doors)door.position.x=door.userData.sign*(1.61+(door.userData.centerZ===activeZ?pose.open*3.45:0));}
 bm.position.copy(OPENING.target);bm.position.y=pose.height;bm.quaternion.setFromAxisAngle(openingSpin,pose.spin);
 const label=$('opening-stage');if(label&&label.textContent!==pose.phase)label.textContent=pose.phase;if($('opening-progress'))$('opening-progress').style.setProperty('--progress',OPENING.elapsed/OPENING.duration);return pose;
}
function positionOpeningCamera(){
 if(!OPENING.active||st!=='COUNT')return;const p=openingDeliveryPose(OPENING.elapsed),target=OPENING.target;
 openingDesired.set(target.x,9,target.z+(target.z< -10?40:-40)).lerp(cam.position,p.handoff);openingAim.copy(bm.position);openingAim.y=Math.max(openingAim.y+.25,35*(1-cinemaEase((OPENING.elapsed-1.5)/.9)));openingAim.lerp(lookPos,p.handoff);constrainArenaCamera(target,openingDesired,cam.position);cam.lookAt(openingAim);const fly=jetFlybyPose(OPENING.elapsed,airshowImpactMotion());cam.position.x+=fly.shakeX;cam.position.y+=fly.shakeY;const wide=cl(2*Math.atan(Math.tan(56*Math.PI/180)/cam.aspect)*180/Math.PI,65,116);cam.fov=wide+(cam.fov-wide)*p.handoff;cam.updateProjectionMatrix();if(OPENING.visuals)updateJetFlyby(OPENING.visuals,OPENING.elapsed);
}
function goalFieldCameraPose(team,age,out,target){
 const attack=team===0?1:-1,u=cinemaEase(age/.65);out.set(10+u*1.4,5.3+u*.5,attack*(HZ-12-u*1.4));target.set(0,2.1,attack*(HZ-.5));
}
function kickoffLabel(count){return OPENING.active?Math.max(1,Math.ceil(count)):count>3?'READY':Math.max(1,Math.ceil(count));}
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
 const caption=document.createElement('div');caption.id='opening-caption';caption.hidden=true;caption.innerHTML='<small>NIVET LEAGUE / MATCH OPENING</small><strong id="opening-stage">SKYLIGHT OPENING</strong><span id="opening-progress" aria-hidden="true"></span>';document.body.appendChild(caption);
}
