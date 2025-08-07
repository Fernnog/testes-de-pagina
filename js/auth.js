//
// MÓDULO DE AUTENTICAÇÃO (auth.js)
// Responsável pelo registro, login, logout e gerenciamento do estado de autenticação do usuário.
//

import { showTab } from './ui.js';

/**
 * Configura todos os listeners relacionados à autenticação.
 * @param {firebase.auth.Auth} auth - A instância de autenticação do Firebase.
 * @param {Function} onLoginSuccess - A função de callback a ser executada quando o login for bem-sucedido.
 */
export function setupAuthListeners(auth, onLoginSuccess) {
    const formRegistro = document.getElementById('formRegistro');
    const formLogin = document.getElementById('formLogin');

    // Listener para o formulário de Registro
    formRegistro.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('emailRegistro').value;
        const senha = document.getElementById('senhaRegistro').value;
        auth.createUserWithEmailAndPassword(email, senha)
            .then(() => {
                alert('Usuário registrado com sucesso!');
                // Não chama onLoginSuccess aqui, pois o onAuthStateChanged fará isso.
            })
            .catch((error) => {
                alert('Erro ao registrar: ' + error.message);
            });
    });

    // Listener para o formulário de Login
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('emailLogin').value;
        const senha = document.getElementById('senhaLogin').value;
        auth.signInWithEmailAndPassword(email, senha)
            .then(() => {
                alert('Login bem-sucedido!');
                // Não chama onLoginSuccess aqui, pois o onAuthStateChanged fará isso.
            })
            .catch((error) => {
                alert('Erro ao fazer login: ' + error.message);
            });
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
