// The title and Settings control the same opt-in track and saved volume.
function setupMusicSettings(){
 if($('music-volume'))return;const group=document.createElement('div');group.className='menu-music-controls';
 group.innerHTML='<label for="music-volume">MENU MUSIC VOLUME <output id="music-volume-value">100%</output></label><input id="music-volume" type="range" min="0" max="100" value="100"><button id="music-toggle" class="inline-action" type="button">PLAY MUSIC</button><p id="music-playback-status" role="status" aria-live="polite"></p>';
 const label=document.querySelector('label[for="audio-master"]');label.parentNode.insertBefore(group,label);
}
function syncMusicSettings(){
 const playing=!!INTRO.media&&!INTRO.media.paused&&AC?.state==='running',volume=Math.round(INTRO.music*100);
 for(const id of ['intro-volume','music-volume']){const input=$(id);if(input&&Number(input.value)!==volume)input.value=volume;}
 if($('music-volume-value'))$('music-volume-value').textContent=volume+'%';
 const toggle=$('music-toggle');if(toggle){toggle.disabled=!INTRO.enabled;toggle.textContent=playing?'PAUSE MUSIC':INTRO.started?'RESUME MUSIC':'PLAY MUSIC';toggle.setAttribute('aria-pressed',String(playing));}
 if($('music-playback-status'))$('music-playback-status').textContent=!INTRO.enabled?'Music is off. Enable it above to listen.':AUDIO.settings.muted?'Music enabled · all sound is muted.':playing?'Playing · your volume is saved.':'Music paused · use '+(INTRO.started?'Resume':'Play')+' Music to listen.';
 if($('intro-sound'))$('intro-sound').textContent=playing?'PAUSE MUSIC':'RESUME MUSIC';
 document.body.classList.toggle('music-playing',playing);
}
function setMusicVolume(value){
 const volume=Number(value);if(!Number.isFinite(volume))return false;
 INTRO.music=cl(volume/100,0,1);introPreferences();syncMusicSettings();return true;
}
function toggleMenuMusic(){
 if(!INTRO.enabled||st!=='MENU')return false;
 if(INTRO.media&&!INTRO.media.paused&&AC?.state==='running'){INTRO.manualPause=true;INTRO.attempt++;INTRO.media.pause();introMessage('MUSIC PAUSED · CHOOSE PLAY WHEN YOU’RE READY');syncMusicSettings();}
 else{INTRO.manualPause=false;return introStart();}
 return true;
}
