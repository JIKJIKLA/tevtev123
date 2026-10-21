// Vector instruments: 60 individually lit segments, crisp at any display scale.
const GAUGE_DIGITS=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
const GAUGE_PATHS={a:'5,0 35,0 31,4 9,4',b:'36,2 36,24 32,21 32,6',c:'36,26 36,48 32,44 32,29',d:'5,50 35,50 31,46 9,46',e:'0,26 4,29 4,44 0,48',f:'0,2 4,6 4,21 0,24',g:'5,23 31,23 35,25 31,27 5,27 1,25'};
const gauges={};
function setupGauges(){
 const point=(r,a)=>{a*=Math.PI/180;return [120+r*Math.cos(a),120+r*Math.sin(a)].map(n=>n.toFixed(2)).join(',')};
 for(const [id,label] of [['bo','BOOST'],['spd','KM / H']]){
  const host=$(id);let bars='';
  for(let i=0;i<60;i++){const a=90+i*3.75,b=a+2.65,r=104+(i>48?(i-48)*.65:0);bars+='<polygon data-bar="'+i+'" points="'+[point(93,a),point(r,a),point(r,b),point(93,b)].join(' ')+'"/>';}
  const outline='M '+point(89,90)+' A 89 89 0 1 1 '+point(89,315);
  let ticks='';for(const a of [90,135,180,225,270,315])ticks+='<path d="M '+point(88,a)+' L '+point(94,a)+' L '+point(117,a)+'"/>';
  const svg='<svg class="gauge-art" viewBox="0 0 240 240" aria-hidden="true"><defs><radialGradient id="glow-'+id+'"><stop stop-color="#ff642e" stop-opacity=".3"/><stop offset="1" stop-color="#ff642e" stop-opacity="0"/></radialGradient></defs><circle class="gauge-glow" cx="120" cy="120" r="91" fill="url(#glow-'+id+')"/><g class="gauge-outline" fill="none" stroke="#a66c25" stroke-width=".8"><path d="'+outline+'"/>'+ticks+'</g><g class="gauge-bars">'+bars+'</g><g class="gauge-digits"></g><text x="120" y="157" text-anchor="middle" class="gauge-label">'+label+'</text></svg>';
  host.insertAdjacentHTML('beforeend',svg);gauges[id]={host,bars:[...host.querySelectorAll('[data-bar]')],digits:host.querySelector('.gauge-digits'),value:-1};
 }
 updateGauge('bo',33,100);updateGauge('spd',0,83);
}
function updateGauge(id,value,max){
 const gauge=gauges[id];if(!gauge)return;value=Math.max(0,Math.round(value));if(gauge.value===value)return;gauge.value=value;
 const count=Math.round(Math.min(1,value/max)*60);gauge.bars.forEach((bar,i)=>bar.setAttribute('class',i<count?'lit'+(i>48?' over':''):''));
 const chars=String(value),scale=chars.length===3?1:1.12,width=(chars.length*42-6)*scale,start=120-width/2;
 gauge.digits.innerHTML=[...chars].map((digit,i)=>'<g transform="translate('+(start+i*42*scale)+' 94) scale('+scale+')">'+[...GAUGE_DIGITS[+digit]].map(s=>'<polygon points="'+GAUGE_PATHS[s]+'"/>').join('')+'</g>').join('');
 gauge.host.classList.toggle('full',value>=max);gauge.host.setAttribute('aria-label',id==='bo'?'Boost '+value+' percent':'Speed '+value+' kilometers per hour');
}
