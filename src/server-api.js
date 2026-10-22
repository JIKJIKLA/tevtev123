// The dedicated server runs this same solver without creating a renderer.
// This entry point is set only by the server's isolated JS context.
if(window.__TEVIN_SERVER__){
 window.tevinServer={
  initialize(settings){
   applySettings(settings);cfg.hi=0;sandbox=false;configureCars();
   Object.assign(MP,{active:true,role:'host',loaded:true,round:0,seq:0,seats:{},inputs:{},seenJumps:{}});
   score=[0,0];tl=cfg.len;ot=0;kickoff(false);st='WAIT';
   return matchSettings();
  },
  seats(seats){MP.seats=seats;const sessions=new Set(Object.values(seats).map(s=>s.session));for(const id of Object.keys(MP.inputs))if(!sessions.has(id)){delete MP.inputs[id];delete MP.seenJumps[id]}mpApplySeats()},
  input(session,packet){MP.inputs[session]=packet},
  start(){if(st!=='WAIT'&&st!=='END')return false;score=[0,0];tl=cfg.len;ot=0;MP.matchBegun=true;kickoff();return true},
  step(){
   const dt=DT;
   if(st==='COUNT'){cnt-=dt;if(cnt<=0)st='PLAY'}
   if(st==='PLAY')sim(dt);
   if(st==='GOAL'){
    // Slow-motion replay isn't simulated on the server. Hold the scoring state,
    // then start the next authoritative kickoff.
    gt-=dt;if(gt<=0){
     if(ot||cfg.mode===1&&Math.max(...score)>=7||cfg.mode===0&&tl<=0&&score[0]!==score[1])endMatch(false);
     else{if(cfg.mode===0&&tl<=0){ot=1;tl=0}kickoff()}
    }
   }
  },
  state(){return mpSnapshot()},
  driver(slot){return packDriver(cars[slot])},
  phase(){return st},
  // Server-side diagnostics/tests; none of these mutators are network messages.
  inspect(){return{cars,ball,cfg,MP}},
 };
 window.tevinBoot.ready=true;return;
}
