'use strict';
// Native-input investigation only. Buttons set an initial scene; all subsequent
// car/ball motion and bot decisions run through the unmodified production sim.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const input=path.resolve(process.argv[2]||'index.html'),output=path.resolve(process.argv[3]||'../../outputs/recovery-review-current.html');
const built=spawnSync(process.execPath,[path.join(__dirname,'stage-handling-playtest.cjs'),input,output],{encoding:'utf8'});
if(built.status!==0)throw Error(built.stderr||built.stdout);
let html=fs.readFileSync(output,'utf8');
function once(old,next){if(html.split(old).length!==2)throw Error('Review marker count: '+old.slice(0,70));html=html.replace(old,()=>next);}
once('return{p:c.p.toArray(),q:c.q.toArray()',"return{surfaceSupport:!!c.surfaceSupport,tireLoad:c.tireLoad??null,loadedWheels:c.loadedWheels??null,supportTime:c.supportTime??null,jumpBuffer:c.jumpBuffer??null,p:c.p.toArray(),q:c.q.toArray()");
once('return{build:BUILD,scenario:r.scenario',"return{playlist:cfg.mode===1?'Heatseeker':'Soccar',teamSize:cfg.size,difficulty:cfg.lvl,score:[...score],heat:{target:heat.target,speed:heat.speed,server:heat.server},build:BUILD,scenario:r.scenario");
once('JSON.stringify({summary,ticks:HANDLING_REVIEW.ticks,frames:', 'JSON.stringify({summary,teams:RECOVERY_REVIEW.teams,ticks:HANDLING_REVIEW.ticks,frames:');
once('const handlingSim=sim;',String.raw`
const RECOVERY_REVIEW={teams:[]};
function reviewTeamState(){return cars.filter(c=>c.enabled).map(c=>({id:c.id,team:c.team,p:c.p.toArray(),v:c.v.toArray(),q:c.q.toArray(),mode:c.ai.mode,target:c.ai.target.toArray(),intercept:c.ai.intercept.toArray(),touches:c.touches,goals:c.goals,boost:c.boost,ground:!!c.ground,surfaceSupport:!!c.surfaceSupport,wheels:c.wheelsOn,input:{...c.inp},jump:c.jp,held:c.jh}));}
const handlingSim=sim;`);
once('handlingSim(dt);if(!record)return;', 'handlingSim(dt);if(!record)return;if(r.ticks.length%12===0)RECOVERY_REVIEW.teams.push({tick:r.ticks.length,time:r.elapsed,score:[...score],heat:{target:heat.target,speed:heat.speed,server:heat.server},cars:reviewTeamState()});');
once("if(r.ticks.length>=r.maxTicks)captureHandlingReview('automatic eight-second capture');","if(st==='GOAL')captureHandlingReview('first goal reached');else if(r.ticks.length>=r.maxTicks)captureHandlingReview('scenario time limit');");
const start=html.indexOf('function prepareHandlingReview(name){'),end=html.indexOf('function handlingFrameProbe(t){',start);
if(start<0||end<start)throw Error('Initial scene block missing');
html=html.slice(0,start)+String.raw`
function prepareHandlingReview(name){
 if(!inited||LOADING.active)return;const hs=name.startsWith('HEAT /');
 document.body.classList.remove('handling-captured');finishOpening();clearCelebration();clearMatchEffects();resetMatchPresentation();stopReplay();sandbox=true;DRILL.active=false;
 Object.assign(cfg,{mode:hs?1:0,size:name==='HEAT / 3V3'?3:1,lvl:2,allies:name==='HEAT / 3V3'?2:0,enemies:name==='HEAT / 3V3'?3:hs?1:0,unlimited:false});
 configureCars();kickoff(false);finishOpening();st='PLAY';cnt=mt=0;score=[0,0];tl=300;ot=0;kickoffAge=10;
 $('menu').hidden=true;$('hud').style.display='block';$('pause').classList.remove('on');$('msg').style.opacity=0;$('s0').textContent=$('s1').textContent='0';
 for(const key in keys)keys[key]=0;
 for(const car of cars){car.enabled=hs||car.id===0;resetCar(car,0,-26);car.boost=100;car.touches=car.goals=0;}
 const c=localPlayer();c.q.identity();c.p.set(0,bodyPhysics(c).height+.015,-18);c.v.set(0,0,0);c.n.set(0,1,0);c.ground=c.wasG=1;
 ball.p.set(-24,BR,24);ball.v.set(0,0,0);ball.w.set(0,0,0);ball.last=ball.lastPlayer=-1;ball.hit=ball.hitT=0;heat.target=0;heat.speed=18;heat.cooldown=0;heat.server=-1;
 if(name==='AWKWARD / ESCAPE'){c.q.setFromEuler(new THREE.Euler(0,0,.15));c.p.y=-Math.min(...bodyPhysics(c).wheels.map(p=>new V3(...p).applyQuaternion(c.q).y))+.015;c.canD=c.canJ=0;c.ground=c.wasG=0;}
 if(name==='WALL / REVERSE'){c.q.setFromAxisAngle(new V3(0,0,1),Math.PI/2);c.p.set(HX-bodyPhysics(c).height-.015,10,0);c.n.set(-1,0,0);}
 if(name==='TILTED / ESCAPE'){c.q.setFromAxisAngle(new V3(0,0,1),Math.PI/2).multiply(new Qn().setFromAxisAngle(new V3(1,0,0),.45));c.p.set(HX-Math.max(...bodyPhysics(c).wheels.map(p=>new V3(...p).applyQuaternion(c.q).x))-.015,10,0);c.n.set(-1,0,0);c.canD=c.canJ=0;c.ground=c.wasG=0;}
 if(name==='CORNER / RECOVER'){const h=Math.SQRT1_2,n=new V3(-h,0,-h),f=new V3(h,0,-h),right=f.clone().cross(n);c.q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f,n,right)).multiply(new Qn().setFromAxisAngle(new V3(1,0,0),.45));const gap=.015-Math.min(...bodyPhysics(c).wheels.map(p=>new V3(...p).applyQuaternion(c.q).dot(n)));c.p.set(HX-R+R*h,10,HZ-R+R*h).addScaledVector(n,gap);c.n.copy(n);c.v.set(0,0,0);c.ground=c.wasG=0;c.canD=c.canJ=0;}
 if(name==='ROOF / RECOVER'){c.q.setFromAxisAngle(new V3(1,0,0),Math.PI);c.p.y=.7;c.canD=c.canJ=0;c.ground=c.wasG=0;}
 if(name==='FORWARD / PITCH'){c.v.x=8;}
 if(hs){
  for(const car of cars){const sign=car.team?1:-1,rank=car.id>>1;car.q.setFromAxisAngle(Y3,sign*Math.PI/2);car.p.set(rank===0?0:rank===1?-6:6,bodyPhysics(car).height+.015,sign*(rank?40:44));car.v.set(0,0,0);car.n.set(0,1,0);car.ground=car.wasG=1;}
  ball.p.set(5,3,-5);ball.v.set(-2,0,-24);ball.w.set(0,0,0);ball.last=1;ball.lastPlayer=1;heat.target=-1;heat.speed=24;
 }
 if(typeof sampleCarSupport==='function')for(const car of cars)if(car.enabled)sampleCarSupport(car);
 for(const car of cars){car.frameP.copy(car.p);car.prevP.copy(car.p);car.frameQ.copy(car.q);car.prevQ.copy(car.q);}ball.frameP.copy(ball.p);ball.prevP.copy(ball.p);cameraAnchorReady=false;refreshCarModels();
 RECOVERY_REVIEW.teams=[];const r=HANDLING_REVIEW;r.scenario=name;r.ticks=[];r.frames=[];r.cameraFrames=[];r.elapsed=0;r.lastFrame=0;r.maxTicks=hs?3600:960;r.initial=handlingState(c);r.recording=true;r.stopReason='recording';writeHandlingReview();
 const old=document.getElementById('handling-history');if(old){old.dataset.complete='false';old.textContent='';}
}
`+html.slice(end);
once("['DRIVE / REVERSE','SLIDE / TURN','JUMP / LAND','FLIP / TURN','WALL / FIELD','BALL / SECOND','RAMP / UP','SIDE LANDING']","['AWKWARD / ESCAPE','WALL / REVERSE','TILTED / ESCAPE','CORNER / RECOVER','ROOF / RECOVER','FORWARD / PITCH','HEAT / 1V1','HEAT / 3V3']");
for(const [i,s]of[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries())new vm.Script(s[1],{filename:'recovery-heat-review-'+i});
fs.writeFileSync(output,html);console.log(output);
