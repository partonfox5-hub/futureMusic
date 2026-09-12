import {T,rng} from './math.js?v=5.0.0';
// Palette/pattern families follow NkTex.WallVariant, with brushed material detail.
const palettes=[['#161322','#292033','#668589'],['#38251e','#65442d','#ad7252'],['#102c24','#17473a','#50c897'],['#111c38','#233661','#d0c398'],['#41464c','#27292d','#bd873c'],['#281335','#52215f','#804e86'],['#16313c','#28483b','#44b7c7'],['#14282a','#24483f','#54ce91'],['#b99832','#262930','#d3b352'],['#22272d','#44454d','#7b818d'],['#346078','#73a5b6','#c7e0e5'],['#35251f','#614334','#aa7754']];
export function paintArenaPanel(color,seed=13,w=1024,h=512,variant=0){
 const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),random=rng(seed),k=Math.abs(variant)%12,[a,b,line]=palettes[k];x.fillStyle=a;x.fillRect(0,0,w,h);
 const cw=w/48,ch=h/24;
 for(let row=0;row<24;row++)for(let col=0;col<48;col++){
  const px=col*cw,py=row*ch;
  x.fillStyle=(k===0||k===5)?((row+col)%2?a:b):'#'+new T.Color(a).lerp(new T.Color(b),.22+random()*.30).getHexString();x.fillRect(px,py,cw,ch);
  if(k===0||k===5){x.strokeStyle=k===0?'#32404e':'#4b3257';x.lineWidth=.65;x.strokeRect(px+.5,py+.5,cw-1,ch-1);}
  else if(k===1||k===11){x.strokeStyle=line;x.globalAlpha=.3;x.lineWidth=1.4;x.strokeRect(px,py,cw*2,ch);x.globalAlpha=1;}
  else if(k===2){x.strokeStyle=line;x.globalAlpha=.6;x.lineWidth=.7;x.strokeRect(px,py,cw,ch);x.beginPath();x.moveTo(px,py+ch);x.lineTo(px+cw,py);x.stroke();x.globalAlpha=1;}
  else if(k===3){if((col*13+row*7)%11===0){x.fillStyle=line;x.fillRect(px+cw*.4,py+ch*.4,1.6,1.6);}}
  else if(k===4){x.fillStyle='#171b22';x.fillRect(px,py,cw,1.6);x.fillRect(px,py,1.6,ch);x.fillStyle=line;x.beginPath();x.arc(px+cw/2,py+ch/2,1.7,0,6.283);x.fill();}
  else if(k===6){const ox=(row%2)*cw*.5;x.fillStyle=line;x.globalAlpha=.6;x.beginPath();for(let v=0;v<6;v++){const angle=v*Math.PI/3;x.lineTo(px+ox+cw/2+Math.cos(angle)*cw*.48,py+ch/2+Math.sin(angle)*ch*.53);}x.closePath();x.lineWidth=1.25;x.strokeStyle=line;x.stroke();x.globalAlpha=1;}
  else if(k===7){x.fillStyle=line;x.globalAlpha=.4;x.fillRect(px,py,1,ch);if((col+row*3)%7===0){x.fillStyle='#c4588d';x.fillRect(px+cw*.15,py+ch*.45,cw*.7,1);}x.globalAlpha=1;}
  else if(k===8){x.fillStyle=(row+col)%2?'#29282e':'#c5a33c';x.beginPath();x.moveTo(px,py);x.lineTo(px+cw*.55,py);x.lineTo(px+cw,py+ch);x.lineTo(px+cw*.45,py+ch);x.closePath();x.fill();}
  else if(k===9){x.fillStyle='#61616b';x.globalAlpha=.2;for(let i=0;i<5;i++)x.fillRect(px+i*cw/5,py,1,ch*.5);x.globalAlpha=1;}
  else if(k===10){x.fillStyle='rgba(202,240,255,.16)';x.beginPath();x.moveTo(px,py+ch);x.lineTo(px+cw*(.3+random()*.4),py);x.lineTo(px+cw,py+ch);x.fill();}
  if(k===11&&(col*17+row*29)%23<3){x.fillStyle=['#b35988','#5fb38b','#598eac'][(col+row)%3];x.fillRect(px+3,py+ch*.5,3,1);}
 }
 // Broad structural seams, recess shadows and restrained grazing highlights.
 for(let row=0;row<6;row++)for(let col=0;col<12;col++){const px=col*w/12,py=row*h/6,pw=w/12,ph=h/6;
  x.fillStyle='rgba(3,5,10,.52)';x.fillRect(px,py,pw,1.8);x.fillRect(px,py,1.8,ph);
  x.strokeStyle='rgba(228,224,218,.13)';x.lineWidth=.8;x.strokeRect(px+2,py+2,pw-3,ph-3);
  for(const dx of [5,pw-6])for(const dy of [5,ph-6]){x.fillStyle='#0d1119';x.beginPath();x.arc(px+dx,py+dy,1.35,0,6.283);x.fill();x.fillStyle='#71818b';x.fillRect(px+dx-.5,py+dy-1,.8,.65);}
  const g=x.createLinearGradient(px,py,px+pw,py+ph);g.addColorStop(0,'rgba(216,229,229,.055)');g.addColorStop(.45,'rgba(20,15,23,.03)');g.addColorStop(1,'rgba(0,0,0,.15)');x.fillStyle=g;x.fillRect(px+2,py+2,pw-3,ph-3);
 }
 for(let i=0;i<1100;i++){x.fillStyle=random()<.5?'rgba(244,236,219,.05)':'rgba(0,0,0,.07)';x.fillRect(random()*w,random()*h,2+random()*9,.4);}
 // Only a light sector tint: the Unity-derived pattern remains dominant.
 x.globalAlpha=.045;x.fillStyle='#'+new T.Color(color).getHexString();x.fillRect(0,0,w,h);x.globalAlpha=1;return c;
}

export function paintTunnelPanel(id){const c=paintArenaPanel(0x98a9bb,31+id,512,512,[4,2,5,0,6][id%5]),x=c.getContext('2d');
 for(const y of [102,358]){x.fillStyle='rgba(7,10,22,.87)';x.fillRect(0,y,512,36);x.fillStyle=id%2?'#d089d4':'#70cfd8';x.fillRect(0,y,512,1);x.font='bold 12px monospace';x.fillText('NET KNIGHT  /  LIVE NETWORK  /  BATTLE SPHERE ARENA',12,y+16);x.font='7px monospace';x.fillStyle='#adaaaa';x.fillText('ZERO GRAVITY   •   SIGNAL ACTIVE   •   CONNECTED SECTORS',12,y+29);}return c;
}
