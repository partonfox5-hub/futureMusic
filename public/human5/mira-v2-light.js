import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** Authored Human5 lighting: hemisphere + key/fill/rim + ambient + optional PMREM. */
export function createStudioLights(scene, {renderer, quest=false, shadows=true}={}){
 const hemi=new T.HemisphereLight(0xf5f8ff,0x82766d,.72);scene.add(hemi);
 const key=new T.DirectionalLight(0xfff4ee,1.65);key.position.set(1.4,3.2,2.8);
 key.castShadow=!!shadows;key.shadow.mapSize.set(quest?1024:2048,quest?1024:2048);
 key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=8;key.shadow.camera.bottom=-4;
 key.shadow.camera.near=.1;key.shadow.camera.far=28;key.shadow.bias=-.0001;key.shadow.normalBias=.010;
 scene.add(key);
 const fill=new T.DirectionalLight(0xe7efff,.72);fill.position.set(-2.5,2.2,2.0);scene.add(fill);
 const rim=new T.DirectionalLight(0xffeee3,.55);rim.position.set(.8,2.5,-2);scene.add(rim);
 const ambient=new T.AmbientLight(0xffffff,.08);scene.add(ambient);
 let env=null;
 if(renderer){
  try{
   const pmrem=new T.PMREMGenerator(renderer);
   const room=new RoomEnvironment();
   env=pmrem.fromScene(room,.04).texture;
   scene.environment=env;scene.environmentIntensity=.65;
   room.dispose();pmrem.dispose();
  }catch(e){console.warn('env',e);}
 }
 return {hemi,key,fill,rim,ambient,env,exposure:1.05};
}

export class RoomLight {
 constructor(scene,renderer,rig){Object.assign(this,{scene,renderer,rig});this.probe=new T.LightProbe();this.primary=new T.DirectionalLight(0xffffff,0);this.primary.target.position.set(0,0,0);scene.add(this.probe,this.primary,this.primary.target);this.authored=[];scene.traverse(o=>{if(o.isLight&&o!==this.probe&&o!==this.primary)this.authored.push([o,o.intensity]);});this.stop();renderer.xr.addEventListener('sessionend',()=>this.stop());}
 async start(session){this.stop();this.session=session;if(!session.requestLightProbe)return;try{const probe=await session.requestLightProbe();if(this.session===session)this.xrProbe=probe;}catch{}}
 stop(){this.session=null;this.xrProbe=null;this.probe.intensity=0;this.primary.intensity=0;this.authored?.forEach(([l,i])=>l.intensity=i);this.last=0;}
 tick(frame){if(!frame||!this.xrProbe)return;const estimate=frame.getLightEstimate(this.xrProbe);if(!estimate){if(performance.now()-this.last>3000){this.probe.intensity=0;this.primary.intensity=0;this.authored.forEach(([l,i])=>l.intensity=i);}return;}this.last=performance.now();const coeff=estimate.sphericalHarmonicsCoefficients;for(let i=0;i<9;i++)this.probe.sh.coefficients[i].lerp(new T.Vector3(coeff[i*3],coeff[i*3+1],coeff[i*3+2]),.08);this.probe.intensity=.8;const c=estimate.primaryLightIntensity,peak=Math.max(c.x,c.y,c.z,.001);this.primary.color.setRGB(c.x/peak,c.y/peak,c.z/peak);this.primary.intensity=T.MathUtils.lerp(this.primary.intensity,Math.min(4,peak),.08);const d=estimate.primaryLightDirection;this.primary.position.set(d.x,d.y,d.z).applyQuaternion(this.rig.quaternion).multiplyScalar(3);this.authored.forEach(([l,i])=>l.intensity=T.MathUtils.lerp(l.intensity,i*.1,.08));}
}
