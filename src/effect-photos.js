// Original, unmodified CC0 Kenney smoke-particle PNGs; see docs/MATCHDAY-10.3.0.md.
async function loadEffectPhotos(){
 const names=['fire','smoke','dust'],urls=['FXPHOTO:fire','FXPHOTO:smoke','FXPHOTO:dust'],result={};
 const loaded=await Promise.allSettled(urls.map(url=>new THREE.TextureLoader().loadAsync(url)));
 loaded.forEach((r,i)=>{if(r.status!=='fulfilled')return;const t=r.value;t.colorSpace=THREE.SRGBColorSpace;t.name='CC0 Kenney '+names[i];t.anisotropy=2;result[names[i]]=t;});return result;
}
