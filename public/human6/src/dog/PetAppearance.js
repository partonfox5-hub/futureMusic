import * as T from 'three';
import {PET_SURFACES} from './PetSurfaces.js?v=18.0.0';
import {PET_BREEDS,breedIdFor} from './PetBreeds.js?v=18.0.0';
const clamp=T.MathUtils.clamp,cache=new Map();
function bytes(str){return Uint8Array.from(atob(str),c=>c.charCodeAt(0));}
function geometry(id){
 if(cache.has(id))return cache.get(id).clone();const s=PET_SURFACES[id],p=new Uint16Array(bytes(s.position).buffer),n=new Int8Array(bytes(s.normal).buffer),f=new Float32Array(p.length),norm=new Float32Array(n.length),uv=[];
 for(let i=0;i<p.length;i++){f[i]=s.min[i%3]+p[i]/65535*s.range[i%3];norm[i]=n[i]/127;}
 for(let i=0;i<p.length;i+=3)uv.push(f[i+2]*1.8,f[i+1]*2.5);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(f,3));g.setAttribute('normal',new T.BufferAttribute(norm,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(bytes(s.joints),4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(Array.from(bytes(s.weights),v=>v/255),4));g.setIndex(new T.BufferAttribute(new Uint16Array(bytes(s.index).buffer),1));cache.set(id,g);return g.clone();
}
export function petCoatColor(m,x,y,z,kind='coat'){
 const coat=m.breed.coat,base=new T.Color(coat==='blue'?0x78808b:coat==='points'?0xd5c4a8:coat==='tricolor'?0xe1d2b3:coat==='saddle'?0x9c713e:coat==='tabby'?0x8c8376:0xcda76d);
 const dark=new T.Color(coat==='points'?0x42342f:coat==='tabby'?0x3c3935:0x292827),white=new T.Color(0xe8e0d0),tan=new T.Color(0xae6e3b);
 const smooth=(a,b,v)=>T.MathUtils.smoothstep(v,a,b);
 if(coat==='yellow')base.lerp(white,smooth(.61,.44,y)*.16);
 if(coat==='tricolor'){const saddle=smooth(.44,.49,y)*(1-smooth(.16,.29,z));base.lerp(dark,saddle);if(z>.28)base.lerp(tan,.88);const blaze=(1-smooth(.009,.026,Math.abs(x)))*smooth(.68,.81,y)*smooth(.36,.42,z);base.lerp(white,Math.max(blaze,kind==='muzzle'?.85:0));if(y<.18||z<-.58)base.copy(white);}
 if(coat==='saddle'){base.lerp(dark,smooth(.43,.56,y)*(1-smooth(.15,.32,z)));if(z>.49||kind==='ear')base.lerp(dark,.87);}
 if(coat==='points'){let point=Math.max(smooth(.70,.75,y)*smooth(.34,.46,z),1-smooth(.07,.23,y),smooth(.40,.60,-z));if(kind==='ear')point=1;base.lerp(dark,point*.93);}
 if(coat==='tabby'){const stripe=Math.sin(z*45+Math.sin(y*22)*1.6+Math.abs(x)*14);base.lerp(dark,smooth(.15,.84,stripe)*.78);if(z>.16&&y<.52||kind==='muzzle')base.lerp(white,.72);}
 if(kind==='muzzle'&&coat==='blue')base.lerp(white,.14);
 return base;
}
export function buildPetAppearance(m){
 const b=m.breed,cat=m.species==='cat';m.coat.color.set(0xffffff);m.coat.vertexColors=true;m.coat.roughness=.88;m.irisMaterial.color.setHex(b.eye);m.eye.color.setHex(cat?0x555046:0x28231e);m.corneaMaterial.opacity=.18;
 m.coatColor=(x,y,z,k)=>petCoatColor(m,x,y,z,k);
 const g=geometry(m.breedId),p=g.attributes.position,c=[],fur=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),color=m.coatColor(x,y,z);c.push(color.r,color.g,color.b);fur.push(b.fur*(y>.64?.42:1));}
 g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setAttribute('dogFurLength',new T.Float32BufferAttribute(fur,1));m.body=m.mesh('breed_body_'+m.breedId,g,m.coat,true);
 const mc=b.muzzleCenter,mr=b.muzzle,tip=mc[2]+mr[2]*.91;
 m.muzzleOffset=new T.Vector3(0,mc[1]-.007,tip+.007).sub(m.bind.Head);
 m.noseMaterial.color.setHex(cat&&b.coat!=='points'?0xa97571:0x211d1a);
 m.ellipsoid('nose',[0,mc[1]+.011,tip],[mr[0]*.67,cat?.012:.023,.013],'Head',m.noseMaterial,'coat',18,10);
 for(const side of [-1,1]){
  m.ellipsoid('nostril',[side*mr[0]*.4,mc[1]+.008,tip+.011],[cat?.003:.006,.004,.002],'Head',m.pupilMaterial,'coat',10,6);
  const hx=b.head[0],hc=b.headCenter,center=new T.Vector3(side*hx*.70,hc[1]+.018,hc[2]+b.head[2]*.78),r=cat?.018:.014,angle=side*(cat?.27:.40);
  const front=new T.Vector3(Math.sin(angle),0,Math.cos(angle));
  m.ellipsoid('eye_globe',center.toArray(),[r,r*.84,r*.66],'Head',m.eye,'coat',18,12);
  for(const [name,rad,mat,d,sy] of [['iris',r*.82,m.irisMaterial,r*.60,1],['pupil',r*.48,m.pupilMaterial,r*.64,cat?1.4:1],['cornea',r*.94,m.corneaMaterial,r*.68,1]]){
   const q=new T.CircleGeometry(rad,24);if(name==='pupil'&&cat)q.scale(.30,sy,1);q.rotateY(angle);q.translate(...center.clone().addScaledVector(front,d).toArray());m.skin(q,'Head');m.mesh(name,q,mat);
  }
  // Almond eyelid rim follows the globe; no floating human-like sclera rings.
  const pts=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI*2;pts.push(center.clone().add(new T.Vector3(Math.cos(a)*r*1.03,Math.sin(a)*r*.80,r*.22)).toArray());}
  m.tube('eyelid',pts,pts.map(()=>.0016),'Head',m.rimMaterial,5);
  const base=new T.Vector3(side*hx*.78,hc[1]+b.head[1]*.70,hc[2]-.018),drop=b.ear==='drop',pos=[],uv=[],idx=[];
  for(let row=0;row<=14;row++){const t=row/14,width=(drop?.037:.045)*(drop?Math.pow(Math.sin(Math.PI*(.10+.88*t)),.45):Math.pow(1-t,.85))+.001;
   for(let col=0;col<=8;col++){const u=col/8*2-1;pos.push(base.x+side*(drop?.015+.025*Math.sin(t*Math.PI):t*.020)+u*width,base.y+(drop?-1:1)*t*b.earLength,base.z+(drop?.018+.025*Math.sin(t*3):.010*Math.sin(t*Math.PI))+(1-u*u)*.014);uv.push(col/8,t);if(row<14&&col<8){const a=row*9+col;idx.push(a,a+9,a+1,a+1,a+9,a+10);}}
  }
  const eg=new T.BufferGeometry();eg.setAttribute('position',new T.Float32BufferAttribute(pos,3));eg.setAttribute('uv',new T.Float32BufferAttribute(uv,2));eg.setIndex(idx);eg.computeVertexNormals();m.skin(eg,'Head');const ec=eg.attributes.color;for(let i=0;i<ec.count;i++){const col=m.coatColor(eg.attributes.position.getX(i),eg.attributes.position.getY(i),eg.attributes.position.getZ(i),'ear');ec.setXYZ(i,col.r,col.g,col.b);}
  const em=m.coat.clone();em.side=T.DoubleSide;m.materials.add(em);const ear=m.mesh('ear_'+side,eg,em),delta=new Float32Array(pos.length);for(let i=0;i<pos.length;i+=3){const t=uv[i/3*2+1];delta[i+1]=-b.earLength*.25*t;delta[i+2]=-.04*t;}eg.morphTargetsRelative=true;eg.morphAttributes.position=[new T.BufferAttribute(delta,3)];ear.updateMorphTargets();m.ears.push(ear);
  if(cat){const inner=m.material({color:b.coat==='points'?0x6e5150:0xb99493,roughness:1,side:T.DoubleSide});const ig=eg.clone();ig.morphAttributes={};const ip=ig.attributes.position;for(let i=0;i<ip.count;i++){const t=uv[i*2+1];ip.setXYZ(i,base.x+(ip.getX(i)-base.x)*.67,base.y+(ip.getY(i)-base.y)*.76+.005,ip.getZ(i)+.0015);}m.mesh('ear_inner',ig,inner);}
  if(cat)for(let k=0;k<4;k++){const pts=[];for(let j=0;j<6;j++){const t=j/5;pts.push([side*(mr[0]*.7+t*.14),mc[1]+(k-1.5)*.012+t*(k-1.5)*.009,tip-.012-t*.037]);}m.tube('whiskers',pts,pts.map((_,i)=>.00065*(1-i/6)),'Head',m.materialsWhisker||(m.materialsWhisker=m.material({color:0xc9c7b8,roughness:.9})),3);}
 }
 // Breed-specific lower jaw follows the existing grab/bite joint.
 m.ellipsoid('mouth',[0,mc[1]-.019,mc[2]+.018],[mr[0]*.87,.008,mr[2]*.72],'Head',m.rimMaterial,'coat',16,7);
 m.ellipsoid('lower_jaw',[0,mc[1]-.030,mc[2]],[mr[0]*.88,cat?.014:.020,mr[2]*.84],'Jaw',m.coat,'muzzle',18,10);
 m.ellipsoid('tongue',[0,mc[1]-.020,mc[2]+.024],[mr[0]*.45,.004,mr[2]*.46],'Jaw',m.material({color:0xb8797d,roughness:.5}),'coat',12,6);
 // Tail is skinned to the same six simulated segments; round Labrador otter tail / fuller Maine coat.
 const pts=Array.from({length:6},(_,i)=>m.bind['Tail'+i].toArray());pts.push([0,.155,cat?-.75:-.68]);const rad=cat?(b.coat==='tabby'?.048:.026):(b.coat==='saddle'?.043:.039);
 m.tube('breed_tail',pts,pts.map((_,i)=>Math.max(.003,rad*Math.pow(1-i/6,.6))),(x,y,z)=>{const u=clamp((-.35-z)/.265*5,0,5),i=Math.floor(u);return [['Tail'+i,1-(u-i)],['Tail'+Math.min(5,i+1),u-i]];},m.coat,14,true);
 m.setEars=t=>{for(const ear of m.ears)ear.morphTargetInfluences[0]=clamp(t,0,1);};
 return m;
}
export {PET_BREEDS,breedIdFor};
