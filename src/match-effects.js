// Match feedback is derived from shared events/render poses, never from invented hits.
// Fixed pools, one dynamic ribbon draw, no extra lights or postprocess passes.
const MATCH_EFFECTS={awardUntil:0,group:null,ribbon:null,clock:0,nextRing:0,nextSmoke:0,rings:[],smoke:[],skids:null,nextSkid:0,
 trails:Array.from({length:13},()=>({p:new Float32Array(18*3),t:new Float32Array(18),next:0,count:0})),
 skidLife:new Float32Array(96),skidP:new Float32Array(96*3),skidQ:Array.from({length:96},()=>new Qn()),
 lastDemo:Array(6).fill(0),lastRespawn:Array(6).fill(0),ground:Array(6).fill(true),lastY:new Float32Array(6),skidClock:new Float32Array(6)};
const mxP=new V3(),mxQ=new Qn(),mxScale=new V3(),mxMatrix=new THREE.Matrix4(),mxColor=new THREE.Color(),mxA=new V3(),mxB=new V3(),mxEdge=new V3(),mxView=new V3(0,0,-1),mxRight=new V3(1,0,0),mxZ=new V3(0,0,1);
function matchEffectEnvelope(age,life){return !Number.isFinite(age)||!Number.isFinite(life)||life<=0||age<0||age>=life?0:Math.pow(1-age/life,1.6);}
function matchTrailGeometry(quads=512){
 const g=new THREE.BufferGeometry(),indices=[];for(let i=0;i<quads;i++){const k=i*4;indices.push(k,k+1,k+2,k,k+2,k+3);}
 g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(quads*12),3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(quads*12),3).setUsage(THREE.DynamicDrawUsage));g.setIndex(indices);g.setDrawRange(0,0);return g;
}
function recordMatchTrail(trail,point,clock){
 if(!point||!Number.isFinite(point.x+point.y+point.z+clock))return false;
 if(trail.count){const last=((trail.next+17)%18)*3,dx=point.x-trail.p[last],dy=point.y-trail.p[last+1],dz=point.z-trail.p[last+2],d=dx*dx+dy*dy+dz*dz;
  if(d>225){trail.count=0;trail.next=0;}else if(d<.00001)return false;
 }
 const i=trail.next;trail.p[i*3]=point.x;trail.p[i*3+1]=point.y;trail.p[i*3+2]=point.z;trail.t[i]=clock;trail.next=(i+1)%18;trail.count=Math.min(18,trail.count+1);return true;
}
function writeMatchTrail(trail,geometry,quad,clock,color,width,gain=1,life=.24){
 const positions=geometry.getAttribute('position'),colors=geometry.getAttribute('color'),capacity=positions.count/4;
 mxColor.setHex(color);const red=mxColor.r*gain,green=mxColor.g*gain,blue=mxColor.b*gain;
 for(let n=1;n<trail.count&&quad<capacity;n++){
  const ai=(trail.next-n+18)%18,bi=(trail.next-n-1+36)%18,age=clock-trail.t[bi],fade=matchEffectEnvelope(age,life);if(!fade)break;
  mxA.fromArray(trail.p,ai*3);mxB.fromArray(trail.p,bi*3);mxEdge.copy(mxA).sub(mxB).cross(mxView);if(mxEdge.lengthSq()<1e-8)mxEdge.copy(mxRight);mxEdge.normalize().multiplyScalar(width*fade);
  for(let k=0;k<4;k++){const p=k<2?mxA:mxB,sign=k===0||k===3?-1:1,index=quad*4+k;positions.setXYZ(index,p.x+mxEdge.x*sign,p.y+mxEdge.y*sign,p.z+mxEdge.z*sign);const energy=fade*(k<2?1:.72);colors.setXYZ(index,red*energy,green*energy,blue*energy);}
  quad++;
 }return quad;
}
function createMatchEffects(){
 if(window.__TEVIN_SERVER__||!scene)return;const e=MATCH_EFFECTS,group=new THREE.Group();group.name='Bounded ordinary-match feedback';scene.add(group);e.group=group;
 const material=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.72,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false});
 e.ribbon=new THREE.Mesh(matchTrailGeometry(),material);e.ribbon.frustumCulled=false;e.ribbon.userData.skipAO=true;group.add(e.ribbon);e.rings=[];e.smoke=[];
 const ringGeometry=new THREE.RingGeometry(.86,1,32),map=FX?.maps.dust||FX?.maps.soft||glowTex();
 for(let i=0;i<18;i++){const mesh=new THREE.Mesh(ringGeometry,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));mesh.visible=false;mesh.userData.skipAO=true;group.add(mesh);e.rings.push({mesh,age:99,life:.3,size:1,ground:true});}
 for(let i=0;i<16;i++){const mesh=new THREE.Sprite(new THREE.SpriteMaterial({map,color:0x3b4142,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));mesh.visible=false;mesh.userData.skipAO=true;group.add(mesh);e.smoke.push({mesh,age:99,life:1,p:new V3(),velocity:new V3(),size:1,opacity:.3});}
 const skidGeometry=new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2);e.skids=new THREE.InstancedMesh(skidGeometry,new THREE.MeshBasicMaterial({color:0x112316,transparent:true,opacity:.25,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),96);e.skids.instanceMatrix.setUsage(THREE.DynamicDrawUsage);e.skids.frustumCulled=false;e.skids.count=0;group.add(e.skids);clearMatchEffects();
 // Visible zero-alpha pool entries compile during the normal preload gate.
 e.ribbon.geometry.setDrawRange(0,6);for(const r of e.rings){r.mesh.visible=true;r.mesh.material.opacity=0;}for(const s of e.smoke){s.mesh.visible=true;s.mesh.material.opacity=0;}
}
function clearMatchEffects(){
 const e=MATCH_EFFECTS;e.clock=0;e.skidLife.fill(0);e.skidClock.fill(0);for(const trail of e.trails){trail.count=trail.next=0;}for(const r of e.rings){r.age=99;r.mesh.visible=false;}for(const s of e.smoke){s.age=99;s.mesh.visible=false;}
 for(let i=0;i<6;i++){e.lastDemo[i]=cars[i]?.demoSeq||0;e.lastRespawn[i]=cars[i]?.respawnSeq||0;e.ground[i]=!!cars[i]?.ground;e.lastY[i]=cars[i]?.v.y||0;}
 if(e.ribbon)e.ribbon.geometry.setDrawRange(0,0);if(e.skids)e.skids.count=0;document.body.classList.remove('supersonic-feedback');if($('match-respawn'))$('match-respawn').hidden=true;if($('match-award'))$('match-award').hidden=true;e.awardUntil=0;
}
function matchRing(point,color,size,life=.28,ground=false,normal=Y3){
 const e=MATCH_EFFECTS;if(!e.group)return;const ring=e.rings[e.nextRing++%e.rings.length];Object.assign(ring,{age:0,life,size,ground});ring.mesh.position.copy(point);ring.mesh.material.color.setHex(color);ring.mesh.quaternion.copy(ground?mxQ.setFromUnitVectors(mxZ,normal):cam.quaternion);ring.mesh.visible=true;
}
function matchSmoke(point,size=.35,life=.5,color=0x627757,opacity=.24,seed=0){
 const e=MATCH_EFFECTS;if(!e.group)return;const smoke=e.smoke[e.nextSmoke++%e.smoke.length];Object.assign(smoke,{age:0,life,size,opacity});smoke.p.copy(point);smoke.velocity.set(Math.sin(seed*2.4)*.7,.7+seed%3*.2,Math.cos(seed*2.4)*.7);smoke.mesh.material.color.setHex(color);smoke.mesh.visible=true;
}
function matchShotOnTarget(team,point,velocity){
 const sign=team===0?1:-1,forward=velocity.z*sign;if(forward<=2||velocity.length()<8)return false;const time=(HZ-point.z*sign)/forward;if(time<=0||time>1.75)return false;
 const y=point.y+velocity.y*time-.5*G*cfg.gravity*time*time;return Math.abs(point.x+velocity.x*time)<GX-BR&&y>=BR&&y<GH-BR;
}
function matchAward(kind,cid){
 if(window.__TEVIN_SERVER__||cid!==localPlayer().id||!['shot','save'].includes(kind)||st!=='PLAY')return false;
 const el=$('match-award');if(!el)return false;el.hidden=false;el.querySelector('strong').textContent=kind==='save'?'SAVE':'SHOT ON GOAL';el.querySelector('span').textContent=kind==='save'?'+50':'+10';MATCH_EFFECTS.awardUntil=MATCH_EFFECTS.clock+1.3;
 if(celebrationMotion()&&el.animate)el.animate([{opacity:0,transform:'translate(-50%,8px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:180,easing:'ease-out'});return true;
}
function matchContactCue(kind,strength,position,cid=-1,color=null){
 if(window.__TEVIN_SERVER__||DED.replaying||!MATCH_EFFECTS.group||!['PLAY','GOAL'].includes(st))return false;
 if(kind==='shot'||kind==='save')return matchAward(kind,cid);
 const motion=celebrationMotion();if(!motion)return false;const car=cars[cid],tint=car?.color??color??(ball.last>=0?teamPalette[ball.last]:0xf5d49a);
 if(position)mxP.fromArray(position);else if(car)mxP.copy(car.p);else return false;
 if(kind==='jump'||kind==='dodge'){
  const floor=mxP.y<.7;if(floor)mxP.y=.035;matchRing(mxP,tint,kind==='dodge'?.62:.38,kind==='dodge'?.24:.3,floor);
  if(floor)for(let i=0;i<2;i++)matchSmoke(mxP,.25,.35,0x7a8262,.16,i+cid);
 }else if(['hit','ball','wall','bump'].includes(kind)&&strength>2.5){
  if(kind==='ball'&&mxP.y<BR+.2){mxP.y=.04;matchRing(mxP,tint,.6,.22,true);}else matchRing(mxP,tint,cl(strength*.026,.12,.6),.17,false);
 }else return false;return true;
}
function matchDemolitionEffect(car,position){
 const e=MATCH_EFFECTS;if(!e.group)return;const motion=celebrationMotion(),tint=0xffb54a;matchRing(position,tint,1.7,motion?.45:.18,false);
 if(motion){for(let i=0;i<8;i++){mxP.copy(position).add(mxA.set(Math.sin(i*2.4),i%3*.28,Math.cos(i*2.4)).multiplyScalar(.4));matchSmoke(mxP,1.4+(i%3)*.25,1.1+i%3*.15,i%3?0x262b32:0x7d5338,.4,i);}for(let i=0;i<18;i++){const a=i*2.399;emit(position.x,position.y,position.z,Math.cos(a)*(3+i%4),1+i%5,Math.sin(a)*(3+i%4),.55,1,.48,.1);}}
 if(car.id===localPlayer().id){const el=$('match-respawn');if(el)el.hidden=false;}
 // Reuse the supplied impact recording, without replacing existing sound assets.
 audioSample('wall2',.6,.78,[position.x,position.y,position.z]);
}
function setupMatchEffectsUI(){
 if($('match-respawn'))return;const el=document.createElement('div');el.id='match-respawn';el.hidden=true;el.setAttribute('role','status');el.innerHTML='<strong>DEMOLISHED</strong><span>BACK ON THE PITCH IN <b id="respawn-count">3</b></span>';document.body.appendChild(el);
 const award=document.createElement('div');award.id='match-award';award.hidden=true;award.setAttribute('role','status');award.innerHTML='<strong>SHOT ON GOAL</strong><span>+10</span>';document.body.appendChild(award);
}
function updateMatchEffects(dt,replay=false){
 const e=MATCH_EFFECTS;if(!e.group)return;const motion=celebrationMotion(),live=st==='PLAY',active=live||st==='GOAL';e.group.visible=active;if(!active){clearMatchEffects();return;}const step=cl(dt,0,.05);e.clock+=step;cam.getWorldDirection(mxView);mxRight.set(1,0,0).applyQuaternion(cam.quaternion);let quad=0;
 for(let i=0;i<cars.length;i++){
  const c=cars[i],m=cm[i];if(!m)continue;const dead=(c.demoTime||0)>0,speed=c.v.length(),supersonic=replay?!!m.userData.replaySupersonic:!!c.supersonic||speed>=22*cfg.speed,lateral=Math.abs(c.v.dot(mxA.set(0,0,1).applyQuaternion(m.quaternion)));
  if(!replay){if(c.demoSeq!==undefined&&c.demoSeq!==e.lastDemo[i]){if(dead)matchDemolitionEffect(c,m.position);e.lastDemo[i]=c.demoSeq;}if(c.respawnSeq!==undefined&&c.respawnSeq!==e.lastRespawn[i]){if(motion)matchRing(m.position,c.color,.9,.42,true);e.lastRespawn[i]=c.respawnSeq;if(c===localPlayer()){cd.set(1,0,0).applyQuaternion(c.q).setY(0).normalize();cpos.copy(c.p).addScaledVector(cd,-cameraSettings.distance);cpos.y+=cameraSettings.height;lookPos.copy(ball.p);cameraAnchorReady=false;cam.position.copy(cpos);constrainArenaCamera(c.p,cam.position,cam.position);cam.lookAt(lookPos);}}
   if(live&&motion&&c.enabled&&!dead&&c.ground&&!e.ground[i]&&e.lastY[i]<-1.5){mxP.copy(m.position).addScaledVector(c.n,.025-bodyPhysics(c).height);matchRing(mxP,0xd2c298,cl(-e.lastY[i]*.08,.35,.9),.25,true,c.n);if(c.n.y>.8)matchSmoke(mxP,.4,.45,0x788368,.22,i);}
   e.ground[i]=!!c.ground;e.lastY[i]=c.v.y;
  }
  for(let side=0;side<2;side++){
   const trail=e.trails[i*2+side];if((live||replay)&&motion&&m.visible&&supersonic){mxP.set(-.4,-.10,(side?1:-1)*bodyPhysics(c).wheels[2][2]).applyQuaternion(m.quaternion).add(m.position);recordMatchTrail(trail,mxP,e.clock);}else if(!motion||dead||!c.enabled)trail.count=0;
   quad=writeMatchTrail(trail,e.ribbon.geometry,quad,e.clock,c.color,.035,.8,.25);
  }
  if(!replay&&live&&motion&&c.enabled&&!dead&&c.ground&&c.n.y>.8&&speed>5&&(c.inp.ps||lateral>2)){
   e.skidClock[i]+=step;if(e.skidClock[i]>=.04){e.skidClock[i]=0;for(const sign of [-1,1]){const j=e.nextSkid++%96;mxP.set(-.38,.025-bodyPhysics(c).height,sign*bodyPhysics(c).wheels[2][2]).applyQuaternion(m.quaternion).add(m.position);e.skidP[j*3]=mxP.x;e.skidP[j*3+1]=mxP.y;e.skidP[j*3+2]=mxP.z;e.skidQ[j].copy(m.quaternion);e.skidLife[j]=1.1;}if((e.nextSkid%6)===0)matchSmoke(mxP,.25,.4,0x758064,.16,i);}
  }
 }
 const ballTrail=e.trails[12],ballSpeed=ball.v.length();if(motion&&(live||replay)&&bm.visible&&ballSpeed>8&&ball.last>=0)recordMatchTrail(ballTrail,bm.position,e.clock);else if(!motion||!bm.visible)ballTrail.count=0;
 const ballColor=ball.last>=0?teamPalette[ball.last]:0xf5e4ba;quad=writeMatchTrail(ballTrail,e.ribbon.geometry,quad,e.clock,ballColor,.13,.82,.23);quad=writeMatchTrail(ballTrail,e.ribbon.geometry,quad,e.clock,0xfff3d8,.034,.9,.18);
 const geometry=e.ribbon.geometry;geometry.setDrawRange(0,quad*6);if(quad){geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;}
 for(const r of e.rings){r.age+=step;const env=matchEffectEnvelope(r.age,r.life);r.mesh.visible=env>0&&motion;if(!r.mesh.visible)continue;const scale=r.size*(.35+(1-env)*1.3);r.mesh.scale.setScalar(scale);r.mesh.material.opacity=env*.55;if(!r.ground)r.mesh.quaternion.copy(cam.quaternion);}
 for(const s of e.smoke){s.age+=step;const env=matchEffectEnvelope(s.age,s.life);s.mesh.visible=env>0&&motion;if(!s.mesh.visible)continue;s.mesh.position.copy(s.p).addScaledVector(s.velocity,s.age);s.mesh.scale.setScalar(s.size*(.35+s.age*.9));s.mesh.material.opacity=env*s.opacity;}
 let skid=0;for(let i=0;i<96;i++){e.skidLife[i]=Math.max(0,e.skidLife[i]-step);if(!motion||!e.skidLife[i])continue;mxP.fromArray(e.skidP,i*3);mxScale.set(.065*Math.min(1,e.skidLife[i]*4),1,.18);mxMatrix.compose(mxP,e.skidQ[i],mxScale);e.skids.setMatrixAt(skid++,mxMatrix);}e.skids.count=skid;if(skid)e.skids.instanceMatrix.needsUpdate=true;
 if($('match-award'))$('match-award').hidden=!live||e.clock>e.awardUntil;
 const car=localPlayer(),dead=(car.demoTime||0)>0,el=$('match-respawn');if(el){el.hidden=!live||!dead;if(!el.hidden)$('respawn-count').textContent=String(Math.max(1,Math.ceil(car.demoTime)));}document.body.classList.toggle('supersonic-feedback',live&&!dead&&motion&&(!!car.supersonic||car.v.length()>=22*cfg.speed));
}
