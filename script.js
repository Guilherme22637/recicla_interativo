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
