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

// Éléments du DOM
const loadingSpinner = document.getElementById('loadingSpinner');
const galleryContent = document.getElementById('galleryContent');
const emptyState = document.getElementById('emptyState');
const foldersContainer = document.getElementById('foldersContainer');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxVideo = document.getElementById('lightboxVideo');
const lightboxCounter = document.getElementById('lightboxCounter');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxDownload = document.getElementById('lightboxDownload');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const logoutBtn = document.getElementById('logoutBtn');
const lightboxMediaContainer = document.querySelector('.lightbox-media-container');
const lightboxZoomControls = document.getElementById('lightboxZoomControls');
const lightboxZoomIn = document.getElementById('lightboxZoomIn');
const lightboxZoomOut = document.getElementById('lightboxZoomOut');
const lightboxZoomReset = document.getElementById('lightboxZoomReset');
const lightboxZoomLevel = document.getElementById('lightboxZoomLevel');

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

// Charger les médias
async function loadMedia() {
    try {
        loadingSpinner.style.display = 'flex';
        galleryContent.style.display = 'none';
        emptyState.style.display = 'none';

        const response = await fetch('/api/media');
        const data = await response.json();

        if (data.folders && data.folders.length > 0) {
            renderGallery(data.folders);
            galleryContent.style.display = 'block';
        } else {
            emptyState.style.display = 'flex';
        }
    } catch (error) {
        console.error('Erreur lors du chargement des médias:', error);
        emptyState.style.display = 'flex';
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Rendre la galerie
function renderGallery(folders) {
    foldersContainer.innerHTML = '';
    allMedia = [];

    folders.forEach((folder, folderIndex) => {
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
        downloadFolderBtn.onclick = () => downloadFolder(folder.name);

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
                img.src = file.path;
                img.alt = file.name;
                img.loading = 'lazy';
                mediaItem.appendChild(img);
            } else {
                const video = document.createElement('video');
                video.src = file.path;
                video.preload = 'metadata';
                mediaItem.appendChild(video);
            }

            mediaGrid.appendChild(mediaItem);
        });

        folderSection.appendChild(folderHeader);
        folderSection.appendChild(mediaGrid);
        foldersContainer.appendChild(folderSection);
    });
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

    // Mettre à jour le compteur
    lightboxCounter.textContent = `${index + 1} / ${allMedia.length}`;

    // Mettre à jour les boutons de navigation
    lightboxPrev.disabled = index === 0;
    lightboxNext.disabled = index === allMedia.length - 1;

    // Afficher le média approprié
    if (media.type === 'image') {
        lightboxVideo.style.display = 'none';
        lightboxVideo.pause();
        lightboxVideo.src = '';

        lightboxImage.src = media.path;
        lightboxImage.alt = media.name;
        lightboxImage.style.display = 'block';
        lightboxImage.className = 'lightbox-image zoomable';

        // Afficher les contrôles de zoom pour les images
        lightboxZoomControls.style.display = 'flex';
    } else {
        lightboxImage.style.display = 'none';

        lightboxVideo.src = media.path;
        lightboxVideo.style.display = 'block';
        lightboxVideo.load();

        // Masquer les contrôles de zoom pour les vidéos
        lightboxZoomControls.style.display = 'none';
    }
}

// Navigation dans le lightbox
function navigateLightbox(direction) {
    const newIndex = currentMediaIndex + direction;
    if (newIndex >= 0 && newIndex < allMedia.length) {
        showMedia(newIndex);
    }
}

// Télécharger le média actuel
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

// ===== Fonctions de zoom =====

function setZoom(newZoom) {
    zoomLevel = Math.max(1, Math.min(5, newZoom)); // Limiter entre 1x et 5x

    lightboxImage.style.transform = `scale(${zoomLevel})`;

    if (zoomLevel > 1) {
        lightboxImage.className = 'lightbox-image zoomed';
        lightboxMediaContainer.classList.add('zoomed');
    } else {
        lightboxImage.className = 'lightbox-image zoomable';
        lightboxMediaContainer.classList.remove('zoomed');
    }

    updateZoomDisplay();
}

