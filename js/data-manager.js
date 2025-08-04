// ===================================================================================
// ARQUIVO: js/data-manager.js (NOVO MÓDULO)
// FUNÇÃO: Gerencia o estado da aplicação (membros, restrições) e a comunicação com o
//         Firebase Database. É a "fonte da verdade" para os dados.
// ===================================================================================

// O estado da aplicação agora reside aqui.
// As variáveis são exportadas para que outros módulos possam lê-las.
export let membros = [];
export let restricoes = [];
export let restricoesPermanentes = [];

// Funções que interagem com o Firebase
export function salvarDados(auth, database) {
    const user = auth.currentUser;
    if (!user) {
        console.warn('Usuário não logado, salvamento abortado.');
        return Promise.reject('Usuário não logado.');
    }
    const uid = user.uid;
    console.log('Salvando dados...');
    // Retorna a promessa para que outros módulos possam reagir ao sucesso/falha
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
                
                // Lógica de migração de dados para suportar suspensão granular
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
            }
            // NOVO: Executa uma função de callback após os dados serem carregados.
            // Isso garante que a UI só será atualizada com os dados já presentes.
            if (onDataLoaded) {
                onDataLoaded();
            }
        })
        .catch((error) => {
            console.error('Erro ao carregar dados: ', error);
        });
}

// Funções que manipulam o estado local da aplicação
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

export function limparDadosLocais() {
    membros = [];
    restricoes = [];
    restricoesPermanentes = [];
}
