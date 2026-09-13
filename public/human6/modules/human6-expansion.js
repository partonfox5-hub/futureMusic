import {installProfiling} from './human6-profiling.js?v=20.2.0';
import {installTracerPool,installWallBatches,installFarDetailCull} from './human6-render-budget.js?v=20.2.0';
import {installMenuLayer} from './human6-xr-layers.js?v=20.2.0';
import {installSettlements} from './human6-settlements.js?v=20.2.0';
import {installFauna} from './human6-fauna.js?v=20.2.0';
import {installHazards} from './human6-hazards.js?v=20.2.0';
import {installPowers} from './human6-powers.js?v=20.2.0';
import {installFactions} from './human6-factions.js?v=20.2.0';
import {installTactics} from './human6-tactics.js?v=20.2.0';
import {installCombatAudio} from './human6-audio.js?v=20.2.0';
import {installMinimap} from './human6-minimap.js?v=20.2.0';
import {installExpansionUI} from './human6-ui.js?v=20.2.0';

export function installHuman6Expansion(ctx){
  const factions=installFactions(ctx),audio=installCombatAudio(ctx),tactics=installTactics({...ctx,factions,audio}),minimap=installMinimap({...ctx,factions}),ui=installExpansionUI({...ctx,factions,tactics,minimap});
  const settlements=installSettlements(ctx),fauna=installFauna({...ctx,audio}),hazards=installHazards({...ctx,audio}),powers=installPowers({...ctx,audio});
  ctx.mira.hands.h6AutoGrip=i=>fauna.gripsHand(i)||minimap.gripsHand(i);
  const layers=installMenuLayer(ctx),tracers=installTracerPool(ctx),wallBatches=installWallBatches(ctx),profiling=installProfiling(ctx),farDetail=installFarDetailCull(ctx);
  const api={farDetail,profiling,layers,tracers,wallBatches,settlements,fauna,hazards,powers,factions,audio,tactics,minimap,ui,tick(dt){wallBatches.tick(dt);settlements.tick(dt);fauna.tick(dt);hazards.tick(dt);powers.tick(dt);factions.tick(dt);tactics.tick(dt);minimap.tick(dt);ui.tick(dt);tracers.tick(dt);profiling.tick(dt);},dispose(){farDetail.dispose();profiling.dispose();wallBatches.dispose();tracers.dispose();layers.dispose();settlements.dispose();powers.dispose();hazards.dispose();fauna.dispose();ui.dispose();minimap.dispose();tactics.dispose();audio.dispose();factions.dispose();}};
  ctx.world.human6=api;return api;
}
