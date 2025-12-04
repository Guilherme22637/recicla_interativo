/* script.js — Quiz 10 perguntas (embaralha ao final) + Netlify Forms suporte + QR + mapa etc. */

/* Helpers */
const $ = id => document.getElementById(id);
const qsa = sel => document.querySelectorAll(sel);
const ls = (k,v) => v===undefined ? JSON.parse(localStorage.getItem(k)||'null') : localStorage.setItem(k, JSON.stringify(v));

/* Default state */
const BERT = { lat:-7.64123, lng:-43.9499, zoom:13 };

const defaultState = {
  users: [],
  currentUserId: null,
  quiz: [
    // 8 reciclagem/discards
    { q: "O que você deve fazer antes de reciclar uma embalagem plástica?", opts:["Abrandar com água e secar","Lavar e secar","Colocar no congelador"], a:1 },
    { q: "Vidros quebrados devem ser colocados na coleta seletiva comum?", opts:["Sim, normalmente","Não — separar e levar ao ecoponto","Sim, mas embrulhados em jornal"], a:1 },
    { q: "Qual item NÃO pertence à coleta de papel?", opts:["Caixas de papelão","Guardanapos engordurados","Jornal"], a:1 },
    { q: "Pilhas e baterias devem ser descartadas onde?", opts:["No lixo orgânico","Em pontos de coleta específicos","No coletor de plástico"], a:1 },
    { q: "Plástico PET normalmente é classificado como:", opts:["Reciclável","Não reciclável","Orgânico"], a:0 },
    { q: "O que é melhor fazer com restos de comida?", opts:["Jogar no lixo comum","Compostar quando possível","Colocar em sacos plásticos"], a:1 },
    { q: "Para reciclar papel com gordura (ex.: pizza) é melhor:", opts:["Reciclar normalmente","Fazer compostagem/descartar no orgânico","Lavar com água"], a:1 },
    { q: "Latas de alumínio devem estar:", opts:["Sujas","Amassadas e lavadas","Pintadas"], a:1 },

    // 2 sustentabilidade/energia/poluição
    { q: "Qual é uma ação que reduz consumo de energia em casa?", opts:["Manter portas e janelas fechadas com ar ligado","Trocar lâmpadas incandescentes por LED","Usar lâmpadas mais fortes sempre"], a:1 },
    { q: "O que contribui mais para reduzir poluição do ar localmente?", opts:["Usar transporte coletivo ou bicicleta","Andar mais de carro","Aumentar velocidade nas estradas"], a:0 }
  ],
  markers: [
    { title:"EcoPonto Central — Praça da Matriz", lat:-7.6410, lng:-43.9490 }
  ],
  support: [],
  visionKey: ''
};

/* State load/save */
function loadState(){
  const s = ls('ri_state');
  if(!s){ ls('ri_state', defaultState); return defaultState; }
  return s;
}
const store = (() => { let s = loadState(); return { get(){return s}, save(){ ls('ri_state', s); }, reset(){ localStorage.removeItem('ri_state'); location.reload(); } } })();

function genId(){ return 'id_'+Math.random().toString(36).slice(2,9); }

/* User */
function ensureGuest(){
  const st = store.get();
  if(!st.currentUserId){
    const u = { id:genId(), name:'Visitante', points:0, school:'', class:'', avatarData:'' };
    st.users.push(u);
    st.currentUserId = u.id;
    store.save();
  }
}
function curUser(){ return store.get().users.find(u=>u.id===store.get().currentUserId); }

/* Init */
document.addEventListener('DOMContentLoaded', ()=>{
  ensureGuest();
  bindNav();
  bindControls();
  initMap();
  prepareQuiz();      // shuffle initially
  initMiniQuiz();
  initFullQuiz();
  renderProfile();
  renderLeaderboard();
  renderDashboard();
  renderSupportList();
});

