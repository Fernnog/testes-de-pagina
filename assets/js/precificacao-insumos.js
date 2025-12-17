// assets/js/precificacao-insumos.js

import { db, auth } from './firebase-config.js';
import { 
    collection, doc, setDoc, getDocs, updateDoc, deleteDoc, addDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ==========================================
// 1. ESTADO COMPARTILHADO (Exportado)
// ==========================================
export let materiais = [];
export let maoDeObra = { salario: 0, horas: 220, valorHora: 0, incluirFerias13o: false, custoFerias13o: 0 };
export let custosIndiretosPredefinidos = [];
export let custosIndiretosAdicionais = [];

// Base de configuração para custos indiretos
const custosIndiretosPredefinidosBase = [
    { descricao: "Energia elétrica", valorMensal: 0 },
    { descricao: "Água", valorMensal: 0 },
    { descricao: "Gás", valorMensal: 0 },
    { descricao: "Aluguel do espaço", valorMensal: 0 },
    { descricao: "Depreciação equipamentos", valorMensal: 0 },
    { descricao: "Internet/Telefone", valorMensal: 0 },
    { descricao: "MEI/Impostos", valorMensal: 0 },
    { descricao: "Marketing", valorMensal: 0 },
    { descricao: "Embalagens", valorMensal: 0 },
    { descricao: "Transporte", valorMensal: 0 }
];

// Variável local para controle de edição de materiais
let materialEmEdicao = null;

// ==========================================
// 2. CALLBACKS (Comunicação com Módulo Principal)
// ==========================================
// Permite que o precificacao.js injete a lógica de atualizar produtos
let onMaterialUpdateCallback = null;

export function setOnMaterialUpdateCallback(callback) {
    onMaterialUpdateCallback = callback;
}

// ==========================================
// 3. HELPERS GERAIS
// ==========================================
function formatarMoeda(valor) {
    if (typeof valor !== 'number' || isNaN(valor)) return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function getUnidadeSigla(tipo) {
    const map = { comprimento: 'm', litro: 'L', quilo: 'kg', area: 'm²', unidade: 'un' };
    return map[tipo] || '';
}

function calcularCustoUnitario(tipo, valorTotal, comprimentoCm, volumeMl, pesoG, larguraCm, alturaCm) {
    let custo = 0;
    if (valorTotal <= 0) return 0;

    switch (tipo) {
        case "comprimento": custo = valorTotal / (comprimentoCm / 100); break; // R$/metro
        case "litro": custo = valorTotal / (volumeMl / 1000); break; // R$/litro
        case "quilo": custo = valorTotal / (pesoG / 1000); break; // R$/kg
        case "unidade": custo = valorTotal; break; // R$/unidade
        case "area": custo = valorTotal / ((larguraCm / 100) * (alturaCm / 100)); break; // R$/m²
    }
    return custo;
}

// ==========================================
// 4. LÓGICA DE MATERIAIS
// ==========================================

export async function carregarMateriais() {
    try {
        const matSnap = await getDocs(collection(db, "materiais-insumos"));
        materiais = [];
        matSnap.forEach(d => materiais.push({id: d.id, ...d.data()}));
        atualizarTabelaMateriaisInsumos();
    } catch (e) {
        console.error("Erro ao carregar materiais:", e);
    }
}

export function toggleCamposMaterial(tipo) {
    const campos = ['comprimento', 'litro', 'quilo', 'area'];
    campos.forEach(c => {
        const el = document.getElementById(`campos-${c}`);
        if(el) el.style.display = 'none';
    });
    
    const target = document.getElementById(`campos-${tipo}`);
    if(target) target.style.display = 'block';
}

export async function cadastrarMaterialInsumo() {
    const nome = document.getElementById('nome-material').value;
    const tipoEl = document.querySelector('input[name="tipo-material"]:checked');
    
    if(!tipoEl) return;
    const tipo = tipoEl.value;
    
    const valorTotal = parseFloat(document.getElementById('valor-total-material').value) || 0;
    const comprimentoCm = parseFloat(document.getElementById('comprimento-cm').value) || 0;
    const volumeMl = parseFloat(document.getElementById('volume-ml').value) || 0;
    const pesoG = parseFloat(document.getElementById('peso-g').value) || 0;
    const larguraCm = parseFloat(document.getElementById('largura-cm').value) || 0;
    const alturaCm = parseFloat(document.getElementById('altura-cm').value) || 0;

    if(!nome || valorTotal <= 0) {
        alert("Preencha o nome e o valor total corretamente.");
        return;
    }

    const custoUnitario = calcularCustoUnitario(tipo, valorTotal, comprimentoCm, volumeMl, pesoG, larguraCm, alturaCm);

    const materialData = {
        nome, tipo, valorTotal, 
        comprimentoCm, volumeMl, pesoG, larguraCm, alturaCm,
        custoUnitario
    };

    try {
        if(materialEmEdicao) {
            await updateDoc(doc(db, "materiais-insumos", materialEmEdicao.id), materialData);
            
            // Atualiza array local
            const idx = materiais.findIndex(m => m.id === materialEmEdicao.id);
            if(idx !== -1) materiais[idx] = { id: materialEmEdicao.id, ...materialData };
            
            // DISPARA EFEITO DOMINÓ (Callback para o arquivo principal)
            if(onMaterialUpdateCallback) {
                await onMaterialUpdateCallback(materiais[idx]);
            }
            
            alert("Material atualizado com sucesso!");
            materialEmEdicao = null;
            const btn = document.querySelector('#cadastrar-material-insumo-btn');
            if(btn) btn.textContent = "Cadastrar Material";
        } else {
            const ref = await addDoc(collection(db, "materiais-insumos"), materialData);
            materialData.id = ref.id;
            materiais.push(materialData);
            alert("Material cadastrado!");
        }

        const form = document.getElementById('form-materiais-insumos');
        if(form) form.reset();
        
        toggleCamposMaterial('comprimento'); 
        // Reseta o radio button para comprimento visualmente
        const radioComp = document.querySelector('input[name="tipo-material"][value="comprimento"]');
        if(radioComp) radioComp.checked = true;

        atualizarTabelaMateriaisInsumos();

    } catch (e) {
        console.error(e);
        alert("Erro ao salvar material.");
    }
}

export function atualizarTabelaMateriaisInsumos() {
    const tbody = document.querySelector('#tabela-materiais-insumos tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    materiais.forEach(m => {
        const row = tbody.insertRow();
        
        let detalhes = "-";
        if (m.tipo === 'comprimento') detalhes = `${m.comprimentoCm} cm`;
        else if (m.tipo === 'litro') detalhes = `${m.volumeMl} ml`;
        else if (m.tipo === 'quilo') detalhes = `${m.pesoG} g`;
        else if (m.tipo === 'area') detalhes = `${m.larguraCm}x${m.alturaCm} cm`;

        row.innerHTML = `
            <td>${m.nome}</td>
            <td>${m.tipo}</td>
            <td>${detalhes}</td>
            <td>${formatarMoeda(m.valorTotal)}</td>
            <td>${formatarMoeda(m.custoUnitario)} / ${getUnidadeSigla(m.tipo)}</td>
            <td>
                <button class="btn-editar-mat" onclick="editarMaterialInsumo('${m.id}')">Editar</button>
                <button class="btn-remover-mat" onclick="removerMaterialInsumo('${m.id}')">Remover</button>
            </td>
        `;
    });
}

export function buscarMateriaisCadastrados() {
    const input = document.getElementById('busca-material');
    if(!input) return;
    const termo = input.value.toLowerCase();
    const rows = document.querySelectorAll('#tabela-materiais-insumos tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(termo) ? '' : 'none';
    });
}

