// Router SPA simple
class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;

        // Intercepter les clics sur les liens
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                this.navigate(route);
            }
        });

        // Gérer le bouton retour du navigateur
        window.addEventListener('popstate', () => {
            this.handleLocation();
        });
    }

    // Enregistrer une route
    register(path, handler) {
        this.routes[path] = handler;
    }

    // Naviguer vers une route
    navigate(path) {
        // Mettre à jour l'URL sans recharger
        const url = path === 'welcome' ? '/' : `/${path}`;
        window.history.pushState({}, '', url);

        // Charger la nouvelle vue
        this.handleLocation();
    }

    // Gérer la route actuelle
    async handleLocation() {
        const path = window.location.pathname;

        // Déterminer quelle route correspond
        let route = 'welcome';
        if (path === '/gallery') {
            route = 'gallery';
        } else if (path === '/providers') {
            route = 'providers';
        } else if (path === '/admin') {
            route = 'admin';
        }

        // Mettre à jour la classe active dans le menu
        document.querySelectorAll('.nav-link').forEach(link => {
            const linkRoute = link.getAttribute('data-route');
            if (linkRoute === route) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Charger la vue
        if (this.routes[route]) {
            this.currentRoute = route;
            await this.routes[route]();
        } else {
            // Route par défaut
            this.navigate('welcome');
        }
    }

    // Initialiser le router
    init() {
        this.handleLocation();
    }
}

// Instance globale du router
const router = new Router();

// Gestion du menu burger pour mobile
document.addEventListener('DOMContentLoaded', () => {
    const burgerToggle = document.getElementById('burgerToggle');
    const mainNav = document.getElementById('mainNav');
    const navLinks = document.querySelectorAll('.nav-link');
    const burgerIcon = document.getElementById('burgerIcon');
    const closeIcon = document.getElementById('closeIcon');

    if (burgerToggle && mainNav && burgerIcon && closeIcon) {
        // Toggle du menu au clic sur le burger
        burgerToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = mainNav.classList.toggle('menu-open');

            // Changer l'icône
            if (isOpen) {
                burgerIcon.style.display = 'none';
                closeIcon.style.display = 'block';
            } else {
                burgerIcon.style.display = 'block';
                closeIcon.style.display = 'none';
            }
        });

        // Fermer le menu au clic sur un lien
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('menu-open');
                burgerIcon.style.display = 'block';
                closeIcon.style.display = 'none';
            });
        });

        // Fermer le menu au clic en dehors
        document.addEventListener('click', (e) => {
            if (mainNav.classList.contains('menu-open') &&
                !mainNav.contains(e.target)) {
                mainNav.classList.remove('menu-open');
                burgerIcon.style.display = 'block';
                closeIcon.style.display = 'none';
            }
        });

        // Fermer le menu avec la touche Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mainNav.classList.contains('menu-open')) {
                mainNav.classList.remove('menu-open');
                burgerIcon.style.display = 'block';
                closeIcon.style.display = 'none';
            }
        });
    }
});
