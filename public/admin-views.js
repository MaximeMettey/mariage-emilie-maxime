// Vues d'administration avancées

// État global pour les onglets admin
let currentAdminTab = 'uploads'; // uploads, settings, providers, gallery, guestbook

/**
 * Rendu de l'interface admin complète avec onglets
 */
async function renderAdminDashboard() {
    const appContent = document.getElementById('appContent');

    appContent.innerHTML = `
        <div class="admin-dashboard">
            <div class="admin-header">
                <h1>🛠️ Administration</h1>
                <p>Gérez votre galerie de mariage</p>
            </div>

            <div class="admin-tabs">
                <button class="admin-tab ${currentAdminTab === 'uploads' ? 'active' : ''}" data-tab="uploads">
                    📸 Validation uploads
                </button>
                <button class="admin-tab ${currentAdminTab === 'settings' ? 'active' : ''}" data-tab="settings">
                    ⚙️ Paramètres
                </button>
                <button class="admin-tab ${currentAdminTab === 'providers' ? 'active' : ''}" data-tab="providers">
                    🤝 Prestataires
                </button>
                <button class="admin-tab ${currentAdminTab === 'gallery' ? 'active' : ''}" data-tab="gallery">
                    🖼️ Gestion galerie
                </button>
                <button class="admin-tab ${currentAdminTab === 'guestbook' ? 'active' : ''}" data-tab="guestbook">
                    📖 Livre d'or
                </button>
            </div>

            <div class="admin-tab-content" id="adminTabContent">
                <!-- Le contenu sera chargé dynamiquement -->
            </div>
        </div>
    `;

    // Ajouter les styles CSS
    addAdminStyles();

    // Event listeners pour les onglets
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchAdminTab(tabName);
        });
    });

    // Charger l'onglet actuel
    await loadAdminTab(currentAdminTab);
}

/**
 * Changer d'onglet admin
 */
async function switchAdminTab(tabName) {
    currentAdminTab = tabName;

    // Mettre à jour les classes actives
    document.querySelectorAll('.admin-tab').forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Charger le contenu de l'onglet
    await loadAdminTab(tabName);
}

/**
 * Charger le contenu d'un onglet
 */
async function loadAdminTab(tabName) {
    const tabContent = document.getElementById('adminTabContent');

    switch (tabName) {
        case 'uploads':
            await renderUploadsTab(tabContent);
            break;
        case 'settings':
            await renderSettingsTab(tabContent);
            break;
        case 'providers':
            await renderProvidersTab(tabContent);
            break;
        case 'gallery':
            await renderGalleryTab(tabContent);
            break;
        case 'guestbook':
            await renderGuestbookTab(tabContent);
            break;
    }
}

/**
 * Onglet Validation des uploads (existant)
 */
