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
 const map=tex(c);map.wrapS=THREE.RepeatWrapping;return new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.24,roughness:.92,metalness:0,side:THREE.DoubleSide});
}
function stadiumConcourseMaterial(){
 const c=cvs(512,128),g=c.getContext('2d');g.fillStyle='#69736a';g.fillRect(0,0,512,128);
 // One opaque repeat supplies recessed glazing, vent slats and concrete joints
 // across the tall deck faces without hundreds of individual glass objects.
 for(let bay=0;bay<4;bay++){
  const x=bay*128;g.fillStyle='#48554f';g.fillRect(x+1,0,2,128);g.fillStyle='#a3a596';g.fillRect(x+4,0,2,128);
  g.fillStyle='#242d2b';g.fillRect(x+16,36,99,54);g.fillStyle='#536b6b';g.fillRect(x+18,38,95,23);g.fillStyle='#9ca396';g.fillRect(x+18,38,95,2);
  for(let j=0;j<6;j++){g.fillStyle=j%2?'#38443e':'#46564c';g.fillRect(x+19,66+j*4,93,2);}
  for(const offset of [45,77]){g.fillStyle='#182422';g.fillRect(x+offset,38,2,50);}g.fillStyle='#a1a294';g.fillRect(x+14,93,103,3);
 }
 for(const y of [12,111]){g.fillStyle='#3b4a43';g.fillRect(0,y,512,2);g.fillStyle='#969c8d';g.fillRect(0,y+3,512,1);}
 const map=tex(c);map.wrapS=THREE.RepeatWrapping;return new THREE.MeshStandardMaterial({map,roughness:.96,metalness:0,envMapIntensity:.12,side:THREE.DoubleSide});
}
function refineStadiumStructure(stadium){
 const display=stadiumDisplayMaterial(),concourse=stadiumConcourseMaterial(),structure=arenaPanelMaterial(0x9ca196),dark=new THREE.MeshStandardMaterial({color:0x2d3433,roughness:.94,metalness:.08,envMapIntensity:.16}),light=new THREE.MeshBasicMaterial({color:0xeac18d,toneMapped:false});
 // The ribbons face outward; their field-facing reveal must also be visible.
 structure.side=dark.side=THREE.DoubleSide;
 const box=(x,y,z,w,h,d,mat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);stadium.add(mesh);return mesh;};
 // Layered fascia has a dark reveal, inset display and real metal cap. Each
 // continuous rounded band still batches into its one shared material family.
 for(let tier=0;tier<3;tier++){
  const x=47.05+tier*7.4,z=66.05+tier*7.4,y=4.35+tier*7.4;
  const face=new THREE.Mesh(stadiumRibbonGeometry(x+.25,z+.25,1.84+tier*7.4,2.45),concourse);face.name='Recessed service concourse bays';stadium.add(face);
  // Thin dark risers articulate all six stepped rows. They share the dark
  // structural material and merge into the same static stadium batch.
  for(let row=0;row<6;row++){
   const riser=new THREE.Mesh(stadiumRibbonGeometry(47.7+tier*7.4+row*1.05,66.7+tier*7.4+row*1.05,4.49+tier*7.4+row*.7,.50),dark);riser.name='Seating row riser';stadium.add(riser);
  }
  for(const [offset,height,material] of [[.16,1.12,dark],[.02,.72,display],[-.015,.08,structure]]){const mesh=new THREE.Mesh(stadiumRibbonGeometry(x+offset,z+offset,y+(material===structure ? .83 : 0),height),material);mesh.name='Recessed championship concourse fascia';stadium.add(mesh);}
 }
 // Visible roof undersides, diagonal ribs and warm lamp housings add depth.
 for(const side of [-1,1]){
  const soffit=box(side*63,30.55,0,27,.22,144,dark);soffit.rotation.z=side*.1;
  for(let z=-60;z<=60;z+=15){
   const rib=box(side*60,30,z,28,.3,.22,structure);rib.rotation.z=side*.1;
   box(side*47.25,28.25,z,1.5,.30,4.8,dark);box(side*47.18,28.06,z,1.05,.035,4.2,structure);
   for(let j=0;j<4;j++)box(side*47.18,28.03,z-1.6+j*1.05,.72,.045,.55,light);
  }
  // Glazed hospitality boxes behind the middle tier; one batched surface family.
  for(let z=-48;z<=48;z+=12){box(side*58,15.2,z,.16,1.7,10,dark);for(let j=-4;j<=4;j+=2)box(side*57.85,15.2,z+j,.13,1.7,.045,structure);box(side*57.7,14.3,z,.13,.045,10,light);}
  // Service entrances sit below the first seating deck, aligned to its aisles.
  for(const z of [-29,-7,15,37]){box(side*47.7,2.45,z,.22,3.5,3.05,dark);for(const edge of [-1,1])box(side*47.53,2.45,z+edge*1.6,.18,3.7,.16,structure);box(side*47.53,4.32,z,.18,.20,3.4,structure);box(side*47.41,4.16,z,.035,.045,2.5,light);}
 }
 // A narrow pointed pennant reads as fabric instead of a giant flat color card.
 const shape=new THREE.Shape();shape.moveTo(-.72,1.35);shape.lineTo(.72,1.35);shape.lineTo(.72,-.9);shape.lineTo(0,-1.35);shape.lineTo(-.72,-.9);shape.closePath();const flagGeo=new THREE.ShapeGeometry(shape);
 const flagCanvas=cvs(128,256),fg=flagCanvas.getContext('2d');fg.fillStyle='#1c2a35';fg.fillRect(0,0,128,256);fg.fillStyle='#dce5df';fg.fillRect(10,10,108,4);fg.fillRect(10,224,108,2);fg.textAlign='center';fg.font='900 48px Arial,sans-serif';fg.fillText('NL',64,130);fg.font='700 10px Arial,sans-serif';fg.fillText('CHAMPIONSHIP',64,154);fg.fillStyle='#879a9c';fg.fillRect(10,20,3,194);fg.fillRect(115,20,3,194);const flagMap=tex(flagCanvas);
 // ShapeGeometry UVs are world XY by default; normalize to this shared atlas.
 const uv=flagGeo.getAttribute('uv');for(let i=0;i<uv.count;i++)uv.setXY(i,(uv.getX(i)+.72)/1.44,(uv.getY(i)+1.35)/2.7);
 const flagMats=teamPalette.map((color,team)=>{const m=new THREE.MeshStandardMaterial({color,map:flagMap,side:THREE.DoubleSide,roughness:.97,envMapIntensity:.1});m.userData.team=team;return m;});
 for(const sign of [-1,1])for(let i=-5;i<=5;i++){
  const x=i*5.3,flag=new THREE.Mesh(flagGeo,flagMats[i%2===0?0:1]);flag.position.set(x,25.7,sign*68);if(sign>0)flag.rotation.y=Math.PI;stadium.add(flag);
  box(x,27.2,sign*68,2,.08,.08,structure);
 }
 document.body.dataset.stadium='crafted-championship-4';
}
