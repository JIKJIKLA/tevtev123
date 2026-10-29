const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function phone(){
 const g=load({source:true,full:true}),a=g.api;g.window.innerWidth=390;g.window.innerHeight=844;g.window.navigator.maxTouchPoints=5;g.window.matchMedia=()=>({matches:true});a.updateDeviceProfile();a.setDeviceInput('touch');a.INTRO.active=false;a.LOADING.active=false;a.configureCars();a.setState({st:'PLAY'});a.updateDeviceUI();return{...g,a};
}
function pointer(id,element,x=80,y=80){return{pointerId:id,pointerType:'touch',currentTarget:element,clientX:x,clientY:y,preventDefault(){}};}
test('phone capability layout follows touch, controller and keyboard without identifying hardware',()=>{
 const {a,document:d}=phone();assert.equal(a.DEVICE.form,'phone');assert.equal(a.DEVICE.portrait,true);assert.equal(d.body.dataset.input,'touch');assert.equal(d.getElementById('touch-controls').hidden,false);
 a.setDeviceInput('controller');a.updateDeviceUI();assert.equal(d.body.dataset.input,'controller');assert.equal(d.getElementById('touch-controls').hidden,true);a.setDeviceInput('touch');a.updateDeviceUI();assert.equal(d.getElementById('touch-controls').hidden,false);
 a.setState({st:'MENU'});a.updateDeviceUI();assert.equal(d.getElementById('touch-controls').hidden,true);
});
test('simultaneous stick, boost and jump pointers release independently and jump once per press',()=>{
 const {a,document:d}=phone(),stick=d.getElementById('touch-stick'),boost=d.getElementById('touch-boost'),jump=d.getElementById('touch-jump');a.MP.active=true;a.MP.role='guest';a.MP.jump=0;
 a.touchStickStart(pointer(1,stick,80,20),{left:0,top:0,width:160,height:160});assert.ok(a.touchInput.thr>.9);assert.equal(a.touchInput.steer,0);
 a.touchActionStart('boost',pointer(2,boost));a.touchActionStart('jump',pointer(3,jump));assert.equal(a.touchInput.boost,1);assert.equal(a.touchInput.jump,true);assert.equal(a.MP.jump,1);assert.equal(a.cars[0].jp,1);
 a.touchActionStart('jump',pointer(4,jump));assert.equal(a.MP.jump,1);a.touchRelease({pointerId:2});assert.equal(a.touchInput.boost,0);assert.equal(a.touchInput.jump,true);assert.ok(a.touchInput.thr>.9);
 a.touchRelease({pointerId:3});assert.equal(a.touchInput.jump,true);a.touchRelease({pointerId:4});assert.equal(a.touchInput.jump,false);a.touchActionStart('jump',pointer(5,jump));assert.equal(a.MP.jump,2);a.clearTouchInput();assert.equal(a.touchInput.thr,0);assert.equal(a.touchInput.jump,false);assert.equal(a.DEVICE.pointers.size,0);
});
test('stick is bounded, ignores a second steering finger, and air-roll buttons combine',()=>{
 const {a,document:d}=phone(),stick=d.getElementById('touch-stick');a.touchStickStart(pointer(1,stick,1000,-1000),{left:0,top:0,width:160,height:160});assert.ok(a.touchInput.steer>0&&a.touchInput.steer<=1);assert.ok(a.touchInput.thr>0&&a.touchInput.thr<=1);
 a.touchStickStart(pointer(2,stick,0,1000),{left:0,top:0,width:160,height:160});assert.equal(a.DEVICE.stickId,1);
 a.touchActionStart('roll-left',pointer(3,d.getElementById('touch-roll-left')));assert.equal(a.touchInput.roll,-1);a.touchActionStart('roll-right',pointer(4,d.getElementById('touch-roll-right')));assert.equal(a.touchInput.roll,0);a.touchRelease({pointerId:3});assert.equal(a.touchInput.roll,1);a.touchRelease({pointerId:1},true);assert.equal(a.touchInput.thr,0);assert.equal(a.touchInput.steer,0);
});
test('opening the secret lab, pausing or changing orientation clears every held control',()=>{
 const {a,document:d,dispatch,Event}=phone(),stick=d.getElementById('touch-stick');a.touchStickStart(pointer(1,stick,80,20),{left:0,top:0,width:160,height:160});a.SECRET.open=true;a.SECRET.minimized=false;a.updateDeviceUI();assert.equal(a.touchInput.thr,0);assert.equal(d.getElementById('touch-controls').hidden,true);
 a.SECRET.open=false;a.updateDeviceUI();a.touchActionStart('boost',pointer(2,d.getElementById('touch-boost')));dispatch(new Event('orientationchange'));assert.equal(a.touchInput.boost,0);assert.equal(a.DEVICE.pointers.size,0);
 a.touchActionStart('boost',pointer(3,d.getElementById('touch-boost')));a.setState({st:'PAUSE'});a.updateDeviceUI();assert.equal(a.touchInput.boost,0);
});
test('virtual-keyboard editing keeps touch layout and the hidden logo hold cancels on movement',()=>{
 const g=phone(),a=g.a,d=g.document,input=d.getElementById('secret-code'),key=new g.Event('keydown',{bubbles:true,cancelable:true});Object.assign(key,{key:'a',code:'KeyA'});input.dispatchEvent(key);assert.equal(a.DEVICE.input,'touch');assert.equal(key.defaultPrevented,false);
 const jobs=[];g.window.setTimeout=fn=>{jobs.push(fn);return jobs.length;};a.deviceSecretHoldStart({pointerType:'touch',pointerId:31,clientX:10,clientY:10});a.deviceSecretHoldMove({pointerId:31,clientX:30,clientY:10});jobs.shift()();assert.equal(a.SECRET.open,false);
 a.deviceSecretHoldStart({pointerType:'touch',pointerId:32,clientX:10,clientY:10});jobs.shift()();assert.equal(a.SECRET.open,true);
});

