// assets/js/orcamentos.js

// 1. IMPORTAÇÕES DA CENTRAL (Não inicializa mais o app aqui)
import { db, auth } from './firebase-config.js'; 
import { collection, addDoc, getDocs, doc, setDoc, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Referências Globais do Módulo
const orcamentosPedidosRef = collection(db, "Orcamento-Pedido");

// Variáveis de Estado (Escopadas ao módulo)
let numeroOrcamento = 1;
let numeroPedido = 1;
const anoAtual = new Date().getFullYear();
let orcamentoEditando = null;
let pedidoEditando = null;
let orcamentos = [];
let pedidos = [];
let moduleInitialized = false; // Flag para evitar recarregar listeners múltiplas vezes

// ==========================================================================
// FUNÇÃO DE INICIALIZAÇÃO (Chamada pelo main.js)
// ==========================================================================
export async function initOrcamentos() {
    console.log("Inicializando Módulo Orçamentos...");
    
    // 1. Carregar Dados
    await carregarDados();
    
    // 2. Configurar Listeners (Apenas se ainda não foram configurados)
    if (!moduleInitialized) {
        setupEventListeners();
        moduleInitialized = true;
    }
    
    // 3. Exibir a página inicial do módulo
    mostrarPagina('form-orcamento');
}

// ==========================================================================
// LÓGICA DE DADOS (Firebase)
// ==========================================================================

async function carregarDados() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        orcamentos = [];
        pedidos = [];
        const q = query(orcamentosPedidosRef, orderBy("numero"));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            if (data.tipo === 'orcamento') {
                orcamentos.push(data);
                // Lógica simples para pegar o maior número
                const num = parseInt(data.numero.split('/')[0]);
                if(num >= numeroOrcamento) numeroOrcamento = num + 1;
            } else if (data.tipo === 'pedido') {
                pedidos.push(data);
                const num = parseInt(data.numero.split('/')[0]);
                if(num >= numeroPedido) numeroPedido = num + 1;
            }
        });
        
        console.log("Dados Orçamentos Carregados:", orcamentos.length);
        // Atualiza as tabelas visuais
        mostrarOrcamentosGerados();
        mostrarPedidosRealizados();

    } catch (error) {
        console.error("Erro ao carregar dados orçamentos:", error);
    }
}

async function salvarDados(dados, tipo) {
    if (!auth.currentUser) {
        alert("Sessão expirada. Faça login novamente.");
        return;
    }
    try {
        if (dados.id) {
            const docRef = doc(orcamentosPedidosRef, dados.id);
            await setDoc(docRef, dados, { merge: true });
        } else {
            const docRef = await addDoc(orcamentosPedidosRef, { ...dados, tipo });
            dados.id = docRef.id;
        }
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar no banco de dados.");
    }
}

// ==========================================================================
// LÓGICA DE UI (Interface)
// ==========================================================================

function setupEventListeners() {
    // Navegação Interna do Módulo (Tabs)
    document.querySelectorAll('#module-orcamentos nav ul li a[data-pagina]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarPagina(link.dataset.pagina);
        });
    });

    // Botões de Ação
    bindClick('#btnAddProdutoOrcamento', adicionarProduto);
    bindClick('#btnGerarOrcamento', gerarOrcamento);
    bindClick('#btnAtualizarOrcamento', atualizarOrcamento);
    
    // Filtros
    bindClick('#orcamentos-gerados button', filtrarOrcamentos); // Botão filtrar na tab orçamentos
    bindClick('#lista-pedidos button', filtrarPedidos);         // Botão filtrar na tab pedidos

    // Cálculos Automáticos (Delegated Events para inputs dinâmicos)
    document.querySelector('#tabelaProdutos').addEventListener('input', (e) => {
        if(e.target.matches('.produto-quantidade, .produto-valor-unit')) atualizarTotais();
    });
    
    document.querySelector('#valorFrete').addEventListener('input', atualizarTotais);
}

// Helper para vincular cliques com segurança (caso o elemento não exista)
function bindClick(selector, handler) {
    const el = document.querySelector(selector);
    if(el) el.addEventListener('click', handler);
}

function mostrarPagina(idPagina) {
    // Esconde todas as sections DENTRO do módulo orçamentos
    document.querySelectorAll('#module-orcamentos .pagina').forEach(p => p.style.display = 'none');
    
    // Mostra a desejada
    const target = document.getElementById(idPagina);
    if(target) {
        target.style.display = 'block';
        if(idPagina === 'orcamentos-gerados') mostrarOrcamentosGerados();
        if(idPagina === 'lista-pedidos') mostrarPedidosRealizados();
    }
}

