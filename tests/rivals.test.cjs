const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function practice(){const g=load(),a=g.api;a.configureCars();a.setState({st:'PLAY',sandbox:true});return{...g,a}}
test('every drill is repeatable and cannot mutate an online match',()=>{
 const {a}=practice();for(const kind of Object.keys(a.DRILLS)){
  assert.equal(a.trainingSetup(kind),true);const p=a.ball.p.toArray(),car=a.cars[0].p.toArray();
  a.ball.p.set(20,20,20);a.cars[0].p.set(10,10,10);a.DRILL.hold=2.9;
  assert.equal(a.trainingSetup(kind,true),true);assert.deepEqual(a.ball.p.toArray(),p);assert.deepEqual(a.cars[0].p.toArray(),car);assert.equal(a.DRILL.hold,0);assert.equal(a.cars.filter(c=>c.enabled).length,1);
 }
 a.MP.active=true;const before=a.ball.p.toArray();assert.equal(a.trainingSetup('shoot'),false);assert.deepEqual(a.ball.p.toArray(),before);
});
test('drill success awards progress once and repeat starts a clean attempt',()=>{
 const {a}=practice();a.trainingSetup('aerial');a.cars[0].p.y=3;a.rivalsTouch(a.cars[0],5);assert.equal(a.CAREER.drills,1);a.rivalsTouch(a.cars[0],5);assert.equal(a.CAREER.drills,1);
 a.trainingSetup('aerial',true);assert.equal(a.DRILL.attempts,2);assert.equal(a.DRILL.successes,1);assert.equal(a.DRILL.saved,false);
 a.trainingSetup('recover');a.cars[0].ground=true;a.cars[0].n.set(0,1,0);a.trainingTick(.6);assert.equal(a.CAREER.drills,2);
});
test('goal replay is a bounded copy and idle cleanup preserves the chase camera anchor',()=>{
 const {a}=practice();a.setState({sandbox:false,st:'PLAY'});for(let i=0;i<180;i++){a.RIVALS.time=i/30;a.ball.p.x=i;a.replayRecord()}
 assert.equal(a.RIVALS.ring.length,150);const previous=a.RIVALS.ring.at(-1).ball[0];a.ball.p.x=-99;assert.equal(a.RIVALS.ring.at(-1).ball[0],previous);
 a.setCameraAnchor(true);a.rivalsTick(.016);assert.equal(a.cameraAnchor(),true);
 a.setState({st:'GOAL',score:[1,0]});a.rivalsGoal({team:0,scorer:0,assist:-1,speed:70});assert.equal(a.RIVALS.replay.frames.length,120);
 a.stopReplay();assert.equal(a.RIVALS.replay,null);assert.equal(a.cameraAnchor(),false);
});
test('overhead ball framing keeps a bounded vertical aim without moving either body',()=>{
 const {a}=practice(),p=new a.THREE.Vector3(1,1,2),b=new a.THREE.Vector3(1,20,2),out=new a.THREE.Vector3();a.cameraBallTarget(p,b,out);assert.equal(out.y,2.3);assert.equal(b.y,20);
 b.set(101,20,2);a.cameraBallTarget(p,b,out);assert.ok(out.distanceTo(p)<16);assert.ok(out.y<8);
});
test('Heatseeker target and speed synchronize while invalid state is rejected',()=>{
 const {a}=practice();assert.equal(a.readHeatState({target:-1,speed:38,cooldown:.15}),true);assert.equal(a.heat.target,-1);assert.equal(a.heat.speed,38);
 for(const value of [null,{target:3,speed:22,cooldown:0},{target:1,speed:Infinity,cooldown:0},{target:1,speed:22,cooldown:-1}])assert.equal(a.readHeatState(value),false);
 assert.equal(a.heat.target,-1);assert.equal(a.mpSnapshot().heat.speed,38);
});
test('local match XP is recorded once, persists, and excludes practice',()=>{
 const g=practice(),a=g.a;a.setState({score:[3,1]});a.cars[0].goals=2;a.rivalsFinish();assert.equal(a.CAREER.matches,0);
 a.setState({sandbox:false});a.rivalsFinish();a.rivalsFinish();assert.equal(a.CAREER.matches,1);assert.equal(a.CAREER.wins,1);assert.equal(a.CAREER.xp,190);
 const restored=load({storage:Object.fromEntries(g.storage)}).api;assert.equal(restored.CAREER.matches,1);assert.equal(restored.CAREER.history.length,1);
});
test('garage slots preserve body, finish, and celebration without changing match rules',()=>{
 const {a}=practice();a.cfg.body=2;a.cfg.color=4;a.RIVAL_PREF.celebration='comet';assert.equal(a.garagePreset(0,true),true);
 a.cfg.body=0;a.cfg.color=0;a.cfg.gravity=.5;assert.equal(a.garagePreset(0,false),true);assert.equal(a.cfg.body,2);assert.equal(a.cfg.color,4);assert.equal(a.cfg.gravity,.5);
 a.MP.active=true;assert.equal(a.garagePreset(0,false),false);a.MP.active=false;a.CAREER.presets[1]={body:99,color:0};assert.equal(a.garagePreset(1,false),false);
});
test('best-of series count each game once and reset only after a series win',()=>{
 const {a}=practice();a.cfg.series=3;a.seriesStart(true);a.setState({score:[2,1]});a.seriesFinish();a.seriesFinish();assert.equal(a.SERIES.wins[0],1);
 a.seriesStart();assert.equal(a.SERIES.wins[0],1);a.seriesFinish();assert.equal(a.SERIES.winner,0);a.seriesStart();assert.deepEqual(Array.from(a.SERIES.wins),[0,0]);assert.equal(a.SERIES.winner,-1);
});
test('full menu exposes usable settings, seven drills and three preset slots',()=>{
 const g=load({full:true});assert.equal(g.document.querySelectorAll('#drill-list button').length,7);assert.equal(g.document.querySelectorAll('[id^="preset-save-"]').length,3);
 g.document.getElementById('option-replays').checked=false;g.document.getElementById('option-replays').onchange();assert.equal(g.api.RIVAL_PREF.replays,false);
 g.document.getElementById('camera-preset-close').onclick();assert.equal(g.api.cameraSettings.fov,100);assert.equal(g.document.querySelectorAll('.camera-row').length,5);
});
test('damaged local history cannot prevent menu startup',()=>{
 const g=load({full:true,storage:{'tevin.rivals.v1':JSON.stringify({career:{history:[null,1,{}, {result:'WIN',size:1,score:'1–0',mode:'Soccar'}]}})}});assert.equal(g.api.CAREER.history.length,1);
});
test('preset restore synchronizes every visible body and paint label',()=>{
 const g=load({full:true}),a=g.api;a.garagePreset(0,true);a.cfg.body=2;a.cfg.color=4;a.garagePreset(0,false);
 assert.equal(g.document.querySelector('#body-options button').getAttribute('aria-pressed'),'true');assert.equal(g.document.getElementById('paint-name').textContent,'Cobalt');assert.match(g.document.getElementById('menu-context').textContent,/Octane · Cobalt/);assert.match(g.document.getElementById('garage-status').textContent,/Octane · Cobalt/);
});
test('returning from training clears sandbox state before garage reconfiguration',async()=>{
 const g=load({full:true});g.window.setTimeout=fn=>{fn();return 0};g.api.setState({st:'PLAY',sandbox:true});await g.api.quit();g.api.configureCars();assert.equal(g.api.getState().sandbox,false);assert.equal(g.document.getElementById('training-hud').hidden,true);
});
