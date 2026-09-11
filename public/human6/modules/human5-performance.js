import * as T from 'three';
import {V,clamp,wrapMethod} from './human5-common.js?v=17.5.0';
import {RigidBatches} from './human5-batching.js?v=17.5.0';
export const QUEST_PROFILES=Object.freeze([
  {name:'detail',foveation:.35,interiorRange:20,pile:1200,mirrorHz:30,portalHz:30,shadowHz:72},
  {name:'balanced',foveation:.55,interiorRange:15,pile:800,mirrorHz:24,portalHz:24,shadowHz:36},
  {name:'sustain',foveation:.72,interiorRange:11,pile:400,mirrorHz:18,portalHz:18,shadowHz:24}
]);
export function percentile(values,p){if(!values.length)return null;const a=values.slice().sort((a,b)=>a-b);return a[Math.min(a.length-1,Math.floor(p*(a.length-1)))];}
export function chooseFrameRate(rates){const list=Array.from(rates||[]);return [72,80,90,60].find(r=>list.includes(r))||list.filter(r=>r>=60).sort((a,b)=>a-b)[0]||null;}
function summary(a){return {p50:percentile(a,.5),p95:percentile(a,.95),max:a.length?Math.max(...a):null};}

/** Measures delivered intervals, CPU work, all render calls and optional GPU time. */
export class FrameBudget {
  constructor(renderer,{targetHz=72,capacity=720,onTier=()=>{},adaptive=true}={}){Object.assign(this,{renderer,targetHz,capacity,onTier,adaptive});this.samples=[];this.pending=[];this.sections={};this.tier=0;this.last=0;this.lastDecision=0;this.slowWindows=0;this.fastWindows=0;this.warmUntil=0;this.lastGPU=null;
    this.gl=renderer.getContext();this.ext=this.gl.getExtension('EXT_disjoint_timer_query_webgl2');this.originalAutoReset=renderer.info.autoReset;renderer.info.autoReset=false;this.enabled=true;
  }
  begin(time=performance.now()){
    this.started=performance.now();this.interval=this.last?time-this.last:0;this.last=time;this.sections={};this.renderer.info.reset();
    const gl=this.gl;if(this.ext&&!gl.isContextLost()){
      const disjoint=gl.getParameter(this.ext.GPU_DISJOINT_EXT);if(disjoint){for(const q of this.pending)gl.deleteQuery(q.query);this.pending=[];this.lastGPU=null;}
      while(this.pending.length&&gl.getQueryParameter(this.pending[0].query,gl.QUERY_RESULT_AVAILABLE)){const q=this.pending.shift(),value=gl.getQueryParameter(q.query,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q.query);if(!disjoint){this.lastGPU=value;q.row.gpu=value;}}
      if(this.pending.length<6&&!gl.getQuery(this.ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY)){this.query=gl.createQuery();gl.beginQuery(this.ext.TIME_ELAPSED_EXT,this.query);}
    }
  }
  mark(name){const now=performance.now();this.sections[name]=(this.sections[name]||0)+now-(this.markAt??this.started);this.markAt=now;}
  end(){
    const now=performance.now();
    const row={interval:this.interval,cpu:now-this.started,gpu:null,calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,sections:{...this.sections},tier:this.tier};this.markAt=null;
    if(this.query){this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);this.pending.push({query:this.query,row});this.query=null;}
    // Keep startup/pause samples in raw evidence, exclude them from control decisions.
    if(this.interval>0){this.samples.push(row);if(this.samples.length>this.capacity)this.samples.shift();}
    if(this.adaptive&&now>this.warmUntil&&now-this.lastDecision>2000&&this.samples.length>=90){this.lastDecision=now;const rows=this.samples.slice(-120).filter(r=>r.interval<250),budget=1000/this.targetHz;
      const work=percentile(rows.map(r=>Math.max(r.cpu,r.gpu||0)),.95)||0,miss=rows.filter(r=>r.interval>budget*1.38).length/Math.max(1,rows.length);
      if(work>budget*.88||miss>.08){this.slowWindows++;this.fastWindows=0;}else if(work<budget*.60&&miss<.02){this.fastWindows++;this.slowWindows=0;}else{this.slowWindows=0;this.fastWindows=0;}
      if(this.slowWindows>=2&&this.tier<2){this.setTier(this.tier+1);this.slowWindows=0;}else if(this.fastWindows>=8&&this.tier>0){this.setTier(this.tier-1);this.fastWindows=0;}
    }return row;
  }
  setTier(tier){this.tier=clamp(Math.round(tier),0,2);this.onTier(this.tier);}
  startSession(session){this.targetHz=session.frameRate||chooseFrameRate(session.supportedFrameRates)||72;this.warmUntil=performance.now()+6000;this.last=0;this.samples=[];}
  report(){const rows=this.samples,active=rows.filter(r=>r.interval>0),budget=1000/this.targetHz,names=new Set(rows.flatMap(r=>Object.keys(r.sections)));
    return {format:'human5-performance-1',recordedAt:new Date().toISOString(),userAgent:navigator.userAgent,xr:this.renderer.xr.isPresenting,targetHz:this.targetHz,budgetMs:budget,tier:QUEST_PROFILES[this.tier].name,samples:rows.length,
      frameIntervalMs:summary(active.map(r=>r.interval)),cpuMs:summary(active.map(r=>r.cpu)),gpuMs:summary(active.map(r=>r.gpu).filter(Number.isFinite)),gpuTimerAvailable:!!this.ext,
      deliveredFPS:active.length?1000*active.length/active.reduce((s,r)=>s+r.interval,0):null,overBudgetFraction:active.length?active.filter(r=>r.interval>budget*1.38).length/active.length:null,
      drawCalls:summary(active.map(r=>r.calls)),triangles:summary(active.map(r=>r.triangles)),sectionsMs:Object.fromEntries([...names].map(n=>[n,summary(active.map(r=>r.sections[n]||0))])),resources:{...this.renderer.info.memory,programs:this.renderer.info.programs?.length},raw:rows};
  }
  dispose(){if(this.query){this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);this.gl.deleteQuery(this.query);}this.pending.forEach(q=>this.gl.deleteQuery(q.query));this.renderer.info.autoReset=this.originalAutoReset;}
}

