(function bootTevinGame(){
try {


/* Tevin League 9.2 — Aftershock. See docs/ACCURACY.md for measured references and limitations. Original engine/assets preserved in legacy-8.2.html. */
window.tevinBoot.stage='game script';

const ENGINE=TevinEngine;
// INLINE:renderer.js

const SIM_DT=1/60; // outer simulation tick; preserve DT=1/120 solver calibration

const FORCE_GL=new URLSearchParams(location.search).get('renderer')==='webgl';

const V3=THREE.Vector3,Qn=THREE.Quaternion,$=id=>document.getElementById(id);

const HX=40.96,HZ=51.2,HH=20.48,R=4,GX=8.92755,GH=6.42775,GD=8.8,G=6.5,DT=1/120,BR=.9125;

const cl=(v,a,b)=>Math.max(a,Math.min(b,v)),IN=new V3(HX-R,HH/2-R,HZ-R),SN=new V3(),Y3=new V3(0,1,0);let SS=0;

const cfg={lvl:1,len:300,hi:0,models:1,body:0,mode:0,size:1,speed:1,gravity:1,unlimited:false,teamColors:true,color:0,allies:0,enemies:1};

try{const pref=JSON.parse(localStorage.getItem('tevin.presentation.v6')||'null');if(pref){cfg.hi=0;cfg.models=1;cfg.body=cl(Math.round(Number(pref.body)||0),0,2);cfg.color=cl(Math.round(Number(pref.color)||0),0,7);cfg.teamColors=pref.teamColors!==false}}catch(_){}

try{cfg.hi=localStorage.getItem("tevin.graphics.v9")==="detail"?1:0}catch(_){}
const settingButtons=[];

[['lvl','Bot',['Rookie','Pro','All-Star']],['len','Match',['2 min','3 min','5 min']],].forEach(([k,l,o])=>{

 const r=document.createElement('div');r.className='row';r.innerHTML=`<label>${l}</label>`;const val=i=>k=='len'?[120,180,300][i]:i;

 if(k=='len')cfg.len=300;o.forEach((t,i)=>{const b=document.createElement('button');b.className='seg'+((k=='len'?i==2:cfg[k]==i)?' on':'');b.textContent=t;

  b.setAttribute('aria-pressed',String(b.classList.contains('on')));settingButtons.push({button:b,key:k,value:val(i)});

  b.onclick=()=>{cfg[k]=val(i);r.querySelectorAll('.seg').forEach((x,j)=>{x.classList.toggle('on',j==i);x.setAttribute('aria-pressed',String(j==i))});updateBotBrief();updateMatchSummary()};r.appendChild(b)});$('rows').appendChild(r)});

function updateBotBrief(){$('botbrief').textContent=['ROOKIE · Learn the pitch at a gentler pace.','PRO · Committed challenges, rotations and aerial attempts.','ALL-STAR · Faster reads, longer prediction and higher aerials.'][cfg.lvl]}

updateBotBrief();



// ---------- arena signed-distance: rounded box + goal pockets ----------

function surf(p){

 // inside-distance to the arena boundary (positive = inside). The playable space is the UNION of the rounded

 // box and two goal pockets, so posts, crossbar and goal walls collide correctly for cars and ball alike.

 const ax_=Math.abs(p.x),az=Math.abs(p.z),sx=Math.sign(p.x)||1,sz=Math.sign(p.z)||1,sy=Math.sign(p.y-HH/2)||1;

 const qx=ax_-IN.x,qy=Math.abs(p.y-HH/2)-IN.y,qz=az-IN.z,mx=Math.max(qx,0),my=Math.max(qy,0),mz=Math.max(qz,0),l=Math.hypot(mx,my,mz);

 let s,nx,ny,nz;

 if(l>0){s=R-l;nx=-sx*mx/l;ny=-sy*my/l;nz=-sz*mz/l}

 else{const m=Math.max(qx,qy,qz);s=R-m;nx=m==qx?-sx:0;ny=m==qy&&m!=qx?-sy:0;nz=m==qz&&m!=qx&&m!=qy?-sz:0}

 let pocket=GX-ax_,gi=0;if(p.y<pocket){pocket=p.y;gi=1}if(GH-p.y<pocket){pocket=GH-p.y;gi=2}

 if(HZ+GD-az<pocket){pocket=HZ+GD-az;gi=3}if(az-(HZ-R)<pocket){pocket=az-(HZ-R);gi=4}

 if(pocket>s){s=pocket;nx=gi==0?-sx:0;ny=gi==1?1:gi==2?-1:0;nz=gi==3?-sz:gi==4?sz:0}

 SS=s;SN.set(nx,ny,nz);

}

// INLINE:accuracy.js

// ---------- physics configuration (metres, seconds, kg-like units; forces in N, impulses in N·s) ----------

// Every handling value lives here. Accelerations are force / mass, angular accelerations are torque / inertia,

// so changing car.mass or the ball mass really changes acceleration, turning, hits and flips.

const PHYS={

 g:6.5,

  car:{mass:180,maxSpeed:23,wallE:.08,skin:.003,

  wheels:[[.58,-.42,.46],[.58,-.42,-.46],[-.58,-.42,.46],[-.58,-.42,-.46]],               // wheel contact points (car space)

  hitC:[0,.04,0],hitH:[1,.34,.48],                                                          // ball hitbox: centre offset, half extents

  chain:[-.6,0,.6],chainR:.52,carE:.45},                                                    // car-car collision spheres

  ground:{engineF:3060,engineVmax:14.1,engineKnee:14,engineFloor:.1,brakeF:6300,coastF:945,drag:0,                    // throttle force fades to 0 at engineVmax

  gripF:8000,slideGripF:1260,gripGrab:25,gripRelease:4.5,                                   // lateral tyre force; slide grip loses fast, recovers slowly

  yawT:1650,curvMin:.069,curvSpan:.621,slideYaw:1.35},                                        // steering torque, curvature(speed), powerslide yaw boost

  boost:{cap:100,rate:33.3,F:1908,softFrom:21},                                              // same force/cap for human and bot

 // RLBot measured jump timing, scaled to metres: 292 uu/s impulse, 1460 uu/s²

 // hold acceleration, three mandatory hold ticks, 1.25s dodge window after hold.

 // https://wiki.rlbot.org/v4/botmaking/jumping-physics/

 jump:{jump:525.6,holdF:2628,holdT:.2,lock:.12,double:525.6,window:1.25,flip:900,flipRate:2*Math.PI/.65,flipT:.65,flipCool:.3,minHold:.025,stickyF:585,stickyT:.025,cancelRate:12},

 air:{throttleF:120,reverseF:60,T:{roll:380,yaw:680,pitch:780},wmax:5.5,damp:1.2,damp0:5},                            // control torques, max spin, damping (active / released)

  surf:{align:20,tol:.10,retain:.035,rest:.015,spring:120,damping:21,adhesion:40,hullFric:.6,rightDelay:.45,rightRate:4,rightSpeed:3}, // retain is grounded-only wheel reach hysteresis, disabled by jump lock and sharp goal corners

 ball:{mass:30,e:.6,mu:.25,roll:.05,drag:.030562,max:60,maxSpin:6,sub:.35},                               // restitution, surface friction, rolling decay, air drag, speed cap, substep length

  hit:{e0:.35,e1:.82,vref:23,mu:.24,recoil:.72,carSpin:.3}                                    // speed-dependent bounce, tangential grip, recoil and spin

};

const CM=PHYS.car.mass,CI={x:CM*(.88*.88+.7*.7)/12,y:CM*(2.06*2.06+.88*.88)/12,z:CM*(2.06*2.06+.7*.7)/12};

const _p=new V3(),_n=new V3(),_up=new V3(),_ft=new V3(),_rt=new V3(),_a=new V3(),_b=new V3(),_c=new V3(),_d=new V3(),_e=new V3(),_f=new V3(),_g=new V3(),_h=new V3(),_q1=new Qn(),_q2=new Qn(),_iq=new Qn();

const Z={thr:0,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0};

const mkCar=t=>({team:t,id:t,enabled:true,color:t?0xff7a20:0x2a6bff,touches:0,goals:0,topSpeed:0,boostUsed:0,lastTouchAt:-100,p:new V3(),prevP:new V3(),renderP:new V3(),prevQ:new Qn(),frameP:new V3(),frameQ:new Qn(),sweepEnd:new V3(),moveQ:new Qn(),sweepQ:new Qn(),v:new V3(),q:new Qn(),w:new V3(),n:new V3(0,1,0),jdir:new V3(0,1,0),boost:33,inp:{...Z},jp:0,jh:0,jt:0,jl:0,jAge:0,jumped:0,jHoldTime:0,flipAxis:new V3(),canJ:0,canD:0,dT:0,dcd:0,aT:0,cT:0,wy:0,grip:PHYS.ground.gripF,wasG:0,ground:0,bs:0,bt:0,bst:0,ai:{target:new V3(),intercept:new V3(),mode:'ATTACK',time:0,commit:0,rotateSide:1,strikeCD:0,tune:{steerGain:2.6,boostAngle:.28,boostRange:7,dodgeDistance:5.4,setup:2.6,airGain:3.4,wallGain:1}}});

const cars=[mkCar(0),mkCar(1)],P1=cars[0],ball={p:new V3(),v:new V3(),w:new V3(),last:-1,hit:0,hitT:0,prevP:new V3(),frameP:new V3()},PADS=[];

STANDARD_PADS.forEach(([x,z,big])=>PADS.push({x,z,big,t:0}));

function resetCar(c,x,z){c.p.set(x,bodyPhysics(c).height+.015,z);c.v.set(0,0,0);c.w.set(0,0,0);c.n.set(0,1,0);c.boost=33;c.jp=c.jh=c.jt=c.jl=c.jAge=c.jumped=c.jHoldTime=0;c.canJ=1;c.canD=1;c.dT=c.dcd=c.aT=c.cT=c.wy=0;c.grip=PHYS.ground.gripF;c.wasG=1;c.ground=1;c.bs=c.bt=c.bst=c.sk=c.un=0;Object.assign(c.inp,Z);c.q.setFromAxisAngle(Y3,Math.hypot(x,z)>1e-6?Math.atan2(z,-x):0);c.prevP.copy(c.p);c.renderP.copy(c.p);c.prevQ.copy(c.q);c.frameP.copy(c.p);c.frameQ.copy(c.q);c.planT=c.righting=0;c.ai.mode='KICKOFF';c.ai.time=c.ai.commit=c.ai.strikeCD=c.ai.pressure=0;c.ai.rotateSide=x>0?1:-1;c.ai.target.copy(c.p);c.ai.intercept.set(0,BR,0);c.tgt=c.ai.target}

const axStep=(w,u,acc,dt)=>{const A=PHYS.air;if(u)w+=u*acc*dt*(w*u<0?2.2:1);w*=Math.exp(-(u?A.damp:A.damp0)*dt);return cl(w,-A.wmax,A.wmax)};

// Self-righting: after resting on its side, roof or tail, the car tips its wheels back toward the surface.

// Shortest-arc tilt handles sides and nose-up/down; a roof (180°) rolls about the car's own nose axis instead.

function rightCar(c,n,rate,dt){

 _c.set(0,1,0).applyQuaternion(c.q);const k=1-Math.exp(-rate*dt);

 if(_c.dot(n)>-.6){_q1.setFromUnitVectors(_c,n);_q2.identity().slerp(_q1,k);c.q.premultiply(_q2);return}

 _a.set(1,0,0).applyQuaternion(c.q);_b.copy(n).addScaledVector(_a,-n.dot(_a));if(_b.length()<.2)return;_b.normalize();

 const ang=Math.atan2(_a.dot(_d.crossVectors(_c,_b)),_c.dot(_b));

 c.q.premultiply(_q1.setFromAxisAngle(_a,ang*k));

}

// Full chassis boundary (corners, edge midpoints, face centres) encloses the ball OBB.

// Wheels are solid tips below that hull. Detection never changes the pose; projection is separate.

const supportN=new V3(),hullN=new V3();

function carPenetration(c){const {probes:CAR_PROBES,hull:CAR_HULL}=bodyPhysics(c);let deepest=0;for(let k=0;k<CAR_PROBES.length;k++){_p.copy(CAR_PROBES[k]).applyQuaternion(c.q).add(c.p);surf(_p);deepest=Math.max(deepest,(k<CAR_HULL.length?PHYS.car.skin:0)-SS)}return deepest}

function resolveArenaCar(c){
 const {probes:CAR_PROBES,hull:CAR_HULL}=bodyPhysics(c);

 // Resolve only the deepest constraint, then resample the complete hull. The old

 // in-place probe sweep repeatedly clipped velocity against outdated ramp normals.

 for(let pass=0;pass<16;pass++){let deepest=0;for(let k=0;k<CAR_PROBES.length;k++){

  _p.copy(CAR_PROBES[k]).applyQuaternion(c.q).add(c.p);surf(_p);const pen=(k<CAR_HULL.length?PHYS.car.skin:0)-SS;

  if(pen>deepest){deepest=pen;_n.copy(SN)}

 }if(deepest<.0005)break;c.p.addScaledVector(_n,deepest+.0002);const vn=c.v.dot(_n);if(vn<0){c.v.addScaledVector(_n,-vn);if(vn<-5&&pass===0)impactSound('wall',-vn,c.p)}}

}

function sampleCarSupport(c){
 const {hull:CAR_HULL,wheels}=bodyPhysics(c);

 supportN.set(0,0,0);hullN.set(0,0,0);_up.set(0,1,0).applyQuaternion(c.q);let count=0,weight=0,gap=0,hull=0;const smoothSurface=Math.abs(c.p.z)<HZ-R-1||Math.abs(c.p.x)>GX+2,reach=PHYS.surf.tol+(c.wasG&&!c.jl&&smoothSurface?PHYS.surf.retain:0);

 for(const p of wheels){_p.set(p[0],p[1],p[2]).applyQuaternion(c.q).add(c.p);surf(_p);

  if(SS<reach&&SN.dot(_up)>.1){const w=Math.max(.05,1-SS/reach);supportN.addScaledVector(SN,w);gap+=Math.max(0,SS)*w;weight+=w;count++}}

 for(const p of CAR_HULL){_p.copy(p).applyQuaternion(c.q).add(c.p);surf(_p);if(SS<.035){hullN.add(SN);hull++}}

 if(count&&supportN.lengthSq()>.001)supportN.normalize();else supportN.copy(c.n);

 if(hull&&hullN.lengthSq()>.001)hullN.normalize();else hullN.copy(supportN);

 c.wheelsOn=count;c.clearance=weight?gap/weight:PHYS.surf.tol;c.hullContact=hull;

}

function stepCar(c,dt){

 if(!c.enabled)return;if(cfg.unlimited)c.boost=100;

 const i=c.inp,q=c.q,P=PHYS,Gd=P.ground,B=P.boost,J=P.jump,A=P.air,CI=bodyPhysics(c).inertia;

 c.prevP.copy(c.p);c.renderP.copy(c.p);c.prevQ.copy(q);c.jAge+=dt;

 c.jl=Math.max(0,c.jl-dt);c.dcd=Math.max(0,c.dcd-dt);resolveArenaCar(c);sampleCarSupport(c);

 const contact=c.wheelsOn>0||c.hullContact;let ground=c.wheelsOn>0&&_up.dot(supportN)>.4&&!c.jl;

 c.cT=contact?c.cT+dt:0;

 if(ground){

  // Parallel transport the wheel frame and tangent momentum around a curved surface.

  // This is the normal constraint force; lagging visual alignment must not drive the nose into it.

  if(c.wasG&&c.n.dot(supportN)>.35){_q1.setFromUnitVectors(c.n,supportN);q.premultiply(_q1);c.v.applyQuaternion(_q1)}

  c.n.copy(supportN);c.righting=0;c.canD=1;c.jumped=0;c.jHoldTime=0;c.aT=0;c.dT=0;

 }else{if(contact)c.n.copy(hullN);c.aT+=dt}

 c.v.y-=P.g*dt;

 const jumpOK=ground;c.canJ=jumpOK?1:0;

 if(!ground&&contact&&!c.jl){

  // Only a small tangential scrape on the roof/sides; never erase uphill velocity on a wheel miss.

  if(c.hullContact&&!c.wheelsOn){const vn=c.v.dot(c.n);c.v.addScaledVector(c.n,-vn).multiplyScalar(Math.exp(-P.surf.hullFric*dt)).addScaledVector(c.n,vn)}

  if((c.jp||c.righting)&&c.cT>P.surf.rightDelay&&c.v.length()<P.surf.rightSpeed){c.righting=1;rightCar(c,c.n,P.surf.rightRate,dt)}

 }

 if(c.jp){c.jp=0;

  if(jumpOK){audioWorld('jump',8,c.p,c.id);_f.copy(ground?c.n:hullN);c.v.addScaledVector(_f,J.jump/CM);c.jdir.copy(_f);c.jt=J.holdT;c.jAge=0;c.jHoldTime=0;c.jumped=1;c.jl=J.lock;c.canJ=0;c.canD=1;c.aT=0;ground=false;c.w.set(0,0,0);c.wy=0}

  else if(c.canD&&(!c.jumped||c.aT<J.window+c.jHoldTime)&&c.dT<=0&&c.dcd<=0){const pI=i.pitch,lI=i.yaw,m=Math.hypot(pI,lI);

   audioWorld(m>.2?'dodge':'jump',8,c.p,c.id);if(m>.2){_a.set(1,0,0).applyQuaternion(q);_a.y=0;if(_a.lengthSq()<.01){_b.set(0,0,1).applyQuaternion(q);_a.set(_b.z,0,-_b.x)}_a.normalize();_b.set(-_a.z,0,_a.x);

    c.v.addScaledVector(_a,pI/m*J.flip/CM).addScaledVector(_b,lI/m*J.flip/CM);c.flipAxis.set(lI/m,0,-pI/m);c.w.copy(c.flipAxis).multiplyScalar(J.flipRate);c.v.y=Math.max(c.v.y,0);c.jt=0;c.dT=J.flipT;c.dcd=J.flipCool

   }else c.v.addScaledVector(_up,J.double/CM);c.canD=0;c.jt=0

  }

 }

 // Holding jump follows the car's roof as it tilts. Release ends the bonus;

 // pressing again consumes the second jump, never restarts the first hold.

 _up.set(0,1,0).applyQuaternion(q);

 if(c.jt>0&&(c.jh||c.jAge<J.minHold)){const held=Math.min(dt,c.jt);c.v.addScaledVector(_up,J.holdF/CM*held);c.jHoldTime+=held;c.jt=Math.max(0,c.jt-dt)}else c.jt=0;

 if(c.jAge<J.stickyT&&c.jumped)c.v.addScaledVector(c.jdir,-J.stickyF/CM*dt);

 if(c.jumped&&c.aT>=J.window+c.jHoldTime)c.canD=0;

 const bo=i.boost&&c.boost>0;if(bo)c.boost=Math.max(0,c.boost-B.rate*dt);c.bst=bo?1:0;

 if(ground){

  const n=c.n;_up.set(0,1,0).applyQuaternion(q);_q1.setFromUnitVectors(_up,n);_q2.identity().slerp(_q1,1-Math.exp(-P.surf.align*dt));q.premultiply(_q2);

  _ft.set(1,0,0).applyQuaternion(q).addScaledVector(n,-_ft.dot(n)).normalize();_rt.crossVectors(_ft,n);

  let vf=c.v.dot(_ft),vl=c.v.dot(_rt),vn=c.v.dot(n);const th=bo?1:i.thr,sp=Math.abs(vf);let a;

  if(Math.abs(th)>=.01){
   if(th*vf<0){const stopTime=sp/(Gd.brakeF/CM);a=stopTime>=dt?Math.sign(th)*Gd.brakeF/CM:(-vf+th*throttleAcceleration(0)*(dt-stopTime))/dt;}
   else a=th*throttleAcceleration(sp);
  }

  else a=-Math.sign(vf)*Math.min(sp/dt,Gd.coastF/CM);

  if(bo)a+=9.91667*cfg.speed;vf+=a*dt;

  const tg=i.ps?Gd.slideGripF:Gd.gripF*(1+.2*(1-Math.abs(n.y)));c.grip+=(tg-c.grip)*(1-Math.exp(-(tg<c.grip?Gd.gripGrab:Gd.gripRelease)*dt));vl-=cl(vl,-c.grip/CM*dt,c.grip/CM*dt);

  const curv=steeringCurvature(sp),wt=i.steer*sp*curv*(vf<-.5?-1:1)*(i.ps?Gd.slideYaw:1),al=Gd.yawT/CI.y;

  c.wy+=cl(wt-c.wy,-al*dt,al*dt);q.premultiply(_q1.setFromAxisAngle(n,-c.wy*dt));

  // Distinct reach/rest values allow mild adhesion without a spring pushing the car off a wall.

  const spring=cl((P.surf.rest-c.clearance)*P.surf.spring-vn*P.surf.damping,-P.surf.adhesion,24);

  vn+=(spring+P.g*n.y)*dt;c.v.copy(_ft).multiplyScalar(vf).addScaledVector(_rt,vl).addScaledVector(n,vn);c.w.set(0,0,0);

 }else{

  c.wy=0;_ft.set(1,0,0).applyQuaternion(q);c.v.addScaledVector(_ft,((bo?B.F+A.throttleF:0)+(bo?0:i.thr>0?i.thr*A.throttleF:i.thr*A.reverseF))/CM*dt);

  let flipping=false;if(c.dT>0){const active=Math.min(dt,c.dT);c.dT=Math.max(0,c.dT-dt);

   // Opposite pitch input brakes the pitch component of a dodge; side-roll

   // momentum remains. No second linear impulse is added by flip cancelling.

   if(i.pitch*c.flipAxis.z>.1)c.w.z-=cl(c.w.z,-J.flipRate*J.cancelRate*dt,J.flipRate*J.cancelRate*dt);

   const spin=c.w.length();if(spin>1e-5){_a.copy(c.w).divideScalar(spin);q.multiply(_q1.setFromAxisAngle(_a,spin*active))}flipping=true;if(!c.dT)c.w.multiplyScalar(.20)}

  else{const ws=c.w;ws.x=airRotation(ws.x,i.roll,38.34,4.76,dt,true);ws.y=airRotation(ws.y,-i.yaw,9.11,1.90,dt);ws.z=airRotation(ws.z,-i.pitch,12.46,2.86,dt);if(ws.lengthSq()>A.wmax*A.wmax)ws.setLength(A.wmax)}

  const m=c.w.length();if(m>1e-4&&!flipping){_a.copy(c.w).divideScalar(m);q.multiply(_q1.setFromAxisAngle(_a,m*dt))}c.v.multiplyScalar(Math.exp(-Gd.drag*c.v.length()*dt*.5));

 }

 const speed=c.v.length();if(speed>P.car.maxSpeed)c.v.multiplyScalar(P.car.maxSpeed/speed);q.normalize();c.moveQ.copy(q);

 // Sweep rotation as well as translation; fit the entire hull at every intermediate pose.

 const angle=2*Math.acos(cl(Math.abs(c.prevQ.dot(q)),-1,1)),slices=Math.min(8,Math.max(1,Math.ceil((c.v.length()*dt+angle*1.3)/.12)));

 for(let k=1;k<=slices;k++){q.copy(c.prevQ).slerp(c.moveQ,k/slices);c.p.addScaledVector(c.v,dt/slices);resolveArenaCar(c)}

 c.ground=ground?1:0;c.wasG=ground;

}

// --- car vs ball: oriented hitbox, contact-point velocity (incl. car spin), mass- and inertia-aware impulse, friction -> ball spin ---

function carBall(c){

 if(!c.enabled)return;

 const b=ball,P=PHYS,hc=bodyPhysics(c).center,hh=bodyPhysics(c).half,H=P.hit,Mb=P.ball.mass,CI=bodyPhysics(c).inertia;

 _iq.copy(c.q).invert();_a.copy(b.p).sub(c.p).applyQuaternion(_iq);_a.x-=hc[0];_a.y-=hc[1];_a.z-=hc[2];

 const lx=_a.x,ly=_a.y,lz=_a.z;

 _b.set(cl(lx,-hh[0],hh[0]),cl(ly,-hh[1],hh[1]),cl(lz,-hh[2],hh[2]));_d.copy(_a).sub(_b);const dist=_d.length();let pen;

 if(dist>1e-5){if(dist>=BR)return;_d.divideScalar(dist);pen=BR-dist}

 else{const px=hh[0]-Math.abs(lx),py=hh[1]-Math.abs(ly),pz=hh[2]-Math.abs(lz);

  if(px<=py&&px<=pz){_d.set(Math.sign(lx)||1,0,0);_b.x=_d.x*hh[0];pen=px+BR}

  else if(py<=pz){_d.set(0,Math.sign(ly)||1,0);_b.y=_d.y*hh[1];pen=py+BR}

  else{_d.set(0,0,Math.sign(lz)||1);_b.z=_d.z*hh[2];pen=pz+BR}}

 _e.copy(_b);_e.x+=hc[0];_e.y+=hc[1];_e.z+=hc[2];_e.applyQuaternion(c.q);      // r: car centre -> contact point

 _d.applyQuaternion(c.q);                                                      // n: car -> ball

 b.p.addScaledVector(_d,pen);

  if(c.ground)_f.copy(c.n).multiplyScalar(-c.wy);else _f.copy(c.w).applyQuaternion(c.q);

  _c.crossVectors(_f,_e).add(c.v);                                   // car velocity at contact = v + w x r

 _a.copy(b.v).sub(_c);const vn=_a.dot(_d);if(vn>=0)return;

 const saveThreat=audioGoalThreat(c);
 const cls=-vn,Ib=.4*Mb*BR*BR,e=H.e0+(H.e1-H.e0)*cl(cls/H.vref,0,1);

 _g.crossVectors(_e,_d).applyQuaternion(_iq);

 const den=1/Mb+H.recoil/CM+H.carSpin*(_g.x*_g.x/CI.x+_g.y*_g.y/CI.y+_g.z*_g.z/CI.z),j=(1+e)*cls/den;

 b.v.addScaledVector(_d,j/Mb);c.v.addScaledVector(_d,-j/CM*H.recoil);

 _g.set(-j*H.carSpin*_g.x/CI.x,-j*H.carSpin*_g.y/CI.y,-j*H.carSpin*_g.z/CI.z);if(!c.ground)c.w.add(_g);

  _h.copy(_d).multiplyScalar(-BR);

  if(c.ground)_f.copy(c.n).multiplyScalar(-c.wy);else _f.copy(c.w).applyQuaternion(c.q);

  _c.crossVectors(_f,_e).add(c.v);_g.crossVectors(b.w,_h);_a.copy(b.v).add(_g).sub(_c);_a.addScaledVector(_d,-_a.dot(_d));

 const tl=_a.length();

  if(tl>1e-4){_a.divideScalar(tl);_g.crossVectors(_e,_a).applyQuaternion(_iq);

   const inv=1/Mb+H.recoil/CM+BR*BR/Ib+H.carSpin*(_g.x*_g.x/CI.x+_g.y*_g.y/CI.y+_g.z*_g.z/CI.z);

   const jt=Math.min(H.mu*j,tl/inv);

  b.v.addScaledVector(_a,-jt/Mb);c.v.addScaledVector(_a,jt/CM*H.recoil);_g.crossVectors(_h,_a).multiplyScalar(-jt/Ib);b.w.add(_g)}

  audioSave(c,saveThreat);heatTouch(c);b.lastPlayer=c.id;b.color=c.color;if(simTime-c.lastTouchAt>.18){c.touches++;c.lastTouchAt=simTime}b.last=c.team;b.hit=cls;b.hitT=.5;c.ai.commit=Math.min(c.ai.commit,.15);learnHit(c,cls);

  if(c===localPlayer()&&st==='PLAY'&&cls>1.5&&simTime-matchStats.lastTouch>.18){matchStats.touches++;matchStats.lastTouch=simTime}

  hitFx(cls,b.p.x-_d.x*BR,b.p.y-_d.y*BR,b.p.z-_d.z*BR);

}

function ballSub(dt){

 const b=ball,B=PHYS.ball;heat.cooldown=Math.max(0,heat.cooldown-dt);if(cfg.mode===1)heatSteer(b.p,b.v,dt,heat.target,heat.speed);

 b.v.y-=PHYS.g*dt;b.v.multiplyScalar(Math.exp(-B.drag*dt));b.p.addScaledVector(b.v,dt);

 for(const c of cars)carBall(c);

 surf(b.p);const pen=BR-SS;

 if(pen>0){_n.copy(SN);if(_n.y>.99&&b.p.y<BR+.03)finishRegulation();b.p.addScaledVector(_n,pen);const vn=b.v.dot(_n);

   if(vn<0){if(cfg.mode===1&&heat.target&&Math.abs(_n.z)>.6&&Math.abs(b.p.z)>HZ-R&&heat.cooldown<=0){heat.target=-Math.sign(b.p.z);heat.speed=Math.min(42,heat.speed+2);heat.cooldown=.2;}const cls=-vn,e=B.e*cl((cls-.4)/1.6,0,1);b.v.addScaledVector(_n,(1+e)*cls);if(cls>3)impactSound('ball',cls,b.p);

   _h.copy(_n).multiplyScalar(-BR);_g.crossVectors(b.w,_h).add(b.v);_g.addScaledVector(_n,-_g.dot(_n));const ul=_g.length();

   if(ul>1e-6){_g.divideScalar(ul);const jt=Math.min(ul/3.5,B.mu*(1+e)*cls);b.v.addScaledVector(_g,-jt);_c.crossVectors(_h,_g).multiplyScalar(-jt/(.4*BR*BR));b.w.add(_c)}}

  b.v.multiplyScalar(1-B.roll*dt);b.w.multiplyScalar(1-B.roll*dt)}

 const s=b.v.length();if(s>B.max)b.v.multiplyScalar(B.max/s);if(b.w.lengthSq()>B.maxSpin*B.maxSpin)b.w.setLength(B.maxSpin);

}

function stepBall(dt){

 const b=ball; b.prevP.copy(b.p);

 // Sample the moving car hitbox too: a fast car can strike a resting ball between ticks.

  let speed=b.v.length();for(const c of cars){c.sweepEnd.copy(c.p);c.sweepQ.copy(c.q);speed=Math.max(speed,b.v.distanceTo(c.v)+c.w.length()*1.2)}

 const n=Math.min(8,Math.max(1,Math.ceil(speed*dt/PHYS.ball.sub)));b.hitT=Math.max(0,b.hitT-dt);

 for(let k=0;k<n;k++){

   for(const c of cars){c.p.lerpVectors(c.prevP,c.sweepEnd,(k+1)/n);c.q.copy(c.prevQ).slerp(c.sweepQ,(k+1)/n)}

  ballSub(dt/n);

  // Whole-ball crossing, checked each substep; no premature goals near the posts.

  if(st=='PLAY'&&Math.abs(b.p.x)<=GX-BR&&b.p.y>=BR-.001&&b.p.y<=GH-BR&&Math.abs(b.p.z)>=HZ+BR)goal(b.p.z>0?0:1);

 }

  for(const c of cars){c.p.copy(c.sweepEnd);c.q.copy(c.sweepQ);resolveArenaCar(c)}

}

function carCar(){for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++)if(cars[i].enabled&&cars[j].enabled)carPair(cars[i],cars[j])}

function carPair(a,b){

 const P=PHYS.car,ap=bodyPhysics(a),bp=bodyPhysics(b),R2=ap.half[2]+bp.half[2];

 for(const f of [-1,0,1]){const xa=ap.center[0]+f*Math.max(0,ap.half[0]-ap.half[2]);_a.set(xa,ap.center[1],0).applyQuaternion(a.q).add(a.p);

  for(const f of [-1,0,1]){const xb=bp.center[0]+f*Math.max(0,bp.half[0]-bp.half[2]);_b.set(xb,bp.center[1],0).applyQuaternion(b.q).add(b.p);_c.copy(_b).sub(_a);const d=_c.length();

   if(d<R2){if(d>1e-4)_c.divideScalar(d);else _c.set(1,0,0);const o=(R2-d)/2;a.p.addScaledVector(_c,-o);b.p.addScaledVector(_c,o);

    const rv=_d.copy(b.v).sub(a.v).dot(_c);if(rv<0){const j=-(1+P.carE)*rv/(2/CM);a.v.addScaledVector(_c,-j/CM);b.v.addScaledVector(_c,j/CM);bumpFx(-rv)}}}}

}

function padStep(dt){for(const p of PADS){

 p.t=Math.max(0,p.t-dt);if(p.t>0)continue;

 for(const c of cars){if(c.enabled&&c.boost<PHYS.boost.cap&&padContains(p,c)){

  c.boost=Math.min(PHYS.boost.cap,c.boost+(p.big?100:12));p.t=p.big?10:4;audioWorld('pickup',8,c.p,c.id);break;

 }}

}}



// ---------- bot ----------

// Predict from observed state only. This planner has no access to player inputs or future state.

const BOT_PATH=Array.from({length:41},()=>new V3()),BOT_VEL=Array.from({length:41},()=>new V3()),predP=new V3(),predV=new V3(),botF=new V3(),botR=new V3(),botD=new V3(),botU=new V3(),botLocal=new V3(),shotDir=new V3();

const predW=new V3(),predNormal=new V3(),predArm=new V3(),predSlip=new V3(),predCross=new V3();

const ballForecast={arc:BOT_PATH,velocity:BOT_VEL,landing:new V3(),landingTime:0,hasLanding:false,duration:2};

let predHeatTarget=0,predHeatSpeed=18,predHeatCooldown=0;

window.tevinBoot.stage='bot setup';

const policyEncoders=[new ENGINE.PolicyEncoder(),new ENGINE.PolicyEncoder()];

function projectBallStep(dt){

 const p=predP,v=predV,w=predW,B=PHYS.ball;

 if(cfg.mode===1){heatSteer(p,v,dt,predHeatTarget,predHeatSpeed);predHeatCooldown=Math.max(0,predHeatCooldown-dt)}

 v.y-=PHYS.g*dt;v.multiplyScalar(Math.exp(-B.drag*dt));p.addScaledVector(v,dt);surf(p);

 if(SS<BR){predNormal.copy(SN);p.addScaledVector(predNormal,BR-SS);const vn=v.dot(predNormal);

  if(vn<0){if(cfg.mode===1&&predHeatTarget&&Math.abs(predNormal.z)>.6&&Math.abs(p.z)>HZ-R&&predHeatCooldown<=0){predHeatTarget=-Math.sign(p.z);predHeatSpeed=Math.min(42,predHeatSpeed+2);predHeatCooldown=.2}const cls=-vn,e=B.e*cl((cls-.4)/1.6,0,1);v.addScaledVector(predNormal,(1+e)*cls);

   predArm.copy(predNormal).multiplyScalar(-BR);predSlip.crossVectors(w,predArm).add(v);predSlip.addScaledVector(predNormal,-predSlip.dot(predNormal));const ul=predSlip.length();

   if(ul>1e-6){predSlip.divideScalar(ul);const jt=Math.min(ul/3.5,B.mu*(1+e)*cls);v.addScaledVector(predSlip,-jt);predCross.crossVectors(predArm,predSlip).multiplyScalar(-jt/(.4*BR*BR));w.add(predCross)}

  }

  v.multiplyScalar(1-B.roll*dt);w.multiplyScalar(1-B.roll*dt);

  if(!ballForecast.hasLanding&&predNormal.y>.7){ballForecast.hasLanding=true;ballForecast.landing.copy(p)}

 }

 const speed=v.length();if(speed>B.max)v.multiplyScalar(B.max/speed);if(w.lengthSq()>B.maxSpin*B.maxSpin)w.setLength(B.maxSpin);

}

function predictBall(seconds=2){

 predHeatTarget=heat.target;predHeatSpeed=heat.speed;predHeatCooldown=heat.cooldown;

 const p=predP.copy(ball.p),v=predV.copy(ball.v);predW.copy(ball.w);BOT_PATH[0].copy(p);BOT_VEL[0].copy(v);

 const sampleDt=cl(seconds,.05,6)/40;let elapsed=0;

 ballForecast.duration=sampleDt*40;ballForecast.hasLanding=false;ballForecast.landingTime=-1;

 for(let k=1;k<BOT_PATH.length;k++){

  const slices=Math.max(1,Math.ceil(sampleDt/DT));

  for(let j=0;j<slices;j++){

   const step=sampleDt/slices,n=Math.min(8,Math.max(1,Math.ceil(v.length()*step/PHYS.ball.sub)));

   for(let sub=0;sub<n;sub++){const landed=ballForecast.hasLanding;projectBallStep(step/n);elapsed+=step/n;if(!landed&&ballForecast.hasLanding)ballForecast.landingTime=elapsed}

  }

  BOT_PATH[k].copy(p);BOT_VEL[k].copy(v);

 }

 if(!ballForecast.hasLanding)ballForecast.landing.copy(p);

 return ballForecast;

}

// Planner blackboard and behavior nodes are built once. Existing thresholds and

// through-ball / around-ball steering targets remain the leaves of the tree.

const botContext={c:null,ai:null,p:null,kick:false,urgent:false,canChallenge:false,past:false,atk:1,setup:0,side:0,approach:0};

const offensiveTree=new ENGINE.Selector('Offensive Striking',[

 new ENGINE.Action('Kickoff',b=>{if(!b.kick)return false;b.ai.mode='KICKOFF';b.ai.commit=.4;b.ai.target.copy(b.p);return true}),

 new ENGINE.Action('Committed Strike',b=>{if(!(b.ai.commit>0||b.canChallenge&&!b.past))return false;b.ai.mode='COMMIT';b.ai.target.copy(b.p).addScaledVector(shotDir,.6);if(b.ai.commit<=0)b.ai.commit=.55;return true})

]);

const rotationTree=new ENGINE.Selector('Rotation / Recovery',[

 new ENGINE.Action('Rotate Behind Ball',b=>{

  if(!b.past)return false;const ai=b.ai,c=b.c;

  let sx=-ball.p.x*.85,sz=b.atk*(HZ+3)-ball.p.z;const sl=Math.hypot(sx,sz)||1;sx/=sl;sz/=sl;

  const lateral=(c.p.x-ball.p.x)*sz-(c.p.z-ball.p.z)*sx,along=(ball.p.x-c.p.x)*sx+(ball.p.z-c.p.z)*sz;

  if(ai.mode!=='ROTATE')ai.rotateSide=lateral>=0?1:-1;

  ai.mode='ROTATE';const back=Math.abs(lateral)<3.5?Math.max(0,-along):-b.setup;

  ai.target.set(ball.p.x+sx*back+sz*ai.rotateSide*5,ball.p.y,ball.p.z+sz*back-sx*ai.rotateSide*5);return true;

 }),

 new ENGINE.Action('Approach Shot Line',b=>{const ai=b.ai;ai.mode='APPROACH';ai.target.copy(b.p).addScaledVector(shotDir,-b.setup);if(b.side<1.2&&b.approach>.7&&ai.target.distanceToSquared(b.c.p)<6.25){ai.mode='COMMIT';ai.commit=.65;ai.target.copy(b.p).addScaledVector(shotDir,.6)}return true})

]);

const tacticalTree=new ENGINE.Selector('Ball Tactics',[

 new ENGINE.Action('Emergency Defense',b=>{if(!b.urgent||b.kick)return false;b.ai.mode='SAVE';b.ai.target.copy(b.p).addScaledVector(shotDir,.6);b.ai.commit=.25;return true}),

 offensiveTree,rotationTree

]);

const boostManagement=new ENGINE.Action('Boost Management',b=>{

 const c=b.c,ai=b.ai;

 if(!(b.lv>0&&c.boost<14&&!b.kick&&!b.stopped&&!b.urgent&&ai.mode!=='COMMIT'&&b.dist>22))return false;

 let value=Infinity,found=false;

 for(const pad of PADS){if(pad.t>0)continue;const d=Math.hypot(pad.x-c.p.x,pad.z-c.p.z),route=Math.hypot(pad.x-ai.target.x,pad.z-ai.target.z);

  if(d<10&&d+route<b.dist+4&&d<value){value=d;ai.target.set(pad.x,0,pad.z);ai.mode='BOOST';found=true}}

 return found;

});

const recoveryController=new ENGINE.Action('Surface Recovery',c=>{

 if(c.ground||c.dT>0||c.bs===3||c.bs===1)return false;

 const i=c.inp,tune=c.ai.tune;

 surf(c.p);botU.copy(SS<2.5?SN:Y3);_iq.copy(c.q).invert();botU.applyQuaternion(_iq);botLocal.copy(c.v).applyQuaternion(_iq);

 c.ai.mode='RECOVER';i.pitch=cl(botU.x*tune.airGain*.8+c.w.z*.2,-1,1);i.roll=cl(botU.z*tune.airGain*.8-c.w.x*.2,-1,1);i.yaw=cl(botLocal.z*.1+c.w.y*.12,-1,1);i.boost=0;return true;

});

// The boost decorator runs after tactical target clamping; recovery decorates the

// low-level controller after its jump/aerial sequence. Neither bypasses physics.

const botTree=tacticalTree;

// Replan at a difficulty-dependent cadence. Steering reads the cached target every fixed tick.

function planBot(c){

 predictBall();policyEncoders[c.team].encode(c,nearestOpponent(c),ball,HZ,kickoffAge<5&&ball.last<0);imitationTune(c);const ai=c.ai,tune=ai.tune,atk=c.team?-1:1,lv=cfg.lvl,limit=lv===0?18:lv===1?32:40;

 const speed=Math.hypot(c.v.x,c.v.z),stopped=ball.v.lengthSq()<1.5&&ball.p.y<1.8,kick=kickoffAge<5&&ball.last<0&&Math.hypot(ball.p.x,ball.p.z)<.5;

 let best=Infinity,bestK=0;botF.set(1,0,0).applyQuaternion(c.q).setY(0).normalize();

 for(let k=0;k<=limit;k++){const p=BOT_PATH[k],t=k*.05,dx=p.x-c.p.x,dz=p.z-c.p.z,dist=Math.hypot(dx,dz),facing=dist>.01?(dx*botF.x+dz*botF.z)/dist:1;

  const v0=Math.max(0,speed*facing),acc=12,max=lv?23:14,run=(max*max-v0*v0)/(2*acc);

  const eta=dist<run?(Math.sqrt(v0*v0+2*acc*dist)-v0)/acc:(max-v0)/acc+(dist-run)/max;

  const score=Math.max(0,eta+Math.acos(cl(facing,-1,1))*.16-t)*3+t*.25+Math.max(0,p.y-1.5)*(lv===0?2:lv===1?.12:.06);

  if(score<best){best=score;bestK=k}

 }

 ai.intercept.copy(BOT_PATH[bestK]);ai.time=bestK*.05;const p=ai.intercept,dist=Math.hypot(p.x-c.p.x,p.z-c.p.z),ownZ=-atk*(HZ-2);

 shotDir.set(-p.x*.85,0,atk*(HZ+3)-p.z).normalize();botD.copy(p).sub(c.p).setY(0);

 const approach=dist>.01?botD.dot(shotDir)/dist:1,past=approach<.2;

 const sideSigned=(c.p.x-p.x)*shotDir.z-(c.p.z-p.z)*shotDir.x,side=Math.abs(sideSigned),setup=tune.setup+Math.min(3,speed*.18);

 let urgent=false;for(let k=1;k<BOT_PATH.length;k++){const f=BOT_PATH[k];if(f.z*atk<-(HZ-2)&&Math.abs(f.x)<GX+1&&f.y<GH+1){urgent=true;break}}

 // A useful shot needs both the correct half-plane AND a small shot-line error.

 // Merely facing the ball from its side was producing repeated clears into the wall.

 const canChallenge=approach>.85&&side<cl(dist*.12,1,2)||dist<3&&approach>.25||stopped&&dist<10&&approach>.65&&side<1.5;

 // A distant diagonal kickoff must aim AT the ball. A long goal-axis follow-through

 // target shifts the line sideways enough to miss the sphere completely.

 const b=botContext;b.c=c;b.ai=ai;b.p=p;b.kick=kick;b.urgent=urgent;b.canChallenge=canChallenge;b.past=past;b.atk=atk;b.setup=setup;b.side=side;b.approach=approach;

 b.lv=lv;b.stopped=stopped;b.dist=dist;botTree.tick(b);

 // Only shadow a moving opponent possession, then re-evaluate pressure within one second.

 const enemyNear=nearestOpponent(c).p.distanceToSquared(ball.p)<c.p.distanceToSquared(ball.p)*.55;

 if(lv>0&&!stopped&&!kick&&!urgent&&ai.commit<=0&&enemyNear&&p.z*atk<-10&&dist>15&&ai.mode!=='ROTATE'){

  ai.pressure=(ai.pressure||0)+(lv===0?.16:lv===1?.09:.065);if(ai.pressure<.9){ai.mode='DEFEND';ai.target.set(cl(p.x*.75,-GX+2,GX-2),0,ownZ+(p.z-ownZ)*.6)}

 }else ai.pressure=0;

 const wall=Math.abs(p.x)>HX-5||(Math.abs(p.z)>HZ-4&&Math.abs(p.x)>GX);

 ai.target.y=wall?Math.max(.5,p.y-.35):0;ai.target.x=cl(ai.target.x,-HX+1.05,HX-1.05);ai.target.z=cl(ai.target.z,-HZ-GD+1.2,HZ+GD-1.2);

 // No kickoff or stationary-ball boost detours. Route pickups only during a long reposition.

 boostManagement.tick(b);

 teamPlan(c);c.tgt=ai.target;

}

function bot(c){

 const i=c.inp,ai=c.ai,lv=cfg.lvl;ai.commit=Math.max(0,ai.commit-DT);ai.strikeCD=Math.max(0,ai.strikeCD-DT);

 c.planT-=DT;if(c.planT<=0){planBot(c);c.planT=lv===0?.16:lv===1?.09:.065}

 if(cfg.mode===1&&ball.last<0&&heat.server>=0&&c.id!==heat.server){Object.assign(i,Z);c.jp=c.jh=0;return;}

 const tune=ai.tune,n=c.ground?c.n:Y3;botF.set(1,0,0).applyQuaternion(c.q);botF.addScaledVector(n,-botF.dot(n));if(botF.lengthSq()<.01)botF.set(1,0,0);else botF.normalize();botR.crossVectors(botF,n);

 botD.copy(ai.target).sub(c.p);botD.addScaledVector(n,-botD.dot(n));const to=botD.length(),ang=Math.atan2(botD.dot(botR),botD.dot(botF));

 botD.copy(ball.p).sub(c.p);botD.addScaledVector(n,-botD.dot(n));const flat=botD.length(),angB=Math.atan2(botD.dot(botR),botD.dot(botF)),spd=c.v.length(),attack=ai.mode==='COMMIT'||ai.mode==='KICKOFF'||ai.mode==='SAVE';

 c.sk=spd<1.2&&c.ground&&to>3?c.sk+DT:0;if(c.sk>1){c.un=.5;c.sk=0}

 if(c.un>0){c.un-=DT;i.thr=-1;i.steer=ang>0?-1:1;i.boost=i.ps=i.pitch=i.yaw=i.roll=0;c.jh=0;return}

 i.steer=cl(ang*tune.steerGain*(c.n.y<.75?tune.wallGain:1)-c.wy*.34,-1,1);let desired=attack&&Math.abs(ang)<.35?23:Math.max(4,21/(1+ang*ang*2.4));

 // Leave enough speed to steer, but make the staging turn before accelerating through contact.

 if((ai.mode==='APPROACH'||ai.mode==='ROTATE')&&to<10)desired=Math.min(desired,cl(to*1.4+4,5.5,14));

 i.thr=spd>desired+2?-.5:1;if(!attack&&to<2&&spd>5)i.thr=-.65;

 i.ps=Math.abs(ang)>.75&&spd>7?1:0;i.boost=lv>0&&c.boost>0&&to>tune.boostRange&&Math.abs(ang)<tune.boostAngle&&ai.mode!=='DEFEND'?1:0;

 i.pitch=i.yaw=i.roll=0;c.jh=0;

 // Time the jump/dodge against the relative closing speed. Distance alone makes slow

 // approaches flip too early and moving-ball approaches launch after contact has passed.

 const closing=flat>.01?((c.v.x-ball.v.x)*botD.x+(c.v.y-ball.v.y)*botD.y+(c.v.z-ball.v.z)*botD.z)/flat:0;

 const contactTime=Math.max(0,flat-BR-1.05)/Math.max(1,closing);

 const groundStrike=lv>0&&attack&&ball.p.y<1.7&&flat>2.2&&flat<tune.dodgeDistance&&closing>5&&contactTime>.09&&contactTime<.27&&Math.abs(angB)<.18&&spd>8&&c.n.y>.85;

 const high=ai.intercept.y>2.6&&ai.intercept.y<(lv===2?8:5.7),aerial=lv>0&&high&&flat>3&&flat<(lv===2?18:12)&&Math.abs(angB)<.4&&spd>5&&c.boost>24&&c.n.y>.85;

 if(c.ground&&!c.bs&&ai.strikeCD<=0&&(groundStrike||aerial)){c.bs=aerial?3:1;c.bt=0;ai.doubleUsed=false;ai.strikeCD=1.15;c.jp=1;c.jh=1}

 if(c.bs){c.bt+=DT;

  if(c.bs===1){c.jh=c.bt<.055?1:0;if(c.bt>.095&&!c.ground&&c.canD){c.jp=1;i.pitch=1;i.yaw=cl(angB*1.5,-.35,.35);c.bs=2}else if(c.bt>.5)c.bs=0}

  else if(c.bs===3&&!c.ground){c.jh=c.bt<.2?1:0;_iq.copy(c.q).invert();botLocal.copy(ai.intercept).sub(c.p).applyQuaternion(_iq);const L=botLocal.length();botLocal.divideScalar(L||1);botU.copy(Y3).applyQuaternion(_iq);

   i.pitch=cl(-botLocal.y*tune.airGain+c.w.z*.16,-1,1);i.yaw=cl(botLocal.z*tune.airGain+c.w.y*.16,-1,1);i.roll=cl(botU.z*2.5-c.w.x*.12,-1,1);i.boost=botLocal.x>.76&&c.boost>0?1:0;

   if(lv===2&&L<3&&botLocal.x>.7&&c.canD&&c.aT>.22){c.jp=1;i.pitch=1;i.yaw=0;c.bs=2}

   else if(lv===2&&!ai.doubleUsed&&ai.intercept.y>4.8&&c.bt>.23&&c.canD){c.jp=1;i.pitch=i.yaw=0;ai.doubleUsed=true}

  }

  if(c.bt>2||(c.bs===2&&c.ground&&c.bt>.25))c.bs=0

 }

 recoveryController.tick(c);

}

// ---------- bounded, success-gated player imitation ----------

// Inspiration: Lisowe's synchronized state/input examples and Baker's car-local features,

// recovery coverage, and warning that averaging conflicting tactics creates indecision.

// This is a small contextual memory, not a neural network. The rule bot always chooses its

// tactic and actuates the SAME input/physics path as the player. Memory only nudges seven

// controller thresholds; it cannot move a car, add force/boost, or issue a jump.

// Cost: 80 preallocated 10 Hz trace slots; <=128 compact successful examples; a bounded

// nearest-context scan on bot replans. localStorage is optional and writes are debounced

// >=15 real seconds during play, with explicit menu/pagehide flushes.

const LEARN_DEFAULT=Object.freeze({steerGain:2.6,boostAngle:.28,boostRange:7,dodgeDistance:5.4,setup:2.6,airGain:3.4,wallGain:1});

const LEARN_KEYS=['steerGain','boostAngle','boostRange','dodgeDistance','setup','airGain','wallGain'];

const LEARN_BOUNDS=[[2.3,2.9],[.2,.34],[5.5,8.5],[4.6,5.8],[2.1,3.1],[3,3.8],[.85,1.15]];

const LEARN_CONTEXT=['kickoff','approach','shot','clear','save','boost','dodge','recovery','wall'];

const LEARN_STORE='tevinLeague.imitation.v1',LEARN_MAX=128,LEARN_NF=14,LEARN_NA=9;

// flags: wall contact, airborne, physical dodge, jump edge, boost held, kickoff path.

const LEARN_WALL=1,LEARN_AIR=2,LEARN_DODGE=4,LEARN_JUMP=8,LEARN_BOOST=16,LEARN_KICK=32;

const learnRing=Array.from({length:80},()=>({t:-1,f:new Float32Array(LEARN_NF),a:new Float32Array(LEARN_NA),flags:0,bx:0,bz:0,bvx:0,bvz:0,cx:0,cy:0,cz:0,speed:0}));

const learnPool=Array.from({length:129},()=>({k:0,r:0,n:0,flags:0,f:new Float32Array(LEARN_NF),a:new Float32Array(LEARN_NA)}));

const learnMemory=[],learnEvents=new Uint32Array(9),learnCandidates=[];

const learnInv=new Qn(),learnVec=new V3(),learnVel=new V3(),learnUp=new V3(),learnGoalVec=new V3(),learnFeatureNow=new Float32Array(LEARN_NF);

const learnSums=new Float64Array(7),learnWeights=new Float64Array(7);

const learnPending=Array.from({length:4},()=>({active:false,t:0,start:0,z:0,vz:0,vx:0,x:0,inVz:0,ownThreat:false,kick:false,wall:false,dodge:false,serial:0}));

const learnLastHit={t:-1,start:0,serial:0,kick:false,wall:false,dodge:false};

let learnHead=0,learnCount=0,learnSampleClock=0,learnClock=0,learnLastSaveMs=typeof performance!=='undefined'?performance.now():Date.now();

let learnDirty=false,learnStorage=true,learnLoaded=false,learnPendingJump=0,learnFirstTouch=-1,learnSerial=0,learnLastHitAt=-1e9,learnLastGoalSerial=-1;

let learnWasAir=false,learnAirStart=0,learnLandAt=-1,learnLandStart=0,learnWallStart=-1,learnWallDistance=0,learnWallLastAt=-1e9,learnWallX=0,learnWallY=0,learnWallZ=0;

const learnClamp=(x,a,b)=>Math.max(a,Math.min(b,x));

const learnNow=()=>typeof simTime==='number'&&Number.isFinite(simTime)?simTime:learnClock;

const learnMs=()=>typeof performance!=='undefined'?performance.now():Date.now();

const learnRound=x=>Math.round(x*1000)/1000;



// State uses the CAR'S frame, so a successful blue-team example transfers to orange

// without reading player keys or relying on absolute arena coordinates.

function learnFeatures(c,out){

  learnInv.copy(c.q).invert();learnVec.copy(ball.p).sub(c.p).applyQuaternion(learnInv);

  const distance=learnVec.length();out[0]=learnClamp(distance/40,0,1);

  if(distance>1e-5)learnVec.divideScalar(distance);else learnVec.set(1,0,0);

  out[1]=learnVec.x;out[2]=learnVec.z;out[3]=learnVec.y;

  learnVel.copy(c.v).applyQuaternion(learnInv);out[4]=learnClamp(learnVel.x/PHYS.car.maxSpeed,-1,1);

  learnVel.copy(ball.v).sub(c.v).applyQuaternion(learnInv);out[5]=learnClamp(learnVel.x/35,-1,1);out[6]=learnClamp(learnVel.z/35,-1,1);

  out[7]=learnClamp(c.boost/100,0,1);learnUp.set(0,1,0).applyQuaternion(c.q);out[8]=learnUp.y;out[9]=learnClamp(c.n.y,-1,1);

  const attack=c.team?-1:1;learnGoalVec.set(-c.p.x,0,attack*(HZ+1)-c.p.z).applyQuaternion(learnInv).normalize();out[10]=learnGoalVec.x;out[11]=learnGoalVec.z;

  learnUp.set(0,1,0).applyQuaternion(learnInv);out[12]=learnUp.x;out[13]=learnUp.z;

}

function learnLoad(){

  if(learnLoaded)return;learnLoaded=true;

  try{

    const raw=localStorage.getItem(LEARN_STORE);if(!raw||raw.length>180000)return;

    const data=JSON.parse(raw);if(!data||data.v!==1||!Array.isArray(data.m)||data.m.length>LEARN_MAX)return;

    for(const row of data.m){

      if(!Array.isArray(row)||row.length!==4+LEARN_NF+LEARN_NA||!row.every(x=>typeof x==='number'&&Number.isFinite(x)))continue;

      const kind=Math.floor(row[0]);if(kind<0||kind>=LEARN_CONTEXT.length)continue;

      const item={k:kind,r:learnClamp(row[1],.25,3),n:learnClamp(Math.floor(row[2]),1,32),flags:Math.floor(row[3])&63,f:new Float32Array(LEARN_NF),a:new Float32Array(LEARN_NA)};

      for(let j=0;j<LEARN_NF;j++)item.f[j]=learnClamp(row[4+j],j===0||j===7?0:-1,1);

      for(let j=0;j<LEARN_NA;j++)item.a[j]=j<5?learnClamp(row[4+LEARN_NF+j],-1,1):(row[4+LEARN_NF+j]>.5?1:0);

      learnMemory.push(item);

    }

    if(Array.isArray(data.e))for(let k=0;k<9;k++)if(typeof data.e[k]==='number'&&Number.isFinite(data.e[k]))learnEvents[k]=learnClamp(Math.floor(data.e[k]),0,10000000);

  }catch(_){learnStorage=false}

}

function learnFlush(force=true){

  learnLoad();if(!learnDirty||!learnStorage)return;

  const now=learnMs();if(!force&&now-learnLastSaveMs<15000)return;

  try{

    const rows=learnMemory.map(m=>[m.k,learnRound(m.r),m.n,m.flags,...Array.from(m.f,learnRound),...Array.from(m.a,learnRound)]);

    localStorage.setItem(LEARN_STORE,JSON.stringify({v:1,m:rows,e:Array.from(learnEvents)}));learnDirty=false;learnLastSaveMs=now;

  }catch(_){learnStorage=false}

}

function learnFeatureDistance(a,b){

  // Bearings, contact type, and speed matter more than incidental boost quantity.

  let d=0;for(let j=0;j<LEARN_NF;j++){const delta=a[j]-b[j],w=j===0?3:j===1||j===2?2:j===7?.25:j===8||j===9?1.4:j>=12?.6:1;d+=delta*delta*w}return d;

}

function learnStore(kind,s,reward){

  let nearest=-1,best=.08,kindCount=0;

  for(let k=0;k<learnMemory.length;k++){const m=learnMemory[k];if(m.k!==kind)continue;kindCount++;const d=learnFeatureDistance(m.f,s.f);if(d<best){best=d;nearest=k}}

  if(nearest>=0){

    const m=learnMemory[nearest],a=1/Math.min(12,m.n+1);m.r+=(reward-m.r)*a;m.n=Math.min(32,m.n+1);m.flags|=s.flags;

    for(let j=0;j<LEARN_NF;j++)m.f[j]+=(s.f[j]-m.f[j])*a;

    for(let j=0;j<LEARN_NA;j++)m.a[j]+=(s.a[j]-m.a[j])*a;

  }else{

    let slot=0;while(learnMemory.includes(learnPool[slot]))slot++;

    const item=learnPool[slot];item.k=kind;item.r=reward;item.n=1;item.flags=s.flags;item.f.set(s.f);item.a.set(s.a);

    // Keep each context represented. A single repeated kickoff cannot evict every save.

    if(learnMemory.length<LEARN_MAX&&kindCount<20)learnMemory.push(item);

    else{let replace=-1,worst=Infinity;for(let k=0;k<learnMemory.length;k++){const m=learnMemory[k];if(kindCount>=14&&m.k!==kind)continue;const value=m.r+.035*Math.min(m.n,12);if(value<worst){worst=value;replace=k}}

      if(replace>=0&&(reward>=worst*.8||kindCount<8))learnMemory[replace]=item;

    }

  }

  learnDirty=true;

}

function learnPromote(kind,start,end,reward,required=0,samples=2){

  learnCandidates.length=0;

  for(let n=0;n<learnCount;n++){const s=learnRing[(learnHead-learnCount+n+80)%80];if(s.t>=start&&s.t<=end&&(!required||(s.flags&required)))learnCandidates.push(s)}

  if(!learnCandidates.length)return;

  const take=Math.min(samples,learnCandidates.length);for(let n=0;n<take;n++){const at=take===1?learnCandidates.length-1:Math.round(n*(learnCandidates.length-1)/(take-1));learnStore(kind,learnCandidates[at],learnClamp(reward,.25,3))}

  learnEvents[kind]=Math.min(10000000,learnEvents[kind]+1);learnDirty=true;

}

function learnRewardTrace(hit,reward,kind){

  learnPromote(1,hit.start,hit.t,reward,0,3);learnPromote(kind,Math.max(hit.start,hit.t-1.25),hit.t,reward,0,2);

  learnPromote(5,hit.start,hit.t,reward,LEARN_BOOST,2);

  learnPromote(6,Math.max(hit.start,hit.t-.75),hit.t,reward,LEARN_DODGE|LEARN_JUMP,2);

  if(hit.kick)learnPromote(0,Math.max(hit.start,hit.t-4.5),hit.t,reward,LEARN_KICK,4);

  if(hit.wall)learnPromote(8,hit.start,hit.t,reward,LEARN_WALL,2);

}

function learnKickoff(){

  learnLoad();learnHead=learnCount=learnSampleClock=learnPendingJump=0;learnFirstTouch=-1;learnLastHit.t=-1;learnLastHitAt=-1e9;

  for(const p of learnPending)p.active=false;

  learnWasAir=false;learnAirStart=0;learnLandAt=-1;learnWallStart=-1;learnWallDistance=0;

}

function learnHit(c,cls){

  const first=learnFirstTouch<0;if(first)learnFirstTouch=c.team;

  if(c!==P1||cls<1.5)return;

  const now=learnNow();if(now-learnLastHitAt<.42)return;

  // A stationary car reflecting an opponent's shot is not a demonstrated save. Require

  // pre-contact movement or deliberate input, before the collision changes car velocity.

  let active=false;

  for(let n=0;n<learnCount&&!active;n++){const s=learnRing[(learnHead-learnCount+n+80)%80];if(s.t<now-1.2||s.t>now)continue;

    active=s.speed>2;for(let j=0;j<LEARN_NA&&!active;j++)active=Math.abs(s.a[j])>(j<5?.1:.5);

  }

  if(!active)return;learnLastHitAt=now;

  const prior=learnCount?learnRing[(learnHead+79)%80]:null;

  let p=null;for(let k=0;k<learnPending.length;k++)if(!learnPending[k].active){p=learnPending[k];break}

  if(!p){p=learnPending[0];for(let k=1;k<learnPending.length;k++)if(learnPending[k].t<p.t)p=learnPending[k]}

  const tOwn=prior&&prior.bvz<-2?(-HZ-prior.bz)/prior.bvz:Infinity;

  const ownThreat=!!prior&&prior.bz<-24&&tOwn>0&&tOwn<4&&Math.abs(prior.bx+prior.bvx*tOwn)<GX+BR;

  Object.assign(p,{active:true,t:now,start:now-3,z:ball.p.z,vz:ball.v.z,vx:ball.v.x,x:ball.p.x,inVz:prior?prior.bvz:0,ownThreat,kick:first&&kickoffAge<8,wall:!!prior&&(prior.flags&LEARN_WALL)!==0,dodge:P1.dT>0||!!prior&&(prior.flags&LEARN_DODGE)!==0,serial:++learnSerial});

  Object.assign(learnLastHit,{t:now,start:p.start,serial:p.serial,kick:p.kick,wall:p.wall,dodge:p.dodge});

}

function learnGoal(team){

  // A bot own-goal or an opponent's last touch does not become a player demonstration.

  if(team!==P1.team||ball.last!==P1.team||learnLastHit.t<0||learnNow()-learnLastHit.t>10||learnLastGoalSerial===learnLastHit.serial)return;

  learnLastGoalSerial=learnLastHit.serial;learnRewardTrace(learnLastHit,2.6,2);

}

function learnObserve(dt,jumpEdge=0){

  learnLoad();learnClock+=dt;learnPendingJump|=jumpEdge?1:0;

  const now=learnNow();

  // Outcomes are observed AFTER the actual shared simulation, never assumed from an

  // unplayed future. A deflected/lost ball fails the gate instead of training a bad hit.

  for(const p of learnPending){if(!p.active||now-p.t<.4)continue;p.active=false;

    if(ball.last!==P1.team||now-p.t>1.5)continue;

    const progress=ball.p.z-p.z,strong=p.vz>5&&ball.v.z>2.5&&progress>1.2;

    const save=p.ownThreat&&ball.v.z>1&&progress>.25;

    if(!strong&&!save)continue;

    const tNet=p.vz>0?(HZ-p.z)/p.vz:Infinity,lane=tNet>0&&tNet<5&&Math.abs(p.x+p.vx*tNet)<GX-1;

    const kind=save?4:p.z<-12?3:2,reward=learnClamp(.65+Math.max(0,p.vz)/25+(lane?.35:0)+(save?.45:0),.65,1.9);

    learnRewardTrace(p,reward,kind);

  }

  if(st==='PLAY'){

    const c=P1;learnUp.set(0,1,0).applyQuaternion(c.q);const upright=learnUp.y,speed=c.v.length(),air=!c.ground;

    if(air&&!learnWasAir){learnAirStart=now;learnLandAt=-1}

    if(!air&&learnWasAir&&now-learnAirStart>.2){learnLandAt=now;learnLandStart=Math.max(learnAirStart,now-1.3)}

    if(learnLandAt>=0&&now-learnLandAt>.28){if(c.ground&&upright>.7){learnPromote(7,learnLandStart,learnLandAt+.12,.7+Math.min(speed,15)/30,LEARN_AIR,3)}learnLandAt=-1}

    learnWasAir=air;

    const wall=c.ground&&c.n.y<.75&&learnUp.dot(c.n)>.6;

    if(wall){

      if(learnWallStart<0){learnWallStart=now;learnWallDistance=0;learnWallX=c.p.x;learnWallY=c.p.y;learnWallZ=c.p.z}

      learnWallDistance+=Math.hypot(c.p.x-learnWallX,c.p.y-learnWallY,c.p.z-learnWallZ);learnWallX=c.p.x;learnWallY=c.p.y;learnWallZ=c.p.z;

      if(now-learnWallStart>.65&&learnWallDistance>4&&speed>3&&now-learnWallLastAt>3){learnPromote(8,Math.max(learnWallStart-.8,now-2),now,1,0,3);learnWallLastAt=now}

    }else if(learnWallStart>=0){if(c.ground&&upright>.7&&learnWallDistance>3&&now-learnWallLastAt>1){learnPromote(8,Math.max(learnWallStart-.8,now-2),now,1.15,0,3);learnWallLastAt=now}learnWallStart=-1;learnWallDistance=0}

    learnSampleClock+=dt;if(learnSampleClock>=.1){

      learnSampleClock%=.1;const s=learnRing[learnHead];s.t=now;learnFeatures(c,s.f);const i=c.inp;

      s.a[0]=i.thr;s.a[1]=i.steer;s.a[2]=i.pitch;s.a[3]=i.yaw;s.a[4]=i.roll;s.a[5]=i.boost?1:0;s.a[6]=i.ps?1:0;s.a[7]=learnPendingJump?1:0;s.a[8]=c.jh?1:0;

      s.flags=(wall?LEARN_WALL:0)|(air?LEARN_AIR:0)|(c.dT>0?LEARN_DODGE:0)|(learnPendingJump?LEARN_JUMP:0)|(i.boost?LEARN_BOOST:0)|(kickoffAge<8&&learnFirstTouch<0?LEARN_KICK:0);

      s.bx=ball.p.x;s.bz=ball.p.z;s.bvx=ball.v.x;s.bvz=ball.v.z;s.cx=c.p.x;s.cy=c.p.y;s.cz=c.p.z;s.speed=speed;

      learnPendingJump=0;learnHead=(learnHead+1)%80;learnCount=Math.min(80,learnCount+1);

    }

    if(learnFirstTouch<0&&ball.last>=0)learnFirstTouch=ball.last;

  }

  // Persistence is handled by the idle timer, never by a physics tick.

}

function learnContextWeight(c,m){

  const mode=c.ai.mode||'ATTACK';

  if(c.ground&&c.n.y<.75)return m.k===8?1:0;

  if(mode==='KICKOFF')return m.k===0?1:m.k===5||m.k===6?.35:0;

  if(mode==='SAVE'||mode==='DEFEND')return m.k===4?1:m.k===3?.45:0;

  if(mode==='RECOVER'||mode==='RECOVERY')return m.k===7?1:0;

  if(mode==='BOOST')return m.k===5?1:0;

  if(!c.ground)return m.flags&LEARN_AIR?(m.k===2||m.k===6?1:m.k===7?.35:0):0;

  return m.k===1||m.k===2||m.k===3?1:m.k===5||m.k===6?.45:0;

}

function learnTuneAcc(index,value,w){learnSums[index]+=learnClamp(value,...LEARN_BOUNDS[index])*w;learnWeights[index]+=w}

function imitationTune(c){

  learnLoad();const tune=c.ai.tune||(c.ai.tune={...LEARN_DEFAULT,confidence:0});

  for(const key of LEARN_KEYS)tune[key]=LEARN_DEFAULT[key];tune.confidence=0;

  if(!learnMemory.length)return tune;

  learnFeatures(c,learnFeatureNow);learnSums.fill(0);learnWeights.fill(0);let evidence=0,best=Infinity;

  for(const m of learnMemory){

    const context=learnContextWeight(c,m);if(!context)continue;const distance=learnFeatureDistance(learnFeatureNow,m.f);if(distance>2.2)continue;

    best=Math.min(best,distance);const w=context*m.r*Math.min(3,Math.sqrt(m.n))/(.15+distance);evidence+=context*Math.min(3,m.n);

    const f=m.f,a=m.a,ang=Math.atan2(f[2],f[1]),dist=f[0]*40;

    // Infer only quantities supported by an observed successful control. Boolean jump

    // and boost events stay Boolean; the bot's own state machine owns their timing.

    if(!(m.flags&LEARN_AIR)&&Math.abs(ang)>.15&&Math.abs(ang)<1.1&&a[1]*ang>.1){const gain=Math.abs(a[1]/ang);learnTuneAcc(m.flags&LEARN_WALL?6:0,m.flags&LEARN_WALL?gain/LEARN_DEFAULT.steerGain:gain,w)}

    if(a[5]>.5&&!(m.flags&LEARN_AIR)){learnTuneAcc(1,Math.abs(ang)+.08,w);learnTuneAcc(2,dist,w)}

    if(m.k===6&&dist>1.5&&dist<9)learnTuneAcc(3,dist,w);

    if(m.k===1&&dist>1.8&&dist<6)learnTuneAcc(4,dist,w);

    if(m.flags&LEARN_AIR){

      if(m.k===7){if(Math.abs(f[12])>.15&&a[2]*f[12]>.05)learnTuneAcc(5,Math.abs(a[2]/f[12]),w);if(Math.abs(f[13])>.15&&a[4]*f[13]>.05)learnTuneAcc(5,Math.abs(a[4]/f[13]),w)}

      else if(Math.abs(f[3])>.15&&a[2]*f[3]<-.05)learnTuneAcc(5,Math.abs(a[2]/f[3]),w);

    }

  }

  // Strong defaults dominate even after many examples; unrelated/out-of-distribution

  // states fall back immediately. No example can suppress a challenge or force a jump.

  const blend=.2*Math.min(1,evidence/14)*Math.exp(-Math.max(0,best)*1.5);tune.confidence=Number.isFinite(blend)?blend:0;

  if(tune.confidence>0)for(let k=0;k<7;k++)if(learnWeights[k]>0){const base=LEARN_DEFAULT[LEARN_KEYS[k]],learned=learnSums[k]/learnWeights[k];tune[LEARN_KEYS[k]]=learnClamp(base+(learned-base)*tune.confidence,...LEARN_BOUNDS[k])}

  return tune;

}

function learnStats(){

  learnLoad();const byContext={};for(let k=0;k<9;k++)byContext[LEARN_CONTEXT[k]]={successes:learnEvents[k],examples:learnMemory.reduce((n,m)=>n+(m.k===k?1:0),0)};

  return{samples:learnMemory.length,capacity:LEARN_MAX,persistent:learnStorage,byContext};

}

function learnUI(){const s=learnStats();$('learninfo').textContent=`LOCAL IMITATION · ${s.samples}/${s.capacity} successful examples · ${s.persistent?'saved on this device':'session memory'}`}

$('forget').onclick=()=>{learnMemory.length=0;learnEvents.fill(0);learnDirty=false;learnStorage=true;try{localStorage.removeItem(LEARN_STORE)}catch(_){learnStorage=false}learnKickoff();for(const c of cars)Object.assign(c.ai.tune,LEARN_DEFAULT);learnUI()};

window.tevinBoot.stage='learning setup';

learnUI();

setInterval(()=>{if(learnDirty)learnFlush(false)},15000);

if(typeof addEventListener==='function')addEventListener('pagehide',()=>learnFlush());



// ---------- input ----------

window.tevinBoot.stage='input setup';

const keys={};let ballCam=true;
// INLINE:controls.js

addEventListener('keydown',e=>{if(captureBinding(e))return;if(LOADING.active){e.preventDefault();return}if(!e.repeat)unlockAudio();
 if(INTRO.active){if(!INTRO.started&&!INTRO.manualPause&&e.key!=='Escape')introStart();if(e.key==='Enter'&&!e.repeat&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();introPlay()}if(e.key==='Escape'){e.preventDefault();introPlay()}return}

 // Text entry must never feed driving controls or the global offline shortcut.

 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target?.isContentEditable){

  if(e.target.id==='party-code-input'&&e.key==='Enter'){e.preventDefault();if(!e.repeat)joinParty()}

  if(e.target.id==='room-code'&&e.key==='Enter'){e.preventDefault();if(!e.repeat)joinMatch()}return;

 }

 const k=mappedKey(e);heldCodes.set(e.code,k);const menuState=['MENU','PAUSE','END'].includes(st),btn=e.target instanceof HTMLButtonElement;

 if(k==='tab')return;

 if(k==='f3'){e.preventDefault();DBG^=1;$('dbg').style.display=DBG?'block':'none';return}

 if(menuState&&k===' '&&btn)return;

 if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();

 if(!e.repeat){

  if(sandbox&&!MP.active&&st==='PLAY'){if(k==='r')resetTraining('ball');if(k==='t')resetTraining('car');if(k==='f2'){e.preventDefault();pause();$('training-panel').hidden=false}}



   if(k==='b'){ballCam=!ballCam;renderBindings()}

  if(k==='escape'){if(st==='MENU')menuBack();else pause()}

 if(k==='enter'&&menuState&&!btn){if(st==='MENU')startOfflineGame();else if(st==='END')$('rm').onclick();else if(st==='PAUSE'&&(!MP.active||MP.localPaused))pause()}

  if(k===' '&&st==='PLAY'){localPlayer().jp=1;if(MP.active&&MP.role==='guest')MP.jump++}}

 keys[k]=1;if(k===' '&&st==='PLAY')localPlayer().jh=1});

addEventListener('keyup',e=>{const k=heldCodes.get(e.code)||mappedKey(e);heldCodes.delete(e.code);keys[k]=0;if(k==' ')localPlayer().jh=padInput.jump?1:0});

function lostFocus(){inputFocused=false;heldCodes.clear();Object.assign(padInput,{thr:0,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0,jump:false});audioSilence();if(document.hidden&&AC?.state==='running')AC.suspend().catch(()=>{});for(const k in keys)keys[k]=0;localPlayer().jp=localPlayer().jh=0;if(MP.active&&MP.loaded){mpSetPause(true)}else if(st==='PLAY'||st==='COUNT')pause()}

addEventListener('blur',lostFocus);addEventListener('visibilitychange',()=>{if(document.hidden)lostFocus()});

// ---------- audio ----------

// STADIUM AUDIO: 19 Vorbis match effects + 5 supplied MP3 menu/save effects.
// Buses: master -> compressor -> output; engines and effects have separate sliders.
// Five persistent loop voices; at most 16 transient voices. No node creation in
// steady-state mixing. Smoothed gain/rate changes and offline loop crossfades
// prevent clicks. Host events carry IDs, age and position, never audio payloads.
let AC,engG; // engG retained only for compatibility with older integrations.
let shake=0,flash=0;
const AUDIO={buffers:Object.create(null),loops:Object.create(null),voices:[],loading:null,
 master:null,effects:null,engines:null,limiter:null,ready:0,failed:0,
 settings:{master:.72,effects:.8,engines:.58,muted:false},gate:Object.create(null),
 events:[],seq:0,received:0,phase:'MENU',countKey:'',goalKey:'',boosting:false,serial:0};
try{const saved=JSON.parse(localStorage.getItem('tevin-audio-v1')||'null');if(saved){for(const k of ['master','effects','engines'])if(Number.isFinite(saved[k]))AUDIO.settings[k]=cl(saved[k],0,1);AUDIO.settings.muted=saved.muted===true}}catch(_){}
function audioStatus(){const e=$('audio-status');if(e)e.textContent=!AC?'Sound unlocks on your first click or key press.':AUDIO.loading&&AUDIO.ready+AUDIO.failed<24?'Preparing stadium sound…':AC.state!=='running'?'Sound paused by browser — click TEST SOUND to resume.':AUDIO.failed?'Sound ready · '+AUDIO.ready+' clips · fallback enabled':'STADIUM SOUND · '+AUDIO.ready+' clips ready';}
function audioMixSettings(){if(!AC)return;const t=AC.currentTime;AUDIO.master.gain.setTargetAtTime(AUDIO.settings.muted?0:AUDIO.settings.master,t,.025);AUDIO.effects.gain.setTargetAtTime(AUDIO.settings.effects,t,.025);AUDIO.engines.gain.setTargetAtTime(AUDIO.settings.engines,t,.025)}
function unlockAudio(){
 try{
  if(!AC){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
   AC=new Context({latencyHint:'interactive'});AUDIO.master=AC.createGain();AUDIO.effects=AC.createGain();AUDIO.engines=AC.createGain();
   AUDIO.limiter=AC.createDynamicsCompressor();AUDIO.limiter.threshold.value=-12;AUDIO.limiter.knee.value=16;AUDIO.limiter.ratio.value=5;AUDIO.limiter.attack.value=.004;AUDIO.limiter.release.value=.18;
   AUDIO.effects.connect(AUDIO.master);AUDIO.engines.connect(AUDIO.master);AUDIO.master.connect(AUDIO.limiter);AUDIO.limiter.connect(AC.destination);audioMixSettings();
   AC.onstatechange=audioStatus;
   // Decode failures are isolated: a missing clip never prevents kickoff.
   AUDIO.loading=(async()=>{for(const [key,base64] of Object.entries({...ENGINE.AUDIO_DATA,...window.TEVIN_MENU_AUDIO?.effects})){
    try{const raw=atob(base64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);AUDIO.buffers[key]=await AC.decodeAudioData(bytes.buffer);AUDIO.ready++;if(['idle','drive','muscle','octane','boost'].includes(key))audioCreateLoop(key)}catch(_){AUDIO.failed++}
   }audioStatus()})();
  }
  if(AC.state==='suspended'||AC.state==='interrupted')AC.resume().then(audioStatus).catch(audioStatus);
  audioStatus();return AUDIO.loading;
 }catch(error){console.warn('Audio unavailable',error);audioStatus()}
}
function audioCreateLoop(key){if(AUDIO.loops[key])return;const source=AC.createBufferSource(),gain=AC.createGain();source.buffer=AUDIO.buffers[key];source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(AUDIO.engines);source.start();AUDIO.loops[key]={source,gain}}
function audioRelease(v){v.source.onended=null;v.source.disconnect();v.gain.disconnect();if(v.pan)v.pan.disconnect();const i=AUDIO.voices.indexOf(v);if(i>=0)AUDIO.voices.splice(i,1)}
function audioStopVoice(v){try{v.source.stop()}catch(_){}audioRelease(v)}
function audioSilence(){if(!AC)return;for(const loop of Object.values(AUDIO.loops)){loop.gain.gain.cancelScheduledValues(AC.currentTime);loop.gain.gain.setTargetAtTime(0,AC.currentTime,.012)}for(let i=AUDIO.voices.length-1;i>=0;i--)audioStopVoice(AUDIO.voices[i]);AUDIO.boosting=false}
function audioSample(key,volume=1,rate=1,position=null){
 if(!AC||AC.state!=='running'||AUDIO.settings.muted||document.hidden)return false;const buffer=AUDIO.buffers[key];if(!buffer)return false;
 let pan=0;if(position){const p=localPlayer().p,dx=position[0]-p.x,dy=position[1]-p.y,dz=position[2]-p.z;volume*=1/(1+(dx*dx+dy*dy+dz*dz)/225);if(cam){const a=cam.matrixWorld.elements;pan=cl((dx*a[0]+dy*a[1]+dz*a[2])/Math.max(5,Math.hypot(dx,dy,dz)),-.85,.85)}}
 if(volume<.006)return true;if(key==='uiPaint'||key==='uiReady'||key==='save')for(let i=AUDIO.voices.length-1;i>=0;i--)if(AUDIO.voices[i].key===key)audioStopVoice(AUDIO.voices[i]);if(AUDIO.voices.length>=16)audioStopVoice(AUDIO.voices[0]);
 const source=AC.createBufferSource(),gain=AC.createGain(),panner=AC.createStereoPanner?AC.createStereoPanner():null;
 source.buffer=buffer;source.playbackRate.value=cl(rate,.65,1.6);gain.gain.value=cl(volume,0,1);source.connect(gain);if(panner){panner.pan.value=pan;gain.connect(panner);panner.connect(AUDIO.effects)}else gain.connect(AUDIO.effects);
 const voice={source,gain,pan:panner,key};AUDIO.voices.push(voice);source.onended=()=>audioRelease(voice);source.start();return true;
}
// Quiet oscillator fallback only while samples decode or a codec fails.
function snd(f,t='sine',d=.1,v=.1,f2){if(!AC||AC.state!=='running'||AUDIO.settings.muted||document.hidden)return;if(AUDIO.voices.length>=16)audioStopVoice(AUDIO.voices[0]);const source=AC.createOscillator(),gain=AC.createGain(),n=AC.currentTime;source.type=t;source.frequency.setValueAtTime(f,n);if(f2)source.frequency.exponentialRampToValueAtTime(f2,n+d);gain.gain.setValueAtTime(v,n);gain.gain.exponentialRampToValueAtTime(.001,n+d);source.connect(gain);gain.connect(AUDIO.effects);const voice={source,gain,pan:null};AUDIO.voices.push(voice);source.onended=()=>audioRelease(voice);source.start(n);source.stop(n+d)}
function audioCue(kind,strength=8,position=null,cid=-1){
 if((kind==='pickup'||kind==='save')&&cid!==localPlayer().id)return;
 const v=cl(strength/25,.12,.8),variant=(AUDIO.serial++%3)+1;
 if(kind==='hit'||kind==='ball'||kind==='wall'||kind==='bump'){
  if(!audioSample(kind==='hit'||kind==='ball'?'hit'+variant:'wall'+(variant%2+1),v, .94+variant*.035,position))snd(kind==='hit'?150:85,'triangle',.12,v*.2,40);
 }else audioSample(kind,kind==='pickup'?.38:kind==='jump'||kind==='dodge'?.32:.55,1,position);
}
function audioWorld(kind,strength=8,p=null,cid=-1){
 const now=performance.now(),gate=kind+':'+cid;if(now-(AUDIO.gate[gate]??-1000)<(kind==='ball'?100:70))return;AUDIO.gate[gate]=now;
 const position=p?[p.x,p.y,p.z]:null;
 if(MP.active&&MP.role==='host'){AUDIO.events.push({id:++AUDIO.seq,kind,strength:cl(strength,0,100),position,cid,at:now});if(AUDIO.events.length>16)AUDIO.events.shift()}
 if(st!=='PAUSE'&&st!=='MENU'&&st!=='WAIT')audioCue(kind,strength,position,cid);
}
function impactSound(kind,strength,p=null){audioWorld(kind,strength,p);if(kind==='hit'||kind==='wall')shake=Math.min(.22,shake+strength*.004)}
function audioPacket(){const now=performance.now();return AUDIO.events.filter(e=>now-e.at<300).map(e=>({id:e.id,kind:e.kind,strength:e.strength,position:e.position,cid:e.cid,age:now-e.at}))}
function audioReceive(s){if(!Array.isArray(s.audio))return;for(const e of s.audio.slice(-16)){
 if(!e||!Number.isSafeInteger(e.id)||e.id<=AUDIO.received)continue;AUDIO.received=e.id;
 if(!['hit','ball','wall','bump','jump','dodge','pickup','save'].includes(e.kind)||!Number.isFinite(e.strength)||!Number.isFinite(e.age)||e.age<0||e.age>300||!['PLAY','GOAL'].includes(s.phase)||st==='PAUSE'||document.hidden)continue;
 if(e.position&&(!Array.isArray(e.position)||e.position.length!==3||!e.position.every(Number.isFinite)))continue;
 graphicsRemoteCue(e.kind,e.strength,e.position,s.ball?.color);audioCue(e.kind,cl(e.strength,0,100),e.position,e.cid);
}}
function updateAudio(){
 const previous=AUDIO.phase;AUDIO.phase=st;
 if(st!==previous&&(st==='PAUSE'||st==='MENU'||st==='WAIT'))audioSilence();
 if(st==='COUNT'){const key=MP.round+':'+Math.ceil(cnt);if(key!==AUDIO.countKey){AUDIO.countKey=key;if(cnt<=3&&!audioSample('tick',.48))snd(440,'sine',.12,.06)}}
 if(st==='PLAY'&&previous==='COUNT'){if(!audioSample('go',.55))snd(880,'sine',.25,.08)}
 if(st==='GOAL'){const key=score[0]+':'+score[1];if(key!==AUDIO.goalKey){AUDIO.goalKey=key;if(!audioSample('goal',.72))snd(140,'triangle',.8,.15,35)}}
 if(!AC||AC.state!=='running')return;const c=localPlayer(),live=st==='PLAY'&&!document.hidden,speed=cl(c.v.length()/23,0,1),throttle=Math.abs(c.inp.thr),boost=live&&!!c.bst;
 if(boost!==AUDIO.boosting&&live)audioSample(boost?'boostStart':'boostEnd',boost?.22:.26);AUDIO.boosting=boost;
 const body=c.body??cfg.body,load=body===2?'muscle':body===0?'octane':'drive',t=AC.currentTime;
 for(const key in AUDIO.loops){const loop=AUDIO.loops[key];let volume=0,rate=1;
  if(live){if(key==='idle'){volume=.34*(1-speed*.8);rate=.85+speed*.3}else if(key===load){volume=.2+speed*.42+throttle*.13;rate=.75+speed*.75+throttle*.08}else if(key==='boost'){volume=boost?.62:0;rate=1+speed*.13}}
  loop.gain.gain.setTargetAtTime(volume,t,.045);loop.source.playbackRate.setTargetAtTime(rate,t,.08);
 }
}
function setupAudioUI(){for(const key of ['master','effects','engines']){const input=$('audio-'+key);input.value=Math.round(AUDIO.settings[key]*100);const output=$('audio-'+key+'-value');output.textContent=input.value+'%';input.addEventListener('input',()=>{AUDIO.settings[key]=cl(Number(input.value)/100,0,1);output.textContent=input.value+'%';saveAudioSettings()})}
 const mute=$('audio-muted');mute.checked=AUDIO.settings.muted;mute.addEventListener('change',()=>{AUDIO.settings.muted=mute.checked;saveAudioSettings()});$('audio-test').onclick=async()=>{await unlockAudio();if(!AUDIO.settings.muted)audioSample('go',.5);audioStatus()};audioStatus();
}
function saveAudioSettings(){audioMixSettings();try{localStorage.setItem('tevin-audio-v1',JSON.stringify(AUDIO.settings))}catch(_){}}
addEventListener('pointerdown',()=>{unlockAudio()},{passive:true});
addEventListener('click',e=>{const b=e.target?.closest?.('button');if(!b||b.disabled||st!=='MENU'||performance.now()-(AUDIO.gate.menu??-1000)<70)return;AUDIO.gate.menu=performance.now();const key=b.closest?.('#swatches')?'uiPaint':['menu-back','quick-cancel','party-leave'].includes(b.id)?'uiBack':'uiClick';if(!['party-ready','quick-find','menu-back'].includes(b.id))audioSample(key,key==='uiPaint'?.25:.38)});
addEventListener('pagehide',audioSilence);


// SHOWTIME 8.1: supplied MP3s stay embedded in the drop-in HTML. Music streams
// through one media element + one analyser; it is not decoded into a huge PCM bank.
// Motion follows measured bass energy, never a guessed BPM. No flashing overlays.
const INTRO={stopped:false,active:true,started:false,media:null,node:null,gain:null,analyser:null,bins:new Uint8Array(1024),level:0,average:.12,pulse:0,clock:0,lastBeat:-1,music:1,motion:true,fadeStart:0,fadeEnd:0,manualPause:false,leaving:false,attempt:0,enabled:false};
try{const p=JSON.parse(localStorage.getItem('tevin-intro-v2')||'null');if(p){INTRO.music=cl(Number(p.music)||0,0,1);INTRO.motion=p.motion!==false}}catch(_){}
try{INTRO.enabled=localStorage.getItem('tevin-music-enabled-v1')==='true'}catch(_){}
// FLOW 8.2: audio-clock automation makes the six-second fade independent of FPS.
function introMix(){if(!INTRO.gain||!AC)return;const now=AC.currentTime,g=INTRO.gain.gain,remaining=Math.max(0,INTRO.fadeEnd-now),fraction=remaining?cl((now-INTRO.fadeStart)/6,0,1):1;g.cancelScheduledValues(now);g.setValueAtTime(INTRO.music*fraction,now);if(remaining)g.linearRampToValueAtTime(INTRO.music,INTRO.fadeEnd);else g.setTargetAtTime(INTRO.music,now,.08)}
function introPreferences(){try{localStorage.setItem('tevin-intro-v2',JSON.stringify({music:INTRO.music,motion:INTRO.motion}))}catch(_){}introMix()}
function introMessage(text){$('intro-status').textContent=text}
async function introStart(automatic=false){
 if(!INTRO.enabled||st!=='MENU'||INTRO.stopped)return;unlockAudio();if(!AC){introMessage('Audio unavailable. You can still choose Play.');return}
 const attempt=++INTRO.attempt;
 try{
  if(!INTRO.media){const m=document.createElement('audio');m.src=window.TEVIN_MENU_AUDIO.music;m.loop=true;m.preload='auto';INTRO.media=m;
   INTRO.node=AC.createMediaElementSource(m);INTRO.gain=AC.createGain();INTRO.gain.gain.setValueAtTime(0,AC.currentTime);INTRO.analyser=AC.createAnalyser();INTRO.analyser.fftSize=2048;INTRO.analyser.smoothingTimeConstant=.55;
   INTRO.node.connect(INTRO.analyser);INTRO.analyser.connect(INTRO.gain);INTRO.gain.connect(AUDIO.master);
   m.addEventListener('waiting',()=>{if(INTRO.active)introMessage('Loading your soundtrack… Play is available now.')});
   m.addEventListener('error',()=>{if(INTRO.active)introMessage('Soundtrack could not load. Play is still available.')});
  }
  const wasPlaying=INTRO.started&&!INTRO.media.paused&&AC.state==='running';
  // An autoplay-blocked resume promise can remain pending. Each user gesture can
  // retry independently; no shared pending promise can lock the title screen.
  const resume=AC.resume();const play=INTRO.media.play();
  if(automatic&&AC.state!=='running')introMessage('CLICK OR PRESS A KEY TO START MUSIC · PLAY IS READY');
  await Promise.all([resume,play]);
  if(!INTRO.enabled||st!=='MENU'||INTRO.stopped){INTRO.media.pause();return}if(attempt!==INTRO.attempt){if(INTRO.manualPause)INTRO.media.pause();return;}
  if(!wasPlaying){INTRO.fadeStart=AC.currentTime;INTRO.fadeEnd=INTRO.fadeStart+6;introMix()}
  INTRO.started=true;INTRO.manualPause=false;document.body.classList.add('music-playing');$('intro-start').hidden=true;$('intro-sound').hidden=false;$('intro-sound').textContent='PAUSE MUSIC';introMessage('MUSIC ON · FADING IN · CHOOSE PLAY WHEN READY');
 }catch(_){if(attempt!==INTRO.attempt||!INTRO.active)return;introMessage('CLICK OR PRESS A KEY TO START MUSIC · PLAY IS READY');$('intro-start').hidden=false}
}
function introStop(){INTRO.stopped=true;INTRO.active=false;INTRO.media?.pause();INTRO.pulse=0;$('intro').hidden=true;for(const e of $('menu').children)if(e.id!=='intro')e.inert=false;$('intro-stage').style.transform='none';}
async function openPlaySelection(){
 if(starting||LOADING.active)return;starting=true;let transition;
 try{transition=await loadingBegin('CHOOSE YOUR MATCH','1v1, 2v2 or 3v3. Your arena. Your rules.',true);
 await loadingStage(45,'Loading playlists');configureCars();
 INTRO.active=false;INTRO.leaving=false;$('intro').hidden=true;for(const e of $('menu').children)e.inert=false;
 showMenuScreen('play');await loadingStage(100,'Playlists ready');await loadingEnd(transition);$('choose-offline').focus?.();
 }catch(error){loadingAbort(transition);$('start-status').textContent='Could not open playlists. Please try again.';console.warn(error)}finally{starting=false;INTRO.leaving=false}
}
function introPlay(){if(starting||LOADING.active)return;if(!INTRO.manualPause)introStart();return openPlaySelection();}
// INLINE:visualizer.js
function setupIntro(){
 const preference=window.matchMedia?.('(prefers-reduced-motion: reduce)');INTRO.reduced=!!preference?.matches;preference?.addEventListener?.('change',e=>INTRO.reduced=e.matches);
 const openMusicSettings=()=>{INTRO.active=false;$('intro').hidden=true;for(const e of $('menu').children)e.inert=false;showMenuScreen('settings');};
 $('menu-music').onclick=openMusicSettings;$('menu-music').textContent='MUSIC SETTINGS';
 $('music-enabled').checked=INTRO.enabled;$('music-enabled').onchange=()=>{INTRO.enabled=$('music-enabled').checked;try{localStorage.setItem('tevin-music-enabled-v1',String(INTRO.enabled))}catch(_){}if(INTRO.enabled){INTRO.manualPause=false;introStart()}else{INTRO.attempt++;INTRO.media?.pause();document.body.classList.remove('music-playing');introMessage('MUSIC OFF · ENABLE IN SETTINGS')}};
 $('intro-start').onclick=()=>introStart();$('intro-play').onclick=introPlay;$('intro-skip').onclick=openMusicSettings;
 $('intro-sound').onclick=()=>{if(!INTRO.media)return;if(INTRO.media.paused){introStart();$('intro-sound').textContent='PAUSE MUSIC'}else{INTRO.manualPause=true;INTRO.media.pause();$('intro-sound').textContent='RESUME MUSIC';introMessage('MUSIC PAUSED · CHOOSE PLAY WHEN YOU’RE READY')}};
 $('intro-volume').value=Math.round(INTRO.music*100);$('intro-volume').oninput=()=>{INTRO.music=Number($('intro-volume').value)/100;introPreferences()};
 $('intro-motion').checked=INTRO.motion;$('intro-motion').onchange=()=>{INTRO.motion=$('intro-motion').checked;introPreferences()};
 for(let i=0;i<32;i++)$('intro-spectrum').appendChild(document.createElement('i'));
 for(const e of $('menu').children)if(e.id!=='intro')e.inert=true;
 $('intro-play').focus?.();introMessage(INTRO.enabled?'YOUR SOUNDTRACK IS READY · PLAY WHEN READY':'MUSIC OFF · ENABLE IN SETTINGS');
 const firstGesture=e=>{if(INTRO.active&&!INTRO.leaving&&!INTRO.manualPause&&(!INTRO.started||INTRO.media?.paused)&&!['intro-play','intro-skip','intro-start','intro-sound'].includes(e.target?.id))introStart()};
 addEventListener('pointerdown',firstGesture);
 if(document.readyState==='complete')introStart(true);else addEventListener('load',()=>introStart(true),{once:true});
 addEventListener('visibilitychange',()=>{if(document.hidden){INTRO.manualPause=true;INTRO.media?.pause();if(INTRO.started){$('intro-sound').textContent='RESUME MUSIC';introMessage('MUSIC PAUSED · PRESS RESUME MUSIC')}}});
 addEventListener('pagehide',()=>INTRO.media?.pause());
}
// Project the incoming shot only for audio feedback; it never changes physics.
function audioGoalThreat(c){const sign=c.team?1:-1,v=ball.v.z*sign;if(v<2||ball.p.z*sign<25)return false;const t=(HZ-ball.p.z*sign)/v;if(t<0||t>1.5)return false;return Math.abs(ball.p.x+ball.v.x*t)<GX+BR&&ball.p.y+ball.v.y*t-.5*G*cfg.gravity*t*t<GH+BR}
function audioSave(c,wasThreat){if(wasThreat&&!audioGoalThreat(c)&&simTime-(c.lastSaveSound??-100)>6.5){c.lastSaveSound=simTime;audioWorld('save',10,null,c.id)}}

// 8.2: one transition owner, real stage completion, no fake percentage timer.
// Cached scenes take only a short dissolve. Gameplay readiness is announced
// after the overlay clears, so a hidden countdown cannot give another player a lead.
const LOADING={active:false,serial:0,progress:0,cached:false};
const loadingDelay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function graphicsReady(){return !!inited&&graphicsPreset===cfg.hi+cfg.models*2+cars.length*10}
async function loadingBegin(title,detail,cached=false){
 const id=++LOADING.serial;Object.assign(LOADING,{active:true,progress:0,cached,opened:performance.now()});
 const el=$('loading-screen');el.hidden=false;el.classList.remove('leaving');el.classList.toggle('cached',cached);el.setAttribute('aria-busy','true');
 $('loading-title').textContent=title;$('loading-detail').textContent=detail;$('loading-cache').textContent=cached?'READY IN MEMORY · QUICK TRANSITION':'PREPARING YOUR NEXT SESSION';
 $('menu').inert=true;loadingProgress(cached?90:4,cached?'Restoring your scene':'Preparing assets');$('loading-title').focus?.();
 await loadingDelay(INTRO.reduced?0:220);return id;
}
function loadingProgress(value,label){if(!LOADING.active)return;LOADING.progress=Math.max(LOADING.progress,Math.min(100,value));$('loading-phase').textContent=label;$('loading-percent').textContent=Math.round(LOADING.progress)+'%';$('loading-fill').style.transform='scaleX('+LOADING.progress/100+')';$('loading-meter').setAttribute('aria-valuenow',String(Math.round(LOADING.progress)))}
async function loadingStage(value,label){if(!LOADING.active)return;loadingProgress(value,label);await loadingDelay(20)}
async function loadingEnd(id){if(id!==LOADING.serial)return;loadingProgress(100,'Ready');$('loading-screen').setAttribute('aria-busy','false');await loadingDelay(INTRO.reduced?0:Math.max(80,650-(performance.now()-LOADING.opened)));if(id!==LOADING.serial)return;$('loading-screen').classList.add('leaving');await loadingDelay(INTRO.reduced?0:320);if(id!==LOADING.serial)return;$('loading-screen').hidden=true;$('menu').inert=false;LOADING.active=false;}
function loadingAbort(id){if(id!==LOADING.serial)return;LOADING.serial++;LOADING.active=false;$('loading-screen').hidden=true;$('menu').inert=false;}


// ARCHIVE FX v7.4: converted TGA textures + bounded, event-driven animation.
// Twelve pooled impact/goal sprites and one exhaust flare per car. No geometry,
// materials, textures or vectors are allocated by the steady-state update loop.
let FX=null;
const fxOffset=new V3(),fxReduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function setupGraphicsUI(){for(const [key,url] of Object.entries(ENGINE.GRAPHICS_DATA||{}))$('menu').parentElement?.style.setProperty('--gfx-'+key,'url("'+url+'")')}
async function createGraphicsEffects(){
 const maps=await ENGINE.loadEffectTextures(),group=new THREE.Group(),pool=[],boost=[];
 function sprite(map){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:map||glowTex(),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false,opacity:0}));s.userData.skipAO=true;s.frustumCulled=false;group.add(s);return s}
 for(let i=0;i<12;i++)pool.push({sprite:sprite(i%2?maps.flare:maps.impact),life:0,total:1,size:1,wide:!!(i%2)});
 for(let i=0;i<cars.length;i++)boost.push(sprite(maps.flare));
 scene.add(group);FX={group,pool,boost,next:0,time:0,goalKey:'',score:score.join(':'),maps};
 // Visible zero-alpha sprites compile during the existing shader warmup.
}
function graphicsBurst(p,strength=10,color=0xffffff,goal=false){if(!FX||!p)return;
 const count=goal?4:2;for(let i=0;i<count;i++){const e=FX.pool[FX.next++%FX.pool.length];e.sprite.position.set(p.x,p.y,p.z);e.total=e.life=goal?.85:.24;e.size=goal?8:cl(strength*.09,.5,2);e.sprite.material.color.setHex(color);e.sprite.material.rotation=e.wide?0:Math.random()*6.28;e.sprite.visible=true}
}
function graphicsRemoteCue(kind,strength,position,color){if(kind==='hit'&&position&&FX)graphicsBurst(fxOffset.fromArray(position),strength,color||ball.color||0xffffff)}
function updateGraphicsEffects(dt){if(!FX)return;const playing=st==='PLAY'||st==='GOAL';FX.group.visible=playing;
 $('bo').classList.toggle('boosting',playing&&!!localPlayer().bst);
 const key=score.join(':');if(st==='GOAL'&&FX.goalKey!==key){FX.goalKey=key;graphicsBurst(ball.p,35,ball.color||0xffffff,true);$('msg').classList.add('goal-burst')}else if(st!=='GOAL')$('msg').classList.remove('goal-burst');
 if(st==='COUNT')FX.goalKey='';if(!playing){for(const e of FX.pool)e.life=0;return}FX.time+=dt;
 for(const e of FX.pool){e.life=Math.max(0,e.life-dt);e.sprite.visible=e.life>0;if(!e.life)continue;const t=1-e.life/e.total,s=e.size*(.45+t*1.4);e.sprite.scale.set(s*(e.wide?2.8:1),s*(e.wide?.45:1),1);e.sprite.material.opacity=Math.pow(1-t,2)*(fxReduced?.2:.65)}
 for(let i=0;i<FX.boost.length;i++){const c=cars[i],s=FX.boost[i];s.visible=!!c.enabled&&!!c.bst;if(!s.visible)continue;fxOffset.set(-1.1,.02,0).applyQuaternion(cm[i].quaternion);s.position.copy(cm[i].position).add(fxOffset);s.material.color.setHex(c.color);s.material.opacity=fxReduced?.16:.42;s.scale.set(1.35+Math.sin(FX.time*19+i)*.12,.38,1)}
}


