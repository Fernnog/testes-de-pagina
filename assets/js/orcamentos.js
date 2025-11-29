// assets/js/orcamentos.js

import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, doc, setDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Referências
const orcamentosPedidosRef = collection(db, "Orcamento-Pedido");

// Variáveis de Estado
let numeroOrcamento = 1;
let numeroPedido = 1;
const anoAtual = new Date().getFullYear();
let orcamentoEditando = null;
let pedidoEditando = null;
let orcamentos = [];
let pedidos = [];
let moduleInitialized = false;

// ==========================================================================
// INICIALIZAÇÃO
// ==========================================================================
export async function initOrcamentos() {
    console.log("Inicializando Módulo Orçamentos...");
    
    // Tornar funções acessíveis globalmente (necessário para onclick em HTML gerado via JS)
    window.excluirProduto = excluirProduto;
    window.excluirProdutoEdicao = excluirProdutoEdicao;
    window.formatarEntradaMoeda = formatarEntradaMoeda;
    window.atualizarTotaisEdicao = atualizarTotaisEdicao;
    window.atualizarRestanteEdicao = atualizarRestanteEdicao;

    await carregarDados();
    
    if (!moduleInitialized) {
        setupEventListeners();
        moduleInitialized = true;
    }
    
    mostrarPagina('form-orcamento');
}

// ==========================================================================
// CARREGAMENTO E SALVAMENTO (FIREBASE)
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
                const num = parseInt(data.numero.split('/')[0]);
                if (num >= numeroOrcamento) numeroOrcamento = num + 1;
            } else if (data.tipo === 'pedido') {
                pedidos.push(data);
                const num = parseInt(data.numero.split('/')[0]);
                if (num >= numeroPedido) numeroPedido = num + 1;
            }
        });
        
        console.log(`Orçamentos: ${orcamentos.length}, Pedidos: ${pedidos.length}`);
        mostrarOrcamentosGerados();
        mostrarPedidosRealizados();

    } catch (error) {
        console.error("Erro ao carregar dados orçamentos:", error);
    }
}

async function salvarDados(dados, tipo) {
    if (!auth.currentUser) {
        alert("Sessão expirada.");
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
// EVENT LISTENERS E NAVEGAÇÃO
// ==========================================================================

function setupEventListeners() {
    // Abas
    document.querySelectorAll('#module-orcamentos nav ul li a[data-pagina]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarPagina(link.dataset.pagina);
        });
    });

    // Botões Principais
    bindClick('#btnAddProdutoOrcamento', adicionarProduto);
    bindClick('#btnGerarOrcamento', gerarOrcamento);
    bindClick('#btnAtualizarOrcamento', atualizarOrcamento);
    bindClick('#btnAddProdutoEdicao', adicionarProdutoEdicao);
    bindClick('#btnSalvarPedidoEdicao', atualizarPedido);

    // Filtros e Relatórios
    bindClick('#orcamentos-gerados button', filtrarOrcamentos);
    bindClick('#lista-pedidos button', filtrarPedidos);
    bindClick('#relatorio button', filtrarPedidosRelatorio);
    const btnXLSX = document.querySelector('#relatorio button[onclick="gerarRelatorioXLSX()"]');
    if(btnXLSX) btnXLSX.onclick = gerarRelatorioXLSX;

    // Listeners Dinâmicos (Inputs de Tabela)
    document.querySelector('#tabelaProdutos').addEventListener('input', (e) => {
        if(e.target.matches('.produto-quantidade, .produto-valor-unit')) atualizarTotais();
    });
    
    const freteInput = document.querySelector('#valorFrete');
    if(freteInput) freteInput.addEventListener('input', () => {
        formatarEntradaMoeda(freteInput);
        atualizarTotais();
    });
}

function bindClick(selector, handler) {
    const el = document.querySelector(selector);
    if(el) el.addEventListener('click', handler);
}

function mostrarPagina(idPagina) {
    document.querySelectorAll('#module-orcamentos .pagina').forEach(p => p.style.display = 'none');
    const target = document.getElementById(idPagina);
    if(target) {
        target.style.display = 'block';
        if(idPagina === 'orcamentos-gerados') mostrarOrcamentosGerados();
        if(idPagina === 'lista-pedidos') mostrarPedidosRealizados();
    }
}

