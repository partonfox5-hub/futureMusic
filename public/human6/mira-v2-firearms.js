import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export const FIREARMS={
 rifle:{name:'Assault rifle',mass:3.4,reach:.78,kind:'bullet',category:'firearm',fireRate:.09,energy:38,spread:.014,pellets:1,stagger:.5,knockback:.05,magSize:30,reload:2.1,auto:true,recoil:.06},
 sniper:{name:'Sniper rifle',mass:5.2,reach:1.18,kind:'bullet',category:'firearm',fireRate:.78,energy:78,spread:.0012,pellets:1,scope:true,stagger:1.8,knockback:1.05,magSize:5,reload:2.6,recoil:.12},
 shotgun:{name:'Shotgun',mass:3.6,reach:.72,kind:'bullet',category:'firearm',fireRate:.52,energy:16,spread:.085,pellets:8,stagger:1.35,knockback:.28,magSize:6,reload:2.4,recoil:.12},
 uzi:{name:'Uzi',mass:2.15,reach:.38,kind:'bullet',category:'firearm',fireRate:.05,energy:16,spread:.038,pellets:1,stagger:.85,knockback:.07,magSize:25,reload:1.8,auto:true,recoil:.05}
};

const steel=()=>new T.MeshStandardMaterial({color:0x6d7378,roughness:.28,metalness:.82});
const black=()=>new T.MeshStandardMaterial({color:0x1a1c1e,roughness:.55,metalness:.35});
const poly=()=>new T.MeshStandardMaterial({color:0x2a2c2f,roughness:.7,metalness:.12});
const wood=()=>new T.MeshStandardMaterial({color:0x6a4a32,roughness:.86,metalness:0});
const glass=()=>new T.MeshPhysicalMaterial({color:0x8eb4c4,transparent:true,opacity:.28,roughness:.08,metalness:.15,transmission:.55,thickness:.02});
const rb=(sx,sy,sz,r=.008)=>new RoundedBoxGeometry(sx,sy,sz,2,Math.min(r,Math.min(sx,sy,sz)*.38));
const pipe=(r0,r1,len,n=14)=>new T.CylinderGeometry(r0,r1,len,n);

export function buildFirearm(id,add){
 if(id==='rifle')return buildRifle(add);
 if(id==='sniper')return buildSniper(add);
 if(id==='shotgun')return buildShotgun(add);
 if(id==='uzi')return buildUzi(add);
}

function buildRifle(add){
 const grip=add(rb(.038,.078,.12,.01),poly(),0,-.032,.02);grip.rotation.x=.2;
 add(rb(.048,.068,.30,.01),black(),0,.028,-.07);
 add(rb(.052,.016,.28,.005),steel(),0,.068,-.09);
 const mag=add(rb(.026,.15,.062,.008),poly(),0,-.07,-.04);mag.rotation.x=.14;
 const barrel=add(pipe(.010,.011,.44),steel(),0,.028,-.44);barrel.rotation.x=Math.PI/2;
 const hg=add(pipe(.019,.022,.20,12),poly(),0,.028,-.28);hg.rotation.x=Math.PI/2;
 const muzzle=add(pipe(.013,.011,.036,12),steel(),0,.028,-.66);muzzle.rotation.x=Math.PI/2;
 add(rb(.008,.022,.14,.004),black(),0,.08,-.16);
 add(rb(.048,.014,.10,.006),poly(),0,.008,.14);
 const guard=add(new T.TorusGeometry(.02,.004,8,14,Math.PI),steel(),0,-.01,-.018);guard.rotation.x=Math.PI/2;
 add(rb(.016,.012,.016,.004),steel(),0,.086,-.58);
 add(rb(.008,.026,.006,.003),steel(),0,.1,-.58);
}

