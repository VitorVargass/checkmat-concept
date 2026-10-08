import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='https://checkmatbrasil.com.br/checkmat/';
const clean=value=>{const text=String(value??'').normalize('NFC').replace(/\s+/g,' ').trim();return /^(null|undefined|-)$/i.test(text)?'':text;};
const normalize=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const countryNames={argentina:'Argentina',brasil:'Brasil',chile:'Chile',colombia:'Colômbia',paraguai:'Paraguai'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let requests=0;
async function query(endpoint,body){for(let attempt=0;attempt<3;attempt++){try{requests++;const response=await fetch(new URL(endpoint,base),{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();if(!Array.isArray(data))throw new Error('Unexpected catalog response');return data;}catch(error){if(attempt===2)throw new Error(`${endpoint}: ${error.message}`);await sleep(500*(attempt+1));}}}
async function concurrent(items,operation){let cursor=0;const results=new Array(items.length);await Promise.all(Array.from({length:2},async()=>{while(cursor<items.length){const index=cursor++;results[index]=await operation(items[index]);await sleep(80);}}));return results;}
const count=await query('graduacao/php/AcademiaContar.php');
const countries=await query('php/LoadSelFilialPais.php');
const stateGroups=await concurrent(countries,async country=>{const states=await query('php/LoadSelFilialEstado.php',{PAIS:country.PAIS});return states.map(state=>({country:country.PAIS,state:state.ESTADO}));});
const areas=stateGroups.flat();
const cityGroups=await concurrent(areas,async area=>{const cities=await query('php/LoadSelFilialCidade.php',{ESTADO:area.state});return cities.map(city=>({...area,city:city.CIDADE}));});
const locations=cityGroups.flat();
console.log(JSON.stringify({phase:'Geography collected',countries:countries.length,states:areas.length,cityQueries:locations.length,reportedTotal:Number(count[0].qtde_academia)}));
const records=await concurrent(locations,async location=>query('php/FilialListAll.php',{PAIS:location.country,ESTADO:location.state,CIDADE:location.city}));
const fields=['ID_FILIAL','NOME_FILIAL','NOME_PROFESSOR','TEL1','TEL2','SITE','FACEBOOK','INSTAGRAM','ENDERECO','BAIRRO','CIDADE','ESTADO','PAIS','FOTO1','FOTO2','FOTO3'];
const unique=new Map();let repeatedIds=0;
for(const raw of records.flat()){const record=Object.fromEntries(fields.map(field=>[field,clean(raw[field])]));const key=record.ID_FILIAL||[record.NOME_FILIAL,record.PAIS,record.ESTADO,record.CIDADE,record.ENDERECO].map(normalize).join('|');if(unique.has(key)){repeatedIds++;continue;}unique.set(key,record);}
const branches=[...unique.values()].map(record=>{const country=countryNames[normalize(record.PAIS)]||record.PAIS;let state=record.ESTADO;if(country==='Brasil'){state=({bahia:'BA',paraiba:'PB'})[normalize(state)]||state.toUpperCase();}return{id:record.ID_FILIAL,name:record.NOME_FILIAL,teacher:record.NOME_PROFESSOR,phones:[record.TEL1,record.TEL2].filter((phone,index,all)=>phone&&all.indexOf(phone)===index),website:record.SITE,facebook:record.FACEBOOK,instagram:record.INSTAGRAM,address:record.ENDERECO,neighborhood:record.BAIRRO,city:record.CIDADE,country,state,sourcePhotos:[record.FOTO1,record.FOTO2,record.FOTO3].filter(Boolean).map(value=>{try{const url=new URL(value,base);return url.protocol==="https:"&&["checkmatbrasil.com.br","www.checkmatbrasil.com.br"].includes(url.hostname)&&url.pathname.startsWith("/filial/imagens/academias/")?url.href:null;}catch{return null;}}).filter((value,index,all)=>value&&all.indexOf(value)===index)};});
branches.sort((a,b)=>a.country.localeCompare(b.country,'pt-BR')||a.state.localeCompare(b.state,'pt-BR')||a.city.localeCompare(b.city,'pt-BR')||a.name.localeCompare(b.name,'pt-BR'));
const previous=await fs.readFile(path.join(root,'dist/data/branches.json'),'utf8').then(JSON.parse).catch(()=>({branches:[]}));
const previousById=new Map(previous.branches.map(branch=>[branch.id,branch]));
for(const branch of branches){branch.photos=(previousById.get(branch.id)?.photos??[]).filter(photo=>branch.sourcePhotos.includes(photo.sourceUrl));}
const reportedTotal=Number(count[0].qtde_academia);
const dataset={source:new URL('/',base).origin+'/checkmat/',retrievedAt:new Date().toISOString(),reportedTotal,count:branches.length,coverage:{selectorCombinations:locations.length,uniquePublishedRecords:branches.length,counterDifference:reportedTotal-branches.length},countries:[...new Set(branches.map(branch=>branch.country))].sort((a,b)=>a.localeCompare(b,'pt-BR')),branches};
const summary={reportedTotal,importedCount:branches.length,byCountry:Object.fromEntries(dataset.countries.map(country=>[country,branches.filter(branch=>branch.country===country).length])),cityQueries:locations.length,requests,repeatedIds,missingName:branches.filter(branch=>!branch.name).length,missingCity:branches.filter(branch=>!branch.city).length,missingAddress:branches.filter(branch=>!branch.address).length,branchesWithPhotoReferences:branches.filter(branch=>branch.sourcePhotos.length).length,photoReferences:branches.reduce((total,branch)=>total+branch.sourcePhotos.length,0)};
await fs.writeFile(path.join(root,'dist/data/branches.json'),JSON.stringify(dataset,null,2)+'\n');
await fs.writeFile(path.join(root,'.preview/reference/import-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
if(branches.length!==reportedTotal){console.error('Imported catalog count differs from the public counter. Review before describing it as complete.');process.exitCode=2;}