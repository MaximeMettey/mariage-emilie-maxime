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

            <div class="upload-banner">
                <div class="upload-banner-content">
                    <p class="upload-message">Vous avez pris de beaux souvenirs de la soirée et souhaitez les partager avec les invités ?</p>
                    <button id="uploadBtn" class="btn-upload">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Envoyer vos photos
                    </button>
                </div>
            </div>

            <div id="foldersContainer" class="folders-container">
                <div class="loading">Chargement des médias...</div>
            </div>
        </div>

        <!-- Modale d'upload -->
        <div id="uploadModal" class="upload-modal" style="display: none;">
            <div class="upload-modal-content">
                <button id="closeUploadModal" class="upload-modal-close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <h2 class="upload-modal-title">Partagez vos souvenirs</h2>
                <p class="upload-modal-subtitle">Sélectionnez les photos que vous souhaitez partager avec nous</p>

                <form id="uploadForm" class="upload-form">
                    <div class="upload-zone" id="uploadZone">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <p>Glissez vos photos/vidéos ou fichiers ZIP ici<br>ou cliquez pour sélectionner</p>
                        <input type="file" id="fileInput" name="photos" multiple accept="image/*,video/*,.zip,application/zip,application/x-zip-compressed" style="display: none;">
                    </div>

                    <div id="filesList" class="files-list"></div>

                    <div class="upload-actions">
                        <button type="button" id="cancelUpload" class="btn-secondary">Annuler</button>
                        <button type="submit" id="submitUpload" class="btn-primary" disabled>Envoyer</button>
                    </div>

                    <div id="uploadProgress" class="upload-progress" style="display: none;">
                        <div class="upload-progress-bar"></div>
                        <p class="upload-progress-text">Envoi en cours...</p>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Charger la galerie via les fonctions existantes
    if (typeof loadMedia === 'function') {
        await loadMedia();
    }

    // Gestion de la modale d'upload
    setupUploadModal();
}

// Gestion de l'upload de photos
function setupUploadModal() {
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadModal = document.getElementById('uploadModal');
    const closeUploadModal = document.getElementById('closeUploadModal');
    const cancelUpload = document.getElementById('cancelUpload');
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const filesList = document.getElementById('filesList');
    const uploadForm = document.getElementById('uploadForm');
    const submitUpload = document.getElementById('submitUpload');
    const uploadProgress = document.getElementById('uploadProgress');

    let selectedFiles = [];

    // Ouvrir la modale
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            uploadModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });
    }

    // Fermer la modale
    const closeModal = () => {
        uploadModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        selectedFiles = [];
        filesList.innerHTML = '';
        submitUpload.disabled = true;
        uploadProgress.style.display = 'none';
    };

    if (closeUploadModal) {
        closeUploadModal.addEventListener('click', closeModal);
    }

    if (cancelUpload) {
        cancelUpload.addEventListener('click', closeModal);
    }

    // Clic sur la zone d'upload
    if (uploadZone) {
        uploadZone.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // Gestion du drag and drop
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('drag-over');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('drag-over');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            addFiles(files);
        });
    }

    // Sélection de fichiers
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            addFiles(files);
        });
    }

    // Ajouter des fichiers
    function addFiles(files) {
        files.forEach(file => {
            if (file.type.startsWith('image/') || file.type.startsWith('video/') ||
                file.type === 'application/zip' || file.type === 'application/x-zip-compressed' ||
                file.name.toLowerCase().endsWith('.zip')) {
                selectedFiles.push(file);
            }
        });
        renderFilesList();
    }

    // Afficher la liste des fichiers
    function renderFilesList() {
        filesList.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';

            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-item-info';

            const fileName = document.createElement('div');
            fileName.className = 'file-item-name';

            // Ajouter une icône pour les fichiers ZIP
            const isZip = file.name.toLowerCase().endsWith('.zip');
            if (isZip) {
                fileName.innerHTML = `📦 ${file.name} <span style="color: var(--color-gold); font-size: 0.8rem;">(sera extrait)</span>`;
            } else {
                fileName.textContent = file.name;
            }

            const fileSize = document.createElement('div');
            fileSize.className = 'file-item-size';
            fileSize.textContent = formatFileSize(file.size);

            fileInfo.appendChild(fileName);
            fileInfo.appendChild(fileSize);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'file-item-remove';
            removeBtn.type = 'button';
            removeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            removeBtn.onclick = () => removeFile(index);

            fileItem.appendChild(fileInfo);
            fileItem.appendChild(removeBtn);
            filesList.appendChild(fileItem);
        });

        submitUpload.disabled = selectedFiles.length === 0;
    }

    // Supprimer un fichier
    function removeFile(index) {
        selectedFiles.splice(index, 1);
        renderFilesList();
    }

    // Formater la taille du fichier
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Soumettre le formulaire
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (selectedFiles.length === 0) return;

            // Afficher la progression
            uploadProgress.style.display = 'block';
            submitUpload.disabled = true;
            cancelUpload.disabled = true;

            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('photos', file);
            });

            try {
                const response = await fetch('/api/upload-photos', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    alert(`${result.count} photo(s) envoyée(s) avec succès ! Merci pour votre partage.`);
                    closeModal();
                    // Recharger la galerie
                    if (typeof loadMedia === 'function') {
                        await loadMedia();
                    }
                } else {
                    throw new Error(result.error || 'Erreur lors de l\'upload');
                }
            } catch (error) {
                console.error('Erreur:', error);
                alert('Une erreur est survenue lors de l\'envoi. Veuillez réessayer.');
                uploadProgress.style.display = 'none';
                submitUpload.disabled = false;
                cancelUpload.disabled = false;
            }
        });
    }
}

