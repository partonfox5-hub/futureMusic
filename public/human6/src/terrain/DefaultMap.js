export const DEFAULT_MAP=Object.freeze({
  id:'mira-highlands-2x',name:'Highland clearing',seed:270919,
  size:624,segments:512,playableExtent:288,pad:16,padBlend:18,
  mountainHeight:42,minHeight:-16,maxHeight:96,biome:'meadow',thermalPasses:3,
  protectPad:true,treeCount:280,treeClearance:26,grassPreset:'quest',
  clearings:[{x:0,z:-42,w:22,d:22},{x:0,z0:-8,z1:-33.4,w:3.8}],
  house:{source:'existing Living room buildHouse(world)',position:[0,0,0],yaw:0},
  brush:{radius:3,rate:2.2,range:40}
});
export function defaultMapOptions(overrides={}){return{...DEFAULT_MAP,...overrides,brush:{...DEFAULT_MAP.brush,...overrides.brush}};}
