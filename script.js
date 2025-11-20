/* Recicla Interativo — script.js
   - Guarda dados em localStorage
   - Login/profile offline
   - Ranking por escola/turma
   - QR generation (qrcode lib)
   - Classifier (manual + image upload + optional Vision)
   - Quiz local
   - Map with Leaflet (local markers)
*/

/* ---------- Utilities ---------- */
const $ = id => document.getElementById(id);
const ls = key => JSON.parse(localStorage.getItem(key) || 'null');
const setLS = (k,v) => localStorage.setItem(k, JSON.stringify(v));

/* ---------- Default Data ---------- */
const defaultState = {
  users: [], // {id,name,school,class,points,avatar}
  currentUserId: null,
  quiz: [
    {q:'Qual cor representa o lixo plástico?', opts:['Amarelo','Vermelho','Verde'], a:1},
    {q:'O que fazer com pilhas usadas?', opts:['Lixo comum','Ponto de coleta','Compostar'], a:1},
    {q:'Papel engordurado pode ser reciclado?', opts:['Sim','Não','Depende'], a:1}
  ],
  markers: [
    {title:'EcoPonto Liberdade',lat:-23.559,lng:-46.635},
    {title:'Coleta Pilhas - Super',lat:-23.552,lng:-46.639}
  ]
};
const store = (() => {
  let s = ls('ri_state') || defaultState;
  // migrate older versions
  if(!s.currentUserId) s.currentUserId = null;
  return {
    get() { return s },
    save() { setLS('ri_state', s); },
    reset() { localStorage.removeItem('ri_state'); location.reload(); }
  }
})();

/* ---------- App Initialization ---------- */
document.addEventListener('DOMContentLoaded', init);
function init(){
  // UI references
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(b => b.addEventListener('click', ()=> navTo(b.dataset.page)));

  // pageTitle updates
  window.navTo = (page) => {
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    document.querySelector(`.nav-btn[data-page="${page}"]`)?.classList.add('active');
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active-page'));
    document.getElementById(page).classList.add('active-page');
    $('pageTitle').innerText = page === 'dashboard' ? 'Dashboard' : page.charAt(0).toUpperCase()+page.slice(1);
  };

  // alias for markup IDs
  window.$ = id => document.getElementById(id);

  // bind small actions
  $('quickClassify').addEventListener('click', quickClassify);
  $('fileInput').addEventListener('change', e=> handleFilePreview(e.target.files[0], 'quick'));
  $('fileInputFull').addEventListener('change', e=> handleFilePreview(e.target.files[0], 'full'));
  document.querySelectorAll('.pill').forEach(b=> b.addEventListener('click', ()=> manualClassify(b.dataset.type)));
  $('saveAction').addEventListener('click', saveAction);
  $('genQRUser').addEventListener('click', ()=> openQRForCurrentUser());
  $('saveProfile').addEventListener('click', saveProfile);
  $('resetAll').addEventListener('click', ()=> { if(confirm('Resetar todos dados locais?')) store.reset(); });
  $('btnExport')?.addEventListener('click', exportData);
  $('btnImport')?.addEventListener('click', ()=> $('importFile').click());
  $('importFile')?.addEventListener('change', importData);
  $('toggleDark').addEventListener('change', toggleTheme);
  $('toggleTheme').addEventListener('click', ()=> { document.body.classList.toggle('light'); $('toggleDark').checked = document.body.classList.contains('light'); localStorage.setItem('ri_theme', document.body.classList.contains('light')?'light':'dark'); });
  $('logoutBtn').addEventListener('click', logout);

  // QR modal
  $('closeQR').addEventListener('click', ()=> $('qrModal').classList.add('hidden'));
  $('downloadQR').addEventListener('click', downloadQR);

  // Profile exports
  if(store.get().currentUserId === null){
    // create default user (guest)
    const guest = {id: genId(), name:'Visitante', school:'', class:'', points:0, avatar: 'V'};
    store.get().users.push(guest);
    store.get().currentUserId = guest.id;
    store.save();
  }

  // load theme
  const theme = localStorage.getItem('ri_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light':'dark');
  if(theme === 'light') { document.body.classList.add('light'); $('toggleDark').checked = true; }

  // init map
  initMap();

  // init quiz mini and full
  initMiniQuiz();
  initFullQuiz();

  // render UI
  renderProfile();
  renderLeaderboard();
  renderFilters();
  renderDashboard();
}

/* ---------- Helpers ---------- */
function genId(){ return 'u_'+Math.random().toString(36).slice(2,9); }
function currentUser(){ return store.get().users.find(u=>u.id === store.get().currentUserId); }

