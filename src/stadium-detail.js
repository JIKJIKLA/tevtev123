// Static stadium detail: baked surfaces and shared geometry, no extra render pass.
function arenaSurfaceNormal(canvas){
 const w=canvas.width,h=canvas.height,source=canvas.getContext('2d').getImageData(0,0,w,h).data,c=cvs(w,h),g=c.getContext('2d'),out=g.createImageData(w,h);
 const at=(xx,yy)=>source[((yy+h)%h*w+(xx+w)%w)*4];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const dx=(at(x-1,y)-at(x+1,y))*2.4/255,dy=(at(x,y-1)-at(x,y+1))*2.4/255,inv=1/Math.hypot(dx,dy,1),i=(y*w+x)*4;
  out.data[i]=Math.round((dx*inv*.5+.5)*255);out.data[i+1]=Math.round((dy*inv*.5+.5)*255);out.data[i+2]=Math.round((inv*.5+.5)*255);out.data[i+3]=255;
 }
 g.putImageData(out,0,0);return new THREE.CanvasTexture(c);
}
function stadiumRibbonGeometry(x,z,y,height,radius=15){
 const path=new THREE.Shape();path.moveTo(-x+radius,-z);path.lineTo(x-radius,-z);path.quadraticCurveTo(x,-z,x,-z+radius);path.lineTo(x,z-radius);path.quadraticCurveTo(x,z,x-radius,z);path.lineTo(-x+radius,z);path.quadraticCurveTo(-x,z,-x,z-radius);path.lineTo(-x,-z+radius);path.quadraticCurveTo(-x,-z,-x+radius,-z);
 const points=path.getPoints(12),p=[],uv=[],indices=[];let distance=0;const perimeter=points.reduce((sum,v,i)=>sum+(i?v.distanceTo(points[i-1]):0),0);
 for(let i=0;i<points.length;i++){if(i)distance+=points[i].distanceTo(points[i-1]);const q=points[i];p.push(q.x,y,q.y,q.x,y+height,q.y);uv.push(distance/perimeter*12,0,distance/perimeter*12,1);if(i){const b=i*2;indices.push(b-2,b-1,b,b-1,b+1,b);}}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function stadiumDisplayMaterial(){
 const c=cvs(1024,128),g=c.getContext('2d');g.fillStyle='#071421';g.fillRect(0,0,1024,128);
 for(let i=0;i<2;i++){const x=i*512;g.fillStyle=i?'#e48129':'#238ed7';g.fillRect(x,0,512,6);g.fillRect(x,122,512,6);g.fillStyle='#dcecf3';g.font='italic 900 36px sans-serif';g.textAlign='left';g.fillText('NIVET LEAGUE',x+34,59);g.font='700 15px sans-serif';g.fillStyle=i?'#ffc974':'#86d5ff';g.fillText(i?'CHASE THE NEXT TOUCH':'CHAMPIONSHIP SERIES',x+36,91);for(let j=0;j<3;j++){g.beginPath();g.moveTo(x+437+j*18,33);g.lineTo(x+450+j*18,61);g.lineTo(x+437+j*18,89);g.strokeStyle=i?'#ffc974':'#86d5ff';g.lineWidth=4;g.stroke();}}
 g.fillStyle='#00000012';for(let y=8;y<122;y+=4)g.fillRect(0,y,1024,1);
 const map=tex(c);map.wrapS=THREE.RepeatWrapping;return new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.35,roughness:.92,metalness:0,side:THREE.DoubleSide});
}
function refineStadiumStructure(stadium){
 const display=stadiumDisplayMaterial(),structure=arenaPanelMaterial(0x72818b),dark=new THREE.MeshStandardMaterial({color:0x172c3c,roughness:.94,metalness:.05}),light=new THREE.MeshBasicMaterial({color:0xffe8bd,toneMapped:false});
 const box=(x,y,z,w,h,d,mat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);stadium.add(mesh);return mesh;};
 // Wrap concourses around all four rounded corners, rather than isolated strips.
 for(let tier=0;tier<3;tier++){const mesh=new THREE.Mesh(stadiumRibbonGeometry(47.05+tier*7.4,66.05+tier*7.4,4.35+tier*7.4,.85),display);mesh.name='Championship concourse displays';stadium.add(mesh);}
 // Visible roof undersides, diagonal ribs and warm lamp housings add depth.
 for(const side of [-1,1]){
  const soffit=box(side*63,30.55,0,27,.18,144,dark);soffit.rotation.z=side*.1;
  for(let z=-60;z<=60;z+=15){
   const rib=box(side*60,30,z,28,.3,.22,structure);rib.rotation.z=side*.1;
   box(side*47.25,28.25,z,1.5,.24,4.8,dark);
   for(let j=0;j<4;j++)box(side*47.18,28.08,z-1.6+j*1.05,.82,.06,.65,light);
  }
  // Glazed hospitality boxes behind the middle tier; one batched surface family.
  for(let z=-48;z<=48;z+=12){box(side*58,15.2,z,.16,1.7,10,dark);for(let j=-4;j<=4;j+=2)box(side*57.85,15.2,z+j,.13,1.7,.045,structure);box(side*57.7,14.3,z,.13,.08,10,light);}
 }
 // Hanging championship pennants and rails echo a competition stadium.
 const flagGeo=new THREE.PlaneGeometry(1.8,2.7),flagMats=teamPalette.map((color,team)=>{const m=new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.9});m.userData.team=team;return m;});
 for(const sign of [-1,1])for(let i=-5;i<=5;i++){
  const x=i*5.3,flag=new THREE.Mesh(flagGeo,flagMats[i%2===0?0:1]);flag.position.set(x,25.7,sign*68);if(sign>0)flag.rotation.y=Math.PI;stadium.add(flag);
  box(x,27.2,sign*68,2,.08,.08,structure);
 }
 document.body.dataset.stadium='championship-2';
}
