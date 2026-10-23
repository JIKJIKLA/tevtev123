// Skyline arena: baked color and shared geometry, with no extra light/shadow passes.
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
 g.fillStyle='#246342';g.fillRect(0,0,w,h);
 for(let i=0;i<18;i++){g.fillStyle=i%2?'#30764a':'#246342';g.fillRect(0,i*h/18,w,h/18+1)}
 // Deterministic fine grain is baked once; no noise shader or per-frame canvas work.
 let seed=4271;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<85000;i++){g.fillStyle=i%2?'rgba(190,221,134,.11)':'rgba(9,37,29,.13)';g.fillRect(rand()*w,rand()*h,.6+rand(),1+rand()*4)}
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
 m.map.needsUpdate=true;m.roughness=.9;return m;
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
   // Deep indigo structure supplies contrast without the old charcoal haze.
   o.material.color.lerp(new THREE.Color(0x173758),.3);
  }
 });
 const trim=teamPalette.map((c,t)=>{const m=new THREE.MeshBasicMaterial({color:c,toneMapped:false});m.userData.team=t;return m});
 const dark=new THREE.MeshBasicMaterial({color:0x071a35,toneMapped:false});
 const box=(x,y,z,w,h,d,mat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);stadium.add(mesh);return mesh};
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
