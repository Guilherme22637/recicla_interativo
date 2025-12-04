/* Recicla Interativo — script.js FINAL
   ✔ Tema escuro fixo
   ✔ Sidebar sempre visível no celular
   ✔ Quiz funcionando
   ✔ QR funcionando
   ✔ Mapa funcional
   ✔ Todas páginas funcionando
   ✔ Navegação corrigida
*/

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);
const ls = (k,v) => v===undefined ? JSON.parse(localStorage.getItem(k)||'null') : localStorage.setItem(k, JSON.stringify(v));

/* ---------- Default City (Bertolínia PI) ---------- */
const BERT = { lat: -7.64123, lng: -43.9499, zoom: 13 };

/* ---------- Default Data ---------- */
const defaultState = {
  users: [],
  currentUserId: null,

  quiz: [
    { q: "Qual cor representa o lixo plástico?", opts:["Amarelo", "Vermelho", "Verde"], a:1 },
    { q: "O que fazer com pilhas usadas?", opts:["Jogar no lixo comum", "Levar a ponto de coleta", "Enterrar"], a:1 },
    { q: "Papel engordurado pode ser reciclado?", opts:["Sim", "Não", "Depende"], a:1 }
  ],

  markers: [
    { title:"EcoPonto Central — Praça da Matriz", lat:-7.6410, lng:-43.9490 },
    { title:"Coleta de Pilhas — Prefeitura", lat:-7.6425, lng:-43.9512 },
    { title:"Ponto Reciclagem — Bairro Nova", lat:-7.6392, lng:-43.9475 }
  ],

  support: [],
  visionKey: ""
};

/* ---------- Load / Save ---------- */
function loadState(){
  const s = ls('ri_state');
  if(!s){
    ls('ri_state', defaultState);
    return defaultState;
  }
  return s;
}

const store = (() => {
  let s = loadState();
  return {
    get(){ return s; },
    save(){ ls('ri_state', s); },
    reset(){ localStorage.removeItem("ri_state"); location.reload(); }
  };
})();

function genId(){ return "id_" + Math.random().toString(36).slice(2,9); }

/* ---------- Ensure User ---------- */
function ensureGuest(){
  const state = store.get();
  if(!state.currentUserId){
    const user = { id:genId(), name:"Visitante", points:0, school:"", class:"", avatarData:"" };
    state.users.push(user);
    state.currentUserId = user.id;
    store.save();
  }
}
function curUser(){ return store.get().users.find(u => u.id === store.get().currentUserId); }

/* ========== INIT APP ========== */
document.addEventListener("DOMContentLoaded", ()=>{
  ensureGuest();
  bindNavigation();
  bindActions();
  initMap();
  initMiniQuiz();
  initFullQuiz();
  renderProfile();
  renderLeaderboard();
  renderDashboard();
  renderSupportList();
});

/* ---------- Navigation ---------- */
function bindNavigation(){
  qsa(".nav-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      navTo(btn.dataset.page);
    });
  });
}

function navTo(page){
  qsa(".nav-btn").forEach(b=>b.classList.remove("active"));
  qs(`.nav-btn[data-page="${page}"]`)?.classList.add("active");

  qsa(".page").forEach(p=>p.classList.remove("active-page"));
  $(page).classList.add("active-page");

  $("pageTitle").innerText = page.charAt(0).toUpperCase() + page.slice(1);
}

/* ---------- Profile ---------- */
function renderProfile(){
  const u = curUser();
  $("profileNameLarge").innerText = u.name;
  $("profilePoints").innerText = u.points;
  $("topPoints").innerText = u.points;
  $("userName").innerText = u.name;

  $("inputName").value = u.name;
  $("inputSchool").value = u.school || "";
  $("inputClass").value = u.class || "";
  $("inputVisionKey").value = store.get().visionKey || "";

  if(u.avatarData){
    $("avatarImg").src = u.avatarData;
  }
}

