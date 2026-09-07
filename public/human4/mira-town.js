import * as T from 'three';
import {GARMENTS} from './mira-v2-garments.js?v=h4.1';

export const NEED_KEYS=['hunger','energy','bladder','hygiene','fun','social'];
export const JOBS=[
 {id:'cashier',name:'Grocery cashier',pay:18,site:'grocery'},
 {id:'stock',name:'Stock clerk',pay:16,site:'grocery'},
 {id:'farmer',name:'Farm hand',pay:16,site:'farm'},
 {id:'grower',name:'Crop grower',pay:17,site:'farm'},
 {id:'builder',name:'Construction',pay:22,site:'build'},
 {id:'clerk',name:'Phone clerk',pay:20,site:'phone'},
 {id:'coder',name:'Remote work',pay:28,site:'computer'},
 {id:'writer',name:'Copy writer',pay:24,site:'computer'},
 {id:'driver',name:'Courier',pay:19,site:'gas'},
 {id:'attendant',name:'Pump attendant',pay:15,site:'gas'},
 {id:'gardener',name:'Park gardener',pay:14,site:'park'},
 {id:'cook',name:'Home cook',pay:15,site:'home'},
 {id:'sitter',name:'House sitter',pay:13,site:'home'},
 {id:'mechanic',name:'Car mechanic',pay:23,site:'gas'},
 {id:'teacher',name:'Tutor',pay:21,site:'phone'},
 {id:'nurse',name:'Care worker',pay:22,site:'home'},
 {id:'guard',name:'Lot guard',pay:16,site:'build'},
 {id:'artist',name:'Painter',pay:18,site:'park'},
 {id:'vendor',name:'Market vendor',pay:17,site:'grocery'},
 {id:'tech',name:'IT support',pay:26,site:'computer'}
];
const TALK_LINES=['Did you sleep?','The shop has bread.','I can cover a shift.','Walk with me.','You look worn out.','The farm paid today.','Stay for supper.','That plot is empty.','Need a ride?','I missed talking.'];
export const FURNITURE=[
 {id:'chair',name:'Chair',w:.6,d:.6,h:.9},
 {id:'table',name:'Table',w:1.2,d:.7,h:.75},
 {id:'bed',name:'Bed',w:1.6,d:2.0,h:.6},
 {id:'lamp',name:'Lamp',w:.2,d:.2,h:1.4},
 {id:'sofa',name:'Sofa',w:1.6,d:.7,h:.8},
 {id:'desk',name:'Computer desk',w:1.2,d:.6,h:.75},
 {id:'phone',name:'Phone stand',w:.3,d:.3,h:1.1}
];
const PLOT=16,GRID=5,HOME=[2,2];
const NAMES=['Mira','Alex','Jun','Sam','Riley','Noah','Ava','Kai','Quinn','Eden','Lina','Omar','Pia','Wes','Nia','Theo','Ivy','Cole','Mae','Rex','Suki','Ian','Bex','Lou','Nori','Ash','Val','Remy','Kit','Sky','Ada','Leo','Niko','Eve','Jon','Uma','Pax','Ren','Tia','Cal','Zoe','Ari','Max','Inez','Sol','Bea','Hugo','Faye','Ned','Ora'];

function hsl(h,s,l){return new T.Color().setHSL(h,s,l);}
function clamp(x,a,b){return Math.max(a,Math.min(b,x));}

export class TownSim {
 constructor({scene,world,mira,wardrobe,props,renderer,camera,rig,keys}){
  Object.assign(this,{scene,world,mira,wardrobe,props,renderer,camera,rig,keys});
  this.root=new T.Group();scene.add(this.root);
  this.clock=8;this.daySpeed=12;this.plots=[];this.brains=[];this.orders=[];
  this.affinity=new Map();this.pieces=[];this.vfx=[];this.gridSnap=.5;
  this.activePlot=null;this.fps=60;this.saver=false;this.status='Town waking up';
  this.xOpen=false;this.placeKind=null;this.pie=null;this._xPrev=false;this._frame=0;
  this.homeUses=[
   {kind:'sleep',x:-2.7,z:-3.15,r:1.3,label:'Sleep'},
   {kind:'eat',x:3.85,z:2.57,r:1.1,label:'Eat from fridge'},
   {kind:'toilet',x:2.1,z:-3.73,r:.85,label:'Use toilet'},
   {kind:'bath',x:3.55,z:-3.65,r:.95,label:'Bathe'},
   {kind:'sit',x:-2.5,z:-.8,r:1.1,label:'Sit'},
   {kind:'computer',x:.15,z:1.5,r:.9,label:'Use computer'}
  ];
  this.buildTown();
  this.buildSun();
  this.buildPie();
  this.buildXPanel();
  this.seedJobs();
  this.seedBrains();
  this.world.extent=Math.max(this.world.extent||4,PLOT*2.7);
  this.hookWorld();
  if(this.props.vehicle)this.props.vehicle.fuel=this.props.vehicle.fuel??48;
  addEventListener('keydown',e=>{if(e.code==='Escape'){this.closePie();this.placeKind=null;this.xOpen=false;this.xMesh.visible=false;this.status='Cancelled';}});
 }

 plotAt(ix,iz){return this.plots.find(p=>p.ix===ix&&p.iz===iz);}
 plotWorld(x,z){return this.plots.find(p=>Math.abs(x-p.cx)<PLOT/2&&Math.abs(z-p.cz)<PLOT/2)||this.home;}

