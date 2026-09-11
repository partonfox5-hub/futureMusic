import * as T from 'three';
import {mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {fabricMaterial} from '../mira-v2-garment-patterns.js?v=19.1.0';
const V=(x,y)=>new T.Vector2(x,y);
function flatPanel(out,outline){
 const points=outline.map(p=>V(...p)),tri=T.ShapeUtils.triangulateShape(points,[]),pos=[],uv=[],indices=[];
 // Subdivide each face twice so draping folds change the silhouette and lighting.
 function face(a,b,c,depth){if(depth){const ab=a.clone().add(b).multiplyScalar(.5),bc=b.clone().add(c).multiplyScalar(.5),ca=c.clone().add(a).multiplyScalar(.5);face(a,ab,ca,depth-1);face(ab,b,bc,depth-1);face(ca,bc,c,depth-1);face(ab,bc,ca,depth-1);return;}
  for(const side of [1,-1]){const start=pos.length/3;for(const p of [a,b,c]){const fold=Math.sin(p.x*48+p.y*3)*.008*Math.min(1,Math.abs(p.y)*4);pos.push(p.x,p.y,side*.008+fold);uv.push(p.x+.5,-p.y);}indices.push(...(side===1?[start,start+1,start+2]:[start,start+2,start+1]));}}
 for(const [a,b,c]of tri)face(points[a],points[b],points[c],2);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();out.push(g);
}
export function rackGarmentGeometry(s){
 const out=[],cut=s.cut||s.id,L=Math.max(.18,s.top-s.bottom),panel=p=>flatPanel(out,p),w=.23;
 const shirt=['fieldShirt','tacticalShirt','redcoat','tornShirt','streetShirt','suitJacket'].includes(s.id),pants=['jeans','suitPants','workPants','tacticalPants','leggings','shorts','sleepShorts'].includes(s.id);
 if(pants){const hem=['shorts','sleepShorts'].includes(s.id)?.34:L;panel([[-.22,0],[.22,0],[.245,-.18],[.20,-hem],[.035,-hem],[.025,-.24],[-.025,-.24],[-.035,-hem],[-.20,-hem],[-.245,-.18]]);}
 else if(s.slot==='underwear'){panel([[-.225,0],[.225,0],[.20,-.07],[.064,-.18],[-.064,-.18],[-.20,-.07]]);}
 else if(cut==='bikiniTop'){for(const sign of [-1,1]){panel([[sign*.02,-.18],[sign*.19,-.18],[sign*.12,-.04]]);panel([[sign*.105,-.045],[sign*.13,-.045],[sign*.15,.06],[sign*.135,.06]]);}panel([[-.235,-.18],[.235,-.18],[.235,-.204],[-.235,-.204]]);}
 else if(['tube','bandeau'].includes(cut)){panel([[-w,0],[w,0],[w*.94,-L],[-w*.94,-L]]);}
 else if(s.kind==='drape'){panel([[-.20,0],[.20,0],[.31,-L],[-.30,-L]]);}
 else if(shirt){const sleeve=s.id==='streetShirt'||s.id==='fieldShirt'?.19:.45;panel([[-.06,-.06],[.06,-.06],[.095,.025],[.24,-.015],[.40,-sleeve],[.30,-sleeve-.035],[.22,-.17],[.225,-L],[-.225,-L],[-.22,-.17],[-.30,-sleeve-.035],[-.40,-sleeve],[-.24,-.015],[-.095,.025]]);}
 else{const dress=s.slot==='dress',hem=dress?.29:.23;panel([[-.07,-.10],[.07,-.10],[.125,.025],[.15,.025],[.21,-.16],[hem,-L],[-hem,-L],[-.21,-.16],[-.15,.025],[-.125,.025]]);}
 const pos=[],uv=[],idx=[];let offset=0;for(const g of out){pos.push(...g.attributes.position.array);uv.push(...g.attributes.uv.array);idx.push(...Array.from(g.index.array,v=>v+offset));offset+=g.attributes.position.count;g.dispose();}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.deleteAttribute('normal');const welded=mergeVertices(g,1e-5);g.dispose();welded.computeVertexNormals();welded.computeBoundingSphere();return welded;
}
/** Same style object/material as fitted cloth. Six full-size garments per rack page. */
export function populateGarmentRack(wardrobe,styles){
 const {rack,tokens}=wardrobe;wardrobe.rackPage=0;const hangers=[];
 const metal=new T.MeshStandardMaterial({color:0xaaa59a,metalness:.7,roughness:.4});
 for(const [i,s]of styles.entries()){
  const mesh=new T.Mesh(rackGarmentGeometry(s),fabricMaterial(s));mesh.name='Rack '+s.name;mesh.userData.article=s;mesh.position.set((i%6-2.5)*.205,1.71,0);mesh.rotation.y=Math.PI*.30;mesh.castShadow=mesh.receiveShadow=true;rack.add(mesh);tokens.push(mesh);
  const path=new T.CatmullRomCurve3([new T.Vector3(-.22,-.02,0),new T.Vector3(0,.085,0),new T.Vector3(.22,-.02,0),new T.Vector3(-.22,-.02,0)]);const h=new T.Mesh(new T.TubeGeometry(path,18,.003,4,false),metal);h.position.copy(mesh.position);h.rotation.copy(mesh.rotation);rack.add(h);hangers.push(h);
  const hook=new T.Mesh(new T.TorusGeometry(.027,.003,4,12,Math.PI*1.6),metal);hook.position.set(0,.16,0);h.add(hook);
 }
 const controls=[];
 for(const dir of [-1,1]){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#27373c';c.fillRect(0,0,256,128);c.fillStyle='#f6eee0';c.font='bold 38px sans-serif';c.textAlign='center';c.fillText(dir<0?'‹ PREV':'NEXT ›',128,78);const texture=new T.CanvasTexture(canvas),button=new T.Mesh(new T.PlaneGeometry(.26,.13),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));button.position.set(dir*.44,1.91,.10);button.userData.rackPageDirection=dir;rack.add(button);controls.push(button);}
 wardrobe.rackControls=controls;wardrobe.setRackPage=n=>{wardrobe.rackPage=((n%Math.ceil(styles.length/6))+Math.ceil(styles.length/6))%Math.ceil(styles.length/6);tokens.forEach((m,i)=>{m.visible=Math.floor(i/6)===wardrobe.rackPage;hangers[i].visible=m.visible;});wardrobe.status='Clothes rack · page '+(wardrobe.rackPage+1)+' of '+Math.ceil(styles.length/6);};wardrobe.setRackPage(0);
 return {hangers,controls};
}
