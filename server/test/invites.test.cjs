const test=require('node:test'),assert=require('node:assert/strict');
const {reserveInviteCode,validInvite}=require('../main.cjs');
test('three-digit invites preserve leading zeros and resolve collisions without looping forever',()=>{
 assert.equal(reserveInviteCode(new Set(),()=>0),'000');assert.equal(reserveInviteCode(new Set(['999','000']),()=>999),'001');
 const used=new Set();for(let i=0;i<1000;i++){const code=reserveInviteCode(used,()=>42);assert.match(code,/^\d{3}$/);assert.equal(used.has(code),false);used.add(code);}assert.throws(()=>reserveInviteCode(used,()=>0),/in use/);
 for(const code of ['000','042','123','999'])assert.equal(validInvite(code),true);for(const code of ['12','1234','ABC123',123,null,' 042','1e2'])assert.equal(validInvite(code),false);
});
