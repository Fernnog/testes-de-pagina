// assets/js/precificacao.js

// 1. IMPORTAÇÕES (Mantendo padrão ES6 Modules)
import { db, auth } from './firebase-config.js'; // Usa a config centralizada
import { 
    collection, doc, setDoc, getDocs, updateDoc, deleteDoc, addDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// 2. VARIÁVEIS DE ESTADO GLOBAIS
let materiais = [];
let produtos = [];
let precificacoesGeradas = [];
let maoDeObra = { salario: 0, horas: 220, valorHora: 0, incluirFerias13o: false, custoFerias13o: 0 };
let taxaCredito = { percentual: 5, incluir: false }; // Restaurado
let proximoNumeroPrecificacao = 1; // Restaurado
let margemLucroPadrao = 50;

// Custos Indiretos
let custosIndiretosPredefinidosBase = [
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
let custosIndiretosPredefinidos = JSON.parse(JSON.stringify(custosIndiretosPredefinidosBase));
let custosIndiretosAdicionais = [];

// Variáveis de Controle de Interface
let produtoEmEdicao = null;
let materialEmEdicao = null;
let moduleInitialized = false;
let novoCustoIndiretoCounter = 0;

// ==========================================================================
// 3. INICIALIZAÇÃO E CARREGAMENTO
// ==========================================================================
export async function initPrecificacao() {
    console.log("Inicializando Módulo Precificação Completo...");
    
    // Tornar funções acessíveis globalmente (para onclicks no HTML gerado dinamicamente)
    window.buscarMateriaisCadastrados = buscarMateriaisCadastrados;
    window.buscarCustosIndiretosCadastrados = buscarCustosIndiretosCadastrados;
    window.buscarProdutosCadastrados = buscarProdutosCadastrados;
    window.buscarPrecificacoesGeradas = buscarPrecificacoesGeradas;
    window.adicionarNovoCustoIndireto = adicionarNovoCustoIndireto;
    
    await carregarDados();
    
    if (!moduleInitialized) {
        setupEventListeners();
        moduleInitialized = true;
    }
    
    // Exibe a primeira aba por padrão ou restaura estado
    mostrarSubMenu('materiais-insumos');
}

async function carregarDados() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // A. Carregar Configurações Globais (Numeração, Mão de Obra, Taxas)
        const numDoc = await getDoc(doc(db, "configuracoes", "numeracao"));
        if (numDoc.exists()) proximoNumeroPrecificacao = numDoc.data().proximoNumero;

        const moDoc = await getDoc(doc(db, "configuracoes", "maoDeObra"));
        if (moDoc.exists()) maoDeObra = { ...maoDeObra, ...moDoc.data() };

        const taxaDoc = await getDoc(doc(db, "configuracoes", "taxaCredito"));
        if (taxaDoc.exists()) taxaCredito = { ...taxaCredito, ...taxaDoc.data() };

        // B. Carregar Coleções Principais
        const matSnap = await getDocs(collection(db, "materiais-insumos"));
        materiais = [];
        matSnap.forEach(d => materiais.push({id: d.id, ...d.data()}));

        const prodSnap = await getDocs(collection(db, "produtos"));
        produtos = [];
        prodSnap.forEach(d => produtos.push({id: d.id, ...d.data()}));

        const precSnap = await getDocs(collection(db, "precificacoes-geradas"));
        precificacoesGeradas = [];
        precSnap.forEach(d => precificacoesGeradas.push({id: d.id, ...d.data()}));

        // C. Carregar Custos Indiretos (Predefinidos e Adicionais)
        const ciPreSnap = await getDocs(collection(db, "custos-indiretos-predefinidos"));
        ciPreSnap.forEach(d => {
            const data = d.data();
            const idx = custosIndiretosPredefinidos.findIndex(c => c.descricao === data.descricao);
            if (idx !== -1) custosIndiretosPredefinidos[idx] = data;
        });

        const ciAddSnap = await getDocs(collection(db, "custos-indiretos-adicionais"));
        custosIndiretosAdicionais = [];
        ciAddSnap.forEach(d => custosIndiretosAdicionais.push({id: d.id, ...d.data()}));

        // D. Atualizar Interface com Dados Carregados
        atualizarTabelaMateriaisInsumos();
        preencherCamposMaoDeObra();
        carregarCustosIndiretosPredefinidosUI(); // Função UI específica
        atualizarTabelaCustosIndiretos();
        atualizarTabelaProdutosCadastrados();
        atualizarTabelaPrecificacoesGeradas();
        
        // Restaurar valores de inputs de cálculo
        const margemInput = document.getElementById('margem-lucro-final');
        if(margemInput) margemInput.value = margemLucroPadrao;
        
        const taxaInput = document.getElementById('taxa-credito-percentual');
        if(taxaInput) taxaInput.value = taxaCredito.percentual;
        
        if(taxaCredito.incluir) {
            document.getElementById('incluir-taxa-credito-sim').checked = true;
        } else {
            document.getElementById('incluir-taxa-credito-nao').checked = true;
        }

    } catch (e) {
        console.error("Erro crítico ao carregar dados:", e);
        alert("Erro de conexão. Verifique o console.");
    }
}

