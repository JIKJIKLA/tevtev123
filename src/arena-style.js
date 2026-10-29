// Skyline arena: cached photography, baked color and shared geometry.
async function loadStadiumSky(){
 let visible;
 try{visible=await new THREE.TextureLoader().loadAsync('SKY:stadium');}
 catch(error){console.warn('Photographic sky unavailable; using built-in sky',error);visible=arenaSky();}
 visible.colorSpace=THREE.SRGBColorSpace;visible.mapping=THREE.EquirectangularReflectionMapping;
 const lighting=stadiumRadianceTexture(visible.image);
 return {visible,lighting};
}
function arenaSky(reflection=false){
 const c=cvs(reflection?1024:2048,reflection?512:1024),g=c.getContext('2d'),w=c.width,h=c.height;
 const sky=g.createLinearGradient(0,0,0,h);
 for(const [at,color] of [[0,'#112e76'],[.23,'#246db6'],[.43,'#75c9ed'],[.5,'#c3e9ee'],[.56,'#ffc996'],[.64,'#244b68'],[1,'#102d27']])sky.addColorStop(at,color);
 g.fillStyle=sky;g.fillRect(0,0,w,h);
 // A broad, warm horizon and wispy clouds keep the open roof from looking flat.
 const glow=g.createRadialGradient(w*.68,h*.48,0,w*.68,h*.48,w*.2);
 glow.addColorStop(0,'rgba(255,232,181,.65)');glow.addColorStop(.25,'rgba(255,207,140,.2)');glow.addColorStop(1,'rgba(255,208,140,0)');
 g.fillStyle=glow;g.fillRect(0,0,w,h);
 for(let i=0;i<26;i++){
  const x=((i*619)%2048)/2048*w,y=(.25+(i*7%17)*.009)*h,r=(.018+(i%4)*.009)*w;
  for(const wrap of [-w,0,w]){g.save();g.translate(x+wrap,y);g.scale(3,.28);const cloud=g.createRadialGradient(0,0,0,0,0,r);cloud.addColorStop(0,'rgba(242,251,255,.24)');cloud.addColorStop(1,'rgba(242,251,255,0)');g.fillStyle=cloud;g.fillRect(-r,-r,r*2,r*2);g.restore()}
 }
 if(reflection){for(let i=0;i<4;i++){g.fillStyle='#eefaff';g.fillRect(i*256+28,84,164,24)}g.fillStyle='#329aff';g.fillRect(20,240,220,24);g.fillStyle='#ff9636';g.fillRect(532,240,220,24)}
 const t=tex(c);if(reflection)t.mapping=THREE.EquirectangularReflectionMapping;return t;
}

function arenaPitchMaterial(){return championshipPitchMaterial();}

