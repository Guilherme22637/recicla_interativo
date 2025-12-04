/* Recicla Interativo — script.js (corrigido)
   - Quiz 10 perguntas (embaralha ao finalizar)
   - Proteções null-safe
   - map.invalidateSize() para Leaflet em mobile
   - suporte Netlify + ids para JS
*/

/* Helpers */
const $ = id => document.getElementById(id);
const qsa = sel => document.querySelectorAll(sel);
const ls = (k,v) => v===undefined ? JSON.parse(localStorage.getItem(k)||'null') : localStorage.setItem(k, JSON.stringify(v));

/* Default city */
const BERT = { lat:-7.64123, lng:-43.9499, zoom:13 };

/* Default state with 10 quiz questions */
const defaultState = {
  users: [],
  currentUserId: null,
  quiz: [
    { q: "O que você deve fazer antes de reciclar uma embalagem plástica?", opts:["Abrandar com água e secar","Lavar e secar","Colocar no congelador"], a:1 },
    { q: "Vidros quebrados devem ser colocados na coleta seletiva comum?", opts:["Sim, normalmente","Não — separar e levar ao ecoponto","Sim, mas embrulhados em jornal"], a:1 },
    { q: "Qual item NÃO pertence à coleta de papel?", opts:["Caixas de papelão","Guardanapos engordurados","Jornal"], a:1 },
    { q: "Pilhas e baterias devem ser descartadas onde?", opts:["No lixo orgânico","Em pontos de coleta específicos","No coletor de plástico"], a:1 },
    { q: "Plástico PET normalmente é classificado como:", opts:["Reciclável","Não reciclável","Orgânico"], a:0 },
    { q: "O que é melhor fazer com restos de comida?", opts:["Jogar no lixo comum","Compostar quando possível","Colocar em sacos plásticos"], a:1 },
    { q: "Para reciclar papel com gordura (ex.: pizza) é melhor:", opts:["Reciclar normalmente","Fazer compostagem/descartar no orgânico","Lavar com água"], a:1 },
    { q: "Latas de alumínio devem estar:", opts:["Sujas","Amassadas e lavadas","Pintadas"], a:1 },
    { q: "Qual é uma ação que reduz consumo de energia em casa?", opts:["Manter portas e janelas fechadas com ar ligado","Trocar lâmpadas incandescentes por LED","Usar lâmpadas mais fortes sempre"], a:1 },
    { q: "O que contribui mais para reduzir poluição do ar localmente?", opts:["Usar transporte coletivo ou bicicleta","Andar mais de carro","Aumentar velocidade nas estradas"], a:0 }
  ],
  markers: [
    { title:"EcoPonto Central — Praça da Matriz", lat:-7.6410, lng:-43.9490 }
  ],
  support: [],
  visionKey: ''
};

/* storage */
function loadState(){
  const s = ls('ri_state');
  if(!s){ ls('ri_state', defaultState); return defaultState; }
  return s;
}
const store = (()=>{ let s = loadState(); return { get(){return s}, save(){ ls('ri_state', s); }, reset(){ localStorage.removeItem('ri_state'); location.reload(); } } })();

function genId(){ return 'id_'+Math.random().toString(36).slice(2,9); }

/* user */
function ensureGuest(){
  const s = store.get();
  if(!s.currentUserId){
    const u = { id:genId(), name:'Visitante', points:0, school:'', class:'', avatarData:'' };
    s.users.push(u); s.currentUserId = u.id; store.save();
  }
}
function curUser(){ return store.get().users.find(u=>u.id===store.get().currentUserId); }

/* init after DOM ready */
document.addEventListener('DOMContentLoaded', ()=> {
  ensureGuest();

  // small delay to ensure layout/render on GH Pages/mobile
  setTimeout(()=> {
    bindNav();
    bindControls();
    initMap();
    prepareQuiz(); // prepare/shuffle questions
    initMiniQuiz();
    initFullQuiz();
    renderProfile();
    renderLeaderboard();
    renderDashboard();
    renderSupportList();
  }, 60);
});

