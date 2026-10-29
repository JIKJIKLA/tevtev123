// A static HDR lighting probe, filtered once by the existing PMREM path. This is
// image-based lighting, not hardware ray tracing. No recurring cube captures.
function radianceLinear(value){value=cl(value/255,0,1);return value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2.4);}
const STADIUM_LIGHTING={exposure:1.02,environment:.56,fogColor:0x91a9b8,fogNear:95,fogFar:300};
function stadiumLightRig(renderer,scene,detail,palette=teamPalette){
 scene.add(new THREE.HemisphereLight(0xbdd9ed,0x566143,.8));
 const sun=new THREE.DirectionalLight(0xffedce,3.3);sun.position.set(-40,68,28);sun.userData.shadowOffset=sun.position.clone();sun.castShadow=true;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;sun.shadow.mapSize.set(detail?2048:1024,detail?2048:1024);sun.shadow.radius=2;
 // Focus one shadow map around the player instead of spreading it over 140 m.
 // Nearby cars/ball cast real shadows in either preset; stadium geometry is baked.
 const sc=sun.shadow.camera;sc.left=sc.bottom=detail?-18:-14;sc.right=sc.top=detail?18:14;sc.near=1;sc.far=180;sun.shadow.bias=-.00012;sun.shadow.normalBias=.012;scene.add(sun,sun.target);
 // Broad diffuse fill exposes body shape; high roughness still controls paint highlights.
 const fill=new THREE.DirectionalLight(0xc5ddff,.95);fill.position.set(42,30,-38);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xffb477,.4);rim.position.set(-15,26,-48);scene.add(rim);
 const lights=[];
 for(let team=0;team<2;team++){const sign=team?1:-1,l=new THREE.PointLight(palette[team],64,42,2);l.position.set(0,7,sign*(HZ-3));Object.assign(l.userData,{team,base:64});lights.push(l);scene.add(l);if(detail)for(const x of [-GX,GX]){const lamp=new THREE.PointLight(palette[team],10,12,2);lamp.position.set(x,GH,sign*(HZ-.4));Object.assign(lamp.userData,{team,base:10});lights.push(lamp);scene.add(lamp);}}
 renderer.shadowMap.type=THREE.PCFShadowMap;return{sun,goalLights:lights};
}
function updateStadiumShadow(showcase=false){
 if(!sun||!ren?.shadowMap||!sun.userData.shadowOffset)return;
 const player=localPlayer(),model=cm[showcase?0:player.id],focus=model?.position||player.p;
 sun.target.position.set(focus.x,0,focus.z);sun.position.copy(sun.target.position).add(sun.userData.shadowOffset);sun.target.updateMatrixWorld();
 sun.shadow.needsUpdate=ren.shadowMap.needsUpdate=true;
}
function stadiumContactShadowTexture(car=false){
 // Tyre contact needs four localized cores, rather than one hovering round blob.
 // Keep the original radial projection for the ball.
 const c=cvs(64,64),g=c.getContext('2d');
 if(!car){const gradient=g.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,.95)');gradient.addColorStop(.35,'rgba(255,255,255,.78)');gradient.addColorStop(.7,'rgba(255,255,255,.24)');gradient.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gradient;g.fillRect(0,0,64,64);return tex(c);}
 const ellipse=(x,y,rx,ry,strength)=>{g.save();g.translate(x,y);g.scale(rx,ry);const shade=g.createRadialGradient(0,0,0,0,0,1);shade.addColorStop(0,`rgba(255,255,255,${strength})`);shade.addColorStop(.45,`rgba(255,255,255,${strength*.55})`);shade.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=shade;g.fillRect(-1,-1,2,2);g.restore();};
 ellipse(32,32,28,24,.4);
 // The projection is 1.6 × 1.04 m; these cores cover the measured axle/track area.
 for(const x of [19,45])for(const y of [13,51])ellipse(x,y,9,8,.93);
 return tex(c);
}
function goalFrameHaloGeometry(){
 const p=[],uv=[],indices=[];
 for(const [x,y,w,h] of [[-GX-.22,GH/2,.8,GH+.5],[GX+.22,GH/2,.8,GH+.5],[0,GH+.24,2*GX+1,.8]]){const base=p.length/3;p.push(x-w/2,y-h/2,0,x+w/2,y-h/2,0,x+w/2,y+h/2,0,x-w/2,y+h/2,0);uv.push(0,0,1,0,1,1,0,1);indices.push(base,base+1,base+2,base,base+2,base+3);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function stadiumLightShaftGeometry(){
 const p=[],uv=[],indices=[];
 for(const x of [-21,21]){const base=p.length/3;p.push(x-3.3,3,0,x+3.3,3,0,x+.45,28,0,x-.45,28,0);uv.push(0,0,1,0,1,1,0,1);indices.push(base,base+1,base+2,base,base+2,base+3);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
function stadiumLightShaftMap(){
 const w=64,h=128,pixels=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,edge=Math.pow(Math.max(0,1-Math.pow((x/(w-1)-.5)*2,2)),2),fade=Math.pow(Math.sin(y/(h-1)*Math.PI),1.2);pixels[i]=pixels[i+1]=pixels[i+2]=255;pixels[i+3]=255*edge*fade;}
 const t=new THREE.DataTexture(pixels,w,h);t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;
}
function stadiumRadiancePixels(bytes,width,height){
 const pixels=new Float32Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,r=bytes[i],g=bytes[i+1],b=bytes[i+2],fascia=y/height>.482&&y/height<.513,led=fascia&&(b>190&&b>r*1.3||r>215&&r>b*1.35),gain=led?2.2:1;
  // Canvas rows start at the top; raw DataTexture rows start at the bottom.
  const out=((height-1-y)*width+x)*4;pixels[out]=radianceLinear(r)*gain;pixels[out+1]=radianceLinear(g)*gain;pixels[out+2]=radianceLinear(b)*gain;pixels[out+3]=1;
 }return pixels;
}
function stadiumRadianceTexture(image){
 const w=1024,h=512,c=cvs(w,h),g=c.getContext('2d');g.drawImage(image,0,0,w,h);
 // The lower hemisphere sees concourses, team fascia and green turf, rather
 // than a mirrored sky. The photographic sky remains unchanged on screen.
 const bowl=g.createLinearGradient(0,222,0,350);bowl.addColorStop(0,'rgba(58,73,84,0)');bowl.addColorStop(.3,'#3e4b52');bowl.addColorStop(.7,'#29333c');bowl.addColorStop(1,'#47533c');g.fillStyle=bowl;g.fillRect(0,222,w,128);
 for(let panel=0;panel<32;panel++){const x=panel*w/32;g.fillStyle=panel%2?'#314858':'#243b4b';g.fillRect(x,263,w/32-3,55);g.fillStyle='#9b9f85';g.fillRect(x+7,231,14,2);}
 for(let side=0;side<4;side++){const x=side*w/4,blue=side%2===0;g.fillStyle=blue?'#268fff':'#ff922a';g.fillRect(x+5,248,w/4-10,5);g.fillStyle=blue?'#3578a3':'#ac7440';g.fillRect(x+5,259,w/4-10,2);}
 const ground=g.createLinearGradient(0,317,0,h);ground.addColorStop(0,'rgba(70,87,49,0)');ground.addColorStop(.3,'#465b30');ground.addColorStop(1,'#283423');g.fillStyle=ground;g.fillRect(0,317,w,h-317);
 const pixels=stadiumRadiancePixels(g.getImageData(0,0,w,h).data,w,h),texture=new THREE.DataTexture(pixels,w,h,THREE.RGBAFormat,THREE.FloatType);texture.colorSpace=THREE.LinearSRGBColorSpace;texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;texture.name='Static HDR stadium radiance';return texture;
}
function pitchOcclusionTexture(){
 const c=cvs(512,512),g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,512,512);
 // Only indirect light is occluded. The sunlit center and markings stay clear.
 for(const axis of ['x','y'])for(const sign of [-1,1]){const start=sign<0?0:512,end=start-sign*90,gradient=axis==='x'?g.createLinearGradient(start,0,end,0):g.createLinearGradient(0,start,0,end);gradient.addColorStop(0,'rgba(0,0,0,.3)');gradient.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gradient;g.fillRect(0,0,512,512);}
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.NoColorSpace;texture.channel=0;texture.name='Baked perimeter ambient occlusion';return texture;
}