// ---------- particles ----------

const NP=900,pp=new Float32Array(NP*3),pc=new Float32Array(NP*3),pb=new Float32Array(NP*3),pv=new Float32Array(NP*3),pl=new Float32Array(NP);let particleCount=0,particleReplace=0;

function emit(x,y,z,vx,vy,vz,l,r,g,b){const k=particleCount<NP?particleCount++:particleReplace++%NP,o=k*3;pp[o]=x;pp[o+1]=y;pp[o+2]=z;pv[o]=vx;pv[o+1]=vy;pv[o+2]=vz;pl[k]=l;pb[o]=r;pb[o+1]=g;pb[o+2]=b;pc[o]=r;pc[o+1]=g;pc[o+2]=b}

// ---------- match flow ----------

let st='MENU',ps_,score=[0,0],tl=300,ot=0,cnt=0,gt=0,mt=0,simTime=0,kickoffAge=0;

// ---------- Supabase authenticated Realtime multiplayer ----------

// Protocol 3: 6 atomic seats, session-owned inputs, host-owned simulation.
// 100ms interpolation buffer; up to 4 pending writes decouple send cadence from ACKs.
// Supabase Realtime is a relay, not an anti-cheat server. No rollback/client prediction is claimed.
const SUPABASE_CONFIG=window.TEVIN_SUPABASE;
const MP={active:false,quick:'',endReason:'',role:'',slot:0,code:'',room:null,loaded:false,session:'',listeners:[],disconnects:[],seats:{},presence:{},inputs:{},lastInputs:{},seenJumps:{},localPaused:false,transport:false,seq:0,received:-1,round:0,publishClock:0,pending:0,lastSnapshot:0,snapshot:null,buffer:[],jump:0,matchBegun:false,force:true,closed:false,startRequested:false};
let multiplayerStore=null,mpBusy=false;
function localPlayer(){return cars[MP.active?MP.slot:0]||P1}
function remotePlayer(){return nearestOpponent(localPlayer())}
function mpStatus(text,kind=''){$('mp-status').textContent=text;$('mp-status').className=kind;$('nettag').textContent=MP.active?`${MP.code} · ${text}`:'';$('nettag').className=kind==='good'?'live':MP.active?'wait':'';mpLobby()}
function mpLobby(){const waiting=MP.active&&MP.loaded&&(st==='WAIT'||st==='PAUSE'&&ps_==='WAIT');$('lobby').hidden=!waiting;if(!waiting)return;$('lobby-code').textContent=MP.code;$('lobby-kind').textContent=MP.quick?'QUICK MATCH · PLAYERS FOUND':'PRIVATE MATCH · INVITE YOUR TEAM';$('lobby-code-label').textContent=MP.quick?'QUICK MATCH':'PRIVATE MATCH CODE';$('lobby-code').hidden=$('copy-code').hidden=$('lobby-code-help').hidden=!!MP.quick;$('lobby-detail').textContent=`${cfg.size}v${cfg.size} ${cfg.mode?'HEATSEEKER':'SOCCAR'} · ${Object.keys(MP.seats).length}/${cfg.size*2} PLAYERS · ${MP.quick?'Quick Match · Waiting for every driver to load.':'Empty seats become AI when the host starts.'}`;$('lobby-start').hidden=MP.role!=='host'||!!MP.quick;$('lobby-start').disabled=MP.localPaused||MP.startRequested;$('lobby-roster').textContent=Array.from({length:cfg.size*2},(_,k)=>`${k%2?'ORANGE':'BLUE'} ${1+(k>>1)}: ${MP.seats[k]?(MP.seats[k].session===MP.session?'YOU':MP.seats[k].name||'PLAYER'):'AI / OPEN'}`).join(' · ')}
function mpBusyUI(v){mpBusy=v;$('host-match').disabled=$('join-match').disabled=v}
function mpTimeout(promise,label,ms=15000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label+' timed out. Check your connection.')),ms)})]).finally(()=>clearTimeout(timer))}
function mpDatabase(){if(!multiplayerStore)throw Error('Connect to Supabase first.');return multiplayerStore}
let storeConnecting=null;
async function mpReady(){mpStatus('CONNECTING TO SUPABASE…');if(!multiplayerStore){if(!storeConnecting)storeConnecting=ENGINE.createMultiplayerStore(SUPABASE_CONFIG).then(db=>multiplayerStore=db).finally(()=>storeConnecting=null);await mpTimeout(storeConnecting,'Supabase sign-in',20000)}return multiplayerStore}
function mpListen(ref,event,handler){const session=MP.session,guarded=s=>{if(MP.session===session&&MP.active)handler(s)};ref.on(event,guarded,mpFailure);MP.listeners.push({ref,event,handler:guarded})}
function mpFailure(error){console.warn('Multiplayer',error);mpStatus(error.message||String(error),'bad');if(MP.active&&MP.loaded)mpFreeze('NETWORK ERROR — reconnect or quit')}
function randomRoomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code='';for(let k=0;k<6;k++)code+=chars[Math.random()*chars.length|0];return code}
function validNumber(v){return typeof v==='number'&&Number.isFinite(v)}
function mpReset(removeRoom=true){AUDIO.received=0;AUDIO.events.length=0;const room=MP.room,role=MP.role,session=MP.session,slot=MP.slot;for(const l of MP.listeners)l.ref.off(l.event,l.handler);MP.listeners.length=0;for(const d of MP.disconnects)d.cancel().catch(()=>{});MP.disconnects.length=0;
 if(room&&removeRoom){if(role==='host')room.remove().catch(()=>{});else{room.child('meta').transaction(m=>{if(m===null)return null;if(m.seats?.[slot]?.session!==session)return;delete m.seats[slot];return m},undefined,false).catch(()=>{});room.child('presence/'+session).remove().catch(()=>{});room.child('inputs/'+session).remove().catch(()=>{})}}
 Object.assign(MP,{active:false,quick:'',endReason:'',role:'',slot:0,code:'',room:null,loaded:false,session:'',seats:{},presence:{},inputs:{},lastInputs:{},seenJumps:{},localPaused:false,transport:false,seq:0,received:-1,round:0,publishClock:0,pending:0,lastSnapshot:0,snapshot:null,buffer:[],jump:0,matchBegun:false,force:true,closed:false,startRequested:false});mpStatus('Host a private room or enter a six-character code.')}
