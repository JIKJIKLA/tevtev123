let PITCH_TEXTURE=null;
const TURF_TILE_SIZE=20;
const TURF_PROFILE=Object.freeze({chromebookCount:30000,detailCount:42000,nearChromebookCount:40000,nearDetailCount:54000,nearTileSize:8,minHeight:.045,maxHeight:.067,fadeStart:5.8,fadeEnd:9.65,nearMinHeight:.05,nearMaxHeight:.075,nearFadeStart:2.8,nearFadeEnd:3.9,ground:.006,groom:.014,wind:.52});
function turfUniforms(paint,fieldX,fieldZ,near=false,shared=null){
 const p=TURF_PROFILE,u={t:{value:0},wind:{value:1},paint:shared?.paint||{value:paint},fieldSize:shared?.fieldSize||{value:new THREE.Vector2(fieldX,fieldZ)},turfProfile:{value:new THREE.Vector4(near?p.nearMinHeight:p.minHeight,near?p.nearMaxHeight:p.maxHeight,near?p.nearFadeStart:p.fadeStart,near?p.nearFadeEnd:p.fadeEnd)},turfShape:{value:new THREE.Vector4(near?p.nearTileSize:TURF_TILE_SIZE,p.ground,p.groom,p.wind)}};
 for(let k=0;k<7;k++){u['c'+k]=shared?.['c'+k]||{value:new V3(1000,1000,1000)};u['v'+k]=shared?.['v'+k]||{value:new V3()};}return u;
}
function turfRootOffsets(count,tileSize=TURF_TILE_SIZE){
 const off=new Float32Array(count*3),columns=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/columns);
 let seed=2031;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 // Both shader paths wrap a square tile. A taller source grid wraps its last
 // rows onto the first rows and produces a conspicuous strip of denser grass.
 for(let i=0;i<count;i++){off[i*3]=((i%columns+random())/columns)*tileSize;off[i*3+1]=((Math.floor(i/columns)+random())/rows)*tileSize;off[i*3+2]=random();}
 return off;
}
function turfGeometry(){
 const positions=[],normals=[],indices=[];
 for(let blade=0;blade<4;blade++){
  // Four overlapping curved leaves spread into a clipped canopy rather than
  // isolated spikes. Dense roots and a broad shoulder hide the plane between tufts.
  const a=blade*1.5708+.24,dx=Math.cos(a),dz=Math.sin(a),sx=-dz,sz=dx,base=positions.length/3,height=[1,.84,.95,.78][blade],root=.012;
  for(const [t,width] of [[0,.0115],[.42,.012],[.76,.006],[1,0]]){
   const center=root+t*t*.04,ny=.9-t*.14,nx=dx*(.25+t*.22),nz=dz*(.25+t*.22),inv=1/Math.hypot(nx,ny,nz);
   for(const side of width?[-1,1]:[0]){positions.push(dx*center+sx*width*side,t*height,dz*center+sz*width*side);normals.push(nx*inv,ny*inv,nz*inv);}
  }
  indices.push(base,base+1,base+2,base+1,base+3,base+2,base+2,base+3,base+4,base+3,base+5,base+4,base+4,base+5,base+6);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);
 g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.computeBoundingSphere();return g;
}
function turfMaterial(uniforms){
 const material=ren.isWebGPURenderer?ENGINE.nodeGrass(uniforms):new THREE.MeshStandardMaterial({side:THREE.DoubleSide,roughness:.97,metalness:0,envMapIntensity:.18});
 if(!ren.isWebGPURenderer){material.name='Groomed championship turf / WebGL';material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='attribute vec3 off;uniform float t,wind;uniform sampler2D paint;uniform vec2 fieldSize;uniform vec4 turfProfile,turfShape;uniform vec3 c0,c1,c2,c3,c4,c5,c6,v0,v1,v2,v3,v4,v5,v6;varying vec3 turfPigment;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`float na=off.z*6.2831;vec3 objectNormal=vec3(normal.x*cos(na)-normal.z*sin(na),normal.y,normal.x*sin(na)+normal.z*cos(na));
   #ifdef USE_TANGENT
    vec3 objectTangent=vec3(tangent.xyz);
   #endif`);
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`float r=off.z,h=position.y;float tileSize=turfShape.x;vec2 w=mod(off.xy-cameraPosition.xz+tileSize*.5,tileSize)+cameraPosition.xz-tileSize*.5;float fade=(1.-smoothstep(turfProfile.z,turfProfile.w,length(cameraPosition.xz-w)))*step(abs(w.x),fieldSize.x*.5-4.16)*step(abs(w.y),fieldSize.y*.5-4.4);float ht=mix(turfProfile.x,turfProfile.y,r)*fade;
   float a=r*6.2831;vec3 transformed=vec3(w.x+(position.x*cos(a)-position.z*sin(a))*fade,turfShape.y+h*ht,w.y+(position.x*sin(a)+position.z*cos(a))*fade);
   float groom=sin(w.y*.23)*turfShape.z*h*h*fade;float wave=(sin(t*1.18+w.x*.48+w.y*.27)*.5+sin(t*2.4+w.y*.65+r*7.)*.16+sin(t*4.8+w.x*2.2+r*5.)*.05)*h*h*ht*turfShape.w*wind;transformed.xz+=vec2(wave,groom+wave*.42);
   vec3 ob[7];ob[0]=c0;ob[1]=c1;ob[2]=c2;ob[3]=c3;ob[4]=c4;ob[5]=c5;ob[6]=c6;vec3 vel[7];vel[0]=v0;vel[1]=v1;vel[2]=v2;vel[3]=v3;vel[4]=v4;vel[5]=v5;vel[6]=v6;float contactShade=1.,compression=1.;
   for(int i=0;i<7;i++){vec2 q=w-ob[i].xz;float nearGround=1.-smoothstep(.6,2.,ob[i].y);float f=(1.-smoothstep(.2,1.15,length(q)))*nearGround;float core=(1.-smoothstep(.12,i==6?1.05:.72,length(q)))*nearGround;contactShade*=1.-core*.28;vec2 dir=vel[i].xz/max(length(vel[i].xz),.001),radial=q+vec2(.0001);radial/=max(length(radial),.0001);float along=dot(q,dir),side=length(q-dir*along);float wake=(1.-smoothstep(.35,1.1,side))*smoothstep(-3.8,-.5,along)*(1.-smoothstep(-.2,.5,along))*min(length(vel[i].xz)/23.,1.)*nearGround;transformed.xz+=(radial*f*.045+dir*wake*.065)*h*h*fade;compression*=1.-min(.75,f*.56+wake*.24);}
   transformed.y=turfShape.y+h*ht*max(.18,compression);float turfVariation=sin(w.x*.61+w.y*.33)*sin(w.y*.77-w.x*.2)*.065;float fiber=mix(.60,1.14,h)*(.86+.26*r+turfVariation)*max(.64,contactShade);
   turfPigment=texture2D(paint,vec2(w.x/fieldSize.x+.5,.5-w.y/fieldSize.y)).rgb*fiber;`);
  shader.fragmentShader='varying vec3 turfPigment;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal=normalize(vNormal);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance += turfPigment * .035;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb *= turfPigment;');
 };material.customProgramCacheKey=()=>'nivet-groomed-turf-v6';}return material;
}
function makeGrass(){
 const group=new THREE.Group();group.name='Two-tier groomed turf carpet';const matrix=new THREE.Matrix4(),base=turfUniforms(PITCH_TEXTURE,2*HX,2*HZ),near=turfUniforms(PITCH_TEXTURE,2*HX,2*HZ,true,base),layers=[base,near];GU=base;GU.layers=layers;
 for(let layer=0;layer<2;layer++){
  const count=layer?(cfg.hi?TURF_PROFILE.nearDetailCount:TURF_PROFILE.nearChromebookCount):(cfg.hi?TURF_PROFILE.detailCount:TURF_PROFILE.chromebookCount),uniforms=layers[layer],g=turfGeometry();g.setAttribute('off',new THREE.InstancedBufferAttribute(turfRootOffsets(count,uniforms.turfShape.value.x),3));g.instanceCount=count;
  const mesh=new THREE.InstancedMesh(g,turfMaterial(uniforms),count);mesh.name=layer?'Dense near-camera clipped fibers':'Field-scale clipped fibers';for(let i=0;i<count;i++)mesh.setMatrixAt(i,matrix);mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;mesh.userData.skipAO=true;mesh.receiveShadow=true;group.add(mesh);
 }
 grassM=group;scene.add(group);document.body.dataset.turf='groomed-carpet-v6';document.body.dataset.turfBackend=ren.isWebGPURenderer?'webgpu':'webgl';
 for(const side of [-1,1])for(const z of [-30,30]){const flagGeometry=new THREE.PlaneGeometry(3,1.3,12,3),flagMaterial=ENGINE.standardMaterial(ren,{color:side<0?0x559eff:0xf5a34c,side:THREE.DoubleSide,roughness:.85});flagMaterial.userData.team=side<0?0:1;const flag=new THREE.Mesh(flagGeometry,flagMaterial);flag.position.set(side*40,7,z);flag.rotation.y=side*Math.PI/2;scene.add(flag);windFlags.push(flagGeometry.attributes.position);}
}
