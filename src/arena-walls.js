// Painted kickboards, fine safety mesh and external structural ribs. Collision geometry is unchanged.
function championshipWallMaterial(color){
 const c=cvs(2048,512),g=c.getContext('2d'),w=c.width;g.clearRect(0,0,w,512);
 const tint=g.createLinearGradient(0,0,0,444);tint.addColorStop(0,'rgba(88,134,159,.012)');tint.addColorStop(.7,'rgba(111,168,185,.025)');tint.addColorStop(1,'rgba(76,124,153,.065)');g.fillStyle=tint;g.fillRect(0,0,w,444);
 g.strokeStyle='rgba(152,188,202,.13)';g.lineWidth=.7;
 for(let y=-15;y<456;y+=24)for(let x=-20;x<2080;x+=32){const cx=x+(y%48?16:0);g.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;g[k?'lineTo':'moveTo'](cx+Math.cos(a)*18,y+Math.sin(a)*14)}g.closePath();g.stroke();}
 const metal=g.createLinearGradient(0,440,0,512);metal.addColorStop(0,'#526574');metal.addColorStop(.13,'#203441');metal.addColorStop(.65,'#142735');metal.addColorStop(1,'#3a4b56');g.fillStyle=metal;g.fillRect(0,442,w,70);
 g.fillStyle=color;g.fillRect(0,444,w,3);g.fillRect(0,505,w,2);g.fillStyle='#a9bec2';g.fillRect(0,440,w,1);g.fillStyle='#071420';g.fillRect(0,451,w,48);
 for(let i=0;i<16;i++){const x=i*128;g.fillStyle=i%2?'#0d2330':'#102734';g.fillRect(x+3,454,122,42);g.fillStyle='#c5e0e638';g.fillRect(x+2,452,1,46);g.fillStyle='#030d16';g.fillRect(x+125,452,2,46);
  if(i%4===3){g.strokeStyle=color;g.lineWidth=3;for(let j=0;j<3;j++){g.beginPath();g.moveTo(x+39+j*17,463);g.lineTo(x+48+j*17,475);g.lineTo(x+39+j*17,487);g.stroke();}}
  else{g.fillStyle=color;g.beginPath();g.moveTo(x+16,462);g.lineTo(x+34,462);g.lineTo(x+33,480);g.lineTo(x+25,486);g.lineTo(x+17,480);g.closePath();g.fill();g.fillStyle='#deedf0';g.beginPath();g.arc(x+25,468,3,0,7);g.fill();g.textAlign='left';g.font='italic 900 13px Arial,sans-serif';g.fillText('TEVIN',x+43,474);g.font='italic 800 11px Arial,sans-serif';g.fillText('LEAGUE',x+42,486);}
  for(const bx of [x+7,x+121]){g.fillStyle='#8d9fa6';g.fillRect(bx,445,2,2);g.fillRect(bx,502,2,2);}
 }
 g.strokeStyle='#91a9b333';g.lineWidth=.6;for(let y=449;y<512;y+=7){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
 const map=tex(c);map.anisotropy=4;const material=new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.13,roughness:.78,metalness:.12,envMapIntensity:.3,transparent:true,depthWrite:false});material.name='Sculpted championship kickboards';return material;
}
function wallCageBandGeometry(y,height){return stadiumRibbonGeometry(HX+.12,HZ+.12,y,height,R+.12);}
function buildArenaWallStructure(){
 const group=new THREE.Group();group.name='Championship wall frame';const steel=new THREE.MeshStandardMaterial({color:0x263b49,roughness:.72,metalness:.2,envMapIntensity:.3}),trim=teamPalette.map((color,team)=>{const m=new THREE.MeshBasicMaterial({color,toneMapped:false});m.userData.team=team;return m;});
 const box=(x,y,z,w,h,d,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m);return m;};
 for(const y of [4.08,HH-.2])group.add(new THREE.Mesh(wallCageBandGeometry(y,.11),steel));
 for(const side of [-1,1])for(let z=-42;z<=42;z+=12){const team=z<0?0:1;box(side*(HX+.16),12.1,z,.13,16,.18,steel);box(side*(HX+.08),4.3,z,.08,.45,.5,trim[team]);box(side*(HX+.1),19.7,z,.07,.55,.22,trim[team]);}
 for(const sign of [-1,1])for(let x=-30;x<=30;x+=10){box(x,12.1,sign*(HZ+.16),.18,16,.13,steel);box(x,19.7,sign*(HZ+.1),.22,.55,.07,trim[sign>0?1:0]);}
 for(const sign of [-1,1])for(const side of [-1,1]){box(side*(GX+1.15),4.05,sign*(HZ+.14),1.8,.18,.18,steel);for(let i=0;i<3;i++)box(side*(GX+1.7+i*3.8),4.17,sign*(HZ+.05),2,.06,.04,trim[sign>0?1:0]);}
 batchMeshes(group);group.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});scene.add(group);document.body.dataset.walls='championship-kickboards-v3';
}