function mpClearInput(){for(const k in keys)keys[k]=0;for(const c of cars){c.jp=c.jh=0;Object.assign(c.inp,Z)}for(const s in MP.inputs)MP.seenJumps[s]=MP.inputs[s].jump||0;acc=0}
function mpFreeze(reason){if(!MP.loaded)return;if(st!=='PAUSE'){ps_=st;st='PAUSE';mpClearInput()}audioSilence();$('msg').style.opacity=0;$('pause').classList.add('on');$('pause-title').textContent=reason;$('res').disabled=!MP.localPaused;$('res').textContent=MP.localPaused?'RESUME':'WAITING FOR PLAYERS'}
function mpSetPause(value){if(!MP.active||!MP.room)return;MP.localPaused=!!value;const p=MP.presence[MP.session]||{};p.paused=!!value;MP.presence[MP.session]=p;if(value)mpFreeze('MATCH PAUSED');else{mpClearInput();if(ps_==='WAIT'){st='WAIT';$('pause').classList.remove('on');mpLobby()}}MP.room.child('presence/'+MP.session+'/paused').set(!!value).catch(mpFailure);MP.force=true}
function mpPlayersReady(){for(const k in MP.seats){const seat=MP.seats[k],p=MP.presence[seat.session];if(!p?.ready||!p.connected||p.paused)return false;if(+k!==0&&!MP.inputs[seat.session])return false}return !!MP.presence[MP.session]?.ready}
async function mpStartMatch(){if(!MP.active||MP.role!=='host'||MP.startRequested||MP.matchBegun)return;if(!mpPlayersReady()){mpStatus('Waiting for every player to load and resume.');return}MP.startRequested=true;mpLobby();try{const result=await MP.room.child('meta').transaction(m=>{if(m===null)return null;if(m.host!==MP.session)return;if(Object.values(m.seats||{}).some(seat=>!MP.presence[seat.session]?.ready||!MP.presence[seat.session]?.connected||MP.presence[seat.session]?.paused))return;m.locked=true;return m},undefined,false);if(!result.committed||!result.snapshot.val()?.locked)throw Error('A player is still loading. Try Start again.');MP.matchBegun=true;kickoff();mpStatus('LIVE · PLAYER 1','good');MP.force=true}catch(e){mpStatus(e.message,'bad')}finally{MP.startRequested=false;mpLobby()}}
function mpPauseGate(){if(!MP.active||!MP.loaded)return;if(MP.role==='guest'){if(MP.closed||!MP.transport||MP.lastSnapshot&&performance.now()-MP.lastSnapshot>2200)mpFreeze('CONNECTION INTERRUPTED');return}if(!MP.matchBegun){if(MP.localPaused)mpFreeze('LOBBY PAUSED');else{st='WAIT';$('pause').classList.remove('on')}$('msg').style.opacity=0;mpLobby();if(Object.keys(MP.seats).length===cfg.size*2&&mpPlayersReady())mpStartMatch();return}let blocked=MP.closed||!MP.transport,stale=blocked;for(const k in MP.seats){const s=MP.seats[k].session,p=MP.presence[s];if(!p?.ready||!p.connected)blocked=stale=true;if(p?.paused)blocked=true;if(+k!==0&&performance.now()-(MP.lastInputs[s]||0)>2200)blocked=stale=true}if(blocked)mpFreeze(stale?'CONNECTION INTERRUPTED':'MATCH PAUSED');else if(st==='PAUSE'){st=ps_||'COUNT';mpClearInput();$('pause').classList.remove('on');MP.force=true}mpLobby()}
function mpApplySeats(){for(let k=0;k<cars.length;k++){cars[k].color=PALETTE[cl(Math.round(Number(MP.seats[k]?.color??k%2)),0,PALETTE.length-1)];cars[k].body=cl(Math.round(Number(MP.seats[k]?.body??k%3)),0,2);cars[k].enabled=true}applyTeamColors();refreshCarModels()}
function attachRoomListeners(){const room=MP.room;mpListen(room.child('presence'),'value',s=>{MP.presence=s.val()||{};if(MP.loaded&&MP.matchBegun&&Object.values(MP.seats).some(x=>MP.presence[x.session]?.paused))mpFreeze('MATCH PAUSED');MP.force=true});
 mpListen(room.child('meta'),'value',s=>{const m=s.val();if(!m?.host){if(MP.quick&&MP.loaded){MP.closed=true;quit();chooseRoute('quick');showMenuScreen('play');SOC.error='The host left. Your party is still together; find another match.';socialUI();return}MP.closed=true;if(MP.loaded){mpFreeze('ROOM CLOSED');mpStatus('The host left. Quit to make or join another room.','bad')}return}const previousSeats=MP.seats;MP.seats=m.seats||{};if(MP.quick&&MP.role==='host'&&MP.matchBegun&&st!=='END'){const departed=Object.keys(previousSeats).find(k=>!MP.seats[k]);if(departed!==undefined){const winner=1-(Number(departed)%2);score[winner]=Math.max(score[0],score[1])+1;MP.endReason='MATCH FORFEIT · A PLAYER LEFT';$('s0').textContent=score[0];$('s1').textContent=score[1];endMatch();mpStatus('MATCH ENDED · PLAYER LEFT','good')}}if(MP.seats[MP.slot]?.session!==MP.session){MP.closed=true;mpFreeze('SEAT CLOSED');return}applySettings(m.settings);mpApplySeats();mpLobby()});
 if(MP.role==='host')mpListen(room.child('inputs'),'value',s=>{const values=s.val()||{};for(const id in values){const v=values[id];if(Number.isInteger(v.seq)&&v.seq>(MP.inputs[id]?.seq??-1)){MP.inputs[id]=v;MP.lastInputs[id]=performance.now()}}});
 else mpListen(room.child('state'),'value',s=>{const v=s.val();if(!validSnapshot(v)||v.seq<=MP.received)return;MP.received=v.seq;MP.lastSnapshot=performance.now();if(!MP.snapshot||v.round!==MP.snapshot.round||v.phase!==MP.snapshot.phase)MP.buffer.length=0;MP.snapshot=v;MP.buffer.push({at:MP.lastSnapshot,state:v});if(MP.buffer.length>10)MP.buffer.shift();if(MP.loaded)handleRemoteMatch(v)});
 mpListen(mpDatabase().ref('.info/connected'),'value',s=>{MP.transport=!!s.val();if(!MP.transport){if(MP.loaded)mpFreeze('CONNECTION INTERRUPTED');return}const d=room.child('presence/'+MP.session).onDisconnect();d.update({connected:false,paused:true}).catch(mpFailure);MP.disconnects.push(d);if(MP.loaded){MP.localPaused=true;room.child('presence/'+MP.session).update({connected:true,ready:true,paused:true}).catch(mpFailure)}})}
