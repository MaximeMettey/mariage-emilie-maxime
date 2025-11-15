// État de l'application
let allMedia = [];
let currentMediaIndex = 0;
let isLightboxOpen = false;

// État du zoom
let zoomLevel = 1;
let isPanning = false;
let startX = 0;
let startY = 0;
let scrollLeft = 0;
let scrollTop = 0;

// État de la musique pour gestion vidéo
let musicWasPlaying = false;

// Éléments du DOM (lightbox global)
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxVideo = document.getElementById('lightboxVideo');
const lightboxInfo = document.getElementById('lightboxInfo');
const closeLightboxBtn = document.getElementById('closeLightbox');
const downloadMediaBtn = document.getElementById('downloadMedia');
const prevMediaBtn = document.getElementById('prevMedia');
const nextMediaBtn = document.getElementById('nextMedia');
const lightboxZoomControls = document.getElementById('lightboxZoomControls');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const resetZoomBtn = document.getElementById('resetZoom');

// Charger les médias
async function loadMedia() {
    const foldersContainer = document.getElementById('foldersContainer');
    if (!foldersContainer) return;

    try {
        foldersContainer.innerHTML = '<div class="loading">Chargement des médias...</div>';

        const response = await fetch('/api/media');
        const data = await response.json();

        if (data.categories && data.categories.length > 0) {
            renderGallery(data.categories);
        } else {
            foldersContainer.innerHTML = '<div class="empty-state">Aucun média trouvé</div>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des médias:', error);
        foldersContainer.innerHTML = '<div class="error-state">Erreur lors du chargement</div>';
    }

    // Ajouter l'événement pour le bouton de téléchargement
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    if (downloadAllBtn) {
        downloadAllBtn.onclick = downloadAll;
    }
}

// Rendre la galerie
function renderGallery(categories) {
    const foldersContainer = document.getElementById('foldersContainer');
    if (!foldersContainer) return;

    foldersContainer.innerHTML = '';
    allMedia = [];

    let globalFolderIndex = 0;

    // Parcourir chaque catégorie
    categories.forEach((categoryData) => {
        const categorySection = document.createElement('div');
        categorySection.className = 'category-section';

        const categoryTitle = document.createElement('h2');
        categoryTitle.className = 'category-title';
        categoryTitle.textContent = categoryData.category;
        categorySection.appendChild(categoryTitle);

        // Parcourir les dossiers de cette catégorie
        categoryData.folders.forEach((folder) => {
            categorySection.appendChild(createFolderSection(folder, globalFolderIndex, categoryData.category));
            globalFolderIndex++;
        });

        foldersContainer.appendChild(categorySection);
    });
}