// Vue d'administration pour valider les uploads
async function renderAdminView() {
    const container = document.getElementById('appContent');

    container.innerHTML = `
        <div class="admin-page">
            <header class="gallery-header">
                <div class="header-content">
                    <h1 class="page-title">Administration - Validation des uploads</h1>
                    <button id="refreshPendingBtn" class="btn-secondary">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                        </svg>
                        Actualiser
                    </button>
                </div>
            </header>

            <main class="gallery-main">
                <div id="pendingUploadsContainer" class="pending-uploads-container">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Chargement des uploads en attente...</p>
                    </div>
                </div>
            </main>

            <!-- Lightbox Admin -->
            <div id="adminLightbox" class="lightbox" style="display: none;">
                <button id="closeAdminLightbox" class="lightbox-close" title="Fermer (Échap)">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <div class="admin-lightbox-actions">
                    <button id="adminLightboxApprove" class="btn-admin-approve" title="Valider ce média">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Valider</span>
                    </button>
                    <button id="adminLightboxReject" class="btn-admin-reject" title="Rejeter ce média">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        <span>Rejeter</span>
                    </button>
                </div>

                <button id="prevAdminMedia" class="lightbox-nav lightbox-prev" title="Précédent (←)">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>

                <button id="nextAdminMedia" class="lightbox-nav lightbox-next" title="Suivant (→)">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>

                <div class="lightbox-content">
                    <img id="adminLightboxImage" class="lightbox-image" alt="" style="display: none;">
                    <video id="adminLightboxVideo" class="lightbox-video" controls style="display: none;"></video>
                </div>

                <div id="adminLightboxInfo" class="lightbox-info"></div>
            </div>
        </div>
    `;

    // Charger les uploads en attente
    await loadPendingUploads();

    // Gestion du bouton actualiser
    const refreshBtn = document.getElementById('refreshPendingBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadPendingUploads());
    }

    // Gestion de la lightbox admin
    setupAdminLightbox();
}

// État de sélection pour les opérations en lot
let selectedFiles = new Set();

// État de la lightbox admin
let adminPendingMedia = [];
let currentAdminMediaIndex = 0;

