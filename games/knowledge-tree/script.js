const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const input = document.getElementById("wordInput");

let theme = "";
let grafoCompleto = [];
let vizinhos = new Set();
let revelados = new Set();
let conexoesVisiveis = [];

let arrastando = null;
let offsetX = 0;
let offsetY = 0;

let d3Nodes = [];
let d3Links = [];
let simulation;

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

let inicioJogo = Date.now();

function iniciarJogo(urlConfig) {

    let inicioJogo = Date.now();

    fetch(urlConfig)
        .then(res => res.json())
        .then(config => {
            const { theme, graph, corPrincipal, somVitoria } = config;

            // ✅ Agora está dentro do escopo certo
            document.body.style.setProperty('--cor-principal', corPrincipal);
            document.getElementById("somVitoria").src = somVitoria;
            document.getElementById("tituloTema").textContent = `Arvore do Conhecimento - ${theme}`;

            revelados = new Set();
            vizinhos = new Set();
            conexoesVisiveis = [];

            grafoCompleto = graph;

            revelados.add(theme);
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


function desenharGrafo() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const margem = 50;

    d3Nodes.forEach(n => {
        n.x = Math.max(margem, Math.min(canvas.width - margem, n.x));
        n.y = Math.max(margem, Math.min(canvas.height - margem, n.y));
    });


    d3Nodes.forEach(n => {
        if (n.id === theme) {
            n.fx = canvas.width / 2;
            n.fy = canvas.height / 2;
        }
    });

    const posicoes = {};
    d3Nodes.forEach(n => {
        posicoes[n.id] = { x: n.x, y: n.y };
    });

    conexoesVisiveis.forEach(([a, b]) => {
        const p1 = posicoes[a];
        const p2 = posicoes[b];
        if (!p1 || !p2) return;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = "#ccc";
        ctx.stroke();
    });

    Object.keys(posicoes).forEach(nó => {
        const { x, y } = posicoes[nó];
        const texto = revelados.has(nó) ? nó : gerarDica(nó);
        ctx.font = "14px Arial";
        const largura = ctx.measureText(texto).width + 20;
        const altura = 30;

        const corPrincipal = getComputedStyle(document.body).getPropertyValue('--cor-principal').trim();

        const grad = ctx.createLinearGradient(x - largura / 2, y, x + largura / 2, y);
        if (revelados.has(nó)) {
            grad.addColorStop(0, ajustarCor(corPrincipal, -30)); // tom mais escuro
            grad.addColorStop(0.5, corPrincipal);                // cor original
            grad.addColorStop(1, ajustarCor(corPrincipal, 30));  // tom mais claro
        }
        else {
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

function gerarDica(objetivo) {
    const palavras = objetivo.split(" ");
    let objetivoPartes = ''
    palavras.forEach((palavra) => {
        const primeira = palavra[0];
        const tamanho = palavra.length;
        const oculto = "*".repeat(tamanho - 2) + palavra[tamanho - 1];
        objetivoPartes += `${primeira}${oculto}(${tamanho}) `;
    });
    return objetivoPartes.trim();
}

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

function mostrarTelaVitoria() {
    const tela = document.getElementById("telaVitoria");
    const tempo = document.getElementById("tempoFinal");
    const som = document.getElementById("somVitoria");

    const tempoDecorrido = Math.floor((Date.now() - inicioJogo) / 1000);
    const minutos = Math.floor(tempoDecorrido / 60);
    const segundos = tempoDecorrido % 60;

    tempo.textContent = `Tempo: ${minutos}m ${segundos}s`;
    tela.style.display = "flex";
    som.play();
}


function atualizarSimulacao() {
    if (simulation) simulation.stop();

    const todosNos = new Set();
    conexoesVisiveis.forEach(([a, b]) => {
        todosNos.add(a);
        todosNos.add(b);
    });

    d3Nodes = Array.from(todosNos).map(id => {
        const existente = d3Nodes.find(n => n.id === id);
        return existente || { id, x: canvas.width / 2, y: canvas.height / 2 };
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

canvas.addEventListener("mousedown", e => {
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    for (const n of d3Nodes) {
        const largura = ctx.measureText(n.id).width + 20;
        const altura = 30;
        const x = n.x;
        const y = n.y;

        if (
            mouseX >= x - largura / 2 &&
            mouseX <= x + largura / 2 &&
            mouseY >= y - altura / 2 &&
            mouseY <= y + altura / 2
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

const gameContainer = document.getElementById("game");

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
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    atualizarSimulacao();
});

function normalizar(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-\s'’]/g, "")
}

function atualizarContador() {
    const contador = document.getElementById("correctGuesses");
    const total = new Set(grafoCompleto.flat()).size;
    const reveladosCount = revelados.size;
    if (reveladosCount === total) {
        mostrarTelaVitoria();
    }
    contador.textContent = `${reveladosCount}/${total}`;
}

function ajustarCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

window.onload = () => {
    ajustarCanvas();
};

function corTextoContraste(hex) {
    hex = hex.replace("#", "");

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const brilho = (r * 299 + g * 587 + b * 114) / 1000;

    return brilho > 128 ? "#000" : "#fff";
}

function fecharTelaVitoria() {
    const tela = document.getElementById("telaVitoria");
    tela.style.display = "none";
}

function ajustarCor(hex, fator) {
    hex = hex.replace("#", "");
    const r = Math.min(255, Math.max(0, parseInt(hex.substring(0, 2), 16) + fator));
    const g = Math.min(255, Math.max(0, parseInt(hex.substring(2, 4), 16) + fator));
    const b = Math.min(255, Math.max(0, parseInt(hex.substring(4, 6), 16) + fator));
    return `rgb(${r}, ${g}, ${b})`;
}