// Créer une section de dossier
function createFolderSection(folder, folderIndex, categoryName) {
    // Créer la section du dossier
    const folderSection = document.createElement('div');
    folderSection.className = 'folder-section';
    folderSection.style.animationDelay = `${folderIndex * 0.1}s`;

    // Header du dossier
    const folderHeader = document.createElement('div');
    folderHeader.className = 'folder-header';

    const folderInfo = document.createElement('div');
    const folderTitle = document.createElement('h2');
    folderTitle.className = 'folder-title';
    folderTitle.textContent = folder.name;
    const folderCount = document.createElement('span');
    folderCount.className = 'folder-count';
    folderCount.textContent = `${folder.count} ${folder.count > 1 ? 'médias' : 'média'}`;
    folderInfo.appendChild(folderTitle);

    const folderActions = document.createElement('div');
    folderActions.className = 'folder-actions';

    const downloadFolderBtn = document.createElement('button');
    downloadFolderBtn.className = 'btn-small';
    downloadFolderBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Télécharger ce dossier
    `;
    downloadFolderBtn.onclick = () => downloadFolder(`${categoryName}/${folder.name}`);

    folderActions.appendChild(folderCount);
    folderActions.appendChild(downloadFolderBtn);

    folderHeader.appendChild(folderInfo);
    folderHeader.appendChild(folderActions);

    // Grille de médias
    const mediaGrid = document.createElement('div');
    mediaGrid.className = 'media-grid';

    folder.files.forEach((file, fileIndex) => {
        const mediaIndex = allMedia.length;
        allMedia.push(file);

        const mediaItem = document.createElement('div');
        mediaItem.className = `media-item ${file.type}`;
        mediaItem.style.animationDelay = `${(folderIndex * 0.1) + (fileIndex * 0.05)}s`;
        mediaItem.onclick = () => openLightbox(mediaIndex);

        if (file.type === 'image') {
            const img = document.createElement('img');
            img.src = file.thumbnail || file.path;
            img.alt = file.name;
            img.loading = 'lazy';
            mediaItem.appendChild(img);
        } else {
            const videoThumb = document.createElement('div');
            videoThumb.className = 'video-thumbnail';
            videoThumb.style.backgroundImage = `url(${file.thumbnail})`;

            const playIcon = document.createElement('div');
            playIcon.className = 'play-icon';
            playIcon.innerHTML = `
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            `;
            videoThumb.appendChild(playIcon);
            mediaItem.appendChild(videoThumb);
        }

        // Bouton de téléchargement pour chaque média
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'media-download-btn';
        downloadBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
        `;
        downloadBtn.onclick = (e) => {
            e.stopPropagation(); // Empêcher l'ouverture de la lightbox
            downloadSingleMedia(file);
        };
        mediaItem.appendChild(downloadBtn);

        mediaGrid.appendChild(mediaItem);
    });

    folderSection.appendChild(folderHeader);
    folderSection.appendChild(mediaGrid);

    return folderSection;
}

// Ouvrir le lightbox
function openLightbox(index) {
    currentMediaIndex = index;
    isLightboxOpen = true;
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    showMedia(index);
}

// Fermer le lightbox
function closeLightbox() {
    isLightboxOpen = false;
    lightbox.style.display = 'none';
    document.body.style.overflow = 'auto';

    // Arrêter la vidéo si elle est en cours
    if (lightboxVideo.style.display !== 'none') {
        lightboxVideo.pause();
        lightboxVideo.src = '';
    }

    // Reprendre la musique si elle était en cours avant la vidéo
    if (musicWasPlaying) {
        const audioPlayer = document.getElementById('audioPlayer');
        if (audioPlayer) {
            audioPlayer.play().then(() => {
                const playIcon = document.getElementById('playIcon');
                const pauseIcon = document.getElementById('pauseIcon');
                if (playIcon && pauseIcon) {
                    playIcon.style.display = 'none';
                    pauseIcon.style.display = 'block';
                }
            }).catch(() => {});
        }
        musicWasPlaying = false;
    }

    // Réinitialiser le zoom
    resetZoom();
}

