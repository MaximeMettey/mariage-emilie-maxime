// Vues d'administration avancées

// État global pour les onglets admin
let currentAdminTab = 'uploads'; // uploads, settings, providers, gallery

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

            html += `
                <div class="pending-upload-card" data-filename="${file.name}">
                    <div class="upload-preview">
                        ${file.type === 'image' ?
                            `<img src="${file.path}" alt="${file.name}" onclick="openLightbox('${file.path}', 'image')">` :
                            `<div class="video-preview" onclick="openLightbox('${file.path}', 'video')">
                                <span class="play-icon">▶️</span>
                                <p>Vidéo</p>
                            </div>`
                        }
                    </div>
                    <div class="upload-info">
                        <p class="file-name">${file.name}</p>
                        <p class="file-meta">📅 ${uploadDate} | 💾 ${fileSize} MB</p>
                    </div>
                    <div class="upload-actions">
                        <button class="btn btn-success btn-sm" onclick="approveUpload('${file.name}')">✓ Valider</button>
                        <button class="btn btn-danger btn-sm" onclick="rejectUpload('${file.name}')">✗ Rejeter</button>
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
    } catch (error) {
        console.error('Erreur lors du chargement des paramètres:', error);
        container.innerHTML = '<div class="error">Erreur lors du chargement des paramètres</div>';
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

        for (const provider of data.providers) {
            html += `
                <div class="provider-card">
                    <div class="provider-logo">
                        <img src="${provider.logo}" alt="${provider.company}">
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
        }

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
                    <button class="btn btn-primary" onclick="showAddCategoryModal()">+ Nouvelle catégorie</button>
                </div>

                <div class="gallery-structure">
        `;

        for (const category of data.structure) {
            html += `
                <div class="category-section">
                    <div class="category-header">
                        <h3>📁 ${category.category}</h3>
                        <button class="btn btn-secondary btn-sm" onclick="showAddFolderModal('${category.category}')">+ Nouveau dossier</button>
                    </div>
                    <div class="folders-list">
            `;

            for (const folder of category.folders) {
                html += `
                    <div class="folder-item">
                        <span>📂 ${folder}</span>
                        <button class="btn btn-primary btn-sm" onclick="showUploadMediaModal('${category.category}', '${folder}')">⬆️ Upload</button>
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
            border-bottom: 2px solid #e0e0e0;
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
            color: #666;
            transition: all 0.3s ease;
        }

        .admin-tab:hover {
            color: #c9a66b;
        }

        .admin-tab.active {
            color: #c9a66b;
            border-bottom-color: #c9a66b;
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
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .admin-dashboard .settings-card h3 {
            color: #c9a66b;
            margin-top: 0;
        }

        .admin-dashboard .form-group {
            margin-bottom: 20px;
        }

        .admin-dashboard .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
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
            color: #666;
            font-size: 12px;
        }

        .admin-dashboard .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
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
            background: white;
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
        }

        .admin-dashboard .file-name {
            font-weight: 500;
            margin: 0 0 5px 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .admin-dashboard .file-meta {
            font-size: 12px;
            color: #666;
            margin: 0;
        }

        .admin-dashboard .upload-actions {
            padding: 10px;
            display: flex;
            gap: 10px;
        }

        .admin-dashboard .providers-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        .admin-dashboard .provider-logo {
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
            border-radius: 8px;
            margin-bottom: 15px;
        }

        .admin-dashboard .provider-logo img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }

        .admin-dashboard .provider-company {
            color: #c9a66b;
            font-weight: 500;
        }

        .admin-dashboard .provider-description {
            color: #666;
            font-size: 14px;
        }

        .admin-dashboard .provider-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }

        .admin-dashboard .category-section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .admin-dashboard .category-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .admin-dashboard .category-header h3 {
            color: #c9a66b;
            margin: 0;
        }

        .admin-dashboard .folders-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 10px;
        }

        .admin-dashboard .folder-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: #f9f9f9;
            border-radius: 5px;
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
            background: white;
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
            color: #333;
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
            background: #c9a66b;
            color: white;
        }

        .admin-dashboard .btn-primary:hover {
            background: #b8956a;
        }

        .admin-dashboard .btn-secondary {
            background: #e0e0e0;
            color: #333;
        }

        .admin-dashboard .btn-secondary:hover {
            background: #d0d0d0;
        }

        .admin-dashboard .btn-success {
            background: #4CAF50;
            color: white;
        }

        .admin-dashboard .btn-success:hover {
            background: #45a049;
        }

        .admin-dashboard .btn-danger {
            background: #f44336;
            color: white;
        }

        .admin-dashboard .btn-danger:hover {
            background: #da190b;
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
            color: #666;
        }

        .admin-dashboard .error {
            color: #f44336;
        }

        .hidden {
            display: none !important;
        }
    `;

    document.head.appendChild(style);
}

// Export pour utilisation dans views.js
window.renderAdminDashboard = renderAdminDashboard;
