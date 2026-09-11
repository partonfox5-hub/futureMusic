// Shared desktop / VR definitions. Actor-local; original v1 ranges stay intact.
export const V2_EXTRA_SLIDERS=[
 {key:'breastHeight',label:'Breast placement',min:-1,max:1,step:.02,value:0,section:'shape'},
 {key:'breastSpacing',label:'Breast spacing',min:-1,max:1,step:.02,value:0,section:'shape'},
 {key:'breastAngle',label:'Breast angle',min:-1,max:1,step:.02,value:0,section:'shape'},
 {key:'buttHeight',label:'Buttock placement',min:-1,max:1,step:.02,value:0,section:'shape'},
 {key:'buttSpacing',label:'Buttock spacing',min:-1,max:1,step:.02,value:0,section:'shape'},
 {key:'buttAngle',label:'Buttock angle',min:-1,max:1,step:.02,value:0,section:'shape'},
 {key:'handResponse',label:'Hand contact response',min:0,max:16,step:.05,value:2.7,section:'physics'},
 {key:'softness',label:'Tissue softness',min:0,max:1,step:.02,value:.62,section:'physics'},
 {key:'damping',label:'Motion damping',min:0,max:1,step:.02,value:.36,section:'physics'},
 {key:'bodySoftness',label:'Waist / thigh motion',min:0,max:1,step:.02,value:.5,section:'physics'},
 {key:'faceSoftness',label:'Cheek softness',min:0,max:1,step:.02,value:.4,section:'physics'},
 {key:'hairMotion',label:'Hair flexibility',min:0,max:1,step:.02,value:.48,section:'physics'},
 {key:'skinDetail',label:'Skin microdetail',min:0,max:1,step:.02,value:.32,section:'skin'},
];
export const FACE_PRESETS=[
 {name:'Natural',like:0,jaw:0,cheek:0,length:0,nose:0},
 {name:'Reference',like:1,jaw:0,cheek:0,length:0,nose:0},
 {name:'Soft oval',like:.65,jaw:.022,cheek:.075,length:.015,nose:-.001},
 {name:'Heart',like:.75,jaw:-.065,cheek:.045,length:-.012,nose:0},
 {name:'Defined',like:.3,jaw:.065,cheek:-.025,length:.025,nose:.002},
];
FACE_PRESETS.push({name:'Broad jaw',like:.2,jaw:.15,cheek:.015,length:.025,nose:.002},{name:'Long oval',like:.3,jaw:.04,cheek:-.025,length:.09,nose:.001},{name:'Angular',like:.1,jaw:.12,cheek:-.07,length:.035,nose:.002});
export const HAIR_STYLES=['Long layers','Shoulder length','Soft bob','Swept back','Low bun','Pixie crop','Light short bob','High bun','Close crop','Bald','Short side part'];
export const ACTIVITY_MODES=['auto','idle','wander','airSquats','stretch','jumpingJacks','march','sideSteps','dance','reach','heelRaises'];
export const ATTENTION_MODES=['attentive','hyperattentive','ignoring'];
export const ATTENTION_LABELS={attentive:'Attentive',hyperattentive:'Hyperattentive',ignoring:'Ignoring'};
export const EXERCISE_MODES=ACTIVITY_MODES.slice(3);
export function shapeSliders(base,actor){return actor?.version==='v2'?[...base.map(s=>s.key==='jiggle'?{...s,max:6,value:2.8}:s),...V2_EXTRA_SLIDERS]:base;}

export const ACTION_LABELS={auto:'Free behaviour',idle:'Stand',wander:'Wander',airSquats:'Squats',stretch:'Stretch',jumpingJacks:'Jumping jacks',march:'March',sideSteps:'Side steps',dance:'Dance',reach:'Reach',heelRaises:'Heel raises'};
export const POSE_LABELS={auto:'Changing idle',rest:'Relaxed stand',handsOnHips:'Hands on hips',handOnHip:'One hand on hip',handsTogether:'Hands together',hairTuck:'Tuck hair',lookAtHand:'Look at hand',weightShift:'Shift weight',shoulderRoll:'Roll shoulders',lookAround:'Look around',armStretch:'Arm stretch',neckStretch:'Neck stretch'};
export const EMOTION_NAMES=['neutral','happy','content','curious','listening','thoughtful','concerned','sad','surprise','afraid','angry','disgust','tease','flirty','laugh','tired'];
export const IDLE_NAMES=['rest','weightShift','handsTogether','handOnHip','handsOnHips','hairTuck','lookAtHand','wave','explain','shoulderRoll','lookAround','breathe','neckStretch','sigh','armStretch','wiggle','dance'];
export const WALK_NAMES=['Relaxed','Purposeful','Soft','Brisk','Careful','Stroll'];
