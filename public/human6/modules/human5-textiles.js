import * as T from 'three';
import {V,clamp,rng,finiteDt,wrapMethod,attachedTo,disposeTree} from './human5-common.js?v=19.1.0';

export const RUG_PATTERNS=['braid','diamonds','stripes','checker'];
function threadMaterial({color=0x91826a,accent=0xe3dac9,pattern='braid',pitch=.024,size=[2.4,1.6]}={},depth=false){
  const m=depth?new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,side:T.DoubleSide}):new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide});
  m.userData.h5Thread={stretch:{value:0},near:{value:1}};
  m.onBeforeCompile=s=>{
    Object.assign(s.uniforms,{h5ThreadScale:{value:new T.Vector2(size[0]/pitch,size[1]/pitch)},h5Accent:{value:new T.Color(accent)},h5Stretch:m.userData.h5Thread.stretch,h5Near:m.userData.h5Thread.near});
    s.vertexShader='varying vec2 h5RugUV;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nh5RugUV=uv;');
    s.fragmentShader='varying vec2 h5RugUV;uniform vec2 h5ThreadScale;uniform vec3 h5Accent;uniform float h5Stretch,h5Near;\n'+s.fragmentShader;
    const mask=`vec2 h5t=h5RugUV*h5ThreadScale;vec2 h5f=fract(h5t);float h5aa=max(fwidth(h5t.x),fwidth(h5t.y));
      float h5loop=abs(h5f.x-.5-.29*sin(h5f.y*6.2831853));float h5cross=abs(h5f.y-.5);
      float h5wire=min(h5loop,h5cross);float h5width=mix(.24,.135,clamp(h5Stretch,0.,1.));
      float h5thread=1.-smoothstep(h5width,h5width+max(.025,h5aa),h5wire);
      float h5border=step(min(min(h5RugUV.x,1.-h5RugUV.x),min(h5RugUV.y,1.-h5RugUV.y)),.019);
      float h5coverage=max(h5border,mix(1.,h5thread,h5Near*(1.-smoothstep(.35,.85,h5aa))));if(h5coverage<.46)discard;`;
    const colorCode=pattern==='diamonds'?'step(.48,abs(fract(h5RugUV.x*6.)-.5)+abs(fract(h5RugUV.y*4.)-.5))':pattern==='stripes'?'step(.65,fract(h5RugUV.y*9.))':pattern==='checker'?'mod(floor(h5RugUV.x*8.)+floor(h5RugUV.y*6.),2.)':'step(.64,sin(h5RugUV.x*75.+sin(h5RugUV.y*24.)*2.)*.5+.5)';
    s.fragmentShader=s.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\n'+mask);
    if(!depth)s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat h5pattern='+colorCode+';diffuseColor.rgb=mix(diffuseColor.rgb,h5Accent,h5pattern*.78);');
    if(!depth)s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nfloat h5grain=sin(h5RugUV.x*h5ThreadScale.x*6.283)*sin(h5RugUV.y*h5ThreadScale.y*6.283);normal=normalize(normal+vec3(dFdx(h5grain),dFdy(h5grain),0.)*.085*h5Near);');
  };m.customProgramCacheKey=()=>`h5-thread-17-${pattern}-${depth}`;return m;
}
export class ThreadRug {
  constructor(system,{position=[0,.01,0],yaw=0,size=[2.4,1.6],pattern='braid',color,accent,segments=[24,16],tearRatio=1.65}={}){
    Object.assign(this,{system,size,tearRatio});this.nx=clamp(Math.round(segments[0]),8,40);this.nz=clamp(Math.round(segments[1]),8,32);this.holds=new Map();this.links=[];this.faces=[];this.awake=0;this.accum=0;this.maxStrain=1;this.damage=0;
    const count=(this.nx+1)*(this.nz+1),pos=new Float32Array(count*3),uv=new Float32Array(count*2),q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),yaw),origin=new T.Vector3().fromArray(position);this.home=origin.clone();
    this.points=[];this.previous=[];
    const id=(x,z)=>z*(this.nx+1)+x;
    for(let z=0;z<=this.nz;z++)for(let x=0;x<=this.nx;x++){const i=id(x,z),p=new T.Vector3((x/this.nx-.5)*size[0],0,(z/this.nz-.5)*size[1]).applyQuaternion(q).add(origin);this.points.push(p);this.previous.push(p.clone());p.toArray(pos,i*3);uv.set([x/this.nx,z/this.nz],i*2);}
    const links=new Map();const link=(a,b,structural=true)=>{const key=a<b?a+'/'+b:b+'/'+a;if(links.has(key))return links.get(key);const l={a,b,length:this.points[a].distanceTo(this.points[b]),broken:false,structural};links.set(key,l);this.links.push(l);return l;};
    const face=(a,b,c)=>this.faces.push({ids:[a,b,c],edges:[link(a,b),link(b,c),link(c,a)],dead:false});
    for(let z=0;z<this.nz;z++)for(let x=0;x<this.nx;x++){const a=id(x,z),b=a+1,c=a+this.nx+1,d=c+1;face(a,c,b);face(b,c,d);}
    // Two-hop links resist folding. They do not bridge cuts after adjacent structural links break.
    for(let z=0;z<=this.nz;z++)for(let x=0;x<=this.nx;x++){const a=id(x,z);if(x+2<=this.nx){const l=link(a,a+2,false);l.parents=[links.get(a+'/'+(a+1)),links.get((a+1)+'/'+(a+2))];}if(z+2<=this.nz){const b=a+this.nx+1,l=link(a,b+this.nx+1,false);l.parents=[links.get(a+'/'+b),links.get(b+'/'+(b+this.nx+1))];}}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('uv',new T.BufferAttribute(uv,2));
    const opts={color,accent,pattern,size},mesh=new T.Mesh(geo,threadMaterial(opts));this.mesh=mesh;mesh.name='Threaded rug · '+pattern;mesh.userData.h5Rug=this;mesh.castShadow=mesh.receiveShadow=true;
    mesh.customDepthMaterial=threadMaterial(opts,true);mesh.customDepthMaterial.userData.h5Thread=mesh.material.userData.h5Thread;
    system.world.root.add(mesh);system.world.pickables.push(mesh);this.reindex();geo.computeVertexNormals();geo.computeBoundingSphere();
    if(system.fire)this.fuel=system.fire.register(mesh,{material:'fabric'});
  }
  nearest(p){let best=0,d=Infinity;for(let i=0;i<this.points.length;i++){const dist=p.distanceToSquared(this.points[i]);if(dist<d){d=dist;best=i;}}return {index:best,distance:Math.sqrt(d)};}
  grab(key,p){if(this.holds.size>=2||[...this.system.rugs].filter(r=>r!==this&&r.holds.size).length>=2)return false;const n=this.nearest(p);if(n.distance>.25)return false;this.holds.set(key,{index:n.index,target:p.clone(),offset:this.points[n.index].clone().sub(p)});this.awake=5;return true;}
  move(key,p){const h=this.holds.get(key);if(h)h.target.copy(p).add(h.offset);}
  release(key){this.holds.delete(key);this.awake=4;}
  reindex(){const indices=[];for(const f of this.faces){if(f.edges.some(l=>l.broken))f.dead=true;if(!f.dead)indices.push(...f.ids);}this.mesh.geometry.setIndex(indices);this.damage=1-indices.length/(this.faces.length*3);this.mesh.geometry.computeBoundingSphere();}
  cut(point,radius=.09){let changed=false;const p=point.clone();this.mesh.worldToLocal(p);for(const f of this.faces){if(f.dead)continue;const tri=new T.Triangle(...f.ids.map(i=>this.points[i]));if(tri.closestPointToPoint(p,V()).distanceTo(p)<=radius){f.dead=true;f.edges.forEach(l=>l.broken=true);changed=true;}}
    if(changed){this.reindex();this.awake=3;}return changed;}
  tick(dt,viewer){
    if(!attachedTo(this.mesh,this.system.world.root))return;
    const distance=viewer.distanceTo(this.home);this.mesh.material.userData.h5Thread.near.value=1-clamp((distance-3)/3,0,1);
    if(this.fuel?.burning){this.mesh.material.color.lerp(new T.Color(0x2c211b),dt*.3);if((this.burnT=(this.burnT||0)+dt)>.4){this.burnT=0;const point=this.mesh.localToWorld(this.fuel.point.clone());this.cut(point,.12+(1-this.fuel.fuel)*.45);}}
    if(!this.holds.size&&(this.awake<=0||distance>12))return;this.awake-=dt;this.accum=Math.min(.067,this.accum+finiteDt(dt));
    let changed=false;while(this.accum>=1/60){this.accum-=1/60;const h=1/60,g=this.system.world.gravityVector||new T.Vector3(0,-(this.system.world.gravity??9.81),0),held=new Set([...this.holds.values()].map(x=>x.index));
      for(let i=0;i<this.points.length;i++){if(held.has(i))continue;const p=this.points[i],old=p.clone(),v=p.clone().sub(this.previous[i]).multiplyScalar(.985);p.add(v).addScaledVector(g,h*h);this.previous[i].copy(old);}
      for(let it=0;it<5;it++){
        for(const l of this.links){if(l.broken||l.parents?.some(p=>p?.broken))continue;const a=this.points[l.a],b=this.points[l.b],delta=b.clone().sub(a),len=delta.length();if(len<1e-7)continue;const ratio=len/l.length;this.maxStrain=Math.max(this.maxStrain,ratio);
          if(l.structural&&it===0&&this.holds.size===2&&ratio>this.tearRatio){l.broken=true;changed=true;continue;}
          const wa=held.has(l.a)?0:1,wb=held.has(l.b)?0:1,total=wa+wb;if(!total)continue;delta.multiplyScalar((len-l.length)/len*(l.structural?.78:.12)/total);a.addScaledVector(delta,wa);b.addScaledVector(delta,-wb);
        }
        for(const hold of this.holds.values())this.points[hold.index].copy(hold.target);
      }
      for(let i=0;i<this.points.length;i++)if(!held.has(i)){
        const p=this.points[i],floor=(this.system.world.floorHeight?.(p)??0)+.007;
        if(p.y<floor){p.y=floor;this.previous[i].x+=(p.x-this.previous[i].x)*.55;this.previous[i].z+=(p.z-this.previous[i].z)*.55;this.previous[i].y=p.y;}
        // Existing furniture and walls remain the only collision source.
        if(p.y>floor+.02)this.system.world.projectSphere?.(p,.007);
      }
    }
    if(changed)this.reindex();const a=this.mesh.geometry.attributes.position;this.points.forEach((p,i)=>p.toArray(a.array,i*3));a.needsUpdate=true;this.mesh.geometry.computeVertexNormals();this.mesh.geometry.computeBoundingSphere();
    this.home.copy(this.points[Math.floor(this.points.length/2)]);this.mesh.material.userData.h5Thread.stretch.value=clamp((this.maxStrain-1)/.65,0,1);this.maxStrain=1;
    if(this.fuel){this.mesh.geometry.computeBoundingBox();this.fuel.localBox.copy(this.mesh.geometry.boundingBox);}
  }
  dispose(){this.system.world.pickables=this.system.world.pickables.filter(o=>o!==this.mesh);if(this.fuel)this.system.fire.unregister(this.fuel);this.mesh.customDepthMaterial.dispose();disposeTree(this.mesh);}
}

