import * as T from 'three';
import {bodyVolumes,projectVolume} from './mira-v2-contact.js?v=h3.3';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),up=new T.Vector3(0,1,0);
export class Restraints {
 constructor(props){
  this.props=props;this.scene=props.scene;this.system=props.system;this.world=props.world;
  this.links=[];this.selected=null;this.pending=null;this.placing=false;this.mode='rope';this.button=new WeakMap();this.next=1;
  this.status='Click PLACE, then choose two anchor points.';
  this._q=new T.Quaternion();this._v=new T.Vector3();this._rc=new T.Raycaster();
  this.buildEditor();
 }
 get editorOpen(){return !!this.editor?.open;}
 buildEditor(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=400;
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  const mesh=new T.Mesh(new T.PlaneGeometry(.48,.375),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false,depthTest:false,depthWrite:false}));
  mesh.visible=false;mesh.renderOrder=24;this.scene.add(mesh);
  this.editor={canvas,ctx:canvas.getContext('2d'),tex,mesh,items:[],open:false,drag:null,hover:-1};
 }
 placeEditor(){
  const xr=this.props.renderer.xr;if(!xr.isPresenting){this.closeEditor();return;}
  const cam=xr.getCamera();cam.updateWorldMatrix(true,false);
  const eye=cam.getWorldPosition(this._v),q=cam.getWorldQuaternion(this._q);
  const fwd=new T.Vector3(0,0,-1).applyQuaternion(q),right=new T.Vector3(1,0,0).applyQuaternion(q);
  fwd.y*=.15;if(fwd.lengthSq()<1e-6)fwd.set(0,0,-1);fwd.normalize();
  this.editor.mesh.position.copy(eye).addScaledVector(fwd,.82).addScaledVector(right,.24);this.editor.mesh.position.y-=.06;
  this.editor.mesh.quaternion.copy(q);
 }
 openEditor(link){
  this.selected=link;this.editor.open=true;this.editor.mesh.visible=this.props.renderer.xr.isPresenting;this.editor.drag=null;
  if(this.editor.mesh.visible)this.placeEditor();
  this.drawEditor();
 }
 closeEditor(){if(!this.editor)return;this.editor.open=false;this.editor.mesh.visible=false;this.editor.drag=null;}
 drawEditor(){
  const l=this.selected,ctx=this.editor.ctx,items=[];
  ctx.fillStyle='#121821';ctx.fillRect(0,0,512,400);ctx.strokeStyle='#7eb6ff';ctx.lineWidth=4;ctx.strokeRect(3,3,506,394);
  ctx.fillStyle='#e8f4ff';ctx.font='bold 28px sans-serif';ctx.fillText(l?'Link '+l.id+(l.broken?' · cut':'')+' editor':'No link',24,44);
  ctx.font='20px sans-serif';ctx.fillStyle='#b7c8d8';ctx.fillText('Point + trigger to adjust. Grip still drops weapons.',24,74);
  function slider(label,y,u,fn){
   ctx.fillStyle='#d5e6f5';ctx.font='22px sans-serif';ctx.fillText(label,24,y);
   ctx.fillStyle='#314354';ctx.fillRect(24,y+10,464,22);ctx.fillStyle='#8fd4ff';ctx.fillRect(24,y+10,464*u,22);
   ctx.beginPath();ctx.arc(24+464*u,y+21,12,0,Math.PI*2);ctx.fill();
   items.push({x:16,y:y-6,w:480,h:52,slider:true,fn});
  }
  function button(label,x,y,w,h,fn){ctx.fillStyle='#2a4258';ctx.fillRect(x,y,w,h);ctx.fillStyle='#edf6ff';ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText(label,x+w/2,y+h/2+8);ctx.textAlign='left';items.push({x,y,w,h,fn});}
  if(l&&!l.broken){
   slider('Length  '+(l.length||0).toFixed(2)+' m',110,Math.min(1,l.length/5),px=>this.setLength((px-24)/464*5));
   slider('Break force  '+Math.round(l.strength||30),200,Math.min(1,(l.strength||30)/100),px=>this.setStrength((px-24)/464*100));
   ctx.fillStyle='#9bb0c2';ctx.font='18px sans-serif';ctx.fillText('Higher break force needs a harder yank to snap the link.',24,270);
   button('DONE',24,300,150,64,()=>this.closeEditor());
   button('CUT',186,300,150,64,()=>{this.cut();this.drawEditor();});
   button('REMOVE',348,300,140,64,()=>{this.remove();});
  }else{
   ctx.fillStyle='#d5e6f5';ctx.font='22px sans-serif';ctx.fillText('This link is gone or already cut.',24,150);
   button('CLOSE',24,300,464,64,()=>this.closeEditor());
  }
  this.editor.items=items;this.editor.tex.needsUpdate=true;
 }
 editorHit(i){
  const ctrl=this.system.hands.ctrl[i];if(!ctrl)return null;
  this._rc.ray.origin.copy(ctrl.getWorldPosition(V()));
  this._rc.ray.direction.set(0,0,-1).applyQuaternion(ctrl.getWorldQuaternion(Q()));
  const hit=this._rc.intersectObject(this.editor.mesh)[0];if(!hit?.uv)return null;
  return {x:hit.uv.x*512,y:(1-hit.uv.y)*400};
 }
 handleSelect(i){
  if(!this.editor.open||!this.editor.mesh.visible)return false;
  const p=this.editorHit(i);if(!p)return false;
  const item=this.editor.items.find(a=>p.x>=a.x&&p.x<=a.x+a.w&&p.y>=a.y&&p.y<=a.y+a.h);
  if(item){try{item.fn(p.x);}catch(e){this.status=e.message;}if(item.slider)this.editor.drag={i,item};this.drawEditor();}
  return true;
 }
 anchor(hit){const actor=this.props.actorFor(hit.object),point=hit.point.clone();if(actor){if(actor.version!=='v2')return null;const region=actor.nearestHit(point,.22);if(!region)return null;const bone=actor.bones[region.name];return {actor,bone,region,local:bone.worldToLocal(point.clone()),point,weight:1/70};}const item=this.props.items.find(i=>i.id===hit.object.userData.weapon);if(item)return {object:item.group,item,local:item.group.worldToLocal(point.clone()),point,weight:1/item.data.mass};const piece=hit.object.userData.chunks?.[hit.instanceId]||hit.object.userData.piece;if(hit.object.isInstancedMesh)return {point,piece,weight:0};const car=hit.object.userData.carPart;return {object:hit.object,local:hit.object.worldToLocal(point.clone()),point,piece,car,weight:car?1/1250:0};}
 position(a){if(a.actor)return a.bone.localToWorld(a.local.clone());if(a.object)return a.object.localToWorld(a.local.clone());return a.point.clone();}
 start(){this.placing=true;this.pending=null;this.closeEditor();this.status='Choose first anchor.';}
 cancel(){this.pending=null;this.placing=false;this.closeEditor();this.status='Placement cancelled.';}
 place(ray){const old=this.hit(ray,15);let hit=this.props.hit(ray,15,false);const rc=new T.Raycaster();rc.ray.copy(ray);rc.far=hit?.distance||15;const equipment=rc.intersectObjects(this.props.items.map(i=>i.group),true)[0];if(equipment)hit=equipment;if(old&&(!hit||old.distance<hit.distance)){this.selected=old.object.userData.restraint;this.status='Selected link '+this.selected.id;if(this.props.renderer.xr.isPresenting)this.openEditor(this.selected);return true;}if(!hit){this.status='Point at an NPC, object or wall.';return true;}const anchor=this.anchor(hit);if(!anchor){this.status='Choose a v2 actor or scenery.';return true;}if(!this.pending){this.pending=anchor;this.placing=true;this.status='First anchor set. Choose the second.';return true;}const a=this.pending;if(a.bone===anchor.bone&&a.object===anchor.object&&this.position(a).distanceTo(this.position(anchor))<.05){this.status='Choose a different anchor point.';return true;}this.create(a,anchor,this.mode);this.pending=null;this.placing=false;return true;}
 create(a,b,mode='rope'){
  if(this.links.length>=8)this.remove(this.links[0]);
  const p=this.position(a),q=this.position(b),length=mode==='fuse'?.03:Math.max(.08,p.distanceTo(q)*1.04),n=12;
  const rope=new T.InstancedMesh(new T.CylinderGeometry(.006,.006,1,7),new T.MeshStandardMaterial({color:mode==='fuse'?0xb5bdc4:0x8c7454,roughness:.8,metalness:mode==='fuse'?.6:0}),n);
  rope.frustumCulled=false;
  const link={id:this.next++,a,b,length,strength:30,mode,n,rope,broken:false,cut:6,p:[],prev:[],cuffs:[]};
  rope.userData.restraint=link;
  for(let i=0;i<=n;i++){const v=p.clone().lerp(q,i/n);link.p.push(v);link.prev.push(v.clone());}
  for(const end of [a,b]){
   const r=(end.actor?end.region.kind==='head'?.061:/thigh|hip/.test(end.region.kind)?.086:/arm|hand|foot|leg/.test(end.region.kind)?.038:.10:.025)*0.5;
   const cuff=new T.Mesh(new T.TorusGeometry(r,.004,6,24),new T.MeshStandardMaterial({color:0xa5b0b6,roughness:.32,metalness:.6}));
   cuff.userData.restraint=link;this.scene.add(cuff);link.cuffs.push(cuff);
  }
  this.scene.add(rope);this.links.push(link);this.selected=link;
  this.status='Link '+link.id+' attached. Set length and break force.';
  if(this.props.renderer.xr.isPresenting)this.openEditor(link);
  return link;
 }
 setLength(value){if(this.selected&&!this.selected.broken)this.selected.length=T.MathUtils.clamp(Number(value)||.03,.03,5);}
 setStrength(value){if(this.selected&&!this.selected.broken)this.selected.strength=T.MathUtils.clamp(Number(value)||30,1,100);}
 cut(link=this.selected,index=6){if(!link||link.broken)return;link.broken=true;link.cut=T.MathUtils.clamp(index,1,link.n-2);link.rope.material.color.setHex(0x57483a);this.status='Link '+link.id+' cut; loose ends remain.';}
 remove(link=this.selected){if(!link)return;const was=this.selected===link;for(const m of [link.rope,...link.cuffs]){m.removeFromParent();m.geometry.dispose();m.material.dispose();}this.links=this.links.filter(l=>l!==link);if(was){this.selected=this.links.at(-1)||null;this.closeEditor();}this.status='Link removed.';}
 hit(ray,max=15){const rc=new T.Raycaster();rc.ray.copy(ray);rc.far=max;return rc.intersectObjects(this.links.flatMap(l=>[l.rope,...l.cuffs]),false)[0];}
 move(a,delta,dt){if(a.item){if(a.item.holder===null){a.item.group.position.add(delta.clone().clampLength(0,.06));a.item.velocity.multiplyScalar(.8);}return;}if(a.car){this.props.vehicle.pull(delta);return;}const actor=a.actor;if(!actor||!this.system.actors.includes(actor))return;actor.socialPair?.cancel();actor.autonomy=false;actor.dest=null;actor.navigation=null;actor.seat=null;const name=a.region.name,side=name[0],arm=/arm|hand/.test(a.region.kind),leg=/thigh|leg|foot/.test(a.region.kind),correction=delta.clone().clampLength(0,Math.min(.055,dt*2.5));if(arm||leg){const kind=arm?'arm':'leg',tip=actor.bones[side+(arm?'_Hand':'_Foot')],pole=actor.group.localToWorld(new T.Vector3((side==='L'?1:-1)*(arm?.40:.14),arm?1.12:.50,arm?-.15:.35).multiplyScalar(actor.shape.height));actor.solveChain(side,kind,tip.getWorldPosition(V()).add(correction),pole);actor.group.updateMatrixWorld(true);const remaining=delta.length()-.025;if(remaining>.02)actor.group.position.addScaledVector(correction,.35);if(leg&&delta.length()>.12)actor.knockDown(delta);}else{actor.group.position.addScaledVector(correction,.8);if(a.region.kind==='head'){const local=correction.clone().applyQuaternion(actor.group.quaternion.clone().invert());actor.headTouchGoal.add(new T.Vector3(-local.y*2,local.x*2,0));}else actor.spineGoal.add(new T.Vector3(correction.z*.8,0,-correction.x*.8));}actor.group.position.y=Math.max(actor.baseY||0,actor.group.position.y);actor.group.updateMatrixWorld(true);actor.contactSoft?.(a.region,delta.clone().normalize(),.002,.03);}
 solve(dt){
  for(const link of this.links){
   if(link.broken)continue;
   if([link.a,link.b].some(a=>a.piece?.broken||a.actor&&!this.system.actors.includes(a.actor))){this.cut(link);continue;}
   for(let j=0;j<3;j++){
    const a=this.position(link.a),b=this.position(link.b),d=b.sub(a),n=d.length(),extra=n-link.length,wa=link.a.item?.holder!=null?0:link.a.weight,wb=link.b.item?.holder!=null?0:link.b.weight,total=wa+wb;
    if(extra>0.04+0.006*(link.strength||30)){this.cut(link);this.status='Link '+link.id+' snapped under tension.';break;}
    if(extra<=0||!total||n<1e-6)break;d.multiplyScalar(extra/n);this.move(link.a,d.clone().multiplyScalar(wa/total),dt/3);this.move(link.b,d.clone().multiplyScalar(-wb/total),dt/3);
   }
  }
 }
 tick(dt){
  const session=this.props.renderer.xr.getSession?.();
  if(this.editor.open){
   if(this.props.menu?.isOpen||!this.props.renderer.xr.isPresenting)this.closeEditor();
   else{
    this.placeEditor();
    if(this.editor.drag&&session){
     const i=this.editor.drag.i,src=[...session.inputSources].find(s=>s.handedness===this.system.hands.handedness[i]);
     if(!src?.gamepad?.buttons?.[0]?.pressed)this.editor.drag=null;
     else{const p=this.editorHit(i);if(p){this.editor.drag.item.fn(p.x);this.drawEditor();}}
    }
   }
  }
  if(session&&!this.props.menu?.isOpen)for(const src of session.inputSources){if(src.handedness!=='left'||!src.gamepad)continue;const down=!!src.gamepad.buttons[3]?.pressed;if(down&&!this.button.get(src)){const index=this.system.hands.handedness.indexOf('left');this.place(this.props.ray(index<0?0:index));}this.button.set(src,down);}
  const volumes=this.system.actors.filter(a=>a.version==='v2').flatMap(bodyVolumes);
  for(const l of this.links){
   const a=this.position(l.a),b=this.position(l.b);
   for(let i=0;i<=l.n;i++){const p=l.p[i],old=p.clone();p.add(p.clone().sub(l.prev[i]).multiplyScalar(Math.exp(-dt*3)));p.y-=9.81*dt*dt;l.prev[i].copy(old);}
   const segment=l.length/l.n;
   for(let pass=0;pass<4;pass++){l.p[0].copy(a);l.p[l.n].copy(b);for(let i=0;i<l.n;i++){if(l.broken&&i===l.cut)continue;const d=l.p[i+1].clone().sub(l.p[i]),len=d.length();if(len<1e-6)continue;d.multiplyScalar((len-segment)/len);if(i===0)l.p[i+1].sub(d);else if(i===l.n-1)l.p[i].add(d);else{l.p[i].addScaledVector(d,.5);l.p[i+1].addScaledVector(d,-.5);}}}
   for(let i=1;i<l.n;i++){for(const c of volumes)projectVolume(l.p[i],.005,c);this.world.projectSphere(l.p[i],.006);l.p[i].y=Math.max(.008,l.p[i].y);}
   l.p[0].copy(a);l.p[l.n].copy(b);
   for(let i=0;i<l.n;i++){const p=l.p[i],q=l.p[i+1],d=q.clone().sub(p),length=d.length(),m=new T.Matrix4();if(l.broken&&i===l.cut)m.makeScale(0,0,0);else m.compose(p.clone().lerp(q,.5),Q().setFromUnitVectors(up,d.normalize()),new T.Vector3(1,Math.max(.001,length),1));l.rope.setMatrixAt(i,m);}
   l.rope.instanceMatrix.needsUpdate=true;l.rope.computeBoundingSphere();
   l.cuffs.forEach((c,i)=>{const end=i?l.b:l.a,p=i?b:a;c.position.copy(p);if(end.bone)c.quaternion.copy(end.bone.getWorldQuaternion(Q()));else c.lookAt(i?a:b);});
  }
 }
}
