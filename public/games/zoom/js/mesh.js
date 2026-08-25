/** Voxelize the dug SDF and emit textured wall/floor meshes. */
import * as THREE from "three";
import { BIOMES, CELL, EYE } from "./config.js?v=psy3";
import { computeSdf, getTex, isCarved, sdf3 } from "./map.js?v=psy3";
import { allMaterials } from "./tex.js?v=psy3";

const VX = 0.42;

export function prepareSdf(map) {
  return computeSdf(map);
}

export function yMax(map) {
  let m = map.hallH || 4.2;
  for (const s of map.spheres) m = Math.max(m, (s.cy || s.r * 0.55) + s.r);
  let maxE = 0;
  let minE = 0;
  let sky = false;
  if (map.elev) {
    for (let i = 0; i < map.elev.length; i++) {
      if (map.elev[i] > maxE) maxE = map.elev[i];
      if (map.elev[i] < minE) minE = map.elev[i];
    }
  }
  if (map.sky) {
    for (let i = 0; i < map.sky.length; i++) if (map.sky[i]) sky = true;
  }
  // Sky courtyards keep the same wall height as halls, then open — a taller
  // voxel column just makes a trench. The lid is skipped in the mesher.
  return { max: maxE * EYE + m + (sky ? 0.35 : 0.8), min: minE * EYE - 1.8 };
}

