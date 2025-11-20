// Navegação
function openPage(page) {
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    document.getElementById(page).classList.remove("hidden");
    document.getElementById("menu").classList.add("hidden");
}

function goHome() {
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
    document.getElementById("menu").classList.remove("hidden");
}

// Sistema de Pontos
let pontos = Number(localStorage.getItem("pontos") || 0);
document.getElementById("perfilPontos").innerText = pontos;

// Classificador
const classificacoes = {
    "papel": "🟦 Papel — Lixeira azul",
    "plastico": "🟥 Plástico — Lixeira vermelha",
    "vidro": "🟩 Vidro — Lixeira verde",
    "metal": "🟨 Metal — Lixeira amarela",
    "organico": "🟫 Orgânico — Lixeira marrom",
    "eletronico": "⚫ Eletrônicos — Descarte especial"
};

function classificar() {
    const texto = document.getElementById("itemInput").value.toLowerCase();
    const result = classificacoes[texto] || "❓ Item não encontrado.";

    document.getElementById("resultadoClassificador").innerText = result;

    // Dá pontos se classificar certo
    if (classificacoes[texto]) {
        pontos += 10;
        localStorage.setItem("pontos", pontos);
        document.getElementById("perfilPontos").innerText = pontos;
    }
}

// Quiz
const perguntas = [
    {
        q: "Qual cor da lixeira de plástico?",
        a: "Vermelha"
    },
    {
        q: "O vidro é reciclável?",
        a: "Sim"
    },
    {
        q: "Qual lixeira do papel?",
        a: "Azul"
    }
];

let quizIndex = 0;

function carregarQuiz() {
    const box = document.getElementById("quizBox");

    if (quizIndex >= perguntas.length) {
        document.getElementById("quizScore").innerText = `Você ganhou ${pontos} pontos!`;
        return;
    }

    let p = perguntas[quizIndex];
    box.innerHTML = `
        <h3>${p.q}</h3>
        <button onclick="responder('Sim')">Sim</button>
        <button onclick="responder('Não')">Não</button>
        <button onclick="responder('Azul')">Azul</button>
        <button onclick="responder('Vermelha')">Vermelha</button>
    `;
}

function responder(resp) {
    if (resp === perguntas[quizIndex].a) {
        pontos += 20;
        localStorage.setItem("pontos", pontos);
        document.getElementById("perfilPontos").innerText = pontos;
    }
    quizIndex++;
    carregarQuiz();
}

carregarQuiz();

// Ranking
function atualizarRanking() {
    const ranking = [
        { nome: "Você", pontos: pontos },
        { nome: "Maria", pontos: 120 },
        { nome: "João", pontos: 90 }
    ];

    ranking.sort((a, b) => b.pontos - a.pontos);

    const list = document.getElementById("rankingList");
    list.innerHTML = ranking
        .map(p => `<li>${p.nome}: <b>${p.pontos}</b> pts</li>`)
        .join("");
}

atualizarRanking();

// Resetar
function resetarPontos() {
    pontos = 0;
    localStorage.setItem("pontos", 0);
    document.getElementById("perfilPontos").innerText = 0;
    atualizarRanking();
}
