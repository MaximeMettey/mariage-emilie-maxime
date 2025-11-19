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
const multer = require('multer');
const nodemailer = require('nodemailer');
const AdmZip = require('adm-zip');
const configManager = require('./config-manager');
const guestbookManager = require('./guestbook-manager');

const app = express();
const PORT = process.env.PORT || 3000;
const ACCESS_CODE = process.env.ACCESS_CODE || 'mariage2025';
const ADMIN_CODE = process.env.ADMIN_CODE || 'admin2025';
const MEDIA_DIR = path.join(__dirname, 'media');
const THUMBNAILS_DIR = path.join(__dirname, '.thumbnails');
const WEB_OPTIMIZED_DIR = path.join(__dirname, '.web-optimized');
const MUSIC_DIR = path.join(__dirname, 'music');
const PENDING_UPLOADS_DIR = path.join(MEDIA_DIR, 'Photos Invités', 'Pending');
const UPLOADS_DIR = path.join(MEDIA_DIR, 'Photos Invités', 'Uploads');

// Configuration email - sera initialisée depuis la config ou .env
let emailTransporter = null;

function initializeEmailTransporter() {
  const smtpConfig = configManager.getSmtpConfig();

  if (smtpConfig && smtpConfig.enabled && smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
    emailTransporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port || 587,
      secure: smtpConfig.secure || false,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      }
    });
    console.log('📧 Configuration email SMTP activée');
  } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Fallback vers .env si la config n'existe pas encore
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('📧 Configuration email SMTP activée (depuis .env)');
  } else {
    console.log('⚠️  Configuration email SMTP non configurée - les notifications ne seront pas envoyées');
  }
}

// Initialiser l'email transporter
initializeEmailTransporter();

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

// Middleware de vérification du setup
const requireSetup = (req, res, next) => {
  // Ne pas rediriger pour les routes de setup et les fichiers statiques
  if (req.path === '/setup.html' || req.path === '/setup.js' ||
      req.path.startsWith('/api/setup') || req.path.startsWith('/api/check-setup')) {
    return next();
  }

  // Vérifier si le setup est complet
  if (!configManager.isSetupComplete()) {
    // Si c'est une requête API, retourner une erreur JSON
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({
        error: 'Setup requis',
        setupRequired: true
      });
    }
    // Sinon, rediriger vers la page de setup
    return res.redirect('/setup.html');
  }

  next();
};

// Middleware d'authentification
const requireAuth = (req, res, next) => {
  if (req.session.authenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Non authentifié' });
  }
};

// Middleware d'authentification admin
const requireAdmin = (req, res, next) => {
  if (req.session.authenticated && req.session.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Accès refusé - Droits administrateur requis' });
  }
};

// Servir les fichiers statiques
app.use(express.static('public'));
app.use('/media', requireAuth, express.static(MEDIA_DIR));
app.use('/thumbnails', requireAuth, express.static(THUMBNAILS_DIR));
app.use('/web-optimized', requireAuth, express.static(WEB_OPTIMIZED_DIR));
app.use('/music', requireAuth, express.static(MUSIC_DIR));

// Routes de setup (avant requireSetup middleware)
app.get('/api/check-setup', (req, res) => {
  res.json({
    setupComplete: configManager.isSetupComplete()
  });
});

app.post('/api/setup', async (req, res) => {
  try {
    // Vérifier que le setup n'a pas déjà été fait
    if (configManager.isSetupComplete()) {
      return res.status(400).json({
        error: 'La configuration a déjà été effectuée'
      });
    }

    const setupData = req.body;

    // Validation basique
    if (!setupData.adminPassword || !setupData.publicPassword) {
      return res.status(400).json({
        error: 'Les mots de passe sont requis'
      });
    }

    if (setupData.adminPassword.length < 6) {
      return res.status(400).json({
        error: 'Le mot de passe administrateur doit contenir au moins 6 caractères'
      });
    }

    if (setupData.publicPassword.length < 4) {
      return res.status(400).json({
        error: 'Le mot de passe invités doit contenir au moins 4 caractères'
      });
    }

    if (setupData.adminPassword === setupData.publicPassword) {
      return res.status(400).json({
        error: 'Les mots de passe administrateur et invités doivent être différents'
      });
    }

    // Initialiser la configuration
    const success = await configManager.initializeSetup(setupData);

    if (success) {
      // Réinitialiser l'email transporter avec la nouvelle config
      initializeEmailTransporter();

      res.json({
        success: true,
        message: 'Configuration initiale effectuée avec succès'
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors de la sauvegarde de la configuration'
      });
    }
  } catch (error) {
    console.error('Erreur lors du setup:', error);
    res.status(500).json({
      error: 'Erreur lors de la configuration',
      message: error.message
    });
  }
});

// Appliquer le middleware de vérification du setup à toutes les routes suivantes
app.use(requireSetup);

