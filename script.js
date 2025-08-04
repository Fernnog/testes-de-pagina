// ===================================================================================
// ARQUIVO: script.js (ESTADO ANTERIOR)
// FUNÇÃO: Este arquivo será descontinuado e sua lógica distribuída nos novos módulos.
// ===================================================================================

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDIXuruqM4M9oA_Rz3PSxVsXM1EEVVbprw",
    authDomain: "escaladeintercessao.firebaseapp.com",
    databaseURL: "https://escaladeintercessao-default-rtdb.firebaseio.com",
    projectId: "escaladeintercessao",
    storageBucket: "escaladeintercessao.firebasestorage.app",
    messagingSenderId: "875628397922",
    appId: "1:875628397922:web:219b624120eb9286e5d83b",
    measurementId: "G-9MGZ364KVZ"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

let membros = [];
let restricoes = [];
let restricoesPermanentes = [];

// Funções Utilitárias
function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

function toggleConjuge() {
    document.getElementById('conjugeField').style.display =
        document.getElementById('conjugeParticipa').checked ? 'block' : 'none';
}

// Funções de Gerenciamento de Dados
function salvarDados() {
    const user = auth.currentUser;
    if (!user) {
        alert('Você precisa estar logado para salvar dados.');
        return;
    }
    const uid = user.uid;
    database.ref('users/' + uid).set({
        membros: membros,
        restricoes: restricoes,
        restricoesPermanentes: restricoesPermanentes
    })
    .then(() => {
        console.log('Dados salvos com sucesso!');
    })
    .catch((error) => {
        console.error('Erro ao salvar dados: ', error);
    });
}

function carregarDados() {
    const user = auth.currentUser;
    if (!user) return;
    const uid = user.uid;
    database.ref('users/' + uid).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const dados = snapshot.val();
                
                // NOVO: Migração de dados para suportar suspensão granular
                membros = (dados.membros || []).map(m => {
                    if (typeof m.suspensao !== 'object' || m.suspensao === null) {
                        const isSuspendedOld = !!m.suspenso;
                        m.suspensao = {
                            cultos: isSuspendedOld,
                            sabado: isSuspendedOld,
                            whatsapp: isSuspendedOld
                        };
                    }
                    return m;
                });

                restricoes = dados.restricoes || [];
                restricoesPermanentes = dados.restricoesPermanentes || [];
                atualizarListaMembros();
                atualizarSelectMembros();
                atualizarListaRestricoes();
                atualizarListaRestricoesPermanentes();
            }
        })
        .catch((error) => {
            console.error('Erro ao carregar dados: ', error);
        });
}

function limparDados() {
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
        membros = [];
        restricoes = [];
        restricoesPermanentes = [];
        salvarDados();
        atualizarListaMembros();
        atualizarSelectMembros();
        atualizarListaRestricoes();
        atualizarListaRestricoesPermanentes();
        document.getElementById('resultadoEscala').innerHTML = '';
    }
}

// Funções de Autenticação (sem alterações)
document.getElementById('formRegistro').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('emailRegistro').value;
    const senha = document.getElementById('senhaRegistro').value;
    auth.createUserWithEmailAndPassword(email, senha)
        .then(() => { alert('Usuário registrado com sucesso!'); showTab('cadastro'); })
        .catch((error) => { alert('Erro ao registrar: ' + error.message); });
});
document.getElementById('formLogin').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('emailLogin').value;
    const senha = document.getElementById('senhaLogin').value;
    auth.signInWithEmailAndPassword(email, senha)
        .then(() => { alert('Login bem-sucedido!'); document.getElementById('logout').style.display = 'block'; showTab('cadastro'); })
        .catch((error) => { alert('Erro ao fazer login: ' + error.message); });
});
document.getElementById('logout').addEventListener('click', () => {
    auth.signOut().then(() => {
        alert('Logout bem-sucedido!');
        document.getElementById('logout').style.display = 'none';
        showTab('auth');
    });
});