// ==========================================================================
// 4. LÓGICA DE NAVEGAÇÃO E HELPERS
// ==========================================================================
function setupEventListeners() {
    // Navegação Interna (Abas)
    document.querySelectorAll('#module-precificacao nav ul li a.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            mostrarSubMenu(link.dataset.submenu);
        });
    });

    // --- MATERIAIS ---
    bindClick('#cadastrar-material-insumo-btn', cadastrarMaterialInsumo);
    // Radios de Tipo de Material (Exibe/Oculta campos de dimensão)
    document.querySelectorAll('input[name="tipo-material"]').forEach(radio => {
        radio.addEventListener('change', function() {
            toggleCamposMaterial(this.value);
        });
    });

    // --- MÃO DE OBRA ---
    bindClick('#btn-salvar-mao-de-obra', salvarMaoDeObra);
    bindClick('#btn-editar-mao-de-obra', editarMaoDeObraUI);

    // --- CUSTOS INDIRETOS ---
    bindClick('#adicionarCustoIndiretoBtn', adicionarNovoCustoIndireto);

    // --- PRODUTOS ---
    bindClick('#cadastrar-produto-btn', cadastrarProduto);
    const inputMat = document.getElementById('pesquisa-material');
    if(inputMat) inputMat.addEventListener('input', buscarMateriaisAutocomplete);

    // --- CÁLCULO ---
    const inputProd = document.getElementById('produto-pesquisa');
    if(inputProd) inputProd.addEventListener('input', buscarProdutosAutocomplete);
    
    bindClick('#btn-gerar-nota', gerarNotaPrecificacao);
    
    // Listeners de recálculo em tempo real
    addChangeListeners(['horas-produto', 'margem-lucro-final'], calcularCustos);
    addChangeListeners(['incluir-taxa-credito-sim', 'incluir-taxa-credito-nao'], calcularTotalComTaxas);
    bindClick('#btn-salvar-taxa-credito', salvarTaxaCredito);
}

function bindClick(selector, handler) {
    const el = document.querySelector(selector);
    if(el) el.addEventListener('click', handler);
}

function addChangeListeners(ids, handler) {
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', handler);
        if(el) el.addEventListener('input', handler);
    });
}

function mostrarSubMenu(id) {
    document.querySelectorAll('#module-precificacao .subpagina').forEach(el => el.style.display = 'none');
    const target = document.getElementById(id);
    if(target) target.style.display = 'block';
}

function formatarMoeda(valor) {
    if (typeof valor !== 'number' || isNaN(valor)) return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function converterMoeda(str) {
    if (typeof str === 'number') return str;
    return parseFloat(str.replace('R$','').replace(/\./g,'').replace(',','.')) || 0;
}

// ==========================================================================
// 5. MÓDULO: MATERIAIS (Lógica Restaurada)
// ==========================================================================
function toggleCamposMaterial(tipo) {
    const campos = ['comprimento', 'litro', 'quilo', 'area'];
    campos.forEach(c => {
        const el = document.getElementById(`campos-${c}`);
        if(el) el.style.display = 'none';
    });
    
    const target = document.getElementById(`campos-${tipo}`);
    if(target) target.style.display = 'block';
}

// RESTAURADO: Cálculo real de custo unitário
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

// RESTAURADO: Efeito Dominó (Atualiza produtos quando material muda)
async function atualizarCustosProdutosPorMaterial(material) {
    console.log(`Atualizando produtos que usam: ${material.nome}`);
    
    // Filtra produtos afetados
    const produtosAfetados = produtos.filter(p => p.materiais.some(m => m.materialId === material.id));

    for (const prod of produtosAfetados) {
        // Atualiza cada item dentro do produto
        prod.materiais.forEach(item => {
            if (item.materialId === material.id) {
                item.material.custoUnitario = material.custoUnitario;
                item.custoTotal = calcularCustoTotalItem(item); // Recalcula o item
            }
        });
        
        // Recalcula total do produto
        prod.custoTotal = prod.materiais.reduce((acc, item) => acc + item.custoTotal, 0);

        // Salva no Banco
        await updateDoc(doc(db, "produtos", prod.id), {
            materiais: prod.materiais,
            custoTotal: prod.custoTotal
        });
    }
    
    // Atualiza tabela visualmente
    if (produtosAfetados.length > 0) {
        atualizarTabelaProdutosCadastrados();
        alert(`Atenção: ${produtosAfetados.length} produto(s) tiveram seus custos atualizados automaticamente.`);
    }
}

async function cadastrarMaterialInsumo() {
    const nome = document.getElementById('nome-material').value;
    const tipo = document.querySelector('input[name="tipo-material"]:checked').value;
    const valorTotal = parseFloat(document.getElementById('valor-total-material').value) || 0;

    // Captura inputs específicos
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
            
            // Dispara atualização em cascata
            await atualizarCustosProdutosPorMaterial(materiais[idx]);
            
            alert("Material atualizado!");
            materialEmEdicao = null;
        } else {
            const ref = await addDoc(collection(db, "materiais-insumos"), materialData);
            materialData.id = ref.id;
            materiais.push(materialData);
            alert("Material cadastrado!");
        }

        document.getElementById('form-materiais-insumos').reset();
        toggleCamposMaterial('comprimento'); // Reset visual
        atualizarTabelaMateriaisInsumos();

    } catch (e) {
        console.error(e);
        alert("Erro ao salvar material.");
    }
}

