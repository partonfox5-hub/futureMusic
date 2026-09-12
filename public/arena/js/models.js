import {T,V} from './math.js?v=5.0.0';
import {PETS,DRONES} from './data.js?v=5.0.0';
import {canvas,texture} from './textures.js?v=5.0.0';
const matCache=new Map();
export function material(color,metalness=.5,roughness=.36,glow=0){const key=[color,metalness,roughness,glow].join();if(!matCache.has(key))matCache.set(key,new T.MeshStandardMaterial({color,metalness,roughness,emissive:glow?color:0,emissiveIntensity:glow}));return matCache.get(key);}
export const M={steel:material(0x8b9cad,.82,.28),dark:material(0x17202c,.68,.36),black:material(0x080e18,.3,.55),brass:material(0xd6a65c,.78,.25),teal:material(0x60f3df,.35,.24,1.5),red:material(0xff454f,.25,.3,1.3),white:material(0xecf7ff,.5,.26),bone:material(0xe8deb7,.12,.36),plasma:material(0xbf7aff,.3,.18,2.2)};
export const G={box:new T.BoxGeometry(1,1,1),sphere:new T.SphereGeometry(1,16,10),ico:new T.IcosahedronGeometry(1,1),cyl:new T.CylinderGeometry(1,1,1,16),cone:new T.ConeGeometry(1,1,12),torus:new T.TorusGeometry(1,.065,6,32),oct:new T.OctahedronGeometry(1,0)};
export function part(root,geo,mat,p=[0,0,0],scale=[1,1,1],rot=null){const m=new T.Mesh(typeof geo==='string'?G[geo]:geo,mat);m.position.fromArray(p);m.scale.fromArray(scale);if(rot)m.rotation.set(...rot);root.add(m);return m;}
function group(root,name,p=[0,0,0]){const g=new T.Group();g.name=name;g.position.fromArray(p);root.add(g);return g;}
export function mergeParts(root){const buckets=new Map();root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh)return;const b=buckets.get(o.material)||[];if(!b.length)buckets.set(o.material,b);b.push((o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld));});return [...buckets].map(([material,geos])=>{const geometry=new T.BufferGeometry();for(const name of ['position','normal','uv']){const arrays=geos.map(g=>g.getAttribute(name)?.array||new Float32Array(g.attributes.position.count*(name==='uv'?2:3))),data=new Float32Array(arrays.reduce((a,b)=>a+b.length,0));let at=0;for(const a of arrays){data.set(a,at);at+=a.length;}geometry.setAttribute(name,new T.BufferAttribute(data,name==='uv'?2:3));}for(const g of geos)g.dispose();geometry.computeBoundingSphere();return {geometry,material};});}
function muzzle(root,p,color=M.teal,size=1){const g=group(root,'muzzle',p);part(g,'cyl',M.dark,[0,0,0],[.1*size,.24*size,.1*size],[Math.PI/2,0,0]);part(g,'torus',color,[0,0,.13*size],[.1*size,.1*size,.1*size]);return g;}
export function weaponModel(kind,runeColor=0xff283b){const g=new T.Group();if(kind==='cannon'){
 part(g,'box',M.dark,[0,-.065,.10],[.15,.17,.32]);part(g,'box',M.steel,[0,.018,.10],[.19,.12,.34]);part(g,'cyl',M.steel,[0,.018,.28],[.074,.3,.074],[Math.PI/2,0,0]);part(g,'torus',M.brass,[0,.018,.43],[.082,.082,.082]);
 for(const x of [-1,1]){part(g,'box',M.brass,[x*.106,.018,.21],[.03,.065,.27]);part(g,'box',M.teal,[x*.109,.018,.22],[.016,.028,.17]);}
 for(let i=0;i<5;i++)part(g,'torus',M.dark,[0,.018,.17+i*.044],[.081,.081,.081]);part(g,'cyl',M.teal,[0,.018,.431],[.06,.009,.06],[Math.PI/2,0,0]);part(g,'box',M.dark,[0,-.17,.02],[.105,.21,.12],[.22,0,0]);part(g,'box',M.brass,[0,.098,.065],[.055,.036,.15]);
 }else{
 const obsidian=material(0x09080f,.91,.18),silver=material(0xbfc7d2,.92,.23),rune=material(runeColor,.3,.2,2.1);
 part(g,'box',obsidian,[0,-.02,.07],[.13,.11,.26]);part(g,'box',silver,[0,-.055,.035],[.14,.025,.2]);
 part(g,'cyl',M.black,[0,0,-.055],[.039,.2,.039],[Math.PI/2,0,0]);
 for(let i=0;i<5;i++)part(g,'torus',silver,[0,0,-.13+i*.035],[.041,.041,.041]);
 part(g,'ico',silver,[0,0,-.165],[.055,.05,.06]);part(g,'oct',rune,[0,0,-.177],[.026,.027,.035]);
 part(g,'box',silver,[0,0,.2],[.28,.045,.085]);for(const x of [-1,1])part(g,'box',obsidian,[x*.132,-.007,.245],[.055,.075,.16],[0,x*.32,0]);
 const blade=(width,tip)=>{const sh=new T.Shape();sh.moveTo(-width,.25);sh.lineTo(-width*.87,1.31);sh.lineTo(0,tip);sh.lineTo(width*.87,1.31);sh.lineTo(width,.25);sh.closePath();const geo=new T.ExtrudeGeometry(sh,{depth:.025,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.006,bevelThickness:.005});geo.rotateX(Math.PI/2);return geo;};
 part(g,blade(.07,1.63),silver,[0,.012,0]);part(g,blade(.052,1.59),obsidian,[0,.023,0],[1,1.5,1]);
 // Deep central fuller with individually drawn luminous angular inscriptions.
 for(const face of [-1,1]){
  part(g,'box',M.black,[0,face*.038,.84],[.034,.004,1.12]);
  for(let i=0;i<7;i++){const z=.43+i*.129,y=face*.043;
   part(g,'box',rune,[0,y,z],[.004,.004,.065]);
   part(g,'box',rune,[.011,y,z+.014],[.004,.004,.032],[0,-.65,0]);
   part(g,'box',rune,[-.011,y,z-.013],[.004,.004,.032],[0,-.65,0]);
   if(i%2===0)part(g,'box',rune,[.011,y,z-.022],[.004,.004,.032],[0,.65,0]);
  }
 }
 part(g,'ico',obsidian,[0,0,.255],[.10,.06,.115]);part(g,'oct',rune,[0,.056,.28],[.027,.009,.055]);
 }return g;}