// Funções Globais (Window) para Materiais
window.buscarMateriaisCadastrados = buscarMateriaisCadastrados;

window.editarMaterialInsumo = function(id) {
    const m = materiais.find(x => x.id === id);
    if(!m) return;
    materialEmEdicao = m;
    
    const nomeEl = document.getElementById('nome-material');
    const valEl = document.getElementById('valor-total-material');
    if(nomeEl) nomeEl.value = m.nome;
    if(valEl) valEl.value = m.valorTotal;
    
    const radio = document.querySelector(`input[name="tipo-material"][value="${m.tipo}"]`);
    if(radio) {
        radio.checked = true;
        toggleCamposMaterial(m.tipo);
    }

    if(m.tipo === 'comprimento') document.getElementById('comprimento-cm').value = m.comprimentoCm;
    if(m.tipo === 'litro') document.getElementById('volume-ml').value = m.volumeMl;
    if(m.tipo === 'quilo') document.getElementById('peso-g').value = m.pesoG;
    if(m.tipo === 'area') {
        document.getElementById('largura-cm').value = m.larguraCm;
        document.getElementById('altura-cm').value = m.alturaCm;
    }
    
    const btn = document.querySelector('#cadastrar-material-insumo-btn');
    if(btn) btn.textContent = "Salvar Alterações";
    
    const section = document.getElementById('materiais-insumos');
    if(section) section.scrollIntoView({behavior: "smooth"});
};

