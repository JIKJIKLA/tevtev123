const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('radiance probe uses linear light and preserves HDR team lights without clipping the sky',()=>{
 const a=load().api;assert.equal(a.radianceLinear(0),0);assert.equal(a.radianceLinear(255),1);assert.ok(Math.abs(a.radianceLinear(128)-.21586)<.0001);
 const source=new Uint8Array(4*128*4);for(let i=0;i<source.length;i+=4)source.set([140,180,210,255],i);source.set([255,146,42,255],(63*4)*4);source.set([38,143,255,255],(63*4+1)*4);source.set([255,0,0,255],0);source.set([0,255,0,255],127*4*4);const result=a.stadiumRadiancePixels(source,4,128);assert.ok(Array.from(result).every(Number.isFinite));assert.ok(result[(64*4)*4]>3);assert.ok(result[(64*4+1)*4+2]>3);assert.equal(result[1],1);assert.equal(result[127*4*4],1);for(let i=3;i<result.length;i+=4)assert.equal(result[i],1);assert.equal(result.length,source.length);
});
