// js/tinymce-config.js

const APP_VERSION = '1.0.1';

const TINYMCE_CONFIG = {
    selector: '#editor',
    
    plugins: 'lists pagebreak visualblocks wordcount',
    
    toolbar: 'undo redo | blocks | bold italic underline | bullist numlist | alignjustify | customIndent customBlockquote | pagebreak visualblocks | customMicButton customAiButton customReplaceButton | customPasteMarkdown customCopyFormatted customOdtButton | customThemeButton customDeleteButton',
    
    menubar: false,
    statusbar: true,
    
    formats: {
        bold: { inline: 'strong' },
        italic: { inline: 'em' },
        underline: { inline: 'u', exact: true },
    },

     setup: (editor) => {
        // Esta função é executada quando o editor é inicializado.
        editor.on('init', () => {
            // 'init' garante que o editor está totalmente renderizado.
            
            // 1. Encontra o elemento de branding "Powered by Tiny" na barra de status.
            const brandingElement = editor.getContainer().querySelector('.tox-statusbar__branding');

            if (brandingElement) {
                // 2. Cria um novo elemento <span> para a nossa versão.
                const versionLabel = document.createElement('span');
                versionLabel.className = 'app-version-label'; // Aplica o nosso estilo CSS.
                versionLabel.textContent = `v${APP_VERSION}`;
                versionLabel.title = `Versão da Aplicação`;

                // 3. Insere o rótulo da versão ANTES do elemento de branding.
                brandingElement.parentNode.insertBefore(versionLabel, brandingElement);
            }
        });
    },
    
    content_style: 'body { font-family:Arial,sans-serif; font-size:16px; line-height: 1.5; text-align: justify; color: var(--editor-text-color); } p { margin-bottom: 1em; } blockquote { margin-left: 7cm; margin-right: 0; padding-left: 15px; border-left: 3px solid #ccc; color: #333; font-style: italic; } blockquote p { text-indent: 0 !important; }',
    
    height: "100%",
    autoresize_bottom_margin: 30,

     setup: (editor) => {
        // --- INÍCIO DA NOVA LÓGICA DE VERSÃO ---
        // O evento 'init' é disparado quando o editor está totalmente carregado e pronto.
        editor.on('init', () => {
            // Encontra o elemento de branding "Powered by Tiny" na barra de status.
            const brandingElement = editor.getContainer().querySelector('.tox-statusbar__branding');

            // Verifica se o elemento de branding foi encontrado antes de prosseguir.
            if (brandingElement) {
                // Cria um novo elemento <span> para conter o número da versão.
                const versionLabel = document.createElement('span');
                
                // Aplica a classe CSS que definimos em style.css para estilização.
                versionLabel.className = 'app-version-label'; 
                
                // Define o texto do rótulo, buscando da nossa constante.
                versionLabel.textContent = `v${APP_VERSION}`;
                versionLabel.title = `Versão da Aplicação`;

                // Insere o nosso rótulo de versão na árvore do DOM,
                // posicionando-o exatamente ANTES do elemento de branding.
                brandingElement.parentNode.insertBefore(versionLabel, brandingElement);
            }
        });
        // --- FIM DA NOVA LÓGICA DE VERSÃO ---

        // ==============================================================================
        // Registro dos botões personalizados na barra de ferramentas (código original mantido)
        // ==============================================================================

        // Seletor de Tema
        editor.ui.registry.addMenuButton('theme-selector', {
            text: 'Tema',
            tooltip: 'Selecionar Tema do Editor',
            fetch: (callback) => {
                const items = [
                    { type: 'menuitem', text: 'Modo Claro', onAction: () => document.body.className = 'theme-light' },
                    { type: 'menuitem', text: 'Modo Escuro', onAction: () => document.body.className = 'theme-dark' },
                    { type: 'menuitem', text: 'Amarelo Suave', onAction: () => document.body.className = 'theme-custom-yellow' }
                ];
                callback(items);
            }
        });
        
        // Botão para corrigir texto de PDF
        editor.ui.registry.addButton('fix-pdf-text-btn', {
            text: 'Corrigir PDF',
            tooltip: 'Remover quebras de linha de texto copiado de PDF',
            onAction: () => {
                if(typeof EditorActions !== 'undefined' && EditorActions.removeLineBreaks) {
                    EditorActions.removeLineBreaks();
                } else {
                    console.error("EditorActions.removeLineBreaks não encontrado.");
                }
            }
        });

        // Botão para gerenciar substituições
        editor.ui.registry.addButton('manage-replacements-btn', {
            text: 'Substituições',
            tooltip: 'Gerenciar Substituições Automáticas',
            onAction: () => {
                 if(typeof ModalManager !== 'undefined') {
                    ModalManager.show({ type: 'replacementManager' });
                } else {
                    console.error("ModalManager não encontrado.");
                }
            }
        });

        // Botão de Ditado por Voz
        editor.ui.registry.addButton('dictate-btn', {
            icon: 'microphone',
            tooltip: 'Ditar texto',
            onAction: () => {
                if(typeof SpeechRecognitionModule !== 'undefined') {
                    SpeechRecognitionModule.toggleDictationModal();
                } else {
                    console.error("SpeechRecognitionModule não encontrado.");
                }
            }
        });
    },

        // Botão de Ajustar Texto Quebrado (substituindo o de IA)
        editor.ui.registry.addButton('customAiButton', {
            icon: 'custom-join-lines',
            tooltip: 'Ajustar Texto Quebrado (de PDF)',
            onAction: function(api) {
                ModalManager.show({
                    type: 'textFixer',
                    title: 'Ajustar Texto Quebrado',
                    saveButtonText: 'Ajustar e Inserir',
                    onSave: (data) => {
                        if (data.text) {
                            // Lógica principal: remove quebras de linha e espaços extras
                            const textoAjustado = data.text.replace(/\n/g, ' ').trim();
                            
                            // Insere o texto processado no editor
                            editor.execCommand('mceInsertContent', false, textoAjustado);
                            NotificationService.show('Texto ajustado e inserido com sucesso!', 'success');
                        } else {
                            NotificationService.show('Nenhum texto foi inserido na caixa.', 'info');
                        }
                    }
                });
            }
        });

        // Botão de Substituir Termos
        editor.ui.registry.addButton('customReplaceButton', {
            icon: 'custom-replace',
            tooltip: 'Gerenciar Substituições',
            onAction: function () {
                ModalManager.show({
                    type: 'replacementManager',
                    title: 'Gerenciador de Substituições',
                    initialData: { replacements: appState.replacements || [] },
                    onSave: (data) => {
                        modifyStateAndBackup(() => {
                            appState.replacements = data.replacements;
                        });
                        NotificationService.show('Regras de substituição salvas!', 'success');
                    }
                });
            }
        });

        // NOVO BOTÃO: Colar do Markdown
        editor.ui.registry.addButton('customPasteMarkdown', {
            icon: 'custom-paste-markdown',
            tooltip: 'Colar do Markdown',
            onAction: async function() {
                try {
                    const textFromClipboard = await navigator.clipboard.readText();
                    if (textFromClipboard) {
                        const htmlContent = MarkdownConverter.markdownToHtml(textFromClipboard);
                        editor.execCommand('mceInsertContent', false, htmlContent);
                        NotificationService.show('Conteúdo Markdown colado e formatado!', 'success');
                    } else {
                         NotificationService.show('A área de transferência está vazia.', 'info');
                    }
                } catch (error) {
                    console.error('Falha ao ler da área de transferência:', error);
                    NotificationService.show('Não foi possível ler o conteúdo. Verifique as permissões do navegador.', 'error');
                }
            }
        });

        // Botão de Copiar Formatado
        editor.ui.registry.addButton('customCopyFormatted', {
            icon: 'custom-copy-formatted',
            tooltip: 'Copiar como Markdown',
            onAction: async function() {
                try {
                    const htmlContent = editor.getContent();
                    const markdownContent = MarkdownConverter.htmlToMarkdown(htmlContent);
                    
                    await navigator.clipboard.writeText(markdownContent);
                    
                    NotificationService.show('Texto copiado para a área de transferência em formato Markdown!', 'success');
                    
                } catch (error) {
                    console.error('Erro ao copiar como Markdown:', error);
                    NotificationService.show('Ocorreu um erro ao tentar copiar o texto.', 'error');
                }
            }
        });

        // Botão de Download
        editor.ui.registry.addButton('customOdtButton', {
            icon: 'custom-download-doc',
            tooltip: 'Salvar como documento Markdown (.md)',
            onAction: function() {
                const editorContent = editor.getContent();
                try {
                    const markdownContent = MarkdownConverter.htmlToMarkdown(editorContent);
                    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'documento.md';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                } catch (error) {
                    console.error('Erro ao gerar arquivo Markdown:', error);
                    NotificationService.show('Ocorreu um erro ao tentar salvar o documento.', 'error');
                }
            }
        });

        // NOVO BOTÃO: Seletor de Tema
        editor.ui.registry.addMenuButton('customThemeButton', {
            icon: 'custom-paintbrush',
            tooltip: 'Mudar Tema do Editor',
            fetch: function (callback) {
                const items = [
                    {
                        type: 'menuitem',
                        text: 'Modo Claro (Padrão)',
                        onAction: () => applyTheme('light')
                    },
                    {
                        type: 'menuitem',
                        text: 'Modo Escuro',
                        onAction: () => applyTheme('theme-dark')
                    },
                    {
                        type: 'menuitem',
                        text: 'Amarelo Suave',
                        onAction: () => applyTheme('theme-custom-yellow')
                    }
                ];
                callback(items);
            }
        });
        
        // BOTÃO DE APAGAR DOCUMENTO
        editor.ui.registry.addButton('customDeleteButton', {
            icon: 'custom-delete-doc',
            tooltip: 'Apagar todo o conteúdo',
            onAction: function() {
                NotificationService.showConfirm({
                    message: 'Tem certeza que deseja apagar todo o conteúdo do editor? Esta ação não pode ser desfeita.',
                    onConfirm: () => {
                        editor.setContent('');
                        NotificationService.show('Conteúdo do editor apagado.', 'info');
                    }
                });
            }
        });

        // ADICIONADO: Listener para o atalho da Paleta de Comandos dentro do editor
        editor.on('keydown', function(event) {
            if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'p') {
                event.preventDefault();
                event.stopPropagation();
                if (typeof CommandPalette !== 'undefined' && CommandPalette.open) {
                    CommandPalette.open();
                }
            }
        });

        editor.on('init', () => {
            // Carrega e aplica o tema salvo no LocalStorage
            const savedTheme = localStorage.getItem('editorTheme');
            if (savedTheme) {
                applyTheme(savedTheme);
            }
        
            if (typeof SpeechDictation !== 'undefined' && SpeechDictation.isSupported()) {
                SpeechDictation.init({ 
                    micIcon: document.getElementById('dictation-mic-icon'), 
                    langSelect: document.getElementById('dictation-lang-select'), 
                    statusDisplay: document.getElementById('dictation-status'), 
                    dictationModal: document.getElementById('dictation-modal'),
                    toolbarMicButton: editor.getContainer().querySelector('[aria-label="Ditar texto"]'),
                    onResult: (transcript) => { editor.execCommand('mceInsertContent', false, transcript); } 
                });
                const closeBtn = document.getElementById('dictation-close-btn');
                if (closeBtn) closeBtn.addEventListener('click', () => { SpeechDictation.stop(); });
            }
        });
        
        // --- LÓGICA DE DETECÇÃO AUTOMÁTICA DE MARKDOWN (CORRIGIDA) ---
        editor.on('paste_preprocess', function (plugin, args) {
            // Para contornar a limpeza do TinyMCE, extraímos o texto puro
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = args.content;
            const plainText = tempDiv.textContent || "";

            // Critérios de detecção aplicados no texto puro
            const isLikelyMarkdown = (
                /[*_#`[\]()~-]/.test(plainText) && // Contém caracteres de Markdown
                plainText.length > 5 && // Não é muito curto
                // Evita converter trechos de código ou URLs que contenham os caracteres
                !/https?:\/\//.test(plainText)
            );

            if (isLikelyMarkdown) {
                // Convertemos o texto PURO, não o conteúdo já processado pelo TinyMCE
                const htmlContent = MarkdownConverter.markdownToHtml(plainText);
                
                // Substituímos o conteúdo a ser colado pelo nosso HTML convertido
                args.content = htmlContent;
                NotificationService.show('Conteúdo Markdown colado e formatado!', 'info', 2500);
            }
        });

        // --- LÓGICA DE SUBSTITUIÇÃO AUTOMÁTICA ---
        editor.on('keyup', function(e) {
            if (e.keyCode !== 32 && e.keyCode !== 13) return; // Só continua para Espaço ou Enter
            if (!appState.replacements || appState.replacements.length === 0) return;

            const rng = editor.selection.getRng();
            const startNode = rng.startContainer;
            const startOffset = rng.startOffset;

            if (startNode.nodeType !== Node.TEXT_NODE) return;
            
            const textBeforeCursor = startNode.nodeValue.substring(0, startOffset);
            
            const sortedRules = [...appState.replacements].sort((a, b) => b.find.length - a.find.length);

            for (const rule of sortedRules) {
                const triggerNormalSpace = rule.find + ' ';
                const triggerNbsp = rule.find + '\u00A0';

                let triggerFound = null;
                if (textBeforeCursor.endsWith(triggerNormalSpace)) {
                    triggerFound = triggerNormalSpace;
                } else if (textBeforeCursor.endsWith(triggerNbsp)) {
                    triggerFound = triggerNbsp;
                }
                
                if (triggerFound) {
                    const replaceRng = document.createRange();
                    replaceRng.setStart(startNode, startOffset - triggerFound.length);
                    replaceRng.setEnd(startNode, startOffset);

                    editor.selection.setRng(replaceRng);
                    editor.selection.setContent(rule.replace + '\u00A0'); 

                    return;
                }
            }
        });
    }
};