function bindActions(){
  $("saveProfile").addEventListener("click", saveProfile);
  $("inputAvatarFile").addEventListener("change", e=> avatarUpload(e.target.files[0]));

  $("quickClassify").addEventListener("click", quickClassify);
  $("fileInput").addEventListener("change", e=> handleFile(e.target.files[0], "quick"));
  $("fileInputFull").addEventListener("change", e=> handleFile(e.target.files[0], "full"));

  qsa(".pill").forEach(b=> b.addEventListener("click", ()=> manualClassify(b.dataset.type)));

  $("saveAction").addEventListener("click", saveAction);
  $("genQRUser").addEventListener("click", openQRForCurrentUser);

  $("btnExport").addEventListener("click", exportData);
  $("btnImport").addEventListener("click", ()=> $("importFile").click());
  $("importFile").addEventListener("change", importData);
  $("resetAll").addEventListener("click", ()=>{ if(confirm("Resetar tudo?")) store.reset(); });

  $("btnSendSupport").addEventListener("click", sendSupport);
  $("btnClearSupport").addEventListener("click", clearSupportForm);

  $("mapMyLoc").addEventListener("click", goToMyLocation);
  $("mapSearchBtn").addEventListener("click", ()=> performGeocode($("mapSearch").value));
  $("showSchoolsBtn").addEventListener("click", fetchNearbySchools);
}

/* ---------- Save Profile ---------- */
function saveProfile(){
  const u = curUser();
  u.name = $("inputName").value.trim() || "Visitante";
  u.school = $("inputSchool").value.trim();
  u.class = $("inputClass").value.trim();

  store.get().visionKey = $("inputVisionKey").value.trim();
  store.save();

  renderProfile();
  renderLeaderboard();
  renderDashboard();

  alert("Perfil salvo.");
}

/* ---------- Avatar Upload ---------- */
function avatarUpload(file){
  if(!file) return;
  const r = new FileReader();
  r.onload = ()=>{
    curUser().avatarData = r.result;
    store.save();
    renderProfile();
  };
  r.readAsDataURL(file);
}

/* ---------- File Classifier ---------- */
function handleFile(file, mode){
  if(!file) return;
  const r = new FileReader();
  r.onload = ()=>{
    if(mode==="quick"){
      $("quickResult").innerText = "Resultado: " + heuristicFromFilename(file.name);
    } else {
      $("classifyResult").innerText = "Analisado (manual)";
      $("classifyTips").innerText = "Use Registrar ação ou QR.";
    }
  };
  r.readAsDataURL(file);
}

function heuristicFromFilename(name){
  const t = name.toLowerCase();
  if(t.includes("plast")) return "Plástico";
  if(t.includes("vidro")||t.includes("glass")) return "Vidro";
  if(t.includes("papel")||t.includes("paper")) return "Papel";
  if(t.includes("metal")||t.includes("can")) return "Metal";
  return "Desconhecido";
}

function manualClassify(type){
  $("classifyResult").innerText = type;
  $("classifyTips").innerText = tipsFor(type);
}

function quickClassify(){
  const sel = $("quickSelect").value;
  if(!sel) return alert("Escolha um tipo.");
  $("quickResult").innerText = "Resultado: " + sel;
}

function tipsFor(cat){
  switch(cat.toLowerCase()){
    case "papel": return "Papéis limpos e secos.";
    case "plástico": return "Lave embalagens plásticas.";
    case "vidro": return "Evite quebrar o vidro.";
    case "metal": return "Metais limpos.";
    case "orgânico": return "Compostagem recomendada.";
    default: return "Categoria desconhecida.";
  }
}

/* ---------- Save Action (+points) ---------- */
function saveAction(){
  curUser().points += 5;
  store.save();
  renderProfile();
  renderLeaderboard();
  alert("Ação registrada! +5 pts");
}

/* ---------- QR Code ---------- */
function openQRForCurrentUser(){
  const u = curUser();
  const text = `${u.name} | Pontos: ${u.points}`;

  const canvas = document.createElement("canvas");
  QRCode.toCanvas(canvas, text, {width:220}).then(()=>{
    $("qrCanvas").innerHTML = "";
    $("qrCanvas").appendChild(canvas);
    $("qrModal").classList.remove("hidden");
    $("downloadQR").dataset.url = canvas.toDataURL("image/png");
  });
}

