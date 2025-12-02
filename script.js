/* Recicla Interativo — script.js
   Versão Corrigida — todas as páginas funcionando
*/

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const ls = (k,v) => v===undefined ? JSON.parse(localStorage.getItem(k)||'null') : localStorage.setItem(k, JSON.stringify(v));

const BERTOLINIA = { lat: -7.64123, lng: -43.9499, zoom: 13 };

const defaultState = {
  users: [],
  currentUserId: null,
  quiz: [
    { q: 'Qual cor representa o lixo plástico?', opts: ['Amarelo','Vermelho','Verde'], a:1 },
    { q: 'O que fazer com pilhas usadas?', opts: ['Jogar no lixo comum','Levar a ponto de coleta','Enterrar no quintal'], a:1 },
    { q: 'Papel engordurado pode ser reciclado?', opts: ['Sim','Não','Depende'], a:1 }
  ],
  markers: [
    { title:'EcoPonto Central — Praça da Matriz', lat:-7.6410, lng:-43.9490 },
    { title:'Coleta de Pilhas — Prefeitura (Praça)', lat:-7.6425, lng:-43.9512 },
    { title:'Ponto de Reciclagem Bairro Nova', lat:-7.6392, lng:-43.9475 }
  ],
  support: [],
  visionKey: ''
};

function loadState(){
  const s = ls('ri_state');
  if(!s) { ls('ri_state', defaultState); return defaultState; }
  return s;
}

const store = (() => {
  let s = loadState();
  return {
    get(){ return s; },
    save(){ ls('ri_state', s); },
    reset(){ localStorage.removeItem('ri_state'); location.reload(); }
  };
})();

function genId(){ return 'id_'+Math.random().toString(36).slice(2,9); }

/* ---------- User handling ---------- */
function ensureGuest(){
  const state = store.get();
  if(!state.currentUserId){
    const guest = { id: genId(), name: 'Visitante', school:'', class:'', points:0, avatarData: '' };
    state.users.push(guest);
    state.currentUserId = guest.id;
    store.save();
  }
}
function curUser(){ return store.get().users.find(u => u.id === store.get().currentUserId); }

/* ---------- Init ---------- */
let mapInitialized = false;

document.addEventListener('DOMContentLoaded', ()=> {
  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', ()=> navTo(b.dataset.page)));
  window.navTo = navTo;

  $('quickClassify').addEventListener('click', quickClassify);
  $('fileInput').addEventListener('change', e=> handleFile(e.target.files[0], 'quick'));
  $('fileInputFull').addEventListener('change', e=> handleFile(e.target.files[0], 'full'));
  document.querySelectorAll('.pill').forEach(b=> b.addEventListener('click', ()=> manualClassify(b.dataset.type)));
  $('saveAction').addEventListener('click', saveAction);
  $('genQRUser').addEventListener('click', openQRForCurrentUser);
  $('saveProfile').addEventListener('click', saveProfile);
  $('inputAvatarFile').addEventListener('change', e=> avatarUpload(e.target.files[0]));
  $('btnExport').addEventListener('click', exportData);
  $('btnImport').addEventListener('click', ()=> $('importFile').click());
  $('importFile').addEventListener('change', importData);
  $('resetAll').addEventListener('click', ()=> { if(confirm('Resetar dados locais?')) store.reset(); });
  $('btnSendSupport').addEventListener('click', sendSupport);
  $('btnClearSupport').addEventListener('click', clearSupportForm);
  $('toggleTheme').addEventListener('click', ()=> {
    document.body.classList.toggle('light');
    localStorage.setItem('ri_theme', document.body.classList.contains('light')?'light':'dark');
  });
  $('logoutBtn').addEventListener('click', ()=> { if(confirm('Redefinir usuário local?')) { store.get().currentUserId = null; store.save(); location.reload(); }});

  $('closeQR').addEventListener('click', ()=> $('qrModal').classList.add('hidden'));
  $('downloadQR').addEventListener('click', downloadQR);

  $('mapSearchBtn').addEventListener('click', ()=> performGeocode($('mapSearch').value));
  $('mapMyLoc').addEventListener('click', ()=> goToMyLocation());
  $('showSchoolsBtn').addEventListener('click', fetchNearbySchools);

  if(localStorage.getItem('ri_theme') === 'light') document.body.classList.add('light');

  ensureGuest();

  initMiniQuiz();
  initFullQuiz();
  renderProfile();
  renderLeaderboard();
  renderFilters();
  renderDashboard();
  renderSupportList();
});

