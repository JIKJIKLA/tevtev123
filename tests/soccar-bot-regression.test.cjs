const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function setup(size=1){const g=load({source:true}),a=g.api;a.cfg.mode=0;a.cfg.size=size;a.configureCars();a.setState({st:'PLAY',sandbox:false,tl:60});return{...g,a};}
test('Soccar still approaches and physically touches a stationary diagonal ball',()=>{
 for(const level of [0,1,2]){const{a}=setup();a.cfg.lvl=level;a.cars[0].enabled=false;const c=a.cars[1];a.resetCar(c,4,12);c.q.setFromAxisAngle(new a.THREE.Vector3(0,1,0),Math.PI/2);a.ball.p.set(0,1,0);a.ball.v.set(0,0,0);for(let tick=0;tick<1200&&!c.touches;tick++){a.bot(c);a.stepCar(c,a.DT);a.stepBall(a.DT);}assert.ok(c.touches>0,'difficulty '+level);assert.equal(c.ai.heatState,'');}
});
test('Soccar keeps distinct attacking/support assignments and does not invoke Heatseeker defense',()=>{
 for(const size of [2,3]){const{a}=setup(size);a.ball.p.set(0,1,5);a.ball.v.set(0,0,2);for(const c of a.cars){a.resetCar(c,(c.id>>1)*6,c.team?10+(c.id>>1)*10:-10-(c.id>>1)*10);a.planBot(c);assert.equal(c.ai.heatState,'');}const team=a.cars.filter(c=>c.team===1);assert.ok(team.some(c=>['COMMIT','KICKOFF','APPROACH','ROTATE'].includes(c.ai.mode)));assert.ok(team.some(c=>['SUPPORT','DEFEND'].includes(c.ai.mode)));}
});
test('switching playlists and respawning clears transient Heatseeker driving/role memory',()=>{
 const{a}=setup(),c=a.cars[1];a.cfg.mode=1;c.ai.reverseDrive=true;c.ai.heatState='INTERCEPT';c.ai.heatRole='INTERCEPTOR';c.ai.heatReachable=true;c.ai.heatNoProgress=2;a.cfg.mode=0;a.resetCar(c,0,20);assert.equal(c.ai.reverseDrive,false);assert.equal(c.ai.heatState,'');assert.equal(c.ai.heatRole,'');assert.equal(c.ai.heatReachable,false);assert.equal(c.ai.heatNoProgress,0);a.planBot(c);assert.notEqual(c.ai.mode,'SAVE');
});
