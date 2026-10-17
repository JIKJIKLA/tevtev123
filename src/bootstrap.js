// Independent bootstrap diagnostics remain available even if the engine fails.
window.tevinBoot={ready:false,error:'',stage:'engine bundle not reached'};
window.tevinBoot.show=function(message){var el=document.getElementById('boot-status');if(el)el.textContent=message;};
addEventListener('error',function(event){if(!event.message)return;window.tevinBoot.error=event.message;window.tevinBoot.show('Game error: '+event.message+' (line '+event.lineno+').');});
addEventListener('unhandledrejection',function(event){var message=String(event.reason&&event.reason.message||event.reason);window.tevinBoot.error=message;window.tevinBoot.show('Game error: '+message);});
addEventListener('DOMContentLoaded',function(){if(document.getElementById('source-template-notice'))return;var boot=window.tevinBoot;if(boot.error)boot.show('Startup failed at '+boot.stage+': '+boot.error);else if(!boot.ready)boot.show('Startup stopped at '+boot.stage+'. Engine: '+typeof window.TevinEngine+'. Game script: '+(document.getElementById('tevin-game')?'present':'missing')+'.');});
