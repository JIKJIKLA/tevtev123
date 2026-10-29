// Device-local backups are data only: never import controls, network or match rules.
const PROGRESS_IMPORT={pending:null,busy:false},PROGRESS_LIMIT=128*1024;
function readProgressBackup(text){
 if(typeof text!=='string'||text.length>PROGRESS_LIMIT)throw Error('Choose a Nivet progress JSON file smaller than 128 KB.');
 let data;try{data=JSON.parse(text)}catch(_){throw Error('This file is not valid JSON. Your progress was not changed.')}
 const c=data?.career;if(data?.version!==1||!c||typeof c!=='object'||Array.isArray(c))throw Error('This is not a supported Nivet progress backup.');
 const result={};for(const key of ['matches','wins','goals','touches','topSpeed','xp','drills']){
  const n=c[key];if(!Number.isFinite(n)||n<0||n>1e9||key!=='topSpeed'&&!Number.isInteger(n))throw Error('The backup contains invalid progress totals.');result[key]=n;
 }
 if(result.wins>result.matches||!Array.isArray(c.history)||c.history.length>20||!Array.isArray(c.presets)||c.presets.length!==3)throw Error('The backup contains invalid history or garage slots.');
 result.history=c.history.map(h=>{
  if(!h||!['WIN','LOSS'].includes(h.result)||![1,2,3].includes(h.size)||!['Soccar','Heatseeker'].includes(h.mode)||typeof h.score!=='string'||!/^\d{1,5}[–-]\d{1,5}$/.test(h.score)||typeof h.at!=='string'||h.at.length>32||!Number.isFinite(Date.parse(h.at))||!Number.isInteger(h.goals)||h.goals<0||h.goals>1e5||typeof h.online!=='boolean')throw Error('The backup contains an invalid match record.');
  return {at:h.at,mode:h.mode,size:h.size,online:h.online,result:h.result,score:h.score,goals:h.goals};
 });
 result.presets=c.presets.map(p=>{
  if(p===null)return null;
  if(!p||typeof p.name!=='string'||p.name.length>80||!Number.isInteger(p.body)||p.body<0||p.body>2||!Number.isInteger(p.color)||p.color<0||p.color>7||p.paint!=null&&!validPaint(p.paint)||!['pulse','comet','quiet'].includes(p.celebration))throw Error('The backup contains an invalid garage slot.');
  return {name:p.name,body:p.body,color:p.color,paint:normalizedPaint(p.paint),celebration:p.celebration};
 });
 return result;
}
function progressImportReady(){return st==='MENU'&&!MP.active&&!SOC.searching&&!starting&&!LOADING.active;}
function progressImportMessage(text){if($('progress-import-status'))$('progress-import-status').textContent=text;}
function cancelProgressImport(){PROGRESS_IMPORT.pending=null;if($('progress-import-preview'))$('progress-import-preview').hidden=true;}
function stageProgressImport(text){
 cancelProgressImport();if(!progressImportReady()){progressImportMessage('Return to the lobby and leave matchmaking before restoring progress.');return false;}
 try{PROGRESS_IMPORT.pending=readProgressBackup(text);const c=PROGRESS_IMPORT.pending,slots=c.presets.filter(Boolean).length;$('progress-import-summary').textContent=c.matches+' matches · '+c.wins+' wins · '+c.xp+' XP · '+slots+' garage slot'+(slots===1?'':'s')+'. Restoring replaces your current local stats and saved slots.';$('progress-import-preview').hidden=false;progressImportMessage('Backup checked. Confirm Restore to use it, or Cancel to keep your current progress.');return true;}
 catch(error){progressImportMessage(error.message);return false;}
}
function restoreProgress(){
 if(!PROGRESS_IMPORT.pending||!progressImportReady())return false;
 const previous={...CAREER},title=RIVAL_PREF.title;Object.assign(CAREER,PROGRESS_IMPORT.pending);if(!earnedTitles().includes(RIVAL_PREF.title))RIVAL_PREF.title='ROOKIE';
 if(!saveRivals()){Object.assign(CAREER,previous);RIVAL_PREF.title=title;progressImportMessage('Browser storage is unavailable. Your current progress was kept.');return false;}
 cancelProgressImport();renderCareer();progressImportMessage('Progress restored on this device. Your controls, current car and match rules were kept.');return true;
}
function setupProgressImport(){
 if($('import-progress'))return;const group=document.createElement('div');group.className='progress-import';
 group.innerHTML='<button id="import-progress" type="button">RESTORE EXPORTED PROGRESS</button><input id="progress-file" type="file" accept="application/json,.json" hidden><div id="progress-import-preview" hidden><p id="progress-import-summary"></p><button id="progress-import-confirm" type="button">CONFIRM RESTORE</button><button id="progress-import-cancel" type="button">CANCEL</button></div><p id="progress-import-status" role="status" aria-live="polite"></p>';
 const exportButton=$('export-progress');exportButton.parentNode.insertBefore(group,exportButton.nextSibling);
 $('import-progress').onclick=()=>{if(!progressImportReady())return;cancelProgressImport();$('progress-file').click()};
 $('progress-import-confirm').onclick=restoreProgress;$('progress-import-cancel').onclick=()=>{cancelProgressImport();progressImportMessage('Restore cancelled. Your progress was kept.')};
 $('progress-file').onchange=async()=>{const input=$('progress-file'),file=input.files?.[0];input.value='';if(!file||PROGRESS_IMPORT.busy)return;cancelProgressImport();if(file.size>PROGRESS_LIMIT){progressImportMessage('Choose a progress file smaller than 128 KB.');return;}
  PROGRESS_IMPORT.busy=true;$('import-progress').disabled=true;try{stageProgressImport(await file.text())}catch(_){progressImportMessage('Could not read this file. Your progress was kept.')}finally{PROGRESS_IMPORT.busy=false;$('import-progress').disabled=false;}
 };
}