// Routes d'authentification
app.post('/api/login', async (req, res) => {
  try {
    const { code } = req.body;

    // Vérifier si c'est un code admin
    const isAdmin = await configManager.verifyAdminPassword(code);
    if (isAdmin) {
      req.session.authenticated = true;
      req.session.role = 'admin';
      return res.json({ success: true, role: 'admin' });
    }

    // Vérifier si c'est un code invité
    const isGuest = await configManager.verifyPublicPassword(code);
    if (isGuest) {
      req.session.authenticated = true;
      req.session.role = 'guest';
      return res.json({ success: true, role: 'guest' });
    }

    // Code incorrect
    res.status(401).json({ error: 'Code d\'accès incorrect' });
  } catch (error) {
    console.error('Erreur lors de l\'authentification:', error);
    res.status(500).json({ error: 'Erreur lors de l\'authentification' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  res.json({ authenticated: !!req.session.authenticated });
});

app.get('/api/user-role', requireAuth, (req, res) => {
  res.json({ role: req.session.role || 'guest' });
});

// Cache pour le scan des médias
let mediaCache = {
  data: null,
  timestamp: 0,
  directoryMtime: 0
};

// Durée de validité du cache en ms (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Fonction pour invalider le cache
function invalidateMediaCache() {
  console.log('🗑️ Invalidation du cache média');
  mediaCache = {
    data: null,
    timestamp: 0,
    directoryMtime: 0
  };
}

// Fonction pour obtenir la date de modification la plus récente d'un répertoire (récursif)
async function getDirectoryMtime(dir) {
  try {
    let maxMtime = 0;

    if (!fsSync.existsSync(dir)) {
      return 0;
    }

    const stats = await fs.stat(dir);
    maxMtime = stats.mtimeMs;

    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const itemPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        const subMtime = await getDirectoryMtime(itemPath);
        maxMtime = Math.max(maxMtime, subMtime);
      } else {
        const itemStats = await fs.stat(itemPath);
        maxMtime = Math.max(maxMtime, itemStats.mtimeMs);
      }
    }

    return maxMtime;
  } catch (error) {
    return 0;
  }
}

// Fonction pour extraire la date d'une image (utilise mtime pour la performance)
async function getImageDate(filePath) {
  try {
    // Utiliser mtime directement pour la performance
    // L'extraction EXIF est trop lente avec beaucoup de photos volumineuses
    const stats = await fs.stat(filePath);
    return stats.mtime;
  } catch (error) {
    return new Date();
  }
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

// Fonction pour générer une version web optimisée d'une image
async function getWebOptimized(filePath, folderName, fileName) {
  try {
    // Créer le dossier des versions web s'il n'existe pas
    if (!fsSync.existsSync(WEB_OPTIMIZED_DIR)) {
      await fs.mkdir(WEB_OPTIMIZED_DIR, { recursive: true });
    }

    // Générer un nom unique pour la version web basé sur le chemin
    const fileHash = getFileHash(`${folderName}/${fileName}`);
    const ext = path.extname(fileName).toLowerCase();
    const baseName = path.basename(fileName, ext);
    const webName = `${fileHash}.webp`;
    const webPath = path.join(WEB_OPTIMIZED_DIR, webName);

    // Vérifier si la version web existe déjà
    if (fsSync.existsSync(webPath)) {
      // Vérifier que la version web n'est pas plus vieille que l'original
      const originalStats = await fs.stat(filePath);
      const webStats = await fs.stat(webPath);

      if (webStats.mtime >= originalStats.mtime) {
        return `/web-optimized/${webName}`;
      }
    }

    // Générer la version web optimisée (2048px max, WebP 85%)
    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Ne redimensionner que si l'image est plus grande que 2048px
    if (metadata.width > 2048 || metadata.height > 2048) {
      await image
        .resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85 })
        .toFile(webPath);
    } else {
      // Si l'image est déjà petite, juste convertir en WebP
      await image
        .webp({ quality: 85 })
        .toFile(webPath);
    }

    console.log(`✅ Version web créée: ${fileName} → ${webName}`);
    return `/web-optimized/${webName}`;
  } catch (error) {
    console.error(`Erreur lors de la génération de la version web pour ${fileName}:`, error);
    // En cas d'erreur, retourner le chemin original
    return null;
  }
}

// Fonction pour scanner le dossier media avec 2 niveaux
async function scanMediaDirectory() {
  const categories = [];

  try {
    // Créer le dossier media s'il n'existe pas
    if (!fsSync.existsSync(MEDIA_DIR)) {
      await fs.mkdir(MEDIA_DIR, { recursive: true });
      return categories;
    }

    const categoryItems = await fs.readdir(MEDIA_DIR, { withFileTypes: true });

    // Premier niveau : catégories
    for (const categoryItem of categoryItems) {
      if (categoryItem.isDirectory()) {
        const categoryPath = path.join(MEDIA_DIR, categoryItem.name);
        const subFolders = await fs.readdir(categoryPath, { withFileTypes: true });

        const foldersInCategory = [];

        // Deuxième niveau : dossiers de médias
        for (const subFolder of subFolders) {
          // Exclure le dossier "Pending" de la galerie publique
          if (subFolder.isDirectory() && subFolder.name !== 'Pending') {
            const subFolderPath = path.join(categoryPath, subFolder.name);
            const files = await fs.readdir(subFolderPath);

            const mediaFiles = [];

            // Scanner les fichiers médias
            for (const file of files) {
              const filePath = path.join(subFolderPath, file);
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
                let webOptimizedPath = null;

                if (isImage) {
                  thumbnailPath = await getThumbnail(filePath, `${categoryItem.name}/${subFolder.name}`, file);
                  // Générer version web optimisée pour les images
                  webOptimizedPath = await getWebOptimized(filePath, `${categoryItem.name}/${subFolder.name}`, file);
                } else if (isVideo) {
                  thumbnailPath = await getVideoThumbnail(`${categoryItem.name}/${subFolder.name}`, file);
                }

                const originalPath = `/media/${categoryItem.name}/${subFolder.name}/${file}`;

                mediaFiles.push({
                  name: file,
                  // Utiliser la version web optimisée pour l'affichage, sinon l'original
                  path: webOptimizedPath || originalPath,
                  // Garder le chemin original pour le téléchargement
                  originalPath: originalPath,
                  thumbnail: thumbnailPath || originalPath,
                  type: isImage ? 'image' : 'video',
                  size: stats.size,
                  date: date.toISOString()
                });
              }
            }

            // Trier les fichiers par date
            mediaFiles.sort((a, b) => new Date(a.date) - new Date(b.date));

            if (mediaFiles.length > 0) {
              foldersInCategory.push({
                name: subFolder.name,
                files: mediaFiles,
                count: mediaFiles.length
              });
            }
          }
        }

        // Trier les dossiers alphabétiquement
        foldersInCategory.sort((a, b) => a.name.localeCompare(b.name));

        if (foldersInCategory.length > 0) {
          categories.push({
            category: categoryItem.name,
            folders: foldersInCategory
          });
        }
      }
    }

    // Trier les catégories alphabétiquement
    categories.sort((a, b) => a.category.localeCompare(b.category));

  } catch (error) {
    console.error('Erreur lors du scan des médias:', error);
  }

  return categories;
}

