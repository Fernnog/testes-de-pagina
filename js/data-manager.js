// ARQUIVO: data-manager.js (Versão Completa e Corrigida)
// DESCRIÇÃO: As funções 'limparDadosGlobais', 'exportarDados' e 'importarDados' foram removidas,
// pois se tornaram obsoletas com a integração direta com o Firebase.
// ADICIONADO: Suporte para 'escalasSalvas'.

// --- ESTADO DA APLICAÇÃO ---
export let membros = [];
export let restricoes = [];
export let restricoesPermanentes = [];
export let escalasSalvas = [];

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

export function adicionarEscalaSalva(escala) {
    escalasSalvas.push(escala);
}

export function excluirEscalaSalva(escalaId) {
    const index = escalasSalvas.findIndex(e => e.id === escalaId);
    if (index > -1) {
        escalasSalvas.splice(index, 1);
    }
}

export function atualizarNomeEscalaSalva(escalaId, novoNome) {
    const escala = escalasSalvas.find(e => e.id === escalaId);
    if (escala) {
        escala.nome = novoNome;
    }
}

// --- FUNÇÕES DE PERSISTÊNCIA DE DADOS (Firebase e Exportação) ---

export function salvarDados(auth, database) {
    const user = auth.currentUser;
    if (!user) return Promise.resolve(); // Retorna uma promessa para não quebrar a cadeia .then()
    const uid = user.uid;
    return database.ref('users/' + uid).set({
        membros: membros,
        restricoes: restricoes,
        restricoesPermanentes: restricoesPermanentes,
        escalasSalvas: escalasSalvas
    });
}

export function carregarDados(auth, database, onDataLoaded) {
    const user = auth.currentUser;
    if (!user) return;
    const uid = user.uid;
    database.ref('users/' + uid).once('value')
        .then((snapshot) => {
            // Limpa os arrays de estado ANTES de preenchê-los.
            // Isso garante que não haja dados de uma sessão anterior em caso de falha ou snapshot vazio.
            membros.length = 0;
            restricoes.length = 0;
            restricoesPermanentes.length = 0;
            escalasSalvas.length = 0;

            if (snapshot.exists()) {
                const dados = snapshot.val();
                
                // Processa e preenche MEMBROS, mutando o array original.
                const membrosProcessados = (dados.membros || []).map(m => {
                    if (typeof m.suspensao !== 'object' || m.suspensao === null) {
                        const isSuspendedOld = !!m.suspenso;
                        m.suspensao = { cultos: isSuspendedOld, sabado: isSuspendedOld, whatsapp: isSuspendedOld };
                    }
                    return m;
                });
                membrosProcessados.forEach(membro => membros.push(membro));

                // Processa e preenche RESTRIÇÕES, mutando o array original.
                const restricoesProcessadas = dados.restricoes || [];
                restricoesProcessadas.forEach(restricao => restricoes.push(restricao));

                // Processa e preenche RESTRIÇÕES PERMANENTES, mutando o array original.
                const restricoesPermProcessadas = dados.restricoesPermanentes || [];
                restricoesPermProcessadas.forEach(restricao => restricoesPermanentes.push(restricao));
                
                // Processa e preenche ESCALAS SALVAS, mutando o array original.
                const escalasProcessadas = (dados.escalasSalvas || []).map(escala => {
                    if (escala.dias && Array.isArray(escala.dias)) {
                        escala.dias = escala.dias.map(dia => {
                            if (dia.data) {
                                dia.data = new Date(dia.data);
                            }
                            return dia;
                        });
                    }
                    return escala;
                });
                escalasProcessadas.forEach(escala => escalasSalvas.push(escala));
            }
            
            // O callback é chamado aqui, após o preenchimento (ou não) dos dados.
            onDataLoaded();
        })
        .catch((error) => {
            console.error('Erro ao carregar dados: ', error);
            // Garante que o callback seja chamado mesmo em caso de erro para não travar a UI.
            onDataLoaded();
        });
}
