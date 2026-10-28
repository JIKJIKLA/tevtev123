const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('supplied F-22 retains its mesh and UVs in bounded portable buffers with retracted landing gear',()=>{
 const a=load().api,s=a.jetSpecification();assert.match(s.source,/supplied F22Raptor/);assert.equal(s.length,18.9);assert.equal(s.meshes.length,6);let triangles=0,vertices=0;
 for(const part of s.meshes){assert.doesNotMatch(part.name,/landingOn/);const g=a.jetMeshGeometry(part),p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');assert.equal(p.count,part.vertices);assert.equal(g.index.count,part.triangles*3);assert.equal(n.count,p.count);assert.equal(uv.count,p.count);for(const data of [p.array,n.array,uv.array])assert.ok(Array.from(data).every(Number.isFinite));assert.ok(Math.max(...g.index.array)<p.count);for(let i=0;i<n.count;i++){const length=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));assert.ok(length>.98&&length<1.02);}triangles+=part.triangles;vertices+=part.vertices;
 }assert.equal(triangles,28696);assert.ok(vertices<26000);
});
test('full-size formation reads smaller at altitude and stays clear of the roof; reduced motion removes every camera/UI offset',()=>{
 const a=load().api;let max=0;for(let t=0;t<5;t+=.01){const p=a.jetFlybyPose(t);assert.ok(Object.values(p).every(n=>typeof n==='boolean'||Number.isFinite(n)));assert.ok(p.y-10>a.OPENING.roofY+20);assert.ok(p.y>=88);assert.ok(Math.abs(p.uiX)<=3.5&&Math.abs(p.uiY)<=2.5);assert.ok(Math.hypot(p.shakeX,p.shakeY)<.12);max=Math.max(max,p.power);const quiet=a.jetFlybyPose(t,false);assert.equal(quiet.visible,false);for(const k of ['shakeX','shakeY','uiX','uiY','power'])assert.equal(Math.abs(quiet[k]),0);}assert.ok(max>.9);assert.ok(a.jetFlybyPose(.5).z-a.jetFlybyPose(1.5).z>100);assert.equal(a.jetFlybyPose(3.8).visible,false);
});

test('orange leader goes straight while blue wingmen peel in opposite directions without path discontinuities',()=>{
 const a=load().api;assert.deepEqual(Array.from(a.AIRSHOW.colors),[0xff8c25,0x269eff,0x269eff]);
 for(let t=.05;t<a.AIRSHOW.end;t+=.02){const p=[0,1,2].map(i=>a.airshowJetPose(t,i));assert.equal(p[0].x,0);assert.equal(p[1].x,-p[2].x);assert.equal(p[1].bank,-p[2].bank);assert.equal(p[1].y,p[2].y);assert.ok(p[1].y>p[0].y);for(let i=0;i<3;i++){const next=a.airshowJetPose(t+.001,i),speed=Math.hypot(next.x-p[i].x,next.y-p[i].y,next.z-p[i].z)/.001;assert.ok(speed>84&&speed<121,String(speed));assert.ok(Math.abs(Math.atan2(next.z-p[i].z,next.x-p[i].x)+p[i].yaw)<.01);}}
 assert.ok(a.airshowJetPose(3.7,1).x< -150);assert.ok(a.airshowJetPose(3.7,2).x>150);assert.ok(Math.abs(a.airshowJetPose(3.7,1).yaw-Math.PI)<.15);assert.ok(Math.abs(a.airshowJetPose(3.7,2).yaw)<.15);
});

test('wingmen roll into smooth turns with continuous velocity and bounded acceleration',()=>{
 const a=load().api,h=.001;let maxAcceleration=0,maxRollRate=0;
 for(let i=1;i<3;i++)for(let t=.01;t<a.AIRSHOW.end;t+=.005){
  const prev=a.airshowJetPose(t-h,i),p=a.airshowJetPose(t,i),next=a.airshowJetPose(t+h,i);
  const acceleration=Math.hypot(next.x-2*p.x+prev.x,next.y-2*p.y+prev.y,next.z-2*p.z+prev.z)/(h*h);
  maxAcceleration=Math.max(maxAcceleration,acceleration);maxRollRate=Math.max(maxRollRate,Math.abs(next.bank-prev.bank)/(2*h));
 }
 assert.ok(maxAcceleration<85,'turn acceleration spiked: '+maxAcceleration);
 assert.ok(maxRollRate<2.6,'roll snapped: '+maxRollRate);
 for(const i of [1,2]){const before=a.airshowJetPose(a.AIRSHOW.split-.0001,i),after=a.airshowJetPose(a.AIRSHOW.split+.0001,i);assert.ok(Math.abs(after.bank-before.bank)<1e-6);assert.ok(Math.abs(after.yaw-before.yaw)<1e-6);}
 // The wake peaks when the aircraft pass, and is already over as the ball lands.
 assert.ok(a.jetFlybyPose(a.AIRSHOW.flyover).power>.9);assert.ok(a.jetFlybyPose(a.OPENING.impact).power<.005);
});

test('every supplied aircraft corner clears the roof even through its banked split',()=>{
 const a=load().api,T=a.THREE,bounds=a.jetSpecification().bounds,q=new T.Quaternion(),p=new T.Vector3();
 for(let index=0;index<3;index++)for(let t=.05;t<a.AIRSHOW.end;t+=.04){const pose=a.airshowJetPose(t,index);q.setFromEuler(new T.Euler(0,pose.yaw,0));q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),pose.pitch));q.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),pose.bank));
  for(const x of [bounds[0][0],bounds[1][0]])for(const y of [bounds[0][1],bounds[1][1]])for(const z of [bounds[0][2],bounds[1][2]]){p.set(x,y,z).applyQuaternion(q);assert.ok(p.y+pose.y>a.OPENING.roofY+25,'aircraft clipped the stadium roof');}
 }
});

