import * as T from 'three';
import {bodyVolumes,projectVolume} from './mira-v2-contact.js?v=h3.2';
const V=()=>new T.Vector3();
import {GARMENTS} from './mira-v2-garments.js?v=h3.2';
export {GARMENTS} from './mira-v2-garments.js?v=h3.2';
import {garmentPattern,fabricMaterial} from './mira-v2-garment-patterns.js?v=h3.2';
export class Cloth {
 constructor(scene,actor,style,surface){
  this.actor=actor;this.style=style;this.n=28;this.rows=9;this.p=[];this.prev=[];this.rest=[];this.anchor=[];this.edges=[];this.faces=[];this.torn=new Set();this.acc=0;this.hold=null;this.detached=false;this.age=0;this.anchorBone=actor.bones[style.top<1.05?'Hip':'Spine02'];this.shapeStamp='';this.surface=surface;this.skinAnchors=[];
  const pattern=garmentPattern(actor,style,surface);this.p=pattern.p;this.skinAnchors=pattern.refs;this.pins=pattern.pins;this.faces=pattern.faces;this.fitted=pattern.fitted;const uv=pattern.uv;this.shapeStamp=actor.geomState;
  for(const p of this.p){this.prev.push(p.clone());this.rest.push(actor.group.worldToLocal(p.clone()));this.anchor.push(this.anchorBone.worldToLocal(p.clone()));}
  const added=new Set(),adjacent=new Map(),edge=(a,b,bend=false)=>{const key=[a,b].sort((x,y)=>x-y).join('/');if(added.has(key))return;added.add(key);this.edges.push({a,b,len:this.p[a].distanceTo(this.p[b]),compliance:bend?2e-4:3e-7,lambda:0,broken:false});};
  for(const f of this.faces)for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3];edge(a,b);const key=[a,b].sort((x,y)=>x-y).join('/');if(adjacent.has(key))edge(f[(j+2)%3],adjacent.get(key),true);else adjacent.set(key,f[(j+2)%3]);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(this.p.length*3),3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(this.faces.flat());
  this.mesh=new T.Mesh(g,fabricMaterial(style));this.mesh.frustumCulled=false;this.mesh.castShadow=this.mesh.receiveShadow=true;this.mesh.userData.cloth=this;scene.add(this.mesh);this.sync();
 }
 pin(i){return !this.detached&&this.pins[i];}
 begin(point,handle){let best=0,dist=Infinity;this.p.forEach((p,i)=>{const d=p.distanceToSquared(point);if(d<dist){dist=d;best=i;}});this.hold={index:best,handle,offset:this.p[best].clone().sub(point),pullTime:0};}
 detach(){this.detached=true;this.actor=null;this.hold&&(this.hold.pullTime=0);}
 skinPoint(i){const ref=this.skinAnchors[i];if(!ref)return this.anchorBone.localToWorld(this.anchor[i].clone());const tri=new T.Triangle();this.surface.vertex(ref.cache,ref.ids[0],tri.a);this.surface.vertex(ref.cache,ref.ids[1],tri.b);this.surface.vertex(ref.cache,ref.ids[2],tri.c);return tri.a.clone().multiplyScalar(ref.bary.x).addScaledVector(tri.b,ref.bary.y).addScaledVector(tri.c,ref.bary.z).addScaledVector(tri.getNormal(V()),.012);}
 tick(dt,actors,hands,world){
  this.acc=Math.min(.04,this.acc+dt);const step=1/90,caps=actors.flatMap(a=>a.version==='v2'?bodyVolumes(a).map(c=>({...c,actor:a})):[]).concat(hands||[]);
  while(this.acc>=step){this.age+=step;for(let i=0;i<this.p.length;i++){const p=this.p[i];if(this.pin(i)){p.copy(this.skinPoint(i));this.prev[i].copy(p);continue;}const old=p.clone(),v=p.clone().sub(this.prev[i]).multiplyScalar(.975);if(v.length()>.05)v.setLength(.05);p.add(v);p.y-=9.81*step*step;this.prev[i].copy(old);}this.edges.forEach(e=>e.lambda=0);
   for(let pass=0;pass<(this.fitted?2:3);pass++){
    for(const e of this.edges){if(e.broken)continue;const p=this.p[e.a],q=this.p[e.b],d=q.clone().sub(p),l=d.length();if(l<1e-8)continue;const wa=this.pin(e.a)?0:1,wb=this.pin(e.b)?0:1,alpha=e.compliance/(step*step),dl=(-(l-e.len)-alpha*e.lambda)/(wa+wb+alpha);e.lambda+=dl;d.multiplyScalar(dl/l);p.addScaledVector(d,-wa);q.addScaledVector(d,wb);}
    if(this.hold){const target=this.hold.handle.getWorldPosition(V()).add(this.hold.offset);this.p[this.hold.index].lerp(target,.88);}
    for(let i=0;i<this.p.length;i++){if(this.pin(i))continue;const p=this.p[i];if(!this.detached&&i<this.fitted&&this.hold?.index!==i)p.lerp(this.skinPoint(i),.48);for(const c of caps)if(!(i<this.fitted&&!this.detached&&c.actor===this.actor))projectVolume(p,.009,c);
     const skin=!this.detached&&this.skinAnchors[i];if(skin){const tri=new T.Triangle();this.surface.vertex(skin.cache,skin.ids[0],tri.a);this.surface.vertex(skin.cache,skin.ids[1],tri.b);this.surface.vertex(skin.cache,skin.ids[2],tri.c);const q=tri.a.clone().multiplyScalar(skin.bary.x).addScaledVector(tri.b,skin.bary.y).addScaledVector(tri.c,skin.bary.z),n=tri.getNormal(V()),delta=p.clone().sub(q),d=delta.dot(n);if(delta.length()<.14&&d<.014){p.addScaledVector(n,.014-d);if(pass===0)this.actor.contactSoft({name:skin.bone.name,kind:/Breast/.test(skin.bone.name)?'breast':/Butt/.test(skin.bone.name)?'glute':'chest'},n,Math.min(.014-d,.008),0);}}
     p.y=Math.max(.012,p.y);world?.projectSphere(p,.009);}
   }
   if(this.hold){const i=this.hold.index,target=this.hold.handle.getWorldPosition(V()).add(this.hold.offset),rest=this.actor?.group.localToWorld(this.rest[i].clone());if(rest&&target.distanceTo(rest)>.40)this.hold.pullTime+=step;else this.hold.pullTime=0;if(this.hold.pullTime>.28)this.detach();
    // Tear only under deliberate continued pulling. Remove the affected faces
    // as well as constraints, so disconnected edges cannot stretch triangles.
    for(const e of this.edges){if(e.broken||e.compliance>1e-5||e.a!==i&&e.b!==i)continue;if(this.p[e.a].distanceTo(this.p[e.b])>e.len*2.35&&target.distanceTo(this.p[i])>.06){e.broken=true;this.torn.add(e.a+','+e.b);this.faces=this.faces.filter(f=>!(f.includes(e.a)&&f.includes(e.b)));this.mesh.geometry.setIndex(this.faces.flat());}}
   }
   this.acc-=step;
  }this.sync();
 }
 sync(){const g=this.mesh.geometry;this.p.forEach((p,i)=>p.toArray(g.attributes.position.array,i*3));g.attributes.position.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();}
 dispose(scene){scene.remove(this.mesh);this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
export class Wardrobe {
 constructor(scene,system,contacts,world){this.scene=scene;this.system=system;this.contacts=contacts;this.world=world;this.clothes=[];this.drags=new Map();this.rack=new T.Group();scene.add(this.rack);this.rack.position.set(-3.3,0,2.4);this.rack.rotation.y=.45;this.tokens=[];this.status='Drag an article onto Mira';
  const wood=new T.MeshStandardMaterial({color:0x775b42,roughness:.85});const add=(w,h,d,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),wood);m.position.set(x,y,z);m.castShadow=true;this.rack.add(m);};add(1.35,.12,.5,0,.08,0);add(.07,1.9,.07,-.66,1,0);add(.07,1.9,.07,.66,1,0);add(1.35,.06,.06,0,1.9,0);
  GARMENTS.forEach((s,i)=>{const m=new T.Mesh(new T.CylinderGeometry(.11,s.id==='top'?.14:.19,s.id==='top'?.31:.48,16,5,true),new T.MeshStandardMaterial({color:s.color,roughness:.93,side:T.DoubleSide}));m.position.set((i%6-2.5)*.22,1.55-Math.floor(i/6)*.55,0);m.scale.setScalar(.55);m.userData.article=s;this.rack.add(m);this.tokens.push(m);});
  this.world.obstacle(-3.3,2.4,1.3,.6,0,2);
 }
 equip(actor,style){if(!style||actor?.version!=='v2')return false;for(const c of [...this.clothes])if(c.actor===actor&&(c.style.slot===style.slot||style.slot==='dress'&&['top','bottom'].includes(c.style.slot)||c.style.slot==='dress'&&['top','bottom'].includes(style.slot)))this.remove(c);const surface=this.contacts.surface(actor);surface.begin();const c=new Cloth(this.scene,actor,style,surface);this.clothes.push(c);this.status=style.name+' fitted to Mira';return c;}
 remove(c){c.dispose(this.scene);this.clothes=this.clothes.filter(x=>x!==c);}
 hit(ray){const rc=new T.Raycaster();rc.ray.copy(ray);this.rack.updateMatrixWorld(true);return rc.intersectObjects([...this.tokens,...this.clothes.map(c=>c.mesh)],false)[0];}
 begin(ray,handle,key){const hit=this.hit(ray);if(!hit)return false;const d={handle,depth:Math.min(4,hit.distance),cloth:hit.object.userData.cloth,style:hit.object.userData.article};handle.position.copy(hit.point);if(d.cloth){d.cloth.begin(hit.point,handle);if(d.cloth.actor)this.system.select(d.cloth.actor);}else{d.ghost=hit.object.clone();d.ghost.material=d.ghost.material.clone();d.ghost.material.transparent=true;d.ghost.material.opacity=.65;this.scene.add(d.ghost);d.ghost.position.copy(hit.point);}this.drags.set(key,d);this.status='Release over Mira to dress · pull worn cloth to remove';return true;}
 move(key,ray){const d=this.drags.get(key);if(!d)return;d.handle.position.copy(ray.at(d.depth,V()));d.ghost?.position.copy(d.handle.position);}
 end(key,ray){const d=this.drags.get(key);if(!d)return;const rc=new T.Raycaster();rc.ray.copy(ray);const meshes=[];for(const a of this.system.actors)a.root.traverse(m=>{if(m.isSkinnedMesh&&/^body/.test(m.name)){m.computeBoundingSphere();meshes.push(m);}});const hit=rc.intersectObjects(meshes,false)[0];let actor=null;if(hit){let o=hit.object;while(o){actor=this.system.actors.find(a=>a.root===o);if(actor)break;o=o.parent;}}
  if(d.cloth)d.cloth.hold=null;if(actor&&(d.style||d.cloth?.detached)){const style=d.style||d.cloth.style;if(d.cloth)this.remove(d.cloth);this.equip(actor,style);}
  if(d.ghost){this.scene.remove(d.ghost);d.ghost.material.dispose();}this.drags.delete(key);
 }
 cancel(key){const d=this.drags.get(key);if(!d)return;if(d.cloth)d.cloth.hold=null;if(d.ghost){this.scene.remove(d.ghost);d.ghost.material.dispose();}this.drags.delete(key);}
 tick(dt){for(const c of [...this.clothes]){if(c.actor&&!this.system.actors.includes(c.actor)){this.remove(c);continue;}if(c.actor&&c.shapeStamp!==c.actor.geomState&&!c.hold){this.equip(c.actor,c.style);continue;}if(c.actor)c.surface.begin();c.tick(dt,this.system.actors,this.system.hands.colliders,this.world);}const loose=this.clothes.filter(c=>c.detached&&!c.hold);while(loose.length>4)this.remove(loose.shift());}
}