async function hostMatch(){if(mpBusy||starting||SOC.searching||SOC.busy)return;mpBusyUI(true);try{mpReset();sandbox=false;const db=await mpReady(),session=db.session;let room,code,res;for(let n=0;n<6;n++){code=randomRoomCode();room=db.ref('rooms/'+code);res=await mpTimeout(room.transaction(v=>v===null?{meta:{protocol:PROTOCOL,host:session,settings:matchSettings(),seats:{0:{session,color:cfg.color,body:cfg.body}},locked:false,createdAt:Date.now()}}:undefined),'Create room');if(res.committed)break}if(!res.committed)throw Error('Unable to reserve room. Try again.');Object.assign(MP,{active:true,role:'host',slot:0,session,room,code,seats:res.snapshot.val().meta.seats});$('room-code').value=code;attachRoomListeners();mpStatus('WAITING FOR PLAYERS');await startGame()}catch(e){mpReset();mpFailure(e)}finally{mpBusyUI(false)}}
async function joinMatch(){if(mpBusy||starting||SOC.searching||SOC.busy)return;const code=$('room-code').value.trim().toUpperCase().replace(/[^A-Z0-9]/g,'');if(MP.active&&MP.role==='host'&&MP.code===code){mpStatus('Share '+code+' with the second player or your team.');return}if(code.length!==6){mpStatus('Enter the six-character room code.','bad');return}mpBusyUI(true);try{mpReset();sandbox=false;const db=await mpReady(),room=db.ref('rooms/'+code),session=db.session,meta=(await mpTimeout(room.child('meta').once('value'),'Room lookup')).val();if(!meta?.host)throw Error('Match not found or host disconnected. Use a MATCH code here; party codes belong in Quick Match Party.');if(meta.protocol!==PROTOCOL)throw Error('Everyone must reload the latest Tevin League build.');
 const res=await mpTimeout(room.child('meta').transaction(m=>{if(m===null)return null;if(m.host!==meta.host||m.protocol!==PROTOCOL||m.locked)return;const count=cl(Number(m.settings?.size)||1,1,3)*2;m.seats=m.seats||{};for(let k=1;k<count;k++)if(!m.seats[k]){m.seats[k]={session,color:cfg.color,body:cfg.body};return m}},undefined,false),'Join room');const joined=res.snapshot?.val(),entry=Object.entries(joined?.seats||{}).find(([,seat])=>seat.session===session);if(!res.committed||!entry)throw Error('Room full or match already started. Ask the host for a new lobby.');applySettings(joined.settings);Object.assign(MP,{active:true,role:'guest',slot:Number(entry[0]),session,room,code,seats:joined.seats});attachRoomListeners();await startGame()}catch(e){mpReset();mpFailure(e)}finally{mpBusyUI(false)}}
