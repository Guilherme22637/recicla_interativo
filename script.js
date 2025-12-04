/* Recicla Interativo — SCRIPT FINAL (corrigido, resiliente)
   - Inicialização segura (DOMContentLoaded)
   - Quiz infinito (10 por rodada)
   - Mini-quiz aleatório
   - QR, mapa, suporte, perfil, import/export
   - Proteções para evitar erros quando elemento ausente
*/

(function () {
  'use strict';

  /* ---------- Helpers ---------- */
  const $ = id => document.getElementById(id);
  const qs = sel => document.querySelector(sel);
  const qsa = sel => Array.from(document.querySelectorAll(sel));
  const ls = (k, v) => (v === undefined ? JSON.parse(localStorage.getItem(k) || 'null') : localStorage.setItem(k, JSON.stringify(v)));

  /* ---------- Default City (Bertolínia PI) ---------- */
  const BERT = { lat: -7.64123, lng: -43.9499, zoom: 13 };

  /* ---------- QUIZ — 10 perguntas base ---------- */
  const QUIZ_MASTER = [
    { q: "O que significa reciclar?", opts: ["Reutilizar materiais", "Jogar no lixo", "Queimar resíduos"], a: 0 },
    { q: "Qual cor da lixeira para papel?", opts: ["Azul", "Verde", "Amarelo"], a: 0 },
    { q: "Qual material demora mais a decompor?", opts: ["Papel", "Vidro", "Fruta"], a: 1 },
    { q: "Qual desses é reciclável?", opts: ["Papel limpo", "Papel engordurado", "Lenço usado"], a: 0 },
    { q: "Qual ajuda o meio ambiente?", opts: ["Economizar energia", "Deixar luz acesa", "Desperdiçar água"], a: 0 },
    { q: "Qual fonte é renovável?", opts: ["Carvão", "Solar", "Petróleo"], a: 1 },
    { q: "Um grande causador de poluição?", opts: ["Carros", "Plantas", "Peixes"], a: 0 },
    { q: "O que é reflorestamento?", opts: ["Plantar árvores", "Cortar árvores", "Queimar mato"], a: 0 },
    { q: "Como reduzir lixo?", opts: ["Reutilizar", "Usar e jogar muito", "Comprar demais"], a: 0 },
    { q: "O que devemos fazer com óleo de cozinha?", opts: ["Descartar no esgoto", "Guardar e levar ao ponto de coleta", "Jogar no quintal"], a: 1 }
  ];

  /* ---------- Default State ---------- */
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

  /* ---------- Load / Save ---------- */
  function loadState() {
    const s = ls('ri_state');
    if (!s) { ls('ri_state', defaultState); return JSON.parse(JSON.stringify(defaultState)); }
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

  /* ---------- Ensure User ---------- */
  function ensureGuest() {
    const state = store.get();
    if (!state.currentUserId) {
      const user = { id: genId(), name: "Visitante", points: 0, school: "", class: "", avatarData: "" };
      state.users.push(user);
      state.currentUserId = user.id;
      store.save();
    }
  }
  function curUser() { return store.get().users.find(u => u.id === store.get().currentUserId); }

  /* ========== Safe DOM helpers ========== */
  function safeAddListener(id, ev, fn) { const el = $(id); if (el) el.addEventListener(ev, fn); }
  function safeSetText(id, text) { const el = $(id); if (el) el.innerText = text; }
  function safeHtml(id, html) { const el = $(id); if (el) el.innerHTML = html; }

  /* ========== Initialization ========== */
  document.addEventListener('DOMContentLoaded', () => {
    try {
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
      console.log('[RI] inicialização completa');
    } catch (e) {
      console.error('[RI] erro na inicialização', e);
    }
  });

  /* ---------- Navigation ---------- */
  function bindNavigation() {
    qsa(".nav-btn").forEach(btn => {
      btn.addEventListener('click', () => navTo(btn.dataset.page));
    });
  }
  function navTo(page) {
    try {
      qsa(".nav-btn").forEach(b => b.classList.remove("active"));
      const btn = document.querySelector(`.nav-btn[data-page="${page}"]`);
      if (btn) btn.classList.add("active");

      qsa(".page").forEach(p => p.classList.remove("active-page"));
      const pg = $(page);
      if (pg) pg.classList.add("active-page");

      safeSetText('pageTitle', page.charAt(0).toUpperCase() + page.slice(1));
    } catch (e) {
      console.error('navTo error', e);
    }
  }

  /* ---------- Profile ---------- */
  function renderProfile() {
    const u = curUser();
    if (!u) return;
    safeSetText('profileNameLarge', u.name || 'Visitante');
    safeSetText('profilePoints', u.points || 0);
    safeSetText('topPoints', u.points || 0);
    safeSetText('userName', u.name || 'Visitante');

    if ($('inputName')) $('inputName').value = u.name || '';
    if ($('inputSchool')) $('inputSchool').value = u.school || '';
    if ($('inputClass')) $('inputClass').value = u.class || '';
    if ($('inputVisionKey')) $('inputVisionKey').value = store.get().visionKey || '';

    if (u.avatarData && $('avatarImg')) $('avatarImg').src = u.avatarData;
  }

  function bindActions() {
    safeAddListener('saveProfile', 'click', saveProfile);
    safeAddListener('inputAvatarFile', 'change', e => avatarUpload(e.target.files && e.target.files[0]));

    safeAddListener('quickClassify', 'click', quickClassify);
    safeAddListener('fileInput', 'change', e => handleFile(e.target.files && e.target.files[0], 'quick'));
    safeAddListener('fileInputFull', 'change', e => handleFile(e.target.files && e.target.files[0], 'full'));

    qsa('.pill').forEach(b => b.addEventListener('click', () => manualClassify(b.dataset.type)));

    safeAddListener('saveAction', 'click', saveAction);
    safeAddListener('genQRUser', 'click', openQRForCurrentUser);

    safeAddListener('btnExport', 'click', exportData);
    safeAddListener('btnImport', 'click', () => { const f = $('importFile'); if (f) f.click(); });
    safeAddListener('importFile', 'change', importData);
    safeAddListener('resetAll', 'click', () => { if (confirm('Resetar tudo?')) store.reset(); });

    safeAddListener('btnSendSupport', 'click', sendSupport);
    safeAddListener('btnClearSupport', 'click', clearSupportForm);

    safeAddListener('mapMyLoc', 'click', goToMyLocation);
    safeAddListener('mapSearchBtn', 'click', () => performGeocode($('mapSearch')?.value || ''));
    safeAddListener('showSchoolsBtn', 'click', fetchNearbySchools);

    safeAddListener('closeQR', 'click', () => $('qrModal')?.classList.add('hidden'));
    safeAddListener('downloadQR', 'click', () => {
      const url = $('downloadQR')?.dataset?.url;
      if (!url) return alert('Nenhum QR gerado.');
      const a = document.createElement('a'); a.href = url; a.download = 'qr_usuario.png'; a.click();
    });
  }

  /* ---------- Save Profile ---------- */
  function saveProfile() {
    try {
      const u = curUser();
      if (!u) return;
      if ($('inputName')) u.name = $('inputName').value.trim() || 'Visitante';
      if ($('inputSchool')) u.school = $('inputSchool').value.trim();
      if ($('inputClass')) u.class = $('inputClass').value.trim();
      if ($('inputVisionKey')) store.get().visionKey = $('inputVisionKey').value.trim();

      store.save();
      renderProfile(); renderLeaderboard(); renderDashboard();
      alert('Perfil salvo.');
    } catch (e) { console.error('saveProfile', e); alert('Erro ao salvar perfil.'); }
  }

  /* ---------- Avatar Upload ---------- */
  function avatarUpload(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const u = curUser();
      if (!u) return;
      u.avatarData = r.result;
      store.save();
      renderProfile();
    };
    r.readAsDataURL(file);
  }

  /* ---------- Classifier (simple) ---------- */
  function handleFile(file, mode = 'quick') {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        if (mode === 'quick') {
          if ($('previewImage')) { $('previewImage').src = r.result; $('previewImage').classList.remove('hidden'); }
          safeSetText('quickResult', 'Resultado: ' + heuristicFromFilename(file.name));
        } else {
          if ($('previewImage')) { $('previewImage').src = r.result; $('previewImage').classList.remove('hidden'); }
          safeSetText('classifyResult', 'Analisado (manual)');
          safeSetText('classifyTips', 'Use Registrar ação ou Gerar QR.');
        }
      } catch (e) { console.error('handleFile', e); }
    };
    r.readAsDataURL(file);
  }

  function heuristicFromFilename(n) {
    const t = (n || '').toLowerCase();
    if (t.includes('plast') || t.includes('pet')) return 'Plástico';
    if (t.includes('vidro') || t.includes('glass')) return 'Vidro';
    if (t.includes('papel') || t.includes('paper') || t.includes('cardboard')) return 'Papel';
    if (t.includes('metal') || t.includes('lata') || t.includes('can')) return 'Metal';
    return 'Desconhecido';
  }

  function manualClassify(type) {
    safeSetText('classifyResult', type);
    safeSetText('classifyTips', tipsFor(type));
  }

  function quickClassify() {
    const sel = $('quickSelect')?.value;
    if (!sel) return alert('Escolha manualmente ou envie imagem.');
    safeSetText('quickResult', 'Resultado: ' + sel);
  }

  function tipsFor(cat) {
    if (!cat) return '';
    switch (cat.toLowerCase()) {
      case 'papel': return 'Recicle papéis limpos e secos. Evite papéis engordurados.';
      case 'plástico': return 'Lave as embalagens antes de descartar.';
      case 'vidro': return 'Evite quebrar o vidro. Leve inteiro ao ponto de coleta.';
      case 'metal': return 'Latas e tampas metálicas devem estar limpas.';
      case 'orgânico': return 'Use em compostagem se possível.';
      default: return 'Categoria indefinida. Verifique regras locais.';
    }
  }

  /* ---------- Save Action (+points) ---------- */
  function saveAction() {
    try {
      const u = curUser();
      if (!u) return;
      const pts = 5;
      u.points = (u.points || 0) + pts;
      store.save();
      renderProfile(); renderLeaderboard(); renderDashboard();
      alert(`Ação registrada. +${pts} pontos.`);
    } catch (e) { console.error('saveAction', e); }
  }

  /* ---------- QR ---------- */
  function openQRForCurrentUser() {
    const u = curUser();
    if (!u) return;
    const text = `${u.name} | Pontos: ${u.points || 0} | ${location.origin}${location.pathname}`;
    const canvas = document.createElement('canvas');
    QRCode.toCanvas(canvas, text, { width: 220 }).then(() => {
      if ($('qrCanvas')) { $('qrCanvas').innerHTML = ''; $('qrCanvas').appendChild(canvas); }
      $('qrModal')?.classList.remove('hidden');
      if ($('downloadQR')) $('downloadQR').dataset.url = canvas.toDataURL('image/png');
    }).catch(err => console.error('QRCode error', err));
  }

  /* ---------- MINI QUIZ (dashboard) ---------- */
  function initMiniQuiz() {
    try {
      const q = QUIZ_MASTER[Math.floor(Math.random() * QUIZ_MASTER.length)];
      if ($('miniQuestion')) $('miniQuestion').innerText = q.q;
      const box = $('miniOptions'); if (!box) return;
      box.innerHTML = '';
      q.opts.forEach((o, i) => {
        const b = document.createElement('button'); b.className = 'pill'; b.innerText = o;
        b.addEventListener('click', () => {
          if (i === q.a) {
            const u = curUser(); u.points = (u.points || 0) + 3; store.save(); renderProfile(); renderLeaderboard();
            alert('Correto! +3 pts');
          } else alert('Errado — tente de novo.');
        });
        box.appendChild(b);
      });
    } catch (e) { console.error('initMiniQuiz', e); }
  }

  /* ---------- FULL QUIZ (10 por rodada, infinito) ---------- */
  let quizIndex = 0;
  let QUIZ_ROUND = [];

  function initFullQuiz() {
    QUIZ_ROUND = shuffleArray(store.get().quiz.slice()); // clone + shuffle
    quizIndex = 0;
    safeSetText('quizTotal', Math.min(10, QUIZ_ROUND.length));
    // ensure we only show 10 per rodada (if master larger, we will use first 10 of shuffled)
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    try {
      // guard
      if (!QUIZ_ROUND || QUIZ_ROUND.length === 0) { safeSetText('quizQuestion', 'Sem perguntas.'); $('quizAnswers') && ($('quizAnswers').innerHTML = ''); return; }

      // If we've shown 10 questions in this round, rebuild a new round
      if (quizIndex >= Math.min(10, QUIZ_ROUND.length)) {
        // start a new round instantly (infinite)
        QUIZ_ROUND = shuffleArray(store.get().quiz.slice());
        quizIndex = 0;
      }

      const q = QUIZ_ROUND[quizIndex];
      if ($('quizQuestion')) $('quizQuestion').innerText = q.q;
      if ($('quizIndex')) $('quizIndex').innerText = (quizIndex + 1);

      const cont = $('quizAnswers');
      if (!cont) return;
      cont.innerHTML = '';

      q.opts.forEach((opt, i) => {
        const b = document.createElement('button'); b.className = 'btn soft'; b.innerText = opt;
        b.addEventListener('click', () => {
          const u = curUser();
          if (i === q.a) {
            u.points = (u.points || 0) + 10;
            store.save();
            renderProfile(); renderLeaderboard();
            alert('Acertou! +10 pts');
          } else {
            alert('Resposta incorreta.');
          }
          quizIndex++;
          // small delay to allow UI updates then next question
          setTimeout(renderQuizQuestion, 200);
        });
        cont.appendChild(b);
      });
      // ensure quizTotal shows 10
      safeSetText('quizTotal', Math.min(10, store.get().quiz.length));
    } catch (e) { console.error('renderQuizQuestion', e); }
  }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ---------- Leaderboard ---------- */
  function renderLeaderboard() {
    try {
      const users = store.get().users.slice().sort((a, b) => (b.points || 0) - (a.points || 0));
      if ($('leaderTop')) $('leaderTop').innerHTML = users.slice(0, 5).map(u => `<li>${escapeHtml(u.name)} <span class="muted">${u.points || 0} pts</span></li>`).join('');
      if ($('rankingList')) $('rankingList').innerHTML = users.map(u => `<li>${escapeHtml(u.name)}<div><small class="muted">${escapeHtml(u.school || '-')} / ${escapeHtml(u.class || '-')}</small> <strong>${u.points || 0} pts</strong></div></li>`).join('');
    } catch (e) { console.error('renderLeaderboard', e); }
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    try {
      const u = curUser();
      if (u && $('topPoints')) $('topPoints').innerText = u.points || 0;

      const groups = {};
      store.get().users.forEach(x => { if (x.school) groups[x.school] = (groups[x.school] || 0) + (x.points || 0); });
      if ($('schoolStats')) {
        $('schoolStats').innerHTML = Object.keys(groups).length ? Object.entries(groups).map(([s, p]) => `<div>${escapeHtml(s)}: <strong>${p} pts</strong></div>`).join('') : "<div class='muted'>Nenhuma escola registrada</div>";
      }

      // small QR preview
      if ($('qrPreview')) {
        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, (u && u.name) ? u.name : 'Visitante', { width: 110 }).then(() => {
          $('qrPreview').innerHTML = ''; $('qrPreview').appendChild(canvas);
        }).catch(err => console.error('qr preview error', err));
      }
    } catch (e) { console.error('renderDashboard', e); }
  }

  /* ---------- Export / Import ---------- */
  function exportData() {
    try {
      const blob = new Blob([JSON.stringify(store.get(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'recicla_data.json'; a.click();
    } catch (e) { console.error('exportData', e); }
  }

  function importData(e) {
    try {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const json = JSON.parse(r.result);
          ls('ri_state', json);
          alert('Import concluído. Recarregando...');
          location.reload();
        } catch (err) { alert('Arquivo inválido.'); console.error(err); }
      };
      r.readAsText(f);
    } catch (e) { console.error('importData', e); }
  }

  /* ---------- Support ---------- */
  function sendSupport() {
    try {
      const name = ($('supportName') && $('supportName').value.trim()) || curUser().name;
      const email = $('supportEmail') && $('supportEmail').value.trim();
      const subject = $('supportSubject') && $('supportSubject').value.trim();
      const msg = $('supportMsg') && $('supportMsg').value.trim();
      if (!msg) return alert('Escreva a descrição do problema.');

      store.get().support.push({ id: genId(), name, email, subject, msg, date: new Date().toISOString() });
      store.save();
      renderSupportList();
      alert('Mensagem registrada localmente. Obrigado!');
      clearSupportForm();
    } catch (e) { console.error('sendSupport', e); alert('Erro ao enviar mensagem.'); }
  }

  function renderSupportList() {
    try {
      const arr = store.get().support || [];
      if ($('supportList')) {
        $('supportList').innerHTML = arr.length ? arr.map(m => `<div style="margin-bottom:8px;border-bottom:1px dashed rgba(255,255,255,0.03);padding-bottom:6px"><b>${escapeHtml(m.subject || 'Sem assunto')}</b><div class="muted small">${escapeHtml(m.name)} • ${new Date(m.date).toLocaleString()}</div><div style="margin-top:6px">${escapeHtml(m.msg)}</div></div>`).join('') : 'Nenhuma mensagem.';
      }
    } catch (e) { console.error('renderSupportList', e); }
  }

  function clearSupportForm() {
    if ($('supportName')) $('supportName').value = '';
    if ($('supportEmail')) $('supportEmail').value = '';
    if ($('supportSubject')) $('supportSubject').value = '';
    if ($('supportMsg')) $('supportMsg').value = '';
  }

  /* ---------- Map (Leaflet + markers) ---------- */
  let map;
  let leafletMarkers = [];

  function initMap() {
    try {
      if (!('L' in window)) { console.warn('Leaflet não carregado'); return; }
      const el = $('mapCanvas'); if (!el) return;
      map = L.map('mapCanvas').setView([BERT.lat, BERT.lng], BERT.zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      renderMarkers();

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          const lat = pos.coords.latitude, lng = pos.coords.longitude;
          map.setView([lat, lng], 13);
          L.circle([lat, lng], { radius: 50, color: '#22c55e' }).addTo(map);
          renderNearby(lat, lng);
        }, () => renderNearby(BERT.lat, BERT.lng));
      } else renderNearby(BERT.lat, BERT.lng);

      map.on('click', e => {
        const title = prompt('Título do ponto:', 'Novo Ponto');
        if (!title) return;
        store.get().markers.push({ title, lat: e.latlng.lat, lng: e.latlng.lng });
        store.save();
        renderMarkers();
      });
    } catch (e) { console.error('initMap', e); }
  }

  function renderMarkers() {
    try {
      if (!map) return;
      leafletMarkers.forEach(m => map.removeLayer(m)); leafletMarkers = [];
      store.get().markers.forEach(p => {
        const mk = L.marker([p.lat, p.lng]).addTo(map).bindPopup(`<b>${escapeHtml(p.title)}</b>`);
        leafletMarkers.push(mk);
      });
    } catch (e) { console.error('renderMarkers', e); }
  }

  fu
