import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {validateDocument} from './validate.mjs';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-region','Access-Control-Allow-Methods':'POST, OPTIONS'};
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return respond({error:'POST required'},405);
 try{
  const token=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user)return respond({error:'Sign in required'},401);
  const raw=await req.text();if(raw.length>200000)return respond({error:'Request too large'},413);
  const {op,key,expected,value}=JSON.parse(raw);
  if(!/^(room|party)\/[A-Z2-9]{6}$/.test(key)&&!/^queue\/(soccar|heat)-(v4-)?[123]$/.test(key))return respond({error:'Invalid key'},400);
  const {data:row,error}=await admin.from('tevin_documents').select('value,revision,updated_at').eq('key',key).maybeSingle();if(error)throw error;
  const old=row&&Date.now()-Date.parse(row.updated_at)<86400000?row.value:null,revision=row?.revision||0;
  if(op==='read')return respond({value:old,revision,serverTime:Date.now()});
  if(op!=='cas'||!Number.isSafeInteger(expected))return respond({error:'Invalid operation'},400);
  if(expected!==revision)return respond({committed:false});
  validateDocument(key,old,value,user.id);
  if(key.startsWith('queue/'))for(const [id,t] of Object.entries(value?.tickets||{}) as [string,any][]){
   if(!old?.tickets?.[id]){
    if(t.party){const {data:p}=await admin.from('tevin_documents').select('value').eq('key','party/'+t.party).maybeSingle();
     if(p?.value?.leader!==user.id||t.members.some((m:any)=>!p.value.members[m.session]?.ready||Date.now()-p.value.members[m.session].seen>20000))throw Error('Party members must consent and be ready');
    }else if(t.members.length!==1||t.members[0].session!==user.id)throw Error('Solo ticket can contain only you');
   }
  }
  const {data:result,error:commitError}=await admin.rpc('tevin_cas',{doc_key:key,expected,next_value:value});if(commitError)throw commitError;
  return respond(result);
 }catch(e){return respond({error:e instanceof Error?e.message:String(e)},400)}
});
