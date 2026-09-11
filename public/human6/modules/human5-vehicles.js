import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {V,clamp,gravityOf,wrapMethod} from './human5-common.js?v=19.1.0';
const Y=new T.Vector3(0,1,0),RATIOS=[3.70,2.20,1.52,1.16,.91,.74];

/** Six-speed automatic within the existing P/R/N/D selector. No network/ML dependency. */
export class AutomaticDrive {
  constructor(){this.reset();}
  reset(){this.gear=1;this.rpm=850;this.shift=0;this.cooldown=0;this.throttle=0;}
  step(dt,{selector='P',throttle=0,brake=0,speed=0,driving=false,radius=.34,torque=210}={}){
    this.cooldown=Math.max(0,this.cooldown-dt);this.shift=Math.max(0,this.shift-dt);
    this.throttle=T.MathUtils.damp(this.throttle,driving?clamp(Math.abs(throttle),0,1):0,9,dt);
    const ratio=selector==='R'?3.2:RATIOS[this.gear-1],coupled=Math.abs(speed)/radius*ratio*3.42*60/(2*Math.PI);
    const engaged=driving&&(selector==='D'||selector==='R');
    const target=driving?clamp(engaged?Math.max(820+this.throttle*1350,coupled):850+this.throttle*3800,780,6500):0;
    this.rpm=T.MathUtils.damp(this.rpm,target,12,dt);
    if(selector==='D'&&engaged&&!this.cooldown){
      let next=this.gear;const up=2450+this.throttle*3000;
      if(coupled>up&&this.gear<6)next++;
      else if(this.gear>1&&(coupled<1200||(this.throttle>.83&&coupled<2500)))next--;
      if(next!==this.gear){this.gear=next;this.shift=.22;this.cooldown=.85;}
    }
    const creep=engaged&&brake<.03&&Math.abs(speed)<1.1?.055*(1-Math.abs(speed)/1.1):0;
    const load=Math.max(this.throttle,creep),curve=clamp(1-((this.rpm-3300)/5200)**2,.45,1);
    const wheelTorque=engaged?(selector==='R'?-1:1)*torque*curve*load*(selector==='R'?3.2:RATIOS[this.gear-1])*3.42*.88*.5*(this.shift? .18:1):0;
    return {wheelTorque,rpm:this.rpm,gear:this.gear};
  }
}

/** Persistent mechanical damage; independent of paint/panel health. */
export class VehicleDamage {
  constructor(){this.reset();}
  reset(){this.engine=0;this.steering=0;this.wheels=new Map();}
  wheel(w){if(!this.wheels.has(w))this.wheels.set(w,{alignment:0,suspension:0});return this.wheels.get(w);}
  impact(car,part,point,energy,kind,impulse){
    const local=point.clone();car.group.worldToLocal(local);
    const severity=clamp(Math.max(0,energy)/500+(impulse?.length?.()||0)/car.mass*.025,0,.65);
    if(severity<=0)return;
    if(part.kind==='wheel'){
      const d=this.wheel(part);d.suspension=clamp(d.suspension+severity*(kind==='bullet'?.3:1),0,1);
      d.alignment=clamp(d.alignment+(part.side||Math.sign(local.x)||1)*severity*(kind==='bullet'?.018:.11),-.15,.15);
      if(part.z<0)this.steering=clamp(this.steering+severity*.6,0,1);
    }else if(!/glass|light|handle|mirror/i.test(part.name)){
      if(local.z<-.65||/engine|fuel tank/i.test(part.name)){this.engine=clamp(this.engine+severity*(Math.abs(local.x)<.65?.7:.2),0,1);this.steering=clamp(this.steering+severity*.32,0,1);}
      const wheel=car.wheels.slice().sort((a,b)=>Math.hypot(local.x-(a.x??a.side*.89),local.z-a.z)-Math.hypot(local.x-(b.x??b.side*.89),local.z-b.z))[0];
      if(wheel&&Math.hypot(local.x-(wheel.x??wheel.side*.89),local.z-wheel.z)<.9){const d=this.wheel(wheel);d.suspension=clamp(d.suspension+severity*.6,0,1);d.alignment=clamp(d.alignment+(wheel.side||Math.sign(local.x)||1)*severity*.07,-.15,.15);}
    }
  }
  get power(){return this.engine>.97?0:Math.max(.16,1-.82*this.engine);}
}