// Charger les uploads en attente
async function loadPendingUploads() {
    const container = document.getElementById('pendingUploadsContainer');

    // Réinitialiser la sélection
    selectedFiles.clear();

    try {
        const response = await fetch('/api/admin/pending-uploads');
        const data = await response.json();

        // Stocker les médias pour la lightbox
        adminPendingMedia = data.files;

        if (data.files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    <h2>Aucun upload en attente</h2>
                    <p>Tous les uploads ont été traités</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="pending-uploads-header">
                <h2>${data.files.length} fichier(s) en attente de validation</h2>
            </div>

            <div class="batch-actions-bar">
                <div class="batch-select-all">
                    <label class="checkbox-container">
                        <input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll()">
                        <span class="checkmark"></span>
                        <span class="checkbox-label">Tout sélectionner</span>
                    </label>
                    <span id="selectionCounter" class="selection-counter">0 sélectionné(s)</span>
                </div>
                <div class="batch-actions-buttons">
                    <button id="batchApproveBtn" class="btn-batch-approve" onclick="batchApprove()" disabled>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Valider la sélection
                    </button>
                    <button id="batchRejectBtn" class="btn-batch-reject" onclick="batchReject()" disabled>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Rejeter la sélection
                    </button>
                </div>
            </div>

            <div class="media-grid">
        `;

        data.files.forEach((file, index) => {
            const dateStr = new Date(file.uploadedAt).toLocaleString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const sizeStr = formatFileSize(file.size);

            html += `
                <div class="media-item pending-media-item" data-filename="${file.name}" data-media-index="${index}">
                    <label class="media-checkbox" onclick="event.stopPropagation()">
                        <input type="checkbox" class="file-checkbox" data-filename="${file.name}" onchange="toggleFileSelection('${file.name}')">
                        <span class="media-checkmark"></span>
                    </label>

                    <div class="pending-media-clickable">
                        ${file.type === 'image' ? `
                            <img src="${file.path}" alt="${file.name}">
                        ` : `
                            <video src="${file.path}"></video>
                            <div class="play-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                            </div>
                        `}
                    </div>

                    <div class="pending-media-overlay">
                        <div class="pending-media-info">
                            <div class="pending-media-name">${file.name}</div>
                            <div class="pending-media-meta">${dateStr} • ${sizeStr}</div>
                        </div>
                        <div class="pending-media-actions">
                            <button class="btn-approve" onclick="event.stopPropagation(); approveUpload('${file.name}')">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Valider
                            </button>
                            <button class="btn-reject" onclick="event.stopPropagation(); rejectUpload('${file.name}')">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                                Rejeter
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

        // Ajouter les event listeners pour ouvrir la lightbox
        const mediaItems = document.querySelectorAll('.pending-media-clickable');

        mediaItems.forEach((item) => {
            const parentItem = item.closest('.pending-media-item');
            const index = parseInt(parentItem.dataset.mediaIndex);

            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openAdminLightbox(index);
            });
        });

    } catch (error) {
        console.error('Erreur lors du chargement des uploads:', error);
        container.innerHTML = `
            <div class="error-state">
                <p>Erreur lors du chargement des uploads en attente</p>
            </div>
        `;
    }
}

// Gérer la sélection/désélection d'un fichier
function toggleFileSelection(filename) {
    if (selectedFiles.has(filename)) {
        selectedFiles.delete(filename);
    } else {
        selectedFiles.add(filename);
    }
    updateBatchUI();
}

// Tout sélectionner / Tout désélectionner
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const fileCheckboxes = document.querySelectorAll('.file-checkbox');

    selectedFiles.clear();

    if (selectAllCheckbox.checked) {
        fileCheckboxes.forEach(checkbox => {
            checkbox.checked = true;
            selectedFiles.add(checkbox.dataset.filename);
        });
    } else {
        fileCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    updateBatchUI();
}

// Mettre à jour l'interface des actions en lot
function updateBatchUI() {
    const counter = document.getElementById('selectionCounter');
    const batchApproveBtn = document.getElementById('batchApproveBtn');
    const batchRejectBtn = document.getElementById('batchRejectBtn');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const fileCheckboxes = document.querySelectorAll('.file-checkbox');

    const selectedCount = selectedFiles.size;

    // Mettre à jour le compteur
    if (counter) {
        counter.textContent = `${selectedCount} sélectionné(s)`;
    }

    // Activer/désactiver les boutons d'action
    const hasSelection = selectedCount > 0;
    if (batchApproveBtn) batchApproveBtn.disabled = !hasSelection;
    if (batchRejectBtn) batchRejectBtn.disabled = !hasSelection;

    // Mettre à jour l'état du "Tout sélectionner"
    if (selectAllCheckbox && fileCheckboxes.length > 0) {
        selectAllCheckbox.checked = selectedCount === fileCheckboxes.length;
        selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < fileCheckboxes.length;
    }
}

