/** Time-based burst with release-to-rearm input. Cooldown starts after the burst. */
export const PLAYER_SPEED_GAIN=1.15;
export const SPRINT_MULTIPLIER=3;
export class SprintBurst {
 constructor(){this.active=0;this.cooldown=0;this.down=false;}
 tick(dt,pressed=false,blocked=false){
  dt=Number.isFinite(dt)?Math.max(0,dt):0;
  if(this.active>0){const spent=Math.min(dt,this.active);this.active=Math.max(0,this.active-spent);dt-=spent;if(this.active<1e-8){this.active=0;this.cooldown=10;}}
  if(this.active===0)this.cooldown=Math.max(0,this.cooldown-dt);
  const edge=pressed&&!this.down;this.down=pressed;
  if(blocked&&this.active>0){this.active=0;this.cooldown=10;}
  if(edge&&!blocked&&this.active===0&&this.cooldown===0)this.active=10;
  return !blocked&&this.active>0?SPRINT_MULTIPLIER:1;
 }
 snapshot(){return {activeSeconds:this.active,cooldownSeconds:this.cooldown,multiplier:this.active>0?SPRINT_MULTIPLIER:1};}
}
