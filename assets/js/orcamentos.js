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
    
    // Tornar funções acessíveis globalmente
    window.excluirProduto = excluirProduto;
    window.excluirProdutoEdicao = excluirProdutoEdicao;
    window.formatarEntradaMoeda = formatarEntradaMoeda;
    window.atualizarTotaisEdicao = atualizarTotaisEdicao;
    window.atualizarRestanteEdicao = atualizarRestanteEdicao;
    window.visualizarImpressao = visualizarImpressao;
    
    // NOVAS FUNÇÕES GLOBAIS (Prioridades 2 e 3)
    window.imprimirChecklist = imprimirChecklist;
    window.gerarRelatorioFinanceiro = gerarRelatorioFinanceiro;

    await carregarDados();
    
    if (!moduleInitialized) {
        setupEventListeners();
        inicializarFiltrosRelatorio(); // Popula o select de anos
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
    // Nota: O botão de gerar relatório chama diretamente window.gerarRelatorioFinanceiro() via onclick no HTML

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

function inicializarFiltrosRelatorio() {
    const selectAno = document.getElementById("relatorio-ano");
    if(selectAno) {
        selectAno.innerHTML = ""; // Limpa opções anteriores
        const anoAtual = new Date().getFullYear();
        // Cria opções para o ano atual e os 2 anteriores
        for(let i = anoAtual; i >= anoAtual - 2; i--) {
            const opt = document.createElement("option");
            opt.value = i;
            opt.text = i;
            selectAno.appendChild(opt);
        }
    }
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
        // Se entrar na página de relatório, gera o relatório do mês atual automaticamente
        if(idPagina === 'relatorio') {
            const mesAtual = new Date().getMonth();
            const elMes = document.getElementById('relatorio-mes');
            if(elMes) elMes.value = mesAtual;
            gerarRelatorioFinanceiro();
        }
    }
}

// ==========================================================================
// FUNÇÕES AUXILIARES
// ==========================================================================

