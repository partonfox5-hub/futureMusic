import {buildPetAppearance,PET_BREEDS,breedIdFor} from './src/dog/PetAppearance.js?v=19.3.0';
import {paletteSkinnedVertex} from './modules/human5-skinning.js?v=19.3.0';
import * as THREE from 'three';
import { DogModel, clamp } from './src/dog/Dog.js?v=19.3.0';
import { DogPaws, floorAt } from './src/dog/DogPaws.js?v=19.3.0';
import { DogJaw } from './src/dog/DogJaw.js?v=19.3.0';
import { DogTail } from './src/dog/DogTail.js?v=19.3.0';
import { DogFur } from './src/dog/DogFur.js?v=19.3.0';
import { DogAudio } from './src/dog/DogAudio.js?v=19.3.0';
import { DogAI } from './src/dog/DogAI.js?v=19.3.0';
import { DogAnim } from './src/dog/DogAnim.js?v=19.3.0';
import { DogNeeds } from './src/dog/DogNeeds.js?v=19.3.0';
import { DogItems } from './src/dog/DogItems.js?v=19.3.0';
import { DogBite } from './src/dog/DogBite.js?v=19.3.0';
import { BONE_NAMES } from './src/dog/Dog.js?v=19.3.0';
const _p=new THREE.Vector3(),_q=new THREE.Vector3();
function dogNearestHit(handle,pos,maxDist){
 if(!handle.grabs?.size){const scale=handle.root.getWorldScale(_q),radius=1.4*Math.max(scale.x,scale.y,scale.z)+maxDist;if(handle.root.getWorldPosition(_p).distanceToSquared(pos)>radius*radius)return null;}
 let best=null,bd=maxDist,point=new THREE.Vector3();
 handle.root.updateMatrixWorld(true);handle._model.skeleton.update();
 handle.root.traverse(mesh=>{
  if(!mesh.isSkinnedMesh||!mesh.geometry?.attributes?.position||mesh.material?.name?.startsWith('Dog_FurShell_'))return;
  const n=mesh.geometry.attributes.position.count,step=n>900?3:1;
  for(let i=0;i<n;i+=step){
   paletteSkinnedVertex(mesh,i,_p);_p.applyMatrix4(mesh.matrixWorld);
   const d=_p.distanceTo(pos);if(d<bd){bd=d;point.copy(_p);best=mesh;}
  }
 });
 if(!best)return null;
 let bone=handle._model.bones.Spine,bdB=1e9;
 for(const name of BONE_NAMES){
  const b=handle._model.bones[name];if(!b)continue;
  const d=b.getWorldPosition(_q).distanceTo(point);if(d<bdB){bdB=d;bone=b;}
 }
 handle.lastHitDistance=bd;
 return {mesh:best,bone,point:point.clone(),name:bone.name};
}