// Valider la sélection en lot
async function batchApprove() {
    const count = selectedFiles.size;
    if (count === 0) return;

    if (!confirm(`Valider ${count} fichier(s) sélectionné(s) ?`)) return;

    try {
        const response = await fetch('/api/admin/batch-approve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filenames: Array.from(selectedFiles) })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            await loadPendingUploads();
        } else {
            throw new Error(result.error || 'Erreur lors de la validation en lot');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors de la validation en lot');
    }
}

// Rejeter la sélection en lot
async function batchReject() {
    const count = selectedFiles.size;
    if (count === 0) return;

    if (!confirm(`Rejeter et supprimer définitivement ${count} fichier(s) sélectionné(s) ?\n\nCette action est irréversible.`)) return;

    try {
        const response = await fetch('/api/admin/batch-reject', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filenames: Array.from(selectedFiles) })
        });

        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            await loadPendingUploads();
        } else {
            throw new Error(result.error || 'Erreur lors du rejet en lot');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors du rejet en lot');
    }
}

// Valider un upload
async function approveUpload(filename) {
    if (!confirm(`Valider ce fichier ?\n${filename}`)) return;

    try {
        const response = await fetch('/api/admin/approve-upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Fichier validé avec succès !');
            await loadPendingUploads();
        } else {
            throw new Error(result.error || 'Erreur lors de la validation');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors de la validation');
    }
}

// Rejeter un upload
async function rejectUpload(filename) {
    if (!confirm(`Rejeter et supprimer définitivement ce fichier ?\n${filename}\n\nCette action est irréversible.`)) return;

    try {
        const response = await fetch('/api/admin/reject-upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename })
        });

        const result = await response.json();

        if (response.ok) {
            alert('Fichier rejeté avec succès');
            await loadPendingUploads();
        } else {
            throw new Error(result.error || 'Erreur lors du rejet');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors du rejet');
    }
}

// Formater la taille de fichier
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ===============================
// Gestion de la lightbox admin
// ===============================

// Configuration de la lightbox admin
function setupAdminLightbox() {
    const lightbox = document.getElementById('adminLightbox');
    if (!lightbox) return;

    const closeBtn = document.getElementById('closeAdminLightbox');
    const prevBtn = document.getElementById('prevAdminMedia');
    const nextBtn = document.getElementById('nextAdminMedia');
    const approveBtn = document.getElementById('adminLightboxApprove');
    const rejectBtn = document.getElementById('adminLightboxReject');

    // Bouton fermer
    if (closeBtn) {
        closeBtn.addEventListener('click', closeAdminLightbox);
    }

    // Navigation
    if (prevBtn) {
        prevBtn.addEventListener('click', () => navigateAdminMedia(-1));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => navigateAdminMedia(1));
    }

    // Actions
    if (approveBtn) {
        approveBtn.addEventListener('click', approveCurrentAdminMedia);
    }
    if (rejectBtn) {
        rejectBtn.addEventListener('click', rejectCurrentAdminMedia);
    }

    // Clavier
    document.addEventListener('keydown', handleAdminLightboxKeyboard);

    // Clic sur le fond pour fermer
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeAdminLightbox();
        }
    });
}

// Ouvrir la lightbox admin
function openAdminLightbox(index) {
    if (index < 0 || index >= adminPendingMedia.length) return;

    currentAdminMediaIndex = index;
    const lightbox = document.getElementById('adminLightbox');
    if (!lightbox) return;

    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    showAdminMedia(index);
}

// Fermer la lightbox admin
function closeAdminLightbox() {
    const lightbox = document.getElementById('adminLightbox');
    if (!lightbox) return;

    lightbox.style.display = 'none';
    document.body.style.overflow = 'auto';

    // Arrêter la vidéo si en cours
    const video = document.getElementById('adminLightboxVideo');
    if (video) {
        video.pause();
        video.currentTime = 0;
    }
}

