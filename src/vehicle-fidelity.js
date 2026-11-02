// Independent, bounded mechanics calibrated against the pinned references in
// docs/FIDELITY-VEHICLE.md. Nivet uses local +X forward, +Y roof, +Z right.
const vehicleForward=new V3(),vehicleRight=new V3(),vehicleUp=new V3(),vehicleAxis=new V3(),vehicleCrossRight=new V3(),vehicleCrossForward=new V3(),vehicleTorque=new V3(),vehicleInverse=new Qn();
const vehicleContactPoint=new V3(),vehicleContactArm=new V3(),vehicleContactVelocity=new V3(),vehicleContactAngular=new V3(),vehicleContactTorque=new V3(),vehicleContactInverse=new V3();
function vehicleHullContact(c,normal){
 const inertia=bodyPhysics(c).inertia;vehicleContactArm.copy(vehicleContactPoint).sub(c.p);vehicleContactAngular.copy(c.w).applyQuaternion(c.q);vehicleContactVelocity.crossVectors(vehicleContactAngular,vehicleContactArm).add(c.v);const incoming=vehicleContactVelocity.dot(normal);if(incoming>=0)return;
 vehicleContactTorque.crossVectors(vehicleContactArm,normal);vehicleInverse.copy(c.q).invert();vehicleContactInverse.copy(vehicleContactTorque).applyQuaternion(vehicleInverse);vehicleContactInverse.set(vehicleContactInverse.x/inertia.x,vehicleContactInverse.y/inertia.y,vehicleContactInverse.z/inertia.z).applyQuaternion(c.q);
 // Resting scrapes are an inelastic constraint. Restitution belongs to a real
 // impact, not each small positional projection along an angular sweep.
 const inverseMass=1/CM+vehicleContactTorque.dot(vehicleContactInverse),restitution=incoming< -3?PHYS.car.wallE:0,impulse=-(1+restitution)*incoming/inverseMass;c.v.addScaledVector(normal,impulse/CM);c.w.addScaledVector(vehicleContactInverse.applyQuaternion(vehicleInverse),impulse);limitCarAngular(c);
 if(window.__NIVET_CONTROL_TRACE__&&c.controlTrace){c.controlTrace.hullImpulses++;c.controlTrace.hullImpulse+=impulse;}
}
function vehicleAirControl(c,roll,yaw,pitch,dt){const scale=PHYS.air.controlScale,ws=c.w;ws.x=airRotation(ws.x,roll,400*scale,50*scale,dt,true);ws.y=airRotation(ws.y,-yaw,95*scale,20*scale,dt);ws.z=airRotation(ws.z,-pitch,130*scale,30*scale,dt);}
// A held keyboard drive key is not a fresh aerial pitch command. Remember
// only actual supported driving; releasing/changing it immediately restores
// ordinary pitch. Raw input still chooses and cancels every dodge.
function vehicleCarriedPitch(c,supported){
 const i=c.inp,direction=Math.sign(i.pitch);
 if(i.coupledPitch!==1||!direction||Math.abs(i.thr)<.01||i.pitch*i.thr<=0){c.carriedPitch=0;return;}
 if(c.carriedPitch&&c.carriedPitch!==direction)c.carriedPitch=0;
 if(supported)c.carriedPitch=direction;
}
function vehicleEffectivePitch(c){return c.inp.coupledPitch===1&&c.carriedPitch===Math.sign(c.inp.pitch)?0:c.inp.pitch;}
function limitCarAngular(c){
 // The finite dodge actuator has its own bounded rate; applying the free-air
 // cap here made a0.65s flip stop halfway around. Collisions still remain bounded.
 const max=c.dT>1e-8?PHYS.jump.flipRate:PHYS.air.wmax;if(c.w.lengthSq()>max*max)c.w.setLength(max);
}
function vehicleDodge(c,input){
 const J=PHYS.jump,p=input.pitch;
 // Steering chooses the dodge plane. Air roll is a fallback when steering is
 // neutral, so duplicate/opposed bindings cannot skew or silently erase a flip.
 const side=Math.abs(input.yaw)>.01?input.yaw:input.roll,length=Math.hypot(p,side);
 if(Math.abs(p)+Math.abs(side)<J.dodgeDeadzone)return false;
 let forward=length>.1?p/length:0,right=length>.1?side/length:0;
 c.flipAxis.set(right,0,-forward);if(Math.abs(forward)<.1)forward=0;if(Math.abs(right)<.1)right=0;
 vehicleForward.set(1,0,0).applyQuaternion(c.q);const speed=c.v.dot(vehicleForward),ratio=Math.min(1,Math.abs(speed)/PHYS.car.maxSpeed),backward=Math.abs(speed)<1?forward<0:(forward>=0)!==(speed>=0);
 let dvForward=forward*J.flip/CM,dvRight=right*J.flip/CM*(1+.9*ratio);if(backward)dvForward*=16/15*(1+1.5*ratio);
 vehicleForward.y=0;if(vehicleForward.lengthSq()<1e-8){vehicleRight.set(0,0,1).applyQuaternion(c.q);vehicleForward.set(vehicleRight.z,0,-vehicleRight.x);}vehicleForward.normalize();vehicleRight.set(-vehicleForward.z,0,vehicleForward.x);
 c.v.addScaledVector(vehicleForward,dvForward).addScaledVector(vehicleRight,dvRight);
 // Selectively restore the working10.3 finite rotation actuator. Linear hit
 // impulses and delayed vertical damping remain separate; no instant fall reset.
 c.w.copy(c.flipAxis).multiplyScalar(J.flipRate);c.jt=0;c.dT=J.flipT;c.dcd=J.flipT;return true;
}
function vehicleFlipStep(c,input,dt){
 const J=PHYS.jump;if(c.dT<=1e-8){c.dT=0;return false;}const active=Math.min(dt,c.dT);c.dT=Math.max(0,c.dT-active);if(c.dT<1e-8)c.dT=0;
 const age=J.flipT-c.dT,cancel=input.pitch*c.flipAxis.z>.1;
 // Deliberate opposite pitch brakes flip pitch; cancel/stall states expose
 // ordinary yaw/roll immediately, without another linear impulse or extra lock.
 if(cancel){c.w.z-=cl(c.w.z,-J.flipRate*J.cancelRate*active,J.flipRate*J.cancelRate*active);if(!c.wheelsOn)vehicleAirControl(c,input.roll,input.yaw,0,active);}
 if(age+1e-9>=J.zDampStart&&(c.v.y<0||age<J.zDampEnd-1e-9))c.v.y*=Math.pow(1-J.zDamp120,active*120);
 const spin=c.w.length();if(spin>J.flipRate)c.w.setLength(J.flipRate);if(spin>1e-6){vehicleAxis.copy(c.w).normalize();c.q.multiply(vehicleInverse.setFromAxisAngle(vehicleAxis,Math.min(spin,J.flipRate)*active));}
 // Brake only the completed actuator axis; player-generated orthogonal roll/yaw
 // remains available. This removes carry spin, never snaps the car's pose.
 if(!c.dT)c.w.addScaledVector(c.flipAxis,-.95*c.w.dot(c.flipAxis));return true;
}
function vehicleAutoRoll(c,dt){
 // Bounded suspension recovery on an actual side contact. Explicit rotation
 // owns the pose; neutral roof/side positions never acquire an upright target.
 const i=c.inp,pitchIntent=Math.abs(i.thr)>.01&&i.pitch*i.thr>0?0:i.pitch;
 if(!i.thr||Math.abs(i.roll)>.05||Math.abs(pitchIntent)>.05||c.jl||c.dT>0||c.autoFlipTime>0||!c.hullContact||c.wheelsOn>0||c.cT<.035)return;
 vehicleUp.set(0,1,0).applyQuaternion(c.q);const alignment=vehicleUp.dot(c.n);if(alignment<-.94)return;
 vehicleAxis.crossVectors(vehicleUp,c.n);const sine=vehicleAxis.length();if(sine<1e-6)return;vehicleAxis.multiplyScalar(1/sine);vehicleAngularWorld.copy(c.w).applyQuaternion(c.q);const rate=vehicleAngularWorld.dot(vehicleAxis),torque=cl(Math.acos(cl(alignment,-1,1))*10-rate*4,-8,8);
 vehicleInverse.copy(c.q).invert();c.w.addScaledVector(vehicleTorque.copy(vehicleAxis).applyQuaternion(vehicleInverse),torque*dt);limitCarAngular(c);
 if(window.__NIVET_CONTROL_TRACE__&&c.controlTrace)c.controlTrace.recoveryTorque=torque;
}
function beginVehicleAutoFlip(c){
 if(!c.hullContact||c.n.y<PHYS.surf.autoFlipNormal)return false;vehicleUp.set(0,1,0).applyQuaternion(c.q);vehicleRight.set(0,0,1).applyQuaternion(c.q);
 const roll=Math.atan2(vehicleRight.dot(c.n),vehicleUp.dot(c.n));if(Math.abs(roll)<PHYS.surf.autoFlipRoll)return false;
 c.autoFlipTime=.4*Math.abs(roll)/Math.PI;c.autoFlipSign=roll>0?-1:1;c.righting=1;c.v.addScaledVector(vehicleUp,-2);c.jt=0;return true;
}
function vehicleAutoFlipStep(c,dt){
 if(c.autoFlipTime<=0)return false;const active=Math.min(dt,c.autoFlipTime);c.autoFlipTime=Math.max(0,c.autoFlipTime-dt);c.w.x+=50*c.autoFlipSign*active;limitCarAngular(c);if(window.__NIVET_CONTROL_TRACE__&&c.controlTrace)c.controlTrace.autoFlipTorque=50*c.autoFlipSign;return true;
}