// ... (Mantenha as funções auxiliares originais abaixo: formatarMoeda, gerarNumeroFormatado, etc.)
// Vou incluir as principais modificadas para o contexto modular.

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function converterMoedaParaNumero(valor) {
    if (typeof valor === 'number') return valor;
    if (typeof valor !== 'string') return 0;
    return parseFloat(valor.replace(/R\$\s?|\./g, '').replace(',', '.')) || 0;
}

// ==========================================================================
// FUNÇÕES DE NEGÓCIO (Core) - Simplificadas para caber na resposta
// Copie a lógica interna das suas funções originais para cá.
// ==========================================================================

function adicionarProduto() {
    const tbody = document.querySelector("#tabelaProdutos tbody");
    const row = tbody.insertRow();
    row.innerHTML = `
        <td><input type="number" class="produto-quantidade" value="1" min="1"></td>
        <td><input type="text" class="produto-descricao"></td>
        <td><input type="text" class="produto-valor-unit" value="0,00"></td>
        <td>R$ 0,00</td>
        <td><button type="button" class="btn-remove-prod">Excluir</button></td>
    `;
    row.querySelector('.btn-remove-prod').onclick = () => { row.remove(); atualizarTotais(); };
}

function atualizarTotais() {
    let totalProd = 0;
    document.querySelectorAll("#tabelaProdutos tbody tr").forEach(row => {
        const qtd = parseFloat(row.querySelector(".produto-quantidade").value) || 0;
        const unit = parseFloat(row.querySelector(".produto-valor-unit").value.replace(',','.')) || 0;
        const total = qtd * unit;
        row.cells[3].textContent = formatarMoeda(total);
        totalProd += total;
    });
    
    const frete = parseFloat(document.getElementById("valorFrete").value.replace(',','.')) || 0;
    document.getElementById("valorOrcamento").value = formatarMoeda(totalProd);
    document.getElementById("total").value = formatarMoeda(totalProd + frete);
}

async function gerarOrcamento() {
    // Coleta dados do formulário
    const novoOrcamento = {
        numero: `${numeroOrcamento}/${anoAtual}`,
        dataOrcamento: document.getElementById("dataOrcamento").value,
        cliente: document.getElementById("cliente").value,
        total: converterMoedaParaNumero(document.getElementById("total").value),
        produtos: [], // ... lógica de coletar produtos da tabela
        tipo: 'orcamento',
        pedidoGerado: false
    };

    // Coleta produtos (simplificado)
    document.querySelectorAll("#tabelaProdutos tbody tr").forEach(row => {
        novoOrcamento.produtos.push({
            descricao: row.querySelector(".produto-descricao").value,
            quantidade: row.querySelector(".produto-quantidade").value
            // ... outros campos
        });
    });

    await salvarDados(novoOrcamento, 'orcamento');
    numeroOrcamento++;
    orcamentos.push(novoOrcamento);
    alert("Orçamento Gerado!");
    mostrarPagina('orcamentos-gerados');
}

function mostrarOrcamentosGerados() {
    const tbody = document.querySelector("#tabela-orcamentos tbody");
    if(!tbody) return;
    tbody.innerHTML = '';
    
    orcamentos.forEach(orc => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${orc.numero}</td>
            <td>${orc.dataOrcamento}</td>
            <td>${orc.cliente}</td>
            <td>${formatarMoeda(orc.total)}</td>
            <td>${orc.pedidoGerado ? 'Sim' : 'Não'}</td>
            <td>
                <button class="btn-visualizar">Ver</button>
                ${!orc.pedidoGerado ? '<button class="btn-gerar-pedido">Gerar Pedido</button>' : ''}
            </td>
        `;
        // Attach events...
    });
}

function mostrarPedidosRealizados() {
    // Mesma lógica de mostrarOrcamentosGerados, mas iterando sobre 'pedidos'
    // e populando #tabela-pedidos
}

// ... Adicione aqui as funções filtrarOrcamentos, filtrarPedidos, gerarPedido, etc.
// Copie do seu arquivo original, apenas garantindo que as referências de DOM (document.getElementById)
// funcionem dentro do novo HTML unificado.
