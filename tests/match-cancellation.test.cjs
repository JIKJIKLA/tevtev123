const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');

test('cancelled loading reservations return to Quick Match without earning career progress',async()=>{
 const g=load({source:true,full:true}),a=g.api;g.window.setTimeout=fn=>{fn();return 0;};a.INTRO.active=false;a.LOADING.active=false;Object.assign(a.MP,{active:true,loaded:true,role:'guest',slot:0,code:'042',quick:'phoenix'});a.DED.active=true;
 let release;a.DED.entering=new Promise(resolve=>release=resolve);const before={matches:a.CAREER.matches,xp:a.CAREER.xp},job=a.dedMatchCancelled({code:'042',reason:'A player left before kickoff.'});await Promise.resolve();assert.equal(a.MP.active,true,'cancel raced the loading transition');release();await job;
 assert.equal(a.MP.active,false);assert.equal(a.DED.active,false);assert.equal(g.document.getElementById('menu').getAttribute('data-screen'),'play');assert.equal(g.document.getElementById('choose-quick').getAttribute('aria-pressed'),'true');assert.match(g.document.getElementById('quick-status').textContent,/left before kickoff/);assert.deepEqual({matches:a.CAREER.matches,xp:a.CAREER.xp},before);
});

test('a delayed cancellation for another room cannot exit a newer match',async()=>{
 const g=load({source:true,full:true}),a=g.api;a.MP.code='999';a.MP.active=true;a.DED.active=true;await a.dedMatchCancelled({code:'042',reason:'Old reservation cancelled.'});assert.equal(a.MP.active,true);assert.equal(a.DED.active,true);
});

test('authoritative results override an open online pause menu and award progress only once',()=>{
 for(const endReason of ['', 'MATCH FORFEIT · OPPOSING TEAM LEFT']){
  const g=load({source:true,full:true}),a=g.api;a.INTRO.active=false;a.DED.active=true;Object.assign(a.MP,{active:true,loaded:true,role:'guest',slot:0,round:0,localPaused:true});a.setState({st:'PAUSE'});g.document.getElementById('pause').classList.add('on');
  const state=a.mpSnapshot();Object.assign(state,{phase:'END',clock:0,score:[2,1],round:0,seq:10,endReason});a.MP.snapshot=state;const before={matches:a.CAREER.matches,wins:a.CAREER.wins,xp:a.CAREER.xp};a.handleRemoteMatch(state);
  assert.equal(a.getState().st,'END');assert.equal(a.MP.localPaused,false);assert.equal(g.document.getElementById('pause').classList.contains('on'),false);assert.equal(g.document.getElementById('end').classList.contains('on'),true);assert.equal(g.document.getElementById('endt').textContent,'VICTORY');assert.equal(g.document.getElementById('end-reason').textContent,endReason);assert.equal(a.CAREER.matches,before.matches+1);assert.equal(a.CAREER.wins,before.wins+1);assert.ok(a.CAREER.xp>before.xp);
  const recorded={matches:a.CAREER.matches,wins:a.CAREER.wins,xp:a.CAREER.xp};for(let i=0;i<8;i++)a.handleRemoteMatch({...state,seq:11+i});assert.deepEqual({matches:a.CAREER.matches,wins:a.CAREER.wins,xp:a.CAREER.xp},recorded);
 }
});