async function renderUploadsTab(container) {
    container.innerHTML = '<div class="loading">Chargement des uploads en attente...</div>';

    try {
        const response = await fetch('/api/admin/pending-uploads');
        const data = await response.json();

        if (data.files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>✅ Aucun fichier en attente de validation</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="pending-uploads-section">
                <div class="section-header">
                    <h2>📸 Fichiers en attente (${data.files.length})</h2>
                    <div class="batch-actions">
                        <button class="btn btn-success" onclick="approveAllPending()">✓ Tout valider</button>
                        <button class="btn btn-danger" onclick="rejectAllPending()">✗ Tout rejeter</button>
                    </div>
                </div>

                <div class="pending-uploads-grid">
        `;

        for (const file of data.files) {
            const uploadDate = new Date(file.uploadedAt).toLocaleString('fr-FR');
            const fileSize = (file.size / 1024 / 1024).toFixed(2);
            const folderDisplay = file.folderPath && file.folderPath !== '.' ? `📁 ${file.folderPath}/` : '';
            const escapedName = file.name.replace(/'/g, "\\'");

            html += `
                <div class="pending-upload-card" data-filename="${file.name}">
                    <div class="upload-preview">
                        ${file.type === 'image' ?
                            `<img src="${file.path}" alt="${file.displayName}" onclick="openLightbox('${file.path}', 'image')">` :
                            `<div class="video-preview" onclick="openLightbox('${file.path}', 'video')">
                                <span class="play-icon">▶️</span>
                                <p>Vidéo</p>
                            </div>`
                        }
                    </div>
                    <div class="upload-info">
                        ${folderDisplay ? `<p class="file-folder">${folderDisplay}</p>` : ''}
                        <p class="file-name" title="${file.name}">${file.displayName}</p>
                        <p class="file-meta">📅 ${uploadDate} | 💾 ${fileSize} MB</p>
                    </div>
                    <div class="upload-actions">
                        <button class="btn btn-success btn-sm" onclick="approveUpload('${escapedName}')">✓</button>
                        <button class="btn btn-danger btn-sm" onclick="rejectUpload('${escapedName}')">✗</button>
                    </div>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Erreur lors du chargement des uploads:', error);
        container.innerHTML = '<div class="error">Erreur lors du chargement des uploads</div>';
    }
}

/**
 * Onglet Paramètres
 */
async function renderSettingsTab(container) {
    container.innerHTML = '<div class="loading">Chargement des paramètres...</div>';

    try {
        const response = await fetch('/api/admin/settings');
        const config = await response.json();

        container.innerHTML = `
            <div class="settings-section">
                <h2>⚙️ Paramètres de l'application</h2>

                <!-- Mots de passe -->
                <div class="settings-card">
                    <h3>🔐 Sécurité</h3>

                    <div class="form-group">
                        <label>Mot de passe administrateur</label>
                        <input type="password" id="currentAdminPassword" placeholder="Mot de passe actuel">
                        <input type="password" id="newAdminPassword" placeholder="Nouveau mot de passe">
                        <button class="btn btn-primary" onclick="updateAdminPassword()">Mettre à jour</button>
                    </div>

                    <div class="form-group">
                        <label>Mot de passe invités</label>
                        <input type="password" id="newPublicPassword" placeholder="Nouveau mot de passe">
                        <button class="btn btn-primary" onclick="updatePublicPassword()">Mettre à jour</button>
                    </div>
                </div>

                <!-- Email -->
                <div class="settings-card">
                    <h3>📧 Notifications</h3>

                    <div class="form-group">
                        <label>Email administrateur</label>
                        <input type="email" id="adminEmail" value="${config.adminEmail || ''}" placeholder="votre-email@exemple.com">
                        <button class="btn btn-primary" onclick="updateAdminEmail()">Mettre à jour</button>
                    </div>
                </div>

                <!-- SMTP -->
                <div class="settings-card">
                    <h3>✉️ Configuration SMTP</h3>

                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="smtpEnabled" ${config.smtp?.enabled ? 'checked' : ''}>
                            Activer les notifications par email
                        </label>
                    </div>

                    <div id="smtpConfigFields" class="${config.smtp?.enabled ? '' : 'hidden'}">
                        <div class="form-group">
                            <label>Serveur SMTP</label>
                            <input type="text" id="smtpHost" value="${config.smtp?.host || ''}" placeholder="smtp.gmail.com">
                        </div>

                        <div class="form-group">
                            <label>Port</label>
                            <input type="number" id="smtpPort" value="${config.smtp?.port || 587}">
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="smtpSecure" ${config.smtp?.secure ? 'checked' : ''}>
                                Utiliser SSL (port 465)
                            </label>
                        </div>

                        <div class="form-group">
                            <label>Nom d'utilisateur</label>
                            <input type="text" id="smtpUser" value="${config.smtp?.user || ''}" placeholder="votre-email@gmail.com">
                        </div>

                        <div class="form-group">
                            <label>Mot de passe</label>
                            <input type="password" id="smtpPass" placeholder="Mot de passe SMTP">
                            <small>Laissez vide pour ne pas modifier</small>
                        </div>

                        <button class="btn btn-primary" onclick="updateSmtpConfig()">Mettre à jour SMTP</button>
                    </div>
                </div>

                <!-- Page d'accueil -->
                <div class="settings-card">
                    <h3>🏠 Page d'accueil</h3>

                    <div class="form-group">
                        <label>Titre</label>
                        <input type="text" id="welcomeTitle" value="${config.welcome?.title || ''}" placeholder="Émilie & Maxime">
                    </div>

                    <div class="form-group">
                        <label>Message</label>
                        <textarea id="welcomeMessage" rows="4" placeholder="Message de bienvenue">${config.welcome?.message || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label>Chemin de l'image</label>
                        <input type="text" id="welcomeImage" value="${config.welcome?.image || ''}" placeholder="/images/welcome.jpg">
                    </div>

                    <button class="btn btn-primary" onclick="updateWelcomeConfig()">Mettre à jour</button>
                </div>

                <!-- Musique -->
                <div class="settings-card">
                    <h3>🎵 Lecteur de musique</h3>

                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="musicEnabled" ${config.music?.enabled !== false ? 'checked' : ''}>
                            Activer le lecteur de musique
                        </label>
                        <small>Affiche le lecteur de musique sur toutes les pages</small>
                    </div>

                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="musicAutoplay" ${config.music?.autoplay !== false ? 'checked' : ''}>
                            Lecture automatique
                        </label>
                        <small>Démarre automatiquement la musique au chargement de la page</small>
                    </div>

                    <button class="btn btn-primary" onclick="updateMusicConfig()">Mettre à jour</button>

                    <hr style="margin: 30px 0; border-color: #e0e0e0;">

                    <h4>Gestion des fichiers musicaux</h4>
                    <div class="form-group">
                        <label>Uploader des musiques</label>
                        <input type="file" id="musicFileInput" accept="audio/*" multiple>
                        <small>Formats acceptés : MP3, WAV, OGG, M4A, FLAC (max 50MB par fichier)</small>
                    </div>

                    <button class="btn btn-primary" onclick="uploadMusicFiles()">Uploader</button>

                    <div id="musicFilesList" style="margin-top: 20px;">
                        <div class="loading">Chargement de la liste des musiques...</div>
                    </div>
                </div>

                <!-- Page Prestataires -->
                <div class="settings-card">
                    <h3>🤝 Page prestataires</h3>

                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="providersEnabled" ${config.providers?.enabled !== false ? 'checked' : ''}>
                            Activer la page prestataires
                        </label>
                        <small>Affiche la page prestataires dans le menu de navigation</small>
                    </div>

                    <button class="btn btn-primary" onclick="updateProvidersConfig()">Mettre à jour</button>
                </div>
            </div>
        `;

        // Event listener pour toggle SMTP
        document.getElementById('smtpEnabled').addEventListener('change', (e) => {
            const fields = document.getElementById('smtpConfigFields');
            if (e.target.checked) {
                fields.classList.remove('hidden');
            } else {
                fields.classList.add('hidden');
            }
        });

        // Charger la liste des musiques
        await loadMusicFilesList();
    } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
        container.innerHTML = '<div class="error">Erreur lors du chargement des paramètres</div>';
    }
}

