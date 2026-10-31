const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
module.exports=function loadGame(options={}){
 const selectedHTML=options.htmlPath?fs.readFileSync(options.htmlPath,'utf8'):html,selectedScripts=options.htmlPath?[...selectedHTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]):scripts,sourceRoot=options.sourceRoot||path.join(root,'src');
 const {window}=parseHTML(selectedHTML.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 const storage=new Map(Object.entries(options.storage||{})),errors=[];let pads=[];
 const sandbox={window:null,self:null,document:window.document,console:{...console,error:(...args)=>errors.push(args.map(String).join(' ')),warn:()=>{}},
  navigator:{userAgent:'Tevin physics tests',getGamepads:()=>pads},location:{search:'',href:'https://test.invalid/'},performance:{now:()=>1000},
  URL,URLSearchParams,TextDecoder,TextEncoder,AbortController,Blob,atob,btoa,crypto:require('node:crypto').webcrypto,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{},
  addEventListener:window.addEventListener.bind(window),removeEventListener:window.removeEventListener.bind(window),
  HTMLButtonElement:window.HTMLButtonElement,HTMLInputElement:window.HTMLInputElement,HTMLTextAreaElement:window.HTMLTextAreaElement,
  innerWidth:1366,innerHeight:768,devicePixelRatio:1,isSecureContext:true,matchMedia:()=>({matches:false,addEventListener:()=>{}}),
  __TEVIN_TEST__:options.full?'full':'headless'};
 if(options.network)Object.assign(sandbox,{fetch,WebSocket,Headers,Request,Response,setTimeout,clearTimeout,setInterval,clearInterval});
 sandbox.window=sandbox;sandbox.self=sandbox;
 const context=vm.createContext(sandbox);
 for(let i=0;i<selectedScripts.length;i++){
  const code=options.source&&i===2?fs.readFileSync(path.join(sourceRoot,'game.js'),'utf8').replace(/\/\/ INLINE:([\w.-]+\.js)/g,(_,part)=>fs.readFileSync(path.join(sourceRoot,part),'utf8')):selectedScripts[i];
  vm.runInContext(code,context,{filename:['bootstrap.js','engine.bundle.js','game.js'][i]});
 }
 if(!sandbox.tevinBoot.ready||errors.length)throw Error('Bootstrap: '+sandbox.tevinBoot.stage+' '+errors.join('; '));
 if(sandbox.tevinTest?.BOMB)sandbox.tevinTest.BOMB.sample=()=>options.bombSample??99;
 return {api:sandbox.tevinTest,window:sandbox,document:window.document,storage,errors,setPads:value=>pads=value,dispatch:event=>window.dispatchEvent(event),Event:window.Event,context};
};
