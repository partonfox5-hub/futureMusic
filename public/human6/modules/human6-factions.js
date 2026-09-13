import * as T from 'three';
import {WORLD_PLACES} from './human6-world-data.js?v=20.2.0';
import {wrapMethod} from './human5-common.js?v=20.2.0';

const COLORS=['#4cb8ff','#a4b4a7','#ed665f','#ac8bff','#f4c052','#47cf9c','#ef85cb','#db9248'];
export class FactionState {
  constructor(){
    this.groups=new Map();this.relations=new Map();this.serial=0;this.playerGroup='g1';this.selected='g1';
    for(const name of ['Your group','Civilians','Raiders','Wardens'])this.create(name);
    this.setRelation('g1','g3','war');this.setRelation('g3','g4','war');
    this.territories=[['Home',0,2,28],['Forest',-140,-115,50],['City',160,72,48],['Lake',-239,241,65],['Mountains',-541,-450,65],['Volcano',665,-565,75]].map(([name,x,z,radius],i)=>({id:'t'+i,name,x,z,radius,owner:null,claimant:null,progress:0,contested:false}));
    this.territories.push(...WORLD_PLACES.filter(p=>!p.existing).map(p=>({id:p.id,name:p.name,x:p.x,z:p.z,radius:p.kind==='city'?135:p.kind==='town'?105:40,owner:null,claimant:null,progress:0,contested:false})));
  }
  create(name){name=String(name||'Group '+(this.serial+1)).trim().slice(0,40);if(!name||this.groups.size>=12)return null;const id='g'+(++this.serial);this.groups.set(id,{id,name,color:COLORS[(this.serial-1)%COLORS.length],order:'stay'});return id;}
  key(a,b){return a<b?a+'/'+b:b+'/'+a;}
  atWar(a,b){return !!a&&!!b&&a!==b&&this.relations.get(this.key(a,b))==='war';}
  setRelation(a,b,value){if(!this.groups.has(a)||!this.groups.has(b)||a===b||!['peace','war'].includes(value))return false;this.relations.set(this.key(a,b),value);return true;}
  capture(dt,occupants){
    for(const t of this.territories){
      const present=new Map();for(const p of occupants){if(!this.groups.has(p.group)||Math.hypot(p.x-t.x,p.z-t.z)>t.radius)continue;present.set(p.group,(present.get(p.group)||0)+1);}
      t.contested=false;for(const a of present.keys())for(const b of present.keys())if(this.atWar(a,b))t.contested=true;
      const eligible=[...present.keys()].filter(g=>g!==t.owner&&(!t.owner||this.atWar(g,t.owner)));
      // Peaceful visitors cannot take allied territory. Multiple claimants wait.
      if(t.contested||eligible.length!==1){if(!t.contested&&eligible.length===0)t.progress=Math.max(0,t.progress-dt*.02);continue;}
      const g=eligible[0];if(t.claimant!==g){t.claimant=g;t.progress=0;}
      t.progress=Math.min(1,t.progress+dt/25*Math.min(2,1+(present.get(g)-1)*.25));
      if(t.progress>=1){t.owner=g;t.claimant=null;t.progress=0;}
    }
  }
  save(){return {groups:[...this.groups.values()].map(g=>({...g})),relations:[...this.relations],territories:this.territories.map(t=>({...t})),serial:this.serial,playerGroup:this.playerGroup,selected:this.selected};}
  restore(d){
    if(!d||!Array.isArray(d.groups)||!d.groups.length||d.groups.length>12||!Array.isArray(d.relations)||d.relations.length>66||!Array.isArray(d.territories)||d.territories.length>40)throw Error('Invalid group save');
    const groups=new Map();for(const g of d.groups){if(!/^g\d{1,6}$/.test(g.id)||groups.has(g.id)||typeof g.name!=='string'||g.name.length>40||!/^#[0-9a-f]{6}$/i.test(g.color))throw Error('Invalid group');groups.set(g.id,{id:g.id,name:g.name,color:g.color,order:['follow','stay','guard','patrol','capture'].includes(g.order)?g.order:'stay'});}
    const relations=new Map();for(const pair of d.relations){if(!Array.isArray(pair)||pair.length!==2)throw Error('Invalid diplomacy');const [a,b]=String(pair[0]).split('/');if(!groups.has(a)||!groups.has(b)||a===b||!['war','peace'].includes(pair[1]))throw Error('Invalid diplomacy');relations.set(this.key(a,b),pair[1]);}
    const known=new Map(this.territories.map(t=>[t.id,t]));for(const v of d.territories)if(!known.has(v.id)||v.owner&&!groups.has(v.owner))throw Error('Invalid territory');const saved=new Map(d.territories.map(t=>[t.id,t]));const territories=this.territories.map(t=>({...t,owner:saved.get(t.id)?.owner||null,claimant:null,progress:0,contested:false}));
    if(!groups.has(d.playerGroup))throw Error('Invalid player group');this.groups=groups;this.relations=relations;this.territories=territories;this.serial=Math.max(...[...groups.keys()].map(k=>Number(k.slice(1))));this.playerGroup=d.playerGroup;this.selected=groups.has(d.selected)?d.selected:d.playerGroup;
  }
}

export function installFactions({world,mira,props,camera,gameplay}){
  const state=new FactionState(),npcs=gameplay.npcs,eye=new T.Vector3(),goal=new T.Vector3();let acc=0,revision=world.revision;
  function groupOf(a){if(a==='player')return state.playerGroup;if(a?.h6Faction&&state.groups.has(a.h6Faction))return a.h6Faction;const b=a?.h5Brain;return b?.follower?state.playerGroup:b?.hostile?'g3':'g2';}
  function assign(a,id){if(!a||!state.groups.has(id))return false;const b=npcs.attach(a);a.h6Faction=id;b.hostile=state.atWar(id,state.playerGroup);b.target=null;b.lookPoint=null;b.lastGoal=null;npcs.stop(a);b.mode=b.role==='pedestrian'?'passive':'still';return true;}
  function order(id,command,territory){const g=state.groups.get(id);if(!g||!['follow','stay','guard','patrol','capture'].includes(command))return false;g.order=command;
    for(const a of mira.actors)if(groupOf(a)===id){npcs.command(a,command==='capture'?'guard':command);const b=a.h5Brain;b.h6GroupOrder=true;if(command==='capture'){const t=state.territories.find(t=>t.id===territory);if(t){b.order='go here';b.home.set(t.x,0,t.z);goal.set(t.x,0,t.z);npcs.setGoal(a,goal);}}}props.status=g.name+': '+command;return true;}
  const api={state,groupOf,assign,order,enemy:(a,b)=>state.atWar(groupOf(a),groupOf(b)),
    tick(dt){if(world.revision!==revision){revision=world.revision;acc=0;}if(!world.h5OpenWorld?.active)return;acc+=dt;if(acc<.25)return;camera.getWorldPosition(eye);const occupants=[];if(gameplay.combat.player.health>0)occupants.push({x:eye.x,z:eye.z,group:state.playerGroup});for(const a of mira.actors)if(!a.dead&&!a.held&&a.group.visible)occupants.push({x:a.group.position.x,z:a.group.position.z,group:groupOf(a)});state.capture(acc,occupants);acc=0;},
    save(){return {...state.save(),roster:mira.actors.filter(a=>a.h6Faction).map(a=>({name:a.displayName,group:a.h6Faction}))};},
    restore(d){state.restore(d);for(const r of d.roster||[]){const a=mira.actors.find(a=>a.displayName===r.name);if(a)assign(a,r.group);}},dispose(){undoSave();undoRestore();delete world.h6Factions;}
  };
  const region=world.h5OpenWorld,undoSave=wrapMethod(region,'save',old=>function(){return {...old.call(this),factions:api.save()};}),undoRestore=wrapMethod(region,'restore',old=>function(d){if(d.factions){const check=new FactionState();check.restore(d.factions);}const r=old.call(this,d);if(d.factions)api.restore(d.factions);return r;});
  world.h6Factions=api;return api;
}
