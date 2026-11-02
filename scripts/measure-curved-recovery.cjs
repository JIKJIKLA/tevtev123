'use strict';
// Complements the plane-wall matrix with actual rounded/goal collision surfaces.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {fresh}=require('./measure-supported-recovery.cjs');
const root=path.resolve(__dirname,'..'),h=Math.SQRT1_2;
const surfaces=[['floor-ramp',[40.96-4+4*h,4-4*h,0],[-h,h,0]],['ceiling-ramp',[40.96-4+4*h,20.48-4+4*h,0],[-h,-h,0]],['vertical-corner',[40.96-4+4*h,10,51.2-4+4*h],[-h,0,-h]],['goal-side',[8.92755,3,55.6],[-1,0,0]],['goal-roof',[0,6.42775,54.2],[0,-1,0]],['goal-back',[0,3,60],[0,0,-1]]];
const tilts=[['four',0,0],['two-roll',.45,0],['two-pitch',0,.15],['three-reach',.1,.1],['one',.3,.15],['side-chassis',Math.PI/2,0],['roof-chassis',Math.PI,0]],actions=['neutral','drive','reverse','brake','left','right','boost','jump-drive','escape'];
function fingerprint(){return Object.fromEntries(['game.js','vehicle-fidelity.js','controls.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'src',n))).digest('hex')]));}
function run(s,surface,tilt,heading,action){
 const {a,c,T}=s,[name,point,normal]=surface,[pose,roll,pitch]=tilt,n=new T.Vector3(...normal);
 a.resetCar(c,0,0);c.canD=c.canJ=0;c.ground=c.wasG=0;c.v.set(0,0,0);c.w.set(0,0,0);c.wy=0;for(const key in a.keys)a.keys[key]=0;
 c.q.setFromUnitVectors(new T.Vector3(0,1,0),n).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),heading)).multiply(new T.Quaternion().setFromEuler(new T.Euler(roll,0,pitch)));
 const phys=a.bodyPhysics(c),probes=pose.includes('chassis')?phys.probes:phys.wheels.map(p=>new T.Vector3(...p));
 const minimum=Math.min(...probes.map(p=>p.clone().applyQuaternion(c.q).dot(n)));c.p.fromArray(point).addScaledVector(n,.015-minimum);c.n.copy(n);
 const start=c.p.clone(),f=new T.Vector3(1,0,0).applyQuaternion(c.q);f.addScaledVector(n,-f.dot(n)).normalize();if(action==='brake')c.v.copy(f).multiplyScalar(8);
 let maxMove=0,maxDeparture=0,penetration=0,invalid=false,jumpResponse=null,firstWheels=null,firstLoad=null;
 for(let tick=0;tick<120;tick++){
  a.keys.w=['drive','left','right','boost','jump-drive'].includes(action)?1:0;a.keys.s=['reverse','brake'].includes(action)?1:0;a.keys.a=action==='left'?1:0;a.keys.d=action==='right'?1:0;a.keys.shift=action==='boost'?1:0;a.human(c);c.jp=['escape','jump-drive'].includes(action)&&tick===12?1:0;c.jh=c.jp;const before=c.v.dot(n);a.stepCar(c,a.DT);
  if(!tick){firstWheels=c.wheelsOn;firstLoad=c.tireLoad??null;}if(tick===12&&['escape','jump-drive'].includes(action))jumpResponse={before,after:c.v.dot(n),lock:c.jl};
  maxMove=Math.max(maxMove,c.p.distanceTo(start));maxDeparture=Math.max(maxDeparture,c.p.clone().sub(start).dot(n));penetration=Math.max(penetration,a.carPenetration(c));if(![...c.p.toArray(),...c.q.toArray(),...c.v.toArray(),...c.w.toArray()].every(Number.isFinite))invalid=true;
 }
 return{body:c.body,surface:name,pose,heading,action,firstWheels,firstLoad,maxMove,maxDeparture,penetration,invalid,jumpResponse,final:{p:c.p.toArray(),v:c.v.toArray(),wheels:c.wheelsOn,canD:c.canD}};
}
function measure(){const source=fingerprint(),versions=[];for(const version of['10.6.0','current']){const rows=[];for(const body of[0,1,2]){const s=fresh(version,body);for(const surface of surfaces)for(const tilt of tilts)for(const heading of[0,Math.PI,Math.PI/2])for(const action of actions)rows.push(run(s,surface,tilt,heading,action));}const groups=new Map();for(const r of rows){const k=[r.body,r.surface,r.pose,r.heading].join('/');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}const trapped=[...groups].filter(([,v])=>v.filter(r=>['drive','reverse','boost','escape','jump-drive'].includes(r.action)).every(r=>r.maxMove<.5&&r.maxDeparture<.25)).map(([k])=>k);versions.push({version,cases:rows.length,invalid:rows.filter(r=>r.invalid).length,maximumPenetration:Math.max(...rows.map(r=>r.penetration)),trappedGroups:trapped,rows});}
 const stable=JSON.stringify(source)===JSON.stringify(fingerprint());if(!stable)throw Error('Source changed while measuring');return{conditions:{physicsHz:120,seconds:1,bodies:[0,1,2],surfaces,tilts,headings:[0,Math.PI,Math.PI/2],actions,limits:'Nominal pose labels describe the initial rotation; actual wheel counts are measured, including curvature-induced differences. Natural sliding/falling is a valid escape. No pose is forced upright.'},source,sourceStable:stable,versions};}
if(require.main===module){const r=measure(),raw=path.resolve(root,'../../outputs/recovery-curved-matrix-raw.json');fs.writeFileSync(raw,JSON.stringify(r));const report={...r,versions:r.versions.map(({rows,...v})=>v)};fs.writeFileSync(path.join(root,'docs/measurements/curved-recovery-matrix.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.versions,null,2));if(r.versions[1].invalid||r.versions[1].maximumPenetration>.005||r.versions[1].trappedGroups.length)process.exitCode=1;}
module.exports={measure,run};