// Partial wheel support is its own controller: limited tire traction/steering,
// supported tilt damping and explicit rotational input. It is neither full
// ground driving nor simultaneous full ground and free-flight controllers.
const vehicleAngularWorld=new V3(),vehicleNormalBefore=new V3(),vehicleTilt=new V3();
function vehiclePartialDrive(c,dt,boosting){
 const i=c.inp,n=c.n,G=PHYS.ground,authority=c.wheelsOn/4,I=bodyPhysics(c).inertia;
 vehicleForward.set(1,0,0).applyQuaternion(c.q).addScaledVector(n,-vehicleForward.dot(n));if(vehicleForward.lengthSq()<1e-8)return;vehicleForward.normalize();vehicleRight.crossVectors(vehicleForward,n);
 const vf=c.v.dot(vehicleForward),vl=c.v.dot(vehicleRight),speed=Math.abs(vf),th=boosting?1:i.thr;let acceleration=0;
 if(Math.abs(th)>=.01)acceleration=th*vf<0?Math.sign(th)*Math.min(G.brakeF/CM,Math.abs(vf)/dt):th*throttleAcceleration(speed);else acceleration=-Math.sign(vf)*Math.min(speed/dt,G.coastF/CM);
 // The unconstrained thrust was already applied by the airborne branch.
 const airThrottle=(boosting?PHYS.air.throttleF:i.thr>0?i.thr*PHYS.air.throttleF:i.thr*PHYS.air.reverseF)/CM;
 c.v.addScaledVector(vehicleForward,(acceleration-airThrottle)*authority*dt);
 const baseGrip=G.gripF*(1+.2*(1-Math.abs(n.y))),grip=baseGrip+(G.slideGripF-baseGrip)*c.handbrake;c.grip=grip*authority;c.v.addScaledVector(vehicleRight,-cl(vl,-c.grip/CM*dt,c.grip/CM*dt));
 vehicleAngularWorld.copy(c.w).applyQuaternion(c.q);const oldYaw=-vehicleAngularWorld.dot(n),target=i.steer*speed*steeringCurvature(speed)*(vf<-.5?-1:1)*(1+(G.slideYaw-1)*(i.ps?c.handbrake:0)),yaw=oldYaw+cl(target-oldYaw,-G.yawT/I.y*authority*dt,G.yawT/I.y*authority*dt);
 // Tire steering owns the normal-axis torque. Rotation inputs own the tangent
 // axes; W/S still means drive while supported rather than unwanted nose pitch.
 const pitchIntent=Math.abs(i.thr)>.01&&i.pitch*i.thr>0?0:i.pitch,scale=PHYS.air.controlScale;
 vehicleTorque.set(i.roll*400*scale-c.w.x*(Math.abs(i.roll)>.05?50*scale:8),0,-pitchIntent*130*scale-c.w.z*(Math.abs(pitchIntent)>.05?30*scale:8)).applyQuaternion(c.q);vehicleTorque.addScaledVector(n,-vehicleTorque.dot(n));
 if(Math.abs(i.roll)<.05&&Math.abs(pitchIntent)<.05){vehicleUp.set(0,1,0).applyQuaternion(c.q);vehicleTilt.crossVectors(vehicleUp,n).multiplyScalar(12+12*authority);vehicleTorque.add(vehicleTilt);}
 vehicleAngularWorld.addScaledVector(vehicleTorque,dt);vehicleAngularWorld.addScaledVector(n,-yaw-vehicleAngularWorld.dot(n));vehicleInverse.copy(c.q).invert();c.w.copy(vehicleAngularWorld).applyQuaternion(vehicleInverse);c.wy=yaw;limitCarAngular(c);
 if(window.__NIVET_CONTROL_TRACE__&&c.controlTrace){c.controlTrace.traction=authority;c.controlTrace.tireAcceleration=acceleration*authority;c.controlTrace.gripAcceleration=c.grip/CM;c.controlTrace.steeringTarget=target;c.controlTrace.partialTorque=vehicleTorque.toArray();}
}
function vehicleTraceBegin(c,dt){if(!window.__NIVET_CONTROL_TRACE__)return;c.controlTrace={dt,input:{...c.inp},before:{v:c.v.toArray(),w:c.w.toArray(),wy:c.wy,ground:c.ground},hullImpulses:0,hullImpulse:0,linearProjectionImpulse:0,positionProjection:0,recoveryTorque:0,traction:0};}
function vehicleTraceEnd(c,branch){if(!window.__NIVET_CONTROL_TRACE__)return;Object.assign(c.controlTrace,{branch,wheels:c.wheelsOn,ground:c.ground,hull:c.hullContact,normal:c.n.toArray(),clearance:c.clearance,v:c.v.toArray(),w:c.w.toArray(),wy:c.wy,jump:!!c.canJ,dodge:!!c.canD,jumpLock:c.jl,dodgeTime:c.dT,angularSpeed:c.w.length(),supportGap:Number.isFinite(c.supportGap)?c.supportGap:null,carriedPitch:c.carriedPitch||0,effectivePitch:vehicleEffectivePitch(c),penetration:carPenetration(c)});}
function vehicleTraceFrame(c){return window.__NIVET_CONTROL_TRACE__?c.controlTrace:null;}

