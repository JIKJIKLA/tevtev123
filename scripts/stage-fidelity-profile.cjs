// Developer-only feature-cost probe. Never changes production quality settings.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const input=path.resolve(process.argv[2]||'index.html'),output=path.resolve(process.argv[3]||'../../outputs/fidelity-profile.html');
cp.execFileSync(process.execPath,[path.join(__dirname,'stage-performance-preview.cjs'),input,output],{stdio:'ignore'});
let html=fs.readFileSync(output,'utf8');
html=html.replace('styleChampionshipStadium(stadium);','PERF_REVIEW.stadium=stadium;styleChampionshipStadium(stadium);');
html=html.replace("z=view==='orange'?35:view==='blue'?-35:-22","z=view==='goal'?35:view==='orange'?35:view==='blue'?-35:-22");
html=html.replace('if(!p.configured){p.configured=true;',`if(!p.configured){p.configured=true;
  p.profile=new URLSearchParams(location.search).get('profile')||'full';if(p.profile==='goal')triggerCelebration({team:0,scorer:0,assist:-1,id:'profile'});
  if(typeof resolutionPolicy!=='undefined')resolutionPolicy='native';
  const draw=pipeline.render.bind(pipeline);pipeline.render=()=>{if(p.profile==='goal'){const phase=st;st='GOAL';updateCelebrations(0,{age:.45,suppressUI:true});st=phase;}const hidden=[],objects=p.profile==='grass'?[grassM]:p.profile==='stadium'?[p.stadium]:p.profile==='effects'?[FX?.group,CELEBRATION.group,MATCH_EFFECTS.group,pts]:p.profile==='shadows'?contactShadows:[];for(const o of objects)if(o){hidden.push([o,o.visible]);o.visible=false;}const shadows=ren.shadowMap?.enabled;if(p.profile==='shadows'&&ren.shadowMap)ren.shadowMap.enabled=false;try{return draw();}finally{for(const [o,v]of hidden)o.visible=v;if(ren.shadowMap)ren.shadowMap.enabled=shadows;}};
 `);
html=html.replace('const result={viewport:','const result={profile:p.profile,userAgent:navigator.userAgent,hardware:window.navigator.hardwareConcurrency,viewport:');
html=html.replace("p.element.dataset.complete='true';",`p.element.dataset.complete='true';if(p.gl){const debug=p.gl.getExtension('WEBGL_debug_renderer_info');if(debug){result.gpuRenderer=p.gl.getParameter(debug.UNMASKED_RENDERER_WEBGL);result.gpuVendor=p.gl.getParameter(debug.UNMASKED_VENDOR_WEBGL);p.element.textContent=JSON.stringify(result);}}`);
fs.writeFileSync(output,html);console.log(output);
