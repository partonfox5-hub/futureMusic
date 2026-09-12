import {T,V,rng,unit,clamp} from './math.js?v=5.0.0';
import {canvas,texture} from './textures.js?v=5.0.0';

function noise2(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy,s=u*u*(3-2*u),t=v*v*(3-2*v),hash=(a,b)=>{let n=Math.imul(a+seed,374761393)^Math.imul(b+91,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);return (a+(b-a)*s)*(1-t)+(c+(d-c)*s)*t;}
export function effectAtlas(){
 const c=canvas(512),x=c.getContext('2d'),data=x.createImageData(512,512);
 for(let tile=0;tile<4;tile++)for(let y=0;y<256;y++)for(let px=0;px<256;px++){
  const dx=(px-128)/124,dy=(y-128)/124,r=Math.hypot(dx,dy),coarse=noise2(px*.026,y*.026,13+tile*31),fine=noise2(px*.071,y*.071,82+tile*17),micro=noise2(px*.19,y*.19,38),density=coarse*.54+fine*.32+micro*.14,edge=clamp((.92+(coarse-.5)*.28-r)*7,0,1);
  let red,green,blue,alpha;
  if(tile===3){red=20;green=14;blue=17;alpha=clamp((.94-r)*2,0,.92)*(1-.23*fine);}
  else if(tile===1){const shade=clamp(.42+density*.65-dy*.15+dx*.08,0,1);red=shade*166;green=shade*174;blue=shade*187;alpha=edge*(.40+density*.5);}
  else{const heat=clamp((density-.19)*1.36+(1-r)*.18,0,1),h=heat*heat;red=145+110*clamp(heat*2,0,1);green=16+220*h;blue=3+176*h*h;alpha=edge*(.62+.38*density);if(tile===2){green*=.75;blue*=.66;}}
  const index=((Math.floor(tile/2)*256+y)*512+tile%2*256+px)*4;data.data[index]=red;data.data[index+1]=green;data.data[index+2]=blue;data.data[index+3]=Math.round(alpha*255);
 }
 x.putImageData(data,0,0);const t=texture(c);t.generateMipmaps=false;t.minFilter=T.LinearFilter;return t;
}
class SpriteBatch{
 constructor(scene,atlas,capacity,additive=false,billboard=true){
  this.capacity=capacity;const geo=new T.PlaneGeometry(1,1);for(const [name,size]of [['spriteColor',4],['spriteTile',1],['spriteAngle',1]])geo.setAttribute(name,new T.InstancedBufferAttribute(new Float32Array(capacity*size),size).setUsage(T.DynamicDrawUsage));
  const mat=new T.ShaderMaterial({uniforms:{atlas:{value:atlas}},transparent:true,depthWrite:false,blending:additive?T.AdditiveBlending:T.NormalBlending,side:T.DoubleSide,
   vertexShader:`attribute vec4 spriteColor; attribute float spriteTile; attribute float spriteAngle;
    varying vec2 vUv; varying vec4 vColor;
    void main(){vColor=spriteColor;vUv=(vec2(mod(spriteTile,2.0),1.0-floor(spriteTile/2.0))+uv)/2.0;
     ${billboard?`vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);vec2 p=position.xy;
      p=mat2(cos(spriteAngle),-sin(spriteAngle),sin(spriteAngle),cos(spriteAngle))*p;
      center.xy+=p*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));gl_Position=projectionMatrix*center;`:
     `gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);`}
    }`,
   fragmentShader:`uniform sampler2D atlas;varying vec2 vUv;varying vec4 vColor;
    void main(){vec4 texel=texture2D(atlas,vUv);gl_FragColor=vec4(texel.rgb*vColor.rgb,texel.a*vColor.a);if(gl_FragColor.a<.004)discard;
     #include <colorspace_fragment>
    }`});
  this.mesh=new T.InstancedMesh(geo,mat,capacity);this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh.count=0;this.mesh.renderOrder=billboard?(additive?4:5):2;this.scene=scene;scene.add(this.mesh);this.matrix=new T.Matrix4();this.identity=new T.Quaternion();
 }
 add(i,p,size,c,opacity,tile,angle=0,q=this.identity){if(i>=this.capacity)return i;this.matrix.compose(p,q,V(size,size,size));this.mesh.setMatrixAt(i,this.matrix);const a=this.mesh.geometry.attributes;a.spriteColor.setXYZW(i,c.r,c.g,c.b,opacity);a.spriteTile.setX(i,tile);a.spriteAngle.setX(i,angle);return i+1;}
 end(count){this.mesh.count=count;this.mesh.visible=count>0;if(count){this.mesh.instanceMatrix.needsUpdate=true;for(const name of ['spriteColor','spriteTile','spriteAngle'])this.mesh.geometry.attributes[name].needsUpdate=true;}}
 dispose(){this.scene.remove(this.mesh);this.mesh.geometry.dispose();this.mesh.material.dispose();this.mesh.dispose();}
}
export class Atmosphere{
 constructor(scene){
  this.scene=scene;this.random=rng(42059);this.atlas=effectAtlas();this.fire=new SpriteBatch(scene,this.atlas,128,true);this.smoke=new SpriteBatch(scene,this.atlas,128);this.decals=new SpriteBatch(scene,this.atlas,48,false,false);
  this.beamFire=new SpriteBatch(scene,this.atlas,64,true);this.beamSmoke=new SpriteBatch(scene,this.atlas,64);this.beamPoint=V();this.beamTint=new T.Color(0xff5739);this.beamSmokeTint=new T.Color(0x88828b);
  this.particles=Array.from({length:256},()=>({p:V(),v:V(),age:9,life:0,size:0,growth:0,tile:0,color:new T.Color(),angle:0}));this.at=0;this.burns=[];this.opaque=[];this.playerPosition=V();this.quality='balanced';this.emissions=0;
  this.lights=Array.from({length:2},()=>{const l=new T.PointLight(0xff893d,0,18,2);scene.add(l);return l;});this.flash=0;this.flashPeak=0;
 }
 spawn(p,v,life,size,growth,tile,color=0xffffff){const b=this.particles[this.at++%this.particles.length];b.p.copy(p);b.v.copy(v);Object.assign(b,{age:0,life,size,growth,tile,angle:this.random()*6.283});b.color.set(color);this.emissions++;return b;}
 event(e){
  if(!e.p)return;if(e.type==='ignite'){this.ignite(e);return;}
  if(e.type!=='boom'&&e.type!=='break')return;if(e.p.distanceToSquared(this.playerPosition)>(this.quality==='high'?160:120)**2)return;
  const radius=clamp(e.radius||(e.kind==='barrel'?3:1.0),.4,28),scale=this.quality==='performance'?.65:1,count=Math.floor(clamp(7+radius*1.1,8,23)*scale);
  for(let i=0;i<count;i++){const dir=unit(this.random),p=e.p.clone().addScaledVector(dir,radius*.10*this.random()),speed=(.5+this.random())*radius*.45;
   this.spawn(p,dir.clone().multiplyScalar(speed),.32+Math.sqrt(radius)*.16+this.random()*.28,radius*(.13+this.random()*.22),radius*.3,0);
   if(i%2===0)this.spawn(p,dir.clone().multiplyScalar(speed*.6),2.1+Math.sqrt(radius)*.5,radius*.17,radius*.5,1,0x929ba6);
  }
  if(e.type==='boom'){this.flash=.30;this.flashPeak=clamp(radius*1.3,3,17);this.lights[0].position.copy(e.p);this.lights[0].distance=clamp(radius*3,6,28);}
 }
 ignite(e){
  let b=this.burns.find(b=>b.target===(e.target||0)&&b.anchor.distanceToSquared(e.p)<.25);
  if(!b){if(this.burns.length>=48)this.burns.shift();b={anchor:e.p.clone(),p:e.p.clone(),normal:(e.normal||V(0,1,0)).clone(),target:e.target||0,local:null,color:new T.Color(e.color||0xff532b),age:0,emit:0,life:10};this.burns.push(b);}b.age=0;b.life=10;
 }
 update(g,dt){
  this.playerPosition.copy(g.player.p);
  // Continuous overlapping volumes cover the entire clipped beam, with fixed
  // capacity and no transient particle allocation or extra lights per sample.
  let beamCount=0;const beam=g.weapons.beam;
  if(beam){const length=beam.a.distanceTo(beam.b);beamCount=Math.min(this.quality==='performance'?32:64,Math.max(2,Math.ceil(length/.65)));
   const step=length/beamCount,size=Math.max(.34,step*1.55);this.beamTint.set(beam.color);
   for(let i=0;i<beamCount;i++){const t=(i+.5)/beamCount,phase=g.time*9+i*2.4;this.beamPoint.lerpVectors(beam.a,beam.b,t);
    this.beamFire.add(i,this.beamPoint,size,this.beamTint,.20+.06*Math.sin(phase),2,phase*.21);
    this.beamSmoke.add(i,this.beamPoint,size*1.25,this.beamSmokeTint,.10+.035*Math.sin(phase+1),1,-phase*.12);
   }
  }
  this.beamFire.end(beamCount);this.beamSmoke.end(beamCount);
  let decals=0;const smokeColor=new T.Color(0x7b818c),white=new T.Color(0xffffff);
  for(const b of this.burns){b.age+=dt;b.life-=dt;
   if(b.target){const e=b.entity||(b.entity=g.entities.find(e=>e.id===b.target));if(!e?.alive){b.life=0;continue;}if(!b.local){b.local=b.p.clone().sub(e.p).applyQuaternion(e.q.clone().invert());b.localNormal=b.normal.clone().applyQuaternion(e.q.clone().invert());}b.p.copy(b.local).applyQuaternion(e.q).add(e.p);b.normal.copy(b.localNormal).applyQuaternion(e.q);}
   if(b.life<=0)continue;b.emit-=dt;
   if(b.age<2&&b.emit<=0&&dt>0){b.emit=this.quality==='performance'?.16:.09;const p=b.p.clone().addScaledVector(b.normal,.08),jitter=unit(this.random).multiplyScalar(.12);
    this.spawn(p,jitter.clone().addScaledVector(b.normal,.2),.45,.30,.42,2,0xffffff);
    this.spawn(p,jitter.multiplyScalar(.6).addScaledVector(b.normal,.17),2.6,.27,.5,1,0x8c919b);
   }
   const q=new T.Quaternion().setFromUnitVectors(V(0,0,1),b.normal);decals=this.decals.add(decals,b.p.clone().addScaledVector(b.normal,.018),.78,white,Math.min(1,b.life/2),3,0,q);
  }
  this.burns=this.burns.filter(b=>b.life>0);this.decals.end(decals);
  let fire=0,smoke=0;this.opaque.length=0;
  for(const p of this.particles){p.age+=dt;if(p.age>=p.life)continue;p.p.addScaledVector(p.v,dt);const u=p.age/p.life,size=p.size+p.growth*(1-Math.exp(-u*2.4));
   if(p.tile===1){p._size=size;p._opacity=Math.min(1,u*9)*(1-u)*.67;p._distance=p.p.distanceToSquared(g.player.p);this.opaque.push(p);}
   else fire=this.fire.add(fire,p.p,size,p.color,Math.pow(1-u,1.25),p.tile,p.angle+u*.45);
  }
  this.opaque.sort((a,b)=>b._distance-a._distance);for(const p of this.opaque)smoke=this.smoke.add(smoke,p.p,p._size,p.color,p._opacity,1,p.angle);this.fire.end(fire);this.smoke.end(smoke);
  this.flash=Math.max(0,this.flash-dt);this.lights[0].intensity=this.quality==='performance'?0:this.flashPeak*(this.flash/.3)**2;
  const t=clamp(g.weapons.charge/(7.170193/g.power),0,1);this.lights[1].position.copy(g.weapons.muzzle);this.lights[1].color.set(0x87dbef);this.lights[1].intensity=this.quality==='performance'?0:t*1.7;this.lights[1].distance=2.8;if(g.weapons.beam){this.lights[1].position.copy(g.weapons.beam.b);this.lights[1].color.set(g.weapons.beam.color);this.lights[1].intensity=this.quality==='performance'?0:2+Math.sin(g.time*37)*.3;this.lights[1].distance=4;}
 }
 dispose(){for(const b of [this.fire,this.smoke,this.decals,this.beamFire,this.beamSmoke])b.dispose();for(const l of this.lights)this.scene.remove(l);this.atlas.dispose();}
}