// ==========================================================================
// FUNÇÕES AUXILIARES
// ==========================================================================

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarEntradaMoeda(input) {
    if (!input.value) {
        input.value = 'R$ 0,00';
        return;
    }
    let valor = input.value.replace(/\D/g, '');
    valor = (valor / 100).toFixed(2) + '';
    valor = valor.replace(".", ",");
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    input.value = 'R$ ' + valor;
}

function converterMoedaParaNumero(valor) {
    if (typeof valor === 'number') return valor;
    if (typeof valor !== 'string') return 0;
    return parseFloat(valor.replace(/R\$\s?|\./g, '').replace(',', '.')) || 0;
}

function gerarNumeroFormatado(numero) {
    return numero.toString().padStart(4, '0') + '/' + anoAtual;
}

function limparCamposMoeda() {
    const campos = ['valorFrete', 'valorOrcamento', 'total', 'entrada', 'restante', 'margemLucro', 'custoMaoDeObra'];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = 'R$ 0,00';
    });
}

// ==========================================================================
// LÓGICA DE NEGÓCIO (ORÇAMENTOS E PEDIDOS)
// ==========================================================================

function adicionarProduto() {
    const tbody = document.querySelector("#tabelaProdutos tbody");
    const newRow = tbody.insertRow();
    newRow.innerHTML = `
        <td><input type="number" class="produto-quantidade" value="1" min="1"></td>
        <td><input type="text" class="produto-descricao"></td>
        <td><input type="text" class="produto-valor-unit" value="R$ 0,00" oninput="formatarEntradaMoeda(this)"></td>
        <td>R$ 0,00</td>
        <td><button type="button" onclick="excluirProduto(this)">Excluir</button></td>
    `;
}

function excluirProduto(btn) {
    btn.closest('tr').remove();
    atualizarTotais();
}

function atualizarTotais() {
    let totalProd = 0;
    document.querySelectorAll("#tabelaProdutos tbody tr").forEach(row => {
        const qtd = parseFloat(row.querySelector(".produto-quantidade").value) || 0;
        const unit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value);
        const total = qtd * unit;
        row.cells[3].textContent = formatarMoeda(total);
        totalProd += total;
    });
    
    const frete = converterMoedaParaNumero(document.getElementById("valorFrete").value);
    document.getElementById("valorOrcamento").value = formatarMoeda(totalProd);
    document.getElementById("total").value = formatarMoeda(totalProd + frete);
}

