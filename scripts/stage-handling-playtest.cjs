'use strict';
// Developer-only initial-pose controls, camera isolation and native-input trace.
// This script never changes a production source file or synthesizes a trajectory.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const input=path.resolve(process.argv[2]||'index.html');
const output=path.resolve(process.argv[3]||'../../outputs/handling-play-current.html');
let html=fs.readFileSync(input,'utf8');
html=html.replace('</head>','<style>body.handling-captured #pause{visibility:hidden!important;pointer-events:none!important}</style></head>');
const code=String.raw`
window.__NIVET_CONTROL_TRACE__=true;
const HANDLING_REVIEW={scenario:'ordinary match',cameraMode:'ball',ticks:[],frames:[],recording:false,stopReason:'not started',lastFrame:0,maxTicks:960,elapsed:0,initial:null,inputPlan:'native keyboard',cameraFrames:[]};
const handlingDirection=new V3(),handlingRight=new V3(),handlingWorldAngular=new V3(),handlingCameraTarget=new V3();
function handlingState(c){
 const forward=new V3(1,0,0).applyQuaternion(c.q),up=new V3(0,1,0).applyQuaternion(c.q),normal=c.n.clone();
 const tangent=forward.clone().addScaledVector(normal,-forward.dot(normal));if(tangent.lengthSq()>.000001)tangent.normalize();
 const right=new V3().crossVectors(tangent,normal);if(right.lengthSq()>.000001)right.normalize();
 // Keep both angular representations visible. The state-derived estimate uses
 // the controller's current supported/unsupported representation; the analyzer
 // independently derives actual rotation from consecutive quaternions.
 const localWorldAngular=c.w.clone().applyQuaternion(c.q),groundYawAngular=normal.clone().multiplyScalar(-c.wy),worldAngular=c.ground?groundYawAngular:localWorldAngular;
 const flat=forward.clone();flat.y=0;if(flat.lengthSq()>.000001)flat.normalize();const toward=ball.p.clone().sub(c.p);toward.y=0;
 return{p:c.p.toArray(),q:c.q.toArray(),v:c.v.toArray(),w:c.w.toArray(),wy:c.wy,worldAngular:worldAngular.toArray(),localWorldAngular:localWorldAngular.toArray(),groundYawAngular:groundYawAngular.toArray(),normal:normal.toArray(),forward:forward.toArray(),up:up.y,alignment:up.dot(normal),forwardSpeed:c.v.dot(tangent),lateralSpeed:c.v.dot(right),normalSpeed:c.v.dot(normal),heading:Math.atan2(forward.z,forward.x),ballAngle:toward.lengthSq()>.000001?Math.acos(cl(flat.dot(toward.normalize()),-1,1)):0,ground:!!c.ground,wasSupport:!!c.wasG,wheels:c.wheelsOn||0,hull:c.hullContact||0,clearance:c.clearance??null,penetration:carPenetration(c),jump:c.canJ,dodge:c.canD,jumpEdge:c.jp,jumpHeld:c.jh,jumpLock:c.jl,airTime:c.aT,dodgeTime:c.dT,handbrake:c.handbrake||0,grip:c.grip,touches:c.touches,boost:c.boost,input:{...c.inp},ball:{p:ball.p.toArray(),v:ball.v.toArray(),w:ball.w.toArray()}};
}
function handlingTrace(c){
 const trace=typeof vehicleTraceFrame==='function'?vehicleTraceFrame(c):c.controlTrace;
 if(trace)return{...trace,input:{...trace.input},interpretation:'instrumented production controller'};
 const branch=c.ground?'stable':c.autoFlipTime>0?'auto-flip':c.dT>0?'dodge':c.wheelsOn?'partial-legacy-inferred':c.hullContact?'hull':'air';
 return{branch,wheels:c.wheelsOn||0,ground:!!c.ground,normal:c.n.toArray(),input:{...c.inp},wy:c.wy,v:c.v.toArray(),w:c.w.toArray(),jumpLock:c.jl,dodgeTime:c.dT,interpretation:'legacy branch inferred from serialized state; source has no control tracer'};
}
function handlingSummary(){const r=HANDLING_REVIEW,c=localPlayer();return{build:BUILD,scenario:r.scenario,cameraMode:r.cameraMode,phase:st,recording:r.recording,stopReason:r.stopReason,ticks:r.ticks.length,simulationSeconds:r.elapsed,initial:r.initial,current:handlingState(c),camera:cam?{p:cam.position.toArray(),q:cam.quaternion.toArray(),fov:cam.fov}:null,cameraSettings:{...cameraSettings},buffer:ren?[ren.domElement.width,ren.domElement.height]:null,viewport:[innerWidth,innerHeight],quality:cfg.hi?'Detail':'Chromebook',inputPlan:r.inputPlan};}
function writeHandlingReview(full=false){
 const summary=handlingSummary();let report=document.getElementById('handling-report');if(report)report.textContent=JSON.stringify(summary);
 if(full){let history=document.getElementById('handling-history');if(!history){history=document.createElement('output');history.id='handling-history';history.hidden=true;document.body.append(history);}history.textContent=JSON.stringify({summary,ticks:HANDLING_REVIEW.ticks,frames:HANDLING_REVIEW.frames,cameraFrames:HANDLING_REVIEW.cameraFrames});history.dataset.complete='true';}
}
function captureHandlingReview(reason='manual capture'){
 const r=HANDLING_REVIEW;r.recording=false;r.stopReason=reason;if(st==='PLAY'||st==='COUNT'||st==='GOAL')pause();document.body.classList.add('handling-captured');writeHandlingReview(true);
}
const handlingSim=sim;
sim=function(dt){
 const r=HANDLING_REVIEW,c=localPlayer(),record=r.recording&&st==='PLAY',before=record?handlingState(c):null;
 handlingSim(dt);if(!record)return;
 r.elapsed+=dt;r.ticks.push({tick:r.ticks.length,time:r.elapsed,dt,phase:st,pre:before,post:handlingState(c),trace:handlingTrace(c),keyboard:{w:!!keys.w,a:!!keys.a,s:!!keys.s,d:!!keys.d,shift:!!keys.shift,slide:!!keys.control,jump:!!keys[' '],q:!!keys.q,e:!!keys.e}});
 if(r.ticks.length>=r.maxTicks)captureHandlingReview('automatic eight-second capture');
};
function handlingCameraMode(mode){HANDLING_REVIEW.cameraMode=mode;ballCam=mode==='car'?0:1;cameraAnchorReady=false;const e=document.getElementById('handling-camera');if(e)e.value=mode;const tag=$('camtag');if(tag)tag.textContent=mode==='diagnostic'?'STABLE DIAGNOSTIC':mode==='car'?'CAR CAM · B':'BALL CAM · B';}
function handlingDiagnosticCamera(){
 if(typeof HANDLING_REVIEW==='undefined'||HANDLING_REVIEW.cameraMode!=='diagnostic'||!cam||!cm[localPlayer().id]||!['PLAY','COUNT','GOAL'].includes(st))return;
 // Position follows rendered translation only. The fixed world-space offset and
 // aim have no dependency on vehicle quaternion, support class or ball heading.
 const p=cm[localPlayer().id].position;cam.position.set(p.x+6,p.y+5,p.z-8);handlingCameraTarget.copy(p);handlingCameraTarget.y+=.25;cam.lookAt(handlingCameraTarget);
 if(typeof gameplayVerticalFov==='function')cam.fov=gameplayVerticalFov(cameraSettings.fov);cam.updateProjectionMatrix();
 if(typeof setCameraCarOpacity==='function')setCameraCarOpacity(cm[localPlayer().id],1);
}
function prepareHandlingReview(name){
 if(!inited||LOADING.active)return;document.body.classList.remove('handling-captured');finishOpening();clearCelebration();clearMatchEffects();resetMatchPresentation();stopReplay();sandbox=true;DRILL.active=false;st='PLAY';cnt=mt=0;cfg.unlimited=false;$('menu').hidden=true;$('hud').style.display='block';$('pause').classList.remove('on');$('msg').style.opacity=0;
 for(const key in keys)keys[key]=0;for(const car of cars){car.enabled=car.id===0;resetCar(car,0,-26);}
 const c=localPlayer();c.q.setFromAxisAngle(Y3,-Math.PI/2);c.p.set(0,bodyPhysics(c).height+.015,-26);c.v.set(0,0,0);c.n.set(0,1,0);c.ground=c.wasG=1;c.wheelsOn=4;c.boost=100;c.touches=0;ball.p.set(-28,BR,32);ball.v.set(0,0,0);ball.w.set(0,0,0);ball.last=-1;ball.hit=ball.hitT=0;
 if(name==='SLIDE / TURN')c.v.z=12;
 if(name==='JUMP / LAND')c.v.z=8;
 if(name==='FLIP / TURN'){c.p.z=-24;c.v.z=10;ball.p.set(8,BR,18);}
 if(name==='WALL / FIELD'){c.p.set(HX-bodyPhysics(c).height-.015,9,0);c.q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3(0,-1,0),new V3(-1,0,0),new V3(0,0,-1)));c.n.set(-1,0,0);c.v.set(0,-8,0);ball.p.set(20,BR,12);}
 if(name==='BALL / SECOND'){c.p.z=-10;ball.p.set(0,BR,0);}
 if(name==='RAMP / UP'){c.p.set(28,bodyPhysics(c).height+.015,0);c.q.identity();c.v.set(8,0,0);ball.p.set(20,BR,12);}
 if(name==='SIDE LANDING'){c.p.set(0,1,-26);c.q.setFromEuler(new THREE.Euler(.25,-Math.PI/2,.12));c.v.set(0,-3,8);c.w.set(0,0,0);c.ground=c.wasG=0;}
 if(typeof sampleCarSupport==='function')sampleCarSupport(c);
 for(const car of cars){car.frameP.copy(car.p);car.prevP.copy(car.p);car.frameQ.copy(car.q);car.prevQ.copy(car.q);}ball.frameP.copy(ball.p);ball.prevP.copy(ball.p);cameraAnchorReady=false;
 const r=HANDLING_REVIEW;r.scenario=name;r.ticks=[];r.frames=[];r.cameraFrames=[];r.elapsed=0;r.lastFrame=0;r.initial=handlingState(c);r.recording=true;r.stopReason='recording';writeHandlingReview();
 const old=document.getElementById('handling-history');if(old){old.dataset.complete='false';old.textContent='';}
}
function handlingFrameProbe(t){const r=HANDLING_REVIEW;if(r.recording){if(r.lastFrame)r.frames.push(t-r.lastFrame);r.lastFrame=t;if(cam&&r.cameraFrames.length<1200)r.cameraFrames.push({time:r.elapsed,p:cam.position.toArray(),q:cam.quaternion.toArray(),fov:cam.fov});}requestAnimationFrame(handlingFrameProbe);}requestAnimationFrame(handlingFrameProbe);
setInterval(()=>{
 let panel=document.getElementById('handling-controls');if(!panel){panel=document.createElement('aside');panel.id='handling-controls';panel.style.cssText='position:fixed;z-index:500;top:145px;left:6px;display:grid;grid-template-columns:repeat(2,86px);gap:3px;padding:4px;font:10px monospace;background:#10202cdd';
  for(const name of ['DRIVE / REVERSE','SLIDE / TURN','JUMP / LAND','FLIP / TURN','WALL / FIELD','BALL / SECOND','RAMP / UP','SIDE LANDING']){const b=document.createElement('button');b.textContent=name;b.style.cssText='font:10px monospace;padding:7px 2px;color:white;background:#243748;border:1px solid #8ab1c055';b.onclick=()=>prepareHandlingReview(name);panel.append(b);}
  const camera=document.createElement('select');camera.id='handling-camera';camera.setAttribute('aria-label','Handling test camera');camera.style.cssText='grid-column:span 2;font:11px monospace;padding:6px;background:#172d40;color:white';for(const[name,label]of[['ball','BALL CAMERA'],['car','CAR CAMERA'],['diagnostic','STABLE DIAGNOSTIC']]){const option=document.createElement('option');option.value=name;option.textContent=label;camera.append(option);}camera.onchange=()=>handlingCameraMode(camera.value);panel.append(camera);
  const capture=document.createElement('button');capture.textContent='CAPTURE / PAUSE';capture.id='handling-capture';capture.style.cssText='grid-column:span 2;padding:8px;background:#34566a;color:white';capture.onclick=()=>captureHandlingReview();panel.append(capture);document.body.append(panel);
  const report=document.createElement('output');report.id='handling-report';report.style.cssText='position:fixed;bottom:2px;left:210px;max-width:650px;max-height:95px;overflow:hidden;z-index:500;background:#000b;color:#fff;font:10px monospace;pointer-events:none';document.body.append(report);
 }
 if(HANDLING_REVIEW.recording&&st==='PAUSE')captureHandlingReview('native pause');else writeHandlingReview();
},125);
`;
if(!html.includes('window.tevinDiagnostics=()=>'))throw Error('Playtest insertion marker missing');
if(!html.includes('updateStadiumShadow();pipeline.render();'))throw Error('Diagnostic camera hook missing');
html=html.replace('updateStadiumShadow();pipeline.render();','updateStadiumShadow();handlingDiagnosticCamera();pipeline.render();');
const startup=String.raw`
if(new URLSearchParams(location.search).has('ready'))setTimeout(async()=>{
 DEVICE.preference='keyboard';setDeviceInput('keyboard');Object.assign(cameraSettings,{fov:110,distance:2.7,height:1,angle:3,stiffness:.55,shake:false});Object.assign(cfg,{body:0,color:0,paint:null,teamColors:true,size:1,mode:0,speed:1,gravity:1,models:1,unlimited:false});cfg.hi=new URLSearchParams(location.search).get('quality')==='detail'?1:0;
 await preloadArena();INTRO.active=false;introStop();$('intro').hidden=true;for(const child of $('menu').children)child.inert=false;sandbox=true;await startGame();finishOpening();cnt=0;st='PLAY';pause();handlingCameraMode(new URLSearchParams(location.search).get('camera')||'ball');
},0);
`;
html=html.replace('window.tevinDiagnostics=()=>',code+startup+'\nwindow.tevinDiagnostics=()=>');
for(const [i,s]of[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries())new vm.Script(s[1],{filename:'handling-playtest-script-'+i});
fs.writeFileSync(output,html);console.log(output);
