import * as T from 'three';
import {V,clamp,smooth,gravityOf,wrapMethod,rng} from './human5-common.js?v=17.5.0';

/** Shoulder-length reference groom: 28 guided locks, one crown, two draw calls. */
export function installReferenceGroom(actor){
  if(actor.h5Groom)return actor.h5Groom;
  const head=actor.bones.Head,inv=actor.skeleton.boneInverses[actor.skeleton.bones.indexOf(head)],group=new T.Group();group.name='Mira reference layered hair';head.add(group);
  const random=rng(1751),w=128,h=128,data=new Uint8Array(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=x/(w-1),v=y/(h-1),strand=.70+.15*Math.sin(x*2.9)+.1*Math.sin(x*.93),tip=1-smooth((v-.86)/.14),edge=smooth(Math.min(u,1-u)/.08),i=(y*w+x)*4;data.set([210*strand,188*strand,164*strand,255*edge*(tip*.9+.1)],i);}
  const texture=new T.DataTexture(data,w,h);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.needsUpdate=true;
  const material=new T.MeshStandardMaterial({color:0x765943,map:texture,roughness:.53,metalness:0,side:T.DoubleSide,alphaTest:.28,envMapIntensity:.65});
  const crownMat=material.clone();crownMat.alphaTest=0;crownMat.side=T.FrontSide;
  const cp=[],cu=[],ci=[],phiN=48,thetaN=12;
  function crown(theta,phi){return new T.Vector3(.086*Math.sin(theta)*Math.sin(phi),1.555+.112*Math.cos(theta),-.016+.105*Math.sin(theta)*Math.cos(phi));}
  for(let j=0;j<=thetaN;j++)for(let i=0;i<=phiN;i++){const phi=i/phiN*Math.PI*2,front=(Math.cos(phi)+1)/2,end=1.90-.55*front**3,theta=.015+(end-.015)*j/thetaN,p=crown(theta,phi).applyMatrix4(inv);cp.push(p.x,p.y,p.z);cu.push(i/phiN*12,j/thetaN*.8);if(i<phiN&&j<thetaN){const a=j*(phiN+1)+i,b=a+phiN+1;ci.push(a,b,a+1,a+1,b,b+1);}}
  const cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(cp,3));cg.setAttribute('uv',new T.Float32BufferAttribute(cu,2));cg.setIndex(ci);cg.computeVertexNormals();const cap=new T.Mesh(cg,crownMat);cap.name='Contoured hair roots';group.add(cap);
  const locks=[],positions=[],uv=[],indices=[],nodes=9,widthSteps=2;
  // Leave the central forehead and eyes open. Locks arc around temples and ears.
  for(let l=0;l<28;l++){
    const phi=.56+l/27*(Math.PI*2-1.12),length=.23+random()*.052,phase=random()*Math.PI*2,rest=[],points=[],previous=[],width=.025+random()*.008;
    for(let j=0;j<nodes;j++){const t=j/(nodes-1),theta=.28+t*1.3,p=crown(Math.min(theta,1.45),phi);
      p.y-=Math.max(0,t-.48)*length*2;p.x+=Math.sin(phi)*(.008+smooth(t)*.017)+Math.sin(t*7+phase)*.007*smooth(t);p.z-=.006*smooth(t);
      if(Math.cos(phi)>.3&&t>.35){p.x=Math.sign(Math.sin(phi))*Math.max(Math.abs(p.x),.079+smooth((t-.35)/.6)*.023);p.z=Math.min(p.z,.027);}
      rest.push(p.applyMatrix4(inv));points.push(V());previous.push(V());
      for(let k=0;k<=widthSteps;k++){positions.push(0,0,0);uv.push(k/widthSteps,t);if(j<nodes-1&&k<widthSteps){const a=l*nodes*3+j*3+k,b=a+3;indices.push(a,b,a+1,a+1,b,b+1);}}
    }locks.push({rest,points,previous,width,phi,ready:false});
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);const mesh=new T.Mesh(geo,material);mesh.name='Guided shoulder locks';mesh.frustumCulled=false;group.add(mesh);
  let time=0;const oldVisible=actor.hairPhysics?.mesh?.visible;const restores=[];
  const tick=dt=>{const tint=[0x30251f,0x765943,0x8b4f32,0x65462f][actor.hairColor]||0x765943;material.color.setHex(tint);crownMat.color.setHex(tint);head.updateWorldMatrix(true,false);const matrix=head.matrixWorld,invWorld=matrix.clone().invert(),g=gravityOf(actor.world),step=Math.min(1/30,Math.max(0,dt));time+=step;const attr=geo.attributes.position;
    for(let l=0;l<locks.length;l++){const lock=locks[l],{rest,points,previous}=lock,targets=rest.map(p=>p.clone().applyMatrix4(matrix));
      if(!lock.ready||points[0].distanceTo(targets[0])>.30){targets.forEach((p,i)=>{points[i].copy(p);previous[i].copy(p);});lock.ready=true;}
      points[0].copy(targets[0]);previous[0].copy(targets[0]);
      for(let j=1;j<nodes;j++){const before=points[j].clone(),v=before.clone().sub(previous[j]).multiplyScalar(Math.exp(-9*step));points[j].add(v).addScaledVector(g,step*step*.10);previous[j].copy(before);}
      for(let it=0;it<4;it++)for(let j=1;j<nodes;j++){const a=points[j-1],b=points[j],d=b.clone().sub(a),len=d.length(),length=targets[j].distanceTo(targets[j-1]);if(len>1e-8){d.multiplyScalar((len-length)/len*(j===1?1:.5));b.sub(d);if(j>1)a.add(d);}const delta=b.clone().sub(targets[j]).clampLength(0,.022*j/(nodes-1));b.copy(targets[j]).add(delta);}
      for(let j=2;j<nodes;j++)for(const c of actor.externalHands||[]){const ab=c.b.clone().sub(c.a),t=clamp(points[j].clone().sub(c.a).dot(ab)/Math.max(ab.lengthSq(),1e-8),0,1),nearest=c.a.clone().addScaledVector(ab,t),d=points[j].clone().sub(nearest),distance=d.length(),radius=c.r+.007;if(distance<radius&&distance>1e-6){points[j].copy(nearest).addScaledVector(d,radius/distance);c.onContact?.('hair',c.velocity?.length()||0,.002);}}
      for(let j=0;j<nodes;j++){const center=points[j].clone().applyMatrix4(invWorld),t=j/(nodes-1),half=lock.width*(1-.84*t*t)/2,tangent=new T.Vector3(Math.cos(lock.phi),0,-Math.sin(lock.phi)).transformDirection(inv);
        for(let k=0;k<=widthSteps;k++){const p=center.clone().addScaledVector(tangent,(k-1)*half);p.z+=k===1?.002:0;p.toArray(attr.array,(l*nodes*3+j*3+k)*3);}
      }
    }attr.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();
  };
  if(actor.hairPhysics)restores.push(wrapMethod(actor.hairPhysics,'tick',old=>function(dt){const enabled=actor.h5Identity?.enabled&&actor.hairStyle===1;group.visible=enabled;if(enabled){this.mesh.visible=false;tick(dt);return;}return old.apply(this,arguments);}));
  const api={group,locks,tick,dispose(){restores.reverse().forEach(f=>f());if(actor.hairPhysics?.mesh)actor.hairPhysics.mesh.visible=oldVisible;group.removeFromParent();geo.dispose();cg.dispose();material.dispose();crownMat.dispose();texture.dispose();delete actor.h5Groom;}};
  actor.h5Groom=api;tick(0);return api;
}
