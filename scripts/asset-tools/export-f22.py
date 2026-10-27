"""Convert the supplied static aircraft to compact buffers without loading any Blender code."""
import os, sys, json, struct, math, base64
from collections import Counter
from importlib.machinery import SourceFileLoader
from PIL import Image, ImageDraw
Blend=SourceFileLoader('blend_data',os.path.join(os.path.dirname(__file__),'read-blend.py')).load_module().Blend
base=os.path.dirname(__file__);input_dir=os.path.abspath(sys.argv[1]);b=Blend(os.path.join(input_dir,'source/F22Raptor.blend'))
out=os.path.abspath(sys.argv[2]) if len(sys.argv)>2 else os.path.abspath(os.path.join(base,'../../src/assets'));os.makedirs(out,exist_ok=True)
def sub(a,c):return tuple(a[i]-c[i] for i in range(3))
def cross(a,c):return (a[1]*c[2]-a[2]*c[1],a[2]*c[0]-a[0]*c[2],a[0]*c[1]-a[1]*c[0])
def unit(v):
 n=math.sqrt(sum(x*x for x in v));return tuple(x/n for x in v) if n>1e-12 else (0,1,0)
def encoded(fmt,values):return base64.b64encode(struct.pack('<'+fmt*len(values),*values)).decode()
raw=[]
for mesh in b.blocks:
 if mesh['code']!='ME':continue
 b.context=mesh['offset']
 name=b.value(mesh,'id.name')[2:]
 if 'landingOn' in name:continue  # Flyby uses the supplied retracted-gear configuration.
 vb=b.block(b.value(mesh,'mvert'));lb=b.block(b.value(mesh,'mloop'));pb=b.block(b.value(mesh,'mpoly'));layers=b.block(b.value(mesh,'ldata.layers'));uvb=None
 for i in range(b.value(mesh,'ldata.totlayer')):
  if b.value(layers,'type',typ='CustomDataLayer',index=i)==16:uvb=b.block(b.value(layers,'data',typ='CustomDataLayer',index=i));break
 assert uvb,'Expected UV texture coordinates'
 positions=[b.value(vb,'co',typ='MVert',index=i) for i in range(b.value(mesh,'totvert'))]
 loops=[b.value(lb,'v',typ='MLoop',index=i) for i in range(b.value(mesh,'totloop'))]
 uvs=[b.value(uvb,'uv',typ='MLoopUV',index=i) for i in range(len(loops))]
 triangles=[];sums=[[0,0,0] for _ in positions]
 for i in range(b.value(mesh,'totpoly')):
  first=b.value(pb,'loopstart',typ='MPoly',index=i);count=b.value(pb,'totloop',typ='MPoly',index=i);smooth=b.value(pb,'flag',typ='MPoly',index=i)&1
  for j in range(1,count-1):
   corners=(first,first+j,first+j+1);ids=[loops[l] for l in corners];n=cross(sub(positions[ids[1]],positions[ids[0]]),sub(positions[ids[2]],positions[ids[0]]));triangles.append((corners,unit(n),smooth))
   for v in ids:
    for k in range(3):sums[v][k]+=n[k]
 normals=[unit(s) for s in sums]
 raw.append(dict(name=name,p=positions,loops=loops,uvs=uvs,triangles=triangles,normals=normals))
