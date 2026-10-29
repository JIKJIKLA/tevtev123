const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),load=require('./harness.cjs');
const game=fs.readFileSync(path.join(__dirname,'../src/game.js'),'utf8'),start=game.indexOf('function uploadParticles(){'),end=game.indexOf('function addSpectators()',start);
function uploadScene(){
 const T=load().api.THREE,count=900,pts=new T.InstancedMesh(new T.PlaneGeometry(),new T.MeshBasicMaterial(),count);pts.instanceColor=new T.InstancedBufferAttribute(new Float32Array(count*3),3);pts.userData.matrixRange={start:0,count:0};pts.userData.colorRange={start:0,count:0};
 const ctx={pts,particleCount:count,particleMatrix:new T.Matrix4(),particlePosition:new T.Vector3(),particleScale:new T.Vector3(),pp:new Float32Array(count*3),pc:new Float32Array(count*3),cam:{fov:103,quaternion:new T.Quaternion().setFromEuler(new T.Euler(.23,-.85,.14))}};
 for(let i=0;i<count*3;i++){ctx.pp[i]=Math.sin(i*.714)*46;ctx.pc[i]=Math.abs(Math.cos(i*.34))*1.2;}vm.runInNewContext(game.slice(start,end)+';this.upload=uploadParticles;',ctx);return {T,ctx};
}
test('batched billboards retain the exact per-particle matrix, color and active prefix',()=>{
 const {T,ctx:c}=uploadScene(),expected=new Float32Array(900*16),matrix=new T.Matrix4(),scale=new T.Vector3().setScalar(.9*Math.tan(c.cam.fov*Math.PI/360)),position=new T.Vector3();
 for(let k=0;k<900;k++){position.fromArray(c.pp,k*3);matrix.compose(position,c.cam.quaternion,scale).toArray(expected,k*16);}
 let compositions=0;const compose=c.particleMatrix.compose;c.particleMatrix.compose=function(...args){compositions++;return compose.apply(this,args)};
 const bytes=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength);c.upload();assert.deepEqual(bytes(c.pts.instanceMatrix.array),bytes(expected));assert.deepEqual(bytes(c.pts.instanceColor.array),bytes(c.pc));assert.equal(compositions,1);assert.equal(c.pts.count,900);assert.equal(c.pts.instanceMatrix.updateRanges[0].count,900*16);assert.equal(c.pts.instanceColor.updateRanges[0].count,900*3);
 const preserved=c.pts.instanceMatrix.array.slice(16*12),version=c.pts.instanceMatrix.version;c.particleCount=12;c.cam.fov=64;c.upload();assert.equal(compositions,2);assert.equal(c.pts.count,12);assert.equal(c.pts.instanceMatrix.updateRanges[0].count,12*16);assert.deepEqual(c.pts.instanceMatrix.array.slice(16*12),preserved);
 assert.equal(c.pts.instanceMatrix.version,version+1);const idleVersion=c.pts.instanceMatrix.version;c.particleCount=0;c.upload();assert.equal(c.pts.count,0);assert.equal(compositions,2);assert.equal(c.pts.instanceMatrix.version,idleVersion,'empty effects do not upload a buffer');
});

