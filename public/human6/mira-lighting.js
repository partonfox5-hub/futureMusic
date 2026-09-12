/**
 * Lighting pack — authored studio lights, PMREM environment, XR light estimation.
 *
 *   import {createStudioLights, RoomLight} from './mira-lighting.js';
 */
export {createStudioLights, RoomLight} from './mira-v2-light.js?v=19.3.0';
export {HUMAN5, ASTRA_RULES, briefFor, sessionPrompt} from './mira-context.js';

export const LIGHTING = {
  three: '0.170.0',
  toneMapping: 'ACESFilmic',
  exposure: 1.05,
  environmentIntensity: 0.65,
  files: [
    'mira-lighting.js',
    'mira-v2-light.js',
    'engine.js',
    'mira-v2-house.js',
    'mira-v2-weather.js'
  ]
};
