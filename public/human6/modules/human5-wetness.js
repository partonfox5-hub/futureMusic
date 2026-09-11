import * as T from 'three';
export function createWetnessSystem({mira,props,world,weather,wardrobe}={}){
  const records=new Map();let scan=0;
  function install(actor){let r=records.get(actor);if(!r){const wet=actor.h5Wetness??={skin:0,hair:0,clothes:0};r={wet,uniforms:{skin:{value:wet.skin},hair:{value:wet.hair},clothes:{value:wet.clothes}},materials:new Map()};records.set(actor,r);}
    const add=(mesh,type)=>{if(!mesh)return;for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material]){if(!m?.isMeshStandardMaterial||r.materials.has(m))continue;
      const old=m.onBeforeCompile,key=m.customProgramCacheKey,uniform=r.uniforms[type],dark=type==='skin'?.05:type==='hair'?.35:.25,rough=type==='skin'?.23:type==='hair'?.18:.62;
      const wrapper=s=>{old?.call(m,s);s.uniforms.h5SurfaceWet=uniform;s.fragmentShader='uniform float h5SurfaceWet;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\ndiffuseColor.rgb*=1.-h5SurfaceWet*${dark.toFixed(3)};`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,min(roughnessFactor,${rough.toFixed(3)}),h5SurfaceWet);`);};
      m.onBeforeCompile=wrapper;m.customProgramCacheKey=()=> (key?.call(m)||'')+'/h5-wet-1/'+type;m.needsUpdate=true;r.materials.set(m,{old,key,wrapper});}
    };
    for(const m of actor.skinMeshes||[])add(m,'skin');add(actor.hairPhysics?.mesh,'hair');add(actor.hairPhysics?.cap,'hair');actor.h5Groom?.root?.traverse(m=>{if(m.isMesh)add(m,'hair');});for(const c of wardrobe?.clothes||[])if(c.actor===actor){add(c.mesh,'clothes');add(c.skinLOD?.mesh,'clothes');}return r;
  }
  function release(actor,r){for(const [m,s]of r.materials)if(m.onBeforeCompile===s.wrapper){m.onBeforeCompile=s.old;m.customProgramCacheKey=s.key;m.needsUpdate=true;}records.delete(actor);}
  return {records,soak(actor,dt,amount=1){const {wet}=install(actor);for(const k of ['skin','hair','clothes'])wet[k]=Math.min(1,wet[k]+Math.max(0,dt)*amount*(k==='skin'?1.6:1.1));},
    tick(dt,showers=[]){scan-=dt;if(scan<=0){scan=.5;for(const a of mira.actors)install(a);for(const [a,r]of records)if(!mira.actors.includes(a))release(a,r);}
      for(const [a,r]of records){const p=a.group.getWorldPosition(new T.Vector3()),head=p.clone().add(new T.Vector3(0,1.45*(a.shape?.height||1),0));let skin=0,hair=0;
        const water=world.h5OpenWorld?.sampleWater(p.x,p.z),body=props.water?.contains?.(p.clone().add(new T.Vector3(0,.6,0)));
        if(body?.submerged||water&&water.surface>p.y+.6)skin=1;if(body?.surfaceY>head.y||water&&water.surface>head.y)hair=1;
        if((weather?.state.rain||0)>.02&&!world.h5OpenWorld?.isSheltered(head)){skin=Math.max(skin,weather.state.rain*.5);hair=Math.max(hair,weather.state.rain*.7);}
        for(const s of showers)if(s.flow>.01){const local=s.root.worldToLocal(p.clone());if(Math.abs(local.x)<.48&&Math.abs(local.z)<.52&&local.y>-.2&&local.y<2){skin=Math.max(skin,s.flow);hair=Math.max(hair,s.flow);}}
        r.wet.skin=T.MathUtils.clamp(r.wet.skin+dt*(skin*1.6-(skin?0:.016)),0,1);r.wet.hair=T.MathUtils.clamp(r.wet.hair+dt*(hair*1.1-(hair?0:.005)),0,1);r.wet.clothes=T.MathUtils.clamp(r.wet.clothes+dt*(skin*.7-(skin?0:.004)),0,1);
        for(const k of ['skin','hair','clothes'])r.uniforms[k].value=r.wet[k];
      }
    },dispose(){for(const [a,r]of records)release(a,r);}
  };
}
