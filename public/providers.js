// Vérifier l'authentification au chargement
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth');
        const data = await response.json();

        if (!data.authenticated) {
            window.location.href = '/';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Erreur de vérification d\'authentification:', error);
        window.location.href = '/';
        return false;
    }
}

// Déconnexion
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        window.location.href = '/';
    }
}

// Événements
document.getElementById('logoutBtn').addEventListener('click', logout);

// Initialisation
checkAuth();
