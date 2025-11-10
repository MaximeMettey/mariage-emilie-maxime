// État du lecteur de musique
let musicTracks = [];
let currentTrackIndex = 0;
let isPlaying = false;
let isMuted = false;
let hasUserInteracted = false;

// Éléments DOM
const audioPlayer = document.getElementById('audioPlayer');
const musicToggle = document.getElementById('musicToggle');
const volumeToggle = document.getElementById('volumeToggle');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const volumeOnIcon = document.getElementById('volumeOnIcon');
const volumeOffIcon = document.getElementById('volumeOffIcon');
const currentTrackDisplay = document.getElementById('currentTrack');
const progressBar = document.getElementById('progressBar');

// Charger la liste des musiques
async function loadMusicTracks() {
    try {
        const response = await fetch('/api/music');
        const data = await response.json();

        if (data.tracks && data.tracks.length > 0) {
            musicTracks = data.tracks;
            loadTrack(0);
            currentTrackDisplay.textContent = musicTracks[0].name;

            // Tenter le démarrage automatique après un court délai
            setTimeout(tryAutoplay, 100);
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
    if (!isPlaying && musicTracks.length > 0) {
        audioPlayer.play().then(() => {
            isPlaying = true;
            hasUserInteracted = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }).catch(error => {
            console.log('Autoplay bloqué, démarrage au premier clic');
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

// Piste suivante
function nextTrack() {
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

// Événements
musicToggle.addEventListener('click', togglePlay);
volumeToggle.addEventListener('click', toggleVolume);

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

// Démarrer au premier clic sur la page si l'autoplay n'a pas fonctionné
document.addEventListener('click', function autoplayOnInteraction() {
    if (!hasUserInteracted && musicTracks.length > 0) {
        hasUserInteracted = true;
        audioPlayer.play().then(() => {
            isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }).catch(() => {
            // Silencieux si ça ne marche pas
        });
        // Supprimer l'écouteur après la première interaction
        document.removeEventListener('click', autoplayOnInteraction);
    }
}, { once: false });

// Initialisation
loadMusicTracks();
