// Painted kickboards, fine safety mesh and external structural ribs. Collision geometry is unchanged.
function championshipWallMaterial(color){
 const c=cvs(2048,512),g=c.getContext('2d'),w=c.width;g.clearRect(0,0,w,512);
 const tint=g.createLinearGradient(0,0,0,444);tint.addColorStop(0,'rgba(88,134,159,.012)');tint.addColorStop(.7,'rgba(111,168,185,.025)');tint.addColorStop(1,'rgba(76,124,153,.065)');g.fillStyle=tint;g.fillRect(0,0,w,444);
 g.strokeStyle='rgba(162,179,174,.115)';g.lineWidth=.65;
 for(let y=-14;y<452;y+=14)for(let x=-20;x<2080;x+=20){const cx=x+(y%28?10:0);g.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;g[k?'lineTo':'moveTo'](cx+Math.cos(a)*10,y+Math.sin(a)*8)}g.closePath();g.stroke();}
 const metal=g.createLinearGradient(0,440,0,512);metal.addColorStop(0,'#74818a');metal.addColorStop(.07,'#33414b');metal.addColorStop(.20,'#17232c');metal.addColorStop(.78,'#26323b');metal.addColorStop(1,'#67727a');g.fillStyle=metal;g.fillRect(0,442,w,70);
 g.fillStyle='#0a1119';g.fillRect(0,445,w,6);g.fillRect(0,503,w,5);g.fillStyle=color;g.fillRect(0,447,w,2);g.fillRect(0,505,w,1);g.fillStyle='#b0b9b6';g.fillRect(0,440,w,1);g.fillStyle='#0a131b';g.fillRect(0,453,w,46);
 for(let i=0;i<16;i++){const x=i*128;g.fillStyle=i%2?'#222b2b':'#2a3230';g.fillRect(x+3,456,122,39);g.fillStyle='#d4e0df28';g.fillRect(x+2,453,1,44);g.fillStyle='#080d0c';g.fillRect(x+125,453,2,44);
  if(i%4===3){g.strokeStyle=color;g.lineWidth=3;for(let j=0;j<3;j++){g.beginPath();g.moveTo(x+39+j*17,463);g.lineTo(x+48+j*17,475);g.lineTo(x+39+j*17,487);g.stroke();}}
  else{g.fillStyle=color;g.beginPath();g.moveTo(x+16,462);g.lineTo(x+34,462);g.lineTo(x+33,480);g.lineTo(x+25,486);g.lineTo(x+17,480);g.closePath();g.fill();g.fillStyle='#deedf0';g.beginPath();g.arc(x+25,468,3,0,7);g.fill();g.textAlign='left';g.font='italic 900 13px Arial,sans-serif';g.fillText('NIVET',x+43,474);g.font='italic 800 11px Arial,sans-serif';g.fillText('LEAGUE',x+42,486);}
  for(const bx of [x+7,x+121]){g.fillStyle='#1a2125';g.fillRect(bx-1,443,4,4);g.fillRect(bx-1,500,4,4);g.fillStyle='#a7b0b1';g.fillRect(bx,444,2,1);g.fillRect(bx,501,2,1);}
  for(let j=0;j<4;j++){g.fillStyle='#050c11';g.fillRect(x+46+j*10,498,6,2);}
 }
 g.strokeStyle='#c3cdcc12';g.lineWidth=.5;for(let y=442;y<512;y+=3){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
 const map=tex(c);map.anisotropy=4;const material=new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.09,roughness:.82,metalness:.22,envMapIntensity:.22,transparent:true,depthWrite:false});material.name='Fine mesh and machined championship kickboards';return material;
}
function wallCageBandGeometry(y,height){
 const original=stadiumRibbonGeometry(HX+.12,HZ+.12,y,height,R+.12);if(y>=GH)return original;
 // A continuous low ribbon used to draw a metal bar across both goal mouths.
 // Split those two flat end segments around the full unchanged opening.
 const source=original.getAttribute('position'),positions=[],uv=[],indices=[];
 for(let i=1;i<source.count/2;i++){
  const ax=source.getX((i-1)*2),az=source.getZ((i-1)*2),bx=source.getX(i*2),bz=source.getZ(i*2);let pieces=[[0,1]];
  if(Math.abs(az)>HZ&&Math.abs(az-bz)<.001&&Math.abs(bx-ax)>.001){const left=(-GX-.24-ax)/(bx-ax),right=(GX+.24-ax)/(bx-ax),lo=cl(Math.min(left,right),0,1),hi=cl(Math.max(left,right),0,1);pieces=[[0,lo],[hi,1]];}
  for(const [lo,hi] of pieces){if(hi-lo<1e-7)continue;const x0=ax+(bx-ax)*lo,z0=az+(bz-az)*lo,x1=ax+(bx-ax)*hi,z1=az+(bz-az)*hi,b=positions.length/3;positions.push(x0,y,z0,x0,y+height,z0,x1,y,z1,x1,y+height,z1);uv.push(lo,0,lo,1,hi,0,hi,1);indices.push(b,b+1,b+2,b+1,b+3,b+2);}
 }
 original.dispose();const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function buildArenaWallStructure(target=scene){
 const group=new THREE.Group();group.name='Championship wall frame';const steel=new THREE.MeshStandardMaterial({color:0x414b48,roughness:.8,metalness:.27,envMapIntensity:.23,side:THREE.DoubleSide}),edge=new THREE.MeshStandardMaterial({color:0x9b9e91,roughness:.82,metalness:.22,envMapIntensity:.22,side:THREE.DoubleSide}),trim=teamPalette.map((color,team)=>{const m=new THREE.MeshBasicMaterial({color,toneMapped:false});m.userData.team=team;return m;});
 const box=(x,y,z,w,h,d,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m);return m;};
 for(const y of [4.08,HH-.2]){group.add(new THREE.Mesh(wallCageBandGeometry(y,.14),steel));group.add(new THREE.Mesh(wallCageBandGeometry(y+.15,.025),edge));}
 for(const side of [-1,1])for(let z=-42;z<=42;z+=12){const team=z<0?0:1;box(side*(HX+.16),12.1,z,.18,16,.23,steel);box(side*(HX+.09),4.3,z,.11,.55,.66,steel);box(side*(HX+.02),4.31,z,.04,.12,.43,trim[team]);box(side*(HX+.1),19.7,z,.07,.55,.22,trim[team]);}
 for(const sign of [-1,1])for(let x=-30;x<=30;x+=10){const low=Math.abs(x)<GX+.3?GH+1.2:4.1;box(x,(low+20.1)/2,sign*(HZ+.16),.23,20.1-low,.18,steel);box(x,19.7,sign*(HZ+.1),.22,.55,.07,trim[sign>0?1:0]);}
 for(const sign of [-1,1])for(const side of [-1,1]){box(side*(GX+1.15),4.05,sign*(HZ+.14),1.8,.18,.18,steel);for(let i=0;i<3;i++)box(side*(GX+1.7+i*3.8),4.17,sign*(HZ+.05),2,.06,.04,trim[sign>0?1:0]);}
 batchMeshes(group);compactStaticArena(group);group.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});target.add(group);document.body.dataset.walls='machined-championship-v4';return group;
}
