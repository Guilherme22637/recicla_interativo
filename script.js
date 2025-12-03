/* Recicla Interativo — script.js (VERSÃO CORRIGIDA)
   - Tema escuro fixo
   - Navegação responsiva
   - Storage key: 'ri_state'
   - Mapa ajustado
   - Compatível com Netlify + GitHub Pages + PWA
*/

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const ls = (k,v) =>
  v === undefined
    ? JSON.parse(localStorage.getItem(k) || "null")
    : localStorage.setItem(k, JSON.stringify(v));

const BERTOLINIA = { lat: -7.64123, lng: -43.9499, zoom: 13 };

const defaultState = {
  users: [],
  currentUserId: null,
  quiz: [
    { q: "Qual cor representa o lixo plástico?", opts: ["Amarelo", "Vermelho", "Verde"], a: 1 },
    { q: "O que fazer com pilhas usadas?", opts: ["Jogar no lixo comum", "Levar a ponto de coleta", "Enterrar no quintal"], a: 1 },
    { q: "Papel engordurado pode ser reciclado?", opts: ["Sim", "Não", "Depende"], a: 1 }
  ],
  markers: [
    { title: "EcoPonto Central — Praça da Matriz", lat: -7.6410, lng: -43.9490 },
    { title: "Coleta de Pilhas — Prefeitura", lat: -7.6425, lng: -43.9512 },
    { title: "Ponto de Reciclagem Bairro Nova", lat: -7.6392, lng: -43.9475 }
  ],
  support: [],
  visionKey: ""
};

function loadState() {
  const s = ls("ri_state");
  if (!s) {
    ls("ri_state", defaultState);
    return defaultState;
  }
  return s;
}

const store = (() => {
  let s = loadState();
  return {
    get() { return s; },
    save() { ls("ri_state", s); },
    reset() { localStorage.removeItem("ri_state"); location.reload(); }
  };
})();

function genId() {
  return "id_" + Math.random().toString(36).slice(2, 9);
}

/* ---------- User system ---------- */
function ensureGuest() {
  const state = store.get();
  if (!state.currentUserId) {
    const guest = {
      id: genId(),
      name: "Visitante",
      school: "",
      class: "",
      points: 0,
      avatarData: ""
    };
    state.users.push(guest);
    state.currentUserId = guest.id;
    store.save();
  }
}

function curUser() {
  return store.get().users.find(u => u.id === store.get().currentUserId);
}

/* Force DARK THEME always */
localStorage.setItem("ri_theme", "dark");
document.body.classList.remove("light");

/* ---------- Init UI & Bindings ---------- */
document.addEventListener("DOMContentLoaded", () => {

  // Navigation
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => navTo(btn.dataset.page));
  });

  window.navTo = navTo; // allow calls in HTML onclick if needed

  /* Bind controls */
  $("quickClassify").addEventListener("click", quickClassify);
  $("fileInput").addEventListener("change", e => handleFile(e.target.files[0], "quick"));
  $("fileInputFull").addEventListener("change", e => handleFile(e.target.files[0], "full"));

  document.querySelectorAll(".pill").forEach(b =>
    b.addEventListener("click", () => manualClassify(b.dataset.type))
  );

  $("saveAction").addEventListener("click", saveAction);
  $("genQRUser").addEventListener("click", openQRForCurrentUser);

  $("saveProfile").addEventListener("click", saveProfile);
  $("inputAvatarFile").addEventListener("change", e => avatarUpload(e.target.files[0]));

  $("btnExport").addEventListener("click", exportData);
  $("btnImport").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", importData);

  $("resetAll").addEventListener("click", () => {
    if (confirm("Resetar dados locais?")) store.reset();
  });

  $("btnSendSupport").addEventListener("click", sendSupport);
  $("btnClearSupport").addEventListener("click", clearSupportForm);

  $("logoutBtn").addEventListener("click", () => {
    if (confirm("Redefinir usuário local?")) {
      store.get().currentUserId = null;
      store.save();
      location.reload();
    }
  });

  $("closeQR").addEventListener("click", () => $("qrModal").classList.add("hidden"));
  $("downloadQR").addEventListener("click", downloadQR);

  $("mapSearchBtn").addEventListener("click", () => performGeocode($("mapSearch").value));
  $("mapMyLoc").addEventListener("click", () => goToMyLocation());
  $("showSchoolsBtn").addEventListener("click", () => fetchNearbySchools());

  // Ensure guest user exists
  ensureGuest();

  // Initialize modules
  initMap();
  initMiniQuiz();
  initFullQuiz();
  renderProfile();
  renderLeaderboard();
  renderFilters();
  renderDashboard();
  renderSupportList();
});
/* ---------- MAP ---------- */

let map;
let markerLayer;

