// Temporary, visible review controls. This file does not alter the production build.
const fs=require('node:fs'),path=require('node:path');let html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
html=html.replace('BOMB.chosen=rollBombDrop();','BOMB.chosen=false;');
html=html.replace('function frame(t){requestAnimationFrame(frame);',"const reviewTime=Number(new URLSearchParams(location.search).get('review')||1.02);const FLYBY_REVIEW={time:cl(Number.isFinite(reviewTime)?reviewTime:1.02,0,5.4)};\nfunction frame(t){requestAnimationFrame(frame);");
const gate="if(LOADING.active){acc=0;if(inited&&!ENGINE.status.warming)render(dt);return}";
if(!html.includes(gate))throw Error('Missing frame review insertion');
html=html.replace(gate,gate+"\n if(FLYBY_REVIEW.time!==null&&OPENING.active&&st==='COUNT'){cnt=OPENING.duration-FLYBY_REVIEW.time;presentationDelta=0;acc=0;rivalsTick(0);updateAudio();render(0);return;}");
const ui=`
const review=document.createElement('aside');review.id='flyby-review';review.setAttribute('aria-label','Cinematic review controls');review.style.cssText='position:fixed;z-index:200;top:8px;left:8px;display:flex;flex-wrap:wrap;gap:5px;max-width:350px;padding:8px;background:#071529ee;color:white;font:11px Arial';
const label=document.createElement('span');label.textContent='PREVIEW: FLYBY HELD';label.style.width='100%';review.appendChild(label);
for(const [name,time] of [['HOLD ROOF',.1],['HOLD FLYBY',1.02],['HOLD DROP',1.7],['HOLD BOUNCE',2.8],['LIVE',null]]){const button=document.createElement('button');button.textContent=name;button.style.cssText='padding:9px;background:#184563;color:white;border:1px solid #75b3d1;cursor:pointer;font-size:10px';button.onclick=()=>{FLYBY_REVIEW.time=time;label.textContent='PREVIEW: '+name;};review.appendChild(button);}if(!new URLSearchParams(location.search).has('capture'))document.body.appendChild(review);
`;
html=html.replace('setupMatchPresentationUI();setupBombUI();','setupMatchPresentationUI();setupBombUI();'+ui);
html=html.replace("if(!window.__TEVIN_TEST__)setTimeout(preloadArena,0);","if(!window.__TEVIN_TEST__)setTimeout(()=>preloadArena().then(()=>{INTRO.active=false;introStop();$('intro').hidden=true;for(const child of $('menu').children)child.inert=false;sandbox=false;startGame();}),0);");
const output=path.resolve(__dirname,'../../../outputs/flyby-review-9.9.4.html');fs.writeFileSync(output,html);console.log(output);