/* ---------- Profile / Auth ---------- */
function renderProfile(){
  const u = currentUser();
  $('profileNameLarge').innerText = u.name;
  $('profilePoints').innerText = u.points;
  $('topPoints').innerText = u.points;
  $('userName').innerText = u.name;
  $('avatarPreview').innerText = u.avatar;
  $('inputName').value = u.name;
  $('inputSchool').value = u.school || '';
  $('inputClass').value = u.class || '';
  $('inputVisionKey').value = store.get().visionKey || '';
}
function saveProfile(){
  const u = currentUser();
  u.name = $('inputName').value.trim() || 'Visitante';
  u.school = $('inputSchool').value.trim();
  u.class = $('inputClass').value.trim();
  u.avatar = u.name.charAt(0).toUpperCase() || 'A';
  store.get().visionKey = $('inputVisionKey').value.trim();
  store.save();
  renderProfile(); renderLeaderboard(); renderFilters();
  alert('Perfil salvo localmente.');
}
function logout(){ alert('Logout local — voltando ao convidado.'); store.get().currentUserId = null; store.save(); location.reload(); }

/* ---------- Classifier ---------- */
function handleFilePreview(file, mode='quick'){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    if(mode==='quick'){
      $('previewImage')?.classList.remove('hidden');
      $('previewImage').src = reader.result;
      // auto classify heuristic
      const guess = heuristicFromFilename(file.name);
      $('quickResult').innerText = `Resultado: ${guess}`;
    } else {
      $('previewImage').src = reader.result;
      $('previewImage').classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
}
function heuristicFromFilename(name){
  const low=name.toLowerCase();
  if(low.includes('plastic')||low.includes('plástico')||low.includes('pet')) return 'Plástico';
  if(low.includes('glass')||low.includes('vidro')) return 'Vidro';
  if(low.includes('paper')||low.includes('papel')||low.includes('cardboard')) return 'Papel';
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
    default: return 'Categoria indefinida. Verifique regras locais.';
  }
}

/* ---------- Save action (+points) ---------- */
function saveAction(){
  const u = currentUser();
  const pts = 5; // default for action
  u.points = (u.points||0) + pts;
  store.save();
  renderProfile(); renderLeaderboard(); renderDashboard();
  alert(`Ação registrada. +${pts} pontos.`);
}

/* ---------- QR generation ---------- */
function openQRForCurrentUser(){
  const u = currentUser();
  const text = `${u.name} | Pontos: ${u.points} | Escola: ${u.school} | Turma: ${u.class} | site: ${location.href}`;
  const canvas = document.createElement('canvas');
  QRCode.toCanvas(canvas, text, {width:220}).then(()=> {
    $('qrCanvas').innerHTML = '';
    $('qrCanvas').appendChild(canvas);
    $('qrModal').classList.remove('hidden');
    // store for download
    $('downloadQR').dataset.url = canvas.toDataURL('image/png');
  }).catch(err=>console.error(err));
}
function downloadQR(){
  const url = $('downloadQR').dataset.url;
  if(!url) return alert('Nenhum QR gerado.');
  const a = document.createElement('a'); a.href = url; a.download = `${currentUser().name}_qr.png`; a.click();
}

/* ---------- Mini Quiz (dashboard) ---------- */
function initMiniQuiz(){
  const q = store.get().quiz[0];
  $('miniQuestion').innerText = q.q;
  const opts = $('miniOptions');
  opts.innerHTML = '';
  q.opts.forEach((o, i)=> {
    const b = document.createElement('button'); b.className='pill'; b.innerText = o;
    b.addEventListener('click', ()=> {
      if(i === q.a){ currentUser().points = (currentUser().points||0) + 3; store.save(); renderProfile(); renderLeaderboard(); renderDashboard(); alert('Correto! +3 pts'); }
      else alert('Errado — tente outra.');
    });
    opts.appendChild(b);
  });
}

/* ---------- Full Quiz ---------- */
let quizIndex = 0;
function initFullQuiz(){
  $('quizTotal').innerText = store.get().quiz.length;
  renderQuizQuestion();
}
function renderQuizQuestion(){
  const qlist = store.get().quiz;
  if(quizIndex >= qlist.length){ $('quizQuestion').innerText = 'Quiz finalizado!'; $('quizAnswers').innerHTML=''; quizIndex = 0; return; }
  const q = qlist[quizIndex];
  $('quizQuestion').innerText = q.q;
  const ans = $('quizAnswers');
  ans.innerHTML = '';
  q.opts.forEach((o, i)=> {
    const b = document.createElement('button'); b.className='btn soft'; b.innerText = o;
    b.addEventListener('click', ()=> {
      if(i===q.a){ currentUser().points = (currentUser().points||0) + 10; store.save(); renderProfile(); renderLeaderboard(); alert('Acertou! +10 pts'); }
      else alert('Resposta incorreta.');
      quizIndex++; renderQuizQuestion();
    });
    ans.appendChild(b);
  });
}