test('demolished touch players retain pause/fullscreen while all driving input is cleared and blocked',()=>{
 const g=phone(),{a,document:d}=g,car=a.cars[0];a.touchActionStart('boost',pointer(1,d.getElementById('touch-boost')));a.touchActionStart('jump',pointer(2,d.getElementById('touch-jump')));car.demoTime=3;a.updateDeviceUI();
 assert.equal(d.getElementById('touch-controls').hidden,false);assert.equal(d.getElementById('touch-pause').disabled,false);assert.equal(d.getElementById('touch-fullscreen').disabled,false);assert.equal(a.touchInput.active,false);assert.equal(a.touchInput.boost,0);assert.equal(a.touchInput.jump,false);assert.equal(car.jp,0);
 for(const kind of ['boost','jump','slide','roll-left','roll-right','camera'])assert.equal(d.getElementById('touch-'+kind).disabled,true,kind);
 a.touchActionStart('boost',pointer(3,d.getElementById('touch-boost')));a.touchStickStart(pointer(4,d.getElementById('touch-stick'),80,20),{left:0,top:0,width:160,height:160});a.keys.w=a.keys.shift=1;a.human(car);assert.equal(a.touchInput.active,false);assert.equal(car.inp.thr,0);assert.equal(car.inp.boost,0);assert.equal(car.jp,0);
 let fullscreen=0;d.documentElement.requestFullscreen=()=>{fullscreen++;return Promise.resolve();};const click=new g.Event('click',{bubbles:true});click.detail=0;d.getElementById('touch-fullscreen').dispatchEvent(click);assert.equal(fullscreen,1);d.getElementById('touch-pause').dispatchEvent(click);assert.equal(a.getState().st,'PAUSE');
 a.setState({st:'PLAY'});car.demoTime=0;a.updateDeviceUI();assert.equal(d.getElementById('touch-boost').disabled,false);assert.equal(d.getElementById('touch-stick').getAttribute('aria-disabled'),'false');
});
