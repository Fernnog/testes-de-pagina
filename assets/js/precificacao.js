// assets/js/precificacao.js

import { db, auth } from './firebase-config.js';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Variáveis de Estado
let materiais = [];
let produtos = [];
let precificacoesGeradas = [];
let maoDeObra = { salario: 0, horas: 220, valorHora: 0, incluirFerias13o: false, custoFerias13o: 0 };
let custosIndiretosPredefinidos = []; 
let custosIndiretosAdicionais = [];
let produtoEmEdicao = null;
let materialEmEdicao = null;
let moduleInitialized = false;

// ==========================================================================
// INICIALIZAÇÃO
// ==========================================================================
export async function initPrecificacao() {
    console.log("Inicializando Módulo Precificação...");
    
    // Tornar funções acessíveis globalmente
    window.buscarMateriaisCadastrados = buscarMateriaisCadastrados;
    window.buscarCustosIndiretosCadastrados = buscarCustosIndiretosCadastrados;
    window.buscarProdutosCadastrados = buscarProdutosCadastrados;
    window.buscarPrecificacoesGeradas = buscarPrecificacoesGeradas;

    await carregarDados();
    
    if (!moduleInitialized) {
        setupEventListeners();
        moduleInitialized = true;
    }
    
    mostrarSubMenu('materiais-insumos');
}

// ==========================================================================
// CARREGAMENTO DE DADOS
// ==========================================================================
async function carregarDados() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // 1. Materiais
        const matSnap = await getDocs(collection(db, "materiais-insumos"));
        materiais = [];
        matSnap.forEach(d => materiais.push({id: d.id, ...d.data()}));

        // 2. Produtos
        const prodSnap = await getDocs(collection(db, "produtos"));
        produtos = [];
        prodSnap.forEach(d => produtos.push({id: d.id, ...d.data()}));

        // 3. Precificações
        const precSnap = await getDocs(collection(db, "precificacoes-geradas"));
        precificacoesGeradas = [];
        precSnap.forEach(d => precificacoesGeradas.push({id: d.id, ...d.data()}));
        
        // 4. Mão de Obra
        const moDoc = await getDoc(doc(db, "configuracoes", "maoDeObra"));
        if(moDoc.exists()) maoDeObra = moDoc.data();
        
        // 5. Custos Indiretos Predefinidos (Mock inicial se vazio)
        const ciSnap = await getDocs(collection(db, "custos-indiretos-predefinidos"));
        custosIndiretosPredefinidos = [];
        if(ciSnap.empty) {
             // Lista base padrão se não existir no banco
             const base = ["Energia", "Água", "Aluguel", "Internet"];
             base.forEach(desc => custosIndiretosPredefinidos.push({descricao: desc, valorMensal: 0}));
        } else {
             ciSnap.forEach(d => custosIndiretosPredefinidos.push(d.data()));
        }

        // Atualizar Tabelas
        atualizarTabelaMateriaisInsumos();
        atualizarTabelaProdutosCadastrados();
        atualizarTabelaPrecificacoesGeradas();
        atualizarTabelaCustosIndiretos();
        preencherCamposMaoDeObra();

    } catch (e) {
        console.error("Erro ao carregar dados precificação:", e);
    }
}

// ==========================================================================
// EVENTOS E NAVEGAÇÃO
// ==========================================================================
function setupEventListeners() {
    // Menu
    document.querySelectorAll('#module-precificacao nav ul li a.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarSubMenu(link.dataset.submenu);
        });
    });

    // Botões
    bindClick('#cadastrar-material-insumo-btn', cadastrarMaterialInsumo);
    bindClick('#btn-salvar-mao-de-obra', salvarMaoDeObra);
    bindClick('#btn-editar-mao-de-obra', () => {
         document.getElementById('salario-receber').readOnly = false;
         document.getElementById('btn-salvar-mao-de-obra').style.display = 'inline-block';
         document.getElementById('btn-editar-mao-de-obra').style.display = 'none';
    });
    bindClick('#cadastrar-produto-btn', cadastrarProduto);
    bindClick('#btn-gerar-nota', gerarNotaPrecificacao);
    
    // Auto-complete e Cálculos
    const inputMat = document.getElementById('pesquisa-material');
    if(inputMat) inputMat.addEventListener('input', buscarMateriaisAutocomplete);
    
    const inputProd = document.getElementById('produto-pesquisa');
    if(inputProd) inputProd.addEventListener('input', buscarProdutosAutocomplete);
    
    const margem = document.getElementById('margem-lucro-final');
    if(margem) margem.addEventListener('change', calcularPrecoVendaFinal);
    
    const horas = document.getElementById('horas-produto');
    if(horas) horas.addEventListener('change', calcularCustos);
    
    // Radios Tipo Material
    document.querySelectorAll('input[name="tipo-material"]').forEach(radio => {
        radio.addEventListener('change', function () {
            document.querySelectorAll('[id^="campos-"]').forEach(el => el.style.display = 'none');
            const target = document.getElementById(`campos-${this.value}`);
            if(target) target.style.display = 'block';
        });
    });
}