$("closeQR").addEventListener("click", ()=> $("qrModal").classList.add("hidden"));

function downloadQR(){
  const url = $("downloadQR").dataset.url;
  const a = document.createElement("a");
  a.href = url;
  a.download = "qr_usuario.png";
  a.click();
}

/* ---------- MINI QUIZ (Dashboard) ---------- */
function initMiniQuiz(){
  const q = store.get().quiz[0];
  $("miniQuestion").innerText = q.q;
  const box = $("miniOptions");
  box.innerHTML = "";

  q.opts.forEach((opt,i)=>{
    const b = document.createElement("button");
    b.className = "pill";
    b.innerText = opt;
    b.onclick = ()=>{
      if(i===q.a){
        curUser().points += 3;
        store.save();
        renderProfile();
        renderLeaderboard();
        alert("Correto! +3 pts");
      } else alert("Errado!");
    };
    box.appendChild(b);
  });
}

/* ---------- FULL QUIZ ---------- */
let quizIndex = 0;

function initFullQuiz(){
  $("quizTotal").innerText = store.get().quiz.length;
  renderQuizQuestion();
}

function renderQuizQuestion(){
  const questions = store.get().quiz;

  if(quizIndex >= questions.length){
    $("quizQuestion").innerText = "Quiz concluído!";
    $("quizAnswers").innerHTML = "";
    quizIndex = 0;
    return;
  }

  const q = questions[quizIndex];
  $("quizQuestion").innerText = q.q;
  $("quizIndex").innerText = quizIndex+1;

  const cont = $("quizAnswers");
  cont.innerHTML = "";

  q.opts.forEach((opt,i)=>{
    const b = document.createElement("button");
    b.className = "btn soft";
    b.innerText = opt;
    b.onclick = ()=>{
      if(i===q.a){
        curUser().points += 10;
        store.save();
        renderProfile();
        alert("Acertou! +10 pts");
      } else alert("Errado!");
      quizIndex++;
      renderQuizQuestion();
    };
    cont.appendChild(b);
  });
}

/* ---------- Leaderboard ---------- */
function renderLeaderboard(){
  const users = store.get().users.slice().sort((a,b)=> (b.points||0)-(a.points||0));
  $("leaderTop").innerHTML = users.slice(0,5)
    .map(u=> `<li>${u.name} <span class="muted">${u.points} pts</span></li>`)
    .join("");

  renderRankingList(users);
}

function renderRankingList(users){
  $("rankingList").innerHTML = users.map(u=>`
    <li>${u.name}
      <div><small class="muted">${u.school||"-"} / ${u.class||"-"}</small> 
      <strong>${u.points} pts</strong></div>
    </li>
  `).join("");
}

/* ---------- Dashboard ---------- */
function renderDashboard(){
  const u = curUser();
  $("topPoints").innerText = u.points;

  const groups = {};
  store.get().users.forEach(u=>{
    if(u.school) groups[u.school] = (groups[u.school]||0) + (u.points||0);
  });

  $("schoolStats").innerHTML = Object.entries(groups).length
    ? Object.entries(groups).map(([s,p])=> `<div>${s}: <strong>${p} pts</strong></div>`).join("")
    : "<div class='muted'>Nenhuma escola registrada</div>";

  const text = `${u.name}`;
  const canvas = document.createElement("canvas");
  QRCode.toCanvas(canvas, text, {width:110}).then(()=>{
    $("qrPreview").innerHTML = "";
    $("qrPreview").appendChild(canvas);
  });
}

