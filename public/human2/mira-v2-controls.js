// Shared desktop / VR definitions. Actor-local; original v1 ranges stay intact.
export const V2_EXTRA_SLIDERS=[
 {key:'breastHeight',label:'Breast placement',min:-1,max:1,step:.02,value:0,section:'shape'},
 {key:'breastSpacing',label:'Breast spacing',min:-1,max:1,step:.02,value:0,section:'shape'},
 {key:'breastAngle',label:'Breast angle',min:-1,max:1,step:.02,value:0,section:'shape'},
 {key:'softness',label:'Tissue softness',min:0,max:1,step:.02,value:.62,section:'physics'},
 {key:'damping',label:'Motion damping',min:0,max:1,step:.02,value:.36,section:'physics'},
 {key:'bodySoftness',label:'Waist / thigh motion',min:0,max:1,step:.02,value:.5,section:'physics'},
 {key:'faceSoftness',label:'Cheek softness',min:0,max:1,step:.02,value:.4,section:'physics'},
 {key:'hairMotion',label:'Hair flexibility',min:0,max:1,step:.02,value:.68,section:'physics'},
 {key:'skinDetail',label:'Skin microdetail',min:0,max:1,step:.02,value:.32,section:'skin'},
];
export const FACE_PRESETS=[
 {name:'Natural',like:0,jaw:0,cheek:0,length:0,nose:0},
 {name:'Reference',like:1,jaw:0,cheek:0,length:0,nose:0},
 {name:'Soft oval',like:.65,jaw:.022,cheek:.075,length:.015,nose:-.001},
 {name:'Heart',like:.75,jaw:-.065,cheek:.045,length:-.012,nose:0},
 {name:'Defined',like:.3,jaw:.065,cheek:-.025,length:.025,nose:.002},
];
export const HAIR_STYLES=['Long layers','Shoulder length','Soft bob','Swept back'];
export const ACTIVITY_MODES=['auto','idle','wander','airSquats','stretch','jumpingJacks','march','sideSteps','dance','reach','heelRaises'];
export const EXERCISE_MODES=ACTIVITY_MODES.slice(3);
export function shapeSliders(base,actor){return actor?.version==='v2'?[...base.map(s=>s.key==='jiggle'?{...s,max:6,value:2.8}:s),...V2_EXTRA_SLIDERS]:base;}
