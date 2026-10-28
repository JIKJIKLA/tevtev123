// Independent implementation from measured gameplay values. Car contact remains
// the game's compact sphere-chain approximation, not Rocket League's exact mesh.
// References: RocketSim src/RLConst.h and src/Sim/Arena/Arena.cpp (links in release).
const DEMOLITION=Object.freeze({speed:22,maintainSpeed:21,maintainTime:1,respawn:3,bumper:.645});
const demoForward=new V3(),demoDelta=new V3(),demoContact=new V3(),demoLocal=new V3(),demoInverse=new Qn();
const demoAttackerCenter=new V3(),demoVictimCenter=new V3(),demoNormal=new V3();
function carDemolished(c){return Number.isFinite(c?.demoTime)&&c.demoTime>0;}
function updateSupersonic(c,dt){
 const speed=c.v.length()/cfg.speed;
 if(speed>=DEMOLITION.speed){c.supersonic=true;c.supersonicTime=0;}
 else if(!c.supersonic||speed<DEMOLITION.maintainSpeed){c.supersonic=false;c.supersonicTime=0;}
 else{c.supersonicTime+=dt;if(c.supersonicTime>=DEMOLITION.maintainTime)c.supersonic=false;}
}
function demolishCar(attacker,victim){
 if(st!=='PLAY'||DED.active||MP.active&&MP.role==='guest'||!attacker.enabled||!victim.enabled||attacker.team===victim.team||carDemolished(attacker)||carDemolished(victim))return false;
 victim.demoTime=DEMOLITION.respawn;victim.demoSeq=(victim.demoSeq||0)+1;victim.demoBy=attacker.id;
 victim.v.set(0,0,0);victim.w.set(0,0,0);victim.wy=0;victim.jp=victim.jh=victim.bst=victim.boostHold=0;victim.supersonic=false;victim.supersonicTime=0;Object.assign(victim.inp,Z);
 victim.prevP.copy(victim.p);victim.frameP.copy(victim.p);victim.prevQ.copy(victim.q);victim.frameQ.copy(victim.q);return true;
}
function tryDemolition(attacker,victim,contact){
 if(carDemolished(attacker)||carDemolished(victim)||attacker.team===victim.team)return false;
 const speed=attacker.v.length(),threshold=DEMOLITION.speed*cfg.speed;
 if(speed<threshold&&!attacker.supersonic)return false;
 demoForward.set(1,0,0).applyQuaternion(attacker.q);if(attacker.v.dot(demoForward)<speed*.75)return false;
 demoDelta.copy(victim.p).sub(attacker.p);const distance=demoDelta.length();if(distance<1e-5)return false;demoDelta.divideScalar(distance);
 // A rear/side scrape or an opponent pulling away cannot demolish a car.
 if(attacker.v.dot(demoDelta)<=victim.v.dot(demoDelta)+.1)return false;
 demoInverse.copy(attacker.q).invert();demoLocal.copy(contact).sub(attacker.p).applyQuaternion(demoInverse);
 const bumper=DEMOLITION.bumper*bodyPhysics(attacker).half[0]/BODY_PHYSICS[0].half[0];if(demoLocal.x<=bumper)return false;
 return demolishCar(attacker,victim);
}
function demolitionPair(a,b){
 // Test the front manifold before the ordinary bump impulse: a side sphere's
 // earlier solver contact must not slow a valid bumper hit below supersonic.
 for(let turn=0;turn<2;turn++){
  const attacker=turn?b:a,victim=turn?a:b;if(attacker.team===victim.team||carDemolished(attacker)||carDemolished(victim))continue;
  if(attacker.v.length()<DEMOLITION.speed*cfg.speed&&!attacker.supersonic)continue;
  const ap=bodyPhysics(attacker),bp=bodyPhysics(victim),radius=ap.half[2]+bp.half[2];
  demoAttackerCenter.set(ap.center[0]+Math.max(0,ap.half[0]-ap.half[2]),ap.center[1],0).applyQuaternion(attacker.q).add(attacker.p);
  for(let f=-1;f<=1;f++){
   demoVictimCenter.set(bp.center[0]+f*Math.max(0,bp.half[0]-bp.half[2]),bp.center[1],0).applyQuaternion(victim.q).add(victim.p);
   demoNormal.copy(demoVictimCenter).sub(demoAttackerCenter);const distance=demoNormal.length();if(distance>=radius||distance<1e-5)continue;
   demoContact.copy(demoAttackerCenter).addScaledVector(demoNormal,ap.half[2]/distance);if(tryDemolition(attacker,victim,demoContact))return true;
  }
 }
 return false;
}
function respawnDemolishedCar(c){
 // Choose the least occupied standard own-goal spawn deterministically, so two
 // simultaneous respawns do not stack and authority/client state cannot diverge.
 const side=c.team?1:-1,z=side*46.08,sites=[-23.04,-26.88,23.04,26.88];let best=-Infinity,x=sites[(c.id+(c.demoSeq||0))%4];
 for(let n=0;n<sites.length;n++){const candidate=sites[(n+c.id+(c.demoSeq||0))%sites.length];let clear=Infinity;for(const other of cars)if(other!==c&&other.enabled&&!carDemolished(other))clear=Math.min(clear,(other.p.x-candidate)**2+(other.p.z-z)**2);if(clear>best){best=clear;x=candidate;}}
 const serial=c.demoSeq||0,sequence=(c.respawnSeq||0)+1,by=c.demoBy??-1;resetCar(c,x,z);c.demoSeq=serial;c.demoBy=by;c.respawnSeq=sequence;
 c.q.setFromAxisAngle(Y3,side*Math.PI/2);c.p.y=Math.max(.36,bodyPhysics(c).height+.015);c.prevP.copy(c.p);c.frameP.copy(c.p);c.renderP.copy(c.p);c.prevQ.copy(c.q);c.frameQ.copy(c.q);c.moveQ.copy(c.q);c.sweepQ.copy(c.q);c.sweepEnd.copy(c.p);
}
function tickDemolition(c,dt){
 if(!carDemolished(c))return false;
 c.demoTime=Math.max(0,c.demoTime-dt);c.jp=c.jh=c.bst=c.boostHold=0;c.v.set(0,0,0);c.w.set(0,0,0);Object.assign(c.inp,Z);
 // Prediction may count down the visual timer, but only authority can respawn.
 if(c.demoTime<1e-8){if(DED.active||MP.active&&MP.role==='guest')c.demoTime=.000001;else respawnDemolishedCar(c);}
 return true;
}
function validDemoPacket(p){
 return (p.demoTime===undefined||Number.isFinite(p.demoTime)&&p.demoTime>=0&&p.demoTime<=DEMOLITION.respawn+.001)
 &&['demoSeq','respawnSeq'].every(key=>p[key]===undefined||Number.isSafeInteger(p[key])&&p[key]>=0&&p[key]<1e9)
 &&(p.demoBy===undefined||Number.isInteger(p.demoBy)&&p.demoBy>=-1&&p.demoBy<6)
 &&(p.supersonic===undefined||typeof p.supersonic==='boolean');
}
function readDemoPacket(c,p){c.demoTime=p.demoTime||0;c.demoSeq=p.demoSeq||0;c.demoBy=p.demoBy??-1;c.respawnSeq=p.respawnSeq||0;c.supersonic=!!p.supersonic;}
