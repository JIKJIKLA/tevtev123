const test=require('node:test'),assert=require('node:assert/strict'),load=require('./harness.cjs');
test('tags follow every camera and mesh update, preserve source, and hide behind camera',()=>{
 const {api:a,document:d}=load(),V=a.THREE.Vector3,cam=new a.THREE.PerspectiveCamera(65,16/9,.1,500),pos=new V(0,0,-20),scratch=new V(),el=d.createElement('span');cam.updateMatrixWorld();
 const draw=()=>a.positionDriverTag(el,pos,cam,scratch,1366,768);
 assert.equal(draw(),true);const first=el.style.transform;pos.x=1;assert.equal(draw(),true);assert.notEqual(el.style.transform,first);const second=el.style.transform;
 cam.position.x=2;cam.updateMatrixWorld();assert.equal(draw(),true);assert.notEqual(el.style.transform,second);assert.deepEqual(Array.from(pos.toArray()),[1,0,-20]);
 pos.set(0,0,20);assert.equal(draw(),false);pos.set(100,0,-20);assert.equal(draw(),false);pos.set(NaN,0,-20);assert.equal(draw(),false);
});
test('cinematic easing is bounded; motion preference and pause clear letterbox',()=>{
 const {api:a,document:d,window:w}=load();assert.equal(a.cinemaEase(-1),0);assert.equal(a.cinemaEase(2),1);assert.equal(a.cinemaEase(.5),.5);
 a.RIVAL_PREF.motion=false;a.syncCinema();assert.equal(d.body.classList.contains('cinema-motion'),false);
 a.RIVAL_PREF.motion=true;w.matchMedia=()=>({matches:true});assert.equal(a.cinemaMotion(),false);
 w.matchMedia=()=>({matches:false});a.syncCinema();assert.equal(d.body.classList.contains('cinema-motion'),true);
 d.body.classList.add('cinema-replay');a.setState({st:'PLAY'});a.syncCinema();assert.equal(d.body.classList.contains('cinema-replay'),false);
 d.body.classList.add('cinema-replay');a.stopReplay();assert.equal(d.body.classList.contains('cinema-replay'),false);
});

