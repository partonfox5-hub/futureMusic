import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {makeSurfaceMap,wallMaterial} from './mira-v2-walls.js?v=13.8';
import {placeStairs,placeFurniture} from './mira-v2-furniture.js?v=13.4';
const STORY=3.05;
export function buildHouse(w){
 const v=(x,y,z)=>new T.Vector3(x,y,z);
 const maps={wood:makeSurfaceMap('Wood'),tile:makeSurfaceMap('Tile'),plaster:makeSurfaceMap('Plaster'),stone:makeSurfaceMap('Stone'),brick:makeSurfaceMap('Brick')};
 const panel=(x,y,z,sx,sy,sz,hole,kind='plaster',map=maps.plaster)=>w.fractures.panel(v(x,y,z),v(sx,sy,sz),kind,hole||(()=>false),{map});
 const round=(x,y,z,sx,sy,sz,color,r=.03)=>w.mesh(new RoundedBoxGeometry(sx,sy,sz,2,Math.min(r,Math.min(sx,sy,sz)*.3)),w.mat(color),x,y,z);
 const slab=(x,z,ww,dd,y,thick,map,kind='wood')=>{
  const mat=wallMaterial(kind,map);
  const mesh=w.mesh(new T.BoxGeometry(ww,thick,dd),mat,x,y+thick/2,z);
  w.floors??=[];w.floors.push({x,z,w:ww,d:dd,y,h:thick});
  w.fractures.register(mesh,kind);return mesh;
 };
 // Ground pads
 w.box(0,-.18,1.8,22,.32,20,0x6d7a62);
 slab(-3.4,1.4,7.6,6.0,.02,.05,maps.wood);
 slab(3.8,1.4,6.8,6.0,.02,.05,maps.wood);
 slab(-3.4,-4.2,7.6,5.2,.02,.05,maps.wood);
 slab(3.8,7.5,6.8,6.2,.02,.05,maps.stone,'stone');
 slab(-5.4,-4.2,3.6,5.2,.02,.05,maps.tile,'stone');
 // Second floor decks
 slab(-3.4,-.4,7.6,10.0,STORY,.07,maps.wood);
 slab(3.8,-.4,6.8,10.0,STORY,.07,maps.wood);
 slab(-5.4,3.1,3.6,3.6,STORY,.07,maps.tile,'stone');
 // Outer walls ground (story 3m)
 const H=3.0,hy=H/2;
 panel(-3.4,hy,-6.8,14.8,H,.14,p=>p.x>-3.2&&p.x<-1.4&&p.y>1&&p.y<2.25);
 panel(3.8,hy,-6.8,6.8,H,.14,p=>p.x>4.2&&p.x<5.8&&p.y>1&&p.y<2.2);
 panel(-7.2,hy,-1.2,.14,H,11.2,p=>Math.abs(p.z+4.2)<.7&&p.y>1&&p.y<2.2);
 panel(7.2,hy,1.9,.14,H,17.4,p=>Math.abs(p.z-1.4)<.7&&p.y>1&&p.y<2.2);
 panel(-3.4,hy,4.4,7.6,H,.14,p=>Math.abs(p.x+2)<.55&&p.y<2.2);
 panel(3.8,hy,4.4,6.8,H,.14,p=>Math.abs(p.x-3.8)<.7&&p.y<2.25);
 panel(.4,hy,10.6,6.8,H,.16,p=>Math.abs(p.x-3.8)<2.4&&p.y<2.4);
 panel(.4,hy,7.5,.14,H,6.2,p=>Math.abs(p.z-7.5)<1.1&&p.y<2.2);
 // Interior ground partitions
 panel(.4,hy,1.4,.14,H,6.0,p=>Math.abs(p.z-1.4)<.7&&p.y<2.2);
 panel(-3.6,hy,-4.2,.14,H,5.2,p=>Math.abs(p.z+4.2)<.55&&p.y<2.15);
 panel(-3.4,hy,-1.6,7.6,H,.14,p=>(Math.abs(p.x+5.4)<.5||Math.abs(p.x+1.6)<.5||Math.abs(p.x-2)<.55)&&p.y<2.2);
 panel(3.8,hy,-1.6,6.8,H,.14,p=>Math.abs(p.x-3.8)<.55&&p.y<2.2);
 w.fractures.panel(v(-7.18,1.62,-4.2),v(.04,1.2,1.4),'glass');
 w.fractures.panel(v(-2.2,1.68,-6.78),v(1.6,1.2,.04),'glass');
 w.fractures.panel(v(5.0,1.62,-6.78),v(1.4,1.15,.04),'glass');
 w.fractures.panel(v(7.18,1.62,1.4),v(.04,1.2,1.4),'glass');
 // Second story walls
 const y2=STORY+hy;
 panel(-3.4,y2,-6.8,14.8,H,.14,p=>p.x>-3&&p.x<-1.2&&p.y>STORY+1&&p.y<STORY+2.2);
 panel(3.8,y2,-6.8,6.8,H,.14,p=>p.x>4.4&&p.x<6&&p.y>STORY+1&&p.y<STORY+2.2);
 panel(-7.2,y2,-.4,.14,H,12.8,p=>Math.abs(p.z-3.1)<.6&&p.y>STORY+1&&p.y<STORY+2.2);
 panel(7.2,y2,-.4,.14,H,12.8,p=>Math.abs(p.z-1)<.6&&p.y>STORY+1&&p.y<STORY+2.2);
 panel(-3.4,y2,4.4,7.6,H,.14);
 panel(3.8,y2,4.4,6.8,H,.14);
 panel(.4,y2,-.4,.14,H,10.0,p=>Math.abs(p.z+.4)<.65&&p.y>STORY&&p.y<STORY+2.2);
 panel(-3.8,y2,3.1,.14,H,3.6,p=>Math.abs(p.z-3.1)<.5&&p.y>STORY&&p.y<STORY+2.15);
 panel(-5.4,y2,1.8,3.6,H,.14,p=>Math.abs(p.x+5.4)<.5&&p.y>STORY&&p.y<STORY+2.15);
 w.fractures.panel(v(-2.2,STORY+1.62,-6.78),v(1.5,1.15,.04),'glass');
 w.fractures.panel(v(5.2,STORY+1.62,-6.78),v(1.4,1.15,.04),'glass');
 w.fractures.panel(v(-7.18,STORY+1.62,1.2),v(.04,1.15,1.3),'glass');
 // Ceilings
 panel(-3.4,H,.4,7.6,.12,12.8,null,'wood',maps.wood);
 panel(3.8,H,1.4,6.8,.12,16.0,null,'wood',maps.wood);
 panel(-3.4,STORY+H,-.4,7.6,.12,12.8,null,'wood',maps.wood);
 panel(3.8,STORY+H,-.4,6.8,.12,12.8,null,'wood',maps.wood);
 placeStairs(w,new T.Vector3(-.15,-.02,-1.35),0,{steps:16,rise:.1875,run:.25,width:1.08});

 const furniture=(mesh,sx,sz,kind='wood')=>{const p=mesh.position,o=w.obstacle(p.x,p.z,sx,sz,p.y-.4,new T.Box3().setFromObject(mesh).max.y,mesh);w.fractures.register(mesh,kind,o);return mesh;};
 let furnitureStart=w.root.children.length;
 const couch=w.chair(-3.6,2.2,0,true),chair=w.chair(-1.2,2.8,-Math.PI/2);
 for(const seat of [couch,chair])seat.group.traverse(m=>{if(m.isMesh)w.fractures.register(m,'wood',null);});
 const table=round(-2.4,.635,1.35,1.7,.09,.85,0x72503b,.018);furniture(table,1.7,.85);w.tableAnchor={x:-2.4,y:.68,z:1.35};
 for(const x of [-3.08,-1.72])for(const z of [1.07,1.63]){const leg=round(x,.3,z,.07,.60,.07,0x4a3930);w.fractures.register(leg,'wood');}
 w.captureFurniture('Table',furnitureStart,-2.4,1.35);furnitureStart=w.root.children.length;
 const coffee=round(-3.5,.21,1.55,.92,.10,.58,0x6a4e3a,.02);furniture(coffee,.92,.58);
 w.captureFurniture('Coffee table',furnitureStart,-3.5,1.55);furnitureStart=w.root.children.length;
 const tv=round(-3.4,.32,4.05,1.55,.52,.42,0x3e3a36);furniture(tv,1.55,.42,'wood');round(-3.4,.78,4.05,1.28,.04,.06,0x1a1c1e);
 w.captureFurniture('TV stand',furnitureStart,-3.4,4.05);furnitureStart=w.root.children.length;
 const shelf=round(-6.7,.92,2.4,.28,1.72,.92,0x6d5340);furniture(shelf,.28,.92);for(const y of [.35,.7,1.05,1.4])round(-6.7,y,2.4,.26,.03,.88,0x5a4434);
 w.captureFurniture('Bookshelf',furnitureStart,-6.7,2.4);furnitureStart=w.root.children.length;
 const lamp=round(-5.6,.78,.6,.08,1.42,.08,0x9aa0a4);furniture(lamp,.18,.18,'metal');round(-5.6,1.52,.6,.22,.06,.22,0xd8c9a6,.08);
 w.captureFurniture('Floor lamp',furnitureStart,-5.6,.6);furnitureStart=w.root.children.length;
 const ottoman=round(-2.6,.18,.7,.48,.22,.42,0x6d5a4a,.06);furniture(ottoman,.48,.42);
 w.captureFurniture('Ottoman',furnitureStart,-2.6,.7);furnitureStart=w.root.children.length;
 const side=round(-5.5,.28,3.5,.38,.42,.38,0x7a5a40);furniture(side,.38,.38);
 w.captureFurniture('Side table',furnitureStart,-5.5,3.5);
 w.chair(-4.4,.9,Math.PI);w.chair(-2.8,.9,Math.PI);w.chair(-1.1,1.1,.4);

 furnitureStart=w.root.children.length;
 const counter=round(4.6,.46,1.6,.78,.91,2.7,0x58695e);furniture(counter,.78,2.7);round(4.6,.95,1.6,.88,.075,2.8,0xd5d2c6);
 w.captureFurniture('Kitchen counter',furnitureStart,4.6,1.6);furnitureStart=w.root.children.length;
 const fridge=round(6.3,1.02,3.5,.89,2.04,.77,0xd8d7cc);furniture(fridge,.89,.77,'metal');
 w.captureFurniture('Refrigerator',furnitureStart,6.3,3.5);furnitureStart=w.root.children.length;
 const cabinet=round(6.4,.48,.2,.52,.88,.70,0x5e6a62);furniture(cabinet,.52,.70);
 w.captureFurniture('Cabinet',furnitureStart,6.4,.2);furnitureStart=w.root.children.length;
 const micro=round(4.2,1.18,.4,.42,.28,.38,0xc5c6c2);furniture(micro,.42,.38,'metal');
 w.captureFurniture('Microwave',furnitureStart,4.2,.4);furnitureStart=w.root.children.length;
 const stool=round(3.6,.46,2.4,.28,.08,.28,0x5a4638);furniture(stool,.28,.28);round(3.6,.22,2.4,.05,.42,.05,0x4a3930);
 w.captureFurniture('Bar stool',furnitureStart,3.6,2.4);
 w.chair(3.2,3.1,-.4);

 furnitureStart=w.root.children.length;
 const bed3=round(-1.6,.30,-4.4,1.65,.48,2.05,0x684d3c);furniture(bed3,1.65,2.05);round(-1.6,.61,-4.4,1.58,.24,1.94,0xe0d8c9,.1);
 w.captureFurniture('Bed',furnitureStart,-1.6,-4.4);furnitureStart=w.root.children.length;
 const night=round(-2.9,.34,-4.9,.55,.66,.57,0x826144);furniture(night,.55,.57);
 w.captureFurniture('Nightstand',furnitureStart,-2.9,-4.9);furnitureStart=w.root.children.length;
 const desk=round(-.4,.41,-3.4,1.05,.08,.58,0x70543c);furniture(desk,1.05,.58);
 w.captureFurniture('Desk',furnitureStart,-.4,-3.4);furnitureStart=w.root.children.length;
 const dresser=round(-2.2,.48,-6.2,.95,.84,.42,0x7a5c44);furniture(dresser,.95,.42);
 w.captureFurniture('Dresser',furnitureStart,-2.2,-6.2);

 furnitureStart=w.root.children.length;
 const bath=round(-5.6,.30,-4.6,1.2,.59,1.25,0xd6d8cf,.12);furniture(bath,1.2,1.25,'stone');
 w.captureFurniture('Bathtub',furnitureStart,-5.6,-4.6);furnitureStart=w.root.children.length;
 const basin=round(-6.4,.77,-3.2,.70,.18,.62,0xdbded5,.08);furniture(basin,.70,.62,'stone');
 w.captureFurniture('Sink',furnitureStart,-6.4,-3.2);furnitureStart=w.root.children.length;
 const toilet=round(-4.5,.26,-3.3,.42,.40,.52,0xe4e6e0,.08);furniture(toilet,.42,.52,'stone');
 w.captureFurniture('Toilet',furnitureStart,-4.5,-3.3);furnitureStart=w.root.children.length;
 const mirror=round(-6.4,1.45,-3.7,.55,.62,.04,0x8aa8a6);furniture(mirror,.55,.08,'glass');
 w.captureFurniture('Mirror',furnitureStart,-6.4,-3.7);furnitureStart=w.root.children.length;
 const frame=round(-6.9,1.73,0.2,.04,1.15,.85,0x41392f);w.fractures.register(frame,'wood');round(-6.87,1.73,0.2,.016,.99,.70,0x819c99);
 w.captureFurniture('Wall picture',furnitureStart,-6.9,0.2);

 w.garageStalls=[{position:new T.Vector3(2.7,0,7.6),yaw:Math.PI,color:0x1e4f8a},{position:new T.Vector3(5.5,0,7.6),yaw:Math.PI,color:0xb42222}];

 placeFurniture(w,w.builder?.wardrobe||{rack:null,tokens:[]},'Bed',new T.Vector3(-4.6,STORY,-3.8),0);
 placeFurniture(w,w.builder?.wardrobe||{rack:null,tokens:[]},'Nightstand',new T.Vector3(-5.9,STORY,-4.2),0);
 placeFurniture(w,w.builder?.wardrobe||{rack:null,tokens:[]},'Dresser',new T.Vector3(-2.4,STORY,-6.0),0);
 placeFurniture(w,w.builder?.wardrobe||{rack:null,tokens:[]},'Bed',new T.Vector3(4.2,STORY,-3.6),0);
 placeFurniture(w,w.builder?.wardrobe||{rack:null,tokens:[]},'Desk',new T.Vector3(6.0,STORY,-1.6),0);
 placeFurniture(w,w.builder?.wardrobe||{rack:null,tokens:[]},'Toilet',new T.Vector3(-6.2,STORY,2.6),0);
 placeFurniture(w,w.builder?.wardrobe||{rack:null,tokens:[]},'Sink',new T.Vector3(-4.8,STORY,3.6),0);
 const loftChair=w.chair(-4.8,-2.2,.4);loftChair.group.position.y=STORY;
 const gndLights=[[-3.2,2.70,1.4,0xffdec0],[4.2,2.70,1.6,0xe5efff],[-3.2,STORY+2.70,-2.2,0xffe6c8],[4.2,STORY+2.70,-2.0,0xe8f0ff],[3.8,2.70,7.5,0xf2efe6]];
 for(const [x,y,z,color] of gndLights){const light=new T.PointLight(color,9,7,2);light.position.set(x,y,z);w.root.add(light);round(x,y+.24,z,.40,.04,.40,0xe7dfca);}
 for(const seat of w.seats)if(w.blocked(seat.approach,.23)){for(const offset of [[-.85,0,.7],[.85,0,.7],[0,0,1.35]]){const p=seat.group.localToWorld(v(...offset));if(!w.blocked(p,.23)){seat.approach.copy(p);break;}}}
}
