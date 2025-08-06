//
// MÓDULO DE AUTENTICAÇÃO (auth.js)
// Responsável pelo registro, login, logout e gerenciamento do estado de autenticação do usuário.
// VERSÃO ATUALIZADA: Implementa formulário unificado e fluxo de erro inteligente.
//

import { showTab } from './ui.js';

/**
 * Configura todos os listeners relacionados à autenticação.
 * @param {firebase.auth.Auth} auth - A instância de autenticação do Firebase.
 * @param {Function} onLoginSuccess - A função de callback a ser executada quando o login for bem-sucedido.
 */
export function setupAuthListeners(auth, onLoginSuccess) {
    const btnLogin = document.getElementById('btnLogin');
    const btnRegistro = document.getElementById('btnRegistro');

    /**
     * Função auxiliar para obter as credenciais do formulário unificado.
     * @returns {{email: string, senha: string}}
     */
    const getAuthCredentials = () => {
        const email = document.getElementById('emailAuth').value;
        const senha = document.getElementById('senhaAuth').value;
        return { email, senha };
    };

    /**
     * Função auxiliar para registrar um novo usuário.
     * @param {string} email - O e-mail para registro.
     * @param {string} senha - A senha para registro.
     */
    const performRegistration = (email, senha) => {
        auth.createUserWithEmailAndPassword(email, senha)
            .then(() => {
                alert('Usuário registrado com sucesso! Você já está logado.');
            })
            .catch((error) => {
                alert('Erro ao registrar: ' + error.message);
            });
    };

    // Listener para o botão de Login
    btnLogin.addEventListener('click', () => {
        const { email, senha } = getAuthCredentials();
        if (!email || !senha) {
            alert('Por favor, preencha e-mail e senha.');
            return;
        }
        auth.signInWithEmailAndPassword(email, senha)
            .then(() => {
                alert('Login bem-sucedido!');
            })
            .catch((error) => {
                // PRIORIDADE 2: Melhoria de UX com fluxo de erro inteligente
                if (error.code === 'auth/user-not-found') {
                    if (confirm('Usuário não encontrado. Deseja se registrar com este e-mail e senha?')) {
                        performRegistration(email, senha);
                    }
                } else {
                    alert('Erro ao fazer login: ' + error.message);
                }
            });
    });

    // Listener para o botão de Registro
    btnRegistro.addEventListener('click', () => {
        const { email, senha } = getAuthCredentials();
        if (!email || !senha) {
            alert('Por favor, preencha e-mail e senha.');
            return;
        }
        performRegistration(email, senha);
    });

    // Listener de Estado de Autenticação (o ponto central de controle)
    auth.onAuthStateChanged((user) => {
        const logoutButton = document.getElementById('logout');
        if (user) {
            // Usuário está logado
            logoutButton.style.display = 'block';
            showTab('cadastro');
            onLoginSuccess(); // Dispara o carregamento de dados e atualização da UI
        } else {
            // Usuário está deslogado
            logoutButton.style.display = 'none';
            showTab('auth');
        }
    });
}

/**
 * Executa o processo de logout do usuário.
 * @param {firebase.auth.Auth} auth - A instância de autenticação do Firebase.
 */
export function handleLogout(auth) {
    auth.signOut().then(() => {
        alert('Logout bem-sucedido!');
    }).catch((error) => {
        alert('Erro ao fazer logout: ' + error.message);
    });
}
