const DEFAULT_BINDINGS={forward:'KeyW',reverse:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',boost:'ShiftLeft',rollLeft:'KeyQ',rollRight:'KeyE',slide:'KeyC',camera:'KeyB'};
const ACTION_KEYS={forward:'w',reverse:'s',left:'a',right:'d',jump:' ',boost:'shift',rollLeft:'q',rollRight:'e',slide:'control',camera:'b'};
const CAMERA_DEFAULTS={fov:110,distance:2.7,height:1,angle:3,stiffness:.55,shake:false};
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
 $('camtag').dataset.camera=ballCam?'ball':'car';$('camtag').textContent=(ballCam?'BALL CAM':'CAR CAM')+' · '+keyLabel(bindings.camera);
}
function menuNavigationReady(){return st==='MENU'&&!INTRO.active&&!LOADING.active&&!bindingCapture&&!(SECRET.open&&!SECRET.minimized)&&!document.hidden&&inputFocused&&!!$('menu')?.classList.contains('on');}
function menuControlVisible(element,root=$('menu')){
 if(!element||element.disabled||element.getAttribute?.('aria-disabled')==='true'||!root?.contains(element))return false;
 for(let node=element;node&&node!==document;node=node.parentElement){
  if(node.hidden||node.inert||node.getAttribute?.('aria-hidden')==='true'||node.style?.display==='none'||node.style?.visibility==='hidden')return false;
  if(node.tagName==='DETAILS'&&!node.hasAttribute('open')&&!node.querySelector('summary')?.contains(element))return false;
  if(typeof getComputedStyle==='function'){const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden')return false;}
 }
 return true;
}
function menuFocus(element,root=$('menu')){if(!menuControlVisible(element,root))return false;element.focus?.({preventScroll:true});element.scrollIntoView?.({block:'nearest',inline:'nearest',behavior:'auto'});return true;}
function resetMenuScroll(){for(const element of [$('menu'),...$('menu').querySelectorAll('.menu-pages,.menu-pages>section')]){element.scrollTop=0;element.scrollLeft=0;}}
function focusMenuScreen(screen=menuScreen){
 if(!menuNavigationReady())return false;
 const panel=$(screen+'-panel');let target=screen==='home'?$('nav-play'):screen==='play'?panel?.querySelector('.destination-tabs [aria-pressed="true"]'):panel?.querySelector('h2');
 if(!menuControlVisible(target))target=Array.from(panel?.querySelectorAll('button,input:not([type="hidden"]),select,summary,a[href],[tabindex]')||[]).find(element=>menuControlVisible(element));
 if(target?.tagName==='H2')target.setAttribute('tabindex','-1');
 return menuFocus(target);
}
function navigateMenuKey(e){
 if(!menuNavigationReady()||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return false;
 const active=e.target||document.activeElement;
 if(active?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),#car-inspect'))return false;
 let group=active?.closest?.('.home-actions,.destination-tabs,.row,#body-options,#swatches,.action-switch,.preset-row');
 if(!group&&menuScreen==='home'&&(active===document.body||!active))group=$('home-panel')?.querySelector('.home-actions');
 if(!group||group.classList.contains('home-actions')&&!['ArrowUp','ArrowDown'].includes(e.key))return false;
 const choices=Array.from(group.querySelectorAll('button')).filter(element=>menuControlVisible(element));if(!choices.length)return false;
 const step=['ArrowDown','ArrowRight'].includes(e.key)?1:-1,index=choices.indexOf(active?.closest?.('button')),next=index<0?step>0?0:choices.length-1:(index+step+choices.length)%choices.length;
 e.preventDefault?.();e.stopPropagation?.();return menuFocus(choices[next]);
}
function controllerMenuRoot(){
 if(INTRO.active||LOADING.active||bindingCapture||SECRET.open&&!SECRET.minimized||document.hidden||!inputFocused)return null;
 if(st==='MENU')return $('menu')?.classList.contains('on')?$('menu'):null;
 if(st==='END'&&$('end')?.classList.contains('on'))return $('end');
 if((st==='PAUSE'||MP.localPaused)&&$('pause')?.classList.contains('on'))return $('pause');
 return st==='WAIT'&&!$('lobby')?.hidden?$('lobby'):null;
}
function controllerMenuControls(root=controllerMenuRoot()){
 const inMenu=root===$('menu'),panel=inMenu?$(menuScreen+'-panel'):root,items=Array.from(panel?.querySelectorAll('button,input[type="checkbox"],input[type="range"],select,summary')||[]).filter(element=>menuControlVisible(element,root));
 if(inMenu&&menuScreen==='play'&&menuControlVisible($('mobile-play'),root)&&!items.includes($('mobile-play')))items.push($('mobile-play'));
 if(inMenu&&menuScreen!=='home'&&menuControlVisible($('menu-back'),root))items.push($('menu-back'));return items;
}
function moveControllerMenu(step,root=controllerMenuRoot()){
 const items=controllerMenuControls(root);if(!items.length)return false;const index=items.indexOf(document.activeElement);
 return menuFocus(items[index<0?step>0?0:items.length-1:(index+step+items.length)%items.length],root);
}
function adjustControllerControl(target,step){
 if(target?.matches?.('input[type="range"]')){
  const min=Number(target.getAttribute('min')??0),max=Number(target.getAttribute('max')??100),stepValue=target.getAttribute('step'),increment=stepValue==='any'?Math.max(.01,(max-min)/100):Number(stepValue)||1;
  const before=Number(target.value),next=cl(Math.round((before+step*increment)*1e8)/1e8,min,max);if(next!==before){target.value=String(next);target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}));}return true;
 }
 if(target?.tagName==='SELECT'){
  const options=Array.from(target.options),current=options.findIndex(option=>option.selected||option.value===target.value);let next=current;
  do{next+=step;}while(next>=0&&next<options.length&&(options[next].disabled||options[next].hidden||options[next].parentElement?.disabled));
  if(next>=0&&next<options.length&&next!==current){target.value=options[next].value;target.dispatchEvent(new Event('change',{bubbles:true}));}return true;
 }
 return false;
}
const padMenu={up:false,down:false,left:false,right:false,confirm:false,back:false};
const padInput={connected:false,thr:0,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0,jump:false};
let padJump=false,padCamera=false,padPause=false;
const deadzone=x=>Math.abs(x)<.12?0:Math.sign(x)*(Math.abs(x)-.12)/.88;
function pollController(){
 let pads;try{pads=navigator.getGamepads?.()}catch(_){pads=null}
 const pad=Array.from(pads||[]).find(p=>p?.connected&&p.mapping==='standard');
 const root=controllerMenuRoot(),text=pad?st==='MENU'||root?'CONTROLLER CONNECTED · D-PAD navigate · LEFT/RIGHT adjust · A select · B back':'CONTROLLER CONNECTED · A jump · B boost · X slide · Y camera · LB/RB air roll':'KEYBOARD READY · Connect a standard controller to play';
 if($('controller-status')?.textContent!==text&&$('controller-status'))$('controller-status').textContent=text;
 padInput.connected=!!pad;Object.assign(padInput,{thr:0,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0,jump:false});
 if(!pad){padJump=padCamera=padPause=false;for(const key in padMenu)padMenu[key]=false;return;}
 const pressed=n=>!!pad.buttons[n]?.pressed,value=n=>cl(Number(pad.buttons[n]?.value)||0,0,1);
 const menuNow={up:pressed(12),down:pressed(13),left:pressed(14),right:pressed(15),confirm:pressed(0),back:pressed(1)},menuEdges={};for(const key in menuNow){menuEdges[key]=menuNow[key]&&!padMenu[key];padMenu[key]=menuNow[key];}
 if(st==='MENU'||root){
  if(INTRO.active&&!LOADING.active&&!starting&&inputFocused&&!document.hidden&&!(SECRET.open&&!SECRET.minimized)&&menuEdges.confirm)introPlay();
  else if(root){
   const inMenu=root===$('menu');
   if(menuEdges.back){if(inMenu){if(menuScreen!=='home')menuBack();}else{const back=$(root===$('end')?'q2':root===$('lobby')?'leave-room':'res');if(menuControlVisible(back,root))back.click();}}
   else if(pressed(9)&&!padPause&&root===$('pause')){if(menuControlVisible($('res'),root))$('res').click();}
   else if(menuEdges.up||menuEdges.down)moveControllerMenu(menuEdges.down?1:-1,root);
   else if(menuEdges.left||menuEdges.right){const step=menuEdges.right?1:-1,key=step>0?'ArrowRight':'ArrowLeft';if(!(menuControlVisible(document.activeElement,root)&&adjustControllerControl(document.activeElement,step))&&(!inMenu||!navigateMenuKey({key,target:document.activeElement})))moveControllerMenu(step,root);}
   else if(menuEdges.confirm){let target=document.activeElement,items=controllerMenuControls(root);if(!items.includes(target)){if(inMenu)focusMenuScreen();target=document.activeElement;if(!items.includes(target)){target=items[0];menuFocus(target,root);}}if(menuControlVisible(target,root)&&!target.matches?.('select,input[type="range"]'))target.click?.();}
  }
  padJump=pressed(0);padCamera=pressed(3);padPause=pressed(9);return;
 }
 const jump=pressed(0),camera=pressed(3),paused=pressed(9),arcadeOpen=SECRET.open&&!SECRET.minimized,playable=!arcadeOpen&&inputFocused&&!document.hidden&&!LOADING.active&&!INTRO.active&&!MP.localPaused&&!carDemolished(localPlayer())&&st==='PLAY';
 if(!arcadeOpen&&inputFocused&&!document.hidden&&!LOADING.active&&!INTRO.active){
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
function human(c){if(carDemolished(c)||SECRET.open&&!SECRET.minimized){Object.assign(c.inp,Z);c.jp=c.jh=0;return;}
 const k=keys,w=k.w||k.arrowup?1:0,s=k.s||k.arrowdown?1:0,a=k.a||k.arrowleft?1:0,d=k.d||k.arrowright?1:0,i=c.inp;
 const combine=(digital,touch,analog)=>digital||(touchInput.active?touch:analog);
 i.thr=combine(w-s,touchInput.thr,padInput.thr);i.pitch=combine(w-s,touchInput.pitch,padInput.pitch);i.steer=combine(d-a,touchInput.steer,padInput.steer);i.yaw=combine(d-a,touchInput.yaw,padInput.yaw);
 i.roll=combine((k.e?1:0)-(k.q?1:0),touchInput.roll,padInput.roll);i.boost=k.shift||k.mouseBoost||touchInput.boost||padInput.boost?1:0;i.ps=k.control||touchInput.ps||padInput.ps?1:0;c.jh=k[' ']||touchInput.jump||padInput.jump?1:0;
}
addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.button===0&&e.target?.id==='cv'&&st==='PLAY'&&!LOADING.active){keys.mouseBoost=1;e.preventDefault();}});
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
