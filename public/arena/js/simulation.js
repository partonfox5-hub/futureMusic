// Gameplay constants retained from the supplied production game.
export const RULES = Object.freeze({radius:42, boundary:40, drones:14, hp:2,
  droneSpeed:1.6, contactRadius:1.1, contactDrain:40, power:1000, maxPower:1400,
  drain:4, shotCost:2, killPower:18, killScore:25, boltSpeed:48, boltLife:1.15,
  hitRadius:1.05, respawn:0.7, acceleration:18, xrAcceleration:16, damping:2.2});
export const POOL_SIZE = 96;
export function seededRandom(seed=28349) { return () => { seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
// Swept segment test: prevents fast bolts skipping targets between frames.
export function segmentHit(ax,ay,az,bx,by,bz,x,y,z,r) {
  const dx=bx-ax,dy=by-ay,dz=bz-az,ox=ax-x,oy=ay-y,oz=az-z;
  const c=ox*ox+oy*oy+oz*oz-r*r; if(c<=0)return 0;
  const a=dx*dx+dy*dy+dz*dz; if(a<1e-12)return Infinity;
  const b=ox*dx+oy*dy+oz*dz,disc=b*b-a*c; if(disc<0)return Infinity;
  const t=(-b-Math.sqrt(disc))/a; return t>=0&&t<=1?t:Infinity;
}
export class Simulation {
  constructor(random=Math.random) {
    this.random=random;
    this.drones=Array.from({length:RULES.drones},(_,id)=>({id,x:0,y:0,z:0,hp:2,respawn:0,flash:0,spin:random()*2-1}));
    this.bolts=Array.from({length:POOL_SIZE},()=>({active:false,x:0,y:0,z:0,dx:0,dy:0,dz:0,life:0}));
    this.events=[];this.eventPool=Array.from({length:POOL_SIZE+1},()=>({type:'',x:0,y:0,z:0}));this.reset();
  }
  spawn(d,initial=false) {
    const u=this.random()*Math.PI*2,v=(this.random()-.5)*Math.PI,r=(initial?10:16)+this.random()*(initial?22:18);
    d.x=Math.cos(u)*Math.cos(v)*r;d.y=Math.sin(v)*r;d.z=Math.sin(u)*Math.cos(v)*r;
    d.hp=RULES.hp;d.respawn=0;d.flash=0;
  }
  reset(){this.power=RULES.power;this.score=0;this.elapsed=0;this.ended=false;this.damage=0;this.shots=0;this.hits=0;this.events.length=0;for(const d of this.drones)this.spawn(d,true);for(const b of this.bolts)b.active=false;}
  emit(type,x,y,z){const e=this.eventPool[this.events.length];if(!e)return;e.type=type;e.x=x;e.y=y;e.z=z;this.events.push(e);}
  fire(x,y,z,dx,dy,dz){
    if(this.ended||this.power<RULES.shotCost)return false;
    const b=this.bolts.find(b=>!b.active);if(!b)return false;
    const len=Math.hypot(dx,dy,dz);if(!Number.isFinite(len)||len<.00001)return false;
    dx/=len;dy/=len;dz/=len;
    b.active=true;b.x=x+dx*.8;b.y=y+dy*.8;b.z=z+dz*.8;b.dx=dx;b.dy=dy;b.dz=dz;b.life=RULES.boltLife;
    this.power-=RULES.shotCost;this.shots++;return true;
  }
  step(dt,player){
    this.events.length=0;if(this.ended)return;
    this.elapsed+=dt;this.damage=0;
    for(const d of this.drones){
      d.flash=Math.max(0,d.flash-dt);
      if(d.hp<=0){d.respawn-=dt;if(d.respawn<=0)this.spawn(d);continue;}
      const dx=player.x-d.x,dy=player.y-d.y,dz=player.z-d.z,dist=Math.hypot(dx,dy,dz);
      if(dist<RULES.contactRadius)this.damage+=RULES.contactDrain*dt;
      else {const f=Math.min(RULES.droneSpeed*dt,dist)/dist;d.x+=dx*f;d.y+=dy*f;d.z+=dz*f;}
    }
    for(const b of this.bolts){
      if(!b.active)continue;
      const travel=RULES.boltSpeed*Math.min(dt,b.life),nx=b.x+b.dx*travel,ny=b.y+b.dy*travel,nz=b.z+b.dz*travel;
      let target=null,nearest=Infinity;
      for(const d of this.drones){if(d.hp<=0)continue;const t=segmentHit(b.x,b.y,b.z,nx,ny,nz,d.x,d.y,d.z,RULES.hitRadius);if(t<nearest){nearest=t;target=d;}}
      if(target){
        b.x+=(nx-b.x)*nearest;b.y+=(ny-b.y)*nearest;b.z+=(nz-b.z)*nearest;
        target.hp--;target.flash=.15;this.hits++;b.active=false;
        if(target.hp<=0){target.respawn=RULES.respawn;this.score+=RULES.killScore;this.power=Math.min(RULES.maxPower,this.power+RULES.killPower);}
        this.emit(target.hp<=0?'kill':'hit',b.x,b.y,b.z);
      }else{b.x=nx;b.y=ny;b.z=nz;b.life-=dt;if(b.life<=0||nx*nx+ny*ny+nz*nz>RULES.radius**2)b.active=false;}
    }
    this.power=Math.max(0,this.power-RULES.drain*dt-this.damage);
    if(this.power<=0){this.ended=true;this.emit('end',player.x,player.y,player.z);}
  }
}
