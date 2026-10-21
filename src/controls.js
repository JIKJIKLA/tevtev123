const DEFAULT_BINDINGS={forward:'KeyW',reverse:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',boost:'ShiftLeft',rollLeft:'KeyQ',rollRight:'KeyE',slide:'KeyC',camera:'KeyB'};
const ACTION_KEYS={forward:'w',reverse:'s',left:'a',right:'d',jump:' ',boost:'shift',rollLeft:'q',rollRight:'e',slide:'control',camera:'b'};
const CAMERA_DEFAULTS={fov:105,distance:2.7,height:1.1,angle:4,stiffness:.55,shake:false};
const cameraSettings={...CAMERA_DEFAULTS},bindings={...DEFAULT_BINDINGS};
let bindingCapture=null,heldCodes=new Map(),inputFocused=true;
try{const pref=JSON.parse(localStorage.getItem('tevin.controls.v9')||'null');if(pref){
 for(const key in bindings)if(typeof pref.bindings?.[key]==='string'&&/^(Key[A-Z]|Digit[0-9]|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right))$/.test(pref.bindings[key]))bindings[key]=pref.bindings[key];
 const ranges={fov:[80,110],distance:[2,4],height:[.8,2],angle:[0,12],stiffness:[.1,1]};
 for(const [key,[min,max]] of Object.entries(ranges))if(Number.isFinite(pref.camera?.[key]))cameraSettings[key]=cl(pref.camera[key],min,max);
 cameraSettings.shake=pref.camera?.shake===true;
}}catch(_){}
function saveControls(){try{localStorage.setItem('tevin.controls.v9',JSON.stringify({bindings,camera:cameraSettings}))}catch(_){} }
function keyLabel(code){return code.replace(/^Key|^Digit/,'').replace('Left',' L').replace('Right',' R').replace('Control','Ctrl');}
function mappedKey(e){
 for(const [action,code] of Object.entries(bindings))if(code===e.code)return ACTION_KEYS[action];
 if(e.code==='ShiftRight'&&bindings.boost==='ShiftLeft')return 'shift';
 if(/^Arrow/.test(e.code)||['Escape','Enter','Tab','F2','F3','KeyR','KeyT'].includes(e.code))return e.key.toLowerCase();
 return 'unbound:'+e.code;
}
function captureBinding(e){
 if(!bindingCapture)return false;
 e.preventDefault();e.stopPropagation();
 if(e.code==='Escape'){bindingCapture=null;renderBindings();return true;}
 if(!/^(Key[A-Z]|Digit[0-9]|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right))$/.test(e.code)||['KeyR','KeyT'].includes(e.code)){
  $('binding-status').textContent='Choose a letter, number, Space, Shift, Ctrl or Alt. R and T are reserved for training.';return true;
 }
 const previous=bindings[bindingCapture];for(const action in bindings)if(action!==bindingCapture&&bindings[action]===e.code)bindings[action]=previous;
 bindings[bindingCapture]=e.code;bindingCapture=null;for(const key in keys)keys[key]=0;heldCodes.clear();saveControls();renderBindings();return true;
}
function renderBindings(){
 const box=$('binding-grid');if(!box)return;box.replaceChildren();
 const labels={forward:'Accelerate / pitch',reverse:'Brake / pitch',left:'Steer left',right:'Steer right',jump:'Jump / dodge',boost:'Boost',rollLeft:'Air roll left',rollRight:'Air roll right',slide:'Powerslide',camera:'Ball camera'};
 for(const action in bindings){const button=document.createElement('button');button.className='binding-button';button.textContent=labels[action]+' · '+(bindingCapture===action?'PRESS A KEY':keyLabel(bindings[action]));button.onclick=()=>{bindingCapture=action;renderBindings();$('binding-status').textContent='Press a key. Escape cancels. Used bindings swap places.'};box.appendChild(button);}
 if(!bindingCapture)$('binding-status').textContent='Changes save automatically. Arrow keys also drive. R / T reset training; F2 opens training settings.';
 $('camtag').textContent=(ballCam?'BALL CAM':'CAR CAM')+' · '+keyLabel(bindings.camera);
}
const padInput={connected:false,thr:0,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0,jump:false};
let padJump=false,padCamera=false,padPause=false;
const deadzone=x=>Math.abs(x)<.12?0:Math.sign(x)*(Math.abs(x)-.12)/.88;
function pollController(){
 let pads;try{pads=navigator.getGamepads?.()}catch(_){pads=null}
 const pad=Array.from(pads||[]).find(p=>p?.connected&&p.mapping==='standard');
 const text=pad?'CONTROLLER CONNECTED · A jump · B boost · X slide · Y camera · LB/RB air roll':'KEYBOARD READY · Connect a standard controller to play';
 if($('controller-status')?.textContent!==text&&$('controller-status'))$('controller-status').textContent=text;
 padInput.connected=!!pad;Object.assign(padInput,{thr:0,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0,jump:false});
 if(!pad){padJump=padCamera=padPause=false;return;}
 const pressed=n=>!!pad.buttons[n]?.pressed,value=n=>cl(Number(pad.buttons[n]?.value)||0,0,1);
 const jump=pressed(0),camera=pressed(3),paused=pressed(9),playable=inputFocused&&!document.hidden&&!LOADING.active&&!INTRO.active&&!MP.localPaused&&st==='PLAY';
 if(inputFocused&&!document.hidden&&!LOADING.active&&!INTRO.active){
  if(paused&&!padPause&&['PLAY','COUNT','PAUSE'].includes(st))pause();
  if(camera&&!padCamera&&['PLAY','COUNT'].includes(st)){ballCam=!ballCam;renderBindings();}
 }
 if(playable){
  Object.assign(padInput,{thr:value(7)-value(6),steer:deadzone(pad.axes[0]||0),yaw:deadzone(pad.axes[0]||0),pitch:-deadzone(pad.axes[1]||0),roll:(pressed(5)?1:0)-(pressed(4)?1:0),boost:pressed(1)?1:0,ps:pressed(2)?1:0,jump});
  if(jump&&!padJump){localPlayer().jp=1;if(MP.active&&MP.role==='guest')MP.jump++;}
 }
 padJump=jump;padCamera=camera;padPause=paused;
}
addEventListener('focus',()=>{inputFocused=true});
function human(c){
 const k=keys,w=k.w||k.arrowup?1:0,s=k.s||k.arrowdown?1:0,a=k.a||k.arrowleft?1:0,d=k.d||k.arrowright?1:0,i=c.inp;
 const combine=(digital,analog)=>digital||analog;
 i.thr=combine(w-s,padInput.thr);i.pitch=combine(w-s,padInput.pitch);i.steer=i.yaw=combine(d-a,padInput.steer);
 i.roll=combine((k.e?1:0)-(k.q?1:0),padInput.roll);i.boost=k.shift||k.mouseBoost||padInput.boost?1:0;i.ps=k.control||padInput.ps?1:0;c.jh=k[' ']||padInput.jump?1:0;
}
addEventListener('pointerdown',e=>{if(e.button===0&&e.target?.id==='cv'&&st==='PLAY'&&!LOADING.active){keys.mouseBoost=1;e.preventDefault();}});
addEventListener('pointerup',e=>{if(e.button===0)keys.mouseBoost=0;});
addEventListener('pointercancel',()=>{keys.mouseBoost=0;});
function setupDriverSettings(){
 const panel=document.createElement('section');panel.className='driver-settings';panel.innerHTML='<h3>CAMERA</h3><p class="settings-note">Your view, saved on this device.</p><div id="camera-settings"></div><label class="camera-toggle"><input id="camera-shake" type="checkbox"> CAMERA SHAKE</label><h3>YOUR CONTROLS</h3><p id="controller-status" class="settings-note"></p><div id="binding-grid"></div><p id="binding-status" class="settings-note" role="status"></p><button id="reset-driver-settings" class="inline-action">RESET CAMERA & CONTROLS</button>';
 $('settings-panel').insertBefore(panel,$('learnbox'));
 const settings=[['fov','Field of view',80,110,1],['distance','Distance',2,4,.1],['height','Height',.8,2,.1],['angle','Downward angle',0,12,1],['stiffness','Stiffness',.1,1,.05]];
 for(const [key,label,min,max,step] of settings){const row=document.createElement('label');row.className='camera-row';row.htmlFor='camera-'+key;row.innerHTML='<span>'+label+'</span><output id="camera-value-'+key+'"></output><input id="camera-'+key+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'">';$('camera-settings').appendChild(row);const input=$('camera-'+key);input.value=cameraSettings[key];const update=()=>{$('camera-value-'+key).textContent=key==='fov'||key==='angle'?cameraSettings[key]+'°':Number(cameraSettings[key]).toFixed(2)};input.oninput=()=>{cameraSettings[key]=Number(input.value);saveControls();update()};update();}
 $('camera-shake').checked=cameraSettings.shake;$('camera-shake').onchange=()=>{cameraSettings.shake=$('camera-shake').checked;saveControls()};
 $('reset-driver-settings').onclick=()=>{Object.assign(bindings,DEFAULT_BINDINGS);Object.assign(cameraSettings,CAMERA_DEFAULTS);bindingCapture=null;saveControls();panel.remove();setupDriverSettings()};renderBindings();
}
