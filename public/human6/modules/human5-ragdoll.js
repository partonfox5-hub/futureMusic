import * as T from 'three';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion();
const names=['Hip','Waist','Spine01','Spine02','NeckTwist01','NeckTwist02','Head',...['L','R'].flatMap(s=>['Clavicle','Upperarm','Forearm','Hand','Thigh','Calf','Foot'].map(n=>s+'_'+n))];
/** Bounded articulated position solver. Cosmetic bones retain their skin weights.
 * Dead bodies stop using standing pose/balance; grabs pin the selected joint.
 * No mesh allocations per frame; sleeping bodies retain the solved pose.
 * Joint distance bounds approximate flexion and separation; this is not a full
 * rigid-body angular-limit or continuous self-collision solver.
 */
export class LimpBody {
 constructor(actor){this.actor=actor;this.nodes=[];this.links=[];this.ready=false;this.acc=0;this.sleepTime=0;this.sleeping=false;this.stats={steps:0,maxError:0};}
 reset(){for(const n of this.nodes)n.bone.position.copy(n.local);this.ready=false;this.nodes.length=0;this.links.length=0;this.acc=0;this.sleepTime=0;this.sleeping=false;}
 start(){const a=this.actor;a.group.updateMatrixWorld(true);this.nodes=names.filter(n=>a.bones[n]).map(name=>{const bone=a.bones[name],p=bone.getWorldPosition(V());return {name,bone,p,local:bone.position.clone(),prev:p.clone(),q:bone.getWorldQuaternion(Q()),localQ:bone.quaternion.clone(),radius:/Head/.test(name)?.085:/Hand|Foot/.test(name)?.035:/Hip|Spine/.test(name)?.085:.045};});this.byName=new Map(this.nodes.map(n=>[n.name,n]));
  for(const n of this.nodes){let b=n.bone.parent;while(b&&!this.byName.has(b.name))b=b.parent;if(b){const parent=this.byName.get(b.name);this.links.push({a:parent,b:n,length:parent.p.distanceTo(n.p)});}}
  const link=(x,y)=>{const a=this.byName.get(x),b=this.byName.get(y);if(a&&b)this.links.push({a,b,length:a.p.distanceTo(b.p),brace:true});};
  link('L_Thigh','R_Thigh');link('L_Upperarm','R_Upperarm');link('L_Thigh','Spine02');link('R_Thigh','Spine02');
  this.limits=[];const limit=(x,y,min,max=Infinity)=>{const p=this.byName.get(x),q=this.byName.get(y);if(p&&q)this.limits.push({a:p,b:q,min,max});};
  for(const side of ['L','R']){
   const span=(x,y,z)=>this.byName.get(x).p.distanceTo(this.byName.get(y).p)+this.byName.get(y).p.distanceTo(this.byName.get(z).p);
   const leg=span(side+'_Thigh',side+'_Calf',side+'_Foot'),arm=span(side+'_Upperarm',side+'_Forearm',side+'_Hand');
   limit(side+'_Thigh',side+'_Foot',leg*.48,leg*.995);limit(side+'_Upperarm',side+'_Hand',arm*.34,arm*.995);
   limit(side+'_Foot','Hip',.23);limit(side+'_Hand','Hip',.17);limit(side+'_Hand','Spine02',.15);limit(side+'_Calf','Head',.18);
  }
  limit('Head','Hip',.26);limit('L_Calf','R_Calf',.12);limit('L_Foot','R_Foot',.08);limit('L_Hand','R_Hand',.07);
  for(const n of this.nodes){const velocity=a.balance.velocity.clone().add(new T.Vector3(0,0,-.18));n.prev.addScaledVector(velocity,-1/90);if(/Hand|Forearm/.test(n.name))n.prev.z+=.006;}
  this.ready=true;
 }
 impulse(velocity){this.sleeping=false;this.sleepTime=0;for(const n of this.nodes)n.prev.addScaledVector(velocity.clone().clampLength(0,6),-1/90);}
 tick(dt){if(!this.ready)this.start();const a=this.actor,h=1/90;dt=Math.min(.05,Math.max(0,dt));const pins=new Map();
  for(const grab of a.grabs.values()){let bone=a.bones[grab.hit?.name]||grab.bone;while(bone&&!this.byName.has(bone.name))bone=bone.parent;const node=this.byName.get(bone?.name);const target=grab.ctrl?.getWorldPosition?.(V());if(node&&target)pins.set(node,target);}
  if(pins.size){this.sleeping=false;this.sleepTime=0;}
  if(!this.sleeping){this.acc=Math.min(.05,this.acc+dt);while(this.acc>=h){this.acc-=h;this.stats.steps++;let energy=0;
    for(const n of this.nodes){const old=n.p.clone(),v=n.p.clone().sub(n.prev).multiplyScalar(.989).clampLength(0,h*8);n.p.add(v);n.p.y-=(a.world.gravity??9.81)*h*h;n.prev.copy(old);}
    for(let pass=0;pass<7;pass++){
      for(const [n,p]of pins)n.p.copy(p);
      for(const e of this.links){const d=e.b.p.clone().sub(e.a.p),len=d.length();if(len<1e-7)continue;const pa=pins.has(e.a),pb=pins.has(e.b);if(pa&&pb)continue;d.multiplyScalar((len-e.length)/len*(e.brace?.72:1));if(!pa)e.a.p.addScaledVector(d,pb?1:.5);if(!pb)e.b.p.addScaledVector(d,pa?-1:-.5);}
      for(const e of this.limits){const d=e.b.p.clone().sub(e.a.p),len=d.length(),want=T.MathUtils.clamp(len,e.min,e.max);if(Math.abs(len-want)<1e-7||len<1e-7)continue;d.multiplyScalar((len-want)/len*.8);const pa=pins.has(e.a),pb=pins.has(e.b);if(!pa)e.a.p.addScaledVector(d,pb?1:.5);if(!pb)e.b.p.addScaledVector(d,pa?-1:-.5);}
      for(const n of this.nodes){if(pins.has(n))continue;const floor=a.world.floorHeight?.(n.p,undefined,.12)??a.baseY??0;n.p.y=Math.max(floor+n.radius*(a.shape.height||1),n.p.y);if(pass===6)a.world.projectSphere?.(n.p,n.radius*.65);}
    }
    for(const n of this.nodes){const floor=a.world.floorHeight?.(n.p,undefined,.12)??0;if(n.p.y<=floor+n.radius+.012){n.prev.x=T.MathUtils.lerp(n.prev.x,n.p.x,.55);n.prev.z=T.MathUtils.lerp(n.prev.z,n.p.z,.55);}energy+=n.p.distanceToSquared(n.prev);}
    this.sleepTime=energy<.000012&&!pins.size?this.sleepTime+h:0;if(this.sleepTime>1.2)this.sleeping=true;
   }}
  // Translate the actor with its pelvis so LOD, interactions and bounds follow it.
  a.root.position.copy(a.baseRootPos);a.root.quaternion.identity();a.group.updateMatrixWorld(true);
  const hip=this.byName.get('Hip');if(hip)a.group.position.add(hip.p.clone().sub(a.bones.Hip.getWorldPosition(V())));a.group.updateMatrixWorld(true);
  for(const n of this.nodes){n.bone.position.copy(n.bone.parent.worldToLocal(n.p.clone()));n.bone.quaternion.copy(n.bone.parent.getWorldQuaternion(Q()).invert().multiply(n.q));n.bone.updateWorldMatrix(false,false);
   const e=this.links.find(e=>e.a===n&&!e.brace);if(!e){n.bone.quaternion.copy(n.localQ);n.bone.updateWorldMatrix(false,false);}if(e){const from=e.b.bone.getWorldPosition(V()).sub(n.p),to=e.b.p.clone().sub(n.p);if(from.lengthSq()>1e-8&&to.lengthSq()>1e-8){const rot=Q().setFromUnitVectors(from.normalize(),to.normalize()).multiply(n.bone.getWorldQuaternion(Q()));n.bone.quaternion.copy(n.bone.parent.getWorldQuaternion(Q()).invert().multiply(rot));n.bone.updateWorldMatrix(false,false);}}
  }
  a.balance.state='loose';a.balance.velocity.set(0,0,0);a.balance.airVel=0;
  this.stats.maxError=Math.max(0,...this.links.filter(e=>!e.brace).map(e=>Math.abs(e.a.p.distanceTo(e.b.p)-e.length)));
 }
}
