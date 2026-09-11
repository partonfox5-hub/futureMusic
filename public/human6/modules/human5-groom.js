import * as T from 'three';
import {V,clamp,smooth,gravityOf,wrapMethod,rng} from './human5-common.js?v=17.8.0';

/** Fitted crown and overlapping straight cards. Two draws; bounded guide physics.
 * Coordinates are metres in this project's CC3 rest mesh, before Head bind.
 * These are hair cards, not cylindrical locks or individual follicles.
 */
export function installReferenceGroom(actor){
  if(actor.h5Groom)return actor.h5Groom;
  const head=actor.bones.Head,bind=actor.skeleton.boneInverses[actor.skeleton.bones.indexOf(head)];
  const group=new T.Group();group.name='Mira straight shoulder hair';head.add(group);
  const random=rng(1751),size=256,data=new Uint8Array(size*size*4),fibers=new Float32Array(size);
  for(let x=0;x<size;x++)fibers[x]=.86+random()*.14;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/(size-1),v=y/(size-1),fiber=fibers[x]*(.97+.025*Math.sin(y*.036+x*.13));
    const edge=smooth(Math.min(u,1-u)/.085),tip=1-smooth((v-(.88+.055*Math.sin(x*.71)))/.11),i=(y*size+x)*4;
    data.set([255*fiber,249*fiber,238*fiber,255*edge*tip],i);
  }
  const texture=new T.DataTexture(data,size,size);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=T.RepeatWrapping;texture.generateMipmaps=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
  const material=new T.MeshStandardMaterial({color:0x4a352a,map:texture,roughness:.56,metalness:0,side:T.DoubleSide,alphaTest:.36,alphaToCoverage:false,envMapIntensity:.8});
  const crownMat=material.clone();crownMat.alphaTest=0;crownMat.side=T.FrontSide;
  // Crown UVs do not repeat twelve coarse dark stripes around the scalp.
  const cp=[],cu=[],ci=[],capLinks=[],phiN=64,thetaN=20;
  function crown(theta,phi,out=V()){
    const part=.006*(1-smooth(theta/.7));
    return out.set(part+.092*Math.sin(theta)*Math.sin(phi),1.525+.115*Math.cos(theta),.002+.108*Math.sin(theta)*Math.cos(phi));
  }
  for(let j=0;j<=thetaN;j++)for(let i=0;i<=phiN;i++){
    const phi=i/phiN*Math.PI*2,v=j/thetaN,front=Math.max(0,Math.cos(phi)),angular=Math.min(phi,2*Math.PI-phi),skirt=smooth((angular-.43)/.16);
    const theta=.005+(1.56-.30*front**3-.005)*Math.min(1,v/.55),p=crown(theta,phi),drop=smooth((v-.55)/.45)*skirt;
    p.y=T.MathUtils.lerp(p.y,1.315,drop);p.x+=Math.sin(phi)*.009*drop;p.z-=.010*drop;
    if(front>.25&&drop>.01){p.x=Math.sign(Math.sin(phi))*Math.max(Math.abs(p.x),.079+.020*drop);p.z=Math.min(p.z,.033-.014*drop);}
    // Continuous underlayer connects the crown to the hanging sheets.
    p.x-=Math.sin(phi)*.002;p.z-=Math.cos(phi)*.002;p.applyMatrix4(bind);cp.push(p.x,p.y,p.z);cu.push(i/phiN*6,v*.88);
    const guide=clamp(Math.round((phi-.48)/(Math.PI*2-.96)*43),0,43),t=v<.55?clamp(((theta-.34)/1.19)*.46,0,.46):.46+(v-.55)/.45*.54;
    capLinks.push({guide,node:clamp(Math.round(t*8),0,8),t,weight:skirt*smooth((v-.32)/.25)});
    if(i<phiN&&j<thetaN){const a=j*(phiN+1)+i,b=a+phiN+1;ci.push(a,b,a+1,a+1,b,b+1);}
  }
  const cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(cp,3));cg.setAttribute('uv',new T.Float32BufferAttribute(cu,2));cg.setIndex(ci);cg.computeVertexNormals();
  const cap=new T.Mesh(cg,crownMat);cap.name='Fitted softly parted crown';group.add(cap);
  const locks=[],positions=[],uv=[],indices=[],nodes=9,widthSteps=2,lockCount=44;
  for(let l=0;l<lockCount;l++){
    const phi=.48+l/(lockCount-1)*(Math.PI*2-.96),endY=1.305+(random()-.5)*.038;
    const rest=[],points=[],previous=[],targets=[],width=.032+random()*.008,phase=random()*6.283;
    for(let j=0;j<nodes;j++){
      const t=j/(nodes-1),arc=Math.min(1,t/.46),p=crown(.34+arc*1.19,phi);
      if(t>.46){const drop=(t-.46)/.54;p.y=T.MathUtils.lerp(p.y,endY,drop);p.x+=Math.sin(phi)*(.013*drop);p.z-=.010*drop;}
      // Face-framing layers stay to the sides of the cheeks and eyes.
      if(Math.cos(phi)>.25&&t>.23){p.x=Math.sign(Math.sin(phi))*Math.max(Math.abs(p.x),.078+.023*smooth((t-.23)/.64));p.z=Math.min(p.z,.036-.015*smooth(t));}
      const layer=-.0025+.0055*smooth((t-.35)/.25);p.x+=Math.sin(phi)*layer+Math.sin(t*4+phase)*.0012*smooth(t);p.z+=Math.cos(phi)*layer;
      rest.push(p.applyMatrix4(bind));points.push(V());previous.push(V());targets.push(V());
      for(let k=0;k<=widthSteps;k++){positions.push(0,0,0);uv.push(k/widthSteps,t);if(j<nodes-1&&k<widthSteps){const a=l*nodes*3+j*3+k,b=a+3;indices.push(a,b,a+1,a+1,b,b+1);}}
    }
    locks.push({rest,points,previous,targets,width,phi,ready:false,tangent:V().set(Math.cos(phi),0,-Math.sin(phi)).transformDirection(bind),lengths:rest.map((p,j)=>j?p.distanceTo(rest[j-1]):0)});
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.setAttribute('normal',new T.Float32BufferAttribute(new Float32Array(positions.length),3));
  const mesh=new T.Mesh(geo,material);mesh.name='Guided shoulder locks';mesh.frustumCulled=false;group.add(mesh);
  const capRest=Float32Array.from(cp);
  const invWorld=new T.Matrix4(),worldToModel=new T.Matrix4(),modelToWorld=new T.Matrix4(),headBind=bind.clone().invert();
  const d=V(),before=V(),local=V(),ab=V(),nearest=V(),g=V(),p=V(),normal=V();
  let accumulator=0,normalTime=0,lastColor=-1;const restores=[],oldVisible=actor.hairPhysics?.mesh?.visible;
  const tick=dt=>{
    const tint=[0x211b18,0x4a352a,0x894e32,0x765038][actor.hairColor]||0x4a352a;
    if(tint!==lastColor){lastColor=tint;material.color.setHex(tint);crownMat.color.setHex(tint);}
    head.updateWorldMatrix(true,false);invWorld.copy(head.matrixWorld).invert();worldToModel.copy(headBind).multiply(invWorld);modelToWorld.copy(head.matrixWorld).multiply(bind);
    const motion=clamp(actor.shape.hairMotion??1,0,1),wet=actor.h5Wetness?.hair??0,h=1/90;
    g.copy(gravityOf(actor.world));accumulator=Math.min(.045,accumulator+clamp(dt,0,.05));normalTime+=Math.max(0,dt);
    const scale=head.getWorldScale(d).x;
    for(const lock of locks){for(let j=0;j<nodes;j++)lock.targets[j].copy(lock.rest[j]).applyMatrix4(head.matrixWorld);
      if(!lock.ready||lock.points[0].distanceTo(lock.targets[0])>.25){for(let j=0;j<nodes;j++){lock.points[j].copy(lock.targets[j]);lock.previous[j].copy(lock.targets[j]);}lock.ready=true;}
    }
    while(accumulator+1e-9>=h){
      const drag=Math.exp(-(5.5+wet*7)*h),shapeRate=1-Math.exp(-(10-motion*6)*h);
      for(const lock of locks){const {points,previous,targets}=lock;
        for(let j=0;j<2;j++){points[j].copy(targets[j]);previous[j].copy(targets[j]);}
        for(let j=2;j<nodes;j++){before.copy(points[j]);d.subVectors(points[j],previous[j]).multiplyScalar(drag);points[j].add(d).addScaledVector(g,h*h*.35);points[j].lerp(targets[j],shapeRate);previous[j].copy(before);}
        for(let it=0;it<4;it++)for(let j=2;j<nodes;j++){
          d.subVectors(points[j],points[j-1]);const length=d.length(),rest=lock.lengths[j]*Math.abs(scale);
          if(length>1e-8){d.multiplyScalar((length-rest)/length*(j===2?1:.5));points[j].sub(d);if(j>2)points[j-1].add(d);}
          d.subVectors(points[j],targets[j]).clampLength(0,(.008+motion*.060)*j/(nodes-1));points[j].copy(targets[j]).add(d);
        }
        for(let j=2;j<nodes;j++){
          local.copy(points[j]).applyMatrix4(worldToModel);
          if(local.y>1.452){normal.set(local.x/.080,(local.y-1.525)/.110,local.z/.105);const r=normal.length();if(r<1&&r>.001){normal.divideScalar(r);local.set(normal.x*.080,1.525+normal.y*.110,normal.z*.105);points[j].copy(local).applyMatrix4(modelToWorld);}}
          for(const c of actor.externalHands||[]){if(!c.a||!c.b)continue;ab.subVectors(c.b,c.a);d.subVectors(points[j],c.a);const t=clamp(d.dot(ab)/Math.max(ab.lengthSq(),1e-8),0,1);nearest.copy(c.a).addScaledVector(ab,t);d.subVectors(points[j],nearest);const distance=d.length(),radius=c.r+.005;if(distance<radius&&distance>1e-6){points[j].copy(nearest).addScaledVector(d,radius/distance);c.onContact?.('hair',c.velocity?.length()||0,.001);}}
        }
      }
      accumulator-=h;
    }
    const attr=geo.attributes.position;
    for(let l=0;l<locks.length;l++){const lock=locks[l];for(let j=0;j<nodes;j++){
      local.copy(lock.points[j]).applyMatrix4(invWorld);const t=j/(nodes-1),half=lock.width*(.12+.88*smooth(t/.36))*(1-.30*smooth((t-.68)/.32))*.5;
      for(let k=0;k<3;k++){p.copy(local).addScaledVector(lock.tangent,(k-1)*half);p.toArray(attr.array,(l*nodes*3+j*3+k)*3);
        const theta=Math.min(1.53,.34+Math.min(1,t/.46)*1.19);normal.set(Math.sin(theta)*Math.sin(lock.phi),Math.max(0,Math.cos(theta)),Math.sin(theta)*Math.cos(lock.phi)).transformDirection(bind);normal.toArray(geo.attributes.normal.array,(l*nodes*3+j*3+k)*3);}
    }}
    attr.needsUpdate=true;
    geo.attributes.normal.needsUpdate=true;
    const capPosition=cg.attributes.position;
    for(let i=0;i<capLinks.length;i++){const link=capLinks[i];p.fromArray(capRest,i*3);if(link.weight){const lock=locks[link.guide];d.copy(lock.points[link.node]).applyMatrix4(invWorld).sub(lock.rest[link.node]);p.addScaledVector(d,link.weight);}p.toArray(capPosition.array,i*3);}
    capPosition.needsUpdate=true;
    if(!geo.boundingSphere)geo.boundingSphere=new T.Sphere(V().set(0,1.46,-.025).applyMatrix4(bind),.32);
  };
  if(actor.hairPhysics)restores.push(wrapMethod(actor.hairPhysics,'tick',old=>function(dt){const enabled=actor.h5Identity?.enabled&&actor.hairStyle===1;group.visible=enabled;if(enabled){this.mesh.visible=false;tick(dt);return;}return old.apply(this,arguments);}));
  const api={group,root:group,locks,nodes,tick,rebuildCuts(cuts=new Map()){
    const ids=[];for(let i=0;i<ci.length;i+=3){let keep=true;for(let j=0;j<3;j++){const link=capLinks[ci[i+j]],end=cuts.get(link.guide);if(link.weight>.1&&end!==undefined&&link.t>end/8+.001)keep=false;}if(keep)ids.push(ci[i],ci[i+1],ci[i+2]);}cg.setIndex(ids);
  },reset(){for(const lock of locks)lock.ready=false;accumulator=0;},dispose(){restores.reverse().forEach(f=>f());if(actor.hairPhysics?.mesh)actor.hairPhysics.mesh.visible=oldVisible;group.removeFromParent();geo.dispose();cg.dispose();material.dispose();crownMat.dispose();texture.dispose();delete actor.h5Groom;}};
  actor.h5Groom=api;
  // Profile import can render before the next animation tick. Do not show the
  // legacy cap and the replacement groom simultaneously for that first frame.
  group.visible=!!actor.h5Identity?.enabled&&actor.hairStyle===1;
  if(group.visible&&actor.hairPhysics?.mesh)actor.hairPhysics.mesh.visible=false;
  tick(0);return api;
}