function drone(kind){const g=new T.Group(),tint=material(DRONES[kind][2],.56,.29),glow=material(DRONES[kind][2],.15,.23,1.8);
 const profile=[[.02,-.2],[.25,-.22],[.58,-.08],[.66,.02],[.55,.1],[.25,.17],[.02,.18]].map(([x,y])=>new T.Vector2(x,y));part(g,new T.LatheGeometry(profile,20),tint);part(g,'sphere',M.dark,[0,.11,0],[.29,.24,.29]);part(g,'torus',M.steel,[0,-.015,0],[.57,.57,.57],[Math.PI/2,0,0]);part(g,'sphere',glow,[0,.1,.25],[.22,.075,.05]);
 for(let i=0;i<4;i++){const a=i*Math.PI/2;part(g,'box',M.steel,[Math.sin(a)*.51,-.03,Math.cos(a)*.51],[.17,.11,.38],[0,a,0]);part(g,'sphere',glow,[Math.sin(a)*.59,-.10,Math.cos(a)*.59],[.055,.045,.055]);}if(kind===6)for(const x of [-.4,.4])muzzle(g,[x,-.18,.25],M.red,.9);if(kind===4)part(g,'torus',material(0xffd53a,.3,.3,1),[0,.12,0],[.73,.73,.73],[Math.PI/2,0,0]);return g;}
