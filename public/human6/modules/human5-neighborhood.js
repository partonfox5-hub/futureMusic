import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createFixture} from './human5-lighting.js?v=17.5.0';
import {V,wrapMethod} from './human5-common.js?v=17.5.0';
export const NEIGHBORHOOD_NAME='Cul-de-sac';
export const HOUSE_SPECS=Object.freeze([
  {id:'willow',name:'Willow cottage',bedrooms:1,w:7.2,d:8.4,x:-17,z:0,yaw:Math.PI/2,color:0xddd0ad,roof:0x535e60,fabric:0x637e70,pattern:'stripes'},
  {id:'cedar',name:'Cedar bungalow',bedrooms:2,w:9.6,d:9.6,x:-17,z:-13.5,yaw:Math.PI/2,color:0xc2c9b1,roof:0x725649,fabric:0x40697c,pattern:'dots'},
  {id:'maple',name:'Maple family home',bedrooms:3,w:10.8,d:11.4,x:0,z:-25,yaw:0,color:0xd0b9a4,roof:0x6b4d43,fabric:0x9b6e53,pattern:'solid'},
  {id:'birch',name:'Birch courtyard home',bedrooms:2,w:8.4,d:10.8,x:17,z:-13.5,yaw:-Math.PI/2,color:0xd8d8cf,roof:0x586575,fabric:0x7d7893,pattern:'stripes',hall:true},
  {id:'aspen',name:'Aspen family home',bedrooms:3,w:10.2,d:12,x:17,z:1,yaw:-Math.PI/2,color:0xc0cdce,roof:0x97674c,fabric:0xb39152,pattern:'dots',mirror:true}
]);
const room=(id,x,z,w,d,type=id)=>({id,x,z,w,d,type});
// Local plans face +Z. Three-bedroom plans use a real corridor; every room has a door.
export function makeHousePlan(s){
  const W=s.w/2,D=s.d/2,rooms=[],walls=[],windows=[];
  const wall=(a,b,doors=[])=>walls.push({a,b,doors:doors.map(t=>({t,width:1.0,bottom:.055,top:2.15}))});
  const exterior=[{a:[-W,-D],b:[W,-D]},{a:[-W,D],b:[W,D],doors:[{t:0,width:1.0,bottom:.055,top:2.15}]},{a:[-W,-D],b:[-W,D]},{a:[W,-D],b:[W,D]}];
  for(const e of exterior){e.exterior=true;e.doors??=[];e.windows=[];walls.push(e);}
  const win=(edge,t)=>{const opening={t,width:1.38,bottom:1.02,top:2.22};exterior[edge].windows.push(opening);windows.push({edge,...opening});};
  win(1,-W*.52);win(1,W*.55);win(0,-W*.52);win(0,W*.55);win(2,D*.48);win(3,-D*.40);
  if(s.bedrooms===1){
    wall([-W,-.3],[W,-.3],[-W*.5,W*.5]);wall([0,-D],[0,-.3]);
    rooms.push(room('bedroom-1',-W/2,(-D-.3)/2,W,D-.3,'bedroom'),room('bath',W/2,(-D-.3)/2,W,D-.3),room('living',-W/2,(D-.3)/2,W,D+.3),room('kitchen',W/2,(D-.3)/2,W,D+.3));
  }else if(s.bedrooms===2&&!s.hall){
    wall([-W,-.3],[W,-.3],[-W*.5,W*.5]);wall([0,-D],[0,-.3]);wall([W-2.4,1.8],[W-2.4,D],[(D+1.8)/2]);wall([W-2.4,1.8],[W,1.8]);
    rooms.push(room('bedroom-1',-W/2,(-D-.3)/2,W,D-.3,'bedroom'),room('bedroom-2',W/2,(-D-.3)/2,W,D-.3,'bedroom'),room('bath',W-1.2,(D+1.8)/2,2.4,D-1.8),room('living',-W/2,(D-.3)/2,W,D+.3),room('kitchen',W/2,.75,W,2.1));
  }else{
    const split=s.bedrooms===3,wing=W-.75,backDepth=D-.1;
    wall([-.75,-D],[-.75,.0],split?[-D*.75,-D*.25]:[-D*.5]);wall([.75,-D],[.75,0],[-D*.66,-1.05]);
    wall([-W,0],[-.75,0]);wall([.75,0],[W,0]);wall([.75,-2.1],[W,-2.1]);if(split)wall([-W,-D/2],[-.75,-D/2]);
    rooms.push(room('hall',0,-D/2,1.5,D),room('bedroom-1',-(W+.75)/2,split?-D*.75:-D/2,wing,split?D/2:backDepth,'bedroom'));
    if(split)rooms.push(room('bedroom-2',-(W+.75)/2,-D*.25,wing,D/2,'bedroom'));
    rooms.push(room(split?'bedroom-3':'bedroom-2',(W+.75)/2,(-D-2.1)/2,wing,D-2.1,'bedroom'),room('bath',(W+.75)/2,-1.05,wing,2.1),room('living',-W/2,D/2,W,D),room('kitchen',W/2,D/2,W,D));
  }
  if(s.mirror){for(const r of rooms)r.x=-r.x;for(const w of walls){w.a[0]=-w.a[0];w.b[0]=-w.b[0];if(w.a[1]===w.b[1]){w.doors.forEach(o=>o.t=-o.t);w.windows?.forEach(o=>o.t=-o.t);}}}
  return {id:s.id,bedrooms:s.bedrooms,rooms,walls,windows,entry:[0,D],width:s.w,depth:s.d};
}

