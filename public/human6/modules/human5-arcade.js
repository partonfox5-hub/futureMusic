/** Canvas game adapter: no DOM scraping, eval or remote game-code execution. */
export function createArcadeGame(canvas){
  const ctx=canvas.getContext('2d'),input={x:0,y:0,buttons:new Set()},adapters=new Map();
  let selected=null,acc=0,dirty=true,time=0,score=0,x=.5,orbs=[];
  const demo={title:'ORBIT CATCH',reset(){score=0;x=.5;orbs=[];time=0;},
    update(dt,state){time+=dt;x=Math.max(.06,Math.min(.94,x+state.x*dt*.7));if(state.buttons.has(0))x+=(.5-x)*Math.min(1,dt*3);
      if(orbs.length<10&&Math.floor(time*1.8)>Math.floor((time-dt)*1.8))orbs.push({x:.08+((Math.sin(time*127.1)*43758.5453)%1+1)%1*.84,y:-.02});
      for(const o of orbs){o.y+=dt*(.20+Math.min(score,25)*.002);if(o.y>.86&&Math.abs(o.x-x)<.09){o.y=2;score++;}}orbs=orbs.filter(o=>o.y<1.05);},
    render(c,w,h){c.fillStyle='#071622';c.fillRect(0,0,w,h);c.fillStyle='#9bcebc';c.font='bold 28px monospace';c.textAlign='center';c.fillText('ORBIT CATCH',w/2,48);c.font='17px monospace';c.fillText('SCORE '+score,w/2,76);
      for(const o of orbs){c.fillStyle='#f7cf67';c.beginPath();c.arc(o.x*w,100+o.y*(h-135),9,0,7);c.fill();}c.fillStyle='#74e6d5';c.fillRect(x*w-28,h-63,56,13);c.font='12px monospace';c.fillStyle='#91a6b2';c.fillText('JOYSTICK / ARROWS  •  A: CENTER  B: NEW GAME',w/2,h-18);},
    onButton(id,pressed){if(id===1&&pressed)this.reset();}};
  function draw(){selected.render(ctx,canvas.width,canvas.height);dirty=true;}
  function load(id){const next=adapters.get(id);if(!next)return false;selected?.suspend?.();selected=next;input.buttons.clear();input.x=input.y=0;selected.reset?.();draw();return true;}
  adapters.set('orbit-catch',demo);load('orbit-catch');
  return {canvas,input,adapters,register(id,adapter){if(typeof id!=='string'||!id||typeof adapter?.render!=='function'||typeof adapter?.update!=='function')throw Error('Arcade adapter needs update(dt,input) and render(ctx,width,height)');adapters.set(id,adapter);return id;},load,
    axis(x,y){input.x=Math.max(-1,Math.min(1,Number(x)||0));input.y=Math.max(-1,Math.min(1,Number(y)||0));selected?.onAxis?.(input.x,input.y);},
    button(id,pressed){const before=input.buttons.has(id);if(pressed)input.buttons.add(id);else input.buttons.delete(id);if(before!==pressed)selected?.onButton?.(id,pressed);},
    tick(dt,visible=true){if(visible){acc+=Math.min(dt,.05);if(acc>=1/30){const step=acc;acc=0;selected.update(step,input);draw();}}else acc=0;const changed=dirty;dirty=false;return changed;},
    get title(){return selected?.title||'ARCADE';},release(){for(const id of [...input.buttons])this.button(id,false);this.axis(0,0);},dispose(){this.release();for(const a of adapters.values())a.dispose?.();adapters.clear();}
  };
}
