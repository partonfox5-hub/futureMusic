import * as T from 'three';
import {yieldToBrowser,withDeadline} from './human6-loading.js?v=20.3.0';

/** Prepare only the view the player will actually see. r170 compileAsync uses
 * traverse(), including invisible meshes; a bounded list avoids compiling every
 * hidden building, source mesh, car interior and offscreen material variant. */
export function initialViewObjects(scene,camera){
  const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse)),objects=[];
  scene.traverseVisible(o=>{if(!(o.isMesh||o.isPoints||o.isLine||o.isSprite)||!o.material||!o.layers.test(camera.layers))return;
    if(o.geometry?.drawRange.count===0||o.isInstancedMesh&&o.count===0)return;
    if(o.frustumCulled&&!o.isSprite&&!frustum.intersectsObject(o))return;
    objects.push(o);
  });return objects;
}

export function createStartupWarmup({renderer,scene,camera,prepare=()=>{},status=()=>{}}={}){
  const samples=[],proxy=new T.Group();let task=null;
  const api={active:false,complete:false,error:null,samples,
    render(){/* The HTML loading card stays responsive; no world renders here. */},
    run(){if(task)return task;task=(async()=>{
      api.active=true;const started=performance.now();
      try{
        status('Preparing the starting area');await yieldToBrowser();const prepareStart=performance.now();
        prepare();scene.updateMatrixWorld(true);camera.updateWorldMatrix(true,false);
        // Build the same batches and distance visibility used by the first draw.
        let objects;try{scene.onBeforeRender(renderer,scene,camera,null);objects=initialViewObjects(scene,camera);}finally{scene.onAfterRender(renderer,scene,camera);}
        samples.push({stage:'prepare',ms:performance.now()-prepareStart,objects:objects.length});
        proxy.traverse=fn=>{for(const object of objects)fn(object);};
        status('Preparing visible materials');await yieldToBrowser();const shaders=performance.now();
        await withDeadline(renderer.compileAsync(proxy,camera,scene),20000,'Visible material preparation');
        samples.push({stage:'mainShaders',ms:performance.now()-shaders,objects:objects.length});
        if(renderer.getContext().isContextLost())throw new Error('The graphics context was lost. Reload to restore it.');
        status('Uploading visible textures');await yieldToBrowser();const textures=new Set(),maps=['map','normalMap','roughnessMap','metalnessMap','emissiveMap','alphaMap','aoMap','bumpMap'];
        for(const o of objects)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const key of maps){const t=m?.[key];if(t?.image?.width&&!t.isRenderTargetTexture)textures.add(t);}
        let count=0;const upload=performance.now();for(const t of textures){renderer.initTexture(t);if(++count%4===0)await yieldToBrowser();}
        samples.push({stage:'textureUpload',ms:performance.now()-upload,textures:count});
        status('Drawing the first view');await yieldToBrowser();const first=performance.now();renderer.info.reset();renderer.render(scene,camera);
        samples.push({stage:'firstView',ms:performance.now()-first,calls:renderer.info.render.calls});
        api.complete=true;
      }catch(error){api.error=error.message;console.error('Scene preparation failed',error);}
      finally{api.active=false;proxy.traverse=T.Object3D.prototype.traverse;samples.push({stage:'total',ms:performance.now()-started});}
    })();return task;},
    dispose(){}
  };return api;
}