/* ---------- Leaderboard & Filters ---------- */
function renderLeaderboard(){
  const users = store.get().users.slice().sort((a,b)=> (b.points||0)-(a.points||0));
  $('leaderTop').innerHTML = users.slice(0,5).map(u=>`<li>${u.name} <span class="muted">${u.points||0} pts</span></li>`).join('');
  renderRankingList(users);
}
function renderRankingList(users){
  const list = $('rankingList');
  list.innerHTML = users.map(u => `<li>${u.name} <div><small class="muted">${u.school || '-'} / ${u.class || '-'}</small> <strong>${u.points||0} pts</strong></div></li>`).join('');
}
function renderFilters(){
  const schools = Array.from(new Set(store.get().users.map(u=>u.school).filter(Boolean)));
  const selS = $('filterSchool'); selS.innerHTML = `<option value="">— Todas as escolas —</option>` + schools.map(s=>`<option>${s}</option>`).join('');
  selS.addEventListener('change', ()=> applyFilters());
  const selC = $('filterClass'); selC.addEventListener('change', ()=> applyFilters());
}
function applyFilters(){
  let users = store.get().users.slice();
  const school = $('filterSchool').value; const cls = $('filterClass').value;
  if(school) users = users.filter(u=>u.school===school);
  if(cls) users = users.filter(u=>u.class===cls);
  renderRankingList(users.sort((a,b)=> (b.points||0)-(a.points||0)));
}

/* ---------- Export / Import ---------- */
function exportData(){
  const data = store.get();
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'recicla_data.json'; a.click();
}
function importData(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=> {
    try{
      const json = JSON.parse(reader.result);
      localStorage.setItem('ri_state', JSON.stringify(json));
      alert('Import concluído. Página será recarregada.'); location.reload();
    }catch(err){ alert('Arquivo inválido.'); }
  };
  reader.readAsText(file);
}

/* ---------- Map (Leaflet local markers) ---------- */
let map, leafletMarkers = [];
function initMap(){
  map = L.map('mapCanvas').setView([-23.55,-46.63], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  renderMarkers();
  map.on('click', e=> {
    const title = prompt('Título do ponto:','Novo Ponto');
    if(!title) return;
    store.get().markers.push({title,lat:e.latlng.lat,lng:e.latlng.lng});
    store.save();
    renderMarkers();
  });
}
function renderMarkers(){
  leafletMarkers.forEach(m=> map.removeLayer(m)); leafletMarkers=[];
  store.get().markers.forEach(p=>{
    const mk = L.marker([p.lat,p.lng]).addTo(map).bindPopup(`<b>${p.title}</b>`);
    leafletMarkers.push(mk);
  });
}

/* ---------- Dashboard render ---------- */
function renderDashboard(){
  // top points / profile
  $('topPoints').innerText = currentUser().points || 0;
  // top leaderboard list
  renderLeaderboard();
  // school stats
  const groups = {};
  store.get().users.forEach(u=>{
    if(!u.school) return;
    groups[u.school] = (groups[u.school]||0) + (u.points||0);
  });
  $('schoolStats').innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([k,v])=>`<div>${k}: <strong>${v} pts</strong></div>`).join('') : '<div class="muted">Nenhuma escola registrada</div>';

  // generate user QR small preview
  const smallText = `${currentUser().name} — ${location.href}`;
  const qrBox = $('qrPreview'); qrBox.innerHTML = '';
  const canv = document.createElement('canvas');
  QRCode.toCanvas(canv, smallText, {width:110}).then(()=> qrBox.appendChild(canv));
}

/* ---------- Theme ---------- */
function toggleTheme(e){
  if(e.target.checked) document.body.classList.add('light');
  else document.body.classList.remove('light');
  localStorage.setItem('ri_theme', document.body.classList.contains('light')?'light':'dark');
}

/* ---------- Utilities / startup ---------- */
function exportStateJSON(){ exportData(); }

/* ---------- small helpers ---------- */
(function expose(){
  window.renderDashboard = renderDashboard;
  window.navTo = (page) => { document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active')); document.querySelector(`.nav-btn[data-page="${page}"]`).classList.add('active'); document.querySelectorAll('.page').forEach(p=>p.classList.remove('active-page')); document.getElementById(page).classList.add('active-page'); $('pageTitle').innerText = page; };
})();

/* initialize after load of DOM */
window.addEventListener('load', ()=> {
  // set a few global ids used earlier
  window.$ = id => document.getElementById(id);
  // finish rendering
  renderProfile(); renderLeaderboard(); renderFilters(); renderDashboard();
});
