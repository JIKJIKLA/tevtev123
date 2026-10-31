// Independent single-contact model based on the measured equations, not a copy
// of a simulator engine. Source pin, units and remaining limits are documented
// in docs/FIDELITY-BALL-ARENA.md. World Y is up; the car's local +X is forward.
const BALL_CONTACT={normal:new V3(),armCar:new V3(),armBall:new V3(),carAngular:new V3(),carVelocity:new V3(),ballVelocity:new V3(),relative:new V3(),torque:new V3(),inverse:new Qn(),angular:new V3(),basis:new V3(),column:new V3(),x:new V3(),y:new V3(),z:new V3(),impulse:new V3(),tangent:new V3(),extra:new V3(),forward:new V3(),matrix:new THREE.Matrix3()};
const BALL_SURFACE={arm:new V3(),slip:new V3(),delta:new V3(),spin:new V3()};
function ballExtraScale(speed){const v=cl(speed,0,46);return v<=5?.65:v<=23?.65-(v-5)*(.1/18):.55-(v-23)*(.25/23);}
function ballCarAngular(c,out){return c.ground?out.copy(c.n).multiplyScalar(-c.wy):out.copy(c.w).applyQuaternion(c.q);}
function ballCarInverseInertia(c,torque,out){
 const s=BALL_CONTACT,I=bodyPhysics(c).inertia;s.inverse.copy(c.q).invert();out.copy(torque).applyQuaternion(s.inverse);out.set(out.x/I.x,out.y/I.y,out.z/I.z).applyQuaternion(c.q);
 // Tire support counters pitch/roll while leaving yaw free. This remains an
 // approximation of the suspension/constraint solver, not arbitrary hit spin.
 if(c.ground){const yaw=out.dot(c.n);out.copy(c.n).multiplyScalar(yaw);}return out;
}
function ballContactColumn(c,direction,out){
 const s=BALL_CONTACT,B=PHYS.ball,Ib=.4*B.mass*BR*BR;out.copy(direction).multiplyScalar(1/B.mass+1/CM);
 s.torque.crossVectors(s.armBall,direction);s.angular.copy(s.torque).multiplyScalar(1/Ib).cross(s.armBall);out.add(s.angular);
 s.torque.crossVectors(s.armCar,direction);ballCarInverseInertia(c,s.torque,s.angular);s.angular.cross(s.armCar);out.add(s.angular);return out;
}
function applyBallCarImpulse(c,normal,armCar,relativePosition){
 const s=BALL_CONTACT,b=ball,H=PHYS.hit,Mb=PHYS.ball.mass,Ib=.4*Mb*BR*BR;
 s.normal.copy(normal);s.armCar.copy(armCar);s.armBall.copy(normal).multiplyScalar(-BR);
 ballCarAngular(c,s.carAngular);s.carVelocity.crossVectors(s.carAngular,s.armCar).add(c.v);s.ballVelocity.crossVectors(b.w,s.armBall).add(b.v);s.relative.copy(s.carVelocity).sub(s.ballVelocity);
 const approach=s.relative.dot(normal);if(approach<=0)return 0;
 // Save the translation-only relative speed before applying the physical hit.
 const speed=Math.min(46,b.v.distanceTo(c.v));
 ballContactColumn(c,s.basis.set(1,0,0),s.x);ballContactColumn(c,s.basis.set(0,1,0),s.y);ballContactColumn(c,s.basis.set(0,0,1),s.z);
 s.matrix.set(s.x.x,s.y.x,s.z.x,s.x.y,s.y.y,s.z.y,s.x.z,s.y.z,s.z.z).invert();s.impulse.copy(s.relative).applyMatrix3(s.matrix);
 // Constrain sliding without throwing away the normal response. Simply
 // clipping the free solve can make its normal impulse negative and then
 // erase a real grazing collision. Scale the free tangential solution and
 // recompute Jn from n.K.J = approach. This is the Schur-complement path
 // between the inelastic normal-only and sticking impulses: every point
 // has zero closing normal speed and cannot add free-body kinetic energy.
 // Sliding direction remains an approximation, not an exact Coulomb solve.
 const freeNormal=s.impulse.dot(normal);s.tangent.copy(s.impulse).addScaledVector(normal,-freeNormal);
 s.column.copy(s.x).multiplyScalar(normal.x).addScaledVector(s.y,normal.y).addScaledVector(s.z,normal.z);
 const normalMass=normal.dot(s.column),tangentLength=s.tangent.length(),coupling=s.tangent.dot(s.column),mu=Math.max(0,H.mu),denominator=normalMass*tangentLength+mu*coupling;
 const tangentScale=tangentLength>1e-10&&denominator>0?cl(mu*approach/denominator,0,1):1;
 const normalImpulse=Math.max(0,(approach-tangentScale*coupling)/normalMass);s.tangent.multiplyScalar(tangentScale);s.impulse.copy(normal).multiplyScalar(normalImpulse).add(s.tangent);
 b.v.addScaledVector(s.impulse,1/Mb);c.v.addScaledVector(s.impulse,-1/CM);
 s.torque.crossVectors(s.armBall,s.impulse);b.w.addScaledVector(s.torque,1/Ib);
 s.torque.crossVectors(s.armCar,s.impulse).negate();ballCarInverseInertia(c,s.torque,s.angular);
 if(c.ground)c.wy=cl(c.wy-s.angular.dot(c.n),-PHYS.air.wmax,PHYS.air.wmax);
 else{s.inverse.copy(c.q).invert();c.w.add(s.angular.applyQuaternion(s.inverse));if(c.w.lengthSq()>PHYS.air.wmax**2)c.w.setLength(PHYS.air.wmax);}
 // The measured game adds power to the ball only. It is driven by relative
 // positions/velocities, never a goal target or an aim-correction direction.
 if((c.ballHitCooldown||0)<=1e-8&&speed>0){
  s.extra.copy(relativePosition);s.extra.y*=.35;const distance=s.extra.length();
  if(distance>1e-8){s.extra.multiplyScalar(1/distance);s.forward.set(1,0,0).applyQuaternion(c.q);s.extra.addScaledVector(s.forward,-.35*s.extra.dot(s.forward)).normalize();b.v.addScaledVector(s.extra,speed*ballExtraScale(speed)*(H.extraScale??1));}
  c.ballHitCooldown=2*DT;
 }
 if(b.v.lengthSq()>PHYS.ball.max**2)b.v.setLength(PHYS.ball.max);if(b.w.lengthSq()>PHYS.ball.maxSpin**2)b.w.setLength(PHYS.ball.maxSpin);if(c.v.lengthSq()>PHYS.car.maxSpeed**2)c.v.setLength(PHYS.car.maxSpeed);
 return approach;
}
function ballSurfaceBounce(velocity,spin,normal){
 const s=BALL_SURFACE,B=PHYS.ball,approach=-velocity.dot(normal);if(approach<=0)return 0;
 // Keep tiny gravity contacts at rest; this numerical sleep band is separate
 // from the independently measured 0.6 rebound above the band.
 const restitution=approach>B.restSpeed?B.e:0;s.arm.copy(normal).multiplyScalar(-BR);s.slip.crossVectors(spin,s.arm).add(velocity);s.slip.addScaledVector(normal,-s.slip.dot(normal));const slip=s.slip.length();
 velocity.addScaledVector(normal,(1+restitution)*approach);
 if(slip>1e-8){const amount=B.slipFriction*Math.min(1,2*approach/slip);s.delta.copy(s.slip).multiplyScalar(-amount);velocity.add(s.delta);s.spin.crossVectors(s.arm,s.delta).multiplyScalar(1/(.4*BR*BR));spin.add(s.spin);}
 return approach;
}
