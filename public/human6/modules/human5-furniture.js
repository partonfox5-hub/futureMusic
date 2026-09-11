import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {V,clamp,rng,localBounds,wrapMethod,detachMovable,disposeTree} from './human5-common.js?v=19.1.0';

const MAX_CUTS=8;
function fabricMap(pattern,color,accent){
  const size=128,data=new Uint8Array(size*size*4),base=new T.Color(color),alt=new T.Color(accent);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const mark=pattern==='stripes'?x%32<8:pattern==='dots'?Math.hypot(x%32-16,y%32-16)<6:false;
    const c=mark?alt:base,grain=((x%2)^(y%2))?.97:1.02,i=(y*size+x)*4;
    // Color is linear in this data texture; do not mark it as sRGB a second time.
    data[i]=clamp(c.r*grain*255,0,255);data[i+1]=clamp(c.g*grain*255,0,255);data[i+2]=clamp(c.b*grain*255,0,255);data[i+3]=255;
  }
  const t=new T.DataTexture(data,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(3,3);t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;t.userData.h5Owned=true;return t;
}
const cutDecl='varying vec3 h5Local; uniform vec4 h5CutA[8]; uniform vec4 h5CutB[8]; uniform int h5CutCount;';
const cutCode='for(int h5i=0;h5i<8;h5i++){if(h5i>=h5CutCount)break; vec3 a=h5CutA[h5i].xyz,b=h5CutB[h5i].xyz,d=b-a; float t=clamp(dot(h5Local-a,d)/max(dot(d,d),.000001),0.,1.); if(length(h5Local-a-d*t)<h5CutA[h5i].w)discard;}';
function cutShader(shader,u){
  Object.assign(shader.uniforms,u);
  shader.vertexShader='varying vec3 h5Local;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nh5Local=position;');
  shader.fragmentShader=cutDecl+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\n'+cutCode);
}
/** Persistent shell holes with a separate foam volume, also perforating shadow maps. */
class Cushion {
  constructor(owner,size,position,{color,accent,pattern,fire}={}){
    this.owner=owner;this.cuts=[];this.size=size;
    this.u={h5CutA:{value:Array.from({length:MAX_CUTS},()=>new T.Vector4())},h5CutB:{value:Array.from({length:MAX_CUTS},()=>new T.Vector4())},h5CutCount:{value:0}};
    const material=new T.MeshStandardMaterial({color:0xffffff,map:fabricMap(pattern,color,accent),roughness:.94});
    material.onBeforeCompile=s=>cutShader(s,this.u);material.customProgramCacheKey=()=> 'h5-fabric-cuts-17';
    const geometry=new RoundedBoxGeometry(...size,2,Math.min(.065,size[1]*.3));
    this.shell=new T.Mesh(geometry,material);this.shell.position.fromArray(position);this.shell.castShadow=this.shell.receiveShadow=true;owner.root.add(this.shell);
    this.shell.userData.h5Cushion=this;
    for(const key of ['customDepthMaterial','customDistanceMaterial']){
      const m=key==='customDepthMaterial'?new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking}):new T.MeshDistanceMaterial();m.onBeforeCompile=s=>cutShader(s,this.u);m.customProgramCacheKey=()=>key+'h5-cuts-17';this.shell[key]=m;
    }
    const foamMaterial=new T.MeshStandardMaterial({color:0xe9dec4,roughness:1});
    foamMaterial.onBeforeCompile=s=>{s.vertexShader='varying vec3 h5FoamP;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nh5FoamP=position;');s.fragmentShader='varying vec3 h5FoamP;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat pores=fract(sin(dot(floor(h5FoamP*700.),vec3(12.9898,78.233,51.17)))*43758.5453); diffuseColor.rgb*=mix(.58,1.05,smoothstep(.06,.30,pores));');};
    foamMaterial.customProgramCacheKey=()=> 'h5-foam-17';
    this.foam=new T.Mesh(new RoundedBoxGeometry(size[0]-.016,size[1]-.016,size[2]-.016,2,Math.min(.06,size[1]*.28)),foamMaterial);this.foam.position.copy(this.shell.position);this.foam.visible=false;this.foam.castShadow=this.foam.receiveShadow=true;this.foam.userData.h5Cushion=this;owner.root.add(this.foam);
    this.fire=fire;if(fire){this.outerFuel=fire.register(this.shell,{material:'fabric'});this.innerFuel=fire.register(this.foam,{material:'stuffing',exposed:false});}
  }
  cut(worldPoint,energy,kind,direction=new T.Vector3(1,0,0)){
    this.shell.updateWorldMatrix(true,false);const p=this.shell.worldToLocal(worldPoint.clone());
    const radius=kind==='bullet'?.025:kind==='cut'?clamp(Math.sqrt(Math.max(energy,0))*.009,.025,.085):clamp(Math.sqrt(Math.max(energy,0))*.012,.035,.12);
    const end=p.clone();if(kind==='cut'){const q=direction.clone().transformDirection(this.shell.matrixWorld.clone().invert());end.addScaledVector(q,clamp(energy*.004,.05,.26));}
    let index=this.cuts.findIndex(c=>c.a.distanceTo(p)<c.r+radius);
    if(index<0){index=this.cuts.length;if(index>=MAX_CUTS){index=this.cuts.reduce((best,c,i)=>c.r<this.cuts[best].r?i:best,0);}this.cuts[index]={a:p,b:end,r:radius};}
    else{const c=this.cuts[index];c.r=clamp(c.r+radius*.3,0,.23);c.b.copy(end);}
    const c=this.cuts[index];this.u.h5CutA.value[index].set(c.a.x,c.a.y,c.a.z,c.r);this.u.h5CutB.value[index].set(c.b.x,c.b.y,c.b.z,0);this.u.h5CutCount.value=this.cuts.length;
    this.foam.visible=true;if(this.innerFuel)this.fire.expose(this.innerFuel);
    // Put the ignition site at the opening, not at the center of a sealed cushion.
    if(this.innerFuel){this.innerFuel.point.copy(this.foam.worldToLocal(worldPoint.clone()));this.innerFuel.localBox.clampPoint(this.innerFuel.point,this.innerFuel.point);}
    return c;
  }
  burn(dt){if(this.outerFuel?.burning){this.shell.material.color.lerp(new T.Color(0x28201b),dt*.4);if(this.outerFuel.fuel<.8&&!this.cuts.length)this.cut(this.shell.localToWorld(new T.Vector3(0,this.size[1]/2,0)),20,'cut');}
    if(this.innerFuel?.burning){this.foam.material.color.lerp(new T.Color(0x211b16),dt*.55);if(this.innerFuel.fuel<=0)this.foam.scale.y=.55;}}
  dispose(){if(this.fire){this.fire.unregister(this.outerFuel);this.fire.unregister(this.innerFuel);}this.shell.customDepthMaterial.dispose();this.shell.customDistanceMaterial.dispose();}
}

