// Actions pour l'interface d'administration

/**
 * ======================
 * GESTION DES UPLOADS
 * ======================
 */

async function approveUpload(filename) {
    try {
        const response = await fetch('/api/admin/approve-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Fichier validé avec succès', 'success');
            // Recharger l'onglet uploads
            await loadAdminTab('uploads');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la validation', 'error');
    }
}

async function rejectUpload(filename) {
    if (!confirm('Êtes-vous sûr de vouloir rejeter ce fichier ?')) return;

    try {
        const response = await fetch('/api/admin/reject-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Fichier rejeté', 'success');
            await loadAdminTab('uploads');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors du rejet', 'error');
    }
}

async function approveAllPending() {
    if (!confirm('Valider tous les fichiers en attente ?')) return;

    try {
        const cards = document.querySelectorAll('.pending-upload-card');
        const filenames = Array.from(cards).map(card => card.dataset.filename);

        const response = await fetch('/api/admin/batch-approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filenames })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            await loadAdminTab('uploads');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la validation en lot', 'error');
    }
}

async function rejectAllPending() {
    if (!confirm('Rejeter tous les fichiers en attente ? Cette action est irréversible.')) return;

    try {
        const cards = document.querySelectorAll('.pending-upload-card');
        const filenames = Array.from(cards).map(card => card.dataset.filename);

        const response = await fetch('/api/admin/batch-reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filenames })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            await loadAdminTab('uploads');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors du rejet en lot', 'error');
    }
}

/**
 * ======================
 * GESTION DES PARAMÈTRES
 * ======================
 */

