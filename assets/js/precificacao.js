// assets/js/precificacao.js

// 1. IMPORTAÇÕES DA CENTRAL
import { db, auth } from './firebase-config.js';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Variáveis de Estado
let materiais = [];
let produtos = [];
let precificacoesGeradas = [];
let maoDeObra = { salario: 0, horas: 220, valorHora: 0 };
let moduleInitialized = false;

// ==========================================================================
// FUNÇÃO DE INICIALIZAÇÃO
// ==========================================================================
export async function initPrecificacao() {
    console.log("Inicializando Módulo Precificação...");
    
    await carregarDados();
    
    if (!moduleInitialized) {
        setupEventListeners();
        moduleInitialized = true;
    }
    
    // Abre a aba padrão (ex: Materiais)
    mostrarSubMenu('materiais-insumos');
}

// ==========================================================================
// LÓGICA DE DADOS
// ==========================================================================
async function carregarDados() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Carrega Materiais
        const matSnap = await getDocs(collection(db, "materiais-insumos"));
        materiais = [];
        matSnap.forEach(d => materiais.push({id: d.id, ...d.data()}));
        
        // Carrega Produtos
        const prodSnap = await getDocs(collection(db, "produtos"));
        produtos = [];
        prodSnap.forEach(d => produtos.push({id: d.id, ...d.data()}));

        // Atualiza UI
        atualizarTabelaMateriaisInsumos();
        atualizarTabelaProdutosCadastrados();
        
        console.log("Dados Precificação Carregados.");
    } catch (e) {
        console.error(e);
    }
}

// ==========================================================================
// LÓGICA DE UI
// ==========================================================================
function setupEventListeners() {
    // Menu de Abas (Submenu)
    document.querySelectorAll('#module-precificacao nav ul li a.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarSubMenu(link.dataset.submenu);
        });
    });

    // Botões de Cadastro
    bindClick('#cadastrar-material-insumo-btn', cadastrarMaterialInsumo);
    bindClick('#cadastrar-produto-btn', cadastrarProduto);
    bindClick('#btn-gerar-nota', gerarNotaPrecificacao);
    
    // Inputs reativos
    const horasInput = document.getElementById('horas-produto');
    if(horasInput) horasInput.addEventListener('change', calcularCustos);
}

function mostrarSubMenu(submenuId) {
    // Esconde todas as subpaginas
    document.querySelectorAll('#module-precificacao .subpagina').forEach(el => el.style.display = 'none');
    // Mostra a alvo
    const target = document.getElementById(submenuId);
    if(target) target.style.display = 'block';
}

function bindClick(selector, handler) {
    const el = document.querySelector(selector);
    if(el) el.addEventListener('click', handler);
}

// ==========================================================================
// FUNÇÕES DE NEGÓCIO (Replicar lógica original)
// ==========================================================================

async function cadastrarMaterialInsumo() {
    const nome = document.getElementById('nome-material').value;
    const valor = parseFloat(document.getElementById('valor-total-material').value);
    
    const novoMat = {
        nome: nome,
        valorTotal: valor,
        tipo: document.querySelector('input[name="tipo-material"]:checked').value
        // ... outros campos
    };
    
    try {
        const ref = await addDoc(collection(db, "materiais-insumos"), novoMat);
        novoMat.id = ref.id;
        materiais.push(novoMat);
        atualizarTabelaMateriaisInsumos();
        alert("Material Cadastrado!");
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
            <td>...</td>
            <td>R$ ${m.valorTotal}</td>
            <td>...</td>
            <td><button>Editar</button></td>
        `;
    });
}

// ... Copie o restante das funções (cadastrarProduto, calcularCustos, etc)
// do seu arquivo original precificacao.js, colando aqui embaixo.
// Lembre-se: Onde havia `firebase.firestore()`, agora use `db` importado.