function atualizarTabelaMateriaisInsumos() {
    const tbody = document.querySelector('#tabela-materiais-insumos tbody');
    if(!tbody) return;
    tbody.innerHTML = '';

    materiais.forEach(m => {
        const row = tbody.insertRow();
        
        // Coluna Detalhes (Formatação condicional)
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
                <button class="btn-editar-mat">Editar</button>
                <button class="btn-remover-mat">Remover</button>
            </td>
        `;
        
        row.querySelector('.btn-editar-mat').onclick = () => editarMaterialInsumo(m.id);
        row.querySelector('.btn-remover-mat').onclick = () => removerMaterialInsumo(m.id);
    });
}

function getUnidadeSigla(tipo) {
    const map = { comprimento: 'm', litro: 'L', quilo: 'kg', area: 'm²', unidade: 'un' };
    return map[tipo] || '';
}

function buscarMateriaisCadastrados() {
    const termo = document.getElementById('busca-material').value.toLowerCase();
    const rows = document.querySelectorAll('#tabela-materiais-insumos tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(termo) ? '' : 'none';
    });
}

function editarMaterialInsumo(id) {
    const m = materiais.find(x => x.id === id);
    if(!m) return;
    materialEmEdicao = m;
    
    document.getElementById('nome-material').value = m.nome;
    document.getElementById('valor-total-material').value = m.valorTotal;
    
    // Seleciona radio
    const radio = document.querySelector(`input[name="tipo-material"][value="${m.tipo}"]`);
    if(radio) {
        radio.checked = true;
        toggleCamposMaterial(m.tipo);
    }

    // Preenche campos específicos
    if(m.tipo === 'comprimento') document.getElementById('comprimento-cm').value = m.comprimentoCm;
    if(m.tipo === 'litro') document.getElementById('volume-ml').value = m.volumeMl;
    if(m.tipo === 'quilo') document.getElementById('peso-g').value = m.pesoG;
    if(m.tipo === 'area') {
        document.getElementById('largura-cm').value = m.larguraCm;
        document.getElementById('altura-cm').value = m.alturaCm;
    }
    
    document.getElementById('form-materiais-insumos').scrollIntoView({behavior: "smooth"});
}

async function removerMaterialInsumo(id) {
    // Verifica uso em produtos
    const emUso = produtos.some(p => p.materiais.some(m => m.materialId === id));
    if(emUso) {
        alert("Não é possível remover: Este material está sendo usado em um ou mais produtos cadastrados.");
        return;
    }

    if(confirm("Deseja realmente excluir este material?")) {
        await deleteDoc(doc(db, "materiais-insumos", id));
        materiais = materiais.filter(m => m.id !== id);
        atualizarTabelaMateriaisInsumos();
    }
}

// ==========================================================================
// 6. MÓDULO: MÃO DE OBRA
// ==========================================================================
async function salvarMaoDeObra() {
    const salario = parseFloat(document.getElementById('salario-receber').value);
    const horas = parseFloat(document.getElementById('horas-trabalhadas').value);
    const incluirFerias = document.getElementById('incluir-ferias-13o-sim').checked;

    if(!salario || !horas) return alert("Preencha salário e horas.");

    const valorHora = salario / horas;
    // Cálculo simplificado de encargos (Férias + 1/3 + 13º) / 12 meses / horas
    const custoEncargos = incluirFerias ? ((salario * 2.33) / 12) / horas : 0; 

    maoDeObra = { salario, horas, valorHora, incluirFerias13o: incluirFerias, custoFerias13o: custoEncargos };

    await setDoc(doc(db, "configuracoes", "maoDeObra"), maoDeObra);
    
    preencherCamposMaoDeObra();
    toggleEdicaoMaoDeObra(false);
    
    // Atualiza custos indiretos que dependem da hora
    atualizarCustosIndiretosAposMudancaMaoDeObra();
    
    alert("Mão de Obra Salva!");
}

function preencherCamposMaoDeObra() {
    document.getElementById('salario-receber').value = maoDeObra.salario;
    document.getElementById('horas-trabalhadas').value = maoDeObra.horas;
    document.getElementById('valor-hora').value = maoDeObra.valorHora.toFixed(2);
    document.getElementById('custo-ferias-13o').value = maoDeObra.custoFerias13o.toFixed(2);
    
    if(maoDeObra.incluirFerias13o) document.getElementById('incluir-ferias-13o-sim').checked = true;
    else document.getElementById('incluir-ferias-13o-nao').checked = true;
    
    toggleEdicaoMaoDeObra(false);
}

function editarMaoDeObraUI() {
    toggleEdicaoMaoDeObra(true);
}

function toggleEdicaoMaoDeObra(editando) {
    document.getElementById('salario-receber').readOnly = !editando;
    document.getElementById('horas-trabalhadas').readOnly = !editando;
    document.getElementById('btn-salvar-mao-de-obra').style.display = editando ? 'inline-block' : 'none';
    document.getElementById('btn-editar-mao-de-obra').style.display = editando ? 'none' : 'inline-block';
}

// ==========================================================================
// 7. MÓDULO: CUSTOS INDIRETOS
// ==========================================================================
function carregarCustosIndiretosPredefinidosUI() {
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

window.salvarCustoIndiretoPredefinido = async (descricao, idx) => {
    const val = parseFloat(document.getElementById(`ci-pref-${idx}`).value) || 0;
    const item = { descricao, valorMensal: val, valorPorHora: val / maoDeObra.horas };
    
    // Atualiza local e remoto
    const arrIdx = custosIndiretosPredefinidos.findIndex(c => c.descricao === descricao);
    if(arrIdx !== -1) custosIndiretosPredefinidos[arrIdx] = item;
    
    await setDoc(doc(db, "custos-indiretos-predefinidos", descricao), item);
    atualizarTabelaCustosIndiretos();
    alert("Custo salvo!");
};

function adicionarNovoCustoIndireto() {
    // Cria linha de input temporária
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
            const novo = { descricao: nome, valorMensal: valor, valorPorHora: valor / maoDeObra.horas };
            const ref = await addDoc(collection(db, "custos-indiretos-adicionais"), novo);
            novo.id = ref.id;
            custosIndiretosAdicionais.push(novo);
            carregarCustosIndiretosPredefinidosUI(); // Recarrega lista
            atualizarTabelaCustosIndiretos();
        }
    };
}

window.removerCustoIndiretoAdicional = async (id) => {
    if(confirm("Remover este custo adicional?")) {
        await deleteDoc(doc(db, "custos-indiretos-adicionais", id));
        custosIndiretosAdicionais = custosIndiretosAdicionais.filter(c => c.id !== id);
        carregarCustosIndiretosPredefinidosUI();
        atualizarTabelaCustosIndiretos();
    }
};

function atualizarTabelaCustosIndiretos() {
    const tbody = document.querySelector('#tabela-custos-indiretos tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    const todos = [...custosIndiretosPredefinidos, ...custosIndiretosAdicionais];
    todos.filter(c => c.valorMensal > 0).forEach(c => {
        const row = tbody.insertRow();
        const vHora = c.valorMensal / maoDeObra.horas;
        row.innerHTML = `
            <td>${c.descricao}</td>
            <td>${formatarMoeda(c.valorMensal)}</td>
            <td>${formatarMoeda(vHora)}</td>
            <td>-</td>
        `;
    });
}

function atualizarCustosIndiretosAposMudancaMaoDeObra() {
    // Apenas UI update, pois o cálculo é feito em tempo real na hora de gerar a tabela
    atualizarTabelaCustosIndiretos();
}

function buscarCustosIndiretosCadastrados() {
    const termo = document.getElementById('busca-custo-indireto').value.toLowerCase();
    const rows = document.querySelectorAll('#tabela-custos-indiretos tbody tr');
    rows.forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(termo) ? '' : 'none';
    });
}

// ==========================================================================
// 8. MÓDULO: PRODUTOS (Com Lógica de Dimensões Restaurada)
// ==========================================================================
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
            document.getElementById('pesquisa-material').value = '';
        };
        div.appendChild(item);
    });
    div.style.display = results.length ? 'block' : 'none';
}

function adicionarMaterialNaTabelaProduto(mat, dadosSalvos = null) {
    const tbody = document.querySelector('#tabela-materiais-produto tbody');
    const row = tbody.insertRow();
    
    // Configura inputs baseados no tipo do material
    let inputDimensao = '';
    let valDimensao = 0;

    // Se estiver editando (dadosSalvos), usa os valores, senão usa padrão do cadastro
    if (mat.tipo === 'comprimento') {
        valDimensao = dadosSalvos ? dadosSalvos.comprimento : mat.comprimentoCm;
        inputDimensao = `<input type="number" class="dim-input" value="${valDimensao}" style="width:60px"> cm`;
    } else if (mat.tipo === 'area') {
        // Área precisa de 2 inputs. Lógica simplificada: usa input area total ou 2 inputs? 
        // Vamos usar a lógica antiga: 2 inputs
        const l = dadosSalvos ? dadosSalvos.largura : mat.larguraCm;
        const a = dadosSalvos ? dadosSalvos.altura : mat.alturaCm;
        inputDimensao = `<input type="number" class="dim-l" value="${l}" style="width:50px"> x <input type="number" class="dim-a" value="${a}" style="width:50px"> cm`;
    } else if (mat.tipo === 'litro') {
        valDimensao = dadosSalvos ? dadosSalvos.volume : mat.volumeMl;
        inputDimensao = `<input type="number" class="dim-input" value="${valDimensao}" style="width:60px"> ml`;
    } else if (mat.tipo === 'quilo') {
        valDimensao = dadosSalvos ? dadosSalvos.peso : mat.pesoG;
        inputDimensao = `<input type="number" class="dim-input" value="${valDimensao}" style="width:60px"> g`;
    } else {
        inputDimensao = `1 un (Padrão)`;
    }

    const qtd = dadosSalvos ? dadosSalvos.quantidade : 1;

    row.innerHTML = `
        <td data-id="${mat.id}">${mat.nome}</td>
        <td>${mat.tipo}</td>
        <td>${formatarMoeda(mat.custoUnitario)}</td>
        <td class="cell-dimensao">${inputDimensao}</td>
        <td><input type="number" class="qtd-input" value="${qtd}" style="width:50px"></td>
        <td class="custo-total-item">R$ 0,00</td>
        <td><button onclick="this.closest('tr').remove()">X</button></td>
    `;

    // Listeners para recalcular linha ao digitar
    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => recalcularLinhaProduto(row, mat));
    });

    // Calcula inicial
    recalcularLinhaProduto(row, mat);
}

// RESTAURADO: Cálculo de Custo Item Complexo
function recalcularLinhaProduto(row, mat) {
    const qtd = parseFloat(row.querySelector('.qtd-input').value) || 0;
    let consumo = 0; // Quanto do material é usado (em % da unidade base ou absoluta)

    // A lógica de custoUnitario no cadastro já é "Por Unidade Base" (Por metro, por litro, etc)
    // Então precisamos saber quanto da unidade base está sendo usada.
    
    if(mat.tipo === 'comprimento') {
        const cm = parseFloat(row.querySelector('.dim-input').value) || 0;
        consumo = cm / 100; // Converte cm para Metros
    } else if (mat.tipo === 'litro') {
        const ml = parseFloat(row.querySelector('.dim-input').value) || 0;
        consumo = ml / 1000; // Converte ml para Litros
    } else if (mat.tipo === 'quilo') {
        const g = parseFloat(row.querySelector('.dim-input').value) || 0;
        consumo = g / 1000; // Converte g para Kg
    } else if (mat.tipo === 'area') {
        const l = parseFloat(row.querySelector('.dim-l').value) || 0;
        const a = parseFloat(row.querySelector('.dim-a').value) || 0;
        consumo = (l * a) / 10000; // Converte cm² para m²
    } else {
        // Unidade
        // No cadastro "unidade", o custoUnitario é o preço de 1 item.
        // Aqui, se for 'unidade', consumo é 1 (já multiplicado pela qtd depois)
        // Se houver input de "qtdMaterial" dentro do inputDimensao (caso raro no código antigo), tratar aqui.
        consumo = 1;
    }

    const total = mat.custoUnitario * consumo * qtd;
    row.querySelector('.custo-total-item').textContent = formatarMoeda(total);
    row.dataset.total = total; // Guarda valor numérico
}

async function cadastrarProduto() {
    const nome = document.getElementById('nome-produto').value;
    if(!nome) return alert("Nome obrigatório");

    const materiaisList = [];
    let custoTotal = 0;

    const rows = document.querySelectorAll('#tabela-materiais-produto tbody tr');
    rows.forEach(row => {
        const matId = row.cells[0].dataset.id;
        const matOriginal = materiais.find(m => m.id === matId);
        const tipo = row.cells[1].innerText;
        const qtd = parseFloat(row.querySelector('.qtd-input').value);
        const custoItem = parseFloat(row.dataset.total);

        // Resgata dimensões usadas
        let comp=0, larg=0, alt=0, vol=0, peso=0;
        if(tipo === 'comprimento') comp = parseFloat(row.querySelector('.dim-input').value);
        if(tipo === 'litro') vol = parseFloat(row.querySelector('.dim-input').value);
        if(tipo === 'quilo') peso = parseFloat(row.querySelector('.dim-input').value);
        if(tipo === 'area') {
            larg = parseFloat(row.querySelector('.dim-l').value);
            alt = parseFloat(row.querySelector('.dim-a').value);
        }

        materiaisList.push({
            materialId: matId,
            material: { nome: matOriginal.nome, custoUnitario: matOriginal.custoUnitario }, // Snapshot
            tipo,
            quantidade: qtd,
            custoTotal: custoItem,
            // Salva dimensões específicas deste produto
            comprimento: comp, largura: larg, altura: alt, volume: vol, peso: peso
        });
        
        custoTotal += custoItem;
    });

    const prodData = { nome, materiais: materiaisList, custoTotal };

    try {
        if(produtoEmEdicao) {
            await updateDoc(doc(db, "produtos", produtoEmEdicao.id), prodData);
            const idx = produtos.findIndex(p => p.id === produtoEmEdicao.id);
            if(idx !== -1) produtos[idx] = { id: produtoEmEdicao.id, ...prodData };
            produtoEmEdicao = null;
        } else {
            const ref = await addDoc(collection(db, "produtos"), prodData);
            prodData.id = ref.id;
            produtos.push(prodData);
        }
        
        alert("Produto Salvo!");
        document.getElementById('form-produtos-cadastrados').reset();
        document.querySelector('#tabela-materiais-produto tbody').innerHTML = '';
        atualizarTabelaProdutosCadastrados();

    } catch (e) { console.error(e); alert("Erro ao salvar produto"); }
}

function atualizarTabelaProdutosCadastrados() {
    const tbody = document.querySelector('#tabela-produtos tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    produtos.forEach(p => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${p.nome}</td>
            <td><ul>${p.materiais.map(m => `<li>${m.material.nome} (${m.quantidade})</li>`).join('')}</ul></td>
            <td>-</td>
            <td>${formatarMoeda(p.custoTotal)}</td>
            <td>
                <button class="btn-editar-prod">Editar</button>
                <button class="btn-remover-prod">Remover</button>
            </td>
        `;
        row.querySelector('.btn-editar-prod').onclick = () => editarProduto(p);
        row.querySelector('.btn-remover-prod').onclick = () => removerProduto(p.id);
    });
}

