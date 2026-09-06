import * as T from 'three';
const V=()=>new T.Vector3();
export function garmentPattern(actor,style,surface){
 const p=[],refs=[],pins=[],faces=[],uv=[],weld=new Map(),bottom=style.kind==='dress'?.91:style.bottom;
 const accepts=(x,y,z)=>{if(y<bottom||y>style.top||Math.abs(x)>.235)return false;
  if(['top','dress','slipDress'].includes(style.id)&&y>1.265&&z>-.06)return Math.abs(Math.abs(x)-.098)<.025;
  if(style.id==='bikiniTop'&&z>.01){const t=T.MathUtils.clamp((y-1.13)/.16,0,1);return Math.abs(Math.abs(x)-.077)<.073*(1-t)+.011;}
  if(['briefs','bikiniBottom'].includes(style.id)){const center=Math.abs(x);return y>.86-.06*Math.max(0,1-center/.10)||(center<.045&&y>.75);}
  return true;};
 const add=(mesh,id,tri)=>{const g=mesh.geometry,raw=V().fromBufferAttribute(g.attributes.position,id),key=(raw.y<.75?Math.sign(raw.x)+'/':'')+[raw.x,raw.y,raw.z].map(x=>Math.round(x/.023)).join('/');if(weld.has(key))return weld.get(key);const i=p.length;weld.set(key,i);const position=mesh.getVertexPosition(id,V()).applyMatrix4(mesh.matrixWorld),normal=V().fromBufferAttribute(g.attributes.normal,id).transformDirection(mesh.matrixWorld);position.addScaledVector(normal,.012);p.push(position);const k=tri.indexOf(id),bary=V();bary.setComponent(k,1);let bi=0,weight=-1;for(let j=0;j<4;j++)if(g.attributes.skinWeight.array[id*4+j]>weight){weight=g.attributes.skinWeight.array[id*4+j];bi=g.attributes.skinIndex.array[id*4+j];}refs.push({cache:surface.stores.get(g.attributes.position),ids:tri,bary,bone:mesh.skeleton.bones[bi]});pins.push(raw.y>style.top-.035||(style.id==='bikiniTop'&&raw.y<1.145));uv.push(Math.atan2(raw.x,raw.z)/(2*Math.PI)+.5,(style.top-raw.y)/Math.max(.01,style.top-style.bottom));return i;};
 if(style.kind!=='drape')actor.root.traverse(mesh=>{if(!mesh.isSkinnedMesh||!/^body/.test(mesh.name)||!/Skin_/.test(mesh.material?.name))return;const g=mesh.geometry;for(let i=0;i<g.index.count;i+=3){const tri=[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)],centroid=V();for(const id of tri)centroid.add(V().fromBufferAttribute(g.attributes.position,id));centroid.divideScalar(3);if(!accepts(centroid.x,centroid.y,centroid.z))continue;const indices=tri.map(id=>add(mesh,id,tri));if(new Set(indices).size===3)faces.push(indices);}});
 const fitted=p.length;
 if(style.kind!=='surface'){
  const n=28,rows=9,top=style.kind==='dress'?.95:style.top,start=p.length,h=actor.shape.height;
  for(let row=0;row<rows;row++)for(let col=0;col<n;col++){const u=col/n,v=row/(rows-1),y=T.MathUtils.lerp(top,style.bottom,v),flare=(top-y)*(style.flare||.2),angle=u*2*Math.PI;const pt=actor.group.localToWorld(new T.Vector3(Math.sin(angle)*(.20*Math.sqrt(actor.shape.hips)+.018+flare)*h,y*h,Math.cos(angle)*(.15+.032*Math.cbrt(actor.shape.butt)+flare)*h));if(row===0)surface.project(pt,.016);const ref=surface.lastClosest;p.push(pt);refs.push(row===0&&ref?ref:null);pins.push(row===0);uv.push(u,v);}
  for(let row=0;row<rows-1;row++)for(let col=0;col<n;col++){const a=start+row*n+col,b=start+row*n+(col+1)%n;faces.push([a,a+n,b],[b,a+n,b+n]);}
 }
 return {p,refs,pins,faces,uv,fitted};
}
export function fabricMaterial(style){const satin=style.fabric==='satin',m=new T.MeshPhysicalMaterial({color:style.color,roughness:satin?.48:.9,metalness:0,side:T.DoubleSide,sheen:satin?.6:.22,sheenColor:new T.Color(style.color),sheenRoughness:.75});m.onBeforeCompile=s=>{s.vertexShader='varying vec2 fabricUV;\n'+s.vertexShader;s.fragmentShader='varying vec2 fabricUV;\n'+s.fragmentShader;s.vertexShader=s.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nfabricUV=uv;');s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 weaveUv=fabricUV*vec2(${style.fabric==='rib'?'110.0,18.0':'190.0,145.0'});float lod=1.0-smoothstep(.35,1.5,max(fwidth(weaveUv.x),fwidth(weaveUv.y)));float weave=sin(weaveUv.x*6.28318)*sin(weaveUv.y*6.28318);float hem=1.0-smoothstep(.004,.018,min(fabricUV.y,1.0-fabricUV.y));diffuseColor.rgb*=1.0+weave*lod*.035-hem*.11;`);};m.customProgramCacheKey=()=> 'mira-fabric-r9-'+style.fabric;return m;}
