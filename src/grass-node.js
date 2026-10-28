// TSL material installed into the pinned engine closure by patch-grass.cjs.
// h is that bundle's existing three/tsl namespace; no second engine is loaded.
function b_(C){
 const {uniform,attribute,cameraPosition:camera,vec2,vec3,float,sin,cos,mod,smoothstep,step,abs,normalize,mix,texture,varying,normalViewGeometry}=h;
 const time=uniform(0),wind=uniform(1);C.t=time;C.wind=wind;
 const position=attribute('position','vec3'),off=attribute('off','vec3'),r=off.z,height=position.y;
 const w=mod(off.xy.sub(camera.xz).add(10),20).add(camera.xz).sub(10);
 const fade=float(1).sub(smoothstep(6,9.7,camera.xz.sub(w).length())).mul(step(abs(w.x),36.8)).mul(step(abs(w.y),46.8));
 const length=float(.052).add(r.mul(.052)).mul(fade),a=r.mul(6.2831);
 let p=vec3(w.x.add(position.x.mul(cos(a)).sub(position.z.mul(sin(a))).mul(fade)),height.mul(length).add(.008),w.y.add(position.x.mul(sin(a)).add(position.z.mul(cos(a))).mul(fade)));
 const wave=sin(time.mul(1.25).add(w.x.mul(.42)).add(w.y.mul(.24))).mul(.35).add(sin(time.mul(2.1).add(w.y.mul(.71)).add(r.mul(9))).mul(.09)).mul(height.mul(height)).mul(length).mul(2.4).mul(wind);
 p=p.add(vec3(wave,0,wave.mul(.55)));
 let contactShade=float(1);
 for(let k=0;k<7;k++){
  const center=uniform(C['c'+k].value),velocity=uniform(C['v'+k].value),q=w.sub(center.xz),near=float(1).sub(smoothstep(.6,2,center.y));
  const press=float(1).sub(smoothstep(.2,1.35,q.length())).mul(near),speed=velocity.xz.length(),dir=velocity.xz.div(speed.max(.001)),along=q.dot(dir),side=q.sub(dir.mul(along)).length();
  const core=float(1).sub(smoothstep(.12,k===6?1.05:.72,q.length())).mul(near);
  contactShade=contactShade.mul(float(1).sub(core.mul(.5)));
  const wake=float(1).sub(smoothstep(.4,1.35,side)).mul(smoothstep(-4,-1,along)).mul(float(1).sub(smoothstep(-.2,.6,along))).mul(speed.div(23).min(1)).mul(near);
  const bend=normalize(q.add(.0001)).mul(press).mul(.11).add(dir.mul(wake).mul(.18)).mul(height.mul(height));
  p=p.add(vec3(bend.x,press.mul(.65).add(wake.mul(.3)).mul(height).mul(length).negate(),bend.y));
 }
 const field=uniform(C.fieldSize.value),uv=vec2(w.x.div(field.x).add(.5),float(.5).sub(w.y.div(field.y)));
 const paint=varying(texture(C.paint.value,uv).rgb,'turfPigment');
 const color=paint.mul(mix(.7,1.08,height)).mul(float(.88).add(r.mul(.24))).mul(varying(contactShade.max(.5),'turfContactShade'));
 const material=new fi({side:MB,roughness:.98,metalness:0,envMapIntensity:.3});
 material.name='Painted wind turf / WebGPU';material.positionNode=p;material.colorNode=color;material.normalNode=normalViewGeometry;material.emissiveNode=color.mul(.06);return material;
}
