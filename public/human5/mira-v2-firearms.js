import * as T from 'three';

export const FIREARMS={
 rifle:{name:'Assault rifle',mass:3.4,reach:.78,kind:'bullet',category:'firearm',fireRate:.09,energy:38,spread:.014,pellets:1,stagger:.5,knockback:.05,magSize:30,reload:2.1},
 sniper:{name:'Sniper rifle',mass:5.2,reach:1.18,kind:'bullet',category:'firearm',fireRate:.78,energy:78,spread:.0012,pellets:1,scope:true,stagger:1.8,knockback:1.05,magSize:5,reload:2.6},
 shotgun:{name:'Shotgun',mass:3.6,reach:.72,kind:'bullet',category:'firearm',fireRate:.52,energy:16,spread:.085,pellets:8,stagger:1.35,knockback:.28,magSize:6,reload:2.4},
 uzi:{name:'Uzi',mass:2.15,reach:.38,kind:'bullet',category:'firearm',fireRate:.05,energy:16,spread:.038,pellets:1,stagger:.85,knockback:.07,magSize:25,reload:1.8}
};

const steel=()=>new T.MeshStandardMaterial({color:0x6d7378,roughness:.28,metalness:.82});
const black=()=>new T.MeshStandardMaterial({color:0x1a1c1e,roughness:.55,metalness:.35});
const poly=()=>new T.MeshStandardMaterial({color:0x2a2c2f,roughness:.7,metalness:.12});
const wood=()=>new T.MeshStandardMaterial({color:0x6a4a32,roughness:.86,metalness:0});
const glass=()=>new T.MeshPhysicalMaterial({color:0x8eb4c4,transparent:true,opacity:.28,roughness:.08,metalness:.15,transmission:.55,thickness:.02});

export function buildFirearm(id,add){
 if(id==='rifle')return buildRifle(add);
 if(id==='sniper')return buildSniper(add);
 if(id==='shotgun')return buildShotgun(add);
 if(id==='uzi')return buildUzi(add);
}

function buildRifle(add){
 add(new T.BoxGeometry(.04,.07,.13),poly(),0,-.03,.02);
 add(new T.BoxGeometry(.046,.07,.28),black(),0,.03,-.06);
 add(new T.BoxGeometry(.05,.018,.26),steel(),0,.07,-.08);
 const mag=add(new T.BoxGeometry(.028,.16,.07),poly(),0,-.07,-.04);mag.rotation.x=.12;
 const barrel=add(new T.CylinderGeometry(.011,.012,.42,10),steel(),0,.028,-.42);barrel.rotation.x=Math.PI/2;
 const hg=add(new T.CylinderGeometry(.02,.022,.18,8),poly(),0,.028,-.28);hg.rotation.x=Math.PI/2;
 add(new T.BoxGeometry(.006,.028,.04),black(),0,.09,-.16);
 add(new T.BoxGeometry(.05,.012,.09),poly(),0,.01,.12);
 add(new T.BoxGeometry(.018,.012,.018),steel(),0,.086,-.58);
 add(new T.BoxGeometry(.01,.028,.006),steel(),0,.1,-.58);
}