function knight(white){
 const g=new T.Group(),armor=white?material(0xdbe3ec,.8,.25):material(0x24232e,.86,.28),edge=white?M.brass:material(0x646774,.9,.27),purple=material(white?0xd7a1ff:0x9e47ff,.4,.23,1.8),rubber=material(0x05060a,.18,.71);
 part(g,'box',rubber,[0,.18,0],[.69,1.04,.42]);part(g,'ico',armor,[0,.33,.05],[.58,.64,.37]);
 for(const side of [-1,1]){part(g,'box',armor,[side*.27,.5,.29],[.45,.30,.17],[0,side*-.18,side*.2]);part(g,'box',edge,[side*.25,.3,.38],[.32,.025,.035],[0,0,side*.42]);
  for(let i=0;i<3;i++)part(g,'box',armor,[side*.21,.1-i*.16,.28],[.33,.14,.10],[0,side*.16,0]);
  const back=group(g,'thruster'+side,[side*.34,.38,-.41]);part(back,'cyl',edge,[0,0,0],[.15,.67,.15]);part(back,'cyl',armor,[0,.08,0],[.17,.48,.17]);part(back,'torus',purple,[0,-.34,0],[.12,.12,.12],[Math.PI/2,0,0]);
 }
 part(g,'torus',edge,[0,.35,.405],[.14,.14,.14]);part(g,'oct',purple,[0,.35,.41],[.10,.13,.07]);
 part(g,'ico',armor,[0,-.45,0],[.4,.3,.31]);part(g,'box',edge,[0,-.37,.3],[.65,.075,.045]);
 const head=group(g,'head',[0,.98,0]);part(head,'ico',armor,[0,.03,0],[.3,.36,.26]);part(head,'box',rubber,[0,.035,.24],[.44,.12,.04]);part(head,'box',purple,[0,.06,.263],[.35,.034,.015]);
 part(head,'cone',armor,[0,-.14,.275],[.135,.30,.11],[Math.PI,0,0]);part(head,'box',edge,[0,.18,.25],[.048,.31,.06]);
 for(const side of [-1,1]){part(head,'cone',armor,[side*.28,.34,-.06],[.10,.55,.10],[0,0,side*-.32]);part(head,'cone',edge,[side*.35,.51,-.06],[.028,.18,.028],[0,0,side*-.32]);}
 for(const side of [-1,1]){
  const leg=group(g,'leg'+side,[side*.25,-.58,0]);part(leg,'cyl',rubber,[0,-.23,0],[.14,.48,.14]);part(leg,'ico',armor,[0,-.18,.045],[.235,.33,.27]);part(leg,'sphere',edge,[0,-.48,0],[.155,.155,.155]);part(leg,'ico',armor,[0,-.50,.17],[.21,.22,.16]);part(leg,'box',armor,[0,-.76,.01],[.30,.39,.34]);part(leg,'box',edge,[0,-.77,.19],[.065,.29,.025]);for(const side of [-1,1])part(leg,'cyl',edge,[side*.13,-.73,-.11],[.025,.38,.025]);part(leg,'box',armor,[0,-.98,.13],[.35,.17,.55]);
  const arm=group(g,'arm'+side,[side*.66,.56,0]);part(arm,'sphere',rubber,[0,-.03,0],[.22,.23,.21]);part(arm,'ico',armor,[side*.02,.06,0],[.40,.30,.36]);part(arm,'box',edge,[side*.19,.12,.26],[.25,.034,.06],[0,0,side*-.2]);
  for(let j=0;j<2;j++)part(arm,'cone',armor,[side*(.09+j*.15),.35,-.08],[.06,.35+j*.1,.06],[0,0,-side*.24]);
  part(arm,'cyl',edge,[0,-.33,0],[.11,.40,.11]);part(arm,'box',armor,[side*.08,-.31,.11],[.25,.29,.21]);part(arm,'cyl',edge,[side*.16,-.34,-.1],[.03,.36,.03]);part(arm,'sphere',rubber,[0,-.54,.01],[.15,.15,.15]);
  const fore=group(arm,'fore',[0,-.62,.06]);part(fore,'ico',armor,[0,0,.10],[.24,.23,.34]);part(fore,'box',edge,[side*.2,0,.12],[.04,.2,.35]);
  if(side===1){const blade=group(fore,'blade',[0,-.13,.30]);blade.add(weaponModel('sword',0xaf4fff));}
  else{const shield=group(fore,'shield',[0,0,.35]);part(shield,'ico',armor,[0,0,0],[.40,.55,.13]);part(shield,'box',purple,[0,0,.13],[.032,.69,.016]);part(shield,'box',edge,[0,0,.15],[.59,.031,.021]);}
 }
 if(white)for(const side of [-1,1]){const arm=group(g,'extra'+side,[side*.6,.04,-.15]);part(arm,'box',armor,[side*.28,0,0],[.55,.16,.22]);muzzle(arm,[side*.5,0,.16],purple,1.4);}
 const cape=group(g,'cape',[0,.58,-.48]);for(let i=-2;i<=2;i++)part(cape,'box',armor,[i*.20,-.75,-.17-Math.abs(i)*.035],[.185,1.5-Math.abs(i)*.14,.045],[-.16,0,i*.04]);return g;
}
// Broad reptilian skull, swept horns and a separately hinged, tooth-lined jaw.
export function hydraModel(){const g=new T.Group(),skin=material(0x4c8f88,.18,.43),ridge=material(0x284950,.34,.4),mouth=material(0x150d24,.05,.75),gum=material(0x8c365b,.05,.55);
 part(g,'sphere',skin,[0,.12,.08],[.42,.3,.53]);part(g,'ico',ridge,[0,.22,-.16],[.34,.28,.35]);
 part(g,'sphere',skin,[0,.07,.55],[.33,.18,.45]);part(g,'sphere',ridge,[0,.14,.78],[.26,.065,.14]);part(g,'sphere',mouth,[0,-.06,.53],[.30,.09,.43]);
 for(const side of [-1,1]){part(g,'ico',ridge,[side*.35,.04,.16],[.15,.2,.33],[0,side*.2,side*-.12]);part(g,'sphere',material(0xe4b949,.25,.32,.35),[side*.32,.23,.37],[.10,.078,.13]);part(g,'sphere',M.black,[side*.39,.24,.405],[.018,.068,.024]);part(g,'sphere',ridge,[side*.31,.31,.33],[.15,.060,.20],[0,side*-.23,side*.16]);
  part(g,'cone',M.bone,[side*.31,.5,-.25],[.10,.57,.1],[-.52,0,side*-.34]);part(g,'cone',ridge,[side*.4,.18,-.46],[.07,.28,.07],[-.9,0,side*-.7]);part(g,'sphere',M.black,[side*.17,.19,.85],[.055,.025,.045]);
  for(let i=0;i<5;i++)part(g,'cone',M.bone,[side*(.22-.016*i),-.13,.23+i*.136],[.035,i===1?.20:.12,.038],[Math.PI,0,0]);}
 for(let i=0;i<4;i++)part(g,'cone',ridge,[0,.35-i*.02,-.46+i*.18],[.08,.22-i*.025,.085],[-.25,0,0]);
 const jaw=group(g,'jaw',[0,-.16,-.06]);part(jaw,'sphere',skin,[0,-.07,.52],[.30,.105,.48]);part(jaw,'sphere',mouth,[0,.017,.56],[.26,.035,.36]);part(jaw,'sphere',gum,[0,.045,.55],[.105,.04,.28]);
 for(const side of [-1,1])for(let i=0;i<5;i++)part(jaw,'cone',M.bone,[side*(.225-i*.015),.105,.26+i*.13],[.031,i===0?.17:.11,.032]);part(jaw,'ico',ridge,[0,-.14,.37],[.2,.10,.29]);
 return g;}