function arenaPanelMaterial(color=0x536579){
 const c=cvs(256,256),g=c.getContext('2d');g.fillStyle='#a5adb0';g.fillRect(0,0,256,256);
 for(let y=0;y<256;y+=64)for(let x=0;x<256;x+=128){
  const shade=g.createLinearGradient(x,y,x,y+64);shade.addColorStop(0,'#bdc4c3');shade.addColorStop(.10,'#9aa5a9');shade.addColorStop(.88,'#9da8ad');shade.addColorStop(1,'#7b898e');g.fillStyle=shade;g.fillRect(x+1,y+1,126,62);
  g.fillStyle='#3e505a';g.fillRect(x,y,128,1);g.fillRect(x,y,1,64);g.fillStyle='#d5dbd7';g.fillRect(x+2,y+2,123,1);
  for(const bx of [x+5,x+122]){g.fillStyle='#34454d';g.fillRect(bx,y+5,3,3);g.fillStyle='#c1c9c7';g.fillRect(bx,y+5,2,1);}
  for(let i=0;i<3;i++){g.fillStyle='#708089';g.fillRect(x+101+i*5,y+50,2,6);}
 }
 let seed=3179;for(let i=0;i<2600;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed&255,y=seed>>>8&255;g.fillStyle=i%2?'#edf2df0c':'#132c3910';g.fillRect(x,y,2+(seed>>>16&3),.5);}
 const map=tex(c),normal=arenaSurfaceNormal(c);for(const texture of [map,normal]){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(3,2);texture.anisotropy=4;}
 const material=new THREE.MeshStandardMaterial({color,map,normalMap:normal,normalScale:new THREE.Vector2(.16,.16),roughness:.76,metalness:.3,envMapIntensity:.24});material.name='Brushed stadium panel';return material;
}
// The inner corner curves upward outside the rectangular collision opening.
// No rounded decorative vertex narrows the usable GX/GH mouth.
function goalSurroundGeometry(inset=.12,width=.7,depth=.64){
 const x=GX+.1+inset,y=GH+.1+inset,r=.58,outer=x+width,ro=r+width,base=-.24,p=new THREE.Shape();
 p.moveTo(-outer,base);p.lineTo(-outer,y);p.quadraticCurveTo(-outer,y+ro,-x+r,y+ro);p.lineTo(x-r,y+ro);p.quadraticCurveTo(outer,y+ro,outer,y);p.lineTo(outer,base);p.lineTo(x,base);p.lineTo(x,y);p.quadraticCurveTo(x,y+r,x-r,y+r);p.lineTo(-x+r,y+r);p.quadraticCurveTo(-x,y+r,-x,y);p.lineTo(-x,base);p.closePath();
 const geometry=new THREE.ExtrudeGeometry(p,{depth,steps:1,curveSegments:8,bevelEnabled:true,bevelSegments:1,bevelSize:Math.min(.025,width*.18),bevelThickness:.025});geometry.translate(0,0,-depth/2);geometry.computeBoundingBox();return geometry;
}
function goalTunnelRibGeometry(){return goalSurroundGeometry(.13,.105,.13);}
function decorateArenaGoals(target=scene){
 const structure=arenaPanelMaterial(0xa7aaa0),backing=arenaPanelMaterial(0x3c4544),dark=new THREE.MeshStandardMaterial({color:0x202726,roughness:.9,metalness:.1}),edge=new THREE.MeshStandardMaterial({color:0xb7b8a7,roughness:.72,metalness:.3,envMapIntensity:.25});
 const group=new THREE.Group();group.name='Layered championship goal tunnels';const haloGeometry=goalFrameHaloGeometry(),haloMap=glowTex(),frameGeometry=goalSurroundGeometry(),gasketGeometry=goalSurroundGeometry(.11,1.02,1.1),beadGeometry=goalSurroundGeometry(.055,.045,.12),channelGeometry=goalSurroundGeometry(.32,.095,.12),ribGeometry=goalTunnelRibGeometry();
 const box=(x,y,z,w,h,d,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m);return m;};
 for(const sign of [-1,1]){
  const team=sign<0?0:1,color=teamPalette[team],strip=new THREE.MeshBasicMaterial({color,toneMapped:false});strip.userData.team=team;
  const shell=(geometry,material,z)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.z=sign*z;group.add(mesh);return mesh;};
  shell(gasketGeometry,dark,HZ+.37);shell(frameGeometry,structure,HZ+.02);shell(beadGeometry,edge,HZ-.36);shell(channelGeometry,strip,HZ-.39);
  const haloMaterial=new THREE.MeshBasicMaterial({map:haloMap,color,transparent:true,opacity:.11,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,toneMapped:false});haloMaterial.userData.team=team;
  const halo=shell(haloGeometry,haloMaterial,HZ-.61);halo.name='Local goal-channel glow';
  // Recessed ribs, reveal gaps and dark backing remain behind the existing nets.
  for(const fraction of [.23,.51,.79])shell(ribGeometry,structure,HZ+GD*fraction);
  box(0,GH/2,sign*(HZ+GD+.29),2*GX+.65,GH+.3,.34,backing);
  box(0,GH+.28,sign*(HZ+GD*.53),2*GX+.7,.22,GD,backing);
  for(const side of [-1,1]){
   box(side*(GX+.28),GH/2,sign*(HZ+GD*.53),.26,GH+.2,GD,backing);
   const pylon=box(side*(GX+1.8),GH*.48,sign*(HZ+.49),1.35,GH+1.1,1.7,dark);pylon.rotation.z=-side*.1;
   box(side*(GX+1.66),GH*.48,sign*(HZ-.39),.35,GH+.35,.08,structure);
   for(let i=0;i<5;i++){box(side*(GX+1.75),1.05+i*.94,sign*(HZ-.47),.72,.15,.10,dark);box(side*(GX+1.75),1.10+i*.94,sign*(HZ-.53),.55,.035,.035,strip);}
   box(side*(GX-.35),.32,sign*(HZ+GD+.075),.09,.12,.04,strip);
  }
  for(const y of [.35,GH-.3])box(0,y,sign*(HZ+GD+.075),2*GX-.8,.045,.04,strip);
  for(const x of [-6,-3,0,3,6])box(x,GH/2,sign*(HZ+GD+.08),.085,GH,.11,dark);
  // Low, inset arrow fixtures keep the end wall legible without giant neon slabs.
  for(const side of [-1,1])for(let j=0;j<4;j++)for(const half of [-1,1]){
   const chevron=box(side*(GX+4+j*2),2.6+half*.2,sign*(HZ+.25),.09,.65,.06,strip);chevron.rotation.z=side*half*.65;
  }
 }
 batchMeshes(group);group.traverse(o=>{o.castShadow=false;o.receiveShadow=true;});target.add(group);return group;
}

