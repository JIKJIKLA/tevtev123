const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('drone delivery opens before release, bounces, and settles with zero height/spin derivative before kickoff',()=>{
 const a=load().api,p=a.openingDeliveryPose;assert.equal(p(0).open,0);assert.equal(p(1.3).open,1);assert.equal(p(1.3).height,21.93);assert.ok(p(2).height<p(1.7).height);assert.equal(p(4.05).height,.9125);assert.ok(p(4.45).height>2.5);assert.ok(p(5.15).height>1.3);assert.equal(p(6.7).height,.9125);assert.equal(p(7.2).height,.9125);assert.equal(p(6.8).spin,0);assert.equal(p(7.2).handoff,1);assert.equal(p(4).open,0);
 assert.ok(p(0).height-.9125>20.815,'carried ball must clear the closed latch');for(let t=0;t<7.2;t+=.013){const sample=p(t);assert.ok(sample.height>=.9125-1e-8);assert.ok(Object.entries(sample).every(([k,v])=>typeof v==='string'||Number.isFinite(v)));}
});
test('delivery is armed for the first VS AI kickoff only, preserves physics during staging, and ends exactly at the serving pose',()=>{
 for(const mode of [0,1])for(const size of [1,2,3]){
  const a=load().api;a.cfg.mode=mode;a.cfg.size=size;a.configureCars();a.setState({st:'MENU',sandbox:false});a.rivalsStart();a.kickoff();assert.equal(a.OPENING.active,true);assert.equal(a.getState().cnt,7.2);const target=Array.from(a.ball.p.toArray());assert.equal(a.ball.v.length(),0);for(let t=0;t<7.2;t+=.1)a.openingDeliveryPose(t);assert.deepEqual(Array.from(a.ball.p.toArray()),target);a.ball.v.set(1,2,3);a.ball.w.set(2,3,4);assert.equal(a.finishOpening(),true);assert.equal(a.ball.v.length(),0);assert.equal(a.ball.w.length(),0);assert.deepEqual(Array.from(a.ball.p.toArray()),target);
  a.kickoff();assert.equal(a.OPENING.active,false);assert.equal(a.getState().cnt,3.99);a.rivalsStart();a.kickoff();assert.equal(a.OPENING.active,true);a.resetMatchPresentation();assert.equal(a.OPENING.active,false);
 }
});
test('multiplayer, practice and reduced motion skip the drone and retain the standard countdown',()=>{
 for(const kind of ['online','practice','motion','server']){const g=load(),a=g.api;a.configureCars();if(kind==='online')a.MP.active=true;if(kind==='practice')a.setState({sandbox:true});if(kind==='motion')a.RIVAL_PREF.motion=false;if(kind==='server')g.window.__TEVIN_SERVER__=true;a.rivalsStart();a.kickoff();assert.equal(a.OPENING.active,false,kind);assert.equal(a.getState().cnt,3.99,kind);}
});
test('opening geometry has two movable latch panels, four rotors and finite batched meshes',()=>{
 const a=load().api,v=a.createOpeningVisuals();assert.equal(v.doors.length,2);assert.equal(v.rotors.length,4);assert.equal(v.grips.length,2);let count=0;v.group.traverse(o=>{if(o.isMesh){count++;assert.equal(o.castShadow,false);assert.ok(Array.from(o.geometry.getAttribute('position').array).every(Number.isFinite));}});assert.ok(count<32);assert.equal(v.group.visible,false);
});
test('goal replay explodes from the field side and the blackout-to-countdown lasts under one second',()=>{
 const a=load().api,T=a.THREE,p=new T.Vector3(),target=new T.Vector3();for(const team of [0,1])for(const age of [0,.3,1]){a.goalFieldCameraPose(team,age,p,target);assert.ok(Math.abs(p.z)<51.2-9);assert.ok(Math.abs(target.z)<51.2);a.surf(p);assert.ok(a.getState().penetration>.42);}
 assert.equal(a.goalFadeSample('GOAL',.5,'GOAL',0).opacity,0);assert.equal(a.goalFadeSample('GOAL',0,'GOAL',0).opacity,1);let f=a.goalFadeSample('COUNT',0,'GOAL',0);assert.equal(f.opacity,1);for(let i=0;i<45;i++)f=a.goalFadeSample('COUNT',0,'COUNT',f.out-.01);assert.ok(f.opacity<1e-10);assert.ok(a.PRESENTATION_TIMING.goalFade<=1);
});
test('countdown and goal holds keep real-time presentation after a slow display frame while physics stays capped',()=>{
 const a=load().api;a.configureCars();a.kickoff();for(let i=1;i<=4;i++)a.frame(i*1000);assert.equal(a.getState().st,'PLAY');a.cars.forEach(c=>c.enabled=false);a.goal(0);const hold=a.getState().gt;for(let i=5;i<=12;i++)a.frame(i*1000);assert.ok(a.getState().gt<hold-7);a.frame(13000);assert.equal(a.getState().st,'COUNT');
});
test('kickoff jolt is small, decays to zero and repeated GO packets cannot restart it',()=>{
 const a=load().api,v=new a.THREE.Vector3();for(let t=0;t<.5;t+=.01)assert.ok(a.kickoffJoltOffset(t,v).length()<.04);assert.equal(a.kickoffJoltOffset(.42,v).length(),0);a.msg('GO!',.8);a.KICKOFF_JOLT.age=.3;for(let i=0;i<30;i++)a.msg('GO!',.8);assert.equal(a.KICKOFF_JOLT.age,.3);
});
test('replay can render a fresh goal burst without replaying its UI or overwriting live celebration age',()=>{
 const a=load().api,T=a.THREE,e=a.CELEBRATION,mesh=n=>new T.InstancedMesh(new T.BoxGeometry(),new T.MeshBasicMaterial(),n);a.setState({st:'GOAL',score:[1,0]});a.triggerCelebration({id:9,team:0,scorer:0});Object.assign(e,{group:new T.Group(),boostOuter:mesh(12),boostCore:mesh(12),trail:mesh(96),shards:mesh(72),rings:[0,1,2].map(()=>new T.Mesh(new T.RingGeometry(.9,1),new T.MeshBasicMaterial())),shardDirection:Array.from({length:72},()=>new T.Vector3(1,.4,1).normalize()),shardSpeed:Array(72).fill(10)});e.age=8;a.updateCelebrations(0,{age:.2,suppressUI:true});assert.equal(e.shards.count,72);assert.equal(e.age,8);assert.equal(e.ui.el.hidden,true);assert.ok(e.rings[0].visible);assert.ok(Array.from(e.shards.instanceMatrix.array).every(Number.isFinite));
});
test('team chat uses safe message cards, cooldown feedback and closes the menu after sending',()=>{
 const g=load({full:true}),a=g.api,d=g.document;a.setState({st:'PLAY'});d.getElementById('quick-chat').open=true;a.sendQuickChat(0);a.renderQuickChat();assert.equal(d.getElementById('quick-chat').open,false);assert.equal(d.getElementById('chat-0').disabled,true);assert.match(d.getElementById('chat-log').textContent,/I GOT IT!/);a.receiveQuickChat({name:'<img src=x>',text:'NICE SHOT!'});a.renderQuickChat();assert.equal(d.getElementById('chat-log').querySelectorAll('img').length,0);assert.match(d.getElementById('chat-log').textContent,/<img src=x>/);a.RIVALS.time+=2;a.renderQuickChat();assert.equal(d.getElementById('chat-0').disabled,false);
});
test('new goals clear the previous replay label and keep its controls hidden during the live celebration',()=>{
 const g=load(),a=g.api,d=g.document;a.configureCars();a.setState({st:'PLAY',sandbox:false});for(let i=0;i<15;i++){a.RIVALS.time=i/30;a.replayRecord();}d.getElementById('replay-label').textContent='GOAL EXPLOSION';a.setState({st:'GOAL',score:[1,0]});a.rivalsGoal({id:1,team:0,scorer:0,assist:-1,speed:40});assert.equal(d.getElementById('replay-controls').hidden,true);assert.equal(d.getElementById('replay-label').textContent,'GOAL REPLAY · THE APPROACH');assert.equal(a.PRESENTATION_TIMING.replayDelay+a.PRESENTATION_TIMING.replayDuration,a.PRESENTATION_TIMING.goalHold);
});