window.removerMaterialInsumo = async function(id) {
    // Nota: A validação de "em uso" idealmente é feita via callback ou checagem no array de produtos.
    // Como os produtos estão no outro arquivo, assumimos que o usuário sabe o que faz ou
    // implementaremos uma checagem futura cruzada.
    
    if(confirm("Deseja realmente excluir este material?")) {
        try {
            await deleteDoc(doc(db, "materiais-insumos", id));
            materiais = materiais.filter(m => m.id !== id);
            atualizarTabelaMateriaisInsumos();
        } catch(e) {
            console.error("Erro ao remover:", e);
            alert("Erro ao remover material. Verifique sua conexão.");
        }
    }
};

// ==========================================
// 5. LÓGICA DE MÃO DE OBRA
// ==========================================

export async function carregarMaoDeObra() {
    try {
        const moDoc = await getDoc(doc(db, "configuracoes", "maoDeObra"));
        if (moDoc.exists()) {
            maoDeObra = { ...maoDeObra, ...moDoc.data() };
        }
        preencherCamposMaoDeObra();
    } catch(e) {
        console.error("Erro ao carregar MO:", e);
    }
}

function preencherCamposMaoDeObra() {
    const elSalario = document.getElementById('salario-receber');
    const elHoras = document.getElementById('horas-trabalhadas');
    const elValorHora = document.getElementById('valor-hora');
    const elCustoEncargos = document.getElementById('custo-ferias-13o');
    
    if(elSalario) elSalario.value = maoDeObra.salario;
    if(elHoras) elHoras.value = maoDeObra.horas;
    if(elValorHora) elValorHora.value = maoDeObra.valorHora.toFixed(2);
    if(elCustoEncargos) elCustoEncargos.value = maoDeObra.custoFerias13o.toFixed(2);
    
    if(maoDeObra.incluirFerias13o) {
        const sim = document.getElementById('incluir-ferias-13o-sim');
        if(sim) sim.checked = true;
    } else {
        const nao = document.getElementById('incluir-ferias-13o-nao');
        if(nao) nao.checked = true;
    }
    
    toggleEdicaoMaoDeObra(false);
}

export function editarMaoDeObraUI() {
    toggleEdicaoMaoDeObra(true);
}

function toggleEdicaoMaoDeObra(editando) {
    const elSalario = document.getElementById('salario-receber');
    const elHoras = document.getElementById('horas-trabalhadas');
    const btnSalvar = document.getElementById('btn-salvar-mao-de-obra');
    const btnEditar = document.getElementById('btn-editar-mao-de-obra');

    if(elSalario) elSalario.readOnly = !editando;
    if(elHoras) elHoras.readOnly = !editando;
    if(btnSalvar) btnSalvar.style.display = editando ? 'inline-block' : 'none';
    if(btnEditar) btnEditar.style.display = editando ? 'none' : 'inline-block';
}

