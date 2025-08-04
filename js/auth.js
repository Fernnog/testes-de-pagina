// js/auth.js

import { showTab, atualizarTodasAsListas, showToast } from './ui.js';
import { carregarDados } from './data-manager.js';

/**
 * Configura todos os listeners relacionados à autenticação.
 * @param {firebase.auth.Auth} auth - A instância de autenticação do Firebase.
 * @param {firebase.database.Database} database - A instância do Realtime Database do Firebase.
 */
export function setupAuthentication(auth, database) {

    const formRegistro = document.getElementById('formRegistro');
    const formLogin = document.getElementById('formLogin');
    const logoutButton = document.getElementById('logout');

    // Listener para o formulário de registro
    formRegistro.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('emailRegistro').value;
        const senha = document.getElementById('senhaRegistro').value;

        auth.createUserWithEmailAndPassword(email, senha)
            .then((userCredential) => {
                showToast('Usuário registrado com sucesso!', 'success');
                // O onAuthStateChanged vai lidar com a transição de tela
            })
            .catch((error) => {
                showToast(`Erro ao registrar: ${error.message}`, 'warning');
            });
    });

    // Listener para o formulário de login
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('emailLogin').value;
        const senha = document.getElementById('senhaLogin').value;

        auth.signInWithEmailAndPassword(email, senha)
            .then((userCredential) => {
                showToast('Login bem-sucedido!', 'success');
                // O onAuthStateChanged vai lidar com o carregamento dos dados
            })
            .catch((error) => {
                showToast(`Erro ao fazer login: ${error.message}`, 'warning');
            });
    });

    // Listener para o botão de logout
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => {
            showToast('Logout bem-sucedido!');
        });
    });

    // Observador principal do estado de autenticação
    auth.onAuthStateChanged((user) => {
        if (user) {
            logoutButton.style.display = 'block';
            showTab('cadastro');
            // Após o login, carrega os dados e, no final, atualiza a UI
            carregarDados(auth, database, () => {
                atualizarTodasAsListas();
            });
        } else {
            logoutButton.style.display = 'none';
            showTab('auth');
            // Limpa as listas na tela se o usuário fizer logout
            atualizarTodasAsListas([]);
        }
    });
}