function bindClick(selector, handler) {
    const el = document.querySelector(selector);
    if(el) el.addEventListener('click', handler);
}

function mostrarSubMenu(id) {
    document.querySelectorAll('#module-precificacao .subpagina').forEach(el => el.style.display = 'none');
    const target = document.getElementById(id);
    if(target) target.style.display = 'block';
}

function formatarMoeda(valor) {
    if (typeof valor !== 'number') return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ==========================================================================
// MATERIAIS
// ==========================================================================
async function cadastrarMaterialInsumo() {
    const nome = document.getElementById('nome-material').value;
    const tipo = document.querySelector('input[name="tipo-material"]:checked').value;
    const valorTotal = parseFloat(document.getElementById('valor-total-material').value);
    
    // Cálculo unitário simplificado
    let custoUnitario = 0;
    // (Adicione aqui a lógica de cálculo por tipo se necessário, ex: valorTotal / comprimento)
    custoUnitario = valorTotal; // Placeholder simplificado

    const mat = { nome, tipo, valorTotal, custoUnitario };

    try {
        if(materialEmEdicao) {
            await updateDoc(doc(db, "materiais-insumos", materialEmEdicao.id), mat);
            const idx = materiais.findIndex(m => m.id === materialEmEdicao.id);
            materiais[idx] = { ...materiais[idx], ...mat };
            materialEmEdicao = null;
        } else {
            const ref = await addDoc(collection(db, "materiais-insumos"), mat);
            mat.id = ref.id;
            materiais.push(mat);
        }
        atualizarTabelaMateriaisInsumos();
        document.getElementById('form-materiais-insumos').reset();
        alert("Material salvo!");
    } catch (e) {
        console.error(e);
    }
}

function atualizarTabelaMateriaisInsumos() {
    const tbody = document.querySelector('#tabela-materiais-insumos tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    materiais.forEach(m => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${m.nome}</td>
            <td>${m.tipo}</td>
            <td>-</td>
            <td>${formatarMoeda(m.valorTotal)}</td>
            <td>${formatarMoeda(m.custoUnitario)}</td>
            <td>
                <button class="btn-editar-mat">Editar</button>
                <button class="btn-remover-mat">Remover</button>
            </td>
        `;
        row.querySelector('.btn-editar-mat').onclick = () => editarMaterialInsumo(m.id);
        row.querySelector('.btn-remover-mat').onclick = () => removerMaterialInsumo(m.id);
    });
}

function buscarMateriaisCadastrados() {
    const termo = document.getElementById('busca-material').value.toLowerCase();
    const rows = document.querySelectorAll('#tabela-materiais-insumos tbody tr');
    rows.forEach(row => {
        const text = row.cells[0].textContent.toLowerCase();
        row.style.display = text.includes(termo) ? '' : 'none';
    });
}

function editarMaterialInsumo(id) {
    const m = materiais.find(x => x.id === id);
    if(!m) return;
    materialEmEdicao = m;
    document.getElementById('nome-material').value = m.nome;
    document.getElementById('valor-total-material').value = m.valorTotal;
    // ... preencher outros campos
}

async function removerMaterialInsumo(id) {
    if(!confirm("Excluir material?")) return;
    await deleteDoc(doc(db, "materiais-insumos", id));
    materiais = materiais.filter(m => m.id !== id);
    atualizarTabelaMateriaisInsumos();
}

// ==========================================================================
// MÃO DE OBRA & CUSTOS INDIRETOS
// ==========================================================================
async function salvarMaoDeObra() {
    const sal = parseFloat(document.getElementById('salario-receber').value);
    const hrs = parseFloat(document.getElementById('horas-trabalhadas').value);
    
    maoDeObra = { 
        salario: sal, 
        horas: hrs, 
        valorHora: sal/hrs,
        incluirFerias13o: document.getElementById('incluir-ferias-13o-sim').checked
    };
    
    await setDoc(doc(db, "configuracoes", "maoDeObra"), maoDeObra);
    document.getElementById('valor-hora').value = maoDeObra.valorHora.toFixed(2);
    document.getElementById('salario-receber').readOnly = true;
    document.getElementById('btn-salvar-mao-de-obra').style.display = 'none';
    document.getElementById('btn-editar-mao-de-obra').style.display = 'inline-block';
    alert("Mão de Obra Salva!");
}

function preencherCamposMaoDeObra() {
    document.getElementById('salario-receber').value = maoDeObra.salario;
    document.getElementById('horas-trabalhadas').value = maoDeObra.horas;
    document.getElementById('valor-hora').value = (maoDeObra.valorHora || 0).toFixed(2);
}

function atualizarTabelaCustosIndiretos() {
    const tbody = document.querySelector('#tabela-custos-indiretos tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    custosIndiretosPredefinidos.forEach(c => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${c.descricao}</td>
            <td>${formatarMoeda(c.valorMensal)}</td>
            <td>${formatarMoeda(c.valorMensal / maoDeObra.horas)}</td>
            <td><button>Zerar</button></td>
        `;
    });
}