/**
 * Charger la liste des fichiers musicaux
 */
async function loadMusicFilesList() {
    const musicFilesList = document.getElementById('musicFilesList');
    if (!musicFilesList) return;

    try {
        const response = await fetch('/api/music');
        const data = await response.json();

        if (data.tracks && data.tracks.length > 0) {
            let html = '<h4 style="margin-bottom: 10px;">Musiques disponibles</h4><div class="music-files-grid">';

            data.tracks.forEach(track => {
                html += `
                    <div class="music-file-item">
                        <span class="music-file-name">🎵 ${track.name}</span>
                        <button class="btn btn-danger btn-sm" onclick="deleteMusicFile('${track.name}')">🗑️</button>
                    </div>
                `;
            });

            html += '</div>';
            musicFilesList.innerHTML = html;
        } else {
            musicFilesList.innerHTML = '<p style="color: #9e9e9e;">Aucune musique uploadée</p>';
        }
    } catch (error) {
        console.error('Erreur:', error);
        musicFilesList.innerHTML = '<p style="color: #f44336;">Erreur lors du chargement</p>';
    }
}

/**
 * Onglet Gestion des prestataires
 */
async function renderProvidersTab(container) {
    container.innerHTML = '<div class="loading">Chargement des prestataires...</div>';

    try {
        const response = await fetch('/api/providers');
        const data = await response.json();

        // Stocker les providers globalement pour pouvoir les récupérer lors de l'édition
        window.currentProviders = data.providers;

        let html = `
            <div class="providers-section">
                <div class="section-header">
                    <h2>🤝 Gestion des prestataires</h2>
                    <button class="btn btn-primary" onclick="showAddProviderModal()">+ Ajouter un prestataire</button>
                </div>

                <div class="providers-grid">
        `;

        data.providers.forEach((provider, index) => {
            html += `
                <div class="provider-card">
                    <div class="provider-order-controls">
                        <button class="btn-order btn-order-up"
                                onclick="moveProvider('${provider.id}', 'up')"
                                ${index === 0 ? 'disabled' : ''}
                                title="Monter">
                            ▲
                        </button>
                        <span class="provider-order-number">#${index + 1}</span>
                        <button class="btn-order btn-order-down"
                                onclick="moveProvider('${provider.id}', 'down')"
                                ${index === data.providers.length - 1 ? 'disabled' : ''}
                                title="Descendre">
                            ▼
                        </button>
                    </div>
                    <div class="provider-logo-square">
                        <img src="${provider.logo}" alt="${provider.company}" onerror="this.style.display='none'">
                    </div>
                    <div class="provider-info">
                        <h3>${provider.name}</h3>
                        <p class="provider-company">${provider.company}</p>
                        <p class="provider-description">${provider.description}</p>
                    </div>
                    <div class="provider-actions">
                        <button class="btn btn-secondary btn-sm" onclick="editProvider('${provider.id}')">✏️ Modifier</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteProvider('${provider.id}')">🗑️ Supprimer</button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>

            <!-- Modal pour ajouter/modifier un prestataire -->
            <div id="providerModal" class="modal hidden">
                <div class="modal-content">
                    <span class="close" onclick="closeProviderModal()">&times;</span>
                    <h2 id="providerModalTitle">Ajouter un prestataire</h2>

                    <form id="providerForm" onsubmit="saveProvider(event)">
                        <input type="hidden" id="providerId">

                        <div class="form-group">
                            <label>Nom du service *</label>
                            <input type="text" id="providerName" required>
                        </div>

                        <div class="form-group">
                            <label>Nom de l'entreprise *</label>
                            <input type="text" id="providerCompany" required>
                        </div>

                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="providerDescription" rows="3"></textarea>
                        </div>

                        <div class="form-group">
                            <label>Logo</label>
                            <input type="file" id="providerLogoFile" accept="image/*">
                            <input type="text" id="providerLogo" placeholder="/images/providers/logo.jpg" readonly>
                        </div>

                        <div class="form-group">
                            <label>Lien Google Avis</label>
                            <input type="url" id="providerReviewLink">
                        </div>

                        <div class="form-group">
                            <label>Site web / Instagram</label>
                            <input type="url" id="providerWebsiteLink">
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeProviderModal()">Annuler</button>
                            <button type="submit" class="btn btn-primary">Enregistrer</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Event listener pour l'upload de logo
        const logoInput = document.getElementById('providerLogoFile');
        if (logoInput) {
            logoInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await uploadProviderLogo(file);
                }
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement des prestataires:', error);
        container.innerHTML = '<div class="error">Erreur lors du chargement des prestataires</div>';
    }
}

/**
 * Onglet Gestion de la galerie
 */
async function renderGalleryTab(container) {
    container.innerHTML = '<div class="loading">Chargement de la structure...</div>';

    try {
        const response = await fetch('/api/admin/gallery/structure');
        const data = await response.json();

        let html = `
            <div class="gallery-management-section">
                <div class="section-header">
                    <h2>🖼️ Gestion de la galerie</h2>
                    <div class="header-actions">
                        <button class="btn btn-success" onclick="optimizeExistingMedia()" id="optimizeBtn">⚡ Optimiser les photos</button>
                        <button class="btn btn-primary" onclick="showAddCategoryModal()">+ Nouvelle catégorie</button>
                    </div>
                </div>

                <div class="gallery-structure">
        `;

        for (const category of data.structure) {
            html += `
                <div class="category-section">
                    <div class="category-header">
                        <h3>📁 ${category.category}</h3>
                        <div class="category-actions">
                            <button class="btn btn-secondary btn-sm" onclick="showAddFolderModal('${category.category}')">+ Nouveau dossier</button>
                            <button class="btn btn-secondary btn-sm" onclick="renameCategory('${category.category}')">✏️ Renommer</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteCategory('${category.category}')">🗑️ Supprimer</button>
                        </div>
                    </div>
                    <div class="folders-list">
            `;

            for (const folder of category.folders) {
                html += `
                    <div class="folder-item">
                        <span>📂 ${folder}</span>
                        <div class="folder-actions">
                            <button class="btn btn-primary btn-sm" onclick="showUploadMediaModal('${category.category}', '${folder}')">⬆️ Upload</button>
                            <button class="btn btn-secondary btn-sm" onclick="renameFolder('${category.category}', '${folder}')">✏️ Renommer</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteFolder('${category.category}', '${folder}')">🗑️ Supprimer</button>
                        </div>
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        }

        html += `
                </div>
            </div>

            <!-- Modal pour créer une catégorie -->
            <div id="categoryModal" class="modal hidden">
                <div class="modal-content">
                    <span class="close" onclick="closeCategoryModal()">&times;</span>
                    <h2>Créer une catégorie</h2>
                    <form onsubmit="createCategory(event)">
                        <div class="form-group">
                            <label>Nom de la catégorie *</label>
                            <input type="text" id="categoryName" required placeholder="Ex: Cérémonie">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeCategoryModal()">Annuler</button>
                            <button type="submit" class="btn btn-primary">Créer</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Modal pour créer un dossier -->
            <div id="folderModal" class="modal hidden">
                <div class="modal-content">
                    <span class="close" onclick="closeFolderModal()">&times;</span>
                    <h2>Créer un dossier</h2>
                    <form onsubmit="createFolder(event)">
                        <input type="hidden" id="folderCategory">
                        <div class="form-group">
                            <label>Nom du dossier *</label>
                            <input type="text" id="folderName" required placeholder="Ex: Matin">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeFolderModal()">Annuler</button>
                            <button type="submit" class="btn btn-primary">Créer</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Modal pour uploader des médias -->
            <div id="uploadMediaModal" class="modal hidden">
                <div class="modal-content">
                    <span class="close" onclick="closeUploadMediaModal()">&times;</span>
                    <h2>Uploader des médias</h2>
                    <form onsubmit="uploadMedia(event)">
                        <input type="hidden" id="uploadCategory">
                        <input type="hidden" id="uploadFolder">
                        <div class="form-group">
                            <label>Destination: <span id="uploadDestination"></span></label>
                        </div>
                        <div class="form-group">
                            <label>Fichiers (images et vidéos)</label>
                            <input type="file" id="mediaFiles" multiple accept="image/*,video/*" required>
                            <small>Sélectionnez jusqu'à 50 fichiers (200 MB max par fichier)</small>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeUploadMediaModal()">Annuler</button>
                            <button type="submit" class="btn btn-primary">Uploader</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Erreur lors du chargement de la structure:', error);
        container.innerHTML = '<div class="error">Erreur lors du chargement de la structure</div>';
    }
}

/**
 * Onglet Livre d'or (modération)
 */
async function renderGuestbookTab(container) {
    container.innerHTML = '<div class="loading">Chargement des messages...</div>';

    try {
        const response = await fetch('/api/admin/guestbook');
        const data = await response.json();

        let html = `
            <div class="guestbook-admin-section">
                <div class="section-header">
                    <h2>📖 Modération du livre d'or</h2>
                    <div class="guestbook-stats">
                        <span class="stat-badge stat-pending">En attente: ${data.stats.pending}</span>
                        <span class="stat-badge stat-approved">Approuvés: ${data.stats.approved}</span>
                        <span class="stat-badge stat-total">Total: ${data.stats.total}</span>
                    </div>
                </div>

                <div class="guestbook-entries-list">
        `;

        if (data.entries.length === 0) {
            html += '<div class="empty-state">Aucun message pour le moment</div>';
        } else {
            data.entries.forEach(entry => {
                const date = new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const statusClass = entry.status === 'pending' ? 'status-pending' :
                                  entry.status === 'approved' ? 'status-approved' :
                                  'status-rejected';

                const statusText = entry.status === 'pending' ? 'En attente' :
                                 entry.status === 'approved' ? 'Approuvé' :
                                 'Rejeté';

                html += `
                    <div class="guestbook-admin-entry ${statusClass}">
                        <div class="entry-header-admin">
                            <div class="entry-info">
                                <strong class="entry-author">${entry.name}</strong>
                                <span class="entry-date-admin">${date}</span>
                                <span class="entry-ip">IP: ${entry.ip}</span>
                            </div>
                            <span class="entry-status">${statusText}</span>
                        </div>
                        <p class="entry-message-admin">${entry.message}</p>
                        <div class="entry-actions-admin">
                            ${entry.status === 'pending' ?
                                `<button class="btn btn-success btn-sm" onclick="approveGuestbookEntry('${entry.id}')">✓ Approuver</button>` :
                                ''}
                            <button class="btn btn-danger btn-sm" onclick="deleteGuestbookEntry('${entry.id}')">🗑️ Supprimer</button>
                        </div>
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
        container.innerHTML = '<div class="error">Erreur lors du chargement des messages</div>';
    }
}

/**
 * Styles CSS pour l'interface admin
 */
function addAdminStyles() {
    const styleId = 'admin-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .admin-dashboard {
            padding: 20px;
        }

        .admin-header {
            text-align: center;
            margin-bottom: 30px;
        }

        .admin-header h1 {
            color: #c9a66b;
            margin-bottom: 10px;
        }

        .admin-tabs {
            display: flex;
            gap: 10px;
            border-bottom: 2px solid rgba(212, 175, 55, 0.3);
            margin-bottom: 30px;
            flex-wrap: wrap;
        }

        .admin-tab {
            padding: 12px 24px;
            background: none;
            border: none;
            border-bottom: 3px solid transparent;
            cursor: pointer;
            font-size: 16px;
            color: #9e9e9e;
            transition: all 0.3s ease;
        }

        .admin-tab:hover {
            color: #d4af37;
        }

        .admin-tab.active {
            color: #d4af37;
            border-bottom-color: #d4af37;
        }

        .admin-dashboard .settings-section,
        .admin-dashboard .providers-section,
        .admin-dashboard .gallery-management-section,
        .admin-dashboard .pending-uploads-section {
            max-width: 1200px;
            margin: 0 auto;
        }

        .admin-dashboard .settings-card,
        .admin-dashboard .provider-card {
            background: rgba(26, 26, 26, 0.95);
            border: 1px solid rgba(212, 175, 55, 0.2);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .admin-dashboard .settings-card h3 {
            color: #d4af37;
            margin-top: 0;
        }

        .admin-dashboard .form-group {
            margin-bottom: 20px;
        }

        .admin-dashboard .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #ffffff;
        }

        .admin-dashboard .form-group input[type="text"],
        .admin-dashboard .form-group input[type="email"],
        .admin-dashboard .form-group input[type="password"],
        .admin-dashboard .form-group input[type="number"],
        .admin-dashboard .form-group input[type="url"],
        .admin-dashboard .form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            box-sizing: border-box;
            color: #333;
            background: white;
        }

        .admin-dashboard .form-group small {
            display: block;
            margin-top: 5px;
            color: #9e9e9e;
            font-size: 12px;
        }

        .admin-dashboard .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .admin-dashboard .header-actions {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .admin-dashboard .batch-actions {
            display: flex;
            gap: 10px;
        }

        .admin-dashboard .pending-uploads-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
        }

        .admin-dashboard .pending-upload-card {
            background: rgba(26, 26, 26, 0.95);
            border: 1px solid rgba(212, 175, 55, 0.2);
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .admin-dashboard .upload-preview {
            height: 200px;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        .admin-dashboard .upload-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .admin-dashboard .video-preview {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #8b1538;
            color: white;
        }

        .admin-dashboard .play-icon {
            font-size: 48px;
        }

        .admin-dashboard .upload-info {
            padding: 10px;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .admin-dashboard .file-folder {
            font-size: 11px;
            color: #c9a66b;
            margin: 0 0 2px 0;
            font-weight: 500;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .admin-dashboard .file-name {
            font-weight: 600;
            margin: 0 0 5px 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #ffffff;
            font-size: 14px;
        }

        .admin-dashboard .file-meta {
            font-size: 11px;
            color: #9e9e9e;
            margin: 0;
        }

        .admin-dashboard .upload-actions {
            padding: 8px 10px;
            display: flex;
            gap: 8px;
            justify-content: center;
            border-top: 1px solid #e0e0e0;
        }

        .admin-dashboard .upload-actions .btn-sm {
            flex: 1;
            max-width: 80px;
            padding: 6px 10px;
            font-size: 18px;
        }

        .admin-dashboard .providers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        .admin-dashboard .provider-card {
            position: relative;
            padding-top: 45px;
        }

        .admin-dashboard .provider-order-controls {
            position: absolute;
            top: 10px;
            right: 10px;
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(10, 10, 10, 0.8);
            border: 1px solid rgba(212, 175, 55, 0.3);
            border-radius: 20px;
            padding: 4px 10px;
        }

        .admin-dashboard .provider-order-number {
            font-size: 13px;
            font-weight: 600;
            color: #d4af37;
            min-width: 25px;
            text-align: center;
        }

        .admin-dashboard .btn-order {
            background: transparent;
            border: 1px solid #d4af37;
            color: #d4af37;
            cursor: pointer;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            transition: all 0.3s ease;
        }

        .admin-dashboard .btn-order:hover:not(:disabled) {
            background: rgba(212, 175, 55, 0.2);
            transform: scale(1.1);
        }

        .admin-dashboard .btn-order:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        .admin-dashboard .provider-logo-square {
            width: 150px;
            height: 150px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(10, 10, 10, 0.5);
            border: 2px solid rgba(212, 175, 55, 0.3);
            border-radius: 12px;
            margin: 0 auto 15px;
            overflow: hidden;
        }

        .admin-dashboard .provider-logo-square img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .admin-dashboard .provider-company {
            color: #c9a66b;
            font-weight: 500;
        }

        .admin-dashboard .provider-description {
            color: #9e9e9e;
            font-size: 14px;
        }

        .admin-dashboard .provider-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }

        .admin-dashboard .category-section {
            background: rgba(26, 26, 26, 0.95);
            border: 1px solid rgba(212, 175, 55, 0.2);
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            margin-bottom: 32px;
        }

        .admin-dashboard .category-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        }

        .admin-dashboard .category-header h3 {
            font-family: 'Cinzel', serif;
            font-size: 1.4rem;
            color: #d4af37;
            font-weight: 600;
            margin: 0;
        }

        .admin-dashboard .folders-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .admin-dashboard .folder-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: rgba(10, 10, 10, 0.7);
            border: 1px solid rgba(139, 21, 56, 0.3);
            border-radius: 8px;
            width: 100%;
            transition: all 0.3s ease;
        }

        .admin-dashboard .folder-item:hover {
            background: rgba(139, 21, 56, 0.2);
            border-color: rgba(212, 175, 55, 0.4);
            box-shadow: 0 0 15px rgba(139, 21, 56, 0.3);
            transform: translateX(4px);
        }

        .admin-dashboard .folder-item > span {
            font-family: 'Cormorant Garamond', serif;
            font-size: 1.1rem;
            color: #ffffff;
            font-weight: 500;
            flex: 1;
        }

        .admin-dashboard .category-actions {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .admin-dashboard .folder-actions {
            display: flex;
            gap: 5px;
        }

        .modal {
            display: flex;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            align-items: center;
            justify-content: center;
        }

        .modal.hidden {
            display: none;
        }

        .modal-content {
            background: rgba(26, 26, 26, 0.98);
            border: 1px solid rgba(212, 175, 55, 0.3);
            padding: 30px;
            border-radius: 10px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }

        .close {
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            color: #999;
        }

        .close:hover {
            color: #ffffff;
        }

        .admin-dashboard .form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
        }

        .admin-dashboard .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        }

        .admin-dashboard .btn-primary {
            background: #d4af37;
            color: #0a0a0a;
            font-weight: 600;
        }

        .admin-dashboard .btn-primary:hover {
            background: #f0d06b;
        }

        .admin-dashboard .btn-secondary {
            background: rgba(212, 175, 55, 0.2);
            color: #d4af37;
            border: 1px solid #d4af37;
        }

        .admin-dashboard .btn-secondary:hover {
            background: rgba(212, 175, 55, 0.3);
        }

        .admin-dashboard .btn-success {
            background: #4CAF50;
            color: white;
        }

        .admin-dashboard .btn-success:hover {
            background: #45a049;
        }

        .admin-dashboard .btn-danger {
            background: #8b1538;
            color: #d4af37;
            border: 1px solid #8b1538;
        }

        .admin-dashboard .btn-danger:hover {
            background: #a8234a;
        }

        .admin-dashboard .btn-sm {
            padding: 6px 12px;
            font-size: 12px;
        }

        .admin-dashboard .loading,
        .admin-dashboard .error,
        .admin-dashboard .empty-state {
            text-align: center;
            padding: 40px;
            color: #9e9e9e;
        }

        .admin-dashboard .error {
            color: #f44336;
        }

        .hidden {
            display: none !important;
        }

        /* Styles pour le livre d'or admin */
        .guestbook-admin-section {
            max-width: 1200px;
            margin: 0 auto;
        }

        .guestbook-stats {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }

        .stat-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }

        .stat-pending {
            background: rgba(212, 175, 55, 0.3);
            color: #f0d06b;
        }

        .stat-approved {
            background: rgba(76, 175, 80, 0.3);
            color: #90ee90;
        }

        .stat-total {
            background: rgba(139, 21, 56, 0.3);
            color: #d4af37;
        }

        .guestbook-entries-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-top: 20px;
        }

        .guestbook-admin-entry {
            background: rgba(26, 26, 26, 0.95);
            border: 1px solid rgba(212, 175, 55, 0.2);
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-left: 4px solid #d4af37;
        }

        .guestbook-admin-entry.status-pending {
            border-left-color: #d4af37;
        }

        .guestbook-admin-entry.status-approved {
            border-left-color: #4CAF50;
        }

        .entry-header-admin {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
            flex-wrap: wrap;
            gap: 10px;
        }

        .entry-info {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .entry-author {
            color: #8b1538;
            font-size: 1.1rem;
        }

        .entry-date-admin {
            color: #9e9e9e;
            font-size: 0.9rem;
        }

        .entry-ip {
            color: #999;
            font-size: 0.85rem;
            font-family: monospace;
        }

        .entry-status {
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.85rem;
            font-weight: 500;
        }

        .status-pending .entry-status {
            background: rgba(212, 175, 55, 0.3);
            color: #f0d06b;
        }

        .status-approved .entry-status {
            background: rgba(76, 175, 80, 0.3);
            color: #90ee90;
        }

        .entry-message-admin {
            color: #ffffff;
            line-height: 1.6;
            margin: 15px 0;
            white-space: pre-wrap;
        }

        .entry-actions-admin {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        @media (max-width: 768px) {
            .guestbook-stats {
                flex-direction: column;
            }

            .entry-header-admin {
                flex-direction: column;
                align-items: flex-start;
            }
        }

        /* Styles pour la gestion des musiques */
        .music-files-grid {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .music-file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: rgba(10, 10, 10, 0.7);
            border-radius: 5px;
            border-left: 3px solid #d4af37;
        }

        .music-file-name {
            color: #ffffff;
            font-weight: 500;
        }

        @keyframes spin {
            from {
                transform: rotate(0deg);
            }
            to {
                transform: rotate(360deg);
            }
        }
    `;

    document.head.appendChild(style);
}

// Export pour utilisation dans views.js
window.renderAdminDashboard = renderAdminDashboard;
