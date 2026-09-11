import * as T from 'three';
import {tagMovable,syncFurniture,furnitureRoot} from './mira-v2-furniture.js?v=17.2.0';
import {unlockSfx,audioContext} from './mira-v2-sfx.js?v=17.2.0';

function metal(c,r=.45,m=.35){return new T.MeshStandardMaterial({color:c,roughness:r,metalness:m});}

export function makeFoldedClothes(world,p,color=0xc9b59a,yaw=0){
 const g=new T.Group();g.position.copy(p);g.rotation.y=yaw;world.root.add(g);
 const cloth=new T.MeshStandardMaterial({color,roughness:.92});
 for(let i=0;i<3;i++){
  const m=new T.Mesh(new T.BoxGeometry(.30-i*.02,.035,.22-i*.015),cloth);
  m.position.set((i-1)*.01,.02+i*.038,(i-1)*.008);m.rotation.y=(i-1)*.06;m.castShadow=true;g.add(m);
 }
 const furn=tagMovable(world,g,'Clothes');
 furn.mass=.55;furn.soft=true;furn.health=18;furn.throwable=true;
 g.userData.laundryClothes=true;
 g.traverse(o=>{if(o.isMesh){o.userData.laundryClothes=true;world.fractures.register(o,'wood');}});
 return g;
}

function machine(world,p,yaw,kind){
 const g=new T.Group();g.position.copy(p);g.rotation.y=yaw;world.root.add(g);
 const white=metal(kind==='dryer'?0xd8c4a8:0xe8ecef,.62,.18),dk=metal(0x2a3036,.5,.4);
 const body=new T.Mesh(new T.BoxGeometry(.68,1.02,.66),white);body.position.y=.51;g.add(body);
 const drum=new T.Mesh(new T.CylinderGeometry(.22,.22,.28,20,1,true),dk);
 const inner=new T.Group();g.add(inner);
 const water=new T.Mesh(new T.CylinderGeometry(.20,.20,.26,16),new T.MeshStandardMaterial({color:0x3a7aaa,transparent:true,opacity:.0,roughness:.2,metalness:.1}));
 water.scale.y=.04;
 let lid,door,button;
 if(kind==='washer'){
  inner.position.set(0,.52,0);drum.position.set(0,0,0);inner.add(drum);
  water.position.set(0,.52,0);g.add(water);
  const hinge=new T.Group();hinge.position.set(0,1.03,-.28);g.add(hinge);
  lid=new T.Mesh(new T.BoxGeometry(.62,.04,.62),white);lid.position.set(0,0,.28);hinge.add(lid);
  const glass=new T.Mesh(new T.CircleGeometry(.16,16),new T.MeshStandardMaterial({color:0x9fc1c7,transparent:true,opacity:.35,roughness:.15}));
  glass.rotation.x=-Math.PI/2;glass.position.set(0,.022,.28);hinge.add(glass);
  button=new T.Mesh(new T.CylinderGeometry(.028,.028,.02,12),metal(0x3a7a4a,.4,.2));
  button.position.set(.22,1.04,.18);g.add(button);
 }else{
  inner.position.set(0,.52,.02);drum.rotation.z=Math.PI/2;inner.add(drum);
  water.visible=false;g.add(water);
  const hinge=new T.Group();hinge.position.set(-.34,.52,.33);g.add(hinge);
  door=new T.Mesh(new T.CylinderGeometry(.24,.24,.04,20),white);door.rotation.z=Math.PI/2;door.position.set(.04,0,0);hinge.add(door);
  const glass=new T.Mesh(new T.CircleGeometry(.18,16),new T.MeshStandardMaterial({color:0x88a8b0,transparent:true,opacity:.32,roughness:.12}));
  glass.position.set(.06,0,0);glass.rotation.y=Math.PI/2;hinge.add(glass);
  lid=hinge;
  button=new T.Mesh(new T.CylinderGeometry(.028,.028,.02,12),metal(0xb45a2a,.4,.2));
  button.position.set(.22,1.04,.18);g.add(button);
 }
 const panel=new T.Mesh(new T.BoxGeometry(.62,.08,.2),dk);panel.position.set(0,1.04,.18);g.add(panel);
 g.add(button);
 g.traverse(m=>{if(m.isMesh){m.castShadow=m.receiveShadow=true;world.pickables.push(m);}});
 world.fractures.register(body,'metal');
 const app={kind,group:g,drum,water,lid,door:door||lid,button,inner,open:false,running:false,phase:'idle',t:0,contents:[],spin:0};
 body.userData.appliance=app;lid.userData.appliance=app;button.userData.appliance=app;
 g.userData.appliance=app;
 lid.traverse(m=>m.userData.appliance=app);
 button.userData.applianceButton=true;
 world.obstacle(p.x,p.z,.7,.68,0,1.05,body);
 return app;
}