// ===== NOVAS Funções do Modal de Suspensão =====
function abrirModalSuspensao(index) {
    const membro = membros[index];
    document.getElementById('membroIndexSuspensao').value = index;
    document.getElementById('modalTitle').textContent = `Gerenciar Suspensão: ${membro.nome}`;

    document.getElementById('suspenderCultos').checked = membro.suspensao.cultos;
    document.getElementById('suspenderSabado').checked = membro.suspensao.sabado;
    document.getElementById('suspenderWhatsapp').checked = membro.suspensao.whatsapp;

    document.getElementById('suspensaoModal').style.display = 'flex';
}

function salvarSuspensao() {
    const index = document.getElementById('membroIndexSuspensao').value;
    if (index === '') return;

    membros[index].suspensao.cultos = document.getElementById('suspenderCultos').checked;
    membros[index].suspensao.sabado = document.getElementById('suspenderSabado').checked;
    membros[index].suspensao.whatsapp = document.getElementById('suspenderWhatsapp').checked;

    salvarDados();
    atualizarListaMembros();
    document.getElementById('suspensaoModal').style.display = 'none';
}

// ===== Funções de Membros (ATUALIZADAS) =====
function atualizarListaMembros() {
    const lista = document.getElementById('listaMembros');
    membros.sort((a, b) => a.nome.localeCompare(b.nome));

    let maleCount = 0;
    let femaleCount = 0;

    lista.innerHTML = membros.map((m, index) => {
        if (m.genero === 'M') maleCount++;
        else if (m.genero === 'F') femaleCount++;

        const susp = m.suspensao;
        const isTotalmenteSuspenso = susp.cultos && susp.sabado && susp.whatsapp;
        const isParcialmenteSuspenso = !isTotalmenteSuspenso && (susp.cultos || susp.sabado || susp.whatsapp);

        let suspensaoTitle = '';
        if (isParcialmenteSuspenso) {
            let suspensoDe = [];
            if(susp.cultos) suspensoDe.push('Cultos');
            if(susp.sabado) suspensoDe.push('Sábado');
            if(susp.whatsapp) suspensoDe.push('WhatsApp');
            suspensaoTitle = `Suspenso de: ${suspensoDe.join(', ')}`;
        } else if (isTotalmenteSuspenso) {
            suspensaoTitle = 'Suspenso de todas as atividades.';
        }

        const genderSymbol = m.genero === 'M' ? '♂️' : '♀️';
        return `
            <li class="${isTotalmenteSuspenso ? 'suspended-member' : ''}">
                <div>
                    <span class="gender-icon gender-${m.genero === 'M' ? 'male' : 'female'}">${genderSymbol}</span>
                    <span class="member-name ${isTotalmenteSuspenso ? 'suspended-text' : ''}">
                        ${m.nome}
                        ${(isParcialmenteSuspenso || isTotalmenteSuspenso) ? `<i class="fas fa-pause-circle" title="${suspensaoTitle}"></i>` : ''}
                    </span>
                </div>
                <div class="member-details">
                    ${m.conjuge ? `<span class="spouse-info">- Cônjuge: ${m.conjuge}</span>` : ''}
                </div>
                <div>
                    <button class="secondary-button" onclick="abrirModalSuspensao(${index})">Gerenciar Suspensão</button>
                    <button onclick="excluirMembro(${index})">Excluir</button>
                </div>
            </li>`;
    }).join('');

    document.getElementById('maleCount').textContent = maleCount;
    document.getElementById('femaleCount').textContent = femaleCount;
    document.getElementById('totalCount').textContent = membros.length;
}

function excluirMembro(index) {
    if (confirm(`Tem certeza que deseja excluir ${membros[index].nome}?`)) {
        membros.splice(index, 1);
        atualizarListaMembros();
        atualizarSelectMembros();
        salvarDados();
    }
}

