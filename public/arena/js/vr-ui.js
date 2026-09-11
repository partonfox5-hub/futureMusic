import * as T from '../vendor/three.module.js';
export class VRUI {
  constructor(rig){
    this.canvas=document.createElement('canvas');this.canvas.width=1024;this.canvas.height=768;this.ctx=this.canvas.getContext('2d');
    this.tex=new T.CanvasTexture(this.canvas);this.tex.colorSpace=T.SRGBColorSpace;
    this.panel=new T.Mesh(new T.PlaneGeometry(1.12,.84),new T.MeshBasicMaterial({map:this.tex,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));this.panel.renderOrder=100;rig.add(this.panel);this.panel.visible=false;
    this.hudCanvas=document.createElement('canvas');this.hudCanvas.width=768;this.hudCanvas.height=128;this.hctx=this.hudCanvas.getContext('2d');this.htex=new T.CanvasTexture(this.hudCanvas);this.htex.colorSpace=T.SRGBColorSpace;
    this.hud=new T.Mesh(new T.PlaneGeometry(.78,.13),new T.MeshBasicMaterial({map:this.htex,transparent:true,depthTest:false,depthWrite:false,toneMapped:false}));this.hud.renderOrder=90;rig.add(this.hud);this.hud.visible=false;
    this.q=new T.Quaternion();this.p=new T.Vector3();this.f=new T.Vector3();this.inverse=new T.Matrix4();this.hover=-1;this.rows=[];
    this.ray=new T.Raycaster();this.ray.far=5;this.hits=[];this.last='';
  }
  positionPanel(camera,rig){camera.getWorldPosition(this.p);camera.getWorldQuaternion(this.q);this.f.set(0,0,-1).applyQuaternion(this.q);this.p.addScaledVector(this.f,1.55);rig.worldToLocal(this.p);this.panel.position.copy(this.p);rig.getWorldQuaternion(this.q).invert();camera.getWorldQuaternion(this.panel.quaternion);this.panel.quaternion.premultiply(this.q);}
  drawMenu(title,subtitle,rows,hover=-1){
    this.rows=rows;this.hover=hover;const g=this.ctx;g.clearRect(0,0,1024,768);g.fillStyle='#06121ff5';g.fillRect(0,0,1024,768);g.strokeStyle='#ba934a';g.lineWidth=3;g.strokeRect(3,3,1018,762);
    g.fillStyle='#56ddcd';g.font='bold 23px sans-serif';g.fillText('FUTURE MUSIC COLLECTIVE',55,57);
    g.fillStyle='#edf4f5';g.font='bold 48px sans-serif';g.fillText(title,55,123);
    g.fillStyle='#a1b7c9';g.font='24px sans-serif';g.fillText(subtitle,55,170);
    rows.forEach((r,i)=>{const y=206+i*76;g.fillStyle=i===hover?'#305568':'#132a3d';g.fillRect(48,y,928,62);g.strokeStyle=i===hover?'#78fce0':'#274558';g.lineWidth=2;g.strokeRect(48,y,928,62);g.fillStyle=i===hover?'#bdf8e8':'#eff7fc';g.font='bold 29px sans-serif';g.fillText(r.label,72,y+41);});
    g.fillStyle='#9cbed0';g.font='22px sans-serif';g.fillText('Point + trigger to select. Y / B opens this menu.',55,738);this.tex.needsUpdate=true;
  }
  pick(controller){
    controller.getWorldPosition(this.ray.ray.origin);controller.getWorldQuaternion(this.q);this.ray.ray.direction.set(0,0,-1).applyQuaternion(this.q);this.hits.length=0;this.ray.intersectObject(this.panel,false,this.hits);
    if(!this.hits.length)return -1;const uv=this.hits[0].uv,x=uv.x*1024,y=(1-uv.y)*768;if(x<48||x>976)return -1;
    const i=Math.floor((y-206)/76);return i>=0&&i<this.rows.length&&(y-206)%76<=62?i:-1;
  }
  positionHUD(camera,rig){
    camera.getWorldPosition(this.p);camera.getWorldQuaternion(this.q);this.f.set(0,-.37,-1.1).applyQuaternion(this.q);this.p.add(this.f);rig.worldToLocal(this.p);this.hud.position.copy(this.p);rig.getWorldQuaternion(this.q).invert();camera.getWorldQuaternion(this.hud.quaternion);this.hud.quaternion.premultiply(this.q);
  }
  updateHUD(sim,camera,rig,stats){
    const time=Math.floor(sim.elapsed),key=`${Math.round(sim.power)}|${sim.score}|${time}|${stats}`;if(key===this.last)return;this.last=key;
    const g=this.hctx;g.clearRect(0,0,768,128);g.fillStyle='#041421dc';g.fillRect(0,0,768,128);g.fillStyle=sim.power<200?'#ff666c':'#73eed2';g.font='bold 28px monospace';g.fillText(`POWER ${Math.round(sim.power)} / 1000`,22,39);g.fillStyle='#e7eef5';g.fillText(`${String(Math.floor(time/60)).padStart(2,'0')}:${String(time%60).padStart(2,'0')}    ${sim.score} PTS`,418,39);
    g.fillStyle='#173347';g.fillRect(22,54,724,8);g.fillStyle=sim.power<200?'#ff5667':'#54d6ad';g.fillRect(22,54,724*Math.min(1,sim.power/1400),8);g.fillStyle='#9cb8c9';g.font='20px monospace';g.fillText(stats||'Y / B: MENU      TRIGGER: FIRE',22,101);this.htex.needsUpdate=true;
  }
}
