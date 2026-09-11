import * as T from 'three';
import {tagMovable,furnitureRoot} from './mira-v2-furniture.js?v=18.0.0';
const V=()=>new T.Vector3(),QUEST=/Quest|OculusBrowser/i.test(globalThis.navigator?.userAgent||'');
const hash=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n);};
const smooth=t=>t*t*(3-2*t);
const noise=(x,z)=>{
 const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=smooth(xf),v=smooth(zf);
 const a=hash(xi,zi),b=hash(xi+1,zi),c=hash(xi,zi+1),d=hash(xi+1,zi+1);
 return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
};
const fbm=(x,z)=>{let a=0,w=1,f=1,s=0;for(let i=0;i<5;i++){a+=w*noise(x*f,z*f);s+=w;w*=.5;f*=2.03;}return a/s;}
export function terrainHeight(x,z,pad=5.4,amp=1){
 const outside=Math.max(0,Math.max(Math.abs(x),Math.abs(z))-pad);
 const t=smooth(Math.min(1,outside/7));
 return t*amp*(.22*fbm(x*.035,z*.035)+.55*fbm(x*.012,z*.012)-.12);
}
export function plantTerrain(world,opts={}){
 const size=opts.size||156,seg=QUEST?52:88,pad=opts.pad??5.4,amp=opts.amp??1;
 const geo=new T.PlaneGeometry(size,size,seg,seg);geo.rotateX(-Math.PI/2);
 const pos=geo.attributes.position,col=new Float32Array(pos.count*3);
 const grass=new T.Color(opts.grass||0x5d7048),dirt=new T.Color(opts.dirt||0x6a5a3e),mix=new T.Color();
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i),h=terrainHeight(x,z,pad,amp);
  pos.setY(i,h);
  const k=smooth(Math.min(1,Math.max(0,(Math.hypot(x,z)-pad)/10)));
  mix.copy(grass).lerp(dirt,k*.45+noise(x*.2,z*.2)*.12);
  col[i*3]=mix.r;col[i*3+1]=mix.g;col[i*3+2]=mix.b;
 }
 geo.setAttribute('color',new T.BufferAttribute(col,3));geo.computeVertexNormals();
 const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:0}));
 mesh.receiveShadow=true;mesh.position.y=0;world.root.add(mesh);world.terrain=mesh;mesh.userData.terrain=true;
 world.terrainPad=pad;world.terrainAmp=amp;
}
function woodMat(color){return new T.MeshStandardMaterial({color,roughness:.92,metalness:0});}
function leafMat(color){return new T.MeshStandardMaterial({color,roughness:.82,metalness:0,side:T.DoubleSide});}
function addCyl(parent,mat,r0,r1,len,pos,quat){
 const m=new T.Mesh(new T.CylinderGeometry(r1,r0,len,QUEST?5:8),mat);
 m.position.copy(pos);if(quat)m.quaternion.copy(quat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function addLeaf(parent,mat,size,pos){
 const m=new T.Mesh(new T.IcosahedronGeometry(size,QUEST?0:1),mat);
 m.position.copy(pos);m.scale.set(1,.72,1.05);m.castShadow=true;parent.add(m);return m;
}
export function plantTree(world,x,z,opts={}){
 const palm=!!opts.palm,h=opts.height||(palm?3.1+hash(x,z)*1.1:2.5+hash(x,z)*2.4);
 const pad=opts.pad??world.terrainPad??5.4,amp=world.terrainAmp??1;
 const y0=world.terrainFeatures?.heightAt(x,z)??terrainHeight(x,z,pad,amp);
 const group=new T.Group();group.position.set(x,y0,z);world.root.add(group);
 const bark=woodMat(palm?0x9a7a58:0x5a4634),leaf=leafMat(palm?0x5e8848:(hash(x+2,z)>.5?0x3f5d32:0x4a6a38));
 const segs=palm?5:7,radius=.07+h*.018,cut=[];
 let lean=new T.Vector3(0,1,0),cursor=new T.Vector3(0,0,0);
 for(let i=0;i<segs;i++){
  const t0=i/segs,t1=(i+1)/segs,len=h/segs,r0=radius*(1-t0*.55),r1=radius*(1-t1*.55);
  if(!palm){
   lean.x+=(hash(x,i)-.5)*.08;lean.z+=(hash(z,i+3)-.5)*.08;lean.y=1;lean.normalize();
  }
  const mid=cursor.clone().addScaledVector(lean,len*.5);
  const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),lean);
  const mesh=addCyl(group,bark,r0,r1,len,mid,q);
  const seg={index:i,y0:t0*h,y1:t1*h,cut:0,radius:(r0+r1)*.5,trunk:true,mesh};
  mesh.userData.treeSeg=seg;cut.push(seg);
  cursor.addScaledVector(lean,len);
 }
 const top=cursor.clone();
 if(palm){
  for(let j=0;j<8;j++){
   const ang=j*Math.PI/4,frond=new T.Mesh(new T.SphereGeometry(.95,8,5),leaf);
   frond.scale.set(.9,.07,.22);frond.position.set(top.x+Math.cos(ang)*.55,top.y-.04,top.z+Math.sin(ang)*.55);
   frond.rotation.set(.15,-ang,-.28);frond.castShadow=true;group.add(frond);
   const seg={index:100+j,y0:h*.85,y1:h+.2,cut:0,radius:.04,trunk:false,mesh:frond};
   frond.userData.treeSeg=seg;cut.push(seg);
  }
 }else{
  const n=QUEST?4:6;
  for(let j=0;j<n;j++){
   const t=.38+j/n*.52,ang=j*2.399+hash(x,j)*6,len=.5+h*.18,tilt=.5+hash(z,j)*.4;
   const q=new T.Quaternion().setFromEuler(new T.Euler(tilt,ang,0,'YXZ'));
   const along=new T.Vector3(0,1,0).applyQuaternion(q);
   const base=new T.Vector3(0,t*h,0),mid=base.clone().addScaledVector(along,len*.5);
   const br=addCyl(group,bark,radius*.34,radius*.11,len,mid,q);
   const bseg={index:20+j,y0:t*h,y1:t*h+len,cut:0,radius:radius*.22,trunk:false,mesh:br};
   br.userData.treeSeg=bseg;cut.push(bseg);
   const crown=addLeaf(br,leaf,.34+h*.055,new T.Vector3(0,len*.42,0));
   const cseg={index:40+j,y0:t*h+len*.5,y1:h,cut:0,radius:.05,trunk:false,mesh:crown};
   crown.userData.treeSeg=cseg;cut.push(cseg);
   if(!QUEST){
    const twLen=len*.42;
    const tw=addCyl(br,bark,radius*.16,radius*.06,twLen,new T.Vector3(.04,len*.08,.07),new T.Quaternion().setFromEuler(new T.Euler(.55,.85,.18)));
    const tseg={index:60+j,y0:t*h,y1:t*h+twLen,cut:0,radius:radius*.1,trunk:false,mesh:tw};
    tw.userData.treeSeg=tseg;cut.push(tseg);
    const twLeaf=addLeaf(tw,leaf,.22+h*.03,new T.Vector3(0,twLen*.4,0));
    const lseg={index:80+j,y0:t*h,y1:h,cut:0,radius:.04,trunk:false,mesh:twLeaf};
    twLeaf.userData.treeSeg=lseg;cut.push(lseg);
   }
  }
 }
 const tree={group,height:h,radius,cut,fallen:false,falling:[],velocity:V(),omega:V(),world};
 group.userData.tree=tree;group.traverse(m=>{if(m.isMesh){m.userData.tree=tree;if(!world.pickables.includes(m))world.pickables.push(m);}});
 world.trees??=[];world.trees.push(tree);
 const ob=world.obstacle(x,z,radius*3.2,radius*3.2,y0,h,group);tree.obstacle=ob;
 return tree;
}
function collectSegs(tree){
 const segs=[];
 const visit=root=>{if(!root)return;root.traverse(m=>{if(m.userData?.treeSeg)segs.push(m.userData.treeSeg);});};
 visit(tree.group);
 for(const piece of tree.falling||[])visit(piece.group);
 return segs;
}
function markLoose(mesh,tree){
 if(!mesh)return;
 mesh.userData.looseWood=true;
 mesh.userData.tree=tree;
 if(mesh.userData.treeSeg)mesh.userData.treeSeg.mesh=mesh;
}
function settleWood(world,group,id){
 if(!world||!group?.parent||group.userData.furniture)return group;
 const furn=tagMovable(world,group,id||'Log');
 if(furn){furn.log=true;furn.velocity.set(0,0,0);furn.omega.set(0,0,0);group.userData.log=true;}
 group.traverse(m=>{if(m.isMesh){m.userData.looseWood=true;if(world.fractures&&!m.userData.piece)world.fractures.register(m,'wood');}});
 return group;
}
function groundY(world,x,z){
 return world?.terrainFeatures?.heightAt(x,z)??terrainHeight(x,z,world?.terrainPad??5.4,world?.terrainAmp??1);
}
function snapGroupToGround(world,group){
 if(!group?.parent)return;
 group.updateWorldMatrix(true,true);
 const box=new T.Box3().setFromObject(group);if(!Number.isFinite(box.min.y))return;
 const c=box.getCenter(V()),ground=groundY(world,c.x,c.z);
 group.position.y+=ground-box.min.y;
}
function detachFalling(tree,meshes,dir){
 if(!meshes.length||!tree.group?.parent)return false;
 const live=meshes.filter(m=>m&&m.parent);if(!live.length)return false;
 const upper=new T.Group();tree.group.parent.add(upper);
 tree.group.updateWorldMatrix(true,true);
 const box=new T.Box3();
 for(const mesh of live){mesh.updateWorldMatrix(true,true);box.expandByObject(mesh);}
 const origin=box.getCenter(V());
 origin.y=box.min.y;
 const ground=groundY(tree.world,origin.x,origin.z);
 origin.y=Math.min(origin.y,ground+.04);
 upper.position.copy(origin);
 for(const mesh of live){mesh.updateWorldMatrix(true,true);upper.attach(mesh);markLoose(mesh,tree);}
 const side=new T.Vector3(dir.z,0,-dir.x);if(side.lengthSq()<1e-6)side.set(1,0,0);side.normalize();
 const trunkish=live.some(m=>m.userData.treeSeg?.trunk);
 const piece={group:upper,hinge:side,angle:0,angVel:trunkish?1.15:.85,settled:false,id:trunkish?'Log':'Branch'};
 tree.falling??=[];tree.falling.push(piece);
 upper.userData.tree=tree;upper.userData.fallingWood=piece;upper.traverse(m=>{if(m.isMesh){m.userData.tree=tree;m.userData.looseWood=true;}});
 return true;
}
function splitAlong(world,mesh){
 if(!mesh?.parent||!world)return false;
 mesh.updateWorldMatrix(true,true);
 const box=new T.Box3().setFromObject(mesh),size=box.getSize(V()),center=box.getCenter(V());
 const long=Math.max(size.x,size.y,size.z);
 if(long<.28){
  if(mesh.userData.piece)return world.fractures.impact({object:mesh,point:center,face:{normal:new T.Vector3(0,1,0)}},24,new T.Vector3(0,-1,0),'cut',.7);
  mesh.visible=false;return true;
 }
 const q=mesh.getWorldQuaternion(new T.Quaternion());
 const axis=new T.Vector3(0,1,0).applyQuaternion(q).normalize();
 const tree=mesh.userData.tree,parent=mesh.parent,id=long>.7?'Log':'Branch',half=long*.48;
 const mat=Array.isArray(mesh.material)?mesh.material[0].clone():mesh.material.clone();
 for(const sign of [-1,1]){
  const g=new T.Group();world.root.add(g);
  g.position.copy(center).addScaledVector(axis,sign*half*.52);g.quaternion.copy(q);
  const copy=mesh.clone();copy.material=mat;copy.scale.y*=.48;copy.position.set(0,0,0);copy.quaternion.identity();
  copy.castShadow=copy.receiveShadow=true;g.add(copy);
  const seg={index:0,y0:0,y1:half,cut:0,radius:Math.min(size.x,size.z)*.35,trunk:id==='Log',mesh:copy};
  copy.userData.treeSeg=seg;
  const stub=tree&&tree.world?tree:{group:g,height:half,radius:seg.radius,cut:[seg],fallen:true,falling:[],world};
  copy.userData.tree=stub;g.userData.tree=stub;markLoose(copy,stub);
  if(stub!==tree){world.trees??=[];if(!world.trees.includes(stub))world.trees.push(stub);}
  else stub.cut.push(seg);
  settleWood(world,g,id);
 }
 mesh.visible=false;mesh.removeFromParent();
 if(parent?.userData?.furniture&&!parent.children.filter(c=>c.isMesh&&c.visible).length){
  world.movables=world.movables.filter(x=>x!==parent);
  if(parent.userData.furniture.obstacle)world.removeObstacle(parent.userData.furniture.obstacle);
  parent.removeFromParent();
 }
 return 'split';
}
export function ensureGrabbableWood(world,mesh){
 if(!mesh||!world)return null;
 const existing=furnitureRoot(mesh);if(existing?.userData?.furniture)return existing;
 const tree=mesh.userData.tree,seg=mesh.userData.treeSeg;if(!tree||!seg)return null;
 const standingTrunk=seg.trunk&&mesh.parent===tree.group&&!tree.fallen&&!mesh.userData.looseWood;
 if(standingTrunk)return null;
 let group=mesh.parent;
 if(group===tree.group){if(!detachFalling(tree,[mesh],new T.Vector3(0,0,1)))return null;group=mesh.parent;}
 if(group?.userData?.fallingWood)group.userData.fallingWood.settled=true;
 return settleWood(world,group,seg.trunk?'Log':'Branch');
}
export function ramTree(tree,point,energy,dir){
 if(!tree||tree.fallen||!tree.group)return false;
 const d=(dir&&dir.lengthSq()?dir.clone():new T.Vector3(1,0,0)).setY(0);
 if(d.lengthSq()<1e-6)d.set(1,0,0);d.normalize();
 tree.ram=(tree.ram||0)+Math.max(0,energy);
 const stout=220+tree.height*70;
 if(tree.ram<stout&&energy<stout*.62)return false;
 const meshes=[];
 for(const child of [...tree.group.children]){
  const seg=child.userData.treeSeg;
  if(seg&&seg.y0>=.28)meshes.push(child);
 }
 if(!meshes.length)return false;
 const fell=detachFalling(tree,meshes,d);
 if(fell){
  tree.fallen=true;
  if(tree.obstacle){
   tree.obstacle.h=Math.max(.2,.3);
   tree.obstacle.w=Math.max(.14,(tree.radius||.08)*2.2);
   tree.obstacle.d=tree.obstacle.w;
   if(tree.world)tree.world.grid=null;
  }
 }
 return fell;
}
export function chopTree(tree,point,energy,dir,kind='cut'){
 if(!tree||!tree.group)return false;
 const gain=kind==='cut'?1.15:kind==='laser'?.32:.22;
 let best=null,bd=1e9;
 for(const seg of collectSegs(tree)){
  const mesh=seg.mesh;if(!mesh||!mesh.parent||!mesh.visible)continue;
  mesh.updateWorldMatrix(true,true);
  const d=mesh.getWorldPosition(V()).distanceTo(point);
  if(d<bd){bd=d;best=seg;}
 }
 if(!best||bd>1.25)return false;
 const mesh=best.mesh,loose=!!mesh.userData.looseWood||mesh.parent!==tree.group;
 best.cut=Math.min(1,best.cut+energy*gain*.010);
 if(mesh.material&&!mesh.userData.chopTint){mesh.userData.chopTint=true;mesh.material=mesh.material.clone();mesh.material.color.offsetHSL(0,-.04,-.05);}
 const need=loose?0.52:(best.trunk?0.82:0.70);
 if(best.cut<need)return false;
 best.cut=0;
 const d=dir||new T.Vector3(1,0,0);
 if(!loose&&best.trunk){
  const meshes=[];
  for(const child of [...tree.group.children]){
   const seg=child.userData.treeSeg;
   if(seg&&seg.y0>=best.y0-.01)meshes.push(child);
  }
  const fell=detachFalling(tree,meshes,d);
  if(fell){
   tree.fallen=true;
   if(tree.obstacle){tree.obstacle.h=Math.max(.18,best.y0);if(tree.world)tree.world.grid=null;}
  }
  return fell?'fell':false;
 }
 if(loose&&mesh.parent&&mesh.parent.children.filter(c=>c.isMesh&&c.visible).length>1){
  return detachFalling(tree,[mesh],d)?'split':false;
 }
 if(loose)return splitAlong(tree.world,mesh);
 return detachFalling(tree,mesh?[mesh]:[],d)?'split':false;
}
export function tickNature(world,dt){
 if(!world.trees)return;
 for(const tree of world.trees){
  for(const piece of tree.falling||[]){
   const g=piece.group;if(!g||!g.parent)continue;
   if(piece.settled||g.userData.furniture){
    if(!g.userData.furniture){snapGroupToGround(world,g);settleWood(world,g,piece.id);}
    else if(!g.userData.furniture.holds?.size&&Math.hypot(g.position.x,g.position.z)>16)snapGroupToGround(world,g);
    continue;
   }
   piece.angVel+=9.4*dt*Math.cos(Math.min(piece.angle,1.15));
   piece.angVel*=Math.exp(-dt*.38);
   const da=piece.angVel*dt,limit=Math.PI/2-.02;
   if(piece.angle+da>=limit){
    g.rotateOnWorldAxis(piece.hinge,limit-piece.angle);
    piece.angle=limit;piece.settled=true;piece.angVel=0;
    snapGroupToGround(world,g);
    settleWood(world,g,piece.id);
   }else{
    piece.angle+=da;g.rotateOnWorldAxis(piece.hinge,da);
    g.updateWorldMatrix(true,true);
    const box=new T.Box3().setFromObject(g),c=box.getCenter(V()),ground=groundY(world,c.x,c.z);
    if(box.min.y>ground+.03)g.position.y-=Math.min(box.min.y-ground,10*dt);
    else if(box.min.y<ground)g.position.y+=ground-box.min.y;
   }
  }
 }
}
export function scatterTrees(world,opts={}){
 const n=opts.count??(QUEST?18:36),pad=opts.pad??6.2,extent=opts.extent??26,palm=!!opts.palm;
 let placed=0,guard=0;
 while(placed<n&&guard<n*8){
  guard++;
  const a=hash(placed+3,guard)*Math.PI*2,r=pad+hash(guard,placed)*extent;
  const x=Math.cos(a)*r*(.4+hash(placed,9)*.7),z=Math.sin(a)*r*(.4+hash(placed,4)*.7);
  if(Math.hypot(x,z)<pad)continue;
  if(opts.avoid?.(x,z))continue;
  if(world.blocked(new T.Vector3(x,0,z),.45))continue;
  plantTree(world,x,z,{palm,height:opts.height,pad:opts.flat??world.terrainPad??5.4});
  placed++;
 }
}
