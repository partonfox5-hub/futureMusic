import * as T from 'three';

/** One-level offscreen passes. Restore the renderer even when a shader/render throws. */
export function withOffscreenView(renderer, hidden, draw) {
  if (renderer.userData?.h5OffscreenDepth) return false;
  renderer.userData ??= {};
  const state = {
    xr: renderer.xr.enabled, target: renderer.getRenderTarget(),
    face: renderer.getActiveCubeFace?.() || 0, mip: renderer.getActiveMipmapLevel?.() || 0,
    viewport: renderer.getViewport(new T.Vector4()), scissor: renderer.getScissor(new T.Vector4()),
    scissorTest: renderer.getScissorTest(), autoClear: renderer.autoClear,
    shadowAuto: renderer.shadowMap.autoUpdate, shadowNeeds: renderer.shadowMap.needsUpdate
  };
  const visibility = [...new Set(hidden.filter(Boolean))].map(o => [o, o.visible]);
  renderer.userData.h5OffscreenDepth = 1;
  try {
    renderer.xr.enabled = false;
    renderer.shadowMap.autoUpdate = renderer.shadowMap.needsUpdate = false;
    renderer.autoClear = true;
    renderer.setScissorTest(false);
    visibility.forEach(([o]) => o.visible = false);
    draw();
    return true;
  } finally {
    visibility.forEach(([o, v]) => o.visible = v);
    renderer.setRenderTarget(state.target, state.face, state.mip);
    renderer.setViewport(state.viewport); renderer.setScissor(state.scissor);
    renderer.setScissorTest(state.scissorTest); renderer.autoClear = state.autoClear;
    renderer.shadowMap.autoUpdate = state.shadowAuto;
    renderer.shadowMap.needsUpdate = state.shadowNeeds;
    renderer.xr.enabled = state.xr;
    renderer.userData.h5OffscreenDepth = 0;
  }
}

const flip = new T.Matrix4().makeRotationY(Math.PI);
export function portalTransfer(fromMatrix, toMatrix, out = new T.Matrix4()) {
  return out.copy(toMatrix).multiply(flip).multiply(fromMatrix.clone().invert());
}

/** Clip the remote view against the exit, preserving asymmetric XR projections. */
export function clipPortalCamera(camera, exitMatrix, bias = .002) {
  const point = new T.Vector3().setFromMatrixPosition(exitMatrix);
  const normal = new T.Vector3(0, 0, 1).transformDirection(exitMatrix);
  const plane = new T.Plane().setFromNormalAndCoplanarPoint(normal, point)
    .applyMatrix4(camera.matrixWorldInverse);
  const clip = new T.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant - bias);
  const m = camera.projectionMatrix.elements;
  const q = new T.Vector4(((Math.sign(clip.x) || 1) + m[8]) / m[0],
    ((Math.sign(clip.y) || 1) + m[9]) / m[5], -1, (1 + m[10]) / m[14]);
  const dot = clip.dot(q);
  if (!Number.isFinite(dot) || Math.abs(dot) < 1e-7) return false;
  clip.multiplyScalar(2 / dot);
  m[2] = clip.x; m[6] = clip.y; m[10] = clip.z + 1; m[14] = clip.w;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  return true;
}

export function mapPortalCamera(camera, source, fromMatrix, toMatrix) {
  const transfer = portalTransfer(fromMatrix, toMatrix);
  camera.matrixAutoUpdate = camera.matrixWorldAutoUpdate = false;
  camera.matrixWorld.copy(transfer).multiply(source.matrixWorld);
  camera.matrix.copy(camera.matrixWorld);
  camera.matrixWorld.decompose(camera.position, camera.quaternion, camera.scale);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  camera.projectionMatrix.copy(source.projectionMatrix);
  camera.layers.mask = source.layers.mask;
  camera.near = source.near; camera.far = source.far;
  clipPortalCamera(camera, toMatrix);
  // Projective lookup on the portal plane is the virtual camera's clip space.
  // Multiplying by `transfer` again double-warped the image off the surface.
  return new T.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
}

export function scopeFov(zoom, baseFov = 55) {
  return T.MathUtils.radToDeg(2 * Math.atan(Math.tan(T.MathUtils.degToRad(baseFov / 2)) / zoom));
}
