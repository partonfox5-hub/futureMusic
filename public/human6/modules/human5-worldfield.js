import * as T from 'three';
const clamp=T.MathUtils.clamp,lerp=T.MathUtils.lerp,smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export const WORLD_SIZE=2112,CELL_SIZE=96;
export const CITY_BLOCKS=Object.freeze([
 {id:'westgate',name:'Westgate apartments',x:94,z:29,w:20,d:18,floors:3,type:'apartments'},
 {id:'market',name:'Market House restaurant',x:144,z:31,w:24,d:20,floors:3,type:'restaurant'},
 {id:'civic',name:'Civic offices',x:196,z:56,w:24,d:22,floors:5,type:'office'},
 {id:'terrace',name:'Terrace apartments',x:250,z:56,w:22,d:20,floors:4,type:'apartments'},
 {id:'lookout',name:'Lookout penthouse',x:305,z:80,w:26,d:24,floors:7,type:'penthouse'},
 {id:'eastbank',name:'Eastbank offices',x:324,z:15,w:22,d:22,floors:6,type:'office'},
 {id:'copper',name:'Copper Court',x:292,z:-43,w:23,d:21,floors:4,type:'apartments'},
 {id:'garden',name:'Garden offices',x:238,z:-45,w:24,d:22,floors:5,type:'office'},
 {id:'foundry',name:'Foundry apartments',x:183,z:-32,w:20,d:20,floors:4,type:'apartments'},
 {id:'cedar',name:'Cedar offices',x:127,z:-43,w:22,d:20,floors:3,type:'office'},
 {id:'ridge',name:'Ridge apartments',x:204,z:-113,w:22,d:20,floors:6,type:'apartments'},
 {id:'summit',name:'Summit offices',x:273,z:-122,w:24,d:22,floors:7,type:'office'}
]);
export const ROUTES=Object.freeze([
 {id:'city-link',name:'Cul-de-sac connector',kind:'road',width:7,points:[[0,38],[0,52],[30,61],[60,60],[106,64],[155,69],[196,90],[246,89],[302,119],[355,111]]},
 {id:'city-loop',name:'Hillside Avenue',kind:'road',width:7,points:[[60,60],[63,-12],[73,-79],[125,-77],[168,-75],[220,-76],[277,-87],[328,-76],[356,-13],[355,111]]},
 {id:'civic-cross',name:'Civic Street',kind:'road',width:6,points:[[168,-75],[159,-10],[164,33],[155,69]]},
 {id:'garden-cross',name:'Garden Street',kind:'road',width:6,points:[[277,-87],[268,-9],[266,35],[246,89]]},
 {id:'ridge-loop',name:'Ridge Crescent',kind:'road',width:6,points:[[168,-75],[172,-145],[225,-158],[282,-158],[307,-117],[277,-87]]},
 {id:'river-road',name:'River picnic road',kind:'road',width:5,points:[[-65,68],[-128,0],[-233,-35],[-357,-60],[-427,-82]]},
 {id:'lake-road',name:'Lake road',kind:'road',width:6,points:[[0,52],[-65,68],[-145,99],[-220,164],[-245,245],[-224,325],[-146,354]]},
 {id:'lake-loop',name:'Lakeside footpath',kind:'trail',width:2.8,points:[[-220,164],[-292,127],[-384,111],[-468,149],[-517,233],[-481,318],[-389,361],[-292,348],[-224,325]]},
 {id:'forest',name:'Pine trail',kind:'trail',width:3,points:[[-65,68],[-96,-25],[-147,-124],[-206,-213],[-300,-271],[-377,-326],[-450,-415],[-541,-450]]},
 {id:'ridge-trail',name:'Mountain switchbacks',kind:'trail',width:2.6,points:[[-541,-450],[-588,-493],[-538,-526],[-606,-555],[-565,-589],[-628,-617],[-612,-663]]},
 {id:'volcano',name:'Caldera trail',kind:'trail',width:3,points:[[355,111],[429,75],[464,-27],[514,-144],[561,-250],[698,-357],[758,-419],[688,-465],[764,-510],[718,-551],[665,-565]]}
]);
export const LAKE={x:-380,z:235,rx:119,rz:107,level:-3};
export const RIVER=[[-526,-449,38],[-488,-340,23],[-456,-260,13],[-488,-166,7],[-445,-63,2],[-412,35,-1],[-383,127,-3]];
export const OUTFLOW=[[-388,337,-3],[-413,405,-3.6],[-490,482,-4.5],[-477,575,-5.2],[-550,687,-6],[-628,823,-7],[-682,1056,-8]];
export function hash2(x,z,seed=1701){let h=Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;}
function noise(x,z){const a=Math.floor(x),b=Math.floor(z),u=smooth(x-a),v=smooth(z-b);return lerp(lerp(hash2(a,b),hash2(a+1,b),u),lerp(hash2(a,b+1),hash2(a+1,b+1),u),v)*2-1;}
export function closestSegment(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz,t=clamp(((x-a[0])*dx+(z-a[1])*dz)/Math.max(length,1e-8),0,1),px=lerp(a[0],b[0],t),pz=lerp(a[1],b[1],t);return {distance:Math.hypot(x-px,z-pz),t,x:px,z:pz,dx,dz};}
export function nearestRoute(x,z,routes=ROUTES){let best=null;for(const route of routes)for(let i=0;i<route.points.length-1;i++){const p=closestSegment(x,z,route.points[i],route.points[i+1]);if(!best||p.distance<best.distance)best={...p,route,index:i};}return best;}
export function rawHeight(x,z){
 const hills=9*noise(x/140,z/140)+3*noise(x/47,z/47)+.7*noise(x/15,z/15)+3;
 const ridge=139*Math.exp(-(((x+630)/190)**2+((z+625)/320)**2))*(.78+.22*Math.cos((z+x*.4)/64));
 const r=Math.hypot(x-665,z+565),cone=r<48?110+20*(r/48)**2:184*Math.max(0,1-r/236)**1.5,crater=0;
 return hills+ridge+cone-crater;
}
function channel(x,z,points,width){let best=null;for(let i=0;i<points.length-1;i++){const p=closestSegment(x,z,points[i],points[i+1]);if(!best||p.distance<best.distance)best={...p,level:lerp(points[i][2],points[i+1][2],p.t),width};}return best;}
export class WorldField {
 constructor(){this.cell=2;this.half=WORLD_SIZE/2;this.edits=new Map();this.revision=0;this.listeners=new Set();this.options={minHeight:-32,maxHeight:220};this.blocks=CITY_BLOCKS.map(b=>({...b,y:Math.round(rawHeight(b.x,b.z)*2)/2,story:3.15}));this.routes=ROUTES.map(r=>({...r,points:r.points.map(([x,z])=>[x,z]),heights:r.points.map(([x,z])=>this.base(x,z))}));this.routeGrid=new Map();for(const route of this.routes)for(let i=0;i<route.points.length-1;i++){const a=route.points[i],b=route.points[i+1];for(let z=Math.floor((Math.min(a[1],b[1])-18)/64);z<=Math.floor((Math.max(a[1],b[1])+18)/64);z++)for(let x=Math.floor((Math.min(a[0],b[0])-18)/64);x<=Math.floor((Math.max(a[0],b[0])+18)/64);x++){const k=x+'/'+z;if(!this.routeGrid.has(k))this.routeGrid.set(k,[]);this.routeGrid.get(k).push({route,i,a,b});}}}
 base(x,z){let h=rawHeight(x,z);const origin=Math.max(Math.abs(x)/34,Math.abs(z+1)/44);h=lerp(0,h,smooth((origin-1)/.45));
  const lake=Math.hypot((x-LAKE.x)/LAKE.rx,(z-LAKE.z)/LAKE.rz);if(lake<1.23)h=lerp(LAKE.level-8*(1-smooth(lake*.84)),h,smooth((lake-.86)/.37));
  for(const points of [RIVER,OUTFLOW]){const q=channel(x,z,points,points===RIVER?12:15);if(q.distance<q.width*.5+12)h=lerp(q.level-2.5,h,smooth((q.distance-q.width*.32)/(q.width*.18+12)));}
  for(const b of this.blocks){const d=Math.max(Math.abs(x-b.x)-b.w/2-2.5,Math.abs(z-b.z)-b.d/2-2.5);if(d<7)h=lerp(b.y,h,smooth(d/7));}
  return h;
 }
 protected(x,z){return (Math.abs(x)<31&&z>-35&&z<40)||this.blocks.some(b=>Math.abs(x-b.x)<b.w/2+3&&Math.abs(z-b.z)<b.d/2+3);}
 routeAt(x,z){let best=null;for(const s of this.routeGrid.get(Math.floor(x/64)+'/'+Math.floor(z/64))||[]){const p=closestSegment(x,z,s.a,s.b);if(!best||p.distance<best.distance)best={...p,route:s.route,index:s.i};}return best;}
 heightAt(x,z){if(Math.abs(x)>this.half||Math.abs(z)>this.half)return null;let h=this.base(x,z);const p=this.routeAt(x,z);if(p&&p.distance<p.route.width/2+3){const a=p.route.points[p.index],b=p.route.points[p.index+1],pathH=lerp(p.route.heights[p.index],p.route.heights[p.index+1],p.t);h=lerp(pathH,h,smooth((p.distance-p.route.width/2)/3));}
  const i=Math.floor(x/this.cell),j=Math.floor(z/this.cell),u=x/this.cell-i,v=z/this.cell-j,get=(a,b)=>this.edits.get(a+'/'+b)||0;return h+lerp(lerp(get(i,j),get(i+1,j),u),lerp(get(i,j+1),get(i+1,j+1),u),v);
 }
 normalAt(x,z,out=new T.Vector3()){const e=.35,h=(x,z)=>this.heightAt(clamp(x,-this.half,this.half),clamp(z,-this.half,this.half))||0;return out.set(h(x-e,z)-h(x+e,z),2*e,h(x,z-e)-h(x,z+e)).normalize();}
 waterAt(x,z){let level=null,current=new T.Vector3(),id='lake';if(Math.hypot((x-LAKE.x)/LAKE.rx,(z-LAKE.z)/LAKE.rz)<1)level=LAKE.level;
  for(const points of [RIVER,OUTFLOW]){const q=channel(x,z,points,points===RIVER?12:15);if(q.distance<q.width/2&&(level===null||q.level>level)){level=q.level;current.set(q.dx,0,q.dz).normalize().multiplyScalar(.7);id='river';}}
  const floor=this.heightAt(x,z);return level!==null&&floor<level-.03?{surface:level,floor,current,body:{id,kind:id}}:null;
 }
 brush({x,z,radius=2,delta=0}={}){if(![x,z,radius,delta].every(Number.isFinite)||radius<=0||radius>24)return false;const edits=[];
  for(let j=Math.floor((z-radius)/this.cell);j<=Math.ceil((z+radius)/this.cell);j++)for(let i=Math.floor((x-radius)/this.cell);i<=Math.ceil((x+radius)/this.cell);i++){const px=i*this.cell,pz=j*this.cell,d=Math.hypot(px-x,pz-z)/radius;if(d>=1||this.protected(px,pz))continue;const key=i+'/'+j;edits.push([key,clamp((this.edits.get(key)||0)+delta*(1-d*d)**2,-12,12)]);}
  if(this.edits.size+edits.filter(([k])=>!this.edits.has(k)).length>40000)return false;
  for(const [k,v] of edits)this.edits.set(k,v);if(edits.length){this.revision++;for(const fn of this.listeners)fn({x,z,radius});return true;}return false;
 }
 excavate(x,z,r,bed){const center=this.heightAt(x,z);return center===null?false:this.brush({x,z,radius:r,delta:bed-center});}
 serialize(){return {format:'human5.worldfield/1',edits:[...this.edits]};}
 restore(input){if(input?.format!=='human5.worldfield/1'||!Array.isArray(input.edits)||input.edits.length>40000)throw Error('Invalid terrain state');const next=new Map();for(const [k,v] of input.edits){if(typeof k!=='string'||!/^[-]?\d+\/[-]?\d+$/.test(k)||!Number.isFinite(v)||Math.abs(v)>12)throw Error('Invalid terrain edit');const [x,z]=k.split('/').map(Number);if(Math.abs(x*this.cell)>this.half||Math.abs(z*this.cell)>this.half)throw Error('Terrain edit is out of bounds');next.set(k,v);}this.edits=next;this.revision++;for(const fn of this.listeners)fn({radius:Infinity,x:0,z:0});}
}
export function cellKey(x,z){return Math.floor(x/CELL_SIZE)+'/'+Math.floor(z/CELL_SIZE);}
export function desiredCells(x,z,radius=1){const cx=Math.floor(x/CELL_SIZE),cz=Math.floor(z/CELL_SIZE),out=[];for(let j=-radius;j<=radius;j++)for(let i=-radius;i<=radius;i++){const a=cx+i,b=cz+j;if(a<-11||a>=11||b<-11||b>=11)continue;out.push({key:a+'/'+b,x:a,z:b,d:Math.hypot((a+.5)*CELL_SIZE-x,(b+.5)*CELL_SIZE-z)});}return out.sort((a,b)=>a.d-b.d);}