function buscarProdutosCadastrados() {
    const termo = document.getElementById('busca-produto').value.toLowerCase();
    const rows = document.querySelectorAll('#tabela-produtos tbody tr');
    rows.forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(termo) ? '' : 'none';
    });
}

function editarProduto(prod) {
    produtoEmEdicao = prod;
    document.getElementById('nome-produto').value = prod.nome;
    const tbody = document.querySelector('#tabela-materiais-produto tbody');
    tbody.innerHTML = '';
    
    prod.materiais.forEach(item => {
        const matReal = materiais.find(m => m.id === item.materialId);
        if(matReal) {
            adicionarMaterialNaTabelaProduto(matReal, item); // Passa item como dadosSalvos
        }
    });
    document.getElementById('form-produtos-cadastrados').scrollIntoView();
}

async function removerProduto(id) {
    if(confirm("Excluir produto?")) {
        await deleteDoc(doc(db, "produtos", id));
        produtos = produtos.filter(p => p.id !== id);
        atualizarTabelaProdutosCadastrados();
    }
}

// ==========================================================================
// 9. MÓDULO: CÁLCULO DE PREÇO (Cérebro Matemático)
// ==========================================================================
function buscarProdutosAutocomplete() {
    const termo = this.value.toLowerCase();
    const div = document.getElementById('produto-resultados');
    div.innerHTML = '';
    
    if(!termo) { div.classList.add('hidden'); return; }
    
    const results = produtos.filter(p => p.nome.toLowerCase().includes(termo));
    div.classList.remove('hidden');
    
    results.forEach(p => {
        const item = document.createElement('div');
        item.textContent = p.nome;
        item.onclick = () => {
            selecionarProdutoParaCalculo(p);
            div.classList.add('hidden');
        };
        div.appendChild(item);
    });
    if(results.length === 0) div.classList.add('hidden');
}

