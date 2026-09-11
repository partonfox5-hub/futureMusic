import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Bounded, one-material silhouettes. No alpha cards or per-object scene nodes. */
function combine(parts){const geos=parts.map(([g,color])=>{const c=new T.Color(color),a=[];for(let i=0;i<g.attributes.position.count;i++)a.push(c.r,c.g,c.b);g.setAttribute('color',new T.Float32BufferAttribute(a,3));return g;});const g=mergeGeometries(geos);geos.forEach(g=>g.dispose());return g;}
export function distantCarGeometry(){const parts=[],add=(g,p,col)=>{g.translate(...p);parts.push([g,col]);};
 add(new T.BoxGeometry(1.76,.44,4.18),[0,-.17,0],0xffffff);add(new T.BoxGeometry(1.67,.13,1.13),[0,.10,1.47],0xffffff);add(new T.BoxGeometry(1.65,.12,.75),[0,.10,-1.67],0xffffff);
 // Raked windscreen and rear window, narrower roof, broad waistline.
 const p=[-.83,.10,-1.28,.83,.10,-1.28,.83,.10,1.13,-.83,.10,1.13,-.68,.70,-.82,.68,.70,-.82,.68,.70,.53,-.68,.70,.53];
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(new Array(16).fill(0),2));g.setIndex([0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0]);g.computeVertexNormals();parts.push([g,0x26353b]);add(new T.BoxGeometry(1.40,.045,1.38),[0,.713,-.13],0xe4e5e0);
 for(const x of [-.865,.865]){for(const z of [-1.31,1.31]){const tire=new T.CylinderGeometry(.34,.34,.22,10);tire.rotateZ(Math.PI/2);add(tire,[x,-.41,z],0x141619);}add(new T.BoxGeometry(.035,.57,.065),[x*.86,.385,.06],0xc1c8c8);}
 for(const x of [-.59,.59]){add(new T.BoxGeometry(.36,.09,.014),[x,.0,2.098],0xe5e5c4);add(new T.BoxGeometry(.35,.095,.014),[x,.0,-2.098],0x9e312a);}
 return combine(parts);
}
export function distantPersonGeometry(){const parts=[],add=(g,p,c)=>{g.translate(...p);parts.push([g,c]);};
 const torso=new T.CylinderGeometry(.19,.15,.52,7);torso.scale(1,1,.62);add(torso,[0,1.20,0],0xb3bcc2);add(new T.BoxGeometry(.30,.16,.20),[0,.88,0],0x465665);
 add(new T.CylinderGeometry(.055,.061,.115,6),[0,1.495,0],0xbd9c80);const head=new T.SphereGeometry(.113,8,6);head.scale(.88,1.18,.94);add(head,[0,1.655,0],0xc6a182);
 const hair=new T.SphereGeometry(.115,8,4,0,Math.PI*2,0,Math.PI*.54);hair.scale(.91,1.20,.96);add(hair,[0,1.659,-.008],0x453d35);
 for(const side of [-1,1]){const arm=new T.CapsuleGeometry(.052,.44,2,6);arm.rotateZ(side*.10);add(arm,[side*.238,1.165,0],0x9faab3);add(new T.SphereGeometry(.052,6,4),[side*.268,.88,.018],0xc6a182);const leg=new T.CapsuleGeometry(.072,.57,2,6);add(leg,[side*.092,.459,0],0x3c4b5b);add(new T.BoxGeometry(.125,.085,.23),[side*.092,.045,.04],0x242a2c);}
 const g=combine(parts),p=g.attributes.position,limbs=[];for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);limbs.push(Math.sign(x)*(y<.9?(1-y/.9):Math.abs(x)>.20?-(1.47-y):0));}g.setAttribute('h5Limb',new T.Float32BufferAttribute(limbs,1));g.translate(0,-.95,0);return g;
}
export function distantPeopleMaterial(){const m=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.95});m.userData.time={value:0};m.onBeforeCompile=s=>{s.uniforms.h5DistanceTime=m.userData.time;s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float h5Limb;uniform float h5DistanceTime;').replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.z+=sin(h5DistanceTime*6.0+instanceMatrix[3].x*.11)*h5Limb*.15;');};m.customProgramCacheKey=()=> 'h5-distance-person-17.9';return m;}
