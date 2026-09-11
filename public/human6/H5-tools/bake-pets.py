"""Original breed meshes. Offline smooth-union sculpt; no runtime voxel meshing.
Requires numpy/scipy/scikit-image. Bind frame matches src/dog/Dog.js (+Z forward).
"""
import numpy as np,json,base64
from skimage.measure import marching_cubes
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
NAMES=['Root','Spine','Chest','Neck','Head','Jaw']+[f'Tail{i}' for i in range(6)]+[s+'_'+n for s in ['L','R'] for n in ['Shoulder','UpperArm','ForeArm','Paw']]+[s+'_'+n for s in ['L','R'] for n in ['Hip','Thigh','Calf','Foot']]
B={'Root':[0,0,0],'Spine':[0,.445,-.12],'Chest':[0,.46,.19],'Neck':[0,.605,.285],'Head':[0,.715,.365],'Jaw':[0,.686,.420]}
for i,p in enumerate([[0,.49,-.35],[0,.46,-.425],[0,.40,-.49],[0,.325,-.54],[0,.25,-.58],[0,.19,-.615]]):B[f'Tail{i}']=p
for s,x in [('L',.115),('R',-.115)]:
 for n,y,z in [('Shoulder',.515,.22),('UpperArm',.425,.18),('ForeArm',.25,.205),('Paw',.060,.26),('Hip',.47,-.265),('Thigh',.35,-.22),('Calf',.19,-.365),('Foot',.055,-.295)]:B[s+'_'+n]=[x,y,z]
BREEDS={
 'labrador':dict(name='Labrador Retriever',species='dog',scale=1.,bulk=1.,head=[.102,.097,.112],headCenter=[0,.746,.398],muzzle=[.071,.037,.078],muzzleCenter=[0,.701,.493],ear='drop',earLength=.15,coat='yellow',eye=0x6b3918,fur=.65,speed=1.,sociability=.9,voice=1.,carry=9,gait=1.,note='Broad chest, otter tail, soft drop ears; sociable fetch companion.'),
 'beagle':dict(name='Beagle',species='dog',scale=.72,bulk=.88,head=[.098,.092,.109],headCenter=[0,.752,.400],muzzle=[.058,.035,.078],muzzleCenter=[0,.705,.496],ear='drop',earLength=.215,coat='tricolor',eye=0x51341e,fur=.6,speed=.94,sociability=.8,voice=1.14,carry=4,gait=1.16,note='Compact hound, long rounded ears, tricolor saddle; curious scent explorer.'),
 'shepherd':dict(name='German Shepherd',species='dog',scale=1.08,bulk=.90,head=[.084,.096,.112],headCenter=[0,.757,.408],muzzle=[.047,.034,.100],muzzleCenter=[0,.710,.524],ear='upright',earLength=.105,coat='saddle',eye=0x56331b,fur=1.15,speed=1.12,sociability=.65,voice=.88,carry=11,gait=.95,note='Longer wedge muzzle, erect ears, sable saddle; alert and athletic.'),
 'british':dict(name='British Shorthair',species='cat',scale=.50,bulk=.87,head=[.121,.107,.087],headCenter=[0,.738,.371],muzzle=[.038,.024,.039],muzzleCenter=[0,.704,.440],ear='upright',earLength=.095,coat='blue',eye=0xcc8631,fur=.90,speed=.82,sociability=.45,voice=.90,carry=2,gait=.90,note='Round cheeks, stocky body, dense blue coat; calm and unhurried.'),
 'siamese':dict(name='Siamese',species='cat',scale=.47,bulk=.65,head=[.083,.090,.095],headCenter=[0,.746,.375],muzzle=[.032,.022,.047],muzzleCenter=[0,.712,.446],ear='upright',earLength=.115,coat='points',eye=0x639bcc,fur=.40,speed=1.15,sociability=.98,voice=1.12,carry=1.6,gait=1.1,note='Lean body, wedge head, large ears, blue eyes and seal points; social and vocal.'),
 'maine':dict(name='Maine Coon',species='cat',scale=.61,bulk=.92,head=[.105,.103,.100],headCenter=[0,.752,.382],muzzle=[.044,.028,.044],muzzleCenter=[0,.711,.453],ear='upright',earLength=.12,coat='tabby',eye=0x97a856,fur=1.8,speed=.96,sociability=.8,voice=1.04,carry=3,gait=.93,note='Large frame, square muzzle, neck ruff, ear tufts and full tail; gentle and inquisitive.')}
# Primitive with signed-distance and skin influence; tuples are elliptic capsules.
def primitives(cfg):
 cat=cfg['species']=='cat';bulk=cfg['bulk']; ps=[]
 def ell(c,r,b): ps.append((np.array(c),np.array(c),np.array(r),np.array(r),b,b))
 def cap(a,b,r0,r1,ba,bb):ps.append((np.array(a),np.array(b),np.array(r0),np.array(r1),ba,bb))
 # Elongated rib cage, tucked abdomen and pelvis: no four spherical limb bulges.
 ell([0,.467,-.185],[.124*bulk,.119*bulk,.222],'Spine')
 ell([0,.438,.092],[.139*bulk,.159*bulk,.247],'Chest')
 ell([0,.512,-.060],[.104*bulk,.063*bulk,.28],'Spine')
 cap([0,.49,.20],[0,.61 if cat else .686,.348],[.089*bulk,.078*bulk,.103*bulk],[.064,.066,.067],'Chest','Neck')
 ell(cfg['headCenter'],cfg['head'],'Head');ell(cfg['muzzleCenter'],cfg['muzzle'],'Head')
 # Cranial stop and cheeks form a continuous surface; no stacks of facial balls.
 if not cat:ell([0,.746,.475],[.052,.056,.055],'Head')
 for s,sign in [('L',1),('R',-1)]:
  for front in [True,False]:
   up=s+('_UpperArm' if front else '_Thigh');low=s+('_ForeArm' if front else '_Calf');foot=s+('_Paw' if front else '_Foot')
   a=np.array(B[up]);b=np.array(B[low]);c=np.array(B[foot]);a[0]*=1.07
   ell(a+[0,.033,-.018 if front else -.006],[.047*bulk,.090 if front else .105,.051*bulk if front else .070*bulk],up)
   cap(a,b,[.035*bulk,.050*bulk,.040*bulk],[.021*bulk,.024,.022*bulk],up,low)
   cap(b,c,[.026*bulk,.035,.029*bulk],[.022*bulk,.024,.027*bulk],low,foot)
   ell(c+[0,-.014,.022],[.035*bulk,.024,.047],foot)
   for k in [-1,0,1]:ell(c+[k*.019*bulk,-.022,.049],[.011*bulk,.015,.020],foot)
 return ps