function selecionarProdutoParaCalculo(prod) {
    document.getElementById('produto-pesquisa').value = prod.nome;
    document.getElementById('custo-produto').textContent = formatarMoeda(prod.custoTotal);
    
    // Lista detalhes materiais
    const ul = document.getElementById('lista-materiais-produto');
    ul.innerHTML = '';
    prod.materiais.forEach(m => {
        const li = document.createElement('li');
        li.textContent = `${m.material.nome}: ${formatarMoeda(m.custoTotal)}`;
        ul.appendChild(li);
    });
    document.getElementById('detalhes-produto').style.display = 'block';
    
    calcularCustos();
}

function calcularCustos() {
    // 1. Custos Diretos
    const custoMat = converterMoeda(document.getElementById('custo-produto').textContent);
    const horas = parseFloat(document.getElementById('horas-produto').value) || 1;
    
    const custoMO = horas * maoDeObra.valorHora;
    const custoEncargos = horas * maoDeObra.custoFerias13o;
    
    document.getElementById('custo-mao-de-obra-detalhe').textContent = formatarMoeda(custoMO);
    document.getElementById('custo-ferias-13o-detalhe').textContent = formatarMoeda(custoEncargos);
    document.getElementById('total-mao-de-obra').textContent = formatarMoeda(custoMO + custoEncargos);

    // 2. Custos Indiretos
    // Soma todos os custos indiretos ativos (mensal > 0)
    const todosCI = [...custosIndiretosPredefinidos, ...custosIndiretosAdicionais];
    const valorHoraCI = todosCI.reduce((acc, c) => acc + (c.valorMensal / maoDeObra.horas), 0);
    const totalCI = valorHoraCI * horas;
    
    document.getElementById('custo-indireto').textContent = formatarMoeda(totalCI);
    
    // Detalhes CI
    const ulCI = document.getElementById('lista-custos-indiretos-detalhes');
    ulCI.innerHTML = '';
    todosCI.filter(c => c.valorMensal > 0).forEach(c => {
        const li = document.createElement('li');
        const v = (c.valorMensal / maoDeObra.horas) * horas;
        li.textContent = `${c.descricao}: ${formatarMoeda(v)}`;
        ulCI.appendChild(li);
    });
    document.getElementById('detalhes-custos-indiretos').style.display = 'block';

    // 3. Subtotal
    const subtotal = custoMat + custoMO + custoEncargos + totalCI;
    document.getElementById('subtotal').textContent = formatarMoeda(subtotal);

    // 4. Margem
    const margemPerc = parseFloat(document.getElementById('margem-lucro-final').value) || 0;
    const lucro = subtotal * (margemPerc / 100);
    const totalSemTaxa = subtotal + lucro;

    document.getElementById('margem-lucro-valor').textContent = formatarMoeda(lucro);
    document.getElementById('total-final').textContent = formatarMoeda(totalSemTaxa);
    
    calcularTotalComTaxas();
}

