const {test}=require('node:test'),assert=require('node:assert/strict'),{once}=require('node:events');
const {WebSocket}=require('ws'),{createService,WIRE}=require('../main.cjs');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function peer(port){
 const ws=new WebSocket('ws://127.0.0.1:'+port+'/play',{origin:'https://jikjikla.github.io'}),messages=[];
 ws.on('message',raw=>messages.push(JSON.parse(raw)));
 return{ws,messages,send:m=>ws.send(JSON.stringify(m)),async next(type,p=()=>true){const deadline=Date.now()+8000;while(Date.now()<deadline){const i=messages.findIndex(m=>m.type===type&&p(m));if(i>=0)return messages.splice(i,1)[0];await wait(10);}throw Error('No '+type);}};
}
async function service(t,count,options={}){
 const app=createService(options);app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());
 const peers=Array.from({length:count},()=>peer(app.server.address().port));await Promise.all(peers.map(p=>p.next('hello')));return{app,peers};
}

test('freeing a room without closing its socket immediately matches players waiting at capacity',async t=>{
 const {app,peers:[host,a,b]}=await service(t,3,{maxRooms:1});host.send({type:'create',wire:WIRE,settings:{size:1}});await host.next('joined');
 a.send({type:'queue',wire:WIRE,settings:{size:1}});b.send({type:'queue',wire:WIRE,settings:{size:1}});await a.next('queue',m=>m.count===2);
 assert.equal(app.rooms.size,1);assert.equal(a.messages.some(m=>m.type==='joined'),false);host.send({type:'leave'});
 const [first,second]=await Promise.all([a.next('joined'),b.next('joined')]);assert.equal(first.code,second.code);assert.equal(first.quick,true);assert.equal(app.rooms.size,1);assert.equal(host.ws.readyState,WebSocket.OPEN);
});

for(const size of [1,2,3])for(const mode of [0,1]){
 test(`public ${size}v${size}/${mode}: partial vacancies stay human-only; an empty team forfeits`,async t=>{
  const {app,peers}=await service(t,size*2);for(const p of peers)p.send({type:'queue',wire:WIRE,settings:{size,mode}});
  const joined=await Promise.all(peers.map(p=>p.next('joined'))),room=app.rooms.get(joined[0].code),blue=peers.filter((_,i)=>joined[i].slot%2===0),orange=peers.find((_,i)=>joined[i].slot%2===1);
  for(const p of peers)p.send({type:'ready'});await orange.next('state',m=>m.state.phase==='COUNT');for(let i=0;i<500&&room.api.phase()!=='PLAY';i++)room.api.step();assert.equal(room.api.phase(),'PLAY');
  if(size>1){const first=blue.shift(),slot=joined[peers.indexOf(first)].slot;first.send({type:'leave'});await orange.next('lobby',m=>Object.keys(m.seats).length===size*2-1&&!m.seats[slot]);assert.equal(room.api.phase(),'PLAY');assert.equal(room.api.inspect().cars[slot].enabled,false,'public vacancy became a bot');}
  for(const p of blue)p.send({type:'leave'});const ended=await orange.next('state',m=>m.state.phase==='END');assert.match(ended.state.endReason,/FORFEIT/);assert.ok(ended.state.score[1]>ended.state.score[0]);assert.equal(room.members.size,size);
  for(const c of room.api.inspect().cars.filter(c=>c.team===0))assert.equal(c.enabled,false);assert.equal(ended.state.cars.length,size*2);
 });
 test(`public ${size}v${size}/${mode}: a departure before readiness cancels the reservation`,async t=>{
  const {app,peers}=await service(t,size*2);for(const p of peers)p.send({type:'queue',wire:WIRE,settings:{size,mode}});const joined=await Promise.all(peers.map(p=>p.next('joined')));
  peers[0].send({type:'leave'});const cancelled=await Promise.all(peers.slice(1).map(p=>p.next('matchCancelled')));
  assert.equal(app.rooms.size,0);for(const message of cancelled){assert.equal(message.code,joined[0].code);assert.match(message.reason,/before kickoff/);}for(const c of app.clients)assert.equal(c.room,null);assert.equal(peers[1].messages.some(m=>m.type==='state'&&m.state.phase==='END'),false,'unplayed match awarded a result');
 });
}