function formatarMoeda(valor) {
    if (valor === undefined || valor === null) return 'R$ 0,00';
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
    const campos = ['valorFrete', 'valorOrcamento', 'total', 'entrada', 'restante', 
                   'margemLucroEdicao', 'custoMaoDeObraEdicao',
                   'custoTotalPedido', 'maoDeObraPedido', 'lucroPedido']; // Campos novos adicionados
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
            <td>${orc.dataOrcamento ? orc.dataOrcamento.split('-').reverse().join('/') : '-'}</td>
            <td>${orc.cliente}</td>
            <td>${formatarMoeda(orc.total)}</td>
            <td>${orc.pedidoGerado ? orc.numeroPedido : 'Não'}</td>
            <td></td>
        `;
        
        const cellAcoes = row.cells[5];
        
        const btnImprimir = document.createElement('button');
        btnImprimir.textContent = "Imprimir";
        btnImprimir.style.marginRight = "5px";
        btnImprimir.onclick = () => visualizarImpressao(orc);
        cellAcoes.appendChild(btnImprimir);

        if (!orc.pedidoGerado) {
            const btnEditar = document.createElement('button');
            btnEditar.textContent = "Editar";
            btnEditar.style.marginRight = "5px";
            btnEditar.onclick = () => editarOrcamento(orc.id);
            cellAcoes.appendChild(btnEditar);
            
            const btnGerar = document.createElement('button');
            btnGerar.textContent = "Gerar Pedido";
            btnGerar.onclick = () => gerarPedido(orc.id);
            cellAcoes.appendChild(btnGerar);
        } else {
            const span = document.createElement('span');
            span.textContent = " Pedido Gerado";
            cellAcoes.appendChild(span);
        }
    });
}

function visualizarImpressao(orcamento) {
    const janela = window.open('', '_blank');
    
    const dtOrc = orcamento.dataOrcamento ? orcamento.dataOrcamento.split('-').reverse().join('/') : '';
    const dtVal = orcamento.dataValidade ? orcamento.dataValidade.split('-').reverse().join('/') : '';
    const pagamento = Array.isArray(orcamento.pagamento) ? orcamento.pagamento.join(', ') : orcamento.pagamento;

    const html = `
        <html>
        <head>
            <title>Orçamento ${orcamento.numero}</title>
            <style>
                body { font-family: 'Arial', sans-serif; padding: 40px; color: #333; }
                .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #7aa2a9; padding-bottom: 20px; }
                .header h1 { color: #7aa2a9; margin: 0; }
                .header p { color: #777; font-size: 0.9em; margin: 5px 0; }
                .info-section { margin-bottom: 30px; line-height: 1.6; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #f2f2f2; color: #333; }
                .totais { text-align: right; margin-top: 30px; }
                .totais h3 { color: #7aa2a9; }
                .obs { margin-top: 40px; font-size: 0.9em; color: #555; border-top: 1px solid #eee; padding-top: 10px; }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Pérola Rara</h1>
                <p>Orçamento Nº ${orcamento.numero}</p>
                <p>(65) 99250-3151 | @perolararafraldapersonalizada</p>
            </div>
            
            <div class="info-section">
                <strong>Cliente:</strong> ${orcamento.cliente || '-'}<br>
                <strong>Cidade:</strong> ${orcamento.cidade || '-'}<br>
                <strong>Telefone:</strong> ${orcamento.telefone || '-'}<br>
                <strong>Data do Orçamento:</strong> ${dtOrc}<br>
                <strong>Validade:</strong> ${dtVal}<br>
                <strong>Tema:</strong> ${orcamento.tema || '-'}<br>
                <strong>Cores:</strong> ${orcamento.cores || '-'}
            </div>

            <h3>Produtos</h3>
            <table>
                <thead>
                    <tr>
                        <th>Qtd</th>
                        <th>Descrição</th>
                        <th>Valor Unit.</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${orcamento.produtos.map(p => `
                        <tr>
                            <td>${p.quantidade}</td>
                            <td>${p.descricao}</td>
                            <td>${formatarMoeda(p.valorUnit)}</td>
                            <td>${formatarMoeda(p.valorTotal)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totais">
                <p><strong>Frete:</strong> ${formatarMoeda(orcamento.valorFrete)}</p>
                <h3>Total Geral: ${formatarMoeda(orcamento.total)}</h3>
                <p><strong>Forma de Pagamento:</strong> ${pagamento}</p>
            </div>

            ${orcamento.observacoes ? `<div class="obs"><strong>Observações:</strong><br>${orcamento.observacoes}</div>` : ''}

            <div style="text-align: center; margin-top: 50px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #7aa2a9; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimir</button>
            </div>
        </body>
        </html>
    `;
    
    janela.document.write(html);
    janela.document.close();
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
        tipo: 'pedido',
        // Inicializar novos campos financeiros com 0
        custoMaoDeObra: 0,
        margemLucro: 0,
        custosTotais: 0
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
        // Botão Checklist adicionado aqui (Prioridade 3)
        row.innerHTML = `
            <td>${p.numero}</td>
            <td>${p.dataPedido ? p.dataPedido.split('-').reverse().join('/') : '-'}</td>
            <td>${p.cliente}</td>
            <td>${formatarMoeda(p.total)}</td>
            <td>
                <button class="btn-editar-pedido" onclick="editarPedido('${p.id}')">Editar</button>
                <button class="btn-checklist" style="background:#687f82; margin-left:5px;" onclick="imprimirChecklist('${p.id}')">Checklist</button>
            </td>
        `;
    });
}

// Prioridade 3: Função para imprimir Checklist de Produção
function imprimirChecklist(id) {
    const p = pedidos.find(o => o.id === id);
    if (!p) return;

    const janela = window.open('', '_blank');
    const html = `
        <html>
        <head>
            <title>Checklist - ${p.numero}</title>
            <style>
                body { font-family: 'Arial', sans-serif; padding: 20px; color: #000; }
                h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                .box { width: 20px; height: 20px; border: 2px solid #000; display: inline-block; }
            </style>
        </head>
        <body>
            <h1>Ordem de Produção - ${p.numero}</h1>
            <div class="info">
                <div><strong>Cliente:</strong> ${p.cliente}</div>
                <div><strong>Entrega:</strong> ${p.dataEntrega ? p.dataEntrega.split('-').reverse().join('/') : '-'}</div>
            </div>
            <div class="info">
                <div><strong>Tema:</strong> ${p.tema}</div>
                <div><strong>Cores:</strong> ${p.cores}</div>
            </div>
            
            <h3>Itens para Conferência</h3>
            <table>
                <thead><tr><th style="width:50px">OK</th><th>Qtd</th><th>Descrição</th><th>Obs. Item</th></tr></thead>
                <tbody>
                    ${p.produtos.map(prod => `
                        <tr>
                            <td style="text-align:center;"><div class="box"></div></td>
                            <td>${prod.quantidade}</td>
                            <td>${prod.descricao}</td>
                            <td></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div style="margin-top: 30px; border: 1px solid #000; padding: 10px; min-height: 100px;">
                <strong>Observações Gerais:</strong><br>${p.observacoes}
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <button onclick="window.print()">Imprimir</button>
            </div>
        </body>
        </html>
    `;
    janela.document.write(html);
    janela.document.close();
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

    // Prioridade 1: Preencher novos campos financeiros do Demonstrativo
    // Estes campos foram adicionados ao HTML
    if (document.getElementById("custoTotalPedido")) {
        document.getElementById("custoTotalPedido").value = formatarMoeda(pedido.custosTotais || 0);
    }
    if (document.getElementById("maoDeObraPedido")) {
        document.getElementById("maoDeObraPedido").value = formatarMoeda(pedido.custoMaoDeObra || 0);
    }
    if (document.getElementById("lucroPedido")) {
        document.getElementById("lucroPedido").value = formatarMoeda(pedido.margemLucro || 0);
    }

    // Campos de compatibilidade antiga (mantidos por precaução se existirem)
    if (document.getElementById("custoMaoDeObraEdicao")) {
        document.getElementById("custoMaoDeObraEdicao").value = formatarMoeda(pedido.custoMaoDeObra || 0);
    }
    if (document.getElementById("margemLucroEdicao")) {
        document.getElementById("margemLucroEdicao").value = formatarMoeda(pedido.margemLucro || 0);
    }

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
    
    // Prioridade 1: Ler novos campos financeiros do formulário
    // Se o elemento não existir (versão antiga do HTML), assume 0
    const custosTotais = document.getElementById("custoTotalPedido") ? converterMoedaParaNumero(document.getElementById("custoTotalPedido").value) : 0;
    const custoMO = document.getElementById("maoDeObraPedido") ? converterMoedaParaNumero(document.getElementById("maoDeObraPedido").value) : 
                    (document.getElementById("custoMaoDeObraEdicao") ? converterMoedaParaNumero(document.getElementById("custoMaoDeObraEdicao").value) : 0);
    const margem = document.getElementById("lucroPedido") ? converterMoedaParaNumero(document.getElementById("lucroPedido").value) :
                   (document.getElementById("margemLucroEdicao") ? converterMoedaParaNumero(document.getElementById("margemLucroEdicao").value) : 0);

    const dados = {
        ...pedidos[index],
        cliente: document.getElementById("clienteEdicao").value,
        dataEntrega: document.getElementById("dataEntregaEdicao").value,
        valorFrete: converterMoedaParaNumero(document.getElementById("valorFreteEdicao").value),
        total: converterMoedaParaNumero(document.getElementById("totalEdicao").value),
        entrada: converterMoedaParaNumero(document.getElementById("entradaEdicao").value),
        restante: converterMoedaParaNumero(document.getElementById("restanteEdicao").value),
        // Novos campos salvos
        custosTotais: custosTotais,
        custoMaoDeObra: custoMO,
        margemLucro: margem,
        produtos: []
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

// Prioridade 2: Lógica de Relatório Financeiro Mensal
function gerarRelatorioFinanceiro() {
    const mes = parseInt(document.getElementById("relatorio-mes").value);
    const ano = parseInt(document.getElementById("relatorio-ano").value || new Date().getFullYear());

    let totalFat = 0, totalMO = 0, totalLucro = 0, totalCustos = 0;
    const tbody = document.querySelector("#tabela-relatorio tbody");
    if(!tbody) return;
    
    tbody.innerHTML = "";

    const pedidosFiltrados = pedidos.filter(p => {
        if(!p.dataPedido) return false;
        // extrai mês e ano da string ISO (YYYY-MM-DD)
        const pMes = parseInt(p.dataPedido.split('-')[1]) - 1; 
        const pAno = parseInt(p.dataPedido.split('-')[0]);
        return pMes === mes && pAno === ano;
    });

    pedidosFiltrados.forEach(p => {
        // Soma dos valores
        totalFat += (p.total || 0);
        totalMO += (p.custoMaoDeObra || 0);
        totalLucro += (p.margemLucro || 0);
        totalCustos += (p.custosTotais || 0);

        // Linha da tabela
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${p.dataPedido.split('-').reverse().join('/')}</td>
            <td>${p.numero}</td>
            <td>${p.cliente}</td>
            <td style="color:#2196F3">${formatarMoeda(p.custoMaoDeObra)}</td>
            <td style="color:#4CAF50">${formatarMoeda(p.margemLucro)}</td>
            <td>${formatarMoeda(p.total)}</td>
        `;
    });

    // Atualiza KPIs do Dashboard (Cards)
    if(document.getElementById("kpi-mao-obra")) 
        document.getElementById("kpi-mao-obra").textContent = formatarMoeda(totalMO);
    
    if(document.getElementById("kpi-lucro"))
        document.getElementById("kpi-lucro").textContent = formatarMoeda(totalLucro);
    
    if(document.getElementById("kpi-custos"))
        document.getElementById("kpi-custos").textContent = formatarMoeda(totalCustos);
    
    if(document.getElementById("kpi-total"))
        document.getElementById("kpi-total").textContent = formatarMoeda(totalFat);
}

// Filtros e Relatórios (Legado / Redirecionamento)
function filtrarOrcamentos() {
    mostrarOrcamentosGerados();
}
function filtrarPedidos() {
    mostrarPedidosRealizados();
}
function gerarRelatorioXLSX() {
    alert("Exportação XLSX pronta para implementação futura.");
}

// Tornar funções acessíveis globalmente no final também, por segurança
window.excluirProduto = excluirProduto;
window.excluirProdutoEdicao = excluirProdutoEdicao;
window.formatarEntradaMoeda = formatarEntradaMoeda;
window.atualizarTotaisEdicao = atualizarTotaisEdicao;
window.atualizarRestanteEdicao = atualizarRestanteEdicao;
window.visualizarImpressao = visualizarImpressao;
window.imprimirChecklist = imprimirChecklist;
window.gerarRelatorioFinanceiro = gerarRelatorioFinanceiro;