// RESTAURADO: Cálculo de Taxa de Cartão
async function salvarTaxaCredito() {
    const perc = parseFloat(document.getElementById('taxa-credito-percentual').value) || 0;
    const incluir = document.getElementById('incluir-taxa-credito-sim').checked;
    
    taxaCredito = { percentual: perc, incluir };
    await setDoc(doc(db, "configuracoes", "taxaCredito"), taxaCredito);
    calcularTotalComTaxas();
    alert("Taxa salva!");
}

function calcularTotalComTaxas() {
    const totalSemTaxa = converterMoeda(document.getElementById('total-final').textContent);
    const incluir = document.getElementById('incluir-taxa-credito-sim').checked;
    
    if(incluir) {
        const taxaVal = totalSemTaxa * (taxaCredito.percentual / 100);
        document.getElementById('taxa-credito-valor').textContent = formatarMoeda(taxaVal);
        document.getElementById('total-final-com-taxas').textContent = formatarMoeda(totalSemTaxa + taxaVal);
    } else {
        document.getElementById('taxa-credito-valor').textContent = formatarMoeda(0);
        document.getElementById('total-final-com-taxas').textContent = formatarMoeda(totalSemTaxa);
    }
}

// ==========================================================================
// 10. MÓDULO: GERAR E VISUALIZAR NOTA (Numeração Restaurada)
// ==========================================================================
async function gerarNotaPrecificacao() {
    const cliente = document.getElementById('nome-cliente').value || "Não informado";
    const prodNome = document.getElementById('produto-pesquisa').value;
    const totalFinal = converterMoeda(document.getElementById('total-final-com-taxas').textContent);

    if(!prodNome || totalFinal <= 0) return alert("Calcule o preço antes de gerar a nota.");

    // RESTAURADO: Numeração Sequencial via Transação/Atomic Update (Simulado aqui com get/set)
    let novoNumero = 1;
    try {
        const refNum = doc(db, "configuracoes", "numeracao");
        const snap = await getDoc(refNum);
        if(snap.exists()) {
            novoNumero = snap.data().proximoNumero + 1;
        }
        await setDoc(refNum, { proximoNumero: novoNumero });
        proximoNumeroPrecificacao = novoNumero;
    } catch(e) { console.error("Erro numeração", e); }

    const nota = {
        numero: proximoNumeroPrecificacao,
        ano: new Date().getFullYear(),
        cliente,
        produto: prodNome,
        horas: document.getElementById('horas-produto').value,
        margem: document.getElementById('margem-lucro-final').value,
        total: totalFinal,
        custoMateriais: converterMoeda(document.getElementById('custo-produto').textContent),
        totalMaoDeObra: converterMoeda(document.getElementById('total-mao-de-obra').textContent),
        custoIndiretoTotal: converterMoeda(document.getElementById('custo-indireto').textContent),
        detalhesMateriais: getListaTexto('lista-materiais-produto'),
        detalhesCustosIndiretos: getListaTexto('lista-custos-indiretos-detalhes'),
        dataGeracao: new Date().toISOString()
    };

    try {
        const ref = await addDoc(collection(db, "precificacoes-geradas"), nota);
        nota.id = ref.id;
        precificacoesGeradas.push(nota);
        atualizarTabelaPrecificacoesGeradas();
        alert(`Precificação Nº ${nota.numero} Gerada!`);
    } catch(e) { console.error(e); alert("Erro ao salvar nota."); }
}

