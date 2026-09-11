import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Original game designs and artistic damage values, not real weapon specifications.
export const EXTRA_WEAPONS=Object.freeze({
 musket:{name:'Flintlock musket',mass:4.3,reach:1.10,kind:'bullet',category:'firearm',fireRate:1,energy:48,spread:.027,pellets:1,magSize:1,reload:7.5,recoil:.11},
 rocketLauncher:{name:'Rocket launcher',mass:7.2,reach:.88,kind:'launcher',category:'launcher',fireRate:2.2,magSize:1,reload:2.8,projectile:'rocket'},
 miniNuke:{name:'Mini-nuke launcher',mass:11,reach:.80,kind:'launcher',category:'launcher',fireRate:7,magSize:1,reload:5,projectile:'miniNuke'},
 lightning:{name:'Lightning spell',mass:.15,reach:.20,kind:'spell',category:'spell',fireRate:1.5,color:0x99ddff},
 fireball:{name:'Fireball spell',mass:.15,reach:.20,kind:'spell',category:'spell',fireRate:1.0,color:0xff7d30},
 necromancy:{name:'Necromancy spell',mass:.15,reach:.20,kind:'spell',category:'spell',fireRate:5,color:0x9c71ef},
 resurrection:{name:'Resurrection spell',mass:.15,reach:.20,kind:'spell',category:'spell',fireRate:1.7,color:0x7ee5ad},
 freeze:{name:'Freeze spell',mass:.15,reach:.20,kind:'spell',category:'spell',fireRate:1.4,color:0x8ad9f2}
});
const material=(color,roughness=.6,metalness=.1)=>new T.MeshStandardMaterial({color,roughness,metalness});
function stockGeometry(points,width){const shape=new T.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.005,bevelThickness:.004});g.translate(0,0,-width/2);g.rotateY(Math.PI/2);return g;}

export function buildSpecialEquipment(id,add){
 if(!EXTRA_WEAPONS[id])return false;
 const steel=material(0x586066,.32,.8),dark=material(0x252b2d,.76,.15),rubber=material(0x141719,.9,0);
 const box=(w,h,d,m,x,y,z)=>add(new T.BoxGeometry(w,h,d),m,x,y,z);
 const tube=(r,len,m,x,y,z,ro=r)=>{const a=add(new T.CylinderGeometry(r,ro,len,16,1,true),m,x,y,z);a.rotation.x=Math.PI/2;return a;};
 if(id==='musket'){
  const wood=material(0x72503a,.71,.0),brass=material(0x9b814a,.39,.7);
  add(stockGeometry([[-.36,-.018],[-.25,-.055],[-.01,-.017],[.04,-.060],[.26,-.052],[.29,.030],[.02,.045],[-.30,.026]],.041),wood,0,0,0);
  box(.04,.022,.76,wood,0,0,-.45);tube(.014,.92,steel,0,.028,-.60);
  tube(.0035,.70,steel,.010,-.018,-.65);for(const z of [-.32,-.59,-.88])tube(.019,.020,brass,0,.02,z);
  box(.01,.042,.07,steel,.027,.027,-.055);const hammer=box(.008,.058,.012,steel,.032,.055,-.02);hammer.rotation.x=-.45;
  add(new T.TorusGeometry(.025,.0035,6,14),brass,0,-.035,-.035).rotation.y=Math.PI/2;
  box(.046,.092,.012,brass,0,-.017,.30);
 }else if(id==='rocketLauncher'||id==='miniNuke'){
  const nuke=id==='miniNuke',body=material(nuke?0xb09b5b:0x5f7054,.65,.35),radius=nuke?.10:.068,length=nuke?.64:.86;
  tube(radius,length,body,0,.08,-.25,radius);tube(radius*.86,length+.013,dark,0,.08,-.25);
  for(const z of [-.25-length/2,-.25+length/2]){add(new T.TorusGeometry(radius,.009,6,20),steel,0,.08,z);}
  const rear=box(.047,.115,.065,rubber,0,-.028,.04);rear.rotation.x=-.17;box(.043,.062,.048,rubber,0,-.018,-.28);
  box(.037,.035,.12,dark,.07,.17,-.06);tube(.017,.13,steel,.07,.17,-.06);
  box(.20,.022,.24,rubber,0,-.022,.18);box(.022,.044,.32,steel,-radius-.017,.04,-.30);
  for(let j=0;j<4;j++)box(.012,.038,.08,dark,radius+.004,.06,-.45+j*.06);
  if(nuke){const chamber=add(new T.SphereGeometry(.092,16,10),material(0xbcc2a5,.45,.5),0,.08,-.32);chamber.scale.z=1.5;for(const x of [-.11,.11])box(.016,.15,.40,steel,x,.075,-.30);}
 }else{
  const color=EXTRA_WEAPONS[id].color,glow=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.8,roughness:.18,metalness:.25});
  const gem=add(new T.IcosahedronGeometry(.033,1),glow,0,.025,-.135);gem.scale.set(.7,1.3,1);
  add(new T.TorusGeometry(.045,.0035,6,24),steel,0,.023,-.133);
  const ring=add(new T.TorusGeometry(.057,.0025,6,24),glow,0,.023,-.133);ring.rotation.y=.8;
  box(.026,.027,.095,dark,0,-.012,-.044);
 }
 return true;
}

