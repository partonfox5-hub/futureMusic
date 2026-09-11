import test from 'node:test';
import assert from 'node:assert/strict';
import {Sound} from '../js/audio.js';
class Param {constructor(){this.value=0;}setTargetAtTime(v){this.value=v;}}
class Node {constructor(){for(const k of ['gain','threshold','knee','ratio','attack','release','positionX','positionY','positionZ'])this[k]=new Param();}connect(){}disconnect(){}start(){}}
class Context {constructor(){this.sampleRate=48000;this.currentTime=0;this.state='running';this.destination=new Node();}createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createPanner(){return new Node();}createBufferSource(){return new Node();}createBuffer(ch,n,rate){const data=new Float32Array(n);return {duration:n/rate,getChannelData:()=>data};}}
test('synthesized sound buffers contain finite, audible, unclipped samples; voice count stays bounded',()=>{
  globalThis.window={AudioContext:Context};const s=new Sound();s.init();assert.ok(s.ctx);assert.equal(s.voices.length,20);assert.equal(s.droneLoops.length,4);
  for(const [name,buffer]of Object.entries(s.buffers)){let sum=0,peak=0;const a=buffer.getChannelData(0);for(const x of a){assert.ok(Number.isFinite(x),name);sum+=x*x;peak=Math.max(peak,Math.abs(x));}assert.ok(peak<=1,name+' clipped');assert.ok(Math.sqrt(sum/a.length)>.001,name+' silent');}
  for(let i=0;i<100;i++)s.play('shot');assert.equal(s.voices.filter(v=>v.source).length,20);assert.equal(s.voices.length,20);delete globalThis.window;
});
