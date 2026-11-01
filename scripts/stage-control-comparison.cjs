// Developer-only matched captures. No production physics/material overrides.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const input=path.resolve(process.argv[2]||'index.html'),output=path.resolve(process.argv[3]||'../../outputs/control-repair-after.html');
cp.execFileSync(process.execPath,[path.join(__dirname,'stage-lighting-preview.cjs'),input,output],{stdio:'ignore'});let html=fs.readFileSync(output,'utf8');
html=html.replace('const LIGHTING_REVIEW={ready:false};','const LIGHTING_REVIEW={ready:false,frames:0};');
html=html.replace('function lightingReviewPose(view){',`function lightingReviewPose(view){LIGHTING_REVIEW.frames=0;for(const u of GU.layers||[GU])u.t.value=0;`);
html=html.replace('cameraAnchorReady=false;\n}',`cameraAnchorReady=false;
 if(view==='goal'){c.p.set(0,bodyPhysics(c).height,35);ball.p.set(2,2.3,48);}
 if(view==='corner'){c.p.set(35,bodyPhysics(c).height,45);ball.p.set(28,2.3,38);}
 if(view==='wall'){c.p.set(40,5,0);c.n.set(-1,0,0);c.ground=1;c.wheelsOn=4;c.q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new V3(0,0,1),new V3(-1,0,0),new V3(0,-1,0)));ball.p.set(30,4,12);}
 c.prevP.copy(c.p);c.frameP.copy(c.p);c.prevQ.copy(c.q);c.frameQ.copy(c.q);ball.prevP.copy(ball.p);ball.frameP.copy(ball.p);cameraAnchorReady=false;
}`);
html=html.replace("DEVICE.preference='keyboard';setDeviceInput('keyboard');cfg.hi=",`DEVICE.preference='keyboard';setDeviceInput('keyboard');Object.assign(cameraSettings,{fov:110,distance:2.7,height:1,angle:3,stiffness:.55,shake:false});cfg.body=0;cfg.color=0;cfg.paint=null;cfg.teamColors=true;cfg.hi=`);
html=html.replace("presentationDelta=0;updateAudio();render(1/60);return;",`presentationDelta=0;if(LIGHTING_REVIEW.frames<120){render(1/60);if(++LIGHTING_REVIEW.frames===120){const e=document.createElement('output');e.id='comparison-state';e.hidden=true;e.textContent=JSON.stringify({build:BUILD,view:new URLSearchParams(location.search).get('view')||'center',quality:cfg.hi?'Detail':'Chromebook',camera:cam.position.toArray(),quaternion:cam.quaternion.toArray(),fov:cam.fov,car:cm[0].position.toArray(),carQuaternion:cm[0].quaternion.toArray(),ball:bm.position.toArray(),viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,buffer:[ren.domElement.width,ren.domElement.height],frames:120});document.getElementById(e.id)?.remove();document.body.appendChild(e);document.body.dataset.comparison='complete';}}return;`);
fs.writeFileSync(output,html);console.log(output);
