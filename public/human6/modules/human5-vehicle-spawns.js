import * as T from 'three';
import {Car} from '../mira-v2-car.js?v=19.3.2';
import {VEHICLE_SPECS} from './human5-vehicle-models.js?v=19.3.0';
import {installVehicleRefinement} from './human5-vehicles.js?v=19.3.0';
import {disposeTree,V} from './human5-common.js?v=19.3.0';

export function installVehicleSpawns({world,props,camera,renderer,quest=true}={}){
 if(world.h5VehicleSpawns)return world.h5VehicleSpawns;const spawned=new Set(),cap=quest?4:8;let ui=null,selected=null;
 const colors=[0x9b3329,0x314b68,0xd4c8af,0x718067,0xd2a338,0x283239];
 function spot(spec){const eye=camera.getWorldPosition(V()),f=camera.getWorldDirection(V()).setY(0).normalize();if(f.lengthSq()<.1)f.set(0,0,-1);
  const ahead=Math.max(4,spec.length*.9),right=new T.Vector3(-f.z,0,f.x);
  for(let row=0;row<4;row++)for(const offset of [0,1,-1,2,-2]){const p=eye.clone().addScaledVector(f,ahead+row*(spec.length+1)).addScaledVector(right,offset*(spec.width+1.5));p.y=world.floorHeight(p,undefined,.5);
   const radius=Math.hypot(spec.width,spec.length)/2+.35;if(Math.abs(p.x)>world.extent-radius||Math.abs(p.z)>world.extent-radius)continue;
   if(props.cars().some(c=>c.group.position.distanceTo(p)<radius+Math.hypot(c.vehicleSpec.width,c.vehicleSpec.length)/2+.2))continue;
   if((world.nearby(p,radius)||[]).some(o=>!o.walkable&&o.y+o.h>p.y+.24&&Math.abs(p.x-o.x)<o.w/2+radius&&Math.abs(p.z-o.z)<o.d/2+radius))continue;
   const terrain=world.h5OpenWorld?.field,h=terrain?.heightAt(p.x,p.z),water=terrain?.waterAt(p.x,p.z);if(water)continue;
   if(terrain&&Math.abs((terrain.heightAt(p.x+spec.width/2,p.z+spec.length/2)??h)-h)>.65)continue;return p;
  }return null;
 }
 function spawn(kind='sports'){const spec=VEHICLE_SPECS[kind];if(!spec)return null;
  if(spawned.size>=cap){props.status='Vehicle spawn limit '+cap+' reached; remove an unoccupied spawned vehicle';return null;}
  const p=spot(spec);if(!p){props.status='Move to a clear road or open space to spawn a vehicle';return null;}
  const base=props.vehicle,forward=camera.getWorldDirection(V()).setY(0).normalize(),yaw=Math.atan2(-forward.x,-forward.z);
  const car=new Car(props,{kind,orbit:base.orbit,keys:base.keys,controls:base.controls,color:colors[spawned.size%colors.length],stall:p.clone(),yaw,name:spec.name});
  car.h5UserVehicle=true;car.revision=world.revision;props.vehicles.push(car);installVehicleRefinement(car,{wetness:()=>world.weather?.state.wet||0});spawned.add(car);selected=car;props.status=spec.name+' spawned';return car;
 }
 function remove(car=selected){if(!car||!spawned.has(car))return false;if(car.driving||car.inCabin||car.grips.size){props.status='Exit and release the vehicle before removing it';return false;}
  props.ejectSeatItems(car);car.h5Vehicle?.dispose();car.audio?.dispose();car.target?.dispose();car.gearTexture?.dispose();if(car.obstacle)world.removeObstacle(car.obstacle);
  for(const d of car.debris)disposeTree(d.mesh);disposeTree(car.group);props.vehicles=props.vehicles.filter(c=>c!==car);if(props.vehicle===car)props.vehicle=props.vehicles[0];spawned.delete(car);selected=[...spawned].at(-1)||null;props.status='Removed spawned vehicle';return true;
 }
 function makeUI(){const root=document.getElementById('ui');if(!root||ui)return;ui=document.createElement('details');const title=document.createElement('summary');title.textContent='Vehicle spawns';ui.append(title);const list=document.createElement('select');list.setAttribute('aria-label','Vehicle model');for(const [id,s]of Object.entries(VEHICLE_SPECS))list.add(new Option(s.name,id));ui.append(list);
  for(const [text,fn]of [['SPAWN VEHICLE',()=>spawn(list.value)],['ENTER SELECTED',()=>selected?.enter()],['REMOVE SELECTED SPAWN',()=>remove()]]){const b=document.createElement('button');b.textContent=text;b.onclick=fn;ui.append(b);}const p=document.createElement('p');p.textContent='P / R / N / D selector; automatic forward gears. Grip the wheel or handlebars to steer. Left trigger accelerates; X brakes.';ui.append(p);root.append(ui);
 }
 const api={VEHICLE_SPECS,spawn,remove,spawned,cap,get selected(){return selected;},set selected(c){if(props.cars().includes(c))selected=c;},
  tick(){makeUI();},snapshot(){return {count:spawned.size,cap,vehicles:[...spawned].map(c=>({kind:c.vehicleKind,name:c.carName,mass:c.mass,wheels:c.wheels.length,engine:c.h5Vehicle.damage.engine,steering:c.h5Vehicle.damage.steering}))};},
  dispose(){for(const c of [...spawned]){if(c.driving)c.exit();c.inCabin=false;c.grips.clear();remove(c);}ui?.remove();delete world.h5VehicleSpawns;}
 };world.h5VehicleSpawns=api;return api;
}
