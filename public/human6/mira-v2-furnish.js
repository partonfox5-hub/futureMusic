import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

function rb(sx,sy,sz,r=.02){return new RoundedBoxGeometry(sx,sy,sz,2,Math.min(r,Math.min(sx,sy,sz)*.28));}
function part(w,geom,mat,x,y,z,kind='wood'){
 const m=w.mesh(geom,mat,x,y,z);
 w.fractures.register(m,kind);
 w.pickables.push(m);
 return m;
}
function chrome(w){const m=w.mat(0xc5ced4,.22);m.metalness=.84;return m;}
function steel(w,c=0x9aa3a8){const m=w.mat(c,.32);m.metalness=.62;return m;}

export function detailToilet(w,x,z){
 const por=w.mat(0xe8eae4,.46),inner=w.mat(0xc5d0ce,.38),ch=chrome(w);
 part(w,rb(.34,.07,.38,.04),por,x,.055,z,'stone');
 part(w,rb(.40,.22,.44,.07),por,x,.20,z+.03,'stone');
 part(w,rb(.24,.035,.24,.04),inner,x,.29,z+.05,'stone');
 part(w,rb(.42,.03,.36,.03),por,x,.345,z+.03,'stone');
 part(w,rb(.38,.34,.16,.03),por,x,.49,z-.20,'stone');
 part(w,rb(.40,.03,.18,.02),por,x,.67,z-.20,'stone');
 part(w,new T.BoxGeometry(.05,.016,.014),ch,x-.15,.50,z-.12,'metal');
}

export function detailFridge(w,x,z){
 const body=w.mat(0xe2e0d6,.4);body.metalness=.2;
 const dark=w.mat(0x2a2e32,.48);dark.metalness=.28;
 const ch=chrome(w);
 part(w,rb(.86,1.90,.72,.025),body,x,.98,z,'metal');
 part(w,rb(.05,.56,.68,.01),body,x-.44,1.56,z,'metal');
 part(w,rb(.05,1.20,.68,.01),body,x-.44,.66,z,'metal');
 part(w,new T.BoxGeometry(.018,1.84,.012),dark,x-.445,1.02,z,'metal');
 part(w,new T.BoxGeometry(.03,.48,.018),ch,x-.48,1.54,z+.26,'metal');
 part(w,new T.BoxGeometry(.03,1.02,.018),ch,x-.48,.68,z+.26,'metal');
 part(w,rb(.86,.07,.72,.01),dark,x,.055,z,'metal');
 part(w,rb(.10,.26,.02,.006),dark,x-.47,.92,z-.16,'metal');
}

export function detailMicrowave(w,x,z){
 const body=w.mat(0xc8c9c5,.4);body.metalness=.35;
 const dark=w.mat(0x1c1e20,.35);dark.metalness=.2;
 const glass=w.mat(0x6a7c82,.18);glass.metalness=.15;glass.transparent=true;glass.opacity=.42;
 const ch=chrome(w);
 const y=1.04;
 part(w,rb(.44,.28,.38,.015),body,x,y,z,'metal');
 part(w,rb(.30,.18,.02,.006),dark,x-.02,y-.01,z-.19,'metal');
 part(w,new T.BoxGeometry(.26,.14,.008),glass,x-.02,y-.01,z-.20,'metal');
 part(w,rb(.10,.22,.02,.004),body,x+.16,y,z-.19,'metal');
 for(let i=0;i<6;i++)part(w,new T.BoxGeometry(.018,.014,.006),dark,x+.16,y+.08-(i%3)*.04,z-.20+(i<3?0:.012),'metal');
 part(w,new T.BoxGeometry(.012,.16,.012),ch,x-.20,y,z-.20,'metal');
}

export function detailSink(w,x,z){
 const por=w.mat(0xe2e5de,.42),cab=w.mat(0x5e6a62,.7),ch=chrome(w),dark=w.mat(0x3a403c,.5);
 const cabinet=part(w,rb(.68,.55,.58,.02),cab,x,.285,z,'wood');
 cabinet.userData.h5BasinSpec={innerBox:{min:[-.25,.545,-.215],max:[.25,.72,.215]},spout:[0,.88,0],control:[.14,.729,-.265]};
 // Real opening: the bowl has a floor and four walls, not a solid filled block.
 part(w,rb(.54,.025,.47,.009),por,x,.5325,z,'stone');
 for(const sign of [-1,1]){
  part(w,rb(.025,.175,.47,.008),por,x+sign*.2625,.6325,z,'stone');
  part(w,rb(.50,.175,.025,.008),por,x,.6325,z+sign*.2275,'stone');
  part(w,rb(.10,.035,.64,.008),por,x+sign*.31,.7025,z,'stone');
  part(w,rb(.52,.035,.08,.008),por,x,.7025,z+sign*.28,'stone');
 }
 part(w,new T.CylinderGeometry(.032,.032,.007,12),dark,x,.551,z,'metal');
 const pipe=new T.CatmullRomCurve3([new T.Vector3(0,.718,-.265),new T.Vector3(0,.95,-.265),new T.Vector3(0,.99,-.22),new T.Vector3(0,.99,-.045),new T.Vector3(0,.96,0)]);
 part(w,new T.TubeGeometry(pipe,18,.014,8,false),ch,x,0,z,'metal');
 part(w,new T.CylinderGeometry(.025,.025,.018,10),ch,x,.729,z-.265,'metal');
}

