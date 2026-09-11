import * as T from 'three';
import {withOffscreenView} from './human5-view-surfaces.js?v=18.0.0';

/** Pay first-use vehicle rendering costs while the initial loading card is up. */
export function createStartupWarmup({renderer,scene,camera,props,prepare=()=>{},status=()=>{}}={}){
  const loading=new T.Scene();loading.background=new T.Color(0x101d29);
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const ctx=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const card=new T.Mesh(new T.PlaneGeometry(1.3,.325),new T.MeshBasicMaterial({map:texture,toneMapped:false,depthTest:false}));loading.add(card);
  const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(()=>resolve()));
  const reviewCamera=new T.PerspectiveCamera(70,1,.08,55),samples=[];let disposed=false;
  function label(text){ctx.fillStyle='#101d29';ctx.fillRect(0,0,768,192);ctx.fillStyle='#e1ecf2';ctx.textAlign='center';ctx.font='bold 32px sans-serif';ctx.fillText('PREPARING HUMAN 5',384,73);ctx.font='23px sans-serif';ctx.fillText(text,384,127);texture.needsUpdate=true;status(text);}
  const api={active:false,complete:false,samples,error:null,
    render(){if(disposed)return;camera.updateWorldMatrix(true,false);card.position.set(0,0,-1.4).applyMatrix4(camera.matrixWorld);card.quaternion.copy(camera.getWorldQuaternion(new T.Quaternion()));renderer.render(loading,camera);},
    async run(){if(api.active||api.complete)return;api.active=true;label('Preparing scene materials');await nextFrame();await nextFrame();
      const started=performance.now();try{
        prepare();scene.updateMatrixWorld(true);const mainStart=performance.now();await renderer.compileAsync(scene,camera);samples.push({stage:'mainShaders',ms:performance.now()-mainStart});
        const cars=props.cars().filter(c=>c.group.visible).slice(0,2);
        if(cars.length){let compiling;label('Preparing mirror materials');await nextFrame();
          withOffscreenView(renderer,[],()=>{renderer.setRenderTarget(cars[0].target);compiling=renderer.compileAsync(scene,cars[0].rearCamera);});await compiling;
        }
        for(let i=0;i<cars.length;i++){const car=cars[i];label('Preparing vehicle views '+(i+1)+' / '+cars.length);await nextFrame();await nextFrame();const start=performance.now();
          // compileAsync alone does not upload geometry/textures or force driver JIT.
          car.renderMirrorView(true);car.h5MirrorPrepared=true;
          if(!renderer.xr.isPresenting){reviewCamera.position.copy(car.group.localToWorld(new T.Vector3(...car.vehicleSpec.driverEye)));reviewCamera.quaternion.copy(car.group.getWorldQuaternion(new T.Quaternion()));reviewCamera.updateMatrixWorld(true);
            withOffscreenView(renderer,[props.system.vrPanel],()=>{renderer.setRenderTarget(null);renderer.setViewport(0,0,1,1);renderer.setScissor(0,0,1,1);renderer.setScissorTest(true);renderer.render(scene,reviewCamera);});}
          samples.push({stage:'vehicleView',vehicle:car.vehicleKind,ms:performance.now()-start});
        }
        api.complete=true;
      }catch(e){api.error=e.message;api.complete=true;console.error('Scene preparation failed',e);}
      finally{api.active=false;samples.push({stage:'total',ms:performance.now()-started});}
    },
    dispose(){disposed=true;card.geometry.dispose();card.material.dispose();texture.dispose();}
  };return api;
}
