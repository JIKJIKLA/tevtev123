// Skyline arena: cached photography, baked color and shared geometry.
async function loadStadiumSky(){
 let visible;
 try{visible=await new THREE.TextureLoader().loadAsync('SKY:stadium');}
 catch(error){console.warn('Photographic sky unavailable; using built-in sky',error);visible=arenaSky();}
 visible.colorSpace=THREE.SRGBColorSpace;visible.mapping=THREE.EquirectangularReflectionMapping;
 // Use the photograph for both the visible sky and diffuse environment. Replace
 // its mirrored lower hemisphere with the field's green bounce before filtering.
 const c=cvs(1024,512),g=c.getContext('2d');g.drawImage(visible.image,0,0,1024,512);
 const ground=g.createLinearGradient(0,245,0,512);ground.addColorStop(0,'rgba(128,156,137,0)');ground.addColorStop(.24,'#789579');ground.addColorStop(1,'#334a35');
 g.fillStyle=ground;g.fillRect(0,245,1024,267);
 const lighting=tex(c);lighting.mapping=THREE.EquirectangularReflectionMapping;
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

function arenaPitchMaterial(){
 // Retain the existing normal map and field UVs, replacing only the painted surface.
 const m=ENGINE.pitchMaterial(ren,teamPalette),c=m.map.image,g=c.getContext('2d'),w=c.width,h=c.height;
 g.fillStyle='#285d35';g.fillRect(0,0,w,h);
 // Alternating mowing directions form broad checker panels like a sports pitch.
 for(let y=0;y<12;y++)for(let x=0;x<8;x++){g.fillStyle=(x+y)%2?'#326b3e':'#285d35';g.fillRect(x*w/8,y*h/12,w/8+1,h/12+1);}
 // Deterministic fine grain is baked once; no noise shader or per-frame canvas work.
 let seed=4271;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<110000;i++){g.strokeStyle=i%2?'rgba(184,211,124,.15)':'rgba(7,30,21,.17)';const x=rand()*w,y=rand()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x+(rand()-.5)*2,y+1+rand()*3);g.stroke();}
 g.save();g.translate(w/2,h/2);g.scale(w/82,h/102);
 const paint=(team,alpha)=>{const n=teamPalette[team];return `rgba(${n>>16&255},${n>>8&255},${n&255},${alpha})`};
 for(const s of [-1,1]){
  const team=s<0?0:1;g.fillStyle=paint(team,.72);g.fillRect(-18,s<0?-47:31,36,16);
  g.fillStyle=paint(team,.92);g.fillRect(-37,s<0?-47:45.6,74,1.4);
  // Broad goal-line wings and midfield arrows make each half readable while moving.
  for(const side of [-1,1]){g.beginPath();g.moveTo(side*18,s*47);g.lineTo(side*37,s*47);g.lineTo(side*37,s*36);g.lineTo(side*28,s*31);g.lineTo(side*18,s*31);g.closePath();g.fillStyle=paint(team,.32);g.fill();}
  g.strokeStyle=paint(team,.86);g.lineWidth=.7;
  for(const x of [-29,29])for(let j=0;j<3;j++){const z=s*(10+j*4);g.beginPath();g.moveTo(x-1.7,z-s*1.3);g.lineTo(x,z);g.lineTo(x+1.7,z-s*1.3);g.stroke()}
  g.beginPath();g.arc(0,0,10.65,team?0:Math.PI,team?Math.PI:Math.PI*2);g.stroke();
 }
 g.strokeStyle='rgba(239,255,241,.88)';g.lineWidth=.15;g.strokeRect(-37,-47,74,94);
 g.beginPath();g.moveTo(-37,0);g.lineTo(37,0);g.stroke();g.beginPath();g.arc(0,0,10,0,Math.PI*2);g.stroke();
 for(const s of [-1,1]){g.strokeRect(-18,s<0?-47:31,36,16);g.strokeRect(-9,s<0?-47:40,18,7)}
 g.fillStyle='#d9f6e5';g.beginPath();g.arc(0,0,.23,0,Math.PI*2);g.fill();
 g.font='italic 900 2px sans-serif';g.textAlign='center';g.fillStyle='rgba(223,250,239,.24)';g.fillText('T E V I N',0,4);g.restore();
 PITCH_TEXTURE=m.map;m.map.needsUpdate=true;m.roughness=.98;if(m.normalScale)m.normalScale.set(.35,.35);return m;
}

