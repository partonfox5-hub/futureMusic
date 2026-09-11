import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {makeSurfaceMap,wallMaterial} from './mira-v2-walls.js?v=19.1.0';
import {placeStairs,placeFurniture,tagMovable} from './mira-v2-furniture.js?v=19.1.0';
import {detailToilet,detailFridge,detailMicrowave,detailSink,detailBathtub,detailLamp,detailTvStand,detailBed,detailNightstand,detailDresser,detailBookshelf,detailDesk,detailBarStool,detailCabinet,detailMirror,detailCounter,detailCoffee,detailTable} from './mira-v2-furnish.js?v=19.1.0';
import {installWeights} from './mira-v2-weights.js?v=19.1.0';
import {installLaundry,installPantry} from './mira-v2-laundry.js?v=19.1.0';
import {installPiano} from './mira-v2-piano.js?v=19.1.0';
import {HouseDoors} from './mira-v2-doors.js?v=19.1.0';
const STORY=3.05,CELL=.6;
const doorHole=(axis,c,w=1.14,head=2.14)=>{
 const r=w/2+CELL*.55;
 return p=>p.y<head&&p.y>.04&&(axis==='x'?Math.abs(p.x-c):Math.abs(p.z-c))<r;
};
const winHole=(axis,c,w=1.45,sill=.92,head=2.22)=>{
 const r=w/2+CELL*.55;
 return p=>p.y>sill&&p.y<head&&(axis==='x'?Math.abs(p.x-c):Math.abs(p.z-c))<r;
};
export function buildHouse(w){
 const v=(x,y,z)=>new T.Vector3(x,y,z);
 const maps={wood:makeSurfaceMap('Wood'),tile:makeSurfaceMap('Tile'),plaster:makeSurfaceMap('Plaster'),stone:makeSurfaceMap('Stone'),brick:makeSurfaceMap('Brick'),shingle:makeSurfaceMap('Shingle')};
 const panel=(x,y,z,sx,sy,sz,hole,kind='plaster',map=maps.plaster)=>w.fractures.panel(v(x,y,z),v(sx,sy,sz),kind,hole||(()=>false),{map});
 const round=(x,y,z,sx,sy,sz,color,r=.03)=>w.mesh(new RoundedBoxGeometry(sx,sy,sz,2,Math.min(r,Math.min(sx,sy,sz)*.3)),w.mat(color),x,y,z);
 const slab=(x,z,ww,dd,y,thick,map,kind='wood')=>{
  const mesh=w.fractures.panel(v(x,y+thick/2,z),v(ww,thick,dd),kind,()=>false,{map,skipObstacle:true,cell:Math.max(.55,Math.min(ww,dd)>8?.9:.62)});
  w.floors??=[];w.floors.push({x,z,w:ww,d:dd,y,h:thick});
  return mesh;
 };
 const pane=(x,y,z,sx,sy,sz)=>w.fractures.panel(v(x,y,z),v(sx,sy,sz),'glass');
 w.doors?.clear?.();
 w.doors=new HouseDoors(w);
 w.box(0,-.18,1.8,22,.32,20,0x6d7a62);
 slab(-3.4,1.4,7.6,6.0,.02,.05,maps.wood);
 slab(3.8,1.4,6.8,6.0,.02,.05,maps.wood);
 slab(-3.4,-4.2,7.6,5.2,.02,.05,maps.wood);
 slab(3.8,-4.2,6.8,5.2,.02,.05,maps.wood);
 slab(3.8,7.5,6.8,6.2,.02,.05,maps.stone,'stone');
 slab(-5.4,-4.2,3.6,5.2,.02,.05,maps.tile,'stone');
 slab(-4.02,-.4,6.36,10.0,STORY,.07,maps.wood);
 slab(-.16,-3.40,1.20,3.90,STORY,.07,maps.wood);
 slab(-.16,3.88,1.20,1.44,STORY,.07,maps.wood);
 slab(3.88,-.4,6.64,10.0,STORY,.07,maps.wood);
 slab(-5.4,3.1,3.6,3.6,STORY,.07,maps.tile,'stone');
 const H=3.0,hy=H/2,y2=STORY+hy;
 panel(-3.4,hy,-6.8,7.6,H,.14,winHole('x',-2.2));
 panel(3.8,hy,-6.8,6.8,H,.14,winHole('x',5.0));
 panel(-7.2,hy,-1.2,.14,H,11.2,winHole('z',-4.2));
 panel(7.2,hy,-1.2,.14,H,11.2,p=>doorHole('z',1.4)(p)||doorHole('z',-4.2)(p));
 panel(7.2,hy,7.5,.14,H,6.2,winHole('z',7.5,1.2));
 panel(-3.4,hy,4.4,7.6,H,.14,doorHole('x',-2.0));
 panel(3.8,hy,4.4,6.8,H,.14,doorHole('x',3.8));
 panel(.4,hy,10.6,6.8,H,.16,p=>Math.abs(p.x-3.8)<2.45&&p.y<2.45);
 panel(.4,hy,7.5,.14,H,6.2,doorHole('z',7.5));
 panel(-3.6,hy,-4.2,.14,H,5.2,doorHole('z',-4.2));
 panel(-3.4,hy,-1.6,7.6,H,.14,p=>doorHole('x',-5.4)(p)||doorHole('x',-1.6)(p)||(Math.abs(p.x+.16)<.72));
 panel(3.8,hy,-1.6,6.8,H,.14,doorHole('x',3.8));
 pane(-7.18,1.58,-4.2,.035,1.22,1.42);
 pane(-2.2,1.58,-6.78,1.48,1.22,.035);
 pane(5.0,1.58,-6.78,1.42,1.22,.035);

 pane(7.18,1.58,7.5,.035,1.1,1.15);
 panel(-3.4,y2,-6.8,7.6,H,.14,p=>p.y>STORY+.92&&p.y<STORY+2.22&&Math.abs(p.x+2.2)<.95);
 panel(3.8,y2,-6.8,6.8,H,.14,p=>p.y>STORY+.92&&p.y<STORY+2.22&&Math.abs(p.x-5.2)<.9);
 panel(-7.2,y2,-.4,.14,H,12.8,p=>p.y>STORY+.92&&p.y<STORY+2.22&&Math.abs(p.z-1.2)<.85);
 panel(7.2,y2,-.4,.14,H,12.8,p=>p.y>STORY+.92&&p.y<STORY+2.22&&Math.abs(p.z-1)<.85);
 panel(-3.4,y2,4.4,7.6,H,.14);
 panel(3.8,y2,4.4,6.8,H,.14);
 panel(.55,y2,3.15,.14,H,2.5,p=>p.y>STORY&&p.y<STORY+2.14&&Math.abs(p.z-3.15)<.85);
 panel(-3.8,y2,3.1,.14,H,3.6,p=>p.y>STORY&&p.y<STORY+2.14&&Math.abs(p.z-3.1)<.75);
 panel(-5.4,y2,1.8,3.6,H,.14,p=>p.y>STORY&&p.y<STORY+2.14&&Math.abs(p.x+5.4)<.75);
 pane(-2.2,STORY+1.58,-6.78,1.42,1.18,.035);
 pane(5.2,STORY+1.58,-6.78,1.32,1.18,.035);
 pane(-7.18,STORY+1.58,1.2,.035,1.18,1.28);
 pane(7.18,STORY+1.58,1.0,.035,1.18,1.22);
 panel(-3.4,STORY+H,-.4,7.6,.12,12.8,null,'wood',maps.wood);
 panel(3.8,STORY+H,-.4,6.8,.12,12.8,null,'wood',maps.wood);
 const rise=STORY/16;
 placeStairs(w,new T.Vector3(-.16,.02,2.40),Math.PI,{steps:16,rise,run:.2625,width:1.10});
 addStairRail(w,round);
 w.doors.place(-2.0,0,4.4,0,{hinge:-1,swing:1});
 w.doors.place(3.8,0,4.4,0,{hinge:1,swing:1});
 w.doors.place(.4,0,7.5,Math.PI/2,{hinge:-1,swing:-1});
 w.doors.place(-5.4,0,-1.6,0,{hinge:-1,swing:-1});
 w.doors.place(-1.6,0,-1.6,0,{hinge:1,swing:-1});
 w.doors.place(3.8,0,-1.6,0,{hinge:-1,swing:-1});
 w.doors.place(7.2,0,1.4,Math.PI/2,{hinge:-1,swing:1});
 w.doors.place(7.2,0,-4.2,Math.PI/2,{hinge:1,swing:-1});
 addGym(w,maps,panel,slab,round,pane,H,hy);
 addLaundryRoom(w,maps,panel,slab,pane,H,hy);
 w.doors.place(-3.6,0,-4.2,Math.PI/2,{hinge:-1,swing:1});
 w.doors.place(.55,STORY,3.15,Math.PI/2,{hinge:-1,swing:-1});
 addRoof(w,maps);


 let furnitureStart=w.root.children.length;
 const couch=w.chair(-3.6,2.2,0,true),chair=w.chair(-1.2,2.8,-Math.PI/2);
 w.tableAnchor={x:-2.4,y:.68,z:1.35};
 detailTable(w,-2.4,1.35);
 w.captureFurniture('Table',furnitureStart,-2.4,1.35);furnitureStart=w.root.children.length;
 detailCoffee(w,-3.5,1.55);
 w.captureFurniture('Coffee table',furnitureStart,-3.5,1.55);furnitureStart=w.root.children.length;
 detailTvStand(w,-3.4,4.05);
 w.captureFurniture('TV stand',furnitureStart,-3.4,4.05);furnitureStart=w.root.children.length;
 detailBookshelf(w,-6.7,2.4);
 w.captureFurniture('Bookshelf',furnitureStart,-6.7,2.4);furnitureStart=w.root.children.length;
 detailLamp(w,-5.6,.6);
 w.captureFurniture('Floor lamp',furnitureStart,-5.6,.6);furnitureStart=w.root.children.length;
 w.chair(-1.1,1.8,.35);

 furnitureStart=w.root.children.length;
 detailCounter(w,4.6,1.6);
 w.captureFurniture('Kitchen counter',furnitureStart,4.6,1.6);furnitureStart=w.root.children.length;
 detailFridge(w,6.3,3.5);
 w.captureFurniture('Refrigerator',furnitureStart,6.3,3.5);furnitureStart=w.root.children.length;
 detailCabinet(w,6.4,.2);
 w.captureFurniture('Cabinet',furnitureStart,6.4,.2);furnitureStart=w.root.children.length;
 detailMicrowave(w,4.2,.4);
 w.captureFurniture('Microwave',furnitureStart,4.2,.4);furnitureStart=w.root.children.length;
 detailBarStool(w,3.6,2.4);
 w.captureFurniture('Bar stool',furnitureStart,3.6,2.4);

 furnitureStart=w.root.children.length;
 detailBed(w,-1.6,-4.4);
 w.captureFurniture('Bed',furnitureStart,-1.6,-4.4);
 const bedGroup=(w.movables||[]).filter(g=>g.userData.furniture?.id==='Bed').at(-1);
 furnitureStart=w.root.children.length;
 const mattress=round(-1.6,.58,-4.4,1.58,.16,1.94,0xe0d8c9,.1);
 mattress.position.set(-1.6,.58,-4.4);
 const mf=tagMovable(w,mattress,'Mattress');if(mf){mf.mass=Math.min(16,mf.mass);mf.soft=true;mf.health=22;mf.velocity.set(0,0,0);}
 w.fractures.register(mattress,'wood');if(mattress.userData.piece){mattress.userData.piece.health=22;mattress.userData.piece.maxHealth=22;}
 if(bedGroup?.userData.furniture)bedGroup.userData.furniture.mattress=mattress;
 mattress.userData.bedFrame=bedGroup;
 furnitureStart=w.root.children.length;
 detailNightstand(w,-2.9,-4.9);
 w.captureFurniture('Nightstand',furnitureStart,-2.9,-4.9);furnitureStart=w.root.children.length;
 detailDesk(w,-.4,-3.4);
 w.captureFurniture('Desk',furnitureStart,-.4,-3.4);furnitureStart=w.root.children.length;
 detailDresser(w,-2.2,-6.2);
 w.captureFurniture('Dresser',furnitureStart,-2.2,-6.2);

 furnitureStart=w.root.children.length;
 detailBathtub(w,-5.6,-4.6);
 w.captureFurniture('Bathtub',furnitureStart,-5.6,-4.6);furnitureStart=w.root.children.length;
 detailSink(w,-6.4,-3.2);
 w.captureFurniture('Sink',furnitureStart,-6.4,-3.2);furnitureStart=w.root.children.length;
 detailToilet(w,-4.5,-3.3);
 w.captureFurniture('Toilet',furnitureStart,-4.5,-3.3);furnitureStart=w.root.children.length;
 detailMirror(w,-6.4,-3.7);
 w.captureFurniture('Mirror',furnitureStart,-6.4,-3.7);furnitureStart=w.root.children.length;
 const frame=round(-6.9,1.73,0.2,.04,1.15,.85,0x41392f);w.fractures.register(frame,'wood');round(-6.87,1.73,0.2,.016,.99,.70,0x819c99);
 w.captureFurniture('Wall picture',furnitureStart,-6.9,0.2);

 w.garageStalls=[{position:new T.Vector3(2.7,0,7.6),yaw:Math.PI,color:0x1e4f8a},{position:new T.Vector3(5.5,0,7.6),yaw:Math.PI,color:0xb42222}];

 placeFurniture(w,w.builder?.wardrobe||{rack:null,tokens:[]},'Bed',new T.Vector3(-4.6,STORY,-3.8),0);
 placeFurniture(w,w.builder?.wardrobe||{rack:null,tokens:[]},'Nightstand',new T.Vector3(-5.9,STORY,-4.2),0);
 placeFurniture(w,w.builder?.wardrobe||{rack:null,tokens:[]},'Toilet',new T.Vector3(-6.2,STORY,2.6),0);
 placeFurniture(w,w.builder?.wardrobe||{rack:null,tokens:[]},'Sink',new T.Vector3(-4.8,STORY,3.6),0);
 installPantry(w);
 installPiano(w,new T.Vector3(-4.95,0,-1.12),0);
 const gndLights=[[-3.2,2.70,1.4,0xffdec0],[4.2,2.70,1.6,0xe5efff],[10.0,2.70,1.4,0xe8e4d8],[-4.9,2.2,-.6,0xffe6c8]];
 for(const [x,y,z,color] of gndLights){const light=new T.PointLight(color,9,7,2);light.position.set(x,y,z);w.root.add(light);round(x,y+.24,z,.40,.04,.40,0xe7dfca);}
 for(const seat of w.seats)if(w.blocked(seat.approach,.23)){for(const offset of [[-.85,0,.7],[.85,0,.7],[0,0,1.35]]){const p=seat.group.localToWorld(v(...offset));if(!w.blocked(p,.23)){seat.approach.copy(p);break;}}}
}

