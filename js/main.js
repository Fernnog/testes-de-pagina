// ===================================================================================
// ARQUIVO: js/main.js (NOVO PONTO DE ENTRADA)
// FUNÇÃO: Orquestra toda a aplicação. Inicializa o Firebase, configura os listeners
//         de eventos e chama funções dos módulos de UI e de dados.
// ===================================================================================

import {
    membros,
    restricoes,
    restricoesPermanentes,
    salvarDados,
    carregarDados,
    adicionarMembro,
    excluirMembro,
    adicionarRestricao,
    excluirRestricao,
    adicionarRestricaoPermanente,
    excluirRestricaoPermanente,
    limparDadosLocais
} from './data-manager.js';

// --- SEÇÃO DE INICIALIZAÇÃO ---

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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();


// --- SEÇÃO DE FUNÇÕES DE UI (temporariamente aqui para foco) ---
// Em uma refatoração completa, estas funções estariam em `ui.js`

function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
}

function toggleConjuge() {
    document.getElementById('conjugeField').style.display =
        document.getElementById('conjugeParticipa').checked ? 'block' : 'none';
}

function atualizarTodasAsListas() {
    atualizarListaMembros();
    atualizarSelectMembros();
    atualizarListaRestricoes();
    atualizarListaRestricoesPermanentes();
}