function carPacket(c){return{x:c.p.x,y:c.p.y,z:c.p.z,q:c.q.toArray(),v:c.v.toArray(),w:c.w.toArray(),n:c.n.toArray(),boost:c.boost,ground:!!c.ground,input:{...c.inp},boosting:!!c.bst,color:c.color,touches:c.touches,goals:c.goals,topSpeed:c.topSpeed,boostUsed:c.boostUsed}}
function ballPacket(){return{p:ball.p.toArray(),v:ball.v.toArray(),w:ball.w.toArray(),last:ball.last,lastPlayer:ball.lastPlayer??-1,color:ball.color||0xdceeff}}
function mpSnapshot(){return{serve:heat.server,audio:audioPacket(),seq:++MP.seq,round:MP.round,phase:st,resume:ps_||'COUNT',endReason:MP.endReason||'',clock:tl,count:cnt,goalTime:gt,overtime:!!ot,score:[...score],cars:cars.map(carPacket),ball:ballPacket(),pads:PADS.map(p=>p.t)}}
function publishMultiplayer(dt){if(!MP.active||!MP.loaded||!MP.room||MP.closed)return;MP.publishClock+=dt;if(MP.pending>=4||(!MP.force&&MP.publishClock<.05))return;MP.publishClock=0;MP.force=false;MP.pending++;const session=MP.session;let path,value;if(MP.role==='host'){path='state';value=mpSnapshot()}else{human(localPlayer());path='inputs/'+session;value={seq:++MP.seq,round:MP.round,paused:MP.localPaused,jump:MP.jump,held:!!localPlayer().jh,controls:{...localPlayer().inp}}}MP.room.child(path).set(value).catch(e=>{if(MP.session===session)mpFailure(e)}).finally(()=>{if(MP.session===session)MP.pending--})}
function mpRemoteControls(c){const seat=MP.seats[c.id];if(!seat){bot(c);return}const p=MP.inputs[seat.session];Object.assign(c.inp,Z);c.jp=c.jh=0;if(!p||p.round!==MP.round||p.paused)return;for(const key in Z)c.inp[key]=cl(Number(p.controls?.[key])||0,-1,1);c.jp=p.jump>(MP.seenJumps[seat.session]||0)?1:0;MP.seenJumps[seat.session]=p.jump;c.jh=p.held?1:0}
function packetValid(p){return p&&[p.x,p.y,p.z].every(x=>Number.isFinite(x)&&Math.abs(x)<=1000)&&Number.isFinite(p.boost)&&p.boost>=0&&p.boost<=100&&finiteVector(p.q,4,1.01)&&p.q.reduce((sum,x)=>sum+x*x,0)>.5&&finiteVector(p.v,3,100)&&finiteVector(p.w,3,100)&&finiteVector(p.n,3,1.01)}
function mpReadCar(c,p,blend,age,previous=p){if(!packetValid(p)||!packetValid(previous))return;_a.set(previous.x,previous.y,previous.z);_b.set(p.x,p.y,p.z);c.p.lerpVectors(_a,_b,blend);_b.fromArray(p.v);c.p.addScaledVector(_b,age);c.q.fromArray(previous.q).normalize();_q1.fromArray(p.q).normalize();c.q.slerp(_q1,blend);c.v.copy(_b);if(p.w?.length===3)c.w.fromArray(p.w);if(p.n?.length===3)c.n.fromArray(p.n);c.boost=p.boost;c.ground=p.ground;c.bst=p.boosting?1:0;c.color=p.color||PALETTE[c.team];c.touches=p.touches||0;c.goals=p.goals||0;c.topSpeed=p.topSpeed||0;c.boostUsed=p.boostUsed||0;Object.assign(c.inp,p.input||Z);c.frameP.copy(c.p);c.frameQ.copy(c.q);c.prevP.copy(c.p);c.prevQ.copy(c.q)}
function applyMultiplayer(dt,snap=false){if(MP.role!=='guest'||!MP.snapshot)return;let a=MP.snapshot,b=a,blend=1,age=0;const target=performance.now()-100,buf=MP.buffer;if(!snap&&a.phase==='PLAY'&&buf.length){a=b=buf[0].state;for(let k=1;k<buf.length;k++){if(buf[k].at>=target){a=buf[k-1].state;b=buf[k].state;blend=cl((target-buf[k-1].at)/Math.max(1,buf[k].at-buf[k-1].at),0,1);break}a=b=buf[k].state}if(target>buf[buf.length-1].at)age=Math.min(.05,(target-buf[buf.length-1].at)/1000)}for(let k=0;k<cars.length;k++)mpReadCar(cars[k],b.cars[k],blend,age,a.cars[k]);if(a.ball?.p?.length===3&&b.ball?.p?.length===3){_a.fromArray(a.ball.p);_b.fromArray(b.ball.p);ball.p.lerpVectors(_a,_b,blend);ball.v.fromArray(b.ball.v);ball.p.addScaledVector(ball.v,age);ball.w.fromArray(b.ball.w);ball.last=b.ball.last;ball.lastPlayer=b.ball.lastPlayer;ball.color=b.ball.color;ball.frameP.copy(ball.p);ball.prevP.copy(ball.p)}}
function publishMatch(){MP.force=true}
function handleRemoteMatch(s){if(!MP.loaded||MP.role!=='guest')return;const changed=st!==s.phase,roundChanged=MP.round!==s.round;heat.server=Number.isInteger(s.serve)?s.serve:-1;MP.round=s.round;MP.endReason=s.endReason||'';tl=s.clock;cnt=s.count;gt=s.goalTime;ot=s.overtime?1:0;MP.matchBegun=s.phase!=='WAIT';if(Array.isArray(s.score)){score[0]=s.score[0];score[1]=s.score[1];$('s0').textContent=score[0];$('s1').textContent=score[1]}if(s.pads)for(let k=0;k<PADS.length;k++)PADS[k].t=s.pads[k]||0;if(roundChanged){kickoff(false);MP.round=s.round;mpClearInput();$('end').classList.remove('on');$('hud').style.display='block'}if(s.phase==='PAUSE'){applyMultiplayer(0,true);ps_=s.resume;mpFreeze('MATCH PAUSED')}else if(MP.localPaused){mpFreeze('PAUSE REQUESTED')}else{st=s.phase;$('pause').classList.remove('on');if(changed||roundChanged){mpClearInput();applyMultiplayer(0,true);if(st==='PLAY')msg('GO!',.8,'#4f8');if(st==='GOAL'){goalPulse=1;msg('GOAL!',3.2,'#fff')}if(st==='END')endMatch(false)}}audioReceive(s);updateServeHint();if(st==='COUNT')msg(Math.max(1,Math.ceil(cnt)),.2,'#fff');mpStatus('LIVE · PLAYER '+(MP.slot+1),'good')}
async function mpLoaded(){if(multiplayerStore?.readyRoom)await multiplayerStore.readyRoom(MP.code);MP.loaded=true;MP.localPaused=false;kickoff(false);st='WAIT';mpClearInput();$('copy-status').textContent='';mpLobby();MP.force=true;await MP.room.child('presence/'+MP.session).set({ready:true,paused:false,connected:true});if(MP.role==='guest'&&MP.snapshot)handleRemoteMatch(MP.snapshot)}


// TEVIN 5 — match rules, sandbox and presentation. Embedded by build.cjs.
// All mutators affect every car, including bots. Fixed solver dt never changes.
const PALETTE=[0x2a6bff,0xff7a20,0x19dbd0,0xa875ff,0xf04c73,0x97df35,0xe5edf4,0xffcc39];
const COLOR_NAMES=['Cobalt','Solar','Glacier','Violet','Crimson','Lime','Pearl','Gold'];
// V7.5: seat paint remains personal data; effective paint is a host-owned match rule.
const teamPalette=[PALETTE[0],PALETTE[1]];
let arenaThemeKey='';
function teamHex(team){return '#'+teamPalette[team].toString(16).padStart(6,'0')}
function applyTeamColors(){
 for(let t=0;t<2;t++){
  const index=MP.active?cl(Math.round(Number(MP.seats[t]?.color??t)),0,7):t===0?cfg.color:1;
  teamPalette[t]=PALETTE[index];
 }
 // Equal captain paints still need two clearly distinguishable goal ends.
 if(teamPalette[0]===teamPalette[1])teamPalette[1]=teamPalette[0]===PALETTE[1]?PALETTE[0]:PALETTE[1];
 for(const c of cars){const personal=MP.active?PALETTE[cl(Math.round(Number(MP.seats[c.id]?.color??c.team)),0,7)]:c.id===0?PALETTE[cfg.color]:PALETTE[c.team];c.color=cfg.teamColors?teamPalette[c.team]:personal;if(inited)paintCar(c.id)}
 for(let t=0;t<2;t++){$('s'+t).style.background=teamHex(t);$('s'+t).style.setProperty('--team-color',teamHex(t));$('s'+t).style.color='#fff';$('s'+t).style.textShadow='0 2px 4px #000';}
 applyArenaTheme();
}
function applyArenaTheme(){
 if(!inited||!scene)return;
 const key=teamPalette.join();if(arenaThemeKey===key)return;arenaThemeKey=key;
 for(let k=0;k<WM.length;k++){const m=WM[k],fresh=wallMat(teamHex(k===2?1:0)),old=m.map;m.map=fresh.map;m.emissiveMap=fresh.emissiveMap;m.needsUpdate=true;old?.dispose();fresh.dispose()}
 for(const l of goalLights)l.color.setHex(teamPalette[l.userData.team]);
 scene.traverse(o=>{const m=o.material;if(!m||Array.isArray(m))return;
  if(m.name==='Championship turf'){const fresh=ENGINE.pitchMaterial(ren,teamPalette);m.map?.dispose();m.map=fresh.map;fresh.normalMap?.dispose();fresh.dispose();m.needsUpdate=true;}
  if(m.userData.team!==undefined)m.color.setHex(teamPalette[m.userData.team]);
 });
}
// Only authority draws a server. Guests receive its ID and all poses in the same
// snapshot. No random client kickoff, no corner race, no special physics/controls.
function setupHeatServe(){
 if(cfg.mode!==1){heat.server=-1;return}
 if(MP.active&&MP.role==='guest')return;
 const eligible=cars.filter(c=>c.enabled);if(!eligible.length){heat.server=-1;return}
 const server=eligible[Math.floor(Math.random()*eligible.length)];heat.server=server.id;
 const side=server.team?1:-1;ball.p.set(0,BR,side*24);
 for(const c of cars){const sign=c.team?1:-1;resetCar(c,c===server?0:((c.id>>1)-1)*5,c===server?side*30:sign*42);c.q.setFromAxisAngle(Y3,sign*Math.PI/2);c.prevQ.copy(c.q);c.frameQ.copy(c.q);}
 ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);
}
let sandbox=false,previewTime=0;
const heat={target:0,speed:18,cooldown:0,server:-1},heatDirection=new V3();
function matchSettings(){return{mode:cfg.mode,size:cfg.size,lvl:cfg.lvl,len:cfg.len,speed:cfg.speed,gravity:cfg.gravity,unlimited:cfg.unlimited,teamColors:cfg.teamColors}}
function applySettings(v){if(!v)return;cfg.mode=v.mode===1?1:0;cfg.size=cl(Math.round(Number(v.size)||1),1,3);cfg.lvl=cl(Math.round(Number(v.lvl)||0),0,2);cfg.len=[120,180,300].includes(v.len)?v.len:300;cfg.speed=cl(Number(v.speed)||1,.5,2);cfg.gravity=cl(Number(v.gravity)||1,.25,1.5);cfg.unlimited=!!v.unlimited;cfg.teamColors=v.teamColors!==false}
function configureCars(){
 const count=cfg.size*2;while(cars.length<count){const c=mkCar(cars.length%2);cars.push(c)}cars.length=count;
 for(let k=0;k<count;k++){const c=cars[k];c.id=k;c.body=k%3;c.color=PALETTE[c.team];c.enabled=true;c.touches=c.goals=c.topSpeed=c.boostUsed=0;
  if(sandbox&&!MP.active)c.enabled=k===0||(c.team===0?k/2<=cfg.allies:(k-1)/2<cfg.enemies);
 }
 const local=localPlayer();local.color=PALETTE[cfg.color];local.body=cfg.body;if(MP.active)mpApplySeats();else applyTeamColors();
 PHYS.g=6.5*cfg.gravity;PHYS.car.maxSpeed=23*cfg.speed;PHYS.ground.engineF=3060*cfg.speed;PHYS.ground.engineKnee=14*cfg.speed;PHYS.ground.engineVmax=14.1*cfg.speed;PHYS.boost.F=1908*cfg.speed;PHYS.boost.softFrom=21*cfg.speed;
 $('training-hud').hidden=!sandbox||MP.active;$('match-kind').textContent=(sandbox?'SANDBOX · ':'')+(cfg.mode?'HEATSEEKER':'SOCCAR')+' · '+cfg.size+'v'+cfg.size;$('match-label').textContent=(cfg.mode?'HEATSEEKER':'SOCCAR')+' · '+cfg.size+'V'+cfg.size;
}
function spawnCar(c){const row=c.id>>1,side=c.team?1:-1;resetCar(c,row===0?side*20.48:row===1?-side*2.56:0,side*(row===0?25.6:row===1?38.4:46.08));}
function nearestOpponent(c){let best=cars[1-c.team],dist=Infinity;for(const x of cars)if(x.enabled&&x.team!==c.team){const d=x.p.distanceToSquared(ball.p);if(d<dist){dist=d;best=x}}return best}
function teamRole(c){let ahead=0;const d=c.p.distanceToSquared(ball.p);for(const mate of cars)if(mate.enabled&&mate!==c&&mate.team===c.team){const md=mate.p.distanceToSquared(ball.p);if(md<d-1||Math.abs(md-d)<=1&&mate.id<c.id)ahead++}return ahead}
function teamPlan(c){
 if(cfg.mode===1&&ball.last<0&&heat.server>=0){c.ai.mode=c.id===heat.server?'COMMIT':'DEFEND';c.ai.commit=0;if(c.id===heat.server){c.ai.target.copy(ball.p);c.ai.target.z+=c.team?-1:1;c.ai.intercept.copy(ball.p)}else c.ai.target.set(((c.id>>1)-1)*5,0,(c.team?1:-1)*42);return;}
 const rank=teamRole(c),ai=c.ai,atk=c.team?-1:1;if(rank){ai.mode=rank===1?'SUPPORT':'DEFEND';ai.commit=0;
  ai.target.set(cl(ball.p.x*.55+(rank===1?(ball.p.x>0?-7:7):0),-24,24),0,cl(ball.p.z-atk*(rank===1?14:27),-43,43));
  if(kickoffAge<5&&ball.last<0)ai.target.set(rank===1?0:8,0,-atk*(rank===1?21:42));
 }
 if(cfg.mode===1&&heat.target===-atk){ai.mode='SAVE';const vz=ball.v.z,t=vz*heat.target>1?cl((-atk*44-ball.p.z)/vz,0,2):0;ai.target.set(cl(ball.p.x+ball.v.x*t,-GX+1,GX-1),0,-atk*43+rank*atk*3);ai.intercept.set(ai.target.x,cl(ball.p.y+ball.v.y*t,BR,7),ai.target.z);}
}
// Inspired by the published Heatseeker rules, independently implemented:
// https://www.rocketleague.com/news/heatseeker-mode-launches-april-16
// Bounded steering, not teleportation. Each distinct touch raises speed to 42m/s.
function heatTouch(c){if(cfg.mode!==1)return;if(heat.cooldown>0&&ball.lastPlayer===c.id)return;heat.target=c.team?-1:1;heat.speed=Math.min(42,heat.speed+2);heat.cooldown=.18;}
function heatSteer(p,v,dt,target,speed){if(!target)return;heatDirection.set(-p.x,2.4-p.y,target*(HZ+3)-p.z).normalize();v.lerp(heatDirection.multiplyScalar(speed),1-Math.exp(-3.4*dt));if(v.lengthSq()>.01)v.setLength(speed)}
function resetTraining(kind){if(!sandbox||MP.active)return;mpClearInput();if(kind==='car')spawnCar(localPlayer());else{ball.p.set(0,BR,0);ball.v.set(0,0,0);ball.w.set(0,0,0);ball.last=-1;ball.lastPlayer=-1;ball.color=0xdceeff;heat.target=0;heat.speed=18;heat.cooldown=0;setupHeatServe();ball.frameP.copy(ball.p);ball.prevP.copy(ball.p)}if(st==='PAUSE')pause();}
function changeBots(team,delta){if(!sandbox||MP.active)return;const key=team?'enemies':'allies',max=cfg.size-(team?0:1);cfg[key]=cl(cfg[key]+delta,0,max);for(const c of cars){const enabled=c.id===0||(c.team===0?c.id/2<=cfg.allies:(c.id-1)/2<cfg.enemies);if(enabled&&!c.enabled)spawnCar(c);c.enabled=enabled;}if(cfg.mode===1&&ball.last<0&&!cars[heat.server]?.enabled)setupHeatServe();trainingLabels();}
function trainingLabels(){$('training-roster').textContent=cfg.allies+' allied AI · '+cfg.enemies+' opposing AI';$('training-boost').textContent=cfg.unlimited?'BOOST: UNLIMITED':'BOOST: NORMAL';}
function setupModesUI(){
 $('team-colors').checked=cfg.teamColors;$('team-colors').onchange=()=>{if(MP.active||SOC.searching){$('team-colors').checked=cfg.teamColors;return}cfg.teamColors=$('team-colors').checked;savePresentation();applyTeamColors();};
 const options=[['size','TEAM SIZE',['1v1','2v2','3v3'],[1,2,3]],['mode','PLAYLIST',['SOCCAR','HEATSEEKER'],[0,1]],['speed','CAR SPEED',['1×','1.5×','2×'],[1,1.5,2]],['gravity','GRAVITY',['LOW','NORMAL','HIGH'],[.5,1,1.5]],['unlimited','BOOST',['NORMAL','UNLIMITED'],[false,true]]];
 for(const [key,label,names,values] of options){const row=document.createElement('div');row.className='row';const title=document.createElement('label');title.textContent=label;row.appendChild(title);names.forEach((name,i)=>{const button=document.createElement('button');button.className='seg'+(cfg[key]===values[i]?' on':'');button.textContent=name;button.setAttribute('aria-pressed',String(cfg[key]===values[i]));settingButtons.push({button,key,value:values[i]});button.onclick=()=>{cfg[key]=values[i];for(let n=0;n<names.length;n++){const b=row.children[n+1];b.classList.toggle('on',n===i);b.setAttribute('aria-pressed',String(n===i))}cfg.allies=cfg.size-1;cfg.enemies=cfg.size;updateMatchSummary();$('playlist-note').textContent=cfg.mode?'HEATSEEKER · First to 7. Touch to redirect. Backboards return fire.':'SOCCAR · Timed match. Highest score wins. Sudden-death overtime.'};row.appendChild(button)});$(['mode','size'].includes(key)?'mode-rows':'mutator-rows').appendChild(row)}
 PALETTE.forEach((color,i)=>{const button=document.createElement('button');button.className='swatch'+(i===cfg.color?' on':'');button.style.background='#'+color.toString(16).padStart(6,'0');button.textContent=COLOR_NAMES[i];button.setAttribute('aria-label',COLOR_NAMES[i]+' car paint');button.onclick=()=>{cfg.color=i;P1.color=color;applyTeamColors();savePresentation();updateMatchSummary();$('paint-name').textContent=COLOR_NAMES[i];$('swatches').querySelectorAll('button').forEach((b,j)=>b.classList.toggle('on',i===j));if(inited)paintCar(0);};$('swatches').appendChild(button)});
 $('sandbox-start').onclick=()=>{sandbox=true;cfg.allies=cfg.size-1;cfg.enemies=cfg.size;startOfflineGame(true)};
 $('preview-car').onclick=async()=>{if(starting)return;starting=true;$('preview-car').disabled=true;try{configureCars();await init3d();$('menu').classList.add('live-preview')}catch(e){$('start-status').textContent='Car preview unavailable: '+e.message}finally{starting=false;$('preview-car').disabled=false}};
 $('training-reset-ball').onclick=()=>resetTraining('ball');$('training-reset-car').onclick=()=>resetTraining('car');
 for(const [id,team,delta] of [['ally-add',0,1],['ally-remove',0,-1],['enemy-add',1,1],['enemy-remove',1,-1]])$(id).onclick=()=>changeBots(team,delta);
 $('training-boost').onclick=()=>{if(sandbox&&!MP.active){cfg.unlimited=!cfg.unlimited;trainingLabels()}};
 $('training-open').onclick=()=>{if(sandbox&&!MP.active){pause();$('training-panel').hidden=false}};
 $('lobby-start').onclick=mpStartMatch;
 for(const name of ['play','garage','training'])$('nav-'+name).onclick=()=>{$('garage-panel').hidden=name!=='garage';$('play-panel').hidden=name==='garage';$('sandbox-start').classList.toggle('featured',name==='training');$('menu-caption').textContent=name==='garage'?'YOUR CAR. YOUR SIGNATURE.':name==='training'?'BUILD YOUR OWN PLAYGROUND.':'FIND YOUR NEXT MATCH.';};
}
function paintCar(id){const m=cm[id],c=cars[id];if(!m||!c||m.userData.paintColor===c.color)return;m.userData.paintColor=c.color;for(const mat of m.userData.paintMaterials||[])mat.color.setHex(c.color);m.userData.f?.traverse(o=>{if(o.material?.color)o.material.color.setHex(c.color)});}
function preparePaint(m,color){const mats=new Set();m.traverse(o=>{for(const mat of (Array.isArray(o.material)?o.material:[o.material]))if(mat?.color&&mat.color.getHex()===color)mats.add(mat)});m.userData.paintMaterials=[...mats];}
function showPodium(){const winner=score[0]>score[1]?0:1;$('end').setAttribute('data-winner',winner?'orange':'blue');$('winner-team').textContent=(winner?'ORANGE':'BLUE')+' TEAM';$('winner-team').style.color=teamHex(winner);$('end').style.setProperty('--winner-color',teamHex(winner));$('podium-cards').innerHTML='';const winning=cars.filter(c=>c.enabled&&c.team===winner);for(const c of winning){const card=document.createElement('div');card.className='podium-card';card.style.borderColor='#'+c.color.toString(16).padStart(6,'0');const humanPlayer=MP.active?!!MP.seats[c.id]:c===P1;card.textContent=(c===localPlayer()?'YOU':humanPlayer?(MP.seats[c.id]?.name||'PLAYER '+(c.id+1)):'AI '+(c.id+1))+' · '+c.goals+' GOALS · '+c.touches+' TOUCHES';$('podium-cards').appendChild(card)}}
function renderShowcase(dt){if(!inited||st==='MENU'&&(menuScreen!=='garage'||!$('menu').classList.contains('live-preview')))return;previewTime+=dt;const ending=st==='END';garageStage.visible=!ending;grassM.visible=ending;cam.fov=ending?62:48;cam.updateProjectionMatrix();const winner=score[0]>score[1]?0:1;let count=0;for(const c of cars)if(c.enabled&&c.team===winner)count++;let n=0;for(let k=0;k<cm.length;k++){const m=cm[k],c=cars[k];m.visible=ending?c.enabled&&c.team===winner:k===0;paintCar(k);if(m.visible){const x=ending?(n++-(count-1)/2)*3.4:0;m.position.set(x,.485,0);m.quaternion.setFromAxisAngle(Y3,ending?Math.PI*.4:Math.PI*.22+Math.sin(previewTime*.2)*.12);m.userData.f.visible=false;}}
 bm.visible=false;for(let k=0;k<contactShadows.length;k++){const s=contactShadows[k],m=cm[k];s.visible=!!m?.visible;if(s.visible){s.position.set(m.position.x,.018,0);s.material.opacity=.35}}
 if(ending){if(cam.view?.enabled)cam.clearViewOffset()}else cam.setViewOffset(innerWidth,innerHeight,innerWidth>800?innerWidth*.2:0,innerWidth>800?0:innerHeight*.24,innerWidth,innerHeight);cam.position.set(ending?1.5:3.7,ending?2.9:1.6,ending?10:5.1);cam.lookAt(0,.6,0);updateWind(dt,true);pts.count=0;if(cfg.hi){ren.shadowMap.needsUpdate=true;sun.shadow.needsUpdate=true}pipeline.render();
}

function syncMenuSettings(){for(const {button,key,value} of settingButtons){const selected=cfg[key]===value;button.classList.toggle('on',selected);button.setAttribute('aria-pressed',String(selected))}updateBotBrief();$('playlist-note').textContent=cfg.mode?'HEATSEEKER · First to 7. Touch to redirect. Backboards return fire.':'SOCCAR · Timed match. Highest score wins. Sudden-death overtime.'}

function updateServeHint(){
 const visible=cfg.mode===1&&heat.server>=0&&ball.last<0&&(st==='COUNT'||st==='PLAY');
 const el=$('serve-hint');el.hidden=!visible;if(!visible)return;
 const server=cars[heat.server];if(!server){el.hidden=true;return}
 el.style.color=teamHex(server.team);
 el.textContent=server===localPlayer()?'YOU SERVE · HIT THE BALL TOWARD THEIR GOAL':server.team===localPlayer().team?'YOUR TEAM SERVES · COVER YOUR GOAL':'OPPONENT SERVES · GET READY TO RETURN';
}


// V6 menu: home -> one focused destination. Graphics/car choices are local;
// host-owned match rules remain separate from those saved presentation preferences.
let menuScreen='home',playRoute='quick',previewJob=null,privateAction='create',partyAction='create',partyReturn='home';
const BODY_NAMES=['Octane','Fennec','Dominus'],BODY_IDS=['octane','fennec','dominus'];
function savePresentation(){try{localStorage.setItem('tevin.presentation.v6',JSON.stringify({performance:!cfg.hi,body:cfg.body,color:cfg.color,teamColors:cfg.teamColors}))}catch(_){}}
function updateMatchSummary(){$('match-summary').textContent=(cfg.mode?'HEATSEEKER':'SOCCAR')+'  /  '+cfg.size+'v'+cfg.size+'  /  '+(playRoute==='quick'?'PUBLIC QUEUE':playRoute==='online'?'PRIVATE ROOM':playRoute==='training'?'FREE PRACTICE':'OFFLINE');$('menu-context').textContent=BODY_NAMES[cfg.body]+' · '+COLOR_NAMES[cfg.color]+' · '+(cfg.hi?'DETAIL':'CHROMEBOOK');}
// Private matches and public-queue parties are separate destinations. Joining
// a private match uses the host's rules, so hide local settings on that path.
function privateMenuUI(){const online=playRoute==='online',joining=online&&privateAction==='join';$('private-actions').hidden=!online;$('team-colors-control').hidden=joining;$('private-create').setAttribute('aria-pressed',String(privateAction==='create'));$('private-join').setAttribute('aria-pressed',String(privateAction==='join'));for(const id of ['mode-rows','playlist-note','match-summary'])$(id).hidden=joining;$('custom-rules').hidden=playRoute==='quick'||joining;$('host-match').hidden=privateAction!=='create';$('private-join-form').hidden=privateAction!=='join';$('private-help').textContent=privateAction==='create'?'Choose your rules below, create the match, then share its MATCH CODE.':'Enter your friend’s MATCH CODE. Their playlist, team size and rules load automatically.';$('private-party-note').hidden=!SOC.party;}
function choosePrivateAction(action){privateAction=action;privateMenuUI();$('mp-status').textContent='';if(action==='join')$('room-code').focus?.()}
function choosePartyAction(action){partyAction=action;socialUI();if(action==='join')$('party-code-input').focus?.()}
function menuBack(){audioSample('uiBack',.38);showMenuScreen(menuScreen==='party'?partyReturn:'home')}
function chooseRoute(route){if(typeof SOC!=='undefined'&&SOC.searching&&route!=='quick')cancelQuickMatch();playRoute=route;$('quick-panel').hidden=route!=='quick';for(const name of ['quick','offline','online','training'])$('choose-'+name).setAttribute('aria-pressed',String(name===route));$('go').hidden=route!=='offline';$('sandbox-start').hidden=route!=='training';$('mp-panel').hidden=route!=='online';$('mp-status').hidden=route!=='online';$('route-help').textContent=route==='quick'?'Play against other people online. Search solo or with a party on your team.':route==='online'?'Play in an invite-only match. Friends join individually with a match code.':route==='training'?'Endless practice. Change AI and boost with F2; reset the ball with R.':'Play a complete match with AI teammates and opponents.';updateMatchSummary();socialUI();privateMenuUI()}
function showMenuScreen(screen){if(screen==='party'&&menuScreen!=='party')partyReturn=menuScreen;menuScreen=screen;for(const name of ['home','play','garage','settings','party'])$(name+'-panel').hidden=name!==screen;$('menu').setAttribute('data-screen',screen);$('menu-back').hidden=screen==='home';$('menu-back').textContent=screen==='party'&&partyReturn!=='home'?'← BACK TO '+partyReturn.toUpperCase():'← HOME';$('menu-location').textContent=screen==='home'?'HOME':screen==='party'?'QUICK MATCH / PARTY':'HOME / '+screen.toUpperCase();$('menu').classList.toggle('live-preview',screen==='garage'&&!!inited);$('start-status').textContent='';if(screen==='play')chooseRoute(playRoute);if(screen==='garage')previewGarage();updateMatchSummary();socialUI()}
async function previewGarage(){if(previewJob)return previewJob;if(starting)return;starting=true;$('go').disabled=$('sandbox-start').disabled=true;$('preview-car').disabled=true;$('garage-status').textContent='Preparing your '+BODY_NAMES[cfg.body]+'…';
 previewJob=(async()=>{let transition;try{configureCars();transition=await loadingBegin('YOUR GARAGE',BODY_NAMES[cfg.body]+' · Preparing your car',graphicsReady());await init3d();const changed=cm.some((m,i)=>m.userData.body!==(cars[i].body||0)||m.userData.simple===!!cfg.models);refreshCarModels();if(changed&&ren?.compileAsync){await loadingStage(94,'Preparing your selected car');ENGINE.status.warming=true;try{await ren.compileAsync(scene,cam)}finally{ENGINE.status.warming=false}}if(menuScreen==='garage')$('menu').classList.add('live-preview');$('garage-status').textContent=BODY_NAMES[cfg.body]+' · '+COLOR_NAMES[cfg.color]+' · READY';await loadingEnd(transition);$('preview-car').focus?.()}catch(e){loadingAbort(transition);try{dispose3d()}catch(_){}$('menu').classList.remove('live-preview');$('garage-status').textContent='Preview unavailable. Try Performance mode in Settings.';console.warn('Garage preview',e)}finally{starting=false;$('go').disabled=$('sandbox-start').disabled=false;$('preview-car').disabled=false;previewJob=null}})();return previewJob;
}
function setupMenu(){
 $('nav-play').onclick=()=>{if(!INTRO.manualPause)introStart();openPlaySelection()};$('nav-garage').onclick=()=>showMenuScreen('garage');$('nav-settings').onclick=()=>showMenuScreen('settings');$('nav-training').onclick=()=>{chooseRoute('training');showMenuScreen('play')};$('menu-back').onclick=menuBack;$('preview-car').onclick=previewGarage;
 $('private-create').onclick=()=>choosePrivateAction('create');$('private-join').onclick=()=>choosePrivateAction('join');$('party-create-tab').onclick=()=>choosePartyAction('create');$('party-join-tab').onclick=()=>choosePartyAction('join');$('quick-manage-party').onclick=()=>showMenuScreen('party');$('party-private-link').onclick=()=>{chooseRoute('online');showMenuScreen('play')};
 for(const name of ['quick','offline','online','training'])$('choose-'+name).onclick=()=>chooseRoute(name);
 BODY_NAMES.forEach((name,i)=>{const b=document.createElement('button');b.textContent=name.toUpperCase();b.setAttribute('aria-pressed',String(cfg.body===i));b.onclick=()=>{cfg.body=i;P1.body=i;for(const [j,button] of Array.from($('body-options').children).entries())button.setAttribute('aria-pressed',String(i===j));savePresentation();updateMatchSummary();previewGarage()};$('body-options').appendChild(b)});
 $('performance-mode').checked=!cfg.hi;$('performance-mode').onchange=()=>{cfg.hi=$('performance-mode').checked?0:1;cfg.models=1;try{localStorage.setItem("tevin.graphics.v9",cfg.hi?"detail":"chromebook")}catch(_){}savePresentation();$('quality-description').textContent=cfg.hi?'DETAIL · Richer shadows and turf. Best on faster devices.':'CHROMEBOOK · Detailed cars, lighter turf and adaptive resolution. Built for smooth play.';$('garage-performance').hidden=true;updateMatchSummary()};$('performance-mode').onchange();
 $('paint-name').textContent=COLOR_NAMES[cfg.color];chooseRoute('offline');showMenuScreen('home');
}
function createCarVisual(c){const visual=cfg.models?ENGINE.importedCar(ren,BODY_IDS[c.body||0],c.color,assetTextures):carMesh2('#'+c.color.toString(16).padStart(6,'0'),'#d9efff');const m=fitCarVisual(visual,c);m.userData.body=c.body||0;m.userData.simple=!cfg.models;preparePaint(m,c.color);m.traverse(o=>{o.castShadow=!!o.isMesh&&!o.material.transparent});return m}
function fitCarVisual(visual,c){
 const spec=bodyPhysics(c),flame=visual.userData.f;visual.remove(flame);const box=new THREE.Box3().setFromObject(visual),size=box.getSize(new V3());visual.add(flame);const m=new THREE.Group();m.userData={...visual.userData};visual.scale.setScalar(spec.half[0]*2*1.06/size.x);visual.position.set(spec.center[0]-(box.min.x+size.x/2)*visual.scale.x,-spec.height-box.min.y*visual.scale.y,-(box.min.z+size.z/2)*visual.scale.z);m.add(visual);return m;
}
function refreshCarModels(){if(!inited)return;for(let k=0;k<cars.length;k++){const old=cm[k],c=cars[k];if(!old||old.userData.body===(c.body||0)&&old.userData.simple===!cfg.models)continue;const next=createCarVisual(c);next.position.copy(old.position);next.quaternion.copy(old.quaternion);scene.remove(old);scene.add(next);cm[k]=next;const geos=new Set(),mats=new Set();old.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)mats.add(m)});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());if(pipeline?.refreshVisibility)pipeline.refreshVisibility();ren.shadowMap.needsUpdate=true;sun.shadow.needsUpdate=true;}}


