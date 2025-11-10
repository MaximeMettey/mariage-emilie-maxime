// Gestion de l'authentification et des vues
const loginView = document.getElementById('loginView');
const appView = document.getElementById('appView');

// Vérifier l'authentification au chargement
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth');
        const data = await response.json();

        if (data.authenticated) {
            showApp();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        showLogin();
    }
}

// Afficher la vue de connexion
function showLogin() {
    loginView.style.display = 'block';
    appView.style.display = 'none';
    document.body.className = 'login-page';
}

// Afficher l'application
function showApp() {
    loginView.style.display = 'none';
    appView.style.display = 'block';
    document.body.className = '';

    // Initialiser le lecteur de musique si pas déjà fait
    if (typeof loadMusicTracks === 'function' && !window.musicInitialized) {
        loadMusicTracks();
        window.musicInitialized = true;
    }

    // Initialiser le router
    if (typeof router !== 'undefined' && !window.routerInitialized) {
        router.init();
        window.routerInitialized = true;
    }
}

// Gérer la soumission du formulaire
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const code = document.getElementById('accessCode').value;
        const errorMessage = document.getElementById('errorMessage');
        const submitBtn = e.target.querySelector('button[type="submit"]');

        // Désactiver le bouton pendant la requête
        submitBtn.disabled = true;
        submitBtn.textContent = 'Vérification...';
        errorMessage.style.display = 'none';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showApp();
            } else {
                errorMessage.textContent = data.error || 'Code d\'accès incorrect';
                errorMessage.style.display = 'block';
                document.getElementById('accessCode').value = '';
                document.getElementById('accessCode').focus();
            }
        } catch (error) {
            errorMessage.textContent = 'Erreur de connexion. Veuillez réessayer.';
            errorMessage.style.display = 'block';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Accéder à la galerie';
        }
    });
}

// Gérer la déconnexion
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            window.location.href = '/';
        }
    });
}

// Initialiser au chargement
checkAuth();