function buscarCustosIndiretosCadastrados() { /* Lógica similar ao filtro de materiais */ }

// ==========================================================================
// PRODUTOS
// ==========================================================================
async function cadastrarProduto() {
    const nome = document.getElementById('nome-produto').value;
    if(!nome) return alert("Nome obrigatório");
    
    // Coletar materiais da tabela temporária
    const materiaisList = [];
    document.querySelectorAll('#tabela-materiais-produto tbody tr').forEach(row => {
        materiaisList.push({
            nome: row.cells[0].textContent,
            custoTotal: converterMoeda(row.cells[5].textContent)
        });
    });
    
    const custoTotal = materiaisList.reduce((acc, cur) => acc + cur.custoTotal, 0);
    
    const prod = { nome, materiais: materiaisList, custoTotal };
    
    try {
        const ref = await addDoc(collection(db, "produtos"), prod);
        prod.id = ref.id;
        produtos.push(prod);
        atualizarTabelaProdutosCadastrados();
        document.getElementById('form-produtos-cadastrados').reset();
        document.querySelector('#tabela-materiais-produto tbody').innerHTML = '';
        alert("Produto cadastrado!");
    } catch(e) { console.error(e); }
}

function atualizarTabelaProdutosCadastrados() {
    const tbody = document.querySelector("#tabela-produtos tbody");
    if(!tbody) return;
    tbody.innerHTML = "";
    
    produtos.forEach(p => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${p.nome}</td>
            <td>${p.materiais.length} itens</td>
            <td>-</td>
            <td>${formatarMoeda(p.custoTotal)}</td>
            <td><button class="btn-rm-prod">Remover</button></td>
        `;
        row.querySelector('.btn-rm-prod').onclick = async () => {
             if(confirm("Remover?")) {
                 await deleteDoc(doc(db, "produtos", p.id));
                 produtos = produtos.filter(x => x.id !== p.id);
                 atualizarTabelaProdutosCadastrados();
             }
        };
    });
}

function buscarProdutosCadastrados() { /* Filtro simples */ }

// Autocomplete simples
function buscarMateriaisAutocomplete() {
    const termo = this.value.toLowerCase();
    const div = document.getElementById('resultados-pesquisa');
    div.innerHTML = '';
    
    if(!termo) { div.style.display = 'none'; return; }
    
    const results = materiais.filter(m => m.nome.toLowerCase().includes(termo));
    results.forEach(m => {
        const item = document.createElement('div');
        item.textContent = m.nome;
        item.onclick = () => {
            adicionarMaterialNaTabelaProduto(m);
            div.style.display = 'none';
        };
        div.appendChild(item);
    });
    div.style.display = results.length ? 'block' : 'none';
}

function adicionarMaterialNaTabelaProduto(m) {
    const tbody = document.querySelector('#tabela-materiais-produto tbody');
    const row = tbody.insertRow();
    row.innerHTML = `
        <td>${m.nome}</td>
        <td>${m.tipo}</td>
        <td>${formatarMoeda(m.custoUnitario)}</td>
        <td>1</td> <!-- Dimensões padrão -->
        <td>1</td> <!-- Quantidade -->
        <td>${formatarMoeda(m.custoUnitario)}</td>
        <td><button onclick="this.closest('tr').remove()">Remover</button></td>
    `;
}

// ==========================================================================
// CÁLCULO E GERAÇÃO DE PRECIFICAÇÃO
// ==========================================================================
function buscarProdutosAutocomplete() {
    const termo = this.value.toLowerCase();
    const div = document.getElementById('produto-resultados');
    div.innerHTML = '';
    div.classList.remove('hidden');
    
    produtos.filter(p => p.nome.toLowerCase().includes(termo)).forEach(p => {
        const item = document.createElement('div');
        item.textContent = p.nome;
        item.onclick = () => {
            document.getElementById('produto-pesquisa').value = p.nome;
            document.getElementById('custo-produto').textContent = formatarMoeda(p.custoTotal);
            div.classList.add('hidden');
            calcularCustos();
        };
        div.appendChild(item);
    });
}

function calcularCustos() {
    // 1. Custo Produto
    const custoProd = converterMoeda(document.getElementById('custo-produto').textContent);
    
    // 2. Mão de Obra
    const horas = parseFloat(document.getElementById('horas-produto').value) || 1;
    const custoMO = horas * maoDeObra.valorHora;
    document.getElementById('custo-mao-de-obra-detalhe').textContent = formatarMoeda(custoMO);
    
    // 3. Custos Indiretos (Simplificado)
    const custoInd = 10; // Mockup, deve somar da lista
    document.getElementById('custo-indireto').textContent = formatarMoeda(custoInd);
    
    // 4. Subtotal
    const sub = custoProd + custoMO + custoInd;
    document.getElementById('subtotal').textContent = formatarMoeda(sub);
    
    calcularPrecoVendaFinal();
}

function calcularPrecoVendaFinal() {
    const sub = converterMoeda(document.getElementById('subtotal').textContent);
    const margem = parseFloat(document.getElementById('margem-lucro-final').value) || 0;
    const lucro = sub * (margem/100);
    const total = sub + lucro;
    
    document.getElementById('margem-lucro-valor').textContent = formatarMoeda(lucro);
    document.getElementById('total-final').textContent = formatarMoeda(total);
    document.getElementById('total-final-com-taxas').textContent = formatarMoeda(total); // Simplificado sem taxa cartão
}

async function gerarNotaPrecificacao() {
    const nota = {
        numero: Date.now(), // Temporário
        cliente: document.getElementById('nome-cliente').value,
        produto: document.getElementById('produto-pesquisa').value,
        total: converterMoeda(document.getElementById('total-final').textContent)
    };
    
    await addDoc(collection(db, "precificacoes-geradas"), nota);
    precificacoesGeradas.push(nota);
    atualizarTabelaPrecificacoesGeradas();
    alert("Precificação Gerada!");
}

function atualizarTabelaPrecificacoesGeradas() {
    const tbody = document.querySelector('#tabela-precificacoes-geradas tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    precificacoesGeradas.forEach(p => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${p.numero}</td>
            <td>${p.cliente}</td>
            <td><button>Visualizar</button></td>
        `;
    });
}

function buscarPrecificacoesGeradas() { /* Filtro */ }

function converterMoeda(str) {
    if(typeof str === 'number') return str;
    return parseFloat(str.replace('R$','').replace('.','').replace(',','.')) || 0;
}