 buildTown(){
  const kinds={};
  kinds[HOME.join(',')]= 'home';
  kinds[[HOME[0]+1,HOME[1]].join(',')]='grocery';
  kinds[[HOME[0]-1,HOME[1]].join(',')]='farm';
  kinds[[HOME[0],HOME[1]+1].join(',')]='gas';
  kinds[[HOME[0],HOME[1]-1].join(',')]='park';
  kinds[[HOME[0]+1,HOME[1]+1].join(',')]='phone';
  for(let ix=0;ix<GRID;ix++)for(let iz=0;iz<GRID;iz++){
   const cx=(ix-HOME[0])*PLOT,cz=(iz-HOME[1])*PLOT;
   const key=ix+','+iz,kind=kinds[key]||'empty';
   const plot={ix,iz,cx,cz,kind,ownedBy:kind==='home'?'player':null,group:new T.Group(),prefab:null};
   plot.group.position.set(cx,0,cz);this.root.add(plot.group);
   const grass=new T.Mesh(new T.PlaneGeometry(PLOT-1.1,PLOT-1.1),new T.MeshStandardMaterial({color:kind==='farm'?0x6b5a3a:kind==='gas'?0x5a5a58:0x6d7d55,roughness:.95}));
   grass.rotation.x=-Math.PI/2;grass.position.y=-.02;grass.receiveShadow=true;plot.group.add(grass);
   const curb=new T.Mesh(new T.BoxGeometry(PLOT,.04,PLOT),new T.MeshStandardMaterial({color:0x7a7a74,roughness:.9}));
   curb.position.y=-.06;plot.group.add(curb);
   if(kind!=='home')this.fillPlot(plot);
   this.plots.push(plot);
   if(kind==='home')this.home=plot;
  }
  const roadMat=new T.MeshStandardMaterial({color:0x3a3a3c,roughness:.92});
  for(let i=0;i<=GRID;i++){
   const a=(i-HOME[0])*PLOT-PLOT/2;
   const hx=new T.Mesh(new T.BoxGeometry(PLOT*GRID+2,.03,1.15),roadMat);hx.position.set(0,-.01,a);this.root.add(hx);
   const hz=new T.Mesh(new T.BoxGeometry(1.15,.03,PLOT*GRID+2),roadMat);hz.position.set(a,-.01,0);this.root.add(hz);
  }
 }

 fillPlot(plot){
  const g=plot.group,kind=plot.kind;
  if(kind==='grocery'){
   const shop=new T.Mesh(new T.BoxGeometry(6.2,3.1,5.2),new T.MeshStandardMaterial({color:0xc9c4b6,roughness:.8}));
   shop.position.set(0,1.55,0);shop.castShadow=true;g.add(shop);
   const awning=new T.Mesh(new T.BoxGeometry(6.4,.08,1.4),new T.MeshStandardMaterial({color:0xb03a3a}));awning.position.set(0,2.55,2.9);g.add(awning);
   plot.uses=[{kind:'buy',x:plot.cx,z:plot.cz+2.4,r:1.4,label:'Buy groceries'},{kind:'work',job:'cashier',x:plot.cx,z:plot.cz,r:1.2,label:'Work cashier'}];
  }else if(kind==='farm'){
   for(let r=0;r<4;r++)for(let c=0;c<5;c++){
    const crop=new T.Mesh(new T.BoxGeometry(.35,.35,.35),new T.MeshStandardMaterial({color:r%2?0x4d7a38:0x8a9a3a}));
    crop.position.set(-3+c*1.4,.18,-2.4+r*1.4);g.add(crop);
   }
   const shed=new T.Mesh(new T.BoxGeometry(2.4,2.2,3.1),new T.MeshStandardMaterial({color:0x8a6a48}));shed.position.set(4.2,1.1,0);g.add(shed);
   plot.uses=[{kind:'work',job:'farmer',x:plot.cx,z:plot.cz,r:2,label:'Work farm'},{kind:'buy',x:plot.cx+4.2,z:plot.cz,r:1,label:'Buy produce'}];
  }else if(kind==='gas'){
   const canopy=new T.Mesh(new T.BoxGeometry(7,.12,5.2),new T.MeshStandardMaterial({color:0xd8c45a,roughness:.5}));canopy.position.set(0,3.1,0);g.add(canopy);
   for(const x of [-1.6,1.6]){const pump=new T.Mesh(new T.BoxGeometry(.45,1.5,.35),new T.MeshStandardMaterial({color:0x2a4a8a}));pump.position.set(x,.75,0);g.add(pump);}
   const shop=new T.Mesh(new T.BoxGeometry(3.4,2.6,3.4),new T.MeshStandardMaterial({color:0xd0d4d6}));shop.position.set(4.5,1.3,-3.4);g.add(shop);
   plot.uses=[{kind:'fuel',x:plot.cx,z:plot.cz,r:2.2,label:'Fill tank'},{kind:'work',job:'driver',x:plot.cx+4.5,z:plot.cz-3.4,r:1.2,label:'Courier shift'}];
  }else if(kind==='park'){
   for(const [x,z] of [[-3,-2],[3,2],[-2,3]]){const t=new T.Mesh(new T.CylinderGeometry(.12,.18,2.4,8),new T.MeshStandardMaterial({color:0x6a5238}));t.position.set(x,1.2,z);g.add(t);const c=new T.Mesh(new T.SphereGeometry(.9,8,6),new T.MeshStandardMaterial({color:0x3f6a38}));c.position.set(x,2.5,z);g.add(c);}
   const bench=new T.Mesh(new T.BoxGeometry(1.6,.12,.4),new T.MeshStandardMaterial({color:0x6a5340}));bench.position.set(0,.42,0);g.add(bench);
   plot.uses=[{kind:'sleep',x:plot.cx,z:plot.cz,r:1.2,label:'Sleep on bench'},{kind:'talk',x:plot.cx,z:plot.cz,r:2,label:'Chat'}];
  }else if(kind==='phone'){
   const office=new T.Mesh(new T.BoxGeometry(5.5,3.2,5.5),new T.MeshStandardMaterial({color:0x9aa7b0}));office.position.set(0,1.6,0);g.add(office);
   plot.uses=[{kind:'work',job:'clerk',x:plot.cx,z:plot.cz,r:1.4,label:'Phone job'},{kind:'work',job:'coder',x:plot.cx,z:plot.cz,r:1.4,label:'Computer job'}];
  }else{
   plot.uses=[{kind:'build',x:plot.cx,z:plot.cz,r:3,label:'Build here'}];
  }
 }