export async function salvarMaoDeObra() {
    const salario = parseFloat(document.getElementById('salario-receber').value);
    const horas = parseFloat(document.getElementById('horas-trabalhadas').value);
    const simEl = document.getElementById('incluir-ferias-13o-sim');
    const incluirFerias = simEl ? simEl.checked : false;

    if(!salario || !horas) return alert("Preencha salário e horas.");

    const valorHora = salario / horas;
    // Cálculo simplificado de encargos (Férias + 1/3 + 13º)
    const custoEncargos = incluirFerias ? ((salario + (salario/3)) / 12) / horas : 0; 

    maoDeObra = { salario, horas, valorHora, incluirFerias13o: incluirFerias, custoFerias13o: custoEncargos };

    try {
        await setDoc(doc(db, "configuracoes", "maoDeObra"), maoDeObra);
        preencherCamposMaoDeObra();
        toggleEdicaoMaoDeObra(false);
        
        // Atualiza tabela visual de custos indiretos (pois dependem da hora)
        atualizarTabelaCustosIndiretos();
        
        alert("Mão de Obra Salva!");
    } catch(e) {
        console.error(e);
        alert("Erro ao salvar Mão de Obra.");
    }
}

// Funções Globais para Mão de Obra
window.editarMaoDeObraUI = editarMaoDeObraUI;

// ==========================================
// 6. LÓGICA DE CUSTOS INDIRETOS
// ==========================================

export async function carregarCustosIndiretos() {
    try {
        // Inicializa com a base
        custosIndiretosPredefinidos = JSON.parse(JSON.stringify(custosIndiretosPredefinidosBase));

        const ciPreSnap = await getDocs(collection(db, "custos-indiretos-predefinidos"));
        ciPreSnap.forEach(d => {
            const data = d.data();
            const idx = custosIndiretosPredefinidos.findIndex(c => c.descricao === data.descricao);
            if (idx !== -1) custosIndiretosPredefinidos[idx] = data;
        });

        const ciAddSnap = await getDocs(collection(db, "custos-indiretos-adicionais"));
        custosIndiretosAdicionais = [];
        ciAddSnap.forEach(d => custosIndiretosAdicionais.push({id: d.id, ...d.data()}));

        carregarCustosIndiretosPredefinidosUI();
        atualizarTabelaCustosIndiretos();

    } catch (e) {
        console.error("Erro custos indiretos:", e);
    }
}

export function carregarCustosIndiretosPredefinidosUI() {
    const lista = document.getElementById('lista-custos-indiretos');
    if(!lista) return;
    lista.innerHTML = '';

    // Renderiza Predefinidos
    custosIndiretosPredefinidosBase.forEach((base, idx) => {
        const atual = custosIndiretosPredefinidos.find(c => c.descricao === base.descricao) || base;
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="custo-item-nome">${base.descricao}</div>
            <input type="number" id="ci-pref-${idx}" value="${(atual.valorMensal || 0).toFixed(2)}" step="0.01">
            <button onclick="salvarCustoIndiretoPredefinido('${base.descricao}', ${idx})">Salvar</button>
        `;
        lista.appendChild(li);
    });

    // Renderiza Adicionais
    custosIndiretosAdicionais.forEach(add => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="custo-item-nome">${add.descricao}</div>
            <input type="number" value="${add.valorMensal.toFixed(2)}" readonly>
            <button onclick="removerCustoIndiretoAdicional('${add.id}')">Remover</button>
        `;
        lista.appendChild(li);
    });
}

