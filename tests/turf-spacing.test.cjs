const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('wrapped turf keeps uniform root spacing in either quality tier and across tile boundaries',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../src/grass.js'),'utf8'),ctx=vm.createContext({});vm.runInContext(source+'\nthis.roots=turfRootOffsets;this.tile=TURF_TILE_SIZE;',ctx);
 const node=fs.readFileSync(path.join(__dirname,'../src/grass-node.js'),'utf8'),match=node.match(/const tileSize=(\d+)/);assert.equal(Number(match[1]),ctx.tile);
 for(const count of [16000,28000]){
  const roots=ctx.roots(count),again=ctx.roots(count);assert.deepEqual(roots,again);assert.equal(roots.length,count*3);
  for(const axis of [0,1])for(const camera of [-40.1,-10,0,9.9,20.1]){
   const bins=Array(10).fill(0);for(let i=0;i<count;i++){
    const root=roots[i*3+axis];assert.ok(root>=0&&root<ctx.tile);const local=((root-camera+ctx.tile/2)%ctx.tile+ctx.tile)%ctx.tile;bins[Math.min(9,Math.floor(local/ctx.tile*10))]++;
   }
   // Stratification permits a partial final row, but never a doubled strip.
   for(const amount of bins)assert.ok(Math.abs(amount-count/10)<count*.012,JSON.stringify({count,axis,camera,bins}));
  }
 }
});
