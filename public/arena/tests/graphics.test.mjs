// Geometry / texture / batching checks. No GPU or browser rendering is implied.
import test from 'node:test';import assert from 'node:assert/strict';import {createCanvas} from './qa-canvas.mjs';import {T,V,rng} from '../js/math.js';import {ArenaMap} from '../js/map.js';import {Simulation} from '../js/sim.js';import {WorldView} from '../js/world-view.js';import {EntityView} from '../js/entity-view.js';import {Effects} from '../js/effects.js';import {hydraModel} from '../js/models.js';
import {HullView} from '../js/hull-view.js';import {ScreenView} from '../js/screen-view.js';import {knightSwordPose,SWORD_TIP} from '../js/knight-pose.js';import {tangentFrame} from '../js/fracture.js';
globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return createCanvas(1,1);}};
test('a hull change uploads only that sphere mask; unchanged frames upload nothing',()=>{const scene=new T.Scene(),m=new ArenaMap(rng(652)),v=new WorldView(scene,m);v.update(0);assert.equal(v.textureChanges,0);m.addHole(0,V(1,0,0),2.45);v.update(1);assert.equal(v.textureChanges,1);v.update(2);assert.equal(v.textureChanges,1);const c=v.shells[0].tex.image,pixel=c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data;assert.equal(pixel[3],0,'hole alpha matches +X sphere direction');m.tubeHoles.push({tube:0,c:m.tubes[0].mid.clone().add(V(3.4,0,0)),r:2});m.revision++;v.update(3);assert.equal(v.textureChanges,2);v.dispose();});
test('new hydra has a separate hinged jaw with teeth and an open-mouth silhouette',()=>{const h=hydraModel(),jaw=h.getObjectByName('jaw');assert.ok(jaw&&jaw.children.length>=12);h.updateMatrixWorld(true);const closed=new T.Box3().setFromObject(jaw);jaw.rotation.x=.78;h.updateMatrixWorld(true);const open=new T.Box3().setFromObject(jaw);assert.ok(open.min.y<closed.min.y-.4);});
test('every enemy, pet and destructible model produces finite instance transforms',()=>{const g=new Simulation(933),scene=new T.Scene(),view=new EntityView(scene);for(const [i,type]of ['knight','camel','trilo','lemur','hornet','hydra'].entries()){const e=g.spawn(type,V(i*3,0,9),{nest:0,headIndex:0});e.dir=V(0,0,-1);e.jaw=1;e.charge=.7;}for(let kind=0;kind<7;kind++)g.spawn('drone',V(kind*2,3,7),{kind,dir:V(0,0,-1)});for(let kind=0;kind<8;kind++)g.pet(kind,V(kind*2,1,6));view.update(g);let instances=0;scene.traverse(o=>{if(!o.isInstancedMesh||!o.count)return;instances+=o.count;for(let i=0;i<o.count*16;i++)assert.ok(Number.isFinite(o.instanceMatrix.array[i]),o.name+' invalid matrix');});assert.ok(instances>40);assert.ok(view.neck.count>0);assert.equal(view.neck.count,view.joints.count);view.dispose();});
test('maximum drawn strokes remain visible within the effect pool',()=>{const g=new Simulation(9);g.entities=[];g.strokes=Array.from({length:8},(_,n)=>({alive:true,solid:true,life:10,points:Array.from({length:96},(_,i)=>V(i*.2,n,4))}));const scene=new T.Scene(),fx=new Effects(scene),cam=new T.PerspectiveCamera();fx.update(g,1/60,cam);assert.equal(fx.beams.count,8*95);fx.dispose();});

