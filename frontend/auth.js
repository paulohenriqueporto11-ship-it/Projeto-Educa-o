// Arquivo: auth.js

(function() {
    // --- 1. RECUPERA DADOS DO LOCALSTORAGE ---
    const token = localStorage.getItem('estuda_ia_token');
    let userId = localStorage.getItem('estuda_ia_userid');
    const userName = localStorage.getItem('estuda_ia_name');
    
    // --- 2. LÓGICA DE CONVIDADO (GUEST) ---
    // Se não tiver login real, usamos ou criamos um ID de convidado
    let isGuest = false;
    
    if (!userId) {
        isGuest = true;
        // Tenta recuperar um ID de convidado antigo ou cria um novo
        let guestId = localStorage.getItem('estuda_ia_guest_id');
        if (!guestId) {
            guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('estuda_ia_guest_id', guestId);
        }
        userId = guestId;
    }

    // --- 3. CRIA OBJETO GLOBAL (Para usar nos outros scripts) ---
    window.UserSession = {
        isLogged: !!token, // True se tem token, False se é convidado
        id: userId,        // ID Real ou ID Convidado
        name: userName || "Visitante",
        token: token,

        // Função para deslogar
        logout: function() {
            if (confirm("Deseja realmente sair?")) {
                localStorage.removeItem('estuda_ia_token');
                localStorage.removeItem('estuda_ia_userid');
                localStorage.removeItem('estuda_ia_name');
                localStorage.removeItem('estuda_ia_email');
                window.location.href = "index.html"; // Manda pra home
            }
        },

        // Função para proteger páginas (bloquear acesso de convidados)
        forceLogin: function() {
            if (!this.isLogged) {
                alert("Você precisa estar logado para acessar esta página.");
                window.location.href = "login.html";
            }
        }
    };

    console.log(`👤 Sessão Iniciada: ${window.UserSession.isLogged ? 'Logado' : 'Convidado'} (ID: ${userId})`);

    // --- 4. ATUALIZAÇÃO AUTOMÁTICA DA UI (NAVBAR) ---
    // Espera o HTML carregar para mudar o botão
    document.addEventListener("DOMContentLoaded", () => {
        const authBtn = document.getElementById('authBtn');
        const welcomeMsg = document.getElementById('welcomeMsg'); // Opcional, se quiser mostrar "Olá, Pedro"

        if (authBtn) {
            if (window.UserSession.isLogged) {
                authBtn.innerText = "Sair";
                authBtn.href = "#";
                authBtn.classList.add('logged-in'); // Classe extra para CSS se quiser
                authBtn.onclick = (e) => {
                    e.preventDefault();
                    window.UserSession.logout();
                };
            } else {
                authBtn.innerText = "Entrar";
                authBtn.href = "login.html";
            }
        }
        
        if (welcomeMsg && window.UserSession.isLogged) {
            welcomeMsg.innerText = `Olá, ${window.UserSession.name.split(' ')[0]}`;
        }
    });

    
if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((reg) => console.log('✅ PWA Registrado:', reg.scope))
                .catch((err) => console.log('❌ Falha no PWA:', err));
        });
    }

})();
