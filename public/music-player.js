// État du lecteur de musique
let musicTracks = [];
let musicSettings = { enabled: true, autoplay: true };
let currentTrackIndex = 0;
let isPlaying = false;
let isMuted = false;
let hasUserInteracted = false;

// Éléments DOM
const audioPlayer = document.getElementById('audioPlayer');
const musicToggle = document.getElementById('musicToggle');
const volumeToggle = document.getElementById('volumeToggle');
const prevTrackBtn = document.getElementById('prevTrack');
const nextTrackBtn = document.getElementById('nextTrack');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const volumeOnIcon = document.getElementById('volumeOnIcon');
const volumeOffIcon = document.getElementById('volumeOffIcon');
const currentTrackDisplay = document.getElementById('currentTrack');
const progressBar = document.getElementById('progressBar');
const progressContainer = document.querySelector('.music-progress');

// Charger la liste des musiques
async function loadMusicTracks() {
    try {
        const response = await fetch('/api/music');
        const data = await response.json();

        // Récupérer les paramètres de musique
        if (data.settings) {
            musicSettings = data.settings;
        }

        // Si le lecteur est désactivé, masquer le player
        const musicPlayer = document.getElementById('musicPlayer');
        if (musicPlayer && !musicSettings.enabled) {
            musicPlayer.style.display = 'none';
            return;
        }

        if (data.tracks && data.tracks.length > 0) {
            musicTracks = data.tracks;

            // Choisir une piste au hasard
            const randomIndex = Math.floor(Math.random() * musicTracks.length);
            loadTrack(randomIndex);

            // Tenter le démarrage automatique après un court délai si autoplay est activé
            if (musicSettings.autoplay) {
                setTimeout(tryAutoplay, 100);
            }
        } else {
            currentTrackDisplay.textContent = 'Aucune musique';
            musicToggle.disabled = true;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des musiques:', error);
        currentTrackDisplay.textContent = 'Erreur';
        musicToggle.disabled = true;
    }
}

// Tenter de démarrer automatiquement
function tryAutoplay() {
    if (!isPlaying && musicTracks.length > 0 && musicSettings.autoplay) {
        audioPlayer.play().then(() => {
            isPlaying = true;
            hasUserInteracted = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            // Retirer l'animation si elle existe
            if (musicToggle) musicToggle.classList.remove('pulse-animation');
        }).catch(error => {
            console.log('Autoplay bloqué, démarrage au premier clic');
            // Ajouter une animation pour attirer l'attention
            if (musicToggle) musicToggle.classList.add('pulse-animation');
        });
    }
}

// Charger une piste
function loadTrack(index) {
    if (index < 0 || index >= musicTracks.length) return;

    currentTrackIndex = index;
    audioPlayer.src = musicTracks[index].path;
    currentTrackDisplay.textContent = musicTracks[index].name;
    audioPlayer.volume = 0.5; // Volume par défaut à 50%

    if (progressBar) {
        progressBar.style.width = '0%';
    }
}

// Lecture/Pause
function togglePlay() {
    hasUserInteracted = true;
    // Retirer l'animation d'autoplay bloqué
    if (musicToggle) musicToggle.classList.remove('pulse-animation');

    if (audioPlayer.paused) {
        audioPlayer.play().then(() => {
            isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }).catch(error => {
            console.error('Erreur de lecture:', error);
        });
    } else {
        audioPlayer.pause();
        isPlaying = false;
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }
}

// Mute/Unmute
function toggleVolume() {
    hasUserInteracted = true;
    isMuted = !isMuted;
    audioPlayer.muted = isMuted;

    if (isMuted) {
        volumeOnIcon.style.display = 'none';
        volumeOffIcon.style.display = 'block';
    } else {
        volumeOnIcon.style.display = 'block';
        volumeOffIcon.style.display = 'none';
    }
}

// Mettre à jour la barre de progression
function updateProgress() {
    if (audioPlayer.duration) {
        const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
    }
}

// Naviguer dans la piste en cliquant sur la barre de progression
function seekToPosition(event) {
    const progressContainer = event.currentTarget;
    const rect = progressContainer.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;

    if (audioPlayer.duration) {
        audioPlayer.currentTime = percentage * audioPlayer.duration;
        hasUserInteracted = true;
    }
}

// Piste suivante
function nextTrack() {
    if (musicTracks.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % musicTracks.length;
    loadTrack(nextIndex);
    if (isPlaying || hasUserInteracted) {
        audioPlayer.play().then(() => {
            isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        });
    }
}

// Piste précédente
function prevTrack() {
    if (musicTracks.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + musicTracks.length) % musicTracks.length;
    loadTrack(prevIndex);
    if (isPlaying || hasUserInteracted) {
        audioPlayer.play().then(() => {
            isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        });
    }
}

// Événements
musicToggle.addEventListener('click', togglePlay);
volumeToggle.addEventListener('click', toggleVolume);
if (prevTrackBtn) prevTrackBtn.addEventListener('click', prevTrack);
if (nextTrackBtn) nextTrackBtn.addEventListener('click', nextTrack);
if (progressContainer) progressContainer.addEventListener('click', seekToPosition);

// Passer à la piste suivante automatiquement
audioPlayer.addEventListener('ended', nextTrack);

// Mettre à jour la progression
audioPlayer.addEventListener('timeupdate', updateProgress);

// Réinitialiser la barre quand la piste se charge
audioPlayer.addEventListener('loadedmetadata', () => {
    if (progressBar) {
        progressBar.style.width = '0%';
    }
});

// Démarrer au premier clic sur la page si l'autoplay n'a pas fonctionné (et si autoplay est activé)
document.addEventListener('click', function autoplayOnInteraction() {
    if (!hasUserInteracted && musicTracks.length > 0 && musicSettings.autoplay) {
        hasUserInteracted = true;
        audioPlayer.play().then(() => {
            isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            // Retirer l'animation
            if (musicToggle) musicToggle.classList.remove('pulse-animation');
        }).catch(() => {
            // Silencieux si ça ne marche pas
        });
        // Supprimer l'écouteur après la première interaction
        document.removeEventListener('click', autoplayOnInteraction);
    }
}, { once: false });

// NOTE: loadMusicTracks() est appelé dans login.js après authentification
// Ne pas l'appeler ici car l'utilisateur n'est pas encore authentifié