def eval_prim(q,p):
 a,b,r0,r1,ba,bb=p;ab=b-a;t=np.clip(np.sum((q-a)*ab,axis=-1)/(np.dot(ab,ab)+1e-12),0,1);center=a+t[...,None]*ab;r=r0+t[...,None]*(r1-r0)
 n=(q-center)/r;dist=(np.linalg.norm(n,axis=-1)-1)*np.min(r,axis=-1)
 return dist,t

def field(q,ps):
 d=np.ones(q.shape[:-1])*9
 for p in ps:
  e,t=eval_prim(q,p);k=.032;h=np.maximum(k-np.abs(d-e),0)/k;d=np.minimum(d,e)-h*h*k*.25
 return d

result={}
for key,cfg in BREEDS.items():
 if cfg['species']=='cat':
  cfg['headCenter'][1]-=.075;cfg['muzzleCenter'][1]-=.075
 ps=primitives(cfg);step=.016
 lo=np.array([-.31,-.10,-.51]);hi=np.array([.31,1.0,.71]);dims=np.ceil((hi-lo)/step).astype(int)+1
 grid=np.stack(np.meshgrid(*[lo[i]+np.arange(dims[i])*step for i in range(3)],indexing='ij'),axis=-1)
 d=field(grid,ps);v,f,n,_=marching_cubes(d,level=0,spacing=(step,step,step),gradient_direction='ascent');v+=lo
 # Smooth voxel stair steps with small Taubin passes, preserving proportions.
 edges=np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]);edges=np.concatenate([edges,edges[:,::-1]])
 counts=np.bincount(edges[:,0],minlength=len(v))
 for lam in [.28,-.29]*3:
  avg=np.stack([np.bincount(edges[:,0],weights=v[edges[:,1],i],minlength=len(v)) for i in range(3)],axis=-1)/counts[:,None];v+=lam*(avg-v)
 # Outward field gradient, independent of polygon winding convention.
 normals=np.stack([(field(v+np.eye(3)[i]*.0005,ps)-field(v-np.eye(3)[i]*.0005,ps)) for i in range(3)],axis=-1);normals/=np.maximum(np.linalg.norm(normals,axis=-1,keepdims=True),1e-8)
 cross=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]]);avg=normals[f].mean(axis=1)
 if np.mean(np.sum(cross*avg,axis=-1))<0:f=f[:,::-1]
 distances=np.stack([eval_prim(v,p)[0] for p in ps],axis=-1);influence=np.exp(-(distances-distances.min(axis=1)[:,None])/.011)
 weights=np.zeros((len(v),len(NAMES)))
 for i,p in enumerate(ps):
  t=eval_prim(v,p)[1];weights[:,NAMES.index(p[4])]+=influence[:,i]*(1-t);weights[:,NAMES.index(p[5])]+=influence[:,i]*t
 joints=np.argsort(weights,axis=1)[:,-4:][:,::-1];w=np.take_along_axis(weights,joints,axis=1);w/=w.sum(axis=1)[:,None]
 w=np.round(w*255).astype(np.int16);w[:,0]+=255-w.sum(axis=1)
 lo=v.min(axis=0)-1e-6;hi=v.max(axis=0)+1e-6
 encode=lambda a:base64.b64encode(a.tobytes()).decode()
 result[key]={'min':lo.tolist(),'range':(hi-lo).tolist(),'position':encode(np.round((v-lo)/(hi-lo)*65535).astype('<u2')),'normal':encode(np.round(normals*127).astype('i1')),'index':encode(f.astype('<u2')),'joints':encode(joints.astype('u1')),'weights':encode(w.astype('u1')),'vertices':len(v),'triangles':len(f)}
 print(key,len(v),len(f),flush=True)
(ROOT/'src/dog/PetSurfaces.js').write_text('// Generated by tools/bake-pets.py. Original geometry; +Z forward, metres.\nexport const PET_SURFACES='+json.dumps(result,separators=(',',':'))+';\n')
(ROOT/'src/dog/PetBreeds.js').write_text('// Game-tuned characteristics, not predictions about individual animals.\nexport const PET_BREEDS='+json.dumps(BREEDS,indent=2)+';\nexport const breedFor=(species,id)=>PET_BREEDS[id]?.species===species?PET_BREEDS[id]:PET_BREEDS[species===\'cat\'?\'british\':\'labrador\'];\nexport const breedIdFor=(species,id)=>PET_BREEDS[id]?.species===species?id:species===\'cat\'?\'british\':\'labrador\';\n')
