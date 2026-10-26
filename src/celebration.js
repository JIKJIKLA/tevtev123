// Bounded presentation only: no match, car or ball physics is changed here.
const CELEBRATION={group:null,boostOuter:null,boostCore:null,trail:null,shards:null,rings:[],boostClock:[],clock:0,age:99,team:0,color:0x2a6bff,key:'',origin:new V3(),nextTrail:0,
 trailLife:new Float32Array(96),trailTotal:new Float32Array(96),trailPosition:new Float32Array(96*3),trailVelocity:new Float32Array(96*3),trailColor:new Uint32Array(96),shardDirection:[],shardSpeed:[],ui:null};
const ceMatrix=new THREE.Matrix4(),cePosition=new V3(),ceScale=new V3(),ceDirection=new V3(),ceColor=new THREE.Color(),ceRotation=new Qn(),ceZ=new V3(0,0,1);
function celebrationMotion(){return RIVAL_PREF.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
function celebrationEnvelope(age){return age<0||age>2.8?0:Math.min(1,age/.09)*Math.pow(Math.max(0,1-age/2.8),1.45);}
function celebrationAccent(color){const r=color>>16&255,g=color>>8&255,b=color&255,max=Math.max(r,g,b);if(max>=96)return color;if(!max)return 0x7ebde6;const boost=128/max;return Math.max(10,Math.round(r*boost))<<16|Math.max(10,Math.round(g*boost))<<8|Math.max(10,Math.round(b*boost));}
function celebrationPaint(info){return Number.isInteger(cars[info.scorer]?.color)?cars[info.scorer].color:teamPalette[info.team];}
function createCelebrationEffects(){
 if(window.__TEVIN_SERVER__||!scene)return false;
 const e=CELEBRATION;if(e.group?.parent===scene)return true;
 const group=new THREE.Group();group.name='Pooled boost and goal spectacle';scene.add(group);e.group=group;e.boostClock=Array(6).fill(0);e.rings=[];e.shardDirection=[];e.shardSpeed=[];
 const additive=extra=>new THREE.MeshBasicMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,...extra});
 const nozzle=new THREE.ConeGeometry(1,1,8,1,true).rotateZ(Math.PI/2).translate(-.5,0,0);
 e.boostOuter=new THREE.InstancedMesh(nozzle,additive({opacity:.55,side:THREE.DoubleSide}),12);
 e.boostCore=new THREE.InstancedMesh(nozzle,additive({opacity:.9,side:THREE.DoubleSide}),12);
 e.trail=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),additive({map:FX?.maps?.soft||glowTex(),opacity:.65}),96);
 e.shards=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),additive({opacity:.9}),72);
 for(const mesh of [e.boostOuter,e.boostCore,e.trail,e.shards]){mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.setColorAt(0,ceColor.setHex(0xffffff));mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);mesh.userData.skipAO=true;group.add(mesh);}
 for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(i===2?.97:.9,1,64),additive({side:THREE.DoubleSide,opacity:0}));ring.name='Goal shockwave '+i;ring.frustumCulled=false;ring.userData.skipAO=true;group.add(ring);e.rings.push(ring);}
 for(let i=0;i<72;i++){const angle=i*2.399963,spread=.24+(i%9)/9*.75;e.shardDirection.push(new V3(Math.cos(angle)*spread,.15+(i*13%23)/23*.9,Math.sin(angle)*spread).normalize());e.shardSpeed.push(6+(i*17%23)*.45);}
 clearCelebration();for(const ring of e.rings){ring.visible=true;ring.material.opacity=0;}return true;
}
function setupCelebrationUI(){
 if(CELEBRATION.ui)return CELEBRATION.ui;
 const el=document.createElement('div');el.id='goal-spectacle';el.hidden=true;el.setAttribute('aria-live','polite');
 const kicker=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small');kicker.className='goal-spectacle-kicker';title.textContent='GOOOAL!';detail.className='goal-spectacle-detail';el.append(kicker,title,detail);document.body.appendChild(el);CELEBRATION.ui={el,kicker,title,detail};return CELEBRATION.ui;
}
function triggerCelebration(info){
 if(window.__TEVIN_SERVER__||!info||![0,1].includes(info.team))return false;
 const e=CELEBRATION,key=MP.round+':'+score.join(':')+':'+(info.id??'goal');if(e.key===key)return false;e.key=key;e.age=0;e.team=info.team;e.color=celebrationAccent(celebrationPaint(info));
 e.origin.set(cl(ball.p.x,-GX+.5,GX-.5),cl(ball.p.y,.8,GH-.6),info.team===0?HZ:-HZ);
 const ui=setupCelebrationUI();ui.kicker.textContent=(info.team?'ORANGE':'BLUE')+' SCORES';ui.detail.textContent=(info.scorer>=0?driverName(info.scorer):'OWN GOAL')+(info.assist>=0?' · ASSIST '+driverName(info.assist):'')+(info.speed?' · '+Math.round(info.speed)+' KM/H':'');ui.el.style.setProperty('--celebration-color','#'+e.color.toString(16).padStart(6,'0'));ui.el.hidden=false;ui.el.classList.toggle('still',!celebrationMotion()||RIVAL_PREF.celebration==='quiet');
 document.body.classList.add('goal-presentation');document.body.classList.toggle('goal-impact',celebrationMotion()&&RIVAL_PREF.celebration!=='quiet');
 return true;
}
function clearCelebration(){
 const e=CELEBRATION;e.age=99;e.key='';e.trailLife.fill(0);e.nextTrail=0;e.boostClock.fill(0);document.body.classList.remove('goal-impact','boost-thrust','goal-presentation');if(e.ui)e.ui.el.hidden=true;
 for(const mesh of [e.boostOuter,e.boostCore,e.trail,e.shards])if(mesh)mesh.count=0;for(const ring of e.rings)ring.visible=false;
}
function resetCelebrationEffects(){clearCelebration();CELEBRATION.group=null;CELEBRATION.boostOuter=CELEBRATION.boostCore=CELEBRATION.trail=CELEBRATION.shards=null;CELEBRATION.rings=[];}
function celebrationTrail(c,m){
 const e=CELEBRATION,i=e.nextTrail++%96,o=i*3;cePosition.set(-.72,.1,(i%2?1:-1)*.17).applyQuaternion(m.quaternion).add(m.position);ceDirection.set(-1,0,0).applyQuaternion(m.quaternion);
 e.trailPosition[o]=cePosition.x;e.trailPosition[o+1]=cePosition.y;e.trailPosition[o+2]=cePosition.z;
 e.trailVelocity[o]=c.v.x*.35+ceDirection.x*2;e.trailVelocity[o+1]=c.v.y*.35+ceDirection.y*2;e.trailVelocity[o+2]=c.v.z*.35+ceDirection.z*2;e.trailColor[i]=celebrationAccent(c.color);e.trailLife[i]=e.trailTotal[i]=.25+(i%5)*.025;
}
function updateCelebrations(dt){
 const e=CELEBRATION;if(window.__TEVIN_SERVER__)return;const live=st==='PLAY',goal=st==='GOAL',motion=celebrationMotion(),quiet=RIVAL_PREF.celebration==='quiet';e.clock+=Math.max(0,dt);e.age+=Math.max(0,dt);
 document.body.classList.toggle('goal-presentation',goal&&!!e.key);document.body.classList.toggle('goal-impact',goal&&motion&&!quiet&&e.age<.7);document.body.classList.toggle('boost-thrust',live&&motion&&!!localPlayer().bst);
 if(e.ui){e.ui.el.hidden=!goal||e.age>(motion?2.25:1.7);e.ui.el.classList.toggle('still',!motion||quiet);}if(!e.group)return;e.group.visible=live||goal;if(!e.group.visible){e.trailLife.fill(0);return;}
 let outer=0,core=0;
 if(live)for(let i=0;i<cars.length;i++){
  const c=cars[i],m=cm[i];if(!c.enabled||!c.bst||!m){e.boostClock[i]=0;continue;}
  const flame=motion?1.05+Math.min(1,c.v.length()/23)*.8+Math.sin(e.clock*24+i)*.045:.65;
  for(const side of [-1,1]){
   cePosition.set(-.68,.1,side*.17).applyQuaternion(m.quaternion).add(m.position);ceScale.set(flame,.115,.115);ceMatrix.compose(cePosition,m.quaternion,ceScale);e.boostOuter.setMatrixAt(outer,ceMatrix);e.boostOuter.setColorAt(outer++,ceColor.setHex(celebrationAccent(c.color)));
   ceScale.set(flame*.75,.045,.045);ceMatrix.compose(cePosition,m.quaternion,ceScale);e.boostCore.setMatrixAt(core,ceMatrix);e.boostCore.setColorAt(core++,ceColor.setHex(0xfff1d0));
  }
  e.boostClock[i]=(e.boostClock[i]||0)+dt;let spawned=0;while(motion&&e.boostClock[i]>1/48&&spawned++<2){e.boostClock[i]-=1/48;celebrationTrail(c,m);}
 }
 e.boostOuter.count=outer;e.boostCore.count=core;if(outer){e.boostOuter.instanceMatrix.needsUpdate=e.boostCore.instanceMatrix.needsUpdate=true;e.boostOuter.instanceColor.needsUpdate=e.boostCore.instanceColor.needsUpdate=true;}
 let trail=0;const step=Math.min(.05,Math.max(0,dt));
 for(let i=0;i<96;i++){
  e.trailLife[i]=Math.max(0,e.trailLife[i]-step);if(!motion||!e.trailLife[i])continue;const o=i*3,alpha=e.trailLife[i]/e.trailTotal[i];for(let k=0;k<3;k++)e.trailPosition[o+k]+=e.trailVelocity[o+k]*step;
  cePosition.fromArray(e.trailPosition,o);ceScale.setScalar((.14+(1-alpha)*.15)*alpha);ceMatrix.compose(cePosition,cam.quaternion,ceScale);e.trail.setMatrixAt(trail,ceMatrix);e.trail.setColorAt(trail++,ceColor.setHex(e.trailColor[i]).multiplyScalar(alpha));
 }
 e.trail.count=trail;if(trail){e.trail.instanceMatrix.needsUpdate=e.trail.instanceColor.needsUpdate=true;}
 const intensity=celebrationEnvelope(e.age),exploding=goal&&motion&&!quiet&&intensity>0;
 e.shards.count=exploding?72:0;
 if(exploding){
  for(let i=0;i<72;i++){
   const d=e.shardDirection[i],speed=e.shardSpeed[i],age=Math.min(e.age,2.8);ceDirection.copy(d);ceDirection.z=Math.abs(d.z)*(e.team===0?-1:1);cePosition.copy(e.origin).addScaledVector(ceDirection,speed*age);cePosition.y=Math.max(.08,cePosition.y-age*age*2.5);
   ceDirection.y-=age*.3;ceDirection.normalize();ceRotation.setFromUnitVectors(ceZ,ceDirection);ceScale.set((i%3===0?.075:.035)*intensity,(i%3===0?.075:.035)*intensity,(i%6===0?1.8:.55+(i%7)*.13)*(1-age*.2));ceMatrix.compose(cePosition,ceRotation,ceScale);e.shards.setMatrixAt(i,ceMatrix);e.shards.setColorAt(i,ceColor.setHex(i%5===0?0xfff0c9:e.color).multiplyScalar(intensity));
  }e.shards.instanceMatrix.needsUpdate=e.shards.instanceColor.needsUpdate=true;
 }
 for(let i=0;i<e.rings.length;i++){
  const ring=e.rings[i],age=e.age-i*.12;ring.visible=exploding&&age>=0;if(!ring.visible)continue;const radius=.9+age*(i===1?11:8);ring.position.copy(e.origin);if(i===1){ring.rotation.x=-Math.PI/2;ring.position.y=.09;}else{ring.rotation.x=0;ring.position.z+=(e.team===0?-1:1)*(.15+i*.06);}ring.scale.setScalar(radius);ring.material.color.setHex(i===2?0xffecc6:e.color);ring.material.opacity=intensity*(i===2?.35:.65);
 }
}
