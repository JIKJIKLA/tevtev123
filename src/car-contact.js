// Independent box contact solver using the measured body profiles. This is a
// compact single-manifold approximation, not the proprietary game's solver.
const CAR_CONTACT={axesA:[new V3(),new V3(),new V3()],axesB:[new V3(),new V3(),new V3()],centerA:new V3(),centerB:new V3(),delta:new V3(),axis:new V3(),normal:new V3(),point:new V3(),supportA:new V3(),supportB:new V3(),armA:new V3(),armB:new V3(),velocityA:new V3(),velocityB:new V3(),relative:new V3(),tangent:new V3(),torque:new V3(),angular:new V3(),inverse:new Qn(),impulse:new V3(),depth:0};
function carContactAxis(axis,ap,bp){
 const m=CAR_CONTACT,l2=axis.lengthSq();if(l2<1e-10)return true;axis.multiplyScalar(1/Math.sqrt(l2));
 const aa=m.axesA,bb=m.axesB,ra=ap.half[0]*Math.abs(axis.dot(aa[0]))+ap.half[1]*Math.abs(axis.dot(aa[1]))+ap.half[2]*Math.abs(axis.dot(aa[2])),rb=bp.half[0]*Math.abs(axis.dot(bb[0]))+bp.half[1]*Math.abs(axis.dot(bb[1]))+bp.half[2]*Math.abs(axis.dot(bb[2])),distance=m.delta.dot(axis),overlap=ra+rb-Math.abs(distance);
 if(overlap<=0)return false;
 if(overlap<m.depth-1e-8){m.depth=overlap;m.normal.copy(axis).multiplyScalar(distance<0?-1:1);}return true;
}
function carBoxContact(a,b){
 const m=CAR_CONTACT,ap=bodyPhysics(a),bp=bodyPhysics(b);
 m.centerA.set(...ap.center).applyQuaternion(a.q).add(a.p);m.centerB.set(...bp.center).applyQuaternion(b.q).add(b.p);m.delta.copy(m.centerB).sub(m.centerA);
 if(m.delta.lengthSq()>(ap.radius+bp.radius)**2)return false;
 for(let i=0;i<3;i++){m.axesA[i].set(i===0?1:0,i===1?1:0,i===2?1:0).applyQuaternion(a.q);m.axesB[i].set(i===0?1:0,i===1?1:0,i===2?1:0).applyQuaternion(b.q);}
 m.depth=Infinity;
 for(let i=0;i<3;i++)if(!carContactAxis(m.axis.copy(m.axesA[i]),ap,bp)||!carContactAxis(m.axis.copy(m.axesB[i]),ap,bp))return false;
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)if(!carContactAxis(m.axis.crossVectors(m.axesA[i],m.axesB[j]),ap,bp))return false;
 m.supportA.copy(m.centerA);m.supportB.copy(m.centerB);
 for(let i=0;i<3;i++){const da=m.axesA[i].dot(m.normal),db=m.axesB[i].dot(m.normal);if(Math.abs(da)>1e-8)m.supportA.addScaledVector(m.axesA[i],Math.sign(da)*ap.half[i]);if(Math.abs(db)>1e-8)m.supportB.addScaledVector(m.axesB[i],-Math.sign(db)*bp.half[i]);}
 m.point.copy(m.supportA).add(m.supportB).multiplyScalar(.5);m.armA.copy(m.point).sub(a.p);m.armB.copy(m.point).sub(b.p);return true;
}
function carContactVelocity(c,arm,out){
 const m=CAR_CONTACT;if(c.ground)m.angular.copy(c.n).multiplyScalar(-c.wy);else m.angular.copy(c.w).applyQuaternion(c.q);return out.crossVectors(m.angular,arm).add(c.v);
}
function carInverseInertia(c,torque,out){
 const m=CAR_CONTACT,inertia=bodyPhysics(c).inertia;m.inverse.copy(c.q).invert();out.copy(torque).applyQuaternion(m.inverse);out.set(out.x/inertia.x,out.y/inertia.y,out.z/inertia.z).applyQuaternion(c.q);
 // Supported tires counter pitch/roll torque; their yaw response remains live.
 if(c.ground){const yaw=out.dot(c.n);out.copy(c.n).multiplyScalar(yaw);}return out;
}
function carContactMass(c,arm,direction){
 const m=CAR_CONTACT;m.torque.crossVectors(arm,direction);carInverseInertia(c,m.torque,m.angular);return Math.max(0,m.torque.dot(m.angular));
}
function carContactImpulse(c,arm,impulse){
 const m=CAR_CONTACT;c.v.addScaledVector(impulse,1/CM);m.torque.crossVectors(arm,impulse);carInverseInertia(c,m.torque,m.angular);
 if(c.ground)c.wy=cl(c.wy-m.angular.dot(c.n),-PHYS.air.wmax,PHYS.air.wmax);
 else{m.inverse.copy(c.q).invert();c.w.add(m.angular.applyQuaternion(m.inverse));if(c.w.lengthSq()>PHYS.air.wmax**2)c.w.setLength(PHYS.air.wmax);}
 if(c.v.lengthSq()>PHYS.car.maxSpeed**2)c.v.setLength(PHYS.car.maxSpeed);
}
function resolveCarContact(a,b){
 const m=CAR_CONTACT,P=PHYS.car,n=m.normal;
 // One mass-balanced positional correction avoids nine repeated sphere shoves.
 const correction=Math.max(0,m.depth-.0005)*.4;a.p.addScaledVector(n,-correction);b.p.addScaledVector(n,correction);
 carContactVelocity(a,m.armA,m.velocityA);carContactVelocity(b,m.armB,m.velocityB);m.relative.copy(m.velocityB).sub(m.velocityA);const approach=m.relative.dot(n);if(approach>=0)return;
 const normalMass=2/CM+carContactMass(a,m.armA,n)+carContactMass(b,m.armB,n),j=-(1+P.carE)*approach/normalMass;
 m.impulse.copy(n).multiplyScalar(j);carContactImpulse(b,m.armB,m.impulse);m.impulse.negate();carContactImpulse(a,m.armA,m.impulse);
 carContactVelocity(a,m.armA,m.velocityA);carContactVelocity(b,m.armB,m.velocityB);m.tangent.copy(m.velocityB).sub(m.velocityA);m.tangent.addScaledVector(n,-m.tangent.dot(n));const slip=m.tangent.length();
 if(slip>1e-6){m.tangent.multiplyScalar(1/slip);const inverseMass=2/CM+carContactMass(a,m.armA,m.tangent)+carContactMass(b,m.armB,m.tangent),friction=Math.min(P.carMu*j,slip/inverseMass);m.impulse.copy(m.tangent).multiplyScalar(-friction);carContactImpulse(b,m.armB,m.impulse);m.impulse.negate();carContactImpulse(a,m.armA,m.impulse);}
 bumpFx(-approach);
}
