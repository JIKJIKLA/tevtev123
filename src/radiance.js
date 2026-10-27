// A static HDR lighting probe, filtered once by the existing PMREM path. This is
// image-based lighting, not hardware ray tracing. No recurring cube captures.
function radianceLinear(value){value=cl(value/255,0,1);return value<=.04045?value/12.92:Math.pow((value+.055)/1.055,2.4);}
function stadiumRadiancePixels(bytes,width,height){
 const pixels=new Float32Array(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,r=bytes[i],g=bytes[i+1],b=bytes[i+2],fascia=y/height>.482&&y/height<.513,led=fascia&&(b>190&&b>r*1.3||r>215&&r>b*1.35),gain=led?3.1:1;
  // Canvas rows start at the top; raw DataTexture rows start at the bottom.
  const out=((height-1-y)*width+x)*4;pixels[out]=radianceLinear(r)*gain;pixels[out+1]=radianceLinear(g)*gain;pixels[out+2]=radianceLinear(b)*gain;pixels[out+3]=1;
 }return pixels;
}
function stadiumRadianceTexture(image){
 const w=1024,h=512,c=cvs(w,h),g=c.getContext('2d');g.drawImage(image,0,0,w,h);
 // The lower hemisphere sees concourses, team fascia and green turf, rather
 // than a mirrored sky. The photographic sky remains unchanged on screen.
 const bowl=g.createLinearGradient(0,222,0,350);bowl.addColorStop(0,'rgba(45,70,91,0)');bowl.addColorStop(.3,'#334b5d');bowl.addColorStop(.7,'#243b4b');bowl.addColorStop(1,'#496246');g.fillStyle=bowl;g.fillRect(0,222,w,128);
 for(let panel=0;panel<32;panel++){const x=panel*w/32;g.fillStyle=panel%2?'#314858':'#243b4b';g.fillRect(x,263,w/32-3,55);g.fillStyle='#9b9f85';g.fillRect(x+7,231,14,2);}
 for(let side=0;side<4;side++){const x=side*w/4,blue=side%2===0;g.fillStyle=blue?'#268fff':'#ff922a';g.fillRect(x+5,248,w/4-10,5);g.fillStyle=blue?'#3578a3':'#ac7440';g.fillRect(x+5,259,w/4-10,2);}
 const ground=g.createLinearGradient(0,317,0,h);ground.addColorStop(0,'rgba(76,105,62,0)');ground.addColorStop(.3,'#526e3c');ground.addColorStop(1,'#28422d');g.fillStyle=ground;g.fillRect(0,317,w,h-317);
 const pixels=stadiumRadiancePixels(g.getImageData(0,0,w,h).data,w,h),texture=new THREE.DataTexture(pixels,w,h,THREE.RGBAFormat,THREE.FloatType);texture.colorSpace=THREE.LinearSRGBColorSpace;texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;texture.name='Static HDR stadium radiance';return texture;
}
function pitchOcclusionTexture(){
 const c=cvs(512,512),g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,512,512);
 // Only indirect light is occluded. The sunlit center and markings stay clear.
 for(const axis of ['x','y'])for(const sign of [-1,1]){const start=sign<0?0:512,end=start-sign*90,gradient=axis==='x'?g.createLinearGradient(start,0,end,0):g.createLinearGradient(0,start,0,end);gradient.addColorStop(0,'rgba(0,0,0,.3)');gradient.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gradient;g.fillRect(0,0,512,512);}
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.NoColorSpace;texture.channel=0;texture.name='Baked perimeter ambient occlusion';return texture;
}