function addLaundryRoom(w,maps,panel,slab,pane,H,hy){
 slab(9.85,-4.2,5.3,5.2,.02,.05,maps.tile,'stone');
 panel(12.5,hy,-4.2,.16,H,5.2,winHole('z',-4.2));
 panel(9.85,hy,-6.8,5.3,H,.16,winHole('x',9.85));
 pane(12.48,1.58,-4.2,.035,1.18,1.28);
 pane(9.85,1.58,-6.78,1.28,1.18,.035);
 panel(9.85,H,-4.2,5.4,.12,5.3,null,'wood',maps.wood);
 const roof=w.mesh(new T.BoxGeometry(5.8,.1,5.6),wallMaterial('shingle',maps.shingle),10.05,H+.7,-4.2);
 roof.rotation.z=-.14;w.fractures.register(roof,'wood');
 installLaundry(w,new T.Vector3(9.85,0,-4.2));
}

function addGym(w,maps,panel,slab,round,pane,H,hy){
 slab(9.85,1.4,5.3,6.0,.02,.05,maps.stone,'stone');
 panel(12.5,hy,1.4,.16,H,6.0,winHole('z',1.4));
 panel(9.85,hy,-1.6,5.3,H,.16,winHole('x',9.85));
 panel(9.85,hy,4.4,5.3,H,.16);
 pane(12.48,1.58,1.4,.035,1.18,1.35);
 pane(9.85,1.58,-1.58,1.35,1.18,.035);
 panel(9.85,H,1.4,5.4,.12,6.1,null,'wood',maps.wood);
 const rubber=w.mesh(new T.BoxGeometry(5.1,.02,5.8),w.mat(0x2c2c2e,.95),9.85,.045,1.4);
 rubber.receiveShadow=true;
 const gymRoof=w.mesh(new T.BoxGeometry(5.8,.1,6.5),wallMaterial('shingle',maps.shingle),10.05,H+.72,1.4);
 gymRoof.rotation.z=-.16;w.fractures.register(gymRoof,'wood');
 installWeights(w,new T.Vector3(10.05,.06,1.15),0);
}