function getListaTexto(ulId) {
    const arr = [];
    document.querySelectorAll(`#${ulId} li`).forEach(li => arr.push(li.textContent));
    return arr;
}

function atualizarTabelaPrecificacoesGeradas() {
    const tbody = document.querySelector('#tabela-precificacoes-geradas tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    // Ordena por número decrescente
    const ordenadas = [...precificacoesGeradas].sort((a,b) => b.numero - a.numero);

    ordenadas.forEach(p => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${p.numero}/${p.ano}</td>
            <td>${p.cliente}</td>
            <td>
                <button onclick="visualizarPrecificacao('${p.id}')">Visualizar</button>
                <button onclick="removerPrecificacao('${p.id}')">Excluir</button>
            </td>
        `;
    });
}

function buscarPrecificacoesGeradas() {
    const termo = document.getElementById('busca-precificacao').value.toLowerCase();
    const rows = document.querySelectorAll('#tabela-precificacoes-geradas tbody tr');
    rows.forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(termo) ? '' : 'none';
    });
}

// MELHORIA UX: Visualizar em Nova Janela para Impressão
window.visualizarPrecificacao = (id) => {
    const p = precificacoesGeradas.find(x => x.id === id);
    if(!p) return;

    const html = `
        <html>
        <head>
            <title>Nota ${p.numero}</title>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                h1 { color: #7aa2a9; border-bottom: 2px solid #7aa2a9; }
                .box { border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; border-radius: 8px; }
                .line { display: flex; justify-content: space-between; margin-bottom: 5px; }
                .total { font-size: 1.2em; font-weight: bold; margin-top: 10px; color: #444; }
                ul { margin: 5px 0 15px 20px; padding: 0; font-size: 0.9em; color: #666; }
            </style>
        </head>
        <body>
            <h1>Pérola Rara - Precificação Nº ${p.numero}/${p.ano}</h1>
            <p><strong>Cliente:</strong> ${p.cliente}</p>
            <p><strong>Produto:</strong> ${p.produto}</p>
            
            <div class="box">
                <div class="line"><span>Custo Materiais:</span> <span>${formatarMoeda(p.custoMateriais)}</span></div>
                <ul>${p.detalhesMateriais.map(x => `<li>${x}</li>`).join('')}</ul>
                
                <div class="line"><span>Mão de Obra (${p.horas}h):</span> <span>${formatarMoeda(p.totalMaoDeObra)}</span></div>
                
                <div class="line"><span>Custos Indiretos:</span> <span>${formatarMoeda(p.custoIndiretoTotal)}</span></div>
                <ul>${p.detalhesCustosIndiretos.map(x => `<li>${x}</li>`).join('')}</ul>
            </div>

            <div class="box" style="background: #f9f9f9;">
                <div class="line"><span>Margem de Lucro (${p.margem}%):</span> <span>Incluso</span></div>
                <div class="line total"><span>Total Final:</span> <span>${formatarMoeda(p.total)}</span></div>
            </div>
            
            <button onclick="window.print()">Imprimir</button>
        </body>
        </html>
    `;
    
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
}

window.removerPrecificacao = async (id) => {
    if(confirm("Excluir registro permanentemente?")) {
        await deleteDoc(doc(db, "precificacoes-geradas", id));
        precificacoesGeradas = precificacoesGeradas.filter(x => x.id !== id);
        atualizarTabelaPrecificacoesGeradas();
    }
}
