// The recovered models share unnamed materials. Recognize their narrow source
// signatures, then retain the role explicitly after styling changes a value.
function carSurfaceRole(material,paintMaterials){
 if(!material)return 'other';
 if(paintMaterials.has(material))return 'paint';
 const role=String(material.userData?.surfaceRole||material.userData?.materialRole||material.name||'');
 if(['paint','glass','rubber','rim','trim','chassis','lamp'].includes(role))return role;
 if(/headlight|taillight|lamp|brake/i.test(role))return 'other';
 if(/tyre|tire|tread/i.test(role))return 'rubber';
 if(/rim|chrome/i.test(role))return 'rim';
 if(/glass|window|windscreen|windshield/i.test(role))return 'glass';
 if(role||!material.color)return 'other';
 const color=material.color.getHex(),near=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<.001;
 const signature=(rgb,roughness,metalness)=>color===rgb&&near(material.roughness,roughness)&&near(material.metalness,metalness);
 if(signature(0x252a30,.95,0))return 'rubber';
 if(signature(0x778593,.32,.85))return 'rim';
 if(signature(0x63717c,.62,.35))return 'chassis';
 if(signature(0x111820,.64,.15))return 'trim';
 if(color===0xe0f5ff&&material.emissive?.getHex()===0xadcfff&&near(material.emissiveIntensity,1.4))return 'lamp';
 if(material.map)return 'other';
 // ENGINE.importedCar: window material; carMesh2: compatibility window material.
 const imported=color===0x07101b&&near(material.metalness,.2)&&near(material.roughness,.2)&&near(material.clearcoat,.8);
 const fallback=color===0x254963&&near(material.metalness,.65)&&near(material.roughness,.15);
 return imported||fallback?'glass':'other';
}
function styleCarSurfaces(model,paintMaterials=model.userData.paintMaterials||[]){
 const paint=new Set(paintMaterials),seen=new Set();
 model.traverse(part=>{for(const material of (Array.isArray(part.material)?part.material:[part.material])){
  if(!material||seen.has(material))continue;seen.add(material);
  const role=carSurfaceRole(material,paint);if(role==='other')continue;material.userData.surfaceRole=role;
  // Real diffuse reflectance and controlled roughness expose the chassis and
  // tread in shade; they do not add a bloom pass or brighten arbitrary artwork.
  if(role==='paint'){material.roughness=.72;material.metalness=.04;material.envMapIntensity=.58;if('clearcoat' in material)material.clearcoat=0;}
  if(role==='glass'){material.roughness=.38;material.envMapIntensity=.3;if('clearcoat' in material){material.clearcoat=.1;material.clearcoatRoughness=.55;}}
  // Imported chassis/tyre atlases ALREADY contain dark rubber, painted metal
  // and baked recesses. Multiplying them by another dark sRGB colour crushed
  // the rear into a black slab. Let those maps supply their own reflectance;
  // untextured fallback geometry still needs its solid material colour.
  if(role==='rubber'){material.color.setHex(material.map?0xffffff:0x474c50);material.roughness=.96;material.metalness=0;material.envMapIntensity=.36;material.normalScale?.set(.45,.45);}
  if(role==='rim'){material.color.setHex(material.map?0xf1f4f5:0x8d999f);material.roughness=.42;material.metalness=.62;material.envMapIntensity=.62;}
  if(role==='chassis'){material.color.setHex(material.map?0xf1f4f5:0x7a8d99);material.roughness=.82;material.metalness=.08;material.envMapIntensity=.55;}
  if(role==='trim'){material.color.setHex(0x404a51);material.roughness=.8;material.metalness=.06;material.envMapIntensity=.4;}
  if(role==='lamp')material.emissiveIntensity=.85;
 }});
 return model;
}

// Derive only the existing teal connectors from the supplied ball atlas. Foam,
// seams, metallic panels and black atlas padding remain unlit. No new artwork.
function ballPortPixels(source){
 const result=new Uint8ClampedArray(source.length);
 for(let i=0;i+3<source.length;i+=4){const r=source[i],g=source[i+1],b=source[i+2],teal=g>65&&g>r*1.25&&b>r*1.1&&b>g*.55?Math.max(0,Math.min(1,Math.min(g-r*1.25,b-r*1.1)/70)):0;result[i]=result[i+1]=result[i+2]=Math.round(teal*255);result[i+3]=255;}
 return result;
}
function styleMatchBall(mesh){
 const material=mesh?.material;if(!material?.emissive||material.userData.matchBallStyled)return mesh;
 material.roughness=.5;material.metalness=.14;material.envMapIntensity=.58;
 if('clearcoat' in material){material.clearcoat=.08;material.clearcoatRoughness=.65;}
 let portMap=false;const source=material.map,image=source?.image;
 if(image&&(image.width||image.naturalWidth)>0)try{
  const canvas=cvs(256,256),context=canvas.getContext('2d');context.drawImage(image,0,0,256,256);const pixels=context.getImageData(0,0,256,256);pixels.data.set(ballPortPixels(pixels.data));context.putImageData(pixels,0,0);
  const map=tex(canvas);map.name='Original ball connector emission';map.userData.surfaceRole='ball-port-mask';map.flipY=source.flipY;map.wrapS=source.wrapS;map.wrapT=source.wrapT;map.repeat.copy(source.repeat);map.offset.copy(source.offset);map.rotation=source.rotation;material.emissiveMap=map;portMap=true;
 }catch(error){console.warn('Ball connector map unavailable; retaining panel texture',error);}
 mesh.userData.baseBallGlow=portMap?0x6cbcc8:0x222222;material.emissive.setHex(mesh.userData.baseBallGlow);material.emissiveIntensity=portMap?.7:.06;material.userData.matchBallStyled=true;material.userData.ballPortMaskReady=portMap;material.needsUpdate=true;return mesh;
}