// GERAÇÃO DE ORÇAMENTO
async function gerarOrcamento() {
    const dados = {
        numero: gerarNumeroFormatado(numeroOrcamento),
        dataOrcamento: document.getElementById("dataOrcamento").value,
        dataValidade: document.getElementById("dataValidade").value,
        cliente: document.getElementById("cliente").value,
        endereco: document.getElementById("endereco").value,
        tema: document.getElementById("tema").value,
        cidade: document.getElementById("cidade").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("clienteEmail").value,
        cores: document.getElementById("cores").value,
        pagamento: Array.from(document.querySelectorAll('input[name="pagamento"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFrete").value),
        valorOrcamento: converterMoedaParaNumero(document.getElementById("valorOrcamento").value),
        total: converterMoedaParaNumero(document.getElementById("total").value),
        observacoes: document.getElementById("observacoes").value,
        produtos: [],
        pedidoGerado: false,
        tipo: 'orcamento'
    };

    document.querySelectorAll("#tabelaProdutos tbody tr").forEach(row => {
        dados.produtos.push({
            quantidade: parseFloat(row.querySelector(".produto-quantidade").value),
            descricao: row.querySelector(".produto-descricao").value,
            valorUnit: converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value),
            valorTotal: converterMoedaParaNumero(row.cells[3].textContent)
        });
    });

    await salvarDados(dados, 'orcamento');
    numeroOrcamento++;
    orcamentos.push(dados);
    
    document.getElementById("orcamento").reset();
    limparCamposMoeda();
    document.querySelector("#tabelaProdutos tbody").innerHTML = "";
    
    alert("Orçamento gerado!");
    mostrarPagina('orcamentos-gerados');
    // exibirOrcamentoEmHTML(dados); // Se desejar reativar a impressão
}

// ATUALIZAÇÃO DE ORÇAMENTO
async function atualizarOrcamento() {
    if (!orcamentoEditando) return;
    
    const index = orcamentos.findIndex(o => o.id === orcamentoEditando);
    if(index === -1) return;

    const dados = {
        ...orcamentos[index],
        dataOrcamento: document.getElementById("dataOrcamento").value,
        dataValidade: document.getElementById("dataValidade").value,
        cliente: document.getElementById("cliente").value,
        endereco: document.getElementById("endereco").value,
        tema: document.getElementById("tema").value,
        cidade: document.getElementById("cidade").value,
        telefone: document.getElementById("telefone").value,
        email: document.getElementById("clienteEmail").value,
        cores: document.getElementById("cores").value,
        pagamento: Array.from(document.querySelectorAll('input[name="pagamento"]:checked')).map(el => el.value),
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFrete").value),
        valorOrcamento: converterMoedaParaNumero(document.getElementById("valorOrcamento").value),
        total: converterMoedaParaNumero(document.getElementById("total").value),
        observacoes: document.getElementById("observacoes").value,
        produtos: []
    };

    document.querySelectorAll("#tabelaProdutos tbody tr").forEach(row => {
        dados.produtos.push({
            quantidade: parseFloat(row.querySelector(".produto-quantidade").value),
            descricao: row.querySelector(".produto-descricao").value,
            valorUnit: converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value),
            valorTotal: converterMoedaParaNumero(row.cells[3].textContent)
        });
    });

    await salvarDados(dados, 'orcamento');
    orcamentos[index] = dados;
    
    alert("Orçamento atualizado!");
    orcamentoEditando = null;
    document.getElementById("orcamento").reset();
    document.querySelector("#tabelaProdutos tbody").innerHTML = "";
    document.getElementById("btnGerarOrcamento").style.display = "inline-block";
    document.getElementById("btnAtualizarOrcamento").style.display = "none";
    mostrarPagina('orcamentos-gerados');
}

// LISTAGENS
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
            <td>${orc.pedidoGerado ? orc.numeroPedido : 'Não'}</td>
            <td></td>
        `;
        
        const cellAcoes = row.cells[5];
        
        if (!orc.pedidoGerado) {
            const btnEditar = document.createElement('button');
            btnEditar.textContent = "Editar";
            btnEditar.onclick = () => editarOrcamento(orc.id);
            
            const btnGerar = document.createElement('button');
            btnGerar.textContent = "Gerar Pedido";
            btnGerar.onclick = () => gerarPedido(orc.id);
            
            cellAcoes.appendChild(btnEditar);
            cellAcoes.appendChild(btnGerar);
        } else {
            cellAcoes.textContent = "Concluído";
        }
    });
}

function editarOrcamento(id) {
    const orc = orcamentos.find(o => o.id === id);
    if (!orc) return;

    orcamentoEditando = id;
    
    document.getElementById("dataOrcamento").value = orc.dataOrcamento;
    document.getElementById("dataValidade").value = orc.dataValidade;
    document.getElementById("cliente").value = orc.cliente;
    document.getElementById("endereco").value = orc.endereco;
    document.getElementById("tema").value = orc.tema;
    document.getElementById("cidade").value = orc.cidade;
    document.getElementById("telefone").value = orc.telefone;
    document.getElementById("clienteEmail").value = orc.email || "";
    document.getElementById("cores").value = orc.cores;
    document.getElementById("valorFrete").value = formatarMoeda(orc.valorFrete);
    document.getElementById("valorOrcamento").value = formatarMoeda(orc.valorOrcamento);
    document.getElementById("total").value = formatarMoeda(orc.total);
    document.getElementById("observacoes").value = orc.observacoes;

    const tbody = document.querySelector("#tabelaProdutos tbody");
    tbody.innerHTML = '';
    orc.produtos.forEach(p => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><input type="number" class="produto-quantidade" value="${p.quantidade}" min="1"></td>
            <td><input type="text" class="produto-descricao" value="${p.descricao}"></td>
            <td><input type="text" class="produto-valor-unit" value="${formatarMoeda(p.valorUnit)}" oninput="formatarEntradaMoeda(this)"></td>
            <td>${formatarMoeda(p.valorTotal)}</td>
            <td><button type="button" onclick="excluirProduto(this)">Excluir</button></td>
        `;
    });

    mostrarPagina('form-orcamento');
    document.getElementById("btnGerarOrcamento").style.display = "none";
    document.getElementById("btnAtualizarOrcamento").style.display = "inline-block";
}

