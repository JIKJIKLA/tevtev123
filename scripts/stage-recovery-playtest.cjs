// Developer-only native-input test surface. Buttons prepare initial poses only;
// every subsequent force, collision, control and camera step is production code.
const fs=require('fs'),path=require('path');
const input=path.resolve(process.argv[2]||'index.html'),output=path.resolve(process.argv[3]||'../../outputs/control-repair-play.html');
let html=fs.readFileSync(input,'utf8');
const code=`
window.__NIVET_CONTROL_TRACE__=true;
const RECOVERY_REVIEW={scenario:'ordinary match',ticks:[],frames:[],last:0,start:0};
const recoveryStep=stepCar;
stepCar=function(c,dt){recoveryStep(c,dt);if(c!==localPlayer())return;const r=RECOVERY_REVIEW;r.ticks.push({time:simTime,p:c.p.toArray(),q:c.q.toArray(),up:new V3(0,1,0).applyQuaternion(c.q).y,touches:c.touches,ball:ball.p.toArray(),trace:vehicleTraceFrame(c)});if(r.ticks.length>3600)r.ticks.shift();};
function prepareRecoveryReview(name){
 if(!inited||LOADING.active)return;finishOpening();clearCelebration();clearMatchEffects();resetMatchPresentation();stopReplay();sandbox=true;DRILL.active=false;st='PLAY';cnt=mt=0;$('menu').hidden=true;$('hud').style.display='block';$('pause').classList.remove('on');$('msg').style.opacity=0;
 for(const k in keys)keys[k]=0;for(const c of cars){c.enabled=c.id===0;resetCar(c,0,-22);}
 const c=localPlayer();c.q.setFromAxisAngle(Y3,-Math.PI/2);c.p.set(0,bodyPhysics(c).height,-22);c.n.set(0,1,0);c.ground=c.wasG=1;c.boost=100;c.v.set(0,0,0);ball.p.set(0,BR,0);ball.v.set(0,0,0);ball.w.set(0,0,0);
 if(name==='KICKOFF APPROACH')c.p.z=-10;
 if(name==='POWERSLIDE RUN')c.v.z=10;
 if(name==='WALL EXIT'){c.p.set(HX-bodyPhysics(c).height-.015,6,0);c.q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3(0,0,1),new V3(-1,0,0),new V3(0,-1,0)));c.n.set(-1,0,0);c.wheelsOn=4;c.v.set(0,0,10);ball.p.set(30,BR,12);}
 if(name==='DODGE CHALLENGE'){c.p.z=-16;c.v.z=10;ball.p.z=20;}
 if(name==='BALL CHALLENGE'){c.p.z=-7;}
 for(const c of cars){c.frameP.copy(c.p);c.prevP.copy(c.p);c.frameQ.copy(c.q);c.prevQ.copy(c.q);}ball.frameP.copy(ball.p);ball.prevP.copy(ball.p);cameraAnchorReady=false;RECOVERY_REVIEW.scenario=name;RECOVERY_REVIEW.ticks=[];RECOVERY_REVIEW.frames=[];RECOVERY_REVIEW.start=performance.now();
}
function recoveryFrameProbe(t){const r=RECOVERY_REVIEW;if(r.last&&st==='PLAY')r.frames.push(t-r.last);r.last=t;if(r.frames.length>1800)r.frames.shift();requestAnimationFrame(recoveryFrameProbe);}requestAnimationFrame(recoveryFrameProbe);
setInterval(()=>{
 let panel=document.getElementById('recovery-controls');if(!panel){panel=document.createElement('aside');panel.id='recovery-controls';panel.style.cssText='position:fixed;z-index:500;top:2px;left:2px;display:flex;gap:3px;font:10px monospace;background:#10202cee';for(const name of ['KICKOFF APPROACH','POWERSLIDE RUN','WALL EXIT','DODGE CHALLENGE','BALL CHALLENGE']){const b=document.createElement('button');b.textContent=name;b.style.cssText='font:10px monospace;padding:5px;color:white;background:#243748';b.onclick=()=>prepareRecoveryReview(name);panel.append(b);}document.body.append(panel);}
 let el=document.getElementById('playtest-report');if(!el){el=document.createElement('output');el.id='playtest-report';el.style.cssText='position:fixed;bottom:0;left:310px;max-width:520px;z-index:500;background:#000b;color:#fff;font:10px monospace;pointer-events:none';document.body.append(el);}const c=localPlayer(),r=RECOVERY_REVIEW;
 const summary={build:BUILD,scenario:r.scenario,phase:st,ticks:r.ticks.length,position:c.p.toArray(),velocity:c.v.toArray(),wheels:c.wheelsOn,branch:vehicleTraceFrame(c)?.branch,up:new V3(0,1,0).applyQuaternion(c.q).y,touches:c.touches,ball:ball.p.toArray(),camera:cam?.position?.toArray(),buffer:ren?[ren.domElement.width,ren.domElement.height]:null,viewport:[innerWidth,innerHeight],quality:cfg.hi?'Detail':'Chromebook'};el.textContent=JSON.stringify(summary);
 let history=document.getElementById('playtest-history');if(!history){history=document.createElement('output');history.id='playtest-history';history.hidden=true;document.body.append(history);}history.textContent=JSON.stringify({summary,ticks:r.ticks,frames:r.frames});
},250);
`;
if(!html.includes('window.tevinDiagnostics=()=>'))throw Error('Playtest insertion missing');
const startup="\nif(new URLSearchParams(location.search).has('ready'))setTimeout(async()=>{await preloadArena();INTRO.active=false;introStop();$('intro').hidden=true;for(const child of $('menu').children)child.inert=false;sandbox=true;await startGame();finishOpening();cnt=0;st='PLAY';pause();},0);\n";
html=html.replace('window.tevinDiagnostics=()=>',code+startup+'\nwindow.tevinDiagnostics=()=>');fs.writeFileSync(output,html);console.log(output);
