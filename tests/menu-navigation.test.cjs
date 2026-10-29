const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function menu(){
 const g=load({source:true,full:true}),a=g.api,d=g.document;let active=d.body;g.window.Event=g.Event;
 // Linkedom has no browser focus manager; keep this shim scoped to these tests.
 Object.defineProperty(d,'activeElement',{configurable:true,get:()=>active});
 for(const element of d.querySelectorAll('*'))element.focus=()=>{active=element;};
 a.INTRO.active=false;a.LOADING.active=false;d.getElementById('intro').hidden=true;
 for(const child of d.getElementById('menu').children)child.inert=false;
 g.window.setTimeout=fn=>{fn();return 0;};a.setState({st:'MENU'});
 return{...g,a,d,active:()=>active};
}
function arrow(a,target,key){let prevented=false;const handled=a.navigateMenuKey({key,target,preventDefault(){prevented=true;},stopPropagation(){}});return{handled,prevented};}
function pad(){return{connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};}
function press(g,pad,index,value=true){pad.buttons[index]={pressed:value,value:value?1:0};g.a.pollController();}
function key(g,target,key,code=key){const event=new g.Event('keydown',{bubbles:true,cancelable:true});Object.assign(event,{key,code});target.dispatchEvent(event);return event;}

test('menu arrows wrap within visible main actions and skip disabled or hidden choices',()=>{
 const {a,d,active,Event}=menu(),play=d.getElementById('nav-play'),garage=d.getElementById('nav-garage'),training=d.getElementById('nav-training'),settings=d.getElementById('nav-settings');
 assert.equal(a.focusMenuScreen('home'),true);assert.equal(active(),play);
 const key=new Event('keydown',{bubbles:true,cancelable:true});Object.assign(key,{key:'ArrowDown',code:'ArrowDown'});play.dispatchEvent(key);assert.equal(key.defaultPrevented,true);assert.equal(active(),garage);assert.notEqual(a.keys.arrowdown,1);
 training.disabled=true;assert.equal(arrow(a,garage,'ArrowDown').handled,true);assert.equal(active(),settings);
 garage.hidden=true;assert.equal(arrow(a,settings,'ArrowDown').handled,true);assert.equal(active(),play);
 assert.equal(arrow(a,play,'ArrowUp').handled,true);assert.equal(active(),settings);
});

test('playlist and actual segmented rows support arrows without activating or driving',async()=>{
 const g=menu(),{a,d,active}=g;await a.openPlaySelection();
 const quick=d.getElementById('choose-quick'),offline=d.getElementById('choose-offline');quick.focus();let clicks=0;offline.onclick=()=>clicks++;
 assert.equal(arrow(a,quick,'ArrowRight').handled,true);assert.equal(active(),offline);assert.equal(clicks,0);assert.equal(a.keys.arrowright,undefined);
 const segments=Array.from(d.querySelector('#mode-rows .row').querySelectorAll('.seg'));segments[0].focus();
 assert.equal(arrow(a,segments[0],'ArrowRight').handled,true);assert.equal(active(),segments[1]);
});

test('typing, sliders, car inspection and native Tab or confirmation keep their own keys',()=>{
 const {a,d}=menu();for(const target of [d.getElementById('player-name'),d.getElementById('audio-master'),d.getElementById('goal-style'),d.getElementById('car-inspect')])assert.deepEqual(arrow(a,target,'ArrowRight'),{handled:false,prevented:false});
 const editable=d.createElement('div');editable.contentEditable='true';editable.setAttribute('contenteditable','true');d.getElementById('home-panel').appendChild(editable);assert.equal(arrow(a,editable,'ArrowDown').handled,false);
 for(const key of ['Tab','Enter',' '])assert.equal(arrow(a,d.getElementById('nav-play'),key).handled,false);
 a.LOADING.active=true;assert.equal(arrow(a,d.getElementById('nav-play'),'ArrowDown').handled,false);a.LOADING.active=false;a.INTRO.active=true;assert.equal(a.focusMenuScreen('home'),false);
});

test('standard controller menu navigation and confirmation act once per press and never drive',()=>{
 const g=menu(),{a,d,active}=g,p=pad();g.setPads([p]);a.focusMenuScreen('home');
 press(g,p,13);assert.equal(active(),d.getElementById('nav-garage'));for(let i=0;i<5;i++)a.pollController();assert.equal(active(),d.getElementById('nav-garage'));
 press(g,p,13,false);press(g,p,13);assert.equal(active(),d.getElementById('nav-training'));
 let clicked=0;active().onclick=()=>clicked++;press(g,p,0);a.pollController();assert.equal(clicked,1);assert.equal(a.padInput.thr,0);assert.equal(a.padInput.boost,0);assert.equal(a.padInput.jump,false);assert.equal(a.cars[0].jp,0);
 press(g,p,0,false);press(g,p,0);assert.equal(clicked,2);
});

