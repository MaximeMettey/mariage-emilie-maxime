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

// Charger la configuration
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();

        // Mettre à jour le titre
        document.getElementById('welcomeTitle').textContent = config.welcomeTitle;

        // Mettre à jour le message
        document.getElementById('welcomeMessage').textContent = config.welcomeMessage;

        // Mettre à jour l'image
        const img = document.getElementById('welcomeImage');
        img.src = config.welcomeImage;
        img.onerror = () => {
            // Si l'image n'existe pas, cacher le conteneur
            img.parentElement.style.display = 'none';
        };
    } catch (error) {
        console.error('Erreur lors du chargement de la configuration:', error);
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
(async () => {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        await loadConfig();
    }
})();
