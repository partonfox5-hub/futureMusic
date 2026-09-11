import {placeXRHead} from './modules/human5-xr-placement.js?v=19.1.0';
import {refineOriginalSedan} from './modules/human5-sedan-detail.js?v=19.1.0';
import * as T from 'three';
import {withOffscreenView} from './modules/human5-view-surfaces.js?v=19.1.0';
import {VEHICLE_SPECS,buildVehicleModel} from './modules/human5-vehicle-models.js?v=19.1.0';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {CarAudio,unlockSfx} from './mira-v2-sfx.js?v=19.1.0';
const V=()=>new T.Vector3(),Q=()=>new T.Quaternion(),clamp=T.MathUtils.clamp,Y=new T.Vector3(0,1,0);
const QUEST=/Quest|OculusBrowser/i.test(globalThis.navigator?.userAgent||'');
const GEARS=['P','R','N','D'];
const GEAR_SPAN=.06;
const gearZ=g=>(GEARS.indexOf(g)-1.5)*GEAR_SPAN;
const gearIndex=z=>clamp(Math.round(z/GEAR_SPAN+1.5),0,GEARS.length-1);
// Authored parametric panels; no external vehicle model or textures.
function patch(fn,nu=12,nv=6){const p=[],uv=[],ix=[];for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){p.push(...fn(i/nu,j/nv));uv.push(i/nu,j/nv);if(i<nu&&j<nv){const a=j*(nu+1)+i,b=a+nu+1;ix.push(a,b,a+1,a+1,b,b+1);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;}
function merge(gs){const p=[],uv=[],ix=[];let offset=0;for(const g of gs){p.push(...g.attributes.position.array);uv.push(...g.attributes.uv.array);ix.push(...Array.from(g.index?.array||Array.from({length:g.attributes.position.count},(_,i)=>i),i=>i+offset));offset+=g.attributes.position.count;g.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;}
export class Car {
 constructor(props,{orbit,keys={},controls,color=0x28586b,stall=null,yaw=0,name='Car',kind='sedan'}={}){
  Object.assign(this,{props,scene:props.scene,world:props.world,renderer:props.renderer,camera:props.camera,rig:props.rig,orbit,keys,controls,paintColor:color,stall:stall||new T.Vector3(6,0,3.8),homeYaw:yaw,carName:name});
  this.vehicleKind=VEHICLE_SPECS[kind]?kind:'sedan';this.vehicleSpec=VEHICLE_SPECS[this.vehicleKind];
  this.group=new T.Group();this.group.name=name||'Driveway sedan';this.group.rotation.order='YXZ';this.scene.add(this.group);this.parts=[];this.wheels=[];this.hinges=[];this.pickables=[];this.velocity=V();this.mass=this.vehicleSpec.mass;this.yawRate=0;this.heaveVelocity=0;this.pitchRate=0;this.rollRate=0;this.steer=0;this.steerTarget=0;this.grips=new Map();this.gear='P';this.inCabin=false;this.canDrive=false;this.driving=false;this.mirrorEnabled=true;this.mirrorClock=0;this.time=0;this.revision=-1;this.debris=[];this.status='';this.message=(name||'Car')+' in garage.';this.surfaceName='driveway';this.mu=.90;
  this.cabinBox=new T.Box3(new T.Vector3(-.95,.40,-.90),new T.Vector3(.95,1.95,1.15));this.audio=new CarAudio();this.build();this.reset();
 }
 build(){
  if(this.vehicleSpec.custom){buildVehicleModel(this,this.vehicleSpec);return;}
  const paint=QUEST?new T.MeshStandardMaterial({color:this.paintColor,roughness:.28,metalness:.72,envMapIntensity:.9,side:T.DoubleSide}):new T.MeshPhysicalMaterial({color:this.paintColor,roughness:.23,metalness:.78,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:1,side:T.DoubleSide}),trim=new T.MeshStandardMaterial({color:0x222729,roughness:.82}),alloy=new T.MeshStandardMaterial({color:0xb5bec0,roughness:.25,metalness:.82}),glass=QUEST?new T.MeshStandardMaterial({color:0x93b1b9,transparent:true,opacity:.22,roughness:.14,metalness:0,side:T.DoubleSide,depthWrite:false}):new T.MeshPhysicalMaterial({color:0x93b1b9,transparent:true,opacity:.20,roughness:.12,metalness:0,side:T.DoubleSide,depthWrite:false});
  const add=(name,geom,material=paint,health=110)=>{const mesh=new T.Mesh(geom,material.clone());mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;this.group.add(mesh);const part={name,mesh,health,max:health,kind:'panel',broken:false,stiffness:name==='Chassis'?85000:18000,baseRoughness:mesh.material.roughness};mesh.userData.carPart=part;this.parts.push(part);this.pickables.push(mesh);return mesh;};
  const box=(p,s,mat=trim)=>{const m=new T.Mesh(new RoundedBoxGeometry(...s,1,.025),mat);m.position.fromArray(p);this.group.add(m);return m;};
  const sideX=(y)=>.835+.055*Math.sin(clamp((y-.38)/.62,0,1)*Math.PI);
  const sidePatch=(side,z0,z1,arch=false)=>patch((u,v)=>{const z=T.MathUtils.lerp(z0,z1,u);let low=.38;if(arch)for(const wz of [-1.30,1.33]){const dz=z-wz;if(Math.abs(dz)<.405)low=Math.max(low,.35+Math.sqrt(.405**2-dz*dz));}const high=.97-.12*Math.max(0,(Math.abs(z)-1.25)/.9),y=T.MathUtils.lerp(low,high,v);return [side*(sideX(y)-.10*Math.max(0,(Math.abs(z)-1.6)/.6)),y,z];},10,5);
  const frame=new RoundedBoxGeometry(1.68,.16,3.90,1,.07);frame.translate(0,.37,0);
  add('Chassis',merge([frame,...[-1,1].flatMap(side=>[sidePatch(side,-2.11,-.92,true),sidePatch(side,1.12,2.08,true)])]),paint,800);
  const deck=(z0,z1,y0,y1,width)=>patch((u,v)=>{const x=(u*2-1)*width,z=T.MathUtils.lerp(z0,z1,v),y=T.MathUtils.lerp(y0,y1,v)+.050*(1-(x/width)**2)-.025*Math.sin(v*Math.PI);return [x,y,z];},12,6);
  const hood=add('Hood',deck(-2.04,-.92,.83,.96,.82));const trunk=add('Trunk',deck(1.09,2.04,.96,.84,.82));
  add('Roof',patch((u,v)=>{const x=(u*2-1)*.705;return [x,1.49+.065*(1-(x/.705)**2)+.020*Math.sin(v*Math.PI),T.MathUtils.lerp(-.59,.70,v)];},10,6));
  for(const [name,z] of [['Front bumper',-2.13],['Rear bumper',2.13]]){const g=new RoundedBoxGeometry(1.80,.23,.23,2,.09);g.translate(0,.53,z);const sign=Math.sign(z),face=patch((u,v)=>{const x=(u*2-1)*.82;return [x,.62+.23*v,sign*(2.14-.08*v-.04*(1-(x/.82)**2))];},8,3);add(name,merge([g,face]),paint,160);}
  for(const side of [-1,1]){
    for(const [front,z0,z1] of [[true,-.92,.12],[false,.14,1.12]]){
      const name=(side<0?'Left':'Right')+(front?' front door':' rear door'),door=add(name,sidePatch(side,z0,z1));
      const window=add('Side glass',patch((u,v)=>{const bottom=T.MathUtils.lerp(z0+.035,z1-.035,u),top=T.MathUtils.lerp(front?-.58:.14,front?.10:.68,u);return [side*T.MathUtils.lerp(.817,.691,v),T.MathUtils.lerp(1.0,1.48,v),T.MathUtils.lerp(bottom,top,v)];},7,3),glass,28);
      const handle=add('Door handle',new RoundedBoxGeometry(.035,.034,.15,1,.013),alloy,80);handle.position.set(side*.91,1.005,z1-.13);
      this.makeHinge(door,[handle,window],[side*.835,.95,z0+.015],'door',side<0?-1:1,Y,65*Math.PI/180,handle);
    }
    for(const z of [-.59,.13,.70]){const g=new RoundedBoxGeometry(.050,.51,.058,1,.018);g.translate(side*.728,1.235,z);add('Roof pillar',g);}
    for(const z of [-1.30,1.33]){
      const knuckle=new T.Group();knuckle.position.set(side*.89,.34,z);this.group.add(knuckle);const spin=new T.Group();knuckle.add(spin);
      const tire=new T.Mesh(new T.TorusGeometry(.248,.092,8,24),trim.clone());tire.rotation.y=Math.PI/2;spin.add(tire);const rim=new T.Mesh(new T.CylinderGeometry(.206,.206,.16,16),alloy.clone());rim.rotation.z=Math.PI/2;spin.add(rim);
      for(let j=0;j<5;j++){const spoke=new T.Mesh(new T.BoxGeometry(.17,.035,.34),alloy);spoke.rotation.x=j*Math.PI/5;spin.add(spoke);}
      const wheel={name:(side<0?'Left':'Right')+(z<0?' front':' rear')+' wheel',mesh:tire,group:knuckle,spin,side,z,health:90,max:90,kind:'wheel',popped:false,broken:false,omega:0,roll:0,compression:.035,load:this.mass*9.81/4};
      spin.traverse(m=>{if(m.isMesh){m.userData.carPart=wheel;this.pickables.push(m);}});this.wheels.push(wheel);
    }
  }
  const window=(z0,z1)=>patch((u,v)=>[(u*2-1)*T.MathUtils.lerp(.80,.69,v),T.MathUtils.lerp(.98,1.49,v),T.MathUtils.lerp(z0,z1,v)],12,4);
  add('Windscreen',window(-.94,-.60),glass,32);add('Rear window',window(1.10,.71),glass,32);
  this.makeHinge(hood,[],[0,.96,-.92],'hood',1,new T.Vector3(1,0,0),70*Math.PI/180);
  this.makeHinge(trunk,[],[0,.96,1.09],'trunk',-1,new T.Vector3(1,0,0),70*Math.PI/180);
  for(const side of [-1,1])for(const front of [true,false]){const g=new RoundedBoxGeometry(.40,.105,.065,1,.025);g.translate(side*.60,.78,front?-2.045:2.045);add(front?'Headlight':'Tail light',g,new T.MeshStandardMaterial({color:front?0xe4edeb:0xad2e2d,emissive:front?0xc4dfef:0x9a1318,emissiveIntensity:.35}),35);}
  for(const x of [-.40,.40]){box([x,.61,.14],[.65,.19,.72]);box([x,.92,.48],[.65,.62,.18]).rotation.x=-.12;box([x,1.27,.49],[.34,.18,.13]);}box([0,.69,.72],[1.40,.18,.43]);box([0,.91,.92],[1.42,.48,.16]);box([0,.94,-.68],[1.55,.18,.25]);this.console=box([0,.71,-.12],[.23,.31,.74]);
  this.shifterBase=new T.Group();this.shifterBase.position.set(.015,.885,-.20);this.group.add(this.shifterBase);this.shifterLever=new T.Group();this.shifterBase.add(this.shifterLever);const stalk=new T.Mesh(new T.CylinderGeometry(.009,.010,.10,8),alloy);stalk.position.y=.05;this.shifterLever.add(stalk);const knob=new T.Mesh(new T.SphereGeometry(.028,10,7),trim);knob.position.y=.108;this.shifterLever.add(knob);this.shifterKnob=knob;
  this.shifterBase.traverse(m=>{if(m.isMesh){m.userData.carControl='shifter';this.pickables.push(m);}});
  for(let i=0;i<GEARS.length;i++){const dot=new T.Mesh(new T.BoxGeometry(.07,.008,.010),alloy);dot.position.set(0,.002,gearZ(GEARS[i]));this.shifterBase.add(dot);}
  if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=128;c.height=320;this.gearCanvas=c;this.gearTexture=new T.CanvasTexture(c);const labels=new T.Mesh(new T.PlaneGeometry(.072,.30),new T.MeshBasicMaterial({map:this.gearTexture}));labels.rotation.set(-Math.PI/2,0,0);labels.position.set(-.075,.008,0);this.shifterBase.add(labels);this.paintGears();}
  this.wheelRoot=new T.Group();this.wheelRoot.position.set(-.39,1.035,-.53);this.wheelRoot.rotation.x=-.22;this.group.add(this.wheelRoot);this.steeringWheel=new T.Group();this.wheelRoot.add(this.steeringWheel);this.steeringWheel.add(new T.Mesh(new T.TorusGeometry(.172,.018,8,24),trim));for(let i=0;i<3;i++){const s=new T.Mesh(new T.BoxGeometry(.029,.17,.025),alloy);s.position.y=-.07;s.rotation.z=i*Math.PI*2/3;this.steeringWheel.add(s);}const hub=new T.Mesh(new T.CylinderGeometry(.024,.024,.028,12),trim);hub.rotation.x=Math.PI/2;this.steeringWheel.add(hub);const horn=new T.Mesh(new T.CylinderGeometry(.016,.016,.012,10),new T.MeshStandardMaterial({color:0x1a1c1e,roughness:.55}));horn.rotation.x=Math.PI/2;horn.position.z=.016;horn.name='Horn';horn.userData.carControl='horn';this.steeringWheel.add(horn);this.hornPad=horn;this.pickables.push(horn);
  this.dashboard=box([-.38,1.075,-.755],[.31,.13,.015],new T.MeshBasicMaterial({color:0x162931}));
  this.target=new T.WebGLRenderTarget(384,192,{depthBuffer:true});this.target.texture.colorSpace=T.SRGBColorSpace;const mirrorMat=new T.MeshBasicMaterial({map:this.target.texture,toneMapped:false});mirrorMat.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv.x=1.0-vMapUv.x;\n#endif');};this.mirror=new T.Mesh(new T.PlaneGeometry(.28,.12),mirrorMat);this.mirror.position.set(-.10,1.37,-.83);this.group.add(this.mirror);box([-.10,1.37,-.844],[.30,.14,.025]);this.rearCamera=new T.PerspectiveCamera(75,2,.08,55);
  refineOriginalSedan(this);
  for(const p of this.parts){p.original=p.mesh.geometry.attributes.position.array.slice();p.originalPosition=p.mesh.position.clone();p.originalQuaternion=p.mesh.quaternion.clone();p.originalParent=p.mesh.parent;}
 }
 makeHinge(mesh,children,pivot,kind,sign,axis,max,handle=null){const root=new T.Group();root.position.fromArray(pivot);this.group.add(root);this.group.updateMatrixWorld(true);const panel=mesh.userData.carPart,h={root,panel,kind,sign,axis,max,angle:0,target:0,velocity:0,latched:true,pivot:root.position.clone(),handle:handle||mesh,grabbed:null,members:[mesh,...children]};for(const m of h.members){root.attach(m);m.userData.carHinge=h;m.userData.carPart.hinge=h;}this.hinges.push(h);return h;}
 reset(){
  this.props?.ejectSeatItems?.(this);
  if(this.driving)this.exit();this.grips.clear();for(const h of this.hinges){this.group.add(h.root);h.root.position.copy(h.pivot);h.root.quaternion.identity();h.angle=h.target=h.velocity=0;h.latched=true;h.grabbed=null;}
  for(const p of this.parts){p.originalParent.add(p.mesh);p.mesh.visible=true;p.mesh.position.copy(p.originalPosition);p.mesh.quaternion.copy(p.originalQuaternion);p.mesh.geometry.attributes.position.array.set(p.original);p.mesh.geometry.attributes.position.needsUpdate=true;p.mesh.geometry.computeVertexNormals();p.mesh.geometry.computeBoundingSphere();p.mesh.material.roughness=p.baseRoughness;p.health=p.max;p.broken=false;}
  for(const w of this.wheels){this.group.add(w.group);w.group.position.set(w.x??w.side*.89,w.radius??.34,w.z);w.group.rotation.set(0,0,0);w.group.scale.set(1,1,1);w.spin.rotation.set(0,0,0);w.popped=w.broken=false;w.health=w.max;w.roll=w.omega=0;w.compression=.035;w.load=this.mass*9.81/4;}
  this.debris=[];const stall=(this.world.garageStalls||[]).find(s=>s.color===this.paintColor)||{position:this.stall,yaw:this.homeYaw};this.group.position.copy(stall.position||this.stall);this.group.rotation.set(0,stall.yaw??this.homeYaw,0);this.velocity.set(0,0,0);this.yawRate=this.heaveVelocity=this.pitchRate=this.rollRate=this.steer=this.steerTarget=0;this.setGear('P');this.inCabin=this.canDrive=false;this.message=(this.carName||'Car')+' parked.';this.group.updateMatrixWorld(true);this.syncCollider();this.updateStatus();
 }
 get liveCamera(){return this.renderer.xr?.isPresenting?(this.renderer.xr.getCamera?.(this.camera)||this.camera):this.camera;}
 paintGears(){if(!this.gearCanvas)return;const c=this.gearCanvas,ctx=c.getContext('2d');ctx.fillStyle='#182126';ctx.fillRect(0,0,c.width,c.height);ctx.textAlign='center';ctx.font='bold 52px sans-serif';for(let i=0;i<GEARS.length;i++){ctx.fillStyle=GEARS[i]===this.gear?'#ffe27a':'#eeeecc';ctx.fillText(GEARS[i],64,58+i*72);}if(this.gearTexture)this.gearTexture.needsUpdate=true;}
 updateOccupancy(){this.group.updateWorldMatrix(true,false);const p=this.liveCamera.getWorldPosition(V());this.inCabin=this.driving||this.cabinBox.containsPoint(this.group.worldToLocal(p));this.canDrive=this.driving&&(this.gear==='D'||this.gear==='R');return this.canDrive;}
 enter(){
  if(this.driving){this.exit();return true;}
  if(!['Living room','Cul-de-sac'].includes(this.world.name)||!this.world.root.visible)return false;for(const c of this.props.cars?.()||[])if(c!==this&&c.driving)c.exit();this.props.vehicle=this;this.driving=true;unlockSfx();this.controls?.unlock();if(this.orbit)this.orbit.enabled=false;
  this.group.updateMatrixWorld(true);const eye=this.group.localToWorld(new T.Vector3(...this.vehicleSpec.driverEye));
  if(this.renderer.xr?.isPresenting){placeXRHead(this.rig,this.liveCamera,eye,new T.Euler().setFromQuaternion(this.group.getWorldQuaternion(Q()),'YXZ').y);}
  else{this.rig.position.set(0,0,0);this.rig.quaternion.identity();this.camera.position.copy(eye);this.camera.quaternion.copy(this.group.getWorldQuaternion(Q()));}
  for(const h of this.hinges)if(h.kind==='door'&&!h.panel.broken){h.target=0;h.latched=false;h.grabbed=null;}
  this.props.stashHeldInCar?.(this);
  this.rideMatrix=this.group.matrixWorld.clone();this.updateOccupancy();this.message='Weapons stay on the seat. Trigger still fires. Open a door handle to get out.';return true;
 }
 exit(opts={}){
  if(!this.driving)return;
  for(const i of [...this.grips.keys()])this.release(i);
  this.driving=false;
  const side=opts.side??-1,z=Number.isFinite(opts.z)?opts.z:-.1;
  const p=this.group.localToWorld(new T.Vector3(side*(this.vehicleSpec.width/2+.60),0,z));
  this.world.project?.(p,.18,0,1.6);
  if(this.renderer.xr?.isPresenting){const height=this.liveCamera.getWorldPosition(V()).y-this.rig.getWorldPosition(V()).y;p.y=(this.world.floorHeight?.(p)??0)+Math.max(.5,height);placeXRHead(this.rig,this.liveCamera,p,new T.Euler().setFromQuaternion(this.group.getWorldQuaternion(Q()),'YXZ').y);}
  else{this.rig.position.set(0,0,0);this.rig.rotation.set(0,0,0);this.camera.position.copy(p).add(new T.Vector3(0,1.55,0));if(this.orbit){this.orbit.target.copy(this.group.position).add(new T.Vector3(0,.9,0));this.camera.lookAt(this.orbit.target);this.orbit.enabled=true;}}
  this.rideMatrix=null;this.message='Exited car.';this.updateOccupancy();
 }
 doorReach(h,p){
  if(!h||h.kind!=='door'||h.panel.broken)return false;
  const handle=h.handle.getWorldPosition(V());
  if(p.distanceTo(handle)<(this.driving?.18:.085))return true;
  if(!this.driving)return false;
  const door=h.members.find(m=>m?.isMesh)||h.panel.mesh;
  if(!door)return false;
  return new T.Box3().setFromObject(door).expandByScalar(.06).containsPoint(p)||new T.Box3().setFromObject(door).distanceToPoint(p)<.12;
 }
 maybeExitFromDoor(h){
  if(!this.driving||h.kind!=='door'||h.panel.broken||h.angle<.30)return false;
  this.exit({side:h.sign<0?-1:1,z:h.pivot?.z??-.1});
  return true;
 }
 syncSeat(){if(!this.driving||!this.rideMatrix)return;this.group.updateMatrixWorld(true);const delta=this.group.matrixWorld.clone().multiply(this.rideMatrix.clone().invert()),q=Q().setFromRotationMatrix(delta);const obj=this.renderer.xr?.isPresenting?this.rig:this.camera;obj.position.applyMatrix4(delta);obj.quaternion.premultiply(q);obj.updateMatrixWorld(true);this.rideMatrix.copy(this.group.matrixWorld);}
 setGear(gear){if(!GEARS.includes(gear))return false;const prev=this.gear;this.gear=gear;this.shifterLever.position.z=gearZ(gear);this.paintGears();this.updateOccupancy();if(prev!==gear)this.audio?.shifter();return true;}
 cycleGear(){this.setGear(GEARS[(GEARS.indexOf(this.gear)+1)%GEARS.length]);return this.gear;}
 palm(i){return this.props.system.hands.palmPos?.(i)?.clone()||this.props.system.hands.grip[i]?.getWorldPosition(V());}
 pulse(i){this.props.system.hands.haptics?.contact?.(i,'prop',.55,.015);}
 grip(i){
  if(this.grips.has(i))return true;const p=this.palm(i);if(!p)return false;this.group.updateMatrixWorld(true);
  if(this.driving&&this.hornPad&&p.distanceTo(this.hornPad.getWorldPosition(V()))<.034){this.audio?.horn();this.pulse(i);return true;}
  if(p.distanceTo(this.shifterKnob.getWorldPosition(V()))<.08){this.grips.set(i,{type:'shifter'});return true;}
  const barPoint=this.wheelRoot.worldToLocal(p.clone());if(this.vehicleSpec.bike&&this.driving&&Math.abs(barPoint.x)>.17&&Math.abs(barPoint.x)<.40&&Math.abs(barPoint.y)<.12&&Math.abs(barPoint.z)<.16){this.grips.set(i,{type:'handlebar',angle:Math.atan2(barPoint.z,barPoint.x),steer:this.steerTarget});return true;}
  const local=this.wheelRoot.worldToLocal(p.clone()),radius=Math.hypot(local.x,local.y);if(this.driving&&Math.abs(local.z)<.16&&Math.abs(radius-.172)<.11&&radius>.055){this.grips.set(i,{type:'wheel',angle:Math.atan2(local.y,local.x),steer:this.steerTarget});return true;}
  for(const h of this.hinges){if(h.panel.broken||h.grabbed!==null)continue;
   let grab=false;
   if(h.kind==='door')grab=this.doorReach(h,p);
   else{const pt=h.root.localToWorld(new T.Vector3(0,-.10,h.kind==='hood'?-.95:.90));grab=p.distanceTo(pt)<.085;}
   if(!grab)continue;
   const local=this.group.worldToLocal(p.clone()).sub(h.pivot);
   this.grips.set(i,{type:'hinge',hinge:h,start:this.hingeHandAngle(h,local),angle:h.angle});
   h.grabbed=i;h.latched=false;h.velocity=0;
   if(this.driving&&h.kind==='door')this.message='Pull the door open to get out.';
   return true;}
  if(!this.driving){const near=this.group.worldToLocal(p.clone());if(Math.abs(near.x)<1.2&&near.y>.5&&near.y<1.7&&Math.abs(near.z)<.9)return this.enter();}return false;
 }
 hingeHandAngle(h,p){return h.kind==='door'?Math.atan2(p.x,p.z):Math.atan2(p.y,p.z);}
 release(i){const g=this.grips.get(i);if(!g)return;if(g.type==='shifter'){this.setGear(GEARS[gearIndex(this.shifterLever.position.z)]);this.pulse(i);}if(g.type==='hinge'){const h=g.hinge;h.grabbed=null;h.target=h.angle<8*Math.PI/180?0:h.max;h.latched=h.target===0;this.pulse(i);}this.grips.delete(i);}
 click(ray){const hit=this.props.hit(ray,15,false);if(hit?.object.userData.carControl==='horn'){if(this.driving)this.audio?.horn();return true;}if(hit?.object.userData.carControl==='shifter'){this.cycleGear();return true;}const h=hit?.object.userData.carHinge;if(h&&!h.panel.broken){const opening=h.target<=0;h.target=opening?h.max:0;h.latched=false;if(opening)this.audio?.door(true);if(this.driving&&h.kind==='door'&&opening){h.angle=Math.max(h.angle,.35);this.maybeExitFromDoor(h);}return true;}return hit?.object.userData.carPart?this.enter():false;}
 updateGrips(dt){for(const [i,g] of this.grips){const p=this.palm(i);if(!p){this.release(i);continue;}if(g.type==='shifter')this.shifterLever.position.z=clamp(this.shifterBase.worldToLocal(p).z,-1.5*GEAR_SPAN,1.5*GEAR_SPAN);if(g.type==='hinge'){const h=g.hinge;if(h.panel.broken){this.release(i);continue;}const a=this.hingeHandAngle(h,this.group.worldToLocal(p).sub(h.pivot)),delta=Math.atan2(Math.sin(a-g.start),Math.cos(a-g.start));const physical=h.kind==='door'?delta:-delta;h.angle=h.target=clamp(g.angle+physical/h.sign,0,h.max);}}
  for(const h of this.hinges){if(h.panel.broken)continue;const was=h.latched;if(h.grabbed===null){h.velocity+=(55*(h.target-h.angle)-14*h.velocity)*dt;h.angle=clamp(h.angle+h.velocity*dt,0,h.max);if(h.target===0&&h.angle<.002){h.angle=h.velocity=0;h.latched=true;}}h.root.quaternion.setFromAxisAngle(h.axis,h.sign*h.angle);if(h.kind==='door'&&h.latched&&!was)this.audio?.door(false);if(h.kind==='door'&&!h.latched&&was&&h.angle>.04)this.audio?.door(true);if(this.driving&&h.kind==='door')this.maybeExitFromDoor(h);}
 }
 input(){let throttle=0,brake=0,steer=this.steerTarget;if(!this.driving)return {throttle,brake:0,steer};if(this.props.menu?.isOpen)return {throttle:0,brake:.5,steer};if(this.renderer.xr?.isPresenting){for(const src of this.renderer.xr.getSession()?.inputSources||[]){const b=src.gamepad?.buttons||[],t=Math.max(b[0]?.value||0,b[0]?.pressed?1:0);if(src.handedness==='left'){throttle=Math.max(throttle,t);if(b[4]?.pressed)brake=1;}}const angles=[];for(const [i,g] of this.grips)if(g.type==='wheel'||g.type==='handlebar'){const p=this.wheelRoot.worldToLocal(this.palm(i)),a=g.type==='handlebar'?Math.atan2(p.z,p.x):Math.atan2(p.y,p.x);angles.push(g.steer+Math.atan2(Math.sin(a-g.angle),Math.cos(a-g.angle))/(g.type==='handlebar'?-1:5.2));}if(angles.length)this.steerTarget=clamp(angles.reduce((a,b)=>a+b,0)/angles.length,-.5585,.5585);else this.steerTarget*=.985;steer=this.steerTarget;}else{throttle=this.keys.KeyW?1:0;brake=(this.keys.Space||this.keys.KeyS)?1:0;steer=(this.keys.KeyA?.5585:0)-(this.keys.KeyD?.5585:0);}return {throttle,brake,steer};}
 syncCollider(){
  if(!['Living room','Cul-de-sac'].includes(this.world.name)){if(this.obstacle){this.world.removeObstacle(this.obstacle);this.obstacle=null;}return;}
  const yaw=this.group.rotation.y,w=Math.abs(Math.cos(yaw))*this.vehicleSpec.width+Math.abs(Math.sin(yaw))*this.vehicleSpec.length,d=Math.abs(Math.sin(yaw))*this.vehicleSpec.width+Math.abs(Math.cos(yaw))*this.vehicleSpec.length,x=this.group.position.x,z=this.group.position.z;
  if(!this.obstacle){this.obstacle=this.world.obstacle(x,z,w,d,this.group.position.y+.12,this.vehicleSpec.height,this.group);return;}
  const o=this.obstacle,cell=Math.floor(o.x)!==Math.floor(x)||Math.floor(o.z)!==Math.floor(z)||Math.floor(o.x-o.w/2)!==Math.floor(x-w/2)||Math.floor(o.z-o.d/2)!==Math.floor(z-d/2);
  o.x=x;o.z=z;o.w=w;o.d=d;o.y=this.group.position.y+.12;o.h=this.vehicleSpec.height;o.object=this.group;
  if(cell)this.world.grid=null;
 }
 pull(delta){this.group.position.add(delta.clone().clampLength(0,.004));this.syncCollider();}
 surfaceAt(x,z){const surface=this.world.surfaceAt?.(x,z);if(surface&&typeof surface==='object'&&Number.isFinite(surface.mu))return {mu:clamp(surface.mu,.1,1.2),name:surface.name||'surface'};if(this.world.name==='Beach')return {mu:.42,name:'sand'};if(this.world.name==='Jungle')return {mu:.62,name:'dirt'};if(x>-.2&&x<8.2&&z>4.2&&z<11)return {mu:.96,name:'driveway'};if(Math.abs(x)<7.5&&z>-7.2&&z<11.2)return {mu:.78,name:'floor'};return {mu:.84,name:'grass'};}
 wheelContact(w){const p=this.group.localToWorld(new T.Vector3(w.side*.89,.65,w.z));let floor=this.world.floorHeight?.(p)??0;if(!Number.isFinite(floor))floor=0;for(const o of this.world.nearby?.(p,.02)||[]){if(o===this.obstacle)continue;const top=o.y+o.h;if(Math.abs(p.x-o.x)<=o.w/2&&Math.abs(p.z-o.z)<=o.d/2&&top<=p.y&&top>floor)floor=top;}return {p,floor};}
 step(dt,input){
  dt=clamp(dt,0,.04);if(!dt)return;this.updateOccupancy();this.steer+=(input.steer-this.steer)*(1-Math.exp(-dt*14));this.group.updateMatrixWorld(true);
  const forward=new T.Vector3(0,0,-1).applyAxisAngle(Y,this.group.rotation.y),right=new T.Vector3(1,0,0).applyAxisAngle(Y,this.group.rotation.y),speed=this.velocity.dot(forward);
  const drive=this.driving&&(this.gear==='D'||this.gear==='R');
  const userThrot=Math.abs(input.throttle||0);
  const idleRev=drive&&this.gear==='R'&&!input.brake&&userThrot<.04;
  const throttle=drive?(this.gear==='R'?-(userThrot||(idleRev?.33:0)):(input.throttle||0)):0;
  const parked=this.gear==='P'&&this.velocity.length()<.2,brake=this.gear==='P'?1:input.brake;
  if(parked){
   this.velocity.set(0,0,0);this.yawRate=0;this.heaveVelocity=0;this.pitchRate*=Math.exp(-dt*10);this.rollRate*=Math.exp(-dt*10);
   let support=0,n=0;
   for(const w of this.wheels){const {p,floor}=this.wheelContact(w),radius=w.popped?.265:.34;w.omega=0;w.group.position.y=this.group.worldToLocal(p.clone().setY(floor+radius)).y;support+=floor;n++;}
   if(n){const want=support/n;this.group.position.y+=(want-this.group.position.y)*Math.min(1,dt*8);}
   this.group.rotation.x*=Math.exp(-dt*8);this.group.rotation.z*=Math.exp(-dt*8);
   return;
  }
  let upForce=0,pitchTorque=0,rollTorque=0,yawTorque=0;const force=V();this.mu=0;
  for(const w of this.wheels){
    const {p,floor}=this.wheelContact(w),radius=w.popped?.265:.34,rest=w.popped?.325:.345,raw=rest-(p.y-floor-radius),compression=clamp(raw,-.08,.08),rate=(compression-w.compression)/dt;
    w.compression=compression;w.load=w.broken||raw<-.08?0:clamp(87500*compression+9300*rate,0,this.mass*9.81*.90)*(w.popped?.68:1);const N=w.load;
    upForce+=N;pitchTorque-=w.z*N;rollTorque+=w.side*.89*N;w.group.position.y=this.group.worldToLocal(p.clone().setY(floor+radius)).y;
    const surf=this.surfaceAt(p.x,p.z),mu=surf.mu*(w.popped?.55:1);this.mu+=surf.mu/4;this.surfaceName=surf.name;
    if(!N||w.broken)continue;
    const wf=forward.clone().applyAxisAngle(Y,w.z<0?this.steer:0),wr=right.clone().applyAxisAngle(Y,w.z<0?this.steer:0),r=p.clone().sub(this.group.position).setY(0),v=this.velocity.clone().add(new T.Vector3(this.yawRate*r.z,0,-this.yawRate*r.x)),vl=v.dot(wf),vs=v.dot(wr);
    // Rear axle (+local Z) driven, as in the supplied car; damaged tires receive no drive torque.
    const torque=w.z>0&&!w.popped?throttle*669*(1-.08*Math.min(1,Math.abs(vl)/18)):0,I=1.8;
    let omega=w.omega+torque*dt/I;omega=Math.sign(omega||vl)*Math.max(0,Math.abs(omega)-brake*mu*N*radius*dt/I);
    const limit=mu*N*1.15,den=Math.max(Math.abs(vl),.28),stiff=limit*7.5;
    let long=stiff*(radius*omega-vl)/(den+stiff*radius*radius*dt/I);
    const slip=Math.atan2(vs,Math.max(Math.abs(vl),.18));let lat=-limit*Math.sin(clamp(slip/.07,-1,1)*Math.PI/2);
    const demand=Math.hypot(long,lat),scale=Math.min(1,limit/Math.max(.001,demand));long*=scale;lat*=scale;
    w.omega=omega-long*radius*dt/I;w.slip=slip;w.saturated=demand>=limit*.99;
    const f=wf.multiplyScalar(long).addScaledVector(wr,lat);force.add(f);yawTorque+=r.z*f.x-r.x*f.z;
    const localF=f.clone().applyAxisAngle(Y,-this.group.rotation.y);pitchTorque-=.25*localF.z;rollTorque+=.25*localF.x;
    w.roll+=w.omega*dt;w.spin.rotation.x=-w.roll;w.group.rotation.y=w.z<0?this.steer:0;
  }
  const grav=Number.isFinite(this.world?.gravity)?this.world.gravity:9.81;
  this.heaveVelocity+=(upForce/this.mass-grav)*dt;this.heaveVelocity*=Math.exp(-dt*(grav<0.5?.2:4.5));this.group.position.y+=this.heaveVelocity*dt;
  this.pitchRate+=(pitchTorque/2200-this.pitchRate*2.0)*dt;this.rollRate+=(rollTorque/700-this.rollRate*2.0)*dt;
  this.group.rotation.x=clamp(this.group.rotation.x+this.pitchRate*dt,-.1396,.1396);this.group.rotation.z=clamp(this.group.rotation.z+this.rollRate*dt,-.1396,.1396);if(Math.abs(this.group.rotation.x)>=.1395)this.pitchRate=0;if(Math.abs(this.group.rotation.z)>=.1395)this.rollRate=0;
  this.steeringWheel.rotation.z=this.steer*5.2;
  const planar=this.velocity.length();if(planar>.001){const resistance=this.mass*9.81*.009+.5*.32*2.1*1.225*planar*planar;force.addScaledVector(this.velocity,-Math.min(resistance,this.mass*planar/dt)/planar);}
  const openDoors=this.hinges.filter(h=>h.kind==='door'&&!h.panel.broken&&h.angle>.262);if(openDoors.length&&planar>2){force.addScaledVector(this.velocity,-35*openDoors.length);yawTorque+=openDoors.reduce((n,h)=>n+h.sign,0)*Math.min(120,planar*12);}
  this.velocity.addScaledVector(force,dt/this.mass);
  const latVel=this.velocity.dot(right);this.velocity.addScaledVector(right,-latVel*(1-Math.exp(-dt*(9+brake*14))));
  if(brake&&!throttle&&planar<.12)this.velocity.set(0,0,0);
  let newSpeed=this.velocity.dot(forward);
  if(this.gear==='R'){if(newSpeed>1.2)this.velocity.addScaledVector(forward,1.2-newSpeed);if(idleRev&&newSpeed<-.63)this.velocity.addScaledVector(forward,-.63-newSpeed);else if(newSpeed<-12)this.velocity.addScaledVector(forward,-12-newSpeed);}
  else{if(newSpeed>32)this.velocity.addScaledVector(forward,32-newSpeed);if(newSpeed<-4)this.velocity.addScaledVector(forward,-4-newSpeed);}
  this.yawRate+=(yawTorque/2400-this.yawRate*2.4)*dt;this.yawRate=clamp(this.yawRate,-1.15,1.15);this.group.rotation.y+=this.yawRate*dt;this.group.position.addScaledVector(this.velocity,dt);
 }
 damage(hit,energy,kind,dir,impulse=null){
  const p=hit?.object?.userData.carPart;if(!p||p.broken)return;energy=Math.max(0,Number(energy)||0);const loss=kind==='laser'?energy*1.4:energy;p.health-=loss;
  const incoming=(dir?.clone?.()||this.velocity.clone()).normalize();if(incoming.lengthSq()<.1)incoming.set(0,0,-1);
  if(p.kind==='wheel'){if(kind==='bullet'||kind==='cut'||p.health<45){p.popped=true;p.group.scale.y=.78;this.message=p.name+' punctured';}if(p.health<=0)this.detach(p,incoming,energy);return;}
  p.mesh.updateWorldMatrix(true,false);const inv=p.mesh.matrixWorld.clone().invert(),point=hit.point?.clone?.()||p.mesh.getWorldPosition(V()),local=point.clone().applyMatrix4(inv),attr=p.mesh.geometry.attributes.position;
  const r=point.clone().sub(this.group.position),angular=new T.Vector3(this.yawRate*r.z,0,-this.yawRate*r.x),motion=this.velocity.clone().add(angular);
  // Surface direction plus incoming momentum: world impulse is optional for older Props callers.
  const momentum=incoming.clone().multiplyScalar(Math.max(1,motion.length())).addScaledVector(motion,-.30).normalize().transformDirection(inv);
  const normal=hit.face?.normal?.clone?.()||V();
  if(normal.lengthSq()<.1){let best=Infinity,index=0;for(let i=0;i<attr.count;i++){const d=V().fromBufferAttribute(attr,i).distanceToSquared(local);if(d<best){best=d;index=i;}}normal.fromBufferAttribute(p.mesh.geometry.attributes.normal,index);}
  normal.normalize();if(normal.dot(momentum)>0)normal.negate();const incidence=clamp(-normal.dot(momentum),0,1);
  const J=impulse?.length?.()??Math.sqrt(2*(kind==='bullet'?.012:kind==='laser'?.02:25)*energy),radius=kind==='bullet'?clamp(.08+J*.001,.08,.12):clamp(.25+J*.00010,.25,.55),depth=Math.min(.28,J/p.stiffness*(.18+.82*incidence));
  const tangent=momentum.clone().addScaledVector(normal,incidence);if(tangent.lengthSq()>.0001)tangent.normalize();else tangent.set(1,0,0);
  const stretch=1+(1-incidence)*1.2,candidates=[];
  for(let i=0;i<attr.count;i++){const offset=V().fromBufferAttribute(attr,i).sub(local),along=offset.dot(tangent),distance=Math.sqrt(Math.max(0,offset.lengthSq()-along*along+(along/stretch)**2));if(distance<radius)candidates.push({i,distance});}
  candidates.sort((a,b)=>a.distance-b.distance);this.lastDentVertices=Math.min(80,candidates.length);
  for(const {i,distance} of candidates.slice(0,80)){const original=V().fromArray(p.original,i*3),q=V().fromBufferAttribute(attr,i),falloff=(1-distance/radius)**2;q.addScaledVector(momentum,depth*falloff).addScaledVector(tangent,depth*(1-incidence)*.45*falloff);q.sub(original).clampLength(0,.28).add(original);attr.setXYZ(i,q.x,q.y,q.z);}
  if(candidates.length){attr.needsUpdate=true;p.mesh.geometry.computeVertexNormals();p.mesh.geometry.computeBoundingSphere();p.mesh.material.roughness=clamp(p.mesh.material.roughness+.015,.18,.72);}
  if(p.health<=0&&p.name!=='Chassis')this.detach(p,incoming,energy);this.message=p.name+' damaged';
 }
 detach(p,dir,energy){
  p.broken=true;let mesh=p.kind==='wheel'?p.group:p.mesh;
  if(p.hinge?.panel===p){const h=p.hinge;mesh=h.root;h.grabbed=null;for(const m of h.members)m.userData.carPart.broken=true;for(const [i,g] of this.grips)if(g.hinge===h)this.grips.delete(i);}
  this.scene.attach(mesh);this.debris.push({part:p,mesh,velocity:this.velocity.clone().addScaledVector(dir,Math.min(4,Math.sqrt(energy)*.15)),spin:new T.Vector3(.4,1,.7)});
 }
 dentAt(point,n,energy,impulse){
  if((this._dents||0)>=2)return;this._dents=(this._dents||0)+1;
  const dmg=Math.min(90,energy*.09);
  this._ray??=new T.Raycaster();this._ray.set(point.clone().addScaledVector(n,.45),n.clone().negate());this._ray.near=0;this._ray.far=1.25;
  const meshes=[];for(const p of this.parts)if(!p.broken)meshes.push(p.mesh);
  const hit=this._ray.intersectObjects(meshes,false)[0];
  if(hit){this.damage(hit,dmg,'blunt',n.clone(),impulse);return;}
  let nearest=null,best=Infinity;
  for(const p of this.parts){if(p.broken)continue;const d=p.mesh.getWorldPosition(V()).distanceToSquared(point);if(d<best){best=d;nearest=p;}}
  if(nearest)this.damage({object:nearest.mesh,point},dmg,'blunt',n.clone(),impulse);
 }
 crushWall(part,point,normal,energy){
  this._wallHits??=new Set();let absorbed=0;const system=this.world.fractures;
  const chunks=part.mesh.userData.chunks||[part],candidates=[part,...chunks.filter(p=>p!==part&&!p.broken&&p.p.distanceToSquared(point)<.9*.9).sort((a,b)=>a.p.distanceToSquared(point)-b.p.distanceToSquared(point))];
  for(const p of candidates){if(this._wallHits.size>=4)break;if(p.broken||this._wallHits.has(p))continue;this._wallHits.add(p);
    const cost=p.kind==='metal'?240:p.kind==='stone'?220:p.kind==='wood'?110:80,weight=p===part?1:Math.max(.10,1-p.p.distanceTo(point)/.9),damage=energy*weight/cost,health=Math.max(0,p.health);
    // The wall API needs a world-space contact point, including for car impacts.
    const at=point.clone().clamp(p.p.clone().addScaledVector(p.size,-.5),p.p.clone().addScaledVector(p.size,.5));
    system.impact({object:p.mesh,instanceId:p.index,point:at},damage,normal.clone().negate());absorbed+=Math.min(health,damage)*cost;
  }
  return {broken:part.broken,absorbed};
 }
 collide(dt){
  const points=[];for(const y of [this.vehicleSpec.collisionY,Math.max(this.vehicleSpec.collisionY+.20,this.vehicleSpec.height*.80)])for(const side of [-1,1])for(const t of [-1,0,1])points.push(this.group.localToWorld(new T.Vector3(side*Math.max(.10,this.vehicleSpec.width/2-.12),y,t*(this.vehicleSpec.length/2-.12))));
  for(const point of points){for(const o of this.world.nearby(point,.16)||[]){
    if(o===this.obstacle||o.y>point.y+.16||o.y+o.h<point.y-.16)continue;
    const closest=new T.Vector3(clamp(point.x,o.x-o.w/2,o.x+o.w/2),clamp(point.y,o.y,o.y+o.h),clamp(point.z,o.z-o.d/2,o.z+o.d/2)),delta=point.clone().sub(closest),distance=delta.length();if(distance>=.16)continue;
    let n=delta.normalize(),penetration=.16-distance;
    if(distance<1e-6){const faces=[{d:o.x+o.w/2-point.x,n:new T.Vector3(1,0,0)},{d:point.x-o.x+o.w/2,n:new T.Vector3(-1,0,0)},{d:o.z+o.d/2-point.z,n:new T.Vector3(0,0,1)},{d:point.z-o.z+o.d/2,n:new T.Vector3(0,0,-1)}];faces.sort((a,b)=>a.d-b.d);n=faces[0].n;penetration=.16+faces[0].d;}
    n.y=0;if(n.lengthSq()<.1)continue;n.normalize();const r=point.clone().sub(this.group.position),atPoint=this.velocity.clone().add(new T.Vector3(this.yawRate*r.z,0,-this.yawRate*r.x)),closing=atPoint.dot(n);
    const otherCar=o.object?.userData?.h5Vehicle;
    if(otherCar&&otherCar!==this){const relative=atPoint.clone().sub(otherCar.velocity).dot(n);if(relative<-.1){const J=-1.06*relative/(1/this.mass+1/otherCar.mass),impulse=n.clone().multiplyScalar(J),energy=.5*J*Math.abs(relative)*.20;this.velocity.addScaledVector(n,J/this.mass);otherCar.velocity.addScaledVector(n,-J/otherCar.mass);this.dentAt(point,n,energy,impulse);otherCar.dentAt(point,n.clone().negate(),energy,impulse.clone().negate());otherCar.h5Vehicle?.wake?.();}this.group.position.addScaledVector(n,Math.min(.16,penetration*.5));continue;}
    const tree=o.object?.userData?.tree;
    if(closing<-.20){
      const J=this.mass*(-closing)*(tree?0.72:1.08),impulse=n.clone().multiplyScalar(J),energy=.5*this.mass*closing*closing*.18;
      if(tree&&!tree.fallen){
        if(!this._rammed.has(tree)){
          this._rammed.add(tree);
          const dir=this.velocity.clone().setY(0);if(dir.lengthSq()<.01)dir.copy(n).negate();dir.normalize();
          this.dentAt(point,n,energy,impulse);
          const fell=this.world.ramTree?.(tree,point,energy,dir);
          this.velocity.addScaledVector(n,-(fell?0.42:0.88)*Math.min(0,this.velocity.dot(n)));
          this.yawRate=clamp(this.yawRate+(r.z*impulse.x-r.x*impulse.z)/2400*.10,-1.5,1.5);
          this.message=fell?'Tree down':'Hit tree';
        }
        this.group.position.addScaledVector(n,Math.min(tree.fallen?0.08:0.22,penetration+.001));
        continue;
      }
      const fracture=o.h5Fracture||this.world.fractures?.parts?.find(p=>!p.broken&&(p.obstacle===o||p.mesh?.userData.seat?.obstacle===o));
      const crush=fracture?this.crushWall(fracture,closest,n,energy):null;
      this.dentAt(point,n,energy,impulse);
      if(crush?.broken){const kinetic=.5*this.mass*this.velocity.lengthSq();this.velocity.multiplyScalar(Math.sqrt(Math.max(.08,1-(crush.absorbed+kinetic*.08)/Math.max(1,kinetic))));continue;}
      this.velocity.addScaledVector(n,-1.04*Math.min(0,this.velocity.dot(n)));this.yawRate=clamp(this.yawRate+(r.z*impulse.x-r.x*impulse.z)/2400*.12,-1.5,1.5);
    }
    this.group.position.addScaledVector(n,Math.min(.30,penetration+.001));
  }}
  for(const actor of this.props.system.actors||[]){
    const bodyPoint=actor.group.getWorldPosition(V()),local=this.group.worldToLocal(bodyPoint.clone());let overlap=Math.abs(local.x)<this.vehicleSpec.width/2+.18&&Math.abs(local.z)<this.vehicleSpec.length/2+.18&&local.y<this.vehicleSpec.height&&local.y>-.2;
    // Open doors remain solid to actors using only six small panel AABBs.
    if(!overlap)for(const h of this.hinges)if(h.kind==='door'&&!h.panel.broken&&h.angle>.262){const b=new T.Box3().setFromObject(h.panel.mesh).expandByScalar(.18);if(b.containsPoint(bodyPoint.clone().setY(this.group.position.y+.70))){overlap=true;break;}}
    if(!overlap)continue;const hip=actor.bones?.Hip?.getWorldPosition(V())||bodyPoint,push=bodyPoint.clone().sub(this.group.position).setY(0).normalize();if(push.lengthSq()<.1)push.set(1,0,0);if(this.world.h5Combat?.isProtected(actor)){this.velocity.multiplyScalar(.4);this.group.position.addScaledVector(push,-.10);continue;}actor.group.position.addScaledVector(push,.12);actor.knockDown?.(push,this.velocity.clone().multiplyScalar(.06));
    const body=actor.skinMeshes?.[0];if(body&&this.velocity.length()>1.2&&this.time-(actor.carImpactTime??-2)>.5){actor.carImpactTime=this.time;this.props.injuries?.impact(actor,{object:body,point:hip},Math.min(95,this.velocity.lengthSq()*4),'blunt',push);}this.velocity.multiplyScalar(.96);
  }
  const extent=Math.max(40,(this.world.extent||144)-2);if(Math.abs(this.group.position.x)>extent||Math.abs(this.group.position.z)>extent)this.velocity.multiplyScalar(.55);this.group.position.x=clamp(this.group.position.x,-extent,extent);this.group.position.z=clamp(this.group.position.z,-extent,extent);
 }
 tick(dt){dt=clamp(dt,0,.1);this.time+=dt;if(this.revision!==this.world.revision){this.revision=this.world.revision;this.reset();}this.group.visible=['Living room','Cul-de-sac'].includes(this.world.name)&&this.world.root.visible;for(const d of this.debris)d.mesh.visible=this.group.visible;if(!this.group.visible){if(this.driving)this.exit();this.audio?.tick(this,{throttle:0},dt);return;}this.updateOccupancy();this.updateGrips(dt);if(this.driving)this.pollHorn();this._dents=0;this._rammed=new Set();this._wallHits=new Set();const input=this.input(),moving=this.driving||this.h5Traffic?.active||this.velocity.length()>.08,steps=moving?Math.max(1,Math.min(8,Math.ceil(this.velocity.length()*dt/.18))):1;for(let i=0;i<steps;i++){this.step(dt/steps,input);this.group.updateMatrixWorld(true);if(moving)this.collide(dt/steps);}this.syncCollider();this.syncSeat();this.audio?.tick(this,input,dt);for(const d of this.debris){d.velocity.y-=9.81*dt;const before=d.mesh.position.clone();d.mesh.position.addScaledVector(d.velocity,dt);if(this.world.projectSphere(d.mesh.position,.10)){const n=d.mesh.position.clone().sub(before).normalize(),vn=d.velocity.dot(n);if(vn<0)d.velocity.addScaledVector(n,-1.15*vn);}if(d.mesh.position.y<.12){d.mesh.position.y=.12;d.velocity.y=Math.abs(d.velocity.y)*.15;d.velocity.x*=.9;d.velocity.z*=.9;d.spin.multiplyScalar(.94);}d.mesh.rotateX(d.spin.x*dt);d.mesh.rotateZ(d.spin.z*dt);}this.mirrorClock+=dt;this.updateStatus();}
 pollHorn(){
  if(!this.driving||!this.hornPad)return;
  this.group.updateMatrixWorld(true);
  const hub=this.hornPad.getWorldPosition(V());
  for(let i=0;i<2;i++){const p=this.palm(i);if(p&&p.distanceTo(hub)<.032)this.audio?.horn();}
 }
 get telemetry(){return `${this.gear} · cabin ${this.inCabin?'IN':'OUT'} · ${Math.round(this.velocity.length()*3.6)} km/h · ${this.surfaceName} µ ${this.mu.toFixed(2)}`;}
 updateStatus(){this.status=`${this.gear} · cabin ${this.inCabin?'IN':'OUT'} · ${Math.round(this.velocity.length()*3.6)} km/h · ${this.surfaceName} µ ${this.mu.toFixed(2)} · ${this.message}`;}
 renderMirror(){
  const hz=QUEST?[30,24,18][this.world.h5Performance?.budget.tier||0]:45;if(!this.driving||!this.mirrorEnabled||this.mirrorClock<1/hz)return;this.mirrorClock=0;this.renderMirrorView();
 }
 renderMirrorView(warm=false){
  // A dashboard mirror covers a small visual angle. Keep its allocation stable
  // across quality changes, and omit subpixel grass/birds from this pass only.
  const tier=this.world.h5Performance?.budget.tier??1;
  if(QUEST&&this.target.width!==256)this.target.setSize(256,128);
  const far=QUEST?[55,45,32][tier]:120;
  if(this.rearCamera.far!==far){this.rearCamera.far=far;this.rearCamera.updateProjectionMatrix();}
  this.rearCamera.position.copy(this.mirror.getWorldPosition(V()));const rear=new T.Vector3(0,0,1).applyQuaternion(this.group.getWorldQuaternion(Q()));this.rearCamera.position.addScaledVector(rear,.08);this.rearCamera.up.set(0,1,0).applyQuaternion(this.group.getWorldQuaternion(Q()));this.rearCamera.lookAt(this.rearCamera.position.clone().addScaledVector(rear,30));
  const hidden=[this.mirror,this.props.menu?.panel,this.props.system?.vrPanel,this.props.scopeOverlay,...(this.props.gadgets?.portals||[]).map(p=>p?.group)];
  if(QUEST)hidden.push(this.world.h5Vegetation?.root,this.world.h5Birds?.root);
  withOffscreenView(this.renderer,hidden,()=>{this.renderer.setRenderTarget(this.target);this.renderer.setViewport(0,0,warm?16:this.target.width,warm?8:this.target.height);this.renderer.render(this.scene,this.rearCamera);});
 }
}
