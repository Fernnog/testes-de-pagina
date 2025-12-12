<p align="center">
  <img src="assets/logo.png" alt="Logotipo do Plano de Leitura" width="150">
</p>

# Portal Pérola Rara - Sistema Integrado de Gestão

> *"Onde a arte se encontra com o amor em cada detalhe."*

Este repositório contém o código-fonte do **Portal de Gestão Pérola Rara**, uma aplicação web unificada desenvolvida para otimizar os processos administrativos, de precificação e controle de pedidos da empresa. O sistema centraliza ferramentas que antes operavam separadamente, oferecendo uma experiência de usuário fluida e segura.

---

## 🧸 Sobre a Pérola Rara

A **Pérola Rara** é uma empresa artesanal idealizada por Karina, uma mãe e artesã que transformou sua primeira experiência com a maternidade em um empreendimento cheio de carinho e significado. Tudo começou com a confecção das lembranças para o nascimento de sua filha e evoluiu para um negócio que realiza sonhos de famílias inteiras.

O nome reflete a essência do negócio: oferecer produtos únicos e valiosos, feitos à mão, dentro do universo dos enxovais de bebês. Em seu espaço, Karina cria peças personalizadas — como fraldas, toalhas, saídas de maternidade e bolsas — bordadas e costuradas à mão, garantindo exclusividade frente aos itens industrializados.

Este software foi construído para dar suporte a essa visão, garantindo que a gestão do negócio seja tão precisa e cuidadosa quanto a confecção de seus produtos.

---

## 🚀 Funcionalidades do Sistema

O Portal opera como uma aplicação de página única (SPA), dividida em dois grandes módulos acessíveis através de um **Hub Central**:

### 🔐 1. Autenticação e Segurança
*   **Login Único:** Acesso centralizado via Firebase Authentication.
*   **Sessão Persistente:** O usuário permanece logado enquanto navega entre os módulos.
*   **Proteção de Rotas:** Redirecionamento automático para login caso não haja usuário autenticado.

### 🧮 2. Módulo de Precificação
Ferramenta analítica para garantir a saúde financeira do ateliê.
*   **Cadastro de Materiais:** Controle de custos por unidade, comprimento (cm), área (cm²), peso (g) ou volume (ml).
*   **Custo de Mão de Obra:** Cálculo automático do valor-hora baseado no salário desejado e horas trabalhadas.
*   **Custos Indiretos:** Rateio de despesas fixas (energia, internet, aluguel) por hora de produção.
*   **Formação de Preço:** Montagem de produtos somando materiais + mão de obra + custos indiretos + margem de lucro desejada.

### 📝 3. Módulo de Orçamentos e Pedidos
CRM e controle de produção.
*   **Gestão de Clientes:** Registro de dados para contato e entrega.
*   **Gerador de Orçamentos:** Criação de orçamentos profissionais com cálculo de frete e validade.
*   **Controle de Pedidos:** Conversão de orçamentos aprovados em pedidos de produção.
*   **Relatórios:** Visualização de faturamento e status dos pedidos.
*   **Exportação:** Capacidade de gerar relatórios em planilhas (XLSX).

---

## 🛠️ Tecnologias Utilizadas

*   **Front-end:** HTML5, CSS3 (Modularizado), JavaScript (ES6 Modules).
*   **Back-end (BaaS):** Google Firebase (Firestore Database & Authentication).
*   **Bibliotecas:**
    *   `SheetJS (xlsx)`: Para exportação de relatórios Excel.
    *   `Google Fonts`: Tipografia Roboto.

---

## 📂 Estrutura do Projeto

A arquitetura foi refatorada para suportar a unificação dos sistemas:

```text
/ (Raiz)
│
├── index.html                  # Arquivo Mestre (SPA Container)
├── orcamento.html              # Template para impressão/visualização de orçamentos
│
└── /assets
    ├── /css
    │   ├── main.css            # Estilos globais, Login e Hub
    │   ├── orcamentos.css      # Estilos específicos do módulo de Orçamentos
    │   └── precificacao.css    # Estilos específicos do módulo de Precificação
    │
    ├── /js
    │   ├── firebase-config.js  # Singleton de conexão com o Firebase
    │   ├── main.js             # Controlador de rotas e autenticação
    │   ├── orcamentos.js       # Lógica de negócio: Orçamentos
    │   └── precificacao.js     # Lógica de negócio: Precificação
    │
    └── /images
        ├── favicon.ico
        └── logo_perola_rara.png
```

---

## ⚙️ Configuração e Instalação

Para rodar o projeto localmente:

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/portal-perola-rara.git
    ```

2.  **Configuração do Firebase:**
    *   Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
    *   Habilite o **Authentication** (Email/Senha).
    *   Habilite o **Firestore Database**.
    *   Copie as credenciais do seu projeto.
    *   Cole as credenciais no arquivo `assets/js/firebase-config.js`.

3.  **Executando a Aplicação:**
    *   Devido ao uso de Módulos ES6 (`import`/`export`), este projeto **não roda** abrindo o arquivo diretamente no navegador (`file://`).
    *   Você deve usar um servidor local. Se estiver usando VS Code, instale a extensão **Live Server**, clique com o botão direito em `index.html` e selecione "Open with Live Server".

---

## 🗄️ Estrutura do Banco de Dados (Firestore)

O sistema utiliza as seguintes coleções principais:

*   `configuracoes`: Guarda variáveis globais (ex: valor da mão de obra, próximo número de orçamento).
*   `materiais-insumos`: Cadastro de matéria-prima.
*   `produtos`: Receitas de produtos (composição de materiais).
*   `custos-indiretos-predefinidos` e `-adicionais`: Despesas fixas.
*   `Orcamento-Pedido`: Coleção unificada contendo documentos do tipo 'orcamento' ou 'pedido'.
*   `precificacoes-geradas`: Histórico de cálculos de preços realizados.

---

## 🤝 Autor e Direitos

Desenvolvido para **Pérola Rara - Fraldas Personalizadas**.
Todos os direitos reservados à marca.
