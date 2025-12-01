// Navegação
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.style.display = "none");
  document.getElementById(id).style.display = "block";
}
showPage("home");

// Classificador
function showTips(tipo) {
  const tips = {
    "Papel": "Recicle papéis limpos e secos.",
    "Plástico": "Lave embalagens antes de descartar.",
    "Vidro": "Leve os vidros inteiros aos pontos de coleta.",
    "Metal": "Latas e metais devem estar limpos.",
    "Orgânico": "Use em compostagem."
  };
  document.getElementById("tipsText").innerText = tips[tipo];
}

// Quiz
let quizIndex = 0;
let score = 0;

const questions = [
  {
    q: "Qual cor representa o plástico?",
    a: ["Amarelo", "Vermelho", "Verde"],
    c: 1
  },
  {
    q: "Onde descartar pilhas?",
    a: ["Lixo comum", "Ponto de coleta", "Enterrar"],
    c: 1
  }
];

function loadQuiz() {
  const q = questions[quizIndex];
  let html = `<h3>${q.q}</h3>`;
  q.a.forEach((alt, i) => {
    html += `<button onclick="answer(${i})">${alt}</button>`;
  });
  document.getElementById("quizContainer").innerHTML = html;
}
function answer(i) {
  if (i === questions[quizIndex].c) score++;
  quizIndex++;
  if (quizIndex >= questions.length) {
    document.getElementById("quizContainer").innerHTML =
      `<h3>Fim! Pontuação: ${score}/${questions.length}</h3>`;
  } else loadQuiz();
}
loadQuiz();

// Mapas — Bertolínia PI
let map = L.map('mapid').setView([-7.6111, -43.9494], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18
}).addTo(map);

L.marker([-7.610, -43.950]).addTo(map).bindPopup("Ponto de Coleta Central");

// Escolas
let schoolMap = L.map('schoolMap').setView([-7.6111, -43.9494], 14);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(schoolMap);

let schools = [
  { name: "U.E. Manoel Fernandes", lat: -7.6105, lon: -43.9490 },
  { name: "Escola Estadual Bertolínia", lat: -7.6120, lon: -43.9505 }
];

function updateSchoolList() {
  const ul = document.getElementById("schoolList");
  ul.innerHTML = "";
  schools.forEach(s => {
    ul.innerHTML += `<li>${s.name}</li>`;
    L.marker([s.lat, s.lon]).addTo(schoolMap).bindPopup(s.name);
  });
}
updateSchoolList();

function addSchool() {
  const name = document.getElementById("schoolName").value;
  if (!name) return;

  schools.push({ name, lat: -7.6111, lon: -43.9494 });
  updateSchoolList();
}

// Suporte
function sendSupport(e) {
  e.preventDefault();
  document.getElementById("supportResponse").innerText =
    "Mensagem enviada! Responderemos em breve.";
}

// Perfil
function loadProfilePic(event) {
  const img = document.getElementById("profilePic");
  img.src = URL.createObjectURL(event.target.files[0]);
}
