# Escala de Intercessores

![Logotipo Escala de Intercessores](image/logo.png)

**Escala de Intercessores** é uma aplicação web robusta, projetada para simplificar e otimizar a gestão de escalas de intercessão. Com uma interface intuitiva e um poderoso motor de geração, a ferramenta vai além de um simples agendador, incorporando regras de negócio complexas para criar escalas justas, equilibradas e que respeitam as particularidades de cada membro.

O sistema permite um gerenciamento detalhado dos participantes, incluindo restrições e suspensões granulares, culminando na geração de escalas mensais através de um clique, com distribuição inteligente e relatórios de análise aprofundados.

## 📋 Funcionalidades Detalhadas

A aplicação é dividida em módulos que cobrem todo o ciclo de vida da gestão de uma escala:

### Gestão de Pessoas e Disponibilidade
- **Cadastro de Membros:** Registre membros com informações essenciais como nome, gênero e cônjuge (se aplicável), formando a base para todas as operações.
- **Gerenciamento de Suspensão Granular:** Suspenda membros de forma total ou parcial (apenas de cultos, reuniões online ou oração no WhatsApp). Esta funcionalidade permite gerenciar ausências temporárias sem a necessidade de remover o membro, mantendo o histórico intacto.
- **Restrições Temporárias:** Defina períodos específicos (ex: férias, viagens) em que um membro não pode ser escalado. O sistema trata as datas corretamente para evitar problemas de fuso horário.
- **Restrições Permanentes:** Registre dias da semana ou turnos fixos (ex: "Todo Domingo à Noite") em que um membro nunca está disponível.

### Geração Inteligente de Escala
- **Geração Mensal Automatizada:** Crie escalas completas para um mês inteiro com um único comando, cobrindo:
  - **Cultos:** Quarta, Domingo Manhã e Noite.
  - **Reuniões Online:** Sábado.
  - **Oração no WhatsApp:** Diariamente.
- **Motor de Distribuição Inteligente:** O coração da aplicação, que utiliza um sistema de pesos para garantir que a distribuição seja a mais justa possível, priorizando membros que participaram menos.
- **Regras de Alocação de Duplas:** Ao gerar escalas com duas pessoas, o sistema busca ativamente formar pares compatíveis (mesmo gênero ou cônjuges) para promover um ambiente mais confortável, antes de considerar outras opções.

### Interatividade, Análise e Compartilhamento
- **Edição da Escala com Drag & Drop:** Após a geração, a escala pode ser ajustada manualmente. Arraste um membro de um card para outro para realizar trocas. O sistema valida a troca em tempo real, impedindo movimentos que violem as restrições do membro.
- **Painel de Disponibilidade Geral:** Uma visão completa que mostra, para cada turno, o status de todos os membros (Disponível, Suspenso, Restrição Permanente), ajudando no planejamento estratégico.
- **Análise de Concentração:** Um relatório detalhado que mostra, por turno, a quantidade de participações de cada membro, quantos estão disponíveis e o motivo da indisponibilidade dos demais.
- **Índice de Equilíbrio:** Um medidor visual que calcula e exibe um percentual de quão equilibrada a escala gerada está, ajudando a identificar rapidamente qualquer desbalanceamento.
- **Exportação e Importação de Dados:**
  - **JSON:** Exporte e importe todos os dados da aplicação (membros, restrições, suspensões) para backup ou migração.
  - **XLSX:** Exporte a escala finalizada em um arquivo Excel limpo e organizado, com cada membro em sua própria coluna para facilitar o compartilhamento e a manipulação dos dados.

---

## 🧠 O Motor da Escala: Regras e Lógica de Distribuição

Para garantir que as escalas sejam justas e funcionais, o sistema opera com uma hierarquia clara de regras. A cada dia a ser preenchido, o motor executa as seguintes verificações:

### 1. Regras de Exclusão (Obrigatórias)
Estas são as regras "inquebráveis". Se um membro se encaixar em qualquer uma delas para um determinado dia e turno, ele é **imediatamente removido** da lista de candidatos para aquela vaga.

- **✅ Suspensão:** O sistema verifica se o membro está suspenso para a categoria da vaga (Cultos, Sábado ou WhatsApp). Se estiver, ele é excluído.
- **✅ Restrição Permanente:** O sistema verifica se o membro possui uma restrição permanente para aquele turno (ex: "Domingo Noite"). Se possuir, ele é excluído.
- **✅ Restrição Temporária:** O sistema verifica se a data da vaga está dentro de um período de restrição temporária (ex: férias) cadastrado para o membro. Se estiver, ele é excluído.

Apenas os membros que passam por todos esses filtros são considerados "disponíveis".

### 2. Regras de Agrupamento (Preferenciais)
Quando a escala exige duplas, o sistema aplica uma lógica preferencial para formar os pares, após um primeiro membro ser selecionado.

- **🤝 Compatibilidade de Duplas:** O sistema busca o segundo membro em um grupo prioritário composto por:
  - Pessoas do mesmo gênero do primeiro membro selecionado.
  - O cônjuge do primeiro membro selecionado.
- **Fallback:** Caso nenhum membro compatível seja encontrado no grupo de disponíveis, o sistema quebra essa regra preferencial e seleciona qualquer outra pessoa disponível para garantir que a vaga seja preenchida.

### 3. Regras de Distribuição e Seleção (Justiça)
Para escolher quem será escalado dentre os "disponíveis", o sistema utiliza algoritmos para promover a justiça e a rotação.

- **⚖️ Sistema de Pesos:** A chance de um membro ser escalado é **inversamente proporcional** ao número de vezes que ele já participou na escala atual. Na prática, isso significa que **membros com menos participações têm prioridade máxima** para serem selecionados.
- **🔄 Distanciamento Mínimo (Oração no WhatsApp):** Para a escala diária de Oração no WhatsApp, uma regra adicional é aplicada: um membro que foi escalado não pode ser selecionado novamente nos próximos **3 dias**, garantindo uma rotação mais eficaz e evitando sobrecarga.

---

## 🎨 Design e Estilo
O design da aplicação foi inspirado no logotipo, com um tema ardente e espiritual. As melhorias visuais incluem:
- **Paleta de Cores Ardente:** Gradientes de laranja e vermelho para refletir fervor e paixão.
- **Feedback Visual Claro:** Uso de ícones, cores e emojis (⛔, 🚫) para indicar rapidamente o status de um membro (disponível, restrito, suspenso).
- **Componentes Interativos:** Botões modernos, campos de formulário que reagem ao foco e animações sutis que melhoram a experiência do usuário.
- **Layouts Organizados:** Uso de cards e painéis com colunas (Disponíveis vs. Indisponíveis) para apresentar informações complexas de forma clara e digerível.

---

## 🚀 Como Usar

### Pré-requisitos
- Um navegador web moderno (Chrome, Firefox, Edge, etc.).
- Conexão com a internet para carregar dependências externas (Firebase, Font Awesome, etc.).

### Instalação
1.  Clone o repositório para sua máquina local:
    ```bash
    git clone https://github.com/seu-usuario/escala-de-intercessores.git
    ```
2.  Abra o arquivo `index.html` em seu navegador.

A aplicação utiliza o Firebase para autenticação e armazenamento de dados na nuvem, permitindo que você acesse suas escalas de qualquer lugar.