function initMap() {
  map = L.map("mapCanvas").setView([BERTOLINIA.lat, BERTOLINIA.lng], BERTOLINIA.zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  renderMarkers();

  // Click to add marker locally
  map.on("click", e => {
    const title = prompt("Nome do ponto de coleta:");
    if (!title) return;
    store.get().markers.push({ title, lat: e.latlng.lat, lng: e.latlng.lng });
    store.save();
    renderMarkers();
  });
}

function renderMarkers() {
  markerLayer.clearLayers();
  const { markers } = store.get();

  markers.forEach(m => {
    L.marker([m.lat, m.lng]).addTo(markerLayer).bindPopup("<b>" + m.title + "</b>");
  });
}

function performGeocode(query) {
  if (!query) return alert("Digite algo para buscar.");

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
    .then(r => r.json())
    .then(res => {
      if (res.length === 0) return alert("Nada encontrado.");
      const loc = res[0];
      map.setView([loc.lat, loc.lon], 15);
    });
}

function goToMyLocation() {
  if (!navigator.geolocation) return alert("Seu navegador não suporta geolocalização.");
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    map.setView([latitude, longitude], 15);
    L.circle([latitude, longitude], { radius: 50 }).addTo(markerLayer);
  });
}

function fetchNearbySchools() {
  $("nearbyList").innerHTML = "Carregando escolas próximas...";

  fetch("https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&city=Bertolínia&limit=20&q=school")
    .then(r => r.json())
    .then(res => {
      if (!res.length) {
        $("nearbyList").innerHTML = "Nenhuma escola encontrada.";
        return;
      }

      let html = "<h4>Escolas próximas:</h4><ul>";

      res.forEach(s => {
        html += `<li>${s.display_name}</li>`;
        L.marker([s.lat, s.lon]).addTo(markerLayer).bindPopup("<b>Escola</b><br>" + s.display_name);
      });

      html += "</ul>";
      $("nearbyList").innerHTML = html;
    });
}

/* ---------- CLASSIFY ---------- */

function quickClassify() {
  const item = $("quickSelect").value;
  if (!item) return alert("Selecione um item.");
  $("quickResult").innerText = "Resultado: " + item;
}

function handleFile(file, mode) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (mode === "quick") {
      $("quickResult").innerText = "Imagem carregada (classificação manual).";
    } else {
      $("previewImage").src = reader.result;
      $("previewImage").classList.remove("hidden");
      $("classifyResult").innerText = "Imagem carregada. Escolha um tipo ou registre.";
    }
  };
  reader.readAsDataURL(file);
}

function manualClassify(type) {
  $("classifyResult").innerText = "Resultado: " + type;
  $("classifyTips").innerText = "Dicas sobre reciclagem de " + type + ".";
}

function saveAction() {
  const u = curUser();
  u.points += 5;
  store.save();
  renderDashboard();
  renderProfile();
  alert("Ação registrada! +5 pontos.");
}

/* ---------- QUIZ ---------- */

let miniCurrent = null;

function initMiniQuiz() {
  const q = store.get().quiz;
  miniCurrent = q[Math.floor(Math.random() * q.length)];

  $("miniQuestion").innerText = miniCurrent.q;
  $("miniOptions").innerHTML = "";

  miniCurrent.opts.forEach((o, i) => {
    const btn = document.createElement("button");
    btn.className = "pill";
    btn.innerText = o;
    btn.onclick = () => {
      if (i === miniCurrent.a) {
        alert("Correto! +3 pontos");
        curUser().points += 3;
        store.save();
        renderDashboard();
        renderProfile();
      } else {
        alert("Incorreto!");
      }
      initMiniQuiz();
    };
    $("miniOptions").appendChild(btn);
  });
}

/* Full Quiz */
let quizIndex = 0;

function initFullQuiz() {
  const q = store.get().quiz;
  $("quizTotal").innerText = q.length;
  loadQuestion();
}

function loadQuestion() {
  const q = store.get().quiz;
  const cur = q[quizIndex];

  $("quizQuestion").innerText = cur.q;
  $("quizAnswers").innerHTML = "";
  $("quizIndex").innerText = quizIndex + 1;

  cur.opts.forEach((o, i) => {
    const btn = document.createElement("button");
    btn.className = "pill";
    btn.innerText = o;
    btn.onclick = () => {
      if (i === cur.a) {
        alert("Certo! +4 pontos");
        curUser().points += 4;
        store.save();
        renderProfile();
        renderDashboard();
      } else {
        alert("Errado!");
      }

      quizIndex++;
      if (quizIndex >= q.length) quizIndex = 0;
      loadQuestion();
    };
    $("quizAnswers").appendChild(btn);
  });
              }
/* ---------- SUPPORT (Suporte) ---------- */

