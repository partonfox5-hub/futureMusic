import * as T from '../vendor/three.module.js';
export class Effects {
  constructor(scene){
    this.time=0;this.cursor=0;this.max=240;this.budget=240;
    this.particles=Array.from({length:this.max},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,total:1}));
    this.positions=new Float32Array(this.max*3);this.colors=new Float32Array(this.max*3);
    this.geom=new T.BufferGeometry();this.geom.setAttribute('position',new T.BufferAttribute(this.positions,3).setUsage(T.DynamicDrawUsage));this.geom.setAttribute('color',new T.BufferAttribute(this.colors,3).setUsage(T.DynamicDrawUsage));
    this.points=new T.Points(this.geom,new T.PointsMaterial({size:.10,vertexColors:true,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending}));this.points.frustumCulled=false;scene.add(this.points);
    this.bolts=new T.InstancedMesh(new T.CylinderGeometry(.032,.032,1.6,5),new T.MeshBasicMaterial({color:0xffad67}),96);this.bolts.instanceMatrix.setUsage(T.DynamicDrawUsage);this.bolts.frustumCulled=false;this.bolts.count=0;scene.add(this.bolts);this.dummy=new T.Object3D();this.direction=new T.Vector3();this.axis=new T.Vector3(0,1,0);
    this.rings=Array.from({length:12},()=>{const m=new T.Mesh(new T.TorusGeometry(1,.025,4,32),new T.MeshBasicMaterial({color:0xff6844,transparent:true,opacity:.8,depthWrite:false}));m.visible=false;scene.add(m);return {m,life:0,total:.5};});
  }
  burst(type,x,y,z){
    const kill=type==='kill',count=kill?30:9;
    for(let i=0;i<count;i++){const p=this.particles[this.cursor++%this.budget],u=Math.random()*Math.PI*2,v=Math.random()*2-1,r=Math.sqrt(1-v*v),speed=kill?4+Math.random()*5:2+Math.random()*3;
      Object.assign(p,{x,y,z,vx:Math.cos(u)*r*speed,vy:v*speed,vz:Math.sin(u)*r*speed,life:kill?.6:.23,total:kill?.6:.23});}
    if(kill){const r=this.rings.find(r=>r.life<=0)||this.rings[0];r.life=r.total;r.m.position.set(x,y,z);r.m.visible=true;}
  }
  update(sim,dt,eye){
    let count=0;
    for(const b of sim.bolts){if(!b.active)continue;this.dummy.position.set(b.x,b.y,b.z);this.direction.set(b.dx,b.dy,b.dz);this.dummy.quaternion.setFromUnitVectors(this.axis,this.direction);this.dummy.scale.set(1,1,1);this.dummy.updateMatrix();this.bolts.setMatrixAt(count++,this.dummy.matrix);}
    this.bolts.count=count;if(count)this.bolts.instanceMatrix.needsUpdate=true;
    let n=0;
    for(const p of this.particles){if(p.life<=0)continue;p.life-=dt;if(p.life<=0)continue;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      const a=p.life/p.total;this.positions[n*3]=p.x;this.positions[n*3+1]=p.y;this.positions[n*3+2]=p.z;this.colors[n*3]=a;this.colors[n*3+1]=a*.48;this.colors[n*3+2]=a*.16;n++;}
    this.geom.setDrawRange(0,n);if(n){this.geom.attributes.position.needsUpdate=true;this.geom.attributes.color.needsUpdate=true;}
    for(const r of this.rings){if(r.life<=0)continue;r.life-=dt;r.m.visible=r.life>0;r.m.scale.setScalar(.3+(1-r.life/r.total)*2);r.m.material.opacity=Math.max(0,r.life/r.total)*.7;r.m.lookAt(eye);}
  }
  clear(){for(const p of this.particles)p.life=0;for(const r of this.rings){r.life=0;r.m.visible=false;}this.geom.setDrawRange(0,0);this.bolts.count=0;}
}
