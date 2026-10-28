const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');

test('garage paint stays personal while every normal kickoff restores blue and orange',()=>{
 const g=load({full:true}),a=g.api;a.setCustomPaint('#ad47cc');assert.equal(a.cars[0].color,0xad47cc);
 for(const size of [1,2,3])for(const mode of [0,1]){
  a.cfg.size=size;a.cfg.mode=mode;a.cfg.teamColors=true;a.configureCars();a.kickoff();
  for(const c of a.cars)assert.equal(c.color,c.team?0xff7a20:0x2a6bff);
  assert.equal(g.document.getElementById('s0').style.getPropertyValue('--team-color'),'#2a6bff');
  assert.equal(g.document.getElementById('s1').style.getPropertyValue('--team-color'),'#ff7a20');
  assert.equal(a.cfg.paint,0xad47cc,'kickoff erased garage paint');
 }
 a.cfg.teamColors=false;a.configureCars();a.kickoff();assert.equal(a.cars[0].color,0xad47cc);
});
