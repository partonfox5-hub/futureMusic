import * as T from '../vendor/three.module.js';
const shell=new T.MeshStandardMaterial({color:0x293c56,roughness:.32,metalness:.8});
const dark=new T.MeshStandardMaterial({color:0x09131c,roughness:.62,metalness:.5});
const red=new T.MeshStandardMaterial({color:0xb52235,emissive:0xf91d37,emissiveIntensity:1.6,metalness:.35,roughness:.25});
const teal=new T.MeshStandardMaterial({color:0x1cd9b6,emissive:0x28eec1,emissiveIntensity:1.5,roughness:.3,metalness:.4});
const brass=new T.MeshStandardMaterial({color:0xc6964b,roughness:.38,metalness:.75});
function part(group,geo,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);group.add(m);return m;}
const sphere=new T.SphereGeometry(1,12,8), box=new T.BoxGeometry(1,1,1), octa=new T.OctahedronGeometry(1,1), ring=new T.TorusGeometry(.36,.038,6,24);
export function makeDrone(){
  const g=new T.Group();
  part(g,octa,shell,0,0,0,.49,.38,.57);
  part(g,sphere,dark,0,0,.35,.36,.24,.27);
  part(g,sphere,red,0,0,.54,.25,.10,.075);
  part(g,ring,brass,0,0,-.3);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+Math.PI/4,x=Math.cos(a),y=Math.sin(a);
    const fin=part(g,box,shell,x*.43,y*.43,-.05,.14,.48,.42);fin.rotation.z=a-Math.PI/2;
    part(g,sphere,red,x*.54,y*.54,-.30,.07,.07,.14);
    part(g,box,brass,x*.44,y*.44,.14,.13,.07,.15).rotation.z=a;
  }
  return g;
}
export function makeBlaster(){
  const g=new T.Group();
  part(g,box,shell,0,0,-.15,.095,.12,.32);
  part(g,box,dark,0,-.105,-.025,.075,.18,.1).rotation.x=-.22;
  part(g,box,brass,0,.07,-.20,.07,.04,.22);
  part(g,box,teal,0,.10,-.12,.015,.018,.09);
  const barrel=part(g,new T.CylinderGeometry(.035,.044,.18,12),dark,0,.014,-.39);barrel.rotation.x=Math.PI/2;
  const rim=part(g,new T.TorusGeometry(.034,.008,5,16),teal,0,.014,-.48);
  const flash=part(g,new T.ConeGeometry(.055,.19,8),new T.MeshBasicMaterial({color:0xffd5ab}),0,.014,-.58);flash.rotation.x=-Math.PI/2;flash.visible=false;g.userData.flash=flash;
  return g;
}
// Combine authored pieces that share a material. Used by the batching pass.
export function mergeParts(root){
  const buckets=new Map();root.updateMatrixWorld(true);
  root.traverse(o=>{if(!o.isMesh)return;let b=buckets.get(o.material);if(!b){b=[];buckets.set(o.material,b);}const geom=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld);b.push(geom);});
  return [...buckets].map(([material,geos])=>{
    const geom=new T.BufferGeometry();
    for(const key of ['position','normal','uv']){let length=0;for(const g of geos)length+=g.getAttribute(key).array.length;const a=new Float32Array(length);let at=0;for(const g of geos){const data=g.getAttribute(key).array;a.set(data,at);at+=data.length;}geom.setAttribute(key,new T.BufferAttribute(a,key==='uv'?2:3));}
    for(const g of geos)g.dispose();geom.computeBoundingSphere();return {geometry:geom,material};
  });
}
