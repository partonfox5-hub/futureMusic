import * as T from 'three';
import {makeSurfaceMap,wallMaterial} from './mira-v2-walls.js?v=19.1.0';
import {placeStairs,placeFurniture} from './mira-v2-furniture.js?v=19.1.0';
const STORY=3.05,CELL=.6;
export const CASTLE={x:0,z:-42,w:16.8,d:16.8,gateZ:-33.6};
export const PATH={x:0,z0:-8.15,z1:-33.35,w:3.4};

export function inCastleClearing(x,z){
 if(Math.abs(x-CASTLE.x)<CASTLE.w/2+2.4&&Math.abs(z-CASTLE.z)<CASTLE.d/2+2.4)return true;
 if(Math.abs(x-PATH.x)<PATH.w/2+.5&&z<=PATH.z0+.2&&z>=PATH.z1-.2)return true;
 return false;
}

const doorHole=(axis,c,w=1.14,head=2.14)=>{
 const r=w/2+CELL*.55;
 return p=>p.y<head&&p.y>.04&&(axis==='x'?Math.abs(p.x-c):Math.abs(p.z-c))<r;
};
const slit=(axis,c,w=.28,sill=1.15,head=2.35)=>{
 const r=w/2+CELL*.2;
 return p=>p.y>sill&&p.y<head&&(axis==='x'?Math.abs(p.x-c):Math.abs(p.z-c))<r;
};
const merlon=(axis,y0=4.55,pitch=1.32,gap=.62)=>p=>{
 if(p.y<y0)return false;
 const t=axis==='x'?p.x:p.z;
 const u=((t%pitch)+pitch)%pitch;
 return u>pitch-gap;
};

export function buildCastle(w){
 const v=(x,y,z)=>new T.Vector3(x,y,z);
 const maps={wood:makeSurfaceMap('Wood'),stone:makeSurfaceMap('Stone'),brick:makeSurfaceMap('Brick'),castle:makeSurfaceMap('Castle'),shingle:makeSurfaceMap('Shingle')};
 const panel=(x,y,z,sx,sy,sz,hole,kind='stone',map=maps.castle)=>w.fractures.panel(v(x,y,z),v(sx,sy,sz),kind,hole||(()=>false),{map});
 const slab=(x,z,ww,dd,y,thick,map,kind='stone')=>{
  const mesh=w.fractures.panel(v(x,y+thick/2,z),v(ww,thick,dd),kind,()=>false,{map,skipObstacle:true,cell:Math.max(.7,Math.min(ww,dd)>10?1.05:.7)});
  w.floors??=[];w.floors.push({x,z,w:ww,d:dd,y,h:thick});
  return mesh;
 };
 const H=5.05,hy=H/2,TH=7.35,thy=TH/2;
 const cx=CASTLE.x,cz=CASTLE.z,hw=8.4,hd=8.4;
 const zGate=cz+hd,zBack=cz-hd,xL=cx-hw,xR=cx+hw;

 slab(cx,cz,hw*2-.2,hd*2-.2,.02,.07,maps.castle,'stone');
 buildPath(w,maps);

 panel(cx,hy,zGate,hw*2-.1,H,.22,p=>doorHole('x',cx,2.55,3.15)(p)||merlon('x')(p), 'stone', maps.castle);
 panel(cx,hy,zBack,hw*2-.1,H,.22,p=>slit('x',cx-3.1)(p)||slit('x',cx+3.1)(p)||merlon('x')(p), 'stone', maps.castle);
 panel(xL,hy,cz,.22,H,hd*2-.1,p=>slit('z',cz-2.2)(p)||slit('z',cz+2.2)(p)||merlon('z')(p), 'stone', maps.castle);
 panel(xR,hy,cz,.22,H,hd*2-.1,p=>slit('z',cz-2.2)(p)||slit('z',cz+2.2)(p)||merlon('z')(p), 'stone', maps.castle);

 for(const [tx,tz] of [[xL,zGate],[xR,zGate],[xL,zBack],[xR,zBack]])buildTower(w,panel,slab,maps,tx,tz,TH,thy);

 buildKeep(w,panel,slab,maps,cx,cz-4.6);
 buildGatehouse(w,panel,maps,cx,zGate);

 w.doors.place(cx,0,zGate,0,{width:1.28,height:2.55,thick:.07,hinge:-1,swing:1,color:0x3a2c22,max:100*Math.PI/180});

 placeStairs(w,new T.Vector3(cx+5.15,.02,cz+1.4),0,{steps:14,rise:H/14,run:.24,width:.92});
 const wardrobe=w.builder?.wardrobe||{rack:null,tokens:[]};
 placeFurniture(w,wardrobe,'Table',new T.Vector3(cx,.02,cz-4.4),0);
 placeFurniture(w,wardrobe,'Chair',new T.Vector3(cx-1.1,.02,cz-3.7),.4);
 placeFurniture(w,wardrobe,'Chair',new T.Vector3(cx+1.15,.02,cz-3.7),-.35);

 const torch=(x,y,z)=>{
  const light=new T.PointLight(0xffc07a,7.5,8,2);light.position.set(x,y,z);w.root.add(light);
  const cup=w.mesh(new T.CylinderGeometry(.05,.07,.08,8),w.mat(0x6a5340),x,y-.12,z);
  w.fractures.register(cup,'wood');
 };
 torch(cx-3.2,2.55,zGate-.35);torch(cx+3.2,2.55,zGate-.35);
 torch(cx-2.4,2.4,cz-4.2);torch(cx+2.4,2.4,cz-4.2);
 torch(cx,2.7,cz);

 buildBanner(w,cx,zGate);
 buildSigns(w);
}

