require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const archiver = require('archiver');
const exifParser = require('exif-parser');
const sharp = require('sharp');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_CODE = process.env.ACCESS_CODE || 'mariage2025';
const MEDIA_DIR = path.join(__dirname, 'media');
const THUMBNAILS_DIR = path.join(__dirname, '.thumbnails');
const MUSIC_DIR = path.join(__dirname, 'music');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-de-session-super-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    httpOnly: true
  }
}));

// Middleware d'authentification
const requireAuth = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Non authentifié' });
  }
};

// Servir les fichiers statiques
app.use(express.static('public'));
app.use('/media', requireAuth, express.static(MEDIA_DIR));
app.use('/thumbnails', requireAuth, express.static(THUMBNAILS_DIR));
app.use('/music', requireAuth, express.static(MUSIC_DIR));

// Routes d'authentification
app.post('/api/login', (req, res) => {
  const { code } = req.body;

  if (code === ACCESS_CODE) {
    req.session.authenticated = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Code d\'accès incorrect' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

// Fonction pour extraire la date EXIF d'une image
async function getImageDate(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const parser = exifParser.create(buffer);
    const result = parser.parse();

    if (result.tags.DateTimeOriginal) {
      return new Date(result.tags.DateTimeOriginal * 1000);
    }
  } catch (error) {
    // Si on ne peut pas lire les EXIF, on utilise la date de modification
  }

  const stats = await fs.stat(filePath);
  return stats.mtime;
}

// Fonction pour obtenir la date d'une vidéo
async function getVideoDate(filePath) {
  const stats = await fs.stat(filePath);
  return stats.mtime;
}

// Fonction pour générer un hash du chemin du fichier
function getFileHash(filePath) {
  return crypto.createHash('md5').update(filePath).digest('hex');
}

// Fonction pour générer ou récupérer un thumbnail d'image
async function getThumbnail(filePath, folderName, fileName) {
  try {
    // Créer le dossier des thumbnails s'il n'existe pas
    if (!fsSync.existsSync(THUMBNAILS_DIR)) {
      await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
    }

    // Générer un nom unique pour le thumbnail basé sur le chemin
    const fileHash = getFileHash(`${folderName}/${fileName}`);
    const thumbnailName = `${fileHash}.webp`;
    const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailName);

    // Vérifier si le thumbnail existe déjà
    if (fsSync.existsSync(thumbnailPath)) {
      // Vérifier que le thumbnail n'est pas plus vieux que l'original
      const originalStats = await fs.stat(filePath);
      const thumbnailStats = await fs.stat(thumbnailPath);

      if (thumbnailStats.mtime >= originalStats.mtime) {
        return `/thumbnails/${thumbnailName}`;
      }
    }

    // Générer le thumbnail
    await sharp(filePath)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    return `/thumbnails/${thumbnailName}`;
  } catch (error) {
    console.error(`Erreur lors de la génération du thumbnail pour ${fileName}:`, error);
    // En cas d'erreur, retourner le chemin original
    return null;
  }
}

// Fonction pour générer un thumbnail de vidéo (placeholder élégant)
async function getVideoThumbnail(folderName, fileName) {
  try {
    // Créer le dossier des thumbnails s'il n'existe pas
    if (!fsSync.existsSync(THUMBNAILS_DIR)) {
      await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
    }

    // Générer un nom unique pour le thumbnail basé sur le chemin
    const fileHash = getFileHash(`${folderName}/${fileName}`);
    const thumbnailName = `${fileHash}.webp`;
    const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailName);

    // Vérifier si le thumbnail existe déjà
    if (fsSync.existsSync(thumbnailPath)) {
      return `/thumbnails/${thumbnailName}`;
    }

    // Créer un SVG avec icône play
    const svgPlayIcon = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#8b1538;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#6b1029;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="400" fill="url(#bgGradient)"/>
        <circle cx="200" cy="200" r="60" fill="#d4af37" opacity="0.9"/>
        <polygon points="185,175 185,225 230,200" fill="#0a0a0a"/>
      </svg>
    `;

    // Générer le thumbnail à partir du SVG
    await sharp(Buffer.from(svgPlayIcon))
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    return `/thumbnails/${thumbnailName}`;
  } catch (error) {
    console.error(`Erreur lors de la génération du thumbnail vidéo pour ${fileName}:`, error);
    return null;
  }
}

// Fonction pour scanner le dossier media
async function scanMediaDirectory() {
  const folders = [];

  try {
    // Créer le dossier media s'il n'existe pas
    if (!fsSync.existsSync(MEDIA_DIR)) {
      await fs.mkdir(MEDIA_DIR, { recursive: true });
      return folders;
    }

    const items = await fs.readdir(MEDIA_DIR, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        const folderPath = path.join(MEDIA_DIR, item.name);
        const files = await fs.readdir(folderPath);

        const mediaFiles = [];

        for (const file of files) {
          const filePath = path.join(folderPath, file);
          const ext = path.extname(file).toLowerCase();

          // Vérifier si c'est un fichier média
          const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
          const isVideo = ['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext);

          if (isImage || isVideo) {
            const stats = await fs.stat(filePath);
            let date;

            if (isImage) {
              date = await getImageDate(filePath);
            } else {
              date = await getVideoDate(filePath);
            }

            // Générer le thumbnail pour images et vidéos
            let thumbnailPath = null;
            if (isImage) {
              thumbnailPath = await getThumbnail(filePath, item.name, file);
            } else if (isVideo) {
              thumbnailPath = await getVideoThumbnail(item.name, file);
            }

            mediaFiles.push({
              name: file,
              path: `/media/${item.name}/${file}`,
              thumbnail: thumbnailPath || `/media/${item.name}/${file}`,
              type: isImage ? 'image' : 'video',
              size: stats.size,
              date: date.toISOString()
            });
          }
        }

        // Trier les fichiers par date
        mediaFiles.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (mediaFiles.length > 0) {
          // Déterminer la catégorie en fonction du nom du dossier
          const folderNameLower = item.name.toLowerCase();
          const isProfessional =
            folderNameLower.includes('pro') ||
            folderNameLower.includes('photographe') ||
            folderNameLower.includes('photog') ||
            folderNameLower.includes('darkcube') ||
            folderNameLower.includes('professionnel');

          folders.push({
            name: item.name,
            files: mediaFiles,
            count: mediaFiles.length,
            category: isProfessional ? 'professional' : 'guest'
          });
        }
      }
    }

    // Trier les dossiers alphabétiquement
    folders.sort((a, b) => a.name.localeCompare(b.name));

  } catch (error) {
    console.error('Erreur lors du scan des médias:', error);
  }

  return folders;
}

// Route pour obtenir la liste des médias
app.get('/api/media', requireAuth, async (req, res) => {
  try {
    const folders = await scanMediaDirectory();
    res.json({ folders });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des médias' });
  }
});

// Route pour obtenir la liste des musiques
app.get('/api/music', requireAuth, async (req, res) => {
  try {
    // Créer le dossier music s'il n'existe pas
    if (!fsSync.existsSync(MUSIC_DIR)) {
      await fs.mkdir(MUSIC_DIR, { recursive: true });
      return res.json({ tracks: [] });
    }

    const files = await fs.readdir(MUSIC_DIR);
    const musicFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp3', '.wav', '.ogg', '.m4a'].includes(ext);
    });

    const tracks = musicFiles.map(file => ({
      name: path.basename(file, path.extname(file)),
      path: `/music/${file}`
    }));

    res.json({ tracks });
  } catch (error) {
    console.error('Erreur lors de la récupération des musiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des musiques' });
  }
});

// Route pour obtenir la configuration
app.get('/api/config', requireAuth, (req, res) => {
  res.json({
    welcomeTitle: process.env.WELCOME_TITLE || 'Merci d\'être venus !',
    welcomeMessage: process.env.WELCOME_MESSAGE || 'Nous sommes ravis d\'avoir partagé ce moment avec vous. Retrouvez ici tous les souvenirs de notre journée magique.',
    welcomeImage: process.env.WELCOME_IMAGE || '/images/welcome.jpg'
  });
});

// Route pour obtenir la liste des prestataires
app.get('/api/providers', requireAuth, (req, res) => {
  try {
    const providersPath = path.join(__dirname, 'providers.json');
    const providersData = fsSync.readFileSync(providersPath, 'utf8');
    const providers = JSON.parse(providersData);
    res.json(providers);
  } catch (error) {
    console.error('Erreur lors de la lecture des prestataires:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des prestataires' });
  }
});

// Route pour télécharger tous les médias en ZIP
app.get('/api/download-all', requireAuth, async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=mariage-emilie-maxime.zip');

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      console.error('Erreur archiver:', err);
      res.status(500).send('Erreur lors de la création de l\'archive');
    });

    archive.pipe(res);

    // Ajouter tous les fichiers du dossier media
    archive.directory(MEDIA_DIR, false);

    await archive.finalize();
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
});

// Route pour télécharger un dossier spécifique en ZIP
app.get('/api/download-folder/:folderName', requireAuth, async (req, res) => {
  try {
    const folderName = req.params.folderName;
    const folderPath = path.join(MEDIA_DIR, folderName);

    // Vérifier que le dossier existe et est bien dans media/
    if (!folderPath.startsWith(MEDIA_DIR) || !fsSync.existsSync(folderPath)) {
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${folderName}.zip`);

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      console.error('Erreur archiver:', err);
      res.status(500).send('Erreur lors de la création de l\'archive');
    });

    archive.pipe(res);
    archive.directory(folderPath, folderName);

    await archive.finalize();
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur lors du téléchargement' });
  }
});

// Route catch-all pour le routage SPA (doit être après toutes les autres routes)
// Cette route permet de rafraîchir (F5) n'importe quelle page de la SPA
// Ignore les requêtes vers des fichiers statiques (avec extension)
app.get('*', (req, res, next) => {
  // Si la requête a une extension de fichier, on laisse passer (404 normal)
  if (path.extname(req.path)) {
    return next();
  }
  // Sinon, on sert index.html pour le routage SPA
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🎉 Serveur de galerie du mariage démarré sur http://localhost:${PORT}`);
  console.log(`📸 Placez vos photos et vidéos dans le dossier: ${MEDIA_DIR}`);
  console.log(`🔐 Code d'accès configuré: ${ACCESS_CODE}`);
});
