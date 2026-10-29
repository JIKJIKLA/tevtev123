// TSL material installed into the pinned engine closure by patch-grass.cjs.
// h is that bundle's existing three/tsl namespace; no second engine is loaded.
function b_(C){
 const {uniform,attribute,cameraPosition:camera,vec2,vec3,vec4,float,sin,mod,smoothstep,step,abs,normalize,mix,texture,varying,transformNormalToView,Fn,If}=h;
 const time=uniform(0),wind=uniform(1);C.t=time;C.wind=wind;
 const position=attribute('position','vec3'),off=attribute('off','vec3'),turn=attribute('turfTurn','vec2'),normal=attribute('normal','vec3'),r=off.z,height=position.y;
 const profile=uniform(C.turfProfile.value),shape=uniform(C.turfShape.value),field=uniform(C.fieldSize.value),tileSize=shape.x,halfTile=tileSize.mul(.5);
 const w=mod(off.xy.sub(camera.xz).add(halfTile),tileSize).add(camera.xz).sub(halfTile).toVar('turfRoot');
 const fade=float(1).sub(smoothstep(profile.z,profile.w,camera.xz.sub(w).length())).mul(step(abs(w.x),field.x.mul(.5).sub(4.16))).mul(step(abs(w.y),field.y.mul(.5).sub(4.4))).toVar('turfFade');
 const length=mix(profile.x,profile.y,r).mul(fade),heightSquared=height.mul(height),centers=[],motions=[];
 for(let k=0;k<7;k++){centers.push(uniform(C['c'+k].value));motions.push(uniform(C['motion'+k].value));}
 const data=Fn(()=>{
  const p=vec3(w.x,shape.y,w.y).toVar(),contactShade=float(1).toVar();
  // Preserve all density and the same fade. Fully collapsed triangles cannot
  // produce a fragment, so only their inexpensive root position is needed.
  If(fade.greaterThan(0),()=>{
   p.assign(vec3(w.x.add(position.x.mul(turn.x).sub(position.z.mul(turn.y)).mul(fade)),height.mul(length).add(shape.y),w.y.add(position.x.mul(turn.y).add(position.z.mul(turn.x)).mul(fade))));
   const groom=sin(w.y.mul(.23)).mul(shape.z).mul(heightSquared).mul(fade);
   const wave=sin(time.mul(1.18).add(w.x.mul(.48)).add(w.y.mul(.27))).mul(.5).add(sin(time.mul(2.4).add(w.y.mul(.65)).add(r.mul(7))).mul(.16)).add(sin(time.mul(4.8).add(w.x.mul(2.2)).add(r.mul(5))).mul(.05)).mul(heightSquared).mul(length).mul(shape.w).mul(wind);
   p.addAssign(vec3(wave,0,groom.add(wave.mul(.42))));
   const compression=float(1).toVar();
   for(let k=0;k<7;k++){
    const q=w.sub(centers[k].xz).toVar(),motion=motions[k];
    // All pressure, shade and wake support lies inside this conservative 5 m
    // radius, including sub-millimetre velocities using the .001 divisor floor.
    If(motion.w.greaterThan(0).and(q.dot(q).lessThan(25)),()=>{
     const distanceToBody=q.length().toVar(),press=float(1).sub(smoothstep(.2,1.15,distanceToBody)).mul(motion.w).toVar(),dir=motion.xy,along=q.dot(dir).toVar(),side=q.sub(dir.mul(along)).length();
     const core=float(1).sub(smoothstep(.12,k===6?1.05:.72,distanceToBody)).mul(motion.w);
     contactShade.mulAssign(float(1).sub(core.mul(.28)));
     const wake=float(1).sub(smoothstep(.35,1.1,side)).mul(smoothstep(-3.8,-.5,along)).mul(float(1).sub(smoothstep(-.2,.5,along))).mul(motion.z).mul(motion.w).toVar();
     const radial=q.add(.0001),bend=radial.div(radial.length().max(.0001)).mul(press).mul(.045).add(dir.mul(wake).mul(.065)).mul(heightSquared).mul(fade);
     p.addAssign(vec3(bend.x,0,bend.y));compression.mulAssign(float(1).sub(press.mul(.56).add(wake.mul(.24)).min(.75)));
    });
   }
   p.y.assign(shape.y.add(height.mul(length).mul(compression.max(.18))));
  });
  return vec4(p,contactShade);
 })().toVar('turfDeformation');
 const color=Fn(()=>{
  const pigment=vec3(0).toVar();
  If(fade.greaterThan(0),()=>{
   const uv=vec2(w.x.div(field.x).add(.5),float(.5).sub(w.y.div(field.y))),variation=sin(w.x.mul(.61).add(w.y.mul(.33))).mul(sin(w.y.mul(.77).sub(w.x.mul(.2)))).mul(.065);
   const fiber=mix(.60,1.14,height).mul(float(.86).add(r.mul(.26)).add(variation)).mul(data.w.max(.64));
   pigment.assign(texture(C.paint.value,uv).rgb.mul(fiber));
  });
  return pigment;
 })();
 const pigment=varying(color,'turfPigment'),rotatedNormal=vec3(normal.x.mul(turn.x).sub(normal.z.mul(turn.y)),normal.y,normal.x.mul(turn.y).add(normal.z.mul(turn.x)));
 const material=new fi({side:MB,roughness:.97,metalness:0,envMapIntensity:.18});
 material.name='Groomed championship turf / WebGPU';material.positionNode=data.xyz;material.colorNode=pigment;material.normalNode=normalize(varying(transformNormalToView(rotatedNormal),'turfNormalView'));material.emissiveNode=pigment.mul(.035);return material;
}