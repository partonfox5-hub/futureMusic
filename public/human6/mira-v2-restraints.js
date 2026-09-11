import * as T from 'three';
import {bodyVolumes,projectVolume} from './mira-v2-contact.js?v=19.1.0';
import {furnitureRoot,syncFurniture} from './mira-v2-furniture.js?v=19.1.0';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),up=new T.Vector3(0,1,0);
export class Restraints {
 constructor(props){
  this.props=props;this.scene=props.scene;this.system=props.system;this.world=props.world;this.links=[];this.selected=null;this.pending=null;this.placing=false;this.mode='rope';this.button=new WeakMap();this.trigger=new WeakMap();this.next=1;this.status='Click PLACE, then choose two anchor points.';this.popupUntil=0;
  this.html=typeof document!=='undefined'?document.getElementById('restraintPopup'):null;
  if(this.html){
   this.html.querySelector('#rpRange')?.addEventListener('input',e=>this.setLength(e.target.value));
   this.html.querySelector('#rpShorter')?.addEventListener('click',()=>this.setLength((this.selected?.length||1)-.08));
   this.html.querySelector('#rpLonger')?.addEventListener('click',()=>this.setLength((this.selected?.length||1)+.08));
   this.html.querySelector('#rpCut')?.addEventListener('click',()=>this.cut());
   this.html.querySelector('#rpClose')?.addEventListener('click',()=>this.hidePopup());
   this.html.querySelector('#rpCloseX')?.addEventListener('click',()=>this.hidePopup());
  }
 }
 dogRoot(object){let o=object;while(o){if(o.name==='Human2_Dog')return o;o=o.parent;}return null;}
 anchor(hit){
  const actor=this.props.actorFor(hit.object),point=hit.point.clone();
  if(actor){if(actor.version!=='v2')return null;const region=actor.nearestHit(point,.22);if(!region)return null;const bone=actor.bones[region.name];return {actor,bone,region,local:bone.worldToLocal(point.clone()),point,weight:1/70,mass:70};}
  const item=this.props.items.find(i=>i.id===hit.object.userData.weapon);if(item)return {object:item.group,item,local:item.group.worldToLocal(point.clone()),point,weight:1/Math.max(.4,item.data.mass),mass:item.data.mass};
  const furnObj=furnitureRoot(hit.object);if(furnObj?.userData?.furniture){const furn=furnObj.userData.furniture,mass=Math.max(2,furn.mass||8);return {object:furnObj,furniture:furn,local:furnObj.worldToLocal(point.clone()),point,weight:1/mass,mass};}
  const dog=this.dogRoot(hit.object);if(dog)return {object:dog,dog:true,local:dog.worldToLocal(point.clone()),point,weight:1/18,mass:18};
  const piece=hit.object.userData.chunks?.[hit.instanceId]||hit.object.userData.piece;if(hit.object.isInstancedMesh)return {point,piece,weight:0,mass:Infinity,static:true};
  const car=hit.object.userData.carPart;if(car)return {object:hit.object,local:hit.object.worldToLocal(point.clone()),point,piece,car,weight:1/1250,mass:1250};
  return {object:hit.object,local:hit.object.worldToLocal(point.clone()),point,piece,weight:0,mass:Infinity,static:true};
 }
 position(a){if(a.actor)return a.bone.localToWorld(a.local.clone());if(a.object)return a.object.localToWorld(a.local.clone());return a.point.clone();}
 midpoint(link){return this.position(link.a).lerp(this.position(link.b),.5);}
 start(){this.placing=true;this.pending=null;this.status='Choose first anchor.';}
 cancel(){this.pending=null;this.placing=false;this.status='Placement cancelled.';}
 place(ray){const old=this.hit(ray,15);let hit=this.props.hit(ray,15,false);const rc=new T.Raycaster();rc.ray.copy(ray);rc.far=hit?.distance||15;const equipment=rc.intersectObjects(this.props.items.map(i=>i.group),true)[0];if(equipment)hit=equipment;if(old&&(!hit||old.distance<hit.distance)){this.select(old.object.userData.restraint,old.point);return true;}if(!hit){this.status='Point at an NPC, object or wall.';return true;}const anchor=this.anchor(hit);if(!anchor){this.status='Choose a v2 actor or scenery.';return true;}if(!this.pending){this.pending=anchor;this.placing=true;this.status='First anchor set. Choose the second.';return true;}const a=this.pending;if(a.bone===anchor.bone&&a.object===anchor.object&&this.position(a).distanceTo(this.position(anchor))<.05){this.status='Choose a different anchor point.';return true;}this.create(a,anchor,this.mode);this.pending=null;this.placing=false;return true;}
 create(a,b,mode='rope'){if(this.links.length>=8)this.remove(this.links[0]);const p=this.position(a),q=this.position(b),length=mode==='fuse'?.03:Math.max(.08,p.distanceTo(q)*1.04),n=12,rope=new T.InstancedMesh(new T.CylinderGeometry(.006,.006,1,7),new T.MeshStandardMaterial({color:mode==='fuse'?0xb5bdc4:0x8c7454,roughness:.8,metalness:mode==='fuse'?.6:0}),n);rope.frustumCulled=false;rope.instanceMatrix.setUsage(T.DynamicDrawUsage);const link={id:this.next++,a,b,length,live:length,restLength:length,mode,n,rope,broken:false,cut:6,p:[],prev:[],cuffs:[]};rope.userData.restraint=link;for(let i=0;i<=n;i++){const v=p.clone().lerp(q,i/n);link.p.push(v);link.prev.push(v.clone());}for(const end of [a,b]){const r=end.actor?end.region.kind==='head'?.061:/thigh|hip/.test(end.region.kind)?.086:/arm|hand|foot|leg/.test(end.region.kind)?.038:.10:.025,cuff=new T.Mesh(new T.TorusGeometry(r,.006,6,24),new T.MeshStandardMaterial({color:0xa5b0b6,roughness:.32,metalness:.6}));cuff.userData.restraint=link;this.scene.add(cuff);link.cuffs.push(cuff);}this.scene.add(rope);this.links.push(link);this.select(link,p.clone().lerp(q,.5));this.status='Link '+link.id+' attached · '+(link.length).toFixed(2)+' m. Trigger the rope to set length.';return link;}
 select(link,point){if(!link)return;this.selected=link;this.popupUntil=(this.props.time||0)+18;this.popupPoint=point?.clone?.()||this.midpoint(link);this.status='Link '+link.id+' · '+link.length.toFixed(2)+' m · drag the length slider';this.syncHtml();this.ensurePanel();this.drawPanel();}
 setLength(value){if(!this.selected||this.selected.broken)return;this.selected.length=T.MathUtils.clamp(Number(value)||.03,.03,5);this.selected.restLength=this.selected.length;this.status='Link '+this.selected.id+' length '+this.selected.length.toFixed(2)+' m';this.popupUntil=(this.props.time||0)+18;this.syncHtml();this.drawPanel();}
 syncHtml(){if(!this.html)return;const link=this.selected;if(!link||link.broken){this.html.hidden=true;return;}this.html.hidden=false;const id=this.html.querySelector('#rpId'),len=this.html.querySelector('#rpLen'),range=this.html.querySelector('#rpRange');if(id)id.textContent=String(link.id);if(len)len.textContent=link.length.toFixed(2);if(range&&document.activeElement!==range)range.value=String(link.length);}
 hidePopup(){this.popupUntil=0;if(this.html)this.html.hidden=true;if(this.panel)this.panel.group.visible=false;}
 cut(link=this.selected,index=6){if(!link||link.broken)return;link.broken=true;link.cut=T.MathUtils.clamp(index,1,link.n-2);link.rope.material.color.setHex(0x57483a);this.status='Link '+link.id+' cut; loose ends remain.';if(this.selected===link)this.hidePopup();}
 remove(link=this.selected){if(!link)return;for(const m of [link.rope,...link.cuffs]){m.removeFromParent();m.geometry.dispose();m.material.dispose();}this.links=this.links.filter(l=>l!==link);if(this.selected===link){this.selected=this.links.at(-1)||null;this.hidePopup();}this.status='Link removed.';}
 clearAll(){const count=this.links.length;for(const link of [...this.links])this.remove(link);this.selected=null;this.cancel();this.hidePopup();this.status=count+' restraint links removed.';return count;}
 hit(ray,max=15){const rc=new T.Raycaster();rc.ray.copy(ray);rc.far=max;const objs=this.links.flatMap(l=>[l.rope,...l.cuffs]);if(this.panel?.group.visible)objs.push(this.panel.mesh);return rc.intersectObjects(objs,false)[0];}
 weight(a){if(!a||a.static||a.piece?.broken)return 0;if(a.actor&&!this.system.actors.includes(a.actor))return 0;return a.weight||0;}
 move(a,delta,hard=false){
  if(!a||a.static||delta.lengthSq()<1e-12)return;
  const step=delta.clone();if(!hard&&step.length()>.10)step.setLength(.10);else if(hard&&step.length()>.16)step.setLength(.16);
  if(a.item){if(a.item.holder===null){a.item.group.position.add(step);a.item.velocity?.multiplyScalar?.(.7);}else a.item.group.position.add(step.clone().multiplyScalar(.85));return;}
  if(a.car){this.props.vehicle.pull(step);return;}
  if(a.furniture&&a.object){a.object.position.add(step);a.object.updateWorldMatrix(true,true);syncFurniture(this.world,a.object);return;}
  if(a.dog&&a.object){a.object.position.add(step);return;}
  const actor=a.actor;if(!actor||!this.system.actors.includes(actor))return;
  actor.socialPair?.cancel();actor.autonomy=false;actor.dest=null;actor.navigation=null;actor.seat=null;
  const name=a.region.name,side=name[0],arm=/arm|hand/.test(a.region.kind),leg=/thigh|leg|foot/.test(a.region.kind);
  const correction=hard?step:step.clone().clampLength(0,.18);
  if(arm||leg){const kind=arm?'arm':'leg',tip=actor.bones[side+(arm?'_Hand':'_Foot')],pole=actor.group.localToWorld(new T.Vector3((side==='L'?1:-1)*(arm?.40:.14),arm?1.12:.50,arm?-.15:.35).multiplyScalar(actor.shape.height));actor.solveChain(side,kind,tip.getWorldPosition(V()).add(correction),pole);actor.group.updateMatrixWorld(true);actor.group.position.addScaledVector(correction,hard?.95:.55);if(leg&&delta.length()>.18)actor.knockDown(delta);}
  else{actor.group.position.add(correction);if(a.region.kind==='head'){const local=correction.clone().applyQuaternion(actor.group.quaternion.clone().invert());actor.headTouchGoal.add(new T.Vector3(-local.y*2,local.x*2,0));}else actor.spineGoal.add(new T.Vector3(correction.z*.8,0,-correction.x*.8));}
  const floor=this.world.floorHeight?.(actor.group.position,.2)??actor.baseY??0;
  actor.group.position.y=Math.max(floor,actor.group.position.y);actor.group.updateMatrixWorld(true);actor.contactSoft?.(a.region,delta.clone().normalize(),.002,.03);
 }
 clampLink(link){
  const A=this.position(link.a),B=this.position(link.b),span=link.live??link.length,n=A.distanceTo(B),extra=n-span;
  if(extra<=.002||n<1e-6)return;
  const dir=B.clone().sub(A).multiplyScalar(1/n);
  let wa=this.weight(link.a),wb=this.weight(link.b),total=wa+wb;
  if(!total){if(this.weight(link.a)+this.weight(link.b)===0)return;total=1;}
  this.move(link.a,dir.clone().multiplyScalar(extra*(total?wa/total:0)),true);
  this.move(link.b,dir.clone().multiplyScalar(-extra*(total?wb/total:0)),true);
 }
 solve(dt){
  dt=Math.min(.05,dt||.016);
  for(const link of this.links){
   if(link.broken)continue;
   link.live=link.live??link.length;
   const diff=link.length-link.live,step=Math.sign(diff)*Math.min(Math.abs(diff),1.15*dt);
   link.live+=step;
   if([link.a,link.b].some(a=>a.piece?.broken||a.actor&&!this.system.actors.includes(a.actor))){this.cut(link);continue;}
   for(let j=0;j<4;j++){
    const A=this.position(link.a),B=this.position(link.b),n=A.distanceTo(B),extra=n-link.live;
    if(extra<=.004||n<1e-6)break;
    let wa=this.weight(link.a),wb=this.weight(link.b),total=wa+wb;if(!total)break;
    const dir=B.clone().sub(A).multiplyScalar(1/n);
    this.move(link.a,dir.clone().multiplyScalar(Math.min(extra,0.12)*wa/total));
    this.move(link.b,dir.clone().multiplyScalar(-Math.min(extra,0.12)*wb/total));
   }
   this.clampLink(link);
  }
 }
 constrainActor(actor){if(!actor)return;for(const link of this.links){if(link.broken)continue;const mine=link.a.actor===actor?link.a:link.b.actor===actor?link.b:null;if(!mine)continue;const other=mine===link.a?link.b:link.a,P=this.position(mine),Q=this.position(other),span=link.live??link.length,n=P.distanceTo(Q);if(n<=span+.008)continue;const pull=Math.min(n-span,.14),target=Q.clone().add(P.sub(Q).setLength(span+0.002));const delta=target.sub(this.position(mine));if(delta.length()>pull)delta.setLength(pull);actor.group.position.add(delta);actor.group.updateMatrixWorld(true);}}
 constrainObject(object){if(!object)return;for(const link of this.links){if(link.broken)continue;const mine=link.a.object===object?link.a:link.b.object===object?link.b:null;if(!mine)continue;const other=mine===link.a?link.b:link.a,P=this.position(mine),Q=this.position(other),span=link.live??link.length,n=P.distanceTo(Q);if(n<=span+.008)continue;const pull=Math.min(n-span,.12),target=Q.clone().add(P.clone().sub(Q).setLength(span+0.002));const delta=target.sub(P);if(delta.length()>pull)delta.setLength(pull);object.position.add(delta);object.updateWorldMatrix(true,true);if(mine.furniture)syncFurniture(this.world,object);}}
 ensurePanel(){
  if(this.panel)return this.panel;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=280;
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
  const mesh=new T.Mesh(new T.PlaneGeometry(.46,.25),new T.MeshBasicMaterial({map:tex,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));
  mesh.renderOrder=22;mesh.userData.restraintPanel=true;
  const group=new T.Group();group.add(mesh);this.scene.add(group);group.visible=false;
  this.panel={group,canvas,tex,mesh};return this.panel;
 }
 panelHit(uv){
  if(!uv)return null;
  if(uv.x>.86&&uv.y>.82)return 'close';
  if(uv.y>.46&&uv.y<.64)return 'slider';
  if(uv.y>.18&&uv.y<.40){
   if(uv.x<.36)return 'shorter';
   if(uv.x<.68)return 'longer';
   return 'cut';
  }
  return null;
 }
 drawPanel(){
  const link=this.selected,p=this.panel;if(!p||!link||link.broken){if(p)p.group.visible=false;return;}
  const hover=this.panelHover,ctx=p.canvas.getContext('2d');ctx.clearRect(0,0,512,280);
  ctx.fillStyle='rgba(16,12,10,.94)';ctx.fillRect(0,0,512,280);
  ctx.strokeStyle=hover?'#c5e6ff':'#7eb6ff';ctx.lineWidth=4;ctx.strokeRect(2,2,508,276);
  ctx.fillStyle='#9bd6ff';ctx.font='700 28px Segoe UI,sans-serif';ctx.fillText('LINK '+link.id,24,44);
  ctx.fillStyle='#f4efe8';ctx.font='22px Segoe UI,sans-serif';ctx.fillText(link.length.toFixed(2)+' m',300,44);
  const xHover=hover==='close';
  ctx.fillStyle=xHover?'#ffd0d0':'#3a2a28';ctx.fillRect(448,12,52,44);
  ctx.strokeStyle=xHover?'#fff':'#9bd6ff';ctx.lineWidth=3;ctx.strokeRect(448,12,52,44);
  ctx.fillStyle=xHover?'#111':'#f4efe8';ctx.font='700 28px Segoe UI,sans-serif';ctx.fillText('×',462,44);
  ctx.fillStyle='#d8d0c6';ctx.font='16px Segoe UI,sans-serif';ctx.fillText('Point to highlight · trigger to use',24,78);
  ctx.fillStyle=hover==='slider'?'#6e8aa0':'#526c80';ctx.fillRect(28,112,456,36);
  ctx.fillStyle='#9bd6ff';ctx.fillRect(28,112,456*(link.length/5),36);
  ctx.fillStyle='#111';ctx.font='700 18px Segoe UI,sans-serif';ctx.fillText('LENGTH',210,137);
  const btn=(x,y,w,h,label,id)=>{const on=hover===id;ctx.fillStyle=on?'#d7f0ff':'#7eb6ff';ctx.fillRect(x,y,w,h);if(on){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeRect(x,y,w,h);}ctx.fillStyle='#111';ctx.font='700 18px Segoe UI,sans-serif';ctx.fillText(label,x+16,y+28);};
  btn(28,176,140,48,'SHORTER','shorter');btn(186,176,140,48,'LONGER','longer');btn(344,176,140,48,'CUT','cut');
  p.tex.needsUpdate=true;
 }
 panelAction(uv){
  if(!this.selected||this.selected.broken||!uv)return false;
  const hit=this.panelHit(uv);
  if(hit==='close'){this.hidePopup();this.selected=null;return true;}
  if(hit==='slider'){this.setLength(T.MathUtils.clamp((uv.x-.055)/.89*5,.03,5));return true;}
  if(hit==='shorter'){this.setLength(this.selected.length-.08);return true;}
  if(hit==='longer'){this.setLength(this.selected.length+.08);return true;}
  if(hit==='cut'){this.cut();return true;}
  return true;
 }
 tickPopup(){
  const link=this.selected;
  if(!link||link.broken){this.hidePopup();return;}
  this.ensurePanel();
  const xr=this.props.renderer?.xr?.isPresenting,p=this.panel;
  if(xr){
   p.group.visible=true;if(this.html)this.html.hidden=true;
   const mid=this.popupPoint||this.midpoint(link);
   const cam=this.props.camera,eye=cam.getWorldPosition(V());
   const toward=mid.clone().sub(eye);if(toward.lengthSq()<1e-6)toward.set(0,0,-1);
   p.group.position.copy(mid).addScaledVector(toward.normalize(),-.18);p.group.position.y+=.16;
   p.group.lookAt(eye);
   const session=this.props.renderer.xr.getSession?.();
   let hover=null;
   if(session)for(const src of session.inputSources){
    const i=this.system.hands.handedness.indexOf(src.handedness);if(i<0||!src.gamepad)continue;
    const down=!!src.gamepad.buttons[0]?.pressed,hit=this.hit(this.props.ray(i),2.4);
    if(hit?.object===p.mesh){hover=this.panelHit(hit.uv);if(down)this.panelAction(hit.uv);}
   }
   this.panelHover=hover;
   this.drawPanel();
  }else{
   p.group.visible=false;this.syncHtml();
  }
 }
 tick(dt){const session=this.props.renderer.xr.getSession?.();if(session&&!this.props.menu?.isOpen)for(const src of session.inputSources){if(src.handedness!=='left'||!src.gamepad)continue;const down=!!src.gamepad.buttons[3]?.pressed;if(down&&!this.button.get(src)){const index=this.system.hands.handedness.indexOf('left');this.place(this.props.ray(index<0?0:index));}this.button.set(src,down);}const volumes=this.system.actors.filter(a=>a.version==='v2').flatMap(bodyVolumes);for(const l of this.links){const a=this.position(l.a),b=this.position(l.b);for(let i=0;i<=l.n;i++){const p=l.p[i],old=p.clone();p.add(p.clone().sub(l.prev[i]).multiplyScalar(Math.exp(-dt*3)));p.y-=9.81*dt*dt;l.prev[i].copy(old);}const segment=l.length/l.n;for(let pass=0;pass<5;pass++){l.p[0].copy(a);l.p[l.n].copy(b);for(let i=0;i<l.n;i++){if(l.broken&&i===l.cut)continue;const d=l.p[i+1].clone().sub(l.p[i]),len=d.length();if(len<1e-6)continue;d.multiplyScalar((len-segment)/len);if(i===0)l.p[i+1].sub(d);else if(i===l.n-1)l.p[i].add(d);else{l.p[i].addScaledVector(d,.5);l.p[i+1].addScaledVector(d,-.5);}}}for(let i=1;i<l.n;i++){for(const c of volumes)projectVolume(l.p[i],.005,c);this.world.projectSphere(l.p[i],.006);l.p[i].y=Math.max(.008,l.p[i].y);}l.p[0].copy(a);l.p[l.n].copy(b);for(let i=0;i<l.n;i++){const p=l.p[i],q=l.p[i+1],d=q.clone().sub(p),length=d.length(),m=new T.Matrix4();if(l.broken&&i===l.cut)m.makeScale(0,0,0);else m.compose(p.clone().lerp(q,.5),Q().setFromUnitVectors(up,d.lengthSq()<1e-8?up:d.normalize()),new T.Vector3(1,Math.max(.001,length),1));l.rope.setMatrixAt(i,m);}l.rope.instanceMatrix.needsUpdate=true;l.rope.computeBoundingSphere();l.cuffs.forEach((c,i)=>{const end=i?l.b:l.a,p=i?b:a;c.position.copy(p);if(end.bone)c.quaternion.copy(end.bone.getWorldQuaternion(Q()));else c.lookAt(i?a:b);});}this.tickPopup(dt);}
}
