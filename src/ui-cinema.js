function setupCinemaUI(){
 const cards=[
  ['quick','QUICK MATCH','Find real opponents','<path d="M14 18h20v12H14zM30 37h20v12H30zM24 10l-6 8 6 8M40 41l6 8-6 8"/>'],
  ['offline','VS AI','Your team against bots','<path d="M11 35l6-11h29l7 11v12H11zM20 24l5-9h12l5 9M11 36h42"/><circle cx="20" cy="47" r="4"/><circle cx="44" cy="47" r="4"/>'],
  ['online','PRIVATE MATCH','Invite friends with a code','<path d="M32 8l21 8v17c0 11-21 23-21 23S11 44 11 33V16zM23 30h18v15H23zM26 30v-5a6 6 0 0112 0v5"/>'],
  ['training','SANDBOX','Free play and skill drills','<circle cx="32" cy="32" r="20"/><path d="M32 20l12 9-5 14H25l-5-14zM32 12v8M12 29l8 1M20 49l5-6M44 49l-5-6M52 29l-8 1"/>']
 ];
 for(const [id,title,description,icon] of cards){const button=$('choose-'+id);button.innerHTML='<svg class="mode-glyph" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icon+'</svg><strong>'+title+'</strong><small>'+description+'</small><span class="mode-check" aria-hidden="true">✓ SELECTED</span>';}
 const heading=$('play-panel').querySelector('h2');if(heading)heading.textContent='CHOOSE YOUR MATCH';
 const skip=$('replay-skip')||$('skip-replay');if(skip)skip.textContent='BACK TO LIVE';document.body.dataset.presentation='cinema-99';
}
