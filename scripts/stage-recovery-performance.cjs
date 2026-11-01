// Fixed-workload renderer+simulation probe, not a display-FPS/input-latency test.
// Each measured driving callback contains two real120Hz physics steps and a draw.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const input=path.resolve(process.argv[2]||'index.html'),output=path.resolve(process.argv[3]||'../../outputs/control-repair-perf-after.html');
cp.execFileSync(process.execPath,[path.join(__dirname,'stage-performance-preview.cjs'),input,output],{stdio:'ignore'});let html=fs.readFileSync(output,'utf8');
const helper=`
function configureRecoveryBenchmark(p){
 p.scenario=new URLSearchParams(location.search).get('scenario')||'normal';if(typeof resolutionPolicy!=='undefined')resolutionPolicy='native';
 let seed=731;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const k in keys)keys[k]=0;keys.w=1;keys.shift=p.scenario==='boost-contact'?1:0;
 for(const c of cars){resetCar(c,((c.id>>1)-1)*5,c.team?8:-8);c.q.setFromAxisAngle(Y3,c.team?Math.PI/2:-Math.PI/2);c.v.set(0,0,c.team?-8:8);c.boost=100;c.enabled=c.id===0||p.scenario==='traffic'||p.scenario==='boost-contact';}
 const c=cars[0];c.p.set(0,bodyPhysics(c).height,-22);c.q.setFromAxisAngle(Y3,-Math.PI/2);c.v.set(0,0,10);ball.p.set(2,2.3,-10);ball.v.set(0,0,0);ball.w.set(0,0,0);c.n.set(0,1,0);c.ground=c.wasG=1;
 if(p.scenario==='boost-contact'){c.v.set(0,0,14);ball.p.set(0,BR,-18.5);cars[1].p.set(0,bodyPhysics(cars[1]).height,-15);}
 if(p.scenario==='wall'){c.p.set(HX-bodyPhysics(c).height-.015,5,-10);c.n.set(-1,0,0);c.q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3(0,0,1),new V3(-1,0,0),new V3(0,-1,0)));c.wheelsOn=4;ball.p.set(35,6,4);}
 if(p.scenario==='corner'){c.p.set(35,bodyPhysics(c).height,43);c.q.setFromAxisAngle(Y3,-Math.PI/2);ball.p.set(28,2.3,38);keys.a=1;}
 if(p.scenario==='goal'){c.p.set(0,bodyPhysics(c).height,35);c.v.set(0,0,0);ball.p.set(0,2.3,48);triggerCelebration({team:0,scorer:0,assist:-1,id:'benchmark'});}
 for(const c of cars){c.frameP.copy(c.p);c.prevP.copy(c.p);c.frameQ.copy(c.q);c.prevQ.copy(c.q);}ball.frameP.copy(ball.p);ball.prevP.copy(ball.p);cameraAnchorReady=false;
 if(p.scenario==='goal'){const draw=pipeline.render.bind(pipeline);pipeline.render=()=>{const phase=st;st='GOAL';updateCelebrations(0,{age:.45,suppressUI:true});st=phase;return draw();};}
}
function stepRecoveryBenchmark(p){if(p.scenario==='goal')return;for(let i=0;i<2;i++){for(const c of cars){c.frameP.copy(c.p);c.frameQ.copy(c.q);}ball.frameP.copy(ball.p);sim(DT);}}
`;
html=html.replace('const PERF_REVIEW={',helper+'\nconst PERF_REVIEW={');
html=html.replace('if(ren.info)ren.info.autoReset=false;','configureRecoveryBenchmark(p);if(ren.info)ren.info.autoReset=false;');
html=html.replace('p.last=now;render(1/60);const cpu=','p.last=now;stepRecoveryBenchmark(p);render(1/60);const cpu=');
html=html.replace('const result={viewport:','const result={build:BUILD,scenario:p.scenario,conditions:\'two120Hz simulation steps per driving draw; held0.45s goal effect;20warm+60measured callbacks; not display FPS\',userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,viewport:');
html=html.replace("scenario:new URLSearchParams(location.search).get('view')||'center',",'');
html=html.replace("p.element.dataset.complete='true';",`p.element.dataset.complete='true';if(p.gl){const debug=p.gl.getExtension('WEBGL_debug_renderer_info');if(debug){result.gpuRenderer=p.gl.getParameter(debug.UNMASKED_RENDERER_WEBGL);p.element.textContent=JSON.stringify(result);}}`);
fs.writeFileSync(output,html);console.log(output);
