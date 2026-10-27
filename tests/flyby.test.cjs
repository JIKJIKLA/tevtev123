const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('supplied F-22 retains its mesh and UVs in bounded portable buffers with retracted landing gear',()=>{
 const a=load().api,s=a.jetSpecification();assert.match(s.source,/supplied F22Raptor/);assert.equal(s.length,18.9);assert.equal(s.meshes.length,6);let triangles=0,vertices=0;
 for(const part of s.meshes){assert.doesNotMatch(part.name,/landingOn/);const g=a.jetMeshGeometry(part),p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');assert.equal(p.count,part.vertices);assert.equal(g.index.count,part.triangles*3);assert.equal(n.count,p.count);assert.equal(uv.count,p.count);for(const data of [p.array,n.array,uv.array])assert.ok(Array.from(data).every(Number.isFinite));assert.ok(Math.max(...g.index.array)<p.count);for(let i=0;i<n.count;i++){const length=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));assert.ok(length>.98&&length<1.02);}triangles+=part.triangles;vertices+=part.vertices;
 }assert.equal(triangles,28696);assert.ok(vertices<26000);
});
test('flyby travels quickly above the fixed roof and motion preference removes every camera/UI offset',()=>{
 const a=load().api;let max=0;for(let t=0;t<5.5;t+=.01){const p=a.jetFlybyPose(t);assert.ok(Object.values(p).every(n=>typeof n==='boolean'||Number.isFinite(n)));assert.ok(p.y-2.9>a.OPENING.roofY);assert.ok(Math.abs(p.uiX)<=2.5&&Math.abs(p.uiY)<=1.8);assert.ok(Math.hypot(p.shakeX,p.shakeY)<.09);max=Math.max(max,p.power);const quiet=a.jetFlybyPose(t,false);assert.equal(quiet.visible,false);for(const k of ['shakeX','shakeY','uiX','uiY','power'])assert.equal(Math.abs(quiet[k]),0);}assert.ok(max>.75);assert.ok(a.jetFlybyPose(1.5).x-a.jetFlybyPose(.5).x>200);assert.equal(a.jetFlybyPose(2.3).visible,false);
});
test('flyby reset and pause remove UI shake without changing match state',()=>{
 const g=load(),a=g.api;g.document.body.classList.add('jet-impact');g.document.body.style.setProperty('--jet-x','2px');a.JET.sounded=true;a.clearFlyby();assert.equal(a.JET.sounded,false);assert.equal(g.document.body.classList.contains('jet-impact'),false);a.setState({st:'PAUSE'});g.document.body.classList.add('jet-impact');a.syncCinema();assert.equal(g.document.body.classList.contains('jet-impact'),false);assert.equal(a.getState().st,'PAUSE');
});
test('new safety rails stay outside the collision field with finite shared geometry',()=>{
 const a=load().api;for(const y of [4.08,20.28]){const g=a.wallCageBandGeometry(y,.11),p=g.getAttribute('position');assert.ok(p.count<500);assert.ok(Array.from(p.array).every(Number.isFinite));assert.ok(Array.from(g.getAttribute('normal').array).every(Number.isFinite));for(let i=0;i<p.count;i++){const point=new a.THREE.Vector3().fromBufferAttribute(p,i);a.surf(point);assert.ok(a.getState().penetration<.05);}}
});
