const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const { renameImagesInDirectory } = require('./rename-exif');

const MEDIA_DIR = path.join(__dirname, 'media');
const THUMBNAILS_DIR = path.join(__dirname, '.thumbnails');
const WEB_OPTIMIZED_DIR = path.join(__dirname, '.web-optimized');

/**
 * Génère un hash MD5 du chemin du fichier
 */
function getFileHash(filePath) {
  return crypto.createHash('md5').update(filePath).digest('hex');
}

/**
 * Génère ou récupère un thumbnail d'image
 */
async function getThumbnail(filePath, folderName, fileName) {
  try {
    if (!fsSync.existsSync(THUMBNAILS_DIR)) {
      await fs.mkdir(THUMBNAILS_DIR, { recursive: true });
    }

    const fileHash = getFileHash(`${folderName}/${fileName}`);
    const thumbnailName = `${fileHash}.webp`;
    const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailName);

    // Vérifier si le thumbnail existe déjà et est à jour
    if (fsSync.existsSync(thumbnailPath)) {
      const originalStats = await fs.stat(filePath);
      const thumbnailStats = await fs.stat(thumbnailPath);

      if (thumbnailStats.mtime >= originalStats.mtime) {
        return thumbnailPath;
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

    return thumbnailPath;
  } catch (error) {
    console.error(`❌ Erreur thumbnail pour ${fileName}:`, error.message);
    return null;
  }
}

/**
 * Génère une version web optimisée d'une image
 */
async function getWebOptimized(filePath, folderName, fileName) {
  try {
    if (!fsSync.existsSync(WEB_OPTIMIZED_DIR)) {
      await fs.mkdir(WEB_OPTIMIZED_DIR, { recursive: true });
    }

    const fileHash = getFileHash(`${folderName}/${fileName}`);
    const webName = `${fileHash}.webp`;
    const webPath = path.join(WEB_OPTIMIZED_DIR, webName);

    // Vérifier si la version web existe déjà et est à jour
    if (fsSync.existsSync(webPath)) {
      const originalStats = await fs.stat(filePath);
      const webStats = await fs.stat(webPath);

      if (webStats.mtime >= originalStats.mtime) {
        return webPath;
      }
    }

    // Générer la version web optimisée (2048px max, WebP 85%)
    const image = sharp(filePath);
    const metadata = await image.metadata();

    if (metadata.width > 2048 || metadata.height > 2048) {
      await image
        .resize(2048, 2048, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85 })
        .toFile(webPath);
    } else {
      await image
        .webp({ quality: 85 })
        .toFile(webPath);
    }

    return webPath;
  } catch (error) {
    console.error(`❌ Erreur optimisation pour ${fileName}:`, error.message);
    return null;
  }
}

/**
 * Optimise toutes les images dans un dossier récursivement
 */
async function optimizeDirectory(dir, relativePath = '', stats = null) {
  if (!stats) {
    stats = {
      totalImages: 0,
      optimized: 0,
      alreadyOptimized: 0,
      errors: 0
    };
  }

  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relPath = relativePath ? `${relativePath}/${item.name}` : item.name;

    if (item.isDirectory()) {
      // Ignorer le dossier Pending
      if (item.name !== 'Pending') {
        await optimizeDirectory(fullPath, relPath, stats);
      }
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);

      if (isImage) {
        stats.totalImages++;

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
              stats.alreadyOptimized++;
              continue;
            }
          }

          // Générer la version web
          await getWebOptimized(fullPath, path.dirname(relPath), item.name);
          stats.optimized++;
          console.log(`✅ Optimisé: ${relPath}`);

          // Pré-générer aussi le thumbnail
          await getThumbnail(fullPath, path.dirname(relPath), item.name);
        } catch (error) {
          console.error(`❌ Erreur optimisation ${relPath}:`, error.message);
          stats.errors++;
        }
      }
    }
  }

  return stats;
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🎨 Optimisation des médias de la galerie\n');

  if (!fsSync.existsSync(MEDIA_DIR)) {
    console.error(`❌ Le dossier ${MEDIA_DIR} n'existe pas`);
    process.exit(1);
  }

  try {
    // Étape 1 : Renommer les images avec leur date EXIF
    console.log('🔄 Étape 1/2 : Renommage des images avec dates EXIF...');
    const renameStats = await renameImagesInDirectory(MEDIA_DIR);
    console.log(`✅ Renommage terminé : ${renameStats.renamed} images renommées, ${renameStats.alreadyRenamed} déjà renommées, ${renameStats.noExif} sans EXIF\n`);

    // Étape 2 : Optimiser les images
    console.log('🔄 Étape 2/2 : Optimisation des médias...');
    const optimizeStats = await optimizeDirectory(MEDIA_DIR);

    console.log('\n📊 Résumé de l\'optimisation:');
    console.log(`   Images renommées: ${renameStats.renamed}`);
    console.log(`   Total d'images trouvées: ${optimizeStats.totalImages}`);
    console.log(`   ✅ Images optimisées: ${optimizeStats.optimized}`);
    console.log(`   ⏭️  Déjà optimisées: ${optimizeStats.alreadyOptimized}`);
    console.log(`   ❌ Erreurs: ${optimizeStats.errors}`);

    console.log('\n✨ Optimisation terminée avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'optimisation:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
}

module.exports = {
  getThumbnail,
  getWebOptimized,
  optimizeDirectory
};
