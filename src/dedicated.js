// Direct Phoenix match transport. No database writes in the gameplay loop.
const DED={enabled:!window.__TEVIN_SERVER__,url:'wss://tevin-161-153-26-154.sslip.io/play',ws:null,connecting:null,active:false,owner:'',requests:new Map(),request:0,entering:null,history:[],outbox:[],seq:0,lastJump:0,replaying:false,offset:new V3(),ballOffset:new V3(),rtt:0,pingAt:0,lastPacket:0};
const DRIVER_SCALARS=['jt','jl','jAge','jumped','jHoldTime','canJ','canD','dT','dcd','aT','cT','wy','grip','wasG','ground','bs','bt','bst','sk','un','righting','clearance','wheelsOn','hullContact'];
// Draw remote cars on the authority's evenly spaced clock, not packet arrival jitter.
Object.assign(DED,{clockReady:false,serverOffset:0,serverTime:0,arrival:0,jitter:0,viewDelay:50,viewTime:0,rotationOffset:new Qn()});
const dedIdentity=new Qn();
function dedResetClock(){DED.clockReady=false;DED.jitter=0;DED.viewDelay=50;DED.rotationOffset.identity();}
function dedClockSample(tick,now,reset=false){
 const time=Number.isFinite(tick)?tick*1000/120:now;
 if(reset||!DED.clockReady||time<DED.serverTime){DED.clockReady=true;DED.serverOffset=now-time;DED.viewTime=time-50;DED.jitter=0;DED.viewDelay=50;}
 else{
  const variation=Math.abs((now-DED.arrival)-(time-DED.serverTime));DED.jitter+=(Math.min(120,variation)-DED.jitter)*.12;
  const desired=cl(50+DED.jitter*1.5,50,100);DED.viewDelay+=(desired-DED.viewDelay)*(desired>DED.viewDelay?.15:.03);
  DED.serverOffset=Math.min(DED.serverOffset+.04,now-time);
 }
 DED.serverTime=time;DED.arrival=now;return time;
}
function dedRenderTime(now,dt){
 const target=Math.min(now-DED.serverOffset-DED.viewDelay,DED.serverTime+40);
 DED.viewTime+=cl(target-DED.viewTime,0,Math.max(0,dt)*1150);return DED.viewTime;
}
function packDriver(c){const s={};for(const k of DRIVER_SCALARS)if(Number.isFinite(c[k])||typeof c[k]==='boolean')s[k]=c[k];return{s,jdir:c.jdir.toArray(),flipAxis:c.flipAxis.toArray()}}
function readDriver(c,p){if(!p)return;for(const k of DRIVER_SCALARS)if(Number.isFinite(p.s?.[k])||typeof p.s?.[k]==='boolean')c[k]=p.s[k];if(finiteVector(p.jdir,3,1.01))c.jdir.fromArray(p.jdir);if(finiteVector(p.flipAxis,3,1.01))c.flipAxis.fromArray(p.flipAxis)}
function dedSend(m){if(DED.ws?.readyState!==1)return false;if(DED.ws.bufferedAmount>65536)return false;DED.ws.send(JSON.stringify(m));return true}
function dedRequest(m){return new Promise((resolve,reject)=>{const request=++DED.request,timer=setTimeout(()=>{DED.requests.delete(request);reject(Error('Server did not respond. Try again.'))},12000);DED.requests.set(request,{resolve,reject,timer});if(!dedSend({...m,request})){clearTimeout(timer);DED.requests.delete(request);reject(Error('Server connection is unavailable.'))}})}
function dedConnect(){
 if(DED.ws?.readyState===1)return Promise.resolve();if(DED.connecting)return DED.connecting;
 DED.connecting=new Promise((resolve,reject)=>{
  const ws=new WebSocket(DED.url);DED.ws=ws;let welcomed=false;
  const timer=setTimeout(()=>{ws.close();reject(Error('Phoenix server connection timed out.'))},12000);
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}
   if(m.type==='hello'){if(m.wire!==1){ws.close();reject(Error('Reload the latest game.'));return}welcomed=true;clearTimeout(timer);SOC.id=m.session;SOC.connected=true;resolve();return}
   if(m.request&&DED.requests.has(m.request)){const p=DED.requests.get(m.request);clearTimeout(p.timer);DED.requests.delete(m.request);m.type==='error'?p.reject(Error(m.message)):p.resolve(m);return}
   if(m.type==='error'){SOC.error=m.message;socialUI();mpStatus(m.message,'bad');return}
   if(m.type==='joined'){DED.entering=dedJoined(m).catch(e=>{mpReset();mpFailure(e)});return}
   if(m.type==='lobby'){DED.owner=m.owner;MP.seats=m.seats||{};if(st==='END')updateRematchUI();if(MP.loaded)mpApplySeats();mpLobby();return}
   if(m.type==='state'){dedState(m);return}
   if(m.type==='pong'){DED.rtt=Math.round(performance.now()-m.id);return}
   if(m.type==='chat'){receiveQuickChat(m);return}
   if(m.type==='ability'){secretNotice(m.name,m.ability);return}
   if(m.type==='party'){SOC.party=m.code?{dedicated:true}:null;SOC.partyCode=m.code;SOC.partyData=m.data;SOC.ready=!!m.data?.members?.[SOC.id]?.ready;socialUI();return}
   if(m.type==='queue'){SOC.searching=!!m.searching;SOC.since=m.since||Date.now();SOC.queueData={tickets:{phoenix:{seen:Date.now(),members:Array(m.count||0).fill({})}}};socialUI()}
  };
  ws.onerror=()=>{if(!welcomed){clearTimeout(timer);reject(Error('Cannot reach the Phoenix server. Please try again.'))}};
  ws.onclose=()=>{clearTimeout(timer);if(DED.ws!==ws)return;DED.ws=null;SOC.connected=false;SOC.searching=false;SOC.party=null;SOC.partyData=null;SOC.partyCode='';SOC.ready=false;SOC.error=welcomed?'Server connection closed. Reconnect to find another match.':'';
   for(const p of DED.requests.values()){clearTimeout(p.timer);p.reject(Error('Connection closed.'))}DED.requests.clear();
   if(DED.active){MP.closed=true;MP.transport=false;mpFreeze('CONNECTION LOST — QUIT TO RECONNECT')}socialUI();if(!welcomed)reject(Error('Connection closed.'));
  };
 }).finally(()=>DED.connecting=null);return DED.connecting;
}
function dedReset(){if(DED.active)dedSend({type:'leave'});DED.active=false;DED.owner='';DED.history.length=DED.outbox.length=0;DED.offset.set(0,0,0);DED.seq=DED.lastJump=0;DED.ballOffset.set(0,0,0);dedResetClock()}
async function dedJoined(m){
 if(RIVALS.practiceJob)await RIVALS.practiceJob;RIVALS.queuePractice=false;if(previewJob)await previewJob;mpReset(false);sandbox=false;applySettings(m.settings);
 DED.active=true;DED.owner=m.owner;DED.seq=DED.lastJump=0;DED.history.length=DED.outbox.length=0;DED.offset.set(0,0,0);dedResetClock();
 Object.assign(MP,{active:true,role:'guest',slot:m.slot,session:m.session,code:m.code,seats:m.seats,quick:m.quick?'phoenix':'',transport:true,closed:false});
 SOC.searching=false;SOC.entering=false;SOC.ready=false;socialUI();$('room-code').value=m.code;
 if(!await startGame())throw Error('Arena failed to load. Try again.');
}
async function dedPrivate(type){
 if(mpBusy||starting||SOC.searching||SOC.busy)return;const code=$('room-code').value.trim().toUpperCase();if(type==='join'&&!/^[A-Z2-9]{6}$/.test(code)){mpStatus('Enter the six-character match code.','bad');return}
 mpBusyUI(true);try{mpReset();mpStatus('CONNECTING TO PHOENIX…');await dedConnect();await dedRequest({type,wire:1,code,settings:matchSettings(),profile:socialProfile()});await DED.entering}catch(e){mpReset();mpFailure(e)}finally{mpBusyUI(false)}
}
async function dedLoaded(){MP.loaded=true;MP.localPaused=false;kickoff(false);st='WAIT';mpClearInput();mpApplySeats();mpLobby();await dedRequest({type:'ready'})}
async function dedStart(){if(DED.owner!==MP.session)return;try{await dedRequest({type:'start'})}catch(e){mpStatus(e.message,'bad')}}
function dedPause(value){MP.localPaused=!!value;mpClearInput();DED.history.length=DED.outbox.length=0;dedSend({type:'input',seq:++DED.seq,round:MP.round,jump:MP.jump,held:false,paused:true,controls:{...Z}});if(value)mpFreeze('MENU OPEN — ONLINE MATCH CONTINUES');else{$('pause').classList.remove('on');st=MP.snapshot?.phase||'WAIT';DED.offset.set(0,0,0)}}
function dedState(m){
 const s=m.state;if(!DED.active||!validSnapshot(s)||s.seq<=MP.received)return;
 const phaseChanged=MP.snapshot?.phase!==s.phase||MP.round!==s.round;
 MP.received=s.seq;MP.lastSnapshot=performance.now();const time=dedClockSample(m.tick,MP.lastSnapshot,phaseChanged);if(phaseChanged)MP.buffer.length=0;MP.snapshot=s;MP.buffer.push({at:MP.lastSnapshot,time,state:s});if(MP.buffer.length>10)MP.buffer.shift();
 if(!MP.loaded)return;
 const c=localPlayer(),before=c.p.clone().add(DED.offset),beforeRotation=c.q.clone().multiply(DED.rotationOffset),ballBefore=ball.p.clone().add(DED.ballOffset);
 RIVALS.replayStamp=Number.isFinite(m.tick)?m.tick*DT:RIVALS.time;handleRemoteMatch(s);
 if(phaseChanged){DED.history.length=DED.outbox.length=0;DED.offset.set(0,0,0);DED.rotationOffset.identity();DED.lastJump=MP.jump;acc=0}
 mpReadCar(c,s.cars[MP.slot],1,0);readDriver(c,m.driver);
 readSecretState(s.arcade);readHeatState(s.heat);ball.p.fromArray(s.ball.p);ball.v.fromArray(s.ball.v);ball.w.fromArray(s.ball.w);ball.last=s.ball.last;ball.lastPlayer=s.ball.lastPlayer;ball.color=s.ball.color;
 DED.history=DED.history.filter(f=>f.seq>m.ack&&f.round===s.round);
 if(s.phase==='PLAY'&&!MP.localPaused){DED.replaying=true;try{for(const f of DED.history){Object.assign(c.inp,f.controls);c.jp=f.edge?1:0;c.jh=f.held?1:0;stepCar(c,DT);resolveArenaCar(c);predictLocalBall(DT)}}finally{DED.replaying=false}}
 c.frameP.copy(c.p);c.frameQ.copy(c.q);c.prevP.copy(c.p);c.prevQ.copy(c.q);
 if(!phaseChanged){DED.offset.copy(before).sub(c.p);DED.rotationOffset.copy(c.q).invert().multiply(beforeRotation).normalize();if(DED.offset.length()>5){DED.offset.set(0,0,0);DED.rotationOffset.identity();}if(DED.rotationOffset.angleTo(dedIdentity)>Math.PI/2)DED.rotationOffset.identity();}
 ball.frameP.copy(ball.p);ball.prevP.copy(ball.p);DED.ballOffset.copy(ballBefore).sub(ball.p);if(phaseChanged||DED.ballOffset.length()>3)DED.ballOffset.set(0,0,0);
 if(s.phase==='PLAY')replayRecord(s,RIVALS.replayStamp);if(s.phase==='END')updateRematchUI();mpStatus('PHOENIX · '+(DED.rtt?DED.rtt+' ms':'CONNECTED'),'good');
}
function dedFrame(dt){
 if(!MP.loaded)return;const now=performance.now();
 if(MP.closed||MP.lastSnapshot&&now-MP.lastSnapshot>2500){mpFreeze('CONNECTION INTERRUPTED');return}
 if(now-DED.pingAt>2000){DED.pingAt=now;dedSend({type:'ping',id:Math.round(now)})}
 applyMultiplayer(dt);DED.offset.multiplyScalar(Math.exp(-dt*12));DED.rotationOffset.slerp(dedIdentity,1-Math.exp(-dt*14));DED.ballOffset.multiplyScalar(Math.exp(-dt*18));
 if(st==='PLAY'&&!MP.localPaused){acc+=dt;let steps=0;const c=localPlayer();human(c);
  while(acc>=DT&&steps++<12){acc-=DT;const edge=MP.jump>DED.lastJump;DED.lastJump=MP.jump;
   const f={seq:++DED.seq,round:MP.round,jump:MP.jump,held:!!c.jh,paused:false,controls:{...c.inp},edge};c.frameP.copy(c.p);c.frameQ.copy(c.q);c.jp=edge?1:0;
   stepCar(c,DT);resolveArenaCar(c);ball.frameP.copy(ball.p);predictLocalBall(DT);DED.history.push(f);DED.outbox.push(f);
  }
  if(acc>=DT)acc%=DT;if(DED.history.length>120)DED.history.splice(0,DED.history.length-120);
 }else acc=0;
 if(DED.outbox.length>=2||DED.outbox.length&&now-DED.lastPacket>20){if(dedSend({type:'frames',frames:DED.outbox.slice(0,12)})){DED.outbox.splice(0,12);DED.lastPacket=now}}
 if(DED.outbox.length>24)DED.outbox.splice(0,DED.outbox.length-24);
 updateAudio();render(dt);
}
async function dedSocial(type,extra={}){
 if(SOC.busy)return;SOC.busy=true;SOC.error='';socialUI();
 try{await dedConnect();await dedRequest({type,wire:1,profile:socialProfile(),...extra})}catch(e){SOC.error=e.message;if(type==='queue')SOC.searching=false}finally{SOC.busy=false;socialUI()}
}