function buildSniper(add){
 const grip=add(rb(.036,.07,.13,.01),wood(),0,-.032,.02);grip.rotation.x=.12;
 add(rb(.048,.052,.36,.01),black(),0,.028,-.08);
 add(rb(.05,.02,.34,.008),wood(),0,-.012,-.08);
 const mag=add(rb(.024,.11,.07,.008),poly(),0,-.06,-.02);mag.rotation.x=.08;
 const barrel=add(pipe(.01,.011,.72,16),steel(),0,.03,-.62);barrel.rotation.x=Math.PI/2;
 const brake=add(pipe(.016,.013,.06,12),steel(),0,.03,-.98);brake.rotation.x=Math.PI/2;
 const stock=add(rb(.04,.088,.22,.012),wood(),0,.01,.2);stock.rotation.x=-.08;
 const tube=add(pipe(.022,.024,.28,16),black(),0,.112,-.16);tube.rotation.x=Math.PI/2;
 add(new T.TorusGeometry(.028,.006,8,16),steel(),0,.112,-.02);
 add(new T.TorusGeometry(.03,.007,8,16),steel(),0,.112,-.30);
 const bell=add(pipe(.034,.028,.03,16),steel(),0,.112,-.33);bell.rotation.x=Math.PI/2;
 const eye=add(pipe(.02,.022,.04,14),black(),0,.112,.04);eye.rotation.x=Math.PI/2;
 const turret=add(pipe(.012,.012,.028,12),steel(),0,.138,-.16);
 const wind=add(pipe(.012,.012,.028,12),steel(),.028,.112,-.16);wind.rotation.z=Math.PI/2;
 const glassMat=new T.MeshPhysicalMaterial({color:0x6a90a8,roughness:.06,metalness:.12,transparent:true,opacity:.42,transmission:.55,thickness:.02,ior:1.52});
 const obj=add(new T.CircleGeometry(.026,24),glassMat,0,.112,-.348);obj.rotation.x=Math.PI;obj.userData.scopeLens=true;obj.userData.scopeZoom=6;
 const oc=add(new T.CircleGeometry(.014,20),glassMat,0,.112,.06);oc.rotation.x=0;oc.userData.scopeEye=true;
 add(rb(.01,.036,.05,.004),black(),0,.148,-.16);
}

function buildShotgun(add){
 const grip=add(rb(.038,.072,.14,.012),wood(),0,-.034,.02);grip.rotation.x=.14;
 add(rb(.046,.056,.30,.01),black(),0,.02,-.08);
 add(rb(.05,.02,.28,.008),wood(),0,-.018,-.08);
 const barrel=add(pipe(.014,.015,.46,16),steel(),0,.032,-.42);barrel.rotation.x=Math.PI/2;
 const pump=add(pipe(.02,.022,.12,12),wood(),0,.012,-.28);pump.rotation.x=Math.PI/2;
 const stock=add(rb(.042,.088,.24,.014),wood(),0,.0,.2);stock.rotation.x=-.1;
 add(rb(.02,.016,.05,.006),black(),0,.055,-.18);
 const bead=add(new T.SphereGeometry(.006,10,8),steel(),0,.05,-.64);
 bead.rotation.x=0;
 const guard=add(new T.TorusGeometry(.018,.004,8,12,Math.PI),steel(),0,-.012,-.02);guard.rotation.x=Math.PI/2;
}

function buildUzi(add){
 const grip=add(rb(.04,.12,.055,.01),poly(),0,-.05,.01);
 add(rb(.05,.068,.18,.01),black(),0,.03,-.04);
 const mag=add(rb(.022,.16,.04,.006),steel(),0,-.12,.01);
 const barrel=add(pipe(.01,.011,.16,14),steel(),0,.03,-.2);barrel.rotation.x=Math.PI/2;
 add(rb(.036,.036,.1,.008),poly(),0,.03,-.16);
 add(rb(.06,.012,.08,.005),poly(),0,.072,-.02);
 add(rb(.008,.02,.04,.003),steel(),0,.085,-.06);
 add(rb(.03,.012,.12,.006),poly(),0,.01,.12);
 const muzzle=add(pipe(.012,.01,.03,12),steel(),0,.03,-.29);muzzle.rotation.x=Math.PI/2;
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
