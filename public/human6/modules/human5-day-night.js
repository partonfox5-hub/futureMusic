import * as T from 'three';
const clamp=T.MathUtils.clamp,TAU=Math.PI*2;
/** 24 game hours in 1,440 active wall-clock seconds. No accumulated frame-rate drift. */
export class DayNightClock {
 constructor(hour=10){this.hour=hour;this.running=true;this.duration=24*60;this.sun=new T.Vector3();this.moon=new T.Vector3();this.zenith=new T.Color();this.horizon=new T.Color();this.sunColor=new T.Color();this.cloudColor=new T.Color();this.sample();}
 setHour(hour){if(!Number.isFinite(hour))throw new TypeError('Hour must be finite');this.hour=((hour%24)+24)%24;return this.sample();}
 advance(seconds){if(this.running&&Number.isFinite(seconds)&&seconds>0)this.hour=(this.hour+seconds*24/this.duration)%24;return this.sample();}
 sample(){
  const angle=(this.hour-6)/24*TAU;this.sun.set(Math.cos(angle),Math.sin(angle)*.88,Math.sin(angle)*.475).normalize();this.moon.copy(this.sun).negate();
  const elevation=this.sun.y;this.day=T.MathUtils.smoothstep(elevation,-.10,.24);this.night=1-T.MathUtils.smoothstep(elevation,-.22,.02);this.twilight=(1-T.MathUtils.smoothstep(Math.abs(elevation),.03,.26));
  this.zenith.setRGB(.005,.010,.028).lerp(new T.Color().setRGB(.085,.27,.55),this.day);
  this.horizon.setRGB(.015,.023,.047).lerp(new T.Color().setRGB(.60,.74,.85),this.day).lerp(new T.Color().setRGB(.76,.235,.075),this.twilight*.8);
  this.sunColor.setRGB(1,.37,.13).lerp(new T.Color().setRGB(1,.94,.82),T.MathUtils.smoothstep(elevation,.01,.43));
  this.cloudColor.setRGB(.025,.037,.062).lerp(new T.Color().setRGB(.87,.90,.94),this.day).lerp(new T.Color().setRGB(.93,.39,.20),this.twilight*.55);
  return this;
 }
 snapshot(){return {hour:this.hour,cycleSeconds:this.duration,day:this.day,night:this.night,twilight:this.twilight,sun:this.sun.toArray(),moon:this.moon.toArray(),running:this.running};}
}