 prefabHouse(plot){
  if(plot.prefab)return plot.prefab;
  const g=new T.Group();plot.group.add(g);
  const body=new T.Mesh(new T.BoxGeometry(5.2,2.7,4.6),new T.MeshStandardMaterial({color:0xd8cbb8,roughness:.85}));body.position.y=1.35;g.add(body);
  const roof=new T.Mesh(new T.ConeGeometry(4.1,1.3,4),new T.MeshStandardMaterial({color:0x6a4030}));roof.position.y=3.2;roof.rotation.y=Math.PI/4;g.add(roof);
  plot.prefab=g;plot.kind='house';return g;
 }

 buildSun(){
  this.sun=new T.DirectionalLight(0xfff1d6,.35);this.sun.castShadow=false;this.sun.position.set(4,10,3);
  this.scene.add(this.sun);this.hemi=new T.HemisphereLight(0x9ecbff,0x6a5a48,.22);this.scene.add(this.hemi);
 }
 seedJobs(){
  this.jobSlots=[];
  const sites={grocery:'grocery',farm:'farm',gas:'gas',phone:'phone',park:'park',empty:'build',house:'home',home:'home'};
  for(const p of this.plots){
   const site=sites[p.kind]||'build';
   const pool=JOBS.filter(j=>j.site===site||(p.kind==='phone'&&j.site==='computer')||(p.kind==='empty'&&j.site==='build')||(p.kind==='home'&&(j.site==='home'||j.site==='computer')));
   const n=p.kind==='home'?8:4;
   for(let i=0;i<n;i++){
    const job=pool[i%Math.max(1,pool.length)]||JOBS[this.jobSlots.length%JOBS.length];
    this.jobSlots.push({id:this.jobSlots.length,job,x:p.cx+(i%2?1.6:-1.6),z:p.cz+(i<2?-1.4:1.4),holder:null,plot:p});
   }
  }
  while(this.jobSlots.length<100){
   const p=this.plots[this.jobSlots.length%this.plots.length];
   const job=JOBS[this.jobSlots.length%JOBS.length];
   this.jobSlots.push({id:this.jobSlots.length,job,x:p.cx,z:p.cz,holder:null,plot:p});
  }
  this.jobSlots=this.jobSlots.slice(0,100);
 }

 buildPie(){
  const c=document.createElement('canvas');c.width=512;c.height=512;this.pieCtx=c.getContext('2d');
  this.pieTex=new T.CanvasTexture(c);this.pieTex.colorSpace=T.SRGBColorSpace;
  this.pieMesh=new T.Mesh(new T.CircleGeometry(.42,28),new T.MeshBasicMaterial({map:this.pieTex,transparent:true,toneMapped:false,depthTest:false}));
  this.pieMesh.renderOrder=22;this.pieMesh.visible=false;this.scene.add(this.pieMesh);this.pieItems=[];
 }
 buildXPanel(){
  const c=document.createElement('canvas');c.width=640;c.height=880;this.xCtx=c.getContext('2d');
  this.xTex=new T.CanvasTexture(c);this.xTex.colorSpace=T.SRGBColorSpace;
  this.xMesh=new T.Mesh(new T.PlaneGeometry(.62,.86),new T.MeshBasicMaterial({map:this.xTex,toneMapped:false,depthTest:false}));
  this.xMesh.renderOrder=21;this.xMesh.visible=false;this.scene.add(this.xMesh);this.drawX();
 }
 drawX(){
  const ctx=this.xCtx;ctx.fillStyle='#15202b';ctx.fillRect(0,0,640,880);
  ctx.strokeStyle='#8eb6d6';ctx.strokeRect(6,6,628,868);
  ctx.fillStyle='#eef6ff';ctx.font='bold 32px sans-serif';ctx.fillText('FURNITURE · BUILD',28,52);
  ctx.font='22px sans-serif';ctx.fillStyle='#b7c8d8';ctx.fillText('X closes · trigger places on snap grid',28,88);
  this.xItems=[];
  FURNITURE.forEach((f,i)=>{const y=120+i*72;ctx.fillStyle=this.placeKind===f.id?'#3a5a78':'#26384b';ctx.fillRect(28,y,584,64);ctx.fillStyle='#edf6ff';ctx.font='26px sans-serif';ctx.fillText(f.name,48,y+42);this.xItems.push({x:28,y,w:584,h:64,id:f.id,type:'furn'});});
  [['wall','Snap wall'],['floor','Snap floor']].forEach((row,i)=>{const y=640+i*72;ctx.fillStyle=this.placeKind===row[0]?'#3a5a78':'#26384b';ctx.fillRect(28,y,584,64);ctx.fillStyle='#edf6ff';ctx.font='26px sans-serif';ctx.fillText(row[1],48,y+42);this.xItems.push({x:28,y,w:584,h:64,id:row[0],type:'build'});});
  this.xTex.needsUpdate=true;
 }

