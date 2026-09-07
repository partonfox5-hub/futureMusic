import * as T from 'three';
import {bodyVolumes,projectVolume} from './mira-v2-contact.js?v=h4.1';
const V=()=>new T.Vector3();
import {GARMENTS} from './mira-v2-garments.js?v=h4.1';
export {GARMENTS} from './mira-v2-garments.js?v=h4.1';
import {garmentPattern,fabricMaterial} from './mira-v2-garment-patterns.js?v=h4.5';
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
 skinPoint(i){const ref=this.skinAnchors[i];if(!ref)return this.anchorBone.localToWorld(this.anchor[i].clone());const tri=new T.Triangle();this.surface.vertex(ref.cache,ref.ids[0],tri.a);this.surface.vertex(ref.cache,ref.ids[1],tri.b);this.surface.vertex(ref.cache,ref.ids[2],tri.c);return tri.a.clone().multiplyScalar(ref.bary.x).addScaledVector(tri.b,ref.bary.y).addScaledVector(tri.c,ref.bary.z).addScaledVector(tri.getNormal(V()),.022);}
 glued(i){return !this.detached&&(this.pin(i)||(i<this.fitted&&this.style.kind!=='drape'&&this.hold?.index!==i));}
 tick(dt,actors,hands,world){
  this.acc=Math.min(.04,this.acc+dt);const step=1/90,caps=actors.flatMap(a=>a.version==='v2'?bodyVolumes(a).map(c=>({...c,actor:a})):[]).concat(hands||[]);
  const follow=1-Math.exp(-step*16);
  while(this.acc>=step){this.age+=step;for(let i=0;i<this.p.length;i++){const p=this.p[i];if(this.glued(i)){p.copy(this.skinPoint(i));this.prev[i].copy(p);continue;}if(!this.detached&&i<this.fitted&&this.hold?.index!==i){p.lerp(this.skinPoint(i),follow);this.prev[i].copy(p);continue;}const old=p.clone(),v=p.clone().sub(this.prev[i]).multiplyScalar(.94);if(v.length()>.04)v.setLength(.04);p.add(v);p.y-=9.81*step*step;this.prev[i].copy(old);}this.edges.forEach(e=>e.lambda=0);
   const passes=this.style.kind==='surface'?1:2;
   for(let pass=0;pass<passes;pass++){
    for(const e of this.edges){if(e.broken)continue;const p=this.p[e.a],q=this.p[e.b],d=q.clone().sub(p),l=d.length();if(l<1e-8)continue;const wa=this.glued(e.a)?0:1,wb=this.glued(e.b)?0:1;if(!wa&&!wb)continue;const alpha=e.compliance/(step*step),dl=(-(l-e.len)-alpha*e.lambda)/(wa+wb+alpha);e.lambda+=dl;d.multiplyScalar(dl/l);p.addScaledVector(d,-wa);q.addScaledVector(d,wb);}
    if(this.hold){const target=this.hold.handle.getWorldPosition(V()).add(this.hold.offset);this.p[this.hold.index].lerp(target,.88);}
    for(let i=0;i<this.p.length;i++){if(this.glued(i))continue;const p=this.p[i];for(const c of caps)if(!(i<this.fitted&&!this.detached&&c.actor===this.actor))projectVolume(p,.009,c);
     const skin=!this.detached&&this.skinAnchors[i];if(skin){const tri=new T.Triangle();this.surface.vertex(skin.cache,skin.ids[0],tri.a);this.surface.vertex(skin.cache,skin.ids[1],tri.b);this.surface.vertex(skin.cache,skin.ids[2],tri.c);const q=tri.a.clone().multiplyScalar(skin.bary.x).addScaledVector(tri.b,skin.bary.y).addScaledVector(tri.c,skin.bary.z),n=tri.getNormal(V()),delta=p.clone().sub(q),d=delta.dot(n);if(delta.length()<.16&&d<.02){p.addScaledVector(n,.02-d);if(pass===0)this.actor.contactSoft({name:skin.bone.name,kind:/Breast/.test(skin.bone.name)?'breast':/Butt/.test(skin.bone.name)?'glute':'chest'},n,Math.min(.02-d,.008),0);}}
     p.y=Math.max(.012,p.y);world?.projectSphere(p,.009);}
   }
   if(this.hold){const i=this.hold.index,target=this.hold.handle.getWorldPosition(V()).add(this.hold.offset),rest=this.actor?.group.localToWorld(this.rest[i].clone());if(rest&&target.distanceTo(rest)>.40)this.hold.pullTime+=step;else this.hold.pullTime=0;if(this.hold.pullTime>.28)this.detach();
    for(const e of this.edges){if(e.broken||e.compliance>1e-5||e.a!==i&&e.b!==i)continue;if(this.p[e.a].distanceTo(this.p[e.b])>e.len*2.35&&target.distanceTo(this.p[i])>.06){e.broken=true;this.torn.add(e.a+','+e.b);this.faces=this.faces.filter(f=>!(f.includes(e.a)&&f.includes(e.b)));this.mesh.geometry.setIndex(this.faces.flat());}}
   }
   this.acc-=step;
  }this._nSync=(this._nSync||0)+1;this.sync(this._nSync%3===0);
 }
 sync(normals=true){const g=this.mesh.geometry;this.p.forEach((p,i)=>p.toArray(g.attributes.position.array,i*3));g.attributes.position.needsUpdate=true;if(normals)g.computeVertexNormals();g.computeBoundingSphere();}
 dispose(scene){scene.remove(this.mesh);this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
export const CLOTH_COLORS=[
 {name:'Ivory',hex:0xe4d6bb},{name:'Black',hex:0x1c1c1c},{name:'White',hex:0xf4f0ea},{name:'Navy',hex:0x1e3354},
 {name:'Crimson',hex:0x8b1e2d},{name:'Forest',hex:0x2f5a3c},{name:'Sky',hex:0x6ea8c9},{name:'Mustard',hex:0xc4a035},
 {name:'Blush',hex:0xe8cfc0},{name:'Teal',hex:0x285b65},{name:'Rose',hex:0xa74861},{name:'Denim',hex:0x355876},
 {name:'Sand',hex:0xcbb48a},{name:'Plum',hex:0x5a3658},{name:'Olive',hex:0x6a7048},{name:'Charcoal',hex:0x3a3d42}
];
export function hueColor(h){return new T.Color().setHSL(((h%360)+360)%360/360,.52,.46).getHex();}
function styleCopy(style,color){return {...style,color:color??style.color};}

export class Wardrobe {
 constructor(scene,system,contacts,world){
  this.scene=scene;this.system=system;this.contacts=contacts;this.world=world;
  this.clothes=[];this.drags=new Map();this.inventory=[];this.tokens=[];this.nextId=1;
  this.open=0;this.openTarget=0;this.pickerOpen=false;this.status='Wardrobe: click to dress selected Mira';
  this.rack=new T.Group();scene.add(this.rack);this.rack.position.set(-4.18,0,3.15);this.rack.rotation.y=Math.PI/2;
  this.shell=[];this.buildCabinet();
  GARMENTS.forEach(s=>this.addArticle(s,s.color,true));
  this.syncObstacle();
 }
 buildCabinet(){
  const wood=new T.MeshStandardMaterial({color:0x6b4a32,roughness:.82,map:this.world.tex('walnut_wood.jpg')});
  wood.map=wood.map.clone();wood.map.repeat.set(1.4,2.2);wood.map.needsUpdate=true;
  const trim=new T.MeshStandardMaterial({color:0xc2b08a,roughness:.35,metalness:.35});
  const add=(w,h,d,x,y,z,mat=wood)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;this.rack.add(m);this.shell.push(m);return m;};
  add(1.18,.08,.52,0,.04,0);add(1.18,.06,.52,0,2.08,0);add(.07,2.04,.50,-.555,1.06,0);add(.07,2.04,.50,.555,1.06,0);
  add(1.10,.03,.46,0,1.12,-.02);add(1.04,2.0,.04,0,1.06,-.24);
  const rod=new T.Mesh(new T.CylinderGeometry(.012,.012,1.02,10),trim);rod.rotation.z=Math.PI/2;rod.position.set(0,1.78,.06);this.rack.add(rod);this.shell.push(rod);
  this.leftDoor=new T.Group();this.leftDoor.position.set(-.55,1.06,.26);this.rack.add(this.leftDoor);
  this.rightDoor=new T.Group();this.rightDoor.position.set(.55,1.06,.26);this.rack.add(this.rightDoor);
  const ld=new T.Mesh(new T.BoxGeometry(.54,2.0,.04),wood);ld.position.set(.27,0,0);ld.castShadow=true;this.leftDoor.add(ld);
  const rd=new T.Mesh(new T.BoxGeometry(.54,2.0,.04),wood);rd.position.set(-.27,0,0);rd.castShadow=true;this.rightDoor.add(rd);
  const lh=new T.Mesh(new T.CylinderGeometry(.012,.012,.11,8),trim);lh.rotation.x=Math.PI/2;lh.position.set(.46,0,.03);this.leftDoor.add(lh);
  const rh=new T.Mesh(new T.CylinderGeometry(.012,.012,.11,8),trim);rh.rotation.x=Math.PI/2;rh.position.set(-.46,0,.03);this.rightDoor.add(rh);
  this.doorMeshes=[ld,rd];
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;this.pickerCtx=canvas.getContext('2d');
  this.pickerTex=new T.CanvasTexture(canvas);this.pickerTex.colorSpace=T.SRGBColorSpace;
  this.picker=new T.Mesh(new T.PlaneGeometry(.62,.93),new T.MeshBasicMaterial({map:this.pickerTex,toneMapped:false,transparent:true}));
  this.picker.position.set(0,1.35,.42);this.picker.visible=false;this.picker.userData.wardrobePanel=true;this.rack.add(this.picker);
  this.pickerItems=[];this.drawPicker();
 }
 syncObstacle(){
  if(this.obstacle)this.world.removeObstacle(this.obstacle);
  this.obstacle=this.world.obstacle(this.rack.position.x,this.rack.position.z,.62,1.22,0,2.12,this.rack,0);
 }
 addArticle(style,color,silent=false){
  if(!style)return null;
  const s=styleCopy(style,color);s.uid=this.nextId++;
  const hang=s.slot==='bottom'||s.slot==='dress';
  const m=new T.Mesh(
   hang?new T.CylinderGeometry(.09,s.slot==='dress'?.16:.13,s.slot==='dress'?.42:.34,14,4,true):new T.BoxGeometry(.16,.04,.12),
   new T.MeshStandardMaterial({color:s.color,roughness:.9,side:T.DoubleSide})
  );
  m.userData.article=s;m.castShadow=true;this.rack.add(m);this.tokens.push(m);this.inventory.push({style:s,mesh:m});
  this.layoutTokens();this.drawPicker();
  if(!silent)this.status='Stored '+s.name+' in the wardrobe';
  return s;
 }
 layoutTokens(){
  this.inventory.forEach((item,i)=>{
   const col=i%6,row=Math.floor(i/6);
   if(item.style.slot==='bottom'||item.style.slot==='dress')item.mesh.position.set((col-2.5)*.16,1.62-row*.12,.08);
   else item.mesh.position.set((col-2.5)*.16,.92-Math.min(row,3)*.08,.05);
   item.mesh.rotation.set(item.style.slot==='top'?0.1:0,0,0);
  });
 }
 drawPicker(){
  const ctx=this.pickerCtx,w=512,h=768;ctx.fillStyle='#1a222c';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#8eb6d6';ctx.lineWidth=4;ctx.strokeRect(4,4,w-8,h-8);
  ctx.fillStyle='#eef6ff';ctx.font='bold 28px sans-serif';ctx.fillText('WARDROBE',24,48);
  ctx.font='20px sans-serif';ctx.fillStyle='#b7c8d8';ctx.fillText('Point + trigger to dress selected Mira',24,80);
  this.pickerItems=[{x:20,y:96,w:472,h:48,fn:'toggle'}];
  ctx.fillStyle='#2a3d52';ctx.fillRect(20,96,472,48);ctx.fillStyle='#edf6ff';ctx.font='22px sans-serif';ctx.fillText(this.openTarget>.5?'CLOSE DOORS':'OPEN DOORS',40,128);
  this.inventory.forEach((item,i)=>{
   const y=160+i*52;if(y>720)return;
   ctx.fillStyle='#26384b';ctx.fillRect(20,y,472,46);
   ctx.fillStyle='#'+item.style.color.toString(16).padStart(6,'0');ctx.fillRect(28,y+8,30,30);
   ctx.fillStyle='#edf6ff';ctx.font='22px sans-serif';ctx.fillText(item.style.name,70,y+32);
   this.pickerItems.push({x:20,y,w:472,h:46,fn:'wear',index:i});
  });
  this.pickerTex.needsUpdate=true;
 }
 toggleDoors(){this.openTarget=this.openTarget>.5?0:1;this.pickerOpen=this.openTarget>.5;this.picker.visible=this.pickerOpen;this.drawPicker();this.status=this.pickerOpen?'Pick an article for the selected Mira':'Wardrobe closed';}
 command(ray,actor){
  const rc=new T.Raycaster();rc.ray.copy(ray);this.rack.updateMatrixWorld(true);
  if(this.picker.visible){
   const ph=rc.intersectObject(this.picker)[0];
   if(ph){
    const x=ph.uv.x*512,y=(1-ph.uv.y)*768;
    const item=this.pickerItems.find(a=>x>=a.x&&x<=a.x+a.w&&y>=a.y&&y<=a.y+a.h);
    if(item?.fn==='toggle'){this.toggleDoors();return 'wardrobe';}
    if(item?.fn==='wear'){
     const art=this.inventory[item.index];
     if(art&&this.equip(actor||this.system.selected,art.style))return 'wardrobe';
     this.status='Select a Mira first';return 'wardrobe';
    }
   }
  }
  const hit=rc.intersectObjects([...this.doorMeshes,...this.shell,...this.tokens],false)[0];
  if(!hit)return null;
  if(hit.object.userData.article){
   if(this.equip(actor||this.system.selected,hit.object.userData.article))return 'wardrobe';
   this.status='Select a Mira first';return 'wardrobe';
  }
  this.toggleDoors();return 'wardrobe';
 }
 equip(actor,style){if(!style||actor?.version!=='v2')return false;for(const c of [...this.clothes])if(c.actor===actor&&(c.style.slot===style.slot||style.slot==='dress'&&['top','bottom'].includes(c.style.slot)||c.style.slot==='dress'&&['top','bottom'].includes(style.slot)))this.remove(c);const surface=this.contacts.surface(actor);surface.begin();const c=new Cloth(this.scene,actor,style,surface);this.clothes.push(c);this.status=style.name+' fitted to '+(actor.displayName||'Mira');return c;}
 remove(c){c.dispose(this.scene);this.clothes=this.clothes.filter(x=>x!==c);}
 hit(ray){const rc=new T.Raycaster();rc.ray.copy(ray);this.rack.updateMatrixWorld(true);const objs=this.open>.4?this.tokens:[];return rc.intersectObjects([...objs,...this.clothes.map(c=>c.mesh)],false)[0];}
 begin(ray,handle,key){const hit=this.hit(ray);if(!hit)return false;const d={handle,depth:Math.min(4,hit.distance),cloth:hit.object.userData.cloth,style:hit.object.userData.article};handle.position.copy(hit.point);if(d.cloth){d.cloth.begin(hit.point,handle);if(d.cloth.actor)this.system.select(d.cloth.actor);}else{d.ghost=hit.object.clone();d.ghost.material=d.ghost.material.clone();d.ghost.material.transparent=true;d.ghost.material.opacity=.65;this.scene.add(d.ghost);d.ghost.position.copy(hit.point);}this.drags.set(key,d);this.status='Release over Mira to dress · pull worn cloth to remove';return true;}
 move(key,ray){const d=this.drags.get(key);if(!d)return;d.handle.position.copy(ray.at(d.depth,V()));d.ghost?.position.copy(d.handle.position);}
 end(key,ray){const d=this.drags.get(key);if(!d)return;const rc=new T.Raycaster();rc.ray.copy(ray);const meshes=[];for(const a of this.system.actors)a.root.traverse(m=>{if(m.isSkinnedMesh&&/^body/.test(m.name)){m.computeBoundingSphere();meshes.push(m);}});const hit=rc.intersectObjects(meshes,false)[0];let actor=null;if(hit){let o=hit.object;while(o){actor=this.system.actors.find(a=>a.root===o);if(actor)break;o=o.parent;}}
  if(d.cloth)d.cloth.hold=null;if(actor&&(d.style||d.cloth?.detached)){const style=d.style||d.cloth.style;if(d.cloth)this.remove(d.cloth);this.equip(actor,style);}
  if(d.ghost){this.scene.remove(d.ghost);d.ghost.material.dispose();}this.drags.delete(key);
 }
 cancel(key){const d=this.drags.get(key);if(!d)return;if(d.cloth)d.cloth.hold=null;if(d.ghost){this.scene.remove(d.ghost);d.ghost.material.dispose();}this.drags.delete(key);}
 tick(dt){
  this.open+=(this.openTarget-this.open)*(1-Math.exp(-dt*6));
  this.leftDoor.rotation.y=this.open*-1.15;this.rightDoor.rotation.y=this.open*1.15;
  this.picker.visible=this.pickerOpen&&this.open>.35;
  for(const c of [...this.clothes]){if(c.actor&&!this.system.actors.includes(c.actor)){this.remove(c);continue;}if(c.actor&&c.shapeStamp!==c.actor.geomState&&!c.hold){c._refitWait=(c._refitWait||0)+dt;if(c._refitWait>.45){this.equip(c.actor,c.style);continue;}}else if(c)c._refitWait=0;if(c.actor)c.surface.begin();c.tick(dt,this.system.actors,this.system.hands.colliders,this.world);}const loose=this.clothes.filter(c=>c.detached&&!c.hold);while(loose.length>4)this.remove(loose.shift());
 }
}
