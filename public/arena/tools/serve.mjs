import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2),port=Number(args[args.indexOf('--port')+1])||Number(process.env.PORT)||4173;
const root=path.resolve(fs.existsSync('dist/index.html')?'dist':'.');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp4':'video/mp4','.json':'application/json','.txt':'text/plain'};
http.createServer((req,res)=>{let route;try{route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  const name=path.resolve(root,'.'+route+(route.endsWith('/')?'index.html':''));if(!name.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.stat(name,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(name)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});fs.createReadStream(name).pipe(res);});
}).listen(port,'0.0.0.0',()=>console.log(`Battle Sphere preview listening on ${port}`));