 seedBrains(){
  for(let i=0;i<50;i++){
   const plot=this.plots[i%this.plots.length];
   const homeless=i>18||plot.kind==='empty'||plot.kind==='park';
   const b={
    id:i,name:NAMES[i%NAMES.length],x:plot.cx+(Math.random()-.5)*6,z:plot.cz+(Math.random()-.5)*6,
    needs:{hunger:50+Math.random()*40,energy:50+Math.random()*40,bladder:10+Math.random()*40,hygiene:50+Math.random()*40,fun:40+Math.random()*40,social:40+Math.random()*40},
    cash:20+Math.random()*70,job:null,home:homeless?null:plot,inventory:{food:Math.random()>.5?1:0,items:[]},
    actor:null,queue:[],greed:Math.random(),altruism:Math.random(),starved:0,alive:true,hairColor:i%5===0?0:i%4,bodyType:i%7===0?'male':'female'
   };
   if(!homeless){plot.ownedBy=plot.ownedBy||('npc-'+b.id);if(plot.kind==='empty')this.prefabHouse(plot);}
   const slot=this.jobSlots[i];if(slot){b.job=slot.job;slot.holder=b;}
   this.brains.push(b);
  }
 }

 attachPlayer(actor){
  this.playerBrain={id:'player',name:actor.displayName||'Mira',x:actor.group.position.x,z:actor.group.position.z,needs:{hunger:70,energy:80,bladder:20,hygiene:80,fun:60,social:55},cash:120,job:null,home:this.home,inventory:{food:2,items:['keys','phone']},actor,queue:[],greed:.35,altruism:.65,starved:0,alive:true,player:true};
  this.brains.unshift(this.playerBrain);
  actor.townRange=48;actor.hairColor=0;actor.autoWander=false;actor.dest=null;actor.setMode?.('idle');actor.applyLooks?.();
 }

 hookWorld(){
  const prev=this.world.command.bind(this.world);
  this.world.command=(ray,actor)=>this.command(ray,actor)||prev(ray,actor);
 }

 key(a,b){return a.id+'/'+b.id;}
 getAff(a,b){return this.affinity.get(this.key(a,b))||0;}
 addAff(a,b,n){const k=this.key(a,b);this.affinity.set(k,(this.affinity.get(k)||0)+n);}

