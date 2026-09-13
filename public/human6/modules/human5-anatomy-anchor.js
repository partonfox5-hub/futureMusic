// Pigment center is the original nipple vertices (1607 / 3961), not the
// highest-Z chest sample (4027 at x=.07616 y=1.18547). Breast shaping is
// centered near (.078, 1.207), so 1607/3961 become the visible bump; the
// max-Z rest vertex sits down and toward the sternum of that bump.
export const ANATOMY_ANCHOR=Object.freeze({x:.09454238,y:1.211999,rx:.016,ry:.015,tipX:.0055,tipY:.0052});
export function anatomicalRelief(x,y,z){
 return 0;
}
