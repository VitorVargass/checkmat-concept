import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let sharp;try{sharp=createRequire(import.meta.url)('sharp');}catch{const modules=process.env.CHECKMAT_NODE_MODULES||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');sharp=createRequire(path.join(modules,'entry.cjs'))('sharp');}
sharp.concurrency(1);
const dataPath=path.join(root,'dist/data/branches.json');
const data=JSON.parse(await fs.readFile(dataPath,'utf8'));
const failures=[];const jobs=[];const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(const branch of data.branches){branch.sourcePhotos=[...new Set(branch.sourcePhotos??[])];branch.photos??=[];for(const [index,url] of branch.sourcePhotos.entries())jobs.push({branch,index,url});}
let cursor=0,done=0,reused=0;
async function syncPhoto({branch,index,url}){
  if(!/^\d+$/.test(branch.id))throw new Error('Invalid branch ID');
  const parsed=new URL(url);if(parsed.protocol!=='https:'||!['checkmatbrasil.com.br','www.checkmatbrasil.com.br'].includes(parsed.hostname)||!parsed.pathname.startsWith('/filial/imagens/academias/'))throw new Error('Invalid source image');
  const cached=branch.photos.find(photo=>photo.sourceUrl===url);
  if(cached&&await fs.access(path.join(root,'dist',cached.src)).then(()=>true).catch(()=>false)&&await fs.access(path.join(root,'dist',cached.full)).then(()=>true).catch(()=>false)){reused++;return cached;}
  let response;
  for(let attempt=0;attempt<2;attempt++){try{response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(20000)});if([429,500,502,503,504].includes(response.status)&&attempt===0){await response.body?.cancel();await sleep(800);continue;}break;}catch(error){if(attempt===1)throw error;await sleep(500);}}
  if(!response.ok){await response.body?.cancel();throw new Error(`HTTP ${response.status}`);}
  const length=Number(response.headers.get('content-length')??0);if(length>8_000_000){await response.body?.cancel();throw new Error('Image too large');}
  const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>8_000_000)throw new Error('Image too large');chunks.push(chunk);}const buffer=Buffer.concat(chunks);
  const image=sharp(buffer,{limitInputPixels:40_000_000,failOn:'error'});const meta=await image.metadata();if(!['jpeg','png','webp','gif'].includes(meta.format)||!meta.width||!meta.height)throw new Error('Unsupported image');
  const folder=path.join(root,'dist/assets/branches',branch.id);await fs.mkdir(folder,{recursive:true});
  const thumbName=`${index+1}-thumb.webp`,fullName=`${index+1}-full.webp`;
  const thumb=await image.clone().rotate().resize({width:640,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:73,effort:4}).toFile(path.join(folder,thumbName));
  const full=await image.clone().rotate().resize({width:1400,height:1400,fit:'inside',withoutEnlargement:true}).webp({quality:80,effort:4}).toFile(path.join(folder,fullName));
  return{sourceUrl:url,src:`assets/branches/${branch.id}/${thumbName}`,full:`assets/branches/${branch.id}/${fullName}`,width:thumb.width,height:thumb.height,fullWidth:full.width,fullHeight:full.height,bytes:thumb.size+full.size};
}
const results=new Map(data.branches.map(branch=>[branch.id,[]]));
console.log(JSON.stringify({phase:'Syncing branch photos',branches:data.branches.length,photoReferences:jobs.length}));
await Promise.all(Array.from({length:3},async()=>{while(cursor<jobs.length){const job=jobs[cursor++];try{const photo=await syncPhoto(job);results.get(job.branch.id).push({index:job.index,photo});}catch(error){failures.push({branchId:job.branch.id,sourceUrl:job.url,reason:error.message});}done++;if(done%150===0)console.log(JSON.stringify({completed:done,total:jobs.length,unavailable:failures.length}));await sleep(80);}}));
for(const branch of data.branches){branch.photos=results.get(branch.id).sort((a,b)=>a.index-b.index).map(entry=>entry.photo);branch.photoStatus=branch.photos.length?'available':branch.sourcePhotos.length?'unavailable':'not_provided';}
const summary={syncedAt:new Date().toISOString(),branches:data.branches.length,photoReferences:jobs.length,availablePhotos:data.branches.reduce((total,branch)=>total+branch.photos.length,0),branchesWithPhotos:data.branches.filter(branch=>branch.photos.length).length,branchesWithoutPhotos:data.branches.filter(branch=>!branch.photos.length).length,branchesWithoutReferences:data.branches.filter(branch=>!branch.sourcePhotos.length).length,unavailableReferences:failures.length,reused,optimizedBytes:data.branches.reduce((total,branch)=>total+branch.photos.reduce((bytes,photo)=>bytes+(photo.bytes??0),0),0),failuresByReason:Object.fromEntries([...new Set(failures.map(failure=>failure.reason))].map(reason=>[reason,failures.filter(failure=>failure.reason===reason).length]))};
data.photoCoverage=summary;
await fs.writeFile(dataPath,JSON.stringify(data,null,2)+'\n');await fs.mkdir(path.join(root,'docs'),{recursive:true});await fs.writeFile(path.join(root,'docs/photo-import-summary.json'),JSON.stringify({...summary,failures},null,2)+'\n');console.log(JSON.stringify(summary));