import {installVegetation} from './human5-vegetation.js?v=17.8.0';
import {installHairCutting} from './human5-haircuts.js?v=17.8.0';
import {installBirds} from './human5-birds.js?v=17.8.0';
import {installFishing} from './human5-fishing.js?v=17.8.0';
import {installPopulation} from './human5-population.js?v=17.8.0';
import {wrapMethod} from './human5-common.js?v=17.8.0';
export function installEcology(ctx){const {world,mira,props}=ctx;if(world.h5Ecology)return world.h5Ecology;const vegetation=installVegetation(ctx),hair=installHairCutting(ctx),birds=installBirds(ctx),fishing=installFishing(ctx),population=installPopulation(ctx),restores=[];let ui=null;
 const region=world.h5OpenWorld;restores.push(wrapMethod(region,'save',old=>function(){return {...old.call(this),vegetation:vegetation.save()};}));restores.push(wrapMethod(region,'restore',old=>function(data){if(data.vegetation)vegetation.restore(data.vegetation);return old.call(this,data);}));
 const api={vegetation,hair,birds,fishing,population,
  tick(dt){vegetation.tick(dt);hair.tick(dt);birds.tick(dt);fishing.tick(dt);population.tick(dt);if(!ui){const root=document.getElementById('ui');if(root){ui=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Nature · fishing · population';ui.append(summary);for(const [label,fn]of [['EQUIP FISHING ROD',()=>props.equip('fishingRod')],['REGROW SELECTED NPC HAIR',()=>hair.regrow(mira.selected)],['TOGGLE AMBIENT CITY ACTIVITY',()=>population.enabled=!population.enabled]]){const b=document.createElement('button');b.textContent=label;b.onclick=fn;ui.append(b);}const note=document.createElement('p');note.textContent='Fishing: hold trigger, swing, release to cast. Forward on the holding-hand stick reels; desktop holds R. Bait is automatic.';ui.append(note);root.append(ui);}}},
  snapshot(){return {vegetation:vegetation.snapshot(),hair:hair.snapshot(),birds:birds.snapshot(),fishing:fishing.snapshot(),population:population.snapshot()};},
  dispose(){restores.reverse().forEach(f=>f());population.dispose();fishing.dispose();birds.dispose();hair.dispose();vegetation.dispose();ui?.remove();delete world.h5Ecology;}
 };world.h5Ecology=api;return api;
}
