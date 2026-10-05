import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(process.env.MODULE_TEST_DIR || fileURLToPath(new URL('../release/token-studio/',import.meta.url)));
const {assetPath}=await import(pathToFileURL(path.join(root,'scripts/asset-path.js')));
const catalog=JSON.parse(await readFile(new URL('../src/frame-catalog.json',import.meta.url),'utf8'));

test('caminhos do pacote aceitam pasta com ou sem barra, prefixo e URL absoluta',()=>{
  for(const base of ['/assets','/modules/token-studio/assets','/vtt/modules/token-studio/assets','https://example.com/vtt/modules/token-studio/assets']){
    for(const suffix of ['', '/', '///']){
      assert.equal(assetPath(base+suffix,'/frames/example.webp'),base+'/frames/example.webp');
      assert.equal(assetPath(base+suffix),base+'/');
    }
  }
});

test('todos os originais e miniaturas do ZIP são servidos pelas rotas usadas pelo editor',async()=>{
  const files=['pilot.png','frame-silver.png',...catalog.flatMap(entry=>[entry.file,entry.thumb])];
  const bytes=new Map(await Promise.all(files.map(async file=>[file,await readFile(path.join(root,'assets',file))])));
  const server=createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const prefix=['/modules/token-studio/assets/','/vtt/modules/token-studio/assets/'].find(p=>pathname.startsWith(p));
    const file=prefix && pathname.slice(prefix.length),data=bytes.get(file);
    if(!data){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':file.endsWith('.webp')?'image/webp':'image/png'});res.end(data);
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const origin=`http://127.0.0.1:${server.address().port}`;
  try {
    for(const base of ['/modules/token-studio/assets/','/vtt/modules/token-studio/assets']){
      for(const file of files){
        const response=await fetch(origin+assetPath(base,file));
        assert.equal(response.status,200,`Imagem indisponível: ${assetPath(base,file)}`);
        assert.match(response.headers.get('content-type'),/^image\//);
        const data=Buffer.from(await response.arrayBuffer());
        assert.deepEqual(data,bytes.get(file),`Bytes alterados: ${file}`);
        assert(file.endsWith('.webp') ? data.subarray(0,4).toString()==='RIFF' && data.subarray(8,12).toString()==='WEBP' : data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),`Formato inválido: ${file}`);
      }
    }
  } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
