// Replace only the grass factory in the preserved, pinned 0.186.1 engine.
// The legacy recovery HTML is never modified. Fail closed if the pin changes.
const fs=require('node:fs'),path=require('node:path');
module.exports=function patchGrass(code){
 const token='function b_(C){',start=code.indexOf(token);
 if(start<0||code.indexOf(token,start+1)>=0)throw Error('Pinned grass factory changed');
 let depth=0,end=-1;for(let i=start+token.length-1;i<code.length;i++){if(code[i]==='{')depth++;if(code[i]==='}'&&--depth===0){end=i+1;break}}
 // Braces are balanced in this known factory, which has no template/string braces.
 if(end<0||!code.slice(start,end).includes('E.positionNode=o'))throw Error('Unrecognized pinned grass factory');
 const exportToken='pitchMaterial:()=>__,';
 if(code.split(exportToken).length!==2)throw Error('Pinned pitch export changed');
 return (code.slice(0,start)+fs.readFileSync(path.join(__dirname,'../src/grass-node.js'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../src/pitch-node.js'),'utf8')+code.slice(end)).replace(exportToken,exportToken+'pitchDetail:()=>nivetPitchDetail,');
};
