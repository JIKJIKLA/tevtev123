'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require('linkedom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,'src',name),'utf8');
// Compile once; each match receives its own globals, bodies and random state.
const engine=new vm.Script([...read('legacy-8.2.html').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)][1][1],{filename:'engine.bundle.js'});
const game=new vm.Script(read('game.js').replace(/\/\/ INLINE:([\w.-]+\.js)/g,(_,file)=>read(file)),{filename:'game.js'});
const shell=read('shell.html').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
module.exports=function createPhysics(settings){
 const {window:dom}=parseHTML(shell),storage=new Map(),errors=[];
 const context={document:dom.document,console:{...console,error:(...args)=>errors.push(args.join(' ')),warn:()=>{}},
  navigator:{userAgent:'Tevin dedicated server',getGamepads:()=>[]},location:{search:'',href:'https://server.invalid/'},performance,
  URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,Blob,atob,btoa,crypto:require('node:crypto').webcrypto,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  setTimeout:()=>0,clearTimeout:()=>{},setInterval:()=>0,clearInterval:()=>{},requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{},
  addEventListener:()=>{},removeEventListener:()=>{},HTMLButtonElement:dom.HTMLButtonElement,HTMLInputElement:dom.HTMLInputElement,HTMLTextAreaElement:dom.HTMLTextAreaElement,
  innerWidth:1366,innerHeight:768,devicePixelRatio:1,isSecureContext:true,matchMedia:()=>({matches:false,addEventListener:()=>{}}),
  __TEVIN_SERVER__:true,tevinBoot:{stage:'server',ready:false,show:()=>{}}};
 context.window=context.self=context;const sandbox=vm.createContext(context);
 engine.runInContext(sandbox,{timeout:10000});game.runInContext(sandbox,{timeout:10000});
 if(!context.tevinBoot.ready||errors.length)throw Error('Server physics initialization failed: '+errors.join('; '));
 const api=context.tevinServer;api.initialize(settings);return api;
};
