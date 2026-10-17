// Original implementation inspired by radial spectra and particle fields in
// https://speckyboy.com/audio-visualization-code-snippets/ . No borrowed assets.
function spectrumEnergy(bins,rate,fft,low,high){
 const first=Math.max(1,Math.floor(low*fft/rate)),last=Math.min(bins.length-1,Math.ceil(high*fft/rate));
 let sum=0;for(let i=first;i<=last;i++)sum+=(bins[i]/255)**2;
 return Math.sqrt(sum/Math.max(1,last-first+1));
}
function advanceMusicEnvelope(state,bass,dt,now){
 const previous=state.level;state.level+=(bass-state.level)*(1-Math.exp(-dt*18));
 state.average+=(bass-state.average)*(1-Math.exp(-dt*1.8));
 state.pulse*=Math.exp(-dt*5.5);
 if(bass>.16&&bass>state.average*1.13&&state.level>previous+.008&&now-state.lastBeat>.22){state.pulse=Math.min(1,.35+(bass-state.average)*4);state.lastBeat=now;}
 return state.pulse;
}
let musicCanvasContext=null,musicCanvasUnavailable=false;
function drawMusicSpectrum(now,motion,audible){
 const canvas=$('music-visualizer');if(!canvas||musicCanvasUnavailable)return;
 if(!musicCanvasContext){try{musicCanvasContext=canvas.getContext('2d',{alpha:true});}catch(_){}if(!musicCanvasContext){musicCanvasUnavailable=true;return;}}
 const ctx=musicCanvasContext,w=Math.min(innerWidth,1280),h=Math.round(innerHeight*w/innerWidth);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 ctx.clearRect(0,0,w,h);const x=w*(w>700?.73:.5),y=h*(w>700?.46:.40),r=Math.min(w*.21,h*.29),p=motion?INTRO.pulse*audible:0;
 ctx.save();ctx.translate(x,y);ctx.lineWidth=2;ctx.globalAlpha=.45+p*.4;ctx.strokeStyle='#8ce8ff';
 ctx.beginPath();ctx.arc(0,0,r*(1+p*.12),0,Math.PI*2);ctx.stroke();
 const bands=64;for(let i=0;i<bands;i++){
  const f=35*Math.pow(16000/35,i/bands),energy=motion?spectrumEnergy(INTRO.bins,AC?.sampleRate||48000,2048,f,f*1.12)*audible:0;
  const angle=i/bands*Math.PI*2-Math.PI/2,length=4+energy*r*.6+p*12,base=r*(1+p*.12);
  ctx.strokeStyle=i<32?'#69dbff':'#ffac67';ctx.globalAlpha=.3+energy*.65;ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(Math.cos(angle)*base,Math.sin(angle)*base);ctx.lineTo(Math.cos(angle)*(base+length),Math.sin(angle)*(base+length));ctx.stroke();
 }
 for(let j=0;j<3;j++){const age=motion?(now*.28+j/3)%1:j/3;ctx.globalAlpha=(1-age)*p*.45;ctx.strokeStyle='#7edbff';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r*(1+age*.9),0,Math.PI*2);ctx.stroke();}
 for(let i=0;i<52;i++){const phase=i*2.39996,travel=motion?(now*(.035+(i%7)*.003)+i*.618)%1:(i*.618)%1,distance=r*(1.15+travel*1.5+p*.18);ctx.globalAlpha=(1-travel)*(.18+INTRO.level*audible*.65);ctx.fillStyle=i%3?'#87e7ff':'#ffb977';ctx.beginPath();ctx.arc(Math.cos(phase)*distance,Math.sin(phase)*distance,(i%3+1)*.7,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
function introFrame(dt){
 if(st!=='MENU'||document.hidden)return;INTRO.clock+=dt;if(INTRO.clock<1/30)return;const elapsed=Math.min(.1,INTRO.clock);INTRO.clock=0;
 const playing=!!INTRO.analyser&&INTRO.media&&!INTRO.media.paused&&AC?.state==='running'&&!AUDIO.settings.muted;
 if(playing)INTRO.analyser.getByteFrequencyData(INTRO.bins);else INTRO.bins.fill(0);
 const now=performance.now()/1000,bass=spectrumEnergy(INTRO.bins,AC?.sampleRate||48000,2048,30,160);
 advanceMusicEnvelope(INTRO,bass,elapsed,now);
 const fade=AC?cl((AC.currentTime-INTRO.fadeStart)/6,0,1):0,audible=playing?INTRO.music*fade*AUDIO.settings.master:0;
 const motion=INTRO.motion&&!INTRO.reduced,p=motion?INTRO.pulse*audible:0;
 const stage=$('intro-stage');stage.style.transform=`translate3d(${Math.sin(now*41)*p*9}px,${Math.cos(now*37)*p*6}px,0) scale(${1+p*.09}) rotate(${Math.sin(now*24)*p*.7}deg)`;
 stage.style.filter=`blur(${p*3.4}px) saturate(${1.05+p*.9}) brightness(${1+p*.22})`;
 $('intro').style.setProperty('--beat',p.toFixed(3));$('menu').style.setProperty('--music-beat',p.toFixed(3));
 const bars=$('intro-spectrum').children;for(let i=0;i<bars.length;i++){const f=35*Math.pow(12000/35,i/bars.length);const energy=spectrumEnergy(INTRO.bins,AC?.sampleRate||48000,2048,f,f*1.18);bars[i].style.transform=`scaleY(${motion?Math.max(.05,energy*audible):.1})`;}
 if(INTRO.active)drawMusicSpectrum(now,motion,audible);
 if(playing&&AC.currentTime>=INTRO.fadeEnd&&INTRO.active)introMessage('LUV U NEED U · ARENA READY');
 const readout=$('music-level');if(readout)readout.textContent=Math.round(playing?INTRO.music*fade*100:0)+'%';
}
