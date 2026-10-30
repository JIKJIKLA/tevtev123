// Developer-only held poses use the production renderer/materials. No lighting overrides.
const fs=require('node:fs'),path=require('node:path');
const input=path.resolve(process.argv[2]||path.join(__dirname,'../index.html')),output=path.resolve(process.argv[3]||path.join(__dirname,'../../../outputs/lighting-review-9.9.6.html'));
let html=fs.readFileSync(input,'utf8');
const review=`
const LIGHTING_REVIEW={ready:false};
function lightingReviewPose(view){
 if(view==='garage'){st='MENU';$('menu').hidden=false;showMenuScreen('garage');$('menu').classList.add('live-preview');return;}
 st='PLAY';$('menu').hidden=true;const c=localPlayer(),z=view==='orange'?35:view==='blue'?-35:-22,forward=view==='orange'?-1:1;
 c.p.set(0,bodyPhysics(c).height,z);c.q.setFromAxisAngle(Y3,-forward*Math.PI/2);c.v.set(0,0,0);c.frameP.copy(c.p);c.prevP.copy(c.p);c.frameQ.copy(c.q);c.prevQ.copy(c.q);
 ball.p.set(2,2.3,z+forward*12);ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);ball.v.set(0,0,0);ball.w.set(0,0,0);cd.set(0,0,forward);cpos.copy(c.p).addScaledVector(cd,-cameraSettings.distance);cpos.y+=cameraSettings.height;lookPos.copy(ball.p);cameraAnchorReady=false;
}
`;
html=html.replace('function frame(t){requestAnimationFrame(frame);',review+'\nfunction frame(t){requestAnimationFrame(frame);');
const gate=["if(LOADING.active){acc=0;if(inited&&!ENGINE.status.warming&&!SCENE_WARM.job)render(dt);return}","if(LOADING.active){acc=0;if(inited&&!ENGINE.status.warming)render(dt);return}"].find(value=>html.includes(value));
if(!gate)throw Error('Lighting review insertion changed');
html=html.replace(gate,gate+"\n if(LIGHTING_REVIEW.ready){acc=0;presentationDelta=0;updateAudio();render(1/60);return;}");
const startup=`if(!window.__TEVIN_TEST__)setTimeout(async()=>{
 DEVICE.preference='keyboard';setDeviceInput('keyboard');cfg.hi=new URLSearchParams(location.search).get('quality')==='detail'?1:0;await preloadArena();INTRO.active=false;introStop();$('intro').hidden=true;for(const child of $('menu').children)child.inert=false;sandbox=false;await startGame();finishOpening();cnt=0;mt=0;$('msg').style.opacity=0;
 lightingReviewPose(new URLSearchParams(location.search).get('view')||'center');LIGHTING_REVIEW.ready=true;
 if(!new URLSearchParams(location.search).has('capture')){const panel=document.createElement('aside');panel.style.cssText='position:fixed;z-index:250;top:8px;left:8px;display:flex;gap:6px;padding:7px;background:#07192de8;color:white;font:11px Arial';for(const name of ['center','blue','orange','garage']){const button=document.createElement('button');button.textContent=name.toUpperCase();button.style.cssText='padding:8px;color:white;background:#143f5c;border:1px solid #8dbed8';button.onclick=()=>lightingReviewPose(name);panel.appendChild(button);}document.body.appendChild(panel);}
},0);`;
html=html.replace("if(!window.__TEVIN_TEST__)setTimeout(preloadArena,0);",startup).replace('BOMB.chosen=rollBombDrop();','BOMB.chosen=false;');
fs.writeFileSync(output,html);console.log(output);
