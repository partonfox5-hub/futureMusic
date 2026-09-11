import * as T from 'three';
export function createTerrainMaterial(biome='meadow'){
  const m=new T.MeshStandardMaterial({roughness:.97,metalness:0});
  const grass=new T.Color(biome==='jungle'?0x526d35:biome==='beach'?0xb5a176:0x61773a);
  m.onBeforeCompile=s=>{
    s.uniforms.turfColor={value:grass};
    s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 terrainWorld; varying vec3 terrainNormal;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nterrainWorld=(modelMatrix*vec4(position,1.)).xyz; terrainNormal=normalize(mat3(modelMatrix)*normal);');
    s.fragmentShader=s.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 terrainWorld; varying vec3 terrainNormal; uniform vec3 turfColor;
      float th(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float tn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(th(i),th(i+vec3(1,0,0)),f.x),mix(th(i+vec3(0,1,0)),th(i+vec3(1,1,0)),f.x),f.y),
          mix(mix(th(i+vec3(0,0,1)),th(i+vec3(1,0,1)),f.x),mix(th(i+vec3(0,1,1)),th(i+vec3(1,1,1)),f.x),f.y),f.z);}
    `).replace('#include <color_fragment>',`#include <color_fragment>
      float slope=1.-abs(normalize(terrainNormal).y);
      float terrainPatch=tn(terrainWorld*.15), grain=tn(terrainWorld*7.5);
      float rock=smoothstep(.19,.43,slope+terrainPatch*.10);
      vec3 soil=vec3(.155,.112,.065),stone=vec3(.245,.237,.204);
      vec3 turf=mix(turfColor*.63,turfColor*1.16,terrainPatch);
      turf=mix(turf,soil,smoothstep(.62,.86,terrainPatch)*.55);
      vec3 base=mix(turf,stone*(.72+grain*.48),rock);
      // Derivative-filtered fine turf: fades before it can sparkle in stereo.
      vec2 leafUV=terrainWorld.xz*vec2(27.,41.);
      float aa=max(fwidth(leafUV.x),fwidth(leafUV.y));
      float leaf=sin(leafUV.x+sin(leafUV.y))*sin(leafUV.y*.71);
      diffuseColor.rgb*=base*(.86+grain*.27+leaf*.065*(1.-smoothstep(.3,1.2,aa))*(1.-rock));
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float micro=tn(terrainWorld*7.5)*.018;
      vec3 sx=dFdx(vViewPosition),sy=dFdy(vViewPosition);
      vec3 r1=cross(sy,normal),r2=cross(normal,sx);
      float det=dot(sx,r1);
      normal=normalize(max(abs(det),1.e-8)*normal-sign(det)*(dFdx(micro)*r1+dFdy(micro)*r2));
    `);
  };
  m.customProgramCacheKey=()=>`terrain-surface-1-${biome}`;return m;
}