// Public matchmaking. Supabase is a client-coordinated relay, not a trusted
// ranked server. Atomic bucket transactions reserve complete parties together.
// Leases use server-adjusted time. Never publish user email or account identity.
const SOCIAL_ROOT='rooms/_tevin_social_v7',SOCIAL_LEASE=22000;
const SOC={id:'',name:'',offset:0,connected:true,ready:false,party:null,partyCode:'',partyData:null,partyListener:null,partyDisconnect:null,
 reservation:null,queue:null,queueListener:null,ticket:'',owner:false,searching:false,matching:false,entering:false,entered:false,epoch:0,since:0,queueData:null,busy:false,error:'',pulseBusy:false};
function socialNow(){return Date.now()+SOC.offset}
function socialName(){return ($('player-name').value||SOC.name||'DRIVER').trim().replace(/[<>\u0000-\u001f]/g,'').slice(0,20)||'DRIVER'}
function socialProfile(){return{protocol:PROTOCOL,session:SOC.id,name:socialName(),body:cfg.body,color:cfg.color,teamColors:cfg.teamColors}}
function partyMembers(p=SOC.partyData){return Object.entries(p?.members||{}).filter(([,m])=>m&&typeof m.name==='string'&&Number.isFinite(m.joined)).sort((a,b)=>a[1].joined-b[1].joined||a[0].localeCompare(b[0]))}
function memberLive(m,now=socialNow()){return m.connected!==false&&now-m.seen<SOCIAL_LEASE}
function partyLeader(){return !SOC.party||SOC.partyData?.leader===SOC.id}
function socialError(e){SOC.error=e.message||String(e);socialUI();console.warn('Social lobby',e)}
function socialUI(){
 const members=partyMembers(),leader=partyLeader(),live=members.filter(([,m])=>memberLive(m));
 $('queue-dock').hidden=!SOC.searching||menuScreen==='play';$('queue-dock').textContent=SOC.entering?'MATCH FOUND · LOADING':'SEARCHING · VIEW QUEUE';
 $('party-toggle').textContent=SOC.party?'PARTY · '+live.length+'/3':'QUICK MATCH PARTY';$('party-actions').hidden=!!SOC.party;$('party-create').hidden=!!SOC.party||partyAction!=='create';$('party-join-row').hidden=!!SOC.party||partyAction!=='join';$('party-create-tab').setAttribute('aria-pressed',String(partyAction==='create'));$('party-join-tab').setAttribute('aria-pressed',String(partyAction==='join'));
 $('party-create').disabled=$('party-join').disabled=SOC.busy;$('party-connected').hidden=!SOC.party;$('party-code-display').textContent=SOC.partyCode;$('party-roster').textContent=members.map(([id,m])=>(id===SOC.partyData.leader?'★ ':'')+m.name+(id===SOC.id?' (YOU)':'')+' — '+(!memberLive(m)?'OFFLINE':m.ready?'READY':'NOT READY')).join('\n');
 $('party-ready').textContent=SOC.ready?'READY ✓ · CLICK TO UNREADY':'I’M READY';$('party-ready').disabled=SOC.searching||SOC.busy;$('party-leave').disabled=SOC.busy;
 $('party-status').textContent=SOC.error||(SOC.busy?'CONNECTING…':!SOC.party?partyAction==='create'?'Create a party to get a code for your teammates.':'Enter a PARTY code shared by your team leader.':SOC.searching?'Party is searching together. Cancel to change the roster.':leader?'Mark yourself Ready, then choose Quick Match. Everyone must be ready before you search.':'Mark yourself Ready. Your leader chooses the playlist and starts searching for everyone.');
 $('quick-find').hidden=SOC.searching;$('quick-cancel').hidden=!SOC.searching;$('quick-find').disabled=SOC.busy||!!SOC.party&&!leader;
 $('quick-status').textContent=SOC.error||(SOC.searching?SOC.entering?'MATCH FOUND · PREPARING ARENA…':`SEARCHING · ${Math.floor((socialNow()-SOC.since)/1000)}s · ${queuePopulation()} drivers in this playlist`:'Join the public queue. Matches start when both teams have real players.');
 $('quick-party').textContent=SOC.party?`PARTY ${SOC.partyCode} · ${members.length} DRIVERS · ${leader?'YOU ARE LEADER':'LEADER CONTROLS SEARCH'}`:'SOLO · Search now to play with other people.';
 $('player-name').disabled=SOC.searching;$('custom-rules').hidden=playRoute==='quick'||playRoute==='online'&&privateAction==='join';$('quick-manage-party').textContent=SOC.party?'MANAGE PARTY →':'TEAM UP WITH FRIENDS →';
 for(const {button,key} of settingButtons)if(key==='size'||key==='mode')button.disabled=SOC.searching;
}
function queuePopulation(){return Object.values(SOC.queueData?.tickets||{}).filter(t=>!t.match&&socialNow()-t.seen<SOCIAL_LEASE).reduce((n,t)=>n+(t.members?.length||0),0)}
let socialConnectionListening=false;
async function socialConnect(){if(!SOC.id)SOC.id=crypto.randomUUID();const db=await mpReady();SOC.id=db.session;if(!socialConnectionListening){socialConnectionListening=true;SOC.offset=Number((await mpTimeout(db.ref('.info/serverTimeOffset').once('value'),'Server clock')).val())||0;db.ref('.info/serverTimeOffset').on('value',s=>{SOC.offset=Number(s.val())||0});db.ref('.info/connected').on('value',s=>{SOC.connected=!!s.val();if(!SOC.connected&&SOC.searching)cancelQuickMatch('Connection lost. Reconnect and search again.',false);if(SOC.connected&&SOC.party){SOC.partyDisconnect=SOC.party.child('members/'+SOC.id).onDisconnect();SOC.partyDisconnect.update({connected:false,ready:false,seen:0}).then(()=>socialHeartbeat()).catch(socialError)}})}return db}
function cleanParty(p,now){if(!p)return p;for(const [id,m] of partyMembers(p))if(now-m.seen>SOCIAL_LEASE)delete p.members[id];const members=partyMembers(p);if(!members.length)return null;if(!p.members[p.leader])p.leader=members[0][0];if(p.queue&&(p.queue.owner!==p.leader||p.queue.members?.some(id=>!p.members[id])))delete p.queue;return p}
async function bindParty(ref,code){
 SOC.party=ref;SOC.partyCode=code;SOC.ready=false;
 // Install disconnect state before declaring this membership online.
 SOC.partyDisconnect=ref.child('members/'+SOC.id).onDisconnect();await SOC.partyDisconnect.update({connected:false,ready:false,seen:0});
 SOC.partyListener=s=>{const p=s.val();SOC.partyData=p;if(!p?.members?.[SOC.id]){if(SOC.searching)cancelQuickMatch('Party closed or membership expired.');unbindParty();return}SOC.ready=!!p.members[SOC.id].ready;if(p.queue&&!SOC.searching&&!MP.active&&st==='MENU')followPartyQueue(p.queue);if(!p.queue&&SOC.searching&&!SOC.entered)cancelQuickMatch('Party search cancelled.',true);socialUI()};
 ref.on('value',SOC.partyListener,socialError);await socialHeartbeat();socialUI();
}
function unbindParty(){if(SOC.party&&SOC.partyListener)SOC.party.off('value',SOC.partyListener);SOC.partyDisconnect?.cancel().catch(()=>{});SOC.party=null;SOC.partyCode='';SOC.partyData=null;SOC.partyListener=null;SOC.partyDisconnect=null;SOC.ready=false;socialUI()}
async function createParty(){if(SOC.busy||SOC.party||MP.active)return;SOC.busy=true;SOC.error='';socialUI();try{const db=await socialConnect();let ref,code,result;const now=socialNow();for(let n=0;n<5;n++){code=randomRoomCode();ref=db.ref(SOCIAL_ROOT+'/parties/'+code);result=await mpTimeout(ref.transaction(p=>p===null?{leader:SOC.id,created:now,members:{[SOC.id]:{...socialProfile(),joined:now,seen:now,connected:false,ready:false}}}:undefined,undefined,false),'Create party');if(result.committed)break}if(!result.committed)throw Error('Could not reserve a party code. Try again.');await bindParty(ref,code)}catch(e){socialError(e)}finally{SOC.busy=false;socialUI()}}
async function joinParty(){if(SOC.busy||SOC.party||MP.active)return;const code=$('party-code-input').value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(code)){socialError(Error('Enter a six-character party code.'));return}SOC.busy=true;SOC.error='';socialUI();try{const db=await socialConnect(),ref=db.ref(SOCIAL_ROOT+'/parties/'+code),now=socialNow();const r=await mpTimeout(ref.transaction(p=>{if(p===null)return null;p=cleanParty(p,now);if(!p||p.queue||partyMembers(p).length>=3)return;p.members[SOC.id]={...socialProfile(),joined:now,seen:now,connected:false,ready:false};return p},undefined,false),'Join party');if(!r.committed||!r.snapshot.val()?.members?.[SOC.id])throw Error('Party unavailable. Check the PARTY code, available space and whether the leader is searching. Match codes belong in Private Match.');await bindParty(ref,code)}catch(e){socialError(e)}finally{SOC.busy=false;socialUI()}}
async function leaveParty(){if(SOC.busy)return;await cancelQuickMatch('',true);const ref=SOC.party,id=SOC.id;unbindParty();if(ref)await ref.transaction(p=>{if(p===null)return null;if(p.members)delete p.members[id];if(p.leader===id)p.leader=partyMembers(p)[0]?.[0]||'';return partyMembers(p).length?p:null},undefined,false).catch(socialError)}
async function togglePartyReady(){if(!SOC.party||SOC.searching||SOC.busy)return;SOC.ready=!SOC.ready;SOC.error='';await socialHeartbeat();if(SOC.ready)audioSample('uiReady',.38);socialUI()}
async function socialHeartbeat(){if(!SOC.party)return;const ref=SOC.party,id=SOC.id,now=socialNow(),profile=socialProfile(),ready=SOC.ready&&st==='MENU'&&!MP.active;await ref.transaction(p=>{if(p===null)return null;if(!p.members?.[id])return;p=cleanParty(p,now);if(!p?.members?.[id])return;Object.assign(p.members[id],profile,{seen:now,connected:true,ready});return p},undefined,false)}
// Bounded dynamic program: each party can occupy either team, never both. Oldest
// tickets win ties; at most (size+1)^2 states, 48 tickets and six reserved humans.
function queuePlan(tickets,size,now){const groups=Object.entries(tickets||{}).filter(([,t])=>t.protocol===PROTOCOL&&!t.match&&now-t.seen<SOCIAL_LEASE&&Array.isArray(t.members)&&t.members.length>0&&t.members.length<=size).sort((a,b)=>a[1].created-b[1].created||a[0].localeCompare(b[0])).slice(0,48),seen=new Set();let states=new Map([['0,0',{a:0,b:0,picks:[]}]]);
 for(const [id,t] of groups){if(t.members.some(m=>!m.session||seen.has(m.session))||new Set(t.members.map(m=>m.session)).size!==t.members.length)continue;t.members.forEach(m=>seen.add(m.session));const next=new Map(states),n=t.members.length;for(const s of states.values())for(let team=0;team<2;team++){const a=s.a+(team===0?n:0),b=s.b+(team===1?n:0),key=a+','+b;if(a<=size&&b<=size&&!next.has(key))next.set(key,{a,b,picks:[...s.picks,{id,team,members:t.members}]})}states=next;if(states.has(size+','+size))return states.get(size+','+size).picks}return null;
}
function cleanQueue(q,now){q=q||{};q.tickets=q.tickets||{};q.matches=q.matches||{};for(const [id,m] of Object.entries(q.matches))if(now-m.created>120000)delete q.matches[id];for(const [id,t] of Object.entries(q.tickets))if(now-t.seen>SOCIAL_LEASE&&!t.match||t.match&&!q.matches[t.match])delete q.tickets[id];return q}
async function findQuickMatch(){if(SOC.searching||SOC.busy||starting||MP.active||st!=='MENU')return;SOC.busy=true;SOC.error='';socialUI();try{const db=await socialConnect();await socialHeartbeat();const members=SOC.party?partyMembers((await SOC.party.once('value')).val()):[[SOC.id,{...socialProfile(),seen:socialNow(),connected:true,ready:true}]];
 if(!partyLeader())throw Error('Only the party leader can start Quick Match.');if(members.length>cfg.size)throw Error('Your party needs '+members.length+'v'+members.length+' or larger.');if(members.some(([,m])=>m.protocol!==PROTOCOL))throw Error('Every party member must reload version 9.2 before searching.');if(members.some(([,m])=>!memberLive(m)||!m.ready))throw Error('Every party member must be online and ready first.');
 const ticket=crypto.randomUUID(),key=(cfg.mode?'heat':'soccar')+'-v4-'+cfg.size,ref=db.ref(SOCIAL_ROOT+'/queues/'+key),now=socialNow(),epoch=++SOC.epoch;
 SOC.ticket=ticket;SOC.queue=ref;SOC.owner=true;SOC.since=now;
 const entries=members.map(([id,m])=>({session:id,name:m.name,body:m.body||0,color:m.color||0,teamColors:m.teamColors!==false}));
 if(SOC.party){const r=await SOC.party.transaction(p=>{if(p===null)return null;if(p.leader!==SOC.id||p.queue||partyMembers(p).length!==members.length||members.some(([id])=>!p.members[id]?.ready||!memberLive(p.members[id],now)))return;p.queue={key,ticket,owner:SOC.id,created:now,members:members.map(([id])=>id)};return p},undefined,false);if(!r.committed||r.snapshot.val()?.queue?.ticket!==ticket)throw Error('Party changed. Ready up and try again.')}
 // The party listener may attach to this ticket before it exists; creation time
 // allows a short grace period without treating that first null read as cancel.
 await ref.transaction(q=>{q=cleanQueue(q,now);if(Object.keys(q.tickets).length>=64)return;q.tickets[ticket]={protocol:PROTOCOL,owner:SOC.id,party:SOC.partyCode,created:now,seen:now,members:entries};return q},undefined,false).then(r=>{if(!r.committed)throw Error('This queue is busy. Try again shortly.')});
 if(SOC.party&&(await SOC.party.once('value')).val()?.queue?.ticket!==ticket)throw Error('Party search was cancelled.');if(SOC.epoch!==epoch)return;watchQueue(key,ticket,true,now);await matchQueue();
 }catch(e){await cancelQuickMatch('',true);socialError(e)}finally{SOC.busy=false;socialUI()}}
function followPartyQueue(q){if(q.owner===SOC.id)return;watchQueue(q.key,q.ticket,false,q.created)}
function watchQueue(key,ticket,owner,created){if(SOC.queue&&SOC.queueListener)SOC.queue.off('value',SOC.queueListener);SOC.searching=true;audioSample('uiReady',.38);SOC.owner=owner;SOC.ticket=ticket;SOC.since=created;SOC.entered=false;SOC.entering=false;SOC.error='';SOC.queue=mpDatabase().ref(SOCIAL_ROOT+'/queues/'+key);const epoch=SOC.epoch;
 SOC.queueListener=s=>{if(!SOC.searching||SOC.epoch!==epoch)return;SOC.queueData=s.val()||{};const t=SOC.queueData.tickets?.[ticket];if(t?.match){const m=SOC.queueData.matches?.[t.match];if(m?.cancelled){cancelQuickMatch('A player left before kickoff. Search again.',false);return}if(m&&!SOC.entering&&!SOC.entered)enterQuickMatch(m,epoch);if(m&&SOC.entered&&MP.loaded&&Object.keys(m.acks||{}).length===m.players.length)finishSearch();}else if(!t&&socialNow()-created>6000){cancelQuickMatch('Search expired. Please try again.',false);return}else if(owner&&!SOC.matching&&!SOC.busy)matchQueue();socialUI()};
 SOC.queue.on('value',SOC.queueListener,socialError);socialUI();
}
async function matchQueue(){if(!SOC.searching||!SOC.owner||SOC.matching||SOC.entering)return;SOC.matching=true;const now=socialNow(),matchId=crypto.randomUUID(),code=randomRoomCode(),ref=SOC.queue,size=Number(ref.key?.split('-').pop())||cfg.size,mode=SOC.queueData?.tickets?.[SOC.ticket]?.mode??cfg.mode;
 try{await ref.transaction(q=>{q=cleanQueue(q,now);if(!q.tickets[SOC.ticket]||q.tickets[SOC.ticket].match)return;const picks=queuePlan(q.tickets,size,now);if(!picks)return;const teams=[[],[]];for(const p of picks)teams[p.team].push(...p.members);const players=[];for(let i=0;i<size;i++){players.push({...teams[0][i],slot:i*2},{...teams[1][i],slot:i*2+1})}q.matches[matchId]={id:matchId,code,host:players[0].session,created:now,players,settings:{protocol:PROTOCOL,mode,size,lvl:2,len:300,speed:1,gravity:1,unlimited:false,teamColors:players[0].teamColors!==false}};for(const p of picks)q.tickets[p.id].match=matchId;return q},undefined,false)}catch(e){socialError(e)}finally{SOC.matching=false}}
async function enterQuickMatch(match,epoch){if(match.settings?.protocol!==PROTOCOL){await cancelQuickMatch("A player is on an older build. Reload and search again.",true);return}SOC.reservation=match;SOC.entering=true;socialUI();const ref=SOC.queue,me=match.players.find(p=>p.session===SOC.id);if(!me){await cancelQuickMatch('Reservation did not include this player.',false);return}
 try{const room=mpDatabase().ref('rooms/'+match.code);if(match.host===SOC.id){const seats={};for(const p of match.players)seats[p.slot]={session:p.session,name:p.name,color:p.color,body:p.body};const r=await room.transaction(v=>v===null?{meta:{protocol:PROTOCOL,host:match.host,quick:match.id,settings:match.settings,seats,locked:true,createdAt:Date.now()}}:v.meta?.quick===match.id?v:undefined,undefined,false);if(!r.committed)throw Error('Room code collision. Search again.')}
 const meta=await new Promise((resolve,reject)=>{const node=room.child('meta');const f=s=>{const m=s.val();if(m?.quick===match.id){clearTimeout(timer);node.off('value',f);resolve(m)}};const timer=setTimeout(()=>{node.off('value',f);reject(Error('Matched room timed out. Search again.'))},15000);node.on('value',f,e=>{clearTimeout(timer);node.off('value',f);reject(e)})});
 if(!SOC.searching||SOC.epoch!==epoch)return;if((await ref.child('matches/'+match.id).once('value')).val()?.cancelled)throw Error('A player cancelled before kickoff.');
 if(previewJob)await previewJob;if(!SOC.searching||SOC.epoch!==epoch)return;mpReset();sandbox=false;applySettings(match.settings);Object.assign(MP,{active:true,quick:match.id,role:match.host===SOC.id?'host':'guest',slot:me.slot,session:SOC.id,room,code:match.code,seats:meta.seats});attachRoomListeners();const ok=await startGame();if(!ok)throw Error('Arena failed to load. Try Performance mode, then search again.');if(SOC.epoch!==epoch){quit();return}SOC.entered=true;SOC.ready=false;
 await ref.child('matches/'+match.id+'/acks/'+SOC.id).set(socialNow());await socialHeartbeat();
 }catch(e){if(SOC.epoch===epoch){await cancelQuickMatch(e.message,true)}}finally{if(SOC.epoch===epoch){SOC.entering=false;socialUI()}}}
function stopQueueListener(){if(SOC.queue&&SOC.queueListener)SOC.queue.off('value',SOC.queueListener);SOC.queueListener=null;SOC.queue=null;SOC.queueData=null;SOC.searching=false;SOC.entering=false;SOC.entered=false;SOC.ticket='';SOC.reservation=null;SOC.epoch++;socialUI()}
async function clearPartyQueue(ticket){if(!SOC.party)return;await SOC.party.transaction(p=>{if(p===null)return null;if(p.queue?.ticket===ticket){delete p.queue;for(const m of Object.values(p.members||{}))m.ready=false;return p}},undefined,false)}
function finishSearch(){const ticket=SOC.ticket;stopQueueListener();SOC.ready=false;clearPartyQueue(ticket).catch(socialError)}
async function cancelQuickMatch(reason='',notify=true){const ref=SOC.queue,ticket=SOC.ticket,matchId=SOC.queueData?.tickets?.[ticket]?.match,reservation=SOC.reservation;SOC.error=reason;stopQueueListener();SOC.ready=false;
 if(ref&&notify)await ref.transaction(q=>{if(q===null)return null;if(matchId&&q.matches?.[matchId])q.matches[matchId].cancelled=true;if(q.tickets)delete q.tickets[ticket];return q},undefined,false).catch(socialError);
 if(reservation?.host===SOC.id&&!MP.active)mpDatabase().ref('rooms/'+reservation.code).transaction(v=>v?.meta?.quick===reservation.id?null:undefined,undefined,false).catch(socialError);
 if(matchId&&MP.quick===matchId){quit();showMenuScreen('play');chooseRoute('quick')}await clearPartyQueue(ticket).catch(socialError);socialUI();}
async function socialPulse(){if(SOC.pulseBusy)return;SOC.pulseBusy=true;try{if(SOC.party)await socialHeartbeat();if(SOC.searching&&SOC.owner&&SOC.queue){const now=socialNow(),ticket=SOC.ticket;await SOC.queue.transaction(q=>{if(q===null)return null;const t=q.tickets?.[ticket];if(!t)return;t.seen=now;if(t.match&&q.matches?.[t.match]&&now-q.matches[t.match].created>35000&&Object.keys(q.matches[t.match].acks||{}).length<q.matches[t.match].players.length)q.matches[t.match].cancelled=true;return q},undefined,false);if(!SOC.entering)await matchQueue()}if(SOC.searching){const t=SOC.queueData?.tickets?.[SOC.ticket],m=t?.match?SOC.queueData?.matches?.[t.match]:null;if(!t&&socialNow()-SOC.since>6000||t&&!t.match&&socialNow()-t.seen>SOCIAL_LEASE)await cancelQuickMatch('Search expired. Please try again.');else if(m&&socialNow()-m.created>35000&&Object.keys(m.acks||{}).length<m.players.length)await cancelQuickMatch('A driver could not load the arena. Search again.')}socialUI()}catch(e){socialError(e)}finally{SOC.pulseBusy=false}}
function setupSocial(){try{SOC.name=localStorage.getItem('tevin.driverName')||'DRIVER'}catch(_){SOC.name='DRIVER'}$('player-name').value=SOC.name;$('player-name').onchange=()=>{SOC.name=socialName();try{localStorage.setItem('tevin.driverName',SOC.name)}catch(_){}socialHeartbeat().catch(socialError)};$('queue-dock').onclick=()=>{chooseRoute('quick');showMenuScreen('play')};$('party-toggle').onclick=()=>showMenuScreen('party');$('party-create').onclick=createParty;$('party-join').onclick=joinParty;$('party-leave').onclick=leaveParty;$('party-ready').onclick=togglePartyReady;$('quick-find').onclick=findQuickMatch;$('quick-cancel').onclick=()=>cancelQuickMatch();$('party-play').onclick=()=>{chooseRoute('quick');showMenuScreen('play')};$('party-copy').onclick=async()=>{try{await navigator.clipboard.writeText(SOC.partyCode);SOC.error='Party code copied.'}catch(_){SOC.error='Select the code and press Ctrl+C.'}socialUI()};
 setInterval(socialPulse,4000);socialUI();
}


// Display-only counters: no forces, inputs or bot decisions depend on these values.

const matchStats={touches:0,topSpeed:0,boost:0,lastTouch:-1e9};

const msg=(t,s,col='#fff')=>{const m=$('msg');m.textContent=t;m.style.color=col;m.style.opacity=1;mt=s};

function kickoff(newRound=true){

 kickoffAge=0;learnKickoff();AUDIO.countKey='';AUDIO.events.length=0;

 for(const c of cars)spawnCar(c);heat.target=0;heat.speed=18;heat.cooldown=0;ball.color=0xdceeff;ball.lastPlayer=-1;

  const lp=localPlayer();ball.p.set(0,BR,0);ball.v.set(0,0,0);ball.w.set(0,0,0);ball.last=-1;ball.hit=0;ball.hitT=0;setupHeatServe();ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);if(bm)bm.quaternion.identity();cd.set(1,0,0).applyQuaternion(lp.q);cpos.copy(lp.p).addScaledVector(cd,-5);cpos.y+=1.5;lookPos.copy(ball.p);acc=0;PADS.forEach(p=>p.t=0);st='COUNT';cnt=3.99;

  if(MP.active&&MP.role==='host'&&newRound){MP.round++;mpClearInput();publishMatch()}

}

function hitFx(c,x,y,z){graphicsBurst(ball.p,c,ball.color||0xffffff);const n=Math.min(18,c*.9|0),col=ball.color||0xdceeff;for(let k=0;k<n;k++)emit(x,y,z,(Math.random()-.5)*8,Math.random()*5,(Math.random()-.5)*8,.5,((col>>16)&255)/255,((col>>8)&255)/255,(col&255)/255);impactSound('hit',c,ball.p);flash=Math.min(.2,flash+c*.005);$('flash').style.background='#'+col.toString(16).padStart(6,'0')}

function bumpFx(v){if(v>1.5)impactSound('bump',v)}