export function detailBathtub(w,x,z){
 const por=w.mat(0xe4e6df,.4),inner=w.mat(0xc5d2d4,.32),ch=chrome(w);
 part(w,rb(1.22,.42,1.28,.08),por,x,.24,z,'stone');
 part(w,rb(1.02,.08,1.08,.06),inner,x,.40,z,'stone');
 part(w,rb(1.26,.06,1.32,.04),por,x,.46,z,'stone');
 part(w,new T.CylinderGeometry(.016,.016,.12,8),ch,x,.58,z-.52,'metal');
 const spout=part(w,new T.CylinderGeometry(.012,.012,.12,8),ch,x,.62,z-.46,'metal');spout.rotation.x=1.1;
}

export function detailLamp(w,x,z){
 const metal=steel(w,0x8e969c),shade=w.mat(0xddd3b8,.78),base=steel(w,0x5c6166);
 part(w,new T.CylinderGeometry(.11,.14,.04,12),base,x,.04,z,'metal');
 part(w,new T.CylinderGeometry(.016,.016,1.28,8),metal,x,.70,z,'metal');
 const hat=part(w,new T.CylinderGeometry(.16,.22,.18,10,1,true),shade,x,1.42,z,'wood');
 hat.material.side=T.DoubleSide;
 part(w,new T.SphereGeometry(.035,8,6),w.mat(0xf2e6c4,.35),x,1.34,z,'wood');
}

export function detailTvStand(w,x,z){
 const wood=w.mat(0x3e3a36,.72),dark=w.mat(0x1a1c1e,.4);dark.metalness=.25;
 part(w,rb(1.55,.10,.42,.015),wood,x,.12,z,'wood');
 part(w,rb(1.50,.08,.38,.01),wood,x,.42,z,'wood');
 for(const sx of [-.72,.72])part(w,rb(.06,.36,.40,.01),wood,x+sx,.28,z,'wood');
 part(w,rb(1.22,.04,.08,.006),dark,x,.78,z,'wood');
 part(w,rb(1.22,.06,.06,.006),dark,x,1.44,z+.01,'metal');
 part(w,rb(.06,.62,.06,.006),dark,x-.58,1.14,z+.01,'metal');
 part(w,rb(.06,.62,.06,.006),dark,x+.58,1.14,z+.01,'metal');
 w.fractures.panel(new T.Vector3(x,1.14,z-.02),new T.Vector3(1.08,.58,.016),'glass',()=>false,{cell:.2,skipObstacle:true});
}

export function detailBed(w,x,z){
 const wood=w.mat(0x684d3c,.78),dark=w.mat(0x4a362c,.8);
 part(w,rb(1.62,.40,2.00,.02),wood,x,.32,z,'wood');
 part(w,rb(1.64,.78,.10,.02),wood,x,.62,z-.98,'wood');
 part(w,rb(1.58,.16,.08,.015),wood,x,.28,z+.96,'wood');
 for(const sx of [-.76,.76])for(const sz of [-.92,.92])part(w,rb(.07,.24,.07,.01),dark,x+sx,.12,z+sz,'wood');
}

export function detailNightstand(w,x,z){
 const wood=w.mat(0x826144,.74),dark=w.mat(0x6a4e36,.7),ch=chrome(w);
 part(w,rb(.55,.66,.48,.02),wood,x,.34,z,'wood');
 part(w,rb(.50,.03,.46,.008),wood,x,.68,z,'wood');
 part(w,rb(.48,.16,.02,.006),dark,x,.50,z+.24,'wood');
 part(w,rb(.48,.16,.02,.006),dark,x,.30,z+.24,'wood');
 part(w,new T.CylinderGeometry(.012,.012,.02,8),ch,x,.50,z+.26,'metal');
 part(w,new T.CylinderGeometry(.012,.012,.02,8),ch,x,.30,z+.26,'metal');
}

export function detailDresser(w,x,z){
 const wood=w.mat(0x7a5c44,.74),dark=w.mat(0x624a36,.7),ch=chrome(w);
 part(w,rb(.95,.84,.42,.02),wood,x,.44,z,'wood');
 for(let i=0;i<3;i++){
  const y=.22+i*.24;
  part(w,rb(.86,.18,.02,.006),dark,x,y,z+.21,'wood');
  part(w,new T.CylinderGeometry(.012,.012,.018,8),ch,x-.16,y,z+.23,'metal');
  part(w,new T.CylinderGeometry(.012,.012,.018,8),ch,x+.16,y,z+.23,'metal');
 }
}

