import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
function paintingTexture(kind){
 const c=document.createElement('canvas');c.width=512;c.height=384;const g=c.getContext('2d');
 if(kind==='coast'){const sky=g.createLinearGradient(0,0,0,180);sky.addColorStop(0,'#7eb6d9');sky.addColorStop(1,'#f2d9b0');g.fillStyle=sky;g.fillRect(0,0,512,384);g.fillStyle='#d9c08a';g.beginPath();g.moveTo(0,250);g.quadraticCurveTo(180,210,360,255);g.lineTo(512,270);g.lineTo(512,384);g.lineTo(0,384);g.fill();g.fillStyle='#4e8aa8';g.fillRect(0,268,512,80);g.fillStyle='#f4e2a8';g.beginPath();g.arc(400,90,36,0,Math.PI*2);g.fill();}
 else if(kind==='woods'){g.fillStyle='#8aa3c0';g.fillRect(0,0,512,384);g.fillStyle='#3d5a3a';g.fillRect(0,230,512,154);for(let i=0;i<9;i++){g.fillStyle=i%2?'#2f4a2e':'#48643c';g.beginPath();g.moveTo(20+i*55,250);g.lineTo(48+i*55,90+i*6);g.lineTo(76+i*55,250);g.fill();g.fillStyle='#5a4634';g.fillRect(44+i*55,248,8,70);}g.fillStyle='#e7d7a4';g.beginPath();g.arc(80,70,28,0,Math.PI*2);g.fill();}
 else if(kind==='still'){g.fillStyle='#cbbba0';g.fillRect(0,0,512,384);g.fillStyle='#6d5a48';g.fillRect(40,240,430,90);g.fillStyle='#d8c4a4';g.fillRect(180,110,150,160);g.fillStyle='#8a3a3a';g.beginPath();g.ellipse(255,150,42,58,0,0,Math.PI*2);g.fill();g.fillStyle='#e8dcc8';g.beginPath();g.ellipse(255,128,18,14,0,0,Math.PI*2);g.fill();g.strokeStyle='#5a4638';g.lineWidth=6;g.beginPath();g.moveTo(255,208);g.lineTo(255,270);g.stroke();}
 else {g.fillStyle='#1a2740';g.fillRect(0,0,512,384);g.fillStyle='#f0e6c8';g.beginPath();g.arc(260,120,40,0,Math.PI*2);g.fill();g.fillStyle='#0d1a2e';g.fillRect(0,240,512,144);for(let i=0;i<18;i++){g.fillStyle='rgba(255,255,255,.7)';g.fillRect(30+i*26,40+(i%5)*18,2,2);}g.fillStyle='#3a2a1c';g.fillRect(90,180,80,140);g.fillRect(210,150,70,170);g.fillRect(340,200,110,120);}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
function hangPainting(w,x,y,z,yaw,sx,sy,kind){
 const group=new T.Group();group.position.set(x,y,z);group.rotation.y=yaw;w.root.add(group);
 const frame=new T.Mesh(new RoundedBoxGeometry(sx+.06,sy+.06,.04,2,.01),w.surf('wood',0x4a382c));frame.castShadow=true;group.add(frame);
 const canvas=new T.Mesh(new T.PlaneGeometry(sx,sy),new T.MeshStandardMaterial({map:paintingTexture(kind),roughness:.55,metalness:0}));canvas.position.z=.022;group.add(canvas);
 group.userData.painting=kind;return group;
}
function swingingDoor(w,x,y,z,yaw,wdt=0.78,hgt=2.05){
 const hinge=new T.Group();hinge.position.set(x,y,z);hinge.rotation.y=yaw;w.root.add(hinge);
 const slab=new T.Mesh(new RoundedBoxGeometry(wdt,.04,hgt,1,.02),w.surf('wood',0x6a4e38));
 slab.rotation.x=Math.PI/2;slab.position.set(wdt/2,0,0);slab.castShadow=true;hinge.add(slab);
 const knob=new T.Mesh(new T.SphereGeometry(.03,8,6),w.surf('metal',0xc5c0b4));knob.position.set(wdt-.12,0,.05);hinge.add(knob);
 hinge.userData.door={open:0,target:0,wdt};slab.userData.houseDoor=hinge;knob.userData.houseDoor=hinge;
 w.pickables.push(slab,knob);w.houseDoors=(w.houseDoors||[]).concat(hinge);return hinge;
}
function houseDoors(w){
 swingingDoor(w,-.55,1.05,4.36,0,.78,2.1);
 swingingDoor(w,-.95,1.05,-1.86,0,.72,2.05);
 swingingDoor(w,1.38,1.05,.15,Math.PI/2,.7,2.05);
 swingingDoor(w,2.35,1.05,-1.86,0,.68,2.0);
}
function pitchedRoof(w){
 const mat=w.surf('wood',0x5a4030);
 const left=new T.Mesh(new T.BoxGeometry(9.3,.09,5.4),mat);left.position.set(0,3.62,-2.15);left.rotation.x=.42;left.castShadow=left.receiveShadow=true;w.root.add(left);
 const right=new T.Mesh(new T.BoxGeometry(9.3,.09,5.4),mat);right.position.set(0,3.62,2.15);right.rotation.x=-.42;right.castShadow=right.receiveShadow=true;w.root.add(right);
 const ridge=new T.Mesh(new T.BoxGeometry(9.4,.08,.18),mat);ridge.position.set(0,4.18,0);w.root.add(ridge);
}
function hangPaintings(w){
 hangPainting(w,-1.2,1.72,4.36,Math.PI,.78,.52,'coast');
 hangPainting(w,-3.55,1.68,-4.36,0,.70,.48,'woods');
 hangPainting(w,3.55,1.70,-4.36,0,.62,.44,'still');
 hangPainting(w,4.36,1.74,.95,-Math.PI/2,.72,.50,'night');
 hangPainting(w,-4.36,1.70,-2.55,Math.PI/2,.58,.46,'woods');
}
export function buildHouse(w){
 const v=(x,y,z)=>new T.Vector3(x,y,z),panel=(x,y,z,sx,sy,sz,hole=()=>false,kind='paperLiving')=>w.fractures.panel(v(x,y,z),v(sx,sy,sz),kind,hole),round=(x,y,z,sx,sy,sz,color,r=.03,kind='wood')=>w.mesh(new RoundedBoxGeometry(sx,sy,sz,2,Math.min(r,Math.min(sx,sy,sz)*.3)),w.surf(kind,color),x,y,z);
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
 panel(-1.52,1.5,-4.45,5.96,3,.15,p=>p.x<-2&&p.x>-3.6&&p.y>1&&p.y<2.3,'paperBed');panel(2.98,1.5,-4.45,3.04,3,.15,()=>false,'paperBath');
 panel(-4.45,1.5,-3.15,.15,3,2.7,()=>false,'paperBed');panel(-4.45,1.5,1.35,.15,3,6.3,p=>Math.abs(p.z)<1.1&&p.y>.9&&p.y<2.3,'paperLiving');
 panel(4.45,1.5,-3.15,.15,3,2.7,()=>false,'paperBath');panel(4.45,1.5,1.35,.15,3,6.3,p=>Math.abs(p.z)<1.1&&p.y>.9&&p.y<2.3,'paperKitchen');
 panel(-1.52,1.5,4.45,5.96,3,.15,p=>p.x>-.6&&p.x<1.2&&p.y<2.25,'paperLiving');panel(2.98,1.5,4.45,3.04,3,.15,()=>false,'paperKitchen');
 panel(0,3.08,0,9,.16,9,()=>false,'plaster');
 panel(-1.52,1.5,-1.8,5.9,3,.13,p=>Math.abs(p.x+.4)<.65&&p.y<2.25,'paperBed');panel(2.95,1.5,-1.8,2.9,3,.13,p=>Math.abs(p.x-3)<.6&&p.y<2.25,'paperBath');
 panel(1.45,1.5,1.35,.13,3,6.3,p=>Math.abs(p.z-.8)<.68&&p.y<2.25,'paperKitchen');panel(1.45,1.5,-3.15,.13,3,2.7,()=>false,'paperBath');
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
 const bedGroup=assemble(-2.7,-3.15,[bedFrame,mattress,headboard,...pillows,blanket],1.65,2.05,'wood',45);bedGroup.userData.smart='sleep';
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
 const fridgeGroup=assemble(3.85,2.57,[fridgeBody,fridgeDoor,fridgeHandle],.89,.77,'metal',80);fridgeGroup.userData.smart='eat';
 const kitchenSeat=w.chair(2.38,2.75,-.4);kitchenSeat.group.traverse(m=>{if(m.isMesh)w.fractures.register(m,'wood');});
 const bath=round(3.55,.30,-3.65,1.2,.59,1.25,0xd6d8cf,.12,'stone');
 const bathWater=round(3.55,.61,-3.65,.91,.02,1.03,0x6e938f,.08,'stone');
 const bathGroup=assemble(3.55,-3.65,[bath,bathWater],1.2,1.25,'stone',90);bathGroup.userData.smart='bath';
 const basin=round(2.1,.77,-3.73,.70,.18,.62,0xdbded5,.08,'stone');
 const basinWater=round(2.1,.865,-3.73,.49,.025,.43,0x8bada9,.06,'stone');
 const basinGroup=assemble(2.1,-3.73,[basin,basinWater],.70,.62,'stone',18);basinGroup.userData.smart='toilet';
 const frame=round(-4.34,1.73,2.0,.04,1.15,.85,0x41392f);w.fractures.register(frame,'wood');round(-4.31,1.73,2.0,.016,.99,.70,0x819c99);
 hangPaintings(w);
 houseDoors(w);
 pitchedRoof(w);
 for(const [x,z,color] of [[-1,0,0xffdec0],[3,1,0xe5efff]]){const light=new T.PointLight(color,10,7,2);light.position.set(x,2.70,z);w.root.add(light);round(x,2.94,z,.40,.04,.40,0xe7dfca);}
 // A seat gets a reachable side approach if its normal approach meets a table.
 for(const seat of w.seats)if(w.blocked(seat.approach,.23)){for(const offset of [[-.85,0,.7],[.85,0,.7],[0,0,1.35]]){const p=seat.group.localToWorld(v(...offset));if(!w.blocked(p,.23)){seat.approach.copy(p);break;}}}
}
