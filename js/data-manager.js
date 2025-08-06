// ARQUIVO: data-manager.js (Versão Completa)
// DESCRIÇÃO: As funções 'limparDadosGlobais', 'exportarDados' e 'importarDados' foram removidas,
// pois se tornaram obsoletas com a integração direta com o Firebase.

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
                // Se não há dados, zera as variáveis locais para evitar persistência de estado anterior
                membros = [];
                restricoes = [];
                restricoesPermanentes = [];
            }
            onDataLoaded(); // Callback para notificar que os dados foram carregados
        })
        .catch((error) => {
            console.error('Erro ao carregar dados: ', error);
            onDataLoaded(); // Chama o callback mesmo em caso de erro para a UI não ficar travada
        });
}
