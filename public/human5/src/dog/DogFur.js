import * as THREE from 'three';
const ASSET_ROOT=new URL('../../assets/dog/',import.meta.url);

export class DogFur {
  constructor(model,renderer,pawMaterial){
    this.model=model;this.layers=[];this.textures=[];this.disposed=false;
    const xr=renderer?.xr;this.shellCount=3;const loader=typeof document!=='undefined'?new THREE.TextureLoader():null;
    const placeholder=(rgb,space)=>{const t=new THREE.DataTexture(new Uint8Array([...rgb,255]),1,1);t.colorSpace=space;t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;};
    const load=(name,tex,color=false)=>{
      if(!loader)return tex;
      const img=new Image();
      img.onload=()=>{if(this.disposed)return;tex.image=img;tex.isDataTexture=false;tex.flipY=true;tex.generateMipmaps=true;tex.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;tex.needsUpdate=true;};
      img.onerror=()=>{this.failedMaps.add(name);if(name==='fur_albedo_v2.jpg'&&!img.dataset.fallback){img.dataset.fallback='1';img.src=new URL('fur_albedo.jpg',ASSET_ROOT).href;}};
      img.src=new URL(name,ASSET_ROOT).href;
      tex.anisotropy=Math.min(4,renderer?.capabilities?.getMaxAnisotropy?.()||1);
      this.textures.push(tex);return tex;
    };
    this.failedMaps=new Set();
    const albedo=placeholder([255,255,255],THREE.SRGBColorSpace);
    const normal=placeholder([128,128,255],THREE.NoColorSpace);
    const roughness=placeholder([200,200,200],THREE.NoColorSpace);
    const flow=placeholder([128,128,128],THREE.NoColorSpace);
    const pad=placeholder([40,30,24],THREE.SRGBColorSpace);
    load('fur_albedo_v2.jpg',albedo,true);load('fur_normal.jpg',normal);load('fur_roughness.jpg',roughness);load('fur_flow.jpg',flow);
    Object.assign(model.coat,{map:albedo,normalMap:normal,roughnessMap:roughness,roughness:.88,vertexColors:true});
    model.coat.normalScale.set(.22,.22);model.coat.needsUpdate=true;
    if(pawMaterial){pawMaterial.map=pad;pawMaterial.needsUpdate=true;load('paw_pad.jpg',pad,true);}
    const nose=placeholder([200,200,200],THREE.SRGBColorSpace);if(model.noseMaterial){model.noseMaterial.map=nose;model.noseMaterial.needsUpdate=true;load('nose.jpg',nose,true);}
    this.flow=flow;const sources=[...model.furMeshes];
    for(let layer=1;layer<=3;layer++){
      const material=model.coat.clone();material.name=`Dog_FurShell_${layer}`;material.alphaHash=true;material.side=THREE.FrontSide;material.depthWrite=true;material.transparent=false;material.roughness=.94;
      material.onBeforeCompile=shader=>{
        shader.uniforms.dogShell={value:layer*.002};shader.uniforms.dogFlow={value:flow};shader.uniforms.dogLayer={value:layer};
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float dogShell; varying vec2 dogFurUV;');
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed += objectNormal * dogShell; dogFurUV = uv;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
          uniform sampler2D dogFlow; uniform float dogLayer; varying vec2 dogFurUV;
          float dogHash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <alphahash_fragment>',`
          vec2 flowDir=texture2D(dogFlow,dogFurUV).rg*2.0-1.0;
          vec2 uvGroom=dogFurUV+flowDir*dogLayer*.003;
          vec2 cell=floor(uvGroom*vec2(260.0,150.0));
          float strand=dogHash(cell); float coverage=0.57-dogLayer*.115;
          if(strand>coverage) discard;
          diffuseColor.a=0.80;
          #include <alphahash_fragment>`);
        // Tangent follows the map direction via screen-space surface derivatives.
        // A restrained grazing lobe supplements, rather than replaces, Standard lighting.
        shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
          vec3 dogTx=dFdx(vViewPosition); vec3 dogTy=dFdy(vViewPosition);
          vec2 dogUx=dFdx(dogFurUV); vec2 dogUy=dFdy(dogFurUV);
          float dogDet=dogUx.x*dogUy.y-dogUx.y*dogUy.x;
          vec3 dogT=normalize((dogTy*dogUx.x-dogTx*dogUy.x)/(abs(dogDet)>0.000001?dogDet:0.000001)+vec3(0.00001));
          float dogGrazing=pow(max(0.0,1.0-abs(dot(normalize(vViewPosition),dogT))),12.0);
          outgoingLight += diffuseColor.rgb*dogGrazing*.045;
          #include <opaque_fragment>`);
      };
      material.customProgramCacheKey=()=>`dog-fur-r170-${layer}`;model.materials.add(material);
      for(const source of sources){
        const shell=new THREE.SkinnedMesh(source.geometry,material);shell.name=`${source.name}_fur_${layer}`;shell.bind(model.skeleton,new THREE.Matrix4());shell.frustumCulled=false;shell.castShadow=false;shell.receiveShadow=true;model.root.add(shell);this.layers.push({mesh:shell,layer});
      }
    }
    // Two optional tufts are represented by tiny groomed cards, never runtime strands.
    this.tuft('neck_ruff',[0,.55,.275],.16,.16,'Neck');this.tuft('tail_tuft',[0,.30,-.555],.09,.12,'Tail3');
  }
  tuft(name,p,width,height,bone){
    const g=new THREE.PlaneGeometry(width,height,3,4);g.rotateY(Math.PI);g.translate(...p);this.model.skin(g,bone);
    const m=this.model.coat.clone();m.side=THREE.DoubleSide;m.alphaHash=true;m.transparent=false;m.depthWrite=true;
    m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 dogTuftUV;').replace('#include <begin_vertex>','#include <begin_vertex>\ndogTuftUV=uv;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 dogTuftUV;');s.fragmentShader=s.fragmentShader.replace('#include <alphahash_fragment>',`float fringe=0.12+0.80*abs(sin(dogTuftUV.x*49.0)); if(dogTuftUV.y<fringe*.55 || abs(dogTuftUV.x-.5)>.50*dogTuftUV.y)discard; diffuseColor.a=.58;\n#include <alphahash_fragment>`);};
    m.customProgramCacheKey=()=>`dog-tuft-r170`;this.model.materials.add(m);this.model.mesh(name,g,m);
  }
  rebindLayers(){this.layers=[];this.model.root.traverse(mesh=>{if(mesh.isMesh&&mesh.material.name.startsWith('Dog_FurShell_'))this.layers.push({mesh,layer:Number(mesh.material.name.split('_').at(-1))});});}
  setLayers(n){this.shellCount=n===2?2:3;for(const {mesh,layer} of this.layers)mesh.visible=layer<=this.shellCount;}
  tick(dt,renderer){
    // Sustained slow XR frames drop only the outer shell. No grip/app timing changes.
    this.slowFrames=(renderer?.xr?.isPresenting&&dt>1/55)?(this.slowFrames||0)+1:Math.max(0,(this.slowFrames||0)-1);
    if(this.slowFrames>60)this.setLayers(2);
  }
  dispose(){this.disposed=true;for(const {mesh} of this.layers)mesh.removeFromParent();for(const t of this.textures)t.dispose();}
}
