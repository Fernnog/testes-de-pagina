// =================================================================================
// DATA MANAGER (data-manager.js)
// Responsável por gerenciar o estado (os dados) e a comunicação com o Firebase.
// =================================================================================

// --- Estado da Aplicação ---
// Estas variáveis contêm os dados enquanto a aplicação está rodando.
export let membros = [];
export let restricoes = [];
export let restricoesPermanentes = [];

// --- Funções de Manipulação do Estado Local ---
// Funções que alteram as variáveis de estado acima.

export function adicionarMembro(membro) {
    membros.push(membro);
}

export function excluirMembro(index) {
    membros.splice(index, 1);
}

export function atualizarSuspensaoMembro(index, novaSuspensao) {
    if (membros[index]) {
        membros[index].suspensao = novaSuspensao;
    }
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


// --- Funções de Persistência (Comunicação com Firebase) ---
// Funções que leem e escrevem dados no banco de dados do Firebase.

/**
 * Salva o estado atual (membros, restrições) no Firebase para o usuário logado.
 * @param {firebase.auth.Auth} auth - A instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - A instância do Realtime Database do Firebase.
 * @returns {Promise<void>}
 */
export function salvarDados(auth, database) {
    const user = auth.currentUser;
    if (!user) {
        console.warn("Usuário não logado, dados não serão salvos.");
        return Promise.resolve(); // Retorna uma promessa resolvida para não quebrar cadeias .then()
    }
    const uid = user.uid;
    return database.ref('users/' + uid).set({
        membros: membros,
        restricoes: restricoes,
        restricoesPermanentes: restricoesPermanentes
    });
}

/**
 * Carrega os dados do Firebase para o usuário logado e atualiza o estado local.
 * @param {firebase.auth.Auth} auth - A instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - A instância do Realtime Database do Firebase.
 * @param {function} onDataLoaded - Callback a ser executado após os dados serem carregados e processados.
 */
export function carregarDados(auth, database, onDataLoaded) {
    const user = auth.currentUser;
    if (!user) return;

    const uid = user.uid;
    database.ref('users/' + uid).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const dados = snapshot.val();

                // Lógica de migração para a suspensão granular
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
            } else {
                // Se não há dados no Firebase, garante que o estado local esteja limpo.
                limparDadosGlobais();
            }
            onDataLoaded(); // Sinaliza que o carregamento terminou.
        })
        .catch((error) => {
            console.error("Erro ao carregar dados: ", error);
            alert("Não foi possível carregar os dados. Verifique sua conexão e tente novamente.");
        });
}


// --- Funções de Importação/Exportação de Dados ---

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

            // Salva imediatamente os dados importados no Firebase.
            salvarDados(auth, database).then(() => {
                alert('Dados importados com sucesso! A página será recarregada para aplicar as mudanças.');
                window.location.reload();
            });
        } catch (error) {
            alert('Erro ao importar dados: ' + error.message);
        }
    };
    reader.readAsText(file);
}