// Route pour obtenir la liste des médias (avec cache)
app.get('/api/media', requireAuth, async (req, res) => {
  try {
    const now = Date.now();
    const currentMtime = await getDirectoryMtime(MEDIA_DIR);

    // Vérifier si le cache est valide
    const cacheValid = mediaCache.data &&
                       (now - mediaCache.timestamp < CACHE_DURATION) &&
                       (currentMtime === mediaCache.directoryMtime);

    if (cacheValid) {
      console.log('✅ Cache hit - retour immédiat');
      return res.json({ categories: mediaCache.data, cached: true });
    }

    // Scan et mise à jour du cache
    console.log('🔄 Cache miss - scan du répertoire média...');
    const categories = await scanMediaDirectory();

    mediaCache = {
      data: categories,
      timestamp: now,
      directoryMtime: currentMtime
    };

    res.json({ categories });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des médias' });
  }
});

// Route pour obtenir la liste des musiques et la configuration
app.get('/api/music', requireAuth, async (req, res) => {
  try {
    // Récupérer la configuration musicale
    const musicSettings = configManager.getMusicSettings();

    // Créer le dossier music s'il n'existe pas
    if (!fsSync.existsSync(MUSIC_DIR)) {
      await fs.mkdir(MUSIC_DIR, { recursive: true });
      return res.json({
        tracks: [],
        settings: musicSettings
      });
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

    res.json({
      tracks,
      settings: musicSettings
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des musiques:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des musiques' });
  }
});

// Route pour obtenir la configuration
app.get('/api/config', requireAuth, (req, res) => {
  const welcomeConfig = configManager.getWelcomeConfig();
  res.json({
    welcomeTitle: welcomeConfig.title,
    welcomeMessage: welcomeConfig.message,
    welcomeImage: welcomeConfig.image
  });
});

// Routes d'administration pour la gestion des paramètres
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  const config = configManager.getPublicConfig();
  res.json(config);
});

app.post('/api/admin/settings/admin-password', requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Les mots de passe actuels et nouveaux sont requis'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Vérifier le mot de passe actuel
    const isValid = await configManager.verifyAdminPassword(currentPassword);
    if (!isValid) {
      return res.status(401).json({
        error: 'Mot de passe actuel incorrect'
      });
    }

    // Mettre à jour le mot de passe
    const success = await configManager.updateAdminPassword(newPassword);

    if (success) {
      res.json({
        success: true,
        message: 'Mot de passe administrateur mis à jour avec succès'
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors de la mise à jour du mot de passe'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe admin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/settings/public-password', requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe est requis'
      });
    }

    if (newPassword.length < 4) {
      return res.status(400).json({
        error: 'Le nouveau mot de passe doit contenir au moins 4 caractères'
      });
    }

    const success = await configManager.updatePublicPassword(newPassword);

    if (success) {
      res.json({
        success: true,
        message: 'Mot de passe invités mis à jour avec succès'
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors de la mise à jour du mot de passe'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe public:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/settings/email', requireAdmin, (req, res) => {
  try {
    const { adminEmail } = req.body;

    const success = configManager.updateAdminEmail(adminEmail);

    if (success) {
      res.json({
        success: true,
        message: 'Email administrateur mis à jour avec succès'
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors de la mise à jour de l\'email'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'email:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/settings/smtp', requireAdmin, (req, res) => {
  try {
    const smtpConfig = req.body;

    const success = configManager.updateSmtpConfig(smtpConfig);

    if (success) {
      // Réinitialiser l'email transporter
      initializeEmailTransporter();

      res.json({
        success: true,
        message: 'Configuration SMTP mise à jour avec succès'
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors de la mise à jour de la configuration SMTP'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour SMTP:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/settings/music', requireAdmin, (req, res) => {
  try {
    const musicSettings = configManager.getMusicSettings();
    res.json(musicSettings);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres musicaux:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/settings/music', requireAdmin, (req, res) => {
  try {
    const musicSettings = req.body;

    const success = configManager.updateMusicSettings(musicSettings);

    if (success) {
      res.json({
        success: true,
        message: 'Configuration musicale mise à jour avec succès'
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors de la mise à jour de la configuration musicale'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration musicale:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/admin/settings/providers', requireAdmin, (req, res) => {
  try {
    const providersSettings = configManager.getProvidersSettings();
    res.json(providersSettings);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres prestataires:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/settings/providers', requireAdmin, (req, res) => {
  try {
    const providersSettings = req.body;

    const success = configManager.updateProvidersSettings(providersSettings);

    if (success) {
      res.json({
        success: true,
        message: 'Configuration de la page prestataires mise à jour avec succès'
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors de la mise à jour de la configuration'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la configuration prestataires:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/admin/settings/welcome', requireAdmin, (req, res) => {
  try {
    const welcomeConfig = req.body;

    const success = configManager.updateWelcomeConfig(welcomeConfig);

    if (success) {
      res.json({
        success: true,
        message: 'Configuration de la page d\'accueil mise à jour avec succès'
      });
    } else {
      res.status(500).json({
        error: 'Erreur lors de la mise à jour de la configuration'
      });
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la page d\'accueil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour obtenir la liste des prestataires
app.get('/api/providers', requireAuth, (req, res) => {
  try {
    // Vérifier si la page prestataires est activée
    const providersSettings = configManager.getProvidersSettings();

    if (!providersSettings.enabled) {
      return res.json({ providers: [], enabled: false });
    }

    const providersPath = path.join(__dirname, 'providers.json');
    const providersData = fsSync.readFileSync(providersPath, 'utf8');
    const providers = JSON.parse(providersData);
    res.json({ ...providers, enabled: true });
  } catch (error) {
    console.error('Erreur lors de la lecture des prestataires:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des prestataires' });
  }
});

// Routes CRUD pour la gestion des prestataires (admin uniquement)
app.post('/api/admin/providers', requireAdmin, async (req, res) => {
  try {
    const providersPath = path.join(__dirname, 'providers.json');
    const providersData = fsSync.readFileSync(providersPath, 'utf8');
    const data = JSON.parse(providersData);

    const newProvider = req.body;

    // Générer un ID unique
    newProvider.id = newProvider.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();

    // Ajouter le nouveau prestataire
    data.providers.push(newProvider);

    // Sauvegarder
    await fs.writeFile(providersPath, JSON.stringify(data, null, 2), 'utf8');

    res.json({
      success: true,
      provider: newProvider,
      message: 'Prestataire ajouté avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du prestataire:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du prestataire' });
  }
});

app.put('/api/admin/providers/:id', requireAdmin, async (req, res) => {
  try {
    const providersPath = path.join(__dirname, 'providers.json');
    const providersData = fsSync.readFileSync(providersPath, 'utf8');
    const data = JSON.parse(providersData);

    const providerId = req.params.id;
    const updatedProvider = req.body;

    // Trouver l'index du prestataire
    const index = data.providers.findIndex(p => p.id === providerId);

    if (index === -1) {
      return res.status(404).json({ error: 'Prestataire non trouvé' });
    }

    // Conserver l'ID original
    updatedProvider.id = providerId;

    // Mettre à jour
    data.providers[index] = updatedProvider;

    // Sauvegarder
    await fs.writeFile(providersPath, JSON.stringify(data, null, 2), 'utf8');

    res.json({
      success: true,
      provider: updatedProvider,
      message: 'Prestataire mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du prestataire:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du prestataire' });
  }
});

app.delete('/api/admin/providers/:id', requireAdmin, async (req, res) => {
  try {
    const providersPath = path.join(__dirname, 'providers.json');
    const providersData = fsSync.readFileSync(providersPath, 'utf8');
    const data = JSON.parse(providersData);

    const providerId = req.params.id;

    // Filtrer le prestataire à supprimer
    const originalLength = data.providers.length;
    data.providers = data.providers.filter(p => p.id !== providerId);

    if (data.providers.length === originalLength) {
      return res.status(404).json({ error: 'Prestataire non trouvé' });
    }

    // Sauvegarder
    await fs.writeFile(providersPath, JSON.stringify(data, null, 2), 'utf8');

    res.json({
      success: true,
      message: 'Prestataire supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du prestataire:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du prestataire' });
  }
});

// ============================================
// ROUTES DU LIVRE D'OR
// ============================================

// Soumettre un message (public, authentifié)
app.post('/api/guestbook', requireAuth, (req, res) => {
  try {
    const { name, message } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    const result = guestbookManager.addEntry(name, message, ip);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erreur lors de l\'ajout du message:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du message' });
  }
});

// Récupérer les messages approuvés (public, authentifié)
app.get('/api/guestbook', requireAuth, (req, res) => {
  try {
    const entries = guestbookManager.getApprovedEntries();
    res.json({ entries });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
});

// Récupérer tous les messages pour modération (admin uniquement)
app.get('/api/admin/guestbook', requireAdmin, (req, res) => {
  try {
    const entries = guestbookManager.getAllEntries();
    const stats = guestbookManager.getStats();
    res.json({ entries, stats });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
});

// Approuver un message
app.post('/api/admin/guestbook/approve/:id', requireAdmin, (req, res) => {
  try {
    const result = guestbookManager.approveEntry(req.params.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Erreur lors de l\'approbation du message:', error);
    res.status(500).json({ error: 'Erreur lors de l\'approbation du message' });
  }
});

// Supprimer un message
app.delete('/api/admin/guestbook/:id', requireAdmin, (req, res) => {
  try {
    const result = guestbookManager.rejectEntry(req.params.id);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du message:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du message' });
  }
});

// Upload de logo pour un prestataire
const providerLogoStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const logoDir = path.join(__dirname, 'public', 'images', 'providers');
    try {
      if (!fsSync.existsSync(logoDir)) {
        await fs.mkdir(logoDir, { recursive: true });
      }
      cb(null, logoDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `provider-logo-${uniqueSuffix}${ext}`);
  }
});

const providerLogoUpload = multer({
  storage: providerLogoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

app.post('/api/admin/providers/upload-logo', requireAdmin, providerLogoUpload.single('logo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    const logoPath = `/images/providers/${req.file.filename}`;

    res.json({
      success: true,
      logoPath: logoPath,
      message: 'Logo uploadé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du logo:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload du logo' });
  }
});

// Upload de musique
const musicStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const musicDir = path.join(__dirname, 'music');
    try {
      if (!fsSync.existsSync(musicDir)) {
        await fs.mkdir(musicDir, { recursive: true });
      }
      cb(null, musicDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Conserver le nom original pour faciliter la reconnaissance
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, sanitized);
  }
});

const musicUpload = multer({
  storage: musicStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp3|wav|ogg|m4a|flac/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /audio/.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers audio sont autorisés (mp3, wav, ogg, m4a, flac)'));
    }
  }
});

app.post('/api/admin/music/upload', requireAdmin, musicUpload.single('music'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    res.json({
      success: true,
      filename: req.file.filename,
      message: 'Musique uploadée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload de la musique:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload de la musique' });
  }
});

// Supprimer une musique
app.delete('/api/admin/music/:filename', requireAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(MUSIC_DIR, filename);

    // Vérifier que le fichier existe
    if (!fsSync.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    // Supprimer le fichier
    await fs.unlink(filePath);

    res.json({
      success: true,
      message: 'Musique supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la musique:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la musique' });
  }
});

// Routes pour la gestion de la galerie (admin uniquement)

// Lister les catégories et dossiers
app.get('/api/admin/gallery/structure', requireAdmin, async (req, res) => {
  try {
    const structure = [];

    if (!fsSync.existsSync(MEDIA_DIR)) {
      await fs.mkdir(MEDIA_DIR, { recursive: true });
      return res.json({ structure: [] });
    }

    const categoryItems = await fs.readdir(MEDIA_DIR, { withFileTypes: true });

    for (const categoryItem of categoryItems) {
      if (categoryItem.isDirectory()) {
        const categoryPath = path.join(MEDIA_DIR, categoryItem.name);
        const subFolders = await fs.readdir(categoryPath, { withFileTypes: true });

        const folders = subFolders
          .filter(f => f.isDirectory())
          .map(f => f.name);

        structure.push({
          category: categoryItem.name,
          folders: folders
        });
      }
    }

    res.json({ structure });
  } catch (error) {
    console.error('Erreur lors de la récupération de la structure:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la structure' });
  }
});

// Créer une nouvelle catégorie
app.post('/api/admin/gallery/category', requireAdmin, async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName || categoryName.trim() === '') {
      return res.status(400).json({ error: 'Nom de catégorie requis' });
    }

    const categoryPath = path.join(MEDIA_DIR, categoryName);

    if (fsSync.existsSync(categoryPath)) {
      return res.status(400).json({ error: 'Cette catégorie existe déjà' });
    }

    await fs.mkdir(categoryPath, { recursive: true });

    res.json({
      success: true,
      message: 'Catégorie créée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la catégorie' });
  }
});

// Créer un nouveau dossier dans une catégorie
app.post('/api/admin/gallery/folder', requireAdmin, async (req, res) => {
  try {
    const { category, folderName } = req.body;

    if (!category || !folderName || folderName.trim() === '') {
      return res.status(400).json({ error: 'Catégorie et nom de dossier requis' });
    }

    const folderPath = path.join(MEDIA_DIR, category, folderName);

    // Vérifier que le chemin est bien dans MEDIA_DIR (sécurité)
    if (!folderPath.startsWith(MEDIA_DIR)) {
      return res.status(400).json({ error: 'Chemin invalide' });
    }

    if (fsSync.existsSync(folderPath)) {
      return res.status(400).json({ error: 'Ce dossier existe déjà' });
    }

    await fs.mkdir(folderPath, { recursive: true });

    res.json({
      success: true,
      message: 'Dossier créé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la création du dossier:', error);
    res.status(500).json({ error: 'Erreur lors de la création du dossier' });
  }
});

// Upload de médias directement dans un dossier spécifique
const galleryMediaStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const { category, folder } = req.body;

      if (!category || !folder) {
        return cb(new Error('Catégorie et dossier requis'));
      }

      const destPath = path.join(MEDIA_DIR, category, folder);

      // Vérifier que le chemin est bien dans MEDIA_DIR (sécurité)
      if (!destPath.startsWith(MEDIA_DIR)) {
        return cb(new Error('Chemin invalide'));
      }

      // Créer le dossier s'il n'existe pas
      if (!fsSync.existsSync(destPath)) {
        await fs.mkdir(destPath, { recursive: true });
      }

      cb(null, destPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Utiliser le nom original du fichier
    cb(null, file.originalname);
  }
});

const galleryMediaUpload = multer({
  storage: galleryMediaStorage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max
    files: 50 // 50 fichiers max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|mp4|webm|mov|avi|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images et vidéos sont autorisées'));
    }
  }
});

app.post('/api/admin/gallery/upload', requireAdmin, galleryMediaUpload.array('media', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    const { category, folder } = req.body;

    // Pré-générer les versions web optimisées pour les images
    let optimizedCount = 0;
    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);

      if (isImage) {
        try {
          await getWebOptimized(file.path, `${category}/${folder}`, file.originalname);
          optimizedCount++;
        } catch (error) {
          console.error(`Erreur optimisation de ${file.originalname}:`, error);
        }
      }
    }

    // Invalider le cache après l'upload
    invalidateMediaCache();

    console.log(`✅ ${req.files.length} fichier(s) uploadé(s), ${optimizedCount} optimisé(s)`);

    res.json({
      success: true,
      count: req.files.length,
      optimizedCount,
      message: `${req.files.length} fichier(s) uploadé(s) avec succès dans ${category}/${folder}`
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload des médias:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload des médias' });
  }
});

// Optimiser tous les médias existants
app.post('/api/admin/optimize-media', requireAdmin, async (req, res) => {
  try {
    let totalImages = 0;
    let optimizedCount = 0;
    let alreadyOptimized = 0;
    let errors = 0;

    // Scanner récursivement tous les dossiers media
    async function optimizeDirectory(dir, relativePath = '') {
      const items = await fs.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relPath = relativePath ? `${relativePath}/${item.name}` : item.name;

        if (item.isDirectory()) {
          // Ignorer le dossier Pending
          if (item.name !== 'Pending') {
            await optimizeDirectory(fullPath, relPath);
          }
        } else if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();
          const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);

          if (isImage) {
            totalImages++;

            try {
              // Vérifier si la version web existe déjà
              const fileHash = getFileHash(relPath);
              const webName = `${fileHash}.webp`;
              const webPath = path.join(WEB_OPTIMIZED_DIR, webName);

              if (fsSync.existsSync(webPath)) {
                // Vérifier que la version web n'est pas plus vieille
                const originalStats = await fs.stat(fullPath);
                const webStats = await fs.stat(webPath);

                if (webStats.mtime >= originalStats.mtime) {
                  alreadyOptimized++;
                  continue;
                }
              }

              // Générer la version web
              await getWebOptimized(fullPath, path.dirname(relPath), item.name);
              optimizedCount++;

              // Pré-générer aussi le thumbnail pendant qu'on y est
              await getThumbnail(fullPath, path.dirname(relPath), item.name);
            } catch (error) {
              console.error(`Erreur optimisation ${relPath}:`, error);
              errors++;
            }
          }
        }
      }
    }

    console.log('🔄 Début de l\'optimisation des médias existants...');
    await optimizeDirectory(MEDIA_DIR);

    // Invalider le cache pour forcer le rechargement avec les nouvelles versions
    invalidateMediaCache();

    const message = `Optimisation terminée : ${optimizedCount} images optimisées, ${alreadyOptimized} déjà optimisées, ${errors} erreurs sur ${totalImages} images totales`;
    console.log(`✅ ${message}`);

    res.json({
      success: true,
      message,
      stats: {
        total: totalImages,
        optimized: optimizedCount,
        alreadyOptimized,
        errors
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'optimisation des médias:', error);
    res.status(500).json({ error: 'Erreur lors de l\'optimisation des médias' });
  }
});

// Supprimer un fichier média
app.delete('/api/admin/gallery/file', requireAdmin, async (req, res) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: 'Chemin du fichier requis' });
    }

    // Construire le chemin complet
    const fullPath = path.join(__dirname, 'public', filePath);

    // Vérifier que le chemin est bien dans MEDIA_DIR (sécurité)
    const realMediaPath = path.join(__dirname, 'public', 'media');
    if (!fullPath.startsWith(realMediaPath)) {
      return res.status(400).json({ error: 'Chemin invalide' });
    }

    if (!fsSync.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    await fs.unlink(fullPath);

    // Invalider le cache après suppression
    invalidateMediaCache();

    res.json({
      success: true,
      message: 'Fichier supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du fichier:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du fichier' });
  }
});

// Supprimer une catégorie (et tout son contenu)
app.delete('/api/admin/gallery/category/:categoryName', requireAdmin, async (req, res) => {
  try {
    const { categoryName } = req.params;

    if (!categoryName || categoryName.trim() === '') {
      return res.status(400).json({ error: 'Nom de catégorie requis' });
    }

    const categoryPath = path.join(MEDIA_DIR, categoryName);

    // Vérifier que le chemin est bien dans MEDIA_DIR (sécurité)
    if (!categoryPath.startsWith(MEDIA_DIR)) {
      return res.status(400).json({ error: 'Chemin invalide' });
    }

    if (!fsSync.existsSync(categoryPath)) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    // Supprimer récursivement le dossier et tout son contenu
    await fs.rm(categoryPath, { recursive: true, force: true });

    // Invalider le cache après suppression
    invalidateMediaCache();

    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la catégorie' });
  }
});

// Renommer une catégorie
app.put('/api/admin/gallery/category/:oldName', requireAdmin, async (req, res) => {
  try {
    const { oldName } = req.params;
    const { newName } = req.body;

    if (!oldName || !newName || newName.trim() === '') {
      return res.status(400).json({ error: 'Ancien et nouveau nom requis' });
    }

    const oldPath = path.join(MEDIA_DIR, oldName);
    const newPath = path.join(MEDIA_DIR, newName);

    // Vérifier que les chemins sont bien dans MEDIA_DIR (sécurité)
    if (!oldPath.startsWith(MEDIA_DIR) || !newPath.startsWith(MEDIA_DIR)) {
      return res.status(400).json({ error: 'Chemin invalide' });
    }

    if (!fsSync.existsSync(oldPath)) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    if (fsSync.existsSync(newPath)) {
      return res.status(400).json({ error: 'Une catégorie avec ce nom existe déjà' });
    }

    // Renommer le dossier
    await fs.rename(oldPath, newPath);

    // Invalider le cache après renommage
    invalidateMediaCache();

    res.json({
      success: true,
      message: 'Catégorie renommée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du renommage de la catégorie:', error);
    res.status(500).json({ error: 'Erreur lors du renommage de la catégorie' });
  }
});

// Supprimer un dossier (et tout son contenu)
app.delete('/api/admin/gallery/folder', requireAdmin, async (req, res) => {
  try {
    const { category, folderName } = req.body;

    if (!category || !folderName || folderName.trim() === '') {
      return res.status(400).json({ error: 'Catégorie et nom de dossier requis' });
    }

    const folderPath = path.join(MEDIA_DIR, category, folderName);

    // Vérifier que le chemin est bien dans MEDIA_DIR (sécurité)
    if (!folderPath.startsWith(MEDIA_DIR)) {
      return res.status(400).json({ error: 'Chemin invalide' });
    }

    if (!fsSync.existsSync(folderPath)) {
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }

    // Supprimer récursivement le dossier et tout son contenu
    await fs.rm(folderPath, { recursive: true, force: true });

    // Invalider le cache après suppression
    invalidateMediaCache();

    res.json({
      success: true,
      message: 'Dossier supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du dossier:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du dossier' });
  }
});

// Renommer un dossier
app.put('/api/admin/gallery/folder', requireAdmin, async (req, res) => {
  try {
    const { category, oldName, newName } = req.body;

    if (!category || !oldName || !newName || newName.trim() === '') {
      return res.status(400).json({ error: 'Catégorie, ancien et nouveau nom requis' });
    }

    const oldPath = path.join(MEDIA_DIR, category, oldName);
    const newPath = path.join(MEDIA_DIR, category, newName);

    // Vérifier que les chemins sont bien dans MEDIA_DIR (sécurité)
    if (!oldPath.startsWith(MEDIA_DIR) || !newPath.startsWith(MEDIA_DIR)) {
      return res.status(400).json({ error: 'Chemin invalide' });
    }

    if (!fsSync.existsSync(oldPath)) {
      return res.status(404).json({ error: 'Dossier non trouvé' });
    }

    if (fsSync.existsSync(newPath)) {
      return res.status(400).json({ error: 'Un dossier avec ce nom existe déjà' });
    }

    // Renommer le dossier
    await fs.rename(oldPath, newPath);

    // Invalider le cache après renommage
    invalidateMediaCache();

    res.json({
      success: true,
      message: 'Dossier renommé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du renommage du dossier:', error);
    res.status(500).json({ error: 'Erreur lors du renommage du dossier' });
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

// Configuration multer pour l'upload de photos (en attente de validation)
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Créer le dossier d'uploads en attente s'il n'existe pas
      if (!fsSync.existsSync(PENDING_UPLOADS_DIR)) {
        await fs.mkdir(PENDING_UPLOADS_DIR, { recursive: true });
      }
      cb(null, PENDING_UPLOADS_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Générer un nom unique pour éviter les conflits
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max par fichier (augmenté pour les ZIP)
    files: 20 // 20 fichiers max par upload
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp|mp4|webm|mov|avi|mkv|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed';

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seuls les images, vidéos et fichiers ZIP sont autorisés'));
    }
  }
});

// Fonction pour extraire les fichiers ZIP
async function extractZipFiles(zipPath, destDir) {
  const extractedFiles = [];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.mp4', '.webm', '.mov', '.avi', '.mkv'];

  try {
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    for (const entry of zipEntries) {
      // Ignorer les dossiers et fichiers cachés
      if (entry.isDirectory || entry.entryName.startsWith('__MACOSX') || path.basename(entry.entryName).startsWith('.')) {
        continue;
      }

      const ext = path.extname(entry.entryName).toLowerCase();
      if (allowedExtensions.includes(ext)) {
        // Générer un nom unique
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const baseName = path.basename(entry.entryName, ext);
        const newFileName = `${baseName}-${uniqueSuffix}${ext}`;
        const destPath = path.join(destDir, newFileName);

        // Extraire le fichier
        await fs.writeFile(destPath, entry.getData());
        extractedFiles.push(newFileName);
        console.log(`📦 Extrait depuis ZIP: ${newFileName}`);
      }
    }

    return extractedFiles;
  } catch (error) {
    console.error('Erreur lors de l\'extraction du ZIP:', error);
    throw error;
  }
}

// Route pour uploader des photos (en attente de validation)
app.post('/api/upload-photos', requireAuth, upload.array('photos', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    // Traiter les fichiers ZIP
    let totalFilesCount = 0;
    const allFiles = [];

    for (const file of req.files) {
      const ext = path.extname(file.filename).toLowerCase();

      if (ext === '.zip') {
        try {
          console.log(`📦 Traitement du fichier ZIP: ${file.filename}`);
          const extractedFiles = await extractZipFiles(file.path, PENDING_UPLOADS_DIR);
          totalFilesCount += extractedFiles.length;
          allFiles.push(...extractedFiles);

          // Supprimer le fichier ZIP après extraction
          await fs.unlink(file.path);
          console.log(`🗑️  ZIP supprimé: ${file.filename}`);
        } catch (error) {
          console.error(`❌ Erreur lors du traitement du ZIP ${file.filename}:`, error);
          // Continuer avec les autres fichiers
        }
      } else {
        totalFilesCount++;
        allFiles.push(file.filename);
      }
    }

    const filesUploaded = totalFilesCount;
    const filesList = allFiles.join('\n- ');

    // Envoyer un email de notification si configuré
    if (emailTransporter && process.env.NOTIFICATION_EMAIL) {
      try {
        await emailTransporter.sendMail({
          from: process.env.SMTP_USER,
          to: process.env.NOTIFICATION_EMAIL,
          subject: `🎉 Nouveaux médias uploadés - ${filesUploaded} fichier(s)`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #8b1538;">Nouveaux médias en attente de validation</h2>
              <p>Un invité vient d'uploader <strong>${filesUploaded} fichier(s)</strong> qui sont maintenant en attente de validation.</p>

              <h3 style="color: #d4af37;">Fichiers uploadés :</h3>
              <ul style="list-style: none; padding: 0;">
                ${allFiles.map(f => `<li style="padding: 5px 0;">📸 ${f}</li>`).join('')}
              </ul>

              <p style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-left: 4px solid #8b1538;">
                <strong>Action requise :</strong> Connectez-vous à votre interface d'administration pour valider ou rejeter ces médias.
              </p>

              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Les fichiers sont stockés dans : media/Photos Invités/Pending/
              </p>
            </div>
          `
        });
        console.log(`📧 Email de notification envoyé pour ${filesUploaded} fichier(s)`);
      } catch (emailError) {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', emailError);
        // On continue même si l'email échoue
      }
    }

    res.json({
      success: true,
      count: filesUploaded,
      message: `${filesUploaded} fichier(s) uploadé(s) avec succès. Ils seront visibles après validation.`
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload des fichiers' });
  }
});

// Routes d'administration pour la validation des uploads

// Lister les uploads en attente
// Fonction récursive pour lire les fichiers dans les sous-dossiers
async function readPendingFilesRecursive(dir, baseDir = dir, filesList = []) {
  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Lire récursivement les sous-dossiers
      await readPendingFilesRecursive(fullPath, baseDir, filesList);
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
      const isVideo = ['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext);

      if (isImage || isVideo) {
        const stats = await fs.stat(fullPath);
        const relativePath = path.relative(baseDir, fullPath);
        const webPath = `/media/Photos Invités/Pending/${relativePath}`.replace(/\\/g, '/');

        filesList.push({
          name: relativePath.replace(/\\/g, '/'), // Utiliser le chemin relatif complet
          displayName: path.basename(item.name), // Juste le nom du fichier pour l'affichage
          folderPath: path.dirname(relativePath).replace(/\\/g, '/'), // Chemin du dossier
          path: webPath,
          type: isImage ? 'image' : 'video',
          size: stats.size,
          uploadedAt: stats.mtime.toISOString()
        });
      }
    }
  }

  return filesList;
}

app.get('/api/admin/pending-uploads', requireAdmin, async (req, res) => {
  try {
    // Créer le dossier s'il n'existe pas
    if (!fsSync.existsSync(PENDING_UPLOADS_DIR)) {
      await fs.mkdir(PENDING_UPLOADS_DIR, { recursive: true });
      return res.json({ files: [] });
    }

    const pendingFiles = await readPendingFilesRecursive(PENDING_UPLOADS_DIR);

    // Trier par date d'upload (plus récent en premier)
    pendingFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({ files: pendingFiles });
  } catch (error) {
    console.error('Erreur lors de la récupération des uploads en attente:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des uploads' });
  }
});

// Valider un upload (déplacer vers Uploads)
app.post('/api/admin/approve-upload', requireAdmin, async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Nom de fichier manquant' });
    }

    const sourcePath = path.join(PENDING_UPLOADS_DIR, filename);
    const destPath = path.join(UPLOADS_DIR, filename);

    // Vérifier que le fichier existe
    if (!fsSync.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    // Créer le dossier de destination s'il n'existe pas
    if (!fsSync.existsSync(UPLOADS_DIR)) {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
    }

    // Déplacer le fichier
    await fs.rename(sourcePath, destPath);

    // Invalider le cache après validation
    invalidateMediaCache();

    console.log(`✅ Fichier validé et déplacé: ${filename}`);
    res.json({ success: true, message: 'Fichier validé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la validation:', error);
    res.status(500).json({ error: 'Erreur lors de la validation du fichier' });
  }
});

// Rejeter un upload (supprimer)
app.post('/api/admin/reject-upload', requireAdmin, async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Nom de fichier manquant' });
    }

    const filePath = path.join(PENDING_UPLOADS_DIR, filename);

    // Vérifier que le fichier existe
    if (!fsSync.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier non trouvé' });
    }

    // Supprimer le fichier
    await fs.unlink(filePath);

    console.log(`❌ Fichier rejeté et supprimé: ${filename}`);
    res.json({ success: true, message: 'Fichier rejeté avec succès' });
  } catch (error) {
    console.error('Erreur lors du rejet:', error);
    res.status(500).json({ error: 'Erreur lors du rejet du fichier' });
  }
});

// Valider plusieurs uploads en lot
app.post('/api/admin/batch-approve', requireAdmin, async (req, res) => {
  try {
    const { filenames } = req.body;

    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ error: 'Liste de fichiers manquante ou invalide' });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const filename of filenames) {
      try {
        const sourcePath = path.join(PENDING_UPLOADS_DIR, filename);
        const destPath = path.join(UPLOADS_DIR, filename);

        // Vérifier que le fichier existe
        if (!fsSync.existsSync(sourcePath)) {
          results.failed.push({ filename, error: 'Fichier non trouvé' });
          continue;
        }

        // Déplacer le fichier
        await fs.rename(sourcePath, destPath);
        results.success.push(filename);
        console.log(`✅ Fichier validé (lot): ${filename}`);
      } catch (error) {
        results.failed.push({ filename, error: error.message });
        console.error(`❌ Erreur lors de la validation de ${filename}:`, error);
      }
    }

    // Invalider le cache si au moins un fichier a été validé
    if (results.success.length > 0) {
      invalidateMediaCache();
    }

    const message = `${results.success.length} fichier(s) validé(s), ${results.failed.length} échec(s)`;
    res.json({
      success: true,
      message,
      results
    });
  } catch (error) {
    console.error('Erreur lors de la validation en lot:', error);
    res.status(500).json({ error: 'Erreur lors de la validation en lot' });
  }
});

// Rejeter plusieurs uploads en lot (supprimer)
app.post('/api/admin/batch-reject', requireAdmin, async (req, res) => {
  try {
    const { filenames } = req.body;

    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ error: 'Liste de fichiers manquante ou invalide' });
    }

    const results = {
      success: [],
      failed: []
    };

    for (const filename of filenames) {
      try {
        const filePath = path.join(PENDING_UPLOADS_DIR, filename);

        // Vérifier que le fichier existe
        if (!fsSync.existsSync(filePath)) {
          results.failed.push({ filename, error: 'Fichier non trouvé' });
          continue;
        }

        // Supprimer le fichier
        await fs.unlink(filePath);
        results.success.push(filename);
        console.log(`❌ Fichier rejeté (lot): ${filename}`);
      } catch (error) {
        results.failed.push({ filename, error: error.message });
        console.error(`❌ Erreur lors du rejet de ${filename}:`, error);
      }
    }

    const message = `${results.success.length} fichier(s) rejeté(s), ${results.failed.length} échec(s)`;
    res.json({
      success: true,
      message,
      results
    });
  } catch (error) {
    console.error('Erreur lors du rejet en lot:', error);
    res.status(500).json({ error: 'Erreur lors du rejet en lot' });
  }
});

// Route de fallback pour les routes SPA (doit être en dernier)
// Renvoie index.html pour toutes les routes non-API afin que le router client puisse gérer la navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🎉 Serveur de galerie du mariage démarré sur http://localhost:${PORT}`);
  console.log(`📸 Placez vos photos et vidéos dans le dossier: ${MEDIA_DIR}`);
  console.log(`🔐 Code d'accès configuré: ${ACCESS_CODE}`);
});
