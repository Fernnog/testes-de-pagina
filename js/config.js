// config.js
// Responsabilidade: Centralizar as configurações e regras de negócio da aplicação.

/**
 * Define os marcos (milestones) de perseverança, suas regras e ícones.
 * A ordem neste array é crucial e deve ser do maior para o menor valor em 'dias'.
 * - type 'principal': Permite empilhamento (ex: x2, x3).
 * - type 'etapa': Ocorre apenas uma vez no cálculo do "troco".
 */
export const MILESTONES = [
    { name: 'Sol',      days: 1000, icon: '☀️', type: 'principal' },
    { name: 'Diamante', days: 300,  icon: '💎', type: 'principal' },
    { name: 'Árvore',   days: 100,  icon: '🌳', type: 'principal' },
    { name: 'Estrela',  days: 30,   icon: '⭐', type: 'principal' },
    { name: 'Chama',    days: 15,   icon: '🔥', type: 'etapa'     },
    { name: 'Semente',  days: 7,    icon: '🌱', type: 'etapa'     }
];

// --- GERENCIAMENTO DE VERSÃO E CHANGELOG ---

export const APP_VERSION = '1.1.3'; // VERSÃO ATUALIZADA

export const CHANGELOG = {
 '1.1.3': [ // NOVO BLOCO PARA A VERSÃO ATUAL
    'DESIGN SYSTEM: Implementada uma nova identidade visual completa! A aplicação agora conta com uma paleta de cores mais serena e elegante (tons de marfim, ocre e marrom), melhorando a experiência de uso.',
    'MELHORIA (UI/UX): A tipografia foi refinada para otimizar a legibilidade. Textos longos agora usam uma fonte mais limpa (Lato), tornando a leitura de detalhes e observações muito mais confortável.',
    'ARQUITETURA (CSS): O arquivo `components.css` foi refatorado e dividido em `ui-components.css` e `target-components.css`, organizando melhor os estilos e facilitando a manutenção futura.',
    'MELHORIA (Layout): Os Alvos Prioritários agora são exibidos como cards individuais com cores alternadas, seguindo o mesmo padrão visual dos Alvos do Dia e melhorando a consistência da interface.'
  ],
    '1.1.2': [ // NOVO BLOCO ADICIONADO
    'ARQUITETURA: Realizada uma refatoração estrutural movendo todos os arquivos JavaScript para um novo diretório `js/`. Essa mudança melhora drasticamente a organização do projeto, separa as responsabilidades e alinha o código com as melhores práticas de desenvolvimento, facilitando a manutenção futura.',
    'MANUTENÇÃO: Consolidamos a organização dos arquivos de estilo ao mover `orei.css` para a pasta `styles/`. Agora, todos os arquivos CSS da aplicação residem em um único local, garantindo maior consistência no projeto.'
  ],
    '1.1.1': [
    'ARQUITETURA: Realizada uma importante refatoração no coração da aplicação. Toda a lógica de negócios para as ações do usuário (como arquivar, resolver, editar) foi centralizada em um novo módulo especialista (`action-handler.js`), transformando o `script.js` em um orquestrador mais limpo e eficiente.',
    'MANUTENÇÃO: Como parte da reorganização, funções de interface (como a que controla a tela de carregamento) foram movidas para o módulo de UI (`ui.js`), consolidando as responsabilidades visuais. Isso torna o código mais previsível e acelera o desenvolvimento de novas funcionalidades.'
  ],
 '1.1.0': [
    'FUNCIONALIDADE: Adicionados filtros de categoria diretamente na tela "Ver Todos os Alvos". Agora você pode encontrar alvos específicos de forma muito mais rápida, clicando nas categorias desejadas para filtrar a lista instantaneamente.',
    'CORREÇÃO (Layout): O título do painel "Alvos Prioritários" agora permanece perfeitamente centralizado, com ou sem o badge de "Concluído", garantindo uma interface mais consistente e agradável visualmente.',
    'MELHORIA (UI/UX): A legibilidade das etiquetas de categoria na janela "Adicionar Alvo Manualmente" foi aprimorada. A cor da fonte agora é branca, proporcionando um contraste ideal e facilitando a leitura.'
  ],
 '1.0.9': [
    'FUNCIONALIDADE: O painel "Alvos Prioritários" agora se torna inteligente! Ao concluir a intercessão por todos os alvos prioritários do dia, ele se recolhe automaticamente, exibindo uma mensagem de parabéns e otimizando a interface.',
    'MELHORIA (UX): Para celebrar sua disciplina, um novo badge "✓ Concluído" com um sutil efeito de brilho agora aparece no título do painel de prioridades concluído, tornando a experiência mais recompensadora.'
  ],
 '1.0.8': [
    'MELHORIA (UX): A visualização de observações foi otimizada para uma interface mais limpa. Agora, são exibidas por padrão apenas as 3 mais recentes e os sub-alvos, focando no conteúdo mais relevante.',
    'FUNCIONALIDADE: Adicionado um sistema "Ver Mais/Ver Menos" nas observações. Um novo botão permite expandir e recolher o histórico de anotações mais antigas, melhorando a navegação em alvos com muitos registros.'
  ]
};