function championshipFanGeometry(){
 // A seated torso, narrow neck and small head read as a crowd at match distance,
 // rather than giant colored eggs. Four radial faces keep a doubled crowd cheap;
 // broader shoulders and seated depth fill rows without featureless box bodies.
 const profile=[[-.26,.29,.23],[.12,.34,.25],[.18,.12,.105],[.22,.16,.15],[.40,.17,.155],[.48,.08,.08]],segments=4,p=[],uv=[],index=[];
 for(let ring=0;ring<profile.length;ring++){const [y,x,z]=profile[ring];for(let i=0;i<segments;i++){const angle=i/segments*Math.PI*2;p.push(Math.cos(angle)*x,y,Math.sin(angle)*z);uv.push(i/segments,ring/(profile.length-1));if(ring){const a=(ring-1)*segments+i,b=(ring-1)*segments+(i+1)%segments,c=ring*segments+i,d=ring*segments+(i+1)%segments;index.push(a,c,b,b,c,d);}}}
 for(const top of [false,true]){const center=p.length/3,ring=top?profile.length-1:0;p.push(0,profile[ring][0],0);uv.push(.5,top?1:0);for(let i=0;i<segments;i++){const a=ring*segments+i,b=ring*segments+(i+1)%segments;index.push(center,top?b:a,top?a:b);}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(index);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}
function styleChampionshipStadium(stadium){
 const matrix=new THREE.Matrix4(),p=new V3(),scale=new V3(),color=new THREE.Color(),fanGeometry=championshipFanGeometry(),oldGeometry=new Set(),styledMaterials=new Set(),crowdMeshes=[];
 stadium.traverse(o=>{
  if(!o.isMesh)return;
  if(o.isInstancedMesh){
   crowdMeshes.push(o);
  }else if(o.material&&o.material.userData.team===undefined&&!styledMaterials.has(o.material)){
   // These materials are shared by hundreds of meshes. Treat each once: repeated
   // per-mesh lerps previously flattened the entire stadium toward one gray.
   const material=o.material;styledMaterials.add(material);
   if(material.isMeshStandardMaterial){
    const roof=material.metalness>=.25&&material.metalness<.5,steel=material.metalness>=.5,terrace=!roof&&!steel&&material.roughness>=.9;
    // A daylight bowl needs actual concrete reflectance, not low-albedo navy
    // paint lifted by exposure. Only roof/reveals stay dark; retain matte response.
    material.color.setHex(roof?0x333b3b:steel?0x87918e:terrace?0x9c9b8d:0x69746d);material.roughness=steel?.78:.94;material.metalness=steel?.25:roof?.12:.025;material.envMapIntensity=.22;
   }
   else if(material.isMeshBasicMaterial&&!material.map&&material.color.r>1)material.color.setHex(0xffdca8).multiplyScalar(.9);
  }
 });
 // Preserve the factory's real row and aisle poses, filling each 1.1 m slot
 // with a pair. Four shared instance groups retain their draw-call count.
 // The 48-triangle silhouette gives 13,104 spectators for about 629k triangles.
 for(const original of crowdMeshes){
  const crowd=new THREE.InstancedMesh(fanGeometry,original.material,original.count*2);crowd.name='Packed seated championship crowd';crowd.material.color.setHex(0xffffff);crowd.material.roughness=1;crowd.material.metalness=0;crowd.material.envMapIntensity=.1;
  const clothes=[0x657782,0xb9b7a6,0xc0aa8a,0x596771,0x819584,0xa58f82];
  for(let i=0;i<original.count;i++)for(let pair=0;pair<2;pair++){
   original.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);const seed=(Math.imul(i*2+pair+1,1664525)>>>0)%31;
   // The first column is the local lateral axis, including the curved corners.
   const slide=pair?.29:-.25;matrix.elements[12]+=matrix.elements[0]*slide;matrix.elements[14]+=matrix.elements[2]*slide;
   matrix.scale(scale.set(.93+(seed%3)*.035,.91+(seed%5)*.035,.97));crowd.setMatrixAt(i*2+pair,matrix);
   color.setHex(seed<11?teamPalette[p.z<0?0:1]:clothes[seed%clothes.length]).multiplyScalar(.79+(seed%4)*.07);crowd.setColorAt(i*2+pair,color);
  }
  crowd.instanceMatrix.needsUpdate=true;crowd.instanceColor.needsUpdate=true;crowd.castShadow=crowd.receiveShadow=false;crowd.computeBoundingSphere();original.parent.add(crowd);original.parent.remove(original);oldGeometry.add(original.geometry);original.dispose();
  if(!RIVALS.crowd)RIVALS.crowd={mesh:crowd,y:Array.from({length:crowd.count},(_,i)=>crowd.instanceMatrix.array[i*16+13])};
 }
 for(const geometry of oldGeometry)geometry.dispose();
 const trim=teamPalette.map((c,t)=>{const m=new THREE.MeshBasicMaterial({color:c,toneMapped:false});m.userData.team=t;return m});
 RIVALS.trim=trim;const dark=new THREE.MeshBasicMaterial({color:0x151b1c,toneMapped:false});
 const box=(x,y,z,w,h,d,mat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);stadium.add(mesh);return mesh};
 // These merge with the stadium at build time: no new dynamic lights or shadows.
 const steel=new THREE.MeshStandardMaterial({color:0x7b837d,roughness:.84,metalness:.2,envMapIntensity:.24});
 const lamps=new THREE.MeshBasicMaterial({color:0xf4c991,toneMapped:false});
 for(const side of [-1,1])for(const z of [-45,-27,-9,9,27,45]){
  box(side*49,27.35,z,13,.22,.3,steel);
  box(side*43.5,26.7,z,1.5,.25,4,steel);
  for(let j=0;j<4;j++)box(side*43.45,26.5,z-1.35+j*.9,1.15,.08,.5,lamps);
 }
 for(let t=0;t<2;t++){
  const sign=t?1:-1;
  // Recessed colored channels sit in dark fascia rather than painting whole slabs.
  for(const x of [-47.2,47.2]){box(x,6.1,sign*27,.23,.7,50,dark);box(x-Math.sign(x)*.13,6.14,sign*27,.035,.11,50,trim[t]);box(x,27.7,sign*33,.18,.085,66,trim[t]);}
  box(0,7.2,sign*65,70,.7,.24,dark);box(0,7.25,sign*64.86,69,.1,.035,trim[t]);
  for(const x of [-30,30]){box(x,13,sign*65,5,11,.25,dark);for(let j=0;j<3;j++){const slash=box(x,10+j*2.4,sign*64.8,3.8,.35,.12,trim[t]);slash.rotation.z=.28*sign}}
  // End screens are designed in canvas and remain legible in performance mode.
  const c=cvs(1024,256),g=c.getContext('2d'),hex='#'+teamPalette[t].toString(16).padStart(6,'0');
  const grad=g.createLinearGradient(0,0,1024,256);grad.addColorStop(0,hex);grad.addColorStop(1,'#081a38');g.fillStyle=grad;g.fillRect(0,0,1024,256);
  g.fillStyle='rgba(255,255,255,.09)';for(let i=-3;i<14;i++){g.beginPath();g.moveTo(i*110,0);g.lineTo(i*110+90,0);g.lineTo(i*110-80,256);g.lineTo(i*110-170,256);g.fill()}
  g.fillStyle='#fff';g.textAlign='center';g.font='italic 900 72px sans-serif';g.fillText('NIVET LEAGUE',512,119);g.font='700 27px sans-serif';g.fillStyle='#d8f5ff';g.fillText('SKYLINE  /  CHAMPIONSHIP ARENA',512,179);
  box(0,20,sign*68.67,26.1,7.2,.58,dark);box(0,23.57,sign*68.33,26.2,.08,.13,steel);box(0,16.42,sign*68.33,26.2,.13,.13,steel);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(25,6.25),new THREE.MeshBasicMaterial({map:tex(c),toneMapped:false}));screen.position.set(0,20,sign*68.29);if(sign>0)screen.rotation.y=Math.PI;stadium.add(screen);
 }
 refineStadiumStructure(stadium);
}