 command(ray,actor){
  const rc=new T.Raycaster();rc.ray.copy(ray);
  if(this.xOpen){
   const hit=rc.intersectObject(this.xMesh)[0];
   if(hit){const x=hit.uv.x*640,y=(1-hit.uv.y)*880;const it=this.xItems.find(a=>x>=a.x&&x<=a.x+a.w&&y>=a.y&&y<=a.y+a.h);if(it){this.placeKind=it.id;this.drawX();this.status='Placing '+it.id+' · click ground · Esc cancels';}return 'catalog';}
  }
  if(this.pie?.open){
   const hit=rc.intersectObject(this.pieMesh)[0];
   if(hit){const ang=Math.atan2(hit.uv.y-.5,hit.uv.x-.5);const u=((ang+Math.PI)/(Math.PI*2)+1)%1;const i=Math.floor(u*this.pieItems.length);this.pickPie(i);return 'pie';}
   this.closePie();
  }
  if(this.placeKind&&this.xOpen){
   const p=ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());
   if(p){this.place(this.placeKind,p.x,p.z);return 'build';}
  }
  const doorHit=rc.intersectObjects(this.world.houseDoors?.flatMap(h=>h.children)||[],true)[0];
  if(doorHit){const h=doorHit.object.userData.houseDoor||doorHit.object.parent;if(h?.userData.door){h.userData.door.target=h.userData.door.target>.5?0:1;this.status='Door '+(h.userData.door.target?'opened':'closed');return 'door';}}
  const npc=this.hitNpc(ray);
  if(npc?.actor){this.mira.select(npc.actor);this.status='Selected '+npc.name;return 'npc';}
  const use=this.hitUse(ray);
  if(use&&actor){this.openPie(actor,use);return 'pie';}
  return null;
 }

 hitUse(ray){
  const p=ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),new T.Vector3());if(!p)return null;
  let best=null,bd=.72;
  for(const u of this.allUses()){const d=Math.hypot(u.x-p.x,u.z-p.z);if(d<bd&&d<(u.r||.8)*.75){bd=d;best=u;}}
  return best;
 }
 hitNpc(ray){
  const rc=new T.Raycaster();rc.ray.copy(ray);
  for(const b of this.brains){if(!b.actor)continue;const meshes=[];b.actor.root.traverse(m=>{if(m.isSkinnedMesh)meshes.push(m);});if(rc.intersectObjects(meshes,false)[0])return b;}
  return null;
 }
 allUses(){
  const list=this.homeUses.map(u=>({...u}));
  for(const p of this.plots)if(p.uses)for(const u of p.uses)list.push(u);
  return list;
 }

 openPie(actor,use){
  const items=[];
  if(use.kind==='sleep')items.push({label:'Sleep',act:'sleep',use});
  if(use.kind==='eat'||use.kind==='buy')items.push({label:'Eat / buy food',act:'eat',use});
  if(use.kind==='toilet')items.push({label:'Use toilet',act:'toilet',use});
  if(use.kind==='bath')items.push({label:'Bathe',act:'bath',use});
  if(use.kind==='sit')items.push({label:'Sit',act:'sit',use});
  if(use.kind==='work')items.push({label:'Go to work',act:'work',use});
  if(use.kind==='fuel')items.push({label:'Refuel car',act:'fuel',use});
  if(use.kind==='talk')items.push({label:'Talk',act:'talk',use});
  if(use.kind==='computer')items.push({label:'Internet job',act:'computer',use});
  if(use.kind==='build')items.push({label:'Build wall',act:'build',use});
  items.push({label:'Walk here',act:'walk',use});
  this.pie={open:true,actor,use,items};this.pieItems=items;this.drawPie();
  const eye=this.renderer.xr.isPresenting?this.renderer.xr.getCamera().getWorldPosition(new T.Vector3()):this.camera.position.clone();
  this.pieMesh.position.set(use.x,1.2,use.z);this.pieMesh.lookAt(eye);this.pieMesh.visible=true;
 }
 drawPie(){
  const ctx=this.pieCtx,n=this.pieItems.length||1;ctx.clearRect(0,0,512,512);
  this.pieItems.forEach((it,i)=>{ctx.beginPath();ctx.moveTo(256,256);ctx.arc(256,256,240,i/n*Math.PI*2-Math.PI/2,(i+1)/n*Math.PI*2-Math.PI/2);ctx.closePath();ctx.fillStyle=i%2?'#2a4158':'#1d3144';ctx.fill();ctx.strokeStyle='#9bd6ff';ctx.stroke();ctx.fillStyle='#edf6ff';ctx.font='22px sans-serif';ctx.textAlign='center';const a=(i+.5)/n*Math.PI*2-Math.PI/2;ctx.fillText(it.label,256+Math.cos(a)*130,256+Math.sin(a)*130);});
  this.pieTex.needsUpdate=true;
 }
 pickPie(i){
  const it=this.pieItems[i];if(!it)return;const brain=this.brainOf(this.pie.actor)||this.playerBrain;
  if(brain){brain.queue.push({act:it.act,use:it.use,fromPlayer:true});this.status='Ordered '+brain.name+' to '+it.label;}
  this.closePie();
 }
 closePie(){if(this.pie)this.pie.open=false;this.pieMesh.visible=false;}

 brainOf(actor){return this.brains.find(b=>b.actor===actor);}

 place(kind,x,z){
  const gx=Math.round(x/this.gridSnap)*this.gridSnap,gz=Math.round(z/this.gridSnap)*this.gridSnap;
  const plot=this.plotWorld(gx,gz);
  if(plot.ownedBy&&plot.ownedBy!=='player'){this.status='That plot is owned';return;}
  const furn=FURNITURE.find(f=>f.id===kind);
  const h=furn?.h||(kind==='wall'?2.2:.08),w=furn?.w||(kind==='wall'?this.gridSnap:.5),d=furn?.d||(kind==='wall'?.12:(kind==='floor'?this.gridSnap:.5));
  const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color:kind==='wall'?0xcfc6b8:kind==='floor'?0xb48a5a:kind==='bed'?0xe0d8c9:kind==='sofa'?0x677e74:kind==='lamp'?0xf2e6c4:0x7a6a58,roughness:.85}));
  mesh.position.set(gx,h/2,gz);mesh.castShadow=true;this.scene.add(mesh);
  this.world.obstacle(gx,gz,furn?.w||.5,furn?.d||.5,0,furn?.h||(kind==='wall'?2.2:.08),mesh,kind==='wall'?0:18);
  this.pieces.push({kind,x:gx,z:gz,mesh});
  this.burst(gx,gz);this.status='Placed '+kind+' on snap grid';
  if(kind==='wall'||kind==='floor')this.hireCrew(plot);
 }
 hireCrew(plot){
  const crew=this.brains.filter(b=>b.alive).slice(0,2);
  crew.forEach(b=>b.queue.unshift({act:'work',use:{kind:'work',job:'builder',x:plot.cx,z:plot.cz,r:2},fromPlayer:true}));
 }
 burst(x,z){
  for(let i=0;i<10;i++)this.vfx.push({mesh:(()=>{const m=new T.Mesh(new T.SphereGeometry(.04,4,4),new T.MeshBasicMaterial({color:0xd8c4a0,transparent:true,opacity:1}));m.position.set(x,.2+Math.random()*.4,z);this.scene.add(m);return m;})(),v:new T.Vector3((Math.random()-.5)*1.2,1+Math.random(),(Math.random()-.5)*1.2),age:0});
 }

 embody(b){
  if(b.actor||b.player||!b.alive)return;
  if(this.mira.actors.length>=8)return;
  try{
   const keep=this.mira.selected;
   const a=this.mira.spawn({version:'v2',position:new T.Vector3(b.x,0,b.z),name:b.name,bodyType:b.bodyType,hairColor:b.hairColor,hairStyle:b.id%4,faceType:b.id%6});
   a.displayName=b.name;a.townRange=48;a.applyLooks?.();
   b.actor=a;
   const g=GARMENTS[b.id%GARMENTS.length];this.wardrobe.equip(a,{...g,color:g.color});
   if(keep)this.mira.select(keep);
  }catch(e){this.status='Embody failed: '+e.message;}
 }
 disembody(b){
  if(!b.actor||b.player)return;
  b.x=b.actor.group.position.x;b.z=b.actor.group.position.z;
  this.mira.remove(b.actor);b.actor=null;
 }

 syncCells(){
  const p=this.rig.position;const plot=this.plotWorld(p.x,p.z);this.activePlot=plot;
  for(const pl of this.plots){
   const near=Math.abs(pl.ix-plot.ix)<=1&&Math.abs(pl.iz-plot.iz)<=1;
   pl.group.visible=near||pl===this.home;
  }
  for(const b of this.brains){
   if(b.player)continue;
   const on=this.plotWorld(b.x,b.z)===plot;
   if(on)this.embody(b);else if(b.actor)this.disembody(b);
  }
 }

 tickDay(dt){
  this.clock=(this.clock+dt*this.daySpeed/60)%24;
  const elev=Math.sin(clamp((this.clock-5.5)/13,0,1)*Math.PI);
  const night=this.clock<6||this.clock>20;
  this.sun.intensity=night?.04:Math.max(.12,elev*.4);
  this.sun.color.set(night?0x8899cc:0xfff1d6);
  this.sun.position.set(Math.cos((this.clock-6)/12*Math.PI)*8,Math.max(.4,elev*10),Math.sin((this.clock-6)/12*Math.PI)*8);
  this.hemi.intensity=night?.12:.28;
  const sky=night?new T.Color(0x1a2230):elev<.2?new T.Color(0x6a4a58):new T.Color(0xc2b5a3);
  this.scene.background=sky;
  if(this.scene.fog){this.scene.fog.color.copy(sky);this.scene.fog.near=18;this.scene.fog.far=58;}
 }

 tickDoors(dt){
  for(const h of this.world.houseDoors||[]){
   const d=h.userData.door;if(!d)continue;
   if(h.userData.baseY==null)h.userData.baseY=h.rotation.y;
   d.open+=(d.target-d.open)*(1-Math.exp(-dt*5));
   h.rotation.y=h.userData.baseY+d.open*1.2;
  }
 }

 tickNeeds(b,dt){
  if(!b.alive)return;
  const moving=b.actor?.speed>0.05;
  b.needs.hunger=clamp(b.needs.hunger-dt*.28,0,100);
  b.needs.energy=clamp(b.needs.energy-dt*(moving?.35:.16),0,100);
  b.needs.bladder=clamp(b.needs.bladder+dt*.22,0,100);
  b.needs.hygiene=clamp(b.needs.hygiene-dt*.12,0,100);
  b.needs.fun=clamp(b.needs.fun-dt*.14,0,100);
  b.needs.social=clamp(b.needs.social-dt*.1,0,100);
  if(b.needs.hunger<=0.5){b.starved+=dt;if(b.starved>80){b.alive=false;this.status=b.name+' starved';b.actor?.knockDown?.(new T.Vector3(0,1,0),new T.Vector3(0,.2,0));}}
  else b.starved=Math.max(0,b.starved-dt);
 }

 plan(b){
  if(b.queue.length)return b.queue[0];
  if(b.player)return null;
  const n=b.needs;
  if(n.bladder>88)return {act:'toilet',use:this.homeUses.find(u=>u.kind==='toilet')};
  if(n.energy<18)return {act:'sleep',use:b.home?this.homeUses.find(u=>u.kind==='sleep'):this.plots.find(p=>p.kind==='park')?.uses[0]};
  if(n.hunger<28){
   if(b.inventory.food)return {act:'eat',use:this.homeUses.find(u=>u.kind==='eat')};
   if(b.cash>=8)return {act:'eat',use:this.plots.find(p=>p.kind==='grocery')?.uses[0]};
   return {act:'work',use:this.jobUse(b)};
  }
  if(n.hygiene<18)return {act:'bath',use:this.homeUses.find(u=>u.kind==='bath')};
  if(n.fun<22||n.social<22)return {act:'talk'};
  if(b.cash<18)return {act:'work',use:this.jobUse(b)};
  if(b.altruism>.7){const needy=this.brains.find(o=>o!==b&&o.alive&&o.needs.hunger<20&&o.inventory.food===0);if(needy&&b.inventory.food)return {act:'share',target:needy};}
  return {act:'wander'};
 }
 jobUse(b){
  const slot=this.jobSlots.find(s=>s.holder===b)||this.jobSlots[(b.id||0)%this.jobSlots.length];
  const job=b.job||slot?.job||JOBS[0];
  return {kind:'work',job:job.id,x:slot?.x??b.x,z:slot?.z??b.z,r:1.6,label:job.name};
 }
 steerTo(b,tx,tz){
  if(!b.actor){b.x+=(tx-b.x)*.35;b.z+=(tz-b.z)*.35;return;}
  const dest=new T.Vector3(tx,0,tz),here=b.actor.group.position;
  if(!b.actor.dest||b.actor.dest.distanceTo(dest)>.9){
   b.actor.autoWander=true;b.actor.setMode('wander');b.actor.dest=dest.clone();b.actor.directedWalk=dest.clone();
   if(Math.hypot(here.x-tx,here.z-tz)<9)this.world.walk(b.actor,dest);
  }
 }

 applyAct(b,act,dt){
  if(!act)return true;
  if(act.act==='wander'){if(b.actor&&!b.actor.dest){const p=this.plotWorld(b.x,b.z);b.actor.dest=new T.Vector3(p.cx+(Math.random()-.5)*5,0,p.cz+(Math.random()-.5)*5);b.actor.setMode('wander');b.actor.autoWander=true;}return false;}
  const use=act.use;const tx=use?.x??b.x,tz=use?.z??b.z;
  if(Math.hypot((b.actor?b.actor.group.position.x:b.x)-tx,(b.actor?b.actor.group.position.z:b.z)-tz)>1.15){
   this.steerTo(b,tx,tz);return false;
  }
  if(act.act==='sleep'){b.needs.energy=clamp(b.needs.energy+dt*14,0,100);if(b.needs.energy>92)return true;}
  else if(act.act==='eat'){
   if(b.inventory.food>0){b.inventory.food--;b.needs.hunger=clamp(b.needs.hunger+55,0,100);return true;}
   if(b.cash>=8){b.cash-=8;b.inventory.food+=1;(b.inventory.items||(b.inventory.items=[])).push('groceries');b.needs.hunger=clamp(b.needs.hunger+40,0,100);return true;}
   return true;
  }
  else if(act.act==='toilet'){b.needs.bladder=0;return true;}
  else if(act.act==='bath'){b.needs.hygiene=100;return true;}
  else if(act.act==='sit'){b.needs.fun=clamp(b.needs.fun+dt*8,0,100);if(b.actor)this.world.walk(b.actor,new T.Vector3(tx,0,tz),this.world.seats[0]);return b.needs.fun>70;}
  else if(act.act==='work'){
   const job=JOBS.find(j=>j.id===(use?.job||b.job?.id))||JOBS[0];
   b.job=job;b.cash+=job.pay*dt*.15;b.needs.fun=clamp(b.needs.fun-dt*.2,0,100);b.needs.energy=clamp(b.needs.energy-dt*.25,0,100);
   if(b.cash>job.pay*2&&!act.fromPlayer)return true;return false;
  }
  else if(act.act==='talk'){
   const other=this.nearestBrain(b,6);if(!other)return true;
   b.needs.social=clamp(b.needs.social+dt*10,0,100);b.needs.fun=clamp(b.needs.fun+dt*8,0,100);
   other.needs.social=clamp(other.needs.social+dt*8,0,100);
   this.addAff(b,other,dt*4);this.addAff(other,b,dt*4);
   if(b.actor)b.actor.setEmotion?.('happy',.5,{source:'talk'});
   if(other.actor)other.actor.setEmotion?.('content',.4,{source:'talk'});
   if(!act._said){act._said=true;const line=TALK_LINES[Math.abs((Number(b.id)||0)+(Number(other.id)||1))%TALK_LINES.length];this.status=b.name+': "'+line+'"';const log=document.getElementById('chatLog');if(log){const p=document.createElement('p');p.textContent=b.name+': '+line;log.append(p);log.scrollTop=log.scrollHeight;}}
   return b.needs.social>75;
  }
  else if(act.act==='computer'){
   b.job=b.job||JOBS.find(j=>j.site==='computer')||JOBS[6];
   b.cash+= (b.job.pay||24)*dt*.18;b.needs.fun=clamp(b.needs.fun-dt*.12,0,100);
   this.status=b.name+' on a remote shift';
   if(b.cash>80&&!act.fromPlayer)return true;return false;
  }
  else if(act.act==='share'&&act.target){if(b.inventory.food){b.inventory.food--;act.target.inventory.food=(act.target.inventory.food||0)+1;this.addAff(act.target,b,12);}return true;}
  else if(act.act==='fuel'){if(this.props.vehicle){const cost=Math.max(0,48-(this.props.vehicle.fuel||0))*1.4;if((this.playerBrain?.cash||0)>=cost){this.playerBrain.cash-=cost;this.props.vehicle.fuel=48;this.status='Tank filled';}}return true;}
  else if(act.act==='walk'){this.steerTo(b,tx,tz);return Math.hypot((b.actor?b.actor.group.position.x:b.x)-tx,(b.actor?b.actor.group.position.z:b.z)-tz)<1.2;}
  else if(act.act==='build'){this.place('wall',tx,tz);return true;}
  return true;
 }
 nearestBrain(b,r){let best=null,bd=r;for(const o of this.brains){if(o===b||!o.alive)continue;const d=Math.hypot((o.actor?o.actor.group.position.x:o.x)-(b.actor?b.actor.group.position.x:b.x),(o.actor?o.actor.group.position.z:o.z)-(b.actor?b.actor.group.position.z:b.z));if(d<bd){bd=d;best=o;}}return best;}

 tickBrains(dt){
  const step=this.saver?2:1;
  for(let i=this._frame%step;i<this.brains.length;i+=step){
   const b=this.brains[i];if(!b.alive)continue;
   this.tickNeeds(b,dt*step);
   if(b.actor){b.x=b.actor.group.position.x;b.z=b.actor.group.position.z;}
   const act=this.plan(b);if(!act)continue;
   if(this.applyAct(b,act,dt*step)){if(b.queue[0]===act)b.queue.shift();}
  }
 }

 buyPaint(){
  const car=this.props.vehicle,b=this.playerBrain;if(!car||!b)return;
  if(b.cash<45){this.status='Need $45 for a respray';return;}
  b.cash-=45;const colors=[0x28586b,0x8b1e2d,0x1c1c1c,0xd8d4cc,0x2f5a3c,0x1e3354];
  const hex=colors[Math.floor(Math.random()*colors.length)];
  for(const p of car.parts)if(/Chassis|Hood|bumper|door/i.test(p.name)&&p.mesh.material?.color)p.mesh.material.color.setHex(hex);
  (b.inventory.items||(b.inventory.items=[])).push('paint receipt');
  this.status='Respray purchased';
 }
 buyWheels(){
  const car=this.props.vehicle,b=this.playerBrain;if(!car||!b)return;
  if(b.cash<60){this.status='Need $60 for chrome wheels';return;}
  b.cash-=60;
  for(const w of car.wheels)w.group.traverse(m=>{if(m.material&&m.material.metalness!=null){m.material.color?.setHex(0xe8eef2);m.material.metalness=.92;m.material.roughness=.18;}});
  (b.inventory.items||(b.inventory.items=[])).push('chrome wheels');
  this.status='Chrome wheels fitted';
 }
 tickCar(dt){
  const car=this.props.vehicle;if(!car)return;
  car.fuel=car.fuel??48;
  if(car.driving){const spd=car.velocity.length();car.fuel=Math.max(0,car.fuel-dt*spd*.08);if(car.fuel<=0){car.velocity.multiplyScalar(Math.exp(-dt*2.5));this.status='Out of fuel · visit the gas plot';}}
 }

 tickX(){
  const session=this.renderer.xr.getSession?.();
  let xDown=!!this.keys.KeyX;
  if(session)for(const src of session.inputSources)if(src.handedness==='left'&&src.gamepad?.buttons?.[4]?.pressed)xDown=true;
  if(this.props.vehicle?.driving){this._xPrev=xDown;return;}
  if(xDown&&!this._xPrev){this.xOpen=!this.xOpen;this.xMesh.visible=this.xOpen;if(this.xOpen){const eye=this.renderer.xr.isPresenting?this.renderer.xr.getCamera().getWorldPosition(new T.Vector3()):this.camera.position.clone();const q=this.renderer.xr.isPresenting?this.renderer.xr.getCamera().getWorldQuaternion(new T.Quaternion()):this.camera.quaternion;const f=new T.Vector3(0,0,-1).applyQuaternion(q);f.y=0;if(f.lengthSq()<1e-4)f.set(0,0,-1);f.normalize();this.xMesh.position.copy(eye).addScaledVector(f,.78);this.xMesh.position.y=eye.y-.05;this.xMesh.lookAt(eye);this.drawX();}}
  this._xPrev=xDown;
  if(this.xOpen&&this.renderer.xr.isPresenting){const eye=this.renderer.xr.getCamera().getWorldPosition(new T.Vector3());if(this.xMesh.position.distanceTo(eye)>.95){const f=new T.Vector3(0,0,-1).applyQuaternion(this.renderer.xr.getCamera().getWorldQuaternion(new T.Quaternion()));f.y=0;f.normalize();this.xMesh.position.copy(eye).addScaledVector(f,.78);this.xMesh.lookAt(eye);}}
 }

 tickVfx(dt){
  for(const p of this.vfx){p.age+=dt;p.v.y-=8*dt;p.mesh.position.addScaledVector(p.v,dt);p.mesh.material.opacity=Math.max(0,1-p.age*2);if(p.age>0.7)this.scene.remove(p.mesh);}
  this.vfx=this.vfx.filter(p=>p.age<=.7);
 }

 hud(){
  const clock=document.getElementById('townClock');
  if(clock){const h=Math.floor(this.clock),m=Math.floor((this.clock%1)*60);clock.textContent=(h%24).toString().padStart(2,'0')+':'+m.toString().padStart(2,'0')+(this.clock<6||this.clock>20?' night':' day')+' · plot '+this.activePlot?.kind+' · '+this.brains.filter(b=>b.actor).length+' bodies / '+this.brains.length+' minds · '+(this.jobSlots?.length||0)+' jobs · fps '+this.fps.toFixed(0)+(this.saver?' · saver':'');}
  const bars=document.getElementById('needBars');const b=this.brainOf(this.mira.selected)||this.playerBrain;
  if(bars&&b){const bag=(b.inventory.items||[]).slice(-4).join(', ')||'empty';bars.innerHTML=NEED_KEYS.map(k=>`<label>${k} <meter min="0" max="100" value="${b.needs[k].toFixed(0)}"></meter> ${b.needs[k].toFixed(0)}</label>`).join('')+`<p>$${b.cash.toFixed(0)} · food ${b.inventory.food||0} · ${b.job?b.job.name:'unemployed'} · ${b.home?'housed':'homeless'} · bag: ${bag}</p>`;}
  const st=document.getElementById('townStatus');if(st)st.textContent=this.status+(this.props.vehicle?` · fuel ${(this.props.vehicle.fuel||0).toFixed(0)} L`:'');
 }

 tick(dt,fps){
  this._frame++;this.fps=fps||this.fps;this.saver=this.fps<42;
  if(this.world.name!=='Living room'){this.root.visible=false;return;}
  this.root.visible=true;
  this.tickDay(dt);this.tickDoors(dt);this.syncCells();this.tickBrains(dt);this.tickCar(dt);this.tickX();this.tickVfx(dt);
  if(this.pie?.open){const eye=this.renderer.xr.isPresenting?this.renderer.xr.getCamera().getWorldPosition(new T.Vector3()):this.camera.position.clone();this.pieMesh.lookAt(eye);}
  this.hud();
  if(this.saver&&this._frame%2===0&&this.renderer.shadowMap)this.renderer.shadowMap.autoUpdate=false;
  else if(this.renderer.shadowMap)this.renderer.shadowMap.autoUpdate=true;
 }
}
