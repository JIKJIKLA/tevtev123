const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');

test('generated stadium textures do not retain the old rendered name',()=>{
 const fs=require('node:fs'),path=require('node:path'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 for(const m of html.matchAll(/fillText\(([^,]+),/g))assert.doesNotMatch(m[1],/TEVIN|Tevin|T E V I N/);
});

test('Nivet identity reaches the title, menu and dynamically created match overlays',()=>{
 const g=load({full:true}),d=g.document;
 assert.match(d.title,/Nivet League/);
 for(const id of ['intro','home-panel','loading-screen','secret-panel','bomb-result','opening-caption']){
  const el=d.getElementById(id);if(!el)continue;
  assert.doesNotMatch(el.textContent,/TEVIN|Tevin League/);
 }
 assert.equal(d.getElementById('bomb-title').textContent,'NIVET WINS');
 assert.match(d.getElementById('secret-panel').textContent,/NIVET LAB/);
 assert.match(d.getElementById('opening-caption').textContent,/NIVET LEAGUE/);
 assert.equal(typeof g.window.TevinEngine.importedCar,'function');
});

test('rebranding preserves existing saved cars, progress, camera and music opt-in',()=>{
 const storage={
  'tevin.presentation.v6':JSON.stringify({body:2,color:3,teamColors:false}),
  'tevin.controls.v9':JSON.stringify({camera:{fov:109,distance:3.1},bindings:{boost:'KeyF'}}),
  'tevin.rivals.v1':JSON.stringify({career:{matches:12,wins:7,goals:25,xp:1900},options:{replays:false}}),
  'tevin-music-enabled-v1':'true'
 };
 const g=load({full:true,storage}),a=g.api;
 assert.equal(a.cfg.body,2);assert.equal(a.cfg.color,3);assert.equal(a.cfg.teamColors,false);
 assert.equal(a.CAREER.matches,12);assert.equal(a.CAREER.wins,7);assert.equal(a.CAREER.xp,1900);
 assert.equal(a.cameraSettings.fov,109);assert.equal(a.cameraSettings.distance,3.1);assert.equal(a.bindings.boost,'KeyF');
 assert.equal(a.RIVAL_PREF.replays,false);assert.equal(a.INTRO.enabled,true);
});
