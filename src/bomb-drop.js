// Local first-kickoff Easter egg. No multiplayer packets, scores or career results are written.
const BOMB={pending:false,chosen:false,phase:'idle',age:0,target:new V3(),cameraStart:new V3(),carPoses:[],visuals:null,ui:null,sample:()=>crypto.getRandomValues(new Uint32Array(1))[0]};
const bombMatrix=new THREE.Matrix4(),bombPoint=new V3(),bombScale=new V3(),bombRotation=new Qn(),bombColor=new THREE.Color(),bombAim=new V3(),bombEye=new V3(),bombAxis=new V3(.4,1,.2).normalize();
function bombEligible(){return !window.__TEVIN_SERVER__&&!MP.active&&!DED.active&&!sandbox;}
function rollBombDrop(sample=BOMB.sample){
 // Rejection sampling keeps each accepted value's remainder exactly uniform over 100 choices.
 for(let i=0;i<8;i++){let n;try{n=sample();}catch(_){return false;}if(Number.isInteger(n)&&n>=0&&n<4294967200)return n%100===0;}return false;
}
function resetBombDrop(arm=false){
 BOMB.pending=arm&&bombEligible();BOMB.chosen=false;BOMB.phase='idle';BOMB.age=0;BOMB.carPoses.length=0;
 if(BOMB.visuals){BOMB.visuals.ball.visible=false;BOMB.visuals.effects.visible=false;}if(BOMB.ui)BOMB.ui.hidden=true;document.body.classList.remove('bomb-prank','bomb-result');document.body.dataset.bombPhase='idle';
 for(let i=0;i<cm.length;i++){cm[i].visible=!!cars[i]?.enabled;if(cm[i].userData.cameraFade)setCameraCarOpacity(cm[i],1);}if(bm)bm.visible=true;
}
function armBombDrop(){
 if(!BOMB.pending)return false;BOMB.pending=false;if(!bombEligible())return false;
 BOMB.chosen=rollBombDrop();BOMB.phase=BOMB.chosen?'armed':'idle';BOMB.age=0;BOMB.target.copy(ball.p);document.body.dataset.bombPhase=BOMB.phase;return BOMB.chosen;
}
function bombBlastSample(age,motion=true){
 const t=Math.max(0,age),flash=motion?Math.max(0,1-t/.9):0;
 return{radius:Math.min(115,t*58),core:motion?Math.max(0,Math.sin(Math.min(1,t/.95)*Math.PI))*4.6:0,fire:motion?Math.min(1,t/.09)*Math.pow(Math.max(0,1-t/1.6),1.6):0,smoke:motion?Math.min(1,t/.3)*Math.max(0,1-t/3.1):0,shake:flash*flash*.065,result:t>=1.6,done:t>=3.5};
}
function bombCarBlast(age,position,origin,motion=true){
 const delay=Math.hypot(position.x-origin.x,position.z-origin.z)/58,local=age-delay;
 return{delay,visible:local<.12,fire:motion&&local>=0?Math.min(1,local/.06)*Math.max(0,1-local/.85):0,local};
}
function detonateOpeningBomb(){
 if(BOMB.phase!=='armed'||!BOMB.chosen||!bombEligible())return false;
 BOMB.target.copy(ball.p);if(OPENING.active)finishOpening();BOMB.phase='blast';BOMB.age=0;BOMB.carPoses=cars.map(c=>({enabled:c.enabled,p:c.p.clone(),q:c.q.clone()}));
 if(cam)BOMB.cameraStart.copy(cam.position);stopReplay();clearCelebration();mpClearInput();secretClose();st='PRANK';cnt=0;mt=0;$('msg').style.opacity=0;
 document.body.classList.add('bomb-prank');document.body.dataset.bombPhase='blast';audioSilence();if(!AUDIO.settings.muted)audioSample('goal',.75);return true;
}
function createBombVisuals(glowMap=glowTex()){
 const group=new THREE.Group(),shell=new THREE.Group(),effects=new THREE.Group();group.name='Rare Tevin ball drop';shell.name='Fuse bomb ball';effects.name='Bounded bomb blast';group.add(shell,effects);
 const iron=new THREE.MeshStandardMaterial({color:0x111925,metalness:.3,roughness:.64,envMapIntensity:.35}),band=new THREE.MeshStandardMaterial({color:0x454b52,metalness:.4,roughness:.62}),red=new THREE.MeshBasicMaterial({color:0xe9483f,toneMapped:false}),gold=new THREE.MeshStandardMaterial({color:0xa77c38,roughness:.65,metalness:.3});
 const mesh=(parent,geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;};
 mesh(shell,new THREE.SphereGeometry(BR,28,20),iron);mesh(shell,new THREE.TorusGeometry(BR,.016,5,48),band).rotation.x=Math.PI/2;mesh(shell,new THREE.TorusGeometry(BR,.012,5,48),band).rotation.y=Math.PI/2;
 mesh(shell,new THREE.CylinderGeometry(.22,.29,.16,12),gold,0,BR+.055);mesh(shell,new THREE.TorusGeometry(.235,.028,5,20),band,0,BR+.13).rotation.x=Math.PI/2;
 const curve=new THREE.QuadraticBezierCurve3(new V3(0,BR+.13,0),new V3(-.08,BR+.63,0),new V3(.21,BR+.67,.05));mesh(shell,new THREE.TubeGeometry(curve,9,.035,5,false),gold);
 const ember=mesh(shell,new THREE.SphereGeometry(.068,8,6),new THREE.MeshBasicMaterial({color:0xffcf62,toneMapped:false}),.21,BR+.67,.05);
 for(let i=0;i<3;i++){const warning=new THREE.Group();warning.rotation.y=i*Math.PI*2/3;const bar=mesh(warning,new THREE.BoxGeometry(.12,.36,.035),red,0,.08,BR*.986);mesh(warning,new THREE.SphereGeometry(.068,8,5),red,0,-.2,BR*.986);bar.rotation.z=.08;shell.add(warning);}
 const additive=extra=>new THREE.MeshBasicMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,...extra});
 const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color:0xffac35,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));glow.position.set(.21,BR+.67,.05);glow.scale.setScalar(.55);shell.add(glow);
 const core=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color:0xffc575,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));effects.add(core);
 const fireGeometry=new THREE.IcosahedronGeometry(1,2),vertices=fireGeometry.getAttribute('position');for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),s=1+.13*Math.sin(x*9+y*7+z*11);vertices.setXYZ(i,x*s,y*s,z*s);}fireGeometry.computeVertexNormals();
 const fire=mesh(effects,fireGeometry,additive({color:0xff6a22,opacity:.28}));
 const rings=[];for(let i=0;i<3;i++){const ring=mesh(effects,new THREE.RingGeometry(i===1?.96:.9,1,64),additive({color:i===2?0xffc96b:0xffa444,opacity:.6,side:THREE.DoubleSide}));ring.frustumCulled=false;rings.push(ring);}
 const sparks=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),additive({opacity:.9}),96),carFire=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),additive({opacity:.75}),6),smoke=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),new THREE.MeshBasicMaterial({color:0x48505a,transparent:true,opacity:.24,depthWrite:false}),64),fuse=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),additive({map:glowMap,opacity:.85}),12);
 for(const m of [sparks,carFire,smoke,fuse]){m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.setColorAt(0,bombColor.setHex(0xffc97b));m.instanceColor.setUsage(THREE.DynamicDrawUsage);m.userData.skipAO=true;effects.add(m);}
 effects.remove(fuse);shell.add(fuse);
 shell.visible=effects.visible=false;group.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});return{group,ball:shell,effects,core,fire,rings,sparks,carFire,smoke,fuse,ember,glow};
}
function syncBombBall(){
 const v=BOMB.visuals;if(!v)return;const armed=BOMB.phase==='armed'&&bombEligible()&&st==='COUNT';v.ball.visible=armed;if(!armed)return;
 bm.visible=false;v.ball.position.copy(bm.position);v.ball.quaternion.copy(bm.quaternion);
}
function showBombResult(){
 if(BOMB.phase!=='blast')return;BOMB.phase='result';document.body.classList.add('bomb-result');document.body.dataset.bombPhase='result';if(BOMB.ui){BOMB.ui.hidden=false;$('bomb-again')?.focus?.();}
}
function tickBombDrop(dt){
 if(st!=='PRANK'||!['blast','result'].includes(BOMB.phase))return;BOMB.age=Math.min(5,BOMB.age+Math.max(0,dt));if(bombBlastSample(BOMB.age).result)showBombResult();
}
function updateBombScene(dt){
 const v=BOMB.visuals;if(!v)return;const motion=cinemaMotion();syncBombBall();
 if(BOMB.phase==='armed'&&bombEligible()&&st==='COUNT'){
  const time=OPENING.active?OPENING.elapsed:Math.max(0,3.99-cnt);v.glow.material.opacity=motion?.55+Math.sin(time*14)*.15:.5;v.ember.scale.setScalar(motion?1+Math.sin(time*19)*.12:1);v.fuse.count=motion?12:0;bombRotation.copy(v.ball.quaternion).invert().multiply(cam.quaternion);
  for(let i=0;i<v.fuse.count;i++){const age=(time*1.8+i/12)%1,a=i*2.39996;bombPoint.set(.21+Math.cos(a)*age*.23,BR+.67+age*.4,.05+Math.sin(a)*age*.23);bombScale.setScalar(.04*(1-age));bombMatrix.compose(bombPoint,bombRotation,bombScale);v.fuse.setMatrixAt(i,bombMatrix);v.fuse.setColorAt(i,bombColor.setHex(0xffcf75).multiplyScalar(1-age));}
  v.fuse.instanceMatrix.needsUpdate=true;if(v.fuse.instanceColor)v.fuse.instanceColor.needsUpdate=true;return;
 }
 v.fuse.count=0;if(st!=='PRANK'||!['blast','result'].includes(BOMB.phase)){v.effects.visible=false;return;}
 const age=BOMB.age,s=bombBlastSample(age,motion),origin=BOMB.target;v.ball.visible=false;v.effects.visible=!s.done;bm.visible=false;pts.count=0;if(FX)FX.group.visible=false;if(RIVALS.visuals)RIVALS.visuals.group.visible=false;for(const shadow of contactShadows)shadow.visible=false;
 const mix=cinemaEase(age/1.25);bombEye.set(origin.x+12,10.5,origin.z-23).lerp(BOMB.cameraStart,1-mix);bombAim.copy(origin);bombAim.y+=.5;constrainArenaCamera(origin,bombEye,cam.position);cam.lookAt(bombAim);cam.fov=62+cinemaEase(age/1.7)*9;if(motion){cam.position.x+=Math.sin(age*91)*s.shake;cam.position.y+=Math.sin(age*113)*s.shake*.65;}cam.updateProjectionMatrix();
 v.core.position.copy(origin);v.core.scale.setScalar(s.core*2.2);v.core.material.opacity=s.fire*.8;v.fire.position.copy(origin);v.fire.scale.setScalar(s.fire*(2.4+age*7));v.fire.rotation.set(age*.6,age*.9,0);v.fire.material.opacity=s.fire*.28;
 for(let i=0;i<3;i++){const ring=v.rings[i],radius=Math.max(0,s.radius-i*3.5);ring.visible=motion&&age<1.65&&radius>0;ring.position.set(origin.x,.08+i*.035,origin.z);ring.rotation.x=-Math.PI/2;ring.scale.setScalar(radius);ring.material.opacity=Math.max(0,1-age/1.65)*(i===0?.55:.24);}
 let carCount=0;for(let i=0;i<BOMB.carPoses.length;i++){const saved=BOMB.carPoses[i],car=cm[i];if(!saved.enabled||!car)continue;const c=bombCarBlast(age,saved.p,origin,motion);car.visible=c.visible;
  if(c.local>=0&&c.local<.12&&motion){bombPoint.copy(saved.p).sub(origin).setY(0).normalize();car.position.copy(saved.p).addScaledVector(bombPoint,c.local*9);car.position.y+=c.local*7;bombRotation.setFromAxisAngle(bombAxis,c.local*4);car.quaternion.copy(saved.q).multiply(bombRotation);}
  bombPoint.copy(saved.p);bombPoint.y+=.65;bombScale.setScalar(c.fire*(1.3+Math.max(0,c.local)*2));bombRotation.identity();bombMatrix.compose(bombPoint,bombRotation,bombScale);v.carFire.setMatrixAt(carCount,bombMatrix);v.carFire.setColorAt(carCount++,bombColor.setHex(0xffa14d).multiplyScalar(c.fire));
 }v.carFire.count=motion?carCount:0;v.carFire.instanceMatrix.needsUpdate=v.carFire.instanceColor.needsUpdate=true;
 if(s.done)return;
 v.sparks.count=motion&&age<2.4?96:0;for(let i=0;i<v.sparks.count;i++){const a=i*2.399963,speed=12+i%17,up=4+i%11;bombPoint.set(origin.x+Math.cos(a)*speed*age,Math.max(.08,origin.y+up*age-4*age*age),origin.z+Math.sin(a)*speed*age);const fade=Math.max(0,1-age/2.4);bombScale.set(.04*fade,.04*fade,(.25+i%5*.08)*fade);bombRotation.setFromAxisAngle(bombAxis,a+age);bombMatrix.compose(bombPoint,bombRotation,bombScale);v.sparks.setMatrixAt(i,bombMatrix);v.sparks.setColorAt(i,bombColor.setHex(i%4?0xffa23a:0xffe4a2).multiplyScalar(fade));}v.sparks.instanceMatrix.needsUpdate=v.sparks.instanceColor.needsUpdate=true;
 v.smoke.count=s.smoke>0?64:0;for(let i=0;i<v.smoke.count;i++){const p=i<16?origin:BOMB.carPoses[(i-16)%BOMB.carPoses.length]?.p||origin,a=i*2.399963,spread=.3+age*(.7+i%4*.15);bombPoint.set(p.x+Math.cos(a)*spread,p.y+.4+age*(.5+i%3*.16),p.z+Math.sin(a)*spread);bombScale.setScalar((.3+age*.8)*s.smoke);bombRotation.setFromAxisAngle(bombAxis,a);bombMatrix.compose(bombPoint,bombRotation,bombScale);v.smoke.setMatrixAt(i,bombMatrix);v.smoke.setColorAt(i,bombColor.setHex([0x59616b,0x333e4c,0x6a5d53][i%3]));}v.smoke.instanceMatrix.needsUpdate=v.smoke.instanceColor.needsUpdate=true;
}
function buildBombDrop(){BOMB.visuals=createBombVisuals();scene.add(BOMB.visuals.group);}
function setupBombUI(){
 const ui=document.createElement('section');ui.id='bomb-result';ui.hidden=true;ui.tabIndex=-1;ui.setAttribute('role','dialog');ui.setAttribute('aria-modal','true');ui.setAttribute('aria-labelledby','bomb-title');
 ui.innerHTML='<div class="bomb-result-card"><span class="bomb-result-kicker">SPECIAL DELIVERY / 1 IN 100</span><div class="bomb-crown" aria-hidden="true">T</div><h1 id="bomb-title">TEVIN WINS</h1><p>Special delivery. Every car caught the blast.</p><div class="bomb-actions"><button id="bomb-again">PLAY AGAIN <span>↗</span></button><button id="bomb-lobby">BACK TO LOBBY</button></div><small>The next match gets a fresh drop.</small></div>';document.body.appendChild(ui);BOMB.ui=ui;
 $('bomb-again').onclick=()=>{if(st==='PRANK'&&BOMB.phase==='result')startGame();};$('bomb-lobby').onclick=()=>quit();addEventListener('keydown',e=>{if(st!=='PRANK')return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();quit();}else if(e.key==='Tab'&&!ui.hidden){e.preventDefault();const again=$('bomb-again'),lobby=$('bomb-lobby');(document.activeElement===again?lobby:again).focus?.();}},true);
}