// A rotating dodge cannot keep driving two real tire tips through a support
// plane. Stop only its inward actuator-axis motion, never reset jump state or
// claim full tire traction from this constraint. Suspension reach alone is not
// sufficient: two tips must be within25mm of the same plane.
const vehicleWheelArm=new V3(),vehicleWheelPoint=new V3(),vehiclePhaseAngular=new V3();
function vehicleTireDodgeContact(c,normal){
 if(c.dT<=0||c.jl||c.wheelsOn<2)return false;vehicleUp.set(0,1,0).applyQuaternion(c.q);if(vehicleUp.dot(normal)<.5)return false;
 const phaseSpin=c.w.dot(c.flipAxis);if(phaseSpin<=0)return false;vehiclePhaseAngular.copy(c.flipAxis).multiplyScalar(phaseSpin).applyQuaternion(c.q);let blocked=0;
 for(const wheel of bodyPhysics(c).wheels){vehicleWheelArm.fromArray(wheel).applyQuaternion(c.q);vehicleWheelPoint.copy(vehicleWheelArm).add(c.p);surf(vehicleWheelPoint);if(SS>.025||SN.dot(normal)<.95)continue;vehicleTorque.crossVectors(vehiclePhaseAngular,vehicleWheelArm);if(vehicleTorque.dot(normal)<-.05)blocked++;}
 if(blocked<2)return false;c.w.addScaledVector(c.flipAxis,-phaseSpin);c.dT=c.dcd=0;limitCarAngular(c);if(window.__NIVET_CONTROL_TRACE__&&c.controlTrace)c.controlTrace.tireDodgeStop=true;return true;
}
