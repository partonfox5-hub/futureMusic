import * as T from 'three';
import {wrapMethod} from './human5-common.js?v=20.3.0';
import {ROUTES} from './human5-worldfield.js?v=20.3.0';

export function installMinimap({world,mira,camera,scene,props,renderer,factions}){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=768;canvas.id='h6-minimap';canvas.setAttribute('aria-label','North-up minimap. Click to set a waypoint.');canvas.style.cssText='position:fixed;top:auto;left:14px;bottom:14px;width:190px;height:190px;border-radius:12px;border:1px solid #71868f;z-index:6;cursor:crosshair;box-shadow:0 4px 20px #0008';document.body.append(canvas);
  const c=canvas.getContext('2d');c.scale(2,2);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.generateMipmaps=false;tex.minFilter=T.LinearFilter;
  // Two paper leaves, hinged at their inner edge. The left controller owns the
  // folded map; a free right grip pulls it open. Neither leaf follows the head.
  const panel=new T.Group();panel.name='Human6 folding field map';panel.visible=false;scene.add(panel);
  const paper=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false});
  const leaves=[];for(let i=0;i<2;i++){const hinge=new T.Group(),geo=new T.PlaneGeometry(.31,.60),uv=geo.attributes.uv;
    for(let j=0;j<uv.count;j++)uv.setX(j,uv.getX(j)*.5+i*.5);
    const leaf=new T.Mesh(geo,paper);leaf.position.x=i?.155:-.155;hinge.add(leaf);panel.add(hinge);leaves.push(hinge);}
  const leftP=new T.Vector3(),rightP=new T.Vector3(),mapX=new T.Vector3(),mapY=new T.Vector3(),normal=new T.Vector3(),basis=new T.Matrix4();
  let deployed=false,pulling=false,unfold=0;
  function leftIndex(){return mira.hands.handedness.indexOf('left');}
  function available(){const i=leftIndex();return i>=0&&mira.hands.active[i]&&!props.held.has(i)&&!world.h6Fauna?.mounted&&!world.h6Powers?.flying&&!props.driving();}
  function open(){if(renderer.xr.isPresenting){if(!available()){props.status='Free your left hand to unfold the map';return false;}deployed=!deployed;pulling=false;enabled=true;props.status=deployed?'Map in left hand · grip its edge with the right hand and spread your hands':'Map stowed';}else enabled=!enabled;return true;}
  const undoGrip=wrapMethod(props,'grip',old=>function(i){if(deployed&&available()){if(i===leftIndex())return true;const ri=mira.hands.handedness.indexOf('right');if(i===ri&&!props.held.has(i)){mira.hands.grip[i].getWorldPosition(rightP);panel.getWorldPosition(leftP);if(rightP.distanceTo(leftP)<.55){pulling=true;return true;}}}return old.call(this,i);});
  const undoRelease=wrapMethod(props,'release',old=>function(i){if(mira.hands.handedness[i]==='right')pulling=false;return old.call(this,i);});
  function handPose(dt){panel.visible=enabled&&deployed&&renderer.xr.isPresenting&&world.root.visible&&available()&&!props.menu?.isOpen;if(!panel.visible)return;
    const li=leftIndex(),ri=mira.hands.handedness.indexOf('right');mira.hands.grip[li].getWorldPosition(leftP);camera.getWorldPosition(eye);
    let gap=.07;mapX.set(1,0,0).applyQuaternion(camera.getWorldQuaternion(panel.quaternion));
    if(pulling&&ri>=0&&mira.hands.active[ri]&&!props.held.has(ri)){mira.hands.grip[ri].getWorldPosition(rightP);gap=rightP.distanceTo(leftP);mapX.copy(rightP).sub(leftP).normalize();}
    const desired=T.MathUtils.clamp((gap-.10)/.46,0,1);unfold=T.MathUtils.damp(unfold,desired,12,dt);
    panel.position.copy(leftP).addScaledVector(mapX,.31*unfold+.025);panel.position.y+=.10;
    normal.copy(eye).sub(panel.position).normalize();normal.addScaledVector(mapX,-normal.dot(mapX)).normalize();mapY.crossVectors(normal,mapX).normalize();normal.crossVectors(mapX,mapY).normalize();basis.makeBasis(mapX,mapY,normal);panel.quaternion.setFromRotationMatrix(basis);
    leaves[0].rotation.y=(1-unfold)*1.43;leaves[1].rotation.y=-(1-unfold)*1.43;panel.updateWorldMatrix(true,true);
  }
  function key(e){if(e.code==='KeyM'&&!e.repeat&&!/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName))open();}addEventListener('keydown',key);
  const end=()=>{deployed=false;pulling=false;};renderer.xr.addEventListener('sessionend',end);
  const eye=new T.Vector3(),forward=new T.Vector3(),waypoint=new T.Vector3(),base=document.createElement('canvas');base.width=base.height=128;const bc=base.getContext('2d');let accumulated=1,enabled=true,radius=180,hasWaypoint=false,built=false;
  let terrainRow=0,terrainData=null,terrainRevision=-1;const buildStats={rows:0,builds:0,maxSliceMs:0,draws:0};
  function buildStep(){const field=world.h5OpenWorld?.field;if(!field)return;
    if(terrainRevision!==field.revision){terrainRevision=field.revision;terrainData=bc.createImageData(128,128);terrainRow=0;}
    if(!terrainData)return;const start=performance.now(),half=field.half;
    do{const z=terrainRow++;for(let x=0;x<128;x++){const wx=(x/127*2-1)*half,wz=(z/127*2-1)*half,h=field.heightAt(wx,wz)||0,i=(z*128+x)*4,wet=field.waterAt(wx,wz,h);terrainData.data[i]=wet?33:Math.min(140,52+h*.5);terrainData.data[i+1]=wet?84:Math.min(151,78+h*.3);terrainData.data[i+2]=wet?114:Math.min(140,58+h*.4);terrainData.data[i+3]=255;}}while(terrainRow<128&&performance.now()-start<1);
    buildStats.rows=terrainRow;buildStats.maxSliceMs=Math.max(buildStats.maxSliceMs,performance.now()-start);
    if(terrainRow===128){bc.putImageData(terrainData,0,0);terrainData=null;built=true;buildStats.builds++;accumulated=1;}
  }

  const px=x=>192+(x-eye.x)/radius*178,pz=z=>192+(z-eye.z)/radius*178;
  function marker(x,z,color,size=4){const xx=px(x),zz=pz(z);if(xx<10||xx>374||zz<10||zz>374)return;c.fillStyle=color;c.beginPath();c.arc(xx,zz,size,0,Math.PI*2);c.fill();}
  function draw(){buildStats.draws++;camera.getWorldPosition(eye);c.fillStyle='#1a272a';c.fillRect(0,0,384,384);if(built){const half=world.h5OpenWorld.field.half,scale=356/(radius*2);c.drawImage(base,px(-half),pz(-half),half*2*scale,half*2*scale);}
    c.save();c.beginPath();c.rect(10,10,364,364);c.clip();
    for(const t of factions.state.territories){const owner=factions.state.groups.get(t.owner),claim=factions.state.groups.get(t.claimant);c.beginPath();c.arc(px(t.x),pz(t.z),t.radius/radius*178,0,Math.PI*2);c.fillStyle=(owner?.color||'#8c9998')+'50';c.fill();c.strokeStyle=t.contested?'#ffffff':owner?.color||'#8c9998';c.lineWidth=2;c.stroke();if(t.progress>0){c.beginPath();c.arc(px(t.x),pz(t.z),t.radius/radius*178,-Math.PI/2,-Math.PI/2+t.progress*Math.PI*2);c.strokeStyle=claim?.color||'#fff';c.lineWidth=4;c.stroke();}}
    c.lineWidth=2;c.strokeStyle='#c2b595';for(const route of ROUTES){c.beginPath();route.points.forEach(([x,z],i)=>i?c.lineTo(px(x),pz(z)):c.moveTo(px(x),pz(z)));c.stroke();}
    c.font='13px sans-serif';for(const [name,[x,z]]of Object.entries(world.h5OpenWorld?.landmarks||{})){marker(x,z,'#f1ead7',3);c.fillStyle='#f5f1df';if(px(x)>10&&px(x)<335&&pz(z)>20&&pz(z)<355)c.fillText(name,px(x)+6,pz(z)-5);}
    for(const a of mira.actors)if(!a.dead)marker(a.group.position.x,a.group.position.z,factions.state.groups.get(factions.groupOf(a))?.color||'#ccc',a===mira.selected?6:4);
    for(const a of world.h6Fauna?.animals||[])if(a.health>0)marker(a.group.position.x,a.group.position.z,a.kind==='spore'?'#fa7cec':a.kind==='dragon'?'#ff8253':'#e6d1a0',3);
    if(hasWaypoint){const x=px(waypoint.x),z=pz(waypoint.z);c.strokeStyle='#fff267';c.lineWidth=2;c.beginPath();c.moveTo(x-7,z);c.lineTo(x+7,z);c.moveTo(x,z-7);c.lineTo(x,z+7);c.stroke();}
    camera.getWorldDirection(forward);c.save();c.translate(192,192);c.rotate(Math.atan2(forward.x,-forward.z));c.beginPath();c.moveTo(0,-10);c.lineTo(7,8);c.lineTo(0,5);c.lineTo(-7,8);c.closePath();c.fillStyle='#fff';c.fill();c.restore();c.restore();
    c.fillStyle='#142128e8';c.fillRect(0,0,384,25);c.fillRect(0,360,384,24);c.fillStyle='#fff';c.font='bold 15px sans-serif';c.fillText('N ↑   '+Math.round(eye.x)+', '+Math.round(eye.z),12,18);c.font='13px sans-serif';c.fillText(hasWaypoint?'Waypoint '+Math.round(Math.hypot(eye.x-waypoint.x,eye.z-waypoint.z))+' m':Math.round(radius*2)+' m across · group colors',12,376);tex.needsUpdate=true;
  }
  canvas.onclick=e=>{const r=canvas.getBoundingClientRect();waypoint.set(eye.x+((e.clientX-r.left)/r.width*384-192)/178*radius,0,eye.z+((e.clientY-r.top)/r.height*384-192)/178*radius);hasWaypoint=true;draw();};
  const api={canvas,panel,texture:tex,stats:buildStats,open,get deployed(){return deployed;},get unfold(){return unfold;},gripsHand(i){return deployed&&panel.visible&&(i===leftIndex()||pulling&&mira.hands.handedness[i]==='right');},get enabled(){return enabled;},set enabled(v){enabled=!!v;},get radius(){return radius;},set radius(v){radius=T.MathUtils.clamp(Number(v)||180,60,2400);},waypoint,
    setWaypoint(t){waypoint.set(t.x,t.y||0,t.z);hasWaypoint=true;draw();},tick(dt){canvas.style.display=enabled&&!renderer.xr.isPresenting?'block':'none';handPose(dt);const visible=enabled&&(!renderer.xr.isPresenting||panel.visible);if(visible){buildStep();accumulated+=dt;if(accumulated>=.2){accumulated=0;draw();}}},dispose(){canvas.remove();panel.removeFromParent();undoGrip();undoRelease();removeEventListener('keydown',key);renderer.xr.removeEventListener('sessionend',end);for(const h of leaves)h.children[0].geometry.dispose();paper.dispose();tex.dispose();delete world.h6Minimap;}};world.h6Minimap=api;return api;
}
