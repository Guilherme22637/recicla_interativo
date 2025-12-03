// ---------------- HELPERS ----------------
const $ = id => document.getElementById(id);

function genId(){ return "id_" + Math.random().toString(36).substr(2,8); }

// ESTADO LOCAL
const defaultState = {
    users: [],
    currentUserId: null,
    quiz: [
        { q: "Qual cor representa o lixo plástico?", opts:["Amarelo","Vermelho","Verde"], a:1 },
        { q: "O que fazer com pilhas usadas?", opts:["Lixo comum","Levar ao ponto de coleta","Enterrar"], a:1 },
        { q: "Papel engordurado pode ser reciclado?", opts:["Sim","Não","Depende"], a:1 }
    ],
    markers: [
        {title:"EcoPonto Central", lat:-7.6410, lng:-43.9490}
    ]
};

// CARREGAR ESTADO
function loadState(){
    let s = localStorage.getItem("ri_state");
    if(!s){
        localStorage.setItem("ri_state", JSON.stringify(defaultState));
        return JSON.parse(JSON.stringify(defaultState));
    }
    return JSON.parse(s);
}

let store = loadState();

function saveStore(){
    localStorage.setItem("ri_state", JSON.stringify(store));
}

// ---------------- NAV ----------------
document.querySelectorAll(".nav-btn").forEach(btn=>{
    btn.onclick = () => navTo(btn.dataset.page);
});

function navTo(page){
    document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
    document.querySelector(`.nav-btn[data-page="${page}"]`).classList.add("active");

    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active-page"));
    $(page).classList.add("active-page");

    $("pageTitle").innerText = page.charAt(0).toUpperCase()+page.slice(1);
}

// ---------------- USER ----------------
function ensureUser(){
    if(!store.currentUserId){
        let u = {
            id: genId(),
            name: "Visitante",
            school: "",
            class: "",
            points: 0
        };
        store.users.push(u);
        store.currentUserId = u.id;
        saveStore();
    }
}

function curUser(){
    return store.users.find(u=>u.id === store.currentUserId);
}

// ---------------- PERFIL ----------------
$("saveProfile").onclick = () => {
    let u = curUser();
    u.name = $("inputName").value.trim() || "Visitante";
    u.school = $("inputSchool").value.trim();
    u.class = $("inputClass").value.trim();
    saveStore();
    renderProfile();
};

function renderProfile(){
    let u = curUser();
    $("profilePoints").innerText = u.points;
    $("inputName").value = u.name;
    $("inputSchool").value = u.school;
    $("inputClass").value = u.class;
}

// ---------------- QR ----------------
$("genQRUser").onclick = () => {
    let u = curUser();
    let text = `${u.name} | ${u.points} pts | ${location.href}`;

    let canvas = document.createElement("canvas");

    QRCode.toCanvas(canvas, text, { width: 250 })
        .then(()=>{
            $("qrCanvas").innerHTML = "";
            $("qrCanvas").appendChild(canvas);
            $("qrModal").classList.remove("hidden");
            $("downloadQR").dataset.url = canvas.toDataURL();
        });
};

$("closeQR").onclick = ()=> $("qrModal").classList.add("hidden");

$("downloadQR").onclick = () => {
    let a = document.createElement("a");
    a.href = $("downloadQR").dataset.url;
    a.download = "qr_recicla.png";
    a.click();
};

// ---------------- QUIZ ----------------
let quizIndex = 0;

function renderQuiz(){
    const q = store.quiz[quizIndex];
    $("quizQuestion").innerText = q.q;

    $("quizAnswers").innerHTML = "";

    q.opts.forEach((op, i)=>{
        let btn = document.createElement("button");
        btn.innerText = op;
        btn.onclick = () => {
            if(i === q.a){
                curUser().points += 10;
                saveStore();
                alert("Resposta correta! +10 pontos");
            }
            quizIndex++;
            if(quizIndex >= store.quiz.length){
                quizIndex = 0;
            }
            renderQuiz();
        };
        $("quizAnswers").appendChild(btn);
    });
}

// ---------------- RANKING ----------------
function renderRanking(){
    let list = store.users.sort((a,b)=>b.points - a.points);
    $("rankingList").innerHTML = list.map(u=>`<li>${u.name} — <b>${u.points} pts</b></li>`).join("");
}

// ---------------- MAPA ----------------
let map, leafletMarkers=[];

function initMap(){
    map = L.map("mapCanvas").setView([-7.6410,-43.9490], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
    }).addTo(map);

    renderMarkers();
}

function renderMarkers(){
    leafletMarkers.forEach(m=>map.removeLayer(m));
    leafletMarkers=[];

    store.markers.forEach(m=>{
        let mk = L.marker([m.lat, m.lng]).addTo(map);
        mk.bindPopup(m.title);
        leafletMarkers.push(mk);
    });
}

$("mapSearchBtn").onclick = async ()=>{
    let query = $("mapSearch").value.trim();
    if(!query) return alert("Digite algo");

    let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

    let r = await fetch(url);
    let j = await r.json();

    if(!j.length){
        alert("Nada encontrado");
        return;
    }

    let lat = parseFloat(j[0].lat);
    let lon = parseFloat(j[0].lon);

    map.setView([lat,lon], 15);

    L.marker([lat,lon]).addTo(map);
};

// ---------------- INIT ----------------
window.onload = () => {
    ensureUser();
    renderProfile();
    renderQuiz();
    renderRanking();
    initMap();
};