/* NAV */
function bindNav(){
  qsa('.nav-btn').forEach(b=> b.addEventListener('click', ()=> navTo(b.dataset.page)));
}
function navTo(page){
  qsa('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-page="${page}"]`)?.classList.add('active');
  qsa('.page').forEach(p=>p.classList.remove('active-page'));
  $(page).classList.add('active-page');
  $('pageTitle').innerText = page.charAt(0).toUpperCase()+page.slice(1);
}

/* Controls binding */
function bindControls(){
  $('quickClassify').addEventListener('click', quickClassify);
  $('fileInput').addEventListener('change', e=> handleFile(e.target.files[0],'quick'));
  $('fileInputFull').addEventListener('change', e=> handleFile(e.target.files[0],'full'));
  qsa('.pill').forEach(b=>b.addEventListener('click', ()=> manualClassify(b.dataset.type)));
  $('saveAction').addEventListener('click', saveAction);
  $('genQRUser').addEventListener('click', openQRForCurrentUser);
  $('saveProfile').addEventListener('click', saveProfile);
  $('inputAvatarFile').addEventListener('change', e=> avatarUpload(e.target.files[0]));
  $('btnExport').addEventListener('click', exportData);
  $('btnImport').addEventListener('click', ()=> $('importFile').click());
  $('importFile').addEventListener('change', importData);
  $('resetAll').addEventListener('click', ()=> { if(confirm('Resetar dados locais?')) store.reset(); });
  $('btnSendSupport')?.addEventListener('click', sendSupport); // optional (Netlify form used)
  $('btnClearSupport')?.addEventListener('click', clearSupportForm);
  $('mapSearchBtn').addEventListener('click', ()=> performGeocode($('mapSearch').value));
  $('mapMyLoc').addEventListener('click', ()=> goToMyLocation());
  $('showSchoolsBtn').addEventListener('click', ()=> fetchNearbySchools());
  $('toggleTheme').addEventListener('click', ()=> { /* keep theme fixed - no change */ });
  $('logoutBtn').addEventListener('click', ()=> { if(confirm('Redefinir usuário local?')) { store.get().currentUserId = null; store.save(); location.reload(); }});
  $('closeQR').addEventListener('click', ()=> $('qrModal').classList.add('hidden'));
  $('downloadQR').addEventListener('click', downloadQR);
}

/* Profile */
function renderProfile(){
  const u = curUser();
  if(!u) return;
  $('profileNameLarge').innerText = u.name;
  $('profilePoints').innerText = u.points || 0;
  $('topPoints').innerText = u.points || 0;
  $('userName').innerText = u.name;
  $('inputName').value = u.name;
  $('inputSchool').value = u.school || '';
  $('inputClass').value = u.class || '';
  $('inputVisionKey').value = store.get().visionKey || '';
  if(u.avatarData){ $('avatarImg').src = u.avatarData; $('avatarPreview').classList.add('hidden'); } else { $('avatarImg').src=''; $('avatarPreview').classList.remove('hidden'); $('avatarPreview').innerText = (u.name.charAt(0)||'V'); }
}
function saveProfile(){ const u = curUser(); u.name = $('inputName').value.trim() || 'Visitante'; u.school = $('inputSchool').value.trim(); u.class = $('inputClass').value.trim(); store.get().visionKey = $('inputVisionKey').value.trim(); store.save(); renderProfile(); renderLeaderboard(); renderDashboard(); alert('Perfil salvo.'); }
function avatarUpload(file){ if(!file) return; const r = new FileReader(); r.onload = ()=>{ curUser().avatarData = r.result; store.save(); renderProfile(); }; r.readAsDataURL(file); }

/* Classifier */
function handleFile(file, mode='quick'){ if(!file) return; const r=new FileReader(); r.onload=()=>{ if(mode==='quick'){ $('quickResult').innerText = 'Resultado: '+heuristicFromFilename(file.name); } else { $('previewImage').src = r.result; $('previewImage').classList.remove('hidden'); $('classifyResult').innerText='Analisado (manual)'; $('classifyTips').innerText='Use Registrar ação ou gerar QR.'; } }; r.readAsDataURL(file); }
function heuristicFromFilename(n){ const l=n.toLowerCase(); if(l.includes('plast')) return 'Plástico'; if(l.includes('vidro')||l.includes('glass')) return 'Vidro'; if(l.includes('papel')||l.includes('paper')) return 'Papel'; if(l.includes('metal')||l.includes('can')) return 'Metal'; return 'Desconhecido'; }
function manualClassify(type){ $('classifyResult').innerText = type; $('classifyTips').innerText = tipsFor(type); }
function quickClassify(){ const v=$('quickSelect').value; if(!v) return alert('Escolha um tipo.'); $('quickResult').innerText='Resultado: '+v; }
function tipsFor(t){ switch(t.toLowerCase()){ case 'papel': return 'Recicle papéis limpos e secos.'; case 'plástico': return 'Lave embalagens plásticas.'; case 'vidro': return 'Evite quebrar o vidro.'; case 'metal': return 'Latas limpas.'; case 'orgânico': return 'Use em compostagem.'; default: return 'Categoria indefinida.'; } }
function saveAction(){ curUser().points = (curUser().points||0)+5; store.save(); renderProfile(); renderLeaderboard(); alert('Ação registrada. +5 pts'); }

/* QR */
function openQRForCurrentUser(){ const u=curUser(); const text=`${u.name} | Pontos: ${u.points}`; const canv=document.createElement('canvas'); QRCode.toCanvas(canv,text,{width:220}).then(()=>{ $('qrCanvas').innerHTML=''; $('qrCanvas').appendChild(canv); $('qrModal').classList.remove('hidden'); $('downloadQR').dataset.url = canv.toDataURL('image/png'); }); }
function downloadQR(){ const url = $('downloadQR').dataset.url; if(!url) return; const a=document.createElement('a'); a.href=url; a.download=`qr_${curUser().name}.png`; a.click(); }

/* MINIQ (dashboard) */
function initMiniQuiz(){ const qlist = store.get().quiz; if(!qlist || !qlist.length) return; const q = qlist[Math.floor(Math.random()*qlist.length)]; $('miniQuestion').innerText = q.q; const opts=$('miniOptions'); opts.innerHTML=''; q.opts.forEach((o,i)=>{ const b=document.createElement('button'); b.className='pill'; b.innerText=o; b.onclick=()=>{ if(i===q.a){ curUser().points += 3; store.save(); renderProfile(); renderLeaderboard(); alert('Correto! +3 pts'); } else alert('Errado!'); initMiniQuiz(); }; opts.appendChild(b); }); }

/* QUIZ 10 perguntas (ciclo com embaralhamento) */
let quizList = [];
let quizIndex = 0;

function prepareQuiz(){
  // copy questions from state and shuffle
  quizList = JSON.parse(JSON.stringify(store.get().quiz || []));
  shuffleArray(quizList);
  quizIndex = 0;
  $('quizTotal').innerText = quizList.length;
}

function shuffleArray(a){
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

function initFullQuiz(){
  if(!quizList.length) prepareQuiz();
  renderQuizQuestion();
}

function renderQuizQuestion(){
  if(quizIndex >= quizList.length){
    // finished -> reshuffle and restart
    shuffleArray(quizList);
    quizIndex = 0;
  }
  const q = quizList[quizIndex];
  $('quizQuestion').innerText = q.q;
  $('quizIndex').innerText = quizIndex+1;
  const answers = $('quizAnswers'); answers.innerHTML='';
  q.opts.forEach((o,i)=>{
    const b = document.createElement('button');
    b.className='btn soft';
    b.innerText = o;
    b.onclick = ()=>{
      if(i===q.a){ curUser().points = (curUser().points||0)+10; store.save(); renderProfile(); renderLeaderboard(); alert('Acertou! +10 pts'); }
      else alert('Resposta incorreta.');
      quizIndex++;
      renderQuizQuestion();
    };
    answers.appendChild(b);
  });
}

/* Leaderboard */
function renderLeaderboard(){
  const users = (store.get().users||[]).slice().sort((a,b)=> (b.points||0)-(a.points||0));
  $('leaderTop').innerHTML = users.slice(0,5).map(u=>`<li>${u.name} <span class="muted">${u.points||0} pts</span></li>`).join('');
  renderRankingList(users);
}
function renderRankingList(users){ $('rankingList').innerHTML = users.map(u=>`<li>${u.name} <div><small class="muted">${u.school||'-'} / ${u.class||'-'}</small> <strong>${u.points||0} pts</strong></div></li>`).join(''); }

/* Export / Import */
function exportData(){ const blob=new Blob([JSON.stringify(store.get(),null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='recicla_data.json'; a.click(); }
function importData(e){ const file=e.target.files[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{ try{ const json=JSON.parse(r.result); ls('ri_state', json); alert('Importado! Recarregando...'); location.reload(); }catch(err){ alert('Arquivo inválido'); } }; r.readAsText(file); }

/* Support — note: using Netlify form in HTML, but keep local log too */
function sendSupport(){
  // fallback local (if used)
  const name = $('supportName')? $('supportName').value.trim() : curUser().name;
  const email = $('supportEmail'? $('supportEmail').value.trim() : '');
  const subj = $('supportSubject'? $('supportSubject').value.trim() : 'Suporte');
  const msg = $('supportMsg'? $('supportMsg').value.trim() : '');
  if(msg){
    store.get().support.push({ id:genId(), name, email, subj, msg, date:new Date().toISOString() });
    store.save();
    renderSupportList();
  }
}
function renderSupportList(){ const arr = store.get().support || []; $('supportList').innerHTML = arr.length ? arr.map(m=>`<div style="margin-bottom:8px;border-bottom:1px dashed rgba(255,255,255,0.03);padding-bottom:6px"><b>${m.subj}</b><div class="muted small">${m.name} • ${new Date(m.date).toLocaleString()}</div><div style="margin-top:6px">${m.msg}</div></div>`).join('') : 'Nenhuma mensagem.'; }
function clearSupportForm(){ if($('supportName')) $('supportName').value=''; if($('supportEmail')) $('supportEmail').value=''; if($('supportSubject')) $('supportSubject').value=''; if($('supportMsg')) $('supportMsg').value=''; }

/* MAP */
let map, markerLayer;
function initMap(){
  try{
    map = L.map('mapCanvas').setView([BERT.lat,BERT.lng], BERT.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    renderMarkers();
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(pos=>{ map.setView([pos.coords.latitude,pos.coords.longitude],13); L.circle([pos.coords.latitude,pos.coords.longitude],{radius:50,color:'#22c55e'}).addTo(markerLayer); renderNearby(pos.coords.latitude,pos.coords.longitude); }, ()=> renderNearby(BERT.lat,BERT.lng));
    } else renderNearby(BERT.lat,BERT.lng);
    map.on('click', e=>{ const t = prompt('Título do ponto:','Novo Ponto'); if(!t) return; store.get().markers.push({title:t, lat:e.latlng.lat, lng:e.latlng.lng}); store.save(); renderMarkers(); });
  }catch(e){ console.warn('Erro inicializando mapa',e); }
}
function renderMarkers(){ markerLayer.clearLayers(); (store.get().markers||[]).forEach(m=> L.marker([m.lat,m.lng]).addTo(markerLayer).bindPopup(`<b>${m.title}</b>`)); }
function renderNearby(lat,lng){ const pts=(store.get().markers||[]).map(m=>{ m.dist = distanceKm(lat,lng,m.lat,m.lng); return m; }).filter(m=>m.dist<=50).sort((a,b)=>a.dist-b.dist); $('nearbyList').innerHTML = pts.length ? '<h4>Próximos pontos (até 50km):</h4>' + pts.map(p=>`<div>${p.title} — ${p.dist.toFixed(1)} km</div>`).join('') : '<div class="muted">Nenhum ponto próximo (até 50km).</div>'; }
function distanceKm(lat1,lon1,lat2,lon2){ const R=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180; const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2; const c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); return R*c; }
async function performGeocode(query){ if(!query||!query.trim()) return alert('Digite um local para buscar.'); const url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`; try{ const r=await fetch(url); const data=await r.json(); if(!data||!data.length) return alert('Local não encontrado.'); const first=data[0]; map.setView([parseFloat(first.lat), parseFloat(first.lon)], 15); L.marker([first.lat, first.lon]).addTo(markerLayer).bindPopup(first.display_name).openPopup(); $('nearbyList').innerHTML = `<h4>Resultados</h4>${data.map(d=>`<div style="padding:6px;border-bottom:1px dashed rgba(255,255,255,0.03)"><b>${d.display_name}</b></div>`).join('')}`; }catch(err){ console.error(err); alert('Erro ao buscar (Nominatim).'); } }
async function goToMyLocation(){ if(!navigator.geolocation) return alert('Geolocalização não disponível'); navigator.geolocation.getCurrentPosition(pos=>{ map.setView([pos.coords.latitude,pos.coords.longitude],14); L.circle([pos.coords.latitude,pos.coords.longitude],{radius:50,color:'#22c55e'}).addTo(markerLayer); renderNearby(pos.coords.latitude,pos.coords.longitude); }, ()=> alert('Acesso à localização negado.')); }
async function fetchNearbySchools(){ const query='Escola Bertolinia Piauí'; const url=`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=20`; try{ const r=await fetch(url); const data=await r.json(); if(!data||!data.length) return alert('Nenhuma escola encontrada'); data.forEach(d=> store.get().markers.push({ title: d.display_name, lat: parseFloat(d.lat), lng: parseFloat(d.lon) })); store.save(); renderMarkers(); alert(`${data.length} escolas adicionadas ao mapa.`); }catch(e){ console.error(e); alert('Erro ao buscar escolas.'); } }

/* Service Worker registration (PWA) */
if('serviceWorker' in navigator){ window.addEventListener('load', ()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); }); }
