const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('online GO message expires even when dedicated frame returns early',()=>{const g=load(),a=g.api;a.DED.active=true;a.MP.active=true;a.MP.loaded=false;a.msg('GO!',.8);for(let i=1;i<=20;i++)a.frame(i*100);assert.equal(Number(g.document.getElementById('msg').style.opacity),0)});
test('online GO expiry follows real elapsed time after a throttled display frame',()=>{const g=load(),a=g.api;a.DED.active=true;a.MP.active=true;a.MP.loaded=false;a.msg('GO!',.8);a.frame(2100);assert.equal(Number(g.document.getElementById('msg').style.opacity),0)});
test('predicted ball hits local oriented car and cannot finish regulation',()=>{const g=load(),a=g.api;a.configureCars();a.DED.active=true;Object.assign(a.MP,{active:true,role:'guest',slot:0});a.setState({st:'PLAY',tl:0,score:[1,0]});const c=a.cars[0];a.resetCar(c,0,0);c.q.identity();c.v.set(15,0,0);a.ball.p.set(1.6,c.p.y,0);a.ball.v.set(0,0,0);a.ballSub(1/120,true);assert.ok(a.ball.v.x>1,'local hit produces an immediate ball impulse');assert.ok(c.v.x<15,'car receives collision recoil');assert.equal(a.getState().st,'PLAY');assert.deepEqual(Array.from(a.getState().score),[1,0])});

test('repeated numeric multiplayer countdowns animate once per displayed number',()=>{
 const g=load(),a=g.api,el=g.document.getElementById('msg');let animations=0;el.animate=()=>{animations++;};el.getAnimations=()=>[];
 a.msg(3,1.2);for(let i=0;i<30;i++)a.msg(3,1.2);assert.equal(animations,1);assert.equal(el.textContent,'3');a.msg('3',1.2);assert.equal(animations,1);a.msg(2,1.2);assert.equal(animations,2);
});
test('remote timeline uses a short stable delay and never rewinds under jitter or extrapolates indefinitely',()=>{
 const a=load().api;a.dedResetClock();let previous=-Infinity;
 for(let tick=4;tick<240;tick+=4){const time=tick*1000/120,arrival=1000+time+[0,12,4,20][tick/4%4];assert.equal(a.dedClockSample(tick,arrival),time);const view=a.dedRenderTime(arrival,1/30);assert.ok(view>=previous);assert.ok(view<=time+40);previous=view;}
 assert.ok(a.DED.viewDelay>=50&&a.DED.viewDelay<=100);const capped=a.dedRenderTime(999999,10);assert.ok(capped<=a.DED.serverTime+40);a.dedResetClock();for(let tick=0;tick<120;tick+=4)a.dedClockSample(tick,1000+tick*1000/120);assert.ok(Math.abs(a.DED.viewDelay-50)<1e-8);
});
test('remote cars interpolate at server time instead of waiting a fixed 100ms after packet arrival',()=>{
 const g=load(),a=g.api;a.configureCars();a.DED.active=true;Object.assign(a.MP,{active:true,role:'guest',slot:0});a.setState({st:'PLAY'});const first=a.mpSnapshot(),second=a.mpSnapshot();first.cars[1].x=0;second.cars[1].x=1;first.cars[1].v=[30,0,0];second.cars[1].v=[30,0,0];a.MP.snapshot=second;a.MP.buffer=[{at:1000,time:0,state:first},{at:1100,time:1000/30,state:second}];Object.assign(a.DED,{serverOffset:0,serverTime:1000/30,viewDelay:50,viewTime:0});g.window.performance.now=()=>200/3;a.applyMultiplayer(1/60);assert.ok(Math.abs(a.cars[1].p.x-.5)<1e-6);
});
test('an authoritative steering correction preserves the local visual orientation without changing server physics',()=>{
 const g=load(),a=g.api;a.configureCars();a.DED.active=true;Object.assign(a.MP,{active:true,loaded:true,role:'guest',slot:0,round:0});a.setState({st:'PLAY'});const c=a.cars[0],state=a.mpSnapshot();state.phase='PLAY';state.round=0;state.seq=10;state.cars[0].q=[0,0,0,1];a.MP.snapshot={...state,seq:9};c.q.setFromAxisAngle(new a.THREE.Vector3(0,1,0),.35);const visible=c.q.clone();a.dedState({state,tick:120,ack:0,driver:a.packDriver(c)});assert.ok(c.q.angleTo(new a.THREE.Quaternion())<1e-7);assert.ok(c.q.clone().multiply(a.DED.rotationOffset).angleTo(visible)<1e-7);a.dedResetClock();assert.ok(a.DED.rotationOffset.angleTo(new a.THREE.Quaternion())<1e-7);
});