test('private matches retain AI replacements when their human leader leaves',async t=>{
 const {app,peers:[a,b]}=await service(t,2);a.send({type:'create',wire:WIRE,settings:{size:1}});const joined=await a.next('joined');b.send({type:'join',wire:WIRE,code:joined.code});await b.next('joined');a.send({type:'ready'});b.send({type:'ready'});await a.next('lobby',m=>Object.values(m.seats).every(s=>s.ready));a.send({type:'start'});await b.next('state',m=>m.state.phase==='COUNT');
 const room=app.rooms.get(joined.code);for(let i=0;i<500&&room.api.phase()!=='PLAY';i++)room.api.step();a.send({type:'leave'});await b.next('lobby',m=>Object.keys(m.seats).length===1);assert.equal(room.api.phase(),'PLAY');assert.equal(room.api.inspect().cars[0].enabled,true);assert.equal(room.quick,false);
});

test('room inactivity advances only for accepted current-round driving or a new jump edge',async t=>{
 const {app,peers:[a]}=await service(t,1);a.send({type:'create',wire:WIRE,settings:{size:1}});const joined=await a.next('joined'),room=app.rooms.get(joined.code);
 a.send({type:'ready',request:1});await a.next('ok',m=>m.request===1);a.send({type:'start',request:2});await a.next('ok',m=>m.request===2);const round=room.api.inspect().MP.round;
 let request=10;const input=async(seq,controls={},extra={},error=false)=>{const id=++request;a.send({type:'input',seq,round,jump:0,held:false,paused:false,controls,...extra,request:id});return a.next(error?'error':'ok',m=>m.request===id);};
 room.lastActive=1234;await input(1);assert.equal(room.lastActive,1234,'neutral heartbeat refreshed activity');
 const countAt=Date.now();await input(2,{thr:.5});assert.ok(room.lastActive>=countAt,'accepted countdown intent was not recorded');
 for(let i=0;i<500&&room.api.phase()!=='PLAY';i++)room.api.step();assert.equal(room.api.phase(),'PLAY');room.lastActive=1234;
 await input(2,{boost:1});assert.equal(room.lastActive,1234,'stale sequence refreshed activity');
 await input(3,{thr:2},{},true);assert.equal(room.lastActive,1234,'invalid controls refreshed activity');
 await input(3,{thr:1},{round:round-1});assert.equal(room.lastActive,1234,'wrong-round sample refreshed activity');
 await input(4,{thr:1},{paused:true});assert.equal(room.lastActive,1234,'paused controls refreshed activity');
 const jumpAt=Date.now();await input(5,{}, {jump:1});assert.ok(room.lastActive>=jumpAt,'new jump edge was not recorded');room.lastActive=1234;
 await input(6,{}, {jump:1,held:true});assert.equal(room.lastActive,1234,'held jump without a new edge refreshed activity');
 a.send({type:'ping',id:77});await a.next('pong',m=>m.id===77);assert.equal(room.lastActive,1234,'transport ping refreshed activity');
 const driveAt=Date.now();await input(7,{steer:-.4},{jump:1});assert.ok(room.lastActive>=driveAt,'accepted steering was not recorded');
 const world=room.api.inspect();world.cars.forEach(c=>c.enabled=false);world.ball.p.set(0,1,53);world.ball.v.set(0,0,5);room.api.step();assert.equal(room.api.phase(),'GOAL');room.lastActive=1234;
 const goalAt=Date.now();await input(8,{roll:1},{jump:1});assert.ok(room.lastActive>=goalAt,'active goal-stage intent was not recorded');
 room.api.forfeit(0,'FIXTURE END');room.lastActive=1234;await input(9,{thr:1},{jump:1});assert.equal(room.lastActive,1234,'post-match input refreshed activity');
});

test('waiting-room input cannot extend its separate loading timeout',async t=>{
 const {app,peers:[a]}=await service(t,1);a.send({type:'create',wire:WIRE,settings:{size:1}});const joined=await a.next('joined'),room=app.rooms.get(joined.code);room.lastActive=1234;
 a.send({type:'input',seq:1,round:0,jump:1,controls:{thr:1},request:1});await a.next('ok',m=>m.request===1);assert.equal(room.lastActive,1234,'unready input refreshed activity');
 a.send({type:'ready',request:2});await a.next('ok',m=>m.request===2);a.send({type:'input',seq:2,round:0,jump:1,controls:{thr:1},request:3});await a.next('ok',m=>m.request===3);assert.equal(room.api.phase(),'WAIT');assert.equal(room.lastActive,1234,'waiting input refreshed activity');
});
