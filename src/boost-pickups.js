// Measured pickup positions live in accuracy.js. These meshes never become colliders.
// Original geometry: permanent three-legged housing, separate lenses, light curtains and pill.
const BOOST_PICKUPS={visuals:null};
function boostMerge(parts){
 const data={position:[],normal:[],uv:[],color:[]},shade=new THREE.Color();
 for(const part of parts){const source=part.geometry,g=source.index?source.toNonIndexed():source,p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');
  for(let i=0;i<p.count;i++){data.position.push(p.getX(i),p.getY(i),p.getZ(i));data.normal.push(n.getX(i),n.getY(i),n.getZ(i));data.uv.push(uv?.getX(i)||0,uv?.getY(i)||0);shade.setHex(typeof part.color==='function'?part.color(n.getY(i)):part.color);data.color.push(shade.r,shade.g,shade.b);}
  if(g!==source)g.dispose();source.dispose();
 }
 const result=new THREE.BufferGeometry();for(const [key,values] of Object.entries(data))result.setAttribute(key,new THREE.Float32BufferAttribute(values,key==='uv'?2:3));result.computeBoundingBox();result.computeBoundingSphere();return result;
}
function boostSector(inner,outer,start,end,height,y){
 const s=new THREE.Shape();s.moveTo(Math.cos(start)*outer,Math.sin(start)*outer);s.absarc(0,0,outer,start,end,false);s.lineTo(Math.cos(end)*inner,Math.sin(end)*inner);s.absarc(0,0,inner,end,start,true);s.closePath();
 return new THREE.ExtrudeGeometry(s,{depth:height,steps:1,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:1,curveSegments:5}).rotateX(-Math.PI/2).translate(0,y,0);
}
function boostBaseGeometry(){
 const shape=new THREE.Shape(),parts=[];
 for(let i=0;i<=72;i++){const a=i/72*Math.PI*2,r=.77+.23*Math.cos(a*3),x=Math.cos(a)*r,z=Math.sin(a)*r;shape[i?'lineTo':'moveTo'](x,z);}shape.closePath();
 parts.push({geometry:new THREE.ExtrudeGeometry(shape,{depth:.075,steps:1,bevelEnabled:true,bevelSize:.025,bevelThickness:.018,bevelSegments:1}).rotateX(-Math.PI/2).translate(0,.028,0),color:ny=>ny>.8?0x89939e:ny>.1?0x545f6a:0x1a2028});
 parts.push({geometry:new THREE.CylinderGeometry(.48,.51,.055,32).translate(0,.118,0),color:0x171d24});
 parts.push({geometry:new THREE.RingGeometry(.435,.495,36).rotateX(-Math.PI/2).translate(0,.148,0),color:0xa4acb3});
 parts.push({geometry:new THREE.CylinderGeometry(.4,.42,.035,32).translate(0,.14,0),color:0x343a3e});
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3;parts.push({geometry:boostSector(.59,.965,a-.3,a+.3,.028,.112),color:0x151c24});
  for(const side of [-1,1]){const angle=a+side*.52;parts.push({geometry:new THREE.CylinderGeometry(.025,.028,.015,6).translate(Math.cos(angle)*.56,.12,-Math.sin(angle)*.56),color:0xc3c6c7});}
 }
 return boostMerge(parts);
}
function boostLensGeometry(){
 const parts=[{geometry:new THREE.CylinderGeometry(.352,.37,.014,32).translate(0,.163,0),color:0xffffff}];
 for(let i=0;i<3;i++){const a=i*Math.PI*2/3;parts.push({geometry:boostSector(.66,.91,a-.23,a+.23,.014,.151),color:0xffffff});}
 return boostMerge(parts);
}
function boostCurtainGeometry(){
 const positions=[],uvs=[],indices=[],steps=8;
 for(let arm=0;arm<3;arm++){const base=positions.length/3;for(let j=0;j<=steps;j++){const a=arm*Math.PI*2/3-.25+j/steps*.5;for(let k=0;k<2;k++){const r=k?.99:.87;positions.push(Math.cos(a)*r,.17+k,-Math.sin(a)*r);uvs.push(j/steps,k);}}for(let j=0;j<steps;j++){const i=base+j*2;indices.push(i,i+1,i+2,i+1,i+3,i+2);}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function boostCurtainTexture(){
 const c=cvs(96,128),g=c.getContext('2d'),image=g.createImageData(96,128);
 for(let y=0;y<128;y++)for(let x=0;x<96;x++){const u=x/95,v=1-y/127,side=Math.sin(Math.PI*u),flare=.65+.35*Math.sin(x*.19+Math.sin(y*.12)*1.4),alpha=Math.pow(1-v,2)*Math.pow(side,.45)*flare;const o=(y*96+x)*4;image.data[o]=255;image.data[o+1]=220;image.data[o+2]=132;image.data[o+3]=Math.round(alpha*180);}g.putImageData(image,0,0);return tex(c);
}
function boostOrbTexture(){
 const c=cvs(256,128),g=c.getContext('2d'),image=g.createImageData(256,128);
 for(let y=0;y<128;y++)for(let x=0;x<256;x++){const u=x/256*Math.PI*2,v=y/127*Math.PI,nx=Math.sin(v)*Math.cos(u),ny=Math.cos(v),nz=Math.sin(v)*Math.sin(u);
  const field=Math.sin(nx*16+Math.sin(nz*11)*2.1)+Math.sin(ny*19+Math.cos(nx*13)*1.7)+Math.sin(nz*22+ny*8)*.6,vein=Math.pow(Math.max(0,1-Math.abs(field)*1.5),3),heat=cl(.18+(1-ny)*.38+vein*.78,0,1),o=(y*256+x)*4;
  image.data[o]=Math.round(70+185*heat);image.data[o+1]=Math.round(29+204*Math.pow(heat,1.4));image.data[o+2]=Math.round(8+80*Math.pow(heat,3));image.data[o+3]=255;
 }g.putImageData(image,0,0);const texture=tex(c);texture.wrapS=THREE.RepeatWrapping;return texture;
}
function createBoostPickupSet(pads,textures){
 const group=new THREE.Group();group.name='Three-dimensional boost pickups';
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.62,metalness:.45,envMapIntensity:.55});
 const glow=extra=>new THREE.MeshBasicMaterial({transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,...extra});
 const make=(name,geometry,mat,count,dynamic=true)=>{const mesh=new THREE.InstancedMesh(geometry,mat,count);mesh.name=name;mesh.frustumCulled=false;mesh.userData.skipAO=!!mat.transparent;if(dynamic)mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(mesh);return mesh;};
 const state={group,pads,records:pads.map((p,i)=>({cooldown:p.t||0,mix:p.t>0?0:1,age:99,kind:0,bigIndex:p.big?pads.slice(0,i).filter(q=>q.big).length:-1})),clock:0,initialized:false,live:false,eventSerial:0,particleCursor:0,
  life:new Float32Array(128),total:new Float32Array(128),position:new Float32Array(384),velocity:new Float32Array(384),matrix:new THREE.Matrix4(),point:new V3(),scale:new V3(),rotation:new Qn(),color:new THREE.Color()};
 const big=pads.filter(p=>p.big).length;
 state.base=make('Beveled permanent metal housings',boostBaseGeometry(),material,pads.length,false);
 state.lenses=make('Three amber inserts and center lenses',boostLensGeometry(),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),pads.length);
 state.curtains=make('Three rising light curtains',boostCurtainGeometry(),glow({map:textures.curtain,opacity:.54,side:THREE.DoubleSide}),pads.length);
 state.orbs=make('Floating full-boost plasma pills',new THREE.SphereGeometry(.43,24,16),new THREE.MeshStandardMaterial({map:textures.orb,emissiveMap:textures.orb,emissive:0xffd16a,emissiveIntensity:1.25,color:0xffda86,roughness:.43,metalness:.12,envMapIntensity:.35}),big);
 state.ground=make('Warm pickup ground spill',new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),glow({map:textures.soft,opacity:.34,color:0xffb52c,polygonOffset:true,polygonOffsetFactor:-1}),pads.length);
 state.halos=make('Pill aura',new THREE.PlaneGeometry(1,1),glow({map:textures.soft,opacity:.28,color:0xffb82b}),big);
 state.motes=make('Pooled idle and collection sparks',new THREE.PlaneGeometry(1,1),glow({map:textures.soft,opacity:.9}),192);state.motes.count=0;
 state.pulses=make('Pickup and respawn pulse',new THREE.RingGeometry(.87,1,40).rotateX(-Math.PI/2),glow({opacity:.7,side:THREE.DoubleSide}),pads.length);
 for(const [i,p] of pads.entries()){state.point.set(p.x,0,p.z);state.scale.set(p.big?1.6:.94,p.big?1.22:1,p.big?1.6:.94);state.matrix.compose(state.point,state.rotation,state.scale);state.base.setMatrixAt(i,state.matrix);}
 state.base.instanceMatrix.needsUpdate=true;state.base.receiveShadow=true;
 for(const mesh of [state.lenses,state.motes,state.pulses]){mesh.setColorAt(0,state.color.setHex(0xffca43));mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);}
 return state;
}
function boostPickupBurst(state,index,respawn,motion){
 const p=state.pads[index],record=state.records[index];record.age=0;record.kind=respawn?1:-1;state.eventSerial++;if(!motion)return;
 const count=p.big?(respawn?8:18):(respawn?3:7);
 for(let j=0;j<count;j++){const k=state.particleCursor++%128,o=k*3,a=j*2.399963+index,r=respawn?.4:p.big?.65:.28;
  state.position[o]=p.x+Math.cos(a)*r;state.position[o+1]=p.big?1.25:.22;state.position[o+2]=p.z+Math.sin(a)*r;
  state.velocity[o]=Math.cos(a)*(respawn?.35:1.6);state.velocity[o+1]=respawn?1.4:1.8+(j%4)*.35;state.velocity[o+2]=Math.sin(a)*(respawn?.35:1.6);state.life[k]=state.total[k]=p.big?.6:.42;
 }
}
function tickBoostPickupSet(state,dt,{timers=null,camera=null,motion=true,events=true,playing=false,showcase=false}={}){
 if(!state)return;const step=cl(dt,0,.1),time=state.clock+=step,matrix=state.matrix,pos=state.point,scale=state.scale,q=state.rotation,color=state.color;let count=0;
 const set=(mesh,index,x,y,z,sx,sy,sz,rotation=null)=>{pos.set(x,y,z);scale.set(sx,sy,sz);q.copy(rotation||boostIdentity);matrix.compose(pos,q,scale);mesh.setMatrixAt(index,matrix);};
 for(let i=0;i<state.pads.length;i++){
  const p=state.pads[i],r=state.records[i],timer=showcase?0:Math.max(0,timers?timers[i]||0:p.t||0),active=timer<=0,radius=p.big?1.6:.94,sy=p.big?1.22:1;
  if(state.initialized&&events&&playing&&state.live){if(r.cooldown<=0&&timer>0)boostPickupBurst(state,i,false,motion);else if(r.cooldown>0&&active)boostPickupBurst(state,i,true,motion);}
  r.cooldown=timer;r.mix=active?(state.initialized?Math.min(1,r.mix+step*7):1):0;r.age+=step;const mix=r.mix,pulse=motion?1+Math.sin(time*2.3+i*.71)*.055:1;
  set(state.lenses,i,p.x,0,p.z,radius,sy,radius);color.setHex(active?0xffc542:0x342b1c).multiplyScalar(active?(.75+.25*mix):1);state.lenses.setColorAt(i,color);
  set(state.curtains,i,p.x,.03,p.z,radius*mix,(p.big?1.05:.5)*mix,radius*mix);
  const spill=(p.big?4.5:2.4)*mix*pulse;set(state.ground,i,p.x,.019,p.z,spill,1,spill);
  const wave=motion?Math.sin(time*1.8+i)*.075:0,height=1.57+wave;
  if(p.big){q.setFromAxisAngle(Y3,motion?time*.48+i:0);state.matrix.compose(pos.set(p.x,height,p.z),q,scale.setScalar(mix));state.orbs.setMatrixAt(r.bigIndex,state.matrix);const halo=(1.8+wave)*mix;set(state.halos,r.bigIndex,p.x,height,p.z,halo,halo,1,camera?.quaternion);
   if(active&&motion)for(let j=0;j<6;j++){const u=(time*.3+j/6+i*.131)%1,a=j*2.3999+time*.6,rr=.3+u*.32;set(state.motes,count,p.x+Math.cos(a)*rr,.2+u*1.65,p.z+Math.sin(a)*rr,.035*(1-u),.12*(1-u),1,camera?.quaternion);state.motes.setColorAt(count++,color.setHex(0xffd366).multiplyScalar(Math.sin(Math.PI*u)*.7));}
  }else if(active&&motion){const u=(time*.45+i*.17)%1;set(state.motes,count,p.x+Math.sin(i*5.3)*.19,.2+u*.45,p.z+Math.cos(i*5.3)*.19,.035,.06,1,camera?.quaternion);state.motes.setColorAt(count++,color.setHex(0xffd66d).multiplyScalar(Math.sin(Math.PI*u)*.4));}
  const life=motion&&r.age<.5?1-r.age/.5:0,size=life>0?radius*(.4+r.age*(r.kind>0?2:3)):0;set(state.pulses,i,p.x,.027,p.z,size,1,size);state.pulses.setColorAt(i,color.setHex(r.kind>0?0xffd76c:0xffa82b).multiplyScalar(life));
 }
 for(let k=0;k<128;k++){state.life[k]=Math.max(0,state.life[k]-step);if(!state.life[k]||!motion)continue;const o=k*3;for(let axis=0;axis<3;axis++)state.position[o+axis]+=state.velocity[o+axis]*step;state.velocity[o+1]-=step*2.8;const alpha=state.life[k]/state.total[k],size=.075*alpha;set(state.motes,count,state.position[o],state.position[o+1],state.position[o+2],size,size*1.8,1,camera?.quaternion);state.motes.setColorAt(count++,color.setHex(0xffd66b).multiplyScalar(alpha));}
 state.motes.count=count;state.initialized=true;state.live=playing&&events;
 for(const mesh of [state.lenses,state.curtains,state.orbs,state.ground,state.halos,state.motes,state.pulses]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
}
const boostIdentity=new Qn();
function buildBoostPickups(){
 const state=createBoostPickupSet(PADS,{soft:glowTex(),orb:boostOrbTexture(),curtain:boostCurtainTexture()});BOOST_PICKUPS.visuals=state;scene.add(state.group);tickBoostPickupSet(state,0,{camera:cam,events:false});document.body.dataset.boostPickups='sculpted-3d-v1';
}
function updateBoostPickups(dt,timers=null,events=true){tickBoostPickupSet(BOOST_PICKUPS.visuals,dt,{timers,camera:cam,motion:cinemaMotion(),events,playing:st==='PLAY',showcase:st==='MENU'||st==='END'});}