allp=[p for m in raw for p in m['p']];lo=[min(p[i] for p in allp) for i in range(3)];hi=[max(p[i] for p in allp) for i in range(3)];center=[(lo[i]+hi[i])/2 for i in range(3)];scale=18.9/max(hi[0]-lo[0],hi[2]-lo[2])
meshes=[];preview=[]
for m in raw:
 positions=[tuple((p[i]-center[i])*scale for i in range(3)) for p in m['p']];low=[min(p[i] for p in positions) for i in range(3)];span=[max(p[i] for p in positions)-low[i] for i in range(3)];span=[max(s,1e-6) for s in span]
 unique={};P=[];N=[];UV=[];I=[]
 for corners,n,smooth in m['triangles']:
  tri=[];tuv=[]
  for l in corners:
   v=m['loops'][l];uv=m['uvs'][l];normal=m['normals'][v] if smooth else n;quantn=tuple(round(x*127) for x in normal);quv=tuple(round(max(0,min(1,x))*65535) for x in uv);key=(v,quv,quantn)
   if key not in unique:
    unique[key]=len(P)//3;P.extend(round((positions[v][i]-low[i])/span[i]*65535)-32768 for i in range(3));N.extend(quantn);UV.extend(quv)
   I.append(unique[key]);tri.append(positions[v]);tuv.append(uv)
  preview.append((tri,n,tuv,m['name']))
 assert len(P)//3<65536
 meshes.append(dict(name=m['name'],vertices=len(P)//3,triangles=len(I)//3,min=low,span=span,p=encoded('h',P),n=encoded('b',N),uv=encoded('H',UV),index=encoded('H',I)))
manifest=dict(format='tevin-static-mesh-v1',source='User supplied F22Raptor.blend (Blender 3.6)',length=18.9,bounds=[[float((lo[i]-center[i])*scale) for i in range(3)],[float((hi[i]-center[i])*scale) for i in range(3)]],meshes=meshes)
json.dump(manifest,open(os.path.join(out,'f22-jet.json'),'w'),separators=(',',':'))
textures=os.path.join(input_dir,'textures');image=Image.open(os.path.join(textures,'BaseColor.png')).convert('RGB');image.resize((1536,1536),Image.Resampling.LANCZOS).save(os.path.join(out,'f22-albedo.jpg'),quality=88,optimize=True)
normal=Image.open(os.path.join(textures,'Normal.png')).convert('RGB');normal.resize((1024,1024),Image.Resampling.LANCZOS).save(os.path.join(out,'f22-normal.jpg'),quality=92,optimize=True)
metal=Image.open(os.path.join(textures,'Metallic-Roughness@channels=B.png')).convert('L').resize((768,768),Image.Resampling.LANCZOS);rough=Image.open(os.path.join(textures,'Metallic-Roughness@channels=G.png')).convert('L').resize((768,768),Image.Resampling.LANCZOS);Image.merge('RGB',(Image.new('L',(768,768),255),rough,metal)).save(os.path.join(out,'f22-surface.jpg'),quality=90,optimize=True)
# A data-only software preview verifies shape/orientation before the game renderer is involved.
eye=(23,17,26);forward=unit(tuple(-x for x in eye));right=unit(cross(forward,(0,1,0)));up=cross(right,forward)
def dot(a,c):return sum(a[i]*c[i] for i in range(3))
def project(p):return (450+dot(p,right)*31,330-dot(p,up)*31)
im=Image.new('RGB',(900,650),(23,35,51));draw=ImageDraw.Draw(im);texture=image.resize((512,512))
for tri,n,uvs,name in sorted(preview,key=lambda t:sum(dot(p,forward) for p in t[0]),reverse=True):
 uv=tuple(sum(u[k] for u in uvs)/3 for k in range(2));pixel=texture.getpixel((max(0,min(511,int(uv[0]*511))),max(0,min(511,int((1-uv[1])*511)))))
 light=.42+.58*max(0,dot(n,unit((.4,1,.6))));color=tuple(int(c*light) for c in pixel)
 if 'canopy' in name:color=(113,135,149)
 draw.polygon([project(p) for p in tri],fill=color)
im.save(os.path.join(out,'f22-software-preview.png'))
print(json.dumps({'boundsRaw':[lo,hi],'boundsMeters':manifest['bounds'],'meshes':[{'name':m['name'],'vertices':m['vertices'],'triangles':m['triangles']} for m in meshes],'assetBytes':{n:os.path.getsize(os.path.join(out,n)) for n in ['f22-jet.json','f22-albedo.jpg','f22-normal.jpg','f22-surface.jpg']}},indent=2))
