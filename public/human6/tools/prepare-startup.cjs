/* node --experimental-vm-modules tools/prepare-startup.cjs
 * Emit modulepreload URLs for the startup static graph. No runtime build tool. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),seen=new Set();
function scan(spec,from){let url;
 if(spec==='three')url=new URL('./vendor/three/three.module.js', 'https://human6.local/');
 else if(spec.startsWith('three/addons/'))url=new URL('./vendor/three/addons/'+spec.slice(13),'https://human6.local/');
 else if(spec.startsWith('.'))url=new URL(spec,from);else return;
 if(seen.has(url.href))return;seen.add(url.href);
 const file=path.join(root,decodeURIComponent(url.pathname));if(!fs.existsSync(file))throw Error('Missing '+file);
 const mod=new vm.SourceTextModule(fs.readFileSync(file,'utf8'));for(const dep of mod.dependencySpecifiers)scan(dep,url.href);
}
for(const file of ['mira-boot.js','engine.js'])scan('./'+file+'?v=20.3.0','https://human6.local/index.html');
const urls=[...seen].map(s=>'.'+new URL(s).pathname+new URL(s).search);fs.writeFileSync(path.join(root,'startup-modules.json'),JSON.stringify(urls,null,2)+'\n');console.log('Prepared',urls.length,'local startup modules');
