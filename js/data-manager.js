// ARQUIVO: data-manager.js (Versão Corrigida e Robusta)

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
            membros.length = 0;
            restricoes.length = 0;
            restricoesPermanentes.length = 0;
            escalasSalvas.length = 0;

            if (snapshot.exists()) {
                const dados = snapshot.val();
                
                // Processa e preenche MEMBROS
                const membrosProcessados = (dados.membros || []).map(m => {
                    if (typeof m.suspensao !== 'object' || m.suspensao === null) {
                        const isSuspendedOld = !!m.suspenso;
                        m.suspensao = { cultos: isSuspendedOld, sabado: isSuspendedOld, whatsapp: isSuspendedOld };
                    }
                    return m;
                });
                membrosProcessados.forEach(membro => membros.push(membro));

                // Processa e preenche RESTRIÇÕES
                const restricoesProcessadas = dados.restricoes || [];
                restricoesProcessadas.forEach(restricao => restricoes.push(restricao));

                // Processa e preenche RESTRIÇÕES PERMANENTES
                const restricoesPermProcessadas = dados.restricoesPermanentes || [];
                restricoesPermProcessadas.forEach(restricao => restricoesPermanentes.push(restricao));
                
                // =================================================================================
                // === INÍCIO DA CORREÇÃO DEFINITIVA: Processamento robusto de escalas salvas ===
                // =================================================================================
                const escalasSalvasDoBanco = dados.escalasSalvas || [];
                
                const escalasProcessadas = escalasSalvasDoBanco.map(escala => {
                    if (escala.dias && Array.isArray(escala.dias)) {
                        // Mapeia os dias e converte a string de data para um objeto Date.
                        // Em seguida, filtra para garantir que apenas dias com data válida permaneçam.
                        const diasValidos = escala.dias
                            .map(dia => {
                                // A data vinda do Firebase é uma string, converte para objeto Date
                                const dataConvertida = new Date(dia.data); 
                                return { ...dia, data: dataConvertida };
                            })
                            .filter(dia => dia.data && !isNaN(dia.data.getTime())); // Checa se a data é válida

                        return { ...escala, dias: diasValidos };
                    }
                    // Se a escala não tiver dias, retorna como está (ou vazia para segurança)
                    return { ...escala, dias: [] }; 
                });
                
                escalasProcessadas.forEach(escala => escalasSalvas.push(escala));
                // ===============================================================================
                // === FIM DA CORREÇÃO DEFINITIVA ===
                // ===============================================================================
            }
            
            onDataLoaded();
        })
        .catch((error) => {
            console.error('Erro ao carregar dados: ', error);
            onDataLoaded();
        });
}