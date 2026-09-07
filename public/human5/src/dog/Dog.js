import * as THREE from 'three';

export const BONE_NAMES = ['Root','Spine','Chest','Neck','Head','Jaw','Tail0','Tail1','Tail2','Tail3','Tail4','Tail5','L_Shoulder','L_UpperArm','L_ForeArm','L_Paw','R_Shoulder','R_UpperArm','R_ForeArm','R_Paw','L_Hip','L_Thigh','L_Calf','L_Foot','R_Hip','R_Thigh','R_Calf','R_Foot'];
const V = a => new THREE.Vector3(...a);
export const clamp = (v,lo=0,hi=1) => Math.max(lo,Math.min(hi,Number.isFinite(+v)?+v:lo));

// Geometry is generated in dog bind space, metres, forward +Z. No human assets.
export class DogModel {
  constructor() {
    this.root=new THREE.Group(); this.root.name='Human2_Dog';
    this.bones={}; this.bind={}; this.meshes=[]; this.furMeshes=[]; this.materials=new Set();
    const add=(name,parent,point)=>{
      const b=new THREE.Bone();b.name=name;this.bind[name]=V(point);
      b.position.copy(this.bind[name]); if(parent)b.position.sub(this.bind[parent]);
      (parent?this.bones[parent]:this.root).add(b);this.bones[name]=b;return b;
    };
    add('Root',null,[0,0,0]);add('Spine','Root',[0,.445,-.12]);add('Chest','Spine',[0,.46,.19]);
    add('Neck','Chest',[0,.605,.285]);add('Head','Neck',[0,.715,.365]);add('Jaw','Head',[0,.686,.420]);
    [[0,.49,-.35],[0,.46,-.425],[0,.40,-.49],[0,.325,-.54],[0,.25,-.58],[0,.19,-.615]].forEach((p,i)=>add(`Tail${i}`,i?`Tail${i-1}`:'Spine',p));
    for(const [s,x] of [['L',.115],['R',-.115]]) {
      add(`${s}_Shoulder`,'Chest',[x,.515,.22]);add(`${s}_UpperArm`,`${s}_Shoulder`,[x,.425,.18]);
      add(`${s}_ForeArm`,`${s}_UpperArm`,[x,.25,.205]);add(`${s}_Paw`,`${s}_ForeArm`,[x,.060,.26]);
      add(`${s}_Hip`,'Spine',[x,.47,-.265]);add(`${s}_Thigh`,`${s}_Hip`,[x,.35,-.22]);
      add(`${s}_Calf`,`${s}_Thigh`,[x,.19,-.365]);add(`${s}_Foot`,`${s}_Calf`,[x,.055,-.295]);
    }
    this.root.updateMatrixWorld(true);this.skeleton=new THREE.Skeleton(BONE_NAMES.map(n=>this.bones[n]));
    this.index=Object.fromEntries(BONE_NAMES.map((n,i)=>[n,i]));this.skeleton.calculateInverses();
    this.coat=this.material({color:0xffffff,roughness:.9,vertexColors:true});
    this.dark=this.material({color:0x241b16,roughness:.82});
    this.eye=this.material({color:0x170f0a,roughness:.20});
    this.buildBody();
  }
  material(opts){const m=new THREE.MeshStandardMaterial(opts);this.materials.add(m);return m;}
  coatColor(x,y,z,kind='coat'){
    const tan=new THREE.Color(0xb68952),cream=new THREE.Color(0xe0d1af),sable=new THREE.Color(0x463327);
    if(kind==='muzzle')return new THREE.Color(0x574439);
    if(kind==='cream')return cream;
    if(kind==='ear')return tan.lerp(sable,.65);
    const saddle=clamp((y-.43)/.15)*clamp((.40-z)/.22);
    const bib=clamp((z-.15)/.16)*clamp((.48-y)/.12);
    return tan.lerp(sable,saddle*.78).lerp(cream,bib*.93);
  }
  mesh(name,geometry,material=this.coat,fur=false){
    if(!geometry.getAttribute('normal'))geometry.computeVertexNormals();
    const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
    // Bind all meshes to the same rest skeleton, never parent a skinned mesh to a moving bone.
    this.root.add(mesh);mesh.bind(this.skeleton,new THREE.Matrix4());mesh.frustumCulled=false;
    this.meshes.push(mesh);if(fur)this.furMeshes.push(mesh);return mesh;
  }
  skin(geometry,weights){
    const p=geometry.getAttribute('position'),j=[],w=[],c=[];
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),pairs=typeof weights==='function'?weights(x,y,z):[[weights,1]];
      for(let k=0;k<4;k++){j.push(pairs[k]?this.index[pairs[k][0]]:0);w.push(pairs[k]?pairs[k][1]:0);}
      const cc=this.coatColor(x,y,z);c.push(cc.r,cc.g,cc.b);
    }
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(j,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(w,4));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));return geometry;
  }
  ellipsoid(name,center,scale,bone,material=this.coat,kind='coat',segments=12,rings=8,fur=false){
    const g=new THREE.SphereGeometry(1,segments,rings);g.scale(...scale);g.translate(...center);this.skin(g,bone);
    const p=g.getAttribute('position'),c=g.getAttribute('color');for(let i=0;i<p.count;i++){const col=this.coatColor(p.getX(i),p.getY(i),p.getZ(i),kind);c.setXYZ(i,col.r,col.g,col.b);}
    return this.mesh(name,g,material,fur);
  }
  tube(name,points,radii,boneAt,material=this.coat,sides=10,fur=false){
    const pos=[],uv=[],indices=[];const frames=[];
    points.forEach((p,i)=>{
      const tangent=V(points[Math.min(i+1,points.length-1)]).sub(V(points[Math.max(0,i-1)] )).normalize();
      const u=new THREE.Vector3(1,0,0);if(Math.abs(tangent.dot(u))>.95)u.set(0,0,1);
      u.addScaledVector(tangent,-u.dot(tangent)).normalize();const v=new THREE.Vector3().crossVectors(tangent,u).normalize();frames.push([u,v]);
      for(let k=0;k<=sides;k++){
        const a=k/sides*Math.PI*2,rr=Array.isArray(radii[i])?radii[i]:[radii[i],radii[i]],q=V(p).addScaledVector(u,Math.cos(a)*rr[0]).addScaledVector(v,Math.sin(a)*rr[1]);
        pos.push(q.x,q.y,q.z);uv.push(k/sides,i/(points.length-1));
        if(i<points.length-1&&k<sides){const a=i*(sides+1)+k,b=a+sides+1;indices.push(a,a+1,b,b,a+1,b+1);}
      }
    });
    // End caps use the same rim vertices; no holes at shoulder or tail attachment.
    for(const end of [0,points.length-1]){const center=pos.length/3;pos.push(...points[end]);uv.push(.5,end?1:0);for(let k=0;k<sides;k++){const a=end*(sides+1)+k;end?indices.push(center,a,a+1):indices.push(center,a+1,a);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();this.skin(g,boneAt);return this.mesh(name,g,material,fur);
  }
  buildBody(){
    this.body=this.tube('body',[[0,.44,-.365],[0,.455,-.30],[0,.453,-.21],[0,.445,-.09],[0,.437,.055],[0,.445,.18],[0,.45,.26],[0,.47,.30]],[[.07,.085],[.134,.14],[.143,.145],[.137,.137],[.135,.143],[.165,.155],[.143,.142],[.08,.09]],(x,y,z)=>{const t=clamp((z+.12)/.36);return [['Spine',1-t],['Chest',t]];},this.coat,20,true);
    this.tube('neck',[[0,.49,.205],[0,.565,.26],[0,.65,.315],[0,.715,.37]],[[.12,.125],[.111,.115],[.085,.089],[.07,.07]],(x,y,z)=>{const t=clamp((y-.53)/.15);return [['Chest',1-t],['Neck',t]];},this.coat,16,true);
    this.ellipsoid('head',[0,.753,.407],[.090,.100,.105],'Head',this.coat,'coat',14,9,true);
    this.ellipsoid('muzzle',[0,.711,.515],[.060,.047,.098],'Head',this.coat,'muzzle',12,7,true);
    this.ellipsoid('nose',[0,.723,.603],[.044,.028,.022],'Head',this.dark,'coat',12,7);
    const shine=this.material({color:0x090706,roughness:.31});
    for(const s of [-1,1]){
      this.ellipsoid('nostril',[s*.023,.727,.621],[.009,.005,.0035],'Head',shine,'coat',8,5);
      this.ellipsoid('eyes',[s*.067,.786,.475],[.015,.015,.011],'Head',this.eye,'coat',12,8);
      // Anatomical upper brow ridge, small eyes and semi-prick ears, not cartoon spheres.
      this.ellipsoid('brow',[s*.065,.801,.467],[.027,.018,.021],'Head',this.coat,'coat',10,6);
      this.ear(s);
    }
  }
  ear(s){
    const points=[[s*.054,.810,.395],[s*.110,.816,.370],[s*.116,.900,.365],[s*.099,.930,.386],[s*.080,.872,.427]];
    const p=points.flat(),idx=[0,1,4,1,2,4,2,3,4];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,1,1,1,.3,.6,0,.5,.6],2));g.setIndex(s<0?idx.flatMap((_,i)=>i%3===0?[idx[i],idx[i+2],idx[i+1]]:[]):idx);g.computeVertexNormals();this.skin(g,'Head');
    const m=this.material({color:0x574236,roughness:.95,side:THREE.DoubleSide});this.mesh(s>0?'ear_L':'ear_R',g,m);
    const inner=g.clone();const pp=inner.getAttribute('position');for(let i=0;i<pp.count;i++){pp.setXYZ(i,pp.getX(i)*.93,.85+(pp.getY(i)-.85)*.77,pp.getZ(i)+.0018);}inner.computeVertexNormals();this.mesh('ear_inner',inner,this.material({color:0x765845,roughness:.96,side:THREE.DoubleSide}));
  }
  compactMeshes(){
    // Batch skinned parts sharing a material/category. Skeleton and morph semantics survive.
    const all=[];this.root.traverse(o=>{if(o.isSkinnedMesh)all.push(o);});const groups=new Map(),keep=[];
    for(const m of all){
      if(Object.keys(m.geometry.morphAttributes).length){keep.push(m);continue;}
      const cat=m.name.includes('_fur_')?'fur':(['paws','toe'].includes(m.name)?'paws':m.material===this.coat?'body':m.name);
      const key=m.material.uuid+cat;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);
    }
    const removedGeometry=new Set();
    for(const list of groups.values()){
      if(list.length===1){keep.push(list[0]);continue;}
      const attributes=['position','normal','uv','skinIndex','skinWeight','color'],result=new THREE.BufferGeometry();let offset=0;const indices=[];
      for(const name of attributes){const first=list[0].geometry.getAttribute(name);if(!first)continue;const data=[];for(const m of list)data.push(...m.geometry.getAttribute(name).array);result.setAttribute(name,name==='skinIndex'?new THREE.Uint16BufferAttribute(data,first.itemSize):new THREE.Float32BufferAttribute(data,first.itemSize));}
      for(const m of list){const g=m.geometry;indices.push(...Array.from(g.index?.array||Array.from({length:g.attributes.position.count},(_,i)=>i),i=>i+offset));offset+=g.attributes.position.count;removedGeometry.add(g);m.removeFromParent();}
      result.setIndex(indices);const m=new THREE.SkinnedMesh(result,list[0].material);m.name=list[0].material.name.startsWith('Dog_FurShell')?list[0].material.name:(list[0].material===this.coat?(list[0].name==='paws'?'paws':'body'):list[0].name);m.bind(this.skeleton,new THREE.Matrix4());m.castShadow=list[0].castShadow;m.receiveShadow=true;m.frustumCulled=false;m.userData.parts=list.map(x=>x.name);this.root.add(m);keep.push(m);
    }
    const retained=new Set(keep.map(m=>m.geometry));for(const g of removedGeometry)if(!retained.has(g))g.dispose();this.meshes=keep;
  }
  dispose(){for(const m of this.meshes)m.geometry.dispose();for(const m of this.materials)m.dispose();this.skeleton.dispose();this.root.removeFromParent();}
}
