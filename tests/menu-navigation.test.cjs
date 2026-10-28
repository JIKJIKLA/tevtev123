const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function menu(){
 const g=load({full:true}),a=g.api,d=g.document;let active=d.body;
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
