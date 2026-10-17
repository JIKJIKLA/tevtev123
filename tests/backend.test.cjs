const {test}=require('node:test'),assert=require('node:assert/strict');
test('versioned queues reject old tickets; room ownership cannot be stolen',async()=>{
 const {validateDocument}=await import('../supabase/functions/tevin-store/validate.mjs');
 const host='11111111-1111-4111-8111-111111111111',guest='22222222-2222-4222-8222-222222222222';
 const room={meta:{host,protocol:4,settings:{size:1},seats:{0:{session:host}},locked:false}};
 assert.doesNotThrow(()=>validateDocument('room/ABC234',null,room,host));
 const joined=structuredClone(room);joined.meta.seats[1]={session:guest};assert.doesNotThrow(()=>validateDocument('room/ABC234',room,joined,guest));
 const stolen=structuredClone(joined);stolen.meta.host=guest;assert.throws(()=>validateDocument('room/ABC234',joined,stolen,guest));
 const ticket={owner:host,protocol:4,members:[{session:host}],created:Date.now(),seen:Date.now()};
 assert.doesNotThrow(()=>validateDocument('queue/soccar-v4-1',null,{tickets:{test:ticket}},host));
 assert.throws(()=>validateDocument('queue/soccar-v4-1',null,{tickets:{test:{...ticket,protocol:3}}},host));
});
