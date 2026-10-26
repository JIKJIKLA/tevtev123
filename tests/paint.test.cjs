const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('custom RGB validates and keeps black distinct from a missing color',()=>{
 const a=load().api;for(const value of [0,0xffffff,0x39aeba]){assert.equal(a.validPaint(value),true);assert.equal(a.driverPaint({paint:value,color:1}),value);}for(const value of [-1,0x1000000,NaN,1.2,'#ff0000',null])assert.equal(a.validPaint(value),false);assert.equal(a.driverPaint({paint:null,color:1}),0xff7a20);assert.equal(a.paintHex(0),'#000000');
});
test('arbitrary paint applies, persists and is restored by the garage',()=>{
 const g=load({full:true}),a=g.api;assert.equal(a.setCustomPaint('#2356ab'),true);assert.equal(a.cfg.paint,0x2356ab);assert.equal(a.cars[0].color,0x2356ab);assert.match(g.document.getElementById('paint-name').textContent,/#2356AB/);const restored=load({full:true,storage:Object.fromEntries(g.storage)}).api;assert.equal(restored.cfg.paint,0x2356ab);assert.equal(restored.cars[0].color,0x2356ab);a.garagePreset(0,true);a.setCustomPaint('#000000');a.garagePreset(0,false);assert.equal(a.cfg.paint,0x2356ab);
});
test('scoreboard follows effective captain car paint with readable light and dark colors',()=>{
 const g=load({full:true}),a=g.api;a.cars[0].color=0xffffff;a.cars[1].color=0;a.updateScorePaint();assert.equal(g.document.getElementById('s0').style.getPropertyValue('--team-color'),'#ffffff');assert.equal(g.document.getElementById('s1').style.getPropertyValue('--team-color'),'#000000');assert.equal(g.document.getElementById('s0').style.color,'#06111f');assert.equal(g.document.getElementById('s1').style.color,'#ffffff');
});
test('paint editor cannot change an active online match',()=>{
 const a=load({full:true}).api;a.MP.active=true;const before=a.cfg.paint;assert.equal(a.setCustomPaint('#123456'),false);assert.equal(a.cfg.paint,before);
});

test('black paint survives saved presets and reload without falling back to the palette',()=>{
 const g=load({full:true}),a=g.api;assert.equal(a.setCustomPaint('#000000'),true);assert.equal(a.cars[0].color,0);assert.equal(a.garagePreset(1,true),true);a.setCustomPaint('#ffffff');assert.equal(a.garagePreset(1,false),true);assert.equal(a.cfg.paint,0);assert.equal(a.cars[0].color,0);assert.equal(g.document.getElementById('s0').style.getPropertyValue('--team-color'),'#000000');const restored=load({full:true,storage:Object.fromEntries(g.storage)});assert.equal(restored.api.cfg.paint,0);assert.equal(restored.api.cars[0].color,0);assert.equal(restored.document.getElementById('paint-picker').value,'#000000');
});