test('controller can reach the detached launch button and return from match selection',async()=>{
 const g=menu(),{a,d,active}=g,p=pad();await a.openPlaySelection();a.updateDeviceUI();g.setPads([p]);a.focusMenuScreen('play');
 let reached=false;for(let i=0;i<80;i++){press(g,p,13);if(active()===d.getElementById('mobile-play')){reached=true;break;}press(g,p,13,false);}assert.equal(reached,true,'D-pad could not reach the launch action');
 let launches=0;d.getElementById('mobile-play').onclick=()=>launches++;press(g,p,13,false);press(g,p,0);assert.equal(launches,1);
 press(g,p,0,false);press(g,p,1);assert.equal(d.getElementById('menu').getAttribute('data-screen'),'home');assert.equal(active(),d.getElementById('nav-play'));
});

test('holding controller confirm through loading cannot launch a second action',()=>{
 const g=menu(),{a,d}=g,p=pad();g.setPads([p]);a.focusMenuScreen('home');let clicks=0;d.getElementById('nav-play').onclick=()=>clicks++;
 a.LOADING.active=true;press(g,p,0);a.LOADING.active=false;a.pollController();assert.equal(clicks,0);press(g,p,0,false);press(g,p,0);assert.equal(clicks,1);
});

test('native selects, disclosure summaries and links keep keyboard activation without starting a match',()=>{
 for(const [selector,pressed,code] of [['#device-controls','Enter','Enter'],['#device-controls','ArrowDown','ArrowDown'],['#settings-panel details summary',' ','Space'],['#settings-panel details summary','Enter','Enter'],['#settings-panel a[href]','Enter','Enter']]){
  const g=menu(),{a,d}=g;d.getElementById('nav-settings').onclick();const target=d.querySelector(selector);assert.ok(target,selector);
  const event=key(g,target,pressed,code);assert.equal(event.defaultPrevented,false,selector+' '+pressed);assert.equal(a.LOADING.active,false,'Native activation started a match');assert.equal(a.getState().st,'MENU');assert.equal(a.keys.arrowdown,undefined);
 }
 const g=menu(),summary=g.d.querySelector('#settings-panel details summary'),child=g.d.createElement('span');summary.appendChild(child);assert.equal(key(g,child,'Enter').defaultPrevented,false);assert.equal(g.a.LOADING.active,false);
});

test('menu Enter only opens match selection or starts an intended offline playlist',()=>{
 for(const [screen,navigation] of [['settings','nav-settings'],['party','quick-manage-party']]){
  const g=menu();g.d.getElementById(navigation).onclick();assert.equal(g.d.getElementById('menu').getAttribute('data-screen'),screen);key(g,g.d.body,'Enter');assert.equal(g.a.LOADING.active,false,screen+' Enter launched a match');assert.equal(g.a.getState().st,'MENU');
 }
 const g=menu();key(g,g.d.body,'Enter');assert.equal(g.d.getElementById('menu').getAttribute('data-screen'),'play');assert.equal(g.a.LOADING.active,false);
 g.d.getElementById('choose-offline').onclick();g.window.setTimeout=()=>0;key(g,g.d.body,'Enter');assert.equal(g.a.LOADING.active,true,'Offline Enter no longer launches from match selection');
});

test('binding capture still owns native targets before the input guards',()=>{
 const g=menu(),{a,d}=g;d.getElementById('binding-grid').firstElementChild.onclick();const event=key(g,d.getElementById('device-controls'),'b','KeyB');assert.equal(event.defaultPrevented,true);assert.equal(a.bindings.forward,'KeyB');assert.equal(a.bindings.camera,'KeyW');assert.equal(a.LOADING.active,false);assert.equal(a.keys.b,undefined);
});

test('controller private lobby skips hidden or disabled host actions and can start, copy and leave once',()=>{
 const g=menu(),{a,d,active}=g,p=pad();a.setState({st:'WAIT'});d.getElementById('menu').classList.remove('on');d.getElementById('lobby').hidden=false;g.setPads([p]);
 const start=d.getElementById('lobby-start'),copy=d.getElementById('copy-code'),leave=d.getElementById('leave-room');let started=0,copied=0,left=0;start.onclick=()=>started++;copy.onclick=()=>copied++;leave.onclick=()=>left++;start.disabled=true;
 press(g,p,13);assert.equal(active(),copy);press(g,p,0);a.pollController();assert.equal(copied,1);assert.equal(started,0);
 press(g,p,13,false);press(g,p,0,false);start.disabled=false;press(g,p,12);assert.equal(active(),start);press(g,p,0);assert.equal(started,1);
 press(g,p,0,false);press(g,p,12,false);start.hidden=true;press(g,p,13);assert.equal(active(),copy);press(g,p,1);assert.equal(left,1);assert.equal(a.padInput.boost,0);assert.equal(a.padInput.jump,false);
});

