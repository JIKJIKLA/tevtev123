// TSL material installed into the pinned engine closure by patch-grass.cjs.
// h is that bundle's existing three/tsl namespace; no second engine is loaded.
function b_(C){
 const {uniform,attribute,cameraPosition:camera,vec2,vec3,float,sin,cos,mod,smoothstep,step,abs,normalize,mix,texture,varying,transformNormalToView}=h;
 const time=uniform(0),wind=uniform(1);C.t=time;C.wind=wind;
 const position=attribute('position','vec3'),off=attribute('off','vec3'),normal=attribute('normal','vec3'),r=off.z,height=position.y;
 const profile=uniform(C.turfProfile.value),shape=uniform(C.turfShape.value),field=uniform(C.fieldSize.value),tileSize=shape.x,halfTile=tileSize.mul(.5);
 const w=mod(off.xy.sub(camera.xz).add(halfTile),tileSize).add(camera.xz).sub(halfTile);
 const fade=float(1).sub(smoothstep(profile.z,profile.w,camera.xz.sub(w).length())).mul(step(abs(w.x),field.x.mul(.5).sub(4.16))).mul(step(abs(w.y),field.y.mul(.5).sub(4.4)));
 const length=mix(profile.x,profile.y,r).mul(fade),a=r.mul(6.2831);
 let p=vec3(w.x.add(position.x.mul(cos(a)).sub(position.z.mul(sin(a))).mul(fade)),height.mul(length).add(shape.y),w.y.add(position.x.mul(sin(a)).add(position.z.mul(cos(a))).mul(fade)));
 const groom=sin(w.y.mul(.23)).mul(shape.z).mul(height.mul(height)).mul(fade);
 const wave=sin(time.mul(1.18).add(w.x.mul(.48)).add(w.y.mul(.27))).mul(.5).add(sin(time.mul(2.4).add(w.y.mul(.65)).add(r.mul(7))).mul(.16)).add(sin(time.mul(4.8).add(w.x.mul(2.2)).add(r.mul(5))).mul(.05)).mul(height.mul(height)).mul(length).mul(shape.w).mul(wind);
 p=p.add(vec3(wave,0,groom.add(wave.mul(.42))));
 let contactShade=float(1),compression=float(1);
 for(let k=0;k<7;k++){
  const center=uniform(C['c'+k].value),velocity=uniform(C['v'+k].value),q=w.sub(center.xz),near=float(1).sub(smoothstep(.6,2,center.y));
  const press=float(1).sub(smoothstep(.2,1.15,q.length())).mul(near),speed=velocity.xz.length(),dir=velocity.xz.div(speed.max(.001)),along=q.dot(dir),side=q.sub(dir.mul(along)).length();
  const core=float(1).sub(smoothstep(.12,k===6?1.05:.72,q.length())).mul(near);
  contactShade=contactShade.mul(float(1).sub(core.mul(.28)));
  const wake=float(1).sub(smoothstep(.35,1.1,side)).mul(smoothstep(-3.8,-.5,along)).mul(float(1).sub(smoothstep(-.2,.5,along))).mul(speed.div(23).min(1)).mul(near);
  const radial=q.add(.0001),bend=radial.div(radial.length().max(.0001)).mul(press).mul(.045).add(dir.mul(wake).mul(.065)).mul(height.mul(height)).mul(fade);
  p=p.add(vec3(bend.x,0,bend.y));compression=compression.mul(float(1).sub(press.mul(.56).add(wake.mul(.24)).min(.75)));
 }
 p=vec3(p.x,shape.y.add(height.mul(length).mul(compression.max(.18))),p.z);
 const uv=vec2(w.x.div(field.x).add(.5),float(.5).sub(w.y.div(field.y))),patch=sin(w.x.mul(.61).add(w.y.mul(.33))).mul(sin(w.y.mul(.77).sub(w.x.mul(.2)))).mul(.065);
 const fiber=mix(.60,1.14,height).mul(float(.86).add(r.mul(.26)).add(patch)).mul(contactShade.max(.64)),color=varying(texture(C.paint.value,uv).rgb.mul(fiber),'turfPigment');
 const rotatedNormal=vec3(normal.x.mul(cos(a)).sub(normal.z.mul(sin(a))),normal.y,normal.x.mul(sin(a)).add(normal.z.mul(cos(a))));
 const material=new fi({side:MB,roughness:.97,metalness:0,envMapIntensity:.18});
 material.name='Groomed championship turf / WebGPU';material.positionNode=p;material.colorNode=color;material.normalNode=normalize(varying(transformNormalToView(rotatedNormal),'turfNormalView'));material.emissiveNode=color.mul(.035);return material;
}
