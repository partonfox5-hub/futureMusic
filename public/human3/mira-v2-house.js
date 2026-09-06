import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export function buildHouse(w){
 const v=(x,y,z)=>new T.Vector3(x,y,z),panel=(x,y,z,sx,sy,sz,hole)=>w.fractures.panel(v(x,y,z),v(sx,sy,sz),'plaster',hole),round=(x,y,z,sx,sy,sz,color,r=.03,kind='wood')=>w.mesh(new RoundedBoxGeometry(sx,sy,sz,2,Math.min(r,Math.min(sx,sy,sz)*.3)),w.surf(kind,color),x,y,z);
 const assemble=(cx,cz,meshes,sx,sz,kind='wood',mass=22)=>{
  const group=new T.Group();group.position.set(cx,0,cz);w.root.add(group);
  for(const m of meshes)if(m)group.attach(m);
  group.updateWorldMatrix(true,true);
  const h=new T.Box3().setFromObject(group).max.y;
  const o=w.obstacle(cx,cz,sx,sz,0,h,group,mass);
  o.restitution=kind==='metal'?.12:kind==='stone'?.08:.2;
  o.friction=kind==='metal'?2.15:kind==='stone'?4.6:3.4;
  const shatter=kind==='metal'?'metal':kind==='stone'?'stone':kind==='cloth'?'wood':kind;
  group.traverse(m=>{if(m.isMesh)w.fractures.register(m,shatter,o);});
  return group;
 };
 w.box(0,-.18,0,24,.3,24,0x718063);w.box(0,-.045,0,9,.08,9,0xab8864,'floor');w.box(6,-.015,3,3.2,.025,16,0x72726d);w.box(0,.003,0,4,.015,4.2,0x8b7a68,'wood');
 panel(0,1.5,-4.45,9,3,.15,p=>p.x<-2&&p.x>-3.6&&p.y>1&&p.y<2.3);panel(-4.45,1.5,0,.15,3,9,p=>Math.abs(p.z)<1.1&&p.y>.9&&p.y<2.3);panel(4.45,1.5,0,.15,3,9,p=>Math.abs(p.z)<1.1&&p.y>.9&&p.y<2.3);panel(0,1.5,4.45,9,3,.15,p=>p.x>-.6&&p.x<1.2&&p.y<2.25);
 panel(0,3.08,0,9,.16,9);panel(0,1.5,-1.8,8.8,3,.13,p=>(Math.abs(p.x+.4)<.65||Math.abs(p.x-3)<.6)&&p.y<2.25);panel(1.45,1.5,0,.13,3,8.8,p=>Math.abs(p.z-.8)<.68&&p.y<2.25);
 w.fractures.panel(v(-4.44,1.62,0),v(.035,1.25,2.05),'glass');w.fractures.panel(v(4.44,1.62,0),v(.035,1.25,2.05),'glass');w.fractures.panel(v(-2.9,1.68,-4.44),v(1.7,1.3,.035),'glass');
 const couch=w.chair(-2.5,-.8,0,true),chair=w.chair(.1,1.5,-Math.PI/2);for(const seat of [couch,chair])seat.group.traverse(m=>{if(m.isMesh)w.fractures.register(m,'wood',null);});
 const tableTop=round(-1.7,.635,1.12,1.7,.09,.85,0x72503b,.018);
 const tableLegs=[];for(const x of [-2.38,-1.02])for(const z of [.84,1.4])tableLegs.push(round(x,.3,z,.07,.60,.07,0x4a3930));
 const table=assemble(-1.7,1.12,[tableTop,...tableLegs],1.7,.85,'wood',24);
 w.tableAnchor={x:-1.7,y:.68,z:1.12};table.userData.obstacle.anchor=w.tableAnchor;
 const bedFrame=round(-2.7,.30,-3.15,1.65,.48,2.05,0x684d3c);
 const mattress=round(-2.7,.61,-3.15,1.58,.24,1.94,0xe0d8c9,.1,'cloth');
 const headboard=round(-2.7,.79,-3.85,1.68,1.03,.12,0x88664e);
 const pillows=[];for(const x of [-3.08,-2.32])pillows.push(round(x,.80,-3.70,.65,.16,.42,0xe8e1d5,.08,'cloth'));
 const blanket=round(-2.7,.76,-2.95,1.59,.055,1.3,0x546d76,.03,'cloth');
 assemble(-2.7,-3.15,[bedFrame,mattress,headboard,...pillows,blanket],1.65,2.05,'wood',45);
 const night=round(-3.95,.34,-3.55,.55,.66,.57,0x826144);
 const drawers=[];for(const y of [.23,.48]){drawers.push(round(-3.95,y,-3.252,.47,.19,.018,0x967359));drawers.push(round(-3.95,y,-3.23,.17,.018,.02,0xc1b293));}
 assemble(-3.95,-3.55,[night,...drawers],.55,.57,'wood',14);
 const counter=round(3.92,.46,.6,.78,.91,2.7,0x58695e);
 const counterTop=round(3.9,.95,.6,.88,.075,2.8,0xd5d2c6,.04,'wood');
 const cabinets=[];for(const z of [-.3,.5,1.3]){cabinets.push(round(3.515,.48,z,.024,.76,.68,0x718176));cabinets.push(round(3.48,.73,z,.025,.018,.22,0xbbb9b0));}
 const sink=round(3.87,1,.04,.52,.016,.65,0x666e71);
 const burners=[];for(const z of [.84,1.12])for(const x of [3.72,4.02]){const burner=w.mesh(new T.TorusGeometry(.095,.007,6,20),w.mat(0x303438),x,1.003,z);burner.rotation.x=Math.PI/2;burners.push(burner);}
 assemble(3.92,.6,[counter,counterTop,...cabinets,sink,...burners],.88,2.8,'wood',55);
 const fridgeBody=round(3.85,1.02,2.57,.89,2.04,.77,0xd8d7cc,.03,'metal');
 const fridgeDoor=round(3.38,1.10,2.57,.035,1.77,.73,0xc3c6bf,.03,'metal');
 const fridgeHandle=round(3.35,1.22,2.82,.035,.48,.025,0x858d8b,.02,'metal');
 assemble(3.85,2.57,[fridgeBody,fridgeDoor,fridgeHandle],.89,.77,'metal',80);
 const kitchenSeat=w.chair(2.38,2.75,-.4);kitchenSeat.group.traverse(m=>{if(m.isMesh)w.fractures.register(m,'wood');});
 const bath=round(3.55,.30,-3.65,1.2,.59,1.25,0xd6d8cf,.12,'stone');
 const bathWater=round(3.55,.61,-3.65,.91,.02,1.03,0x6e938f,.08,'stone');
 assemble(3.55,-3.65,[bath,bathWater],1.2,1.25,'stone',90);
 const basin=round(2.1,.77,-3.73,.70,.18,.62,0xdbded5,.08,'stone');
 const basinWater=round(2.1,.865,-3.73,.49,.025,.43,0x8bada9,.06,'stone');
 assemble(2.1,-3.73,[basin,basinWater],.70,.62,'stone',18);
 const frame=round(-4.34,1.73,2.0,.04,1.15,.85,0x41392f);w.fractures.register(frame,'wood');round(-4.31,1.73,2.0,.016,.99,.70,0x819c99);
 for(const [x,z,color] of [[-1,0,0xffdec0],[3,1,0xe5efff]]){const light=new T.PointLight(color,10,7,2);light.position.set(x,2.70,z);w.root.add(light);round(x,2.94,z,.40,.04,.40,0xe7dfca);}
 // A seat gets a reachable side approach if its normal approach meets a table.
 for(const seat of w.seats)if(w.blocked(seat.approach,.23)){for(const offset of [[-.85,0,.7],[.85,0,.7],[0,0,1.35]]){const p=seat.group.localToWorld(v(...offset));if(!w.blocked(p,.23)){seat.approach.copy(p);break;}}}
}
