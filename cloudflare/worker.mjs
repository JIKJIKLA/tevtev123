// Static assets are served by Cloudflare before this tiny Worker runs.
// No match state or physics runs here; the existing Phoenix service owns play.
const headers=Object.freeze({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
export default {
 async fetch(request,env){
  const method=request.method.toUpperCase(),url=new URL(request.url);
  if(!['GET','HEAD'].includes(method))return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET, HEAD'}});
  if(url.pathname==='/health'){
   const body=JSON.stringify({ok:true,service:'nivet-static-worker',build:env.GAME_BUILD||'local',multiplayer:'Phoenix dedicated',mode:'static-assets'});
   return new Response(method==='HEAD'?null:body,{headers:{...headers,'Content-Type':'application/json; charset=utf-8'}});
  }
  // Normally handled by asset-first routing. This also supports direct testing.
  if(url.pathname==='/'||url.pathname==='/index.html'){
   if(!env.ASSETS?.fetch)return new Response(method==='HEAD'?null:'Game assets unavailable',{status:503,headers});
   try{return await env.ASSETS.fetch(request);}
   catch{return new Response(method==='HEAD'?null:'Game assets unavailable',{status:503,headers});}
  }
  return new Response(method==='HEAD'?null:'Not found',{status:404,headers});
 }
};
