// Photographed CC0 micro surface under original mown/team-painted field art.
// The photo contributes restrained luminance, so dry brown grass never recolors teams.
let TURF_SURFACE_ASSETS=null;
const TURF_SURFACE=Object.freeze({tile:2.5,width:2048,height:2560,normal:.32});
async function loadTurfSurfaceAssets(){
 if(TURF_SURFACE_ASSETS)return TURF_SURFACE_ASSETS;
 const keys=['diffuse','normal','roughness'],urls=['TURF:diffuse','TURF:normal','TURF:roughness'];
 const results=await Promise.allSettled(urls.map(url=>new THREE.TextureLoader().loadAsync(url)));
 if(results.some(r=>r.status!=='fulfilled')){for(const r of results)if(r.status==='fulfilled')r.value.dispose();console.warn('Turf photography unavailable; retaining built-in turf');return null;}
 TURF_SURFACE_ASSETS={};results.forEach((r,i)=>{const t=r.value;t.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.name='CC0 grass ground '+keys[i];if(i)t.repeat.set(2*HX/TURF_SURFACE.tile,2*HZ/TURF_SURFACE.tile);t.needsUpdate=true;TURF_SURFACE_ASSETS[keys[i]]=t;});return TURF_SURFACE_ASSETS;
}
function applyPitchDetail(material,assets,renderer){
 if(!assets)return material;
 const previous=material.normalMap;if(previous&&previous!==assets.normal)previous.dispose();
 material.normalMap=assets.normal;material.roughnessMap=assets.roughness;material.normalScale.set(TURF_SURFACE.normal,TURF_SURFACE.normal);
 // An enumerable texture reference also gives the shared resource disposer ownership.
 material.turfDetailMap=assets.diffuse;const repeat=new THREE.Vector2(2*HX/TURF_SURFACE.tile,2*HZ/TURF_SURFACE.tile);
 if(renderer.isWebGPURenderer)ENGINE.pitchDetail(material,assets.diffuse,repeat);
 else{material.onBeforeCompile=shader=>{shader.uniforms.turfDetail={value:assets.diffuse};shader.uniforms.turfDetailRepeat={value:repeat};
  shader.fragmentShader='uniform sampler2D turfDetail; uniform vec2 turfDetailRepeat;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n float turfLuma=dot(texture2D(turfDetail,vMapUv*turfDetailRepeat).rgb,vec3(.2126,.7152,.0722)); diffuseColor.rgb*=clamp(turfLuma*2.5+.55,.55,1.3);');
 };material.customProgramCacheKey=()=>'nivet-championship-pitch-detail-v1';}
 material.userData.turfTile=TURF_SURFACE.tile;return material;
}
function championshipPitchMaterial(){
 const m=ENGINE.pitchMaterial(ren,teamPalette),c=m.map.image;c.width=TURF_SURFACE.width;c.height=TURF_SURFACE.height;const g=c.getContext('2d'),w=c.width,h=c.height;
 g.fillStyle='#436e2b';g.fillRect(0,0,w,h);
 // Broad, closely matched mowing tones read as a carpet rather than a chessboard.
 for(let y=0;y<10;y++)for(let x=0;x<8;x++){g.fillStyle=(x+y)%2?'#4a7731':'#3e6828';g.fillRect(x*w/8,y*h/10,w/8+1,h/10+1);}
 let seed=49177;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<190;i++){const x=rand()*w,y=rand()*h,r=35+rand()*130,gradient=g.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,i%2?'rgba(130,152,65,.045)':'rgba(14,34,13,.045)');gradient.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gradient;g.fillRect(x-r,y-r,r*2,r*2);}
 for(let i=0;i<40000;i++){g.fillStyle=i%3?'rgba(180,193,115,.055)':'rgba(14,35,15,.07)';g.fillRect(rand()*w,rand()*h,.7,1+rand()*2.5);}
 g.save();g.translate(w/2,h/2);g.scale(w/(2*HX),h/(2*HZ));g.lineJoin='round';
 const paint=(team,alpha)=>{const n=teamPalette[team];return `rgba(${n>>16&255},${n>>8&255},${n&255},${alpha})`};
 for(const sign of [-1,1]){
  const team=sign<0?0:1;g.fillStyle=paint(team,.31);g.fillRect(-18,sign<0?-47:31,36,16);
  g.fillStyle=paint(team,.66);g.fillRect(-37,sign<0?-47:46.3,74,.7);
  for(const side of [-1,1]){g.beginPath();g.moveTo(side*18,sign*47);g.lineTo(side*37,sign*47);g.lineTo(side*37,sign*38);g.lineTo(side*28,sign*32);g.lineTo(side*18,sign*32);g.closePath();g.fillStyle=paint(team,.17);g.fill();}
  g.strokeStyle=paint(team,.65);g.lineWidth=.46;for(const x of [-29,29])for(let j=0;j<3;j++){const z=sign*(10+j*4);g.beginPath();g.moveTo(x-1.55,z-sign*1.2);g.lineTo(x,z);g.lineTo(x+1.55,z-sign*1.2);g.stroke();}
  g.beginPath();g.arc(0,0,10.65,team?0:Math.PI,team?Math.PI:Math.PI*2);g.stroke();
 }
 g.strokeStyle='rgba(239,242,220,.86)';g.lineWidth=.145;g.strokeRect(-37,-47,74,94);g.beginPath();g.moveTo(-37,0);g.lineTo(37,0);g.stroke();g.beginPath();g.arc(0,0,10,0,Math.PI*2);g.stroke();
 for(const sign of [-1,1]){g.strokeRect(-18,sign<0?-47:31,36,16);g.strokeRect(-9,sign<0?-47:40,18,7);g.fillStyle='rgba(238,242,222,.82)';g.beginPath();g.arc(0,sign*35,.18,0,Math.PI*2);g.fill();}
 g.fillStyle='#e4ead2';g.beginPath();g.arc(0,0,.21,0,Math.PI*2);g.fill();g.font='italic 900 1.65px sans-serif';g.textAlign='center';g.fillStyle='rgba(221,232,196,.22)';g.fillText('N I V E T',0,4);
 const canopy=g.createLinearGradient(-39,0,-14,0);canopy.addColorStop(0,'rgba(10,25,21,.21)');canopy.addColorStop(.7,'rgba(12,30,23,.11)');canopy.addColorStop(1,'rgba(12,30,23,0)');g.fillStyle=canopy;g.beginPath();g.moveTo(-39,-51);g.lineTo(-27,-51);g.lineTo(-14,51);g.lineTo(-39,51);g.closePath();g.fill();
 // Static roof strut shade adds structure without making the entire bowl a shadow caster.
 for(let z=-40;z<=40;z+=16){g.fillStyle='rgba(13,30,24,.075)';g.beginPath();g.moveTo(-38,z);g.lineTo(-38,z+.28);g.lineTo(-17,z+7.5);g.lineTo(-17,z+7.2);g.closePath();g.fill();}
 g.restore();PITCH_TEXTURE=m.map;m.map.anisotropy=8;m.map.needsUpdate=true;m.roughness=.97;m.metalness=0;m.envMapIntensity=.16;m.aoMap=pitchOcclusionTexture();m.aoMapIntensity=.35;m.name='Championship living turf';
 applyPitchDetail(m,TURF_SURFACE_ASSETS,ren);document.body.dataset.pitch='photographic-micro-turf-v1';return m;
}