function camel(){const g=new T.Group();part(g,'sphere',M.brass,[0,0,0],[.85,.53,1.1]);part(g,'ico',M.steel,[0,.5,-.15],[.52,.58,.55]);for(const x of [-.72,.72]){muzzle(g,[x,-.15,-.4],M.teal,2);part(g,'box',M.dark,[x,0,0],[.2,.5,.85]);}
 const head=group(g,'head',[0,.7,.8]);for(let i=0;i<7;i++)part(head,'sphere',M.dark,[Math.sin(i*.25)*.16,i*.14,i*.13],[.2,.18,.2]);part(head,'box',M.brass,[.1,.93,.86],[.72,.42,.6]);part(head,'box',M.black,[.1,.98,1.17],[.62,.2,.035]);part(head,'box',M.red,[.1,.98,1.20],[.54,.09,.03]);return g;}
function trilo(){const g=new T.Group();for(let i=0;i<7;i++){const rib=group(g,'rib'+i,[0,.1-i*.07,-.6+i*.22]);part(rib,'sphere',i%2?M.steel:M.dark,[0,0,0],[.58-Math.abs(i-3)*.045,.26,.20]);for(const x of [-1,1]){const leg=group(rib,'leg'+x,[x*.5,-.08,0]);part(leg,'box',M.brass,[x*.2,-.08,0],[.48,.11,.13],[0,0,-x*.5]);part(leg,'box',M.dark,[x*.43,-.3,.1],[.1,.4,.13],[.3,0,x*.1]);}}
 const head=group(g,'head',[0,.18,.89]);part(head,'ico',M.steel,[0,0,0],[.4,.3,.4]);for(const x of [-.22,.22])part(head,'sphere',M.red,[x,.1,.32],[.07,.065,.05]);for(const s of [-1,1]){const arm=group(g,'arm'+s,[s*.65,.18,.5]);part(arm,'box',M.steel,[s*.15,0,.3],[.15,.15,.7],[0,s*.2,0]);part(arm,'cone',M.teal,[s*.2,-.1,.86],[.10,.6,.08],[Math.PI/2,0,s*.5]);}return g;}