/** Retain physics for held/moving objects; skip unchanged sleeping furniture work. */
export function installFurnitureSleep(props){const records=new WeakMap();let time=0;
  return wrapMethod(props,'tickFurniture',old=>function(dt){time+=dt;const world=this.world,full=world.movables||[],sleeping=new Set(),active=[];
    for(const g of full){const f=g.userData.furniture,p=g.position,q=g.quaternion,s=g.scale;if(!f){active.push(g);continue;}const stamp=[p.x,p.y,p.z,q.x,q.y,q.z,q.w,s.x,s.y,s.z].join('/'),r=records.get(g);
      const moving=(f.velocity?.lengthSq()||0)+(f.omega?.lengthSq()||0)>4e-5,held=f.held!=null||f.holds?.size||[...this.furnHolds.values()].some(h=>h.group===g);
      if(r&&!moving&&!held&&r.stamp===stamp&&r.revision===world.revision&&time<r.checkAt){sleeping.add(g);continue;}
      active.push(g);records.set(g,{stamp,revision:world.revision,checkAt:time+(!moving&&!held&&r?.stamp===stamp? .40:0)});
    }
    world.movables=active;
    try{return old.apply(this,arguments);}finally{const kept=new Set(world.movables);world.movables=full.filter(g=>g.parent&&(sleeping.has(g)||kept.has(g)));for(const g of kept)if(!full.includes(g))world.movables.push(g);}
  });
}

