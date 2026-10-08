(() => {
  const form=document.querySelector('#academy-search');
  const queryInput=document.querySelector('#city');
  const countrySelect=document.querySelector('#country');
  const stateSelect=document.querySelector('#state');
  const citySelect=document.querySelector('#city-filter');
  const grid=document.querySelector('#branch-grid');
  const resultCount=document.querySelector('#result-count');
  const empty=document.querySelector('#empty-results');
  const errorPanel=document.querySelector('#catalog-error');
  const reset=document.querySelector('#reset-search');
  const pagination=document.querySelector('#directory-pagination');
  const previous=document.querySelector('#previous-page');
  const next=document.querySelector('#next-page');
  const pageNumber=document.querySelector('#page-number');
  const pageRange=document.querySelector('#page-range');
  const controls=[...form.querySelectorAll('input,select,button')];
  const pageSize=12;
  const headquarters=new Set(['16','219']);
  const brazilStates={AC:'Acre',AL:'Alagoas',AP:'Amapá',AM:'Amazonas',BA:'Bahia',CE:'Ceará',DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',MT:'Mato Grosso',MS:'Mato Grosso do Sul',MG:'Minas Gerais',PA:'Pará',PB:'Paraíba',PR:'Paraná',PE:'Pernambuco',PI:'Piauí',RJ:'Rio de Janeiro',RN:'Rio Grande do Norte',RS:'Rio Grande do Sul',RO:'Rondônia',RR:'Roraima',SC:'Santa Catarina',SP:'São Paulo',SE:'Sergipe',TO:'Tocantins'};
  let branches=[],filtered=[],page=1,loaded=false,registryStarted=false;
  const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
  const compare=(a,b)=>a.localeCompare(b,'pt-BR');
  function cityLabel(value){if(value===value.toUpperCase()||value===value.toLowerCase())return value.toLocaleLowerCase('pt-BR').replace(/(^|\s)(\p{L})/gu,match=>match.toLocaleUpperCase('pt-BR')).replace(/\b(Da|De|Do|Das|Dos|Del|E)\b/g,word=>word.toLowerCase());return value;}
  function stateLabel(value){return brazilStates[value]?`${brazilStates[value]} (${value})`:value;}
  function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
  function link(label,href){const node=element('a','',label);node.href=href;if(!href.startsWith('tel:')){node.target='_blank';node.rel='noopener noreferrer';}return node;}
  function externalUrl(raw){const value=String(raw??'').trim();if(!value||/\s/.test(value)||!(/^(https?:\/\/|www\.)/i.test(value)||/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(value)))return null;try{const url=new URL(/^https?:\/\//i.test(value)?value:`https://${value}`);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return null;return url.href;}catch{return null;}}
  function socialUrl(raw,network){const value=String(raw??'').trim();const direct=externalUrl(value);if(direct){const host=new URL(direct).hostname;if(host===`${network}.com`||host.endsWith(`.${network}.com`))return direct;return null;}const handle=value.replace(/^@/,'');return /^[a-z0-9._]{1,100}$/i.test(handle)?`https://www.${network}.com/${encodeURIComponent(handle)}/`:null;}
  function telephone(raw,country){let digits=raw.replace(/\D/g,'');if(digits.length<6)return null;if(/^\s*\+/.test(raw))return `tel:+${digits}`;if(digits.startsWith('00'))return `tel:+${digits.slice(2)}`;const prefixes={Brasil:'55',Argentina:'54',Chile:'56','Colômbia':'57',Paraguai:'595'};if(country==='Brasil'){if(digits.startsWith('0')&&digits.length>11)digits=digits.slice(1);if(digits.startsWith('55')&&digits.length>=12)return `tel:+${digits}`;if(digits.length===10||digits.length===11)return `tel:+55${digits}`;}if(country!=='Brasil'&&prefixes[country]&&digits.startsWith(prefixes[country])&&digits.length>=10)return `tel:+${digits}`;return `tel:${digits}`;}
  function createCard(branch){
    const card=element('article','branch');card.dataset.branchId=branch.id;const body=element('div','branch-body');
    const top=element('div','branch-top');top.append(element('span','tag',headquarters.has(branch.id)?'MATRIZ':'ACADEMIA'),element('span','branch-state',[cityLabel(branch.city),branch.state,branch.country].filter(Boolean).join(' / ')));
    body.append(top,element('h3','',branch.name));
    if(branch.teacher)body.append(element('p','branch-teacher',`Prof. ${branch.teacher}`));
    const address=element('p','branch-address');address.append(document.createTextNode(branch.address),document.createElement('br'),document.createTextNode([branch.neighborhood,cityLabel(branch.city),branch.state].filter(Boolean).join(' · ')));body.append(address);
    const details=element('details');const summary=element('summary','','Conheça a unidade ');const plus=element('span','','+');plus.setAttribute('aria-hidden','true');summary.append(plus);details.append(summary);
    const content=element('div','branch-detail');content.append(element('p','','Converse com a academia sobre horários e sua primeira aula.'));
    const seenPhones=new Set();for(const phone of branch.phones??[]){const phoneKey=phone.replace(/\D/g,'');const href=telephone(phone,branch.country);if(href&&!seenPhones.has(phoneKey)){seenPhones.add(phoneKey);content.append(link(`Ligar: ${phone}`,href));}}
    const mapQuery=[branch.address,branch.neighborhood,branch.city,branch.state,branch.country].filter(Boolean).join(', ');if(branch.address)content.append(link('Ver endereço no mapa',`https://www.google.com/maps/search/?${new URLSearchParams({api:'1',query:mapQuery})}`));
    const website=externalUrl(branch.website);if(website)content.append(link('Visitar site da unidade',website));
    const instagram=socialUrl(branch.instagram,'instagram')||(/^@/.test(branch.website??'')?socialUrl(branch.website,'instagram'):null);if(instagram&&instagram!==website)content.append(link('Instagram da unidade',instagram));
    const facebook=socialUrl(branch.facebook,'facebook');if(facebook&&facebook!==website)content.append(link('Facebook da unidade',facebook));
    if(branch.website&&!website&&!instagram)content.append(element('p','contact-reference',`Referência informada: ${branch.website}`));
    details.append(content);body.append(details);if(window.CheckmatBranchGallery)card.append(window.CheckmatBranchGallery.createCover(branch));card.append(body);return card;
  }
  function fillSelect(select,entries,allLabel){const value=select.value;const placeholder=new Option(allLabel,'');select.replaceChildren(placeholder,...entries.map(([key,label])=>new Option(label,key)));select.value=entries.some(([key])=>key===value)?value:'';}
  function updateStateOptions(){const subset=branches.filter(branch=>!countrySelect.value||branch.country===countrySelect.value);const states=[...new Set(subset.map(branch=>branch.state).filter(Boolean))].sort((a,b)=>compare(stateLabel(a),stateLabel(b)));fillSelect(stateSelect,states.map(state=>[state,stateLabel(state)]),'Todos os estados / regiões');}
  function updateCityOptions(){const subset=branches.filter(branch=>(!countrySelect.value||branch.country===countrySelect.value)&&(!stateSelect.value||branch.state===stateSelect.value));const cities=new Map();for(const branch of subset){const key=normalize(branch.city);if(key&&!cities.has(key))cities.set(key,cityLabel(branch.city));}fillSelect(citySelect,[...cities.entries()].sort((a,b)=>compare(a[1],b[1])),'Todas as cidades');}
  function renderPage(){
    const count=filtered.length;const pages=Math.max(1,Math.ceil(count/pageSize));page=Math.max(1,Math.min(page,pages));const start=(page-1)*pageSize;grid.replaceChildren(...filtered.slice(start,start+pageSize).map(createCard));
    resultCount.textContent=count===1?'1 academia encontrada':`${count.toLocaleString('pt-BR')} academias encontradas`;empty.hidden=count!==0;pagination.hidden=count<=pageSize;previous.disabled=page===1;next.disabled=page===pages;pageNumber.textContent=`${page} de ${pages}`;pageRange.textContent=`Mostrando ${start+1}–${Math.min(start+pageSize,count)} de ${count}`;
    reset.hidden=!queryInput.value&&!countrySelect.value&&!stateSelect.value&&!citySelect.value;
  }
  function filterAcademies(resetPage=true){if(!loaded)return;const words=normalize(queryInput.value).split(' ').filter(Boolean);filtered=branches.filter(branch=>(!countrySelect.value||branch.country===countrySelect.value)&&(!stateSelect.value||branch.state===stateSelect.value)&&(!citySelect.value||normalize(branch.city)===citySelect.value)&&words.every(word=>branch.searchText.includes(word)));if(resetPage)page=1;renderPage();}
  function clearFilters(){queryInput.value='';countrySelect.value='';stateSelect.value='';citySelect.value='';updateStateOptions();updateCityOptions();filterAcademies();queryInput.focus();}
  form.addEventListener('submit',event=>{event.preventDefault();filterAcademies();});queryInput.addEventListener('input',()=>filterAcademies());countrySelect.addEventListener('change',()=>{stateSelect.value='';citySelect.value='';updateStateOptions();updateCityOptions();filterAcademies();});stateSelect.addEventListener('change',()=>{citySelect.value='';updateCityOptions();filterAcademies();});citySelect.addEventListener('change',()=>filterAcademies());reset.addEventListener('click',clearFilters);document.querySelector('#show-all').addEventListener('click',clearFilters);
  function changePage(delta){page+=delta;renderPage();resultCount.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  previous.addEventListener('click',()=>changePage(-1));next.addEventListener('click',()=>changePage(1));document.querySelector('#retry-catalog').addEventListener('click',loadCatalog);
  function registerSearchTool(){if(registryStarted||!document.modelContext?.registerTool)return;registryStarted=true;const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});try{Promise.resolve(document.modelContext.registerTool({name:'filter_checkmat_academies',title:'Buscar academias Checkmat',description:'Filtra o catálogo por texto, país, estado/região e cidade. Atualiza os resultados visíveis. Não agenda aulas nem envia mensagens.',inputSchema:{type:'object',properties:{query:{type:'string',maxLength:200},country:{type:'string'},state:{type:'string'},city:{type:'string'}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['query','country','state','city'].includes(key))||Object.values(input).some(value=>typeof value!=='string')||(input.query?.length??0)>200)throw new Error('Filtros inválidos.');const country=input.country??'',state=input.state??'',city=normalize(input.city??'');if(country&&!branches.some(branch=>branch.country===country))throw new Error('País não encontrado.');const subset=branches.filter(branch=>(!country||branch.country===country)&&(!state||branch.state===state)&&(!city||normalize(branch.city)===city));if((state||city)&&!subset.length)throw new Error('Localização não encontrada.');queryInput.value=input.query??'';countrySelect.value=country;stateSelect.value='';citySelect.value='';updateStateOptions();stateSelect.value=state;updateCityOptions();citySelect.value=city;filterAcademies();return{count:filtered.length,pageSize,academies:filtered.map(({id,name,country,state,city})=>({id,name,country,state,city}))};}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}
  async function loadCatalog(){
    controls.forEach(control=>control.disabled=true);grid.setAttribute('aria-busy','true');errorPanel.hidden=true;empty.hidden=true;pagination.hidden=true;resultCount.textContent='Carregando academias…';
    try{const response=await fetch('data/branches.json',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Catalog unavailable');const data=await response.json();if(!Array.isArray(data.branches)||!data.branches.length||data.branches.some(branch=>typeof branch.id!=='string'||typeof branch.name!=='string'||!branch.name||!Array.isArray(branch.phones)))throw new Error('Invalid catalog');
      branches=data.branches.map(branch=>({...branch,searchText:normalize([branch.name,branch.teacher,branch.address,branch.neighborhood,branch.city,branch.state,brazilStates[branch.state],branch.country].filter(Boolean).join(' '))})).sort((a,b)=>Number(headquarters.has(b.id))-Number(headquarters.has(a.id))||Number(b.country==='Brasil')-Number(a.country==='Brasil')||compare(a.country,b.country)||compare(a.state,b.state)||compare(a.city,b.city)||compare(a.name,b.name));
      loaded=true;const countries=[...new Set(branches.map(branch=>branch.country).filter(Boolean))].sort(compare);fillSelect(countrySelect,countries.map(country=>[country,country]),'Todos os países');updateStateOptions();updateCityOptions();controls.forEach(control=>control.disabled=false);document.querySelector('#catalog-total').textContent=branches.length.toLocaleString('pt-BR');document.querySelector('#catalog-countries').textContent=countries.length;document.querySelector('#directory-overview').hidden=false;
      const source=document.querySelector('#catalog-source');const date=new Date(data.retrievedAt);source.replaceChildren(document.createTextNode(`Catálogo consultado em ${date.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}. `),link('Fonte: Checkmat Brasil',data.source));source.hidden=false;filterAcademies();registerSearchTool();
    }catch{loaded=false;grid.replaceChildren();document.querySelector('#directory-overview').hidden=true;document.querySelector('#catalog-source').hidden=true;reset.hidden=true;resultCount.textContent='Catálogo indisponível no momento.';errorPanel.hidden=false;}
    finally{grid.setAttribute('aria-busy','false');}
  }
  loadCatalog();
})();