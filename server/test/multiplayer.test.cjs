const test=require('node:test'),assert=require('node:assert/strict');
const {once}=require('node:events'),{WebSocket}=require('ws');
const {createService,controls,profile,WIRE}=require('../main.cjs');
const createPhysics=require('../physics.cjs');
function connect(port,origin='https://jikjikla.github.io'){
 const ws=new WebSocket(`ws://127.0.0.1:${port}/play`,{origin}),messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));
 return{ws,messages,send:value=>ws.send(JSON.stringify(value)),async next(type,filter=()=>true){const until=Date.now()+8000;while(Date.now()<until){const i=messages.findIndex(m=>m.type===type&&filter(m));if(i>=0)return messages.splice(i,1)[0];await new Promise(r=>setTimeout(r,10))}throw Error('Timed out waiting for '+type)}};
}

for(const mode of [0,1])for(const size of [1,2,3])test(`Rivals lifecycle: ${mode?'Heatseeker':'Soccar'} ${size}v${size}, goal, end and rematch`,()=>{
 const p=createPhysics({mode,size,len:120,series:3,gravity:.5,speed:1.5,unlimited:true});p.seats({0:{session:'driver',name:'A',body:0,color:0}});assert.equal(p.start(),true);assert.equal(p.start(),false);
 const world=p.inspect();const advance=()=>{for(let i=0;i<500&&p.phase()!=='PLAY';i++)p.step();assert.equal(p.phase(),'PLAY')};advance();
 const initialRound=p.state().round;
 // Server-only placement creates a deterministic scoring fixture; it is not a client command.
 const scoreGoal=()=>{for(const c of world.cars)c.enabled=false;world.ball.lastPlayer=0;world.ball.p.set(0,1,53);world.ball.v.set(0,0,5);p.step();assert.equal(p.phase(),'GOAL');assert.equal(p.state().goal.scorer,0);assert.ok(p.state().heat.speed>=18);for(let i=0;i<1500&&p.phase()==='GOAL';i++)p.step()};
 scoreGoal();assert.equal(p.phase(),'COUNT');advance();assert.ok(p.state().round>initialRound);
 if(mode){for(let goal=1;goal<7;goal++){scoreGoal();if(goal<6)advance()}}else{world.ball.p.set(0,1,0);world.ball.v.set(0,0,0);for(let i=0;i<15000&&p.phase()!=='END';i++)p.step()}
 assert.equal(p.phase(),'END');const ended=p.state();assert.equal(ended.series.wins[0],1);assert.equal(ended.cars.length,size*2);for(const c of ended.cars)assert.ok([c.x,c.y,c.z,...c.v,...c.q].every(Number.isFinite));
 assert.equal(p.start(),true);const next=p.state();assert.equal(next.phase,'COUNT');assert.deepEqual(Array.from(next.score),[0,0]);assert.equal(next.series.wins[0],1);assert.equal(next.cars[0].goals,0);
});

