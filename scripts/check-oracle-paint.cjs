const {WebSocket}=require('../server/node_modules/ws');
const assert=require('node:assert/strict');
const peers=[];
function peer(origin){
 const ws=new WebSocket('wss://tevin-161-153-26-154.sslip.io/play',{origin}),messages=[];peers.push(ws);ws.on('message',raw=>messages.push(JSON.parse(raw)));
 return{send:m=>ws.send(JSON.stringify(m)),async next(type,p=()=>true){const end=Date.now()+12000;while(Date.now()<end){const i=messages.findIndex(m=>m.type===type&&p(m));if(i>=0)return messages.splice(i,1)[0];await new Promise(r=>setTimeout(r,10));}throw Error('Timeout '+type);}};
}
(async()=>{try{
 const a=peer('https://jikjikla.github.io'),b=peer('https://tevtev123.b-cdn.net');await Promise.all([a.next('hello'),b.next('hello')]);
 a.send({type:'create',wire:1,settings:{size:1,teamColors:false},profile:{name:'PAINT CHECK A',paint:0}});const room=await a.next('joined');
 b.send({type:'join',wire:1,code:room.code,profile:{name:'PAINT CHECK B',paint:0xff43b5}});await b.next('joined');
 a.send({type:'ready'});b.send({type:'ready'});await a.next('lobby',m=>Object.keys(m.seats).length===2&&Object.values(m.seats).every(s=>s.ready));a.send({type:'start'});
 const state=await b.next('state',m=>m.state.phase==='PLAY');assert.equal(state.state.cars[0].color,0);assert.equal(state.state.cars[1].color,0xff43b5);
 console.log('PASS: deployed WSS server preserves custom black and pink paint across both players and site origins.');
 }finally{for(const ws of peers)ws.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
