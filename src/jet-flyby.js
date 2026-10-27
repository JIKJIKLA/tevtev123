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
 const maps=JET.images.map((image,i)=>{const t=new THREE.Texture(image);t.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=4;t.needsUpdate=true;return t;}),body=new THREE.MeshStandardMaterial({map:maps[0],normalMap:maps[1],normalScale:new THREE.Vector2(.65,.65),metalnessMap:maps[2],roughnessMap:maps[2],metalness:.45,roughness:.9,envMapIntensity:.45}),glass=new THREE.MeshStandardMaterial({color:0x6e786c,transparent:true,opacity:.52,metalness:.42,roughness:.18,envMapIntensity:.9,depthWrite:false}),hud=new THREE.MeshStandardMaterial({color:0x89cbbc,transparent:true,opacity:.6,roughness:.25,metalness:.15,emissive:0x153a32});
 for(const part of jetSpecification().meshes){const m=new THREE.Mesh(jetMeshGeometry(part),part.name.includes('canopy')||part.name.includes('instrGlass')?glass:part.name.endsWith('hud')?hud:body);m.name=part.name;group.add(m);}
 const flames=new THREE.Group();flames.name='Twin afterburners';group.add(flames);
 const canvas=cvs(256,48),context=canvas.getContext('2d'),pixels=context.createImageData(256,48);
 for(let y=0;y<48;y++)for(let x=0;x<256;x++){const u=x/255,v=(y/47-.5)*2,core=Math.pow(u,.6),width=.2+u*.7,edge=Math.pow(Math.max(0,1-v*v/(width*width)),2),diamonds=.76+.24*Math.cos((1-u)*Math.PI*9),i=(y*256+x)*4;pixels.data[i]=110+core*90;pixels.data[i+1]=120+core*100;pixels.data[i+2]=220+core*35;pixels.data[i+3]=edge*core*diamonds*180;}context.putImageData(pixels,0,0);
 const flame=new THREE.MeshBasicMaterial({map:tex(canvas),transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
 for(const z of [-.75,.75])for(const angle of [0,Math.PI/2]){const plume=new THREE.Mesh(new THREE.PlaneGeometry(5.2,.68),flame);plume.position.set(-10.4,-.45,z);plume.rotation.x=angle;flames.add(plume);}
 group.userData.flames=flames;group.visible=false;group.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});return group;
}
function jetFlybyPose(elapsed,motion=true){
 const t=elapsed,proximity=Math.exp(-Math.pow((t-1.02)/.23,2)),tail=cinemaEase((t-.82)/.2)*(1-cinemaEase((t-1.55)/.45)),power=motion?Math.max(proximity*.8,tail*.35):0;
 return{x:(t-1.02)*215,y:35.6+Math.sin(t*.8)*.4,z:-1.8+(t-1.02)*5,bank:Math.sin(t*1.7)*.12,visible:motion&&t>.08&&t<2.25,shakeX:Math.sin(t*103)*power*.07,shakeY:Math.sin(t*127)*power*.045,uiX:Math.sin(t*91)*power*2.5,uiY:Math.sin(t*113)*power*1.8,power};
}
function clearFlyby(){JET.sounded=false;document.body.classList.remove('jet-impact');document.body.style.removeProperty('--jet-x');document.body.style.removeProperty('--jet-y');}
function updateJetFlyby(visuals,elapsed){
 const pose=jetFlybyPose(elapsed,cinemaMotion()),jet=visuals.jet;jet.visible=pose.visible;if(pose.visible){jet.position.set(pose.x,pose.y,OPENING.target.z+pose.z);jet.rotation.set(pose.bank,0,.025);jet.userData.flames.scale.x=1+Math.sin(elapsed*81)*.08;}
 const active=pose.power>.01;document.body.classList.toggle('jet-impact',active);if(active){document.body.style.setProperty('--jet-x',pose.uiX.toFixed(2)+'px');document.body.style.setProperty('--jet-y',pose.uiY.toFixed(2)+'px');}
 if(!JET.sounded&&elapsed>=.78){JET.sounded=true;if(elapsed<1.8&&cinemaMotion()){audioSample('boostStart',.6,.65);audioSample('wall2',.28,.7);}}
 return pose;
}