function zoomIn() {
    setZoom(zoomLevel + 0.25);
}

function zoomOut() {
    setZoom(zoomLevel - 0.25);
}

function resetZoom() {
    zoomLevel = 1;
    lightboxImage.style.transform = 'scale(1)';
    lightboxImage.className = 'lightbox-image zoomable';
    lightboxMediaContainer.classList.remove('zoomed');
    lightboxMediaContainer.scrollLeft = 0;
    lightboxMediaContainer.scrollTop = 0;
    updateZoomDisplay();
}

function updateZoomDisplay() {
    lightboxZoomLevel.textContent = `${Math.round(zoomLevel * 100)}%`;
    lightboxZoomOut.disabled = zoomLevel <= 1;
    lightboxZoomIn.disabled = zoomLevel >= 5;
}

// Gestion du drag/pan de l'image
function handlePanStart(e) {
    if (zoomLevel <= 1) return;

    isPanning = true;
    lightboxMediaContainer.style.cursor = 'grabbing';

    startX = e.pageX - lightboxMediaContainer.offsetLeft;
    startY = e.pageY - lightboxMediaContainer.offsetTop;
    scrollLeft = lightboxMediaContainer.scrollLeft;
    scrollTop = lightboxMediaContainer.scrollTop;

    e.preventDefault();
}

function handlePanMove(e) {
    if (!isPanning) return;

    e.preventDefault();

    const x = e.pageX - lightboxMediaContainer.offsetLeft;
    const y = e.pageY - lightboxMediaContainer.offsetTop;
    const walkX = (x - startX) * 2;
    const walkY = (y - startY) * 2;

    lightboxMediaContainer.scrollLeft = scrollLeft - walkX;
    lightboxMediaContainer.scrollTop = scrollTop - walkY;
}

function handlePanEnd() {
    isPanning = false;
    if (zoomLevel > 1) {
        lightboxMediaContainer.style.cursor = 'grab';
    }
}

// Gestion de la molette pour zoomer
function handleWheel(e) {
    if (!isLightboxOpen || lightboxImage.style.display === 'none') return;

    e.preventDefault();

    const delta = e.deltaY > 0 ? -0.25 : 0.25;
    setZoom(zoomLevel + delta);
}

// Double-clic pour zoomer/dézoomer
function handleDoubleClick(e) {
    if (lightboxImage.style.display === 'none') return;

    if (zoomLevel > 1) {
        resetZoom();
    } else {
        setZoom(2);
    }
}

// Gestion des événements
lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
lightboxNext.addEventListener('click', () => navigateLightbox(1));
lightboxDownload.addEventListener('click', downloadCurrentMedia);
downloadAllBtn.addEventListener('click', downloadAll);
logoutBtn.addEventListener('click', logout);

// Événements de zoom
lightboxZoomIn.addEventListener('click', zoomIn);
lightboxZoomOut.addEventListener('click', zoomOut);
lightboxZoomReset.addEventListener('click', resetZoom);

// Événements de pan/drag
lightboxMediaContainer.addEventListener('mousedown', handlePanStart);
lightboxMediaContainer.addEventListener('mousemove', handlePanMove);
lightboxMediaContainer.addEventListener('mouseup', handlePanEnd);
lightboxMediaContainer.addEventListener('mouseleave', handlePanEnd);

// Événement de molette
lightboxMediaContainer.addEventListener('wheel', handleWheel, { passive: false });

// Double-clic pour zoomer
lightboxImage.addEventListener('dblclick', handleDoubleClick);

// Clic sur le backdrop pour fermer
lightbox.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);

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

// Initialisation
(async () => {
    const isAuthenticated = await checkAuth();
    if (isAuthenticated) {
        await loadMedia();
    }
})();
