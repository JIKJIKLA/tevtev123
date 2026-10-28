const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');

test('trail history is bounded, rejects nonfinite poses and cuts teleports instead of drawing across the field',()=>{
 const a=load().api,trail=a.MATCH_EFFECTS.trails[0],p=new a.THREE.Vector3();
 for(let i=0;i<90;i++){p.set(i*.15,.1,0);assert.equal(a.recordMatchTrail(trail,p,i/60),true);}
 assert.equal(trail.count,18);assert.equal(trail.p.length,54);
 assert.equal(a.recordMatchTrail(trail,new a.THREE.Vector3(NaN,0,0),2),false);
 p.set(40,.1,45);a.recordMatchTrail(trail,p,2);assert.equal(trail.count,1);
 assert.equal(a.recordMatchTrail(trail,p,2.1),false);
});

test('ribbon geometry stays finite, respects its draw budget and naturally expires',()=>{
 const a=load().api,trail=a.MATCH_EFFECTS.trails[12],p=new a.THREE.Vector3(),g=a.matchTrailGeometry(4);
 for(let i=0;i<18;i++){p.set(i*.2,2,Math.sin(i*.1));a.recordMatchTrail(trail,p,i/60);}
 const count=a.writeMatchTrail(trail,g,0,.3,0xff7a20,.12);assert.equal(count,4);
 for(const key of ['position','color'])assert.ok(Array.from(g.attributes[key].array).every(Number.isFinite));
 assert.equal(a.writeMatchTrail(trail,g,0,3,0xff7a20,.12),0);
 for(const age of [-1,0,.05,.2,.3,10]){const value=a.matchEffectEnvelope(age,.3);assert.ok(value>=0&&value<=1);}
 assert.equal(a.matchEffectEnvelope(NaN,.3),0);assert.equal(a.matchEffectEnvelope(.1,0),0);
});

test('new presentation functions are harmless before graphics initialize and do not mutate physics',()=>{
 const {api:a}=load(),p=a.cars[0].p.clone();a.clearMatchEffects();assert.equal(a.matchContactCue('jump',8,[0,.19,0],0),false);a.updateMatchEffects(.02);assert.equal(a.cars[0].p.distanceTo(p),0);assert.equal(a.MATCH_EFFECTS.trails.length,13);assert.equal(a.MATCH_EFFECTS.skidLife.length,96);
});

test('shot feedback requires a plausible whole-ball path through the opposite goal',()=>{
 const a=load().api,T=a.THREE;
 for(const team of [0,1]){const sign=team? -1:1,p=new T.Vector3(0,2,sign*31.2),v=new T.Vector3(0,4,sign*20);assert.equal(a.matchShotOnTarget(team,p,v),true);p.x=12;assert.equal(a.matchShotOnTarget(team,p,v),false);p.x=0;v.y=30;assert.equal(a.matchShotOnTarget(team,p,v),false);v.y=4;v.z*=-1;assert.equal(a.matchShotOnTarget(team,p,v),false);}
});

test('shot/save awards identify only the local player and never award gameplay score or XP',()=>{
 const g=load({full:true}),a=g.api,d=g.document;a.setState({st:'PLAY',score:[0,0]});const xp=a.CAREER.xp;
 assert.equal(a.matchAward('shot',1),false);assert.equal(a.matchAward('shot',0),true);assert.equal(d.getElementById('match-award').querySelector('strong').textContent,'SHOT ON GOAL');assert.equal(d.getElementById('match-award').querySelector('span').textContent,'+10');
 assert.equal(a.matchAward('save',0),true);assert.equal(d.getElementById('match-award').querySelector('strong').textContent,'SAVE');assert.equal(a.getState().score.join(), '0,0');assert.equal(a.CAREER.xp,xp);a.clearMatchEffects();assert.equal(d.getElementById('match-award').hidden,true);
});
