// DOM Elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const input = document.getElementById("wordInput");
const tela = document.getElementById("telaVitoria");
const tempo = document.getElementById("tempoFinal");
const som = document.getElementById("somVitoria");
const contador = document.getElementById("correctGuesses");
const gameContainer = document.getElementById("game");

// Game State
let mainNode = "";
let grafoCompleto = [];
let vizinhos = new Set();
let revelados = new Set();
let conexoesVisiveis = [];
let inicioJogo = Date.now();

// D3 Simulation
let d3Nodes = [];
let d3Links = [];
let simulation = null;

// Dragging
let arrastando = null;
let offsetX = 0;
let offsetY = 0;

// Canvas Setup
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

// Start Game
function iniciarJogo(urlConfig) {
  inicioJogo = Date.now();

  fetch(urlConfig)
    .then(res => res.json())
    .then(config => {
      const { theme, graph, corPrincipal, somVitoria: somUrl } = config;

      document.body.style.setProperty('--cor-principal', corPrincipal);
      som.src = somUrl;
      document.getElementById("tituloTema").textContent = `Árvore do Conhecimento - ${theme}`;

      mainNode = theme;
      grafoCompleto = graph;
      revelados = new Set([theme]);
      vizinhos = new Set();
      conexoesVisiveis = [];

      grafoCompleto.forEach(([a, b]) => {
        if (a === theme || b === theme) {
          const outro = a === theme ? b : a;
          vizinhos.add(outro);
          conexoesVisiveis.push([theme, outro]);
        }
      });

      ajustarCanvas();
      atualizarSimulacao();
      atualizarContador();
    })
    .catch(err => console.error("Erro ao carregar config:", err));
}

// Update Simulation
function atualizarSimulacao() {
  if (simulation) simulation.stop();

  const todosNos = new Set(conexoesVisiveis.flat());
  d3Nodes = Array.from(todosNos).map(id => {
    return d3Nodes.find(n => n.id === id) || { id, x: canvas.width / 2, y: canvas.height / 2 };
  });

  d3Links = conexoesVisiveis.map(([source, target]) => ({ source, target }));

  simulation = d3.forceSimulation(d3Nodes)
    .force("link", d3.forceLink(d3Links).id(d => d.id).distance(120))
    .force("charge", d3.forceManyBody().strength(-150))
    .force("center", d3.forceCenter(canvas.width / 2, canvas.height / 2).strength(0.1))
    .alpha(1)
    .restart()
    .on("tick", desenharGrafo);
}

// Draw Graph
function desenharGrafo() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margem = 50;
  const posicoes = {};

  d3Nodes.forEach(n => {
    n.x = Math.max(margem, Math.min(canvas.width - margem, n.x));
    n.y = Math.max(margem, Math.min(canvas.height - margem, n.y));
    if (n.id === mainNode) {
      n.fx = canvas.width / 2;
      n.fy = canvas.height / 2;
    }
    posicoes[n.id] = { x: n.x, y: n.y };
  });

  conexoesVisiveis.forEach(([a, b]) => {
    const p1 = posicoes[a], p2 = posicoes[b];
    if (!p1 || !p2) return;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = "#ccc";
    ctx.stroke();
  });

  Object.entries(posicoes).forEach(([nó, { x, y }]) => {
    const texto = revelados.has(nó) ? nó : gerarDica(nó);
    ctx.font = "14px Arial";
    const largura = ctx.measureText(texto).width + 20;
    const altura = 30;
    const corPrincipal = getComputedStyle(document.body).getPropertyValue('--cor-principal').trim();

    const grad = ctx.createLinearGradient(x - largura / 2, y, x + largura / 2, y);
    if (revelados.has(nó)) {
      grad.addColorStop(0, ajustarCor(corPrincipal, -30));
      grad.addColorStop(0.5, corPrincipal);
      grad.addColorStop(1, ajustarCor(corPrincipal, 30));
    } else {
      grad.addColorStop(0, "#2a2a2a");
      grad.addColorStop(0.5, "#444");
      grad.addColorStop(1, "#2a2a2a");
    }

    ctx.fillStyle = grad;
    ctx.fillRect(x - largura / 2, y - altura / 2, largura, altura);
    ctx.strokeStyle = revelados.has(nó) ? corPrincipal : "#555";
    ctx.strokeRect(x - largura / 2, y - altura / 2, largura, altura);
    ctx.fillStyle = revelados.has(nó) ? corTextoContraste(corPrincipal) : "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, x, y);
  });
}