test('unobscured cars keep original opaque materials and faded cars return to their original opacity modes',()=>{
 const a=load({source:true}).api,T=a.THREE,paint=new T.MeshStandardMaterial({color:0x123456}),glass=new T.MeshPhysicalMaterial({opacity:.68,transparent:true,depthWrite:false}),car=new T.Group(),opponent=new T.Mesh(new T.BoxGeometry(),paint);
 const body=new T.Mesh(new T.BoxGeometry(),[paint,glass]),trim=new T.Mesh(new T.BoxGeometry(),paint);car.add(body,trim);car.userData.paintMaterials=[paint];
 for(let i=0;i<120;i++)a.setCameraCarOpacity(car,1);assert.equal(car.userData.cameraFade,undefined);assert.equal(body.material[0],paint);assert.equal(trim.material,paint);assert.equal(paint.transparent,false);
 a.setCameraCarOpacity(car,.33);const opaque=body.material[0],window=body.material[1];assert.notEqual(opaque,paint);assert.equal(trim.material,opaque);assert.equal(car.userData.cameraFade.materials.length,2);assert.equal(car.userData.paintMaterials[0],opaque);assert.equal(opaque.transparent,true);assert.equal(opaque.depthWrite,false);assert.equal(window.opacity,.68*.33);assert.equal(opponent.material,paint);assert.equal(paint.opacity,1);assert.equal(paint.transparent,false);
 const version=opaque.version;let writes=0,current=opaque.opacity;Object.defineProperty(opaque,'opacity',{get:()=>current,set:value=>{writes++;current=value}});for(let i=0;i<120;i++)a.setCameraCarOpacity(car,.33);assert.equal(writes,0);assert.equal(opaque.version,version);
 a.setCameraCarOpacity(car,1);assert.equal(opaque.transparent,false);assert.equal(opaque.depthWrite,true);assert.equal(opaque.opacity,1);assert.equal(window.transparent,true);assert.equal(window.opacity,.68);assert.equal(window.depthWrite,false);assert.equal(opaque.color.getHex(),0x123456);
 const owned=new Set();car.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)owned.add(m)});assert.equal(owned.size,2);for(const entry of car.userData.cameraFade.materials)assert.ok(owned.has(entry.material),'every retained fade material stays owned by the rendered scene');
});

test('stationary driver tags avoid style writes but still follow mesh, camera and viewport changes',()=>{
 const a=load({source:true}).api,T=a.THREE,camera=new T.PerspectiveCamera(65,16/9,.1,500),position=new T.Vector3(0,0,-20),project=new T.Vector3();camera.updateMatrixWorld();let writes=0,transform='';const el={style:{get transform(){return transform},set transform(value){writes++;transform=value}}};
 for(let i=0;i<120;i++)assert.equal(a.positionDriverTag(el,position,camera,project,1366,768),true);assert.equal(writes,1);
 position.x+=1;a.positionDriverTag(el,position,camera,project,1366,768);assert.equal(writes,2);camera.position.x=2;camera.updateMatrixWorld();a.positionDriverTag(el,position,camera,project,1366,768);assert.equal(writes,3);a.positionDriverTag(el,position,camera,project,1920,1080);assert.equal(writes,4);position.z=20;assert.equal(a.positionDriverTag(el,position,camera,project,1920,1080),false);assert.equal(writes,4);
});

test('idle quick-chat frames make no repeated style/text writes and immediately reflect cooldown/team changes',()=>{
 let styleWrites=0,textWrites=0,color='#246bff',text='READY';const style=()=>{const values=new Map();return{getPropertyValue:key=>values.get(key)||'',setProperty(key,value){styleWrites++;values.set(key,value)}}};
 const elements={'quick-chat':{style:style()},'chat-log':{style:style(),dataset:{messages:''},replaceChildren(){throw Error('Unchanged chat was rebuilt')}},'chat-ready':{get textContent(){return text},set textContent(value){textWrites++;text=value}}};for(let i=0;i<4;i++)elements['chat-'+i]={disabled:false};
 const source=fs.readFileSync(path.join(__dirname,'../src/match-cinema.js'),'utf8'),start=source.indexOf('function renderQuickChat(){'),end=source.indexOf('function setupMatchPresentationUI()',start),ctx={$:id=>elements[id],teamHex:()=>color,localPlayer:()=>({team:0}),RIVALS:{time:10,chatAt:-100,messages:[]}};vm.runInNewContext(source.slice(start,end)+';this.update=renderQuickChat;',ctx);
 ctx.update();assert.equal(styleWrites,2);assert.equal(textWrites,0);styleWrites=0;for(let i=0;i<120;i++)ctx.update();assert.equal(styleWrites,0);assert.equal(textWrites,0);
 ctx.RIVALS.chatAt=ctx.RIVALS.time;ctx.update();assert.equal(text,'SENT');assert.equal(textWrites,1);for(let i=0;i<4;i++)assert.equal(elements['chat-'+i].disabled,true);color='#ff7a20';ctx.update();assert.equal(styleWrites,2);assert.equal(textWrites,1);
});
