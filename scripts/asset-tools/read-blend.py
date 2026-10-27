"""Read static SDNA mesh data only. Never executes scripts stored in the blend file."""
import struct, re, json, os, sys, math
from collections import Counter

class Blend:
 def __init__(self,path):
  self.data=open(path,'rb').read();assert self.data[:7]==b'BLENDER'
  assert self.data[7:9]==b'-v','Expected 64-bit little-endian blend'
  self.blocks=[];offset=12;owner=None;self.context=None
  while offset+24<=len(self.data):
   code,size,address,sdna,count=struct.unpack_from('<4sIQII',self.data,offset);offset+=24
   if code!=b'DATA':owner=offset
   self.blocks.append(dict(code=code.rstrip(b'\0').decode(),offset=offset,size=size,address=address,sdna=sdna,count=count,owner=owner));offset+=size
   if code==b'ENDB':break
  dna=next(b for b in self.blocks if b['code']=='DNA1');self._dna(dna['offset']);self.lookup={}
  for b in self.blocks:
   if b['address']:self.lookup.setdefault(b['address'],[]).append(b)
 def _dna(self,o):
  d=self.data;assert d[o:o+8]==b'SDNANAME';o+=8;n=struct.unpack_from('<I',d,o)[0];o+=4;self.names=[]
  for _ in range(n):end=d.index(0,o);self.names.append(d[o:end].decode());o=end+1
  o=(o+3)&~3;assert d[o:o+4]==b'TYPE';o+=4;n=struct.unpack_from('<I',d,o)[0];o+=4;self.types=[]
  for _ in range(n):end=d.index(0,o);self.types.append(d[o:end].decode());o=end+1
  o=(o+3)&~3;assert d[o:o+4]==b'TLEN';o+=4;self.sizes=struct.unpack_from('<'+'H'*n,d,o);o+=2*n;o=(o+3)&~3;assert d[o:o+4]==b'STRC';o+=4;n=struct.unpack_from('<I',d,o)[0];o+=4;self.structs=[];self.bytype={}
  for _ in range(n):
   ti,ct=struct.unpack_from('<HH',d,o);o+=4;fields={};pos=0
   for _ in range(ct):
    typ,ni=struct.unpack_from('<HH',d,o);o+=4;name=self.names[ni];array=math.prod(int(x) for x in re.findall(r'\[(\d+)\]',name));ptr='*' in name;key=re.sub(r'\[.*','',name).replace('*','').strip('()');size=(8 if ptr else self.sizes[typ])*array
    fields[key]=dict(offset=pos,size=size,typ=self.types[typ],pointer=ptr,count=array,name=name);pos+=size
   item=dict(name=self.types[ti],size=self.sizes[ti],fields=fields,measured=pos);self.structs.append(item);self.bytype[item['name']]=item
 def block(self,pointer):
  if not pointer:return None
  matches=self.lookup.get(pointer,[])
  if matches:return next((b for b in matches if b['owner']==self.context),matches[0])
  for b in self.blocks:
   if b['address']<=pointer<b['address']+b['size']:return {**b,'offset':b['offset']+pointer-b['address'],'address':pointer}
  raise ValueError('Unresolved address '+str(pointer))
 def value(self,block,field,typ=None,index=0):
  s=self.bytype[typ] if typ else self.structs[block['sdna']];parts=field.split('.');o=block['offset']+index*s['size']
  for name in parts:
   f=s['fields'].get(name)
   if not f:return None
   o+=f['offset']
   if name!=parts[-1]:s=self.bytype[f['typ']]
  if f['pointer']:return struct.unpack_from('<Q',self.data,o)[0]
  if f['typ']=='char':return self.data[o:o+f['size']].split(b'\0')[0].decode('utf8',errors='replace') if f['count']>1 else self.data[o]
  fmt={'float':'f','double':'d','int':'i','short':'h','ushort':'H','uint':'I','int64_t':'q','uint64_t':'Q','uchar':'B'}.get(f['typ'])
  if fmt:
   out=struct.unpack_from('<'+fmt*f['count'],self.data,o);return out[0] if f['count']==1 else out
  return dict(block=block,offset=o,type=f['typ'])

if __name__=='__main__':
 b=Blend(sys.argv[1]);out={'version':b.data[9:12].decode(),'meshes':[],'objects':[],'materials':[],'structures':{t:b.bytype[t] for t in ['Mesh','MVert','MLoop','MPoly','MLoopUV','CustomData','CustomDataLayer','Object']}}
 for block in b.blocks:
  typ=b.structs[block['sdna']]['name']
  if block['code']=='ME':out['meshes'].append({k:b.value(block,k) for k in ['id.name','totvert','totloop','totpoly','mvert','mloop','mpoly','mloopuv','totcol','mat','ldata.totlayer','ldata.layers']})
  if block['code']=='OB':out['objects'].append({k:b.value(block,k) for k in ['id.name','type','data','obmat','loc','rot','size','visibility_flag','restrictflag']})
  if block['code']=='MA':out['materials'].append({k:b.value(block,k) for k in ['id.name','r','g','b','roughness','metallic','nodetree']})
 path=os.path.join(os.path.dirname(__file__),'f22-static-inventory.json');json.dump(out,open(path,'w'),indent=2);print(json.dumps({k:v for k,v in out.items() if k!='structures'},indent=2))