/* navigation */
function bindNav(){
  qsa('.nav-btn').forEach(b=> b.addEventListener('click', ()=> navTo(b.dataset.page)));
}
function navTo(page){
  qsa('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector(.nav-btn[data-page="${page}"])?.classList.add('active');
  qsa('.page').forEach(p=>p.classList.remove('active-page'));
  const el = $(page);
  if(el) el.classList.add('active-page');
  if($('pageTitle')) $('pageTitle').innerText = page.charAt(0).toUpperCase()+page.slice(1);
}

/* bind controls (null-safe) */
function bindControls(){
  if($('saveProfile')) $('saveProfile').addEventListener('click', saveProfile);
  if($('inputAvatarFile')) $('inputAvatarFile').addEventListener('change', e=> avatarUpload(e.target.files[0]));
  if($('quickClassify')) $('quickClassify').addEventListener('click', quickClassify);
  if($('fileInput')) $('fileInput').addEventListener('change', e=> handleFile(e.target.files[0], 'quick'));
  if($('fileInputFull')) $('fileInputFull').addEventListener('change', e=> handleFile(e.target.files[0], 'full'));
  qsa('.pill').forEach(b=> b.addEventListener('click', ()=> manualClassify(b.dataset.type)));
  if($('saveAction')) $('saveAction').addEventListener('click', saveAction);
  if($('genQRUser')) $('genQRUser').addEventListener('click', openQRForCurrentUser);
  if($('btnExport')) $('btnExport').addEventListener('click', exportData);
  if($('btnImport')) $('btnImport').addEventListener('click', ()=> $('importFile').click());
  if($('importFile')) $('importFile').addEventListener('change', importData);
  if($('resetAll')) $('resetAll').addEventListener('click', ()=> { if(confirm('Resetar dados locais?')) store.reset(); });
  if($('btnSendSupport')) $('btnSendSupport').addEventListener('click', sendSupport); // fallback local
  if($('btnClearSupport')) $('btnClearSupport').addEventListener('click', clearSupportForm);
  if($('mapMyLoc')) $('mapMyLoc').addEventListener('click', goToMyLocation);
  if($('mapSearchBtn')) $('mapSearchBtn').addEventListener('click', ()=> performGeocode($('mapSearch').value));
  if($('showSchoolsBtn')) $('showSchoolsBtn').addEventListener('click', fetchNearbySchools);
  if($('closeQR')) $('closeQR').addEventListener('click', ()=> $('qrModal').classList.add('hidden'));
  if($('downloadQR')) $('downloadQR').addEventListener('click', downloadQR);
  if($('logoutBtn')) $('logoutBtn').addEventListener('click', ()=> { if(confirm('Redefinir usuário local?')) { store.get().currentUserId = null; store.save(); location.reload(); }});
}

/* profile */
function renderProfile(){
  const u = curUser();
  if(!u) return;
  if($('profileNameLarge')) $('profileNameLarge').innerText = u.name;
  if($('profilePoints')) $('profilePoints').innerText = u.points || 0;
  if($('topPoints')) $('topPoints').innerText = u.points || 0;
  if($('userName')) $('userName').innerText = u.name;
  if($('inputName')) $('inputName').value = u.name;
  if($('inputSchool')) $('inputSchool').value = u.school || '';
  if($('inputClass')) $('inputClass').value = u.class || '';
  if($('inputVisionKey')) $('inputVisionKey').value = store.get().visionKey || '';
  if(u.avatarData && $('avatarImg')) { $('avatarImg').src = u.avatarData; $('avatarPreview') && $('avatarPreview').classList.add('hidden'); }
  else { if($('avatarPreview')) { $('avatarPreview').classList.remove('hidden'); $('avatarPreview').innerText = (u.name.charAt(0)||'V'); } }
}
function saveProfile(){ const u = curUser(); if(!u) return; u.name = $('inputName')?.value.trim() || 'Visitante'; u.school = $('inputSchool')?.value.trim(); u.class = $('inputClass')?.value.trim(); store.get().visionKey = $('inputVisionKey')?.value.trim() || ''; store.save(); renderProfile(); renderLeaderboard(); renderDashboard(); alert('Perfil salvo.'); }
function avatarUpload(file){ if(!file) return; const r=new FileReader(); r.onload = ()=>{ curUser().avatarData = r.result; store.save(); renderProfile(); }; r.readAsDataURL(file); }

/* classifier */
function handleFile(file, mode='quick'){ if(!file) return; const r=new FileReader(); r.onload = ()=>{ if(mode==='quick'){ $('quickResult') && ($('quickResult').innerText = 'Resultado: ' + heuristicFromFilename(file.name)); } else { if($('previewImage')) { $('previewImage').src = r.result; $('previewImage').classList.remove('hidden'); } if($('classifyResult')) $('classifyResult').innerText = 'Analisado (manual)'; if($('classifyTips')) $('classifyTips').innerText = 'Use Registrar ação ou QR.'; } }; r.readAsDataURL(file); }
function heuristicFromFilename(n){ const t=n.toLowerCase(); if(t.includes('plast')) return 'Plástico'; if(t.includes('vidro')||t.includes('glass')) return 'Vidro'; if(t.includes('papel')||t.includes('paper')) return 'Papel'; if(t.includes('metal')||t.includes('can')) return 'Metal'; return 'Desconhecido'; }
function manualClassify(type){ if($('classifyResult')) $('classifyResult').innerText = type; if($('classifyTips')) $('classifyTips').innerText = tipsFor(type); }
function quickClassify(){ const sel = $('quickSelect')?.value; if(!sel) return alert('Escolha um tipo.'); $('quickResult') && ($('quickResult').innerText = 'Resultado: '+sel); }
function tipsFor(c){ switch(c.toLowerCase()){ case 'papel': return 'Recicle papéis limpos e secos.'; case 'plástico': return 'Lave embalagens plásticas.'; case 'vidro': return 'Evite quebrar o vidro.'; case 'metal': return 'Latas limpas.'; case 'orgânico': return 'Compostagem recomendada.'; default: return 'Categoria desconhecida.'; } }
function saveAction(){ curUser().points = (curUser().points||0)+5; store.save(); renderProfile(); renderLeaderboard(); alert('Ação registrada! +5 pts'); }

/* QR */
function openQRForCurrentUser(){ const u = curUser(); if(!u) return; const text = ${u.name} | Pontos: ${u.points}; const canv = document.createElement('canvas'); QRCode.toCanvas(canv, text, {width:220}).then(()=>{ $('qrCanvas') && ($('qrCanvas').innerHTML=''); $('qrCanvas') && $('qrCanvas').appendChild(canv); $('qrModal') && $('qrModal').classList.remove('hidden'); if($('downloadQR')) $('downloadQR').dataset.url = canv.toDataURL('image/png'); }).catch(err=>console.error(err)); }
function downloadQR(){ const url = $('downloadQR')?.dataset.url; if(!url) return alert('Nenhum QR gerado'); const a=document.createElement('a'); a.href=url; a.download=qr_${curUser().name}.png; a.click(); }

/* mini quiz */
function initMiniQuiz(){ const qlist = store.get().quiz || []; if(!qlist.length) return; const q = qlist[Math.floor(Math.random()*qlist.length)]; if($('miniQuestion')) $('miniQuestion').innerText = q.q; const opts = $('miniOptions'); if(!opts) return; opts.innerHTML=''; q.opts.forEach((o,i)=>{ const b=document.createElement('button'); b.className='pill'; b.innerText=o; b.onclick = ()=>{ if(i===q.a){ curUser().points = (curUser().points||0)+3; store.save(); renderProfile(); renderLeaderboard(); alert('Correto! +3 pts'); } else alert('Errado!'); initMiniQuiz(); }; opts.appendChild(b); }); }

/* full quiz with shuffle */
let quizList = [];
let quizIndex = 0;

function prepareQuiz(){
  quizList = JSON.parse(JSON.stringify(store.get().quiz || []));
  shuffleArray(quizList);
  quizIndex = 0;
  if($('quizTotal')) $('quizTotal').innerText = quizList.length;
}

function shuffleArray(a){ for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

function initFullQuiz(){ if(!quizList.length) prepareQuiz(); renderQuizQuestion(); }

function renderQuizQuestion(){
  if(!quizList.length){ if($('quizQuestion')) $('quizQuestion').innerText = 'Nenhuma pergunta.'; return; }
  if(quizIndex >= quizList.length){ shuffleArray(quizList); quizIndex = 0; }
  const q = quizList[quizIndex];
  if($('quizQuestion')) $('quizQuestion').innerText = q.q;
  if($('quizIndex')) $('quizIndex').innerText = quizIndex+1;
  const cont = $('quizAnswers'); if(!cont) return; cont.innerHTML = '';
  q.opts.forEach((o,i)=>{ const b = document.createElement('button'); b.className='btn soft'; b.innerText = o; b.onclick = ()=>{ if(i===q.a){ curUser().points = (curUser().points||0)+10; store.save(); renderProfile(); renderLeaderboard(); alert('Acertou! +10 pts'); } else alert('Resposta incorreta.'); quizIndex++; renderQuizQuestion(); }; cont.appendChild(b); });
}

/* leaderboard */
function renderLeaderboard(){ const users = (store.get().users||[]).slice().sort((a,b)=> (b.points||0)-(a.points||0)); if($('leaderTop')) $('leaderTop').innerHTML = users.slice(0,5).map(u=><li>${u.name} <span class="muted">${u.points||0} pts</span></li>).join(''); renderRankingList(users); }
function renderRankingList(users){ if($('rankingList')) $('rankingList').innerHTML = users.map(u=><li>${u.name} <div><small class="muted">${u.school||'-'} / ${u.class||'-'}</small> <strong>${u.points||0} pts</strong></div></li>).join(''); }

/* dashboard */
function renderDashboard(){ const u = curUser(); if($('topPoints')) $('topPoints').innerText = u.points || 0; const groups = {}; (store.get().users||[]).forEach(us=> { if(us.school) groups[us.school] = (groups[us.school]||0) + (us.points||0); }); if($('schoolStats')) $('schoolStats').innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([k,v])=><div>${k}: <strong>${v} pts</strong></div>).join('') : "<div class='muted'>Nenhuma escola registrada</div>"; // small QR preview
  const canvas = document.createElement('canvas'); QRCode.toCanvas(canvas, ${u.name}, {width:110}).then(()=>{ if($('qrPreview')) { $('qrPreview').innerHTML=''; $('qrPreview').appendChild(canvas); } }).catch(()=>{}); }

/* export/import */
function exportData(){ const blob=new Blob([JSON.stringify(store.get(),null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='recicla_data.json'; a.click(); }
function importData(e){ const file = e.target.files[0]; if(!file) return; const r=new FileReader(); r.onload = ()=>{ try{ const json = JSON.parse(r.result); ls('ri_state', json); alert('Importado! Recarregando...'); location.reload(); } catch(err){ alert('Arquivo inválido'); } }; r.readAsText(file); }

/* support (Netlify form in HTML handles sending to Netlify). Keep local log too. */
function sendSupport(){ const name = $('supportName')? $('supportName').value.trim() : curUser().name; const email = $('supportEmail')? $('supportEmail').value.trim() : ''; const subj = $('supportSubject')? $('supportSubject').value.trim() : 'Suporte'; const msg = $('supportMsg')? $('supportMsg').value.trim() : ''; if(!msg) return alert('Escreva a mensagem.'); store.get().support.push({ id:genId(), name, email, subject:subj, msg, date:new Date().toISOString() }); store.save(); renderSupportList(); alert('Mensagem salva localmente (e enviada ao Netlify).'); }
function renderSupportList(){ const arr = store.get().support || []; if($('supportList')) $('supportList').innerHTML = arr.length ? arr.map(m=><div style="margin-bottom:8px;border-bottom:1px dashed rgba(255,255,255,0.03);padding-bottom:6px"><b>${m.subject}</b><div class="muted small">${m.name} • ${new Date(m.date).toLocaleString()}</div><div style="margin-top:6px">${m.msg}</div></div>).join('') : 'Nenhuma mensagem.'; }
function clearSupportForm(){ if($('supportName')) $('supportName').value=''; if($('supportEmail')) $('supportEmail').value=''; if($('supportSubject')) $('supportSubject').value=''; if($('supportMsg')) $('supportMsg').value=''; }

/* map */
let map, markerLayer;
function initMap(){
  try{
    map = L.map('mapCanvas').setView([BERT.lat,BERT.lng], BERT.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    renderMarkers();
    // delay to allow container sizing then invalidate size
    setTimeout(()=> { try{ map.invalidateSize(); }catch(e){} }, 120);
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos=>{ map.setView([pos.coords.latitude,pos.coords.longitude],13); L.circle([pos.coords.latitude,pos.coords.longitude],{radius:50,color:'#22c55e'}).addTo(markerLayer); renderNearby(pos.coords.latitude,pos.coords.longitude); }, ()=> renderNearby(BERT.lat,BERT.lng));
    } else renderNearby(BERT.lat,BERT.lng);
    map.on('click', e=>{ const title = prompt('Nome do ponto:','Novo Ponto'); if(!title) return; store.get().markers.push({ title, lat:e.latlng.lat, lng:e.latlng.lng }); store.save(); renderMarkers(); });
  }catch(e){ console.warn('Erro inicializando mapa', e); }
}
function renderMarkers(){ if(!markerLayer) markerLayer = L.layerGroup().addTo(map); markerLayer.clearLayers(); (store.get().markers||[]).forEach(m=> L.marker([m.lat,m.lng]).addTo(markerLayer).bindPopup(<b>${m.title}</b>)); }
function renderNearby(lat,lng){ const pts = (store.get().markers||[]).map(m=>{ m.dist = distanceKm(lat,lng,m.lat,m.lng); return m; }).filter(x=>x.dist<=50).sort((a,b)=>a.dist-b.dist); if($('nearbyList')) $('nearbyList').innerHTML = pts.length ? '<h4>Próximos pontos (até 50km):</h4>' + pts.map(p=><div>${p.title} — ${p.dist.toFixed(1)} km</div>).join('') : "<div class='muted'>Nenhum ponto próximo (até 50km).</div>"; }
function distanceKm(a,b,c,d){ const R=6371; const dLat=(c-a)Math.PI/180; const dLon=(d-b)*Math.PI/180; const x=Math.sin(dLat/2)2 + Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLon/2)*2; const c2=2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); return R*c2; }
async function performGeocode(query){ if(!query||!query.trim()) return alert('Digite um local para buscar.'); try{ const url = https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5; const r = await fetch(url); const data = await r.json(); if(!data.length) return alert('Local não encontrado'); const d = data[0]; map.setView([parseFloat(d.lat), parseFloat(d.lon)], 15); L.marker([d.lat, d.lon]).addTo(markerLayer).bindPopup(d.display_name).openPopup(); $('nearbyList') && ($('nearbyList').innerHTML = <h4>Resultados</h4>${data.map(dd=><div style="padding:6px;border-bottom:1px dashed rgba(255,255,255,0.03)"><b>${dd.display_name}</b></div>).join('')}); }catch(e){ console.error(e); alert('Erro ao buscar (Nominatim).'); } }
function goToMyLocation(){ if(!navigator.geolocation) return alert('Geolocalização não disponível'); navigator.geolocation.getCurrentPosition(pos=>{ map.setView([pos.coords.latitude,pos.coords.longitude],14); L.circle([pos.coords.latitude,pos.coords.longitude],{radius:50,color:'#22c55e'}).addTo(markerLayer); renderNearby(pos.coords.latitude,pos.coords.longitude); }, ()=> alert('Acesso à localização negado.')); }
async function fetchNearbySchools(){ try{ const query = 'Escola Bertolinia Piauí'; const url = https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=15; const r = await fetch(url); const data = await r.json(); if(!data.length) return alert('Nenhuma escola encontrada'); data.forEach(d=> store.get().markers.push({ title: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) })); store.save(); renderMarkers(); alert(${data.length} escolas adicionadas ao mapa.); }catch(e){ console.error(e); alert('Erro ao buscar escolas.'); } }

/* service worker */
if('serviceWorker' in navigator){ window.addEventListener('load', ()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); }); }