function atualizarSelectMembros() {
    const selects = [document.getElementById('membroRestricao'), document.getElementById('membroRestricaoPermanente')];
    membros.sort((a, b) => a.nome.localeCompare(b.nome));
    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecione um membro</option>' +
            membros.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
    });
}

// Funções de Restrições (sem alterações lógicas, apenas o bug da data)
function atualizarListaRestricoes() {
    const lista = document.getElementById('listaRestricoes');
    restricoes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoes.map((r, index) =>
        `<li>${r.membro}: ${new Date(r.inicio).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} a ${new Date(r.fim).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
        <button onclick="excluirRestricao(${index})">Excluir</button></li>`).join('');
}
function excluirRestricao(index) {
    restricoes.splice(index, 1);
    atualizarListaRestricoes();
    salvarDados();
}
function atualizarListaRestricoesPermanentes() {
    const lista = document.getElementById('listaRestricoesPermanentes');
    restricoesPermanentes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoesPermanentes.map((r, index) =>
        `<li>${r.membro}: ${r.diaSemana}
        <button onclick="excluirRestricaoPermanente(${index})">Excluir</button></li>`).join('');
}
function excluirRestricaoPermanente(index) {
    restricoesPermanentes.splice(index, 1);
    atualizarListaRestricoesPermanentes();
    salvarDados();
}

// Funções de Cadastro (ATUALIZADAS)
document.getElementById('formCadastro').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('nome').value;
    const genero = document.getElementById('genero').value;
    const conjugeParticipa = document.getElementById('conjugeParticipa').checked;
    const nomeConjuge = conjugeParticipa ? document.getElementById('nomeConjuge').value : null;

    if (nomeConjuge && !membros.some(m => m.nome === nomeConjuge)) {
        alert('O cônjuge deve estar cadastrado como membro!');
        return;
    }

    // ATUALIZADO: Novo modelo de dados para suspensão
    membros.push({
        nome,
        genero,
        conjuge: nomeConjuge,
        suspensao: { cultos: false, sabado: false, whatsapp: false }
    });
    atualizarListaMembros();
    atualizarSelectMembros();
    salvarDados();
    e.target.reset();
    toggleConjuge();
});

document.getElementById('formRestricao').addEventListener('submit', (e) => {
    e.preventDefault();
    const membro = document.getElementById('membroRestricao').value;
    
    // CORREÇÃO: Tratamento de data para evitar bug de fuso horário
    const dataInicioStr = document.getElementById('dataInicio').value;
    const dataFimStr = document.getElementById('dataFim').value;
    const inicio = new Date(dataInicioStr + 'T12:00:00');
    const fim = new Date(dataFimStr + 'T12:00:00');

    if (!membro) { alert('Selecione um membro!'); return; }
    if (fim < inicio) { alert('A data de fim deve ser posterior à data de início!'); return; }

    restricoes.push({ membro, inicio: inicio.toISOString(), fim: fim.toISOString() });
    atualizarListaRestricoes();
    salvarDados();
    e.target.reset();
});

document.getElementById('formRestricaoPermanente').addEventListener('submit', (e) => {
    e.preventDefault();
    const membro = document.getElementById('membroRestricaoPermanente').value;
    const diaSemana = document.getElementById('diaSemana').value;
    if (!membro) { alert('Selecione um membro!'); return; }
    restricoesPermanentes.push({ membro, diaSemana });
    atualizarListaRestricoesPermanentes();
    salvarDados();
    e.target.reset();
});

// ===== Funções de Geração da Escala (GRANDES ATUALIZAÇÕES) =====
function weightedRandom(weights) {
    let random = Math.random();
    let cumulativeWeight = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulativeWeight += weights[i];
        if (random < cumulativeWeight) { return i; }
    }
    return weights.length - 1;
}

