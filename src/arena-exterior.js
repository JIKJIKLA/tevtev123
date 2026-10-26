// The venue grows beyond the pitch; every new solid surface is outside the play boundary.
function exteriorApronGeometry(){
 const shape=new THREE.Shape(),hole=new THREE.Path();
 const rounded=(p,x,z,r)=>{p.moveTo(-x+r,-z);p.lineTo(x-r,-z);p.quadraticCurveTo(x,-z,x,-z+r);p.lineTo(x,z-r);p.quadraticCurveTo(x,z,x-r,z);p.lineTo(-x+r,z);p.quadraticCurveTo(-x,z,-x,z-r);p.lineTo(-x,-z+r);p.quadraticCurveTo(-x,-z,-x+r,-z);};
 rounded(shape,111,132,22);rounded(hole,72.5,91.5,15);shape.holes.push(hole);return new THREE.ShapeGeometry(shape,16).rotateX(-Math.PI/2);
}
function exteriorFacadeMaterial(){
 const c=cvs(512,512),g=c.getContext('2d');g.fillStyle='#617482';g.fillRect(0,0,512,512);
 for(let x=0;x<512;x+=64){g.fillStyle=x%128?'#71828b':'#536675';g.fillRect(x,0,6,512);for(let y=42;y<360;y+=86){g.fillStyle='#122b40';g.fillRect(x+12,y,43,54);g.fillStyle='#7094a0';g.fillRect(x+14,y+3,39,4);g.fillStyle='#d5b985';g.fillRect(x+15,y+44,35,3);}}
 g.fillStyle='#162c3b';g.fillRect(0,394,512,118);for(let x=12;x<512;x+=64){g.fillStyle='#6f8792';g.fillRect(x,406,3,100);g.fillStyle='#1b80bb';g.fillRect(x+5,406,46,5);}
 g.fillStyle='#afc4cc';g.fillRect(0,370,512,8);g.fillStyle='#213d52';g.fillRect(0,3,512,17);
 const map=tex(c);map.wrapS=THREE.RepeatWrapping;return new THREE.MeshStandardMaterial({map,roughness:.9,metalness:.08,side:THREE.DoubleSide});
}
function buildArenaExterior(){
 const group=new THREE.Group();group.name='Skyline stadium district';
 const metal=new THREE.MeshStandardMaterial({color:0x4c667b,roughness:.8,metalness:.16}),paving=new THREE.MeshStandardMaterial({color:0x687d80,roughness:.98}),dark=new THREE.MeshStandardMaterial({color:0x243d50,roughness:.95}),warm=new THREE.MeshBasicMaterial({color:0xffdca4,toneMapped:false}),blue=new THREE.MeshBasicMaterial({color:0x429cda,toneMapped:false});
 const box=(x,y,z,w,h,d,mat)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 const landscape=new THREE.Mesh(new THREE.PlaneGeometry(1600,1600).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x37554c,roughness:1}));landscape.position.y=-.34;group.add(landscape);
 const plaza=new THREE.Mesh(exteriorApronGeometry(),paving);plaza.position.y=-.08;group.add(plaza);
 const facade=new THREE.Mesh(stadiumRibbonGeometry(70.45,89.45,0,28.2),exteriorFacadeMaterial());facade.name='Glazed exterior concourses';group.add(facade);
 const crown=new THREE.Mesh(stadiumRibbonGeometry(74.5,93.5,31.8,.65),metal);group.add(crown);
 for(const sign of [-1,1]){
  for(const end of [false,true]){
   const x=end?0:sign*76,z=end?sign*96:0;box(x,8,z,end?18:10,1,end?10:18,metal);
   for(const s of [-1,1])box(x+(end?s*7:sign*3),3.9,z+(end?sign*3:s*7),.4,7.8,.4,metal);
   box(x,7.35,z,end?16:10,.12,end?10:16,warm);
   const canvas=cvs(512,96),g=canvas.getContext('2d');g.fillStyle='#071c30';g.fillRect(0,0,512,96);g.fillStyle=sign<0?'#91d8ff':'#ffd48f';g.font='900 37px sans-serif';g.textAlign='center';g.fillText(end?(sign<0?'BLUE GATE':'ORANGE GATE'):(sign<0?'WEST PLAZA':'EAST PLAZA'),256,58);
   const signMesh=new THREE.Mesh(new THREE.PlaneGeometry(13,2.44),new THREE.MeshBasicMaterial({map:tex(canvas),side:THREE.DoubleSide,toneMapped:false}));signMesh.position.set(x+(end?0:sign*5.1),8.1,z+(end?sign*5.1:0));signMesh.rotation.y=end?(sign>0?0:Math.PI):sign*Math.PI/2;group.add(signMesh);
  }
  for(let z=-102;z<=102;z+=17){box(sign*101,4,z,.18,8,.18,metal);box(sign*100.5,8.08,z,1.2,.12,.7,warm);box(sign*109,.012,z,.22,.035,10,blue);}
 }
 // Four taller cable towers give the unchanged arena a larger surrounding silhouette.
 for(const x of [-78,78])for(const z of [-97,97]){box(x,20.5,z,.7,41,.7,metal);box(x,41,z,1.4,.18,1.4,warm);const top=new V3(x,40,z),bottom=new V3(x*.61,29,z*.72),delta=bottom.clone().sub(top),cable=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,delta.length(),5),metal);cable.position.copy(top).add(bottom).multiplyScalar(.5);cable.quaternion.setFromUnitVectors(Y3,delta.normalize());group.add(cable);}
 const trees=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0x42765c,roughness:1}),112),trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.22,.35,1,5),dark,112),matrix=new THREE.Matrix4(),q=new Qn(),position=new V3(),scale=new V3(),color=new THREE.Color();
 for(let i=0;i<112;i++){const angle=i/112*Math.PI*2,h=4.2+(i%7)*.48;position.set(Math.cos(angle)*(120+i%3*7),h*.76,Math.sin(angle)*(143+i%4*6));scale.set(2.4,h*.62,2.4);matrix.compose(position,q,scale);trees.setMatrixAt(i,matrix);trees.setColorAt(i,color.setHex([0x42765c,0x315d4e,0x638260][i%3]));position.y=h*.28;scale.set(1,h*.56,1);matrix.compose(position,q,scale);trunks.setMatrixAt(i,matrix);}
 for(const mesh of [trees,trunks]){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);}trees.instanceColor.needsUpdate=true;
 batchMeshes(group);group.traverse(o=>{o.castShadow=false;o.receiveShadow=false;});scene.add(group);document.body.dataset.exterior='skyline-district';
}
function buildArenaAtmosphere(){
 const group=new THREE.Group();group.name='Team atmosphere';
 for(let team=0;team<2;team++){
  const color=team?0xff8d45:0x4f9dff,material=new THREE.SpriteMaterial({map:glowTex(),color,opacity:.075,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,fog:false}),haze=new THREE.Sprite(material);haze.position.set(0,15,(team?1:-1)*64);haze.scale.set(58,27,1);group.add(haze);
 }
 scene.add(group);document.body.dataset.atmosphere='cobalt-amber';
}
