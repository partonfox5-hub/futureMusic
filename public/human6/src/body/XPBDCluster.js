// Eight particles, twelve surface triangles, 18 distance constraints, one signed
// volume constraint and three compliant fascia pins. All state is actor-local.
export const BOX_FACES=new Uint8Array([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5]);
export const BOX_CORNERS=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
const PAIRS=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7],[0,2],[4,6],[0,5],[3,6],[0,7],[1,6]];
export const dampingRate=slider=>3+Math.max(0,Math.min(1,slider??.5))*24;
export function signedVolume(p,grad=null){
 let cx=0,cy=0,cz=0;for(let i=0;i<24;i+=3){cx+=p[i]/8;cy+=p[i+1]/8;cz+=p[i+2]/8;}if(grad)grad.fill(0);let volume=0;
 for(let j=0;j<BOX_FACES.length;j+=3){const a=BOX_FACES[j]*3,b=BOX_FACES[j+1]*3,c=BOX_FACES[j+2]*3;
  const ax=p[a]-cx,ay=p[a+1]-cy,az=p[a+2]-cz,bx=p[b]-cx,by=p[b+1]-cy,bz=p[b+2]-cz,cx1=p[c]-cx,cy1=p[c+1]-cy,cz1=p[c+2]-cz;
  volume+=(ax*(by*cz1-bz*cy1)+ay*(bz*cx1-bx*cz1)+az*(bx*cy1-by*cx1))/6;
  if(grad){grad[a]+=(by*cz1-bz*cy1)/6;grad[a+1]+=(bz*cx1-bx*cz1)/6;grad[a+2]+=(bx*cy1-by*cx1)/6;grad[b]+=(cy1*az-cz1*ay)/6;grad[b+1]+=(cz1*ax-cx1*az)/6;grad[b+2]+=(cx1*ay-cy1*ax)/6;grad[c]+=(ay*bz-az*by)/6;grad[c+1]+=(az*bx-ax*bz)/6;grad[c+2]+=(ax*by-ay*bx)/6;}
 }return volume;
}
export class XPBDCluster {
 constructor(rest,{pins=[0,1,3],iterations=6}={}){
  if(rest.length!==24)throw new Error('XPBDCluster requires exactly eight 3D particles');
  this.p=new Float64Array(rest);this.previous=new Float64Array(rest);this.v=new Float64Array(24);this.target=new Float64Array(rest);this.gradient=new Float64Array(24);this.pins=pins;this.iterations=iterations;this.edges=PAIRS.map(([a,b])=>({a:a*3,b:b*3,rest:Math.hypot(rest[a*3]-rest[b*3],rest[a*3+1]-rest[b*3+1],rest[a*3+2]-rest[b*3+2]),lambda:0}));this.restVolume=signedVolume(rest);if(this.restVolume<=1e-10)throw new Error('Rest cage must have positive volume');this.volumeScale=Math.pow(this.restVolume,2/3);this.pinLambda=new Float64Array(9);this.volumeLambda=0;this.recoveries=0;
 }
 reset(target=this.target){this.target.set(target);this.p.set(target);this.previous.set(target);this.v.fill(0);}
 centroid(out=[0,0,0],array=this.p){out[0]=out[1]=out[2]=0;for(let i=0;i<24;i++)out[i%3]+=array[i]/8;return out;}
 step(h,{softness=.62,damping=.5,gravity=9.81,contacts=[],grab=null}={}){
  const soft=Math.max(0,Math.min(1,softness)),edgeAlpha=(2e-7+soft*soft*2e-5)/(h*h),pinAlpha=(2e-6+soft*soft*8e-5)/(h*h),volumeAlpha=1e-10/(h*h),drag=Math.exp(-dampingRate(damping)*h);
  this.previous.set(this.p);this.pinLambda.fill(0);this.volumeLambda=0;for(const e of this.edges)e.lambda=0;
  for(let i=0;i<24;i++){this.v[i]*=drag;if(i%3===1)this.v[i]-=gravity*h;this.p[i]+=this.v[i]*h;}
  for(let iteration=0;iteration<this.iterations;iteration++){
   for(const e of this.edges){const dx=this.p[e.a]-this.p[e.b],dy=this.p[e.a+1]-this.p[e.b+1],dz=this.p[e.a+2]-this.p[e.b+2],length=Math.hypot(dx,dy,dz);if(length<1e-9)continue;const dl=(-(length-e.rest)-edgeAlpha*e.lambda)/(2+edgeAlpha);e.lambda+=dl;const k=dl/length;for(const [j,d] of [[0,dx],[1,dy],[2,dz]]){this.p[e.a+j]+=d*k;this.p[e.b+j]-=d*k;}}
   for(let pin=0;pin<3;pin++)for(let axis=0;axis<3;axis++){const i=this.pins[pin]*3+axis,j=pin*3+axis,dl=(-(this.p[i]-this.target[i])-pinAlpha*this.pinLambda[j])/(1+pinAlpha);this.pinLambda[j]+=dl;this.p[i]+=dl;}
   if(grab){const center=this.centroid(),alpha=2e-5/(h*h);for(let a=0;a<3;a++){const move=(grab[a]-center[a])/(1+alpha);for(let i=a;i<24;i+=3)this.p[i]+=move;}}
   this.solveVolume(volumeAlpha);
   // Contact planes and capsules are inequalities; they never pull tissue.
   for(const contact of contacts)this.projectContact(contact);
  }
  const ratio=signedVolume(this.p)/this.restVolume;
  if(!Number.isFinite(ratio)||ratio<.3||ratio>2||this.p.some(n=>!Number.isFinite(n))){this.reset();this.recoveries++;return;}
  for(let i=0;i<24;i++)this.v[i]=Math.max(-2,Math.min(2,(this.p[i]-this.previous[i])/h));
 }
 solveVolume(alpha){const volume=signedVolume(this.p,this.gradient);let denom=alpha;for(let i=0;i<24;i++){this.gradient[i]/=this.volumeScale;denom+=this.gradient[i]**2;}const dl=(-(volume-this.restVolume)/this.volumeScale-alpha*this.volumeLambda)/Math.max(1e-12,denom);this.volumeLambda+=dl;for(let i=0;i<24;i++)this.p[i]+=this.gradient[i]*dl;}
 projectContact(c){
  for(let i=0;i<24;i+=3){
   if(c.type==='plane'){
    if(c.bounds&&(Math.abs(this.p[i]-c.bounds.x)>c.bounds.rx||Math.abs(this.p[i+2]-c.bounds.z)>c.bounds.rz))continue;
    const distance=this.p[i]*c.n[0]+this.p[i+1]*c.n[1]+this.p[i+2]*c.n[2]-c.offset;
    if(distance<0)for(let a=0;a<3;a++)this.p[i+a]-=distance*c.n[a];
   }else if(c.type==='capsule'){
    const dx=c.b[0]-c.a[0],dy=c.b[1]-c.a[1],dz=c.b[2]-c.a[2],t=Math.max(0,Math.min(1,((this.p[i]-c.a[0])*dx+(this.p[i+1]-c.a[1])*dy+(this.p[i+2]-c.a[2])*dz)/Math.max(1e-10,dx*dx+dy*dy+dz*dz)));
    let nx=this.p[i]-c.a[0]-dx*t,ny=this.p[i+1]-c.a[1]-dy*t,nz=this.p[i+2]-c.a[2]-dz*t,d=Math.hypot(nx,ny,nz);if(d<c.r){if(d<1e-8){nx=1;ny=nz=0;d=1;}const k=(c.r-d)/d;this.p[i]+=nx*k;this.p[i+1]+=ny*k;this.p[i+2]+=nz*k;}
   }
  }
 }
}