// PEDIDOS
async function gerarPedido(orcamentoId) {
    const orc = orcamentos.find(o => o.id === orcamentoId);
    if (!orc) return;

    const pedido = {
        numero: gerarNumeroFormatado(numeroPedido),
        dataPedido: new Date().toISOString().split('T')[0],
        dataEntrega: orc.dataValidade,
        cliente: orc.cliente,
        endereco: orc.endereco,
        tema: orc.tema,
        cidade: orc.cidade,
        telefone: orc.telefone,
        email: orc.email,
        cores: orc.cores,
        pagamento: orc.pagamento,
        valorFrete: orc.valorFrete,
        valorOrcamento: orc.valorOrcamento,
        total: orc.total,
        observacoes: orc.observacoes,
        entrada: 0,
        restante: orc.total,
        produtos: orc.produtos,
        tipo: 'pedido'
    };

    await salvarDados(pedido, 'pedido');
    numeroPedido++;
    pedidos.push(pedido);

    orc.pedidoGerado = true;
    orc.numeroPedido = pedido.numero;
    await salvarDados(orc, 'orcamento');

    alert(`Pedido ${pedido.numero} gerado!`);
    mostrarPagina('lista-pedidos');
    mostrarPedidosRealizados();
    mostrarOrcamentosGerados();
}

function mostrarPedidosRealizados() {
    const tbody = document.querySelector("#tabela-pedidos tbody");
    if(!tbody) return;
    tbody.innerHTML = '';

    pedidos.forEach(p => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${p.numero}</td>
            <td>${p.dataPedido}</td>
            <td>${p.cliente}</td>
            <td>${formatarMoeda(p.total)}</td>
            <td><button class="btn-editar-pedido">Editar</button></td>
        `;
        row.querySelector('.btn-editar-pedido').onclick = () => editarPedido(p.id);
    });
}

function editarPedido(id) {
    const pedido = pedidos.find(p => p.id === id);
    if (!pedido) return;
    pedidoEditando = id;

    // Preencher campos de edição...
    document.getElementById("dataPedidoEdicao").value = pedido.dataPedido;
    document.getElementById("dataEntregaEdicao").value = pedido.dataEntrega;
    document.getElementById("clienteEdicao").value = pedido.cliente;
    document.getElementById("enderecoEdicao").value = pedido.endereco;
    document.getElementById("temaEdicao").value = pedido.tema;
    document.getElementById("cidadeEdicao").value = pedido.cidade;
    document.getElementById("contatoEdicao").value = pedido.telefone;
    document.getElementById("coresEdicao").value = pedido.cores;
    document.getElementById("valorFreteEdicao").value = formatarMoeda(pedido.valorFrete);
    document.getElementById("valorPedidoEdicao").value = formatarMoeda(pedido.valorOrcamento || 0);
    document.getElementById("totalEdicao").value = formatarMoeda(pedido.total);
    document.getElementById("entradaEdicao").value = formatarMoeda(pedido.entrada || 0);
    document.getElementById("restanteEdicao").value = formatarMoeda(pedido.restante || 0);
    document.getElementById("observacoesEdicao").value = pedido.observacoes;

    const tbody = document.querySelector("#tabelaProdutosEdicao tbody");
    tbody.innerHTML = '';
    pedido.produtos.forEach(p => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><input type="number" class="produto-quantidade" value="${p.quantidade}" min="1" onchange="atualizarTotaisEdicao()"></td>
            <td><input type="text" class="produto-descricao" value="${p.descricao}"></td>
            <td><input type="text" class="produto-valor-unit" value="${formatarMoeda(p.valorUnit)}" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotaisEdicao()"></td>
            <td>${formatarMoeda(p.valorTotal)}</td>
            <td><button type="button" onclick="excluirProdutoEdicao(this)">Excluir</button></td>
        `;
    });

    mostrarPagina('form-edicao-pedido');
}