function buildTower(w,panel,slab,maps,x,z,TH,thy){
 const s=2.85,H=TH;
 slab(x,z,s,s,.02,.08,maps.castle,'stone');
 slab(x,z,s-.18,s-.18,3.05,.08,maps.wood,'wood');
 panel(x,thy,z+s/2,s,H,.20,p=>slit('x',x)(p)||merlon('x',H-1.05)(p),'stone',maps.castle);
 panel(x,thy,z-s/2,s,H,.20,p=>slit('x',x)(p)||merlon('x',H-1.05)(p),'stone',maps.castle);
 panel(x-s/2,thy,z,.20,H,s,p=>slit('z',z)(p)||merlon('z',H-1.05)(p),'stone',maps.castle);
 panel(x+s/2,thy,z,.20,H,s,p=>slit('z',z)(p)||merlon('z',H-1.05)(p),'stone',maps.castle);
 const cap=w.mesh(new T.ConeGeometry(s*.72,1.15,4),wallMaterial('shingle',maps.shingle),x,H+.62,z);
 cap.rotation.y=Math.PI/4;w.fractures.register(cap,'wood');
}

function buildKeep(w,panel,slab,maps,x,z){
 const ww=7.4,dd=6.2,H=5.9,hy=H/2;
 slab(x,z,ww,dd,.03,.07,maps.wood,'wood');
 slab(x,z,ww-.12,dd-.12,STORY,.07,maps.wood,'wood');
 panel(x,hy,z+dd/2,ww,H,.18,p=>doorHole('x',x,1.05,2.12)(p)||(p.y>STORY+.9&&p.y<STORY+2.15&&Math.abs(p.x-x)<.8),'stone',maps.brick);
 w.doors.place(x,0,z+dd/2,0,{width:.95,height:2.08,hinge:1,swing:-1,color:0x4a372c});
 panel(x,hy,z-dd/2,ww,H,.18,p=>slit('x',x-.0, .32, 1.2, 2.4)(p)||(p.y>STORY+.95&&p.y<STORY+2.2&&Math.abs(p.x-x)<.85),'stone',maps.brick);
 panel(x-ww/2,hy,z,.18,H,dd,p=>slit('z',z,.3,1.15,2.4)(p)||(p.y>STORY+.95&&p.y<STORY+2.2&&Math.abs(p.z-z)<.7),'stone',maps.brick);
 panel(x+ww/2,hy,z,.18,H,dd,p=>slit('z',z,.3,1.15,2.4)(p)||(p.y>STORY+.95&&p.y<STORY+2.2&&Math.abs(p.z-z)<.7),'stone',maps.brick);
 panel(x,H,z,ww,.12,dd,null,'wood',maps.wood);
 placeStairs(w,new T.Vector3(x-2.55,.02,z-.4),0,{steps:16,rise:STORY/16,run:.24,width:.92});
 const shingle=wallMaterial('shingle',maps.shingle);
 const roof=w.mesh(new T.BoxGeometry(ww+.4,.1,dd+.5),shingle,x,H+1.15,z);
 roof.rotation.x=.18;w.fractures.register(roof,'wood');
}