function addStairRail(w,round){
 const y=STORY+.02,h=.86;
 const posts=[[-.70,-1.32],[-.70,.75],[-.70,2.80],[.38,-1.32],[.38,.75]];
 for(const [x,z] of posts)round(x,y+h/2,z,.045,h,.045,0x4a372c,.01);
 const rail=(x0,z0,x1,z1)=>{
  const x=(x0+x1)/2,z=(z0+z1)/2;
  const mesh=w.mesh(new T.BoxGeometry(Math.max(.04,Math.abs(x1-x0)||.04),.04,Math.max(.04,Math.abs(z1-z0)||.04)),w.mat(0x4a372c),x,y+h,z);
  w.fractures.register(mesh,'wood');
 };
 rail(-.70,-1.32,-.70,2.80);rail(.38,-1.32,.38,.75);rail(-.70,-1.32,.38,-1.32);
}

function addRoof(w,maps){
 const shingle=wallMaterial('shingle',maps.shingle);
 const eave=STORY+3.02,rise=2.85,x0=-7.45,x1=7.45,z0=-7.05,z1=4.65;
 const cx=(x0+x1)/2,cz=(z0+z1)/2,halfZ=(z1-z0)/2,spanX=x1-x0,len=Math.hypot(halfZ,rise),pitch=Math.atan2(rise,halfZ);
 const slope=(zMid,sign)=>{
  const y=eave+rise/2;
  const mesh=w.mesh(new T.BoxGeometry(spanX,.09,len+.12),shingle,cx,y,zMid);
  mesh.rotation.x=sign*pitch;mesh.castShadow=mesh.receiveShadow=true;
  w.fractures.register(mesh,'wood');
 };
 slope((z0+cz)/2,-1);slope((z1+cz)/2,1);
 const ridge=w.mesh(new T.BoxGeometry(spanX+.1,.08,.16),w.mat(0x3f2c24),cx,eave+rise+.02,cz);
 w.fractures.register(ridge,'wood');
 for(const x of [x0+.12,x1-.12]){
  const shape=new T.Shape();
  shape.moveTo(z0,eave);shape.lineTo(cz,eave+rise);shape.lineTo(z1,eave);shape.closePath();
  const gable=new T.Mesh(new T.ShapeGeometry(shape),wallMaterial('plaster',maps.plaster));
  gable.rotation.y=Math.PI/2;gable.position.set(x,0,0);gable.castShadow=true;gable.receiveShadow=true;gable.material.side=T.DoubleSide;
  w.root.add(gable);w.fractures.register(gable,'plaster');
 }
 const gz0=4.42,gz1=10.85,gcz=(gz0+gz1)/2,gx0=.15,gx1=7.45,geave=3.04,grise=1.55;
 const ghalf=(gz1-gz0)/2,glen=Math.hypot(ghalf,grise),gpitch=Math.atan2(grise,ghalf),gspan=gx1-gx0,gxc=(gx0+gx1)/2;
 const gslope=(zMid,sign)=>{
  const mesh=w.mesh(new T.BoxGeometry(gspan,.08,glen+.1),shingle,gxc,geave+grise/2,zMid);
  mesh.rotation.x=sign*gpitch;w.fractures.register(mesh,'wood');
 };
 gslope((gz0+gcz)/2,-1);gslope((gz1+gcz)/2,1);
 const garageRidge=w.mesh(new T.BoxGeometry(gspan+.08,.07,.14),w.mat(0x3f2c24),gxc,geave+grise+.02,gcz);
 w.fractures.register(garageRidge,'wood');
}
