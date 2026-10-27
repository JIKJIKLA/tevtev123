const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('invite fields use the phone numeric keyboard, preserve leading zeros and sanitize pasted codes',()=>{
 const g=load({full:true}),d=g.document;for(const id of ['room-code','party-code-input']){const input=d.getElementById(id);assert.equal(input.getAttribute('maxlength'),'3');assert.equal(input.getAttribute('inputmode'),'numeric');assert.equal(input.getAttribute('pattern'),'[0-9]{3}');input.value='a0b42!9';input.dispatchEvent(new g.Event('input'));assert.equal(input.value,'042');input.value='007';input.dispatchEvent(new g.Event('input'));assert.equal(input.value,'007');}
 d.getElementById('room-code').value='07';d.getElementById('join-match').onclick();assert.match(d.getElementById('mp-status').textContent,/three-digit/);assert.equal(g.api.MP.active,false);
});
