// Independent, bounded mechanics calibrated against the pinned references in
// docs/FIDELITY-VEHICLE.md. Nivet uses local +X forward, +Y roof, +Z right.
const vehicleForward=new V3(),vehicleRight=new V3(),vehicleUp=new V3(),vehicleAxis=new V3(),vehicleCrossRight=new V3(),vehicleCrossForward=new V3(),vehicleTorque=new V3(),vehicleInverse=new Qn();
const vehicleContactPoint=new V3(),vehicleContactArm=new V3(),vehicleContactVelocity=new V3(),vehicleContactAngular=new V3(),vehicleContactTorque=new V3(),vehicleContactInverse=new V3();
function vehicleHullContact(c,normal){
 const inertia=bodyPhysics(c).inertia;vehicleContactArm.copy(vehicleContactPoint).sub(c.p);vehicleContactAngular.copy(c.w).applyQuaternion(c.q);vehicleContactVelocity.crossVectors(vehicleContactAngular,vehicleContactArm).add(c.v);const incoming=vehicleContactVelocity.dot(normal);if(incoming>=0)return;
 vehicleContactTorque.crossVectors(vehicleContactArm,normal);vehicleInverse.copy(c.q).invert();vehicleContactInverse.copy(vehicleContactTorque).applyQuaternion(vehicleInverse);vehicleContactInverse.set(vehicleContactInverse.x/inertia.x,vehicleContactInverse.y/inertia.y,vehicleContactInverse.z/inertia.z).applyQuaternion(c.q);
 const inverseMass=1/CM+vehicleContactTorque.dot(vehicleContactInverse),impulse=-(1+PHYS.car.wallE)*incoming/inverseMass;c.v.addScaledVector(normal,impulse/CM);c.w.addScaledVector(vehicleContactInverse.applyQuaternion(vehicleInverse),impulse);limitCarAngular(c);
}
function vehicleAirControl(c,roll,yaw,pitch,dt){const scale=PHYS.air.controlScale,ws=c.w;ws.x=airRotation(ws.x,roll,400*scale,50*scale,dt,true);ws.y=airRotation(ws.y,-yaw,95*scale,20*scale,dt);ws.z=airRotation(ws.z,-pitch,130*scale,30*scale,dt);}
function limitCarAngular(c){const max=PHYS.air.wmax;if(c.w.lengthSq()>max*max)c.w.setLength(max);}
function vehicleDodge(c,input){
 const J=PHYS.jump,p=input.pitch,side=input.yaw+input.roll,length=Math.hypot(p,side);
 // L1 input threshold is a shared physics rule, independent of device mapping.
 if(Math.abs(p)+Math.abs(input.yaw)+Math.abs(input.roll)<J.dodgeDeadzone)return false;
 let forward=length>.1?p/length:0,right=length>.1?side/length:0;
 c.flipAxis.set(right,0,-forward);if(Math.abs(forward)<.1)forward=0;if(Math.abs(right)<.1)right=0;
 vehicleForward.set(1,0,0).applyQuaternion(c.q);const speed=c.v.dot(vehicleForward),ratio=Math.min(1,Math.abs(speed)/PHYS.car.maxSpeed),backward=Math.abs(speed)<1?forward<0:(forward>=0)!==(speed>=0);
 let dvForward=forward*J.flip/CM,dvRight=right*J.flip/CM*(1+.9*ratio);if(backward)dvForward*=16/15*(1+1.5*ratio);
 vehicleForward.y=0;if(vehicleForward.lengthSq()<1e-8){vehicleRight.set(0,0,1).applyQuaternion(c.q);vehicleForward.set(vehicleRight.z,0,-vehicleRight.x);}vehicleForward.normalize();vehicleRight.set(-vehicleForward.z,0,vehicleForward.x);
 c.v.addScaledVector(vehicleForward,dvForward).addScaledVector(vehicleRight,dvRight);
 // A dodge does not cancel falling velocity at the instant it is pressed.
 c.jt=0;c.dT=J.flipT;c.dcd=J.flipT+J.pitchLockExtra;return true;
}
function vehicleFlipStep(c,input,dt){
 const J=PHYS.jump;if(c.dT<=0)return false;const active=Math.min(dt,c.dT);c.dT=Math.max(0,c.dT-dt);const age=J.flipT-c.dT,cancel=input.pitch*c.flipAxis.z>0?cl(Math.abs(input.pitch),0,1):0;
 c.w.x+=c.flipAxis.x*J.sideTorque*active;c.w.z+=c.flipAxis.z*J.forwardTorque*(1-cancel)*active;
 // Opposite pitch removes dodge pitch torque; ordinary damping then brakes it.
 // Roll momentum remains, and cancel/stall states retain yaw/roll air control.
 if((cancel>0||c.flipAxis.lengthSq()<1e-8)&&!c.wheelsOn){vehicleAirControl(c,input.roll,input.yaw,0,active);}
 if(age+1e-9>=J.zDampStart&&(c.v.y<0||age<J.zDampEnd-1e-9))c.v.y*=Math.pow(1-J.zDamp120,active*120);
 limitCarAngular(c);return true;
}
function vehicleAutoRoll(c,dt){
 // Reference-supported throttle-triggered contact torque. Never rotate a neutral
 // resting car, slerp to a preferred pose or suppress zero-wheel aerial controls.
 if(!c.inp.thr||c.jl||c.dT>0||c.autoFlipTime>0||!(c.wheelsOn>0&&c.wheelsOn<4||c.hullContact))return;
 vehicleForward.set(1,0,0).applyQuaternion(c.q);vehicleRight.set(0,0,1).applyQuaternion(c.q);vehicleUp.set(0,1,0).applyQuaternion(c.q);
 vehicleCrossRight.crossVectors(vehicleForward,c.n);vehicleCrossForward.crossVectors(c.n,vehicleCrossRight);
 const roll=1-cl(vehicleRight.dot(vehicleCrossRight),0,1),pitch=1-cl(vehicleForward.dot(vehicleCrossForward),0,1);
 vehicleTorque.copy(vehicleForward).multiplyScalar(roll*(vehicleRight.dot(c.n)>=0?1:-1)).addScaledVector(vehicleRight,pitch*(vehicleForward.dot(c.n)>=0?-1:1));
 vehicleInverse.copy(c.q).invert();c.w.addScaledVector(vehicleTorque.applyQuaternion(vehicleInverse),PHYS.surf.autoRollTorque*dt);c.v.addScaledVector(c.n,-PHYS.surf.autoRollForce*dt);limitCarAngular(c);
}
function beginVehicleAutoFlip(c){
 if(!c.hullContact||c.n.y<PHYS.surf.autoFlipNormal)return false;vehicleUp.set(0,1,0).applyQuaternion(c.q);vehicleRight.set(0,0,1).applyQuaternion(c.q);
 const roll=Math.atan2(vehicleRight.dot(c.n),vehicleUp.dot(c.n));if(Math.abs(roll)<PHYS.surf.autoFlipRoll)return false;
 c.autoFlipTime=.4*Math.abs(roll)/Math.PI;c.autoFlipSign=roll>0?-1:1;c.righting=1;c.v.addScaledVector(vehicleUp,-2);c.jt=0;return true;
}
function vehicleAutoFlipStep(c,dt){
 if(c.autoFlipTime<=0)return false;const active=Math.min(dt,c.autoFlipTime);c.autoFlipTime=Math.max(0,c.autoFlipTime-dt);c.w.x+=50*c.autoFlipSign*active;limitCarAngular(c);return true;
}