export class Neighborhood {
  constructor({world,furniture,textiles,lights,fire,tagMovable,HouseDoors,makeSurfaceMap,placeFurniture,wardrobe}={}){Object.assign(this,{world,furniture,textiles,lights,fire,tagMovable,HouseDoors,makeSurfaceMap,placeFurniture,wardrobe});this.houses=[];}
  build(){const w=this.world;w.terrainPad=64;w.terrainAmp=0;w.terrain=null;w.water=null;w.pantry={dog:[],cat:[],stocked:false};w.garageStalls=[];
    w.scene.background=new T.Color(0xb8ccd4);w.scene.fog=new T.Fog(0xb8ccd4,80,180);w.extent=90;
    const ground=w.mesh(new T.PlaneGeometry(200,200),w.mat(0x6d8056),0,-.012,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
    const road=(radius,half,end,y,color)=>{const shape=new T.Shape(),theta=Math.acos(half/radius),join=-8+Math.sqrt(radius*radius-half*half);shape.moveTo(half,-end);shape.lineTo(-half,-end);shape.lineTo(-half,-join);for(let i=0;i<=64;i++){const a=Math.PI-theta+i/64*(Math.PI+2*theta);shape.lineTo(Math.cos(a)*radius,8-Math.sin(a)*radius);}shape.closePath();const m=new T.Mesh(new T.ShapeGeometry(shape),w.mat(color));m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;w.root.add(m);};
    road(10.45,4.25,38,.001,0xb6b4ab);road(9.6,3.4,38,.006,0x4a4e50);
    const paint=new T.MeshStandardMaterial({color:0xcfc8a9,roughness:.95});for(let z=5;z<35;z+=4){const m=new T.Mesh(new T.PlaneGeometry(.10,1.8),paint);m.rotation.x=-Math.PI/2;m.position.set(0,.009,z);w.root.add(m);}
    w.doors=new this.HouseDoors(w);this.maps={wood:this.makeSurfaceMap('Wood'),plaster:this.makeSurfaceMap('Plaster'),tile:this.makeSurfaceMap('Tile'),shingle:this.makeSurfaceMap('Shingle')};
    this.houses=HOUSE_SPECS.map((s,i)=>this.buildHouse(s,i));
    // Reachable curb parking; legacy car code consumes this API.
    w.garageStalls=[{position:new T.Vector3(-5.5,.03,11),yaw:0,color:0x1e4f8a},{position:new T.Vector3(5.5,.03,18),yaw:Math.PI,color:0xb42222}];
    w.neighborhood={houses:this.houses,spawn:new T.Vector3(0,0,2),name:NEIGHBORHOOD_NAME};
    w.plan={id:'cul-de-sac-17',rooms:this.houses.flatMap(h=>h.rooms),houses:this.houses};w.grid=null;return this;
  }
  buildHouse(s,index){const w=this.world,plan=makeHousePlan(s),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),s.yaw),origin=new T.Vector3(s.x,0,s.z),toWorld=(x,y,z)=>new T.Vector3(x,y,z).applyQuaternion(q).add(origin);
    const start=w.root.children.length,trim=[],floorY=.055,house={...s,plan,rooms:[],meshes:[],contents:[]};
    const box=(size,p,material)=>{const g=new T.BoxGeometry(...size);g.applyMatrix4(new T.Matrix4().compose(toWorld(...p),q,new T.Vector3(1,1,1)));const mesh=new T.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;w.root.add(mesh);return mesh;};
    const addTrim=(size,p)=>{const g=new T.BoxGeometry(...size);g.applyMatrix4(new T.Matrix4().compose(toWorld(...p),q,new T.Vector3(1,1,1)));trim.push(g);};
    const isQuarter=Math.abs(Math.sin(s.yaw))>.5,W=isQuarter?s.d:s.w,D=isQuarter?s.w:s.d;
    const slab=box([s.w,.055,s.d],[0,.0275,0],new T.MeshStandardMaterial({color:0xa58a6d,map:this.maps.wood,roughness:.82}));slab.castShadow=false;w.floors.push({x:s.x,z:s.z,w:W,d:D,y:0,h:floorY});
    const ceiling=box([s.w,.08,s.d],[0,2.94,0],w.mat(0xd8d3c7));house.ceiling=ceiling;
    for(const wall of plan.walls){
      const alongX=wall.a[1]===wall.b[1],lo=Math.min(wall.a[alongX?0:1],wall.b[alongX?0:1]),hi=Math.max(wall.a[alongX?0:1],wall.b[alongX?0:1]),fixed=wall.a[alongX?1:0],openings=[...wall.doors,...(wall.windows||[])];
      const partition=(cuts)=>{const values=[...new Set(cuts)].sort((a,b)=>a-b),out=[];for(let i=0;i<values.length-1;i++){const n=Math.max(1,Math.ceil((values[i+1]-values[i])/.6));for(let j=0;j<n;j++)out.push([values[i]+j/n*(values[i+1]-values[i]),values[i]+(j+1)/n*(values[i+1]-values[i])]);}return out;};
      const xs=partition([lo,hi,...openings.flatMap(o=>[Math.max(lo,o.t-o.width/2),Math.min(hi,o.t+o.width/2)])]),ys=partition([floorY,2.9,...openings.flatMap(o=>[Math.max(floorY,o.bottom),o.top])]),cells=[];
      for(const [a,b] of xs)for(const [c,d] of ys){const t=(a+b)/2,y=(c+d)/2;if(openings.some(o=>Math.abs(t-o.t)<o.width/2&&y>o.bottom&&y<o.top))continue;const localSize=alongX?new T.Vector3(b-a,d-c,.14):new T.Vector3(.14,d-c,b-a);const size=new T.Vector3(isQuarter?localSize.z:localSize.x,localSize.y,isQuarter?localSize.x:localSize.z);cells.push({center:alongX?toWorld(t,y,fixed):toWorld(fixed,y,t),size});}
      const center=alongX?toWorld((lo+hi)/2,1.48,fixed):toWorld(fixed,1.48,(lo+hi)/2),sz=alongX?new T.Vector3(hi-lo,2.845,.14):new T.Vector3(.14,2.845,hi-lo);if(isQuarter)[sz.x,sz.z]=[sz.z,sz.x];
      const mesh=w.fractures.panel(center,sz,'plaster',()=>false,{cells,map:this.maps.plaster});mesh.material.color.set(wall.exterior?s.color:0xd9d5cb);mesh.userData.h5House=house;
      for(const o of wall.doors){const p=alongX?toWorld(o.t,floorY,fixed):toWorld(fixed,floorY,o.t);const d=w.doors.place(p.x,p.y,p.z,s.yaw+(alongX?0:Math.PI/2),{width:.9,color:index%2?0x796650:0x6b5947});d.h5House=house;}
      for(const o of wall.windows||[]){const p=alongX?toWorld(o.t,(o.bottom+o.top)/2,fixed):toWorld(fixed,(o.bottom+o.top)/2,o.t),size=alongX?[o.width,.0,.028]:[.028,.0,o.width];size[1]=o.top-o.bottom;const geo=new T.BoxGeometry(...size),glass=new T.MeshPhysicalMaterial({color:0xcbdcdd,roughness:.17,metalness:0,clearcoat:1,transparent:true,opacity:.18,depthWrite:false});const pane=new T.Mesh(geo,glass);pane.position.copy(p);pane.quaternion.copy(q);w.root.add(pane);w.fractures.register(pane,'glass');
        const set=(t,y,long,high)=>{const pos=alongX?[t,y,fixed]:[fixed,y,t],size=alongX?[long,high,.18]:[.18,high,long];addTrim(size,pos);};
        for(const side of [-1,1])set(o.t+side*o.width/2,(o.bottom+o.top)/2,.055,o.top-o.bottom+.08);for(const y of [o.bottom,o.top])set(o.t,y,o.width+.1,.055);set(o.t,(o.bottom+o.top)/2,.035,o.top-o.bottom);
      }
    }
    const roofMaterial=new T.MeshStandardMaterial({color:s.roof,map:this.maps.shingle,roughness:.95}),half=s.d/2+.25,rise=index%2?1.25:1.5,pitch=Math.atan2(rise,half),length=Math.hypot(half,rise);
    for(const sign of [-1,1]){const roof=new T.Mesh(new T.BoxGeometry(s.w+.5,.11,length),roofMaterial);roof.position.copy(toWorld(0,3+rise/2,sign*half/2));roof.quaternion.copy(q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),sign*pitch));roof.castShadow=roof.receiveShadow=true;w.root.add(roof);house.meshes.push(roof);}
    for(const x of [-s.w/2,s.w/2]){const shape=new T.Shape();shape.moveTo(-half,3);shape.lineTo(0,3+rise);shape.lineTo(half,3);const g=new T.ShapeGeometry(shape),m=new T.Mesh(g,new T.MeshStandardMaterial({color:s.color,roughness:.9,side:T.DoubleSide}));m.position.copy(toWorld(x,0,0));m.quaternion.copy(q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2));m.castShadow=m.receiveShadow=true;w.root.add(m);}
    if(trim.length){const g=mergeGeometries(trim);trim.forEach(g=>g.dispose());const m=new T.Mesh(g,w.mat(0xe9e3d5));m.castShadow=m.receiveShadow=true;w.root.add(m);}
    const place=(id,x,z,yaw=0,y=floorY)=>{const p=toWorld(x,y,z),g=this.placeFurniture?.(w,this.wardrobe,id,p,s.yaw+yaw);if(g)house.contents.push(g);return g;};
    const layered=(type,x,z,opts={})=>{const p=toWorld(x,opts.y??floorY,z),item=this.furniture.create(type,{color:s.fabric,accent:0xd9cfb9,pattern:s.pattern,...opts,position:p.toArray(),yaw:s.yaw+(opts.yaw||0)});house.contents.push(item.root);return item;};
    const fixture=(type,x,z,y=floorY)=>{const f=createFixture(w,type,{position:toWorld(x,y,z).toArray(),yaw:s.yaw,fire:this.fire,tagMovable:this.tagMovable,color:index%2?0xddd0ac:0xc5ad83});this.lights.add(f);house.contents.push(f.root);return f;};
    for(const r of plan.rooms){const p=toWorld(r.x,0,r.z);house.rooms.push({...r,house:s.id,x:p.x,z:p.z,w:isQuarter?r.d:r.w,d:isQuarter?r.w:r.d});
      if(r.type==='bedroom'){
        const frame=new T.Group();frame.position.copy(toWorld(r.x,floorY,r.z));frame.quaternion.copy(q);frame.name='Timber bed frame';w.root.add(frame);
        const parts=[];for(const [size,pos] of [[[1.54,.12,2.10],[0,.29,0]],[[1.54,.58,.075],[0,.48,-1.03]],...[-.65,.65].flatMap(x=>[-.85,.85].map(z=>[[.07,.24,.07],[x,.12,z]]))]){const g=new T.BoxGeometry(...size);g.translate(...pos);parts.push(g);}const bedMesh=new T.Mesh(mergeGeometries(parts),new T.MeshStandardMaterial({color:index%2?0x806145:0xa08763,roughness:.82}));parts.forEach(g=>g.dispose());frame.add(bedMesh);bedMesh.castShadow=bedMesh.receiveShadow=true;
        const bed=this.tagMovable(w,frame,'Bed');bed.mass=26;bed.health=160;frame.userData.h5MattressSupport=new T.Vector3(0,.35,0);w.pickables.push(bedMesh);house.contents.push(frame);this.fire.register(frame,{material:'wood'});
        const mattress=layered('Mattress',r.x,r.z,{y:floorY+.35,color:index%2?0xbcc1b4:0xcfc4b5,accent:0xe4dccb,pattern:index%2?'stripes':'solid'});mattress.root.userData.bedFrame=frame;bed.mattress=mattress.root;place('Nightstand',r.x+r.w/2-.5,r.z-.45);fixture('Table lamp',r.x+r.w/2-.5,r.z-.45,.66);
        this.textiles.createCarpet({position:toWorld(r.x,floorY+.003,r.z).toArray(),size:[isQuarter?r.d-.15:r.w-.15,isQuarter?r.w-.15:r.d-.15],color:[0x8a7a66,0x78847c,0x9c9080][index%3],seed:index*17+house.rooms.length});
      }else if(r.id==='living'){
        layered('Couch',r.x-.25,r.z-.65,{seaters:index%2?3:2});place('Coffee table',r.x,r.z+.40);layered('Chair',r.x-r.w/2+.55,r.z+.65,{yaw:-Math.PI/2,height:index===3?'high':'low'});fixture('Standing lamp',r.x+r.w/2-.45,r.z-.7);
        if(index!==3)this.textiles.createRug({position:toWorld(r.x,floorY+.009,r.z+.4).toArray(),yaw:s.yaw,size:[Math.min(2.5,r.w-.2),Math.min(2,r.d-1)],pattern:['diamonds','stripes','braid','checker'][index%4],color:index%2?0x627685:0x9c8360});
      }else if(r.id==='kitchen'){
        place('Kitchen counter',r.x+r.w/2-.65,r.z-.55,Math.PI/2);place('Sink',r.x+r.w/2-.6,r.z+.40,Math.PI/2);place('Refrigerator',r.x-r.w/2+.65,r.z-.5);fixture(index%2?'Chandelier':'Hanging shaded lamp',r.x,r.z,2.9);
        w.pantry.dog.push(toWorld(r.x,.085,r.z+.55));if(index%2===0)w.pantry.cat.push(toWorld(r.x+.3,.085,r.z+.55));
      }else if(r.id==='bath'){place('Toilet',r.x+r.w/2-.6,r.z,Math.PI/2);place('Sink',r.x-r.w/2+.55,r.z,Math.PI/2);}
    }
    const front=toWorld(0,0,s.d/2+1.1);const walk=box([1.4,.026,2.3],[0,.015,s.d/2+1.1],w.mat(0xb8b4a8));walk.castShadow=false;
    fixture('Torch',-s.w/2+.4,s.d/2+.35);house.entry=toWorld(0,floorY,s.d/2);house.bounds=new T.Box3(new T.Vector3(s.x-W/2-.4,0,s.z-D/2-.4),new T.Vector3(s.x+W/2+.4,5,s.z+D/2+.4));
    house.meshes=w.root.children.slice(start).filter(o=>!o.userData.furniture&&!o.userData.h5Rug);
    const staticRoot=new T.Group();staticRoot.name=s.name+' static shell';w.root.add(staticRoot);
    const staticObjects=house.meshes.filter(o=>(o.isMesh&&!o.isInstancedMesh)||o.name==='Door casing');
    for(const o of staticObjects)staticRoot.attach(o);house.staticRoot=staticRoot;house.meshes=house.meshes.filter(o=>!staticObjects.includes(o));house.meshes.push(staticRoot);return house;
  }
  install(SCENES){const self=this;if(!SCENES.includes(NEIGHBORHOOD_NAME))SCENES.push(NEIGHBORHOOD_NAME);
    this.restore=wrapMethod(this.world,'setScene',old=>function(name){
      if(!SCENES.includes(name))return old.apply(this,arguments);
      self.textiles.clear();self.furniture.dispose();self.lights.fixtures.clear();
      if(name!==NEIGHBORHOOD_NAME){delete this.neighborhood;return old.apply(this,arguments);}
      for(const a of this.system.actors){a.seat=null;a.navigation=null;a.dest=null;a.directedWalk=null;a.group.position.set(0,a.baseY||0,0);this.system.social.cancel(a);a.setMode('auto');}
      this.doors?.clear();this.root.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])m.dispose();});this.root.clear();
      for(const key of ['obstacles','seats','pickables','movables','stairs','floors','trees','waterBeds'])this[key]=[];this.grid=null;this.builder?.clear();this.revision++;this.fractures.clear();this.name=name;self.build();
    });return this;
  }
  dispose(){this.restore?.();}
}