function selecionarMembrosComAleatoriedade(membrosDisponiveis, quantidadeNecessaria, participacoes) {
    if (membrosDisponiveis.length < quantidadeNecessaria) return [];

    // ATUALIZADO: Usa participacoes[m.nome].count para o peso
    const pesos = membrosDisponiveis.map(m => 1 / (1 + participacoes[m.nome].count));
    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    const pesosNormalizados = pesos.map(p => p / somaPesos);

    const selecionados = [];
    const disponiveis = [...membrosDisponiveis];
    const pesosTemp = [...pesosNormalizados];

    while (selecionados.length < quantidadeNecessaria && disponiveis.length > 0) {
        const indice = weightedRandom(pesosTemp);
        const membroSelecionado = disponiveis.splice(indice, 1)[0];
        pesosTemp.splice(indice, 1);
        selecionados.push(membroSelecionado);
    }
    return selecionados;
}

document.getElementById('formEscala').addEventListener('submit', (e) => {
    e.preventDefault();
    const gerarCultos = document.getElementById('escalaCultos').checked;
    const gerarSabado = document.getElementById('escalaSabado').checked;
    const gerarOração = document.getElementById('escalaOração').checked;
    const quantidadeCultos = parseInt(document.getElementById('quantidadeCultos').value);
    const mes = parseInt(document.getElementById('mesEscala').value);
    const ano = parseInt(document.getElementById('anoEscala').value);
    const resultado = document.getElementById('resultadoEscala');

    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0);
    resultado.innerHTML = `<h3>Escala Gerada - ${inicio.toLocaleString('pt-BR', { month: 'long' })} ${ano}</h3>`;

    const dias = [];
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
        const diaSemana = d.toLocaleString('pt-BR', { weekday: 'long' });
        if (gerarCultos) {
            if (diaSemana === 'quarta-feira') dias.push({ data: new Date(d), tipo: 'Quarta', selecionados: [] });
            if (diaSemana === 'domingo') {
                dias.push({ data: new Date(d), tipo: 'Domingo Manhã', selecionados: [] });
                dias.push({ data: new Date(d), tipo: 'Domingo Noite', selecionados: [] });
            }
        }
        if (gerarSabado && diaSemana === 'sábado') dias.push({ data: new Date(d), tipo: 'Sábado', selecionados: [] });
        if (gerarOração) dias.push({ data: new Date(d), tipo: 'Oração no WhatsApp', selecionados: [] });
    }

    // ATUALIZADO: Estrutura de participações para incluir contagem e data
    const participacoes = {};
    membros.forEach(m => {
        participacoes[m.nome] = { count: 0, lastDate: null };
    });

    dias.forEach(dia => {
        let membrosDisponiveis = membros.filter(m => {
            // ATUALIZADO: Verificação de suspensão granular
            let isSuspended = false;
            const tipo = dia.tipo;
            if (tipo === 'Quarta' || tipo === 'Domingo Manhã' || tipo === 'Domingo Noite') {
                isSuspended = m.suspensao.cultos;
            } else if (tipo === 'Sábado') {
                isSuspended = m.suspensao.sabado;
            } else if (tipo === 'Oração no WhatsApp') {
                isSuspended = m.suspensao.whatsapp;
            }

            const restricaoTemp = restricoes.some(r => r.membro === m.nome && new Date(dia.data) >= new Date(r.inicio) && new Date(dia.data) <= new Date(r.fim));
            const restricaoPerm = restricoesPermanentes.some(r => r.membro === m.nome && r.diaSemana === dia.tipo);
            return !isSuspended && !restricaoTemp && !restricaoPerm;
        });

        // NOVO: Lógica de distanciamento de 3 dias para WhatsApp
        if (dia.tipo === 'Oração no WhatsApp') {
            const tresDiasAtras = new Date(dia.data);
            tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
            const membrosComDistanciamento = membrosDisponiveis.filter(m => {
                const lastParticipation = participacoes[m.nome].lastDate;
                return !lastParticipation || lastParticipation < tresDiasAtras;
            });
            if (membrosComDistanciamento.length > 0) {
                membrosDisponiveis = membrosComDistanciamento;
            }
        }
        
        const qtdNecessaria = dia.tipo === 'Oração no WhatsApp' ? 1 : (dia.tipo === 'Sábado' ? 1 : quantidadeCultos);
        if (membrosDisponiveis.length < qtdNecessaria) return;

        let selecionados = [];
        if (qtdNecessaria === 1) {
            selecionados = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes);
        } else { // Lógica para duplas
            const primeiro = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes)[0];
            if (!primeiro) return;
            const membrosCompatíveis = membrosDisponiveis.filter(m =>
                m.nome !== primeiro.nome && (m.genero === primeiro.genero || m.conjuge === primeiro.nome || primeiro.conjuge === m.nome)
            );
            const segundo = selecionarMembrosComAleatoriedade(membrosCompatíveis, 1, participacoes)[0];
            if (segundo) selecionados = [primeiro, segundo];
        }

        if (selecionados.length === qtdNecessaria) {
            dia.selecionados = selecionados;
            // ATUALIZADO: Atualiza contagem e data da última participação
            selecionados.forEach(m => {
                participacoes[m.nome].count++;
                participacoes[m.nome].lastDate = new Date(dia.data);
            });
        }
    });

    // A função revisarEscala não foi incluída aqui pois não foi solicitada alteração, mas pode ser adicionada se necessário.
    
    let escalaHTML = '<ul>';
    dias.forEach(dia => {
        if (dia.selecionados.length > 0) {
            escalaHTML += `<li>${dia.data.toLocaleDateString('pt-BR')} - ${dia.tipo}: ${dia.selecionados.map(m => m.nome).join(', ')}</li>`;
        }
    });
    escalaHTML += '</ul>';
    resultado.innerHTML += escalaHTML;

    // ATUALIZADO: Relatório usa a nova estrutura de 'participacoes'
    let relatorio = '<h4>Relatório de Participações</h4>';
    for (const [nome, data] of Object.entries(participacoes)) {
        relatorio += `<p>${nome}: ${data.count} participações</p>`;
    }
    resultado.innerHTML += relatorio;
});

