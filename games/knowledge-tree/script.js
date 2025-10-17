const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const input = document.getElementById("wordInput");

let theme = "";
let grafoCompleto = [];
let vizinhos = new Set(); // nós visíveis (como dica ou revelados)
let revelados = new Set(); // nós já revelados
let conexoesVisiveis = []; // arestas visíveis no grafo

fetch("lvl_skyrim.json")
    .then(res => res.json())
    .then(data => {
        theme = data.theme;
        grafoCompleto = data.graph;

        revelados.add(theme);

        // Adiciona conexões diretas do tema
        grafoCompleto.forEach(([a, b]) => {
            if (a === theme || b === theme) {
                const outro = a === theme ? b : a;
                vizinhos.add(outro);
                conexoesVisiveis.push([theme, outro]);
            }
        });

        desenharGrafo();
    })
    .catch(err => console.error("Erro ao carregar grafo:", err));

function desenharGrafo() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000"; // fundo preto
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const posicoes = {};
    const centroX = canvas.width / 2;
    const centroY = canvas.height / 2;
    posicoes[theme] = { x: centroX, y: centroY };

    // Mapeia cada nó revelador para seus filhos
    const filhosPorPai = {};
    conexoesVisiveis.forEach(([a, b]) => {
        if (!filhosPorPai[a]) filhosPorPai[a] = [];
        filhosPorPai[a].push(b);
    });

    const ocupados = new Set(); // para evitar sobreposição

    Object.keys(filhosPorPai).forEach(pai => {
        const filhos = filhosPorPai[pai];
        const origem = posicoes[pai];
        if (!origem) return;

        const raioBase = 150 + filhos.length * 10; // aumenta o raio conforme o número de filhos
        const anguloBase = (2 * Math.PI) / filhos.length;

        filhos.forEach((filho, i) => {
            if (posicoes[filho]) return;

            let angulo = anguloBase * i;
            let tentativa = 0;
            let x, y;

            do {
                const raio = raioBase + tentativa * 20;
                x = origem.x + raio * Math.cos(angulo);
                y = origem.y + raio * Math.sin(angulo);
                tentativa++;
            } while (colide(x, y, ocupados) && tentativa < 10);

            posicoes[filho] = { x, y };
            ocupados.add(`${Math.round(x)}-${Math.round(y)}`);
        });
    });


    // Distribui os filhos em torno de seus pais
    Object.keys(filhosPorPai).forEach(pai => {
        const filhos = filhosPorPai[pai];
        const origem = posicoes[pai];
        if (!origem) return; // ignora se pai ainda não tem posição

        const anguloBase = (2 * Math.PI) / filhos.length;
        const raio = 120;

        filhos.forEach((filho, i) => {
            if (posicoes[filho]) return; // já posicionado
            const x = origem.x + raio * Math.cos(anguloBase * i);
            const y = origem.y + raio * Math.sin(anguloBase * i);
            posicoes[filho] = { x, y };
        });
    });

    // Desenha conexões
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

    // Desenha nós como retângulos com brilho
    Object.keys(posicoes).forEach(nó => {
        const { x, y } = posicoes[nó];
        const texto = revelados.has(nó) ? nó : gerarDica(nó);
        ctx.font = "14px Arial";
        const largura = ctx.measureText(texto).width + 20;
        const altura = 30;

        // Gradiente com brilho suave
        const grad = ctx.createLinearGradient(x - largura / 2, y, x + largura / 2, y);
        if (revelados.has(nó)) {
            grad.addColorStop(0, "#005fa3");
            grad.addColorStop(0.5, "#0077cc");
            grad.addColorStop(1, "#005fa3");
        } else {
            grad.addColorStop(0, "#2a2a2a");
            grad.addColorStop(0.5, "#444");
            grad.addColorStop(1, "#2a2a2a");
        }

        ctx.fillStyle = grad;
        ctx.fillRect(x - largura / 2, y - altura / 2, largura, altura);

        ctx.strokeStyle = revelados.has(nó) ? "#3399ff" : "#555";
        ctx.strokeRect(x - largura / 2, y - altura / 2, largura, altura);

        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(texto, x, y);
    });
}

function colide(x, y, ocupados) {
    const chave = `${Math.round(x)}-${Math.round(y)}`;
    return ocupados.has(chave);
}

function gerarDica(palavra) {
    const primeira = palavra[0];
    const tamanho = palavra.length;
    const oculto = "*".repeat(tamanho - 2) + palavra[tamanho - 1];
    return `${primeira}${oculto}(${tamanho})`;
}

input.addEventListener("input", () => {
    const tentativa = input.value.trim();
    if (vizinhos.has(tentativa) && !revelados.has(tentativa)) {
        revelados.add(tentativa);
        vizinhos.delete(tentativa);

        // Adiciona novas conexões a partir da palavra descoberta
        grafoCompleto.forEach(([a, b]) => {
            if (a === tentativa && !revelados.has(b)) {
                vizinhos.add(b);
                conexoesVisiveis.push([a, b]);
            } else if (b === tentativa && !revelados.has(a)) {
                vizinhos.add(a);
                conexoesVisiveis.push([b, a]);
            }
        });

        desenharGrafo();
        input.value = ""; // limpa o campo
    }
});