async function updateAdminPassword() {
    const currentPassword = document.getElementById('currentAdminPassword').value;
    const newPassword = document.getElementById('newAdminPassword').value;

    if (!currentPassword || !newPassword) {
        showNotification('Veuillez remplir tous les champs', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showNotification('Le nouveau mot de passe doit contenir au moins 6 caractères', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/settings/admin-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            document.getElementById('currentAdminPassword').value = '';
            document.getElementById('newAdminPassword').value = '';
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

async function updatePublicPassword() {
    const newPassword = document.getElementById('newPublicPassword').value;

    if (!newPassword) {
        showNotification('Veuillez saisir un nouveau mot de passe', 'error');
        return;
    }

    if (newPassword.length < 4) {
        showNotification('Le mot de passe doit contenir au moins 4 caractères', 'error');
        return;
    }

    try {
        const response = await fetch('/api/admin/settings/public-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            document.getElementById('newPublicPassword').value = '';
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

async function updateAdminEmail() {
    const adminEmail = document.getElementById('adminEmail').value;

    try {
        const response = await fetch('/api/admin/settings/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminEmail })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

async function updateSmtpConfig() {
    const smtpConfig = {
        enabled: document.getElementById('smtpEnabled').checked,
        host: document.getElementById('smtpHost').value,
        port: parseInt(document.getElementById('smtpPort').value) || 587,
        secure: document.getElementById('smtpSecure').checked,
        user: document.getElementById('smtpUser').value,
        pass: document.getElementById('smtpPass').value
    };

    try {
        const response = await fetch('/api/admin/settings/smtp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(smtpConfig)
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            document.getElementById('smtpPass').value = '';
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

async function updateWelcomeConfig() {
    const welcomeConfig = {
        title: document.getElementById('welcomeTitle').value,
        message: document.getElementById('welcomeMessage').value,
        image: document.getElementById('welcomeImage').value
    };

    try {
        const response = await fetch('/api/admin/settings/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(welcomeConfig)
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

async function updateMusicConfig() {
    const musicConfig = {
        enabled: document.getElementById('musicEnabled').checked,
        autoplay: document.getElementById('musicAutoplay').checked
    };

    try {
        const response = await fetch('/api/admin/settings/music', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(musicConfig)
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message + ' - Rechargez la page pour voir les changements', 'success');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

async function updateProvidersConfig() {
    const providersConfig = {
        enabled: document.getElementById('providersEnabled').checked
    };

    try {
        const response = await fetch('/api/admin/settings/providers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(providersConfig)
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message + ' - Rechargez la page pour voir les changements', 'success');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la mise à jour', 'error');
    }
}

async function uploadMusicFiles() {
    const fileInput = document.getElementById('musicFileInput');
    const files = fileInput.files;

    if (files.length === 0) {
        showNotification('Veuillez sélectionner au moins un fichier', 'error');
        return;
    }

    showNotification('Upload en cours...', 'info');

    try {
        // Uploader chaque fichier séquentiellement
        for (let i = 0; i < files.length; i++) {
            const formData = new FormData();
            formData.append('music', files[i]);

            const response = await fetch('/api/admin/music/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!data.success) {
                showNotification(`Erreur pour ${files[i].name}: ${data.error}`, 'error');
            }
        }

        showNotification(`${files.length} fichier(s) uploadé(s) avec succès`, 'success');
        fileInput.value = ''; // Réinitialiser l'input

        // Recharger la liste des musiques
        if (typeof loadMusicFilesList === 'function') {
            await loadMusicFilesList();
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de l\'upload', 'error');
    }
}

async function deleteMusicFile(trackName) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${trackName}" ?`)) return;

    try {
        // Le nom du track vient sans extension, on doit retrouver le nom de fichier
        // On récupère la liste complète pour trouver le fichier correspondant
        const response = await fetch('/api/music');
        const data = await response.json();

        const track = data.tracks?.find(t => t.name === trackName);
        if (!track) {
            showNotification('Fichier introuvable', 'error');
            return;
        }

        // Extraire le nom de fichier du path (ex: "/music/song.mp3" → "song.mp3")
        const filename = track.path.split('/').pop();
        const encodedFilename = encodeURIComponent(filename);

        const deleteResponse = await fetch(`/api/admin/music/${encodedFilename}`, {
            method: 'DELETE'
        });

        const deleteData = await deleteResponse.json();

        if (deleteData.success) {
            showNotification(deleteData.message, 'success');

            // Recharger la liste des musiques
            if (typeof loadMusicFilesList === 'function') {
                await loadMusicFilesList();
            }
        } else {
            showNotification(deleteData.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

/**
 * ======================
 * GESTION DES PRESTATAIRES
 * ======================
 */

function showAddProviderModal() {
    document.getElementById('providerModalTitle').textContent = 'Ajouter un prestataire';
    document.getElementById('providerId').value = '';
    document.getElementById('providerForm').reset();
    document.getElementById('providerModal').classList.remove('hidden');
}

function closeProviderModal() {
    document.getElementById('providerModal').classList.add('hidden');
}

function editProvider(providerId) {
    // Récupérer le provider depuis la variable globale
    const provider = window.currentProviders?.find(p => p.id === providerId);
    if (!provider) {
        console.error('Provider non trouvé:', providerId);
        showNotification('Erreur: prestataire introuvable', 'error');
        return;
    }

    document.getElementById('providerModalTitle').textContent = 'Modifier le prestataire';
    document.getElementById('providerId').value = provider.id;
    document.getElementById('providerName').value = provider.name;
    document.getElementById('providerCompany').value = provider.company;
    document.getElementById('providerDescription').value = provider.description;
    document.getElementById('providerLogo').value = provider.logo;
    document.getElementById('providerReviewLink').value = provider.reviewLink || '';
    document.getElementById('providerWebsiteLink').value = provider.websiteLink || '';
    document.getElementById('providerModal').classList.remove('hidden');
}

async function uploadProviderLogo(file) {
    const formData = new FormData();
    formData.append('logo', file);

    try {
        const response = await fetch('/api/admin/providers/upload-logo', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('providerLogo').value = data.logoPath;
            showNotification('Logo uploadé avec succès', 'success');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de l\'upload du logo', 'error');
    }
}

async function saveProvider(event) {
    event.preventDefault();

    const providerId = document.getElementById('providerId').value;
    const providerData = {
        name: document.getElementById('providerName').value,
        company: document.getElementById('providerCompany').value,
        description: document.getElementById('providerDescription').value,
        logo: document.getElementById('providerLogo').value || '/images/default-provider.jpg',
        reviewLink: document.getElementById('providerReviewLink').value,
        websiteLink: document.getElementById('providerWebsiteLink').value
    };

    try {
        let response;

        if (providerId) {
            // Mise à jour
            response = await fetch(`/api/admin/providers/${providerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(providerData)
            });
        } else {
            // Création
            response = await fetch('/api/admin/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(providerData)
            });
        }

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            closeProviderModal();
            await loadAdminTab('providers');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de l\'enregistrement', 'error');
    }
}

async function deleteProvider(providerId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce prestataire ?')) return;

    try {
        const response = await fetch(`/api/admin/providers/${providerId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            await loadAdminTab('providers');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

/**
 * ======================
 * GESTION DE LA GALERIE
 * ======================
 */

function showAddCategoryModal() {
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryModal').classList.remove('hidden');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.add('hidden');
}

async function createCategory(event) {
    event.preventDefault();

    const categoryName = document.getElementById('categoryName').value;

    try {
        const response = await fetch('/api/admin/gallery/category', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryName })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            closeCategoryModal();
            await loadAdminTab('gallery');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la création', 'error');
    }
}

function showAddFolderModal(category) {
    document.getElementById('folderCategory').value = category;
    document.getElementById('folderName').value = '';
    document.getElementById('folderModal').classList.remove('hidden');
}

function closeFolderModal() {
    document.getElementById('folderModal').classList.add('hidden');
}

async function createFolder(event) {
    event.preventDefault();

    const category = document.getElementById('folderCategory').value;
    const folderName = document.getElementById('folderName').value;

    try {
        const response = await fetch('/api/admin/gallery/folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, folderName })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            closeFolderModal();
            await loadAdminTab('gallery');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la création', 'error');
    }
}

function showUploadMediaModal(category, folder) {
    document.getElementById('uploadCategory').value = category;
    document.getElementById('uploadFolder').value = folder;
    document.getElementById('uploadDestination').textContent = `${category} / ${folder}`;
    document.getElementById('mediaFiles').value = '';
    document.getElementById('uploadMediaModal').classList.remove('hidden');
}

function closeUploadMediaModal() {
    document.getElementById('uploadMediaModal').classList.add('hidden');
}

async function uploadMedia(event) {
    event.preventDefault();

    const category = document.getElementById('uploadCategory').value;
    const folder = document.getElementById('uploadFolder').value;
    const files = document.getElementById('mediaFiles').files;

    if (files.length === 0) {
        showNotification('Veuillez sélectionner au moins un fichier', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('category', category);
    formData.append('folder', folder);

    for (let i = 0; i < files.length; i++) {
        formData.append('media', files[i]);
    }

    try {
        showNotification('Upload en cours...', 'info');

        const response = await fetch('/api/admin/gallery/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            closeUploadMediaModal();
            // Recharger la galerie si elle est affichée
            if (window.loadMedia) {
                await window.loadMedia();
            }
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de l\'upload', 'error');
    }
}

/**
 * ======================
 * FONCTIONS UTILITAIRES
 * ======================
 */

function showNotification(message, type = 'info') {
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // Ajouter les styles si nécessaire
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                animation: slideIn 0.3s ease;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            .notification-success {
                background: #4CAF50;
            }

            .notification-error {
                background: #f44336;
            }

            .notification-info {
                background: #2196F3;
            }
        `;
        document.head.appendChild(style);
    }

    // Ajouter au DOM
    document.body.appendChild(notification);

    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Ouvrir la lightbox (réutiliser celle existante)
function openLightbox(path, type) {
    if (window.openLightboxFromPath) {
        window.openLightboxFromPath(path, type);
    } else {
        // Fallback: ouvrir dans un nouvel onglet
        window.open(path, '_blank');
    }
}

/**
 * ======================
 * GESTION DU LIVRE D'OR
 * ======================
 */

async function approveGuestbookEntry(entryId) {
    try {
        const response = await fetch(`/api/admin/guestbook/approve/${entryId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            await loadAdminTab('guestbook');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de l\'approbation', 'error');
    }
}

async function deleteGuestbookEntry(entryId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;

    try {
        const response = await fetch(`/api/admin/guestbook/${entryId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            await loadAdminTab('guestbook');
        } else {
            showNotification(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}
