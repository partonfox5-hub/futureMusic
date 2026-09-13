import * as T from 'three';

/** Optional compositor quad for the existing canvas menu, with mesh fallback.
 * Dynamic weather, characters and the hinged paper map retain scene depth. */
export function installMenuLayer({renderer,rig,props}){
  let layer=null,session=null,binding=null,attached=false,failed=false,enabled=true,version=-1;
  const p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3(),matrix=new T.Matrix4();
  const status={mode:'mesh fallback',uploads:0,error:null};
  function restore(){const menu=props.menu;if(menu?.panel)menu.panel.layers.enable(0);}
  function detach(){if(attached&&session){try{session.updateRenderState({layers:Array.from(session.renderState.layers||[]).filter(l=>l!==layer)});}catch{}}attached=false;restore();}
  function end(){detach();layer?.destroy?.();layer=null;session=null;binding=null;failed=false;version=-1;status.mode='mesh fallback';}
  renderer.xr.addEventListener('sessionend',end);
  function tick(frame){const menu=props.menu;if(!frame||!renderer.xr.isPresenting||!menu?.panel)return;
    const current=renderer.xr.getSession();if(session!==current){end();session=current;}
    if(failed)return;
    if(!enabled||!menu.isOpen){detach();return;}
    try{
      if(!layer){binding=renderer.xr.getBinding?.();const base=renderer.xr.getBaseLayer?.(),space=renderer.xr.getReferenceSpace();if(!binding?.createQuadLayer||!base||!space||!session.renderState.layers)return;
        layer=binding.createQuadLayer({space,width:.74,height:.954,viewPixelWidth:menu.canvas.width,viewPixelHeight:menu.canvas.height,layout:'mono',textureType:'texture',colorFormat:renderer.getContext().RGBA,depthFormat:0,isStatic:false,clearOnAccess:false});
      }
      if(!attached){const layers=Array.from(session.renderState.layers||[]).filter(l=>l!==layer);if(!layers.length)layers.push(renderer.xr.getBaseLayer());session.updateRenderState({layers:[...layers,layer]});attached=true;version=-1;}
      menu.panel.updateWorldMatrix(true,false);rig.updateWorldMatrix(true,false);matrix.copy(rig.matrixWorld).invert().multiply(menu.panel.matrixWorld);matrix.decompose(p,q,s);layer.transform=new XRRigidTransform(p,q);layer.width=.74*s.x;layer.height=.954*s.y;
      // getSubImage may clear content on older implementations, so upload every
      // active frame unless the implementation exposes clearOnAccess=false.
      if(version!==menu.texture.version||layer.needsRedraw){
        const gl=renderer.getContext(),sub=binding.getSubImage(layer,frame);renderer.resetState();gl.bindTexture(gl.TEXTURE_2D,sub.colorTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
        gl.texSubImage2D(gl.TEXTURE_2D,0,sub.viewport.x,sub.viewport.y,gl.RGBA,gl.UNSIGNED_BYTE,menu.canvas);gl.bindTexture(gl.TEXTURE_2D,null);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);renderer.resetState();if(gl.getError()!==gl.NO_ERROR)throw Error('Compositor texture upload rejected');version=menu.texture.version;status.uploads++;
      }
      // Layer mask keeps the panel raycastable by the menu while removing its
      // color draw from the eye buffers. No hero or world mesh is moved to a layer.
      menu.panel.layers.disable(0);menu.panel.layers.enable(29);status.mode='compositor menu quad';
    }catch(e){status.error=e.message;failed=true;detach();status.mode='mesh fallback';}
  }
  // Menu raycaster is explicitly allowed to intersect the hidden proxy layer.
  return {status,tick,get enabled(){return enabled;},set enabled(v){enabled=!!v;if(!enabled)detach();},dispose(){end();renderer.xr.removeEventListener('sessionend',end);}};
}
