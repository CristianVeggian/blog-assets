const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "style.css"; // caminho do seu arquivo CSS
document.head.appendChild(link);

// === Dependência obrigatória (adicione isso no HTML) ===
// <script src="https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js"></script>

// === Controle de telas ===
function changeScreen(screen) {
  const screens = ['menu', 'records', 'gamemode', 'game'];
  
  screens.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.style.display = (s === screen) ? 'block' : 'none';
  });
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
        // 1️⃣ Decodifica Base64 → binário
        const binary = atob(b64.trim());
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        // 2️⃣ Descompacta (caso o arquivo esteja GZIPado)
        let jsonText;
        try {
          jsonText = pako.ungzip(bytes, { to: 'string' });
        } catch {
          // Se não estiver GZIP, tenta como texto puro
          jsonText = new TextDecoder("utf-8").decode(bytes);
        }

        // 3️⃣ Converte texto em JSON
        const champions = JSON.parse(jsonText);
        console.log("✅ Dados carregados:", champions);

        // 🔀 Embaralha a lista
        shuffleArray(champions);

        // 4️⃣ Muda para a tela do jogo e inicia
        changeScreen('game');
        
        initGame(gamemode, champions);

      } catch (err) {
        console.error("❌ Erro ao processar dados:", err);
        alert("Erro ao carregar os dados do jogo.");
      }
    })
    .catch(err => {
      console.error("❌ Erro ao baixar dados:", err);
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
  console.log("Iniciando o modo:", gamemode);
  
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
    case 'ultimate': hint = champion.ultimate; break;
    case 'passive': hint = champion.passiva; break;
    case 'title': hint = champion.titulo; break;
    default: hint = champion.nome;
  }

  document.getElementById('game').innerHTML = `
    <h3>Modo: ${mode}</h3>
    <p><strong>Dica:</strong> ${hint}</p>
    <input id="answer" placeholder="Digite o nome do campeão">
    <button onclick="checkAnswer()">Chutar</button>
  `;
}

function checkAnswer() {
  const input = document.getElementById('answer');
  const guess = input.value.trim().toLowerCase();
  const champion = window.championsList[window.currentChampionIndex];

  if (guess === champion.nome.toLowerCase()) {
    window.score++;
    alert("✅ Acertou!");
  } else {
    alert(`❌ Errou! Era ${champion.nome}`);
  }

  // Próximo campeão
  window.currentChampionIndex++;
  if (window.currentChampionIndex >= window.championsList.length) {
    alert(`Fim de jogo! Pontuação final: ${window.score}`);
    changeScreen('menu');
  } else {
    loadNextChampion();
  }
}
