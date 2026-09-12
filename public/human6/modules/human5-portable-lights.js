import * as T from 'three';
import {V,wrapMethod} from './human5-common.js?v=19.3.0';
/** Flashlights and cars share the existing fixed light pool. Lens emissions are
 * independent of illumination selection; there are no extra per-car shadows. */
export function installPortableLights({world,props,lights}={}){
 const items=new Map(),cars=new Map(),restores=[];let scan=0;
 const fixture=(root,kind,center,extra={})=>lights.add({root,kind,center,direction:new T.Vector3(0,-.035,-1).normalize(),type:'Portable',h5Portable:true,enabled:true,color:0xe4eeff,intensity:60,distance:22,angle:.40,penumbra:.55,priority:1,...extra});
 function attachItem(item){if(items.has(item)||item.data.kind!=='light')return;item.lightOn=true;const f=fixture(item.group,'spot',new T.Vector3(0,.025,-.23),{intensity:item.id==='godlight'?600:60,distance:item.id==='godlight'?65:24,priority:5});f.lenses=[];item.group.traverse(m=>{if(m.isMesh&&m.material?.emissive?.getHex())f.lenses.push(m.material);});items.set(item,f);item.h5Light=f;}
 function attachCar(car){if(cars.has(car))return;const spec=car.vehicleSpec,eye=new T.Vector3(...spec.driverEye);car.lightMode='auto';car.cabinLightOn=false;
  const head=car.parts.filter(p=>/Headlight/i.test(p.name)),tail=car.parts.filter(p=>/Tail light/i.test(p.name));
  const center=new T.Vector3(0,spec.bike?.97:Math.min(spec.height*.56,eye.y-.2),-spec.length*.49);
  if(spec.bike)center.z=-.68;
  const beam=fixture(car.group,'spot',center,{intensity:140,distance:40,angle:.65,penumbra:.7,enabled:false});
  const cabin=fixture(car.group,'point',new T.Vector3(0,eye.y+.08,.12),{color:0xffe0b4,intensity:2.5,distance:2.6,enabled:false});
  const buttons=[];for(const [index,type]of ['headlights','interior'].entries()){
   const m=new T.Mesh(new T.BoxGeometry(.055,.037,.020),new T.MeshStandardMaterial({color:index?0xd9c891:0x92bdcf,emissive:index?0xddbc76:0x95cdee,emissiveIntensity:.12,roughness:.44}));m.position.set(eye.x+.22+index*.075,eye.y-.16,spec.bike?-.48:-.63);m.name=index?'Interior light button':'Headlight button';m.userData.h5DynamicPart=true;m.userData.carControl=type;m.userData.h5LightCar=car;car.group.add(m);car.pickables.push(m);buttons.push(m);
  }
  const s={car,head,tail,beam,cabin,buttons,brake:0};cars.set(car,s);
  s.undo=wrapMethod(car,'input',old=>function(){const r=old.apply(this,arguments);s.brake=r.brake||0;return r;});
  car.toggleHeadlights=()=>{car.lightMode=car.lightMode==='auto'?'on':car.lightMode==='on'?'off':'auto';props.status='Headlights: '+car.lightMode;return car.lightMode;};
  car.toggleInteriorLight=()=>{car.cabinLightOn=!car.cabinLightOn;props.status='Interior light '+(car.cabinLightOn?'on':'off');return car.cabinLightOn;};
 }
 function control(ray){const hit=props.hit(ray,2.5,false),car=hit?.object.userData.h5LightCar;if(!car)return false;hit.object.userData.carControl==='headlights'?car.toggleHeadlights():car.toggleInteriorLight();return true;}
 restores.push(wrapMethod(props,'trigger',old=>function(i){const item=this.held.get(i);if(item?.data.kind==='light'){attachItem(item);item.lightOn=!item.lightOn;props.status=item.data.name+(item.lightOn?' on':' off');return true;}if(!item&&control(this.ray(i)))return true;return old.apply(this,arguments);}));
 restores.push(wrapMethod(props,'desktop',old=>function(ray){const item=this.held.get('desktop');if(item?.data.kind==='light'){attachItem(item);item.lightOn=!item.lightOn;props.status=item.data.name+(item.lightOn?' on':' off');return true;}if(!item&&control(ray))return true;return old.apply(this,arguments);}));
 const api={items,cars,attachItem,attachCar,tick(dt){
  scan-=dt;if(scan<=0){scan=.25;for(const item of props.items)attachItem(item);for(const car of props.cars())attachCar(car);
   for(const [item,f]of items)if(!props.items.includes(item)){lights.remove(f);items.delete(item);}
   for(const [car,s]of cars)if(!props.cars().includes(car)){lights.remove(s.beam);lights.remove(s.cabin);s.undo();cars.delete(car);}
  }
  const cycle=world.weather?.cycle||world.h5DayNight;const night=cycle?.night??0;
  for(const [item,f]of items){f.enabled=!!item.lightOn&&!!item.group.parent;for(const m of f.lenses)m.emissiveIntensity=item.lightOn?3:.01;f.priority=item.holder!=null?8:1;}
  for(const [car,s]of cars){const on=car.h5Traffic?.active?night>.25:car.lightMode==='on'||car.lightMode==='auto'&&night>.25;
   s.beam.enabled=on&&s.head.some(p=>!p.broken&&p.mesh.visible);s.beam.priority=car.driving?6:1;s.cabin.enabled=car.cabinLightOn;
   car.headlightsOn=s.beam.enabled;car.brakeLightsOn=s.brake>.06||car.gear==='P'&&(car.driving||car.h5Traffic?.active);
   for(const p of s.head)p.mesh.traverse(m=>{if(m.isMesh&&m.material?.emissive?.getHex())m.material.emissiveIntensity=on&&!p.broken?3:.035;});
   for(const p of s.tail)p.mesh.material.emissiveIntensity=p.broken?0:car.brakeLightsOn?2.8:on?.55:.035;
   s.buttons[0].material.emissiveIntensity=on?.65:.1;s.buttons[1].material.emissiveIntensity=car.cabinLightOn?.65:.1;
  }
 },dispose(){restores.reverse().forEach(f=>f());for(const f of items.values())lights.remove(f);for(const s of cars.values()){lights.remove(s.beam);lights.remove(s.cabin);s.undo();for(const m of s.buttons){m.removeFromParent();m.geometry.dispose();m.material.dispose();}}items.clear();cars.clear();}};world.h5PortableLights=api;return api;
}
