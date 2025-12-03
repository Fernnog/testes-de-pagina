// assets/js/changelog.js

/**
 * Dados do Histórico de Versões
 * Adicione novas versões no topo do array.
 */
const changeLogData = [
    {
        version: "1.0.1",
        date: "03/12/2025",
        changes: [
            "🖨️ Restauração da funcionalidade 'Imprimir Orçamento' com layout otimizado.",
            "💰 Inclusão de campos gerenciais ('Margem de Lucro' e 'Custo Mão de Obra') na edição de pedidos.",
            "🎨 Implementação de regras CSS de impressão (@media print) para ocultar menus e elementos de interface.",
            "🔧 Ajustes na persistência de dados financeiros no Firebase."
        ]
    },
    {
        version: "1.0.0",
        date: "24/05/2024",
        changes: [
            "✨ Refinamento visual da Splash Screen (Tema Rosé).",
            "🎨 Melhoria nos cards do Hub com efeitos de interatividade.",
            "📐 Reposicionamento estratégico do slogan da marca.",
            "👤 Novo design para identificação de usuário logado.",
            "🚀 Implementação do módulo de Changelog (Histórico de Mudanças)."
        ]
    }
];

/**
 * Inicializa o componente de versão na tela
 */
export function initChangelog() {
    const container = document.getElementById('version-container');
    
    // Proteção caso o container não exista no HTML
    if (!container) {
        console.warn('Container de versão (#version-container) não encontrado.');
        return;
    }

    // Pega a versão mais recente
    const latestVer = changeLogData[0].version;

    // Cria o elemento visual do indicador
    const indicator = document.createElement('div');
    indicator.id = 'version-indicator';
    indicator.textContent = `v${latestVer}`;
    indicator.title = "Clique para ver o histórico de atualizações";
    
    // Adiciona evento de clique para abrir o modal
    indicator.addEventListener('click', () => openChangelogModal());
    
    // Injeta no HTML
    container.innerHTML = ''; // Limpa conteúdo anterior se houver
    container.appendChild(indicator);
}

/**
 * Constrói e exibe o modal de histórico
 */
function openChangelogModal() {
    // Evita abrir múltiplos modais
    if (document.querySelector('.changelog-overlay')) return;

    // Cria o overlay (fundo escuro)
    const overlay = document.createElement('div');
    overlay.className = 'changelog-overlay';
    
    // Gera o HTML da lista de mudanças
    let listHTML = '';
    changeLogData.forEach(log => {
        const items = log.changes.map(c => `<li>${c}</li>`).join('');
        listHTML += `
            <div class="changelog-item">
                <div class="header-log">
                    <span class="changelog-version">Versão ${log.version}</span>
                    <span class="changelog-date">${log.date}</span>
                </div>
                <ul class="changelog-list">${items}</ul>
            </div>
        `;
    });

    // Estrutura interna do Modal
    overlay.innerHTML = `
        <div class="changelog-modal">
            <span class="close-changelog">&times;</span>
            <div class="modal-header">
                <h2>Histórico de Atualizações</h2>
                <p>Acompanhe a evolução do Portal Pérola Rara</p>
            </div>
            <div class="changelog-content">
                ${listHTML}
            </div>
        </div>
    `;

    // Lógica para fechar o modal (Botão X)
    overlay.querySelector('.close-changelog').onclick = () => overlay.remove();

    // Lógica para fechar clicando fora do modal
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    document.body.appendChild(overlay);
}
