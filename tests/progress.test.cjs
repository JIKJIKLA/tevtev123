const {test}=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
function backup(){return {version:1,career:{matches:4,wins:2,goals:7,touches:30,topSpeed:82.4,xp:650,drills:3,history:[{at:'2026-10-28T12:00:00.000Z',mode:'Soccar',size:2,online:true,result:'WIN',score:'2–1',goals:1}],presets:[{name:'My car',body:1,color:2,paint:0x123456,celebration:'comet'},null,null]}};}
test('progress backups validate bounded local data and never import network or control settings',()=>{
 const a=load({source:true}).api,b=backup();b.cfg={unlimited:true};b.career.__extra={secret:true};const parsed=a.readProgressBackup(JSON.stringify(b));assert.equal(parsed.matches,4);assert.equal(parsed.presets[0].paint,0x123456);assert.equal(parsed.cfg,undefined);assert.equal(parsed.__extra,undefined);
 for(const mutate of [v=>v.version=2,v=>v.career.xp=-1,v=>v.career.wins=5,v=>v.career.presets[0].body=9,v=>v.career.history[0].at='yesterday',v=>v.career.history[0].score='<img>']){const bad=backup();mutate(bad);assert.throws(()=>a.readProgressBackup(JSON.stringify(bad)));}assert.throws(()=>a.readProgressBackup('x'.repeat(128*1024+1)));assert.throws(()=>a.readProgressBackup('{broken'));
});
test('restore previews without mutation, cancels safely and invalid files cannot leave a stale confirmation',()=>{
 const g=load({full:true,source:true}),a=g.api;a.CAREER.xp=10;assert.equal(a.stageProgressImport(JSON.stringify(backup())),true);assert.equal(a.CAREER.xp,10);g.document.getElementById('progress-import-cancel').onclick();assert.equal(a.PROGRESS_IMPORT.pending,null);assert.equal(a.restoreProgress(),false);assert.equal(a.CAREER.xp,10);
 a.stageProgressImport(JSON.stringify(backup()));assert.equal(a.stageProgressImport('invalid'),false);assert.equal(a.PROGRESS_IMPORT.pending,null);assert.equal(a.restoreProgress(),false);
});
test('confirmed restore persists stats and slots while keeping current car, options and match rules',()=>{
 const g=load({full:true,source:true}),a=g.api;a.cfg.gravity=.5;a.cfg.paint=0xaabbcc;a.RIVAL_PREF.motion=false;a.stageProgressImport(JSON.stringify(backup()));assert.equal(a.restoreProgress(),true);assert.equal(a.CAREER.matches,4);assert.equal(a.CAREER.presets[0].body,1);assert.equal(a.cfg.gravity,.5);assert.equal(a.cfg.paint,0xaabbcc);assert.equal(a.RIVAL_PREF.motion,false);assert.equal(JSON.parse(g.storage.get('tevin.rivals.v1')).career.xp,650);assert.equal(g.document.getElementById('progress-import-preview').hidden,true);
 a.MP.active=true;assert.equal(a.stageProgressImport(JSON.stringify(backup())),false);assert.equal(a.CAREER.xp,650);
});
test('failed storage rolls a restore back rather than claiming it was saved',()=>{
 const g=load({full:true,source:true}),a=g.api;a.CAREER.xp=11;const original=a.CAREER.presets;a.stageProgressImport(JSON.stringify(backup()));g.window.localStorage.setItem=()=>{throw Error('storage blocked')};assert.equal(a.restoreProgress(),false);assert.equal(a.CAREER.xp,11);assert.equal(a.CAREER.presets,original);assert.match(g.document.getElementById('progress-import-status').textContent,/kept/);
});
