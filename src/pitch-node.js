// TSL bridge in the pinned engine closure. No second copy of three.js is loaded.
function nivetPitchDetail(material,detail,repeat){
 const {texture,uv,vec2,vec3}=h,grain=texture(detail,uv().mul(vec2(repeat.x,repeat.y))).rgb;
 const contrast=grain.dot(vec3(.2126,.7152,.0722)).mul(.65).add(.86).clamp(.88,1.12);
 material.colorNode=texture(material.map).rgb.mul(contrast);return material;
}