function goal(t){if(MP.active&&MP.role==='guest')return;goalPulse=1;if(!MP.active)learnGoal(t);st='GOAL';gt=3.5;score[t]++;if(ball.lastPlayer>=0&&cars[ball.lastPlayer]?.team===t)cars[ball.lastPlayer].goals++;$('s0').textContent=score[0];$('s1').textContent=score[1];

  msg('GOAL!',3.2,teamHex(t));flash=.52;shake=.28;$('flash').style.background=teamHex(t);

 const col=ball.color||PALETTE[t],c=[((col>>16)&255)/255,((col>>8)&255)/255,(col&255)/255];for(let k=0;k<(cfg.hi?200:90);k++){const a=Math.random()*6.28,e=Math.random()*3.1,s=8+Math.random()*22;emit(ball.p.x,ball.p.y,ball.p.z,Math.cos(a)*Math.sin(e)*s,Math.cos(e)*s,Math.sin(a)*Math.sin(e)*s,1.6,...c)}

 if(MP.active&&MP.role==='host'){const id=Date.now();MP.lastGoal=id;publishMatch('GOAL',{goalId:id,team:t})}}

function endMatch(publish=true){st='END';$('end-reason').textContent=MP.endReason||'';$('rm').textContent=MP.quick?'FIND NEXT MATCH':'REMATCH';showPodium();audioSilence();const team=localPlayer().team,w=score[team]>score[1-team];$('endt').textContent=w?'VICTORY':'DEFEAT';$('ends').textContent=score[0]+' – '+score[1];$('stat-touch').textContent=localPlayer().touches;$('stat-speed').textContent=Math.round(localPlayer().topSpeed*3.6);$('stat-boost').textContent=Math.round(localPlayer().boostUsed);$('end').classList.add('on');$('msg').style.opacity=0;if(publish&&MP.active&&MP.role==='host')publishMatch('END')}

function pause(){if(MP.active){if(MP.loaded&&st!=='END')mpSetPause(!MP.localPaused);return}const lp=localPlayer();if(st=='PAUSE'){for(const k in keys)keys[k]=0;lp.jp=lp.jh=0;st=ps_;$('pause').classList.remove('on')}else if(st=='PLAY'||st=='COUNT'||sandbox&&st==='GOAL'){ps_=st;st='PAUSE';lp.jp=lp.jh=0;audioSilence();$('pause-title').textContent='PAUSED';$('res').disabled=false;$('res').textContent='RESUME';$('pause').classList.add('on')}}

let starting=false;

async function startGame(){

 if(starting||LOADING.active)return false;$('graphics-error').hidden=true;introStop();starting=true;$('go').disabled=true;$('go').textContent='LOADING ARENA…';$('start-status').textContent='Preparing graphics and shaders…';

 

  unlockAudio();AUDIO.goalKey="";AUDIO.countKey="";AUDIO.events.length=0;

  let transition;try{configureCars();transition=await loadingBegin('ENTERING THE ARENA',(cfg.mode?'HEATSEEKER':'SOCCAR')+' · '+cfg.size+'v'+cfg.size,graphicsReady());trainingLabels();$('training-panel').hidden=!sandbox;await init3d();refreshCarModels()}catch(err){loadingAbort(transition);console.error(err);try{dispose3d()}catch(_){}starting=false;st='MENU';$('menu').classList.add('on');$('go').disabled=false;$('go').innerHTML='RETRY KICKOFF <small>ENTER ↵</small>';graphicsFailure(err);if(MP.active)mpReset();return false}$('go').disabled=false;$('go').textContent='START OFFLINE MATCH';$('start-status').textContent='';last=performance.now();acc=0;$('cv').style.filter='none';['menu','end','pause'].forEach(x=>$(x).classList.remove('on'));$('hud').style.display='block';

  for(const k in keys)keys[k]=0;particleCount=particleReplace=0;shake=flash=0;score=[0,0];tl=cfg.len;ot=0;Object.assign(matchStats,{touches:0,topSpeed:0,boost:0,lastTouch:-1e9});const role=MP.active?((MP.quick?'QUICK MATCH':MP.role.toUpperCase())+' · YOU ARE '+(localPlayer().team?'ORANGE':'BLUE')):['ROOKIE','PRO','ALL-STAR'][cfg.lvl]+' · YOU ARE BLUE';$('matchlevel').textContent=role;$('s0').textContent=$('s1').textContent=0;

 // Place the camera/cars before revealing them; the loading gate freezes countdown ticks.
 if(!MP.active)kickoff();else st='WAIT';render(0);
 await loadingEnd(transition);starting=false;last=performance.now();acc=0;
 if(MP.active){MP.matchBegun=false;MP.localPaused=false;try{await mpLoaded()}catch(e){mpFailure(e)}}return true}

function startOfflineGame(training=false){if(starting||mpBusy||SOC.searching||SOC.busy)return;if(training!==true&&st==='MENU'&&menuScreen==='home'){showMenuScreen('play');return}if(training!==true&&st==='MENU'&&(playRoute==='online'||playRoute==='quick'))return;sandbox=training===true||playRoute==='training';if(MP.active)mpReset();startGame()}

function finishQuit(){if(SOC.searching)cancelQuickMatch();st='MENU';syncMenuSettings();if(MP.active)mpReset();learnFlush();learnUI();['pause','end'].forEach(x=>$(x).classList.remove('on'));$('menu').classList.add('on');showMenuScreen('home');$('training-hud').hidden=true;$('hud').style.display='none';$('msg').style.opacity=0;audioSilence()}

async function quit(){
 if(LOADING.active)return;const transition=loadingBegin('BACK TO THE LOBBY','Saving your session and returning to the lobby',true);
 finishQuit();starting=true;INTRO.stopped=false;if(!INTRO.manualPause)introStart();
 try{const id=await transition;await loadingStage(100,'Lobby ready');await loadingEnd(id)}finally{starting=false}
}
window.tevinBoot.stage='menu handlers';

$('go').onclick=startOfflineGame;$('rm').onclick=()=>{if(MP.quick){quit();chooseRoute('quick');showMenuScreen('play');return}if(MP.active&&MP.role==='guest'){mpStatus(`ROOM ${MP.code} · WAITING FOR HOST REMATCH`,'')}else startGame()};$('res').onclick=pause;$('q1').onclick=$('q2').onclick=quit;

$('graphics-retry').onclick=retryGraphics;$('graphics-open').href='https://jikjikla.github.io/tevtev123/';
$('host-match').onclick=hostMatch;$('join-match').onclick=joinMatch;$('room-code').addEventListener('input',e=>e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6));

$('leave-room').onclick=quit;

$('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(MP.code);$('copy-status').textContent='Code copied — send it to your opponent.'}catch(_){$('copy-status').textContent='Select the large code and press Ctrl+C to copy.'}};



function sim(dt){

 if(st!='PLAY'&&st!='GOAL')return;const live=st=='PLAY';

  if(MP.active&&MP.role==='guest')return;const lp=localPlayer(),rp=remotePlayer();

  if(live){simTime+=dt;kickoffAge+=dt}const jumpEdge=lp.jp;

  for(let k=0;k<cars.length;k++){const c=cars[k];

   if(!c.enabled)continue;if(live){c===lp?human(c):MP.active?mpRemoteControls(c):bot(c)}else Object.assign(c.inp,Z);const boostBefore=c.boost;stepCar(c,dt);c.boostUsed+=Math.max(0,boostBefore-c.boost);c.topSpeed=Math.max(c.topSpeed,c.v.length());

   if(live&&c===lp){matchStats.boost+=Math.max(0,boostBefore-c.boost);matchStats.topSpeed=Math.max(matchStats.topSpeed,c.v.length())}}

  carCar();for(const c of cars)resolveArenaCar(c);if(!MP.active||MP.role==='host')stepBall(dt);padStep(dt);if(live&&!MP.active)learnObserve(dt,jumpEdge);

 if(live&&(!MP.active||MP.role==='host'))advanceMatchClock(dt);

}

// ---------- 3D scene ----------

let ren,scene,cam,sun,cm=[],bm,padM=[],padOff,bigPillars,pts,cd=new V3(1,0,0),cpos=new V3(),lookPos=new V3(),inited=0,pipeline=null,goalLights=[],goalPulse=0,grassM,WM=[],contactShadows=[],fr=0,graphicsPreset=-1,envTarget,assetTextures=null,garageStage=null;

const renderForward=new V3(),renderRight=new V3(),renderEffect=new V3(),camDesired=new V3(),camLook=new V3(),camToBall=new V3(),shadowCenter=new V3();

const particleMatrix=new THREE.Matrix4(),particlePosition=new V3(),particleScale=new V3(),particleColor=new THREE.Color();

function uploadParticles(){

 pts.count=particleCount;

 for(let k=0;k<particleCount;k++){

  const o=k*3;particlePosition.set(pp[o],pp[o+1],pp[o+2]);

  // Legacy PointsMaterial uses a pixel-height factor rather than perspective FOV.

  // Match its approximate world footprint while keeping the original soft texture.

  const size=.9*Math.tan(cam.fov*Math.PI/360);particleScale.set(size,size,size);

  particleMatrix.compose(particlePosition,cam.quaternion,particleScale);pts.setMatrixAt(k,particleMatrix);

  particleColor.setRGB(pc[o],pc[o+1],pc[o+2]);pts.setColorAt(k,particleColor);

 }

 if(particleCount){

  const mr=pts.userData.matrixRange,cr=pts.userData.colorRange;

  mr.count=particleCount*16;cr.count=particleCount*3;

  pts.instanceMatrix.updateRanges.length=1;pts.instanceMatrix.updateRanges[0]=mr;

  pts.instanceColor.updateRanges.length=1;pts.instanceColor.updateRanges[0]=cr;

  pts.instanceMatrix.needsUpdate=true;pts.instanceColor.needsUpdate=true;

 }

}

function addSpectators(){
 // Three shared geometries keep a fuller crowd inexpensive on integrated graphics.
 const count=cfg.hi?1800:900,mat=new THREE.MeshStandardMaterial({roughness:1});
 const bodies=new THREE.InstancedMesh(new THREE.BoxGeometry(.32,.48,.24),mat,count);
 const heads=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.14,0),mat,count);
 const arms=new THREE.InstancedMesh(new THREE.BoxGeometry(.09,.43,.09),mat,count);
 const matrix=new THREE.Matrix4(),color=new THREE.Color(),palette=[0x3979df,0xff862f,0xdce7ed,0x405078,0xeabc54,0xac4352],skins=[0xe0ac83,0x985f40,0x613e30,0xc38a61];
 for(let k=0;k<count;k++){
  const side=k%4,row=Math.floor(k/4)%8,along=(Math.floor(k/32)+.5)/Math.ceil(count/32)*2-1,end=side>1,sign=side%2?1:-1;
  const distance=(end?HZ+GD+11:HX+11)+row*2.3,len=(end?2*HX-8:2*HZ-8)+row*1.2;
  const x=end?along*len*.48:sign*distance,y=3.05+row*1.5,z=end?sign*distance:along*len*.48;
  matrix.makeTranslation(x,y,z);bodies.setMatrixAt(k,matrix);bodies.setColorAt(k,color.setHex(palette[(k*7+row)%6]));
  matrix.makeTranslation(x,y+.36,z);heads.setMatrixAt(k,matrix);heads.setColorAt(k,color.setHex(skins[(k+row)%4]));
  matrix.makeRotationZ((k%3-1)*.65);matrix.setPosition(x+.22,y+.22+(k%3)*.08,z);arms.setMatrixAt(k,matrix);arms.setColorAt(k,color.setHex(palette[(k*7+row)%6]));
 }
 for(const mesh of [bodies,heads,arms]){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();scene.add(mesh)}
 // Silhouettes, roof beacons and trees give the skyline depth without shadow maps.
 const city=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0x40556b,roughness:.9}),48);
 const trees=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,5),new THREE.MeshStandardMaterial({color:0x254e45,roughness:1}),64);
 const pos=new V3(),q=new THREE.Quaternion(),scale=new V3();
 for(let k=0;k<48;k++){const t=k/48*Math.PI*2,h=12+(k*17%29);pos.set(Math.cos(t)*(140+k%3*12),h/2-3,Math.sin(t)*(152+k%4*10));scale.set(6+k%5,h,7+k%7);matrix.compose(pos,q,scale);city.setMatrixAt(k,matrix)}
 for(let k=0;k<64;k++){const t=k/64*Math.PI*2,h=5+k%5;pos.set(Math.cos(t)*108,h/2,Math.sin(t)*121);scale.set(2.5,h,2.5);matrix.compose(pos,q,scale);trees.setMatrixAt(k,matrix)}
 for(const mesh of [city,trees]){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();scene.add(mesh)}
}

let renderScale=1,perfEMA=1/60,perfTimer=0,shadowTimer=0,uiClock=-1,uiBoost=-1,uiSpeed=-1,dbgTimer=0;

function pixelRatio(){return Math.min(window.devicePixelRatio||1,cfg.hi?1.5:1,Math.sqrt((cfg.hi?1800000:921600)/(innerWidth*innerHeight)))*renderScale}

const cvs=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c},tex=c=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t};

function face(a,sg,mat,skip){

 const K=[[2,1],[0,2],[0,1]][a],ku=K[0],kv=K[1],A=[HX,HH/2,HZ];

 const ls=k=>{const h=A[k],n=h-R,s=new Set([-h,h,-n,n,0]);if(k==0&&a!=0){s.add(-GX);s.add(GX)}if(k==1&&a==2)s.add(GH-HH/2);

  for(let i=1;i<6;i++){s.add(-h+R*i/6);s.add(h-R*i/6)}for(let i=1;i<4;i++)s.add(-n+2*n*i/4);return[...s].sort((x,y)=>x-y)};

 const U=ls(ku),W=ls(kv),pos=[],nor=[],uv=[],idx=[],hu=A[ku],hv=A[kv];

 U.forEach(u=>W.forEach(v=>{const p=[0,0,0];p[a]=sg*A[a];p[ku]=u;p[kv]=v;

  const q=[IN.x,IN.y,IN.z].map((m,k)=>cl(p[k],-m,m)),d=p.map((x,k)=>x-q[k]),l=Math.hypot(...d);

  pos.push(q[0]+d[0]/l*R,q[1]+d[1]/l*R+HH/2,q[2]+d[2]/l*R);nor.push(-d[0]/l,-d[1]/l,-d[2]/l);

  uv.push(((a==0&&sg<0)||(a==2&&sg>0))?1-(u+hu)/(2*hu):(u+hu)/(2*hu),a==1?1-(v+hv)/(2*hv):(v+hv)/(2*hv))}));

 const nv=W.length,I=(i,j)=>i*nv+j;let fl=null;

 for(let i=0;i<U.length-1;i++)for(let j=0;j<nv-1;j++){

  const a0=I(i,j),b=I(i+1,j),c=I(i+1,j+1),d=I(i,j+1);

  if(fl===null){const P=k=>new V3(pos[k*3],pos[k*3+1],pos[k*3+2]);fl=P(b).sub(P(a0)).cross(P(c).sub(P(a0))).dot(new V3(nor[a0*3],nor[a0*3+1],nor[a0*3+2]))<0}

  if(skip&&skip((U[i]+U[i+1])/2,(W[j]+W[j+1])/2))continue;

  fl?idx.push(a0,c,b,a0,d,c):idx.push(a0,b,c,a0,c,d)}

 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);

 const m=new THREE.Mesh(g,mat);m.receiveShadow=true;scene.add(m)}

function wallMat(col){
 const c=cvs(1024,512),g=c.getContext('2d');g.clearRect(0,0,1024,512);
 // Fine safety net above low, solid advertising boards: stands stay visible.
 g.strokeStyle='rgba(145,177,192,.15)';g.lineWidth=1;
 for(let y=0;y<512;y+=24)for(let x=0;x<1080;x+=42){const cx=x+(y%48?21:0);g.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;g[k?'lineTo':'moveTo'](cx+Math.cos(a)*23,y+Math.sin(a)*23)}g.closePath();g.stroke()}
 g.fillStyle='#182b35';g.fillRect(0,444,1024,68);g.fillStyle='#07131e';g.fillRect(0,454,1024,37);
 g.font='italic 800 24px sans-serif';g.fillStyle='#dbe7e9';for(let x=18;x<1024;x+=256)g.fillText('TEVIN LEAGUE',x,480);
 g.fillStyle=col;g.fillRect(0,442,1024,3);g.fillRect(0,501,1024,4);for(let x=230;x<1024;x+=256)g.fillRect(x,460,4,22);
 const t=tex(c);return new THREE.MeshStandardMaterial({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:.1,roughness:.82,metalness:.08,transparent:true,depthWrite:false});
}
function floorMat(){return ENGINE.pitchMaterial(ren,teamPalette)}

let GT,GU;const glowTex=()=>{if(GT)return GT;const c=cvs(64,64),g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,.9)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return GT=new THREE.CanvasTexture(c)};

// Merge same-material primitive meshes once at startup, keeping draw calls small.

function batchMeshes(group){

 const batches=new Map();group.updateMatrixWorld(true);

 for(const m of [...group.children])if(m.isMesh&&!m.isInstancedMesh&&!m.material.transparent){

  const a=batches.get(m.material)||[];let geo=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();geo.applyMatrix4(m.matrix);a.push(geo);batches.set(m.material,a);group.remove(m);m.geometry.dispose();

 }

 for(const [material,list] of batches){const geometry=new THREE.BufferGeometry();for(const key of ['position','normal','uv']){

  if(!list.every(g=>g.getAttribute(key)))continue;const size=list[0].getAttribute(key).itemSize,length=list.reduce((n,g)=>n+g.getAttribute(key).array.length,0),data=new Float32Array(length);let off=0;

  for(const g of list){const a=g.getAttribute(key).array;data.set(a,off);off+=a.length}geometry.setAttribute(key,new THREE.BufferAttribute(data,size));

 }list.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;group.add(mesh)}

}

function carMesh2(col,acc){

 const g=new THREE.Group(),paint=ENGINE.physicalMaterial(ren,{color:new THREE.Color(col),metalness:.3,roughness:.32,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:.75}),

 trim=new THREE.MeshStandardMaterial({color:0x131b25,metalness:.45,roughness:.5}),glass=new THREE.MeshStandardMaterial({color:0x254963,metalness:.65,roughness:.15}),

 metal=new THREE.MeshStandardMaterial({color:0xa8bbca,metalness:.9,roughness:.28}),rub=new THREE.MeshStandardMaterial({color:0x101216,roughness:.92}),

 decal=new THREE.MeshStandardMaterial({color:acc,metalness:.3,roughness:.38}),white=new THREE.MeshBasicMaterial({color:0xd8eeff,toneMapped:false}),red=new THREE.MeshBasicMaterial({color:0xff3535,toneMapped:false}),

 add=(geo,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0,parent=g)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);parent.add(m);return m},

 B=(x,y,z)=>new THREE.BoxGeometry(x,y,z),

 shell=(x0,x1,y0,y1,top0,top1,width0,width1,roof0,roof1,mat)=>{

  const vertices=[[x0,y0,-width0],[x0,y0,width0],[x1,y1,width1],[x1,y1,-width1],[x0,top0,-roof0],[x0,top0,roof0],[x1,top1,roof1],[x1,top1,-roof1]],faces=[[0,1,2,3],[4,7,6,5],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]],center=new V3(),positions=[];

  vertices.forEach(p=>center.add(new V3(...p)));center.divideScalar(8);

  for(const face of faces){const v=face.map(i=>new V3(...vertices[i])),mid=new V3();v.forEach(p=>mid.add(p));mid.divideScalar(4);

   for(const tri of [[0,1,2],[0,2,3]]){let [a,b,c]=tri.map(i=>v[i]);if(b.clone().sub(a).cross(c.clone().sub(a)).dot(mid.clone().sub(center))<0)[b,c]=[c,b];positions.push(...a.toArray(),...b.toArray(),...c.toArray())}}

  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();return add(geo,mat);

 },link=(a,b,r,mat)=>{const d=new V3(...b).sub(new V3(...a)),m=add(new THREE.CylinderGeometry(r,r,d.length(),8),mat);m.position.copy(new V3(...a).add(new V3(...b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(Y3,d.normalize());return m};

 // Wide rally chassis, tapered hood, a tall swept cabin, exposed wheels and rear wing.

 shell(-1.02,-.3,-.21,-.2,.12,.14,.4,.44,.39,.41,paint);

 shell(-.3,.38,-.2,-.18,.14,.10,.44,.44,.41,.38,paint);

 shell(.38,1.02,-.18,-.12,.10,-.015,.44,.39,.38,.33,paint);

 shell(-.57,.38,.12,.09,.40,.17,.33,.31,.25,.26,glass);

 shell(-.41,.02,.385,.325,.43,.37,.25,.25,.235,.235,paint);

 add(B(1.87,.04,.78),trim,0,-.23);add(B(.13,.13,.82),trim,1.015,-.13);add(B(.045,.03,.77),metal,1.09,-.2);

 add(B(.05,.12,.45),trim,1.085,-.095);for(let j=-2;j<=2;j++)add(B(.02,.008,.07),metal,1.115,-.13+j*.02);

 add(B(.11,.11,.82),trim,-1.03,-.13);add(B(.28,.05,1.07),paint,-.90,.37,0,0,0,.08);

 for(const side of [-1,1]){

  link([-.53,.12,side*.333],[-.40,.40,side*.255],.019,paint);

  link([.37,.095,side*.312],[.02,.37,side*.255],.022,paint);

  link([-.16,.12,side*.33],[-.16,.38,side*.253],.016,paint);

  link([-.78,.14,side*.31],[-.84,.36,side*.31],.023,trim);

  add(B(.075,.12,.045),trim,.23,.17,side*.375);add(B(.12,.055,.1),paint,.24,.20,side*.40);

  add(B(.6,.027,.018),decal,-.05,-.12,side*.447);

  add(B(.1,.07,.14),white,1.045,-.015,side*.255);add(B(.03,.055,.23),red,-1.04,.08,side*.245);

  add(new THREE.CylinderGeometry(.06,.06,.14,10),metal,-1.1,-.08,side*.14,0,0,Math.PI/2);

  // A true hollow wheel arch rather than an extruded rectangle covering the tyre.

  for(const x of [-.58,.58]){const sh=new THREE.Shape(),outer=.31,inner=.262;sh.absarc(0,-.18,outer,Math.PI,0,true);sh.lineTo(inner,-.18);sh.absarc(0,-.18,inner,0,Math.PI,false);sh.closePath();

   const geo=new THREE.ExtrudeGeometry(sh,{depth:.15,bevelEnabled:true,bevelThickness:.012,bevelSize:.01,bevelSegments:1,curveSegments:12});geo.translate(0,0,-.075);add(geo,paint,x,0,side*.475);

  }

 }

 // Paint stripes sit just above the sloped hood.

 for(const z of [-.115,.115]){const m=shell(.38,1.01,.104,-.010,.109,-.005,.036,.036,.036,.036,decal);m.position.z=z}

 batchMeshes(g);g.userData.wheels=[];

 for(const x of [-.58,.58])for(const side of [-1,1]){

  const steer=new THREE.Group(),wheel=new THREE.Group();steer.position.set(x,-.18,side*.49);steer.userData.front=x>0;steer.add(wheel);g.add(steer);g.userData.wheels.push(wheel);

  add(new THREE.TorusGeometry(.187,.055,8,20),rub,0,0,0,0,0,0,wheel).scale.z=1.6;

  add(new THREE.CylinderGeometry(.14,.14,.17,16),metal,0,0,0,Math.PI/2,0,0,wheel);

  add(new THREE.CylinderGeometry(.117,.117,.015,16),trim,0,0,side*.094,Math.PI/2,0,0,wheel);

  for(let k=0;k<5;k++)add(B(.023,.23,.015),metal,0,0,side*.106,0,0,k*Math.PI/5,wheel);

  add(new THREE.CylinderGeometry(.032,.032,.025,10),decal,0,0,side*.116,Math.PI/2,0,0,wheel);batchMeshes(wheel);

 }

 const flameMat=new THREE.MeshBasicMaterial({color:0xffbe48,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});

 g.userData.f=new THREE.Group();for(const z of [-.14,.14])add(new THREE.ConeGeometry(.085,1.3,8),flameMat,-1.75,-.08,z,0,0,-Math.PI/2,g.userData.f);g.userData.f.visible=false;g.add(g.userData.f);

 return g;

}



// V6 turf: crossed blades, coherent gusts and velocity-driven wakes for all six

// cars. A 28m camera-centered patch fades before wrapping. No physics is affected.

let windFlags=[];

function makeGrass(){

 const N=cfg.hi?24000:3000,bg=new THREE.BufferGeometry(),off=new Float32Array(N*3);

 bg.setAttribute('position',new THREE.Float32BufferAttribute([-.012,0,0,.012,0,0,-.008,.5,0,.008,.5,0,0,1,0,0,0,-.012,0,0,.012,0,.5,-.008,0,.5,.008,0,.9,0],3));bg.setIndex([0,1,2,1,3,2,2,3,4,5,6,7,6,8,7,7,8,9]);

 const columns=Math.ceil(Math.sqrt(N)),rows=Math.ceil(N/columns);

 for(let i=0;i<N;i++){off[i*3]=((i%columns+Math.random())/columns)*28;off[i*3+1]=((Math.floor(i/columns)+Math.random())/rows)*28;off[i*3+2]=Math.random()}

 // Upward-facing shading normals match the turf's diffuse response while the

 // crossed cards provide silhouette. Both backends use standard PBR lighting.

 const normals=new Float32Array(30);for(let k=1;k<30;k+=3)normals[k]=1;bg.setAttribute('normal',new THREE.BufferAttribute(normals,3));

 bg.setAttribute('off',new THREE.InstancedBufferAttribute(off,3));bg.instanceCount=N;

 GU={t:{value:0},pc:{value:new V3()}};

 for(let k=0;k<7;k++){GU['c'+k]={value:new V3(1000,1000,1000)};GU['v'+k]={value:new V3()}}

 const deformation=`float r=off.z;vec2 w=mod(off.xy-cameraPosition.xz+14.,28.)+cameraPosition.xz-14.;float fade=(1.-smoothstep(6.,13.,length(cameraPosition.xz-w)))*step(abs(w.x),36.8)*step(abs(w.y),46.8);float ht=(.07+.055*r)*fade,h=position.y;

 float a=r*6.2831;vec3 p=vec3(w.x+(position.x*cos(a)-position.z*sin(a))*fade,.008+h*ht,w.y+(position.x*sin(a)+position.z*cos(a))*fade);

 float s=sin(t*1.4+w.x*.35+w.y*.29)*.18+sin(t*2.4+w.y*.8+r*9.)*.05;float bend=s*h*h*ht*3.;p.x+=bend;p.z+=bend*.6;

 vec3 ob[7];ob[0]=c0;ob[1]=c1;ob[2]=c2;ob[3]=c3;ob[4]=c4;ob[5]=c5;ob[6]=c6;

 vec3 vel[7];vel[0]=v0;vel[1]=v1;vel[2]=v2;vel[3]=v3;vel[4]=v4;vel[5]=v5;vel[6]=v6;

 for(int i=0;i<7;i++){vec2 q=w-ob[i].xz;float nearGround=1.-smoothstep(.6,2.,ob[i].y);float f=(1.-smoothstep(.2,1.5,length(q)))*nearGround;vec2 dir=vel[i].xz/max(length(vel[i].xz),.001);float along=dot(q,dir),side=length(q-dir*along);float wake=(1.-smoothstep(.4,1.5,side))*smoothstep(-6.,-1.,along)*(1.-smoothstep(-.2,.6,along))*min(length(vel[i].xz)/23.,1.)*nearGround;

 p.xz+=(normalize(q+vec2(.0001))*f*.16+dir*wake*.23)*h*h;p.y-=(f*.65+wake*.25)*h*ht;}

 float band=mod(floor((51.-w.y)/(102./18.)),2.);col=mix(vec3(.035,.085,.015),vec3(.08,.16,.03),h)*(.9+.2*r)*(1.+.14*band);transformed=p;`;

 const material=ren.isWebGPURenderer?ENGINE.nodeGrass(GU):new THREE.MeshStandardMaterial({side:THREE.DoubleSide,roughness:.96,metalness:0,envMapIntensity:.25});

 if(!ren.isWebGPURenderer){material.onBeforeCompile=shader=>{

  Object.assign(shader.uniforms,GU);

  shader.vertexShader='attribute vec3 off;uniform float t;uniform vec3 c0,c1,c2,c3,c4,c5,c6,v0,v1,v2,v3,v4,v5,v6;varying vec3 col;\n'+shader.vertexShader;

  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=vec3(position);'+deformation);

  shader.fragmentShader='varying vec3 col;\n'+shader.fragmentShader;

  // Leaf cards use upward diffuse normals on both faces, avoiding black backfaces.

  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\n normal=normalize(vNormal);');

  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance += col * .12;');

  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb *= col;');

 };material.customProgramCacheKey=()=>'tevin-lit-grass-v80';}

 const m=new THREE.InstancedMesh(bg,material,N),matrix=new THREE.Matrix4();for(let j=0;j<N;j++)m.setMatrixAt(j,matrix);m.instanceMatrix.needsUpdate=true;m.frustumCulled=false;m.userData.skipAO=true;m.receiveShadow=true;grassM=m;scene.add(m);

 // Small cloth banners use fixed vertex buffers, updated without allocations.

 for(const side of [-1,1])for(const z of [-30,30]){const g=new THREE.PlaneGeometry(3,1.3,12,3),mat=ENGINE.standardMaterial(ren,{color:side<0?0x559eff:0xf5a34c,side:THREE.DoubleSide,roughness:.85});mat.userData.team=side<0?0:1;const flag=new THREE.Mesh(g,mat);flag.position.set(side*40,7,z);flag.rotation.y=side*Math.PI/2;scene.add(flag);windFlags.push(g.attributes.position)}

}

function updateWind(dt,showcase=false){

 GU.t.value+=dt;GU.pc.value.copy(showcase?cm[0].position:localPlayer().p);

 for(let k=0;k<7;k++){const p=GU['c'+k].value,v=GU['v'+k].value;if(showcase){if(k===0)p.copy(cm[0].position);else p.set(1000,1000,1000);v.set(0,0,0)}else if(k<cars.length&&k<6&&cars[k].enabled!==false){p.copy(cars[k].p);v.copy(cars[k].v)}else if(k===6){p.copy(ball.p);v.copy(ball.v)}else {p.set(1000,1000,1000);v.set(0,0,0)}}

 for(let k=0;k<windFlags.length;k++){const a=windFlags[k],v=a.array;for(let i=0;i<v.length;i+=3){const u=(v[i]+1.5)/3;v[i+2]=u*(Math.sin(GU.t.value*1.4-u*5+k)*.16+Math.sin(GU.t.value*2.4+k)*.05)}a.needsUpdate=true}

}



function dispose3d(){

 const geos=new Set(),mats=new Set(),textures=new Set();

 if(scene)scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){mats.add(m);for(const v of Object.values(m))if(v&&v.isTexture)textures.add(v)}});

 geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());

  if(envTarget)envTarget.dispose();if(sun&&sun.shadow.map)sun.shadow.map.dispose();

 const old=$('cv');old.replaceWith(old.cloneNode(false));if(pipeline){pipeline.dispose();pipeline=null}if(ren){ren.dispose();if(ren.forceContextLoss)ren.forceContextLoss()}

  FX=null;garageStage=null;scene=ren=cam=sun=grassM=GT=GU=envTarget=bigPillars=padOff=null;cm=[];padM=[];WM=[];windFlags=[];contactShadows=[];goalLights=[];inited=0;graphicsPreset=-1;

}

