// Training preferences never become standard-match rules or online settings.
const TRAINING_SESSION={original:null};
const TRAINING_PREF={unlimited:true,allies:0,enemies:0};
try{const p=JSON.parse(localStorage.getItem('nivet.training.v1')||'null');if(p&&typeof p==='object'){if(typeof p.unlimited==='boolean')TRAINING_PREF.unlimited=p.unlimited;for(const k of ['allies','enemies'])if(Number.isInteger(p[k])&&p[k]>=0&&p[k]<=3)TRAINING_PREF[k]=p[k];}}catch(_){}
function beginTrainingSettings(){if(MP.active||window.__TEVIN_SERVER__)return false;if(!TRAINING_SESSION.original)TRAINING_SESSION.original={unlimited:cfg.unlimited,allies:cfg.allies,enemies:cfg.enemies};cfg.unlimited=RIVALS.queuePractice?true:TRAINING_PREF.unlimited;cfg.allies=RIVALS.queuePractice?0:cl(TRAINING_PREF.allies,0,cfg.size-1);cfg.enemies=RIVALS.queuePractice?0:cl(TRAINING_PREF.enemies,0,cfg.size);return true;}
function saveTrainingSettings(kind='all'){if(!sandbox||MP.active||RIVALS.queuePractice)return false;if(kind!=='roster')TRAINING_PREF.unlimited=!!cfg.unlimited;if(kind!=='boost'){TRAINING_PREF.allies=cfg.allies;TRAINING_PREF.enemies=cfg.enemies;}try{localStorage.setItem('nivet.training.v1',JSON.stringify(TRAINING_PREF));}catch(_){}return true;}
function endTrainingSettings(restore=true){if(TRAINING_SESSION.original&&restore)Object.assign(cfg,TRAINING_SESSION.original);TRAINING_SESSION.original=null;}
function readyFreePlay(){if(!sandbox||MP.active)return false;finishOpening();st='PLAY';cnt=0;mt=0;$('msg').style.opacity=0;for(const c of cars)if(c.enabled&&cfg.unlimited)c.boost=100;return true;}
