const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "https://cdn.jsdelivr.net/gh/CristianVeggian/blog-assets/games/lol-quiz/style.css";
document.head.appendChild(link);

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap";
document.head.appendChild(fontLink);

window.startTime = null;
window.timerInterval = null;


// === Dependência obrigatória (adicione isso no HTML) ===
// <script src="https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js"></script>

// === Controle de telas ===
function changeScreen(screen) {
    const screens = ['menu', 'records', 'gamemode', 'game'];

    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = (s === screen) ? 'block' : 'none';
    });

    const voltarBtn = document.getElementById('voltar');
    voltarBtn.style.display = (screen === 'records' || screen === 'gamemode') ? 'block' : 'none';
}

// === Função principal: iniciar o jogo ===
function startGame(gamemode) {
    console.log("Modo de jogo escolhido:", gamemode);

    // URL do seu arquivo ofuscado no GitHub
    const dataUrl = "https://raw.githubusercontent.com/CristianVeggian/blog-assets/refs/heads/main/games/lol-quiz/data/data.b64";

    fetch(dataUrl)
        .then(response => response.text())
        .then(b64 => {
            try {
                // Decodifica Base64 → binário
                const binary = atob(b64.trim());
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }

                // Descompacta (caso o arquivo esteja GZIPado)
                let jsonText;
                try {
                    jsonText = pako.ungzip(bytes, { to: 'string' });
                } catch {
                    // Se não estiver GZIP, tenta como texto puro
                    jsonText = new TextDecoder("utf-8").decode(bytes);
                }

                // Converte texto em JSON
                const champions = JSON.parse(jsonText);
                console.log("Dados carregados:", champions);

                // Embaralha a lista
                shuffleArray(champions);

                // Muda para a tela do jogo e inicia
                changeScreen('game');

                initGame(gamemode, champions);

            } catch (err) {
                console.error("Erro ao processar dados:", err);
                alert("Erro ao carregar os dados do jogo.");
            }
        })
        .catch(err => {
            console.error("Erro ao baixar dados:", err);
            alert("Erro ao baixar o arquivo de dados.");
        });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// === Inicialização do jogo ===
function initGame(gamemode, champions) {
    window.startTime = Date.now();
    window.timerInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - window.startTime) / 1000);
        document.getElementById('timer').textContent = `⏱️ Tempo: ${elapsed}s`;
    }, 1000);


    window.currentMode = gamemode;
    window.championsList = champions;
    window.currentChampionIndex = 0;
    window.score = 0;

    // Carrega o primeiro campeão
    loadNextChampion();
}

// === Função de exemplo: carregar o próximo campeão ===
function loadNextChampion() {
    if (!window.championsList || window.championsList.length === 0) {
        console.error("Lista de campeões não carregada!");
        return;
    }

    const champion = window.championsList[window.currentChampionIndex];
    const mode = window.currentMode;

    let hint = "";
    switch (mode) {
        case 'Ultimate': hint = champion.ultimate; break;
        case 'Passiva': hint = champion.passiva; break;
        case 'Título': hint = champion.titulo; break;
        default: hint = champion.nome;
    }

    const acertos = window.score;
    const total = window.championsList.length;

    document.getElementById('game-content').innerHTML = `
    <h3>Modo: ${mode}</h3>
    <p><strong>Dica:</strong> ${hint}</p>
    <input type="text" id="answer" placeholder="Digite o nome do campeão" autocomplete="off">
    <button onclick="checkAnswer()">Chutar</button>
    <p><strong>Pontuação:</strong> ${acertos}/${total}</p>
  `;

    const input = document.getElementById('answer');
    input.focus();
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    });
}

function showPopup(text) {
    const popup = document.getElementById('popup');
    document.getElementById('popup-text').textContent = text;
    popup.classList.add('show');

    setTimeout(() => {
        popup.classList.remove('show');
    }, 1000);
}

function closePopup() {
    document.getElementById('popup').style.display = 'none';
}

function normalizarTexto(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase();
}

function checkAnswer() {
    const input = document.getElementById('answer');
    const guess = input.value.trim();
    const champion = window.championsList[window.currentChampionIndex];

    if (normalizarTexto(guess) === normalizarTexto(champion.nome)) {
        window.score++;
        showPopup("✅ Acertou!");
    } else {
        showPopup(`❌ Errou! Era ${champion.nome}`);
    }

    window.currentChampionIndex++;
    if (window.currentChampionIndex >= window.championsList.length) {
        clearInterval(window.timerInterval); // para o cronômetro

        const totalTime = Math.floor((Date.now() - window.startTime) / 1000);
        const finalScore = window.score;

        // Salva no localStorage

        const newRecord = {
            nome: window.playerName || "Anônimo",
            score: window.score,
            total: window.championsList.length,
            time: totalTime,
            date: new Date().toLocaleString()
        };

        // Recupera lista existente ou cria nova
        let records = JSON.parse(localStorage.getItem("lolQuizRecords")) || [];

        // Adiciona novo recorde
        records.push(newRecord);

        // Ordena por pontuação (maior primeiro), depois por tempo (menor primeiro)
        records.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.time - b.time;
        });

        // Mantém só os 10 melhores
        records = records.slice(0, 10);

        // Salva de volta
        localStorage.setItem("lolQuizRecords", JSON.stringify(records));

        alert(`Fim de jogo!\nPontuação: ${finalScore}/${window.championsList.length}\nTempo: ${totalTime}s`);
        changeScreen('menu');
    } else {
        loadNextChampion();
    }
}

function showRecords() {
    const records = JSON.parse(localStorage.getItem("lolQuizRecords")) || [];

    if (records.length === 0) {
        document.getElementById('records').innerHTML = `
      <h3>🏆 Nenhum recorde salvo ainda.</h3>
      <button onclick="changeScreen('menu')">Voltar</button>
    `;
        changeScreen('records');
        return;
    }

    const html = records.map((r, i) => `
    <p><strong>#${i + 1}</strong> ${r.nome} — ${r.score}/${r.total} em ${r.time}s <em>(${r.date})</em></p>
  `).join("");

    document.getElementById('records').innerHTML = `
    <h3>🏆 Top 10 Recordes</h3>
    ${html}
  `;

    changeScreen('records');
}