export function installLaundry(world,origin=new T.Vector3(9.85,0,-4.2)){
 const washer=machine(world,origin.clone().add(new T.Vector3(-1.35,0,.55)),0,'washer');
 const dryer=machine(world,origin.clone().add(new T.Vector3(-1.35,0,-.85)),0,'dryer');
 const shelf=new T.Group();shelf.position.copy(origin).add(new T.Vector3(1.45,0,0));world.root.add(shelf);
 const wood=world.mat(0x6d5340);
 const back=new T.Mesh(new T.BoxGeometry(.42,1.55,.92),wood);back.position.y=.78;shelf.add(back);
 for(const y of [.28,.62,.96,1.30]){const pl=new T.Mesh(new T.BoxGeometry(.40,.04,.90),wood);pl.position.set(.02,y,0);shelf.add(pl);}
 shelf.traverse(m=>{if(m.isMesh){m.castShadow=true;world.pickables.push(m);world.fractures.register(m,'wood');}});
 world.obstacle(shelf.position.x,shelf.position.z,.45,.95,0,1.55,back);
 const colors=[0xc9b59a,0x6a7e8c,0xb87865,0xe6d9d2,0x516f8c,0x628c88];
 const clothes=[];
 shelf.updateWorldMatrix(true,true);
 for(let i=0;i<6;i++){
  const y=.32+(i%3)*.34,z=(i<3?-.22:.22);
  clothes.push(makeFoldedClothes(world,shelf.localToWorld(new T.Vector3(.12,y,z)),colors[i]));
 }
 const hamper=makeFoldedClothes(world,origin.clone().add(new T.Vector3(.2,0,1.6)),0x9aa7b0);
 clothes.push(hamper);
 const api={
  washer,dryer,clothes,machines:[washer,dryer],
  setOpen(app,open){
   if(app.running&&open)return;
   app.open=open;
   if(app.kind==='washer')app.lid.rotation.x=open?-2.05:0;
   else app.lid.rotation.y=open?1.85:0;
  },
  start(app){
   if(app.open||app.running)return false;
   unlockSfx();app.running=true;app.phase=app.kind==='washer'?'fill':'tumble';app.t=0;app.spin=0;
   return true;
  },
  insert(app,group){
   if(!app.open||app.running||!group?.userData?.laundryClothes)return false;
   const furn=group.userData.furniture;
   if(furn?.holds?.size)return false;
   if(furn?.obstacle)world.removeObstacle(furn.obstacle);
   if(world.movables)world.movables=world.movables.filter(g=>g!==group);
   app.inner.attach(group);
   group.position.set((Math.random()-.5)*.12,-.02,(Math.random()-.5)*.12);
   group.rotation.set(Math.random(),Math.random(),Math.random());
   app.contents.push(group);
   if(furn){furn.held=null;furn.velocity?.set(0,0,0);}
   return true;
  },
  eject(app){
   for(const c of app.contents){
    const wp=c.getWorldPosition(new T.Vector3());
    world.root.attach(c);c.position.copy(wp);c.position.y=Math.max(.08,c.position.y);
    const furn=tagMovable(world,c,'Clothes');furn.mass=.55;furn.soft=true;c.userData.laundryClothes=true;
   }
   app.contents.length=0;
  },
  onRelease(group){
   if(!group?.userData?.laundryClothes)return;
   for(const app of this.machines){
    const mouth=app.kind==='washer'?app.group.localToWorld(new T.Vector3(0,1.02,0)):app.group.localToWorld(new T.Vector3(0,.52,.38));
    if(group.getWorldPosition(new T.Vector3()).distanceTo(mouth)<.42){this.insert(app,group);return;}
   }
  },
  click(ray,props){
   const r=ray?.isRaycaster?ray.ray:ray;if(!r?.origin)return false;
   this.rc??=new T.Raycaster();this.rc.ray.copy(r);this.rc.near=0;this.rc.far=5;
   const hit=this.rc.intersectObjects(this.machines.map(a=>a.group),true).find(h=>h.object.userData.appliance);const app=hit?.object?.userData?.appliance;if(!app)return false;
   if(hit.object.userData.applianceButton){
    if(app.open){props.status='Close the lid first';return true;}
    this.start(app);props.status=app.kind==='washer'?'Washer filling':'Dryer tumbling';return true;
   }
   this.setOpen(app,!app.open);if(app.open&&!app.running)this.eject(app);
   props.status=(app.kind==='washer'?'Washer':'Dryer')+' lid '+(app.open?'open':'closed');
   return true;
  },
  tick(dt){
   for(const app of this.machines){
    if(!app.running){
     if(app.kind==='washer'&&app.water.material.opacity>0){app.water.material.opacity=Math.max(0,app.water.material.opacity-dt*.4);app.water.scale.y=Math.max(.04,app.water.scale.y-dt*.5);}
     app.spin*=Math.exp(-dt*3);app.inner.rotation.y+=app.kind==='washer'?app.spin*dt:0;app.inner.rotation.x+=app.kind==='dryer'?app.spin*dt:0;continue;
    }
    app.t+=dt;
    if(app.kind==='washer'){
     if(app.phase==='fill'){
      app.water.material.opacity=Math.min(.42,app.t*.2);app.water.scale.y=Math.min(1,app.t*.35+.04);
      app.spin=Math.sin(app.t*8)*1.2;if(app.t>3.2){app.phase='wash';app.t=0;}
     }else if(app.phase==='wash'){
      app.spin=Math.sin(app.t*6.5)*2.4;if(app.t>9){app.phase='drain';app.t=0;}
     }else if(app.phase==='drain'){
      app.water.material.opacity=Math.max(0,.42-app.t*.35);app.water.scale.y=Math.max(.04,1-app.t*.4);
      app.spin=Math.sin(app.t*4)*.4;if(app.t>2.4){app.phase='spin';app.t=0;}
     }else if(app.phase==='spin'){
      app.spin=18;if(app.t>5.5){app.running=false;app.phase='idle';app.spin=0;app.water.material.opacity=0;app.water.scale.y=.04;}
     }
     app.inner.rotation.y+=app.spin*dt;
    }else{
     app.spin=7.2;app.inner.rotation.x+=app.spin*dt;
     for(const c of app.contents){c.position.y=Math.sin(app.t*9+c.position.x*8)*.06;c.rotation.z+=dt*4;}
     if(app.t>14){app.running=false;app.phase='idle';app.spin=0;}
    }
    if(app.running&&app.t<.05)unlockSfx();
   }
  }
 };
 world.laundry=api;return api;
}