test('preset chat reaches teammates only, rejects spoofed text and enforces cooldown',async t=>{
 const app=createService();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const peers=Array.from({length:3},()=>connect(app.server.address().port));const [a,b,c]=peers;
 await Promise.all(peers.map(p=>p.next('hello')));a.send({type:'create',wire:WIRE,settings:{size:2,series:3},profile:{name:'ALPHA'}});const room=await a.next('joined');
 b.send({type:'join',wire:WIRE,code:room.code,profile:{name:'BRAVO'}});await b.next('joined');c.send({type:'join',wire:WIRE,code:room.code,profile:{name:'CHARLIE'}});assert.equal((await c.next('joined')).slot,2);
 peers.forEach(p=>p.send({type:'ready'}));await a.next('lobby',m=>Object.keys(m.seats).length===3&&Object.values(m.seats).every(x=>x.ready));a.send({type:'start'});await a.next('state',m=>m.state.phase==='COUNT');
 a.send({type:'chat',phrase:0,name:'SPOOFED',text:'arbitrary text',slot:1});const chat=await c.next('chat');assert.equal(chat.name,'ALPHA');assert.equal(chat.text,'I GOT IT!');assert.equal(chat.slot,0);assert.equal(b.messages.some(m=>m.type==='chat'),false);
 a.send({type:'chat',phrase:3});assert.match((await a.next('error')).message,/Wait a moment/);a.send({type:'chat',phrase:99});assert.match((await a.next('error')).message,/preset/);
 a.send({type:'start'});assert.match((await a.next('error')).message,/already in progress/);
});
test('shared solver runs boost, jump, goals and clock without a browser',()=>{
 const p=createPhysics({size:1,len:120});p.seats({0:{session:'driver',body:0,color:0},1:{session:'other',body:0,color:1}});p.start();for(let i=0;i<480;i++)p.step();
 let s=p.state();assert.equal(s.phase,'PLAY');const before=s.cars[0];
 p.input('driver',{seq:1,round:s.round,jump:0,held:false,paused:false,controls:{thr:1,boost:1}});
 for(let i=0;i<60;i++)p.step();s=p.state();assert.ok(s.cars[0].boostUsed>before.boostUsed+10);assert.ok(Math.hypot(...s.cars[0].v)>6);
 p.input('driver',{seq:2,round:s.round,jump:1,held:true,controls:{thr:1,boost:0}});for(let i=0;i<24;i++)p.step();assert.ok(p.state().cars[0].y>before.y+.5);
 // Place a ball just beyond a valid goal plane; score must be owned by solver.
 const {ball}=p.inspect();ball.p.set(0,1,53);ball.v.set(0,0,5);p.step();assert.equal(p.state().phase,'GOAL');assert.equal(p.state().score.reduce((a,b)=>a+b),1);
 const goalClock=p.state().clock;assert.ok(Number.isFinite(goalClock));for(let i=0;i<420;i++)p.step();assert.equal(p.phase(),'GOAL');assert.equal(p.state().clock,goalClock);for(let i=0;i<1200&&p.phase()==='GOAL';i++)p.step();assert.equal(p.phase(),'COUNT');assert.ok(p.state().round>s.round);
});
test('RGB profiles validate custom paint and preserve black without breaking older clients',()=>{
 assert.equal(profile({paint:0}).paint,0);assert.equal(profile({paint:0xff43b5}).paint,0xff43b5);
 for(const paint of [-1,0x1000000,Infinity,1.5,'#abcdef',null,undefined])assert.equal(profile({paint}).paint,null);
 assert.equal(profile().paint,null);assert.equal(profile(null).paint,null);assert.equal(profile([]).paint,null);
});
test('malformed controls cannot inject forces or nonfinite values',()=>{
 for(const controlsValue of [{boost:Infinity},{thr:2},{steer:'1'},null])assert.throws(()=>controls(controlsValue));
 assert.deepEqual(controls({thr:1,position:{x:900}}),{thr:1,steer:0,pitch:0,yaw:0,roll:0,boost:0,ps:0});
});
test('two sockets join, ready, start, receive authoritative motion and survive leader departure',async t=>{
 const app=createService({inviteRandom:()=>0});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());
 const port=app.server.address().port,a=connect(port),b=connect(port);await Promise.all([a.next('hello'),b.next('hello')]);
 a.send({type:'create',wire:WIRE,settings:{size:1},profile:{name:'A',paint:0}});const roomA=await a.next('joined');assert.equal(roomA.code,'000');
 b.send({type:'join',wire:WIRE,code:roomA.code,profile:{name:'B',paint:0xff43b5}});const roomB=await b.next('joined');assert.equal(roomB.slot,1);assert.notEqual(roomA.session,roomB.session);
 b.send({type:'start'});assert.match((await b.next('error')).message,/leader/);
 a.send({type:'ready'});b.send({type:'ready'});await a.next('lobby',m=>Object.values(m.seats).length===2&&Object.values(m.seats).every(s=>s.ready));
 a.send({type:'start'});const play=await a.next('state',m=>m.state.phase==='PLAY');assert.equal(play.state.cars[0].color,0x2a6bff);assert.equal(play.state.cars[1].color,0xff7a20);
 let seq=0;const sender=setInterval(()=>a.send({type:'input',seq:++seq,round:play.state.round,jump:0,held:false,controls:{thr:1,boost:1},position:{x:999}}),16);t.after(()=>clearInterval(sender));
 const moved=await b.next('state',m=>m.state.cars[0].boost<25);assert.ok(Math.hypot(...moved.state.cars[0].v)>2);assert.ok(Math.abs(moved.state.cars[0].x)<100);clearInterval(sender);
 const released=await b.next('state',m=>m.tick>moved.tick+40&&m.state.cars[0].input.boost===0);assert.ok(released.tick>moved.tick);
 a.ws.close();const remaining=await b.next('lobby',m=>Object.keys(m.seats).length===1);assert.equal(remaining.owner,roomB.session);
 const state=await b.next('state',m=>m.tick>moved.tick);assert.equal(state.state.cars.length,2);
 b.send({type:'leave'});await new Promise(r=>setTimeout(r,30));assert.equal(app.rooms.size,0);
});
test('bad origins rejected and quick match starts only when both clients ready',async t=>{
 const app=createService();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const port=app.server.address().port;
 const bad=connect(port,'https://evil.invalid');const rejected=once(bad.ws,'error');await rejected;
 const a=connect(port),b=connect(port);await Promise.all([a.next('hello'),b.next('hello')]);
 a.send({type:'quick',wire:WIRE,settings:{size:1}});b.send({type:'quick',wire:WIRE,settings:{size:1}});
 const [ar,br]=await Promise.all([a.next('joined'),b.next('joined')]);assert.equal(ar.code,br.code);
 a.send({type:'ready'});assert.equal((await a.next('state')).state.phase,'WAIT');b.send({type:'ready'});assert.equal((await a.next('state',m=>m.state.phase==='COUNT')).state.phase,'COUNT');
});
test('party matchmaking keeps teammates together and cancellation clears every member',async t=>{
 const app=createService({inviteRandom:()=>0});app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const port=app.server.address().port;
 const peers=Array.from({length:4},()=>connect(port));await Promise.all(peers.map(p=>p.next('hello')));const [a,b,c,d]=peers;
 a.send({type:'partyCreate',profile:{name:'A'}});const party=await a.next('party');assert.equal(party.code,'000');b.send({type:'partyJoin',code:party.code,profile:{name:'B'}});await b.next('party');
 a.send({type:'partyReady',ready:true});b.send({type:'partyReady',ready:true});await a.next('party',m=>Object.keys(m.data.members).length===2&&Object.values(m.data.members).every(x=>x.ready));
 a.send({type:'queue',wire:WIRE,settings:{size:2}});await b.next('queue',m=>m.searching);b.send({type:'cancelQueue'});await a.next('queue',m=>!m.searching);
 a.send({type:'queue',wire:WIRE,settings:{size:2}});c.send({type:'queue',wire:WIRE,settings:{size:2}});d.send({type:'queue',wire:WIRE,settings:{size:2}});
 const joined=await Promise.all(peers.map(p=>p.next('joined')));assert.equal(new Set(joined.map(m=>m.code)).size,1);assert.equal(joined[0].code,'001');assert.equal(joined[0].slot%2,joined[1].slot%2);assert.notEqual(joined[0].slot%2,joined[2].slot%2);
 for(const p of peers)p.send({type:'ready'});await a.next('state',m=>m.state.phase==='COUNT');
});

