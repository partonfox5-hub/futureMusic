// Pure heightfield math. No DOM, engine imports or dependencies.
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const smooth = (a, b, x) => { const t = clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
export function hash(x,z,seed=1729) {
  let h = Math.imul(x|0,374761393) ^ Math.imul(z|0,668265263) ^ (seed|0);
  h = Math.imul(h ^ (h>>>13),1274126177); return ((h^(h>>>16))>>>0)/4294967296;
}
export function noise(x,z,seed=1729) {
  const ix=Math.floor(x), iz=Math.floor(z), u=smooth(0,1,x-ix), v=smooth(0,1,z-iz);
  const a=hash(ix,iz,seed), b=hash(ix+1,iz,seed), c=hash(ix,iz+1,seed), d=hash(ix+1,iz+1,seed);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
export function fbm(x,z,seed,octaves=4) {
  let y=0,w=.5,sum=0;
  for(let i=0;i<octaves;i++){y+=noise(x,z,seed+i*97)*w;sum+=w;x=x*2.03+13.1;z=z*2.03-7.7;w*=.5;}
  return y/sum;
}
export class TerrainHeightfield {
  constructor(options={}) {
    this.options={seed:1729,size:312,segments:256,pad:16,padBlend:14,mountainHeight:38,
      minHeight:-16,maxHeight:96,biome:'meadow',thermalPasses:3,protectPad:true,...options};
    const o=this.options;
    if(!Number.isFinite(o.size)||o.size<=0||!Number.isInteger(o.segments)||o.segments<16||o.segments>1024||o.segments%16)throw new RangeError('segments must be a multiple of 16 in [16,1024]; size must be positive');
    for(const key of ['seed','pad','padBlend','mountainHeight','minHeight','maxHeight','thermalPasses'])if(!Number.isFinite(o[key]))throw new TypeError('Invalid '+key);
    if(o.pad<0||o.padBlend<=0||o.minHeight>=o.maxHeight||o.minHeight>0||o.maxHeight<0||o.thermalPasses<0||o.thermalPasses>16)throw new RangeError('Invalid terrain range or pad');
    this.n=o.segments;this.stride=this.n+1;this.size=o.size;this.half=o.size/2;this.cell=o.size/this.n;
    this.heights=new Float32Array(this.stride*this.stride);this.listeners=new Set();this.revision=0;
    this.generate();this.base=this.heights.slice();
  }
  padWeight(x,z){
   let w=smooth(this.options.pad,this.options.pad+this.options.padBlend,Math.max(Math.abs(x),Math.abs(z)));
   const blend=this.options.padBlend||14;
   for(const c of this.options.clearings||[]){
    let d=0;
    if(Number.isFinite(c.r))d=Math.max(0,Math.hypot(x-(c.x||0),z-(c.z||0))-c.r);
    else if(Number.isFinite(c.z0)&&Number.isFinite(c.z1)){
     const dx=Math.max(0,Math.abs(x-(c.x||0))-(c.w||1.6)/2);
     const dz=z>Math.max(c.z0,c.z1)?z-Math.max(c.z0,c.z1):(z<Math.min(c.z0,c.z1)?Math.min(c.z0,c.z1)-z:0);
     d=Math.hypot(dx,dz);
    }else{
     const dx=Math.max(0,Math.abs(x-(c.x||0))-(c.w||8)/2),dz=Math.max(0,Math.abs(z-(c.z||0))-(c.d||8)/2);
     d=Math.hypot(dx,dz);
    }
    w=Math.min(w,smooth(0,blend,d));
   }
   return w;
  }
  procedural(x,z) {
    const o=this.options,s=o.seed;
    // Domain warping bends connected ridges; anisotropic envelopes keep peaks in ranges.
    const wx=x+17*(fbm(x*.012,z*.012,s)-.5), wz=z+15*(fbm(x*.013+41,z*.013-7,s+1)-.5);
    const u=wx*.88+wz*.47, v=-wx*.47+wz*.88;
    const spine=34+13*Math.sin(v*.021)+10*(noise(v*.025,4,s+3)-.5);
    const ridge=Math.exp(-Math.pow((u-spine)/20,2))*(.55+.45*fbm(v*.039,8,s+8));
    const branch=Math.exp(-Math.pow((u+52+Math.sin(v*.023)*12)/25,2))*(.46+.54*fbm(v*.035,-11,s+9));
    const ridged=1-Math.abs(2*fbm(wx*.038,wz*.038,s+5)-1);
    const extent=1-smooth(this.half*.72,this.half*1.55,Math.abs(v));
    const mountains=o.mountainHeight*Math.max(ridge,branch*.78)*(.53+.47*ridged*ridged)*extent;
    const rolling=5.2*(fbm(wx*.018,wz*.018,s+19)-.34)+1.0*(fbm(wx*.12,wz*.12,s+21,3)-.5);
    // A shallow winding drainage valley interrupts the slopes without periodic terraces.
    const river=wx+18+Math.sin(wz*.023)*12;
    const valley=Math.exp(-Math.pow(river/8,2));
    let h=(mountains*(1-valley*.58)+rolling*(1-valley*.7))*this.padWeight(x,z);
    if(o.biome==='beach')h=h*(1-smooth(-2,7,-z))+(-1.65)*smooth(7.5,12.5,-z);
    return clamp(h,o.minHeight,o.maxHeight);
  }
  generate() {
    for(let j=0;j<=this.n;j++)for(let i=0;i<=this.n;i++)this.heights[j*this.stride+i]=this.procedural(i*this.cell-this.half,j*this.cell-this.half);
    // Conservative thermal relaxation, only above the talus angle. This is not a hydraulic simulation.
    const delta=new Float32Array(this.heights.length),talus=this.cell*.85;
    for(let pass=0;pass<this.options.thermalPasses;pass++){
      delta.fill(0);
      for(let j=1;j<this.n;j++)for(let i=1;i<this.n;i++){
        const k=j*this.stride+i,h=this.heights[k];let lowest=k,low=h;
        for(const q of [k-1,k+1,k-this.stride,k+this.stride])if(this.heights[q]<low){low=this.heights[q];lowest=q;}
        if(h-low>talus){const move=(h-low-talus)*.18;delta[k]-=move;delta[lowest]+=move;}
      }
      for(let k=0;k<delta.length;k++)this.heights[k]+=delta[k];
    }
    // Keep the foundation exactly level after erosion.
    for(let j=0;j<=this.n;j++)for(let i=0;i<=this.n;i++)if(this.padWeight(i*this.cell-this.half,j*this.cell-this.half)===0)this.heights[j*this.stride+i]=0;
  }
  contains(x,z){return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<=this.half&&Math.abs(z)<=this.half;}
  at(i,j){return this.heights[clamp(j,0,this.n)*this.stride+clamp(i,0,this.n)];}
  heightAt(x,z) {
    if(!this.contains(x,z))return null;
    const gx=(x+this.half)/this.cell,gz=(z+this.half)/this.cell,i=Math.min(this.n-1,Math.floor(gx)),j=Math.min(this.n-1,Math.floor(gz)),u=gx-i,v=gz-j;
    const a=this.at(i,j),b=this.at(i+1,j),c=this.at(i,j+1),d=this.at(i+1,j+1);
    // Same a-b-c / b-d-c diagonal as TerrainMesh (not bilinear interpolation).
    return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
  }
  normalAt(x,z,out={x:0,y:1,z:0}){
    const c=this.cell,x0=clamp(x-c,-this.half,this.half),x1=clamp(x+c,-this.half,this.half),z0=clamp(z-c,-this.half,this.half),z1=clamp(z+c,-this.half,this.half);
    const dx=(this.heightAt(x1,clamp(z,-this.half,this.half))-this.heightAt(x0,clamp(z,-this.half,this.half)))/Math.max(.001,x1-x0);
    const dz=(this.heightAt(clamp(x,-this.half,this.half),z1)-this.heightAt(clamp(x,-this.half,this.half),z0))/Math.max(.001,z1-z0),n=Math.hypot(dx,1,dz);
    out.x=-dx/n;out.y=1/n;out.z=-dz/n;return out;
  }
  onChange(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  changed(rect){this.revision++;for(const fn of this.listeners)fn(rect);return rect;}
  brush({x,z,radius=3,delta=0,protectPad=this.options.protectPad}={}){
    if(![x,z,radius,delta].every(Number.isFinite)||!this.contains(x,z)||!delta)return null;
    radius=clamp(radius,this.cell*1.5,24);delta=clamp(delta,-1,1);
    return this.editDisk(x,z,radius,(h,d,px,pz)=>{
      const t=1-d*d/(radius*radius),mask=protectPad?this.padWeight(px,pz):1;
      return h+delta*t*t*mask;
    });
  }
  editDisk(x,z,radius,fn){
    const i0=clamp(Math.floor((x-radius+this.half)/this.cell),0,this.n),i1=clamp(Math.ceil((x+radius+this.half)/this.cell),0,this.n);
    const j0=clamp(Math.floor((z-radius+this.half)/this.cell),0,this.n),j1=clamp(Math.ceil((z+radius+this.half)/this.cell),0,this.n);let count=0;
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
      const px=i*this.cell-this.half,pz=j*this.cell-this.half,d=Math.hypot(px-x,pz-z);if(d>=radius)continue;
      const k=j*this.stride+i,h=this.heights[k],next=clamp(fn(h,d,px,pz),this.options.minHeight,this.options.maxHeight);
      if(Number.isFinite(next)&&Math.abs(next-h)>1e-7){this.heights[k]=next;count++;}
    }
    return count?this.changed({i0,i1,j0,j1,count,x,z,radius}):null;
  }
  excavate(x,z,radius,bed){
    if(![x,z,radius,bed].every(Number.isFinite)||radius<=0)return null;
    return this.editDisk(x,z,radius,(h,d)=>Math.min(h,h+(bed-h)*Math.pow(1-d/radius,2)));
  }
  serialize(){const edits=[];for(let i=0;i<this.heights.length;i++)if(this.heights[i]!==this.base[i])edits.push([i,this.heights[i]]);return{format:'mira-terrain-1',options:{...this.options},edits};}
  restore(data){
    if(data?.format!=='mira-terrain-1'||!Array.isArray(data.edits))throw new TypeError('Invalid terrain save');
    for(const key of Object.keys(this.options))if(data.options?.[key]!==this.options[key])throw new Error('Terrain save options differ: '+key);
    if(data.edits.length>this.heights.length)throw new RangeError('Too many terrain edits');
    const seen=new Set();for(const [i,h] of data.edits){if(!Number.isInteger(i)||i<0||i>=this.heights.length||seen.has(i)||!Number.isFinite(h)||h<this.options.minHeight||h>this.options.maxHeight)throw new TypeError('Invalid terrain edit');seen.add(i);}
    this.heights.set(this.base);for(const [i,h] of data.edits)this.heights[i]=h;
    this.changed({i0:0,i1:this.n,j0:0,j1:this.n,count:this.heights.length});
  }
}
