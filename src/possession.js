// The first attacker wins playable touches; teammates retain passing/cover lanes.
function possessionPlan(c,kick,urgent){
 c.ai.control=false;
 if(cfg.mode!==0||kick||urgent||teamRole(c)!==0)return;
 const ai=c.ai,atk=c.team?-1:1,p=ai.intercept;
 const dx=p.x-c.p.x,dz=p.z-c.p.z,dist=Math.hypot(dx,dz);
 const ahead=dz*atk,ownDanger=ball.p.z*atk<-HZ+9;
 // Never deliberately carry the ball back through our own goal.
 if(ahead<-.8||ownDanger&&ahead<1||dist>18||p.y>3.2)return;
 ai.mode='COMMIT';ai.commit=Math.max(ai.commit,.32);
 ai.control=dist<5&&ahead>0&&p.y<1.8&&nearestOpponent(c).p.distanceToSquared(ball.p)>100&&Math.abs(ball.p.x)<HX-5;
 ai.target.copy(p);ai.target.z+=atk*.65;
 // A short lead produces a touch before the ball rolls past the bumper.
 if(dist<7){ai.target.x=ball.p.x+ball.v.x*.12;ai.target.z=ball.p.z+ball.v.z*.12+atk*.65;}
}
function arenaBotTarget(c){
 const p=c.ai.target;
 // The same signed arena boundary handles ramps, rounded corners and goal mouths.
 // Keep navigation points inside it rather than aiming through a back wall.
 p.y=Math.max(.8,p.y);
 for(let i=0;i<10;i++){surf(p);if(SS>=.8)break;p.addScaledVector(SN,.8-SS+.001);}
 // A car outside a goal mouth must route through the opening before chasing inside.
 if(Math.abs(c.p.x)>GX-1.4&&Math.abs(p.z)>HZ-1.5&&Math.abs(p.x)<GX){p.z=Math.sign(p.z)*(HZ-3);p.x=cl(p.x,-GX+1.8,GX-1.8);}
}