// Afficher un média dans le lightbox
function showMedia(index) {
    if (index < 0 || index >= allMedia.length) return;

    const media = allMedia[index];
    currentMediaIndex = index;

    // Réinitialiser le zoom
    resetZoom();

    // Mettre à jour l'info
    if (lightboxInfo) {
        lightboxInfo.textContent = `${index + 1} / ${allMedia.length}`;
    }

    // Mettre à jour les boutons de navigation
    if (prevMediaBtn) prevMediaBtn.disabled = index === 0;
    if (nextMediaBtn) nextMediaBtn.disabled = index === allMedia.length - 1;

    // Afficher le média approprié
    if (media.type === 'image') {
        // Si on passe d'une vidéo à une image, reprendre la musique si nécessaire
        if (lightboxVideo.style.display !== 'none' && musicWasPlaying) {
            const audioPlayer = document.getElementById('audioPlayer');
            if (audioPlayer) {
                audioPlayer.play().then(() => {
                    const playIcon = document.getElementById('playIcon');
                    const pauseIcon = document.getElementById('pauseIcon');
                    if (playIcon && pauseIcon) {
                        playIcon.style.display = 'none';
                        pauseIcon.style.display = 'block';
                    }
                }).catch(() => {});
            }
            musicWasPlaying = false;
        }

        lightboxVideo.style.display = 'none';
        lightboxVideo.pause();
        lightboxVideo.src = '';

        lightboxImage.src = media.path;
        lightboxImage.alt = media.name;
        lightboxImage.style.display = 'block';

        // Afficher les contrôles de zoom pour les images
        if (lightboxZoomControls) {
            lightboxZoomControls.style.display = 'flex';
        }
    } else {
        lightboxImage.style.display = 'none';

        lightboxVideo.src = media.path;
        lightboxVideo.style.display = 'block';
        lightboxVideo.load();

        // Lecture automatique des vidéos
        lightboxVideo.play().catch(error => {
            console.log('Autoplay non autorisé:', error);
        });

        // Masquer les contrôles de zoom pour les vidéos
        if (lightboxZoomControls) {
            lightboxZoomControls.style.display = 'none';
        }
    }
}

// Navigation dans le lightbox
function navigateLightbox(direction) {
    const newIndex = currentMediaIndex + direction;
    if (newIndex >= 0 && newIndex < allMedia.length) {
        showMedia(newIndex);
    }
}

// Télécharger le média courant
function downloadCurrentMedia() {
    if (currentMediaIndex >= 0 && currentMediaIndex < allMedia.length) {
        const media = allMedia[currentMediaIndex];
        const link = document.createElement('a');
        link.href = media.path;
        link.download = media.name;
        link.click();
    }
}

// Télécharger tous les médias
async function downloadAll() {
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    if (!downloadAllBtn) return;

    try {
        downloadAllBtn.disabled = true;
        downloadAllBtn.innerHTML = `
            <div style="width: 20px; height: 20px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            Téléchargement...
        `;

        const response = await fetch('/api/download-all');
        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mariage-emilie-maxime.zip';
        link.click();

        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erreur lors du téléchargement:', error);
        alert('Erreur lors du téléchargement. Veuillez réessayer.');
    } finally {
        downloadAllBtn.disabled = false;
        downloadAllBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Tout télécharger
        `;
    }
}

// Télécharger un dossier spécifique
async function downloadFolder(folderName) {
    try {
        const response = await fetch(`/api/download-folder/${encodeURIComponent(folderName)}`);
        const blob = await response.blob();

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${folderName}.zip`;
        link.click();

        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erreur lors du téléchargement du dossier:', error);
        alert('Erreur lors du téléchargement. Veuillez réessayer.');
    }
}

// Télécharger un média individuel
function downloadSingleMedia(media) {
    const link = document.createElement('a');
    link.href = media.path;
    link.download = media.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== Fonctions de zoom =====

function setZoom(newZoom) {
    if (!lightboxImage) return;

    zoomLevel = Math.max(1, Math.min(5, newZoom)); // Limiter entre 1x et 5x
    lightboxImage.style.transform = `scale(${zoomLevel})`;

    if (zoomLevel > 1) {
        lightboxImage.style.cursor = 'grab';
    } else {
        lightboxImage.style.cursor = 'default';
    }
}

function zoomIn() {
    setZoom(zoomLevel + 0.25);
}

function zoomOut() {
    setZoom(zoomLevel - 0.25);
}

function resetZoom() {
    zoomLevel = 1;
    if (lightboxImage) {
        lightboxImage.style.transform = 'scale(1)';
        lightboxImage.style.cursor = 'default';
    }
}

// Gestion du drag/pan de l'image
if (lightboxImage) {
    lightboxImage.addEventListener('mousedown', (e) => {
        if (zoomLevel <= 1) return;
        isPanning = true;
        lightboxImage.style.cursor = 'grabbing';
        startX = e.clientX;
        startY = e.clientY;
    });

    // Double-clic pour zoomer/dézoomer
    lightboxImage.addEventListener('dblclick', () => {
        if (zoomLevel > 1) {
            resetZoom();
        } else {
            setZoom(2);
        }
    });
}

document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    e.preventDefault();
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    // Logique de pan simplifiée
});