export function installPantry(world){
 const spots={dog:[],cat:[],cans:[]};
 const wood=world.mat(0x6a5040);
 const shelf=(x,y,z,w,d)=>{
  const m=world.mesh(new T.BoxGeometry(w,.04,d),wood,x,y,z);
  world.fractures.register(m,'wood');return m;
 };
 shelf(6.55,.42,-3.2,.38,3.6);shelf(6.55,.86,-3.2,.38,3.6);shelf(6.55,1.30,-3.2,.38,3.6);
 shelf(2.2,.42,-6.35,3.4,.36);shelf(2.2,.86,-6.35,3.4,.36);shelf(2.2,1.30,-6.35,3.4,.36);
 shelf(.85,.42,-3.4,.36,2.8);shelf(.85,.86,-3.4,.36,2.8);
 for(const z of [-2.4,-3.3,-4.2,-5.1])spots.dog.push(new T.Vector3(6.5,.55,z));
 for(const z of [-2.6,-3.5,-4.4,-5.3])spots.cat.push(new T.Vector3(6.5,.98,z));
 for(const x of [1.1,2.0,2.9,3.8])spots.cat.push(new T.Vector3(x,.55,-6.3));
 for(const x of [1.3,2.2,3.1])spots.dog.push(new T.Vector3(x,.98,-6.3));
 const tin=world.mat(0xb8c0c4,.35,.55);
 for(let i=0;i<8;i++){
  const can=world.mesh(new T.CylinderGeometry(.045,.045,.09,12),tin,1.1+.18*(i%4),.48+.44*Math.floor(i/4),-2.55);
  const furn=tagMovable(world,can,'Cabinet');furn.mass=.35;furn.health=30;
  world.fractures.register(can,'metal');spots.cans.push(can);
 }
 const sign=document.createElement('canvas');sign.width=256;sign.height=64;
 const cg=sign.getContext('2d');cg.fillStyle='#6a5133';cg.fillRect(0,0,256,64);cg.fillStyle='#f0e6c8';cg.font='700 28px Georgia';cg.textAlign='center';cg.fillText('PANTRY',128,42);
 const map=new T.CanvasTexture(sign);map.colorSpace=T.SRGBColorSpace;
 const board=world.mesh(new T.BoxGeometry(.7,.16,.03),new T.MeshStandardMaterial({map,roughness:.88}),3.8,2.15,-1.72);
 world.fractures.register(board,'wood');
 world.pantry={dog:spots.dog,cat:spots.cat,stocked:false};
 return world.pantry;
}