export class TextileSystem {
  constructor({world,fire=null,maxTufts=1800}={}){Object.assign(this,{world,fire,maxTufts});this.rugs=new Set();this.carpets=[];this.holds=new Map();this.time=0;
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.006,0,0,.006,0,0,0,.007,0,0,0,-.006,0,0,.006,0,.006,0],3));g.computeVertexNormals();
    this.pile=new T.InstancedMesh(g,new T.MeshStandardMaterial({color:0xffffff,roughness:1,side:T.DoubleSide}),maxTufts);this.pile.name='Nearby carpet pile';this.pile.count=0;this.pile.frustumCulled=false;this.pile.receiveShadow=true;world.scene?.add(this.pile);this.lastCenter=V().setScalar(Infinity);this.pileMaterialColor=new T.Color();
  }
  createRug(options){const r=new ThreadRug(this,options);this.rugs.add(r);return r;}
  createCarpet({position=[0,.004,0],size=[3,3],color=0x86765e,accent=0xa59781,tileSize=.5,seed=17}={}){
    const random=rng(seed),geo=new T.PlaneGeometry(size[0],size[1],Math.ceil(size[0]*6),Math.ceil(size[1]*6));geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
    for(let i=0;i<p.count;i++)p.setY(i,(random()-.5)*.0018);geo.computeVertexNormals();
    const mat=new T.MeshStandardMaterial({color,roughness:1});
    mat.onBeforeCompile=s=>{s.uniforms.h5CarpetAccent={value:new T.Color(accent)};s.vertexShader='varying vec3 h5CarpetP;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nh5CarpetP=position;');s.fragmentShader='varying vec3 h5CarpetP;uniform vec3 h5CarpetAccent;\n'+s.fragmentShader;
      s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 h5cell=floor(h5CarpetP.xz/${Number(tileSize).toFixed(4)});float h5tile=mod(h5cell.x+h5cell.y,2.);float h5fiber=sin((h5tile<.5?h5CarpetP.x:h5CarpetP.z)*2100.)*sin(h5CarpetP.z*1897.);float h5fade=1.-smoothstep(.3,2.,max(fwidth(h5CarpetP.x),fwidth(h5CarpetP.z))*2100.);diffuseColor.rgb=mix(diffuseColor.rgb,h5CarpetAccent,h5tile*.18)*(1.+h5fiber*.08*h5fade);`);
      s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nfloat h5n=sin(h5CarpetP.x*1600.)*sin(h5CarpetP.z*1593.);normal=normalize(normal+vec3(dFdx(h5n),dFdy(h5n),0.)*.07*h5fade);');
    };mat.customProgramCacheKey=()=> 'h5-carpet-17-'+tileSize;
    const mesh=new T.Mesh(geo,mat);mesh.name='Carpet tiles';mesh.position.fromArray(position);mesh.receiveShadow=true;this.world.root.add(mesh);const patch={mesh,size,color,seed};this.carpets.push(patch);
    if(this.fire)patch.fuel=this.fire.register(mesh,{material:'fabric'});return patch;
  }
  updatePile(viewer){
    if(viewer.distanceToSquared(this.lastCenter)<.12)return;this.lastCenter.copy(viewer);let n=0;const matrix=new T.Matrix4(),q=new T.Quaternion(),scale=V(),p=V();
    for(const c of this.carpets){if(!attachedTo(c.mesh,this.world.root))continue;const origin=c.mesh.getWorldPosition(V());if(Math.abs(viewer.y-origin.y)>2.8)continue;const random=rng(c.seed);
      const step=.065,x0=Math.max(-c.size[0]/2,viewer.x-origin.x-1.7),x1=Math.min(c.size[0]/2,viewer.x-origin.x+1.7),z0=Math.max(-c.size[1]/2,viewer.z-origin.z-1.7),z1=Math.min(c.size[1]/2,viewer.z-origin.z+1.7);
      for(let x=Math.ceil(x0/step)*step;x<x1&&n<this.maxTufts;x+=step)for(let z=Math.ceil(z0/step)*step;z<z1&&n<this.maxTufts;z+=step){p.set(origin.x+x+(random()-.5)*step,origin.y,origin.z+z+(random()-.5)*step);q.setFromAxisAngle(new T.Vector3(0,1,0),random()*6.28);scale.set(1,.55+random()*.6,1);matrix.compose(p,q,scale);this.pile.setMatrixAt(n,matrix);this.pile.setColorAt(n++,this.pileMaterialColor.set(c.color).multiplyScalar(.8+random()*.35));}
    }
    this.pile.count=n;this.pile.instanceMatrix.needsUpdate=true;if(this.pile.instanceColor)this.pile.instanceColor.needsUpdate=true;
  }
  tick(dt,viewer){this.time+=dt;for(const r of this.rugs)r.tick(dt,viewer);this.updatePile(viewer);}
  bindProps(props){const self=this,restores=[];
    restores.push(wrapMethod(props,'impact',old=>function(hit,e,d,k,s){const rug=hit?.object?.userData.h5Rug;if(rug){if(['bullet','cut','laser'].includes(k)||e>18)rug.cut(hit.point,k==='bullet'?.06:.12);return true;}return old.apply(this,arguments);}));
    restores.push(wrapMethod(props,'grip',old=>function(i){const p=this.system.hands.palmPos(i);if(p)for(const r of self.rugs)if(r.grab(i,p)){self.holds.set(i,r);return true;}return old.apply(this,arguments);}));
    restores.push(wrapMethod(props,'release',old=>function(i){const r=self.holds.get(i);if(r){r.release(i);self.holds.delete(i);return;}return old.apply(this,arguments);}));
    restores.push(wrapMethod(props,'tick',old=>function(dt){for(const [i,r] of self.holds){const p=this.system.hands.palmPos(i);if(p)r.move(i,p);}return old.apply(this,arguments);}));
    return ()=>restores.reverse().forEach(f=>f());
  }
  clear(){for(const r of this.rugs)r.dispose();for(const c of this.carpets){if(c.fuel)this.fire.unregister(c.fuel);disposeTree(c.mesh);}this.rugs.clear();this.carpets=[];this.holds.clear();this.pile.count=0;this.lastCenter.setScalar(Infinity);}
  dispose(){this.clear();disposeTree(this.pile);}
}