// Input Interaction
input.addEventListener("input", () => {
  const tentativa = normalizar(input.value.trim());
  const vizinhoEncontrado = Array.from(vizinhos).find(v => normalizar(v) === tentativa);

  if (vizinhoEncontrado && !revelados.has(vizinhoEncontrado)) {
    revelados.add(vizinhoEncontrado);
    vizinhos.delete(vizinhoEncontrado);

    grafoCompleto.forEach(([a, b]) => {
      if (a === vizinhoEncontrado && !revelados.has(b)) {
        vizinhos.add(b);
        conexoesVisiveis.push([a, b]);
      } else if (b === vizinhoEncontrado && !revelados.has(a)) {
        vizinhos.add(a);
        conexoesVisiveis.push([b, a]);
      }
    });

    atualizarSimulacao();
    atualizarContador();
    input.value = "";
  }
});

// Victory Screen
function mostrarTelaVitoria() {
  const tempoDecorrido = Math.floor((Date.now() - inicioJogo) / 1000);
  const minutos = Math.floor(tempoDecorrido / 60);
  const segundos = tempoDecorrido % 60;

  tempo.textContent = `Tempo: ${minutos}m ${segundos}s`;
  tela.style.display = "flex";
  som.play();

  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
}

// Counter Update
function atualizarContador() {
  const total = new Set(grafoCompleto.flat()).size;
  const reveladosCount = revelados.size;
  contador.textContent = `${reveladosCount}/${total}`;
  if (reveladosCount === total) mostrarTelaVitoria();
}

// Drag Events
canvas.addEventListener("mousedown", e => {
  const mouseX = e.offsetX, mouseY = e.offsetY;
  for (const n of d3Nodes) {
    const largura = ctx.measureText(n.id).width + 20;
    const altura = 30;
    if (
      mouseX >= n.x - largura / 2 &&
      mouseX <= n.x + largura / 2 &&
      mouseY >= n.y - altura / 2 &&
      mouseY <= n.y + altura / 2
    ) {
      arrastando = n;
      offsetX = mouseX - n.x;
      offsetY = mouseY - n.y;
      n.fx = n.x;
      n.fy = n.y;
      simulation.alphaTarget(0.3).restart();
      break;
    }
  }
});

canvas.addEventListener("mousemove", e => {
  if (arrastando) {
    arrastando.fx = e.offsetX - offsetX;
    arrastando.fy = e.offsetY - offsetY;
  }
});

canvas.addEventListener("mouseup", () => {
  if (arrastando) {
    arrastando.fx = null;
    arrastando.fy = null;
    simulation.alphaTarget(0);
    arrastando = null;
  }
});

// Fullscreen Toggle
document.getElementById("fullscreen").addEventListener("click", () => {
  if (gameContainer.requestFullscreen) {
    gameContainer.requestFullscreen();
  } else if (gameContainer.webkitRequestFullscreen) {
    gameContainer.webkitRequestFullscreen();
  } else if (gameContainer.msRequestFullscreen) {
    gameContainer.msRequestFullscreen();
  }
});

document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  } else {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  atualizarSimulacao();
});

function ajustarCanvas() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

function gerarDica(objetivo) {
  const palavras = objetivo.split(" ");
  return palavras.map(palavra => {
    const primeira = palavra[0];
    const tamanho = palavra.length;
    const oculto = "*".repeat(tamanho - 2) + palavra[tamanho - 1];
    return `${primeira}${oculto}(${tamanho})`;
  }).join(" ");
}

function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-\s'’]/g, "");
}

function corTextoContraste(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brilho = (r * 299 + g * 587 + b * 114) / 1000;
  return brilho > 128 ? "#000" : "#fff";
}

function ajustarCor(hex, fator) {
  hex = hex.replace("#", "");
  const r = Math.min(255, Math.max(0, parseInt(hex.substring(0, 2), 16) + fator));
  const g = Math.min(255, Math.max(0, parseInt(hex.substring(2, 4), 16) + fator));
  const b = Math.min(255, Math.max(0, parseInt(hex.substring(4, 6), 16) + fator));
  return `rgb(${r}, ${g}, ${b})`;
}

function fecharTelaVitoria() {
  tela.style.display = "none";
}

window.onload = () => {
  ajustarCanvas();
};