// assets/js/precificacao-insumos.js

import { db, auth } from './firebase-config.js';
import { 
    collection, doc, setDoc, getDocs, updateDoc, deleteDoc, addDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// ==========================================================================
// 1. ESTADO COMPARTILHADO (Exports)
// ==========================================================================
export let materiais = [];
export let maoDeObra = { salario: 0, horas: 220, valorHora: 0, incluirFerias13o: false, custoFerias13o: 0 };
export let custosIndiretosPredefinidosBase = [
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
export let custosIndiretosPredefinidos = JSON.parse(JSON.stringify(custosIndiretosPredefinidosBase));
export let custosIndiretosAdicionais = [];

// Variáveis de Controle Local
let materialEmEdicao = null;

// Callback para notificar o módulo principal (Efeito Dominó)
let onMaterialUpdateCallback = null;

/**
 * Define a função que será chamada quando um material for atualizado.
 * Isso permite atualizar os preços dos produtos no outro módulo.
 */
export function setOnMaterialUpdateCallback(callback) {
    onMaterialUpdateCallback = callback;
}

// ==========================================================================
// 2. HELPER FUNCTIONS
// ==========================================================================

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

// ==========================================================================
// 3. CARREGAMENTO INICIAL DE DADOS
// ==========================================================================

export async function carregarDadosInsumos() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // A. Materiais
        const matSnap = await getDocs(collection(db, "materiais-insumos"));
        materiais = [];
        matSnap.forEach(d => materiais.push({id: d.id, ...d.data()}));

        // B. Mão de Obra
        const moDoc = await getDoc(doc(db, "configuracoes", "maoDeObra"));
        if (moDoc.exists()) maoDeObra = { ...maoDeObra, ...moDoc.data() };

        // C. Custos Indiretos
        const ciPreSnap = await getDocs(collection(db, "custos-indiretos-predefinidos"));
        ciPreSnap.forEach(d => {
            const data = d.data();
            const idx = custosIndiretosPredefinidos.findIndex(c => c.descricao === data.descricao);
            if (idx !== -1) custosIndiretosPredefinidos[idx] = data;
        });

        const ciAddSnap = await getDocs(collection(db, "custos-indiretos-adicionais"));
        custosIndiretosAdicionais = [];
        ciAddSnap.forEach(d => custosIndiretosAdicionais.push({id: d.id, ...d.data()}));

        // D. Atualizar Interface
        atualizarTabelaMateriaisInsumos();
        preencherCamposMaoDeObra();
        carregarCustosIndiretosPredefinidosUI();
        atualizarTabelaCustosIndiretos();

    } catch (e) {
        console.error("Erro ao carregar dados de insumos:", e);
    }
}

// ==========================================================================
// 4. MÓDULO: MATERIAIS
// ==========================================================================

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
    const tipo = document.querySelector('input[name="tipo-material"]:checked').value;
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
            
            // DISPARA EFEITO DOMINÓ (Callback para o outro módulo)
            if (onMaterialUpdateCallback) {
                await onMaterialUpdateCallback(materiais[idx]);
            }
            
            alert("Material atualizado com sucesso!");
            materialEmEdicao = null;
            document.querySelector('#cadastrar-material-insumo-btn').textContent = "Cadastrar Material";
        } else {
            const ref = await addDoc(collection(db, "materiais-insumos"), materialData);
            materialData.id = ref.id;
            materiais.push(materialData);
            alert("Material cadastrado!");
        }

        document.getElementById('form-materiais-insumos').reset();
        // Reset visual do tipo padrão
        const radioPadrao = document.querySelector('input[name="tipo-material"][value="comprimento"]');
        if(radioPadrao) { 
            radioPadrao.checked = true; 
            toggleCamposMaterial('comprimento'); 
        }
        
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

// Funções Globais (Window) para compatibilidade com HTML onclick
window.buscarMateriaisCadastrados = function() {
    const termo = document.getElementById('busca-material').value.toLowerCase();
    const rows = document.querySelectorAll('#tabela-materiais-insumos tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(termo) ? '' : 'none';
    });
};

window.editarMaterialInsumo = function(id) {
    const m = materiais.find(x => x.id === id);
    if(!m) return;
    materialEmEdicao = m;
    
    document.getElementById('nome-material').value = m.nome;
    document.getElementById('valor-total-material').value = m.valorTotal;
    
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
    
    document.querySelector('#cadastrar-material-insumo-btn').textContent = "Salvar Alterações";
    document.getElementById('materiais-insumos').scrollIntoView({behavior: "smooth"});
};

window.removerMaterialInsumo = async function(id) {
    // Nota: A validação se o material está em uso em produtos deve ser tratada
    // idealmente via callback ou checagem externa, pois a lista de produtos não reside aqui.
    // Para esta etapa, assumimos a exclusão direta ou futura integração.
    
    if(confirm("Deseja realmente excluir este material?")) {
        try {
            await deleteDoc(doc(db, "materiais-insumos", id));
            materiais = materiais.filter(m => m.id !== id);
            atualizarTabelaMateriaisInsumos();
        } catch(e) {
            console.error(e);
            alert("Erro ao remover material. Verifique se ele não está sendo usado.");
        }
    }
};