/* ---------- Navigation fixed ---------- */
function navTo(page){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-page="${page}"]`)?.classList.add('active');
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active-page'));
  document.getElementById(page).classList.add('active-page');

  $('pageTitle').innerText = page.charAt(0).toUpperCase()+page.slice(1);

  if(page === 'map' && !mapInitialized){
    setTimeout(()=> initMap(), 300);
    mapInitialized = true;
  }
  if(page === 'profile'){ renderProfile(); }
  if(page === 'support'){ renderSupportList(); }
}

/* ---------- Profile ---------- */
function renderProfile(){
  const u = curUser();
  if(!u) return;
  $('profileNameLarge').innerText = u.name;
  $('profilePoints').innerText = u.points || 0;
  $('topPoints').innerText = u.points || 0;
  $('userName').innerText = u.name;
  $('avatarPreview').innerText = u.avatar || (u.name.charAt(0)||'V');
  $('inputName').value = u.name;
  $('inputSchool').value = u.school || '';
  $('inputClass').value = u.class || '';
  $('inputVisionKey').value = store.get().visionKey || '';

  if(u.avatarData){
    $('avatarImg').src = u.avatarData;
    $('avatarPreview').classList.add('hidden');
  } else {
    $('avatarImg').src = '';
    $('avatarPreview').classList.remove('hidden');
  }
}

function saveProfile(){
  const u = curUser();
  u.name = $('inputName').value.trim() || 'Visitante';
  u.school = $('inputSchool').value.trim();
  u.class = $('inputClass').value.trim();
  u.avatar = u.name.charAt(0).toUpperCase();
  store.get().visionKey = $('inputVisionKey').value.trim();
  store.save();
  renderProfile(); renderLeaderboard(); renderFilters(); renderDashboard();
  alert('Perfil salvo localmente.');
}

function avatarUpload(file){
  if(!file) return;
  const r = new FileReader();
  r.onload = ()=> {
    curUser().avatarData = r.result;
    store.save();
    renderProfile();
  };
  r.readAsDataURL(file);
}

/* ---------- Classifier ---------- */
function handleFile(file, mode='quick'){
  if(!file) return;
  const r = new FileReader();
  r.onload = ()=> {
    if(mode==='quick'){
      $('quickResult').innerText = `Resultado: ${heuristicFromFilename(file.name)}`;
    } else {
      $('previewImage').src = r.result;
      $('previewImage').classList.remove('hidden');
      $('classifyResult').innerText = 'Analisado (manual)';
      $('classifyTips').innerText = 'Use botão Gerar QR ou registrar ação.';
    }
  };
  r.readAsDataURL(file);
}

function heuristicFromFilename(name){
  const low = name.toLowerCase();
  if(low.includes('plastic')||low.includes('plástico')||low.includes('pet')) return 'Plástico';
  if(low.includes('glass')||low.includes('vidro')) return 'Vidro';
  if(low.includes('paper')||low.includes('papel')) return 'Papel';
  if(low.includes('can')||low.includes('metal')||low.includes('lata')) return 'Metal';
  return 'Desconhecido';
}

function manualClassify(type){
  $('classifyResult').innerText = type;
  $('classifyTips').innerText = tipsFor(type);
}

function quickClassify(){
  const sel = $('quickSelect').value;
  if(sel){ $('quickResult').innerText = `Resultado: ${sel}`; return; }
  alert('Escolha manualmente ou envie uma imagem.');
}

function tipsFor(cat){
  switch(cat.toLowerCase()){
    case 'papel': return 'Recicle papéis limpos e secos. Evite papéis engordurados.';
    case 'plástico': return 'Lave as embalagens antes de descartar.';
    case 'vidro': return 'Evite quebrar o vidro. Leve inteiro ao ponto de coleta.';
    case 'metal': return 'Latas e tampas metálicas devem estar limpas.';
    case 'orgânico': return 'Use em compostagem se possível.';
    default: return 'Categoria indefinida.';
  }
}

function saveAction(){
  const u = curUser();
  u.points = (u.points||0) + 5;
  store.save();
  renderProfile(); renderLeaderboard(); renderDashboard();
  alert(`Ação registrada. +5 pontos.`);
}

/* ---------- QR ---------- */
function openQRForCurrentUser(){
  const u = curUser();
  const text = `${u.name} | Pontos: ${u.points} | Escola: ${u.school} | Turma: ${u.class}`;
  const canvas = document.createElement('canvas');
  QRCode.toCanvas(canvas, text, {width:220}).then(()=> {
    $('qrCanvas').innerHTML = ''; $('qrCanvas').appendChild(canvas);
    $('qrModal').classList.remove('hidden');
    $('downloadQR').dataset.url = canvas.toDataURL('image/png');
  });
}

function downloadQR(){
  const url = $('downloadQR').dataset.url;
  if(!url) return alert('Nenhum QR gerado.');
  const a = document.createElement('a'); 
  a.href = url;
  a.download = `${curUser().name}_qr.png`; 
  a.click();
}

/* ---------- Quiz ---------- */
function initMiniQuiz(){
  const q = store.get().quiz[0];
  $('miniQuestion').innerText = q.q;
  const opts = $('miniOptions'); 
  opts.innerHTML = '';
  q.opts.forEach((o,i)=> {
    const b = document.createElement('button');
    b.className='pill';
    b.innerText = o;
    b.addEventListener('click', ()=> {
      if(i === q.a){ curUser().points += 3; store.save(); renderProfile(); renderLeaderboard(); renderDashboard(); alert('Correto! +3 pts'); }
      else alert('Errado — tente outra.');
    });
    opts.appendChild(b);
  });
}

let quizIndex = 0;

function initFullQuiz(){
  $('quizTotal').innerText = store.get().quiz.length;
  renderQuizQuestion();
}

function renderQuizQuestion(){
  const qlist = store.get().quiz;
  if(quizIndex >= qlist.length){
    $('quizQuestion').innerText = 'Quiz finalizado!';
    $('quizAnswers').innerHTML='';
    quizIndex = 0;
    return;
  }

  const q = qlist[quizIndex];
  $('quizQuestion').innerText = q.q;

  const ans = $('quizAnswers'); 
  ans.innerHTML = '';

  q.opts.forEach((o,i)=> {
    const b = document.createElement('button');
    b.className='btn soft';
    b.innerText = o;
    b.addEventListener('click', ()=> {
      if(i===q.a){ curUser().points += 10; store.save(); renderProfile(); renderLeaderboard(); alert('Acertou! +10 pts'); }
      else alert('Resposta incorreta.');
      quizIndex++; renderQuizQuestion();
    });
    ans.appendChild(b);
  });
}

/* ---------- Leaderboard ---------- */
function renderLeaderboard(){
  const users = store.get().users.slice().sort((a,b)=> (b.points||0)-(a.points||0));
  $('leaderTop').innerHTML = users.slice(0,5).map(u=>`<li>${u.name} <span class="muted">${u.points||0} pts</span></li>`).join('');
  renderRankingList(users);
}

function renderRankingList(users){
  $('rankingList').innerHTML = users.map(u => 
    `<li>${u.name} <div><small class="muted">${u.school || '-'} / ${u.class || '-'}</small> <strong>${u.points||0} pts</strong></div></li>`
  ).join('');
}

/* ---------- Filters ---------- */
function renderFilters(){
  const schools = Array.from(new Set(store.get().users.map(u=>u.school).filter(Boolean)));
  const selS = $('filterSchool');
  selS.innerHTML = `<option value="">— Todas as escolas —</option>` + schools.map(s=>`<option>${s}</option>`).join('');
  selS.addEventListener('change', applyFilters);
}

function applyFilters(){
  let users = store.get().users.slice();
  const school = $('filterSchool').value;
  if(school) users = users.filter(u=>u.school===school);
  renderRankingList(users.sort((a,b)=> (b.points||0)-(a.points||0)));
}

/* ---------- Export / Import ---------- */
function exportData(){
  const data = store.get();
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a = document.createElement('a'); 
  a.href = URL.createObjectURL(blob); 
  a.download = 'recicla_data.json'; 
  a.click();
}

function importData(e){
  const file = e.target.files[0]; if(!file) return;
  const r = new FileReader(); 
  r.onload = ()=> {
    try{
      const json = JSON.parse(r.result); 
      localStorage.setItem('ri_state', JSON.stringify(json)); 
      alert('Import concluído. Recarregando...');
      location.reload();
    } catch(e){ alert('Arquivo inválido'); }
  }; 
  r.readAsText(file);
}

/* ---------- Support (fully fixed) ---------- */
function sendSupport(){
  const name = $('supportName').value.trim() || curUser().name;
  const email = $('supportEmail').value.trim();
  const subj = $('supportSubject').value.trim();
  const msg = $('supportMsg').value.trim();

  if(!msg) return alert('Escreva a descrição do problema.');

  const s = store.get();
  s.support.push({
    id: genId(),
    name,
    email,
    subj,
    msg,
    date: new Date().toISOString()
  });

  store.save();
  renderSupportList();
  alert('Mensagem registrada com sucesso!');
}

function renderSupportList(){
  const arr = store.get().support || [];
  $('supportList').innerHTML = arr.length 
    ? arr.map(m=>`
      <div style="margin-bottom:8px;border-bottom:1px dashed rgba(255,255,255,0.03);padding-bottom:6px">
        <b>${m.subj}</b>
        <div class="muted small">${m.name} • ${new Date(m.date).toLocaleString()}</div>
        <div style="margin-top:6px">${m.msg}</div>
      </div>
    `).join('')
    : 'Nenhuma mensagem.';
}

function clearSupportForm(){
  $('supportName').value='';
  $('supportEmail').value='';
  $('supportSubject').value='';
  $('supportMsg').value='';
}

/* ---------- Map (fixed: only loads when entering page) ---------- */
let mapInstance, leafletMarkers=[];

function initMap(){
  mapInstance = L.map('mapCanvas').setView([BERTOLINIA.lat,BERTOLINIA.lng], BERTOLINIA.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19
  }).addTo(mapInstance);

  renderMarkers();

  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      mapInstance.setView([pos.coords.latitude,pos.coords.longitude], 13);
      L.circle([pos.coords.latitude,pos.coords.longitude], {radius: 50, color:'#22c55e'}).addTo(mapInstance);
      renderNearby(pos.coords.latitude,pos.coords.longitude);
    }, ()=>{
      renderNearby(BERTOLINIA.lat,BERTOLINIA.lng);
    });
  } else renderNearby(BERTOLINIA.lat,BERTOLINIA.lng);

  mapInstance.on('click', e=>{
    const title = prompt('Título do ponto:','Novo Ponto');
    if(!title) return;
    store.get().markers.push({title, lat:e.latlng.lat, lng:e.latlng.lng});
    store.save();
    renderMarkers();
  });
}

function renderMarkers(){
  leafletMarkers.forEach(m=> mapInstance.removeLayer(m));
  leafletMarkers=[];

  store.get().markers.forEach(p=>{
    const mk = L.marker([p.lat,p.lng]).addTo(mapInstance).bindPopup(`<b>${p.title}</b>`);
    leafletMarkers.push(mk);
  });
}

function renderNearby(lat, lng){
  const pts = store.get().markers.map(m => {
    m.dist = distanceKm(lat,lng,m.lat,m.lng);
    return m;
  }).filter(m=>m.dist<=50).sort((a,b)=>a.dist-b.dist);

  $('nearbyList').innerHTML = pts.length 
    ? '<h4>Próximos pontos (até 50km):</h4>'+ pts.map(p=>`<div>${p.title} — ${p.dist.toFixed(1)} km</div>`).join('')
    : '<div class="muted">Nenhum ponto próximo (até 50km).</div>';
}

function distanceKm(lat1,lon1,lat2,lon2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

async function performGeocode(query){
  if(!query.trim()) return alert('Digite um local.');

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;

  try{
    const resp = await fetch(url);
    const data = await resp.json();
    if(!data.length) return alert('Local não encontrado.');

    const first = data[0];
    const lat = parseFloat(first.lat), lon = parseFloat(first.lon);

    mapInstance.setView([lat, lon], 15);
    L.marker([lat, lon]).addTo(mapInstance).bindPopup(first.display_name).openPopup();

    $('nearbyList').innerHTML = `<h4>Resultados</h4>` +
      data.map(d=>`<div><b>${d.display_name}</b></div>`).join('');

  }catch(err){
    console.error(err);
    alert('Erro ao buscar.');
  }
}

async function goToMyLocation(){
  if(!navigator.geolocation) return alert('Geolocalização não disponível.');
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    mapInstance.setView([lat,lng], 14);
    L.circle([lat,lng], {radius: 50, color:'#22c55e'}).addTo(mapInstance);
    renderNearby(lat,lng);
  });
}

/* ---------- Schools ---------- */
async function fetchNearbySchools(){
  const query = 'Escola Bertolinia Piauí';
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=50`;

  try{
    const resp = await fetch(url);
    const data = await resp.json();

    if(!data.length) return alert('Nenhuma escola encontrada.');

    data.forEach(d=>{
      store.get().markers.push({
        title: d.display_name,
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon)
      });
    });

    store.save();
    renderMarkers();
    alert(`${data.length} escolas adicionadas ao mapa.`);
  }catch(err){
    console.error(err);
    alert('Erro ao buscar escolas.');
  }
}

/* ---------- Dashboard ---------- */
function renderDashboard(){
  const u = curUser();
  $('topPoints').innerText = u.points || 0;

  renderLeaderboard();

  const groups = {};
  store.get().users.forEach(user=> {
    if(user.school) groups[user.school]=(groups[user.school]||0)+(user.points||0);
  });

  $('schoolStats').innerHTML = Object.keys(groups).length
    ? Object.entries(groups).map(([k,v])=>`<div>${k}: <strong>${v} pts</strong></div>`).join('')
    : '<div class="muted">Nenhuma escola registrada</div>';

  const smallText = `${u.name} — ${location.href}`;
  const qrBox = $('qrPreview');
  qrBox.innerHTML='';

  const canv=document.createElement('canvas');
  QRCode.toCanvas(canv, smallText, {width:110})
    .then(()=> qrBox.appendChild(canv));
}

/* ---------- Service Worker ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}
