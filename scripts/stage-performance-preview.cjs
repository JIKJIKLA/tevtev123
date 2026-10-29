// Developer-only render benchmark. Uses the production scene/materials at fixed
// six-car poses; metrics describe rendering, not simulation or certified devices.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const input=path.resolve(process.argv[2]||'index.html'),output=path.resolve(process.argv[3]||'../../../outputs/performance-review.html');
cp.execFileSync(process.execPath,[path.join(__dirname,'stage-lighting-preview.cjs'),input,output],{stdio:'ignore'});
let html=fs.readFileSync(output,'utf8');
const code=`
const PERF_REVIEW={samples:[],gpu:[],pending:[],last:0,frames:0,warm:20,total:60,configured:false,done:false};
function perfQuantile(values,p){const a=values.slice().sort((a,b)=>a-b);return a.length?a[Math.min(a.length-1,Math.floor(a.length*p))]:null;}
function performanceReviewFrame(){
 const p=PERF_REVIEW;if(p.done)return;
 if(!p.configured){p.configured=true;for(let i=0;i<cars.length;i++){const c=cars[i];if(i){c.p.set((i%3-1)*5,bodyPhysics(c).height,-10+(i%2)*5);c.frameP.copy(c.p);c.prevP.copy(c.p);c.q.copy(cars[0].q);c.frameQ.copy(c.q);}c.v.set(0,0,12);c.bst=1;}if(ren.info)ren.info.autoReset=false;
  if(ren.isWebGLRenderer){p.gl=ren.getContext();p.ext=p.gl.getExtension('EXT_disjoint_timer_query_webgl2');}
  p.element=document.createElement('output');p.element.id='perf-report';p.element.style.cssText='position:fixed;left:8px;top:85px;z-index:300;max-width:520px;color:white;background:#000b;padding:10px;font:12px monospace';document.body.append(p.element);
 }
 const gl=p.gl;for(let i=p.pending.length-1;i>=0;i--){const x=p.pending[i];if(gl.getQueryParameter(x.query,gl.QUERY_RESULT_AVAILABLE)){const ns=gl.getQueryParameter(x.query,gl.QUERY_RESULT);if(x.sample&&!gl.getParameter(p.ext.GPU_DISJOINT_EXT))p.gpu.push(ns/1e6);gl.deleteQuery(x.query);p.pending.splice(i,1);}}
 const query=p.ext&&p.pending.length<8?gl.createQuery():null;if(query)gl.beginQuery(p.ext.TIME_ELAPSED_EXT,query);
 ren.info?.reset?.();const now=performance.now(),elapsed=p.last?now-p.last:0;p.last=now;render(1/60);const cpu=performance.now()-now;
 if(query){gl.endQuery(p.ext.TIME_ELAPSED_EXT);p.pending.push({query,sample:p.frames>=p.warm});}
 const info=ren.info?.render||{},calls=info.calls??info.drawCalls??ren.info?.drawCalls??0,triangles=info.triangles??ren.info?.render?.triangles??0;
 if(p.frames++>=p.warm)p.samples.push({cpu,elapsed,calls,triangles});
 if(p.samples.length>=p.total){p.done=true;const result={viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,buffer:[ren.domElement.width,ren.domElement.height]},backend:ENGINE.status.backend,quality:cfg.hi?'Detail':'Chromebook',scenario:new URLSearchParams(location.search).get('view')||'center',frames:p.samples.length,cpu:{p50:perfQuantile(p.samples.map(x=>x.cpu),.5),p95:perfQuantile(p.samples.map(x=>x.cpu),.95)},frame:{p50:perfQuantile(p.samples.map(x=>x.elapsed),.5),p95:perfQuantile(p.samples.map(x=>x.elapsed),.95)},gpu:{samples:p.gpu.length,p50:perfQuantile(p.gpu,.5),p95:perfQuantile(p.gpu,.95)},calls:perfQuantile(p.samples.map(x=>x.calls),.5),triangles:perfQuantile(p.samples.map(x=>x.triangles),.5),info:ren.info?.render};p.element.textContent=JSON.stringify(result);p.element.dataset.complete='true';document.body.dataset.performance='complete';for(const x of p.pending)gl.deleteQuery(x.query);p.pending.length=0;}
 else if(p.frames%30===0)p.element.textContent='PERFORMANCE REVIEW '+Math.max(0,p.frames-p.warm)+' / '+p.total+' · '+ENGINE.status.backend;
}
`;
html=html.replace('const LIGHTING_REVIEW={ready:false};',code+'\nconst LIGHTING_REVIEW={ready:false};');
html=html.replace('presentationDelta=0;updateAudio();render(1/60);return;','presentationDelta=0;updateAudio();performanceReviewFrame();return;');
html=html.replace("DEVICE.preference='keyboard';setDeviceInput('keyboard');cfg.hi=","DEVICE.preference='keyboard';setDeviceInput('keyboard');cfg.size=3;cfg.hi=");
fs.writeFileSync(output,html);console.log(output);
