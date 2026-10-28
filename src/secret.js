// Arcade easter egg. This passcode is a gameplay unlock, not an admin credential.
const SECRET_CODE='spellingbeewinner';
const SECRET_ABILITIES={boost:['BOTTOMLESS BOOST','15 seconds of endless boost'],hop:['MOON BOOTS','Launch your car into the sky'],magnet:['BALL VACUUM','Pull the ball toward you for 6 seconds'],repel:['PERSONAL SPACE','Repel the ball for 6 seconds'],freeze:['TIME OUT','Freeze the ball for 3 seconds'],yeet:['GOAL CANNON','Fire the ball toward the other goal'],skyball:['SPACE PROGRAM','Send the ball straight up'],summon:['FETCH!','Bring the ball in front of your car'],teleport:['NOTHING PERSONAL','Teleport behind the ball'],swap:['MUSICAL CARS','Swap places with the closest car'],recover:['BUTTER SIDE UP','Recover instantly on your wheels'],chaos:['POPCORN','Pop every other car into the air']};
const SECRET={unlocked:false,open:false,minimized:false,typed:'',typedAt:0,freeze:0,boost:Array(6).fill(0),fields:[],serial:0,lastUse:-100,noticeUntil:0};
const secretVector=new V3();
function secretReset(){SECRET.freeze=0;SECRET.boost.fill(0);SECRET.fields.length=0;SECRET.serial++;}
function secretSnapshot(){return{freeze:SECRET.freeze,boost:SECRET.boost.slice(),fields:SECRET.fields.map(f=>({...f})),serial:SECRET.serial};}
function readSecretState(value){
 if(!value)return secretReset();
 if(!Number.isFinite(value.freeze)||value.freeze<0||value.freeze>3||!Array.isArray(value.boost)||value.boost.length!==6||!value.boost.every(n=>Number.isFinite(n)&&n>=0&&n<=15)||!Array.isArray(value.fields)||value.fields.length>6||!value.fields.every(f=>Number.isInteger(f.slot)&&f.slot>=0&&f.slot<cars.length&&['magnet','repel'].includes(f.kind)&&Number.isFinite(f.left)&&f.left>=0&&f.left<=6))return;
 SECRET.freeze=value.freeze;SECRET.boost=value.boost.slice();SECRET.fields=value.fields.map(f=>({...f}));SECRET.serial=value.serial||0;
}
function secretSyncBody(c){c.prevP.copy(c.p);c.frameP.copy(c.p);c.renderP.copy(c.p);c.prevQ.copy(c.q);c.frameQ.copy(c.q);c.w.set(0,0,0);c.dT=0;}
function secretPlaceCar(c,x,z){const boost=c.boost;resetCar(c,cl(x,-HX+3,HX-3),cl(z,-HZ+3,HZ-3));c.boost=boost;resolveArenaCar(c);secretSyncBody(c);}
function secretApply(slot,key){
 const c=cars[slot];if(st!=='PLAY'||!c?.enabled||typeof key!=='string'||!Object.hasOwn(SECRET_ABILITIES,key))return false;
 const atk=c.team?-1:1;
 if(key==='boost'){SECRET.boost[slot]=15;c.boost=100;}
 if(key==='hop'){c.p.y+=.25;c.v.y=12;c.jl=.2;c.ground=c.wasG=0;secretSyncBody(c);}
 if(key==='magnet'||key==='repel'){SECRET.fields=SECRET.fields.filter(f=>f.slot!==slot);SECRET.fields.push({slot,kind:key,left:6});}
 if(key==='freeze'){SECRET.freeze=3;ball.v.set(0,0,0);ball.w.set(0,0,0);}
 if(key==='yeet'){SECRET.freeze=0;ball.v.set(-ball.p.x,Math.max(.5,2-ball.p.y),atk*(HZ+3)-ball.p.z).normalize().multiplyScalar(46);ball.last=c.team;ball.lastPlayer=c.id;ball.color=c.color;heatTouch(c);}
 if(key==='skyball'){SECRET.freeze=0;ball.v.set(0,24,0);ball.last=c.team;ball.lastPlayer=c.id;ball.color=c.color;heatTouch(c);}
 if(key==='summon'){SECRET.freeze=0;secretVector.set(1,0,0).applyQuaternion(c.q).setY(0).normalize();ball.p.copy(c.p).addScaledVector(secretVector,2.8);ball.p.y=Math.max(BR+.05,ball.p.y);for(let i=0;i<8;i++){surf(ball.p);if(SS>=BR)break;ball.p.addScaledVector(SN,BR-SS+.001)}ball.v.copy(c.v);ball.w.set(0,0,0);ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);}
 if(key==='teleport'){secretPlaceCar(c,ball.p.x,ball.p.z-atk*3);c.q.setFromAxisAngle(Y3,atk>0?-Math.PI/2:Math.PI/2);secretSyncBody(c);}
 if(key==='recover')secretPlaceCar(c,c.p.x,c.p.z);
 if(key==='swap'){const other=cars.filter(o=>o.enabled&&o!==c).sort((a,b)=>a.p.distanceToSquared(c.p)-b.p.distanceToSquared(c.p))[0];if(!other)return false;const x=c.p.x,z=c.p.z;secretPlaceCar(c,other.p.x,other.p.z);secretPlaceCar(other,x,z);}
 if(key==='chaos')for(const other of cars)if(other.enabled&&other!==c){other.p.y+=.2;other.v.y=9;other.jl=.2;other.ground=other.wasG=0;secretSyncBody(other);}
 SECRET.serial++;return true;
}
function secretCarStep(c,dt){if(SECRET.boost[c.id]>0){SECRET.boost[c.id]=Math.max(0,SECRET.boost[c.id]-dt);c.boost=100;}}
function secretBallStep(dt){
 if(SECRET.freeze>0){SECRET.freeze=Math.max(0,SECRET.freeze-dt);ball.v.set(0,0,0);ball.w.set(0,0,0);return true;}
 for(const field of SECRET.fields){field.left=Math.max(0,field.left-dt);const c=cars[field.slot];if(!c?.enabled||field.left<=0)continue;secretVector.copy(c.p);secretVector.y+=.8;secretVector.sub(ball.p);const d=secretVector.length();if(d>.2&&d<28)ball.v.addScaledVector(secretVector,(field.kind==='repel'?-32:24)*dt/d);}
 SECRET.fields=SECRET.fields.filter(f=>f.left>0);return false;
}
function secretNotice(name,key){const el=$('secret-notice');if(!el)return;el.textContent='ARCADE · '+name+' · '+(SECRET_ABILITIES[key]?.[0]||'POWER');el.hidden=false;SECRET.noticeUntil=performance.now()+4500;}
function secretTick(){const notice=$('secret-notice');if(notice&&performance.now()>SECRET.noticeUntil)notice.hidden=true;}
function secretOpen(){SECRET.open=true;SECRET.minimized=false;mpClearInput();secretPanel();$('secret-code')?.focus();}
function secretClose(minimize=false){SECRET.open=!!minimize;SECRET.minimized=!!minimize;mpClearInput();secretPanel();$('cv')?.focus?.();}
function secretPanel(){
 $('secret-panel').hidden=!SECRET.open||SECRET.minimized;$('secret-restore').hidden=!SECRET.minimized;
 $('secret-lock').hidden=SECRET.unlocked;$('secret-powers').hidden=!SECRET.unlocked;
}
function secretKey(e){
 if(st==='PRANK'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.isComposing||e.key?.length!==1||$('secret-panel')?.contains(e.target))return;
 const now=performance.now();if(now-SECRET.typedAt>4000)SECRET.typed='';SECRET.typedAt=now;SECRET.typed=(SECRET.typed+e.key.toLowerCase()).slice(-6);
 if(SECRET.typed==='secret'){e.preventDefault?.();e.stopImmediatePropagation?.();SECRET.typed='';secretOpen();}
}
async function secretCast(key){
 const status=$('secret-status');if(!SECRET.unlocked)return;
 if(st!=='PLAY'||MP.localPaused){status.textContent='Enter a match and resume to use a power.';return;}
 if(performance.now()-SECRET.lastUse<400){status.textContent='One power at a time…';return;}SECRET.lastUse=performance.now();
 try{if(DED.active){await dedRequest({type:'ability',code:SECRET_CODE,ability:key});status.textContent=SECRET_ABILITIES[key][0]+' · SENT';}
 else if(MP.active){status.textContent='Reconnect using the Phoenix multiplayer server to use powers.';}
 else if(secretApply(localPlayer().id,key)){secretNotice('YOU',key);status.textContent=SECRET_ABILITIES[key][0]+' · ACTIVE';cameraAnchorReady=false;}}
 catch(error){status.textContent=error.message;}
}
function setupSecret(){
 const section=document.createElement('section');section.id='secret-panel';section.hidden=true;section.setAttribute('role','dialog');section.setAttribute('aria-label','Secret arcade powers');
 section.innerHTML='<header><span>NIVET LAB / SECRET ARCADE</span><div><button id="secret-minimize" aria-label="Minimize secret menu">−</button><button id="secret-close" aria-label="Close secret menu">×</button></div></header><form id="secret-lock"><h2>YOU FOUND THE LAB.</h2><label for="secret-code">PASSCODE</label><input id="secret-code" type="password" autocomplete="off" spellcheck="false"><button type="submit">UNLOCK →</button><p id="secret-error" role="status"></p></form><div id="secret-powers" hidden><h2>MAKE SOME TROUBLE.</h2><p>Offline, private or quick matches. Online powers run on the server and announce themselves to everyone.</p><div id="secret-grid"></div></div><p id="secret-status" role="status">Type the exact passcode to enter.</p>';
 document.body.appendChild(section);
 const restore=document.createElement('button');restore.id='secret-restore';restore.hidden=true;restore.textContent='🧪 RESTORE LAB';document.body.appendChild(restore);
 const notice=document.createElement('div');notice.id='secret-notice';notice.hidden=true;notice.setAttribute('role','status');document.body.appendChild(notice);
 for(const [key,[name,description]] of Object.entries(SECRET_ABILITIES)){const button=document.createElement('button');button.dataset.ability=key;const title=document.createElement('b'),detail=document.createElement('small');title.textContent=name;detail.textContent=description;button.append(title,detail);button.onclick=()=>secretCast(key);$('secret-grid').appendChild(button);}
 $('secret-lock').onsubmit=e=>{e.preventDefault();if($('secret-code').value!==SECRET_CODE){$('secret-error').textContent='That is not the passcode.';return;}SECRET.unlocked=true;$('secret-code').value='';$('secret-status').textContent='Powers ready. Enter a match, then minimize the lab to drive.';secretPanel();};
 $('secret-minimize').onclick=()=>secretClose(true);$('secret-close').onclick=()=>secretClose();restore.onclick=secretOpen;addEventListener('keydown',secretKey,true);
}
