const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('first attacker takes a playable diagonal touch instead of shadowing',()=>{
 const {api:a}=load();a.cfg.size=1;a.cfg.mode=0;a.configureCars();a.setState({st:'PLAY',sandbox:false});const c=a.cars[1];a.resetCar(c,4,12);c.q.setFromAxisAngle(new a.THREE.Vector3(0,1,0),Math.PI/2);a.ball.p.set(0,1,0);a.ball.v.set(0,0,0);c.ai.intercept.copy(a.ball.p);c.ai.mode='DEFEND';a.possessionPlan(c,false,false);assert.equal(c.ai.mode,'COMMIT');
 const before=c.touches;for(let i=0;i<1200&&c.touches===before;i++){a.bot(c);a.stepCar(c,a.DT);a.stepBall(a.DT)}assert.ok(c.touches>before,'attacker must actually contact the ball');
});
test('arena targets respect rounded corners and solid back walls',()=>{
 const {api:a}=load(),c=a.cars[1];for(const p of [[40,0,49],[-40,0,-49],[20,0,55],[0,0,55]]){c.p.set(0,1,0);c.ai.target.fromArray(p);a.arenaBotTarget(c);a.surf(c.ai.target);assert.ok(a.getState().penetration>=.79,JSON.stringify(c.ai.target.toArray()));}
});
test('supporters and Heatseeker retain their defensive assignments',()=>{
 const {api:a}=load();a.cfg.size=2;a.configureCars();a.ball.p.set(0,1,0);a.cars[1].p.set(0,1,4);const c=a.cars[3];c.p.set(0,1,14);c.ai.intercept.copy(a.ball.p);c.ai.mode='SUPPORT';a.possessionPlan(c,false,false);assert.equal(c.ai.mode,'SUPPORT');a.cfg.mode=1;a.cars[1].ai.mode='SAVE';a.possessionPlan(a.cars[1],false,false);assert.equal(a.cars[1].ai.mode,'SAVE');
});
test('matte paint has no clearcoat and replay slows to half speed near contact',()=>{
 const {api:a}=load(),mat=new a.THREE.MeshPhysicalMaterial({color:0x123456,clearcoat:1}),mesh=new a.THREE.Mesh(new a.THREE.BoxGeometry(),mat);a.preparePaint(mesh,0x123456);assert.ok(mat.roughness>=.8);assert.equal(mat.clearcoat,0);assert.ok(mat.envMapIntensity<.4);
 const r={frames:[{t:0},{t:4}],duration:4,elapsed:1.3};const t=a.replayPlaybackTime(r);r.elapsed=1.5;assert.ok(Math.abs(a.replayPlaybackTime(r)-t-.1)<1e-8);r.elapsed=3;assert.equal(a.replayPlaybackTime(r),4);
});
