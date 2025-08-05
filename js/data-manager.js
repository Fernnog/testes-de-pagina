// Arquivo: js/data-manager.js

// --- ESTADO DA APLICAÇÃO ---
export let membros = [];
export let restricoes = [];
export let restricoesPermanentes = [];

// --- FUNÇÕES DE MANIPULAÇÃO DO ESTADO LOCAL (CRUD) ---

export function adicionarMembro(membro) {
    membros.push(membro);
}

export function excluirMembro(index) {
    membros.splice(index, 1);
}

export function adicionarRestricao(restricao) {
    restricoes.push(restricao);
}

export function excluirRestricao(index) {
    restricoes.splice(index, 1);
}

export function adicionarRestricaoPermanente(restricao) {
    restricoesPermanentes.push(restricao);
}

export function excluirRestricaoPermanente(index) {
    restricoesPermanentes.splice(index, 1);
}

export function limparDadosGlobais() {
    membros = [];
    restricoes = [];
    restricoesPermanentes = [];
}


// --- FUNÇÕES DE PERSISTÊNCIA DE DADOS (Firebase e Exportação) ---

export function salvarDados(auth, database) {
    const user = auth.currentUser;
    if (!user) return Promise.resolve(); // Retorna uma promessa para não quebrar a cadeia .then()
    const uid = user.uid;
    return database.ref('users/' + uid).set({
        membros: membros,
        restricoes: restricoes,
        restricoesPermanentes: restricoesPermanentes
    });
}

export function carregarDados(auth, database, onDataLoaded) {
    const user = auth.currentUser;
    if (!user) return;
    const uid = user.uid;
    database.ref('users/' + uid).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const dados = snapshot.val();
                membros = (dados.membros || []).map(m => {
                    if (typeof m.suspensao !== 'object' || m.suspensao === null) {
                        const isSuspendedOld = !!m.suspenso;
                        m.suspensao = { cultos: isSuspendedOld, sabado: isSuspendedOld, whatsapp: isSuspendedOld };
                    }
                    return m;
                });
                restricoes = dados.restricoes || [];
                restricoesPermanentes = dados.restricoesPermanentes || [];
            } else {
                limparDadosGlobais();
            }
            onDataLoaded(); // Callback para notificar que os dados foram carregados
        })
        .catch((error) => {
            console.error('Erro ao carregar dados: ', error);
            onDataLoaded(); // Chama o callback mesmo em caso de erro para a UI não ficar travada
        });
}

export function exportarDados() {
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

export function importarDados(event, auth, database) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            membros = dados.membros || [];
            restricoes = dados.restricoes || [];
            restricoesPermanentes = dados.restricoesPermanentes || [];
            
            salvarDados(auth, database).then(() => {
                alert('Dados importados com sucesso! Recarregando para aplicar as mudanças.');
                window.location.reload();
            });
        } catch (error) {
            alert('Erro ao importar dados: ' + error.message);
        }
    };
    reader.readAsText(file);
}