export function buildDungeon(map, sdf2) {
  const group = new THREE.Group();
  group.name = "dungeon";
  const mats = allMaterials();
  const yr = yMax(map);
  const ymax = yr.max;
  const ymin = yr.min;
  const nx = Math.ceil((map.w * CELL) / VX);
  const nz = Math.ceil((map.h * CELL) / VX);
  const ny = Math.max(6, Math.ceil((ymax - ymin) / VX));

  let minx = nx, minz = nz, maxx = 0, maxz = 0;
  for (let z = 0; z < map.h; z++) {
    for (let x = 0; x < map.w; x++) {
      if (!isCarved(map.cells[z * map.w + x])) continue;
      const ix = Math.floor((x * CELL) / VX);
      const iz = Math.floor((z * CELL) / VX);
      if (ix < minx) minx = ix;
      if (iz < minz) minz = iz;
      if (ix > maxx) maxx = ix;
      if (iz > maxz) maxz = iz;
    }
  }
  for (const s of map.spheres) {
    const pad = Math.ceil((s.r + 0.5) / VX);
    const ix = Math.floor(s.x / VX);
    const iz = Math.floor(s.z / VX);
    minx = Math.min(minx, ix - pad);
    maxx = Math.max(maxx, ix + pad);
    minz = Math.min(minz, iz - pad);
    maxz = Math.max(maxz, iz + pad);
  }
  minx = Math.max(0, minx - 2);
  minz = Math.max(0, minz - 2);
  maxx = Math.min(nx - 1, maxx + 2);
  maxz = Math.min(nz - 1, maxz + 2);
  if (maxx < minx) return { group, sdf2, ymax };

  const wx = maxx - minx + 1;
  const wz = maxz - minz + 1;
  const empty = new Uint8Array(wx * ny * wz);
  const texOf = new Uint8Array(wx * ny * wz);
  const at = (ix, iy, iz) => ((iz - minz) * ny + iy) * wx + (ix - minx);

  for (let iz = minz; iz <= maxz; iz++) {
    for (let ix = minx; ix <= maxx; ix++) {
      const x = (ix + 0.5) * VX;
      const z = (iz + 0.5) * VX;
      const gx = Math.max(0, Math.min(map.w - 1, Math.floor(x / CELL)));
      const gz = Math.max(0, Math.min(map.h - 1, Math.floor(z / CELL)));
      const t = getTex(map.cells[gz * map.w + gx]);
      for (let iy = 0; iy < ny; iy++) {
        const y = ymin + (iy + 0.5) * VX;
        if (sdf3(x, y, z, map, sdf2) < 0) {
          const i = at(ix, iy, iz);
          empty[i] = 1;
          texOf[i] = t;
        }
      }
    }
  }

  const buckets = [];
  for (let i = 0; i < BIOMES.length; i++) {
    buckets.push({ w: [], f: [] });
  }
  const skyFloor = [];

  function uv(x, y, z, nx, ny, nz) {
    if (nx) return [z * 0.38, y * 0.38];
    if (ny) return [x * 0.38, z * 0.38];
    return [x * 0.38, y * 0.38];
  }
  function pushFace(list, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, nx, ny, nz) {
    list.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz);
    list._n = list._n || [];
    list._uv = list._uv || [];
    for (let k = 0; k < 6; k++) list._n.push(nx, ny, nz);
    const uvs = [ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz];
    for (let k = 0; k < 6; k++) {
      const p = uv(uvs[k * 3], uvs[k * 3 + 1], uvs[k * 3 + 2], nx, ny, nz);
      list._uv.push(p[0], p[1]);
    }
  }

  const dirs = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];

  for (let iz = minz; iz <= maxz; iz++) {
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = minx; ix <= maxx; ix++) {
        const i = at(ix, iy, iz);
        if (!empty[i]) continue;
        const t = texOf[i] % BIOMES.length;
        const x0 = ix * VX;
        const y0 = ymin + iy * VX;
        const z0 = iz * VX;
        const x1 = x0 + VX;
        const y1 = y0 + VX;
        const z1 = z0 + VX;
        for (const [dx, dy, dz] of dirs) {
          const nix = ix + dx;
          const niy = iy + dy;
          const niz = iz + dz;
          let neighborEmpty = false;
          if (niy >= 0 && niy < ny && nix >= minx && nix <= maxx && niz >= minz && niz <= maxz) {
            neighborEmpty = !!empty[at(nix, niy, niz)];
          }
          if (neighborEmpty) continue;
          const gx = Math.max(0, Math.min(map.w - 1, Math.floor(((ix + 0.5) * VX) / CELL)));
          const gz = Math.max(0, Math.min(map.h - 1, Math.floor(((iz + 0.5) * VX) / CELL)));
          const skyHere = !!(map.sky && map.sky[gz * map.w + gx]);
          const elevY = ((map.elev && map.elev[gz * map.w + gx]) || 0) * EYE;
          if (skyHere && dy === 1) continue;
          if (skyHere && dy !== -1 && y0 - elevY > 3.15) continue;
          const floorish = dy === -1;
          const list = skyHere && floorish ? skyFloor : floorish ? buckets[t].f : buckets[t].w;
          if (dx === 1) pushFace(list, x1, y0, z0, x1, y1, z0, x1, y1, z1, x1, y0, z1, -1, 0, 0);
          else if (dx === -1) pushFace(list, x0, y0, z1, x0, y1, z1, x0, y1, z0, x0, y0, z0, 1, 0, 0);
          else if (dy === 1) pushFace(list, x0, y1, z0, x0, y1, z1, x1, y1, z1, x1, y1, z0, 0, -1, 0);
          else if (dy === -1) pushFace(list, x0, y0, z0, x1, y0, z0, x1, y0, z1, x0, y0, z1, 0, 1, 0);
          else if (dz === 1) pushFace(list, x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1, 0, 0, -1);
          else pushFace(list, x0, y0, z0, x0, y1, z0, x1, y1, z0, x1, y0, z0, 0, 0, 1);
        }
      }
    }
  }

  function meshFrom(list, mat) {
    if (!list.length) return;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(list, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(list._n, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(list._uv, 2));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  for (let t = 0; t < BIOMES.length; t++) {
    meshFrom(buckets[t].w, mats[t].wall);
    meshFrom(buckets[t].f, mats[t].floor);
  }
  meshFrom(skyFloor, new THREE.MeshLambertMaterial({ color: 0x4a7a38 }));

  return { group, sdf2, ymax, mats };
}
