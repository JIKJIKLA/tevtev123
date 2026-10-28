'use strict';
const http=require('node:http'),{randomUUID,randomInt}=require('node:crypto');
const {WebSocketServer}=require('ws'),createPhysics=require('./physics.cjs');
const WIRE=1,STEP=1/120,KEYS=['thr','steer','pitch','yaw','roll','boost','ps'];
function controls(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid controls');
 const result={};for(const key of KEYS){const v=value[key]??0;if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1)throw Error('Invalid control value');result[key]=v}return result;
}
function profile(value={}){if(!value||typeof value!=='object'||Array.isArray(value))value={};return{paint:Number.isInteger(value.paint)&&value.paint>=0&&value.paint<=0xffffff?value.paint:null,name:String(value.name||'DRIVER').replace(/[^\w .-]/g,'').slice(0,20)||'DRIVER',body:Math.min(2,Math.max(0,Number(value.body)|0)),color:Math.min(7,Math.max(0,Number(value.color)|0))}}
function reserveInviteCode(used,draw=()=>randomInt(1000)){
 const start=draw();if(!Number.isInteger(start)||start<0||start>=1000)throw Error('Invalid invite draw');
 for(let i=0;i<1000;i++){const code=String((start+i)%1000).padStart(3,'0');if(!used.has(code))return code;}
 throw Error('All invite codes are in use. Try again shortly.');
}
function validInvite(code){return typeof code==='string'&&/^\d{3}$/.test(code);}
function createService(options={}){
 const rooms=new Map(),clients=new Set(),parties=new Map(),queue=new Map(),origins=new Set(options.origins||['https://jikjikla.github.io','https://tevtev123.b-cdn.net']);
 const maxRooms=options.maxRooms||4,maxClients=options.maxClients||48,physics=options.physics||createPhysics;
 let last=performance.now(),acc=0,ticks=0,droppedTicks=0,closed=false;
 function send(c,value){if(c.ws.readyState===1){if(c.ws.bufferedAmount>131072){c.ws.close(1013,'Connection too slow');return}c.ws.send(JSON.stringify(value))}}
 function roster(r){const seats={};for(const c of r.members.values())seats[c.slot]={session:c.id,...c.profile,ready:c.ready};return seats}
 function lobby(r){r.api.seats(roster(r));const seats=roster(r);for(const c of r.members.values())send(c,{type:'lobby',code:r.code,owner:r.owner,seats,quick:r.quick})}
 function leave(c){const r=c.room;if(!r)return;c.room=null;r.members.delete(c.id);if(!r.members.size){rooms.delete(r.code);return}if(r.owner===c.id)r.owner=r.members.keys().next().value;lobby(r)}
 function newRoom(settings,quick=false){if(rooms.size>=maxRooms)throw Error('All match servers are busy. Try again shortly.');const code=reserveInviteCode(new Set([...rooms.keys(),...parties.keys()]),options.inviteRandom),api=physics(settings),state=api.inspect();const r={code,api,settings:{mode:state.cfg.mode,size:state.cfg.size,lvl:state.cfg.lvl,len:state.cfg.len,speed:state.cfg.speed,gravity:state.cfg.gravity,unlimited:state.cfg.unlimited,teamColors:state.cfg.teamColors,series:state.cfg.series},members:new Map(),owner:'',quick,created:Date.now(),lastActive:Date.now(),tick:0};rooms.set(code,r);return r}
 function join(c,r,preferred){
  if(r.api.phase()!=='WAIT')throw Error('This match has already started.');
  const used=new Set([...r.members.values()].map(x=>x.slot));let slot=preferred??0;while(used.has(slot))slot++;if(slot>=r.settings.size*2)throw Error('This match is full.');
  c.room=r;c.slot=slot;c.ready=false;c.seq=-1;c.ack=-1;c.jump=0;c.input=null;c.applied=null;c.buffered=false;c.frames=[];r.members.set(c.id,c);if(!r.owner)r.owner=c.id;r.lastActive=Date.now();
  send(c,{type:'joined',wire:WIRE,session:c.id,slot,code:r.code,owner:r.owner,settings:r.settings,seats:roster(r),quick:r.quick});lobby(r);
 }
 function start(c){const r=c.room;if(!r||r.owner!==c.id)throw Error('Only the lobby leader can start.');if([...r.members.values()].some(p=>!p.ready))throw Error('Waiting for every player to load.');if(r.quick&&r.members.size!==r.settings.size*2)throw Error('Waiting for opponents.');if(!r.api.start())throw Error('This match is already in progress.');r.lastActive=Date.now()}
 function partyState(p){if(!p)return;const now=Date.now(),members={};for(const c of p.members.values())members[c.id]={...c.profile,session:c.id,joined:c.joinedAt,seen:now,connected:true,ready:!!c.partyReady};for(const c of p.members.values())send(c,{type:'party',code:p.code,data:{leader:p.leader,members}})}
 function queueState(){for(const g of queue.values()){const count=[...queue.values()].filter(x=>x.size===g.size&&x.mode===g.mode).reduce((n,x)=>n+x.members.length,0);for(const c of g.members)send(c,{type:'queue',searching:true,since:g.since,count})}}
 function cancelQueue(c){const g=c.queue;if(!g)return;queue.delete(g.id);for(const p of g.members){p.queue=null;send(p,{type:'queue',searching:false,count:0})}queueState()}
 function leaveParty(c){cancelQueue(c);const p=c.party;if(!p)return;p.members.delete(c.id);c.party=null;c.partyReady=false;send(c,{type:'party',code:'',data:null});if(!p.members.size)parties.delete(p.code);else{if(p.leader===c.id)p.leader=p.members.keys().next().value;partyState(p)}}
 function matchQueue(){
  for(const first of [...queue.values()]){
   if(!queue.has(first.id)||rooms.size>=maxRooms)continue;
   const groups=[...queue.values()].filter(g=>g.size===first.size&&g.mode===first.mode),size=first.size;
   let states=new Map([['0,0',{a:0,b:0,picks:[]}]]);
   for(const g of groups){const next=new Map(states);for(const s of states.values())for(let team=0;team<2;team++){const a=s.a+(team===0?g.members.length:0),b=s.b+(team===1?g.members.length:0),key=a+','+b;if(a<=size&&b<=size&&!next.has(key))next.set(key,{a,b,picks:[...s.picks,{g,team}]})}states=next;if(states.has(size+','+size))break}
   const match=states.get(size+','+size);if(!match)continue;
   const r=newRoom({size,mode:first.mode,lvl:2,len:300,speed:1,gravity:1},true),teams=[[],[]];
   for(const {g,team} of match.picks){queue.delete(g.id);for(const c of g.members){c.queue=null;c.partyReady=false;teams[team].push(c)}}
   for(let i=0;i<size;i++)for(let team=0;team<2;team++)join(teams[team][i],r,2*i+team);
   for(const {g} of match.picks)for(const c of g.members)partyState(c.party);
  }
  queueState();
 }
 function message(c,m){
  if(!m||typeof m!=='object'||Array.isArray(m))throw Error('Invalid message');
  if(m.type==='ping'){send(c,{type:'pong',id:Number.isSafeInteger(m.id)?m.id:0});return}
  if(m.type==='profile'){c.profile=profile(m.profile);partyState(c.party);return}
  if(m.type==='partyCreate'||m.type==='partyJoin'){
   if(c.room||c.party||c.queue)throw Error('Leave your current party or match first.');c.profile=profile(m.profile);
   let p;if(m.type==='partyCreate'){const code=reserveInviteCode(new Set([...rooms.keys(),...parties.keys()]),options.inviteRandom);p={code,leader:c.id,members:new Map()};parties.set(code,p)}else{if(!validInvite(m.code))throw Error('Enter a three-digit party code.');p=parties.get(m.code);}
   if(!p||p.members.size>=3||[...p.members.values()].some(x=>x.queue||x.room))throw Error('Party unavailable, full, or already searching.');
   c.party=p;c.partyReady=false;p.members.set(c.id,c);partyState(p);return;
  }
  if(m.type==='partyLeave'){leaveParty(c);return}
  if(m.type==='partyReady'){if(!c.party||c.room||c.queue)throw Error('Return to your party lobby first.');c.partyReady=m.ready===true;partyState(c.party);return}
  if(m.type==='cancelQueue'){cancelQueue(c);return}
  if(m.type==='queue'){
   if(m.wire!==WIRE)throw Error('Reload the game.');if(c.room||c.queue)throw Error('Already in a match or searching.');if(c.party&&c.party.leader!==c.id)throw Error('Only the party leader can search.');
   c.profile=profile(m.profile);const members=c.party?[...c.party.members.values()]:[c],size=Math.min(3,Math.max(1,Number(m.settings?.size)|0)),mode=m.settings?.mode===1?1:0;
   if(members.length>size)throw Error('Choose a larger team size for your party.');if(c.party&&members.some(x=>!x.partyReady||x.room||x.queue))throw Error('Every party member must be ready.');
   const g={id:c.id,members,size,mode,since:Date.now()};queue.set(g.id,g);for(const p of members)p.queue=g;matchQueue();return;
  }
  if(m.type==='leave'){leave(c);return}
  if(m.type==='create'||m.type==='join'||m.type==='quick'){
   if(m.wire!==WIRE)throw Error('Reload the latest game version.');
   if(c.room||c.queue)throw Error('Leave the current match or queue first.');
   if(Date.now()-c.lastJoin<1500)throw Error('Please wait before joining another room.');c.lastJoin=Date.now();c.profile=profile(m.profile);
   if(m.type==='create')join(c,newRoom(m.settings||{}));
   else if(m.type==='join'){if(!validInvite(m.code))throw Error('Enter a three-digit match code.');const r=rooms.get(m.code);if(!r||r.quick)throw Error(parties.has(m.code)?'That is a party code. Open Quick Match Party to join.':'Private match not found.');join(c,r)}
   else{const size=Math.min(3,Math.max(1,Number(m.settings?.size)|0)),mode=m.settings?.mode===1?1:0;
    const r=[...rooms.values()].find(r=>r.quick&&r.settings.size===size&&r.settings.mode===mode&&r.api.phase()==='WAIT'&&r.members.size<size*2)||newRoom({size,mode,lvl:2,len:300,speed:1,gravity:1},true);join(c,r)}
   return;
  }
  const r=c.room;if(!r)throw Error('Join a match first.');
  if(m.type==='ability'){
   if(m.code!=='spellingbeewinner')throw Error('Incorrect secret passcode.');
   if(!c.ready||r.api.phase()!=='PLAY')throw Error('Powers are available during live play.');
   const now=performance.now();if(now-(c.abilityAt??-1000)<350)throw Error('One power at a time.');
   if(!r.api.ability(c.slot,m.ability))throw Error('Power unavailable.');c.abilityAt=now;
   for(const player of r.members.values())send(player,{type:'ability',slot:c.slot,name:c.profile.name,ability:m.ability});return;
  }
  if(m.type==='chat'){
   if(!c.ready||!['PLAY','COUNT'].includes(r.api.phase()))return;
   if(!Number.isInteger(m.phrase)||m.phrase<0||m.phrase>3)throw Error('Choose a preset team message.');
   const now=performance.now();if(now-(c.chatAt??-2000)<1200)throw Error('Wait a moment before sending another message.');c.chatAt=now;
   const text=['I GOT IT!','DEFENDING','NEED BOOST','NICE SHOT!'][m.phrase];r.api.teamIntent(c.slot,m.phrase);
   for(const mate of r.members.values())if(mate.slot%2===c.slot%2)send(mate,{type:'chat',name:c.profile.name,text,slot:c.slot});return;
  }
  if(m.type==='ready'){c.ready=true;lobby(r);if(r.quick&&r.members.size===r.settings.size*2&&[...r.members.values()].every(p=>p.ready))start(r.members.get(r.owner));return}
  if(m.type==='start'){start(c);return}
  if(m.type==='frames'){
   if(!Array.isArray(m.frames)||!m.frames.length||m.frames.length>12)throw Error('Invalid input frames');
   for(const frame of m.frames){const previous=c.seq;message(c,{...frame,type:'input'});if(c.seq>previous)c.frames.push(c.input)}
   c.buffered=true;if(c.frames.length>24)c.frames.splice(0,c.frames.length-24);return;
  }
  if(m.type==='input'){
   if(!c.ready||!Number.isSafeInteger(m.seq)||m.seq<0||m.seq<=c.seq)return;
   if(!Number.isSafeInteger(m.round)||!Number.isSafeInteger(m.jump)||m.jump<0||m.jump<c.jump)throw Error('Invalid input sequence');
   const input={seq:m.seq,round:m.round,jump:m.jump,held:m.held===true,paused:m.paused===true,controls:controls(m.controls)};
   c.seq=m.seq;c.jump=m.jump;c.input=input;c.lastInput=performance.now();if(input.paused){c.frames=[];c.applied=input}return;
  }
  throw Error('Unknown message type');
 }
 const server=http.createServer((req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');if(req.url==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,service:'nivet-match-server',wire:WIRE,region:'Phoenix',build:'10.0.0',physicsHz:120,snapshotHz:30,rooms:rooms.size,capacity:maxRooms,droppedTicks}));}else{res.writeHead(404);res.end('Not found')}});
 const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
 server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/play'||!origins.has(req.headers.origin)||clients.size>=maxClients){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 wss.on('connection',ws=>{
  const c={ws,id:randomUUID(),room:null,party:null,queue:null,profile:profile(),seq:-1,ack:-1,jump:0,ready:false,lastJoin:0,lastInput:0,joinedAt:Date.now(),messages:0,window:performance.now(),alive:true,frames:[]};clients.add(c);
  ws.on('error',()=>{});ws.on('pong',()=>c.alive=true);ws.on('close',()=>{leave(c);leaveParty(c);clients.delete(c);matchQueue()});
  ws.on('message',(data,binary)=>{const now=performance.now();if(now-c.window>1000){c.window=now;c.messages=0}if(binary||++c.messages>150){ws.close(1008,'Message limit');return}let m;try{m=JSON.parse(data.toString());message(c,m);if(Number.isSafeInteger(m.request))send(c,{type:'ok',request:m.request})}catch(e){send(c,{type:'error',request:m?.request,message:e.message})}});
  send(c,{type:'hello',wire:WIRE,session:c.id,region:'Phoenix'});
 });
 function tick(){
  const now=performance.now();acc+=Math.min(.1,(now-last)/1000);last=now;let steps=0;
  while(acc>=STEP&&steps++<12){acc-=STEP;ticks++;
   for(const r of rooms.values()){
    try{
     for(const c of r.members.values()){
      if(c.buffered){if(c.frames.length)c.applied=c.frames.shift()}else c.applied=c.input;
      if(c.applied){r.api.input(c.id,now-c.lastInput>300?{...c.applied,paused:true}:c.applied);c.ack=c.applied.seq}
     }
     r.api.step();r.tick++;
     if(ticks%4===0){const state=r.api.state();for(const c of r.members.values())if(c.ready)send(c,{type:'state',tick:r.tick,ack:c.ack,driver:r.api.driver(c.slot),state})}
    }catch(error){console.error('Match failure',r.code,error);for(const c of [...r.members.values()]){send(c,{type:'error',message:'Match stopped. Please make a new room.'});leave(c)}}
   }
  }
  if(acc>=STEP){droppedTicks+=Math.floor(acc/STEP);acc%=STEP}
 }
 const loop=setInterval(tick,4),heartbeat=setInterval(()=>{
  for(const c of clients){if(!c.alive||!c.room&&!c.party&&!c.queue&&Date.now()-c.joinedAt>30000){c.ws.terminate();continue}c.alive=false;c.ws.ping();partyState(c.party)}
  for(const r of rooms.values())if(Date.now()-r.lastActive>30*60*1000||r.api.phase()==='WAIT'&&Date.now()-r.created>5*60*1000){for(const c of [...r.members.values()]){send(c,{type:'error',message:'Lobby expired. Please make a new room.'});leave(c)}}
 },10000);loop.unref();heartbeat.unref();
 return{server,rooms,clients,async close(){if(closed)return;closed=true;clearInterval(loop);clearInterval(heartbeat);for(const c of clients)c.ws.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve))}};
}
if(require.main===module){const service=createService({maxRooms:Number(process.env.MAX_ROOMS)||4});service.server.listen(Number(process.env.PORT)||8787,'127.0.0.1',()=>console.log('Tevin match server ready on loopback'));for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>service.close().then(()=>process.exit(0)))}
module.exports={createService,controls,profile,WIRE,reserveInviteCode,validInvite};