async function init3d(forceGL=FORCE_GL){

 try{return await build3d(forceGL)}catch(error){

  if(ren?.isWebGPURenderer&&!forceGL){ENGINE.status.fallbackReason=String(error);dispose3d();return build3d(true)}throw error;

 }

}

async function build3d(forceGL){

 if(inited&&graphicsPreset===cfg.hi+cfg.models*2+cars.length*10)return;if(inited)dispose3d();graphicsPreset=cfg.hi+cfg.models*2+cars.length*10;

 await loadingStage(12,'Connecting graphics device');
  ren=await createGameRenderer(forceGL);renderScale=1;perfEMA=1/60;perfTimer=0;ren.setPixelRatio(pixelRatio());ren.setSize(innerWidth,innerHeight);

 // Static filtered environment avoids the periodic six-pass cube-camera hitch.

  ren.outputColorSpace=THREE.SRGBColorSpace;ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=.92;ren.shadowMap.enabled=!!cfg.hi;ren.shadowMap.type=THREE.PCFShadowMap;ren.shadowMap.autoUpdate=false;ren.shadowMap.needsUpdate=!!cfg.hi;

 scene=new THREE.Scene();scene.background=new THREE.Color(0x34526c);scene.fog=new THREE.Fog(0x516775,125,360);

 cam=new THREE.PerspectiveCamera(77,innerWidth/innerHeight,.1,700);

 await loadingStage(28,'Preparing stadium lighting');
 const et=ENGINE.stadiumEnvironment();envTarget=await ENGINE.environment(ren,et);scene.environment=envTarget.texture;et.dispose();

 scene.add(new THREE.HemisphereLight(0xd5e7ff,0x3d4a29,.85));

 sun=new THREE.DirectionalLight(0xffeed8,2.2);sun.castShadow=!!cfg.hi;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=!!cfg.hi;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=sc.bottom=-76;sc.right=sc.top=76;sc.near=1;sc.far=200;sun.shadow.bias=-.00015;sun.shadow.normalBias=.018;scene.add(sun,sun.target);

 const fill=new THREE.DirectionalLight(0xc3dbff,.85);fill.position.set(-35,28,-35);scene.add(fill);

 const rim=new THREE.DirectionalLight(0xe4efff,.7);rim.position.set(40,16,-35);scene.add(rim);

 [[0x2060ff,-1],[0xff7a20,1]].forEach(([c,s])=>{const l=new THREE.PointLight(c,32,28,2);l.position.set(0,8,s*(HZ-3));l.userData.team=s<0?0:1;l.userData.base=32;goalLights.push(l);scene.add(l);

  if(cfg.hi)for(const x of [-GX,GX]){const lamp=new THREE.PointLight(c,8,12,2);lamp.position.set(x,GH,s*(HZ-.4));lamp.userData.team=s<0?0:1;lamp.userData.base=8;goalLights.push(lamp);scene.add(lamp)}

 });

 const side=wallMat('#3cf'),bw=wallMat('#38f'),ow=wallMat('#f93');WM=[side,bw,ow];

 face(1,-1,floorMat(),(u,v)=>Math.abs(u)<GX&&Math.abs(v)>HZ-R);face(0,1,side);face(0,-1,side);face(2,-1,bw,(u,v)=>Math.abs(u)<GX&&v<GH-HH/2);face(2,1,ow,(u,v)=>Math.abs(u)<GX&&v<GH-HH/2);

 const cc2=cvs(256,256),cg2=cc2.getContext('2d');cg2.strokeStyle='rgba(150,200,255,.95)';cg2.lineWidth=1.5;cg2.strokeRect(0,0,256,256);const cT=tex(cc2);cT.wrapS=cT.wrapT=THREE.RepeatWrapping;cT.repeat.set(10,12);

 face(1,1,new THREE.MeshBasicMaterial({map:cT,transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));

 const nc=cvs(64,64),ng=nc.getContext('2d');ng.strokeStyle='rgba(255,255,255,.95)';ng.lineWidth=2;ng.strokeRect(0,0,64,64);const nt=new THREE.CanvasTexture(nc);nt.wrapS=nt.wrapT=THREE.RepeatWrapping;

 const netM=(col,rx,ry)=>{const t=nt.clone();t.needsUpdate=true;t.repeat.set(rx,ry);const m=new THREE.MeshBasicMaterial({map:t,color:col,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false,toneMapped:false});m.userData.team=col===teamPalette[0]?0:1;return m};

 const pl=(g,mat,x,y,z,rx,ry)=>{const o=new THREE.Mesh(g,mat);o.position.set(x,y,z);o.rotation.set(rx,ry,0);scene.add(o);return o};

 [-1,1].forEach(s=>{const col=teamPalette[s<0?0:1],zc=s*(HZ+GD/2),pm=new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false});

  pl(new THREE.PlaneGeometry(2*GX,GH),netM(col,32,12),0,GH/2,s*(HZ+GD),0,0);                                   // back net

  [-1,1].forEach(sx=>pl(new THREE.PlaneGeometry(GD,GH),netM(col,18,12),sx*GX,GH/2,zc,0,Math.PI/2));             // side nets (from the goal line back)

  pl(new THREE.PlaneGeometry(2*GX,GD),netM(col,32,18),0,GH,zc,Math.PI/2,0);                                    // roof net

  pl(new THREE.PlaneGeometry(2*GX,GD+R),new THREE.MeshStandardMaterial({color:new THREE.Color(0x163d20),emissive:col,emissiveIntensity:.02,roughness:.9}),0,.02,s*(HZ+(GD-R)/2),-Math.PI/2,0);   // goal floor

  [-GX,GX].forEach(x=>pl(new THREE.CylinderGeometry(.2,.2,GH,12),pm,x+Math.sign(x)*.2,GH/2,s*(HZ+.2),0,0));                        // posts

  const cb=pl(new THREE.CylinderGeometry(.2,.2,2*GX,12),pm,0,GH+.2,s*(HZ+.2),0,0);cb.rotation.z=Math.PI/2});

 makeGrass();

 await loadingStage(55,'Loading car models and textures');
 const importedTextures=assetTextures=cfg.models?await ENGINE.loadImportedTextures():null;

 cm=cars.map(createCarVisual);

 // Both factories return unattached groups. Attach here, before shader warming.

 scene.add(...cm);

 // V7 garage turntable: independent studio fills, neutral graphite and a halo.

 garageStage=new THREE.Group();garageStage.visible=false;scene.add(garageStage);

 const deck=new THREE.Mesh(new THREE.CylinderGeometry(2.25,2.3,.045,80),ENGINE.physicalMaterial(ren,{color:0x172434,metalness:.2,roughness:.72,clearcoat:.12}));deck.position.y=-.008;deck.receiveShadow=true;garageStage.add(deck);

 const halo=new THREE.Mesh(new THREE.TorusGeometry(2.28,.014,6,100).rotateX(Math.PI/2),new THREE.MeshBasicMaterial({color:0x80dfff,toneMapped:false}));halo.position.y=.02;garageStage.add(halo);

 for(const [x,y,z,color,power] of [[1,3,3,0xd9efff,12],[-3,2,-2,0x93c5ff,10],[3,2,-3,0xffce97,12]]){const lamp=new THREE.PointLight(color,power,12,2);lamp.position.set(x,y,z);garageStage.add(lamp)}



 // Floor-projected contact shadows stay on the pitch during jumps and rolls.

 // Three small decals also ground the ball in Performance mode without a shadow map.

 for(let k=0;k<cars.length+1;k++){const shadow=new THREE.Mesh(new THREE.PlaneGeometry(k<cars.length?2.9:2.2,k<cars.length?1.75:2.2).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:glowTex(),color:0x000000,transparent:true,opacity:.3,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));shadow.name='Contact shadow';shadow.renderOrder=1;scene.add(shadow);contactShadows.push(shadow)}

 const bc=cvs(512,256),bg=bc.getContext('2d');bg.fillStyle='#e8eef5';bg.fillRect(0,0,512,256);bg.fillStyle='#1a2330';for(let i=0;i<30;i++){bg.beginPath();bg.arc(Math.random()*512,Math.random()*256,10+Math.random()*14,0,7);bg.fill()}bg.strokeStyle='#8899aa';bg.lineWidth=3;for(let i=0;i<9;i++){bg.strokeRect(i*60,0,60,256)}

 bg.fillStyle='#d9e2ec';bg.fillRect(0,0,512,256);const ec2=cvs(512,256),eg2=ec2.getContext('2d');eg2.fillStyle='#000';eg2.fillRect(0,0,512,256);

 for(let r=0;r<12;r++)for(let q=0;q<14;q++){const x=q*40+(r%2?20:0),y=r*23+12;bg.beginPath();eg2.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3,px=x+Math.cos(a)*21,py=y+Math.sin(a)*21;bg[k?'lineTo':'moveTo'](px,py);eg2[k?'lineTo':'moveTo'](px,py)}bg.closePath();eg2.closePath();bg.fillStyle=(q+r)%3?'#c4d0de':'#2a3444';bg.fill();bg.strokeStyle='#5a6a80';bg.lineWidth=2;bg.stroke();eg2.strokeStyle='#fff';eg2.lineWidth=3;eg2.stroke()}

 bm=new THREE.Mesh(cfg.models?ENGINE.importedBallGeometry():new THREE.SphereGeometry(BR,40,28),ENGINE.physicalMaterial(ren,{map:cfg.models?importedTextures.ball:tex(bc),emissiveMap:cfg.models?null:tex(ec2),emissive:0x222222,emissiveIntensity:cfg.models?.04:.35,metalness:.18,roughness:.5,clearcoat:.25,envMapIntensity:.6,transparent:false,opacity:1,side:THREE.FrontSide}));bm.castShadow=true;scene.add(bm);

 const sp=cvs(64,64),sg=sp.getContext('2d'),rg=sg.createRadialGradient(32,32,0,32,32,32);rg.addColorStop(0,'#fff');rg.addColorStop(.3,'rgba(255,255,255,.5)');rg.addColorStop(1,'rgba(255,255,255,0)');sg.fillStyle=rg;sg.fillRect(0,0,64,64);

  // Three draw calls for all pads. Matrices change only when a pad is picked up or respawns.

  const nSmall=PADS.filter(p=>!p.big).length,nBig=PADS.length-nSmall;

  const padTexture=ENGINE.boostSurface(),padMaterial=ENGINE.standardMaterial(ren,{map:padTexture,emissiveMap:padTexture,emissive:0xffbf66,emissiveIntensity:.35,metalness:.4,roughness:.48});

  const smallPads=new THREE.InstancedMesh(new THREE.CircleGeometry(.8,32).rotateX(-Math.PI/2),padMaterial,nSmall);

  const bigPads=new THREE.InstancedMesh(new THREE.CircleGeometry(1.7,48).rotateX(-Math.PI/2),padMaterial,nBig);

  bigPillars=new THREE.InstancedMesh(new THREE.TorusGeometry(.58,.08,6,32).rotateX(-Math.PI/2),ENGINE.standardMaterial(ren,{color:0xffd18a,emissive:0xff9c28,emissiveIntensity:1.1,metalness:.35,roughness:.32}),nBig);

  padOff=new THREE.Matrix4().makeScale(0,0,0);let smallIndex=0,bigIndex=0;

  for(const mesh of [smallPads,bigPads,bigPillars]){mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;scene.add(mesh)}

  PADS.forEach(p=>{const index=p.big?bigIndex++:smallIndex++,mesh=p.big?bigPads:smallPads,base=new THREE.Matrix4().makeTranslation(p.x,.05,p.z),pillar=p.big?new THREE.Matrix4().makeTranslation(p.x,.5,p.z):null;

   mesh.setMatrixAt(index,base);if(p.big)bigPillars.setMatrixAt(index,pillar);padM.push({mesh,index,base,pillar,visible:true})});

  smallPads.instanceMatrix.needsUpdate=bigPads.instanceMatrix.needsUpdate=bigPillars.instanceMatrix.needsUpdate=true;

  await createGraphicsEffects();

 // Instanced camera-facing quads preserve the soft additive particle appearance.

 pts=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:FX.maps.soft||new THREE.CanvasTexture(sp),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),NP);

 pts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);pts.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(NP*3),3).setUsage(THREE.DynamicDrawUsage);

 pts.userData.matrixRange={start:0,count:0};pts.userData.colorRange={start:0,count:0};

 pts.count=0;pts.frustumCulled=false;scene.add(pts);

 // The roof is open over the pitch, with a coherent sky behind the stadium.

 scene.add(new THREE.Mesh(new THREE.SphereGeometry(500,48,24),new THREE.MeshBasicMaterial({map:ENGINE.stadiumSky(),side:THREE.BackSide,fog:false,toneMapped:false})));

 const stadium=ENGINE.championshipStadium(ren,teamPalette,cfg.hi);batchMeshes(stadium);stadium.traverse(o=>o.castShadow=false);scene.add(stadium);addSpectators();

 cm.forEach(m=>m.traverse(o=>{o.castShadow=!!o.isMesh&&!o.material.transparent}));

 pipeline=ENGINE.createPipeline(ren,scene,cam,cfg.hi);pipeline.resize(innerWidth,innerHeight,pixelRatio());

 const lp=localPlayer();cam.position.copy(cpos);cam.lookAt(lookPos);sun.position.set(35,55,22);sun.target.position.set(0,0,0);

 await loadingStage(90,'Compiling materials and effects');
 await ENGINE.prewarm(ren,scene,cam,pipeline,cm,pts);

 if(ren.isWebGPURenderer)ren.onDeviceLost=handleDeviceLoss;

 inited=1;arenaThemeKey='';applyArenaTheme();$('cv').addEventListener('webglcontextlost',e=>{e.preventDefault();if(e.currentTarget!==$('cv'))return;quit();$('go').disabled=true;document.querySelector('.hint').textContent='The graphics context was lost. Reload the page to restart.'});

}

let recoveringGraphics=false;

async function handleDeviceLoss(info){

 if(info.reason==='destroyed'||recoveringGraphics)return;

 recoveringGraphics=true;const previous=st;if(MP.active)mpSetPause(true);else st='PAUSE';audioSilence();

 try{dispose3d();await init3d(true);if(!MP.active)st=previous;last=performance.now();acc=0}

 catch(error){console.error('Graphics recovery failed',error);quit();$('go').disabled=true;document.querySelector('.hint').textContent='Graphics device unavailable. Reload the page to restart.'}

 finally{recoveringGraphics=false}

}

addEventListener('resize',()=>{if(!inited)return;ren.setPixelRatio(pixelRatio());ren.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();if(pipeline)pipeline.resize(innerWidth,innerHeight,pixelRatio())});

function render(dt){

 if(!inited||st==='PAUSE')return;updateGraphicsEffects(dt);if(st==='MENU'||st==='END'){renderShowcase(dt);return}bm.visible=true;garageStage.visible=false;grassM.visible=true;if(cam.view?.enabled)cam.clearViewOffset();const alpha=cl(acc/SIM_DT,0,1);

 for(let k=0;k<cars.length;k++){const c=cars[k],m=cm[k];m.visible=c.enabled;if(!c.enabled)continue;paintCar(k);m.position.lerpVectors(c.frameP,c.p,alpha);m.quaternion.copy(c.frameQ).slerp(c.q,alpha);

   renderForward.set(1,0,0).applyQuaternion(c.q);renderRight.set(0,0,1).applyQuaternion(c.q);const roll=c.v.dot(renderForward)*dt/.24;

   for(const w of m.userData.wheels){w.rotation.z-=roll;w.parent.rotation.y=w.parent.userData.front?-c.inp.steer*.38:0}m.userData.f.visible=!!c.bst;if(c.bst)m.userData.f.scale.set(1,.7+Math.random()*.7,1);

   if(c.ground&&c.v.lengthSq()>49&&(c.inp.ps||Math.abs(c.v.dot(renderRight))>2)&&Math.random()<Math.min(1,dt*35)){renderEffect.set(-.5,-.38,Math.random()<.5?-.4:.4).applyQuaternion(c.q).add(c.p);emit(renderEffect.x,renderEffect.y,renderEffect.z,(Math.random()-.5)*1.5,1+Math.random()*1.5,(Math.random()-.5)*1.5,.5,.18,.4,.1)}

   if(c.bst){renderEffect.copy(renderForward).multiplyScalar(-.58).add(c.p);for(let j=0;j<(cfg.hi?3:1);j++)emit(renderEffect.x,renderEffect.y,renderEffect.z,c.v.x*.5+(Math.random()-.5)*2,c.v.y*.5+(Math.random()-.5),c.v.z*.5+(Math.random()-.5)*2,.35,((c.color>>16)&255)/255,((c.color>>8)&255)/255,(c.color&255)/255)}}

 bm.position.lerpVectors(ball.frameP,ball.p,alpha);const sp=ball.v.length(),wl=ball.w.length();if(wl>.01){spinAxis.copy(ball.w).divideScalar(wl);spinQ.setFromAxisAngle(spinAxis,wl*dt*(st=='GOAL'?.3:1));bm.quaternion.premultiply(spinQ).normalize()}

 for(let k=0;k<cars.length+1;k++){const shadow=contactShadows[k],p=k<cars.length?cm[k].position:bm.position,height=Math.max(0,p.y-(k<cars.length?.485:BR));

  shadow.visible=(k===cars.length||cars[k].enabled)&&Math.abs(p.x)<36.5&&Math.abs(p.z)<46.5&&height<10;shadow.position.set(p.x,.018,p.z);shadow.material.opacity=(cfg.hi?.22:.36)*Math.exp(-height*.34);shadow.scale.setScalar(1+Math.min(height,10)*.055);

  if(k<cars.length){renderForward.set(1,0,0).applyQuaternion(cm[k].quaternion);shadow.rotation.y=-Math.atan2(renderForward.z,renderForward.x)}}

  const glow=ball.last>=0?ball.color||PALETTE[ball.last]:0x222222;if(bm.userData.glow!==glow){bm.material.emissive.setHex(glow);bm.userData.glow=glow}

  for(let k=0;k<padM.length;k++){const p=padM[k],on=PADS[k].t<=0;if(on===p.visible)continue;p.mesh.setMatrixAt(p.index,on?p.base:padOff);p.mesh.instanceMatrix.needsUpdate=true;if(p.pillar){bigPillars.setMatrixAt(p.index,on?p.pillar:padOff);bigPillars.instanceMatrix.needsUpdate=true}p.visible=on}

  // Keep live particles packed; upload only the used prefix of each dynamic buffer.

  for(let k=0;k<particleCount;){pl[k]-=dt;if(pl[k]<=0){const last=--particleCount;if(k!==last){const dst=k*3,src=last*3;for(let j=0;j<3;j++){pp[dst+j]=pp[src+j];pv[dst+j]=pv[src+j];pb[dst+j]=pb[src+j];pc[dst+j]=pc[src+j]}pl[k]=pl[last]}continue}

   const o=k*3;pp[o]+=pv[o]*dt;pp[o+1]+=pv[o+1]*dt;pp[o+2]+=pv[o+2]*dt;pv[o+1]-=6*dt;const f=Math.min(1,pl[k]*2.5);pc[o]=pb[o]*f;pc[o+1]=pb[o+1]*f;pc[o+2]=pb[o+2]*f;k++}



 const local=localPlayer();updateWind(dt);

  // Independent position and aim springs make ball cam smooth through flips and abrupt reversals.

  const c=local,cp=cm[c.id].position;camDesired.set(1,0,0).applyQuaternion(cm[c.id].quaternion).setY(0);if(camDesired.lengthSq()<.01)camDesired.copy(cd);else camDesired.normalize();

  camToBall.copy(bm.position).sub(cp);if(ballCam&&camToBall.lengthSq()>.01){camToBall.y=0;if(camToBall.lengthSq()>4)camDesired.copy(camToBall.normalize())}

  cd.lerp(camDesired,1-Math.exp(-dt*(4+cameraSettings.stiffness*12))).normalize();camDesired.copy(cp).addScaledVector(cd,-(cameraSettings.distance+c.v.length()*.008));camDesired.y=Math.max(camDesired.y+cameraSettings.height,.9);if(c.ground&&c.n.y<.8)camDesired.addScaledVector(c.n,cameraSettings.height*.8);

  cpos.lerp(camDesired,1-Math.exp(-dt*(cpos.distanceToSquared(camDesired)>64?25:4+cameraSettings.stiffness*14)));cam.position.copy(cpos);

  for(let k=0;k<3;k++){surf(cam.position);if(SS>=1)break;cam.position.addScaledVector(SN,1-SS)}cpos.copy(cam.position);

  if(ballCam){camLook.copy(bm.position).sub(cp);if(camLook.length()>18)camLook.setLength(18);camLook.add(cp);camLook.y=Math.max(cp.y+.35,camLook.y);}else camLook.copy(cp).addScaledVector(cd,9);if(!ballCam)camLook.y=cp.y+cameraSettings.height-Math.tan(cameraSettings.angle*Math.PI/180)*(9+cameraSettings.distance);lookPos.lerp(camLook,1-Math.exp(-dt*(ballCam?13:9)));

  if(cameraSettings.shake&&shake>.002){cam.position.x+=(Math.random()-.5)*shake;cam.position.y+=(Math.random()-.5)*shake;shake*=Math.exp(-dt*13)}else shake=0;

  if(sp>20)emit(ball.p.x,ball.p.y,ball.p.z,0,0,0,.45,((ball.color>>16)&255)/255,((ball.color>>8)&255)/255,(ball.color&255)/255);cam.lookAt(lookPos);

  const fov=2*Math.atan(Math.tan(cameraSettings.fov*Math.PI/360)/(16/9))*180/Math.PI;cam.fov+=(fov-cam.fov)*(1-Math.exp(-dt*6));if(Math.abs(fov-cam.fov)>.015)cam.updateProjectionMatrix();

  if(cfg.hi){shadowTimer+=dt;if(shadowTimer>=1/30){ren.shadowMap.needsUpdate=true;sun.shadow.needsUpdate=true;shadowTimer=0}}

 fr++; // Constant wall emission avoids shimmer and exposure pumping.

  goalPulse=Math.max(0,goalPulse-dt*.35);

 for(let k=0;k<goalLights.length;k++)goalLights[k].intensity=goalLights[k].userData.base*(1+goalPulse*.7);

 uploadParticles();pipeline.render();

  if(st==='PLAY'){perfEMA+=(dt-perfEMA)*.03;perfTimer+=dt;if(perfTimer>2){perfTimer=0;const next=perfEMA>.022?Math.max(.55,renderScale-.08):perfEMA<.0172?Math.min(1,renderScale+.05):renderScale;if(next!==renderScale){renderScale=next;ren.setPixelRatio(pixelRatio());pipeline.resize(innerWidth,innerHeight,pixelRatio())}}}

  const sec=ot?-1-Math.floor(tl):Math.ceil(Math.max(0,tl));if(sec!==uiClock){uiClock=sec;$('clk').textContent=sandbox?'FREE':cfg.mode===1?'TO 7':ot?`+${Math.floor(tl/60)}:${String(Math.floor(tl)%60).padStart(2,'0')}`:`${sec/60|0}:${String(sec%60).padStart(2,'0')}`}

  const boost=Math.round(c.boost),speed=Math.round(c.v.length()*3.6);if(boost!==uiBoost){uiBoost=boost;$('bo').style.setProperty('--p',boost);$('bo').classList.toggle('low',boost<15);$('bn').textContent=boost}if(speed!==uiSpeed){uiSpeed=speed;$('speedvalue').textContent=speed;$('spd').style.setProperty('--speed',cl(speed/83,0,1));$('spd').classList.toggle('fast',speed>=79)}

  const surfaceLabel=speed>=79?'SUPERSONIC':!c.ground?'AIRBORNE':Math.abs(c.n.y)<.7?'WALL GRIP':'ON THE PITCH';if($('surface').textContent!==surfaceLabel)$('surface').textContent=surfaceLabel;

  if(DBG&&(dbgTimer+=dt)>.1){dbgTimer=0;const fv=renderForward.set(1,0,0).applyQuaternion(c.q),rv=renderRight.set(0,0,1).applyQuaternion(c.q),bt=cars[1];$('dbg').textContent=[`speed ${c.v.length().toFixed(1)} m/s  fwd ${c.v.dot(fv).toFixed(1)}  lat ${c.v.dot(rv).toFixed(1)}`,`grounded ${c.ground}  grip ${(c.grip/CM).toFixed(0)} m/s2  yawRate ${c.wy.toFixed(2)}`,`normal ${c.n.x.toFixed(2)} ${c.n.y.toFixed(2)} ${c.n.z.toFixed(2)}  angVel ${c.w.x.toFixed(1)} ${c.w.y.toFixed(1)} ${c.w.z.toFixed(1)}`,`canJump ${c.canJ}  canDodge ${c.canD}  dodgeCD ${c.dcd.toFixed(2)}  airT ${c.aT.toFixed(2)}`,`boost ${c.boost.toFixed(0)}  using ${c.bst}`,`ball ${ball.v.length().toFixed(1)} m/s  spin ${ball.w.length().toFixed(1)}  lastHit ${ball.hit.toFixed(1)}`,`bot ${bt.ai.mode}  target ${bt.tgt.x.toFixed(0)},${bt.tgt.z.toFixed(0)}`].join('\n')}

  if(DBG&&dbgTimer===0)$('dbg').textContent+=`\nwheels ${c.wheelsOn||0}  hull depth ${(carPenetration(c)*1000).toFixed(2)} mm  memory ${learnMemory.length}/${LEARN_MAX}  influence ${((cars[1].ai.tune.confidence||0)*100).toFixed(1)}%`;

  flash=Math.max(0,flash-dt*1.6);$('flash').style.opacity=flash.toFixed(3);

 

}

const spinAxis=new V3(),spinQ=new Qn();let DBG=0,last=0,acc=0;

function frame(t){requestAnimationFrame(frame);const dt=cl((t-last)/1000||0,0,.1);last=t;pollController();introFrame(dt);
 if(LOADING.active){acc=0;if(inited&&!ENGINE.status.warming)render(dt);return}

 if(MP.active){mpPauseGate();if(MP.role==='guest'){if(st!=='PAUSE')applyMultiplayer(dt);acc=0;publishMultiplayer(dt);updateAudio();render(dt);return}}

 if(mt>0&&(mt-=dt)<=0)$('msg').style.opacity=0;

 updateServeHint();if(st=='COUNT'){const n=Math.ceil(cnt);cnt-=dt;const m=Math.ceil(cnt);if(cnt<=0){st='PLAY';msg('GO!',.8,'#4f8')}else if(m!=n||!mt){msg(m,1,'#fff')}}

 if(st=='PLAY'||st=='GOAL'||st=='COUNT')acc+=dt*(st=='GOAL'?.3:1);else acc=0;

  let steps=0;while(acc+1e-10>=SIM_DT&&steps++<4){acc=Math.max(0,acc-SIM_DT);for(let k=0;k<cars.length;k++){cars[k].frameP.copy(cars[k].p);cars[k].frameQ.copy(cars[k].q)}ball.frameP.copy(ball.p);sim(DT);sim(DT)}if(steps>4)acc%=SIM_DT; // avoid a backlog spiral after a slow or hidden frame

 if(st=='GOAL'&&(gt-=dt)<=0&&(!MP.active||MP.role==='host')){if(!sandbox&&(ot||cfg.mode===1&&Math.max(...score)>=7||cfg.mode===0&&tl<=0&&score[0]!==score[1]))endMatch();else{if(!sandbox&&cfg.mode===0&&tl<=0){ot=1;tl=0}kickoff()}}

 publishMultiplayer(dt);updateAudio();render(dt)}

// INLINE:test-hooks.js
setupModesUI();setupMenu();setupDriverSettings();setupSocial();setupAudioUI();setupGraphicsUI();configureCars();kickoff();st='MENU';setupIntro();requestAnimationFrame(frame);

window.tevinDiagnostics=()=>({backend:ENGINE.status.backend,physicsHz:120,simulationHz:60,policyVersion:1,policyLength:policyEncoders[1].data.length,build:BUILD,quality:cfg.hi?'Detail':'Chromebook',fps:Math.round(1/perfEMA),renderScale,pads:PADS.length,protocol:PROTOCOL});

window.tevinBoot.ready=true;window.tevinBoot.stage='ready';window.tevinBoot.show('BUILD 9.2 · AFTERSHOCK · Ready to play');


} catch(error) { window.tevinBoot.error=String(error.message||error);window.tevinBoot.show("Startup failed at "+window.tevinBoot.stage+": "+window.tevinBoot.error);console.error(error); }
})();
