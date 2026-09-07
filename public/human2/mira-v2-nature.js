import * as T from 'three';
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
 const size=opts.size||78,seg=QUEST?40:72,pad=opts.pad??5.4,amp=opts.amp??1;
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
 const y0=terrainHeight(x,z,pad,amp);
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
function detachFalling(tree,meshes,dir){
 if(!meshes.length||!tree.group.parent)return false;
 const upper=new T.Group();tree.group.parent.add(upper);
 tree.group.updateWorldMatrix(true,true);
 const origin=meshes[0].getWorldPosition(V());
 upper.position.copy(origin);
 for(const mesh of meshes){
  if(!mesh.parent)continue;
  mesh.updateWorldMatrix(true,true);
  upper.attach(mesh);
 }
 const side=new T.Vector3(dir.z,0,-dir.x);if(side.lengthSq()<1e-6)side.set(1,0,0);
 const piece={group:upper,velocity:dir.clone().setY(Math.max(.15,dir.y)).multiplyScalar(1.05).add(new T.Vector3(0,.35,0)),omega:side.normalize().multiplyScalar(1.7)};
 tree.falling??=[];tree.falling.push(piece);
 upper.userData.tree=tree;upper.traverse(m=>{if(m.isMesh)m.userData.tree=tree;});
 return true;
}
export function chopTree(tree,point,energy,dir,kind='cut'){
 if(!tree||!tree.group)return false;
 const gain=kind==='cut'?1.35:kind==='laser'?.4:.25;
 let best=null,bd=1e9;
 for(const seg of collectSegs(tree)){
  const mesh=seg.mesh;if(!mesh||!mesh.parent)continue;
  mesh.updateWorldMatrix(true,true);
  const d=mesh.getWorldPosition(V()).distanceTo(point);
  if(d<bd){bd=d;best=seg;}
 }
 if(!best||bd>1.15)return false;
 best.cut=Math.min(1,best.cut+energy*gain*.028);
 if(best.mesh?.material){best.mesh.material=best.mesh.material.clone();best.mesh.material.color.offsetHSL(0,-.05,-.07);}
 if(best.cut<.5)return false;
 if(best.trunk){
  const meshes=[];
  for(const child of [...tree.group.children]){
   const seg=child.userData.treeSeg;
   if(seg&&seg.y0>=best.y0-.01)meshes.push(child);
  }
  const fell=detachFalling(tree,meshes,dir||new T.Vector3(1,0,0));
  if(fell){
   tree.fallen=true;
   if(tree.obstacle){tree.obstacle.h=Math.max(.18,best.y0);if(tree.world)tree.world.grid=null;}
  }
  return fell;
 }
 return detachFalling(tree,best.mesh?[best.mesh]:[],dir||new T.Vector3(1,0,0));
}
export function tickNature(world,dt){
 if(!world.trees)return;
 const pad=world.terrainPad??5.4,amp=world.terrainAmp??1;
 for(const tree of world.trees){
  for(const piece of tree.falling||[]){
   const g=piece.group;if(!g||!g.parent)continue;
   piece.velocity.y-=9.81*dt;g.position.addScaledVector(piece.velocity,dt);
   const ang=piece.omega.length();if(ang>1e-4)g.rotateOnWorldAxis(piece.omega.clone().normalize(),ang*dt);piece.omega.multiplyScalar(Math.exp(-dt*1.25));
   const ground=terrainHeight(g.position.x,g.position.z,pad,amp)+.1;
   if(g.position.y<ground){g.position.y=ground;if(piece.velocity.y<0)piece.velocity.y*=-.12;piece.velocity.x*=.86;piece.velocity.z*=.86;piece.omega.multiplyScalar(.68);}
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