/** Four bounded suspension queries. The host still owns collision, dents, doors and seat motion. */
export function sampleWheel(car,w){
  const spec=car.vehicleSpec,anchor=spec?spec.radius+spec.rest-car.mass*9.81/car.wheels.length/spec.spring:.70;
  const p=car.group.localToWorld(new T.Vector3(w.x??w.side*.89,anchor,w.z));
  const floorAt=(x,z)=>{let h=car.world.floorHeight?.(new T.Vector3(x,p.y,z))??0;if(!Number.isFinite(h))h=0;return h;};
  let floor=floorAt(p.x,p.z),normal=new T.Vector3(-(floorAt(p.x+.14,p.z)-floorAt(p.x-.14,p.z))/.28,1,-(floorAt(p.x,p.z+.14)-floorAt(p.x,p.z-.14))/.28).normalize();
  for(const o of car.world.nearby?.(p,.02)||[]){if(o===car.obstacle||o.object?.userData?.h5Vehicle)continue;const top=o.y+o.h;if(Math.abs(p.x-o.x)<=o.w/2&&Math.abs(p.z-o.z)<=o.d/2&&top<=p.y+.04&&top>floor){floor=top;normal.set(0,1,0);}}
  return {p,floor,normal};
}
export function vehicleSubstep(car,dt,input){
  const spec=car.vehicleSpec||{wheelbase:2.63,track:1.78,radius:.34,rest:.411,travel:.15,spring:60000,damping:5300,torque:210,width:1.8,height:1.56,length:4.35};
  const damage=car.h5Vehicle.damage||{power:1,steering:0,wheel:()=>({suspension:0,alignment:0})},auto=car.h5Vehicle.auto,gravity=gravityOf(car.world),g=Math.max(0,-gravity.y);
  car.updateOccupancy();car.group.updateMatrixWorld(true);
  const yaw=car.group.rotation.y,forward=new T.Vector3(0,0,-1).applyAxisAngle(Y,yaw),right=new T.Vector3(1,0,0).applyAxisAngle(Y,yaw),speed=car.velocity.dot(forward),brake=car.gear==='P'?1:clamp(input.brake||0,0,1);
  // Variable steering ratio prevents full-lock lateral snaps at road speed.
  const steerLimit=T.MathUtils.lerp(.56,.19,clamp(Math.abs(speed)/30,0,1));
  car.steer=T.MathUtils.damp(car.steer,clamp(input.steer||0,-steerLimit,steerLimit)*(1-damage.steering*.40),10-damage.steering*6,dt);
  const drive=auto.step(dt,{selector:car.gear,throttle:input.throttle,brake,speed,driving:car.driving||car.h5Traffic?.active,radius:spec.radius,torque:spec.torque});car.engineRPM=drive.rpm;
  const force=gravity.clone().setY(0).multiplyScalar(car.mass);let up=0,pitch=0,roll=0,yawTorque=0,contacts=0,gripSum=0;
  const wheelbase=spec.wheelbase,track=spec.track;
  for(const w of car.wheels){
    const wd=damage.wheel(w),{p,floor,normal}=sampleWheel(car,w),radius=spec.radius*(w.popped?.78:1),raw=spec.rest-(p.y-floor-radius),compression=clamp(raw,-spec.travel,spec.travel),rate=clamp((compression-(w.compression??compression))/dt,-3,3);
    w.compression=compression;
    const spring=spec.spring*(1-wd.suspension*.55)*Math.max(0,compression)+spec.damping*(1-wd.suspension*.70)*rate;
    w.load=w.broken||raw<-spec.travel?0:clamp(spring,0,car.mass*9.81*.80)*(w.popped?.7:1);
    const N=w.load;up+=N*normal.y;force.addScaledVector(normal,N).addScaledVector(Y,-N*normal.y);
    pitch-=w.z*N;roll+=(w.x??w.side*.89)*N;
    const desired=car.group.worldToLocal(p.clone().setY(floor+radius)).y;
    w.group.position.y=clamp(desired,spec.radius-spec.travel,spec.radius+spec.travel);if(w.broken)continue;
    const surf=car.surfaceAt(p.x,p.z),wet=car.h5Vehicle.wetness?.()||0,mu=surf.mu*(1-.25*wet)*(w.popped?.50:1)*(1-wd.suspension*.22);gripSum+=mu;car.surfaceName=surf.name;
    const inner=Math.abs(car.steer)>.002?Math.atan(wheelbase/(wheelbase/Math.tan(Math.abs(car.steer))-Math.sign(car.steer)*w.side*track/2)):0;
    const angle=(w.z<0?Math.sign(car.steer)*inner:0)+wd.alignment,wf=forward.clone().applyAxisAngle(Y,angle),wr=right.clone().applyAxisAngle(Y,angle),r=p.clone().sub(car.group.position),v=car.velocity.clone().add(new T.Vector3(car.yawRate*r.z,0,-car.yawRate*r.x)),longV=v.dot(wf),latV=v.dot(wr);
    const torque=w.z>0&&!w.popped?drive.wheelTorque*damage.power*(spec.bike?2:1):0,I=spec.bike?.65:1.8*(spec.radius/.34)**2;
    let omega=w.omega+torque*dt/I;
    omega=Math.sign(omega||longV)*Math.max(0,Math.abs(omega)-brake*2900*dt/I);
    if(N>1){
      contacts++;const limit=mu*N,stiffness=limit*7,den=Math.max(Math.abs(longV),.5);
      let longitudinal=stiffness*(radius*omega-longV)/(den+stiffness*radius*radius*dt/I);
      const slip=Math.atan2(latV,Math.max(Math.abs(longV),.5));let lateral=-limit*Math.tanh(slip/.10);
      const demand=Math.hypot(longitudinal,lateral),scale=Math.min(1,limit/Math.max(demand,.001));longitudinal*=scale;lateral*=scale;
      const f=wf.multiplyScalar(longitudinal).addScaledVector(wr,lateral);force.add(f);yawTorque+=r.z*f.x-r.x*f.z;
      const local=f.clone().applyAxisAngle(Y,-yaw);pitch-=.35*local.z;roll+=.35*local.x;
      omega-=longitudinal*radius*dt/I;w.slip=slip;w.saturated=demand>limit*.99;
    }else{omega*=Math.exp(-.15*dt);w.slip=0;w.saturated=false;}
    w.omega=clamp(omega,-210,210);w.roll+=w.omega*dt;w.spin.rotation.x=-w.roll;w.group.rotation.y=angle;w.group.rotation.z=w.side*wd.suspension*.11;
  }
  car.mu=gripSum/car.wheels.length;car.h5Vehicle.contacts=contacts;
  car.heaveVelocity+=(up/car.mass+gravity.y)*dt;car.heaveVelocity*=Math.exp(-.45*dt);car.group.position.y+=car.heaveVelocity*dt;
  car.pitchRate=(car.pitchRate+pitch/Math.max(90,car.mass*(spec.length**2+spec.height**2)/12)*dt)/(1+3.5*dt);car.rollRate=(car.rollRate+roll/Math.max(65,car.mass*(spec.width**2+spec.height**2)/9)*dt)/(1+4.5*dt);
  if(spec.bike&&contacts){const lean=brake>.9&&Math.abs(speed)<.15?-.10:clamp(Math.atan2(speed*car.yawRate,Math.max(3,g)),-.68,.68);car.rollRate+=(lean-car.group.rotation.z)*(32-damage.steering*10)*dt;car.rollRate*=Math.exp(-6*dt);}
  car.group.rotation.x=clamp(car.group.rotation.x+car.pitchRate*dt,-.70,.70);car.group.rotation.z=clamp(car.group.rotation.z+car.rollRate*dt,-.65,.65);
  if(Math.abs(car.group.rotation.x)>=.699)car.pitchRate=0;if(Math.abs(car.group.rotation.z)>=.649)car.rollRate=0;
  const planar=car.velocity.length();if(planar>.001){const resistance=car.mass*g*(contacts?.013:0)+.5*.32*2.1*1.225*planar*planar;force.addScaledVector(car.velocity,-Math.min(resistance,car.mass*planar/dt)/planar);}
  car.velocity.addScaledVector(force,dt/car.mass);car.velocity.y=0;
  // Parking brake holds on modest grades through tire friction, never while airborne.
  if(contacts>=Math.min(3,car.wheels.length)&&brake>.95&&car.velocity.length()<.10&&Math.hypot(force.x,force.z)<car.mass*g*.8){car.velocity.set(0,0,0);car.yawRate*=Math.exp(-12*dt);}
  car.yawRate=(car.yawRate+yawTorque/Math.max(100,car.mass*(spec.length**2+spec.width**2)/12)*dt)/(1+1.8*dt);car.yawRate=clamp(car.yawRate,-1.6,1.6);
  car.group.rotation.y+=car.yawRate*dt;car.group.position.addScaledVector(car.velocity,dt);if(spec.bike)car.steeringWheel.rotation.y=car.steer;else car.steeringWheel.rotation.z=car.steer*5.2;
  if(car.group.position.y<-60||!Number.isFinite(car.group.position.lengthSq()))car.reset();
}

