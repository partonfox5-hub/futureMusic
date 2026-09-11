import * as T from 'three';

/** Small retained wipe mask. Only marked pixels change during condensation. */
export class CondensationGrid {
  constructor(width=64,height=96){this.width=width;this.height=height;this.data=new Uint8Array(width*height);this.active=new Set();this.decayRemainder=0;}
  wipe(u,v,radius=.065){
    let changed=false;const rx=radius/1.22,ry=radius/1.97;
    for(let y=Math.max(0,Math.floor((v-ry)*this.height));y<Math.min(this.height,Math.ceil((v+ry)*this.height));y++)for(let x=Math.max(0,Math.floor((u-rx)*this.width));x<Math.min(this.width,Math.ceil((u+rx)*this.width));x++){
      const d=Math.hypot((x/this.width-u)/rx,(y/this.height-v)/ry);if(d>=1)continue;
      const i=y*this.width+x,value=Math.round(255*Math.min(1,(1-d)*4));if(value>this.data[i]){this.data[i]=value;this.active.add(i);changed=true;}
    }return changed;
  }
  decay(dt,rate=12){this.decayRemainder+=Math.max(0,dt)*rate;const amount=Math.floor(this.decayRemainder);this.decayRemainder-=amount;if(!amount||!this.active.size)return false;for(const i of this.active){this.data[i]=Math.max(0,this.data[i]-amount);if(!this.data[i])this.active.delete(i);}return true;}
}

export class LatchHinge {
  constructor(){this.angle=0;this.velocity=0;this.bolt=1;this.target=null;this.maxAngle=1.85;}
  get latched(){return this.bolt>.72&&this.angle<.045;}
  slide(value){this.bolt=T.MathUtils.clamp(value,0,this.angle>.045?.70:1);return this.bolt;}
  push(impulse){if(this.latched)return false;this.velocity+=T.MathUtils.clamp(impulse,-5,5);return true;}
  tick(dt){dt=T.MathUtils.clamp(dt,0,.05);const locked=this.latched;
    if(this.target!==null)this.velocity+=(T.MathUtils.clamp(this.target,0,this.maxAngle)-this.angle)*45*dt;
    this.velocity*=Math.exp(-dt*(this.target===null?3.8:12));this.angle+=this.velocity*dt;
    const limit=locked?.018:this.maxAngle;
    if(this.angle<0||this.angle>limit){this.angle=T.MathUtils.clamp(this.angle,0,limit);this.velocity*= -.12;}
    if(this.angle>.045)this.bolt=Math.min(this.bolt,.70);return this.angle;
  }
}
export const BASEMENT=Object.freeze({x:-17,z:0,yaw:Math.PI/2,w:7.2,d:8.4,level:-2.8,top:.055,stairX:-2.86,stairWidth:1.14,stairBottom:-.28,stairTop:3.56,steps:17});
export function basementLocal(p,out=new T.Vector3()){return out.set(-(p.z-BASEMENT.z),p.y,p.x-BASEMENT.x);}
export function inBasementFootprint(p,pad=0){const v=basementLocal(p);return Math.abs(v.x)<BASEMENT.w/2+pad&&Math.abs(v.z)<BASEMENT.d/2+pad;}
export function basementFloor(p,step=.42){if(!inBasementFootprint(p))return null;const b=BASEMENT,v=basementLocal(p);
  if(Math.abs(v.x-b.stairX)<b.stairWidth/2&&v.z>=b.stairBottom&&v.z<=b.stairTop){const t=(v.z-b.stairBottom)/(b.stairTop-b.stairBottom),h=b.level+t*(b.top-b.level);return h<=p.y+step?h:b.level;}
  return p.y+step<b.top?b.level:b.top;
}
/** Reflect position, view direction and up vector; retain a right-handed camera. */
export function reflectCamera(out,source,matrix){
  const n=new T.Vector3(0,0,1).transformDirection(matrix),p=new T.Vector3().setFromMatrixPosition(matrix),eye=new T.Vector3().setFromMatrixPosition(source.matrixWorld);
  const reflect=v=>v.addScaledVector(n,-2*v.clone().sub(p).dot(n));
  const forward=new T.Vector3(0,0,-1).transformDirection(source.matrixWorld),up=new T.Vector3(0,1,0).transformDirection(source.matrixWorld);
  out.position.copy(reflect(eye.clone()));out.up.copy(up.reflect(n));out.lookAt(reflect(eye.clone().add(forward)));out.updateMatrixWorld(true);
  out.projectionMatrix.copy(source.projectionMatrix);out.projectionMatrixInverse.copy(source.projectionMatrixInverse);out.layers.mask=source.layers.mask;out.near=source.near;out.far=source.far;return out;
}