export async function salvarCustoIndiretoPredefinido(descricao, idx) {
    const el = document.getElementById(`ci-pref-${idx}`);
    const val = parseFloat(el ? el.value : 0) || 0;
    
    // Evita divisão por zero se horas for 0 ou indefinido
    const horasDivisor = maoDeObra.horas > 0 ? maoDeObra.horas : 1; 
    const item = { descricao, valorMensal: val, valorPorHora: val / horasDivisor };
    
    const arrIdx = custosIndiretosPredefinidos.findIndex(c => c.descricao === descricao);
    if(arrIdx !== -1) custosIndiretosPredefinidos[arrIdx] = item;
    else custosIndiretosPredefinidos.push(item);
    
    try {
        await setDoc(doc(db, "custos-indiretos-predefinidos", descricao), item);
        atualizarTabelaCustosIndiretos();
        alert("Custo salvo!");
    } catch(e) {
        console.error(e);
        alert("Erro ao salvar custo.");
    }
}

export function adicionarNovoCustoIndireto() {
    const lista = document.getElementById('lista-custos-indiretos');
    if(!lista) return;

    const li = document.createElement('li');
    li.innerHTML = `
        <input type="text" placeholder="Nome do Custo" class="novo-ci-nome">
        <input type="number" placeholder="Valor Mensal" class="novo-ci-valor">
        <button class="btn-salvar-novo-ci">Salvar</button>
    `;
    lista.appendChild(li);
    
    const btnSalvar = li.querySelector('.btn-salvar-novo-ci');
    if(btnSalvar) {
        btnSalvar.onclick = async () => {
            const nomeEl = li.querySelector('.novo-ci-nome');
            const valorEl = li.querySelector('.novo-ci-valor');
            const nome = nomeEl ? nomeEl.value : '';
            const valor = parseFloat(valorEl ? valorEl.value : 0);
            
            if(nome && valor >= 0) {
                const horasDivisor = maoDeObra.horas > 0 ? maoDeObra.horas : 1;
                const novo = { descricao: nome, valorMensal: valor, valorPorHora: valor / horasDivisor };
                
                try {
                    const ref = await addDoc(collection(db, "custos-indiretos-adicionais"), novo);
                    novo.id = ref.id;
                    custosIndiretosAdicionais.push(novo);
                    carregarCustosIndiretosPredefinidosUI(); 
                    atualizarTabelaCustosIndiretos();
                } catch(e) {
                    console.error(e);
                    alert("Erro ao adicionar custo.");
                }
            }
        };
    }
}

export async function removerCustoIndiretoAdicional(id) {
    if(confirm("Remover este custo adicional?")) {
        try {
            await deleteDoc(doc(db, "custos-indiretos-adicionais", id));
            custosIndiretosAdicionais = custosIndiretosAdicionais.filter(c => c.id !== id);
            carregarCustosIndiretosPredefinidosUI();
            atualizarTabelaCustosIndiretos();
        } catch(e) {
            console.error(e);
            alert("Erro ao remover custo.");
        }
    }
}

export function atualizarTabelaCustosIndiretos() {
    const tbody = document.querySelector('#tabela-custos-indiretos tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const todos = [...custosIndiretosPredefinidos, ...custosIndiretosAdicionais];
    const horasDivisor = maoDeObra.horas > 0 ? maoDeObra.horas : 1;

    todos.filter(c => c.valorMensal > 0).forEach(c => {
        const row = tbody.insertRow();
        const vHora = c.valorMensal / horasDivisor;
        row.innerHTML = `
            <td>${c.descricao}</td>
            <td>${formatarMoeda(c.valorMensal)}</td>
            <td>${formatarMoeda(vHora)}</td>
            <td>-</td>
        `;
    });
}

export function buscarCustosIndiretosCadastrados() {
    const termoElement = document.getElementById('busca-custo-indireto');
    if (!termoElement) return;

    const termo = termoElement.value.toLowerCase();
    const rows = document.querySelectorAll('#tabela-custos-indiretos tbody tr');
    
    rows.forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(termo) ? '' : 'none';
    });
}

// Funções Globais (Window) para Custos Indiretos
window.salvarCustoIndiretoPredefinido = salvarCustoIndiretoPredefinido;
window.removerCustoIndiretoAdicional = removerCustoIndiretoAdicional;
window.buscarCustosIndiretosCadastrados = buscarCustosIndiretosCadastrados;
