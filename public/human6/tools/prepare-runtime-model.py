"""Remove only embedded maps replaced by applySkin; preserve geometry and teeth.
Run from any directory. Original authoring GLB stays intact beside the runtime GLB.
"""
import copy, hashlib, json, struct
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'assets/mira.glb'; target=root/'assets/mira-runtime-20.3.glb'
raw=source.read_bytes(); size,kind=struct.unpack_from('<II',raw,12); assert kind==0x4e4f534a
original=json.loads(raw[20:20+size]); doc=copy.deepcopy(original)
bin_size,kind=struct.unpack_from('<II',raw,20+size); assert kind==0x004e4942
binary=raw[28+size:28+size+bin_size]
replaced={'Std_Skin_Head','Std_Skin_Body','Std_Skin_Arm','Std_Skin_Leg','Std_Nails','Std_Eyelash','Std_Eye_L','Std_Eye_R','Default_Material_Transparency'}
for mat in doc['materials']:
 if mat['name'] not in replaced: continue
 for key in ('normalTexture','occlusionTexture','emissiveTexture'): mat.pop(key,None)
 for key in ('baseColorTexture','metallicRoughnessTexture'): mat.get('pbrMetallicRoughness',{}).pop(key,None)
def texture_refs(value):
 if isinstance(value,dict):
  for k,v in value.items():
   if k.endswith('Texture') and isinstance(v,dict) and 'index' in v: yield v
   else: yield from texture_refs(v)
 elif isinstance(value,list):
  for v in value: yield from texture_refs(v)
refs=list(texture_refs(doc['materials'])); textures=sorted({v['index'] for v in refs}); images=sorted({doc['textures'][i]['source'] for i in textures})
for v in refs: v['index']=textures.index(v['index'])
doc['textures']=[doc['textures'][i] for i in textures]
for t in doc['textures']: t['source']=images.index(t['source'])
doc['images']=[doc['images'][i] for i in images]
removed={image['bufferView'] for i,image in enumerate(original['images']) if i not in images}
kept=[i for i in range(len(doc['bufferViews'])) if i not in removed]; mapping={old:new for new,old in enumerate(kept)}; output=bytearray(); views=[]
for i in kept:
 v=copy.deepcopy(doc['bufferViews'][i]); offset=v.get('byteOffset',0); chunk=binary[offset:offset+v['byteLength']]
 output.extend(b'\0'*(-len(output)%4));v['byteOffset']=len(output);output.extend(chunk);views.append(v)
def remap(value):
 if isinstance(value,dict):
  for k,v in list(value.items()):
   if k=='bufferView': value[k]=mapping[v]
   else: remap(v)
 elif isinstance(value,list):
  for v in value: remap(v)
remap(doc);doc['bufferViews']=views;output.extend(b'\0'*(-len(output)%4));doc['buffers'][0]['byteLength']=len(output)
# Every original accessor must still read identical bytes, including morph targets.
for a,b in zip(original['accessors'],doc['accessors']):
 if 'bufferView' not in a: continue
 av=original['bufferViews'][a['bufferView']]; bv=doc['bufferViews'][b['bufferView']]
 assert binary[av.get('byteOffset',0):av.get('byteOffset',0)+av['byteLength']]==output[bv['byteOffset']:bv['byteOffset']+bv['byteLength']]
encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*(-len(encoded)%4)
result=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(output))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(output),0x004e4942)+output;target.write_bytes(result)
report={'source':source.name,'sourceSha256':hashlib.sha256(raw).hexdigest(),'runtime':target.name,'runtimeSha256':hashlib.sha256(result).hexdigest(),'beforeBytes':len(raw),'afterBytes':len(result),'beforeEmbeddedImages':len(original['images']),'afterEmbeddedImages':len(doc['images']),'verifiedAccessors':len(doc['accessors']),'geometryChanged':False,'externalAppearanceMapsChanged':False}
(root/'H6-tests/runtime-model-integrity.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