export class FurnitureMaterials {
  constructor({world,tagMovable,fire=null,maxDebris=24}={}){if(!world||!tagMovable)throw new TypeError('Pass world and the existing tagMovable');Object.assign(this,{world,tagMovable,fire,maxDebris});this.items=new Set();this.bags=new Set();this.debris=[];this.random=rng(1705);this.tabHolds=new Map();}
  create(type,{position=[0,0,0],yaw=0,seaters=3,height='low',color=0x677e74,accent=0xd4d0bb,pattern='solid'}={}){
    if(!['Couch','Chair','Mattress'].includes(type))throw new TypeError('Layered type must be Couch, Chair or Mattress');
    seaters=type==='Couch'?(seaters===2?2:3):1;
    const root=new T.Group();root.name=type+' '+(type==='Couch'?seaters+' seat':height);root.position.fromArray(position);root.rotation.y=yaw;this.world.root.add(root);
    const item={root,type,cushions:[],seaters};root.userData.h5Layered=item;this.items.add(item);
    const wood=new T.MeshStandardMaterial({color:0x71503a,roughness:.75}),put=(size,p,m=wood)=>{const o=new T.Mesh(new RoundedBoxGeometry(...size,1,.012),m);o.position.fromArray(p);o.castShadow=o.receiveShadow=true;root.add(o);return o;};
    const cushion=(size,p)=>{const c=new Cushion(item,size,p,{color,accent,pattern,fire:this.fire});item.cushions.push(c);return c;};
    const seatY=height==='high'?.70:.44,w=type==='Couch'?seaters*.59+.24:.57;
    if(type==='Mattress'){
      cushion([1.42,.24,2.0],[0,.14,0]);
      // Stitched perimeter piping gives a readable cushion silhouette.
      const pipe=new T.MeshStandardMaterial({color:accent,roughness:.94});for(const z of [-.982,.982])put([1.36,.009,.009],[0,.22,z],pipe);
    }else{
      put([w,.10,.77],[0,seatY-.13,0]);
      for(const x of [-w/2+.09,w/2-.09])for(const z of [-.29,.29])put([.055,seatY-.17,.055],[x,(seatY-.17)/2,z]);
      for(let i=0;i<seaters;i++){
        const x=(i-(seaters-1)/2)*(type==='Couch'?.59:.5);
        cushion([type==='Couch'?.57:.48,.18,.65],[x,seatY,0]);
        cushion([type==='Couch'?.57:.50,type==='Couch'?.52:.58,.17],[x,seatY+.28,-.36]);
      }
      if(type==='Couch')for(const x of [-w/2+.025,w/2-.025])cushion([.17,.34,.76],[x,seatY+.08,0]);
    }
    root.updateWorldMatrix(true,true);const f=this.tagMovable(this.world,root,type);f.mass=type==='Couch'?(seaters===2?42:58):type==='Chair'?(height==='high'?7:6):16;f.health=200;f.h5Layered=true;
    root.traverse(o=>{if(o.isMesh&&!this.world.pickables.includes(o))this.world.pickables.push(o);});
    if(type!=='Mattress'){
      const seat={group:root,position:root.localToWorld(new T.Vector3(0,seatY+.1,0)),yaw,approach:root.localToWorld(new T.Vector3(0,0,1.15)),occupant:null,obstacle:f.obstacle,h5SeatHeight:seatY+.1};
      this.world.seats??=[];this.world.seats.push(seat);f.seat=seat;item.seat=seat;
      root.traverse(o=>{if(o.isMesh)o.userData.seat=seat;});
    }
    if(this.fire)item.frameFuel=this.fire.register(root,{material:'wood'});return item;
  }
  impact(hit,energy,dir,kind){
    let c=hit?.object?.userData.h5Cushion;if(!c)return false;
    if(['bullet','cut','laser'].includes(kind)||energy>14){c.cut(hit.point,energy,kind,dir);if(energy>12)this.spawnStuffing(c,hit.point,dir);}
    const f=c.owner.root.userData.furniture;if(f&&!f.held&&f.velocity&&dir)f.velocity.addScaledVector(dir,Math.min(1.2,Math.sqrt(Math.max(0,energy))/(f.mass||20)));
    return true;
  }
  spawnStuffing(c,point,dir){
    if(this.debris.length>=this.maxDebris){const i=this.debris.findIndex(d=>!d.root.userData.furniture?.held);if(i<0)return;this.removeDebris(i);}
    const root=new T.Group();root.name='Loose furniture stuffing';root.position.copy(point);this.world.root.add(root);if(root.parent)root.parent.worldToLocal(root.position);
    const geo=new T.IcosahedronGeometry(.028+this.random()*.018,1),mat=new T.MeshStandardMaterial({color:0xece3cd,roughness:1}),mesh=new T.Mesh(geo,mat);root.add(mesh);mesh.scale.set(1.4,.7,1);mesh.castShadow=true;
    const f=this.tagMovable(this.world,root,'Mattress');f.mass=.018;f.mix={cloth:1};f.velocity.copy(dir||V()).multiplyScalar(.30).y+=.35;f.health=8;
    this.world.pickables.push(mesh);this.debris.push({root,fuel:this.fire?.register(root,{material:'stuffing'})});
  }
  removeDebris(i){const d=this.debris[i];if(!detachMovable(this.world,d.root))return false;if(d.fuel)this.fire.unregister(d.fuel);this.debris.splice(i,1);return true;}
  upgradePetBag(root){
    const item=root?.userData?.dogItem;if(!item||!['bag','catbag'].includes(item.type))return null;
    if(root.userData.h5Bag)return root.userData.h5Bag;
    const old=[...root.children],removed=new Set();for(const child of old){child.traverse(o=>removed.add(o));child.visible=false;child.removeFromParent();}this.world.pickables=this.world.pickables.filter(o=>!removed.has(o));
    if(this.fire)for(const fuel of this.fire.surfaces.values())if(fuel.root===root)this.fire.unregister(fuel);
    const cat=item.type==='catbag',paper=new T.MeshStandardMaterial({color:cat?0x438a88:0xb49b65,roughness:.88,side:T.DoubleSide});
    const vertices=[],uv=[],indices=[],rings=10,sides=24;
    for(let y=0;y<=rings;y++)for(let j=0;j<=sides;j++){
      const t=y/rings,a=j/sides*Math.PI*2,c=Math.cos(a),s=Math.sin(a),bulge=Math.sin(t*Math.PI),w=.235*(.86+.14*bulge),d=.132*(.6+.40*bulge)*(1-.84*t**6);
      vertices.push(Math.sign(c)*Math.abs(c)**.55*w/2,t*.345,Math.sign(s)*Math.abs(s)**.7*d/2+Math.sin(t*37+a*3)*.0025*bulge);uv.push(j/sides,t);
      if(y<rings&&j<sides){const k=y*(sides+1)+j;indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const body=new T.Mesh(geo,paper);root.add(body);
    const top=new T.Mesh(new T.BoxGeometry(.213,.024,.008),paper);top.position.set(0,.351,0);root.add(top);
    const tab=new T.Mesh(new T.BoxGeometry(.05,.025,.012),new T.MeshStandardMaterial({color:cat?0xe5cc80:0xa64031,roughness:.7}));tab.position.set(.124,.35,0);root.add(tab);
    const flap=new T.Mesh(new T.PlaneGeometry(.205,.05,8,1),paper);flap.position.set(0,.338,-.013);flap.rotation.x=-.9;flap.visible=false;root.add(flap);
    const mouth=new T.Mesh(new T.CircleGeometry(.065,16),new T.MeshStandardMaterial({color:0x4a3521,roughness:1,side:T.DoubleSide}));mouth.scale.y=.3;mouth.rotation.x=-Math.PI/2;mouth.position.y=.332;mouth.visible=false;root.add(mouth);
    const label=new T.Mesh(new T.PlaneGeometry(.16,.09),new T.MeshStandardMaterial({color:cat?0xd4e4de:0xeadcba,roughness:.95}));label.position.set(0,.18,.069);root.add(label);
    const icon=new T.Mesh(cat?new T.SphereGeometry(.025,8,5):new T.CylinderGeometry(.025,.025,.005,8),new T.MeshStandardMaterial({color:cat?0x315f60:0x765330,roughness:1}));icon.position.set(0,.18,.073);if(cat)icon.scale.set(1.6,.6,.12);else icon.rotation.x=Math.PI/2;root.add(icon);
    Object.assign(item,{top,flap,mouth});
    const bag={root,item,top,flap,mouth,tab,body,originalChildren:old,base:new Float32Array(geo.attributes.position.array),open:()=>{item.torn=true;item.health=0;top.visible=tab.visible=false;flap.visible=mouth.visible=true;}};
    tab.userData.h5TearTab=bag;root.userData.h5Bag=bag;
    root.traverse(o=>{if(o.isMesh){o.userData.dogItem=item;o.userData.furnRoot=root;o.castShadow=o.receiveShadow=true;if(!this.world.pickables.includes(o))this.world.pickables.push(o);}});
    const f=root.userData.furniture;if(f)f.localBox=localBounds(root);if(this.fire)bag.fuel=this.fire.register(body,{material:'paper'});
    this.bags.add(bag);return bag;
  }
  tick(dt){
    for(const item of this.items){if(!item.root.parent)continue;for(const c of item.cushions)c.burn(dt);
      if(item.seat){item.seat.position.copy(item.root.localToWorld(new T.Vector3(0,item.seat.h5SeatHeight,0)));item.seat.approach.copy(item.root.localToWorld(new T.Vector3(0,0,1.15)));}
    }
    for(const bag of this.bags){const {item,body}=bag;if(item.torn){bag.open();}if(bag.fuel?.burning&&bag.fuel.fuel<.9)bag.open();
      const fill=clamp(item.remaining/200,.05,1),p=body.geometry.attributes.position;if(fill===bag.lastFill)continue;bag.lastFill=fill;
      for(let i=0;i<p.count;i++){p.setZ(i,bag.base[i*3+2]*(.3+.7*fill));}p.needsUpdate=true;
    }
  }
  bindProps(props){
    const restores=[];restores.push(wrapMethod(props,'impact',old=>{const self=this;return function(hit,e,d,k,s){if(self.impact(hit,e,d,k))return true;return old.apply(this,arguments);};}));
    restores.push(wrapMethod(props,'grip',old=>{const self=this;return function(i){const p=this.system.hands.palmPos(i);for(const bag of self.bags)if(!bag.item.torn&&bag.tab.getWorldPosition(V()).distanceTo(p)<.065){self.tabHolds.set(i,{bag,start:p.clone()});return true;}return old.apply(this,arguments);};}));
    restores.push(wrapMethod(props,'release',old=>{const self=this;return function(i){self.tabHolds.delete(i);return old.apply(this,arguments);};}));
    restores.push(wrapMethod(props,'desktop',old=>{const self=this;return function(ray){if(!this.held.get('desktop')&&!this.builder?.active){const rc=new T.Raycaster(ray.origin,ray.direction,0,2),hit=rc.intersectObjects([...self.bags].filter(b=>!b.item.torn).map(b=>b.tab),false)[0];if(hit){hit.object.userData.h5TearTab.open();return true;}}return old.apply(this,arguments);};}));
    // Props owns rigid bodies; only the tab gesture is checked after its tick.
    restores.push(wrapMethod(props,'tick',old=>{const self=this;return function(dt){const result=old.apply(this,arguments);for(const [i,h] of self.tabHolds){if(this.system.hands.palmPos(i).distanceTo(h.start)>.065){h.bag.open();self.tabHolds.delete(i);}}self.tick(dt);return result;};}));
    return ()=>restores.reverse().forEach(f=>f());
  }
  dispose(){for(const item of this.items){item.cushions.forEach(c=>c.dispose());if(item.frameFuel)this.fire.unregister(item.frameFuel);}for(const bag of this.bags){if(bag.fuel)this.fire.unregister(bag.fuel);}this.items.clear();this.bags.clear();this.tabHolds.clear();}
}
