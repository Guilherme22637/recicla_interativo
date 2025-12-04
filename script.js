/* Recicla Interativo — SCRIPT FINAL (parte 1)
   - Helpers e estado
   - 10 perguntas do quiz
*/

(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const qs = sel => document.querySelector(sel);
  const qsa = sel => Array.from(document.querySelectorAll(sel));

  const ls = (k, v) =>
    v === undefined
      ? JSON.parse(localStorage.getItem(k) || 'null')
      : localStorage.setItem(k, JSON.stringify(v));

  const BERT = { lat: -7.64123, lng: -43.9499, zoom: 13 };

  const QUIZ_MASTER = [
    { q: "O que significa reciclar?", opts: ["Reutilizar materiais", "Jogar no lixo", "Queimar resíduos"], a: 0 },
    { q: "Qual cor da lixeira para papel?", opts: ["Azul", "Verde", "Amarelo"], a: 0 },
    { q: "Qual material demora mais a decompor?", opts: ["Papel", "Vidro", "Fruta"], a: 1 },
    { q: "Qual destes é reciclável?", opts: ["Papel limpo", "Papel engordurado", "Lenço usado"], a: 0 },
    { q: "O que ajuda o meio ambiente?", opts: ["Economizar energia", "Deixar luz acesa", "Desperdiçar água"], a: 0 },
    { q: "Qual fonte é renovável?", opts: ["Carvão", "Solar", "Petróleo"], a: 1 },
    { q: "O que causa mais poluição?", opts: ["Carros", "Plantas", "Peixes"], a: 0 },
    { q: "O que é reflorestamento?", opts: ["Plantar árvores", "Cortar árvores", "Queimar mato"], a: 0 },
    { q: "Como reduzir lixo?", opts: ["Reutilizar", "Usar e jogar", "Comprar demais"], a: 0 },
    { q: "O que fazer com óleo de cozinha?", opts: ["Jogar no esgoto", "Levar ao ponto de coleta", "Jogar no quintal"], a: 1 }
  ];

  const defaultState = {
    users: [],
    currentUserId: null,
    quiz: QUIZ_MASTER,
    markers: [
      { title: "EcoPonto Central — Praça da Matriz", lat: -7.6410, lng: -43.9490 },
      { title: "Coleta de Pilhas — Prefeitura", lat: -7.6425, lng: -43.9512 },
      { title: "Ponto Reciclagem — Bairro Nova", lat: -7.6392, lng: -43.9475 }
    ],
    support: [],
    visionKey: ""
  };

  function loadState() {
    const s = ls('ri_state');
    if (!s) {
      ls('ri_state', defaultState);
      return JSON.parse(JSON.stringify(defaultState));
    }
    return s;
  }

  const store = (() => {
    let s = loadState();
    return {
      get() { return s; },
      save() { ls('ri_state', s); },
      reset() { localStorage.removeItem('ri_state'); location.reload(); }
    };
  })();

  function genId() { return "id_" + Math.random().toString(36).slice(2, 9); }

  function ensureGuest() {
    const st = store.get();
    if (!st.currentUserId) {
      const u = { id: genId(), name: "Visitante", points: 0, school: "", class: "", avatarData: "" };
      st.users.push(u);
      st.currentUserId = u.id;
      store.save();
    }
  }

  function curUser() { return store.get().users.find(u => u.id === store.get().currentUserId); }
   /* ========== INIT APP ========== */
  document.addEventListener("DOMContentLoaded", () => {
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
  function bindNavigation() {
    qsa(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => navTo(btn.dataset.page));
    });
  }

  function navTo(page) {
    qsa(".nav-btn").forEach(b => b.classList.remove("active"));
    qs(`.nav-btn[data-page="${page}"]`)?.classList.add("active");

    qsa(".page").forEach(p => p.classList.remove("active-page"));
    $(page).classList.add("active-page");

    $("pageTitle").innerText = page.charAt(0).toUpperCase() + page.slice(1);
  }

  /* ---------- Profile ---------- */
  function renderProfile() {
    const u = curUser();

    $("profileNameLarge").innerText = u.name;
    $("profilePoints").innerText = u.points;
    $("topPoints").innerText = u.points;
    $("userName").innerText = u.name;

    $("inputName").value = u.name;
    $("inputSchool").value = u.school;
    $("inputClass").value = u.class;
    $("inputVisionKey").value = store.get().visionKey;

    if (u.avatarData) $("avatarImg").src = u.avatarData;
  }

  /* ---------- Bind Actions ---------- */
  function bindActions() {
    $("saveProfile").onclick = saveProfile;
    $("inputAvatarFile").onchange = e => avatarUpload(e.target.files[0]);

    $("quickClassify").onclick = quickClassify;
    $("fileInput").onchange = e => handleFile(e.target.files[0], "quick");
    $("fileInputFull").onchange = e => handleFile(e.target.files[0], "full");

    qsa(".pill").forEach(b => b.onclick = () => manualClassify(b.dataset.type));

    $("saveAction").onclick = saveAction;
    $("genQRUser").onclick = openQRForCurrentUser;

    $("btnExport").onclick = exportData;
    $("btnImport").onclick = () => $("importFile").click();
    $("importFile").onchange = importData;
    $("resetAll").onclick = () => { if (confirm("Resetar tudo?")) store.reset(); };

    $("btnSendSupport").onclick = sendSupport;
    $("btnClearSupport").onclick = clearSupportForm;

    $("mapMyLoc").onclick = goToMyLocation;
    $("mapSearchBtn").onclick = () => performGeocode($("mapSearch").value);
    $("showSchoolsBtn").onclick = fetchNearbySchools;

    $("closeQR").onclick = () => $("qrModal").classList.add("hidden");
  }

  /* ---------- Save Profile ---------- */
  function saveProfile() {
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
  function avatarUpload(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      curUser().avatarData = r.result;
      store.save();
      renderProfile();
    };
    r.readAsDataURL(file);
  }

  /* ---------- File Classifier ---------- */
  function handleFile(file, mode) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      if (mode === "quick") {
        $("quickResult").innerText = "Resultado: " + heuristicFromFilename(file.name);
      } else {
        $("classifyResult").innerText = "Analisado";
        $("classifyTips").innerText = "Use registrar ação ou QR.";
      }
    };
    r.readAsDataURL(file);
  }

  function heuristicFromFilename(n) {
    const t = n.toLowerCase();
    if (t.includes("plast")) return "Plástico";
    if (t.includes("vidro")) return "Vidro";
    if (t.includes("papel")) return "Papel";
    if (t.includes("metal")) return "Metal";
    return "Desconhecido";
  }

  function manualClassify(type) {
    $("classifyResult").innerText = type;
    $("classifyTips").innerText = "Categoria escolhida: " + type;
  }

  function quickClassify() {
    const sel = $("quickSelect").value;
    if (!sel) return alert("Escolha algo.");
    $("quickResult").innerText = "Resultado: " + sel;
  }

  /* ---------- Save Action (points) ---------- */
  function saveAction() {
    curUser().points += 5;
    store.save();
    renderProfile();
    renderLeaderboard();
    alert("Ação registrada! +5 pts");
     }
   /* ---------- QR ---------- */
  function openQRForCurrentUser() {
    const u = curUser();
    const txt = `${u.name} | Pontos: ${u.points}`;

    const canvas = document.createElement("canvas");
    QRCode.toCanvas(canvas, txt, { width: 220 }).then(() => {
      $("qrCanvas").innerHTML = "";
      $("qrCanvas").appendChild(canvas);
      $("qrModal").classList.remove("hidden");
      $("downloadQR").dataset.url = canvas.toDataURL("image/png");
    });
  }

  $("downloadQR").onclick = () => {
    const a = document.createElement("a");
    a.href = $("downloadQR").dataset.url;
    a.download = "qr.png";
    a.click();
  };

  /* ---------- MINI QUIZ ---------- */
  function initMiniQuiz() {
    const q = QUIZ_MASTER[Math.floor(Math.random() * QUIZ_MASTER.length)];
    $("miniQuestion").innerText = q.q;

    const box = $("miniOptions");
    box.innerHTML = "";

    q.opts.forEach((opt, i) => {
      const b = document.createElement("button");
      b.className = "pill";
      b.innerText = opt;
      b.onclick = () => {
        if (i === q.a) {
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

  /* ---------- FULL QUIZ (10 perguntas por rodada) ---------- */
  let quizIndex = 0;
  let QUIZ_ROUND = [...QUIZ_MASTER];

  function initFullQuiz() {
    shuffle(QUIZ_ROUND);
    quizIndex = 0;
    $("quizTotal").innerText = QUIZ_ROUND.length;
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    if (quizIndex >= QUIZ_ROUND.length) {
      $("quizQuestion").innerText = "Quiz concluído!";
      $("quizAnswers").innerHTML = "";
      quizIndex = 0;
      shuffle(QUIZ_ROUND);
      return;
    }

    const q = QUIZ_ROUND[quizIndex];

    $("quizQuestion").innerText = q.q;
    $("quizIndex").innerText = quizIndex + 1;

    const cont = $("quizAnswers");
    cont.innerHTML = "";

    q.opts.forEach((opt, i) => {
      const b = document.createElement("button");
      b.className = "btn soft";
      b.innerText = opt;
      b.onclick = () => {
        if (i === q.a) {
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

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  /* ---------- Leaderboard ---------- */
  function renderLeaderboard() {
    const users = store.get().users.slice().sort((a, b) => b.points - a.points);

    $("leaderTop").innerHTML = users.slice(0, 5)
      .map(u => `<li>${u.name} <span class="muted">${u.points} pts</span></li>`)
      .join("");

    $("rankingList").innerHTML = users
      .map(u => `
        <li>${u.name}
          <div>
            <small class="muted">${u.school || "-"} / ${u.class || "-"}</small>
            <strong>${u.points} pts</strong>
          </div>
        </li>
      `).join("");
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    const u = curUser();
    $("topPoints").innerText = u.points;

    const groups = {};
    store.get().users.forEach(x => {
      if (x.school) groups[x.school] = (groups[x.school] || 0) + (x.points || 0);
    });

    $("schoolStats").innerHTML = Object.entries(groups).length
      ? Object.entries(groups).map(([s, p]) => `<div>${s}: <strong>${p} pts</strong></div>`).join("")
      : "<div class='muted'>Nenhuma escola registrada</div>";

    const canvas = document.createElement("canvas");
    QRCode.toCanvas(canvas, `${u.name}`, { width: 110 }).then(() => {
      $("qrPreview").innerHTML = "";
      $("qrPreview").appendChild(canvas);
    });
  }
   /* ---------- Export / Import ---------- */
  function exportData() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(
      [JSON.stringify(store.get(), null, 2)],
      { type: "application/json" }
    ));
    a.download = "recicla_data.json";
    a.click();
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(r.result);
        ls("ri_state", obj);
        alert("Importado com sucesso!");
        location.reload();
      } catch (err) {
        alert("Arquivo inválido.");
      }
    };
    r.readAsText(file);
  }

  /* ---------- SUPORTE ---------- */
  function sendSupport() {
    const name = $("supportName").value.trim() || curUser().name;
    const email = $("supportEmail").value.trim();
    const subject = $("supportSubject").value.trim();
    const msg = $("supportMsg").value.trim();

    if (!msg) return alert("Digite a mensagem.");

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
    alert("Mensagem enviada!");
  }

  function renderSupportList() {
    const arr = store.get().support;
    $("supportList").innerHTML = arr.length
      ? arr.map(m => `
          <div style="margin-bottom:10px;border-bottom:1px dashed #ffffff33;padding-bottom:6px;">
            <b>${m.subject || "Sem assunto"}</b><br>
            <small class="muted">${m.name} — ${new Date(m.date).toLocaleString()}</small>
            <div style="margin-top:5px">${m.msg}</div>
          </div>
        `).join("")
      : "<div class='muted'>Nenhuma mensagem.</div>";
  }

  function clearSupportForm() {
    $("supportName").value = "";
    $("supportEmail").value = "";
    $("supportSubject").value = "";
    $("supportMsg").value = "";
  }

  /* ---------- MAPA ---------- */
  let map;
  let leafletMarkers = [];

  function initMap() {
    map = L.map("mapCanvas").setView([BERT.lat, BERT.lng], BERT.zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    renderMarkers();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        map.setView([lat, lng], 14);

        L.circle([lat, lng], {
          radius: 70,
          color: "#22c55e"
        }).addTo(map);

        renderNearby(lat, lng);
      });
    }

    map.on("click", e => {
      const title = prompt("Nome do ponto de coleta:");
      if (!title) return;

      store.get().markers.push({
        title,
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });

      store.save();
      renderMarkers();
    });
  }

  function renderMarkers() {
    leafletMarkers.forEach(m => map.removeLayer(m));
    leafletMarkers = [];

    store.get().markers.forEach(p => {
      leafletMarkers.push(
        L.marker([p.lat, p.lng]).addTo(map).bindPopup("<b>" + p.title + "</b>")
      );
    });
  }

  function renderNearby(lat, lng) {
    const pts = store.get().markers
      .map(p => ({ ...p, dist: distanceKm(lat, lng, p.lat, p.lng) }))
      .filter(p => p.dist <= 50)
      .sort((a, b) => a.dist - b.dist);

    $("nearbyList").innerHTML = pts.length
      ? "<h4>Próximos:</h4>" +
        pts.map(p => `<div>${p.title} — ${p.dist.toFixed(1)} km</div>`).join("")
      : "<div class='muted'>Nenhum ponto próximo.</div>";
  }

  function distanceKm(a, b, c, d) {
    const R = 6371;
    const dLat = (c - a) * Math.PI / 180;
    const dLon = (d - b) * Math.PI / 180;

    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(a * Math.PI / 180) *
        Math.cos(c * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  /* ---------- Buscar endereço ---------- */
  async function performGeocode(q) {
    if (!q) return alert("Digite algo para buscar.");

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.length) return alert("Nada encontrado.");

    const d = data[0];
    const lat = parseFloat(d.lat);
    const lon = parseFloat(d.lon);

    map.setView([lat, lon], 15);
    L.marker([lat, lon]).addTo(map).bindPopup(d.display_name).openPopup();
  }

  /* ---------- Adicionar escolas automaticamente ---------- */
  async function fetchNearbySchools() {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&q=school%20Bertolinia&limit=15";

    const res = await fetch(url);
    const data = await res.json();

    if (!data.length) return alert("Nenhuma escola encontrada.");

    data.forEach(d => {
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

}); // FINAL DO DOMContentLoaded
