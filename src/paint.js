// Personal paint is a packed RGB integer; null keeps the original named palette.
const EXTRA_PAINTS=[['Hot Pink',0xff43b5],['Mint',0x63f2b0],['Arctic',0x73caff],['Royal',0x7044e8],['Scarlet',0xdf352c],['Copper',0xc8783f],['Graphite',0x263140],['Black',0x000000]];
let paintPending=null;
function validPaint(value){return Number.isInteger(value)&&value>=0&&value<=0xffffff;}
function normalizedPaint(value){return validPaint(value)?value:null;}
function driverPaint(profile={},fallbackIndex=0){const paint=normalizedPaint(profile?.paint);if(paint!==null)return paint;const index=Number.isInteger(profile?.color)?cl(profile.color,0,PALETTE.length-1):Number.isInteger(fallbackIndex)?cl(fallbackIndex,0,PALETTE.length-1):0;return PALETTE[index];}
function paintHex(value){return '#'+(validPaint(value)?value:PALETTE[0]).toString(16).padStart(6,'0');}
function paintName(profile=cfg){return validPaint(profile?.paint)?'Custom '+paintHex(profile.paint).toUpperCase():COLOR_NAMES[Number.isInteger(profile?.color)?cl(profile.color,0,COLOR_NAMES.length-1):0];}
function huePaint(degrees){const h=((Number(degrees)||0)%360+360)%360/60,c=.82*.9,x=c*(1-Math.abs(h%2-1)),m=.55-c/2;const rgb=h<1?[c,x,0]:h<2?[x,c,0]:h<3?[0,c,x]:h<4?[0,x,c]:h<5?[x,0,c]:[c,0,x];return rgb.reduce((n,v)=>n*256+Math.round((v+m)*255),0);}
function paintHue(value){const r=(value>>16&255)/255,g=(value>>8&255)/255,b=(value&255)/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;if(d<1e-5)return 0;return Math.round(((max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4)*60)%360);}
function paintForeground(value){const linear=n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4};const l=.2126*linear(value>>16&255)+.7152*linear(value>>8&255)+.0722*linear(value&255);return l>.2?'#06111f':'#ffffff';}
function updateScorePaint(){
 for(let team=0;team<2;team++){
  const el=$('s'+team);if(!el)continue;const captain=cars[team]?.enabled!==false?cars[team]:cars.find(c=>c.enabled&&c.team===team);
  const value=validPaint(captain?.color)?captain.color:teamPalette[team],hex=paintHex(value);if(el.dataset.paint===hex)continue;el.dataset.paint=hex;
  el.style.setProperty('--team-color',hex);el.style.background=hex;el.style.color=paintForeground(value);el.style.textShadow=paintForeground(value)==='#ffffff'?'0 1px 3px #0008':'none';el.setAttribute('aria-label',(team?'Orange':'Blue')+' team score · car paint '+hex);
 }
}
function commitPaint(){if(paintPending!==null){clearTimeout(paintPending);paintPending=null;}applyTeamColors();updateScorePaint();}
function setCustomPaint(value,commit=true){
 if(MP.active||SOC.searching)return false;const rgb=typeof value==='string'&&/^#[\da-f]{6}$/i.test(value)?parseInt(value.slice(1),16):value;if(!validPaint(rgb))return false;
 cfg.paint=rgb;const c=localPlayer();c.color=rgb;if(inited)paintCar(c.id);savePresentation();syncPaintUI();updateMatchSummary();updateScorePaint();
 if(commit)commitPaint();else if(paintPending===null)paintPending=setTimeout(()=>{paintPending=null;commitPaint();},110);return true;
}
function syncPaintUI(){
 const value=driverPaint(cfg),hex=paintHex(value),picker=$('paint-picker'),hue=$('paint-hue'),output=$('paint-value');
 if(picker)picker.value=hex;if(hue)hue.value=paintHue(value);if(output){output.textContent=hex.toUpperCase();output.style.setProperty('--paint-preview',hex);}
 if($('paint-name'))$('paint-name').textContent=paintName();
 $('swatches')?.querySelectorAll('button').forEach((button,index)=>button.classList.toggle('on',!validPaint(cfg.paint)&&index===cfg.color));
 $('extra-paints')?.querySelectorAll('button').forEach(button=>{const selected=validPaint(cfg.paint)&&Number(button.dataset.paint)===cfg.paint;button.setAttribute('aria-pressed',String(selected));});
 if($('paint-palette'))$('paint-palette').disabled=!validPaint(cfg.paint);
}
function setupPaint(){
 if($('custom-paint'))return;const section=document.createElement('section');section.id='custom-paint';section.setAttribute('aria-label','Custom car paint');
 section.innerHTML='<div class="paint-heading"><label for="paint-picker">YOUR COLOR</label><output id="paint-value"></output></div><div class="paint-pick-row"><input id="paint-picker" type="color" aria-label="Custom car paint color"><div><label for="paint-hue">HUE</label><input id="paint-hue" type="range" min="0" max="359" step="1" aria-label="Car paint hue"></div></div><div id="extra-paints" aria-label="More car paint colors"></div><button id="paint-palette" type="button">USE NAMED PALETTE COLOR</button><p>Choose any color. Your paint also colors your boost and team scoreboard.</p>';
 const name=$('paint-name');name.parentNode.insertBefore(section,name.nextSibling);
 for(const [name,value] of EXTRA_PAINTS){const button=document.createElement('button');button.type='button';button.title=name;button.setAttribute('aria-label',name+' custom car paint');button.dataset.paint=value;button.style.setProperty('--paint-preview',paintHex(value));button.textContent=name;button.onclick=()=>setCustomPaint(value);$('extra-paints').appendChild(button);}
 $('paint-picker').oninput=()=>setCustomPaint($('paint-picker').value,false);$('paint-picker').onchange=()=>setCustomPaint($('paint-picker').value,true);
 $('paint-hue').oninput=()=>setCustomPaint(huePaint($('paint-hue').value),false);$('paint-hue').onchange=()=>setCustomPaint(huePaint($('paint-hue').value),true);
 $('paint-palette').onclick=()=>{if(MP.active||SOC.searching)return;cfg.paint=null;commitPaint();savePresentation();syncPaintUI();updateMatchSummary();};
 syncPaintUI();updateScorePaint();
}
try{const pref=JSON.parse(localStorage.getItem('tevin.presentation.v6')||'null');cfg.paint=normalizedPaint(pref?.paint);}catch(_){cfg.paint=null;}
