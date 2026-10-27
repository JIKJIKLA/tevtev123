let PITCH_TEXTURE=null;
function turfGeometry(){
 const positions=[],indices=[];
 for(let blade=0;blade<3;blade++){
  const a=blade*Math.PI*2/3,base=positions.length/3;
  for(const [x,y] of [[-.007,0],[.007,0],[-.0035,.56],[.0065,.56],[.012,1]])positions.push(x*Math.cos(a),y,x*Math.sin(a));
  indices.push(base,base+1,base+2,base+1,base+3,base+2,base+2,base+3,base+4);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);
 const normals=new Float32Array(positions.length);for(let i=1;i<normals.length;i+=3)normals[i]=1;g.setAttribute('normal',new THREE.BufferAttribute(normals,3));return g;
}
function makeGrass(){
 const count=cfg.hi?28000:16000,g=turfGeometry(),off=new Float32Array(count*3),columns=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/columns);
 let seed=2031;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<count;i++){off[i*3]=((i%columns+random())/columns)*20;off[i*3+1]=((Math.floor(i/columns)+random())/rows)*22;off[i*3+2]=random();}
 g.setAttribute('off',new THREE.InstancedBufferAttribute(off,3));g.instanceCount=count;
 GU={t:{value:0},wind:{value:1},paint:{value:PITCH_TEXTURE},fieldSize:{value:new THREE.Vector2(2*HX,2*HZ)}};
 for(let k=0;k<7;k++){GU['c'+k]={value:new V3(1000,1000,1000)};GU['v'+k]={value:new V3()};}
 const material=ren.isWebGPURenderer?ENGINE.nodeGrass(GU):new THREE.MeshStandardMaterial({side:THREE.DoubleSide,roughness:.98,metalness:0,envMapIntensity:.3});
 if(!ren.isWebGPURenderer){material.name='Painted wind turf / WebGL';material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,GU);
  shader.vertexShader='attribute vec3 off;uniform float t,wind;uniform sampler2D paint;uniform vec2 fieldSize;uniform vec3 c0,c1,c2,c3,c4,c5,c6,v0,v1,v2,v3,v4,v5,v6;varying vec3 turfPigment;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`float r=off.z,h=position.y;vec2 w=mod(off.xy-cameraPosition.xz+10.,20.)+cameraPosition.xz-10.;float fade=(1.-smoothstep(6.,9.7,length(cameraPosition.xz-w)))*step(abs(w.x),36.8)*step(abs(w.y),46.8);float ht=(.052+.052*r)*fade;
   float a=r*6.2831;vec3 transformed=vec3(w.x+(position.x*cos(a)-position.z*sin(a))*fade,.008+h*ht,w.y+(position.x*sin(a)+position.z*cos(a))*fade);
   float wave=(sin(t*1.25+w.x*.42+w.y*.24)*.35+sin(t*2.1+w.y*.71+r*9.)*.09)*h*h*ht*2.4*wind;transformed.xz+=vec2(wave,wave*.55);
   vec3 ob[7];ob[0]=c0;ob[1]=c1;ob[2]=c2;ob[3]=c3;ob[4]=c4;ob[5]=c5;ob[6]=c6;vec3 vel[7];vel[0]=v0;vel[1]=v1;vel[2]=v2;vel[3]=v3;vel[4]=v4;vel[5]=v5;vel[6]=v6;float contactShade=1.;
   for(int i=0;i<7;i++){vec2 q=w-ob[i].xz;float nearGround=1.-smoothstep(.6,2.,ob[i].y);float f=(1.-smoothstep(.2,1.35,length(q)))*nearGround;contactShade*=1.-f*.32;vec2 dir=vel[i].xz/max(length(vel[i].xz),.001);float along=dot(q,dir),side=length(q-dir*along);float wake=(1.-smoothstep(.4,1.35,side))*smoothstep(-4.,-1.,along)*(1.-smoothstep(-.2,.6,along))*min(length(vel[i].xz)/23.,1.)*nearGround;transformed.xz+=(normalize(q+vec2(.0001))*f*.11+dir*wake*.18)*h*h;transformed.y-=(f*.65+wake*.3)*h*ht;}
   turfPigment=texture2D(paint,vec2(w.x/fieldSize.x+.5,.5-w.y/fieldSize.y)).rgb*mix(.7,1.08,h)*(.88+.24*r)*max(.5,contactShade);`);
  shader.fragmentShader='varying vec3 turfPigment;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal=normalize(vNormal);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance += turfPigment * .06;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb *= turfPigment;');
 };material.customProgramCacheKey=()=>'tevin-painted-wind-turf-v2';}
 const mesh=new THREE.InstancedMesh(g,material,count),matrix=new THREE.Matrix4();for(let i=0;i<count;i++)mesh.setMatrixAt(i,matrix);
 mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;mesh.userData.skipAO=true;mesh.receiveShadow=true;grassM=mesh;scene.add(mesh);document.body.dataset.turf='painted-wind-v1';document.body.dataset.turfBackend=ren.isWebGPURenderer?'webgpu':'webgl';
 for(const side of [-1,1])for(const z of [-30,30]){const flagGeometry=new THREE.PlaneGeometry(3,1.3,12,3),flagMaterial=ENGINE.standardMaterial(ren,{color:side<0?0x559eff:0xf5a34c,side:THREE.DoubleSide,roughness:.85});flagMaterial.userData.team=side<0?0:1;const flag=new THREE.Mesh(flagGeometry,flagMaterial);flag.position.set(side*40,7,z);flag.rotation.y=side*Math.PI/2;scene.add(flag);windFlags.push(flagGeometry.attributes.position);}
}
