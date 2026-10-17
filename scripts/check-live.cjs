// Explicitly invoked integration check; creates a temporary private room, then closes it.
const assert=require('node:assert/strict');
const load=require('../tests/harness.cjs');
(async()=>{
 const g=load({network:true}),engine=g.window.TevinEngine,config=g.window.TEVIN_SUPABASE;
 const clients=[];let room;
 const code=Array.from(require('node:crypto').randomBytes(6),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
 try{
  clients.push(await engine.createMultiplayerStore(config));clients.push(await engine.createMultiplayerStore(config));
  const [host,guest]=clients;room=host.ref('rooms/'+code);
  const created=await room.transaction(v=>v===null?{meta:{protocol:4,host:host.session,settings:{size:1,mode:0},seats:{0:{session:host.session}},locked:false,createdAt:Date.now()}}:undefined);assert.ok(created.committed);
  const remote=guest.ref('rooms/'+code);const joined=await remote.child('meta').transaction(m=>{m.seats[1]={session:guest.session};return m});assert.ok(joined.committed);
  let received;const onPacket=s=>{if(s.val()?.probe==='tevin-v9')received=s.val()};
  remote.child('state').on('value',onPacket);room.child('meta').on('value',()=>{});
  await Promise.all([host.readyRoom(code),guest.readyRoom(code)]);
  // Poll only while the guest's host-owned channel joins; no gameplay data is persisted.
  for(let i=0;i<20&&!received;i++){await room.child('state').set({probe:'tevin-v9',seq:i});await new Promise(resolve=>setTimeout(resolve,200));}
  assert.equal(received?.probe,'tevin-v9');
  await assert.rejects(()=>remote.child('meta').transaction(m=>{m.host=guest.session;return m}));
  const queue=await host.ref('rooms/_tevin_social_v7/queues/soccar-v4-1').once('value');assert.ok(queue);
  console.log('PASS: anonymous sign-in, room creation/join, authenticated Realtime delivery, host ownership, v4 queue read.');
 }finally{
  if(room)await room.remove().catch(()=>{});for(const client of clients)await client.close();
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
