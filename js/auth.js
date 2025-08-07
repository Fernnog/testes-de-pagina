//
// MÓDULO DE AUTENTICAÇÃO (auth.js)
// Responsável pelo registro, login, logout e gerenciamento do estado de autenticação do usuário.
//

import { showTab, showToast } from './ui.js';

/**
 * Configura todos os listeners relacionados à autenticação.
 * @param {firebase.auth.Auth} auth - A instância de autenticação do Firebase.
 * @param {Function} onLoginSuccess - A função de callback a ser executada quando o login for bem-sucedido.
 */
export function setupAuthListeners(auth, onLoginSuccess) {
    const btnRegistro = document.getElementById('btnRegistro');
    const btnLogin = document.getElementById('btnLogin');

    // Listener para o botão de Registro
    if (btnRegistro) {
        btnRegistro.addEventListener('click', () => {
            const email = document.getElementById('emailAuth').value;
            const senha = document.getElementById('senhaAuth').value;
            if (!email || !senha) {
                showToast('Por favor, preencha e-mail e senha.', 'error');
                return;
            }
            auth.createUserWithEmailAndPassword(email, senha)
                .then(() => {
                    showToast('Usuário registrado com sucesso! Bem-vindo(a).', 'success');
                    // Não chama onLoginSuccess aqui, pois o onAuthStateChanged fará isso.
                })
                .catch((error) => {
                    showToast('Erro ao registrar: ' + error.message, 'error');
                });
        });
    }

    // Listener para o botão de Login
    if (btnLogin) {
        btnLogin.addEventListener('click', () => {
            const email = document.getElementById('emailAuth').value;
            const senha = document.getElementById('senhaAuth').value;
            if (!email || !senha) {
                showToast('Por favor, preencha e-mail e senha.', 'error');
                return;
            }
            auth.signInWithEmailAndPassword(email, senha)
                .then(() => {
                    showToast('Login bem-sucedido!', 'success');
                    // Não chama onLoginSuccess aqui, pois o onAuthStateChanged fará isso.
                })
                .catch((error) => {
                    showToast('Erro ao fazer login: ' + error.message, 'error');
                });
        });
    }


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
        showToast('Logout bem-sucedido!', 'success');
    }).catch((error) => {
        showToast('Erro ao fazer logout: ' + error.message, 'error');
    });
}