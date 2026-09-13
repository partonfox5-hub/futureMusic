import * as T from 'three';
import {wrapMethod} from './human5-common.js?v=20.2.0';

// Damage edits vertex ranges inside existing material batches; no mesh per brick.
export function structuralDamage({world,props,region,resident}){
  const saved=new Map(),p=new T.Vector3(),v=new T.Vector3(),size=new T.Vector3(),color=new T.Color();
  function track(r,g,center,dimensions,material,obstacle=null){
    r.pieces??=[];const kind=material==='glass'?'glass':material==='trim'?'wood':r.spec.kind&&r.spec.kind!=='grove'&&r.spec.style!=='palisade'?'stone':['timber','nordic','thatch'].includes(r.spec.town?.style)?'wood':'plaster';
    const area=dimensions.slice().sort((a,b)=>b-a),health=({glass:11,wood:70,plaster:48,stone:210}[kind])*Math.max(.25,Math.min(6,area[0]*area[1]/.36));
    const piece={id:r.pieces.length,record:r,kind,health,maxHealth:health,center:new T.Vector3(...center),size:new T.Vector3(...dimensions),obstacle,broken:false,start:0,count:0,mesh:null};
    r.root.localToWorld(piece.center);g.userData.h6Structure=piece;r.pieces.push(piece);if(obstacle)obstacle.h6Structure=piece;return piece;
  }
  function hide(piece){const a=piece.mesh.geometry.attributes.position,x=a.getX(piece.start),y=a.getY(piece.start),z=a.getZ(piece.start);for(let i=piece.start;i<piece.start+piece.count;i++)a.setXYZ(i,x,y,z);a.needsUpdate=true;if(piece.obstacle)world.removeObstacle(piece.obstacle);for(const f of piece.floors||[])world.floors=world.floors.filter(x=>x!==f);piece.broken=true;}
  function bind(r,mesh,entries){let start=0;mesh.userData.h6Pieces=[];for(const g of entries){const piece=g.userData.h6Structure,count=g.attributes.position.count;if(piece){piece.mesh=mesh;piece.start=start;piece.count=count;mesh.userData.h6Pieces.push(piece);const damage=saved.get(r.spec.id)?.[piece.id];if(Number.isFinite(damage)){piece.health=piece.maxHealth-damage;if(piece.health<=0)hide(piece);}}start+=count;}}
  function resolve(hit){if(hit?.structure)return hit.structure;const list=hit?.object?.userData.h6Pieces;if(!list)return null;const at=(hit.faceIndex??-1)*3;return list.find(p=>at>=p.start&&at<p.start+p.count&&!p.broken)||null;}
  function damage(piece,energy,dir){if(!piece||piece.broken||!Number.isFinite(energy)||energy<=0)return false;piece.health-=energy;let edits=saved.get(piece.record.spec.id);if(!edits)saved.set(piece.record.spec.id,edits={});edits[piece.id]=piece.maxHealth-Math.max(0,piece.health);
    if(piece.health>0)return false;hide(piece);const fractures=world.fractures;if(fractures){color.setHex(piece.kind==='wood'?0x806047:piece.kind==='glass'?0x9fc1c7:0x85847c);for(let i=0;i<4;i++){p.copy(piece.center);p.x+=(i%2-.5)*piece.size.x*.5;p.z+=(Math.floor(i/2)-.5)*piece.size.z*.5;v.copy(dir||size.set(0,1,0)).multiplyScalar(Math.min(7,Math.sqrt(energy)*.3));v.y+=1.1+i*.2;size.set(.24,.10,.18);fractures.fragment(piece.center.clone().addScaledVector(v,.015),size,color.getHex(),v);}}
    // Loss of most nearby load-bearing wall sections releases the roof under gravity.
    if(piece.obstacle){const r=piece.record;for(const roof of r.pieces.filter(p=>p.floors&&!p.broken)){const supports=roof.supports||(roof.supports=r.pieces.filter(p=>p.obstacle&&p.center.y<roof.center.y&&Math.abs(p.center.x-roof.center.x)<Math.max(roof.size.x,roof.size.z)*.65&&Math.abs(p.center.z-roof.center.z)<Math.max(roof.size.x,roof.size.z)*.65));if(supports.length>3&&supports.filter(p=>p.broken).length/supports.length>.65)damage(roof,roof.health+1,new T.Vector3(0,-1,0));}}
    return true;
  }
  function area(point,radius,energy,dir=null){let count=0;for(const r of resident.values())for(const piece of r.pieces||[]){if(piece.broken)continue;const distance=piece.center.distanceTo(point);if(distance>radius)continue;v.copy(piece.center).sub(point).normalize();if(damage(piece,energy*(1-distance/radius),dir||v))count++;}return count;}
  const undoImpact=wrapMethod(props,'impact',old=>function(hit,energy,dir,kind,...rest){const piece=resolve(hit);if(piece)return damage(piece,energy*(kind==='laser'?1.4:1),dir);return old.call(this,hit,energy,dir,kind,...rest);});
  const undoSave=wrapMethod(region,'save',old=>function(){return {...old.call(this),structures:[...saved]};});
  const undoRestore=wrapMethod(region,'restore',old=>function(data){const next=new Map();if(data.structures!==undefined){if(!Array.isArray(data.structures)||data.structures.length>150)throw Error('Invalid building edits');for(const [id,values]of data.structures){if(typeof id!=='string'||!values||typeof values!=='object'||Array.isArray(values)||Object.keys(values).length>20000)throw Error('Invalid building state');for(const [index,n]of Object.entries(values))if(!/^\d+$/.test(index)||!Number.isFinite(n)||n<0||n>1e7)throw Error('Invalid structure damage');next.set(id,{...values});}}const result=old.call(this,data);saved.clear();for(const [k,v]of next)saved.set(k,v);for(const r of resident.values())r.needsReload=true;return result;});
  return {saved,track,bind,resolve,damage,area,dispose(){undoImpact();undoSave();undoRestore();}};
}
