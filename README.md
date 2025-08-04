# Escala de Intercessores

![Logotipo Escala de Intercessores](image/logo.png)

**Escala de Intercessores** é uma aplicação web desenvolvida para facilitar a gestão e geração de escalas de intercessão para grupos religiosos. Com uma interface intuitiva e um design visual inspirado em um tema ardente e espiritual, a aplicação permite o cadastro de membros, gerenciamento de restrições (temporárias e permanentes), suspensões granulares e a criação de escalas mensais com distribuição inteligente.

## 📋 Funcionalidades

- **Cadastro de Membros**: Registre membros com informações como nome, gênero e cônjuge (se aplicável).
- **Gerenciamento de Suspensão**: Suspenda membros de forma total ou parcial (apenas de cultos, reuniões online ou oração no WhatsApp), mantendo o histórico sem precisar excluí-los para ausências temporárias.
- **Períodos de Restrição**: Defina períodos em que membros não podem participar da escala, com tratamento correto de datas para evitar problemas de fuso horário.
- **Restrições Permanentes**: Registre dias da semana em que membros têm restrições fixas.
- **Geração de Escala Inteligente**: Crie escalas mensais para:
  - Cultos (Quarta, Domingo Manhã e Noite).
  - Reuniões Online (Sábado).
  - Oração no WhatsApp (Diário), com uma distribuição inteligente que busca espaçar as participações de um mesmo membro por pelo menos 3 dias, garantindo um rodízio mais justo.
- **Exportação e Importação de Dados**:
  - Exporte todos os dados (membros, restrições e suspensões) em formato JSON.
  - Exporte a escala gerada em formato XLSX para fácil compartilhamento.
  - Importe dados salvos em JSON, com retrocompatibilidade para atualizar estruturas de dados antigas.
- **Relatório de Participações**: Visualize a quantidade de participações de cada membro na escala gerada.
- **Limpeza de Dados**: Opção para limpar todos os dados armazenados com confirmação.

## 🎨 Design e Estilo

O design da aplicação foi inspirado no logotipo, que reflete um tema ardente e espiritual com tons de laranja e vermelho. As melhorias visuais incluem:

- **Paleta de Cores Ardente**: Uso de gradientes laranja-vermelho em botões, bordas e fundo para refletir o fervor espiritual.
- **Botões Modernos**: Botões com gradientes, efeitos de brilho, elevação e feedback ao clicar, diferenciados por função.
- **Animações Sutis**: Efeitos de slide nas abas, brilho pulsante no logotipo e transições suaves em elementos interativos.
- **Tipografia Impactante**: Títulos com gradientes e sombras para maior legibilidade e destaque.
- **Feedback Visual Aprimorado**: Campos de entrada, caixas de seleção e itens de lista com efeitos de brilho e hover. Indicadores visuais para membros suspensos (ícone de pausa, texto riscado e dicas de ferramenta) para uma gestão clara e rápida.
- **Modais Intuitivos**: Uso de janelas modais para ações complexas, como o gerenciamento granular de suspensões, mantendo a interface principal limpa.
- **Rodapé Temático**: Um rodapé com gradiente ardente para reforçar o branding.

## 🚀 Como Usar

### Pré-requisitos

- Um navegador web moderno (Chrome, Firefox, Edge, etc.).
- Conexão com a internet para carregar dependências externas (Firebase, Font Awesome, Google Fonts e XLSX).

### Instalação

1.  Clone o repositório para sua máquina local:
    ```bash
    git clone https://github.com/seu-usuario/escala-de-intercessores.git
    ```
2.  Abra o arquivo `index.html` em seu navegador.

A aplicação utiliza o Firebase para autenticação e armazenamento de dados na nuvem, permitindo que você acesse suas escalas de qualquer lugar.
