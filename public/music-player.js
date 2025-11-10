// État du lecteur de musique
let musicTracks = [];
let currentTrackIndex = 0;
let isPlaying = false;
let isMuted = false;

// Éléments DOM
const audioPlayer = document.getElementById('audioPlayer');
const musicToggle = document.getElementById('musicToggle');
const volumeToggle = document.getElementById('volumeToggle');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');
const volumeOnIcon = document.getElementById('volumeOnIcon');
const volumeOffIcon = document.getElementById('volumeOffIcon');
const currentTrackDisplay = document.getElementById('currentTrack');

// Charger la liste des musiques
async function loadMusicTracks() {
    try {
        const response = await fetch('/api/music');
        const data = await response.json();

        if (data.tracks && data.tracks.length > 0) {
            musicTracks = data.tracks;
            loadTrack(0);
            currentTrackDisplay.textContent = musicTracks[0].name;
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

// Charger une piste
function loadTrack(index) {
    if (index < 0 || index >= musicTracks.length) return;

    currentTrackIndex = index;
    audioPlayer.src = musicTracks[index].path;
    currentTrackDisplay.textContent = musicTracks[index].name;
    audioPlayer.volume = 0.5; // Volume par défaut à 50%
}

// Lecture/Pause
function togglePlay() {
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

// Piste suivante
function nextTrack() {
    const nextIndex = (currentTrackIndex + 1) % musicTracks.length;
    loadTrack(nextIndex);
    if (isPlaying) {
        audioPlayer.play();
    }
}

// Événements
musicToggle.addEventListener('click', togglePlay);
volumeToggle.addEventListener('click', toggleVolume);

// Passer à la piste suivante automatiquement
audioPlayer.addEventListener('ended', nextTrack);

// Démarrage automatique
audioPlayer.addEventListener('canplay', () => {
    // Tenter de démarrer automatiquement (peut être bloqué par le navigateur)
    if (!isPlaying && musicTracks.length > 0) {
        audioPlayer.play().then(() => {
            isPlaying = true;
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }).catch(error => {
            // L'autoplay est bloqué, l'utilisateur devra cliquer
            console.log('Autoplay bloqué, l\'utilisateur doit démarrer manuellement');
        });
    }
});

// Initialisation
loadMusicTracks();