function buildGatehouse(w,panel,maps,x,z){
 const ww=4.6,H=6.4,hy=H/2;
 panel(x,hy,z+.55,ww,H,.18,p=>doorHole('x',x,2.55,3.2)(p)||merlon('x',H-1.1)(p),'stone',maps.castle);
 panel(x-ww/2,hy,z+.05,.18,H,1.35,p=>p.y>H-1.1,'stone',maps.castle);
 panel(x+ww/2,hy,z+.05,.18,H,1.35,p=>p.y>H-1.1,'stone',maps.castle);
 const arch=w.mesh(new T.TorusGeometry(1.42,.11,8,18,Math.PI),wallMaterial('stone',maps.castle),x,2.55,z+.08);
 arch.rotation.y=Math.PI/2;arch.rotation.z=Math.PI;w.fractures.register(arch,'stone');
}

function buildPath(w,maps){
 const z0=PATH.z0,z1=PATH.z1,len=z0-z1,mid=(z0+z1)/2;
 const mesh=w.mesh(new T.BoxGeometry(PATH.w,.05,len),wallMaterial('stone',maps.stone),PATH.x,.028,mid);
 w.floors??=[];w.floors.push({x:PATH.x,z:mid,w:PATH.w,d:len,y:0,h:.05});
 w.fractures.register(mesh,'stone');
 const n=Math.floor(len/1.35);
 for(let i=0;i<n;i++){
  const z=z0-0.7-i*1.35,wP=i%2?PATH.w-.25:PATH.w-.08;
  const stone=w.mesh(new T.BoxGeometry(wP,.04,1.18),wallMaterial('stone',maps.castle),PATH.x+(i%3-1)*.04,.055,z);
  stone.rotation.y=(i%2?1:-1)*.02;w.fractures.register(stone,'stone');
 }
}

function buildBanner(w,x,z){
 const pole=w.mesh(new T.CylinderGeometry(.04,.05,7.2,8),w.mat(0x5a4638),x,3.7,z+.28);
 w.fractures.register(pole,'wood');
 const flag=w.mesh(new T.PlaneGeometry(1.55,.72),new T.MeshStandardMaterial({color:0x6b1d1d,side:T.DoubleSide,roughness:.88}),x+.78,6.55,z+.28);
 w.fractures.register(flag,'wood');
}

function signTexture(title,sub,arrow){
 const c=document.createElement('canvas');c.width=512;c.height=256;
 const g=c.getContext('2d');
 g.fillStyle='#6a5133';g.fillRect(0,0,512,256);
 g.fillStyle='#cbb58a';g.fillRect(14,14,484,228);
 g.fillStyle='#3a2a18';g.font='700 64px Georgia,serif';g.textAlign='center';g.fillText(title,256,100);
 g.font='600 36px Georgia,serif';g.fillText(sub,256,148);
 g.beginPath();
 if(arrow==='down'){g.moveTo(256,168);g.lineTo(220,210);g.lineTo(292,210);}
 else if(arrow==='up'){g.moveTo(256,214);g.lineTo(220,172);g.lineTo(292,172);}
 else if(arrow==='left'){g.moveTo(150,188);g.lineTo(210,160);g.lineTo(210,216);}
 else {g.moveTo(362,188);g.lineTo(302,160);g.lineTo(302,216);}
 g.closePath();g.fill();
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.needsUpdate=true;return map;
}

function waySign(w,x,z,yaw,title,sub,arrow){
 const group=new T.Group();group.position.set(x,0,z);group.rotation.y=yaw;w.root.add(group);
 const post=new T.Mesh(new T.CylinderGeometry(.055,.07,1.72,8),w.mat(0x4a372c));
 post.position.y=.86;post.castShadow=true;group.add(post);
 const board=new T.Mesh(new T.BoxGeometry(1.15,.58,.06),new T.MeshStandardMaterial({map:signTexture(title,sub,arrow),roughness:.86}));
 board.position.set(0,1.55,.04);board.castShadow=true;group.add(board);
 const back=new T.Mesh(new T.BoxGeometry(1.18,.62,.04),w.mat(0x5a422c));
 back.position.set(0,1.55,-.01);group.add(back);
 group.traverse(m=>{if(m.isMesh){w.pickables.push(m);w.fractures.register(m,'wood');}});
 w.obstacle(x,z,.28,.28,0,1.9,post);
 return group;
}

function buildSigns(w){
 waySign(w,1.45,-8.05,0,'CASTLE','straight ahead','down');
 waySign(w,-1.45,-8.05,Math.PI,'HOUSE','behind you','down');
 waySign(w,1.25,-20.7,0,'CASTLE','keep walking','down');
 waySign(w,-1.25,-20.7,Math.PI,'HOUSE','this way','down');
 waySign(w,1.55,CASTLE.gateZ+.9,Math.PI,'HOUSE','up the path','up');
 waySign(w,-1.55,CASTLE.gateZ+.9,0,'CASTLE','through the gate','down');
}
