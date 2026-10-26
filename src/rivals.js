// RIVALS 9.6: presentation never writes online authority. Device progress is not a rank.
const RIVAL_PREF={replays:true,markers:true,extraSounds:true,motion:true,celebration:'pulse',title:'ROOKIE'};
const CAREER={matches:0,wins:0,goals:0,touches:0,topSpeed:0,xp:0,drills:0,history:[],presets:[null,null,null]};
try{const p=JSON.parse(localStorage.getItem('tevin.rivals.v1')||'null');if(p){for(const k of ['replays','markers','extraSounds','motion'])if(typeof p.options?.[k]==='boolean')RIVAL_PREF[k]=p.options[k];if(['pulse','comet','quiet'].includes(p.options?.celebration))RIVAL_PREF.celebration=p.options.celebration;for(const k of ['matches','wins','goals','touches','topSpeed','xp','drills'])if(Number.isFinite(p.career?.[k]))CAREER[k]=cl(p.career[k],0,1e9);CAREER.history=Array.isArray(p.career?.history)?p.career.history.filter(h=>h&&typeof h==='object'&&['WIN','LOSS'].includes(h.result)&&[1,2,3].includes(h.size)).slice(0,20):[];CAREER.presets=[0,1,2].map(i=>p.career?.presets?.[i]||null);if(typeof p.options?.title==='string')RIVAL_PREF.title=p.options.title;}}catch(_){}
const RIVALS={time:0,clock:0,ring:[],replay:null,goal:null,touches:[],recorded:false,goalSerial:0,goalSeen:'',messages:[],chatAt:-100,boost:33,fast:false,pickupUntil:0,uiClock:0,visuals:null,queuePractice:false,practiceJob:null};
const DRILL={kind:'free',attempts:0,successes:0,active:false,elapsed:0,touched:false,saved:false,setup:null,hitboxes:false,previousBallZ:0};
const QUICK_CHAT=['I GOT IT!','DEFENDING','NEED BOOST','NICE SHOT!'];
const DRILLS={free:'FREE PLAY',shoot:'SHOOTING',save:'GOALKEEPER',aerial:'AERIAL TOUCH',dribble:'DRIBBLE',wall:'WALL TOUCH',recover:'RECOVERY'};
function saveRivals(){try{localStorage.setItem('tevin.rivals.v1',JSON.stringify({options:RIVAL_PREF,career:CAREER}))}catch(_){} }
function extraCue(key,volume=.28){if(RIVAL_PREF.extraSounds&&!window.__TEVIN_SERVER__)audioSample(key,volume)}
function driverName(id){return id===localPlayer().id?'YOU':MP.active&&MP.seats[id]?MP.seats[id].name||'PLAYER '+(id+1):'AI '+(id+1)}
function earnedTitles(){const list=['ROOKIE'];if(CAREER.drills>=5)list.push('TRAINING GROUND');if(CAREER.goals>=10)list.push('FINISHER');if(CAREER.matches>=10)list.push('ARENA REGULAR');if(CAREER.wins>=10)list.push('MATCH WINNER');return list}
function rivalsStart(){secretReset();RIVALS.claim=null;RIVALS.recorded=false;RIVALS.ring.length=0;RIVALS.goal=null;RIVALS.touches.length=0;RIVALS.goalSeen='';RIVALS.replay=null;RIVALS.messages.length=0;RIVALS.boost=33;RIVALS.fast=false;DRILL.active=false;DRILL.kind='free';DRILL.attempts=DRILL.successes=0;}
function rivalsTouch(c,strength){
 if(DED.replaying)return;
 if(!MP.active||MP.role==='host'){
  const last=RIVALS.touches.at(-1);if(!last||last.id!==c.id)RIVALS.touches.push({id:c.id,team:c.team,time:simTime});else last.time=simTime;
  RIVALS.touches=RIVALS.touches.filter(t=>simTime-t.time<8).slice(-8);
 }
 if(c===localPlayer()){
  if(!window.__TEVIN_SERVER__&&strength>1.5){const e=$('touch-feedback');if(e){e.textContent=strength>15?'POWER HIT':strength>5?'CLEAN TOUCH':'SOFT TOUCH';e.classList.remove('pop');void e.offsetWidth;e.classList.add('pop')}}
  if(sandbox&&!MP.active&&DRILL.active){DRILL.touched=true;if(DRILL.kind==='aerial'&&c.p.y>1.5||DRILL.kind==='wall'&&Math.abs(c.n.y)<.7)finishDrill();}
 }
}
function goalDetails(team){
 const scorer=cars[ball.lastPlayer]?.team===team?ball.lastPlayer:-1;
 const assist=RIVALS.touches.slice().reverse().find(t=>t.team===team&&t.id!==scorer&&simTime-t.time<6);
 return {id:++RIVALS.goalSerial,team,scorer,assist:scorer>=0&&assist?assist.id:-1,speed:Math.round(ball.v.length()*3.6)};
}
function rivalsGoal(info){
 if(!info||!Number.isInteger(info.team)||info.team<0||info.team>1)return;
 RIVALS.goal=info;
 if(window.__TEVIN_SERVER__)return;
 const key=MP.round+':'+score.join(':');if(RIVALS.goalSeen===key)return;RIVALS.goalSeen=key;triggerCelebration(info);
 const e=$('goal-detail');if(e){e.textContent=(info.team?'ORANGE':'BLUE')+' GOAL · '+(info.scorer>=0?driverName(info.scorer):'OWN GOAL')+(info.assist>=0?' · ASSIST '+driverName(info.assist):'')+' · '+info.speed+' KM/H';e.style.setProperty('--goal-color',teamHex(info.team));e.hidden=false;}
 if(sandbox&&DRILL.active&&DRILL.kind==='shoot'&&DRILL.touched&&info.team===0)finishDrill();
 if(RIVAL_PREF.replays&&!sandbox&&RIVALS.ring.length>=12){const frames=RIVALS.ring.slice(-240);frames.push(captureReplayFrame(null,Math.max(DED.active?(Number.isFinite(RIVALS.replayStamp)?RIVALS.replayStamp:frames.at(-1).t+DT):RIVALS.time,frames.at(-1).t+DT)));RIVALS.replay={frames,elapsed:-PRESENTATION_TIMING.replayDelay,duration:Math.max(.1,frames.at(-1).t-frames[0].t),wallStart:performance.now()+PRESENTATION_TIMING.replayDelay*1000,scorer:info.scorer,focusCar:info.scorer>=0?info.scorer:Math.max(0,ball.lastPlayer),team:info.team};planGoalReplay(RIVALS.replay);$('replay-controls').hidden=false;}
 if(DED.active){goalPulse=1;const col=teamPalette[info.team];graphicsBurst(ball.p,28,col);}
}
function stopReplay(){document.body.classList.remove('cinema-replay');if(RIVALS.replay){if(RIVALS.replay.started)presentSceneCut('live');cameraAnchorReady=false;}RIVALS.replay=null;if($('replay-controls'))$('replay-controls').hidden=true;}
function replayRecord(snapshot,time=RIVALS.time){
 if(window.__TEVIN_SERVER__||!RIVAL_PREF.replays||sandbox||st!=='PLAY')return;
 const frame=captureReplayFrame(snapshot,time);
 RIVALS.ring.push(frame);if(RIVALS.ring.length>240)RIVALS.ring.shift();
}
function renderGoalReplay(dt){
 const r=RIVALS.replay;if(!r||st!=='GOAL'||MP.localPaused)return false;r.elapsed=Math.max(r.elapsed+dt,(performance.now()-r.wallStart)/1000);if(r.elapsed>-.18&&!r.wipe){r.wipe=true;presentSceneCut('replay');}if(r.elapsed<0)return false;if(!r.started){r.started=true;resetViewFade();}
 const time=replayPlaybackTime(r);let a=r.frames[0],b=a;
 for(let i=1;i<r.frames.length;i++){b=r.frames[i];if(b.t>=time)break;a=b}
 const f=cl((time-a.t)/Math.max(.001,b.t-a.t),0,1);
 for(let i=0;i<cm.length;i++){const m=cm[i];m.visible=cars[i].enabled;if(!a.cars[i]||!b.cars[i])continue;m.position.fromArray(a.cars[i].p).lerp(replayPose.fromArray(b.cars[i].p),f);m.quaternion.fromArray(a.cars[i].q).slerp(replayRotation.fromArray(b.cars[i].q),f);if(m.userData.f)m.userData.f.visible=false;}
 bm.visible=true;bm.position.fromArray(a.ball).lerp(replayPose.fromArray(b.ball),f);const direction=positionReplayCamera(r);document.body.classList.toggle('cinema-replay',cinemaMotion());updateWind(dt*(direction.slow?.22:1));
 pts.count=0;if(FX)FX.group.visible=false;contactShadows.forEach(s=>s.visible=false);if(RIVALS.visuals)RIVALS.visuals.group.visible=false;$('flash').style.opacity=0;updateCelebrations(dt);pipeline.render();
 $('replay-label').textContent=direction.slow?'FINAL TOUCH · SLOW MOTION':direction.ballFocus>.5?'GOAL REPLAY · FOLLOW THE SHOT':'GOAL REPLAY · THE APPROACH';if(r.elapsed>PRESENTATION_TIMING.replayDuration)stopReplay();return true;
}
function rivalsFinish(){
 if(window.__TEVIN_SERVER__||sandbox||RIVALS.recorded||!score.every(Number.isFinite)||score[0]===score[1])return;
 RIVALS.recorded=true;const c=localPlayer(),won=score[c.team]>score[1-c.team],xp=100+(won?50:0)+Math.min(100,c.goals*20);CAREER.matches++;CAREER.wins+=won?1:0;CAREER.goals+=c.goals;CAREER.touches+=c.touches;CAREER.topSpeed=Math.max(CAREER.topSpeed,c.topSpeed*3.6);CAREER.xp+=xp;
 CAREER.history.unshift({at:new Date().toISOString(),mode:cfg.mode?'Heatseeker':'Soccar',size:cfg.size,online:MP.active,result:won?'WIN':'LOSS',score:score.join('–'),goals:c.goals});CAREER.history.length=Math.min(CAREER.history.length,20);saveRivals();renderCareer();
 if($('earned-progress'))$('earned-progress').textContent='+'+xp+' LOCAL XP · LEVEL '+(1+Math.floor(CAREER.xp/500))+' · '+earnedTitles().at(-1);
}
function finishDrill(){if(!DRILL.active||DRILL.saved)return;DRILL.saved=true;DRILL.successes++;CAREER.drills++;CAREER.xp+=10;saveRivals();extraCue('rivalProgress');$('drill-status').textContent='SUCCESS · '+DRILLS[DRILL.kind]+' · Press R to repeat';}
function trainingSetup(kind,repeat=false){
 if(!sandbox||MP.active||!['PLAY','PAUSE','COUNT','GOAL'].includes(st)||!DRILLS[kind])return false;
 stopReplay();mpClearInput();if(st==='PAUSE')pause();st='PLAY';mt=0;$('msg').style.opacity=0;const c=localPlayer();DRILL.kind=kind;DRILL.elapsed=DRILL.hold=0;DRILL.touched=DRILL.saved=false;DRILL.active=kind!=='free';if(!repeat)DRILL.attempts=DRILL.successes=0;DRILL.attempts++;
 resetCar(c,0,-22);c.q.setFromAxisAngle(Y3,-Math.PI/2);c.prevQ.copy(c.q);c.frameQ.copy(c.q);c.boost=100;
 ball.p.set(0,BR,-10);ball.v.set(0,0,0);ball.w.set(0,0,0);ball.last=ball.lastPlayer=-1;ball.color=0xdceeff;heat.target=0;heat.speed=18;heat.cooldown=0;heat.server=-1;
 if(kind==='save'){resetCar(c,0,-43);c.q.setFromAxisAngle(Y3,-Math.PI/2);ball.p.set(4,2,-14);ball.v.set(-1.5,.5,-17);}
 if(kind==='aerial'){ball.p.set(0,5,-3);ball.v.set(0,3,0);}
 if(kind==='dribble'){ball.p.set(c.p.x,c.p.y+bodyPhysics(c).center[1]+bodyPhysics(c).half[1]+BR+.04,c.p.z);}
 if(kind==='wall'){resetCar(c,30,-15);c.q.identity();ball.p.set(36,2,-15);ball.v.set(2,4,0);}
 if(kind==='recover'){c.p.y=4;c.q.setFromAxisAngle(new V3(1,0,0),Math.PI*.7);c.v.set(4,0,5);ball.p.set(0,BR,0);}
 if(kind==='free'){DRILL.attempts=0;ball.p.set(0,BR,0)}
 c.prevP.copy(c.p);c.frameP.copy(c.p);c.prevQ.copy(c.q);c.frameQ.copy(c.q);ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);cameraAnchorReady=false;acc=0;DRILL.previousBallZ=ball.p.z;
 // Explicit practice roster, restored by the normal match configuration on exit.
 cfg.allies=cfg.enemies=0;for(const other of cars)other.enabled=other===c;trainingLabels();extraCue('rivalDrill');$('drill-status').textContent=DRILLS[kind]+' · R REPEAT · F2 CHANGE DRILL';return true;
}
function trainingTick(dt){
 if(!sandbox||MP.active||st!=='PLAY'||!DRILL.active||DRILL.saved)return;DRILL.elapsed+=dt;
 const c=localPlayer();if(DRILL.kind==='recover'&&c.ground&&c.n.y>.8&&DRILL.elapsed>.5)finishDrill();
 if(DRILL.kind==='save'&&DRILL.touched&&ball.v.z>2&&ball.p.z>-HZ+2)finishDrill();
 if(DRILL.kind==='dribble'&&ball.p.y>c.p.y+.8&&Math.hypot(ball.p.x-c.p.x,ball.p.z-c.p.z)<1.5){DRILL.hold=(DRILL.hold||0)+dt;if(DRILL.hold>3)finishDrill()}else DRILL.hold=0;
 if(!DRILL.saved)$('drill-status').textContent=DRILLS[DRILL.kind]+' · '+DRILL.successes+'/'+DRILL.attempts+' COMPLETE · '+DRILL.elapsed.toFixed(1)+'s · R REPEAT';
}
function cameraBallTarget(carPos,ballPos,out){
 // Limit upward aim to the angular space that still contains the car at close range.
 out.copy(ballPos).sub(carPos);const horizontal=Math.hypot(out.x,out.z);if(horizontal>14){out.x*=14/horizontal;out.z*=14/horizontal;}
 out.y=cl(out.y,-1.1-Math.min(horizontal,14)*.7,1.3+Math.min(horizontal,14)*.38);return out.add(carPos);
}
function createRivalVisuals(){
 $('driver-markers').replaceChildren();const group=new THREE.Group();group.name='Readable match aids';scene.add(group);
 const ring=new THREE.Mesh(new THREE.RingGeometry(BR*.9,BR*1.04,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xe0f9ff,transparent:true,opacity:.7,depthWrite:false,toneMapped:false}));group.add(ring);
 const pulse=new THREE.Mesh(new THREE.RingGeometry(.94,1,48).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));group.add(pulse);
 const box=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:0x6dffbe,transparent:true,opacity:.85,depthTest:false}));group.add(box);
 const labels=cars.map(c=>{const el=document.createElement('span');el.className='driver-marker';$('driver-markers').appendChild(el);return el});
 RIVALS.visuals={group,ring,pulse,box,labels,project:new V3()};
}
function updateRivalVisuals(dt){
 const v=RIVALS.visuals;if(!v)return;while(v.labels.length<cars.length){const el=document.createElement('span');el.className='driver-marker';$('driver-markers').appendChild(el);v.labels.push(el)}v.group.visible=st!=='MENU'&&st!=='END';const p=bm.position;
 v.ring.visible=RIVAL_PREF.markers&&Math.abs(p.x)<HX-3&&Math.abs(p.z)<HZ-3;v.ring.position.set(p.x,.035,p.z);v.ring.scale.setScalar(1+Math.min(8,Math.max(0,p.y-BR))*.035);v.ring.material.color.setHex(ball.last>=0?teamPalette[ball.last]:0xe0f9ff);
 v.box.visible=sandbox&&!MP.active&&DRILL.hitboxes;const c=localPlayer(),body=bodyPhysics(c);v.box.position.fromArray(body.center).applyQuaternion(c.q).add(cm[c.id].position);v.box.quaternion.copy(c.q);v.box.scale.set(body.half[0]*2,body.half[1]*2,body.half[2]*2);
 v.pulse.visible=goalPulse>.01&&RIVAL_PREF.celebration!=='quiet';if(v.pulse.visible){v.pulse.position.set(0,.055,RIVALS.goal?.team===0?HZ-3:-HZ+3);v.pulse.scale.setScalar(2+(1-goalPulse)*24);v.pulse.material.color.setHex(teamPalette[RIVALS.goal?.team||0]);v.pulse.material.opacity=goalPulse*.65;}
 // Follow interpolated meshes using the final camera on every rendered frame.
 cam.updateMatrixWorld();for(let i=0;i<cars.length;i++){
 const other=cars[i],el=v.labels[i];if(!el)continue;
 el.hidden=!(RIVAL_PREF.markers&&other.enabled&&other!==c&&st==='PLAY'&&positionDriverTag(el,cm[i].position,cam,v.project,innerWidth,innerHeight));
 if(!el.hidden){const name=driverName(i),relation=other.team===c.team?'ally':'rival';if(el.textContent!==name)el.textContent=name;el.dataset.relation=relation;const color=paintHex(other.color);if(el.dataset.paint!==color){el.dataset.paint=color;el.style.setProperty('--tag-color',color);el.style.color='#f3f8ff';}el.setAttribute('aria-label',relation+' '+name);}
 }
}
function receiveQuickChat(m){if(!QUICK_CHAT.includes(m.text))return;RIVALS.messages.push({name:String(m.name||'PLAYER').slice(0,20),text:m.text,until:RIVALS.time+6});if(RIVALS.messages.length>4)RIVALS.messages.shift();extraCue('rivalChat',.18);}
function sendQuickChat(index){
 if(!['PLAY','COUNT'].includes(st)||!QUICK_CHAT[index]||RIVALS.time-RIVALS.chatAt<1.2)return;RIVALS.chatAt=RIVALS.time;
 if(DED.active)dedSend({type:'chat',phrase:index});else{receiveQuickChat({name:'YOU',text:QUICK_CHAT[index]});if(!MP.active){for(const c of cars)if(c.enabled&&c.team===localPlayer().team&&c!==localPlayer())c.ai.yieldUntil=index===0?simTime+2:0;}}
}
function rivalsTick(dt){
 secretTick();syncCinema();RIVALS.time+=dt;trainingTick(dt);if(st!=='GOAL'){stopReplay();if($('goal-detail'))$('goal-detail').hidden=true;}if(st!=='PLAY'){for(const el of RIVALS.visuals?.labels||[])el.hidden=true;if(RIVALS.visuals)RIVALS.visuals.group.visible=false;}
 if(!DED.active&&st==='PLAY'&&(RIVALS.clock+=dt)>=1/30){RIVALS.clock%=1/30;replayRecord();}
 const c=localPlayer();if($('rival-title').textContent!==RIVAL_PREF.title)$('rival-title').textContent=RIVAL_PREF.title;if(st==='PLAY'){
  if(c.boost-RIVALS.boost>5){RIVALS.pickupUntil=RIVALS.time+.65;$('boost-feedback').textContent='+'+Math.round(c.boost-RIVALS.boost)+' BOOST'}RIVALS.boost=c.boost;
  const fast=c.v.length()>=PHYS.car.maxSpeed*.95;$('speed-streak').classList.toggle('active',fast&&RIVAL_PREF.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches);RIVALS.fast=fast;
 }else $('speed-streak').classList.remove('active');
 $('boost-feedback').hidden=RIVALS.time>RIVALS.pickupUntil||st!=='PLAY';$('quick-chat').hidden=!['PLAY','COUNT'].includes(st);$('drill-status').hidden=!sandbox||MP.active||st==='MENU';
 RIVALS.messages=RIVALS.messages.filter(m=>m.until>RIVALS.time);const log=$('chat-log');const content=RIVALS.messages.map(m=>m.name+': '+m.text).join('\n');if(log.textContent!==content)log.textContent=content;
 if($('queue-practice'))$('queue-practice').hidden=!SOC.searching||MP.active;
 if($('practice-queue-status')){$('practice-queue-status').hidden=!RIVALS.queuePractice;$('practice-queue-status').textContent=SOC.searching?'SEARCHING FOR PLAYERS · Practice while you wait':'SEARCH ENDED · Free play';}
}
function renderCareer(){
 const e=$('career-summary');if(!e)return;e.textContent='LEVEL '+(1+Math.floor(CAREER.xp/500))+' · '+CAREER.xp+' XP · '+CAREER.matches+' MATCHES · '+CAREER.wins+' WINS · '+CAREER.goals+' GOALS · '+CAREER.drills+' DRILLS';
 const list=$('career-history');list.replaceChildren();for(const h of CAREER.history.slice(0,5)){const p=document.createElement('p');p.textContent=h.result+' '+h.score+' · '+h.mode+' '+h.size+'v'+h.size+' · '+(h.online?'ONLINE':'VS AI');list.appendChild(p)}
 const titles=$('driver-title');titles.replaceChildren();for(const name of earnedTitles()){const o=document.createElement('option');o.value=o.textContent=name;titles.appendChild(o)}if(!earnedTitles().includes(RIVAL_PREF.title))RIVAL_PREF.title='ROOKIE';titles.value=RIVAL_PREF.title;
 for(let i=0;i<3;i++)$('preset-load-'+i).textContent=CAREER.presets[i]?'LOAD '+CAREER.presets[i].name:'EMPTY SLOT '+(i+1);
}
function garagePreset(index,save){
 if(MP.active||SOC.searching)return false;
 if(save){CAREER.presets[index]={name:BODY_NAMES[cfg.body]+' / '+paintName(cfg),body:cfg.body,color:cfg.color,paint:normalizedPaint(cfg.paint),celebration:RIVAL_PREF.celebration};saveRivals();extraCue('rivalDrill');}
 else{const p=CAREER.presets[index];if(!p||!Number.isInteger(p.body)||p.body<0||p.body>2||!Number.isInteger(p.color)||p.color<0||p.color>7)return false;cfg.body=p.body;cfg.color=p.color;cfg.paint=normalizedPaint(p.paint);RIVAL_PREF.celebration=['pulse','comet','quiet'].includes(p.celebration)?p.celebration:'pulse';configureCars();savePresentation();saveRivals();syncMenuSettings();for(const [i,b] of Array.from($('body-options').children).entries())b.setAttribute('aria-pressed',String(cfg.body===i));$('swatches').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',cfg.color===i));$('paint-name').textContent=paintName(cfg);updateMatchSummary();if(inited){refreshCarModels();paintCar(0)}$('garage-status').textContent=BODY_NAMES[cfg.body]+' · '+paintName(cfg)+(inited?' · READY':'');$('goal-style').value=RIVAL_PREF.celebration;syncPaintUI();}
 renderCareer();return true;
}
async function queuePractice(){
 if(!SOC.searching||MP.active||starting||LOADING.active)return;
 RIVALS.queuePractice=true;sandbox=true;const allies=cfg.allies,enemies=cfg.enemies;cfg.allies=cfg.enemies=0;
 RIVALS.practiceJob=startGame();try{const ready=await RIVALS.practiceJob;if(!ready){RIVALS.queuePractice=false;sandbox=false;return}if(!MP.active){trainingSetup('free');}}finally{RIVALS.practiceJob=null;cfg.allies=allies;cfg.enemies=enemies;}
}
function setupRivals(){
 for(const [id,key] of [['option-replays','replays'],['option-markers','markers'],['option-motion','motion'],['option-cues','extraSounds']]){const el=$(id);el.checked=RIVAL_PREF[key];el.onchange=()=>{RIVAL_PREF[key]=el.checked;saveRivals()};}
 $('goal-style').value=RIVAL_PREF.celebration;$('goal-style').onchange=()=>{RIVAL_PREF.celebration=$('goal-style').value;saveRivals()};$('driver-title').onchange=()=>{RIVAL_PREF.title=$('driver-title').value;saveRivals()};
 for(let i=0;i<3;i++){$('preset-save-'+i).onclick=()=>garagePreset(i,true);$('preset-load-'+i).onclick=()=>garagePreset(i,false)}
 for(const [kind,name] of Object.entries(DRILLS)){const b=document.createElement('button');b.textContent=name;b.onclick=()=>trainingSetup(kind);$('drill-list').appendChild(b)}
 $('drill-repeat').onclick=()=>trainingSetup(DRILL.kind,true);$('training-hitbox').onchange=()=>DRILL.hitboxes=$('training-hitbox').checked;
 $('skip-replay').onclick=stopReplay;for(let i=0;i<4;i++)$('chat-'+i).onclick=()=>sendQuickChat(i);
 $('queue-practice').onclick=queuePractice;
 const presets={balanced:{...CAMERA_DEFAULTS},wide:{fov:110,distance:3.5,height:1.35,angle:5,stiffness:.45,shake:false},close:{fov:100,distance:2.4,height:1,angle:4,stiffness:.75,shake:false}};
 for(const [id,preset] of Object.entries(presets))$('camera-preset-'+id).onclick=()=>{Object.assign(cameraSettings,preset);saveControls();document.querySelector('.driver-settings')?.remove();setupDriverSettings();};
 $('export-progress').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,career:CAREER},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tevin-local-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 $('reset-progress').onclick=()=>{$('reset-progress-confirm').hidden=false};$('reset-progress-confirm').onclick=()=>{for(const key of ['matches','wins','goals','touches','topSpeed','xp','drills'])CAREER[key]=0;CAREER.history=[];RIVAL_PREF.title='ROOKIE';saveRivals();renderCareer();$('reset-progress-confirm').hidden=true;};
 addEventListener('keydown',e=>{if(e.repeat||['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target?.tagName)||bindingCapture)return;if(/^Digit[1-4]$/.test(e.code)&&!Object.values(bindings).includes(e.code))sendQuickChat(Number(e.code.slice(-1))-1);});renderCareer();
}

function readHeatState(value){
 if(!value||![-1,0,1].includes(value.target)||!Number.isFinite(value.speed)||value.speed<18||value.speed>42||!Number.isFinite(value.cooldown)||value.cooldown<0||value.cooldown>1)return false;
 heat.target=value.target;heat.speed=value.speed;heat.cooldown=value.cooldown;return true;
}
function predictLocalBall(dt){
 const c=localPlayer();c.sweepEnd.copy(c.p);c.sweepQ.copy(c.q);
 const n=Math.min(8,Math.max(1,Math.ceil(Math.max(ball.v.length(),ball.v.distanceTo(c.v)+c.w.length()*1.2)*dt/PHYS.ball.sub)));
 for(let i=1;i<=n;i++){c.p.lerpVectors(c.prevP,c.sweepEnd,i/n);c.q.copy(c.prevQ).slerp(c.sweepQ,i/n);ballSub(dt/n,true)}c.p.copy(c.sweepEnd);c.q.copy(c.sweepQ);resolveArenaCar(c);
}
const SERIES={bestOf:1,wins:[0,0],winner:-1,counted:false};
function seriesStart(fresh=false){if(fresh||SERIES.winner>=0||SERIES.bestOf!==cfg.series){SERIES.bestOf=cfg.series||1;SERIES.wins=[0,0];SERIES.winner=-1;}SERIES.counted=false;}
function seriesFinish(){if(MP.active&&MP.role==='guest'||SERIES.counted||score[0]===score[1])return;SERIES.counted=true;const t=score[0]>score[1]?0:1;SERIES.wins[t]++;if(SERIES.wins[t]>SERIES.bestOf/2)SERIES.winner=t;}
function updateRematchUI(){
 const owner=!DED.active||DED.owner===MP.session;$('rm').disabled=DED.active&&!MP.quick&&!owner;
 $('rm').textContent=MP.quick?'CHOOSE NEXT MATCH':!owner?'WAITING FOR LEADER':SERIES.bestOf>1&&SERIES.winner<0?'NEXT GAME IN SERIES':SERIES.bestOf>1?'NEW SERIES':'REMATCH';
 const e=$('series-result');if(e){e.hidden=SERIES.bestOf<=1;e.textContent='BEST OF '+SERIES.bestOf+' · BLUE '+SERIES.wins[0]+' — '+SERIES.wins[1]+' ORANGE'+(SERIES.winner>=0?' · '+(SERIES.winner?'ORANGE':'BLUE')+' WINS SERIES':'');}
}
function respectTeamClaim(c){
 const claim=RIVALS.claim;if(claim&&claim.until>simTime&&c.team===claim.team&&c.id!==claim.slot&&c.p.distanceTo(ball.p)>4){c.ai.mode='SUPPORT';const atk=c.team?-1:1;c.ai.target.set(cl(ball.p.x+(ball.p.x>0?-9:9),-26,26),0,cl(ball.p.z-atk*14,-42,42));}
 if(c.ai.yieldUntil>simTime&&c.p.distanceTo(ball.p)>4){c.ai.mode='SUPPORT';c.ai.target.set(cl(ball.p.x+(c.id%3-1)*8,-26,26),0,cl(ball.p.z+(c.team?14:-14),-42,42));}
}
function animateArenaAccents(dt){
 if(!RIVAL_PREF.motion||matchMedia('(prefers-reduced-motion: reduce)').matches)return;RIVALS.arenaClock=(RIVALS.arenaClock||0)+dt;if(RIVALS.arenaClock<.1)return;RIVALS.arenaClock=0;
 for(let i=0;i<(RIVALS.trim?.length||0);i++)RIVALS.trim[i].color.setHex(teamPalette[i]).multiplyScalar(1+.08*Math.sin(RIVALS.time*1.1+i)+goalPulse*.4);
 const crowd=RIVALS.crowd;if(crowd){const data=crowd.mesh.instanceMatrix.array;for(let i=0;i<crowd.mesh.count;i++)data[i*16+13]=crowd.y[i]+Math.sin(RIVALS.time*2.2+i*.41)*(.025+goalPulse*.14);crowd.mesh.instanceMatrix.needsUpdate=true;}
}
