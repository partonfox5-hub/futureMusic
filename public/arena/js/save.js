import {clamp} from './math.js?v=4.0.0';
const PREFIX='netknight-webvr-v3-';
export function read(key,fallback=null){try{const s=localStorage.getItem(PREFIX+key);return s?JSON.parse(s):fallback;}catch{return fallback;}}
export function write(key,value){try{localStorage.setItem(PREFIX+key,JSON.stringify(value));return true;}catch{return false;}}
export function learning(){const runs=read('history',[]).slice(-80);if(!runs.length)return {agro:1,gap:.8,vertical:.5,pulse:0};const average=key=>runs.reduce((a,r)=>a+r[key],0)/runs.length;return {agro:clamp(average('speed')/5,.7,1.6),gap:clamp(average('attackGap')*.85,.35,1.8),vertical:clamp(average('vertical')*1.4,.2,1.4),pulse:clamp(average('pulses')/8,0,1)};}
export function record(g){if(g.time<5)return;const m=g.metrics,r={date:Date.now(),score:Math.round(g.player.score),time:g.time,speed:m.distance/g.time,vertical:m.distance?m.vertical/m.distance:0,attackGap:g.time/Math.max(1,m.shots),pulses:m.pulses};const hist=read('history',[]);hist.push(r);write('history',hist.slice(-80));const highs=read('scores',[]);highs.push(r);write('scores',highs.sort((a,b)=>b.score-a.score).slice(0,10));}
export function download(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
