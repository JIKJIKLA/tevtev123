// Imported car materials currently have no names. Match their narrow, documented
// window signatures rather than treating every dark material as glass.
function carSurfaceRole(material,paintMaterials){
 if(!material)return 'other';
 if(paintMaterials.has(material))return 'paint';
 const role=String(material.userData?.surfaceRole||material.userData?.materialRole||material.name||'');
 if(/tyre|tire|rim|chrome|headlight|taillight|lamp|brake|paint|body/i.test(role))return 'other';
 if(/glass|window|windscreen|windshield/i.test(role))return 'glass';
 if(role||material.map||!material.color)return 'other';
 const color=material.color.getHex(),near=(a,b)=>Number.isFinite(a)&&Math.abs(a-b)<.001;
 // ENGINE.importedCar: window material; carMesh2: compatibility window material.
 const imported=color===0x07101b&&near(material.metalness,.2)&&near(material.roughness,.2)&&near(material.clearcoat,.8);
 const fallback=color===0x254963&&near(material.metalness,.65)&&near(material.roughness,.15);
 return imported||fallback?'glass':'other';
}
function styleCarSurfaces(model,paintMaterials=model.userData.paintMaterials||[]){
 const paint=new Set(paintMaterials),seen=new Set();
 model.traverse(part=>{for(const material of (Array.isArray(part.material)?part.material:[part.material])){
  if(!material||seen.has(material))continue;seen.add(material);
  if(carSurfaceRole(material,paint)!=='glass')continue;
  material.userData.surfaceRole='glass';material.roughness=.38;material.envMapIntensity=.3;
  if('clearcoat' in material){material.clearcoat=.1;material.clearcoatRoughness=.55;}
 }});
 return model;
}