// Funções de Exportar/Importar (sem alterações)
function exportarEscalaXLSX() {
    const wb = XLSX.utils.book_new();
    const dadosEscala = [['Data', 'Tipo', 'Pessoa 1', 'Pessoa 2']];
    document.querySelectorAll('#resultadoEscala ul li').forEach(li => {
        const [dataTipo, pessoas] = li.textContent.split(': ');
        const [data, tipo] = dataTipo.split(' - ');
        const nomes = pessoas.split(', ');
        dadosEscala.push([data, tipo, nomes[0], nomes[1] || '']);
    });
    const wsEscala = XLSX.utils.aoa_to_sheet(dadosEscala);
    XLSX.utils.book_append_sheet(wb, wsEscala, 'Escala');
    XLSX.writeFile(wb, 'escala.xlsx');
}
function exportarDados() {
    const dados = { membros, restricoes, restricoesPermanentes };
    const json = JSON.stringify(dados, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dados_escala.json';
    a.click();
    URL.revokeObjectURL(url);
}
function importarDados(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            membros = dados.membros || [];
            restricoes = dados.restricoes || [];
            restricoesPermanentes = dados.restricoesPermanentes || [];
            salvarDados(); // Salva os dados importados imediatamente
            alert('Dados importados com sucesso! Recarregando para aplicar as mudanças.');
            window.location.reload(); // Recarrega para garantir que a migração de dados ocorra
        } catch (error) {
            alert('Erro ao importar dados: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Listener de Estado de Autenticação (sem alterações)
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('logout').style.display = 'block';
        showTab('cadastro');
        carregarDados();
    } else {
        document.getElementById('logout').style.display = 'none';
        showTab('auth');
    }
});