function detailModel(car){
  const trim=new T.MeshStandardMaterial({color:0x242629,roughness:.76}),alloy=new T.MeshStandardMaterial({color:0xa3a9ac,roughness:.29,metalness:.82});
  const addPart=(name,geometry,material,parent=car.group)=>{const mesh=new T.Mesh(geometry,material);mesh.name=name;parent.add(mesh);mesh.castShadow=mesh.receiveShadow=true;const part={name,mesh,kind:'panel',broken:false,health:60,max:60,stiffness:16000,baseRoughness:material.roughness,original:geometry.attributes.position.array.slice(),originalPosition:mesh.position.clone(),originalQuaternion:mesh.quaternion.clone(),originalParent:parent};mesh.userData.carPart=part;car.parts.push(part);car.pickables.push(mesh);return mesh;};
  const boxes=(specs)=>{const gs=specs.map(([p,s])=>{const g=new RoundedBoxGeometry(...s,1,.012);g.translate(...p);return g;});const g=mergeGeometries(gs);gs.forEach(g=>g.dispose());return g;};
  if(!car.vehicleSpec?.custom&&!car.h5SedanDetail){
  addPart('Radiator grille',boxes(Array.from({length:7},(_,i)=>[[0,.60+i*.021,-2.175],[.77,.009,.021]])),trim.clone());
  addPart('Engine cover',boxes([[[0,.62,-1.33],[.70,.20,.53]],[[0,.58,-1.82],[1.16,.27,.07]]]),trim.clone());
  for(const side of [-1,1]){
    const housing=addPart((side<0?'Left':'Right')+' door mirror',boxes([[[side*1.0,1.11,-.72],[.22,.12,.18]],[[side*.9,1.075,-.68],[.12,.045,.07]]]),trim.clone());
    const h=car.hinges.find(h=>h.kind==='door'&&Math.sign(h.sign)===side&&h.pivot.z<0);
    if(h){h.root.attach(housing);h.members.push(housing);housing.userData.carHinge=h;housing.userData.carPart.hinge=h;housing.userData.carPart.originalParent=h.root;housing.userData.carPart.originalPosition=housing.position.clone();housing.userData.carPart.originalQuaternion=housing.quaternion.clone();}
    const glass=new T.Mesh(new T.PlaneGeometry(.16,.078),new T.MeshStandardMaterial({color:0x9aaab3,roughness:.12,metalness:.9,envMapIntensity:.7}));glass.position.set(side*1.01,1.113,-.62);car.group.add(glass);housing.attach(glass);glass.userData.carPart=housing.userData.carPart;car.pickables.push(glass);
  }
  for(const w of car.wheels){
    // Authored tread ribs share a single mesh; avoid dozens of draw calls per wheel.
    const gs=[];for(let i=0;i<40;i++){const a=i*Math.PI/20,g=new T.BoxGeometry(.16,.012,.033);g.translate(0,.34,0);g.rotateX(a);gs.push(g);}const g=mergeGeometries(gs);gs.forEach(g=>g.dispose());
    const tread=new T.Mesh(g,trim);w.spin.add(tread);tread.userData.carPart=w;car.pickables.push(tread);
    const disc=new T.Mesh(new T.CylinderGeometry(.162,.162,.016,20),alloy);disc.rotation.z=Math.PI/2;w.spin.add(disc);disc.userData.carPart=w;car.pickables.push(disc);
  }
  }
  const lights=car.parts.filter(p=>p.name==='Headlight'||p.name==='Tail light');
  let canvas,texture,lastPaint=-1;if(typeof document!=='undefined'){canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;car.dashboard.material.map=texture;car.dashboard.material.color.setHex(0xffffff);car.dashboard.material.needsUpdate=true;}
  return {tick(input){for(const p of lights){p.mesh.material.emissiveIntensity=p.name==='Headlight'?(car.driving?1.2:.12):(input.brake>.1||car.gear==='P'?2:.35);}
    if(!canvas||car.time-lastPaint<.10)return;lastPaint=car.time;const ctx=canvas.getContext('2d');ctx.fillStyle='#081519';ctx.fillRect(0,0,256,96);ctx.fillStyle='#e9ffed';ctx.font='bold 35px sans-serif';ctx.fillText(Math.round(car.velocity.length()*3.6)+' km/h',12,39);ctx.font='22px sans-serif';ctx.fillText(car.gear+(car.gear==='D'?car.h5Vehicle.auto.gear:'')+'    '+Math.round(car.engineRPM||0)+' rpm',12,78);texture.needsUpdate=true;
  },dispose(){texture?.dispose();}};
}