/** Silhouette and machining detail. Static surfaces are merged by material afterwards. */
export function refineEquipmentModel(item){
 const {id,group}=item;if(group.userData.h5EquipmentModel)return;group.userData.h5EquipmentModel=true;
 const gun=['pistol','laser','rifle','sniper','shotgun','uzi','musket'].includes(id),melee=['sword','axe','mace'].includes(id);
 const steel=material(0x697076,.30,.82),black=material(0x23272b,.65,.24),wood=material(0x72513c,.8,0),rubber=material(0x242023,.94,0);
 const add=(g,m,x,y,z)=>{const a=new T.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;group.add(a);return a;};
 const box=(w,h,d,m,x,y,z)=>add(new T.BoxGeometry(w,h,d),m,x,y,z);
 if(gun){
  const long=['rifle','sniper','shotgun','musket'].includes(id);
  if(id!=='musket'){
   // Trigger, recessed ejection port, safety, bolt and receiver screws remain readable nearby.
   box(.004,.020,.048,black,.028,.037,-.072);box(.006,.014,.035,steel,.032,.036,-.057);
   const bolt=add(new T.CylinderGeometry(.005,.005,.040,8),steel,.045,.045,-.013);bolt.rotation.z=Math.PI/2;
   add(new T.SphereGeometry(.009,8,6),black,.065,.045,-.013);
   box(.006,.025,.008,steel,0,-.018,-.042);add(new T.TorusGeometry(.026,.003,6,16),black,0,-.025,-.039).rotation.y=Math.PI/2;
   for(const z of [-.105,-.02,.035]){const screw=add(new T.CylinderGeometry(.0035,.0035,.057,8),steel,0,.024,z);screw.rotation.z=Math.PI/2;}
   const n=long?11:6;for(let j=0;j<n;j++)box(long?.052:.058,.004,.005,black,0,long?.081:.073,-.21+j*.014);
   for(let j=0;j<5;j++)box(.041,.003,.031,rubber,0,-.047-j*.009,.019);
  }
  if(id==='rifle'||id==='uzi'){
   add(stockGeometry([[-.08,-.015],[-.08,.055],[-.30,.068],[-.34,.006],[-.31,-.048]],.044),black,0,0,.075);
   box(.056,.107,.016,rubber,0,.010,.416);
  }
  if(id==='shotgun')for(let j=0;j<8;j++){const m=add(new T.TorusGeometry(.022,.002,4,12),black,0,.012,-.33+j*.014);}
  if(id==='sniper'){
   for(const x of [-.028,.028]){const leg=add(new T.CylinderGeometry(.005,.007,.22,8),black,x,-.066,-.67);leg.rotation.z=x>0?-.30:.30;}
   box(.051,.072,.012,rubber,0,.004,.32);
  }
 }else if(melee){
  if(id==='sword'){
   // A double bevel with a longitudinal ridge, instead of a rectangular bar.
   const old=group.children.find(m=>m.geometry?.type==='BoxGeometry'&&m.geometry.parameters.depth===.70);if(old){old.removeFromParent();old.geometry.dispose();}
   const p=[],idx=[],zs=[-.15,-.80,-.955],widths=[.025,.021,0];for(let j=0;j<3;j++)for(const [x,y]of [[-1,0],[0,.004],[1,0],[0,-.004]])p.push(x*widths[j],y,zs[j]);
   for(let j=0;j<2;j++)for(let k=0;k<4;k++){const a=j*4+k,b=j*4+(k+1)%4;idx.push(a,b,a+4,b,b+4,a+4);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();add(g,steel,0,0,0);
   add(new T.SphereGeometry(.025,10,6),steel,0,0,.073);
  }
  for(let j=0;j<9;j++){const m=add(new T.TorusGeometry(.023,.0023,4,10),rubber,0,-.014,-.11+j*.019);}
 }
 // PhysicalMaterial transmission needs another scene render. These tiny optics use coated glass.
 group.traverse(m=>{if(m.material?.isMeshPhysicalMaterial&&m.material.transmission>0){const old=m.material;m.material=new T.MeshStandardMaterial({color:old.color,roughness:.09,metalness:.25,transparent:true,opacity:.45});}});
 const buckets=new Map(),owned=new Set();group.updateMatrixWorld(true);
 for(const m of [...group.children]){
  if(!m.isMesh||!m.material?.isMeshStandardMaterial||m.material.transparent||m.userData.scopeEye||m.userData.scopeLens)continue;
  const mat=m.material,key=[mat.color.getHex(),mat.roughness,mat.metalness,mat.emissive.getHex(),mat.emissiveIntensity].join('/');
  if(!buckets.has(key))buckets.set(key,{mat,geos:[]});const b=buckets.get(key),g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);
  for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
  if(!g.attributes.uv)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));b.geos.push(g);owned.add(m.geometry);m.removeFromParent();
 }
 for(const b of buckets.values()){const g=mergeGeometries(b.geos);b.geos.forEach(g=>g.dispose());const m=new T.Mesh(g,b.mat);m.name=item.data.name+' · solid';m.castShadow=true;group.add(m);}
 owned.forEach(g=>g.dispose());group.traverse(m=>m.userData.weapon=id);
 group.userData.h5ModelStats={draws:group.children.filter(m=>m.isMesh).length,triangles:group.children.reduce((n,m)=>n+(m.geometry?(m.geometry.index?.count||m.geometry.attributes.position.count)/3:0),0)};
}
