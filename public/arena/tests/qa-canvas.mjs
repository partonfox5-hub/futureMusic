import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let mod;try{mod=require('@napi-rs/canvas');}catch{const modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules';try{mod=require(modules+'/@napi-rs/canvas');}catch{throw Error('Optional graphics QA needs npm install (the hosted game needs no npm packages).');}}
export const createCanvas=mod.createCanvas;