function buildSniper(add){
 add(new T.BoxGeometry(.038,.072,.14),wood(),0,-.032,.02);
 add(new T.BoxGeometry(.048,.055,.36),black(),0,.028,-.08);
 add(new T.BoxGeometry(.052,.02,.34),wood(),0,-.012,-.08);
 const mag=add(new T.BoxGeometry(.026,.11,.08),poly(),0,-.06,-.02);mag.rotation.x=.08;
 const barrel=add(new T.CylinderGeometry(.01,.011,.72,10),steel(),0,.03,-.62);barrel.rotation.x=Math.PI/2;
 const brake=add(new T.CylinderGeometry(.016,.014,.06,8),steel(),0,.03,-.98);brake.rotation.x=Math.PI/2;
 const stock=add(new T.BoxGeometry(.04,.09,.22),wood(),0,.01,.2);stock.rotation.x=-.08;
 const tube=add(new T.CylinderGeometry(.022,.024,.28,14),black(),0,.112,-.16);tube.rotation.x=Math.PI/2;
 add(new T.CylinderGeometry(.028,.028,.035,14),steel(),0,.112,-.02);
 add(new T.CylinderGeometry(.03,.03,.04,14),steel(),0,.112,-.30);
 const bell=add(new T.CylinderGeometry(.034,.028,.03,14),steel(),0,.112,-.33);bell.rotation.x=Math.PI/2;
 const eye=add(new T.CylinderGeometry(.02,.022,.04,12),black(),0,.112,.04);eye.rotation.x=Math.PI/2;
 const turret=add(new T.CylinderGeometry(.012,.012,.028,10),steel(),0,.138,-.16);
 const wind=add(new T.CylinderGeometry(.012,.012,.028,10),steel(),.028,.112,-.16);wind.rotation.z=Math.PI/2;
 const glassMat=new T.MeshPhysicalMaterial({color:0x6a90a8,roughness:.06,metalness:.12,transparent:true,opacity:.42,transmission:.55,thickness:.02,ior:1.52});
 const obj=add(new T.CircleGeometry(.026,20),glassMat,0,.112,-.348);obj.rotation.x=Math.PI;obj.userData.scopeLens=true;obj.userData.scopeZoom=4.5;
 const oc=add(new T.CircleGeometry(.014,16),glassMat,0,.112,.06);oc.rotation.x=0;
 add(new T.BoxGeometry(.008,.04,.05),black(),0,.148,-.16);
}

function buildShotgun(add){
 add(new T.BoxGeometry(.04,.075,.15),wood(),0,-.034,.02);
 add(new T.BoxGeometry(.048,.06,.3),black(),0,.02,-.08);
 add(new T.BoxGeometry(.05,.022,.28),wood(),0,-.018,-.08);
 const barrel=add(new T.CylinderGeometry(.014,.015,.46,10),steel(),0,.032,-.42);barrel.rotation.x=Math.PI/2;
 const pump=add(new T.CylinderGeometry(.02,.022,.12,8),wood(),0,.012,-.28);pump.rotation.x=Math.PI/2;
 const stock=add(new T.BoxGeometry(.042,.09,.24),wood(),0,.0,.2);stock.rotation.x=-.1;
 add(new T.BoxGeometry(.02,.018,.05),black(),0,.055,-.18);
 add(new T.BoxGeometry(.008,.022,.01),steel(),0,.07,-.62);
}

function buildUzi(add){
 add(new T.BoxGeometry(.042,.12,.055),poly(),0,-.05,.01);
 add(new T.BoxGeometry(.05,.07,.18),black(),0,.03,-.04);
 const mag=add(new T.BoxGeometry(.022,.16,.04),steel(),0,-.12,.01);
 const barrel=add(new T.CylinderGeometry(.01,.011,.16,8),steel(),0,.03,-.2);barrel.rotation.x=Math.PI/2;
 const shroud=add(new T.BoxGeometry(.036,.036,.1),poly(),0,.03,-.16);
 add(new T.BoxGeometry(.06,.012,.08),poly(),0,.072,-.02);
 add(new T.BoxGeometry(.008,.02,.04),steel(),0,.085,-.06);
 add(new T.BoxGeometry(.03,.012,.12),poly(),0,.01,.12);
}

export function firearmSpread(dir,spread){
 const n=dir.clone().normalize();
 const t=new T.Vector3();
 if(Math.abs(n.y)<.92)t.set(0,1,0).cross(n).normalize();
 else t.set(1,0,0).cross(n).normalize();
 const b=new T.Vector3().crossVectors(n,t);
 const a=Math.random()*Math.PI*2,r=Math.random()*spread;
 return n.clone().addScaledVector(t,Math.cos(a)*r).addScaledVector(b,Math.sin(a)*r).normalize();
}
