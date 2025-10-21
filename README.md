# Meus Alvos de Oração

Bem-vindo ao **Meus Alvos de Oração**, uma aplicação web desenvolvida para ajudar usuários a gerenciar e acompanhar seus alvos de oração de forma organizada e espiritual. Com esta ferramenta, você pode adicionar, editar, arquivar e orar por seus alvos, acompanhar seu progresso diário e visualizar relatórios detalhados de perseverança.

Este projeto foi construído com HTML, CSS e JavaScript (ES Modules), utilizando o **Firebase** como backend para autenticação e armazenamento de dados em tempo real.

## Funcionalidades

-   **Gerenciamento Completo de Alvos**:
    -   Adicione novos alvos com título, detalhes, data de criação, categoria e prazo.
    -   Arquive, marque como "Respondido" e adicione observações a qualquer alvo.
    -   Visualize alvos ativos, arquivados ou respondidos em painéis separados com busca, filtros e paginação.

-   **Promoção de Observações a Sub-Alvos**:
    -   Promova uma observação importante a um "sub-alvo", tratando-a como um desdobramento do alvo principal.
    -   Sub-alvos possuem identidade visual própria e podem ser marcados como "respondidos" individualmente.
    -   Um ícone (🔗) sinaliza quais alvos principais contêm sub-alvos, facilitando a identificação.

-   **Painel de Prioridades e Alvos do Dia**:
    -   Marque alvos como prioritários para destaque e fácil acesso no painel principal.
    -   Uma lista de até 10 alvos é selecionada aleatoriamente a cada dia para foco e intercessão.

-   **Acompanhamento de Perseverança**:
    -   Uma barra de progresso visualiza a sequência atual de dias de interação em comparação com o recorde pessoal.
    -   Um quadro semanal exibe os dias da semana em que houve interação.
    -   Ícones de marcos (milestones) são desbloqueados conforme sua perseverança aumenta.
    -   Alerta proativo para alvos com prazo de validade vencido.

-   **Relatórios Detalhados**:
    -   **Relatório Pessoal**: Gera uma visualização da sua jornada de perseverança e marcos alcançados.
    -   **Relatório por Alvo (`orei.html`)**: Uma página dedicada que apresenta um relatório detalhado de todos os alvos (ativos, arquivados e respondidos), exibindo a contagem total de interações para cada um.

-   **Autenticação e Sincronização**:
    -   Login, cadastro e redefinição de senha seguros via Firebase Authentication.
    -   Todos os dados são salvos no Firebase Firestore, garantindo sincronização entre dispositivos.

## Tecnologias Utilizadas

-   **Frontend**:
    -   HTML5
    -   CSS3
    -   JavaScript (ES6+ Modules)
    -   Interface responsiva

-   **Backend**:
    -   Firebase Authentication (autenticação de usuários)
    -   Firebase Firestore (banco de dados NoSQL)

## Arquitetura do Código

A arquitetura do código foi modularizada para garantir a separação de responsabilidades e facilitar a manutenção:

-   `script.js`: O **orquestrador principal** da aplicação (`index.html`). Gerencia o estado, o fluxo de dados e os eventos do usuário na página principal.
-   `ui.js`: A **camada de visualização**. Responsável por toda a manipulação do DOM e renderização da interface na página principal.
-   `firestore-service.js`: A **camada de acesso a dados**. Contém todas as funções que interagem com o Firestore e prepara os dados para a aplicação. É consumido por `script.js` e `orei.js`.
-   `auth.js`: O **módulo de autenticação**. Contém as funções que interagem com o Firebase Authentication.
-   `utils.js`: Funções utilitárias puras (formatação de data, etc.) reutilizadas em todo o projeto.
-   `firebase-config.js`: Onde as credenciais do seu projeto Firebase são configuradas e exportadas.
-   `orei.js`: O orquestrador da página de relatório (`orei.html`).

## Como Configurar o Projeto Localmente

### Pré-requisitos

-   Conta no Firebase
-   Um editor de código (ex.: VS Code)
-   Um servidor web local (a extensão "Live Server" para VS Code é recomendada)

### Passos para Configuração

1.  **Clone o Repositório** (ou baixe os arquivos):
    -   Obtenha todos os arquivos do projeto e coloque-os em uma pasta local.

2.  **Configure o Firebase**:
    -   Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
    -   No seu projeto, vá para **Authentication** e habilite o provedor de **E-mail/senha**.
    -   Vá para **Firestore Database** e crie um banco de dados no **modo de produção**.
    -   Nas **Configurações do Projeto**, registre um novo aplicativo da web para obter o objeto `firebaseConfig`.

3.  **Adicione as Credenciais do Firebase**:
    -   Abra o arquivo `firebase-config.js` e cole o objeto `firebaseConfig` que você obteve.
        ```javascript
        // firebase-config.js
        const firebaseConfig = {
          apiKey: "SUA_API_KEY",
          authDomain: "SEU_AUTH_DOMAIN",
          // ...outras chaves
        };
        ```
    -   **Atenção:** Você só precisa fazer isso no arquivo `firebase-config.js`.

4.  **Estrutura do Firestore**:
    O projeto utiliza as seguintes coleções principais no Firestore:
    -   `users/{userId}/prayerTargets`: Armazena os alvos de oração ativos.
    -   `users/{userId}/archivedTargets`: Armazena os alvos arquivados/respondidos.
    -   `dailyPrayerTargets/{userId_YYYY-MM-DD}`: Armazena a lista diária de alvos.
    -   `perseveranceData/{userId}`: Armazena os dados de dias consecutivos.
    -   `weeklyInteractions/{userId}`: Armazena as interações da semana.

5.  **Execute Localmente**:
    -   Use a extensão "Live Server" no VS Code (ou um servidor similar) para servir os arquivos a partir da raiz do projeto. Abrir o `index.html` diretamente no navegador não funcionará devido ao uso de Módulos JavaScript (ESM).
    -   Acesse a aplicação pelo endereço fornecido pelo servidor (ex: `http://127.0.0.1:5500`).

## Como Usar

1.  **Faça Login/Cadastre-se**:
    -   Use seu e-mail e senha para acessar a aplicação.

2.  **Navegue pelos Painéis**:
    -   Use os botões do menu principal para alternar entre:
        -   **Página Inicial**: Exibe os painéis de prioridades e alvos do dia.
        -   **Novo Alvo**: Exibe o formulário para adicionar um novo alvo.
        -   **Ver Todos os Alvos / Arquivados / Respondidos**: Listagens dos seus alvos.

3.  **Interaja com os Alvos**:
    -   Clique em **"Orei!"** para registrar sua intercessão e atualizar as estatísticas de perseverança.
    -   Adicione **observações** para criar um diário do seu alvo.
    -   **Promova** observações a sub-alvos para destacar desdobramentos importantes.

4.  **Use os Relatórios**:
    -   Clique em **"Relatório Pessoal"** para gerar uma visualização da sua perseverança.
    -   Navegue até o **"Relatório por Alvo"** (`orei.html`) para abrir a página de relatório detalhada, onde você pode pesquisar e filtrar todos os seus alvos e ver a contagem de interações.