function arenaPanelMaterial(color=0x536579){
 const c=cvs(512,512),g=c.getContext('2d');g.fillStyle='#8995a0';g.fillRect(0,0,512,512);
 for(let y=0;y<560;y+=32)for(let x=-32;x<560;x+=55){const cx=x+(y%64?27.5:0);g.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;g[k?'lineTo':'moveTo'](cx+Math.cos(a)*31,y+Math.sin(a)*31)}g.closePath();g.fillStyle=(x+y)%3?'#7e8c98':'#8b97a2';g.fill();g.strokeStyle='#465664';g.lineWidth=2;g.stroke();}
 g.strokeStyle='#c2cbd0';g.lineWidth=3;g.strokeRect(5,5,502,502);for(const x of [16,496])for(const y of [16,496]){g.fillStyle='#2b3d4c';g.beginPath();g.arc(x,y,4,0,7);g.fill();}
 return new THREE.MeshStandardMaterial({color,map:tex(c),roughness:.88,metalness:.12,envMapIntensity:.45});
}
function decorateArenaGoals(){
 const structure=arenaPanelMaterial(0x718799),backing=arenaPanelMaterial(0x3c5362);
 const group=new THREE.Group();group.name='Championship goal surrounds';
 const box=(x,y,z,w,h,d,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m);return m;};
 for(const sign of [-1,1]){
  const color=teamPalette[sign<0?0:1],strip=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.65,roughness:.7,metalness:.03});strip.userData.team=sign<0?0:1;
  const z=sign*(HZ+.1);
  // The full collision opening stays clear; every new surround sits outside it.
  for(const side of [-1,1]){
   box(side*(GX+.62),GH/2+.2,z,1.05,GH+1.25,1.05,structure);
   box(side*(GX+.27),GH/2+.1,z-sign*.56,.09,GH+.25,.08,strip);
   const pylon=box(side*(GX+1.8),GH*.48,z+sign*.35,1.3,GH*1.1,1.4,backing);pylon.rotation.z=-side*.12;
   for(let i=0;i<5;i++)box(side*(GX+1.72),.8+i, z-sign*.39,.85,.07,.07,strip);
  }
  box(0,GH+.66,z,2*GX+2.25,1.05,1.05,structure);
  box(0,GH+.26,z-sign*.56,2*GX+.65,.09,.08,strip);
  box(0,GH/2,sign*(HZ+GD+.12),2*GX,GH,.16,backing);
  for(const side of [-1,1])box(side*(GX-.08),GH/2,sign*(HZ+GD*.56),.12,GH,GD*.85,backing);
  // Directional chevrons connect the end boards to the goal mouth.
  for(const side of [-1,1])for(let j=0;j<4;j++)for(const half of [-1,1]){
   const chevron=box(side*(GX+4+j*2),2.7+half*.24,sign*(HZ+.5),.12,.8,.09,strip);chevron.rotation.z=side*half*.65;
  }
 }
 batchMeshes(group);group.traverse(o=>o.castShadow=false);scene.add(group);
}

function styleChampionshipStadium(stadium){
 const matrix=new THREE.Matrix4(),p=new V3(),color=new THREE.Color();
 stadium.traverse(o=>{
  if(!o.isMesh)return;
  if(o.isInstancedMesh){
   // Seat colors follow their actual goal half instead of a gray checkerboard.
   o.material.color.setHex(0xffffff);
   for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);color.setHex(teamPalette[p.z<0?0:1]).multiplyScalar(.48+(i%7)*.065);if(i%19===0)color.setHex(0xc3edff);o.setColorAt(i,color)}
   o.instanceColor.needsUpdate=true;
  }else if(o.material?.isMeshStandardMaterial&&!o.material.userData.team){
   // Neutral blue-gray structure keeps saturated team colors distinct.
   o.material.color.lerp(new THREE.Color(0x53687b),.16);
  }
 });
 const trim=teamPalette.map((c,t)=>{const m=new THREE.MeshBasicMaterial({color:c,toneMapped:false});m.userData.team=t;return m});
 RIVALS.trim=trim;const dark=new THREE.MeshBasicMaterial({color:0x071a35,toneMapped:false});
 const box=(x,y,z,w,h,d,mat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);stadium.add(mesh);return mesh};
 // These merge with the stadium at build time: no new dynamic lights or shadows.
 const steel=new THREE.MeshStandardMaterial({color:0x536579,roughness:.88,metalness:.04});
 const lamps=new THREE.MeshBasicMaterial({color:0xffe6bf,toneMapped:false});
 for(const side of [-1,1])for(const z of [-45,-27,-9,9,27,45]){
  box(side*49,27.35,z,13,.22,.3,steel);
  box(side*43.5,26.7,z,1.5,.25,4,steel);
  for(let j=0;j<4;j++)box(side*43.45,26.5,z-1.35+j*.9,1.15,.08,.5,lamps);
 }
 for(let t=0;t<2;t++){
  const sign=t?1:-1;
  // Saturated fascia and a bright, thin roofline frame the two halves.
  for(const x of [-47.2,47.2]){box(x,6.1,sign*27,.15,.65,50,trim[t]);box(x,27.7,sign*33,.18,.13,66,trim[t]);}
  box(0,7.2,sign*65,70,.65,.18,trim[t]);
  for(const x of [-30,30]){box(x,13,sign*65,5,11,.25,dark);for(let j=0;j<3;j++){const slash=box(x,10+j*2.4,sign*64.8,3.8,.35,.12,trim[t]);slash.rotation.z=.28*sign}}
  // End screens are designed in canvas and remain legible in performance mode.
  const c=cvs(1024,256),g=c.getContext('2d'),hex='#'+teamPalette[t].toString(16).padStart(6,'0');
  const grad=g.createLinearGradient(0,0,1024,256);grad.addColorStop(0,hex);grad.addColorStop(1,'#081a38');g.fillStyle=grad;g.fillRect(0,0,1024,256);
  g.fillStyle='rgba(255,255,255,.09)';for(let i=-3;i<14;i++){g.beginPath();g.moveTo(i*110,0);g.lineTo(i*110+90,0);g.lineTo(i*110-80,256);g.lineTo(i*110-170,256);g.fill()}
  g.fillStyle='#fff';g.textAlign='center';g.font='italic 900 72px sans-serif';g.fillText('TEVIN LEAGUE',512,119);g.font='700 27px sans-serif';g.fillStyle='#d8f5ff';g.fillText('SKYLINE  /  CHAMPIONSHIP ARENA',512,179);
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(25,6.25),new THREE.MeshBasicMaterial({map:tex(c),toneMapped:false}));screen.position.set(0,20,sign*68.38);if(sign>0)screen.rotation.y=Math.PI;stadium.add(screen);
 }
}
