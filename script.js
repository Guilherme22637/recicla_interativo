// Páginas
function showPage(pageId) {
document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
document.getElementById(pageId).style.display = 'block';
}

// Classificador de resíduos
function showTips(tipo) {
const tips = {
'Papel': 'Recicle papéis limpos e secos. Evite papéis engordurados.',
'Plástico': 'Lave as embalagens antes de descartar.',
'Vidro': 'Evite quebrar o vidro. Leve-o inteiro ao ponto de coleta.',
'Metal': 'Latas e tampas metálicas devem estar limpas.',
'Orgânico': 'Use em compostagem se possível.'
};
document.getElementById('tipText').innerText = tips[tipo];
}

// Quiz
const quizQuestions = [
{
question: 'Qual cor representa o lixo reciclável de plástico?',
answers: [
{ text: 'Amarelo', correct: false },
{ text: 'Vermelho', correct: true },
{ text: 'Verde', correct: false }
]
},
{
question: 'O que fazer com pilhas usadas?',
answers: [
{ text: 'Jogar no lixo comum', correct: false },
{ text: 'Levar a ponto de coleta', correct: true },
{ text: 'Enterrar no quintal', correct: false }
]
}
];

let quizIndex = 0;
let score = 0;

function loadQuiz() {
if(quizIndex >= quizQuestions.length){
document.getElementById('quizContainer').innerHTML = `<h3>Pontuação final: ${score}/${quizQuestions.length}</h3>`;
saveScore(score);
return;
}
const q = quizQuestions[quizIndex];
let html = `<p>${q.question}</p>`;
q.answers.forEach(a => {
html += `<button onclick="answerQuiz(${a.correct})">${a.text}</button>`;
});
document.getElementById('quizContainer').innerHTML = html;
}

function answerQuiz(correct){
if(correct) score++;
quizIndex++;
loadQuiz();
}

document.getElementById('quiz').addEventListener('click', loadQuiz, {once:true});

// Pontos de Coleta
const map = L.map('mapid').setView([-8.324, -43.955], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
L.marker([-8.324, -43.955]).addTo(map).bindPopup('Ponto de Coleta Central');

// Escolas
const schoolMap = L.map('schoolMap').setView([-8.324, -43.955], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(schoolMap);

fetch('https://nominatim.openstreetmap.org/search?city=Bertolinia&format=json&extratags=1&limit=50&q=Escola')
.then(res => res.json())
.then(data => {
const schoolList = document.getElementById('schoolList');
data.forEach(s => {
const lat = s.lat;
const lon = s.lon;
const name = s.display_name;
L.marker([lat, lon]).addTo(schoolMap).bindPopup(name);
const li = document.createElement('li');
li.innerText = name;
schoolList.appendChild(li);
});
});

// Suporte
document.getElementById('supportForm').addEventListener('submit', e => {
e.preventDefault();
document.getElementById('supportMsg').innerText = 'Mensagem enviada! Em breve entraremos em contato.';
e.target.reset();
});

// Perfil
document.getElementById('profilePicInput').addEventListener('change', e => {
const file = e.target.files[0];
if(file){
const reader = new FileReader();
reader.onload = () => {
document.getElementById('profilePic').src = reader.result;
};
reader.readAsDataURL(file);
}
});

// Firebase
const firebaseConfig = {
apiKey: "SUA_API_KEY",
authDomain: "SEU_PROJETO.firebaseapp.com",
projectId: "SEU_PROJETO",
storageBucket: "SEU_PROJETO.appspot.com",
messagingSenderId: "SEU_ID",
appId: "SEU_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

function register(){
const email = document.getElementById('loginEmail').value;
const pass = document.getElementById('loginPass').value;
auth.createUserWithEmailAndPassword(email, pass)
.then(() => document.getElementById('loginMsg').innerText='Registrado com sucesso!')
.catch(e => document.getElementById('loginMsg').innerText=e.message);
}

function login(){
const email = document.getElementById('loginEmail').value;
const pass = document.getElementById('loginPass').value;
auth.signInWithEmailAndPassword(email, pass)
.then(user => {
document.getElementById('loginMsg').innerText='Logado com sucesso!';
showPage('profile');
loadUserScore();
})
.catch(e => document.getElementById('loginMsg').innerText=e.message);
}

// Pontuação
function saveScore(score){
const user = auth.currentUser;
if(user){
db.collection("usuarios").doc(user.uid).set({
quizScore: score
}, { merge: true });
}
}

function loadUserScore(){
const user = auth.currentUser;
if(user){
db.collection("usuarios").doc(user.uid).get().then(doc => {
if(doc.exists && doc.data().quizScore){
document.getElementById('userScore').innerText = doc.data().quizScore;
}
});
}
}

// Service Worker
if ("serviceWorker" in navigator) {
window.addEventListener("load", () => {
navigator.serviceWorker.register("sw.js")
.then(() => console.log("Service Worker registrado!"));
});
}