export function installVehicleRefinement(car,{wetness=null}={}){
  if(car.h5Vehicle)return car.h5Vehicle;const restores=[],api={auto:new AutomaticDrive(),damage:new VehicleDamage(),contacts:0,wetness,sleeping:false,wake(){api.quiet=0;api.sleeping=false;api.checkAt=0;}};car.h5Vehicle=api;car.group.userData.h5Vehicle=car;
  const detail=detailModel(car);
  restores.push(wrapMethod(car,'reset',old=>function(){api.auto.reset();api.damage.reset();api.wake();const r=old.apply(this,arguments);this.wheels.forEach(w=>w.compression=.051);return r;}));
  restores.push(wrapMethod(car,'damage',old=>function(hit,energy,kind,dir,impulse){api.wake();const part=hit?.object?.userData.carPart;if(part&&!part.broken){const point=hit.point?.clone()||part.mesh.getWorldPosition(V());api.damage.impact(this,part,point,energy,kind,impulse);}return old.apply(this,arguments);}));
  restores.push(wrapMethod(car,'setGear',old=>function(gear){const f=new T.Vector3(0,0,-1).applyAxisAngle(Y,this.group.rotation.y),v=this.velocity.dot(f);if((gear==='P'&&Math.abs(v)>.8)||(gear==='R'&&v>.8)||(gear==='D'&&v<-.8)){this.message='Brake to a stop before changing direction or selecting Park.';return false;}return old.apply(this,arguments);}));
  restores.push(wrapMethod(car,'step',()=>function(dt,input){
    const still=!this.driving&&!this.h5Traffic?.active&&!this.grips.size&&this.gear==='P'&&this.velocity.lengthSq()<.0004&&Math.abs(this.heaveVelocity)<.012&&Math.abs(this.pitchRate)+Math.abs(this.rollRate)+Math.abs(this.yawRate)<.03;
    const stamp=this.group.position.toArray().join('/')+'/'+this.group.quaternion.toArray().join('/');
    if(api.sleeping&&api.gravity!==this.world.gravity)api.wake();
    if(still&&api.sleeping&&stamp===api.pose&&this.time<(api.checkAt||0))return;
    if(!still||(api.sleeping&&stamp!==api.pose))api.wake();
    if(still&&api.sleeping){const floor=this.world.floorHeight(this.group.position);if(Math.abs(floor-api.floor)<.005){api.checkAt=this.time+.4;return;}api.wake();}
    const n=Math.max(1,Math.min(8,Math.ceil(dt*120)));for(let i=0;i<n;i++)vehicleSubstep(this,dt/n,input);detail.tick(input);
    api.quiet=still?(api.quiet||0)+dt:0;if(api.quiet>1.0){api.sleeping=true;api.pose=this.group.position.toArray().join('/')+'/'+this.group.quaternion.toArray().join('/');api.gravity=this.world.gravity;api.floor=this.world.floorHeight(this.group.position);api.checkAt=this.time+.4;}
  }));
  restores.push(wrapMethod(car,'surfaceAt',old=>function(x,z){if(this.world.name!=='Cul-de-sac')return old.apply(this,arguments);const road=this.world.h5OpenWorld?.field.routeAt(x,z);if(road&&road.distance<road.route.width/2)return {name:road.route.kind==='road'?'asphalt':'trail',mu:road.route.kind==='road'?.98:.69};if((Math.hypot(x,z+8)<9.65)||(Math.abs(x)<3.45&&z>=-8&&z<38))return {name:'asphalt',mu:.98};if(Math.abs(x)<4.3&&z>-8&&z<38)return {name:'pavement',mu:.85};return {name:'grass',mu:.63};}));
  restores.push(wrapMethod(car,'updateStatus',old=>function(){old.apply(this,arguments);this.status+=(this.gear==='D'?' · automatic '+api.auto.gear:'')+' · '+Math.round(this.engineRPM||0)+' rpm'+(api.damage.engine>.2?' · engine '+Math.round((1-api.damage.engine)*100)+'%':'')+(api.damage.steering>.15?' · steering damage':'');}));
  api.dispose=()=>{restores.reverse().forEach(f=>f());detail.dispose();delete car.h5Vehicle;};return api;
}
