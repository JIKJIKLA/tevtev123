// Dashboard-only alternative: paste this JS module into an existing Worker.
// It streams the current self-contained Pages build, never an arbitrary URL.
const GAME_ORIGIN='https://jikjikla.github.io/tevtev123/';
const security=Object.freeze({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
export function createPasteWorker(fetchGame){
 return {
  async fetch(request){
   const method=request.method.toUpperCase(),url=new URL(request.url);
   if(!['GET','HEAD'].includes(method))return new Response('Method not allowed',{status:405,headers:{...security,Allow:'GET, HEAD','Cache-Control':'no-store'}});
   if(url.pathname==='/health')return new Response(method==='HEAD'?null:JSON.stringify({ok:true,service:'nivet-pages-worker',mode:'fixed-pages-origin',multiplayer:'Phoenix dedicated'}),{headers:{...security,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
   if(url.pathname!=='/'&&url.pathname!=='/index.html')return new Response(method==='HEAD'?null:'Not found',{status:404,headers:{...security,'Cache-Control':'no-store'}});
   const forwarded=new Headers({Accept:'text/html'});
   for(const key of ['If-None-Match','If-Modified-Since'])if(request.headers.has(key))forwarded.set(key,request.headers.get(key));
   try{
    const upstream=await fetchGame(GAME_ORIGIN,{method,headers:forwarded,redirect:'error'});
    if(![200,304].includes(upstream.status))throw Error('Origin unavailable');
    const result=new Headers(upstream.headers);result.delete('Set-Cookie');
    for(const [key,value] of Object.entries(security))result.set(key,value);
    result.set('Cache-Control','public, max-age=0, must-revalidate');
    // Forward a stream, keeping the 16+ MB game out of Worker JS memory.
    return new Response(method==='HEAD'||upstream.status===304?null:upstream.body,{status:upstream.status,headers:result});
   }catch{return new Response(method==='HEAD'?null:'Game temporarily unavailable. Please retry.',{status:502,headers:{...security,'Cache-Control':'no-store'}});}
  }
 };
}
export default createPasteWorker((url,options)=>fetch(url,options));
