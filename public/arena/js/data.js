// NkWorld.BuildAsync: exact centers, radii and connection topology from Unity.
export const SPHERES=[
 {name:'Studio Hub',c:[0,0,0],r:45,hub:true,color:0xb5bcd9},
 {name:'Knight Sector',c:[0,8,100],r:30,color:0x547de5},
 {name:'Copper Network',c:[82,20,38],r:31.25,color:0xe39e62},
 {name:'Violet Array',c:[-76,-24,48],r:30,color:0xb278db},
 {name:'Deep Relay',c:[48,-28,118],r:27.5,color:0x4ebda8},
 {name:'High Broadcast',c:[-55,42,95],r:28.75,color:0xe077aa},
 {name:'Outer Circuit',c:[98,-12,-40],r:30,color:0x6ea5cb},
 {name:'Back Channel',c:[-18,22,-92],r:27.5,color:0xa6ac5e}
];
export const LINKS=[[0,1,1],[0,2,1],[0,3,1],[0,6,0],[0,7,0],[1,4,0],[1,5,1],[2,4,0],[3,5,0],[6,7,0],[2,6,0]];
export const BRANCHES=[[0,1],[0,2],[1,4],[0,7]];
export const RULES=Object.freeze({tubeRadius:3.4,hearts:20,energy:1000,attack:1.15,powerMin:.2,powerMax:4,ballCharge:7.170193,laserWindup:1.50574,laserFuel:10,laserCooldown:8,laserRange:55.2,pulseCooldown:3.2,pulseRadius:9.05,baseSpeed:12.37005,accelerationTime:2.5,brakingTime:1.5,knightAt:30,camelAt:84,triloAt:116,hornetAt:480,crateSweep:90,riftAt:120,groundY:-83.5});
export const PETS=[['Bitpup',50,14,0xeeb04f],['Sparkat',75,18,0xff7126],['Pterling',90,24,0x70d8ff],['Bunzard',110,30,0xff8ec1],['Shelldon',130,38,0x65be65],['Foxwyrm',155,48,0xff5832],['Sharquit',175,62,0x4e8cda],['Gatormon',200,88,0x44b64c]];
export const DRONES=[['Blue',6.175,0x2879ff],['Green',2.85,0x21e94f],['Red',2.85,0xff392d],['Grey',2.85,0xc7ccd9],['Yellow',2.85,0xffdf30],['Purple',2.85,0xa92dff],['Missile',7.6,0xff8c27]];
export const SHOP=[{name:'Rocket boost · +5% speed',cost:250,type:'boost'},{name:'Seeking missile ×1',cost:9,type:'missile',n:1},{name:'Seeking missile ×5',cost:40,type:'missile',n:5},...PETS.map(([name,power,cost],kind)=>({name:`${name} · ${power} power`,cost,type:'pet',kind}))];
export const MUSIC=['brass-circuit-jig.mp3','brass-engine.mp3','iron-parade-1-.mp3','iron-parade.mp3','past-the-breaking-line.mp3'];
export const STORY=[["comic_abundance.jpg", "The age of abundance", "The Replicators ended scarcity. Anything can be transmuted. The world drowned in glittering junk."], ["comic_orbs.jpg", "Transmute Live", "So we built a gameshow out of the leftovers. TRANSMUTE LIVE. Those linked spheres are last season's megastructures — a livestreamed coliseum."], ["comic_studio.jpg", "Every point is a glyph", "Every point is a GLYPH, the currency of abundance. You are tonight's contestant. Don't hit zero."], ["comic_contestant.jpg", "Are you ready?", "Are you ready?!"], ["tut_fly.jpg", "How to fly", "HOW TO FLY. Left stick strafes. Right stick climbs and turns. Hold A to jet. Tap A on a wall to kick off."], ["tut_fight.jpg", "How to fight", "HOW TO FIGHT. Left trigger shoots plasma. Swing the sword to cut and bounce shots. Hold right trigger to charge the sword laser."], ["tut_tools.jpg", "Your gadgets", "GADGETS. Left grip paints a plasma pad. Hold right grip for a red energy lasso — yank foes, crates and pads, and slam small enemies into walls. Stick-click fires a seeking missile. B force-pulses. Y toggles the HUD."], ["tut_world.jpg", "The coliseum", "THE COLISEUM. Smash crates for power glyphs and missiles. Cyan wells restore hull. Pads are solid ground. Don't hit zero."], ["tut_foes.jpg", "Foes and pets", "FOES AND PETS. Drones, knights, hydras, camels and hornets hunt you. Owl-lemurs crawl the hulls. Break a rare cage and that pet joins as an orbital strike."], ["credit.jpg", "Future Music Collective", "Original game, story and music from the supplied NetKnight project."]];