function lemur(){const g=new T.Group();part(g,'sphere',M.dark,[0,0,0],[.35,.25,.5]);for(const s of [-1,1])for(const z of [-.3,.3]){const leg=group(g,'leg'+s+z,[s*.28,-.04,z]);part(leg,'box',M.steel,[s*.22,-.1,.08],[.5,.1,.13],[0,0,-s*.4]);part(leg,'box',M.brass,[s*.44,-.24,.12],[.11,.26,.17]);}const head=group(g,'head',[0,.32,.26]);part(head,'sphere',M.brass,[0,0,0],[.4,.34,.3]);for(const x of [-.18,.18]){part(head,'torus',M.dark,[x,.04,.27],[.14,.14,.14]);part(head,'sphere',M.teal,[x,.04,.285],[.08,.09,.032]);part(head,'cone',M.dark,[x*1.7,.3,-.04],[.09,.3,.07]);}part(head,'cone',M.steel,[0,-.12,.3],[.06,.15,.07],[Math.PI/2,0,0]);return g;}
function hornet(){const g=new T.Group();part(g,'sphere',M.dark,[0,0,0],[.48,.48,1.1]);part(g,'ico',M.brass,[0,.1,.8],[.51,.4,.53]);for(let i=0;i<3;i++)part(g,'torus',M.brass,[0,0,-.3-i*.27],[.44-i*.04,.44-i*.04,.44-i*.04]);for(const side of [-1,1]){for(let i=0;i<3;i++){const leg=group(g,'leg'+side+i,[side*.4,-.2,.5-i*.5]);part(leg,'box',M.steel,[side*.25,-.17,0],[.62,.08,.10],[0,0,-side*.6]);part(leg,'box',M.brass,[side*.51,-.51,.09],[.07,.58,.08],[.3,0,side*.25]);}
 const rotor=group(g,'rotor'+side,[side*1.2,.48,-.15]);part(g,'box',M.steel,[side*.8,.25,-.15],[1.4,.12,.18]);part(rotor,'cyl',M.dark,[0,0,0],[.15,.25,.15]);part(rotor,'box',M.steel,[0,.13,0],[1.9,.025,.16]);part(rotor,'box',M.steel,[0,.13,0],[.16,.025,1.9]);muzzle(g,[side*.42,-.1,.89],M.red,1.3);}part(g,'sphere',M.red,[0,.16,1.2],[.27,.08,.055]);return g;}
