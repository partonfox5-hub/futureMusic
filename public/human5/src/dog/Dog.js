import * as THREE from 'three';

export const BONE_NAMES = ['Root','Spine','Chest','Neck','Head','Jaw','Tail0','Tail1','Tail2','Tail3','Tail4','Tail5','L_Shoulder','L_UpperArm','L_ForeArm','L_Paw','R_Shoulder','R_UpperArm','R_ForeArm','R_Paw','L_Hip','L_Thigh','L_Calf','L_Foot','R_Hip','R_Thigh','R_Calf','R_Foot'];
const V = a => new THREE.Vector3(...a);
export const clamp = (v,lo=0,hi=1) => Math.max(lo,Math.min(hi,Number.isFinite(+v)?+v:lo));

// Geometry is generated in dog bind space, metres, forward +Z. No human assets.
export class DogModel {
  constructor(species='dog') {
    this.species=species==='cat'?'cat':'dog';
    this.root=new THREE.Group(); this.root.name=this.species==='cat'?'Human2_Cat':'Human2_Dog';
    this.ears=[];this.bones={}; this.bind={}; this.meshes=[]; this.furMeshes=[]; this.materials=new Set();
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
    this.coat=this.material({color:this.species==='cat'?0xc47a32:0xb68952,roughness:.9,vertexColors:true});this.coat.userData.dogCoat=true;
    this.dark=this.material({color:0x241b16,roughness:.82});
    this.eye=this.material({color:0xd9ccb6,roughness:.35});
    this.noseMaterial=this.material({color:this.species==='cat'?0xc48a7a:0x1a1210,roughness:.19,metalness:0,envMapIntensity:1.2});
    this.irisMaterial=this.material({color:this.species==='cat'?0xd4c44a:0x6a3a14,roughness:.28});
    this.pupilMaterial=this.material({color:0x080604,roughness:.22});
    this.rimMaterial=this.material({color:0x292019,roughness:.55});
    this.corneaMaterial=this.material({color:0xffffff,roughness:.08,metalness:0,transparent:true,opacity:.40,depthWrite:false,envMapIntensity:1.2});
    this.buildBody();
  }
  material(opts){const m=new THREE.MeshStandardMaterial(opts);this.materials.add(m);return m;}
  coatColor(x,y,z,kind='coat'){
    if(this.species==='cat'){
      const orange=new THREE.Color(0xc47a32),cream=new THREE.Color(0xf0d9b0),brown=new THREE.Color(0x5a3218);
      if(kind==='muzzle')return cream.clone().lerp(orange,.28);
      if(kind==='cream')return cream;
      if(kind==='ear')return orange.clone().lerp(brown,.45);
      const stripe=Math.abs(Math.sin(z*22+x*9))*Math.abs(Math.sin(y*16+z*4+x*3));
      const tabby=clamp(stripe*1.45-.15);
      const chest=clamp((z-.10)/.20)*clamp((.52-y)/.14);
      return orange.lerp(brown,tabby*.78).lerp(cream,chest*.62);
    }
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
    const p=geometry.getAttribute('position'),j=[],w=[],c=[],length=[];
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),pairs=typeof weights==='function'?weights(x,y,z):[[weights,1]];
      for(let k=0;k<4;k++){j.push(pairs[k]?this.index[pairs[k][0]]:0);w.push(pairs[k]?pairs[k][1]:0);}
      const cc=this.coatColor(x,y,z);c.push(cc.r,cc.g,cc.b);length.push(z>.46?.4:z<-.35||y>.5&&z>.15&&z<.36?1.6:1);
    }
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(j,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(w,4));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(c,3));geometry.setAttribute('dogFurLength',new THREE.Float32BufferAttribute(length,1));return geometry;
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
    if(this.species==='cat'){
      this.ellipsoid('head',[0,.758,.392],[.094,.090,.086],'Head',this.coat,'coat',14,9,true);
      this.ellipsoid('muzzle',[0,.722,.468],[.042,.032,.052],'Head',this.coat,'muzzle',12,7,true);
    }else{
      this.ellipsoid('head',[0,.760,.402],[.090,.101,.099],'Head',this.coat,'coat',14,9,true);
      this.ellipsoid('muzzle',[0,.704,.518],[.059,.040,.095],'Head',this.coat,'muzzle',12,7,true);
    }
    // Stop and cheek planes are small additions in existing Head bind space.
    this.ellipsoid('stop',[0,.761,.463],[.046,.049,.030],'Head',this.coat,'coat',12,7,true);
    this.planum();
    for(const side of [-1,1])this.ellipsoid('haunch',[side*.11,.375,-.245],[.072,.113,.095],`${side>0?'L':'R'}_Thigh`,this.coat,'coat',12,8,true);
    for(const side of [-1,1]){
      this.ellipsoid('cheek',[side*.069,.737,.444],[.030,.040,.038],'Head',this.coat,'coat',10,6,true);
      this.ellipsoid('lip',[side*.037,.685,.537],[.022,.007,.060],'Head',this.rimMaterial,'muzzle',10,5);
      this.dogEye(side);
      this.ellipsoid('brow',[side*.065,.804,.469],[.025,.014,.020],'Head',this.coat,'coat',10,6);
      this.ear(side);
    }
  }
  dogEye(side){
    const x=side*.067,y=.786,z=.478;
    this.ellipsoid('eyes_sclera',[x,y,z],[.016,.013,.010],'Head',this.eye,'coat',12,8);
    this.eyeDisc('eyes_iris',x,y,z+.0103,.0125,.0115,this.irisMaterial,24);
    if(this.species==='cat')this.eyeDisc('eyes_pupil',x,y,z+.0107,.0026,.0108,this.pupilMaterial,16);
    else this.eyeDisc('eyes_pupil',x,y,z+.0106,.0052,.0064,this.pupilMaterial,20);
    const rim=new THREE.TorusGeometry(.0145,.0017,4,20);rim.scale(1,.83,1);rim.translate(x,y,z+.0055);this.skin(rim,'Head');this.mesh('eye_rim',rim,this.rimMaterial);
    // Front dome only: transparent Standard material, no transmission, no painted highlights.
    const g=new THREE.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI/2);g.rotateX(Math.PI/2);g.scale(.0132,.0124,.004);g.translate(x,y,z+.009);
    this.skin(g,'Head');const cornea=this.mesh('eyes_cornea',g,this.corneaMaterial);cornea.castShadow=false;cornea.receiveShadow=false;cornea.renderOrder=3;
  }
  eyeDisc(name,x,y,z,rx,ry,material,segments){
    const g=new THREE.CircleGeometry(1,segments);g.scale(rx,ry,1);g.translate(x,y,z);this.skin(g,'Head');return this.mesh(name,g,material);
  }
  planum(){
    // Squared leather planum; physically recessed bowls replace protruding black beads.
    const g=new THREE.SphereGeometry(1,20,12),p=g.getAttribute('position');
    for(let i=0;i<p.count;i++){
      let x=p.getX(i)*.045,y=p.getY(i)*.026,z=p.getZ(i)*.015;
      if(z>0){const holes=Math.max(Math.exp(-(((x-.023)/.010)**2+((y-.003)/.007)**2)),Math.exp(-(((x+.023)/.010)**2+((y-.003)/.007)**2)));z-=holes*.009;}
      p.setXYZ(i,x,.715+y,.606+z);
    }
    g.computeVertexNormals();this.skin(g,'Head');this.mesh('nose',g,this.noseMaterial);
    for(const side of [-1,1])this.ellipsoid('nostril_cavity',[side*.023,.718,.613],[.0068,.0042,.0022],'Head',this.pupilMaterial,'coat',10,6);
  }

  ear(s){
    if(this.species==='cat'){
      const points=[[s*.038,.805,.400],[s*.108,.818,.372],[s*.072,.978,.348]];
      const p=points.flat(),idx=[0,1,2];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1],2));g.setIndex(s<0?[0,2,1]:idx);g.computeVertexNormals();this.skin(g,'Head');
      const m=this.material({color:0xc47a32,roughness:.95,side:THREE.DoubleSide,vertexColors:true});m.userData.dogCoat=true;this.mesh(s>0?'ear_L':'ear_R',g,m,true);
      const inner=g.clone();const pp=inner.getAttribute('position');for(let i=0;i<pp.count;i++){pp.setXYZ(i,pp.getX(i)*.88,.82+(pp.getY(i)-.82)*.72,pp.getZ(i)+.002);}inner.computeVertexNormals();this.skin(inner,'Head');this.mesh('ear_inner',inner,this.material({color:0xe8b89a,roughness:.96,side:THREE.DoubleSide}));
      return;
    }
    const points=[[s*.054,.810,.395],[s*.110,.816,.370],[s*.116,.900,.365],[s*.099,.930,.386],[s*.080,.872,.427]];
    const p=points.flat(),idx=[0,1,4,1,2,4,2,3,4];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,1,1,1,.3,.6,0,.5,.6],2));g.setIndex(s<0?idx.flatMap((_,i)=>i%3===0?[idx[i],idx[i+2],idx[i+1]]:[]):idx);g.computeVertexNormals();this.skin(g,'Head');
    const m=this.material({color:0x574236,roughness:.95,side:THREE.DoubleSide});m.userData.dogCoat=true;this.earHinge(this.mesh(s>0?'ear_L':'ear_R',g,m),s);
    const edgePos=[],edgeUV=[],edgeIndex=[];
    for(const q of points){edgePos.push(q[0],q[1],q[2]-.002,q[0],q[1],q[2]+.002);edgeUV.push(0,0,1,1);}
    for(let i=0;i<points.length;i++){const a=i*2,b=((i+1)%points.length)*2;edgeIndex.push(a,b,a+1,b,b+1,a+1);}
    const edge=new THREE.BufferGeometry();edge.setAttribute('position',new THREE.Float32BufferAttribute(edgePos,3));edge.setAttribute('uv',new THREE.Float32BufferAttribute(edgeUV,2));edge.setIndex(edgeIndex);edge.computeVertexNormals();this.skin(edge,'Head');this.earHinge(this.mesh('ear_edge',edge,this.rimMaterial),s);
    const inner=g.clone();const pp=inner.getAttribute('position');for(let i=0;i<pp.count;i++){pp.setXYZ(i,pp.getX(i)*.93,.85+(pp.getY(i)-.85)*.77,pp.getZ(i)+.0018);}inner.computeVertexNormals();this.earHinge(this.mesh('ear_inner',inner,this.material({color:0x765845,roughness:.96,side:THREE.DoubleSide})),s);
  }
  earHinge(mesh,side){
    // One hinge deformation in bind space: meshes remain rooted, with no new bones.
    const p=mesh.geometry.attributes.position,delta=[],pivot=new THREE.Vector3(side*.08,.818,.395);
    for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i),to=v.clone().sub(pivot).applyAxisAngle(new THREE.Vector3(1,0,0),-1.05).add(pivot).sub(v);delta.push(to.x,to.y,to.z);}
    mesh.geometry.morphAttributes.position=[new THREE.Float32BufferAttribute(delta,3)];mesh.geometry.morphTargetsRelative=true;mesh.updateMorphTargets();this.ears.push(mesh);
  }
  setEars(drop){if(this.species==='cat')return;for(const mesh of this.ears)if(mesh.morphTargetInfluences)mesh.morphTargetInfluences[0]=clamp(drop);}
  setCoat(hex){if(!/^#[0-9a-f]{6}$/i.test(String(hex)))return false;for(const m of this.materials)if(m.userData.dogCoat)m.color.set(hex);this.coatHex=hex;return true;}
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
      const attributes=['position','normal','uv','skinIndex','skinWeight','color','dogFurLength'],result=new THREE.BufferGeometry();let offset=0;const indices=[];
      for(const name of attributes){const first=list[0].geometry.getAttribute(name);if(!first)continue;const data=[];for(const m of list)data.push(...m.geometry.getAttribute(name).array);result.setAttribute(name,name==='skinIndex'?new THREE.Uint16BufferAttribute(data,first.itemSize):new THREE.Float32BufferAttribute(data,first.itemSize));}
      for(const m of list){const g=m.geometry;indices.push(...Array.from(g.index?.array||Array.from({length:g.attributes.position.count},(_,i)=>i),i=>i+offset));offset+=g.attributes.position.count;removedGeometry.add(g);m.removeFromParent();}
      result.setIndex(indices);const m=new THREE.SkinnedMesh(result,list[0].material);m.name=list[0].material.name.startsWith('Dog_FurShell')?list[0].material.name:(list[0].material===this.coat?(list[0].name==='paws'?'paws':'body'):list[0].name);m.bind(this.skeleton,new THREE.Matrix4());m.castShadow=list[0].castShadow;m.receiveShadow=list[0].receiveShadow;m.renderOrder=list[0].renderOrder;m.frustumCulled=false;m.userData.parts=list.map(x=>x.name);this.root.add(m);keep.push(m);
    }
    const retained=new Set(keep.map(m=>m.geometry));for(const g of removedGeometry)if(!retained.has(g))g.dispose();this.meshes=keep;
  }
  dispose(){for(const m of this.meshes)m.geometry.dispose();for(const m of this.materials)m.dispose();this.skeleton.dispose();this.root.removeFromParent();}
}
