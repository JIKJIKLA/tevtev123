// Static buffers and PBR maps extracted from the supplied F22Raptor.blend; no remote model loader.
const JET={spec:null,images:null,loading:null,sounded:false};
function jetBytes(value,ArrayType){const raw=atob(value),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new ArrayType(bytes.buffer);}
function jetSpecification(){if(!JET.spec)JET.spec=JSON.parse('JET:mesh');return JET.spec;}
function jetMeshGeometry(part){
 const packed=jetBytes(part.p,Int16Array),normal=jetBytes(part.n,Int8Array),uv=jetBytes(part.uv,Uint16Array),positions=new Float32Array(packed.length),normals=new Float32Array(normal.length),coords=new Float32Array(uv.length);
 for(let i=0;i<packed.length;i++){const axis=i%3;positions[i]=part.min[axis]+(packed[i]+32768)/65535*part.span[axis];normals[i]=normal[i]/127;}for(let i=0;i<uv.length;i++)coords[i]=uv[i]/65535;
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('normal',new THREE.BufferAttribute(normals,3));g.setAttribute('uv',new THREE.BufferAttribute(coords,2));g.setIndex(new THREE.BufferAttribute(jetBytes(part.index,Uint16Array),1));g.computeBoundingSphere();return g;
}
async function loadJetAssets(){
 if(window.__TEVIN_SERVER__||JET.images)return;if(JET.loading)return JET.loading;
 JET.loading=(async()=>{jetSpecification();const loader=new THREE.ImageLoader();JET.images=await Promise.all(['JET:albedo','JET:normal','JET:surface'].map(url=>loader.loadAsync(url)));document.body.dataset.jet='supplied-f22-pbr';})().finally(()=>JET.loading=null);return JET.loading;
}
function createJetVisual(){
 const group=new THREE.Group();group.name='Supplied F-22 Raptor';if(!JET.images)return group;
 const maps=JET.images.map((image,i)=>{const t=new THREE.Texture(image);t.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=4;t.needsUpdate=true;return t;}),body=new THREE.MeshStandardMaterial({map:maps[0],normalMap:maps[1],normalScale:new THREE.Vector2(.65,.65),metalnessMap:maps[2],roughnessMap:maps[2],metalness:.55,roughness:.82,envMapIntensity:.8}),glass=new THREE.MeshStandardMaterial({color:0x858e73,transparent:true,opacity:.64,metalness:.5,roughness:.16,envMapIntensity:1.1,depthWrite:false}),hud=new THREE.MeshStandardMaterial({color:0x89cbbc,transparent:true,opacity:.6,roughness:.25,metalness:.15,emissive:0x153a32});
 for(const part of jetSpecification().meshes){const m=new THREE.Mesh(jetMeshGeometry(part),part.name.includes('canopy')||part.name.includes('instrGlass')?glass:part.name.endsWith('hud')?hud:body);m.name=part.name;group.add(m);}
 const flames=new THREE.Group();flames.name='Twin afterburners';group.add(flames);
 const pixels=new Uint8Array(256*48*4);
 for(let y=0;y<48;y++)for(let x=0;x<256;x++){const u=x/255,v=(y/47-.5)*2,core=Math.pow(u,.6),width=.2+u*.7,edge=Math.pow(Math.max(0,1-v*v/(width*width)),2),diamonds=.76+.24*Math.cos((1-u)*Math.PI*9),i=(y*256+x)*4;pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=edge*core*diamonds*180;}const flameMap=new THREE.DataTexture(pixels,256,48);flameMap.minFilter=flameMap.magFilter=THREE.LinearFilter;flameMap.needsUpdate=true;
 const flame=new THREE.MeshBasicMaterial({map:flameMap,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 for(const z of [-.75,.75])for(const angle of [0,Math.PI/2]){const plume=new THREE.Mesh(new THREE.PlaneGeometry(5.2,.68),flame);plume.position.set(-10.4,-.45,z);plume.rotation.x=angle;flames.add(plume);}
 group.userData.flames=flames;batchMeshes(group);group.visible=false;group.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});return group;
}
// Local presentation clock only. The same analytic path builds both jets and smoke,
// so trails follow the split correctly even after a skipped display frame.
const AIRSHOW={colors:[0xff8c25,0x269eff,0x269eff],split:1.3,end:3.7,samples:64,trailSeconds:1.45};
function airshowImpactMotion(){return cinemaMotion()&&RIVAL_PREF.flybyShake;}
function airshowJetPose(elapsed,index=0,motion=true){
 const t=Math.max(0,elapsed),side=index===1?-1:index===2?1:0,u=Math.max(0,t-AIRSHOW.split),turn=1-Math.exp(-u/.32),lift=cinemaEase(u/1.8);let x=side*8,z=(1.6-t)*110+(side?8:0),vx=0,vz=-110;
 if(side&&u>0){x=side*(8+110*(u-.32*turn));z=41-110*.38*(1-Math.exp(-u/.38));vx=side*110*turn;vz=-110*Math.exp(-u/.38);}
 const y=42+(side?1.7+lift*9:0),yaw=-Math.atan2(vz,vx),bank=side*(Math.sin(Math.min(1,u/1.2)*Math.PI)*.78),pitch=side?Math.atan2(9*(u<1.8?6*(u/1.8)*(1-u/1.8)/1.8:0),Math.hypot(vx,vz)):0;
 return{x,y,z,yaw,bank,pitch,visible:motion&&elapsed>=.05&&elapsed<AIRSHOW.end,color:AIRSHOW.colors[index]??AIRSHOW.colors[0]};
}
function jetFlybyPose(elapsed,motion=true){
 const proximity=Math.exp(-Math.pow((elapsed-1.58)/.24,2)),wake=cinemaEase((elapsed-1.4)/.2)*(1-cinemaEase((elapsed-1.8)/.65)),power=motion?Math.max(proximity*.95,wake*.4):0;
 return{...airshowJetPose(elapsed,0,motion),shakeX:Math.sin(elapsed*103)*power*.095,shakeY:Math.sin(elapsed*127)*power*.065,uiX:Math.sin(elapsed*91)*power*3.5,uiY:Math.sin(elapsed*113)*power*2.5,power};
}
function airshowTrailGeometry(samples=AIRSHOW.samples){
 const g=new THREE.BufferGeometry(),uv=new Float32Array((samples+1)*4),indices=[];
 g.setAttribute('position',new THREE.BufferAttribute(new Float32Array((samples+1)*6),3).setUsage(THREE.DynamicDrawUsage));
 for(let i=0;i<=samples;i++){uv.set([i/samples,0,i/samples,1],i*4);if(i){const b=i*2;indices.push(b-2,b-1,b,b-1,b+1,b);}}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setIndex(indices);return g;
}
function airshowTrailMap(){
 const data=new Uint8Array(128*32*4);
 for(let y=0;y<32;y++)for(let x=0;x<128;x++){const age=x/127,edge=Math.pow(Math.max(0,1-Math.pow((y/31-.5)*2,2)),2),i=(y*128+x)*4;data[i]=data[i+1]=data[i+2]=255;data[i+3]=255*edge*Math.pow(1-age,1.6)*cinemaEase((1-age)/.16);}
 const map=new THREE.DataTexture(data,128,32);map.minFilter=map.magFilter=THREE.LinearFilter;map.needsUpdate=true;return map;
}
function createAirshowVisuals(){
 const group=new THREE.Group();group.name='Three-ship airshow';const prototype=createJetVisual(),map=airshowTrailMap(),jets=[],trails=[];delete prototype.userData.flames;
 for(let i=0;i<3;i++){
  // clone shares the original mesh buffers and PBR maps across all three aircraft.
  const jet=i?prototype.clone(true):prototype;jet.name=i===0?'Orange leader':i===1?'Blue left wingman':'Blue right wingman';const flames=jet.getObjectByName('Twin afterburners');jet.userData.flames=flames;
  if(flames){const material=flames.children[0].material.clone();material.color.setHex(AIRSHOW.colors[i]);flames.children.forEach(m=>m.material=material);}group.add(jet);jets.push(jet);delete prototype.userData.flames;
  for(let layer=0;layer<2;layer++){const material=new THREE.MeshBasicMaterial({map,color:AIRSHOW.colors[i],transparent:true,opacity:layer?.7:.5,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,blending:layer?THREE.AdditiveBlending:THREE.NormalBlending}),trail=new THREE.Mesh(airshowTrailGeometry(),material);trail.name=jet.name+(layer?' luminous exhaust':' colored smoke');trail.frustumCulled=false;Object.assign(trail.userData,{aircraft:i,width:layer?.3:1.5});group.add(trail);trails.push(trail);}
 }
 if(jets[0])jets[0].userData.flames=jets[0].getObjectByName('Twin afterburners');group.visible=false;return{group,jets,trails};
}
const airshowTrailPoint=new V3(),airshowTrailNext=new V3(),airshowTrailSide=new V3(),airshowTrailView=new V3(),airshowTrailForward=new V3();
function writeAirshowTrail(trail,elapsed,camera,originZ=0,direction=1){
 const positions=trail.geometry.getAttribute('position'),samples=positions.count/2-1,index=trail.userData.aircraft;
 for(let i=0;i<=samples;i++){
  const age=i/samples,time=Math.max(.05,elapsed-age*AIRSHOW.trailSeconds),p=airshowJetPose(time,index),next=airshowJetPose(time+.01,index);
  airshowTrailPoint.set(p.x,p.y,originZ+p.z*direction);airshowTrailNext.set(next.x,next.y,originZ+next.z*direction);airshowTrailForward.copy(airshowTrailNext).sub(airshowTrailPoint).normalize();airshowTrailPoint.addScaledVector(airshowTrailForward,-8.7);
  airshowTrailView.copy(camera.position).sub(airshowTrailPoint);airshowTrailSide.crossVectors(airshowTrailForward,airshowTrailView).normalize();if(airshowTrailSide.lengthSq()<.01)airshowTrailSide.set(0,1,0);
  const width=trail.userData.width*(1+age*1.2),drift=Math.sin(time*6+index)*age*age*.45;airshowTrailPoint.y+=age*age*.5;airshowTrailPoint.x+=drift;
  positions.setXYZ(i*2,airshowTrailPoint.x-airshowTrailSide.x*width,airshowTrailPoint.y-airshowTrailSide.y*width,airshowTrailPoint.z-airshowTrailSide.z*width);positions.setXYZ(i*2+1,airshowTrailPoint.x+airshowTrailSide.x*width,airshowTrailPoint.y+airshowTrailSide.y*width,airshowTrailPoint.z+airshowTrailSide.z*width);
 }positions.needsUpdate=true;
}
function clearFlyby(){JET.sounded=false;document.body.classList.remove('jet-impact');document.body.style.removeProperty('--jet-x');document.body.style.removeProperty('--jet-y');if(OPENING.visuals?.airshow)OPENING.visuals.airshow.group.visible=false;}
function updateJetFlyby(visuals,elapsed){
 const motion=cinemaMotion(),pose=jetFlybyPose(elapsed,motion),fleet=visuals.airshow,direction=OPENING.target.z< -10?-1:1;fleet.group.visible=motion&&elapsed>=.05&&elapsed<AIRSHOW.end+.5;
 for(let i=0;i<fleet.jets.length;i++){const jet=fleet.jets[i],p=airshowJetPose(elapsed,i,motion);jet.visible=p.visible;if(p.visible){jet.position.set(p.x,p.y,OPENING.target.z+p.z*direction);jet.quaternion.setFromEuler(new THREE.Euler(0,p.yaw*direction,0));jet.rotateZ(p.pitch);jet.rotateX(p.bank*direction);if(jet.userData.flames)jet.userData.flames.scale.x=1+Math.sin(elapsed*81+i)*.08;}}
 for(const trail of fleet.trails){trail.visible=fleet.group.visible;trail.material.opacity=(trail.userData.width<1?.7:.5)*(1-cinemaEase((elapsed-AIRSHOW.end)/.5));if(trail.visible)writeAirshowTrail(trail,Math.min(elapsed,AIRSHOW.end),cam,OPENING.target.z,direction);}
 const active=pose.power>.01&&airshowImpactMotion();document.body.classList.toggle('jet-impact',active);if(active){document.body.style.setProperty('--jet-x',pose.uiX.toFixed(2)+'px');document.body.style.setProperty('--jet-y',pose.uiY.toFixed(2)+'px');}
 if(!JET.sounded&&elapsed>=1.3){JET.sounded=true;if(elapsed<2.2&&motion){audioSample('boostStart',.6,.65);audioSample('wall2',.28,.7);}}
 return pose;
}
