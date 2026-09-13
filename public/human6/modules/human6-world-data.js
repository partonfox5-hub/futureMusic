export const SETTLEMENTS=Object.freeze([
  {id:'timberfall',name:'Timberfall',kind:'town',style:'timber',x:-560,z:-80,count:12,color:0xd5c5a3,roof:0x55392b},
  {id:'redmesa',name:'Red Mesa',kind:'town',style:'adobe',x:520,z:270,count:10,color:0xb87850,roof:0x935135},
  {id:'frostbridge',name:'Frostbridge',kind:'town',style:'nordic',x:-610,z:-780,count:14,color:0x766754,roof:0x34454c},
  {id:'reedwater',name:'Reedwater',kind:'town',style:'thatch',x:-410,z:670,count:10,color:0x967450,roof:0xb19a55},
  {id:'civic-city',name:'Civic City',kind:'city',style:'modern brick',x:204,z:40,count:12,existing:true,color:0x928b7f,roof:0x536374},
  {id:'sunspire',name:'Sunspire',kind:'city',style:'mediterranean',x:1190,z:490,count:16,color:0xe0ccb0,roof:0xba653f}
]);
export const WORLD_PLACES=Object.freeze([
  ...SETTLEMENTS,
  {id:'echo-cave',name:'Echo Cave',kind:'cave',x:-740,z:-450},
  {id:'ember-cave',name:'Ember Cave',kind:'cave',x:760,z:-780},
  {id:'mosslight-cave',name:'Mosslight Cave',kind:'cave',x:-760,z:450},
  {id:'ancient-grove',name:'Ancient Grove',kind:'grove',x:-180,z:-210},
  {id:'silver-grove',name:'Silver Grove',kind:'grove',x:-920,z:40},
  {id:'blossom-grove',name:'Blossom Grove',kind:'grove',x:440,z:650},
  {id:'dawn-temple',name:'Temple of Dawn',kind:'temple',x:100,z:-820},
  {id:'eastwatch',name:'Eastwatch Fort',kind:'fort',style:'palisade',x:410,z:-460},
  {id:'lakewatch',name:'Lakewatch Fort',kind:'fort',style:'stone',x:-850,z:750},
  {id:'high-crown',name:'High Crown Fortress',kind:'fortress',x:1180,z:-260}
]);
// Five footprints, assembled from adjoining rooms. Interiors and door gaps are
// built only nearby; far silhouettes use the same footprint and height.
export const FLOOR_PLANS=Object.freeze([
  {id:'cottage',name:'Two-room cottage',rooms:[[-2,0,4,7],[2,0,4,7]]},
  {id:'longhouse',name:'Longhouse',rooms:[[0,-4,7,4],[0,0,7,4],[0,4,7,4]]},
  {id:'lodge',name:'L-shaped lodge',rooms:[[-2,-2,5,5],[3,-2,5,5],[-2,3,5,5]]},
  {id:'crosshall',name:'Cross hall',rooms:[[0,0,5,5],[-5,0,5,5],[5,0,5,5],[0,-5,5,5]]},
  {id:'courtyard',name:'Courtyard home',rooms:[[-4,0,4,12],[4,0,4,12],[0,-4,4,4]]}
]);
export const REGION_ROUTES=Object.freeze([
  {id:'timber-road',name:'Timber Road',kind:'road',width:5,points:[[0,52],[-130,-45],[-330,-70],[-560,-80],[-730,-30],[-920,40]]},
  {id:'north-road',name:'Northern Road',kind:'trail',width:3.6,points:[[-560,-80],[-690,-250],[-740,-450],[-650,-610],[-610,-780],[-320,-810],[100,-820],[400,-790],[760,-780]]},
  {id:'reed-road',name:'Reed Road',kind:'road',width:5,points:[[-220,164],[-240,370],[-410,670],[-600,730],[-850,750],[-850,550],[-760,450]]},
  {id:'east-road',name:'Eastern Road',kind:'road',width:6,points:[[355,111],[520,270],[720,420],[950,510],[1190,490],[1350,300],[1270,10],[1180,-260],[925,-350],[561,-250],[410,-460]]},
  {id:'grove-road',name:'Grove Trail',kind:'trail',width:3,points:[[520,270],[460,440],[440,650],[200,690],[-90,670],[-410,670]]},
  {id:'ancient-path',name:'Ancient Path',kind:'trail',width:3,points:[[-130,-45],[-180,-210],[-360,-260],[-560,-80]]}
]);
export function settlementBuildings(){const out=[];for(const town of SETTLEMENTS){if(town.existing)continue;for(let i=0;i<town.count;i++){const side=i%2?-1:1,row=Math.floor(i/2),cols=Math.ceil(town.count/2),x=town.x+(row-(cols-1)/2)*22,z=town.z+side*24;out.push({id:town.id+'/'+i,town,x,z,yaw:side>0?0:Math.PI,plan:FLOOR_PLANS[i%5],height:town.kind==='city'?4.1:3.0});}}return out;}
