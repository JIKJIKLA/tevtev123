// Shared by Edge and the regression runner. Never trust client-authored host IDs.
const equal=(a,b)=>JSON.stringify(a??null)===JSON.stringify(b??null);
const omit=(o,keys)=>Object.fromEntries(Object.entries(o||{}).filter(([k])=>!keys.includes(k)));
const members=p=>Object.entries(p?.members||{});
const requireThat=(v,s)=>{if(!v)throw Error(s)};
export function validateDocument(key,old,next,uid,now=Date.now()){
 requireThat(typeof uid==='string'&&uid.length===36,'Sign in required');
 requireThat(JSON.stringify(next).length<180000,'Document too large');
 const [kind,id]=key.split('/');
 if(kind==='room'){
  const a=old?.meta,b=next?.meta;
  if(!a){requireThat(b?.host===uid&&b?.seats?.[0]?.session===uid,'Only host creates a room');}
  else if(a.host!==uid){
   requireThat(b&&equal(omit(a,['seats']),omit(b,['seats'])),'Only host changes rules');
   const aa=a.seats||{},bb=b.seats||{};
   for(const slot of new Set([...Object.keys(aa),...Object.keys(bb)]))if(!equal(aa[slot],bb[slot])){
    requireThat((!aa[slot]&&bb[slot]?.session===uid&&!a.locked)||(aa[slot]?.session===uid&&!bb[slot]),'Seat belongs to another player');
   }
  }else if(!next)return;
  requireThat(next&&Object.keys(next).length===1&&b,'Invalid room');
  requireThat(b.host===(a?.host||uid),'Host cannot change');
  requireThat([1,2,3].includes(b.settings?.size),'Invalid team size');
  const seats=Object.entries(b.seats||{});requireThat(seats.length<=b.settings.size*2,'Room is full');
  requireThat(new Set(seats.map(([,s])=>s.session)).size===seats.length,'Duplicate seat');
  requireThat(seats.every(([s,v])=>/^\d$/.test(s)&&+s<b.settings.size*2&&typeof v.session==='string'&&v.session.length===36),'Invalid seats');
  return;
 }
 if(kind==='party'){
  if(!old)requireThat(next?.leader===uid&&members(next).length===1&&next.members[uid],'Invalid party creator');
  for(const [id,m] of members(old))if(id!==uid&&now-m.seen<20000)requireThat(equal(m,next?.members?.[id])||old?.members?.[uid]&&old.queue&&!next?.queue&&next?.members?.[id]?.ready===false&&equal(omit(m,['ready']),omit(next.members[id],['ready'])),'Cannot change another party member');
  for(const [id,m] of members(next))if(!old?.members?.[id])requireThat(id===uid,'Cannot invite an identity without consent');
  if(!next){requireThat(members(old).every(([id,m])=>id===uid||now-m.seen>=20000),'Party still occupied');return;}
  requireThat(members(next).length<=3,'Party is full');
  if(old?.leader!==uid&&old?.members?.[old?.leader]&&now-old.members[old.leader].seen<20000)requireThat(next.leader===old.leader&&(equal(old.queue,next.queue)||old.members[uid]&&old.queue&&!next.queue),'Leader controls queue');
  requireThat(!!next.members[next.leader],'Missing leader');return;
 }
 if(kind==='queue'){
  requireThat(next&&Object.keys(next.tickets||{}).length<=64,'Queue is full');
  for(const [tid,t] of Object.entries(next.tickets||{})){
   if(id.includes('-v4-'))requireThat(t.protocol===4,'Reload Tevin League 9.0 before searching');
   const prev=old?.tickets?.[tid];
   if(!prev){requireThat(t.owner===uid&&t.members?.some(m=>m.session===uid),'Invalid ticket owner');}
   else if(prev.owner!==uid)requireThat(equal(omit(prev,['match']),omit(t,['match'])),'Cannot edit another ticket');
   requireThat(Array.isArray(t.members)&&t.members.length>=1&&t.members.length<=3,'Invalid party size');
   if(t.match&&!prev?.match){const match=next.matches?.[t.match];requireThat(match&&t.members.every(m=>match.players?.some(p=>p.session===m.session)),'Invalid reservation');}
  }
  for(const [tid,t] of Object.entries(old?.tickets||{}))if(!next.tickets?.[tid])requireThat(t.owner===uid||t.members?.some(m=>m.session===uid)||now-t.seen>20000||t.match&&!next.matches?.[t.match],'Cannot remove another ticket');
  for(const [mid,m] of Object.entries(old?.matches||{}))if(!next.matches?.[mid])requireThat(now-m.created>120000,'Cannot remove active reservation');
  for(const [mid,m] of Object.entries(next.matches||{})){
   if(id.includes('-v4-'))requireThat(m.settings?.protocol===4,'Incompatible match rules');
   const prev=old?.matches?.[mid];
   if(prev){for(const [actor,ack] of Object.entries(prev.acks||{}))if(actor!==uid)requireThat(equal(ack,m.acks?.[actor]),'Cannot remove another acknowledgment');requireThat(equal(omit(prev,['acks','cancelled']),omit(m,['acks','cancelled'])),'Reservation is immutable');
    for(const [actor,ack] of Object.entries(m.acks||{}))if(!equal(prev.acks?.[actor],ack))requireThat(actor===uid,'Invalid acknowledgment');
    if(m.cancelled&&!prev.cancelled)requireThat(m.players.some(p=>p.session===uid),'Not your match');
   }else{
    const roster=Object.values(next.tickets||{}).filter(t=>t.match===mid).flatMap(t=>t.members||[]);
    requireThat(roster.some(p=>p.session===uid),'Matcher must be a participant');
    requireThat(m.players?.length===m.settings?.size*2&&roster.length===m.players.length,'Incomplete match');
    requireThat(new Set(roster.map(p=>p.session)).size===roster.length,'Duplicate players');
    requireThat(m.host===m.players[0].session&&m.players.every((p,i)=>p.slot===i&&roster.some(r=>equal(r,omit(p,['slot'])))),'Invalid match roster');
    requireThat([1,2,3].includes(m.settings.size)&&m.settings.mode===(id.startsWith('heat')?1:0)&&m.settings.size===Number(id.slice(-1)),'Wrong playlist');
   }
  }
  return;
 }
 throw Error('Unknown document');
}