function pet(kind){const g=new T.Group(),skin=material(PETS[kind][3],.22,.4),dark=M.dark;part(g,'sphere',skin,[0,0,0],[.25,.22,.34]);const head=group(g,'head',[0,.2,.27]);part(head,'sphere',skin,[0,0,.03],[.25,.23,.27]);for(const x of [-.11,.11]){part(head,'sphere',M.white,[x,.05,.245],[.075,.09,.04]);part(head,'sphere',dark,[x,.05,.28],[.031,.047,.023]);}
 if([0,1,3,5].includes(kind))for(const side of [-1,1])part(head,'cone',skin,[side*.16,kind===3?.36:.26,0],[.09,kind===3?.5:.25,.08],[0,0,side*-.2]);
 if([2,5].includes(kind))for(const side of [-1,1]){const wing=group(g,'wing'+side,[side*.22,.07,0]);part(wing,'cone',skin,[side*.24,0,-.04],[.26,.57,.07],[0,0,side*-Math.PI/2]);}
 if(kind===4)part(g,'ico',material(0x37633b,.3,.4),[0,.13,-.04],[.35,.27,.41]);if(kind===6){part(g,'cone',skin,[0,.33,-.05],[.14,.32,.09]);part(head,'cone',M.white,[0,-.09,.31],[.10,.17,.1],[Math.PI/2,0,0]);}if(kind===7)part(head,'sphere',skin,[0,-.045,.30],[.22,.11,.25]);
 for(const s of [-1,1])for(const z of [-.18,.18])part(g,'sphere',skin,[s*.18,-.19,z],[.09,.11,.12]);part(g,'cone',skin,[0,-.015,-.47],[.10,.45,.10],[-Math.PI/2,0,0]);return g;}