async function atualizarPedido() {
    if (!pedidoEditando) return;
    const index = pedidos.findIndex(p => p.id === pedidoEditando);
    
    const dados = {
        ...pedidos[index],
        cliente: document.getElementById("clienteEdicao").value,
        dataEntrega: document.getElementById("dataEntregaEdicao").value,
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFreteEdicao").value),
        total: converterMoedaParaNumero(document.getElementById("totalEdicao").value),
        entrada: converterMoedaParaNumero(document.getElementById("entradaEdicao").value),
        restante: converterMoedaParaNumero(document.getElementById("restanteEdicao").value),
        produtos: []
        // ... outros campos conforme necessário
    };

    document.querySelectorAll("#tabelaProdutosEdicao tbody tr").forEach(row => {
        dados.produtos.push({
            quantidade: parseFloat(row.querySelector(".produto-quantidade").value),
            descricao: row.querySelector(".produto-descricao").value,
            valorUnit: converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value),
            valorTotal: converterMoedaParaNumero(row.cells[3].textContent)
        });
    });

    await salvarDados(dados, 'pedido');
    pedidos[index] = dados;
    alert("Pedido Atualizado!");
    pedidoEditando = null;
    mostrarPagina('lista-pedidos');
}

// Funções de Edição (Escopo Global para Tabela Dinâmica)
function adicionarProdutoEdicao() {
    const tbody = document.querySelector("#tabelaProdutosEdicao tbody");
    const row = tbody.insertRow();
    row.innerHTML = `
        <td><input type="number" class="produto-quantidade" value="1" min="1" onchange="atualizarTotaisEdicao()"></td>
        <td><input type="text" class="produto-descricao"></td>
        <td><input type="text" class="produto-valor-unit" value="R$ 0,00" oninput="formatarEntradaMoeda(this)" onblur="atualizarTotaisEdicao()"></td>
        <td>R$ 0,00</td>
        <td><button type="button" onclick="excluirProdutoEdicao(this)">Excluir</button></td>
    `;
}

function excluirProdutoEdicao(btn) {
    btn.closest('tr').remove();
    atualizarTotaisEdicao();
}

function atualizarTotaisEdicao() {
    let total = 0;
    document.querySelectorAll("#tabelaProdutosEdicao tbody tr").forEach(row => {
        const qtd = parseFloat(row.querySelector(".produto-quantidade").value) || 0;
        const unit = converterMoedaParaNumero(row.querySelector(".produto-valor-unit").value);
        const sub = qtd * unit;
        row.cells[3].textContent = formatarMoeda(sub);
        total += sub;
    });
    
    const frete = converterMoedaParaNumero(document.getElementById("valorFreteEdicao").value);
    const totalFinal = total + frete;
    document.getElementById("valorPedidoEdicao").value = formatarMoeda(total);
    document.getElementById("totalEdicao").value = formatarMoeda(totalFinal);
    atualizarRestanteEdicao();
}

function atualizarRestanteEdicao() {
    const total = converterMoedaParaNumero(document.getElementById("totalEdicao").value);
    const entrada = converterMoedaParaNumero(document.getElementById("entradaEdicao").value);
    document.getElementById("restanteEdicao").value = formatarMoeda(total - entrada);
}

// Filtros e Relatórios (Simplificado)
function filtrarOrcamentos() {
    // Implementação básica de recarga, adicione lógica de filtro se necessário
    mostrarOrcamentosGerados();
}
function filtrarPedidos() {
    mostrarPedidosRealizados();
}
function filtrarPedidosRelatorio() {
    // Implemente a lógica de preencher a tabela de relatório aqui
    alert("Funcionalidade de Relatório pronta para implementação.");
}
function gerarRelatorioXLSX() {
    alert("Exportação XLSX pronta para implementação.");
}

// Tornar funções acessíveis globalmente no final também, por segurança
window.excluirProduto = excluirProduto;
window.excluirProdutoEdicao = excluirProdutoEdicao;
window.formatarEntradaMoeda = formatarEntradaMoeda;
window.atualizarTotaisEdicao = atualizarTotaisEdicao;
window.atualizarRestanteEdicao = atualizarRestanteEdicao;
