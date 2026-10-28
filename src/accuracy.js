// Reference measurements are linked in docs/ACCURACY.md. Metres, seconds; Y up.
const BUILD='10.1.0';
const PRESENTATION_TIMING=Object.freeze({goalHold:8.5,replayDelay:.8,replayDuration:7.7,replayShot:6.6,goalFade:.9});
const PROTOCOL=4;
function airRotation(velocity,input,acceleration,damping,dt,roll=false){return velocity+(input*acceleration-damping*(roll?1:1-Math.abs(input))*velocity)*dt;}
function throttleAcceleration(speed){
 const v=Math.abs(speed)/cfg.speed;
 return (v<14?16-(14.4/14)*v:v<14.1?1.6*(14.1-v)/.1:0)*cfg.speed;
}
function steeringCurvature(speed){
 const v=Math.min(23,Math.abs(speed)/cfg.speed);
 return (v<5?.69-.0584*v:v<10?.561-.0326*v:v<15?.43-.0195*v:v<17.5?.3025-.011*v:.18-.004*v)/cfg.speed;
}
// Keep existing wire indices stable; the measured centimeter positions are verified as a set.
const STANDARD_PADS=[
 [0,-42.4,0],[-17.92,-41.84,0],[17.92,-41.84,0],[-30.72,-40.96,1],[30.72,-40.96,1],
 [-9.4,-33.08,0],[9.4,-33.08,0],[0,-28.16,0],[-35.84,-24.84,0],[35.84,-24.84,0],
 [-17.88,-23,0],[17.88,-23,0],[-20.48,-10.36,0],[20.48,-10.36,0],[0,-10.24,0],
 [-35.84,0,1],[-10.24,0,0],[10.24,0,0],[35.84,0,1],[0,10.24,0],
 [-20.48,10.36,0],[20.48,10.36,0],[-17.88,23,0],[17.88,23,0],[-35.84,24.84,0],[35.84,24.84,0],
 [0,28.16,0],[-9.4,33.08,0],[9.4,33.08,0],[-30.72,40.96,1],[30.72,40.96,1],
 [-17.92,41.84,0],[17.92,41.84,0],[0,42.4,0]
];
function padContains(p,c){const dx=c.p.x-p.x,dz=c.p.z-p.z;return c.p.y>=0&&c.p.y<=(p.big?1.68:1.65)&&dx*dx+dz*dz<=(p.big?2.08:1.44)**2;}
// RocketSim collision dimensions (including its box margin convention), also used by Fennec.
// Pin and provenance: docs/ACCURACY.md. Dominus has a longer, lower box.
const BODY_PHYSICS=[
 {half:[.602535,.1932955,.433497],center:[.138757,.20755,0],height:.1701},
 {half:[.602535,.1932955,.433497],center:[.138757,.20755,0],height:.1701},
 {half:[.652135,.169,.4288995],center:[.09,.1575,0],height:.1705}
].map((p,index)=>{
 const [hx,hy,hz]=p.half,[cx,cy,cz]=p.center;
 const front=index===2?.503:.5125,rear=index===2?-.3475:-.3375,fw=index===2?.311:.259,rw=index===2?.33:.295;
 p.wheels=[[front,-p.height,fw],[front,-p.height,-fw],[rear,-p.height,rw],[rear,-p.height,-rw]];
 p.inertia={x:180*(hy*hy+hz*hz)/3,y:180*(hx*hx+hz*hz)/3,z:180*(hx*hx+hy*hy)/3};
 p.hull=[];for(const x of [-hx,0,hx])for(const y of [-hy,0,hy])for(const z of [-hz,0,hz])if(x||y||z)p.hull.push(new V3(x+cx,y+cy,z+cz));
 p.probes=p.hull.concat(p.wheels.map(v=>new V3(...v)));return p;
});
function bodyPhysics(c){return BODY_PHYSICS[c.body]||BODY_PHYSICS[0];}
function finishRegulation(){
 if(st!=='PLAY'||sandbox||cfg.mode===1||ot||tl>0)return;
 if(score[0]===score[1]){ot=1;kickoff();msg('OVERTIME',2.5,'#fff');}
 else endMatch();
}
function advanceMatchClock(dt){
 if(st!=='PLAY'||sandbox||cfg.mode===1)return;
 if(ot){tl+=dt;return;}
 const expired=tl<=0;tl=Math.max(0,tl-dt);
 if(!expired&&tl===0){msg('KEEP IT UP!',1.6,'#ffd071');if(ball.p.y<=BR+.015)finishRegulation();}
}
const finiteVector=(v,n,bound)=>Array.isArray(v)&&v.length===n&&v.every(x=>Number.isFinite(x)&&Math.abs(x)<=bound);
function validSnapshot(s){
 return !!s&&Number.isSafeInteger(s.seq)&&s.seq>=0&&Number.isSafeInteger(s.round)&&s.round>=0&&['WAIT','COUNT','PLAY','GOAL','PAUSE','END'].includes(s.phase)
 &&Number.isFinite(s.clock)&&Math.abs(s.clock)<86400&&Number.isFinite(s.count)&&Number.isFinite(s.goalTime)
 &&Array.isArray(s.score)&&s.score.length===2&&s.score.every(x=>Number.isInteger(x)&&x>=0&&x<10000)
 &&Array.isArray(s.cars)&&s.cars.length===cfg.size*2&&s.cars.every(packetValid)
 &&finiteVector(s.ball?.p,3,1000)&&finiteVector(s.ball?.v,3,150)&&finiteVector(s.ball?.w,3,100)
 &&Array.isArray(s.pads)&&s.pads.length===PADS.length&&s.pads.every(x=>Number.isFinite(x)&&x>=0&&x<=10.1);
}
