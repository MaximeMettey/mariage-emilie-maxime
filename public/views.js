// Fonctions pour générer les vues

// Vue d'accueil (Welcome)
async function renderWelcomeView() {
    const container = document.getElementById('appContent');

    try {
        const response = await fetch('/api/config');
        const config = await response.json();

        container.innerHTML = `
            <div class="welcome-page">
                <div class="welcome-container">
                    <div class="welcome-card">
                        <div class="welcome-header">
                            <h1 class="couple-names">Émilie & Maxime</h1>
                            <div class="wedding-date">8 Novembre 2025</div>
                            <div class="wedding-location">Château de Villersexel</div>
                        </div>

                        <div class="divider"></div>

                        <div class="welcome-content">
                            <div class="welcome-image-container">
                                <img src="${config.welcomeImage}" alt="Photo de remerciement" class="welcome-image" onerror="this.parentElement.style.display='none'">
                            </div>

                            <h2 class="welcome-title">${config.welcomeTitle}</h2>
                            <p class="welcome-message">${config.welcomeMessage}</p>

                            <div class="welcome-actions">
                                <a href="/gallery" class="btn-primary btn-large" data-route="gallery">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                        <polyline points="21 15 16 10 5 21"></polyline>
                                    </svg>
                                    Voir la galerie
                                </a>
                                <a href="/providers" class="btn-secondary btn-large" data-route="providers">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    Nos prestataires
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erreur lors du chargement de la configuration:', error);
        container.innerHTML = `
            <div class="error-container">
                <p>Erreur lors du chargement de la page d'accueil.</p>
            </div>
        `;
    }
}

// Vue des prestataires
async function renderProvidersView() {
    const container = document.getElementById('appContent');

    try {
        const response = await fetch('/api/providers');
        const data = await response.json();

        let providersHTML = '';
        data.providers.forEach(provider => {
            // Construire les liens conditionnellement
            let linksHTML = '<div class="provider-links">';

            // Lien avis Google (toujours présent si reviewLink existe)
            if (provider.reviewLink && provider.reviewLink.trim() !== '') {
                linksHTML += `
                    <a href="${provider.reviewLink}" target="_blank" rel="noopener" class="provider-link provider-link-review">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        Laisser un avis
                    </a>
                `;
            }

            // Lien site web (seulement si websiteLink existe et n'est pas vide)
            if (provider.websiteLink && provider.websiteLink.trim() !== '') {
                const isInstagram = provider.websiteLink.includes('instagram.com');
                const iconSVG = isInstagram ? `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                    </svg>
                ` : `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                `;
                const linkText = isInstagram ? 'Instagram' : 'Site web';

                linksHTML += `
                    <a href="${provider.websiteLink}" target="_blank" rel="noopener" class="provider-link">
                        ${iconSVG}
                        ${linkText}
                    </a>
                `;
            }

            linksHTML += '</div>';

            providersHTML += `
                <div class="provider-card-large">
                    <div class="provider-logo">
                        <img src="${provider.logo}" alt="${provider.company}" onerror="this.style.display='none'">
                    </div>
                    <div class="provider-info">
                        <h3 class="provider-name">${provider.name}</h3>
                        <p class="provider-company">${provider.company}</p>
                        <p class="provider-description">${provider.description}</p>
                        ${linksHTML}
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
            <div class="providers-page">
                <main class="providers-main">
                    <header class="providers-header">
                        <h1 class="providers-title">Nos Prestataires</h1>
                        <p class="providers-subtitle">
                            Un immense merci à tous nos prestataires qui ont contribué à rendre cette journée inoubliable.
                            N'hésitez pas à leur laisser un avis si vous les avez appréciés !
                        </p>
                    </header>

                    <div class="providers-grid">
                        ${providersHTML}
                    </div>
                </main>
            </div>
        `;
    } catch (error) {
        console.error('Erreur lors du chargement des prestataires:', error);
        container.innerHTML = `
            <div class="error-container">
                <p>Erreur lors du chargement des prestataires.</p>
            </div>
        `;
    }
}

// Vue de la galerie (référence vers les fonctions existantes dans app.js)
async function renderGalleryView() {
    const container = document.getElementById('appContent');
    container.innerHTML = `
        <div class="gallery-page">
            <header class="gallery-header">
                <div class="header-content">
                    <h1 class="page-title">Notre Galerie</h1>
                    <button id="downloadAllBtn" class="btn-secondary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Tout télécharger
                    </button>
                </div>
            </header>

            <div id="foldersContainer" class="folders-container">
                <div class="loading">Chargement des médias...</div>
            </div>
        </div>
    `;

    // Charger la galerie via les fonctions existantes
    if (typeof loadMedia === 'function') {
        await loadMedia();
    }
}
