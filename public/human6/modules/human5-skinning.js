import * as T from 'three';
const base=new T.Vector3();
/** Same linear blend skinning as SkinnedMesh; uses the already updated bone palette.
 * Call skeleton.update() once after posing, before a batch of contact queries.
 * Morph target evaluation remains Three's implementation.
 */
export function paletteSkinnedVertex(mesh,index,out){
  const attributes=mesh.geometry.attributes;if(attributes.skinWeight.normalized||attributes.skinIndex.normalized||attributes.skinWeight.isInterleavedBufferAttribute||attributes.skinIndex.isInterleavedBufferAttribute)return T.SkinnedMesh.prototype.getVertexPosition.call(mesh,index,out);
  T.Mesh.prototype.getVertexPosition.call(mesh,index,base);base.applyMatrix4(mesh.bindMatrix);
  const g=mesh.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,b=mesh.skeleton.boneMatrices;
  const x=base.x,y=base.y,z=base.z;let ox=0,oy=0,oz=0;
  for(let j=0;j<4;j++){const weight=sw.array[index*4+j];if(!weight)continue;const k=si.array[index*4+j]*16;
    ox+=weight*(b[k]*x+b[k+4]*y+b[k+8]*z+b[k+12]);
    oy+=weight*(b[k+1]*x+b[k+5]*y+b[k+9]*z+b[k+13]);
    oz+=weight*(b[k+2]*x+b[k+6]*y+b[k+10]*z+b[k+14]);
  }return out.set(ox,oy,oz).applyMatrix4(mesh.bindMatrixInverse);
}