test('secret powers validate the exact code, use the sender seat and synchronize both clients',async t=>{
 const app=createService();app.server.listen(0,'127.0.0.1');await once(app.server,'listening');t.after(()=>app.close());const port=app.server.address().port,a=connect(port),b=connect(port);await Promise.all([a.next('hello'),b.next('hello')]);
 a.send({type:'create',wire:WIRE,settings:{size:1},profile:{name:'ALPHA'}});const room=await a.next('joined');b.send({type:'join',wire:WIRE,code:room.code,profile:{name:'BRAVO'}});await b.next('joined');a.send({type:'ready'});b.send({type:'ready'});await a.next('lobby',m=>Object.values(m.seats).every(s=>s.ready));a.send({type:'start'});await b.next('state',m=>m.state.phase==='PLAY');
 a.send({type:'ability',code:'Spellingbeewinner',ability:'freeze'});assert.match((await a.next('error')).message,/passcode/);
 a.send({type:'ability',code:'spellingbeewinner',ability:'__proto__'});assert.match((await a.next('error')).message,/unavailable/);
 b.send({type:'ability',code:'spellingbeewinner',ability:'freeze',slot:0,name:'SPOOF'});const [eventA,eventB]=await Promise.all([a.next('ability'),b.next('ability')]);assert.equal(eventA.name,'BRAVO');assert.equal(eventB.slot,1);
 const frozen=await a.next('state',m=>m.state.arcade.freeze>2.5);assert.equal(Math.hypot(...frozen.state.ball.v),0);
 a.send({type:'ability',code:'spellingbeewinner',ability:'boost',slot:1});await b.next('ability',m=>m.ability==='boost');const buff=await b.next('state',m=>m.state.arcade.boost[0]>14);assert.equal(buff.state.arcade.boost[1],0);
 a.send({type:'ability',code:'spellingbeewinner',ability:'chaos'});assert.match((await a.next('error')).message,/One power/);
});
