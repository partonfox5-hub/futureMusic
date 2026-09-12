/**
 * Furniture pack — meshes, grab/mass, and collision obstacles.
 * No Mira, guns, cars, or lighting.
 *
 *   import {createFurnitureWorld, tagMovable, detailToilet} from './mira-furniture.js';
 */
import * as T from 'three';
export {
  FURNITURE, DENSITY, FURNITURE_MIX, blendedDensity,
  furnitureRoot, syncFurniture, tagMovable, cloneFurniture,
  captureFurniture, placeFurniture, placeStairs
} from './mira-v2-furniture.js?v=19.3.0';
export {
  detailToilet, detailFridge, detailMicrowave, detailSink, detailBathtub,
  detailLamp, detailTvStand, detailBed, detailNightstand, detailDresser,
  detailBookshelf, detailDesk, detailBarStool, detailCabinet, detailMirror,
  detailCounter, detailCoffee, detailTable
} from './mira-v2-furnish.js?v=19.3.0';
export {installPiano, SONGS} from './mira-v2-piano.js?v=19.3.0';
export {Destruction} from './mira-v2-destruction.js?v=19.3.0';
export {HUMAN5, ASTRA_RULES, briefFor, sessionPrompt} from './mira-context.js';

/** Minimal world so furniture can spawn and occupy obstacles without the house. */
export function createFurnitureWorld(scene){
 const root=new T.Group();scene.add(root);
 const world={
  root, scene, movables:[], obstacles:[], pickables:[], seats:[], stairs:[], revision:0, gravity:9.81, extent:20,
  mat(c,r=.85){return new T.MeshStandardMaterial({color:c,roughness:r,metalness:0});},
  mesh(g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o;},
  obstacle(x,z,w,d,y=0,h=1,object=null){const o={x,z,w,d,y,h,object};this.obstacles.push(o);if(object){object.userData.obstacle=o;this.pickables.push(object);}return o;},
  removeObstacle(o){this.obstacles=this.obstacles.filter(x=>x!==o);},
  fractures:{register(mesh,kind){world.pickables.push(mesh);return {health:80,maxHealth:80,mesh,kind};}}
 };
 return world;
}
