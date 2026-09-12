import {T,V,clamp} from './math.js?v=5.0.0';
import {G,M,material,buildModel,part,mergeParts,tickTicker} from './models.js?v=5.0.0';
import {KNIGHT_SCALE} from './knight-pose.js?v=5.0.0';
const animated=/^(head|jaw|leg|arm|fore|extra|cape|rotor|rib|wing|gun|blade)/;
const q=new T.Quaternion(),q2=new T.Quaternion(),s=V(1,1,1),m=new T.Matrix4(),local=new T.Matrix4(),offset=V();
function compile(root){const bones=[];function scan(node,parent=-1){const bone={name:node.name,parent,pos:node.position.clone(),q:node.quaternion.clone(),scale:node.scale.clone(),matrix:new T.Matrix4(),parts:[]};const id=bones.length;bones.push(bone);const staticRoot=new T.Group();function copy(src,dest){for(const child of src.children){if(child.isGroup&&animated.test(child.name)){scan(child,id);continue;}const clone=child.clone(false);dest.add(clone);copy(child,clone);}}copy(node,staticRoot);bone.parts=mergeParts(staticRoot);return id;}scan(root);return bones;}
function animate(bone,e,time,distance){offset.copy(bone.pos);q.copy(bone.q);s.copy(bone.scale);if(distance>85)return;const n=bone.name,phase=e.phase||0,walk=Math.sin(time*(e.type==='trilo'?5.5:3.5)+phase),side=n.includes('-1')?-1:1;
 if(n==='blade'){if(e.swordAim)q.multiply(e.swordAim);}else if(n==='gun')s.z=1-(e.morph||0)*.65;else if(n==='jaw')q.multiply(q2.setFromAxisAngle(V(1,0,0),(e.jaw||0)*.78));
 else if(n==='head'){if((e.type==='pet'||e.type==='lemur')&&e.headAim)q.multiply(q2.setFromUnitVectors(V(0,0,1),e.headAim));else if(e.type==='camel'){q.multiply(q2.setFromAxisAngle(V(1,0,0),Math.sin(time*1.6+phase)*.18));offset.y+=Math.sin(time*1.5)*.12;}}
 else if(n.startsWith('leg'))q.multiply(q2.setFromAxisAngle(V(1,0,0),walk*side*(e.type==='hornet'?.18:.3)));
 else if(n.startsWith('arm'))q.multiply(q2.setFromAxisAngle(V(1,0,0),e.laserCast?0:e.attack>0?-1.0:Math.sin(time*2+phase+side)*.2));
 else if(n==='fore'&&e.type!=='knight'){q.multiply(q2.setFromAxisAngle(V(1,0,0),-.18));}
 else if(n==='cape')q.multiply(q2.setFromAxisAngle(V(1,0,0),Math.sin(time*2+phase)*.13));
 else if(n.startsWith('rotor'))q.multiply(q2.setFromAxisAngle(V(0,1,0),time*58*side));
 else if(n.startsWith('rib'))q.multiply(q2.setFromAxisAngle(V(0,1,0),Math.sin(time*2+Number(n.slice(3)))*.1));
 else if(n.startsWith('wing'))q.multiply(q2.setFromAxisAngle(V(0,0,1),Math.sin(time*9+phase)*.6*side));
}
class ModelBatch {
 constructor(scene,type,kind,meta){this.type=type;this.kind=kind;this.bones=compile(buildModel(type,kind,meta));this.capacity=0;this.count=0;this.scene=scene;this.resize(8);}
 resize(n){if(n<=this.capacity)return;this.capacity=2**Math.ceil(Math.log2(n));for(const b of this.bones)for(const p of b.parts){const previous=p.mesh;if(previous){this.scene.remove(previous);}p.mesh=new T.InstancedMesh(p.geometry,p.material,this.capacity);p.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);p.mesh.frustumCulled=false;p.mesh.count=0;if(previous){p.mesh.instanceMatrix.array.set(previous.instanceMatrix.array);previous.dispose();}this.scene.add(p.mesh);}}
 begin(){this.count=0;}
 add(e,time,distance){this.resize(this.count+1);let scale=e.scale||1;if(e.type==='knight')scale*=KNIGHT_SCALE;if(e.type==='knight'&&e.white)scale*=1.85;if(e.type==='hatch')scale=e.r;if(e.type==='cage'&&e.shake>0)scale*=1+Math.sin(time*48)*.045*e.shake/.38;if(e.type==='hornet')scale*=1.25;
  const rotation=e.q?.clone()||new T.Quaternion();if(e.dir&&(e.enemy||e.type==='pet')){rotation.setFromUnitVectors(V(0,0,1),e.bodyDir||e.dir);if(e.bodyDir)e.headAim=e.dir.clone().applyQuaternion(rotation.clone().invert()).normalize();}m.compose(e.p,rotation,V(scale,scale,scale));
  for(const b of this.bones){animate(b,e,time,distance);local.compose(offset,q,s);b.matrix.multiplyMatrices(b.parent<0?m:this.bones[b.parent].matrix,local);for(const p of b.parts)p.mesh.setMatrixAt(this.count,b.matrix);}this.count++;
 }
 end(){for(const b of this.bones)for(const p of b.parts){p.mesh.count=this.count;p.mesh.visible=!!this.count;if(this.count)p.mesh.instanceMatrix.needsUpdate=true;}}
 dispose(){for(const b of this.bones)for(const p of b.parts){this.scene.remove(p.mesh);p.mesh.dispose();p.geometry.dispose();}}
}
export class EntityView {
 constructor(scene){this.scene=scene;this.batches=new Map();this.neck=new T.InstancedMesh(G.cyl,material(0x3a746d,.16,.46),512);this.joints=new T.InstancedMesh(G.sphere,material(0x3a746d,.16,.46),512);this.spines=new T.InstancedMesh(G.cone,M.dark,256);for(const b of [this.joints,this.spines]){b.frustumCulled=false;b.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(b);}this.neck.instanceMatrix.setUsage(T.DynamicDrawUsage);this.neck.frustumCulled=false;scene.add(this.neck);this.visible=[];this.instances=0;this.quality='balanced';}
 ensureNecks(count){if(count<=this.neck.instanceMatrix.count)return;const capacity=2**Math.ceil(Math.log2(count));for(const name of ['neck','joints','spines']){const old=this[name],n=name==='spines'?Math.ceil(capacity/2):capacity;const mesh=new T.InstancedMesh(old.geometry,old.material,n);mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;this.scene.remove(old);old.dispose();this.scene.add(mesh);this[name]=mesh;}}
 update(g){const heads=g.entities.reduce((n,e)=>n+(e.alive&&e.type==='hydra'?1:0),0);this.ensureNecks(heads*20);this.denseHydras=heads>12;tickTicker(g.time);for(const b of this.batches.values())b.begin();let neckN=0,jointN=0,spineN=0;this.visible.length=0;const far=this.quality==='high'?150:this.quality==='performance'?85:110;
  for(const e of g.entities){if(!e.alive||['shard','coin','gold','well','hullChunk'].includes(e.type))continue;const distance=e.p.distanceTo(g.player.p),max=e.enemy?far:['window','marquee'].includes(e.type)?60:e.type==='blimp'?140:85;if(distance>max)continue;
   const kind=e.type==='knight'?Number(e.white||false):e.kind||0,key=e.type+':'+kind+(e.type==='marquee'?':'+(e.radius||25).toFixed(3)+':'+e.pieces:'');let b=this.batches.get(key);if(!b){b=new ModelBatch(this.scene,e.type,kind,e);this.batches.set(key,b);}b.add(e,g.time,distance);this.visible.push(e);
   if(e.type==='hydra'){const nest=g.map.nests[e.nest],a=nest.pos.clone().addScaledVector(nest.dir,-2.2),delta=e.p.clone().sub(a),side=nest.dir.clone().cross(V(0,1,0)).normalize(),up=side.clone().cross(nest.dir).normalize();const n=this.quality==='performance'||distance>45||this.denseHydras?8:this.quality==='high'?20:16;let previous=null;
    for(let i=0;i<=n&&neckN<this.neck.instanceMatrix.count;i++){const u=i/n,phase=u*Math.PI*(3.4-(e.coil||.5)*1.2)+g.time*.9+e.phase,rad=Math.sin(Math.PI*u)*(1.5-(e.coil||.5)*.8),pos=a.clone().addScaledVector(delta,u).addScaledVector(side,Math.sin(phase)*rad).addScaledVector(up,Math.cos(phase)*rad),thickness=.48-u*.22;
     if(previous){const vector=pos.clone().sub(previous),length=vector.length(),q=new T.Quaternion().setFromUnitVectors(V(0,1,0),vector.normalize());m.compose(pos.clone().add(previous).multiplyScalar(.5),q,V(thickness,length+.035,thickness));this.neck.setMatrixAt(neckN++,m);m.compose(pos,q,V(thickness,thickness,thickness));this.joints.setMatrixAt(jointN++,m);
      if(i%2===0&&spineN<this.spines.instanceMatrix.count){const dorsal=up.clone().multiplyScalar(thickness),spine=pos.clone().add(dorsal);m.compose(spine,new T.Quaternion().setFromUnitVectors(V(0,1,0),up),V(.10,.40,.12));this.spines.setMatrixAt(spineN++,m);}}
     previous=pos;
    }
   }

  }
  for(const b of this.batches.values())b.end();this.neck.count=neckN;this.neck.visible=neckN>0;this.neck.instanceMatrix.needsUpdate=true;for(const [batch,n]of [[this.joints,jointN],[this.spines,spineN]]){batch.count=n;batch.visible=n>0;batch.instanceMatrix.needsUpdate=true;}this.instances=this.visible.length;
 }
 dispose(){for(const b of this.batches.values())b.dispose();for(const b of [this.neck,this.joints,this.spines]){this.scene.remove(b);b.dispose();}}
}
