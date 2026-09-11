// Authored CC3 rest-space apex; shared by CPU geometry and GPU pigment.
export const ANATOMY_ANCHOR=Object.freeze({x:.07622559,y:1.1870443,rx:.018,ry:.017,tipX:.0055,tipY:.0052});
export function anatomicalRelief(x,y,z){
 if(z<=.072||Math.abs(y-ANATOMY_ANCHOR.y)>.05)return 0;
 const a=ANATOMY_ANCHOR,u=Math.abs(x)-a.x,v=y-a.y;
 return .0034*Math.exp(-((u/a.tipX)**2+(v/a.tipY)**2))+.00065*Math.exp(-2.5*((u/a.rx)**2+(v/a.ry)**2));
}
