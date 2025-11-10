// Gestion du menu burger mobile

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle du menu burger
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('open');
            navMenu.classList.toggle('open');
        });
    }

    // Fermer le menu quand on clique sur un lien
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                menuToggle.classList.remove('open');
                navMenu.classList.remove('open');
            }
        });
    });

    // Fermer le menu si on clique en dehors
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            const isClickInsideMenu = navMenu.contains(e.target);
            const isClickOnToggle = menuToggle.contains(e.target);

            if (!isClickInsideMenu && !isClickOnToggle && navMenu.classList.contains('open')) {
                menuToggle.classList.remove('open');
                navMenu.classList.remove('open');
            }
        }
    });

    // Fermer le menu si la fenêtre est redimensionnée au-dessus de 768px
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && navMenu.classList.contains('open')) {
            menuToggle.classList.remove('open');
            navMenu.classList.remove('open');
        }
    });
});