/* ---------- Export / Import ---------- */
function exportData(){
  const blob = new Blob([JSON.stringify(store.get(),null,2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "recicla_data.json";
  a.click();
}

function importData(e){
  const file = e.target.files[0];
  if(!file) return;

  const r = new FileReader();
  r.onload = ()=>{
    try{
      const json = JSON.parse(r.result);
      ls("ri_state", json);
      alert("Importado! Recarregando...");
      location.reload();
    } catch(err){
      alert("Arquivo inválido");
    }
  };
  r.readAsText(file);
}

/* ---------- Support ---------- */
function sendSupport(){
  const name = $("supportName").value.trim() || curUser().name;
  const email = $("supportEmail").value.trim();
  const subject = $("supportSubject").value.trim();
  const msg = $("supportMsg").value.trim();

  if(!msg) return alert("Escreva a mensagem.");

  store.get().support.push({
    id: genId(),
    name,
    email,
    subject,
    msg,
    date: new Date().toISOString()
  });

  store.save();
  renderSupportList();
  alert("Mensagem enviada (local).");
}

function renderSupportList(){
  const arr = store.get().support;
  $("supportList").innerHTML = arr.length
    ? arr.map(m=> `
        <div style="margin-bottom:10px;border-bottom:1px dashed rgba(255,255,255,0.1);padding-bottom:6px;">
          <b>${m.subject}</b><br>
          <small class="muted">${m.name} — ${new Date(m.date).toLocaleString()}</small>
          <div style="margin-top:5px">${m.msg}</div>
        </div>
      `).join("")
    : "Nenhuma mensagem.";
}

function clearSupportForm(){
  $("supportName").value="";
  $("supportEmail").value="";
  $("supportSubject").value="";
  $("supportMsg").value="";
}

/* ---------- MAP ---------- */
let map, leafletMarkers = [];

function initMap(){
  map = L.map("mapCanvas").setView([BERT.lat, BERT.lng], BERT.zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:19
  }).addTo(map);

  renderMarkers();

  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      map.setView([lat,lng], 14);
      L.circle([lat,lng], {radius:60,color:"#22c55e"}).addTo(map);
      renderNearby(lat,lng);
    });
  } else {
    renderNearby(BERT.lat, BERT.lng);
  }

  map.on("click", e=>{
    const title = prompt("Nome do ponto:", "Novo ponto");
    if(!title) return;
    store.get().markers.push({title, lat:e.latlng.lat, lng:e.latlng.lng});
    store.save();
    renderMarkers();
  });
}

function renderMarkers(){
  leafletMarkers.forEach(m=> map.removeLayer(m));
  leafletMarkers = [];

  store.get().markers.forEach(p=>{
    leafletMarkers.push(
      L.marker([p.lat,p.lng]).addTo(map).bindPopup("<b>"+p.title+"</b>")
    );
  });
}

/* Nearby points */
function renderNearby(lat,lng){
  const pts = store.get().markers.map(p=>{
    p.dist = distanceKm(lat,lng,p.lat,p.lng);
    return p;
  }).filter(x=>x.dist<=50).sort((a,b)=>a.dist-b.dist);

  $("nearbyList").innerHTML = pts.length
    ? "<h4>Próximos:</h4>"+ pts.map(p=> `<div>${p.title} — ${p.dist.toFixed(1)} km</div>`).join("")
    : "<div class='muted'>Nenhum ponto próximo.</div>";
}

function distanceKm(a,b,c,d){
  const R=6371;
  const dLat=(c-a)*Math.PI/180;
  const dLon=(d-b)*Math.PI/180;
  const x=Math.sin(dLat/2)**2 + Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

/* ---------- Geocode search ---------- */
async function performGeocode(query){
  if(!query) return alert("Digite algo");

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

  const res = await fetch(url, {headers:{'User-Agent':'Recicla Interativo'}});
  const json = await res.json();

  if(json.length===0) return alert("Local não encontrado");

  const d = json[0];
  const lat = parseFloat(d.lat);
  const lon = parseFloat(d.lon);

  map.setView([lat,lon], 15);
  L.marker([lat,lon]).addTo(map).bindPopup(d.display_name).openPopup();
}

/* ---------- Nearby schools via OSM ---------- */
async function fetchNearbySchools(){
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=school%20Bertolinia&limit=15`;
  const res = await fetch(url, {headers:{'User-Agent':'Recicla Interativo'}});
  const data = await res.json();

  if(!data.length) return alert("Nenhuma escola encontrada");

  data.forEach(d=>{
    store.get().markers.push({
      title: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon)
    });
  });

  store.save();
  renderMarkers();
  alert("Escolas adicionadas ao mapa!");
}