document.addEventListener('mouseup', () => {
    isPanning = false;
    if (zoomLevel > 1 && lightboxImage) {
        lightboxImage.style.cursor = 'grab';
    }
});

// Gestion des événements du lightbox
if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
if (downloadMediaBtn) downloadMediaBtn.addEventListener('click', downloadCurrentMedia);
if (prevMediaBtn) prevMediaBtn.addEventListener('click', () => navigateLightbox(-1));
if (nextMediaBtn) nextMediaBtn.addEventListener('click', () => navigateLightbox(1));
if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
if (resetZoomBtn) resetZoomBtn.addEventListener('click', resetZoom);

// Gestion de la musique pendant lecture vidéo
if (lightboxVideo) {
    // Quand la vidéo commence à jouer
    lightboxVideo.addEventListener('play', () => {
        const audioPlayer = document.getElementById('audioPlayer');
        if (audioPlayer && !audioPlayer.paused) {
            // Mémoriser que la musique était en cours
            musicWasPlaying = true;
            // Mettre en pause la musique
            audioPlayer.pause();
            // Mettre à jour l'icône du lecteur
            const playIcon = document.getElementById('playIcon');
            const pauseIcon = document.getElementById('pauseIcon');
            if (playIcon && pauseIcon) {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            }
        }
    });

    // Quand la vidéo se met en pause
    lightboxVideo.addEventListener('pause', () => {
        if (musicWasPlaying) {
            const audioPlayer = document.getElementById('audioPlayer');
            if (audioPlayer) {
                audioPlayer.play().then(() => {
                    // Mettre à jour l'icône du lecteur
                    const playIcon = document.getElementById('playIcon');
                    const pauseIcon = document.getElementById('pauseIcon');
                    if (playIcon && pauseIcon) {
                        playIcon.style.display = 'none';
                        pauseIcon.style.display = 'block';
                    }
                });
            }
            musicWasPlaying = false;
        }
    });

    // Quand la vidéo se termine
    lightboxVideo.addEventListener('ended', () => {
        if (musicWasPlaying) {
            const audioPlayer = document.getElementById('audioPlayer');
            if (audioPlayer) {
                audioPlayer.play().then(() => {
                    // Mettre à jour l'icône du lecteur
                    const playIcon = document.getElementById('playIcon');
                    const pauseIcon = document.getElementById('pauseIcon');
                    if (playIcon && pauseIcon) {
                        playIcon.style.display = 'none';
                        pauseIcon.style.display = 'block';
                    }
                });
            }
            musicWasPlaying = false;
        }
    });
}

// Navigation au clavier
document.addEventListener('keydown', (e) => {
    if (!isLightboxOpen) return;

    switch (e.key) {
        case 'Escape':
            closeLightbox();
            break;
        case 'ArrowLeft':
            if (!isPanning) navigateLightbox(-1);
            break;
        case 'ArrowRight':
            if (!isPanning) navigateLightbox(1);
            break;
        case '+':
        case '=':
            if (lightboxImage.style.display !== 'none') zoomIn();
            break;
        case '-':
        case '_':
            if (lightboxImage.style.display !== 'none') zoomOut();
            break;
        case '0':
            if (lightboxImage.style.display !== 'none') resetZoom();
            break;
    }
});

// Enregistrer les routes
if (typeof router !== 'undefined') {
    router.register('welcome', renderWelcomeView);
    router.register('gallery', renderGalleryView);
    router.register('providers', renderProvidersView);
    router.register('admin', renderAdminDashboard);
}
