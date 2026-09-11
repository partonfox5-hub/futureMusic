import * as T from 'three';
import {wrapMethod,V,clamp} from './human5-common.js?v=18.0.0';

/** Persistent mesh-index trimming: no detached strand bodies or per-frame remeshing. */
export function installHairCutting({mira,props,world}={}){
 const states=new Map(),restores=[];
 function attach(a){if(states.has(a))return states.get(a);const s={actor:a,geometries:new Map(),guideCuts:new Map(),restore:[]};states.set(a,s);a.h5Haircuts=s;return s;}
 function trimGuides(a,point,radius){const groom=a.h5Groom;if(!groom?.group.visible)return 0;const s=attach(a),mesh=groom.group.children.find(m=>m.name==='Guided shoulder locks');if(!mesh)return 0;let changed=0;
  groom.locks.forEach((lock,i)=>{const end=s.guideCuts.get(i)??lock.points.length-1;for(let j=1;j<=end;j++){const segment=new T.Line3(lock.points[j-1],lock.points[j]),near=segment.closestPointToPoint(point,true,V());if(near.distanceTo(point)<=radius){const cut=Math.max(1,j-1);if(cut<end){s.guideCuts.set(i,cut);changed++;}break;}}});
  if(changed){const ids=[],nodes=groom.nodes||9;for(let l=0;l<groom.locks.length;l++)for(let j=0;j<(s.guideCuts.get(l)??nodes-1);j++)for(let k=0;k<2;k++){const a=l*nodes*3+j*3+k,b=a+3;ids.push(a,b,a+1,a+1,b,b+1);}mesh.geometry.setIndex(ids);groom.rebuildCuts?.(s.guideCuts);}return changed;
 }
 function trimClassic(a,point,radius){const hair=a.hairPhysics,mesh=hair?.mesh;if(!mesh?.visible||a.h5Groom?.group.visible)return 0;const s=attach(a),g=mesh.geometry,coords=g.attributes.v2HairCoord;if(!g.index||!coords)return 0;let r=s.geometries.get(g);if(!r){r={original:Array.from(g.index.array),cuts:new Map()};s.geometries.set(g,r);}mesh.updateWorldMatrix(true,false);let changed=0;
  const pos=g.attributes.position;for(let i=0;i<pos.count;i++){const p=mesh.getVertexPosition(i,V()).applyMatrix4(mesh.matrixWorld);if(p.distanceTo(point)>radius)continue;const chain=Math.floor(coords.getX(i)),level=coords.getY(i);if(level>.7&&level<(r.cuts.get(chain)??Infinity)){r.cuts.set(chain,level);changed++;}}
  if(changed){const keep=[];for(let j=0;j<r.original.length;j+=3){const ids=r.original.slice(j,j+3);if(ids.every(i=>coords.getY(i)<=(r.cuts.get(Math.floor(coords.getX(i)))??Infinity)+.03))keep.push(...ids);}g.setIndex(keep);g.computeBoundingSphere();}return changed;
 }
 function cut(a,point,radius=.06){if(!a||!point?.isVector3)return 0;return trimGuides(a,point,radius)+trimClassic(a,point,radius);}
 function regrow(a){const s=states.get(a);if(!s)return;for(const [g,r]of s.geometries)g.setIndex(r.original);s.geometries.clear();s.guideCuts.clear();const groom=a.h5Groom,mesh=groom?.group.children.find(m=>m.name==='Guided shoulder locks');if(mesh){const ids=[];for(let l=0;l<groom.locks.length;l++)for(let j=0;j<(groom.nodes||9)-1;j++)for(let k=0;k<2;k++){const a=l*(groom.nodes||9)*3+j*3+k,b=a+3;ids.push(a,b,a+1,a+1,b,b+1);}mesh.geometry.setIndex(ids);groom.rebuildCuts?.();}}
 restores.push(wrapMethod(props,'hit',old=>function(ray,max,ropes,opts={}){const body=old.apply(this,arguments);if(!['cut','sharp','laser'].includes(opts.kind))return body;const rc=new T.Raycaster(ray.origin,ray.direction,0,Math.min(max||50,body?.distance??Infinity)),meshes=[];
  for(const a of mira.actors){if(a.group.position.distanceTo(ray.origin)>4)continue;const groom=a.h5Groom;if(groom?.group.visible)groom.group.traverse(m=>{if(m.isMesh&&m.name==='Guided shoulder locks'){m.userData.h5CutHair=a;meshes.push(m);}});else if(a.hairPhysics?.mesh?.visible){const m=a.hairPhysics.mesh;m.userData.h5CutHair=a;meshes.push(m);}}
  const h=rc.intersectObjects(meshes,false)[0];return h&&(!body||h.distance<body.distance)?h:body;
 }));
 restores.push(wrapMethod(props,'impact',old=>function(hit,energy,dir,kind){const a=hit.object?.userData.h5CutHair;if(a&&['cut','sharp','laser'].includes(kind)){const n=cut(a,hit.point,clamp(.035+Math.sqrt(Math.max(0,energy))*.004,.035,.12));props.status=n?'Hair trimmed':'Hair contact';return n;}return old.apply(this,arguments);}));
 const api={states,cut,regrow,tick(){for(const a of mira.actors)attach(a);for(const [a,s]of states)if(!mira.actors.includes(a)){s.restore.forEach(f=>f());states.delete(a);}},snapshot(){return [...states].map(([a,s])=>({name:a.displayName,guides:[...s.guideCuts],classic:[...s.geometries.values()].map(r=>[...r.cuts])}));},dispose(){restores.reverse().forEach(f=>f());for(const [a]of states)delete a.h5Haircuts;states.clear();}};world.h5Haircuts=api;return api;
}
