// Developer-only real-renderer poses. Never injected into the shipping HTML.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const output=path.resolve(process.argv[2]||path.join(__dirname,'../../../outputs/matchday-review.html'));
cp.execFileSync(process.execPath,[path.join(__dirname,'stage-lighting-preview.cjs'),path.join(__dirname,'../index.html'),output]);
let html=fs.readFileSync(output,'utf8');
const review=`
const FX_REVIEW={kind:new URLSearchParams(location.search).get('fx'),started:false};
function reviewMatchEffects(){
 if(!FX_REVIEW.kind)return;const c=localPlayer(),e=MATCH_EFFECTS;c.v.set(0,0,23);c.supersonic=true;c.bst=FX_REVIEW.kind==='boost'?1:0;ball.last=0;ball.color=teamPalette[0];ball.v.set(0,0,25);
 if(FX_REVIEW.kind==='demo'){if(!FX_REVIEW.started){demolishCar(cars[1],c);FX_REVIEW.started=true;}for(const smoke of e.smoke)if(smoke.age<99)smoke.age=.15;for(const ring of e.rings)if(ring.age<99)ring.age=.12;return;}
 for(let side=0;side<2;side++)for(let n=17;n>=0;n--){const age=n/75,point=new V3(c.p.x+(side?1:-1)*.3,c.p.y-.1,c.p.z-23*age-.4);recordMatchTrail(e.trails[side],point,e.clock-age);}
 for(let n=17;n>=0;n--){const age=n/75,point=new V3(ball.p.x,ball.p.y,ball.p.z-25*age);recordMatchTrail(e.trails[12],point,e.clock-age);}
}
`;
html=html.replace('function frame(t){requestAnimationFrame(frame);',review+'\nfunction frame(t){requestAnimationFrame(frame);');
const gate='if(LIGHTING_REVIEW.ready){acc=0;presentationDelta=0;updateAudio();render(1/60);return;}';
if(!html.includes(gate))throw Error('Review render gate changed');
html=html.replace(gate,'if(LIGHTING_REVIEW.ready){acc=0;presentationDelta=0;reviewMatchEffects();updateAudio();render(1/60);return;}');
fs.writeFileSync(output,html);console.log(output);