test('controller end screen honors disabled rematch and navigates back to the menu',()=>{
 const g=menu(),{a,d,active}=g,p=pad();a.setState({st:'END'});d.getElementById('menu').classList.remove('on');d.getElementById('end').classList.add('on');g.setPads([p]);const rematch=d.getElementById('rm'),back=d.getElementById('q2');let rematches=0,returns=0;rematch.onclick=()=>rematches++;back.onclick=()=>returns++;rematch.disabled=true;
 press(g,p,13);assert.equal(active(),back);press(g,p,0);assert.equal(returns,1);assert.equal(rematches,0);key(g,d.body,'Enter');assert.equal(rematches,0,'Keyboard bypassed disabled rematch');
 press(g,p,0,false);press(g,p,13,false);rematch.disabled=false;press(g,p,12);assert.equal(active(),rematch);press(g,p,0);a.pollController();assert.equal(rematches,1);press(g,p,1);assert.equal(returns,2);
});

test('controller pause confirmation and Start respect a disabled resume action',()=>{
 const g=menu(),{a,d,active}=g,p=pad();a.setState({st:'PAUSE'});d.getElementById('menu').classList.remove('on');d.getElementById('pause').classList.add('on');d.getElementById('training-panel').hidden=true;g.setPads([p]);const resume=d.getElementById('res');let resumed=0;resume.onclick=()=>resumed++;resume.disabled=true;
 press(g,p,1);press(g,p,9);assert.equal(resumed,0);press(g,p,13);assert.equal(active(),d.getElementById('q1'));press(g,p,1,false);press(g,p,9,false);resume.disabled=false;press(g,p,9);a.pollController();assert.equal(resumed,1);
});

test('controller settings include native sliders and selections with bounded left-right adjustments',()=>{
 const g=menu(),{a,d,active}=g,p=pad();d.getElementById('nav-settings').onclick();g.setPads([p]);const select=d.getElementById('device-controls');
 // Linkedom lacks a select.value setter; supply the browser DOM contract here.
 Object.defineProperty(select,'value',{configurable:true,get(){return Array.from(this.options).find(option=>option.selected)?.value??this.options[0]?.value??'';},set(value){for(const option of this.options)option.selected=false;const next=Array.from(this.options).find(option=>option.value===value);if(next)next.selected=true;}});
 select.value='auto';press(g,p,13);assert.equal(active(),select);press(g,p,15);assert.equal(a.DEVICE.preference,'touch');assert.equal(active(),select);press(g,p,15,false);press(g,p,15);assert.equal(a.DEVICE.preference,'keyboard');press(g,p,15,false);press(g,p,15);assert.equal(a.DEVICE.preference,'keyboard');
 const fov=d.getElementById('camera-fov');fov.focus();press(g,p,14);assert.equal(Number(fov.value),109);assert.equal(a.cameraSettings.fov,109);a.pollController();assert.equal(a.cameraSettings.fov,109);assert.equal(active(),fov);assert.equal(a.padInput.thr,0);assert.equal(a.padInput.boost,0);
 press(g,p,14,false);fov.value='80';press(g,p,14);assert.equal(Number(fov.value),80);assert.equal(a.LOADING.active,false);
});

test('phone screen transitions reset inherited scroll and focus a visible garage choice when its heading is hidden',()=>{
 const g=menu(),{a,d,active}=g;g.window.innerWidth=390;g.window.innerHeight=844;g.window.navigator.maxTouchPoints=5;a.updateDeviceProfile();
 // Linkedom has no media-query layout; reflect the phone rule that hides this heading.
 g.window.getComputedStyle=element=>({display:element.matches?.('#garage-panel h2')?'none':'block',visibility:'visible'});
 const root=d.getElementById('menu'),pages=d.querySelector('#menu .menu-pages'),settings=d.getElementById('settings-panel'),garage=d.getElementById('garage-panel');d.getElementById('nav-settings').onclick();
 root.scrollTop=81;pages.scrollTop=453;settings.scrollTop=453;garage.scrollTop=200;const slider=d.getElementById('camera-fov');slider.focus();slider.value='101';slider.oninput();
 assert.equal(pages.scrollTop,453,'An in-page setting reset the reader’s scroll');assert.equal(root.scrollTop,81);assert.equal(active(),slider);assert.equal(a.cameraSettings.fov,101);
 // Hold the graphics readiness task; the screen/reset portion is synchronous.
 g.window.setTimeout=()=>0;d.getElementById('nav-garage').onclick();assert.equal(root.getAttribute('data-screen'),'garage');for(const element of [root,pages,settings,garage])assert.equal(element.scrollTop,0,'A menu scroll container kept its previous offset');
 a.LOADING.active=false;root.inert=false;assert.equal(a.focusMenuScreen('garage'),true);assert.equal(active(),d.querySelector('#body-options button'));assert.notEqual(active(),d.querySelector('#garage-panel h2'));assert.notEqual(active(),d.getElementById('preview-car'));
 pages.scrollTop=170;d.getElementById('menu-back').onclick();assert.equal(pages.scrollTop,0);assert.equal(active(),d.getElementById('nav-play'),'Home lost its intended primary focus');
});
