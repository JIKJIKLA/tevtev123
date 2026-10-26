const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('turf tufts have three tapered blades with finite upward-facing geometry',()=>{
 const a=load().api,g=a.turfGeometry(),p=g.getAttribute('position'),n=g.getAttribute('normal');assert.equal(p.count,15);assert.equal(g.index.count,27);assert.ok(Array.from(p.array).every(Number.isFinite));for(let i=0;i<n.count;i++){assert.equal(n.getY(i),1);assert.ok(p.getY(i)>=0&&p.getY(i)<=1);}assert.equal(Array.from(p.array).filter((_,i)=>i%3===1&&p.array[i]===1).length,3);
});
test('WebGPU grass samples the shared pitch paint and exposes a wind toggle',()=>{
 const a=load().api,T=a.THREE,paint=new T.Texture(),u={paint:{value:paint},fieldSize:{value:new T.Vector2(82,102)}};for(let k=0;k<7;k++){u['c'+k]={value:new T.Vector3()};u['v'+k]={value:new T.Vector3()};}const m=a.engine.nodeGrass(u);let sampled=false;m.colorNode.traverse(n=>{if(n.isTextureNode&&n.value===paint)sampled=true});assert.equal(sampled,true);assert.equal(u.wind.value,1);u.wind.value=0;assert.equal(u.wind.value,0);assert.ok(m.roughness>=.9);assert.ok(m.positionNode);
});
