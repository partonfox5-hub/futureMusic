/* node --experimental-vm-modules tests/source-integrity.cjs */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(process.env.H5_PROJECT||path.join(__dirname,'..'));
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','H5-docs','H5-test-results'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(js|mjs)$/.test(e.name))files.push(p);}}walk(root);
let imports=0;
for(const file of files){const source=fs.readFileSync(file,'utf8'),m=new vm.SourceTextModule(source,{identifier:file});for(const spec of m.dependencySpecifiers){if(spec.startsWith('.')){const target=path.resolve(path.dirname(file),spec.split(/[?#]/)[0]);assert(fs.existsSync(target),`${path.relative(root,file)}: missing ${spec}`);imports++;}}}
const report={parsedModules:files.length,resolvedRelativeImports:imports,questHardwareTested:false,checkedAt:new Date().toISOString()};
if(process.env.H5_RESULTS){fs.mkdirSync(process.env.H5_RESULTS,{recursive:true});fs.writeFileSync(path.join(process.env.H5_RESULTS,'source-integrity.json'),JSON.stringify(report,null,2));}console.log('PASS',JSON.stringify(report));
