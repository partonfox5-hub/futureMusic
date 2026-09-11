import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const VEHICLE_SPECS=Object.freeze({
 sedan:{name:'Sedan',width:1.80,length:4.35,height:1.56,mass:1250,track:1.78,wheelbase:2.63,radius:.34,spring:60000,damping:5300,travel:.15,rest:.411,torque:210,driverEye:[-.40,1.25,.27],collisionY:.72},
 sports:{name:'Cinder sports coupe',custom:true,width:1.91,length:4.55,height:1.23,mass:1460,track:1.65,wheelbase:2.67,radius:.345,spring:70000,damping:5800,travel:.12,rest:.37,torque:330,driverEye:[-.40,1.08,.33],collisionY:.62},
 pickup:{name:'Canyon pickup',custom:true,width:2.06,length:5.34,height:1.92,mass:2190,track:1.78,wheelbase:3.18,radius:.41,spring:74000,damping:6700,travel:.23,rest:.48,torque:325,driverEye:[-.46,1.59,.24],collisionY:.90},
 motorcycle:{name:'Sable motorcycle',custom:true,bike:true,width:.78,length:2.16,height:1.37,mass:290,track:0,wheelbase:1.46,radius:.32,spring:22500,damping:1750,travel:.16,rest:.32,torque:58,driverEye:[0,1.49,.25],collisionY:.64},
 monster:{name:'Badlands monster truck',custom:true,width:2.90,length:5.55,height:2.94,mass:3900,track:2.38,wheelbase:3.25,radius:.79,spring:104000,damping:10000,travel:.38,rest:.76,torque:600,driverEye:[-.48,2.46,.25],collisionY:1.62}
});
function patch(fn,nu=14,nv=6){const p=[],uv=[],idx=[];for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){p.push(...fn(i/nu,j/nv));uv.push(i/nu,j/nv);if(i<nu&&j<nv){const a=j*(nu+1)+i,b=a+nu+1;idx.push(a,b,a+1,a+1,b,b+1);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;}
const cylinderBetween=(a,b,r,n=10)=>{const d=new T.Vector3().subVectors(b,a),g=new T.CylinderGeometry(r,r,d.length(),n);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate(...a.clone().lerp(b,.5).toArray());return g;};

/** Four original body designs sharing the game's part / hinge / damage contracts. */
export function buildVehicleModel(car,spec){
 const {group}=car,bodyWidth=spec.bike?.33:spec.width*(car.vehicleKind==='monster'?.77:1),W=bodyWidth/2,L=spec.length/2;
 const sports=car.vehicleKind==='sports',truck=car.vehicleKind==='pickup'||car.vehicleKind==='monster',lift=car.vehicleKind==='monster'?.92:0;
 const paint=new T.MeshStandardMaterial({color:car.paintColor,roughness:.29,metalness:.70,side:T.DoubleSide}),trim=new T.MeshStandardMaterial({color:0x25292c,roughness:.83}),metal=new T.MeshStandardMaterial({color:0xa4adb2,metalness:.82,roughness:.30}),glass=new T.MeshStandardMaterial({color:0x8fbbc8,transparent:true,opacity:.25,roughness:.10,metalness:.10,depthWrite:false,side:T.DoubleSide});
 function part(name,g,mat=paint,health=110,parent=group){const mesh=new T.Mesh(g,mat.clone());mesh.name=name;mesh.castShadow=mesh.receiveShadow=!mat.transparent;parent.add(mesh);const p={name,mesh,kind:'panel',health,max:health,broken:false,stiffness:name==='Chassis'?85000:14000,baseRoughness:mesh.material.roughness};mesh.userData.carPart=p;car.parts.push(p);car.pickables.push(mesh);return mesh;}
 function box(name,p,size,mat=trim,health=90,parent=group){const soft=/Seat|Headrest|Console|Dashboard surround|Engine cover/.test(name);const g=soft?new RoundedBoxGeometry(...size,2,Math.min(.052,...size.map(x=>x*.22))):new T.BoxGeometry(...size,Math.max(1,Math.ceil(size[0]*7)),Math.max(1,Math.ceil(size[1]*7)),Math.max(1,Math.ceil(size[2]*7)));g.translate(...p);return part(name,g,mat,health,parent);}
 function pipe(name,a,b,r,mat=metal,parent=group){return part(name,cylinderBetween(new T.Vector3(...a),new T.Vector3(...b),r),mat,120,parent);}
 const top=sports?.78:1.05+lift,bottom=sports?.27:.38+lift,roof=spec.height,cabFront=sports?-.52:-.80,cabBack=sports?.92:.88;
 if(spec.bike){
  const frame=[];for(const side of [-1,1])for(const [a,b]of [[[side*.12,.44,.57],[side*.10,.73,-.48]],[[side*.10,.73,-.48],[side*.12,.47,.15]],[[side*.12,.47,.15],[side*.12,.44,.57]]])frame.push(cylinderBetween(new T.Vector3(...a),new T.Vector3(...b),.022));const g=mergeGeometries(frame);frame.forEach(g=>g.dispose());part('Chassis',g,trim,550);
  const tank=new T.SphereGeometry(1,20,12);tank.scale(.19,.15,.28);tank.translate(0,.82,-.11);part('Fuel tank',tank,paint,120);
  const seat=new T.CapsuleGeometry(.13,.26,4,10);seat.rotateX(Math.PI/2);seat.scale(1,.46,1);seat.translate(0,.85,.37);part('Saddle',seat,trim,100);
  box('Engine block',[0,.50,.0],[.26,.25,.25],metal,220);for(let i=0;i<6;i++)box('Cooling fin',[0,.49+i*.034,-.015],[.31,.012,.27],trim,80);
  for(const side of [-1,1]){pipe('Front fork',[side*.10,.96,-.52],[side*.10,.32,-spec.wheelbase/2],.019);pipe('Rear swingarm',[side*.14,.48,.12],[side*.14,.32,spec.wheelbase/2],.019);}
  pipe('Exhaust',[.18,.36,.06],[.18,.40,.87],.04,metal);pipe('Steering stem',[0,.94,-.53],[0,1.09,-.43],.025,metal);
  const lamp=new T.CylinderGeometry(.065,.063,.085,20);lamp.rotateX(Math.PI/2);lamp.translate(0,.97,-.59);part('Headlight',lamp,new T.MeshStandardMaterial({color:0xf4efd4,emissive:0xb5d3ef,emissiveIntensity:.3}),45);
  box('Tail light',[0,.83,.75],[.10,.045,.026],new T.MeshStandardMaterial({color:0xbf2422,emissive:0xdb2211}),30);
  pipe('Mirror stalk',[-.26,1.09,-.43],[-.32,1.30,-.47],.007);
  for(const z of [-spec.wheelbase/2,spec.wheelbase/2]){const g=new T.TorusGeometry(spec.radius+.035,.025,6,22,Math.PI);g.rotateY(Math.PI/2);g.translate(0,spec.radius,z);part('Fender',g,paint,90);}
 }else{
  box('Chassis',[0,bottom,0],[bodyWidth*.91,.16,spec.length*.88],trim,900);
  const wheels=[-spec.wheelbase/2,spec.wheelbase/2],arch=spec.radius*1.14;
  const sidePatch=(side,z0,z1)=>patch((u,v)=>{const z=T.MathUtils.lerp(z0,z1,u);let low=bottom;
   for(const wz of wheels){const dz=z-wz;if(Math.abs(dz)<arch)low=Math.max(low,spec.radius+Math.sqrt(arch*arch-dz*dz));}
   const upper=top+(sports?.12*Math.exp(-(((z-1.23)/.50)**2)):.10);const y=T.MathUtils.lerp(Math.min(low,upper-.015),upper,v);
   const w=W*(.94+.055*Math.sin(v*Math.PI)-.10*Math.pow(Math.abs(z)/L,4));return [side*w,y,z];});
  for(const side of [-1,1]){part((side<0?'Left':'Right')+' front fender',sidePatch(side,-L+.12,cabFront),paint,170);part((side<0?'Left':'Right')+' rear quarter',sidePatch(side,cabBack,L-.10),paint,160);
   const door=part((side<0?'Left':'Right')+' door',sidePatch(side,cabFront,cabBack),paint,150);
   const window=part('Door window',patch((u,v)=>[side*T.MathUtils.lerp(W*.91,W*.77,v),T.MathUtils.lerp(top+.07,roof-.055,v),T.MathUtils.lerp(cabFront+.035+v*.19,cabBack-.035-v*.17,u)],10,4),glass,30);
   const handle=box('Door handle',[side*W,top-.045,cabBack-.22],[.025,.029,.15],metal,50);
   car.makeHinge(door,[window,handle],[side*W,top-.12,cabFront],'door',side,new T.Vector3(0,1,0),1.08,handle);
  }
  for(const side of [-1,1]){const frame=[cylinderBetween(new T.Vector3(side*W*.91,top+.075,cabFront),new T.Vector3(side*W*.77,roof-.05,cabFront+.24),.026),cylinderBetween(new T.Vector3(side*W*.77,roof-.05,cabFront+.24),new T.Vector3(side*W*.77,roof-.05,cabBack-.17),.029),cylinderBetween(new T.Vector3(side*W*.77,roof-.05,cabBack-.17),new T.Vector3(side*W*.91,top+.075,cabBack),.032)];part('Cabin frame',mergeGeometries(frame),paint,220);frame.forEach(g=>g.dispose());}
  for(const front of [true,false])part(front?'Nose fascia':'Rear fascia',patch((u,v)=>{const x=(u*2-1)*W*T.MathUtils.lerp(.91,.88,v);return [x,T.MathUtils.lerp(bottom+.20,top-.10,v),(front?-1:1)*(L-.055-.075*v-.035*(1-(u*2-1)**2))];},16,5),paint,180);
  const deck=(z0,z1,y0,y1,w0,w1)=>patch((u,v)=>{const x=(u*2-1)*T.MathUtils.lerp(w0,w1,v);return [x,T.MathUtils.lerp(y0,y1,v)+.05*(1-(u*2-1)**2),T.MathUtils.lerp(z0,z1,v)];});
  const hood=part('Hood',deck(-L+.13,cabFront,top-.12,top+.04,W*.88,W*.94),paint,130);car.makeHinge(hood,[],[0,top,cabFront],'hood',1,new T.Vector3(1,0,0),1.20);
  part('Windscreen',deck(cabFront,cabFront+.24,top+.075,roof-.05,W*.91,W*.77),glass,32);
  part('Roof',deck(cabFront+.24,cabBack-.17,roof-.05,roof-.05,W*.77,W*.77),paint,170);
  part('Rear window',deck(cabBack,cabBack-.17,top+.075,roof-.05,W*.91,W*.77),glass,32);
  if(truck){box('Bed floor',[0,top-.25,(cabBack+L)/2],[bodyWidth*.87,.075,L-cabBack],trim,200);
   for(const side of [-1,1])box('Bed rail',[side*W*.94,top+.12,(cabBack+L)/2],[.10,.09,L-cabBack],paint,160);
   const tail=box('Tailgate',[0,top-.05,L-.08],[bodyWidth*.89,.42,.07],paint,170);car.makeHinge(tail,[],[0,top-.27,L-.07],'trunk',1,new T.Vector3(1,0,0),Math.PI/2);
  }else{const lid=part('Rear deck',deck(cabBack,L-.11,top+.08,top-.12,W*.95,W*.87),paint,160);car.makeHinge(lid,[],[0,top,cabBack],'trunk',-1,new T.Vector3(1,0,0),1.2);}
  for(const front of [true,false]){const z=(front?-1:1)*(L-.05);box(front?'Front bumper':'Rear bumper',[0,bottom+.16,z],[bodyWidth*.92,.19,.17],paint,230);
   for(const side of [-1,1])box(front?'Headlight':'Tail light',[side*W*.62,(sports?top-.18:top-.08),z+(front?-.025:.025)],[bodyWidth*(sports?.16:.18),sports?.06:.12,.035],new T.MeshStandardMaterial({color:front?0xf0f4e9:0xa72722,emissive:front?0xc2ddeb:0xe62217,emissiveIntensity:.2}),40);
  }
  const grille=[];for(let j=0;j<6;j++){const g=new T.BoxGeometry(bodyWidth*.54,.012,.028);g.translate(0,bottom+.18+j*.03,-L-.013);grille.push(g);}part('Radiator grille',mergeGeometries(grille),trim,100);grille.forEach(g=>g.dispose());
  box('Engine cover',[0,top-.24,-spec.wheelbase/2],[.67,.20,.58],trim,200);
  for(const side of [-1,1]){const h=car.hinges.find(h=>h.kind==='door'&&h.sign===side),mirror=box('Door mirror',[side*(W+.045),top+.17,cabFront+.18],[.22,.12,.18],trim,60);if(h){h.root.attach(mirror);h.members.push(mirror);mirror.userData.carHinge=h;mirror.userData.carPart.hinge=h;}}
 }
 const wheelPlaces=spec.bike?[[0,-spec.wheelbase/2],[0,spec.wheelbase/2]]:[[-1,-spec.wheelbase/2],[-1,spec.wheelbase/2],[1,-spec.wheelbase/2],[1,spec.wheelbase/2]];
 for(const [side,z]of wheelPlaces){const knuckle=new T.Group(),spin=new T.Group();knuckle.position.set(side*spec.track/2,spec.radius,z);group.add(knuckle);knuckle.add(spin);const width=spec.bike?.13:car.vehicleKind==='monster'?.42:.24;
  const tire=new T.Mesh(new T.TorusGeometry(spec.radius*.76,spec.radius*.24,10,28),trim.clone());tire.rotation.y=Math.PI/2;tire.scale.z=width/(spec.radius*.48);spin.add(tire);
  const rim=new T.Mesh(new T.TorusGeometry(spec.radius*.53,spec.radius*.056,6,24),metal);rim.rotation.y=Math.PI/2;spin.add(rim);const disc=new T.Mesh(new T.CylinderGeometry(spec.radius*.39,spec.radius*.39,.016,16),trim);disc.rotation.z=Math.PI/2;spin.add(disc);
  const spokeGeos=[],treadGeos=[];for(let i=0;i<7;i++){const g=new T.BoxGeometry(width*.90,.027,spec.radius*1.15);g.rotateX(i*Math.PI/7);spokeGeos.push(g);}const spokes=new T.Mesh(mergeGeometries(spokeGeos),metal);spokeGeos.forEach(g=>g.dispose());spin.add(spokes);
  for(let j=0;j<36;j++){const g=new T.BoxGeometry(width*.88,car.vehicleKind==='monster'?.030:.005,spec.radius*.10);g.translate(0,spec.radius,0);g.rotateX(j*Math.PI/18);treadGeos.push(g);}const tread=new T.Mesh(mergeGeometries(treadGeos),trim);treadGeos.forEach(g=>g.dispose());spin.add(tread);
  const wheel={name:(side<0?'Left ':side>0?'Right ':'')+(z<0?'front':'rear')+' wheel',mesh:tire,group:knuckle,spin,side,x:side*spec.track/2,z,radius:spec.radius,health:110,max:110,kind:'wheel',popped:false,broken:false,omega:0,roll:0,compression:.04,load:spec.mass*9.81/wheelPlaces.length};
  spin.traverse(m=>{if(m.isMesh){m.castShadow=true;m.userData.carPart=wheel;car.pickables.push(m);}});car.wheels.push(wheel);
 }
 const eye=new T.Vector3(...spec.driverEye),seatY=eye.y-.55;
 if(!spec.bike){for(const x of [-bodyWidth*.22,bodyWidth*.22]){box('Seat cushion',[x,seatY,.33],[bodyWidth*.31,.17,.57],trim,100);box('Seat back',[x,seatY+.27,.61],[bodyWidth*.31,.55,.13],trim,100);box('Headrest',[x,seatY+.62,.61],[.30,.15,.10],trim,70);}box('Dashboard surround',[0,eye.y-.13,cabFront+.14],[bodyWidth*.79,.15,.23],trim,120);}
 car.console=box('Console',spec.bike?[.22,1.075,-.43]:[0,eye.y-.48,.02],spec.bike?[.06,.04,.065]:[.18,.24,.58],trim,100);
 car.shifterBase=new T.Group();car.shifterBase.position.set(spec.bike?.23:.015,spec.bike?1.04:eye.y-.32,spec.bike?-.43:.02);if(spec.bike)car.shifterBase.scale.setScalar(.45);group.add(car.shifterBase);car.shifterLever=new T.Group();car.shifterBase.add(car.shifterLever);
 const lever=new T.Mesh(new T.CylinderGeometry(.008,.010,.10,8),metal);lever.position.y=.05;const knob=new T.Mesh(new T.SphereGeometry(.026,10,7),trim);knob.position.y=.11;car.shifterLever.add(lever,knob);car.shifterKnob=knob;for(const m of [lever,knob]){m.userData.carControl='shifter';car.pickables.push(m);}
 car.wheelRoot=new T.Group();car.wheelRoot.position.set(spec.bike?0:eye.x,spec.bike?1.09:eye.y-.20,spec.bike?-.43:cabFront+.34);car.wheelRoot.rotation.x=spec.bike?0:-.25;group.add(car.wheelRoot);car.steeringWheel=new T.Group();car.wheelRoot.add(car.steeringWheel);
 if(spec.bike){const bar=new T.Mesh(new T.CylinderGeometry(.013,.013,.65,8),metal);bar.rotation.z=Math.PI/2;car.steeringWheel.add(bar);}else car.steeringWheel.add(new T.Mesh(new T.TorusGeometry(.172,.018,8,24),trim));
 const horn=new T.Mesh(new T.SphereGeometry(.029,10,7),trim);horn.userData.carControl='horn';car.steeringWheel.add(horn);car.hornPad=horn;car.pickables.push(horn);
 car.dashboard=box('Instruments',[spec.bike?0:eye.x,spec.bike?1.15:eye.y-.13,spec.bike?-.48:cabFront+.07],spec.bike?[.15,.085,.015]:[.30,.13,.015],new T.MeshBasicMaterial({color:0x162931}),80);
 car.target=new T.WebGLRenderTarget(384,192);car.target.texture.colorSpace=T.SRGBColorSpace;car.mirror=new T.Mesh(new T.PlaneGeometry(spec.bike?.16:.28,.12),new T.MeshBasicMaterial({map:car.target.texture,toneMapped:false}));car.mirror.position.set(spec.bike?-.32:-.05,spec.bike?1.32:eye.y+.12,spec.bike?-.47:cabFront+.05);group.add(car.mirror);car.rearCamera=new T.PerspectiveCamera(75,2,.08,120);
 car.cabinBox=new T.Box3(new T.Vector3(-spec.width*.47,seatY-.2,cabFront),new T.Vector3(spec.width*.47,spec.height+.25,cabBack));
 for(const p of car.parts){p.original=p.mesh.geometry.attributes.position.array.slice();p.originalPosition=p.mesh.position.clone();p.originalQuaternion=p.mesh.quaternion.clone();p.originalParent=p.mesh.parent;}
}
