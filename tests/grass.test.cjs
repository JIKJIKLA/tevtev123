const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),load=require('./harness.cjs');
function turfContext(detail=false){
 const g=load(),legacy=fs.readFileSync(path.join(__dirname,'../src/legacy-8.2.html'),'utf8'),engineCode=[...legacy.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)][1][1];
 // Exercise the current source factory before the root builds a portable HTML.
 vm.runInContext(require('../scripts/patch-grass.cjs')(engineCode),g.context);const engine=g.context.TevinEngine,T=engine.THREE;
 const ctx=vm.createContext({THREE:T,V3:T.Vector3,ENGINE:engine,cfg:{hi:detail?1:0},ren:{isWebGPURenderer:false},scene:new T.Scene(),grassM:null,GU:null,HX:40.96,HZ:51.2,windFlags:[],document:{body:{dataset:{}}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/grass.js'),'utf8')+'\nthis.turf={geometry:turfGeometry,roots:turfRootOffsets,uniforms:turfUniforms,prepare:prepareTurfMotion,make:makeGrass,profile:TURF_PROFILE};',ctx);return{ctx,turf:ctx.turf,T,engine};
}
test('groomed tufts have four overlapping curved tapered fibers, finite faces and varied unit normals',()=>{
 const {turf,T}=turfContext(),g=turf.geometry(),p=g.getAttribute('position'),n=g.getAttribute('normal');assert.equal(p.count,28);assert.equal(g.index.count,60);assert.ok(Array.from(p.array).every(Number.isFinite));
 const va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3();for(let i=0;i<n.count;i++){assert.ok(n.getY(i)>.75);assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-6);assert.ok(p.getY(i)>=0&&p.getY(i)<=1);}
 for(let i=0;i<g.index.count;i+=3){va.fromBufferAttribute(p,g.index.getX(i));vb.fromBufferAttribute(p,g.index.getX(i+1));vc.fromBufferAttribute(p,g.index.getX(i+2));assert.ok(vb.sub(va).cross(vc.sub(va)).lengthSq()>1e-9,'degenerate turf face');}
 for(let leaf=0;leaf<4;leaf++){const base=leaf*7,baseWidth=Math.hypot(p.getX(base)-p.getX(base+1),p.getZ(base)-p.getZ(base+1)),shoulderWidth=Math.hypot(p.getX(base+4)-p.getX(base+5),p.getZ(base+4)-p.getZ(base+5));assert.ok(shoulderWidth<baseWidth*.6);assert.ok(p.getY(base+6)>.75);assert.ok(Math.hypot(p.getX(base+6),p.getZ(base+6))>.05);}
 assert.ok(turf.profile.maxHeight<=.09);assert.ok(turf.profile.minHeight>=.04);
});
test('both turf tiers are bounded opaque instancing with the same painted-field uniforms',()=>{
 for(const [detail,counts] of [[false,[30000,40000]],[true,[42000,54000]]]){
  const {ctx,turf,T}=turfContext(detail),paint=new T.Texture();vm.runInContext('PITCH_TEXTURE=this.testPaint',Object.assign(ctx,{testPaint:paint}));turf.make();assert.equal(ctx.grassM.isGroup,true);assert.equal(ctx.grassM.children.length,2);
  for(const [layer,m] of ctx.grassM.children.entries()){
   const shader={uniforms:{},vertexShader:'#include <beginnormal_vertex>\n#include <begin_vertex>',fragmentShader:'#include <normal_fragment_begin>\n#include <emissivemap_fragment>\n#include <color_fragment>'};m.material.onBeforeCompile(shader);
   assert.equal(m.geometry.isInstancedBufferGeometry,true);assert.equal(m.isInstancedMesh,undefined);assert.equal(m.instanceMatrix,undefined);assert.equal(m.geometry.instanceCount,counts[layer]);assert.equal(m.geometry.getAttribute('off').count,counts[layer]);assert.equal(m.material.transparent,false);assert.equal(m.material.depthWrite,true);assert.equal(m.material.alphaTest,0);assert.equal(shader.uniforms.paint.value,paint);assert.equal(shader.uniforms.turfShape.value.x,layer?8:20);assert.equal(shader.uniforms.turfProfile.value.y,layer?.075:.067);assert.ok(shader.uniforms.turfProfile.value.w<shader.uniforms.turfShape.value.x*.5);assert.doesNotMatch(shader.vertexShader,/undefined|NaN|\bpatch\b/);assert.ok(shader.vertexShader.includes('*h*h*fade'));
   const roots=m.geometry.getAttribute('off'),turns=m.geometry.getAttribute('turfTurn');assert.equal(turns.count,roots.count);
   for(let i=0;i<turns.count;i+=97){const a=roots.getZ(i)*6.2831;assert.ok(Math.abs(turns.getX(i)-Math.cos(a))<1e-7);assert.ok(Math.abs(turns.getY(i)-Math.sin(a))<1e-7);}
  }
  const [base,near]=ctx.GU.layers;assert.equal(base.paint,near.paint);assert.equal(base.fieldSize,near.fieldSize);for(let k=0;k<7;k++){assert.equal(base['c'+k],near['c'+k]);assert.equal(base['v'+k],near['v'+k]);assert.equal(base['motion'+k],near['motion'+k]);}assert.notEqual(base.t,near.t);assert.notEqual(base.turfShape,near.turfShape);assert.equal(ctx.document.body.dataset.turf,'groomed-carpet-v6');assert.ok(counts[0]/400+counts[1]/64>=700);
 }
});

test('shared body terms preserve velocity normalization, wake strength and ground falloff without mutating simulation vectors',()=>{
 const {turf,T}=turfContext(),u=turf.uniforms(new T.Texture(),81.92,102.4),near=turf.uniforms(u.paint.value,81.92,102.4,true,u),ss=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
 for(const height of [-1,.6,.60001,1.3,1.99999,2,6])for(const speed of [0,.0001,.000866,.001,12,23,60]){
  for(let k=0;k<7;k++){const a=k*.7;u['c'+k].value.set(k,height,-k);u['v'+k].value.set(Math.cos(a)*speed,7,Math.sin(a)*speed);}
  const before=Array.from({length:7},(_,k)=>[...u['c'+k].value.toArray(),...u['v'+k].value.toArray()]);turf.prepare(u);
  for(let k=0;k<7;k++){const v=u['v'+k].value,m=u['motion'+k].value,s=Math.hypot(v.x,v.z),denominator=Math.max(s,.001);assert.ok(Math.abs(m.x-v.x/denominator)<1e-14);assert.ok(Math.abs(m.y-v.z/denominator)<1e-14);assert.ok(Math.abs(m.z-Math.min(s/23,1))<1e-14);assert.ok(Math.abs(m.w-(1-ss(.6,2,height)))<1e-14);assert.equal(near['motion'+k].value,m);assert.deepEqual([...u['c'+k].value.toArray(),...v.toArray()],before[k]);}
 }
});

test('the conservative contact guard skips only exactly zero pressure, shading and wake contributions',()=>{
 const {turf,T}=turfContext(),u=turf.uniforms(new T.Texture(),81.92,102.4),ss=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
 let seed=31;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 // Include tiny speeds where the normalization floor makes direction shorter
 // than one: their faint wake extends farther than the usual ~4 m support.
 for(const speed of [0,.0001,.0005,.000866,.00099,.001,1,23,90]){
  for(let i=0;i<1000;i++){
   const angle=random()*Math.PI*2,qAngle=random()*Math.PI*2,radius=5+random()*40,qx=Math.cos(qAngle)*radius,qz=Math.sin(qAngle)*radius;u.c0.value.set(0,random()*3,0);u.v0.value.set(Math.cos(angle)*speed,0,Math.sin(angle)*speed);turf.prepare(u);const m=u.motion0.value,distance=Math.hypot(qx,qz),along=qx*m.x+qz*m.y,side=Math.hypot(qx-m.x*along,qz-m.y*along);
   const pressure=(1-ss(.2,1.15,distance))*m.w,shade=(1-ss(.12,1.05,distance))*m.w,wake=(1-ss(.35,1.1,side))*ss(-3.8,-.5,along)*(1-ss(-.2,.5,along))*m.z*m.w;
   assert.equal(pressure,0);assert.equal(shade,0);assert.equal(wake,0);
  }
 }
});
test('current WebGPU turf uses the same profile, paint, motion uniforms and a real fiber normal graph',()=>{
 const {turf,T,engine}=turfContext(),paint=new T.Texture(),u=turf.uniforms(paint,81.92,102.4),profile=u.turfProfile.value,shape=u.turfShape.value,m=engine.nodeGrass(u);
 assert.ok(m.positionNode?.isNode);assert.ok(m.colorNode?.isNode);
 assert.equal(u.paint.value,paint);assert.equal(u.turfProfile.value,profile);assert.equal(u.turfShape.value,shape);assert.equal(u.wind.value,1);u.wind.value=0;assert.equal(u.wind.value,0);assert.ok(m.roughness>=.9);assert.equal(m.transparent,false);assert.ok(m.normalNode);assert.ok(m.normalNode.isNode);assert.notEqual(m.normalNode,m.positionNode);
 const near=turf.uniforms(paint,81.92,102.4,true,u),nm=engine.nodeGrass(near);assert.ok(nm.positionNode?.isNode);assert.ok(nm.colorNode?.isNode);assert.equal(near.turfShape.value.x,8);assert.equal(near.turfProfile.value.w,3.9);
});
test('every turf layer advances and freezes together while car wakes share their source vectors',()=>{
 const {ctx,turf,T}=turfContext();turf.make();let reduced=false;Object.assign(ctx,{RIVAL_PREF:{motion:true},matchMedia:()=>({matches:reduced}),cm:[{position:new T.Vector3(1,.5,2)}],cars:[],ball:{p:new T.Vector3(),v:new T.Vector3()},carDemolished:()=>false});
 const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8'),code=game.slice(game.indexOf('function updateWind('),game.indexOf('function dispose3d()'));vm.runInContext(code+'\nthis.update=updateWind;',ctx);ctx.update(.25,true);for(const u of ctx.GU.layers){assert.equal(u.t.value,.25);assert.equal(u.wind.value,1);assert.equal(u.c0.value.x,1);}ctx.RIVAL_PREF.motion=false;ctx.update(.25,true);for(const u of ctx.GU.layers){assert.equal(u.t.value,.25);assert.equal(u.wind.value,0);}ctx.RIVAL_PREF.motion=true;reduced=true;ctx.update(.25,true);for(const u of ctx.GU.layers)assert.equal(u.t.value,.25);
});

test('the clipped canopy hides at least 96 percent of near-field ground at a normal chase viewing angle',()=>{
 const {turf}=turfContext(),g=turf.geometry(),p=g.getAttribute('position'),idx=g.index,res=180,half=.75,pixel=half*2/res,slope=1/Math.tan(22*Math.PI/180);
 // Project actual blade triangles along a chase-camera ray onto a 1.5 m ground
 // patch. This measures visual cover, not just an arbitrary instance-count target.
 for(const detail of [false,true]){
  const filled=new Uint8Array(res*res);
  const stamp=(a,b,c)=>{
   const loX=Math.max(0,Math.floor((Math.min(a[0],b[0],c[0])+half)/pixel)),hiX=Math.min(res-1,Math.floor((Math.max(a[0],b[0],c[0])+half)/pixel)),loZ=Math.max(0,Math.floor((Math.min(a[1],b[1],c[1])+half)/pixel)),hiZ=Math.min(res-1,Math.floor((Math.max(a[1],b[1],c[1])+half)/pixel));
   for(let iz=loZ;iz<=hiZ;iz++)for(let ix=loX;ix<=hiX;ix++){
    const x=-half+(ix+.5)*pixel,z=-half+(iz+.5)*pixel,cross=(b,c)=>(b[0]-x)*(c[1]-z)-(b[1]-z)*(c[0]-x),u=cross(a,b),v=cross(b,c),w=cross(c,a);
    if(u>=0&&v>=0&&w>=0||u<=0&&v<=0&&w<=0)filled[iz*res+ix]=1;
   }
  };
  let total=0;
  for(const near of [false,true]){
   const profile=turf.profile,count=near?(detail?profile.nearDetailCount:profile.nearChromebookCount):(detail?profile.detailCount:profile.chromebookCount),tile=near?profile.nearTileSize:20,roots=turf.roots(count,tile),min=near?profile.nearMinHeight:profile.minHeight,max=near?profile.nearMaxHeight:profile.maxHeight;total+=count;
   for(let k=0;k<count;k++){
    const x=roots[k*3]-tile/2,z=roots[k*3+1]-tile/2,r=roots[k*3+2],height=min+r*(max-min);if(Math.abs(x)>half+.1||z>half+.1||z< -half-.5)continue;
    const cos=Math.cos(r*6.2831),sin=Math.sin(r*6.2831),vertices=[];
    for(let j=0;j<p.count;j++)vertices.push([x+p.getX(j)*cos-p.getZ(j)*sin,z+p.getX(j)*sin+p.getZ(j)*cos+p.getY(j)*height*slope]);
    for(let j=0;j<idx.count;j+=3)stamp(vertices[idx.getX(j)],vertices[idx.getX(j+1)],vertices[idx.getX(j+2)]);
   }
  }
  const cover=filled.reduce((sum,value)=>sum+value,0)/filled.length;assert.ok(cover>=.96,'visible ground between tufts: '+(100-cover*100).toFixed(2)+'%');assert.ok(total*idx.count/3<=1920000,'bounded turf submission budget');
 }
});