function atualizarListaMembros() {
    // A lógica de renderização da lista de membros (código original)...
    const lista = document.getElementById('listaMembros');
    membros.sort((a, b) => a.nome.localeCompare(b.nome));
    let maleCount = 0;
    let femaleCount = 0;
    lista.innerHTML = membros.map((m, index) => {
        if (m.genero === 'M') maleCount++; else if (m.genero === 'F') femaleCount++;
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
                    <button class="secondary-button" data-action="open-suspension" data-index="${index}">Gerenciar Suspensão</button>
                    <button data-action="delete-member" data-index="${index}">Excluir</button>
                </div>
            </li>`;
    }).join('');
    document.getElementById('maleCount').textContent = maleCount;
    document.getElementById('femaleCount').textContent = femaleCount;
    document.getElementById('totalCount').textContent = membros.length;
}

function atualizarSelectMembros() {
    // A lógica de renderização dos selects (código original)...
    const selects = [document.getElementById('membroRestricao'), document.getElementById('membroRestricaoPermanente')];
    membros.sort((a, b) => a.nome.localeCompare(b.nome));
    selects.forEach(select => {
        select.innerHTML = '<option value="">Selecione um membro</option>' +
            membros.map(m => `<option value="${m.nome}">${m.nome}</option>`).join('');
    });
}

function atualizarListaRestricoes() {
    // A lógica de renderização das restrições (código original)...
    const lista = document.getElementById('listaRestricoes');
    restricoes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoes.map((r, index) =>
        `<li>${r.membro}: ${new Date(r.inicio).toLocaleDateString('pt-BR', {timeZone: 'UTC'})} a ${new Date(r.fim).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
        <button data-action="delete-restriction" data-index="${index}">Excluir</button></li>`).join('');
}

function atualizarListaRestricoesPermanentes() {
    // A lógica de renderização das restrições permanentes (código original)...
    const lista = document.getElementById('listaRestricoesPermanentes');
    restricoesPermanentes.sort((a, b) => a.membro.localeCompare(b.membro));
    lista.innerHTML = restricoesPermanentes.map((r, index) =>
        `<li>${r.membro}: ${r.diaSemana}
        <button data-action="delete-perm-restriction" data-index="${index}">Excluir</button></li>`).join('');
}

function exibirIndiceEquilibrio(participacoes) {
    const container = document.getElementById('balanceIndexContainer');
    const counts = Object.values(participacoes).map(p => p.count).filter(c => c !== undefined);

    if (counts.length < 2) {
        container.style.display = 'none';
        return;
    }

    const media = counts.reduce((sum, val) => sum + val, 0) / counts.length;
    if (isNaN(media)) {
        container.style.display = 'none';
        return;
    }
    
    const desvioPadrao = Math.sqrt(counts.map(x => Math.pow(x - media, 2)).reduce((a, b) => a + b, 0) / counts.length);
    const score = Math.max(0, 100 - (desvioPadrao * 30));

    container.innerHTML = `
        <h4>Índice de Equilíbrio da Escala</h4>
        <div class="balance-bar-background">
            <div class="balance-bar-foreground" style="width: ${score.toFixed(1)}%;" id="balanceBar">
                ${score.toFixed(1)}%
            </div>
        </div>
    `;
    container.style.display = 'block';

    const bar = document.getElementById('balanceBar');
    if (score < 50) bar.style.background = 'linear-gradient(90deg, #dc3545, #ff7e5f)';
    else if (score < 75) bar.style.background = 'linear-gradient(90deg, #ffc107, #feca57)';
    else bar.style.background = 'linear-gradient(90deg, #28a745, #84fab0)';
}

// --- SEÇÃO DE LÓGICA DA ESCALA (temporariamente aqui) ---

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

    // ATUALIZADO: Algoritmo com peso exponencial para maior equilíbrio.
    const pesos = membrosDisponiveis.map(m => {
        const count = participacoes[m.nome]?.count || 0;
        return Math.pow(0.2, count);
    });
    
    const somaPesos = pesos.reduce((sum, p) => sum + p, 0);
    if (somaPesos === 0) return [];
    
    const pesosNormalizados = pesos.map(p => p / somaPesos);

    const selecionados = [];
    const disponiveis = [...membrosDisponiveis];
    let pesosTemp = [...pesosNormalizados];

    while (selecionados.length < quantidadeNecessaria && disponiveis.length > 0) {
        const indiceSorteado = weightedRandom(pesosTemp);
        const membroSelecionado = disponiveis.splice(indiceSorteado, 1)[0];
        pesosTemp.splice(indiceSorteado, 1);
        
        const somaPesosTemp = pesosTemp.reduce((sum, p) => sum + p, 0);
        if (somaPesosTemp > 0) {
            pesosTemp = pesosTemp.map(p => p / somaPesosTemp);
        }

        selecionados.push(membroSelecionado);
    }
    return selecionados;
}


// --- SEÇÃO DE EVENT LISTENERS ---

// Listener para carregar a aplicação
document.addEventListener('DOMContentLoaded', () => {
    // Configura os listeners de autenticação
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
            .catch((error) => { alert('Erro ao fazer login: ' + error.message); });
    });

    document.getElementById('logout').addEventListener('click', () => {
        auth.signOut().then(() => alert('Logout bem-sucedido!'));
    });

    auth.onAuthStateChanged((user) => {
        if (user) {
            document.getElementById('logout').style.display = 'block';
            showTab('cadastro');
            carregarDados(auth, database, atualizarTodasAsListas);
        } else {
            document.getElementById('logout').style.display = 'none';
            showTab('auth');
            // Limpa dados locais ao fazer logout
            limparDadosLocais();
            atualizarTodasAsListas();
        }
    });

    // Listener para delegação de eventos nas listas dinâmicas
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const action = target.dataset.action;
        const index = parseInt(target.dataset.index, 10);

        if (action === 'delete-member') {
            if (confirm(`Tem certeza que deseja excluir ${membros[index].nome}?`)) {
                excluirMembro(index);
                salvarDados(auth, database).then(atualizarTodasAsListas);
            }
        }
        if (action === 'delete-restriction') {
            excluirRestricao(index);
            salvarDados(auth, database).then(atualizarListaRestricoes);
        }
        if (action === 'delete-perm-restriction') {
            excluirRestricaoPermanente(index);
            salvarDados(auth, database).then(atualizarListaRestricoesPermanentes);
        }
        // Adicionar aqui a lógica do modal de suspensão, se necessário.
    });

    // Listeners de Formulários
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

        adicionarMembro({
            nome,
            genero,
            conjuge: nomeConjuge,
            suspensao: { cultos: false, sabado: false, whatsapp: false }
        });
        salvarDados(auth, database).then(atualizarTodasAsListas);
        e.target.reset();
        toggleConjuge();
    });

    document.getElementById('formRestricao').addEventListener('submit', (e) => {
        e.preventDefault();
        const membro = document.getElementById('membroRestricao').value;
        const dataInicioStr = document.getElementById('dataInicio').value;
        const dataFimStr = document.getElementById('dataFim').value;
        const inicio = new Date(dataInicioStr + 'T12:00:00');
        const fim = new Date(dataFimStr + 'T12:00:00');
    
        if (!membro) { alert('Selecione um membro!'); return; }
        if (fim < inicio) { alert('A data de fim deve ser posterior à data de início!'); return; }
    
        adicionarRestricao({ membro, inicio: inicio.toISOString(), fim: fim.toISOString() });
        salvarDados(auth, database).then(atualizarListaRestricoes);
        e.target.reset();
    });
    
    document.getElementById('formRestricaoPermanente').addEventListener('submit', (e) => {
        e.preventDefault();
        const membro = document.getElementById('membroRestricaoPermanente').value;
        const diaSemana = document.getElementById('diaSemana').value;
        if (!membro) { alert('Selecione um membro!'); return; }
        adicionarRestricaoPermanente({ membro, diaSemana });
        salvarDados(auth, database).then(atualizarListaRestricoesPermanentes);
        e.target.reset();
    });

    // Listener do Formulário de Escala
    document.getElementById('formEscala').addEventListener('submit', (e) => {
        e.preventDefault();
        // Lógica original de geração da escala...
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
    
        const participacoes = {};
        membros.forEach(m => {
            participacoes[m.nome] = { count: 0, lastDate: null };
        });
    
        dias.forEach(dia => {
            let membrosDisponiveis = membros.filter(m => {
                let isSuspended = false;
                const tipo = dia.tipo;
                if (tipo === 'Quarta' || tipo.includes('Domingo')) isSuspended = m.suspensao.cultos;
                else if (tipo === 'Sábado') isSuspended = m.suspensao.sabado;
                else if (tipo === 'Oração no WhatsApp') isSuspended = m.suspensao.whatsapp;
    
                const restricaoTemp = restricoes.some(r => r.membro === m.nome && new Date(dia.data) >= new Date(r.inicio) && new Date(dia.data) <= new Date(r.fim));
                const restricaoPerm = restricoesPermanentes.some(r => r.membro === m.nome && r.diaSemana === dia.tipo);
                return !isSuspended && !restricaoTemp && !restricaoPerm;
            });
    
            if (dia.tipo === 'Oração no WhatsApp') {
                const tresDiasAtras = new Date(dia.data);
                tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
                membrosDisponiveis = membrosDisponiveis.filter(m => !participacoes[m.nome].lastDate || participacoes[m.nome].lastDate < tresDiasAtras);
            }
            
            const qtdNecessaria = dia.tipo === 'Oração no WhatsApp' ? 1 : (dia.tipo === 'Sábado' ? 1 : quantidadeCultos);
            if (membrosDisponiveis.length < qtdNecessaria) return;
    
            let selecionados = [];
            if (qtdNecessaria === 1) {
                selecionados = selecionarMembrosComAleatoriedade(membrosDisponiveis, 1, participacoes);
            } else {
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
                selecionados.forEach(m => {
                    participacoes[m.nome].count++;
                    participacoes[m.nome].lastDate = new Date(dia.data);
                });
            }
        });
        
        let escalaHTML = '<ul>';
        dias.forEach(dia => {
            if (dia.selecionados.length > 0) {
                escalaHTML += `<li>${dia.data.toLocaleDateString('pt-BR')} - ${dia.tipo}: ${dia.selecionados.map(m => m.nome).join(', ')}</li>`;
            }
        });
        escalaHTML += '</ul>';
        resultado.innerHTML += escalaHTML;
    
        let relatorio = '<h4>Relatório de Participações</h4>';
        const participacoesOrdenadas = Object.entries(participacoes).sort(([, a], [, b]) => b.count - a.count);
        for (const [nome, data] of participacoesOrdenadas) {
            relatorio += `<p>${nome}: ${data.count} participações</p>`;
        }
        resultado.innerHTML += relatorio;

        // NOVO: Exibe o Índice de Equilíbrio
        exibirIndiceEquilibrio(participacoes);
    });
});