// ==========================================================================
// 5. MÓDULO: MÃO DE OBRA
// ==========================================================================

export async function salvarMaoDeObra() {
    const salario = parseFloat(document.getElementById('salario-receber').value);
    const horas = parseFloat(document.getElementById('horas-trabalhadas').value);
    const incluirFerias = document.getElementById('incluir-ferias-13o-sim').checked;

    if(!salario || !horas) return alert("Preencha salário e horas.");

    const valorHora = salario / horas;
    // Cálculo simplificado de encargos (Férias + 1/3 + 13º)
    const custoEncargos = incluirFerias ? ((salario + (salario/3)) / 12) / horas : 0; 

    maoDeObra = { salario, horas, valorHora, incluirFerias13o: incluirFerias, custoFerias13o: custoEncargos };

    await setDoc(doc(db, "configuracoes", "maoDeObra"), maoDeObra);
    
    preencherCamposMaoDeObra();
    toggleEdicaoMaoDeObra(false);
    
    // Atualiza tabela visual de custos indiretos (pois dependem da hora)
    atualizarTabelaCustosIndiretos();
    
    alert("Mão de Obra Salva!");
}

export function preencherCamposMaoDeObra() {
    document.getElementById('salario-receber').value = maoDeObra.salario;
    document.getElementById('horas-trabalhadas').value = maoDeObra.horas;
    document.getElementById('valor-hora').value = maoDeObra.valorHora.toFixed(2);
    document.getElementById('custo-ferias-13o').value = maoDeObra.custoFerias13o.toFixed(2);
    
    if(maoDeObra.incluirFerias13o) document.getElementById('incluir-ferias-13o-sim').checked = true;
    else document.getElementById('incluir-ferias-13o-nao').checked = true;
    
    toggleEdicaoMaoDeObra(false);
}

// Funções de UI Mão de Obra
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

// ==========================================================================
// 6. MÓDULO: CUSTOS INDIRETOS
// ==========================================================================

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

export function atualizarTabelaCustosIndiretos() {
    const tbody = document.querySelector('#tabela-custos-indiretos tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const todos = [...custosIndiretosPredefinidos, ...custosIndiretosAdicionais];
    todos.filter(c => c.valorMensal > 0).forEach(c => {
        const row = tbody.insertRow();
        const vHora = c.valorMensal / (maoDeObra.horas || 220);
        row.innerHTML = `
            <td>${c.descricao}</td>
            <td>${formatarMoeda(c.valorMensal)}</td>
            <td>${formatarMoeda(vHora)}</td>
            <td>-</td>
        `;
    });
}

export function adicionarNovoCustoIndireto() {
    const lista = document.getElementById('lista-custos-indiretos');
    const li = document.createElement('li');
    li.innerHTML = `
        <input type="text" placeholder="Nome do Custo" class="novo-ci-nome">
        <input type="number" placeholder="Valor Mensal" class="novo-ci-valor">
        <button class="btn-salvar-novo-ci">Salvar</button>
    `;
    lista.appendChild(li);
    
    li.querySelector('.btn-salvar-novo-ci').onclick = async () => {
        const nome = li.querySelector('.novo-ci-nome').value;
        const valor = parseFloat(li.querySelector('.novo-ci-valor').value);
        
        if(nome && valor >= 0) {
            const novo = { descricao: nome, valorMensal: valor, valorPorHora: valor / (maoDeObra.horas || 220) };
            const ref = await addDoc(collection(db, "custos-indiretos-adicionais"), novo);
            novo.id = ref.id;
            custosIndiretosAdicionais.push(novo);
            carregarCustosIndiretosPredefinidosUI(); 
            atualizarTabelaCustosIndiretos();
        }
    };
}

// Funções Globais para Custos Indiretos
window.salvarCustoIndiretoPredefinido = async function(descricao, idx) {
    const val = parseFloat(document.getElementById(`ci-pref-${idx}`).value) || 0;
    const item = { descricao, valorMensal: val, valorPorHora: val / (maoDeObra.horas || 220) };
    
    const arrIdx = custosIndiretosPredefinidos.findIndex(c => c.descricao === descricao);
    if(arrIdx !== -1) custosIndiretosPredefinidos[arrIdx] = item;
    else custosIndiretosPredefinidos.push(item);
    
    await setDoc(doc(db, "custos-indiretos-predefinidos", descricao), item);
    atualizarTabelaCustosIndiretos();
    alert("Custo salvo!");
};

window.removerCustoIndiretoAdicional = async function(id) {
    if(confirm("Remover este custo adicional?")) {
        await deleteDoc(doc(db, "custos-indiretos-adicionais", id));
        custosIndiretosAdicionais = custosIndiretosAdicionais.filter(c => c.id !== id);
        carregarCustosIndiretosPredefinidosUI();
        atualizarTabelaCustosIndiretos();
    }
};

window.buscarCustosIndiretosCadastrados = function() {
    const termo = document.getElementById('busca-custo-indireto').value.toLowerCase();
    const rows = document.querySelectorAll('#tabela-custos-indiretos tbody tr');
    rows.forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(termo) ? '' : 'none';
    });
};