export function installPerformance({renderer,scene,camera,world,mira,props,upgrade,quest=true}={}){
  const restores=[],visibility=new Map(),actors=new Map();let time=0,lodT=0,shadowT=0,lastRevision=-1;const p=V();
  const apply=tier=>{const q=QUEST_PROFILES[tier];if(quest&&renderer.xr.isPresenting)renderer.xr.setFoveation?.(q.foveation);upgrade.textiles.maxTufts=Math.min(upgrade.textiles.pile.instanceMatrix.count,q.pile);upgrade.textiles.lastCenter.setScalar(Infinity);};
  const budget=new FrameBudget(renderer,{adaptive:quest,onTier:apply}),batches=new RigidBatches(world);restores.push(installFurnitureSleep(props));
  const throttle=(object,key,hzKey)=>{let last=-Infinity;restores.push(wrapMethod(object,key,old=>function(){const hz=quest?QUEST_PROFILES[budget.tier][hzKey]:60;if(time-last<1/hz)return;last=time;return old.apply(this,arguments);}));};
  for(const car of props.cars())throttle(car,'renderMirror','mirrorHz');if(props.gadgets?.renderViews)throttle(props.gadgets,'renderViews','portalHz');
  const onStart=()=>{const s=renderer.xr.getSession();if(s)budget.startSession(s);apply(budget.tier);};renderer.xr.addEventListener('sessionstart',onStart);
  function actorLOD(a){if(actors.has(a)||a.version!=='v2')return;let acc=0;const restore=wrapMethod(a,'tick',old=>function(dt,cam,t){this.h5SimulationDue=true;const far=quest&&this.group.position.distanceTo(cam)>9&&!this.grabs.size&&!this.socialPair&&!this.seat&&!this.dead&&this.balance.state==='standing';
      if(far){acc+=dt;if(acc<1/30){this.h5SimulationDue=false;return;}dt=Math.min(.05,acc);acc=0;}else acc=0;return old.call(this,dt,cam,t);});actors.set(a,restore);
  }
  const api={budget,
    beforeFrame(dt){time+=dt;lodT-=dt;shadowT+=dt;camera.getWorldPosition(p);world.h5Viewer=p;world.h5QuestBudget=quest;for(const [a,restore]of actors)if(!mira.actors.includes(a)){restore();actors.delete(a);}for(const [g]of visibility)if(!g.parent)visibility.delete(g);for(const a of mira.actors)actorLOD(a);
      const profile=QUEST_PROFILES[budget.tier];if(quest){renderer.shadowMap.autoUpdate=false;if(shadowT>=1/profile.shadowHz){shadowT=0;renderer.shadowMap.needsUpdate=true;}}
      if(lodT<=0||world.revision!==lastRevision){lodT=.15;if(world.revision!==lastRevision)batches.clear();lastRevision=world.revision;
        for(const g of world.movables||[])if(!g.userData.dogItem)batches.add(g);for(const d of world.doors?.list||[])batches.add(d.root);for(const h of world.neighborhood?.houses||[])if(h.staticRoot)batches.add(h.staticRoot);batches.tick();
        for(const h of world.neighborhood?.houses||[]){const inside=h.bounds.containsPoint(p),range=quest?profile.interiorRange:35;
          for(const g of h.contents){if(!g.parent)continue;const f=g.userData.furniture,near=inside||g.getWorldPosition(V()).distanceToSquared(p)<range*range||f?.held!=null||f?.holds?.size||(f?.velocity?.lengthSq()||0)>.01;
            if(!visibility.has(g))visibility.set(g,g.visible);g.visible=visibility.get(g)&&near;
          }
          for(const m of h.meshes){if(m===h.ceiling)continue;m.castShadow=h.bounds.distanceToPoint(p)<16;}
        }
        // Two cards occupy the same silhouette. Distant hair uses the first layer.
        for(const a of mira.actors){const hair=a.hairPhysics;if(hair?.mesh&&hair.cardLayers===2){const far=a.group.position.distanceToSquared(p)>25,geo=hair.mesh.geometry;geo.setDrawRange(0,far?hair.source.index.count:Infinity);}}
      }
    },
    exportReport(){return budget.report();},downloadReport(){const blob=new Blob([JSON.stringify(budget.report(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='human5-performance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);},
    dispose(){restores.reverse().forEach(f=>f());actors.forEach(f=>f());visibility.forEach((v,g)=>g.visible=v);batches.clear();renderer.xr.removeEventListener('sessionstart',onStart);renderer.shadowMap.autoUpdate=true;budget.dispose();}
  };world.h5Performance=api;const button=document.createElement('button');button.textContent='EXPORT PERFORMANCE REPORT';button.onclick=()=>api.downloadReport();(document.getElementById('hud')||document.body).append(button);return api;
}