// Afficher un média dans la lightbox
function showAdminMedia(index) {
    if (index < 0 || index >= adminPendingMedia.length) return;

    const media = adminPendingMedia[index];
    const image = document.getElementById('adminLightboxImage');
    const video = document.getElementById('adminLightboxVideo');
    const info = document.getElementById('adminLightboxInfo');

    // Réinitialiser l'affichage
    if (image) {
        image.style.display = 'none';
        image.src = '';
    }
    if (video) {
        video.style.display = 'none';
        video.pause();
        video.src = '';
    }

    // Afficher le média approprié
    if (media.type === 'image') {
        if (image) {
            image.src = media.path;
            image.alt = media.name;
            image.style.display = 'block';
        }
    } else if (media.type === 'video') {
        if (video) {
            video.src = media.path;
            video.style.display = 'block';
            video.load();
        }
    }

    // Afficher les informations
    if (info) {
        const dateStr = new Date(media.uploadedAt).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const sizeStr = formatFileSize(media.size);

        info.innerHTML = `
            <div>${media.name}</div>
            <div style="font-size: 0.9rem; opacity: 0.8;">${dateStr} • ${sizeStr} • ${index + 1}/${adminPendingMedia.length}</div>
        `;
    }

    // Gérer les boutons de navigation
    const prevBtn = document.getElementById('prevAdminMedia');
    const nextBtn = document.getElementById('nextAdminMedia');
    if (prevBtn) prevBtn.style.display = index > 0 ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = index < adminPendingMedia.length - 1 ? 'flex' : 'none';
}

// Naviguer dans les médias
function navigateAdminMedia(direction) {
    const newIndex = currentAdminMediaIndex + direction;
    if (newIndex >= 0 && newIndex < adminPendingMedia.length) {
        currentAdminMediaIndex = newIndex;
        showAdminMedia(newIndex);
    }
}

// Gestion du clavier
function handleAdminLightboxKeyboard(e) {
    const lightbox = document.getElementById('adminLightbox');
    if (!lightbox || lightbox.style.display === 'none') return;

    switch(e.key) {
        case 'Escape':
            closeAdminLightbox();
            break;
        case 'ArrowLeft':
            navigateAdminMedia(-1);
            break;
        case 'ArrowRight':
            navigateAdminMedia(1);
            break;
    }
}

// Valider le média courant depuis la lightbox
async function approveCurrentAdminMedia() {
    if (currentAdminMediaIndex < 0 || currentAdminMediaIndex >= adminPendingMedia.length) return;

    const media = adminPendingMedia[currentAdminMediaIndex];
    const nextIndex = currentAdminMediaIndex;

    try {
        const response = await fetch('/api/admin/approve-upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename: media.name })
        });

        const result = await response.json();

        if (response.ok) {
            // Fermer la lightbox et recharger
            closeAdminLightbox();
            await loadPendingUploads();

            // Rouvrir la lightbox sur le média suivant s'il existe
            if (nextIndex < adminPendingMedia.length) {
                setTimeout(() => openAdminLightbox(nextIndex), 100);
            }
        } else {
            throw new Error(result.error || 'Erreur lors de la validation');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors de la validation');
    }
}

// Rejeter le média courant depuis la lightbox
async function rejectCurrentAdminMedia() {
    if (currentAdminMediaIndex < 0 || currentAdminMediaIndex >= adminPendingMedia.length) return;

    const media = adminPendingMedia[currentAdminMediaIndex];

    if (!confirm(`Rejeter et supprimer définitivement ce fichier ?\n${media.name}\n\nCette action est irréversible.`)) return;

    const nextIndex = currentAdminMediaIndex;

    try {
        const response = await fetch('/api/admin/reject-upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename: media.name })
        });

        const result = await response.json();

        if (response.ok) {
            // Fermer la lightbox et recharger
            closeAdminLightbox();
            await loadPendingUploads();

            // Rouvrir la lightbox sur le média suivant s'il existe
            if (nextIndex < adminPendingMedia.length) {
                setTimeout(() => openAdminLightbox(nextIndex), 100);
            }
        } else {
            throw new Error(result.error || 'Erreur lors du rejet');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors du rejet');
    }
}