const byScene=new WeakMap(),byContext=new WeakMap();let emptySystem=null;
const Y=new THREE.Vector3(0,1,0);
const NAME_KEY='human5-dog-name',CAT_NAME_KEY='human5-cat-name';
function loadPetName(key,fallback){try{const n=localStorage.getItem(key);if(n&&n.trim())return n.trim().slice(0,24);}catch{}return fallback;}
function savePetName(key,n){try{localStorage.setItem(key,n);}catch{}}
function loadDogName(){return loadPetName(NAME_KEY,'Buddy');}
function saveDogName(n){savePetName(NAME_KEY,n);}
function loadCatName(){return loadPetName(CAT_NAME_KEY,'Miso');}
function saveCatName(n){savePetName(CAT_NAME_KEY,n);}
function cleanName(n,fallback='Buddy'){return String(n||'').replace(/["'`]+/g,'').replace(/[.!?]+$/g,'').trim().slice(0,24)||fallback;}
function tokens(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);}
function phon(s){return s.replace(/[aeiouy]/g,'').replace(/(.)\1+/g,'$1');}
function lev(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m)return n;if(!n)return m;const d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
const CONFUSE=[['ph','f'],['ck','k'],['qu','kw'],['wh','w'],['th','t'],['th','d'],['ie','y'],['ey','y'],['ee','i'],['ea','e'],['oo','u'],['x','cks'],['x','ks'],['x','cs'],['b','p'],['d','t'],['g','k'],['c','k'],['f','v'],['s','z'],['s','c'],['m','n'],['j','g']];
function fuzzOnce(word,into){
 const add=s=>{if(s&&s.length>=2&&s.length<=18)into.add(s);};
 add(word.replace(/'s$/,''));add(word.replace(/s$/,''));add(word+'s');add(word+'y');add(word+'es');
 add(word.replace(/(.)\1+/g,'$1'));add(word.replace(/e$/,''));add(word.replace(/y$/,'ie'));add(word.replace(/ie$/,'y'));add(word.replace(/ey$/,'y'));
 if(word.length<=4){add('w'+word);add('h'+word);}
 for(const [a,b] of CONFUSE){
  if(word.includes(a)){add(word.replace(a,b));add(word.split(a).join(b));}
  if(word.includes(b)){add(word.replace(b,a));add(word.split(b).join(a));}
 }
 if(word.length>=4)for(let i=0;i<word.length;i++)add(word.slice(0,i)+word.slice(i+1));
}
function fuzz(word){
 const a=new Set([word]);fuzzOnce(word,a);
 const b=new Set(a);for(const w of a)fuzzOnce(w,b);
 return b;
}
export function spokenNameMatch(spoken,name){
 const parts=tokens(name);if(!parts.length)return false;
 const spokenTok=tokens(spoken);if(!spokenTok.length)return false;
 const joined=spokenTok.join(' '),want=parts.join(' '),glued=want.replace(/\s+/g,'');
 if(joined===want||joined.includes(want)||joined.replace(/\s+/g,'')===glued)return true;
 if(joined.length>=3&&want.includes(joined)&&joined.length>=Math.max(3,want.length-2))return true;
 const names=parts.concat(glued);
 const stop=new Set(['the','a','an','to','my','you','me','hey','hi','yo','please','can','come','here','boy','girl','and','for','mira','her','him','that','this','okay','ok','yeah','yes','no','just','dog','puppy','pup','cat','kitty','kitten','good','whoa','whoah']);
 const variants=new Set();
 for(const p of names)for(const f of fuzz(p))variants.add(f);
 for(const tok of spokenTok){
  if(stop.has(tok)&&!names.includes(tok)&&!variants.has(tok))continue;
  for(const part of names){
   if(!part)continue;
   if(tok===part)return true;
   if(variants.has(tok))return true;
   if(part.length>=3&&tok.length>=3&&(part.startsWith(tok)||part.endsWith(tok)||tok.startsWith(part)||tok.endsWith(part)))return true;
   const maxE=part.length<=3?1:part.length<=6?2:3;
   if(tok.length>=2&&lev(tok,part)<=maxE&&Math.abs(tok.length-part.length)<=maxE+1)return true;
   const pa=phon(part),pb=phon(tok);
   if(part.length>=3&&pa.length>=2&&(pa===pb||lev(pa,pb)<=1&&pa.length>=3))return true;
   if(part.length>=4&&tok.slice(0,3)===part.slice(0,3)&&Math.abs(tok.length-part.length)<=2)return true;
  }
 }
 return false;
}
export function parseNameCommand(spoken){
 const s=String(spoken||'').trim();
 const m=s.match(/^(?:your name(?:'s| is)|you(?:'re| are) (?:called|named)|i(?:'ll)? (?:name|call(?:ed)?) you|(?:i )?(?:re)?name you|from now on you(?:'re| are)|call yourself)\s+(.+)$/i);
 if(!m)return null;
 let n=m[1].replace(/["'`]/g,'').replace(/[.!?]+$/,'').replace(/^(?:a |the |my )+/i,'').trim();
 n=n.split(/\s+/).filter(w=>!/^(boy|girl|puppy|pup|dog|please|ok|okay)$/i.test(w)).join(' ');
 n=n.replace(/[^a-zA-Z0-9 '\-]/g,'').trim().slice(0,24);
 return n||null;
}

export function createDogSystem(input={}) {
  const context=(input&&typeof input==='object')?input:{};
  const existing=byContext.get(context)||(context.scene&&byScene.get(context.scene));
  if(existing&&!existing.disposed){existing._install(context);return existing;}
  if(!Object.keys(context).length&&emptySystem){byContext.set(context,emptySystem);return emptySystem;}
  const ctx={...context},handles=[],audio=new DogAudio(ctx),items=new DogItems(ctx),itemGrabs=new Map();let coat='#b68952',slowFrames=0,serial=0,raf=0,lastFrame=0,hostOwned=!!ctx.props||ctx.hostTick===true,readySeen=false,disposed=false;
  const rafAvailable=()=>typeof requestAnimationFrame==='function';
  const cancelLoop=()=>{if(raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(raf);raf=0;lastFrame=0;};
  const step=dt=>{
    if(disposed)return;
    dt=clamp(dt,0,.1);if(!dt)return;
    slowFrames=dt>1/50?slowFrames+1:0;if(slowFrames>=30)items.slow=true;
    for(const [ctrl,a] of itemGrabs)if(!ctrl.parent){items.setHeld(a.group,null);items.drop(a);itemGrabs.delete(ctrl);}
    items.tick(dt);audio.tick();for(const h of [...handles]){h.tickGrab(dt);h.tickPet?.(dt);h._anim.tick(dt);h._fur.tick(dt,ctx.renderer);const distance=ctx.camera?h.root.getWorldPosition(new THREE.Vector3()).distanceTo(ctx.camera.getWorldPosition(new THREE.Vector3())):0;h._fur.setLayers(distance<2.4?2:distance<5?1:0);}
  };
  const ownFrame=t=>{raf=0;if(disposed||hostOwned||!handles.length&&!items.items.length)return;const dt=lastFrame?(t-lastFrame)/1000:1/60;lastFrame=t;step(dt);raf=requestAnimationFrame(ownFrame);};
  const ensureLoop=()=>{if(!hostOwned&&ctx.scene&&(handles.length||items.items.length)&&rafAvailable()&&!raf)raf=requestAnimationFrame(ownFrame);};
  const announce=()=>{if(ctx.props&&typeof ctx.props==='object')ctx.props.dogs=system;if(typeof window!=='undefined')window.HUMAN2_DOG=system;};
  const defaultTransform=()=>{
    const g=(ctx.mira||ctx.system)?.actors?.[0]?.group;let yaw=0,position=new THREE.Vector3();
    if(g){
      if(g.getWorldPosition)g.getWorldPosition(position);else if(g.position)position.copy(g.position);
      yaw=g.getWorldQuaternion?new THREE.Euler().setFromQuaternion(g.getWorldQuaternion(new THREE.Quaternion()),'YXZ').y:g.rotation?.y||0;
    }
    position.add(new THREE.Vector3(.85,0,.15).applyAxisAngle(Y,yaw));position.y=floorAt(ctx.world,position.x,position.z,0);
    // The host scene normally has identity transform; also support transformed scene roots.
    if(ctx.scene?.worldToLocal)ctx.scene.worldToLocal(position);
    if(ctx.scene?.getWorldQuaternion)yaw-=new THREE.Euler().setFromQuaternion(ctx.scene.getWorldQuaternion(new THREE.Quaternion()),'YXZ').y;
    return {position,yaw};
  };
  const system={
    handles,breeds:PET_BREEDS,audio,
    get disposed(){return disposed;},
    spawn(opts={}){
      if(disposed)return null;opts=opts&&typeof opts==='object'?opts:{};
      const species=opts.species==='cat'?'cat':'dog';
      const id=opts.id==null?`${species}-${++serial}`:String(opts.id),found=handles.find(h=>h.id===id);if(found)return found;if(handles.length>=4)return null;
      const breedId=breedIdFor(species,opts.breed),breed=PET_BREEDS[breedId];
      const model=new DogModel(species,breed),paws=new DogPaws(model,ctx.world),jaw=new DogJaw(model),tail=new DogTail(model);
      model.breedId=breedId;model.bodyScale=breed.scale;buildPetAppearance(model);
      const fur=new DogFur(model,ctx.renderer,paws.padMaterial),ai=new DogAI(model,ctx);
      const mira0=(ctx.mira||ctx.system)?.actors?.[0];
      ai.setAttention(opts.attentionMode||mira0?.attentionMode||'attentive');
      model.compactMeshes();for(const mesh of model.meshes){mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.38,0),1.75);mesh.frustumCulled=true;}fur.rebindLayers();if(opts.coat)model.setCoat(opts.coat);
      model.root.scale.setScalar(model.bodyScale);
      const tf=defaultTransform(),last=handles.at(-1);let position=tf.position,yaw=tf.yaw;
      if(last&&!opts.default){position=last.root.position.clone().add(new THREE.Vector3(.6,0,0).applyAxisAngle(Y,last.root.rotation.y));yaw=last.root.rotation.y;}
      if(opts.position){if(Array.isArray(opts.position))position.fromArray(opts.position);else position.copy(opts.position);}
      if(Number.isFinite(opts.yaw))yaw=opts.yaw;
      model.root.position.copy(position);model.root.rotation.y=yaw;model.root.name=species==='cat'?'Human2_Cat':'Human2_Dog';
      model.root.userData.dogHandle=true;
      if(ctx.scene?.add)ctx.scene.add(model.root);
      model.root.updateMatrixWorld(true);
      const handle={
        id,root:model.root,group:model.root,version:species,kind:species,breedId,breed,bones:model.bones,grabs:new Map(),needs:new DogNeeds(),
        displayName:opts.name||(species==='cat'?loadCatName():loadDogName()),
        setName(n){const name=cleanName(n,species==='cat'?'Miso':'Buddy');handle.displayName=name;species==='cat'?saveCatName(name):saveDogName(name);return handle;},
        recall(){
          const cam=ctx.camera,player=new THREE.Vector3();
          if(cam?.getWorldPosition)cam.getWorldPosition(player);
          else if((ctx.mira||ctx.system)?.actors?.[0]?.group)(ctx.mira||ctx.system).actors[0].group.getWorldPosition(player);
          else player.copy(handle.root.position).add(new THREE.Vector3(0,0,1.2));
          ai.releaseSeat?.();ai.cancelFetch?.();ai.command=null;ai.follow=false;ai.interruptT=2;ai.greeting=true;ai.calledT=16;ai.zoomT=0;ai.pantT=0;ai.destroyT=0;ai.lifeT=0;ai.goal.copy(player);ai.interest=player;ai.state='greet';
          handle.bark('greeting');return handle;
        },
        setCoat(hex){model.setCoat(hex);return handle;},
        giveBone(){return system.spawnBone(model.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(.35,.1,.35)));},
        giveChicken(){return system.spawnChicken(model.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(.4,.1,.3)));},
        giveBag(){return species==='cat'?system.spawnCatBag(model.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(.5,.1,.35))):system.spawnKibbleBag(model.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(.5,.1,.35)));},
        giveBowl(){return system.spawnBowl(model.root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(-.4,0,.4)));},
        setJaw(t){jaw.set(t);return handle;},
        bark(pattern='ambient'){audio.bark(()=>jaw.bark(),handle,pattern);return handle;},
        setWag(amount){handle._anim.wag=clamp(amount);return handle;},
        setFollow(value){ai.follow=!!value;return handle;},
        setAttention(mode){ai.setAttention(mode);return handle;},
        setState(state){ai.setState(state);return handle;},
        nearestHit(pos,maxDist=.2){return dogNearestHit(handle,pos,maxDist);},
        applyStrike(hit,dir,mag=1){
          const n=(dir||new THREE.Vector3(0,0,-1)).clone();n.y=0;if(n.lengthSq()<1e-6)n.set(0,0,-1);n.normalize();
          handle.root.position.addScaledVector(n,Math.min(.14,mag*.05));
          ai.hurt=true;ai.hurtT=0;ai.disturb();handle.bark('warning-destroy');
        },
        knockDown(dir){
          ai.hurt=true;ai.state='sit';
          handle.root.rotation.z=dir&&dir.x>0?.28:-.28;
        },
        die(){ai.dead=true;ai.speed=0;ai.held=false;handle.dead=true;handle.endGrab();items.releaseDog(handle);},
        beginGrab(ctrl,hit,point){
          if(!hit||handle.grabs.has(ctrl))return;
          const bone=hit.bone||handle._model.bones.Spine,pt=point||hit.point||bone.getWorldPosition(new THREE.Vector3());
          if(['Head','Jaw'].includes(bone.name)){const item=items.takeFromMouth(handle,ctrl);if(item){itemGrabs.set(ctrl,items.resolve(item));return;}}
          ai.disturb();
          handle.grabs.set(ctrl,{ctrl,bone,local:bone.worldToLocal(pt.clone()),last:ctrl.getWorldPosition(new THREE.Vector3())});
          ai.held=true;ai.state='alert';
        },
        tickGrab(dt){
          if(!handle.grabs.size){ai.held=false;handle._heldLimbs=null;return;}
          ai.held=true;const held=new Set();
          for(const g of handle.grabs.values()){
            const bone=g.bone,name=bone?.name||'',target=g.ctrl.getWorldPosition(new THREE.Vector3());
            const side=name.startsWith('L')?'L':name.startsWith('R')?'R':null;
            const limb=/Shoulder|UpperArm|ForeArm|Paw/.test(name)?'front':/Hip|Thigh|Calf|Foot/.test(name)?'hind':/Neck|Head/.test(name)?'neck':'body';
            if((limb==='front'||limb==='hind')&&side){
              held.add(side+'_'+limb);
              const leg=paws.legs.find(l=>l.front===(limb==='front')&&l.root.name.startsWith(side));
              if(leg)paws.solve(leg,target);
              const cur=bone.localToWorld(g.local.clone()),delta=target.clone().sub(cur);delta.y=0;
              if(delta.length()>.32)handle.root.position.addScaledVector(delta,Math.min(.2,delta.length()*.25));
            }else if(limb==='neck'){
              const local=handle.root.worldToLocal(target.clone());
              const yaw=clamp(Math.atan2(local.x,local.z),-1.25,1.25);
              const pitch=clamp(-Math.atan2(local.y-.55,Math.hypot(local.x,local.z)),-.85,.75);
              const neck=handle._model.bones.Neck,head=handle._model.bones.Head;
              if(neck){neck.rotation.y=yaw*.58;neck.rotation.x=pitch*.5;}
              if(head){head.rotation.y=yaw*.42;head.rotation.x=pitch*.55;}
            }else{
              const cur=bone.localToWorld(g.local.clone()),delta=target.clone().sub(cur);
              if(delta.length()>.9){handle.endGrab(g.ctrl);continue;}
              if(delta.length()>6*dt+.08)delta.setLength(6*dt+.08);
              const parent=handle.root.parent;if(parent){const from=parent.worldToLocal(new THREE.Vector3()),to=parent.worldToLocal(delta.clone());delta.copy(to.sub(from));}handle.root.position.add(delta);
            }
            if(!handle.root.userData.waterSwimming)handle.root.position.y=Math.max(floorAt(ctx.world,handle.root.position.x,handle.root.position.z,handle.root.position.y),handle.root.position.y);
            handle.root.updateMatrixWorld(true);
          }
          handle._heldLimbs=held;
        },
        tickPet(){
          const hands=ctx.props?.system?.hands;if(!hands||handle.grabs.size)return;
          handle._petAt=handle._petAt??-2;const now=handle._anim?.time||0;if(now-handle._petAt<.55||now<(handle.h5PetCheck||0))return;handle.h5PetCheck=now+.05;
          for(let i=0;i<2;i++){
            if((hands.squeeze?.[i]||0)>.38)continue;
            const palm=hands.palmPos?.(i);if(!palm)continue;
            const hit=handle.nearestHit(palm,.12);if(!hit)continue;
            if((handle._anim?.time||0)-handle._petAt<.55)continue;
            handle._petAt=handle._anim?.time||0;
            handle.bark(species==='cat'?'purr':'content');handle.setWag(1);ai.state='alert';
            hands.haptics?.contact?.(i,'skin',.45,.01);
          }
        },
        endGrab(ctrl){
          if(ctrl&&itemGrabs.has(ctrl)){system.endGrab(ctrl);return;}
          if(ctrl)handle.grabs.delete(ctrl);else handle.grabs.clear();
          if(!handle.grabs.size){ai.held=false;handle._heldLimbs=null;}
        },
        despawn(){system.despawn(handle);},
        _model:model,_paws:paws,_jaw:jaw,_tail:tail,_fur:fur,_ai:ai,_items:items
      };
      handle.root.userData.dog=handle;handle.root.traverse(m=>{if(m.isMesh)m.userData.dog=handle;});
      handle._bite=new DogBite(handle,ctx,items);
      handle._anim=new DogAnim(model,paws,jaw,tail,ai,pattern=>handle.bark(pattern));
      handles.push(handle);announce();ensureLoop();return handle;
    },
    spawnDefault(){return handles.find(h=>h.id==='dog-default')||system.spawn({id:'dog-default',default:true,species:'dog'});},
    spawnDefaultCat(){
      const existing=handles.find(h=>h.id==='cat-default');if(existing)return existing;
      const dog=handles.find(h=>h.kind==='dog');
      const pos=dog?dog.root.position.clone().add(new THREE.Vector3(-.85,0,.35)):undefined;
      const cat=system.spawn({id:'cat-default',species:'cat',name:loadCatName(),position:pos,yaw:dog?dog.root.rotation.y+.4:undefined});
      if(cat){
        const p=cat.root.getWorldPosition(new THREE.Vector3());
        system.spawnChicken(p.clone().add(new THREE.Vector3(.45,.08,.2)));
        system.spawnCatBag(p.clone().add(new THREE.Vector3(.7,.08,-.15)));
      }
      return cat;
    },
    despawn(idOrHandle){const id=typeof idOrHandle==='object'?idOrHandle?.id:idOrHandle,i=handles.findIndex(h=>h.id===id);if(i<0)return false;const h=handles.splice(i,1)[0];h.endGrab();items.releaseDog(h);h._ai.releaseSeat();audio.cancel(h);h._fur.dispose();h._model.dispose();if(!handles.length)cancelLoop();return true;},
    tick(dt){if(!hostOwned){hostOwned=true;cancelLoop();}step(dt);},
    list(){return handles.slice();},
    setName(n,handle){const h=handle||handles.find(x=>x.kind==='dog')||handles[0];const name=cleanName(n,h?.kind==='cat'?'Miso':'Buddy');h?.setName(name);return h?.displayName||name;},
    parseNameCommand,
    callByVoice(text){
      const spoken=String(text||'');
      const named=parseNameCommand(spoken);
      if(named)system.setName(named);
      let hit=!!named;
      for(const h of handles){
        if(named||spokenNameMatch(spoken,h.displayName||'Buddy')){h.recall();hit=true;}
      }
      return hit;
    },
    setCoat(hex){if(!/^#[0-9a-f]{6}$/i.test(String(hex)))return false;coat=hex;for(const h of handles)h.setCoat(hex);return true;},
    spawnBone(pos){if(disposed)return null;const g=items.spawnBone(pos);ensureLoop();return g;},
    spawnChicken(pos){if(disposed)return null;const g=items.spawnChicken(pos);ensureLoop();return g;},
    spawnKibbleBag(pos){if(disposed)return null;const g=items.spawnKibbleBag(pos);ensureLoop();return g;},
    spawnCatBag(pos){if(disposed)return null;const g=items.spawnCatBag(pos);ensureLoop();return g;},
    spawnBowl(pos){if(disposed)return null;const g=items.spawnBowl(pos);ensureLoop();return g;},
    impact(hit,energy,dir,kind,sharpness){return items.impact(hit,energy,dir,kind,sharpness);},
    setItemHeld(group,controller,velocity){return items.setHeld(group,controller,velocity);},
    nearestHit(pos,maxDist=.2){let best=null,dist=maxDist;for(const h of handles){const hit=h.nearestHit(pos,dist);if(hit){dist=pos.distanceTo(hit.point);best={...hit,handle:h};}}for(const a of items.items){const p=new THREE.Box3().setFromObject(a.group).clampPoint(pos,new THREE.Vector3()),d=p.distanceTo(pos);if(d<dist){dist=d;best={mesh:a.group,point:p,item:a};}}return best;},
    beginGrab(ctrl,hit,point){const a=items.resolve(hit);if(a){items.setHeld(a.group,ctrl);ctrl.attach?.(a.group);itemGrabs.set(ctrl,a);return true;}const h=hit?.handle||hit?.mesh?.userData?.dog;h?.beginGrab(ctrl,hit,point);return !!h;},
    tickGrab(dt){for(const h of handles)h.tickGrab(dt);},
    endGrab(ctrl,velocity){for(const [c,a] of [...itemGrabs])if(!ctrl||c===ctrl){const v=velocity||a.sampleVelocity;items.setHeld(a.group,null,v);items.drop(a,null,v);itemGrabs.delete(c);}for(const h of handles){if(ctrl)h.grabs.delete(ctrl);else h.grabs.clear();h._ai.held=h.grabs.size>0;}},
    // Optional lifecycle helper for fork reloads. Normal host use only needs tick().
    dispose(){system.endGrab();for(const h of [...handles])system.despawn(h);disposed=true;cancelLoop();items.dispose();audio.dispose();byContext.delete(context);if(emptySystem===system)emptySystem=null;if(typeof document!=='undefined')document.removeEventListener('mira:ready',onReady);if(ctx.scene)byScene.delete(ctx.scene);if(ctx.props?.dogs===system)delete ctx.props.dogs;if(typeof window!=='undefined'&&window.HUMAN2_DOG===system)delete window.HUMAN2_DOG;},
    _install(next){if(disposed)return;Object.assign(ctx,next);items.bindImpact();hostOwned=hostOwned||!!ctx.props||ctx.hostTick===true;if(hostOwned)cancelLoop();if(ctx.scene){byScene.set(ctx.scene,system);for(const h of handles)if(!h.root.parent)ctx.scene.add(h.root);}byContext.set(next,system);announce();if(ctx.scene&&(readySeen||(ctx.mira||ctx.system)?.ready===true)){system.spawnDefault();system.spawnDefaultCat();}ensureLoop();}
  };
  function onReady(){readySeen=true;if(ctx.scene&&!disposed){system.spawnDefault();system.spawnDefaultCat();}}
  if(typeof document!=='undefined')document.addEventListener('mira:ready',onReady,{once:true});
  byContext.set(context,system);if(!Object.keys(context).length)emptySystem=system;
  system._install(context);return system;
}
export function installDog(ctx){return createDogSystem(ctx);}
export const DogModule={install:installDog,create:createDogSystem};
