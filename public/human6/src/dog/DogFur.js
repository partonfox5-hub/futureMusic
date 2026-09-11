import * as THREE from 'three';
let softTexture=null,softNormal=null,softOwners=0;
const ASSET_ROOT=new URL('../../assets/dog/',import.meta.url);

export class DogFur {
  constructor(model,renderer,pawMaterial){
    this.model=model;this.time=0;this.wet=0;this.rippleStrength=0;this.touch=new THREE.Vector3(99,99,99);this.uniforms=[];this.layers=[];this.textures=[];this.disposed=false;
    if(model.breed){this.installSoftCoat(model);return;}
    const xr=renderer?.xr;this.shellCount=1;const loader=typeof document!=='undefined'?new THREE.TextureLoader():null;
    const placeholder=(rgb,space)=>{const t=new THREE.DataTexture(new Uint8Array([...rgb,255]),1,1);t.colorSpace=space;t.needsUpdate=true;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;};
    const load=(name,tex,color=false)=>{
      this.textures.push(tex);if(!loader)return tex;
      const img=new Image();
      img.onload=()=>{if(this.disposed)return;tex.image=img;tex.isDataTexture=false;tex.flipY=true;tex.generateMipmaps=true;tex.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;tex.needsUpdate=true;};
      img.onerror=()=>{this.failedMaps.add(name);if(name==='fur_albedo_v2.jpg'&&!img.dataset.fallback){img.dataset.fallback='1';img.src=new URL('fur_albedo.jpg',ASSET_ROOT).href;}};
      img.src=new URL(name,ASSET_ROOT).href;
      tex.anisotropy=Math.min(4,renderer?.capabilities?.getMaxAnisotropy?.()||1);
      return tex;
    };
    this.failedMaps=new Set();
    const albedo=placeholder([255,255,255],THREE.SRGBColorSpace);
    const normal=placeholder([128,128,255],THREE.NoColorSpace);
    const roughness=placeholder([200,200,200],THREE.NoColorSpace);
    const flow=placeholder([128,128,128],THREE.NoColorSpace);
    const pad=placeholder([40,30,24],THREE.SRGBColorSpace);
    load('fur_albedo_v2.jpg',albedo,true);load('fur_normal.jpg',normal);load('fur_roughness.jpg',roughness);load('fur_flow.jpg',flow);
    Object.assign(model.coat,{map:albedo,normalMap:normal,roughnessMap:roughness,roughness:.88,vertexColors:true});
    model.coat.normalScale.set(.12,.12);model.coat.needsUpdate=true;
    if(pawMaterial){pawMaterial.map=pad;pawMaterial.needsUpdate=true;load('paw_pad.jpg',pad,true);}
    const nose=placeholder([200,200,200],THREE.SRGBColorSpace);if(model.noseMaterial){model.noseMaterial.map=nose;model.noseMaterial.needsUpdate=true;load('nose.jpg',nose,true);}
    this.flow=flow;const sources=[...model.furMeshes];
    for(let layer=1;layer<=1;layer++){
      const material=model.coat.clone();material.name=`Dog_FurShell_${layer}`;material.alphaHash=false;material.side=THREE.FrontSide;material.depthWrite=true;material.transparent=false;material.roughness=.94;
      material.onBeforeCompile=shader=>{
        shader.uniforms.h5FurTime={value:0};shader.uniforms.h5FurWet={value:0};shader.uniforms.h5FurTouch={value:this.touch};shader.uniforms.h5FurRipple={value:0};this.uniforms.push(shader.uniforms);shader.uniforms.dogShell={value:.0024};shader.uniforms.dogFlow={value:flow};shader.uniforms.dogLayer={value:layer};
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float dogShell,h5FurTime,h5FurWet,h5FurRipple;uniform vec3 h5FurTouch; attribute float dogFurLength; varying vec2 dogFurUV;');
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat h5Ripple=sin(length(position-h5FurTouch)*55.0-h5FurTime*10.0)*exp(-length(position-h5FurTouch)*9.0)*h5FurRipple;transformed += normal * (dogShell*(1.0-h5FurWet*.7)*dogFurLength+h5Ripple*.0015); dogFurUV = uv;');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
          uniform sampler2D dogFlow; uniform float dogLayer,h5FurWet; varying vec2 dogFurUV;
          float dogHash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <alphahash_fragment>',`
          vec2 flowDir=texture2D(dogFlow,dogFurUV).rg*2.0-1.0;
          vec2 uvGroom=dogFurUV+flowDir*dogLayer*.003;
          vec2 strandUV=uvGroom*vec2(840.0,210.0);
          float detail=1.0-smoothstep(.35,1.5,max(fwidth(strandUV.x),fwidth(strandUV.y)));
          float strands=sin(strandUV.x*6.28318+sin(strandUV.y*6.28318)*.32);
          if(detail>.35&&strands<-.65)discard;
          diffuseColor.rgb*=mix(1.0,.78,h5FurWet)*(1.0+strands*detail*.025);
          diffuseColor.a=1.0;`);

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
      material.customProgramCacheKey=()=>`h5-soft-fur-17.2-${layer}`;model.materials.add(material);
      for(const source of sources){
        const shell=new THREE.SkinnedMesh(source.geometry,material);shell.name=`${source.name}_fur_${layer}`;shell.bind(model.skeleton,new THREE.Matrix4());shell.frustumCulled=false;shell.castShadow=false;shell.receiveShadow=true;model.root.add(shell);this.layers.push({mesh:shell,layer});
      }
    }
    // Two optional tufts are represented by tiny groomed cards, never runtime strands.
    // Short coat silhouette is continuous; no large neck or tail fringe cards.
  }
  installSoftCoat(model){
    // One opaque skin draw. Microscopic directional fibers are derivative-filtered;
    // no stacked shells, alpha overdraw, or dozens of coarse fur cards.
    softOwners++;this.softOwner=true;if(!softTexture&&typeof document!=='undefined'){softTexture=new THREE.TextureLoader().load(new URL('fur_albedo_v2.jpg',ASSET_ROOT).href);softTexture.wrapS=softTexture.wrapT=THREE.RepeatWrapping;softTexture.colorSpace=THREE.NoColorSpace;softNormal=new THREE.TextureLoader().load(new URL('fur_normal.jpg',ASSET_ROOT).href);softNormal.wrapS=softNormal.wrapT=THREE.RepeatWrapping;softNormal.repeat.set(5,3);}
    const mat=model.coat;mat.roughness=.86;mat.normalMap=softNormal;mat.normalScale.set(.20,.20);mat.onBeforeCompile=s=>{
      Object.assign(s.uniforms,{h5CoatMap:{value:softTexture},h5CoatTime:{value:0},h5CoatWet:{value:0},h5CoatTouch:{value:this.touch},h5CoatRipple:{value:0}});this.uniforms.push(s.uniforms);
      s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 h5CoatP;uniform vec3 h5CoatTouch;uniform float h5CoatTime,h5CoatRipple,h5CoatWet;');
      s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        h5CoatP=position;float r=length(position-h5CoatTouch);transformed+=normal*sin(r*65.0-h5CoatTime*13.0)*exp(-r*12.0)*h5CoatRipple*.0014;`);
      s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 h5CoatP;uniform sampler2D h5CoatMap;uniform float h5CoatWet;');
      s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        vec2 strand=vec2(h5CoatP.x*1900.0+h5CoatP.z*500.0,h5CoatP.y*850.0);float fiberLod=1.0-smoothstep(.6,2.4,max(fwidth(strand.x),fwidth(strand.y)));
        float fiber=sin(strand.x+sin(strand.y)*.45)*sin(strand.y*.13);
        vec3 coatSample=texture2D(h5CoatMap,h5CoatP.zy*8.0).rgb;float softFiber=dot(coatSample,vec3(.333));diffuseColor.rgb*=.82+softFiber*.34;diffuseColor.rgb*=mix(1.0,.73,h5CoatWet)*(1.0+fiber*fiberLod*.055);`);
      s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.51,h5CoatWet);');
    };mat.customProgramCacheKey=()=> 'h5-short-coat-17.9';
    this.shellCount=0;
  }
  tuft(name,p,width,height,bone){
    const g=new THREE.PlaneGeometry(width,height,3,4);g.rotateY(Math.PI);g.translate(...p);this.model.skin(g,bone);
    const m=this.model.coat.clone();m.side=THREE.DoubleSide;m.alphaHash=true;m.transparent=false;m.depthWrite=true;
    m.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 dogTuftUV;').replace('#include <begin_vertex>','#include <begin_vertex>\ndogTuftUV=uv;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 dogTuftUV;');s.fragmentShader=s.fragmentShader.replace('#include <alphahash_fragment>',`float fringe=0.12+0.80*abs(sin(dogTuftUV.x*49.0)); if(dogTuftUV.y<fringe*.55 || abs(dogTuftUV.x-.5)>.50*dogTuftUV.y)discard; diffuseColor.a=.58;\n#include <alphahash_fragment>`);};
    m.customProgramCacheKey=()=>`dog-tuft-r170`;this.model.materials.add(m);const mesh=this.model.mesh(name,g,m);mesh.castShadow=false;
  }
  rebindLayers(){this.layers=[];this.model.root.traverse(mesh=>{if(mesh.isMesh&&mesh.material.name.startsWith('Dog_FurShell_'))this.layers.push({mesh,layer:Number(mesh.material.name.split('_').at(-1))});});}
  setLayers(n){this.shellCount=n<=0?0:1;for(const {mesh,layer} of this.layers)mesh.visible=layer<=this.shellCount;}
  setWetness(v){this.wet=THREE.MathUtils.clamp(v,0,1);this.model.coat.roughness=.88-this.wet*.28;}
  ripple(worldPoint){this.model.root.updateWorldMatrix(true,false);this.touch.copy(this.model.root.worldToLocal(worldPoint.clone()));this.rippleStrength=.65;}
  tick(dt,renderer){this.time+=Math.min(.05,dt);this.rippleStrength*=Math.exp(-dt*3);for(const u of this.uniforms){if(u.h5CoatTime){u.h5CoatTime.value=this.time;u.h5CoatWet.value=this.wet;u.h5CoatRipple.value=this.rippleStrength;}else{u.h5FurTime.value=this.time;u.h5FurWet.value=this.wet;u.h5FurRipple.value=this.rippleStrength;}}}
  dispose(){this.disposed=true;if(this.softOwner&&--softOwners===0){softTexture?.dispose();softNormal?.dispose();softTexture=softNormal=null;}for(const {mesh} of this.layers)mesh.removeFromParent();for(const t of this.textures)t.dispose();}
}
