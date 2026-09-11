import * as T from '../vendor/three.module.js';
import {makeDrone,mergeParts} from './models.js';
export class Arena {
  constructor(scene){
    this.scene=scene;this.time=0;this.root=new T.Group();scene.add(this.root);
    scene.background=new T.Color(0x030915);scene.fog=new T.FogExp2(0x030b1b,.0055);
    scene.add(new T.HemisphereLight(0xadcfff,0x1b3545,2));
    const key=new T.DirectionalLight(0xd6efff,2.6);key.position.set(4,10,9);scene.add(key);
    const fill=new T.DirectionalLight(0x29d6a1,1.5);fill.position.set(-8,-4,-8);scene.add(fill);
    this.hullMaterial=new T.ShaderMaterial({side:T.BackSide,uniforms:{time:{value:0}},vertexShader:`varying vec2 vUv;varying vec3 vPos;void main(){vUv=uv;vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;varying vec3 vPos;uniform float time;
    void main(){vec2 q=vUv*vec2(56.,28.);vec2 f=fract(q);vec2 edge=min(f,1.-f);vec2 aa=max(fwidth(q),vec2(.002));
      float line=1.-smoothstep(.012,.012+max(aa.x,aa.y)*1.25,min(edge.x,edge.y));
      float checker=mod(floor(q.x)+floor(q.y),2.);float bevel=smoothstep(.02,.085,min(edge.x,edge.y));
      vec3 color=mix(vec3(.012,.032,.07),vec3(.025,.066,.13),checker*.28+bevel*.6);
      float equator=exp(-abs(vPos.y)*.45);float pole=pow(abs(normalize(vPos).y),8.);
      color+=vec3(.007,.025,.04)*equator;color=mix(color,vec3(.035,.18,.25),line*.5);
      float bolt=1.-smoothstep(.020,.030,length(f-vec2(.12,.12)));color+=bolt*vec3(.08,.13,.18);
      float stripe=step(.88,f.x)*step(.86,f.y)*step(.45,fract(floor(q.y)*.317+floor(q.x)*.131));color+=stripe*vec3(.08,.21,.25);
      color+=pole*vec3(.02,.1,.12);gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
    this.root.add(new T.Mesh(new T.SphereGeometry(42,64,40),this.hullMaterial));
    const bandMat=new T.MeshStandardMaterial({color:0x142b43,metalness:.75,roughness:.45});
    const lightMat=new T.MeshBasicMaterial({color:0x187897});
    const goldMat=new T.MeshBasicMaterial({color:0xcd9d46});
    for(let i=0;i<6;i++){
      const rib=new T.Mesh(new T.TorusGeometry(41.7,.18,5,128),bandMat);rib.rotation.y=i*Math.PI/6;this.root.add(rib);
    }
    for(const y of [-28,-14,0,14,28]){
      const r=Math.sqrt(41.6**2-y*y);const ring=new T.Mesh(new T.TorusGeometry(r,.055,4,128),y===0?goldMat:lightMat);ring.rotation.x=Math.PI/2;ring.position.y=y;this.root.add(ring);
    }
    this.reactor=new T.Group();this.root.add(this.reactor);
    const globe=new T.Mesh(new T.IcosahedronGeometry(7.5,2),new T.MeshBasicMaterial({color:0x26f8b3,wireframe:true,transparent:true,opacity:.3}));this.reactor.add(globe);
    this.core=new T.Mesh(new T.IcosahedronGeometry(2.6,2),new T.MeshStandardMaterial({color:0x093535,emissive:0x14e7a0,emissiveIntensity:1.3,metalness:.4,roughness:.28}));this.reactor.add(this.core);
    this.rings=[];
    for(let i=0;i<3;i++){
      const rotor=new T.Group();rotor.rotation.set(i*.9,.3+i*.6,.4);this.root.add(rotor);this.rings.push(rotor);
      rotor.add(new T.Mesh(new T.TorusGeometry(8.1+i*.3,.12,6,96),bandMat));
      for(let j=0;j<8;j++){
        const arc=new T.Mesh(new T.TorusGeometry(8.1+i*.3,.035,4,10,.4),i===1?goldMat:lightMat);arc.rotation.z=j*Math.PI/4;rotor.add(arc);
      }
    }
    const pylons=new T.InstancedMesh(new T.BoxGeometry(.45,2.8,.8),bandMat,24);const lamps=new T.InstancedMesh(new T.BoxGeometry(.13,2.1,.1),goldMat,24);const dummy=new T.Object3D();
    for(let i=0;i<24;i++){const a=i*Math.PI/12;dummy.position.set(Math.sin(a)*40.6,0,Math.cos(a)*40.6);dummy.rotation.y=a;dummy.updateMatrix();pylons.setMatrixAt(i,dummy.matrix);dummy.position.multiplyScalar(.995);dummy.updateMatrix();lamps.setMatrixAt(i,dummy.matrix);}this.root.add(pylons,lamps);
    this.drones=[];for(let i=0;i<14;i++){const d=makeDrone();this.root.add(d);this.drones.push(d);}
    this.target=new T.Vector3();this.dummy=new T.Object3D();this.tint=new T.Color();this.quality=1;this.batched=false;
    this.enableBatching();
  }
  enableBatching(){
    if(this.batched)return;
    this.fleet=mergeParts(makeDrone()).map(({geometry,material})=>{const m=new T.InstancedMesh(geometry,material,14);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;this.root.add(m);return m;});
    for(const d of this.drones)this.root.remove(d);this.drones.length=0;
    // Merge static hull beams, lamps and rotor arcs into one mesh per material.
    const staticRoot=new T.Group();for(const obj of [...this.root.children]){
      if(obj.isMesh&&!obj.isInstancedMesh&&obj.material!==this.hullMaterial)staticRoot.add(obj);
    }
    for(const {geometry,material} of mergeParts(staticRoot))this.root.add(new T.Mesh(geometry,material));
    for(const rotor of this.rings){const pieces=mergeParts(rotor);rotor.clear();
      // Parts were merged in world space; put them back in the rotor's local space.
      const inverse=new T.Matrix4().copy(rotor.matrixWorld).invert();
      for(const {geometry,material} of pieces){geometry.applyMatrix4(inverse);rotor.add(new T.Mesh(geometry,material));}
    }
    this.batched=true;
  }
  setQuality(level){this.quality=level;for(let i=0;i<this.rings.length;i++)this.rings[i].visible=level>0||i===0;}
  update(sim,dt,eye){
    this.time+=dt;this.hullMaterial.uniforms.time.value=this.time;
    this.reactor.rotation.y=this.time*.15;this.core.rotation.x=this.time*.14;
    this.rings.forEach((r,i)=>r.rotation.z+=dt*(i===1?-.22:.18));
    let count=0;
    for(let i=0;i<sim.drones.length;i++){const d=sim.drones[i];if(d.hp<=0)continue;const m=this.dummy;m.position.set(d.x,d.y,d.z);m.lookAt(eye);m.rotateZ(Math.sin(this.time*1.6+i)*.12);m.scale.setScalar(d.flash>0?1.08:1);m.updateMatrix();this.tint.setRGB(d.flash>0?2:1,d.flash>0?1.6:1,d.flash>0?1.3:1);for(const batch of this.fleet){batch.setMatrixAt(count,m.matrix);batch.setColorAt(count,this.tint);}count++;}
    for(const batch of this.fleet){batch.count=count;batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;}
  }
}
