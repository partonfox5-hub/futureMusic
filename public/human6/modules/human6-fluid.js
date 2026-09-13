/** Finite world grid, independent of rendered cells. Slow conservative flow;
 * creeper adds mass locally, lava receives mass only from explicit sources. */
export class FluidGrid {
  constructor({half=1056,cell=12,heightAt=()=>0,replicating=false}={}){this.half=half;this.cell=cell;this.n=Math.ceil(half*2/cell);this.count=this.n*this.n;this.height=new Float32Array(this.count);this.depth=new Float32Array(this.count);this.delta=new Float32Array(this.count);this.age=new Float32Array(this.count);this.active=[];this.present=new Uint8Array(this.count);this.sources=new Map();this.replicating=replicating;this.time=0;this.total=0;this.heightAt=heightAt;this.height.fill(NaN);this.work=null;}
  ensureHeight(i){if(!Number.isFinite(this.height[i]))this.height[i]=this.heightAt(this.x(i%this.n),this.x((i/this.n)|0))||0;return this.height[i];}
  refreshHeight({x=0,z=0,radius=Infinity}={}){for(const i of this.active)if(!Number.isFinite(radius)||Math.hypot(this.x(i%this.n)-x,this.x((i/this.n)|0)-z)<radius+this.cell)this.height[i]=NaN;}
  x(i){return -this.half+(i+.5)*this.cell;}
  index(x,z){const a=Math.floor((x+this.half)/this.cell),b=Math.floor((z+this.half)/this.cell);return a<0||b<0||a>=this.n||b>=this.n?-1:b*this.n+a;}
  activate(i){if(i>=0&&!this.present[i]){this.present[i]=1;this.active.push(i);this.ensureHeight(i);}}
  source(x,z,rate=.08){const i=this.index(x,z);if(i<0||this.sources.size>=8)return false;this.sources.set(i,rate);this.depth[i]=Math.max(this.depth[i],.12);this.activate(i);return true;}
  at(x,z){const i=this.index(x,z);return i<0?0:this.depth[i];}
  /** App passes a cell budget. Source/growth/transfer are committed as one
   * simulation step, spread over frames once a flood becomes very large. */
  step(dt,maxCells=Infinity){
    if(!this.work){dt=Math.min(.25,Math.max(0,dt));if(!dt)return true;this.time+=dt;for(const [i,rate]of this.sources){this.depth[i]=Math.min(260,this.depth[i]+rate*dt);this.activate(i);}this.work={dt,count:this.active.length,cursor:0,phase:0};this.total=0;}
    const w=this.work;dt=w.dt;let used=0,offset=((this.time*5)|0)%4;
    if(w.phase===0){for(;w.cursor<w.count&&used<maxCells;w.cursor++,used++){const i=this.active[w.cursor],depth=this.depth[i];if(depth<.00001)continue;this.age[i]+=dt;this.delta[i]+=this.replicating?(.025+depth*.06)*dt:0;
      const head=this.ensureHeight(i)+depth,x=i%this.n,z=(i/this.n)|0;let remaining=depth*.35;
      for(let j=0;j<4;j++){const d=(j+offset)%4,ni=d===0?(x>0?i-1:-1):d===1?(x<this.n-1?i+1:-1):d===2?(z>0?i-this.n:-1):(z<this.n-1?i+this.n:-1);if(ni<0)continue;const difference=head-(this.ensureHeight(ni)+this.depth[ni]);if(difference<=.01)continue;const transfer=Math.min(remaining,difference*dt*.13);if(transfer<.000002)continue;this.delta[i]-=transfer;this.delta[ni]+=transfer;remaining-=transfer;this.activate(ni);}
    }if(w.cursor<w.count)return false;w.phase=1;w.cursor=0;}
    for(;w.cursor<this.active.length&&used<maxCells;w.cursor++,used++){const i=this.active[w.cursor];this.depth[i]=Math.min(260,Math.max(0,this.depth[i]+this.delta[i]));this.delta[i]=0;this.total+=this.depth[i]*this.cell*this.cell;}
    if(w.cursor<this.active.length)return false;this.work=null;return true;
  }
  clear(){this.work=null;this.depth.fill(0);this.delta.fill(0);this.age.fill(0);this.present.fill(0);this.active.length=0;this.sources.clear();this.total=0;}
  save(){while(this.work)this.step(0);return {half:this.half,cell:this.cell,replicating:this.replicating,cells:this.active.filter(i=>this.depth[i]>.001).map(i=>[i,Number(this.depth[i].toFixed(4))]),sources:[...this.sources]};}
  restore(d){if(!d||(d.half!=null&&d.half!==this.half)||(d.cell!=null&&d.cell!==this.cell)||!Array.isArray(d.cells)||d.cells.length>this.count||!Array.isArray(d.sources)||d.sources.length>8)throw Error('Invalid fluid save');for(const [i,v]of [...d.cells,...d.sources])if(!Number.isInteger(i)||i<0||i>=this.count||!Number.isFinite(v)||v<0||v>260)throw Error('Invalid fluid cell');this.clear();for(const [i,v]of d.cells){this.activate(i);this.depth[i]=v;}for(const [i,v]of d.sources)this.sources.set(i,v);}
}
