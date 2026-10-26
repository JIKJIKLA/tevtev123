const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('rounded concourse ribbon stays outside the pitch with finite closed geometry and continuous texture UVs',()=>{
 const a=load().api,g=a.stadiumRibbonGeometry(48,67,5.2,.8),p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');
 for(const data of [p.array,n.array,uv.array])assert.ok(Array.from(data).every(Number.isFinite));assert.ok(p.count<500);assert.equal(g.index.count,(p.count/2-1)*6);
 for(let i=0;i<p.count;i++){assert.ok(Math.abs(p.getX(i))>40.96||Math.abs(p.getZ(i))>51.2);assert.ok(p.getY(i)>=5.19&&p.getY(i)<=6.01);}
 assert.ok(Math.abs(p.getX(0)-p.getX(p.count-2))<1e-5);assert.ok(Math.abs(p.getZ(0)-p.getZ(p.count-2))<1e-5);assert.equal(uv.getX(0),0);assert.equal(uv.getX(uv.count-1),12);
});
test('the exterior plaza remains outside the unchanged collision pitch and has finite surfaces',()=>{const a=load().api,g=a.exteriorApronGeometry(),p=g.getAttribute('position'),n=g.getAttribute('normal');assert.ok(p.count>16&&p.count<1000);for(const data of [p.array,n.array])assert.ok(Array.from(data).every(Number.isFinite));for(let i=0;i<p.count;i++)assert.ok(Math.abs(p.getX(i))>40.96||Math.abs(p.getZ(i))>51.2);});