test('flyover wake has a tiny fixed debris pool; the stadium itself never moves',()=>{
 const a=load().api,v=a.createOpeningVisuals(),debris=v.airshow.debris;assert.equal(debris.instanceMatrix.count,14);assert.equal(debris.count,0);assert.equal(debris.castShadow,false);assert.equal(v.group.position.length(),0);assert.equal(v.roof.position.y,a.OPENING.roofY);let lights=0;v.airshow.group.traverse(o=>{if(o.isLight)lights++});assert.equal(lights,0);
 let visible=0;for(let t=0;t<5;t+=.025)for(let i=0;i<a.AIRSHOW.debrisCount;i++){const p=a.airshowDebrisPose(t,i);assert.ok(Object.values(p).every(value=>typeof value==='boolean'||Number.isFinite(value)));assert.ok(p.scale>=0&&p.scale<=.055);if(p.visible){visible++;assert.ok(Math.abs(p.x)>22);assert.ok(p.y<a.OPENING.roofY&&p.y>27.4);}const quiet=a.airshowDebrisPose(t,i,false);assert.equal(quiet.visible,false);assert.equal(quiet.scale,0);}
 assert.ok(visible>0);
});

test('colored trails use fixed buffers, follow the split, and are independent of display frame history',()=>{
 const a=load().api,T=a.THREE,camera=new T.PerspectiveCamera();camera.position.set(12,11,-20);
 for(let aircraft=0;aircraft<3;aircraft++){const trail=new T.Mesh(a.airshowTrailGeometry(),new T.MeshBasicMaterial());Object.assign(trail.userData,{aircraft,width:1.5});const buffer=trail.geometry.getAttribute('position').array;for(let t=0;t<5;t+=.07){a.writeAirshowTrail(trail,t,camera,24);assert.equal(trail.geometry.getAttribute('position').array,buffer);assert.ok(Array.from(buffer).every(Number.isFinite));}a.writeAirshowTrail(trail,2.3,camera,24);const before=Array.from(buffer);a.writeAirshowTrail(trail,.1,camera,24);a.writeAirshowTrail(trail,2.3,camera,24);assert.deepEqual(Array.from(buffer),before);assert.equal(buffer.length,(a.AIRSHOW.samples+1)*6);}
});

test('all three aircraft share the supplied model buffers and PBR maps, with separate team-colored afterburners',()=>{
 const a=load().api;a.JET.images=Array.from({length:3},()=>({width:1,height:1}));const fleet=a.createOpeningVisuals().airshow,meshes=fleet.jets.map(j=>{const all=[];j.traverse(o=>{if(o.isMesh)all.push(o)});return all;});assert.ok(meshes[0].length>3);
 for(let i=1;i<3;i++)for(let k=0;k<meshes[0].length;k++){assert.equal(meshes[i][k].geometry,meshes[0][k].geometry);if(meshes[0][k].material.map)assert.equal(meshes[i][k].material.map,meshes[0][k].material.map);assert.equal(meshes[i][k].castShadow,false);}
 for(let i=0;i<3;i++){const flames=fleet.jets[i].userData.flames;assert.ok(flames);assert.equal(flames.children[0].material.color.getHex(),a.AIRSHOW.colors[i]);}
});
test('flyby reset and pause remove UI shake without changing match state',()=>{
 const g=load(),a=g.api;g.document.body.classList.add('jet-impact');g.document.body.style.setProperty('--jet-x','2px');a.JET.sounded=true;a.clearFlyby();assert.equal(a.JET.sounded,false);assert.equal(g.document.body.classList.contains('jet-impact'),false);a.setState({st:'PAUSE'});g.document.body.classList.add('jet-impact');a.syncCinema();assert.equal(g.document.body.classList.contains('jet-impact'),false);assert.equal(a.getState().st,'PAUSE');
});

test('airshow impact is on by default, saves separately from driving shake, and respects reduced motion',()=>{
 const g=load({full:true}),a=g.api,el=g.document.getElementById('option-flyby-shake');assert.equal(a.cameraSettings.shake,false);assert.equal(el.checked,true);assert.equal(a.airshowImpactMotion(),true);el.checked=false;el.onchange();assert.equal(a.airshowImpactMotion(),false);assert.equal(a.cameraSettings.shake,false);const saved=Object.fromEntries(g.storage),reloaded=load({storage:saved});assert.equal(reloaded.api.RIVAL_PREF.flybyShake,false);a.RIVAL_PREF.flybyShake=true;a.RIVAL_PREF.motion=false;assert.equal(a.airshowImpactMotion(),false);a.RIVAL_PREF.motion=true;g.window.matchMedia=()=>({matches:true});assert.equal(a.airshowImpactMotion(),false);
});
test('new safety rails stay outside the collision field with finite shared geometry',()=>{
 const a=load().api;for(const y of [4.08,20.28]){const g=a.wallCageBandGeometry(y,.11),p=g.getAttribute('position');assert.ok(p.count<500);assert.ok(Array.from(p.array).every(Number.isFinite));assert.ok(Array.from(g.getAttribute('normal').array).every(Number.isFinite));for(let i=0;i<p.count;i++){const point=new a.THREE.Vector3().fromBufferAttribute(p,i);a.surf(point);assert.ok(a.getState().penetration<.05);}}
});
