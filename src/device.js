// Screen and input capabilities only. No user-agent/device fingerprint is collected.
const DEVICE={form:'desktop',input:'keyboard',lastInput:'keyboard',preference:'auto',touchCapable:false,portrait:false,compact:false,stickId:null,pointers:new Map(),shown:false,ready:false,wordmarkHold:null};
const touchInput={active:false,thr:0,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0,jump:false};
try{const value=JSON.parse(localStorage.getItem('tevin.device.v1')||'null');if(['auto','touch','keyboard'].includes(value?.input))DEVICE.preference=value.input;}catch(_){}
function deviceCanPlay(count=false){
 return !window.__TEVIN_SERVER__&&inputFocused&&!document.hidden&&!LOADING.active&&!INTRO.active&&!MP.localPaused&&!(SECRET.open&&!SECRET.minimized)&&(st==='PLAY'||count&&st==='COUNT');
}
function setDeviceInput(kind){
 if(!['keyboard','touch','controller'].includes(kind))return;
 const newTouch=kind==='touch'&&!DEVICE.touchCapable;DEVICE.lastInput=kind;if(kind==='touch')DEVICE.touchCapable=true;
 DEVICE.input=DEVICE.preference==='auto'?kind:DEVICE.preference==='touch'?'touch':'keyboard';
 if(DEVICE.input!=='touch')clearTouchInput();
 if(DEVICE.ready){if(newTouch||DEVICE.preference==='touch')updateDeviceProfile();else deviceClasses();}
}
function updateDeviceProfile(){
 let coarse=false;try{coarse=matchMedia('(pointer: coarse)').matches;}catch(_){}
 DEVICE.touchCapable=DEVICE.touchCapable||coarse||Number(navigator.maxTouchPoints)>0;
 DEVICE.portrait=innerHeight>innerWidth;DEVICE.compact=innerWidth<900;
 DEVICE.form=DEVICE.touchCapable||DEVICE.preference==='touch'?(Math.min(innerWidth,innerHeight)<680?'phone':'tablet'):'desktop';
 if(!DEVICE.ready){const initial=coarse?'touch':'keyboard';DEVICE.lastInput=initial;DEVICE.input=DEVICE.preference==='touch'?'touch':DEVICE.preference==='keyboard'?'keyboard':initial;}
 if(DEVICE.ready)deviceClasses();
}
function deviceClasses(){
 const body=document.body;body.dataset.device=DEVICE.form;body.dataset.input=DEVICE.input;body.classList.toggle('device-phone',DEVICE.form==='phone');body.classList.toggle('device-tablet',DEVICE.form==='tablet');body.classList.toggle('device-touch',DEVICE.input==='touch');body.classList.toggle('device-portrait',DEVICE.portrait);body.classList.toggle('device-compact',DEVICE.compact);
 const practice=$('training-open');if(practice)practice.textContent=DEVICE.input==='touch'?'TRAINING SETTINGS':'TRAINING SETTINGS · F2';const tip=document.querySelector('#loading-screen footer span:last-child');if(tip)tip.textContent=DEVICE.input==='touch'?'LEFT STICK DRIVE · BOOST + JUMP TO FLY':DEVICE.input==='controller'?'RT DRIVE · B BOOST · A JUMP':'W / S DRIVE · SHIFT BOOST · SPACE JUMP';const status=$('device-status');if(status){const text=(DEVICE.form==='phone'?'PHONE':DEVICE.form==='tablet'?'TABLET':'DESKTOP')+' · '+(DEVICE.input==='touch'?'TOUCH CONTROLS':DEVICE.input==='controller'?'CONTROLLER':'KEYBOARD / MOUSE')+(DEVICE.portrait?' · PORTRAIT':' · LANDSCAPE');if(status.textContent!==text)status.textContent=text;}
}
function clearTouchInput(){
 cancelDeviceSecretHold();
 const hadJump=touchInput.jump;Object.assign(touchInput,{active:false,thr:0,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0,jump:false});DEVICE.stickId=null;
 for(const state of DEVICE.pointers.values()){state.element?.classList.remove('pressed');try{state.element?.releasePointerCapture?.(state.id);}catch(_){}}
 DEVICE.pointers.clear();Object.assign(touchInput,{active:false,thr:0,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0,jump:false});const knob=$('touch-knob');if(knob)knob.style.transform='translate3d(0,0,0)';
 if(hadJump){const c=localPlayer();c.jp=c.jh=0;}
}
function cancelDeviceSecretHold(){if(DEVICE.wordmarkHold){clearTimeout(DEVICE.wordmarkHold.timer);DEVICE.wordmarkHold=null;}}
function deviceSecretHoldStart(e){
 if(e.pointerType!=='touch')return;cancelDeviceSecretHold();
 const hold={id:e.pointerId,x:e.clientX,y:e.clientY,timer:0};DEVICE.wordmarkHold=hold;
 hold.timer=setTimeout(()=>{if(DEVICE.wordmarkHold!==hold)return;DEVICE.wordmarkHold=null;clearTouchInput();secretOpen();},900);
}
function deviceSecretHoldMove(e){const hold=DEVICE.wordmarkHold;if(hold&&e.pointerId===hold.id&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)>12)cancelDeviceSecretHold();}
function touchHoldState(){
 const held=kind=>Array.from(DEVICE.pointers.values()).some(p=>p.kind===kind);
 touchInput.boost=held('boost')?1:0;touchInput.ps=held('slide')?1:0;touchInput.jump=held('jump');touchInput.roll=(held('roll-right')?1:0)-(held('roll-left')?1:0);touchInput.active=DEVICE.pointers.size>0;
}
function touchStickMove(e){
 const state=DEVICE.pointers.get(e.pointerId);if(!state||state.kind!=='stick'||!deviceCanPlay(true))return;
 e.preventDefault?.();const radius=Math.max(30,Math.min(state.bounds.width,state.bounds.height)*.34),cx=state.bounds.left+state.bounds.width/2,cy=state.bounds.top+state.bounds.height/2;
 let x=(e.clientX-cx)/radius,y=(e.clientY-cy)/radius;const length=Math.hypot(x,y),clampTo=Math.max(1,length);x/=clampTo;y/=clampTo;
 const axis=v=>Math.abs(v)<.12?0:Math.sign(v)*(Math.abs(v)-.12)/.88;
 touchInput.steer=touchInput.yaw=axis(x);touchInput.thr=touchInput.pitch=-axis(y);touchInput.active=true;
 const knob=$('touch-knob');if(knob)knob.style.transform='translate3d('+(x*radius).toFixed(1)+'px,'+(y*radius).toFixed(1)+'px,0)';
}
function touchStickStart(e,bounds){
 if(!deviceCanPlay(true)||DEVICE.stickId!==null)return;e.preventDefault?.();setDeviceInput('touch');
 const element=e.currentTarget||$('touch-stick');bounds=bounds||element.getBoundingClientRect();DEVICE.stickId=e.pointerId;DEVICE.pointers.set(e.pointerId,{id:e.pointerId,kind:'stick',element,bounds});element.classList.add('pressed');try{element.setPointerCapture?.(e.pointerId);}catch(_){}touchStickMove(e);
}
function touchRelease(e,cancel=false){
 const state=DEVICE.pointers.get(e.pointerId);if(!state)return;
 DEVICE.pointers.delete(e.pointerId);if(!Array.from(DEVICE.pointers.values()).some(p=>p.element===state.element))state.element?.classList.remove('pressed');try{state.element?.releasePointerCapture?.(e.pointerId);}catch(_){}
 if(state.kind==='stick'){DEVICE.stickId=null;touchInput.thr=touchInput.steer=touchInput.pitch=touchInput.yaw=0;const knob=$('touch-knob');if(knob)knob.style.transform='translate3d(0,0,0)';}
 touchHoldState();if(cancel&&state.kind==='jump'&&!touchInput.jump){const c=localPlayer();c.jp=c.jh=0;}
}
function touchActionStart(kind,e){
 if(!deviceCanPlay(true)||DEVICE.pointers.has(e.pointerId))return;e.preventDefault?.();setDeviceInput('touch');
 const element=e.currentTarget,wasJump=touchInput.jump;DEVICE.pointers.set(e.pointerId,{id:e.pointerId,kind,element});element?.classList.add('pressed');try{element?.setPointerCapture?.(e.pointerId);}catch(_){}touchHoldState();
 if(kind==='jump'&&!wasJump&&deviceCanPlay()){localPlayer().jp=1;if(MP.active&&MP.role==='guest')MP.jump++;}
}
function touchTap(kind){
 if(kind==='pause'){if(['PLAY','COUNT'].includes(st)&&!LOADING.active&&!(SECRET.open&&!SECRET.minimized))pause();return;}
 if(kind==='camera'&&deviceCanPlay(true)){ballCam=!ballCam;renderBindings();}
 if(kind==='fullscreen'){try{const job=document.fullscreenElement?document.exitFullscreen?.():document.documentElement.requestFullscreen?.();job?.catch?.(()=>{});}catch(_){} }
}
function updateDeviceUI(){
 if(!DEVICE.ready)return;
 if(DEVICE.preference==='auto'&&padInput.connected&&(Math.abs(padInput.thr)+Math.abs(padInput.steer)+Math.abs(padInput.pitch)+Math.abs(padInput.roll)+padInput.boost+padInput.ps+(padInput.jump?1:0)>.15))setDeviceInput('controller');
 const show=DEVICE.input==='touch'&&deviceCanPlay(true);
 if(!show&&(touchInput.active||DEVICE.pointers.size))clearTouchInput();
 const panel=$('touch-controls');if(panel.hidden===show)panel.hidden=!show;DEVICE.shown=show;
 const airborne=show&&!localPlayer().ground;panel.classList.toggle('airborne',airborne);
 const hint=$('touch-landscape-hint');hint.hidden=!show||!DEVICE.portrait;
}
function setupDevice(){
 if(DEVICE.ready||window.__TEVIN_SERVER__)return;updateDeviceProfile();
 const panel=document.createElement('div');panel.id='touch-controls';panel.hidden=true;panel.setAttribute('aria-label','Touch driving controls');
 panel.innerHTML='<div id="touch-stick" role="group" aria-label="Drive and air steer joystick"><span id="touch-stick-label">DRIVE / AIR</span><i></i><span id="touch-knob"></span></div><div id="touch-toolbar"><button id="touch-camera" aria-label="Toggle ball camera">BALL CAM</button><button id="touch-fullscreen" aria-label="Toggle fullscreen">⛶</button><button id="touch-pause" aria-label="Pause game">Ⅱ</button></div><button id="touch-boost" aria-label="Hold boost">BOOST</button><button id="touch-jump" aria-label="Jump or dodge">JUMP</button><button id="touch-slide" aria-label="Hold powerslide">SLIDE</button><div id="touch-air"><button id="touch-roll-left" aria-label="Hold air roll left">↶</button><span>AIR ROLL</span><button id="touch-roll-right" aria-label="Hold air roll right">↷</button></div><span id="touch-landscape-hint" hidden>ROTATE FOR A WIDER VIEW</span>';
 document.body.appendChild(panel);const stick=$('touch-stick');stick.addEventListener('pointerdown',touchStickStart);stick.addEventListener('pointermove',touchStickMove);
 for(const kind of ['boost','jump','slide','roll-left','roll-right']){const button=$('touch-'+kind);button.addEventListener('pointerdown',e=>touchActionStart(kind,e));button.addEventListener('contextmenu',e=>e.preventDefault());}
 for(const kind of ['camera','pause','fullscreen']){const button=$('touch-'+kind);button.addEventListener('pointerdown',e=>{e.preventDefault();setDeviceInput('touch');touchTap(kind);});button.addEventListener('click',e=>{if(e.detail===0)touchTap(kind);});}
 const settings=document.createElement('section');settings.id='device-settings';settings.innerHTML='<h3>SCREEN & CONTROLS</h3><p id="device-status"></p><label for="device-controls">CONTROL LAYOUT</label><select id="device-controls"><option value="auto">Automatic — follow my input</option><option value="touch">Show touch controls</option><option value="keyboard">Keyboard / controller</option></select><p>Touch: drag the left stick to drive and air steer. Hold boost or slide while steering. Tap jump twice to dodge; use air-roll buttons in flight.</p>';$('settings-panel').insertBefore(settings,$('settings-panel').querySelector('h2')?.nextSibling||null);
 $('device-controls').value=DEVICE.preference;$('device-controls').onchange=()=>{DEVICE.preference=$('device-controls').value;try{localStorage.setItem('tevin.device.v1',JSON.stringify({input:DEVICE.preference}));}catch(_){}setDeviceInput(DEVICE.lastInput);updateDeviceUI();};
 addEventListener('pointerdown',e=>{if(e.pointerType==='touch')setDeviceInput('touch');else if(e.pointerType==='mouse')setDeviceInput('keyboard');},true);
 addEventListener('keydown',e=>{if(!e.ctrlKey&&!e.metaKey&&!['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)&&!e.target?.isContentEditable)setDeviceInput('keyboard');},true);
 addEventListener('pointerup',e=>{if(DEVICE.wordmarkHold?.id===e.pointerId)cancelDeviceSecretHold();touchRelease(e);});addEventListener('pointercancel',e=>{if(DEVICE.wordmarkHold?.id===e.pointerId)cancelDeviceSecretHold();touchRelease(e,true);});panel.addEventListener('lostpointercapture',e=>touchRelease(e,true));
 const wordmark=document.querySelector('.wordmark');if(wordmark)wordmark.addEventListener('pointerdown',deviceSecretHoldStart);addEventListener('pointermove',deviceSecretHoldMove);
 addEventListener('blur',clearTouchInput);addEventListener('resize',()=>{clearTouchInput();updateDeviceProfile();});addEventListener('orientationchange',()=>{clearTouchInput();updateDeviceProfile();});document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTouchInput();});
 DEVICE.ready=true;deviceClasses();updateDeviceUI();
}
