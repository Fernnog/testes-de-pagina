// src/config/app-config.js

/**
 * @file app-config.js
 * @description Contém configurações globais da aplicação, como versão e changelog.
 */

export const APP_VERSION = '1.0.2';

// O changelog é um array de objetos para permitir uma formatação rica no futuro.
export const VERSION_CHANGELOG = [
    {
        type: 'NOVO ✨',
        description: 'Adicionada uma tela de carregamento (Splash Screen) para uma inicialização mais suave e profissional da aplicação.'
    },
    {
        type: 'MELHORIA 🚀',
        description: 'O logotipo na tela de carregamento agora possui uma animação de pulso sutil para melhorar a percepção de atividade durante a inicialização.'
    },
    {
        type: 'MELHORIA 🚀',
        description: 'A lógica da nova tela de carregamento foi modularizada (`splash-screen-ui.js`), seguindo as boas práticas de arquitetura do projeto para facilitar futuras manutenções.'
    }
];
