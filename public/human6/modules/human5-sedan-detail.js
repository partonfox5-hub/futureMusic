import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Refines the original sedan without changing wheelbase, hinges, controls or collision hull. */
export function refineOriginalSedan(car){
 if(car.vehicleKind!=='sedan'||car.h5SedanDetail)return;car.h5SedanDetail=true;const group=car.group;
 const rubber=new T.MeshStandardMaterial({color:0x161b20,roughness:.83}),chrome=new T.MeshStandardMaterial({color:0x8e999e,metalness:.86,roughness:.23}),lens=new T.MeshStandardMaterial({color:0xc7dbe1,metalness:.35,roughness:.14,emissive:0xd8eaf5,emissiveIntensity:.14});
 const buckets=new Map();group.updateMatrixWorld(true);
 function add(g,mat,parent=group){if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}let entry=buckets.get(parent);if(!entry)buckets.set(parent,entry=new Map());if(!entry.has(mat))entry.set(mat,[]);const matrix=new T.Matrix4().copy(parent.matrixWorld).invert().multiply(group.matrixWorld);g.applyMatrix4(matrix);entry.get(mat).push(g);}
 function box(center,size,mat,parent,rad=.025){const g=new RoundedBoxGeometry(...size,2,Math.min(rad,...size.map(s=>s*.45)));g.translate(...center);add(g,mat,parent);}
 function beam(a,b,width,depth,mat,parent){const start=new T.Vector3(...a),end=new T.Vector3(...b),g=new RoundedBoxGeometry(width,start.distanceTo(end),depth,2,Math.min(width,depth)*.22);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),end.clone().sub(start).normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());add(g,mat,parent);}
 const chassis=car.parts.find(p=>p.name==='Chassis')?.mesh||group,front=car.parts.find(p=>p.name==='Front bumper')?.mesh||chassis,rear=car.parts.find(p=>p.name==='Rear bumper')?.mesh||chassis;
 // Correctly raked pillars meet the glass corners instead of ending in space.
 for(const m of [...group.children])if(m.isMesh&&Math.abs(m.position.y-1.235)<.001&&Math.abs(Math.abs(m.position.x)-.728)<.001){m.removeFromParent();m.geometry.dispose();}
 const paint=car.parts.find(p=>p.name==='Roof')?.mesh.material||chrome;
 for(const s of [-1,1]){beam([s*.816,.978,-.937],[s*.695,1.49,-.595],.045,.043,paint,chassis);beam([s*.817,.98,1.095],[s*.695,1.49,.707],.055,.044,paint,chassis);beam([s*.827,.967,.129],[s*.705,1.505,.129],.043,.053,rubber,chassis);
  beam([s*.86,.355,-.92],[s*.86,.355,1.10],.055,.052,rubber,chassis);
  // Mirror housings and glass are placed outside the driver's sight line.
  const door=car.hinges.find(h=>h.kind==='door'&&h.sign===(s<0?-1:1)&&h.pivot.z<0)?.panel.mesh||chassis;
  beam([s*.835,1.02,-.68],[s*1.0,1.055,-.67],.033,.043,rubber,door);box([s*1.025,1.076,-.65],[.175,.105,.19],paint,door,.042);box([s*1.027,1.076,-.548],[.14,.075,.009],chrome,door,.02);
 }
 box([0,.555,-2.237],[1.16,.132,.018],rubber,front,.03);for(let i=-4;i<=4;i++)box([i*.125,.555,-2.251],[.012,.10,.012],chrome,front,.003);
 box([0,.421,-2.217],[1.52,.035,.025],rubber,front,.008);box([0,.49,2.251],[1.58,.036,.018],rubber,rear,.007);
 for(const z of [-2.261,2.265]){box([0,.674,z],[.36,.090,.007],chrome,z<0?front:rear,.005);box([0,.674,z+(z<0?-.004:.004)],[.315,.067,.003],rubber,z<0?front:rear,.002);}
 for(const s of [-1,1]){const tailpipe=new T.CylinderGeometry(.037,.037,.17,12,1,true);tailpipe.rotateX(Math.PI/2);tailpipe.translate(s*.62,.33,2.1);add(tailpipe,chrome,rear);
  const head=car.parts.find(p=>p.name==='Headlight'&&p.mesh.geometry.attributes.position.getX(0)*s>0)?.mesh;
  if(head){for(const dx of [-.07,.075]){const r=new T.TorusGeometry(.035,.007,6,16);r.translate(s*.60+dx,.785,-2.083);add(r,chrome,head);const d=new T.CircleGeometry(.028,16);d.rotateY(Math.PI);d.translate(s*.60+dx,.785,-2.086);add(d,lens,head);}}
 }
 box([0,.63,-1.33],[.69,.19,.53],rubber,chassis,.035);box([0,.59,-1.82],[1.15,.26,.07],rubber,chassis,.02);
 // Tire shoulder, tread crown and rim are separate surfaces with correct axial width.
 for(const w of car.wheels){const old=w.mesh.geometry,profile=[[.191,-.104],[.258,-.104],[.310,-.091],[.336,-.060],[.340,-.026],[.340,.026],[.336,.060],[.310,.091],[.258,.104],[.191,.104]].map(p=>new T.Vector2(...p)),g=new T.LatheGeometry(profile,32);g.rotateZ(Math.PI/2);w.mesh.geometry=g;w.mesh.rotation.set(0,0,0);old.dispose();
  const spokeParts=[];for(const m of [...w.spin.children])if(m!==w.mesh&&m.geometry?.type==='BoxGeometry'){m.updateMatrix();spokeParts.push(m.geometry.clone().applyMatrix4(m.matrix));m.removeFromParent();m.geometry.dispose();}
  if(spokeParts.length){const merged=mergeGeometries(spokeParts);spokeParts.forEach(g=>g.dispose());const m=new T.Mesh(merged,chrome);m.userData.carPart=w;m.castShadow=true;w.spin.add(m);car.pickables.push(m);}
  const hub=new T.Mesh(new T.CylinderGeometry(.055,.055,.185,16),chrome);hub.rotation.z=Math.PI/2;hub.userData.carPart=w;w.spin.add(hub);car.pickables.push(hub);
 }
 for(const [parent,materials]of buckets)for(const [material,parts]of materials){const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());const mesh=new T.Mesh(merged,material);mesh.name='Sedan '+(material===paint?'body finish':material===chrome?'metal details':material===lens?'projectors':'seals and trim');mesh.castShadow=false;mesh.receiveShadow=true;mesh.userData.carPart=parent.userData.carPart;parent.add(mesh);if(mesh.userData.carPart)car.pickables.push(mesh);}
 // Meshes removed above must not remain in raycast lists.
 car.pickables=car.pickables.filter(m=>m.parent);
}