function prop(type,kind,meta={}){const g=new T.Group();if(type==='crate'||type==='cage'||type==='kennel'){
 const size=type==='kennel'?[2.8,2.6,3]:type==='cage'?[1.45,1.45,1.45]:[1.1,1.1,1.1];if(type!=='cage')part(g,'box',type==='kennel'?M.dark:material(0x856646,.15,.67),[0,0,0],size);else {const captive=pet(kind);captive.position.y=-.12;captive.scale.setScalar(.85);g.add(captive);}
 for(const x of [-1,1])for(const z of [-1,1])part(g,'box',M.steel,[x*size[0]/2,0,z*size[2]/2],[.085,size[1]+.05,.085]);for(const y of [-1,1])for(const z of [-1,1])part(g,'box',M.brass,[0,y*size[1]/2,z*size[2]/2],[size[0]+.12,.10,.10]);for(const y of [-1,1])for(const x of [-1,1])part(g,'box',M.steel,[x*size[0]/2,y*size[1]/2,0],[.10,.10,size[2]+.1]);
 if(type!=='crate')for(let i=-2;i<=2;i++)part(g,'box',M.steel,[i*size[0]/5,0,size[2]/2+.02],[.035,size[1],.035]);else for(const z of [-.56,.56])part(g,'box',M.brass,[0,0,z],[1.45,.07,.025],[0,0,.77]);
 }else if(type==='barrel'){part(g,'cyl',material(0x364955,.65,.36),[0,0,0],[.49,1.3,.49]);for(const y of [-.57,0,.57])part(g,'torus',M.brass,[0,y,0],[.51,.51,.51],[Math.PI/2,0,0]);part(g,'box',M.red,[0,.1,.49],[.28,.3,.02]);}
 else if(type==='pad'||type==='island'){part(g,'cyl',type==='pad'?M.steel:material(0x282231,.2,.8),[0,0,0],[type==='pad'?1.7:1,.14,type==='pad'?1.7:1]);part(g,'torus',type==='pad'?M.teal:M.brass,[0,.08,0],[type==='pad'?1.67:1,type==='pad'?1.67:1,type==='pad'?1.67:1],[Math.PI/2,0,0]);}
 else if(type==='window'){part(g,'box',M.dark,[0,0,0],[2.6,1.6,.16]);for(const x of [-1,1])part(g,'box',M.brass,[x*1.3,0,.05],[.08,1.65,.16]);}
 else if(type==='blimp'){part(g,'sphere',M.brass,[0,0,0],[1.3,.85,2.4]);part(g,'box',M.dark,[0,-.8,.15],[.8,.4,1.4]);for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2])part(g,'box',M.teal,[Math.sin(a)*.75,Math.cos(a)*.65,-1.85],[.06,.8,.8],[0,0,-a]);for(const z of [-1.4,0,1.4])part(g,'torus',M.dark,[0,0,z],[1.08,.78,1]);}
 else if(type==='marquee'){const radius=meta.radius||25,pieces=meta.pieces||6,half=Math.PI/pieces,height=meta.height||3,n=12,positions=[],uv=[],indices=[];for(let i=0;i<=n;i++){const angle=-half+i/n*half*2;for(const y of [-height/2,height/2]){positions.push(Math.sin(angle)*radius,y,radius*(1-Math.cos(angle)));uv.push(i/n*2,y<0?0:1);}}for(let i=0;i<n;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();part(g,geo,tickerMaterial(kind));}
 else if(type==='hullChunk'){part(g,'box',M.steel,[0,0,0],[2.4,.2,1.8]);part(g,'box',M.dark,[0,.14,0],[1.8,.08,.16]);part(g,'box',M.teal,[.9,.11,0],[.05,.018,1.6]);}

 else if(type==='missilePickup'){part(g,'cyl',M.steel,[0,0,0],[.09,.7,.09],[Math.PI/2,0,0]);part(g,'cone',M.red,[0,0,.46],[.09,.25,.09],[Math.PI/2,0,0]);part(g,'box',M.brass,[0,0,-.25],[.45,.03,.18]);}
 else if(type==='hatch'){part(g,'cyl',M.dark,[0,0,0],[1,.06,1],[Math.PI/2,0,0]);for(let i=0;i<6;i++)part(g,'box',M.steel,[Math.cos(i*1.047)*.48,Math.sin(i*1.047)*.48,.04],[.7,.42,.045],[0,0,i*1.047]);}
 return g;}
export function buildModel(type,kind=0,meta={}){if(type==='drone')return drone(kind);if(type==='knight')return knight(!!kind);if(type==='hydra')return hydraModel();if(type==='camel')return camel();if(type==='trilo')return trilo();if(type==='lemur')return lemur();if(type==='hornet')return hornet();if(type==='pet')return pet(kind);return prop(type,kind,meta);}

const tickerMats=[];
function tickerMaterial(kind){if(!tickerMats.length){const c=canvas(1024,128),x=c.getContext('2d');x.fillStyle='#0a1424';x.fillRect(0,0,1024,128);x.fillStyle='#638fa6';x.fillRect(0,0,1024,4);x.fillRect(0,124,1024,4);x.font='bold 48px sans-serif';x.fillStyle='#c6f6e9';x.fillText('NET KNIGHT  ◆  LIVE  ✦  ARENA  ◇',18,75);x.font='16px monospace';x.fillStyle='#f9bb76';x.fillText('THE NETWORK IS WATCHING   /   ZERO GRAVITY   /   STAY IN THE GAME',22,106);for(let i=0;i<2;i++){const t=texture(c);t.wrapS=T.RepeatWrapping;tickerMats.push(new T.MeshBasicMaterial({map:t,side:T.DoubleSide,toneMapped:false}));}}return tickerMats[kind%2];}
export function tickTicker(time){tickerMats.forEach((m,i)=>m.map.offset.x=time*(i?-.12:.12));}