function sendSupport() {
    const name = $("supportName").value.trim() || curUser().name;
    const email = $("supportEmail").value.trim();
    const subj = $("supportSubject").value.trim();
    const msg = $("supportMsg").value.trim();

    if (!msg) return alert("Digite a descrição do problema.");

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
    alert("Mensagem enviada localmente!");
}

function renderSupportList() {
    const items = store.get().support || [];

    if (items.length === 0) {
        $("supportList").innerHTML = "<div class='muted'>Nenhuma mensagem registrada.</div>";
        return;
    }

    $("supportList").innerHTML = items
        .map(m => `
        <div class="support-item">
            <b>${m.subj}</b>
            <div class="muted small">${m.name} — ${new Date(m.date).toLocaleString()}</div>
            <p>${m.msg}</p>
        </div>
    `)
        .join("");
}

function clearSupportForm() {
    $("supportName").value = "";
    $("supportEmail").value = "";
    $("supportSubject").value = "";
    $("supportMsg").value = "";
}

/* ---------- PROFILE & AVATAR ---------- */

function renderProfile() {
    const u = curUser();
    $("profileNameLarge").innerText = u.name;
    $("profilePoints").innerText = u.points;
    $("topPoints").innerText = u.points;
    $("inputName").value = u.name;
    $("inputSchool").value = u.school;
    $("inputClass").value = u.class;

    if (u.avatarData) {
        $("avatarImg").src = u.avatarData;
        $("avatarPreview").classList.add("hidden");
    } else {
        $("avatarPreview").innerText = u.name.charAt(0).toUpperCase();
        $("avatarPreview").classList.remove("hidden");
    }
}

function saveProfile() {
    const u = curUser();
    u.name = $("inputName").value.trim() || "Visitante";
    u.school = $("inputSchool").value.trim();
    u.class = $("inputClass").value.trim();
    u.avatar = u.name.charAt(0).toUpperCase();
    store.save();
    renderProfile();
    renderLeaderboard();
    renderDashboard();
    alert("Perfil atualizado!");
}

function avatarUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        curUser().avatarData = reader.result;
        store.save();
        renderProfile();
    };
    reader.readAsDataURL(file);
}

/* ---------- EXPORT / IMPORT ---------- */

function exportData() {
    const data = store.get();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "recicla_interativo_data.json";
    a.click();
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
        try {
            const json = JSON.parse(r.result);
            localStorage.setItem("ri_state", JSON.stringify(json));
            alert("Importado com sucesso!");
            location.reload();
        } catch (e) {
            alert("Arquivo inválido!");
        }
    };
    r.readAsText(file);
}

/* ---------- LEADERBOARD ---------- */

function renderLeaderboard() {
    const users = store.get().users.sort((a, b) => b.points - a.points);

    $("leaderTop").innerHTML = users
        .slice(0, 5)
        .map(u => `
            <li>${u.name} <span class="muted">${u.points} pts</span></li>
        `)
        .join("");

    renderRankingList(users);
}

function renderRankingList(users) {
    $("rankingList").innerHTML = users
        .map(u => `
            <li>
                ${u.name}
                <div><small class="muted">${u.school || "-"} / ${u.class || "-"}</small>
                <strong>${u.points} pts</strong></div>
            </li>
        `)
        .join("");
}

/* ---------- DASHBOARD ---------- */

function renderDashboard() {
    const u = curUser();
    $("topPoints").innerText = u.points;

    renderLeaderboard();

    const groups = {};
    store.get().users.forEach(user => {
        if (user.school)
            groups[user.school] = (groups[user.school] || 0) + user.points;
    });

    $("schoolStats").innerHTML = Object.keys(groups).length
        ? Object.entries(groups)
              .map(([k, v]) => `<div>${k}: <strong>${v} pts</strong></div>`)
              .join("")
        : "<div class='muted'>Nenhuma escola registrada</div>";
}

/* ---------- QR CODE ---------- */

function openQRForCurrentUser() {
    const u = curUser();
    const text = `${u.name} | Pontos: ${u.points} | Escola: ${u.school} | Turma: ${u.class}`;

    const canvas = document.createElement("canvas");

    QRCode.toCanvas(canvas, text, { width: 220 }).then(() => {
        $("qrCanvas").innerHTML = "";
        $("qrCanvas").appendChild(canvas);
        $("qrModal").classList.remove("hidden");

        $("downloadQR").dataset.url = canvas.toDataURL("image/png");
    });
}

function downloadQR() {
    const url = $("downloadQR").dataset.url;
    if (!url) return;

    const a = document.createElement("a");
    a.href = url;
    a.download = "qr_usuario.png";
    a.click();
}

/* ---------- SERVICE WORKER ---------- */

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js");
    });
}
