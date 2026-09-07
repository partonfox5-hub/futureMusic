import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export function buildHouse(w){
 const v=(x,y,z)=>new T.Vector3(x,y,z),panel=(x,y,z,sx,sy,sz,hole)=>w.fractures.panel(v(x,y,z),v(sx,sy,sz),'plaster',hole),round=(x,y,z,sx,sy,sz,color,r=.03)=>w.mesh(new RoundedBoxGeometry(sx,sy,sz,2,Math.min(r,Math.min(sx,sy,sz)*.3)),w.mat(color),x,y,z);
 w.box(0,-.22,0,24,.4,24,0x718063);w.box(0,-.045,0,9,.08,9,0xab8864);w.box(6,-.015,3,3.2,.025,16,0x72726d);w.box(0,.003,0,4,.015,4.2,0x8b7a68);
 panel(0,1.5,-4.45,9,3,.15,p=>p.x<-2&&p.x>-3.6&&p.y>1&&p.y<2.3);panel(-4.45,1.5,0,.15,3,9,p=>Math.abs(p.z)<1.1&&p.y>.9&&p.y<2.3);panel(4.45,1.5,0,.15,3,9,p=>Math.abs(p.z)<1.1&&p.y>.9&&p.y<2.3);panel(0,1.5,4.45,9,3,.15,p=>p.x>-.6&&p.x<1.2&&p.y<2.25);
 panel(0,3.08,0,9,.16,9);panel(0,1.5,-1.8,8.8,3,.13,p=>(Math.abs(p.x+.4)<.65||Math.abs(p.x-3)<.6)&&p.y<2.25);panel(1.45,1.5,0,.13,3,8.8,p=>Math.abs(p.z-.8)<.68&&p.y<2.25);
 w.fractures.panel(v(-4.44,1.62,0),v(.035,1.25,2.05),'glass');w.fractures.panel(v(4.44,1.62,0),v(.035,1.25,2.05),'glass');w.fractures.panel(v(-2.9,1.68,-4.44),v(1.7,1.3,.035),'glass');
 const couch=w.chair(-2.5,-.8,0,true),chair=w.chair(.1,1.5,-Math.PI/2);for(const seat of [couch,chair])seat.group.traverse(m=>{if(m.isMesh)w.fractures.register(m,'wood',null);});
 const furniture=(mesh,sx,sz,kind='wood')=>{const p=mesh.position,o=w.obstacle(p.x,p.z,sx,sz,0,new T.Box3().setFromObject(mesh).max.y,mesh);w.fractures.register(mesh,kind,o);return mesh;};
 let furnitureStart=w.root.children.length;
 const table=round(-1.7,.635,1.12,1.7,.09,.85,0x72503b,.018);furniture(table,1.7,.85);w.tableAnchor={x:-1.7,y:.68,z:1.12};for(const x of [-2.38,-1.02])for(const z of [.84,1.4]){const leg=round(x,.3,z,.07,.60,.07,0x4a3930);w.fractures.register(leg,'wood');}
 w.captureFurniture('Table',furnitureStart,-1.7,1.12);furnitureStart=w.root.children.length;
 const bed=round(-2.7,.30,-3.15,1.65,.48,2.05,0x684d3c);furniture(bed,1.65,2.05);round(-2.7,.61,-3.15,1.58,.24,1.94,0xe0d8c9,.1);round(-2.7,.79,-3.85,1.68,1.03,.12,0x88664e);for(const x of [-3.08,-2.32])round(x,.80,-3.70,.65,.16,.42,0xe8e1d5,.08);round(-2.7,.76,-2.95,1.59,.055,1.3,0x546d76);w.captureFurniture('Bed',furnitureStart,-2.7,-3.15);furnitureStart=w.root.children.length;const night=round(-3.95,.34,-3.55,.55,.66,.57,0x826144);furniture(night,.55,.57);for(const y of [.23,.48]){round(-3.95,y,-3.252,.47,.19,.018,0x967359);round(-3.95,y,-3.23,.17,.018,.02,0xc1b293);}
 w.captureFurniture('Nightstand',furnitureStart,-3.95,-3.55);furnitureStart=w.root.children.length;
 const counter=round(3.92,.46,.6,.78,.91,2.7,0x58695e);furniture(counter,.78,2.7);round(3.9,.95,.6,.88,.075,2.8,0xd5d2c6);for(const z of [-.3,.5,1.3]){round(3.515,.48,z,.024,.76,.68,0x718176);round(3.48,.73,z,.025,.018,.22,0xbbb9b0);}round(3.87,1,.04,.52,.016,.65,0x666e71);for(const z of [.84,1.12])for(const x of [3.72,4.02]){const burner=w.mesh(new T.TorusGeometry(.095,.007,6,20),w.mat(0x303438),x,1.003,z);burner.rotation.x=Math.PI/2;}
 w.captureFurniture('Kitchen counter',furnitureStart,3.92,.6);furnitureStart=w.root.children.length;
 const fridge=round(3.85,1.02,2.57,.89,2.04,.77,0xd8d7cc);furniture(fridge,.89,.77,'metal');round(3.38,1.10,2.57,.035,1.77,.73,0xc3c6bf);round(3.35,1.22,2.82,.035,.48,.025,0x858d8b);
 w.captureFurniture('Refrigerator',furnitureStart,3.85,2.57);
 const kitchenSeat=w.chair(2.38,2.75,-.4);kitchenSeat.group.traverse(m=>{if(m.isMesh)w.fractures.register(m,'wood');});
 furnitureStart=w.root.children.length;
 const bath=round(3.55,.30,-3.65,1.2,.59,1.25,0xd6d8cf,.12);furniture(bath,1.2,1.25,'stone');round(3.55,.61,-3.65,.91,.02,1.03,0x6e938f,.08);w.captureFurniture('Bathtub',furnitureStart,3.55,-3.65);furnitureStart=w.root.children.length;const basin=round(2.1,.77,-3.73,.70,.18,.62,0xdbded5,.08);furniture(basin,.70,.62,'stone');round(2.1,.865,-3.73,.49,.025,.43,0x8bada9,.06);
 w.captureFurniture('Sink',furnitureStart,2.1,-3.73);furnitureStart=w.root.children.length;
 const frame=round(-4.34,1.73,2.0,.04,1.15,.85,0x41392f);w.fractures.register(frame,'wood');round(-4.31,1.73,2.0,.016,.99,.70,0x819c99);
 w.captureFurniture('Wall picture',furnitureStart,-4.34,2);
 // Common household extras: coffee table, TV, storage, extra seats, bath, lamps.
 w.chair(-1.15,.38,Math.PI);w.chair(-2.28,.38,Math.PI);w.chair(-.42,-1.22,.55);w.chair(-3.55,1.85,Math.PI/2);w.chair(2.05,1.55,-.2);w.chair(1.72,2.95,2.6);
 furnitureStart=w.root.children.length;
 const coffee=round(-2.42,.21,.22,.92,.10,.58,0x6a4e3a,.02);furniture(coffee,.92,.58);
 w.captureFurniture('Coffee table',furnitureStart,-2.42,.22);furnitureStart=w.root.children.length;
 const ottoman=round(-1.55,.18,-.15,.48,.22,.42,0x6d5a4a,.06);furniture(ottoman,.48,.42);
 w.captureFurniture('Ottoman',furnitureStart,-1.55,-.15);furnitureStart=w.root.children.length;
 const side=round(-3.38,.28,-.75,.38,.42,.38,0x7a5a40);furniture(side,.38,.38);
 w.captureFurniture('Side table',furnitureStart,-3.38,-.75);furnitureStart=w.root.children.length;
 const tv=round(-.15,.32,3.72,1.55,.52,.42,0x3e3a36);furniture(tv,1.55,.42,'wood');round(-.15,.78,3.72,1.28,.04,.06,0x1a1c1e);
 w.captureFurniture('TV stand',furnitureStart,-.15,3.72);furnitureStart=w.root.children.length;
 const shelf=round(-4.12,.92,1.35,.28,1.72,.92,0x6d5340);furniture(shelf,.28,.92);for(const y of [.35,.7,1.05,1.4])round(-4.12,y,1.35,.26,.03,.88,0x5a4434);
 w.captureFurniture('Bookshelf',furnitureStart,-4.12,1.35);furnitureStart=w.root.children.length;
 const desk=round(-3.55,.41,3.35,1.05,.08,.58,0x70543c);furniture(desk,1.05,.58);for(const x of [-3.95,-3.15])round(x,.2,3.35,.07,.40,.07,0x4a3930);
 w.captureFurniture('Desk',furnitureStart,-3.55,3.35);furnitureStart=w.root.children.length;
 const lamp=round(-3.42,.78,.35,.08,1.42,.08,0x9aa0a4);furniture(lamp,.18,.18,'metal');round(-3.42,1.52,.35,.22,.06,.22,0xd8c9a6,.08);
 w.captureFurniture('Floor lamp',furnitureStart,-3.42,.35);furnitureStart=w.root.children.length;
 const dresser=round(-.55,.48,-3.95,.95,.84,.42,0x7a5c44);furniture(dresser,.95,.42);for(const y of [.28,.52,.74])round(-.55,y,-3.78,.82,.08,.04,0x8a6a50);
 w.captureFurniture('Dresser',furnitureStart,-.55,-3.95);furnitureStart=w.root.children.length;
 const night2=round(-1.42,.34,-3.55,.50,.64,.52,0x7d6146);furniture(night2,.50,.52);
 w.captureFurniture('Nightstand',furnitureStart,-1.42,-3.55);furnitureStart=w.root.children.length;
 const cabinet=round(4.12,.48,-.85,.52,.88,.70,0x5e6a62);furniture(cabinet,.52,.70);
 w.captureFurniture('Cabinet',furnitureStart,4.12,-.85);furnitureStart=w.root.children.length;
 const micro=round(3.55,1.18,-.35,.42,.28,.38,0xc5c6c2);furniture(micro,.42,.38,'metal');
 w.captureFurniture('Microwave',furnitureStart,3.55,-.35);furnitureStart=w.root.children.length;
 const stool=round(3.15,.46,1.55,.28,.08,.28,0x5a4638);furniture(stool,.28,.28);round(3.15,.22,1.55,.05,.42,.05,0x4a3930);
 w.captureFurniture('Bar stool',furnitureStart,3.15,1.55);furnitureStart=w.root.children.length;
 const toilet=round(2.72,.26,-2.72,.42,.40,.52,0xe4e6e0,.08);furniture(toilet,.42,.52,'stone');round(2.72,.48,-2.88,.28,.28,.12,0xd5d8d2,.06);
 w.captureFurniture('Toilet',furnitureStart,2.72,-2.72);furnitureStart=w.root.children.length;
 const bathCab=round(4.15,.46,-2.55,.46,.82,.48,0x6a736c);furniture(bathCab,.46,.48);
 w.captureFurniture('Cabinet',furnitureStart,4.15,-2.55);furnitureStart=w.root.children.length;
 const mirror=round(2.1,1.45,-4.28,.55,.62,.04,0x8aa8a6);furniture(mirror,.55,.08,'glass');
 w.captureFurniture('Mirror',furnitureStart,2.1,-4.28);furnitureStart=w.root.children.length;
 const pic2=round(4.34,1.68,-.2,.04,.85,.62,0x41392f);w.fractures.register(pic2,'wood');round(4.31,1.68,-.2,.016,.72,.50,0x7a9090);
 w.captureFurniture('Wall picture',furnitureStart,4.34,-.2);furnitureStart=w.root.children.length;
 const pic3=round(-1.8,1.70,-4.34,.72,.55,.04,0x41392f);w.fractures.register(pic3,'wood');round(-1.8,1.70,-4.31,.58,.44,.016,0x8a9a88);
 w.captureFurniture('Wall picture',furnitureStart,-1.8,-4.34);
 w.chair(-3.55,2.55,0);
 for(const [x,z,color] of [[-1,0,0xffdec0],[3,1,0xe5efff]]){const light=new T.PointLight(color,10,7,2);light.position.set(x,2.70,z);w.root.add(light);round(x,2.94,z,.40,.04,.40,0xe7dfca);}
 // A seat gets a reachable side approach if its normal approach meets a table.
 for(const seat of w.seats)if(w.blocked(seat.approach,.23)){for(const offset of [[-.85,0,.7],[.85,0,.7],[0,0,1.35]]){const p=seat.group.localToWorld(v(...offset));if(!w.blocked(p,.23)){seat.approach.copy(p);break;}}}
}