export function detailBookshelf(w,x,z){
 const wood=w.mat(0x6d5340,.76),dark=w.mat(0x5a4434,.74);
 const colors=[0x7a3b3b,0x3b547a,0x6a5a38,0x2f5a48,0x5a3d62,0x8a6238,0x3a3f4a,0x6e4a3a];
 part(w,rb(.28,1.72,.92,.015),wood,x,.90,z,'wood');
 for(const y of [.22,.58,.94,1.30,1.64])part(w,rb(.26,.03,.88,.006),dark,x,y,z,'wood');
 for(let row=0;row<4;row++){
  let ox=-.32;
  for(let i=0;i<5;i++){
   const t=.04+((row*5+i)%4)*.01,h=.15+((i+row)%3)*.035;
   part(w,new T.BoxGeometry(.16,h,t),w.mat(colors[(i+row*3)%colors.length],.82),x+.02,.24+row*.36+h/2,z+ox,'wood');
   ox+=t+.018;
  }
 }
}

export function detailDesk(w,x,z){
 const wood=w.mat(0x70543c,.74),dark=w.mat(0x4a3930,.78);
 part(w,rb(1.08,.06,.58,.015),wood,x,.72,z,'wood');
 for(const sx of [-.46,.46])for(const sz of [-.22,.22])part(w,rb(.06,.68,.06,.01),dark,x+sx,.36,z+sz,'wood');
 part(w,rb(.36,.22,.50,.012),wood,x+.32,.56,z,'wood');
}

export function detailBarStool(w,x,z){
 const wood=w.mat(0x5a4638,.72),dark=w.mat(0x4a3930,.7),metal=steel(w);
 part(w,rb(.30,.05,.30,.03),wood,x,.46,z,'wood');
 part(w,new T.CylinderGeometry(.028,.04,.44,8),dark,x,.22,z,'wood');
 const ring=part(w,new T.TorusGeometry(.13,.012,6,16),metal,x,.18,z,'metal');ring.rotation.x=Math.PI/2;
 part(w,new T.CylinderGeometry(.08,.09,.03,10),dark,x,.03,z,'wood');
}

export function detailCabinet(w,x,z){
 const wood=w.mat(0x5e6a62,.7),dark=w.mat(0x4a5650,.68),ch=chrome(w);
 part(w,rb(.52,.88,.70,.02),wood,x,.46,z,'wood');
 part(w,rb(.02,.72,.30,.006),dark,x-.26,.48,z-.12,'wood');
 part(w,rb(.02,.72,.30,.006),dark,x-.26,.48,z+.12,'wood');
 part(w,new T.CylinderGeometry(.01,.01,.02,8),ch,x-.27,.48,z-.02,'metal');
 part(w,new T.CylinderGeometry(.01,.01,.02,8),ch,x-.27,.48,z+.02,'metal');
}

export function detailMirror(w,x,z){
 const wood=w.mat(0x3e3830,.7),glass=w.mat(0x9eb8b6,.12);glass.metalness=.35;
 part(w,rb(.58,.68,.05,.012),wood,x,1.45,z,'wood');
 part(w,new T.BoxGeometry(.48,.58,.016),glass,x,1.45,z+.02,'glass');
}

export function detailCounter(w,x,z){
 const body=w.mat(0x58695e,.72),top=w.mat(0xd5d2c6,.55),dark=w.mat(0x46544c,.68),ch=chrome(w);
 part(w,rb(.78,.82,2.70,.02),body,x,.43,z,'wood');
 part(w,rb(.88,.07,2.80,.02),top,x,.88,z,'stone');
 for(let i=0;i<3;i++){
  const zz=z-.7+i*.7;
  part(w,rb(.02,.50,.62,.008),dark,x-.39,.40,zz,'wood');
  part(w,new T.CylinderGeometry(.01,.01,.02,8),ch,x-.40,.42,zz,'metal');
 }
}

export function detailCoffee(w,x,z){
 const wood=w.mat(0x6a4e3a,.74),dark=w.mat(0x4a362c,.78);
 part(w,rb(.92,.08,.58,.02),wood,x,.32,z,'wood');
 for(const sx of [-.38,.38])for(const sz of [-.22,.22])part(w,rb(.05,.28,.05,.01),dark,x+sx,.14,z+sz,'wood');
}

export function detailTable(w,x,z){
 const wood=w.mat(0x72503b,.72),dark=w.mat(0x4a3930,.78);
 part(w,rb(1.70,.08,.85,.018),wood,x,.68,z,'wood');
 for(const sx of [-.68,.68])for(const sz of [-.28,.28])part(w,rb(.07,.60,.07,.012),dark,x+sx,.32,z+sz,'wood');
}
