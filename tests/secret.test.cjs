const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function playing(){const g=load(),a=g.api;a.configureCars();a.setState({st:'PLAY',sandbox:false});return{...g,a}}
test('secret phrase opens an exact-code form with close and minimize/restore controls',()=>{
 const g=load({full:true}),a=g.api,d=g.document;for(const key of 'secret')a.secretKey({key,target:d.body});assert.equal(d.getElementById('secret-panel').hidden,false);
 const form=d.getElementById('secret-lock'),input=d.getElementById('secret-code');input.value='Spellingbeewinner';form.onsubmit({preventDefault(){}});assert.equal(a.SECRET.unlocked,false);
 input.value='spellingbeewinner';form.onsubmit({preventDefault(){}});assert.equal(a.SECRET.unlocked,true);assert.equal(d.getElementById('secret-powers').hidden,false);assert.equal(d.querySelectorAll('#secret-grid button').length,12);
 a.secretClose(true);assert.equal(d.getElementById('secret-panel').hidden,true);assert.equal(d.getElementById('secret-restore').hidden,false);d.getElementById('secret-restore').onclick();assert.equal(d.getElementById('secret-panel').hidden,false);a.secretClose();assert.equal(d.getElementById('secret-restore').hidden,true);
});
test('all arcade abilities produce finite bounded state in both playlists and every team size',()=>{
 for(const mode of [0,1])for(const size of [1,2,3]){const {a}=playing();a.cfg.mode=mode;a.cfg.size=size;a.configureCars();for(const key of Object.keys(a.SECRET_ABILITIES)){a.secretReset();assert.equal(a.secretApply(0,key),true,key);assert.ok(a.ball.p.toArray().concat(a.ball.v.toArray()).every(Number.isFinite));for(const c of a.cars.filter(c=>c.enabled)){assert.ok(c.p.toArray().every(Number.isFinite));a.surf(c.p);assert.ok(a.getState().penetration>=0);}}
 a.setState({st:'MENU'});assert.equal(a.secretApply(0,'yeet'),false);}
});
test('timed boost, fields and freeze expire and reset on the next kickoff',()=>{
 const {a}=playing(),c=a.cars[0];a.secretApply(0,'boost');c.boost=1;a.secretCarStep(c,1);assert.equal(c.boost,100);assert.equal(a.SECRET.boost[0],14);
 a.secretApply(0,'freeze');const before=Array.from(a.ball.p.toArray());a.ball.v.set(10,10,10);a.secretBallStep(1);assert.deepEqual(Array.from(a.ball.p.toArray()),before);assert.equal(a.ball.v.length(),0);a.secretBallStep(2);assert.equal(a.SECRET.freeze,0);
 a.secretApply(0,'magnet');a.ball.p.copy(c.p).add(new a.THREE.Vector3(5,1,0));a.secretBallStep(.1);assert.ok(a.ball.v.x<0);a.secretBallStep(6);assert.equal(a.SECRET.fields.length,0);a.kickoff();assert.equal(a.SECRET.boost[0],0);
 assert.equal(a.secretApply(0,'__proto__'),false);assert.equal(a.secretApply(99,'hop'),false);
});
test('neutral air spin settles while intentional flips retain their rotation',()=>{
 const {a}=playing(),c=a.cars[0];for(const other of a.cars)other.enabled=other===c;a.resetCar(c,0,0);c.p.y=10;c.w.set(3,2,3);c.ground=c.wasG=0;for(let i=0;i<90;i++)a.stepCar(c,a.DT);assert.ok(c.w.length()<.6,c.w.length());
 a.resetCar(c,0,0);c.p.y=10;c.ground=c.wasG=0;c.dT=.4;c.w.set(0,0,8);const before=c.q.clone();for(let i=0;i<12;i++)a.stepCar(c,a.DT);assert.ok(c.q.angleTo(before)>.5);assert.ok(c.w.length()>6);
});
test('a resting upside-down car recovers onto its wheels',()=>{
 const {a}=playing(),c=a.cars[0];a.resetCar(c,0,0);c.p.y=.7;c.q.setFromAxisAngle(new a.THREE.Vector3(1,0,0),Math.PI);c.prevQ.copy(c.q);c.ground=c.wasG=0;for(let i=0;i<480;i++)a.stepCar(c,a.DT);const up=new a.THREE.Vector3(0,1,0).applyQuaternion(c.q);assert.ok(up.y>.9,'up='+up.y);
});

test('open arcade overlay preserves native button keys without sending online jump edges',()=>{
 const g=load({full:true}),a=g.api;a.INTRO.active=false;a.LOADING.active=false;a.setState({st:'PLAY'});a.MP.active=true;a.MP.role='guest';a.SECRET.open=true;
 const button=g.document.querySelector('#secret-grid button'),before=a.MP.jump;
 for(const [key,code] of [[' ','Space'],['Enter','Enter']]){const e=new g.Event('keydown',{bubbles:true,cancelable:true});e.key=key;e.code=code;button.dispatchEvent(e);assert.equal(e.defaultPrevented,false,key+' should remain a native button action');assert.equal(a.MP.jump,before);assert.equal(a.keys[' ']||0,0);}
});
test('controller cannot jump, steer, change camera or pause behind the open arcade overlay',()=>{
 const g=load({full:true}),a=g.api;a.INTRO.active=false;a.LOADING.active=false;a.setState({st:'PLAY'});a.MP.active=true;a.MP.role='guest';a.SECRET.open=true;a.SECRET.minimized=false;
 const buttons=Array.from({length:16},()=>({pressed:false,value:0}));for(const index of [0,3,7,9])buttons[index]={pressed:true,value:1};g.setPads([{connected:true,mapping:'standard',buttons,axes:[1,1]}]);
 const before=a.MP.jump,camera=a.getState().ballCam;a.pollController();assert.equal(a.MP.jump,before);assert.equal(a.getState().ballCam,camera);assert.equal(a.MP.localPaused,false);assert.equal(a.padInput.thr,0);assert.equal(a.padInput.steer,0);a.human(a.cars[0]);assert.equal(a.cars[0].jp,0);
 buttons[0]={pressed:false,value:0};buttons[3]={pressed:false,value:0};buttons[9]={pressed:false,value:0};a.pollController();a.SECRET.minimized=true;buttons[0]={pressed:true,value:1};a.pollController();assert.equal(a.MP.jump,before+1);assert.equal(a.padInput.thr,1);assert.equal(a.padInput.steer,1);
});