test('the mech beam origin matches the articulated model, including its aimed blade',()=>{
 const g=new Simulation(12);g.entities=[];g.time=19;g.player.p.set(0,0,0);const e=g.spawn('knight',V(0,0,10),{dir:V(.2,.1,-1).normalize(),laserCast:'fire',swordAim:new T.Quaternion().setFromEuler(new T.Euler(.1,.2,0))});
 const view=new EntityView(new T.Scene());view.update(g);const bone=view.batches.get('knight:0').bones.find(b=>b.name==='blade'),actual=V(0,0,SWORD_TIP).applyMatrix4(bone.matrix),expected=knightSwordPose(e,g.time).tip;assert.ok(actual.distanceTo(expected)<1e-6);view.dispose();
});
test('40 hydra heads retain all continuous necks under the dense-scene detail budget',()=>{
 const g=new Simulation(73);g.entities=[];g.player.p.set(0,0,0);for(let i=0;i<40;i++)g.spawn('hydra',V(i%8-4,Math.floor(i/8),10),{nest:0,headIndex:i,phase:i,dir:V(0,0,-1)});
 const view=new EntityView(new T.Scene());view.update(g);assert.equal(view.neck.count,40*8);assert.equal(view.joints.count,40*8);assert.equal(view.visible.length,40);assert.ok(view.neck.instanceMatrix.count>=800);view.dispose();
});
test('hull fragments batch by source surface, keep source coordinates, and survive capacity growth',()=>{
 const g=new Simulation(20);g.entities=[];g.player.p.set(38,0,0);for(let i=0;i<3;i++)g.breach({type:'sphere',id:0,pos:V(45,0,0),normal:V(1,0,0)});
 const scene=new T.Scene(),world=new WorldView(scene,g.map),view=new HullView(scene,world);view.update(g);assert.equal(view.visible,18);assert.equal(view.batches.size,1);const batch=[...view.batches.values()][0];assert.equal(batch.mesh.count,18);assert.ok(batch.mesh.instanceMatrix.array.slice(0,16).some(x=>x!==0));
 const attr=batch.mesh.geometry.attributes.sourcePosition;assert.ok(Math.abs(Math.hypot(attr.getX(0),attr.getY(0),attr.getZ(0))-45)<1e-4);view.dispose();world.dispose();
});
test('fire and smoke use bounded pools; contact fire follows moving targets and expires',()=>{
 const g=new Simulation(22);g.entities=[];const e=g.add('crate',V(1,0,4));const scene=new T.Scene(),fx=new Effects(scene),camera=new T.PerspectiveCamera();
 fx.event({type:'ignite',p:e.p.clone(),target:e.id,normal:V(0,1,0)});fx.update(g,.1,camera);e.p.x+=2;fx.update(g,.1,camera);assert.ok(fx.atmosphere.burns[0].p.x>2.9);
 for(let i=0;i<80;i++)fx.event({type:'boom',p:V(i%5,0,6),radius:14});fx.update(g,.1,camera);assert.ok(fx.atmosphere.fire.mesh.count<=128&&fx.atmosphere.smoke.mesh.count<=128);assert.ok(fx.atmosphere.fire.mesh.count>10);
 e.alive=false;for(let i=0;i<700;i++)fx.update(g,1/60,camera);assert.equal(fx.atmosphere.burns.length,0);assert.equal(fx.atmosphere.fire.mesh.count,0);assert.equal(fx.atmosphere.smoke.mesh.count,0);fx.dispose();
});
test('individual TV reaction frames share one batch and paused scenes avoid atlas uploads',()=>{
 const g=new Simulation(9);g.entities=[];const a=g.add('window',V(0,0,4),{kind:0,screen:{mode:'greet'}}),b=g.add('window',V(2,0,4),{kind:0,screen:{mode:'hidden'}}),view=new ScreenView(new T.Scene());
 view.update(g,[a,b]);const attr=view.mesh.geometry.attributes.screenTile;assert.equal(attr.getX(0),1);assert.equal(attr.getX(1),6);assert.equal(view.mesh.count,2);const uploads=view.uploads;view.update(g,[a,b]);assert.equal(view.uploads,uploads);view.dispose();
});
test('irregular tear texture and physical opening agree at equator and poles',()=>{
 for(const dir of [V(1,0,0),V(0,1,0),V(0,-1,0)]){const m=new ArenaMap(rng(27));m.spheres[0].holes=[];m.nests=[];m.hatches=[];const s=m.spheres[0],h=m.addHole(0,dir,5),scene=new T.Scene(),world=new WorldView(scene,m),c=world.shells[0].tex.image,x=c.getContext('2d'),frame=tangentFrame(dir);
  for(let i=0;i<12;i++)for(const radius of [1.8,8]){const a=i/12*Math.PI*2,angle=Math.asin(radius/s.r),n=dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(frame.side,Math.sin(angle)*Math.cos(a)).addScaledVector(frame.up,Math.sin(angle)*Math.sin(a)),p=n.clone().multiplyScalar(s.r);const u=(Math.atan2(n.z,-n.x)/(Math.PI*2)+1)%1,v=Math.acos(n.y)/Math.PI,alpha=x.getImageData(Math.min(c.width-1,Math.floor(u*c.width)),Math.min(c.height-1,Math.floor(v*c.height)),1,1).data[3];assert.equal(alpha<128,m.through(s,p),'mask/collider disagreement');}
  assert.ok(Math.max(...h.profile)-Math.min(...h.profile)>.3);world.dispose();
 }
});

test('sword fire and smoke cover the entire clipped beam with capped pools and stop on release',()=>{
 const g=new Simulation(7);g.entities=[];g.player.p.set(0,0,0);g.weapons.beam={a:V(0,0,2),b:V(0,0,57.2),color:0xff271f,width:.065};const fx=new Effects(new T.Scene()),cam=new T.PerspectiveCamera();fx.update(g,1/60,cam);
 const fire=fx.atmosphere.beamFire.mesh,smoke=fx.atmosphere.beamSmoke.mesh;assert.equal(fire.count,64);assert.equal(smoke.count,64);const m=new T.Matrix4(),p=V(),q=new T.Quaternion(),s=V();let previous=null;for(let i=0;i<fire.count;i++){fire.getMatrixAt(i,m);m.decompose(p,q,s);if(previous!==null)assert.ok(p.z-previous<s.x,'gaps in beam flame');previous=p.z;}assert.ok(p.z+s.x/2>=57.2);
 fx.quality='performance';fx.update(g,1/60,cam);assert.equal(fire.count,32);g.weapons.beam=null;fx.update(g,1/60,cam);assert.equal(fire.count,0);assert.equal(smoke.count,0);fx.dispose();
});
test('power fragments render RGB cores and halos, and flying red slashes have finite bounded geometry',()=>{
 const g=new Simulation(14);g.entities=[];g.player.p.set(0,0,0);g.add('shard',V(0,0,3));g.shot(V(0,0,8),V(0,0,1),30,8,{kind:'slash',r:.85,roll:.8});const fx=new Effects(new T.Scene());fx.update(g,1/60,new T.PerspectiveCamera());assert.equal(fx.fragmentGeometry.drawRange.count,3);assert.equal(fx.shards.count,0);const c=fx.fragmentColors;assert.ok(c[0]>c[1]&&c[0]>c[2]);assert.ok(c[4]>c[3]&&c[4]>c[5]);assert.ok(c[8]>c[6]&&c[8]>c[7]);assert.equal(fx.slashes.count,1);assert.equal(fx.slashGlow.count,1);for(const x of fx.slashGeometry.attributes.position.array)assert.ok(Number.isFinite(x));fx.dispose();
});
