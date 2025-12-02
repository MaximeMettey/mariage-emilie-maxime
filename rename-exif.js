const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const exifParser = require('exif-parser');

// Pattern pour détecter si un fichier a déjà été renommé
// Format: YYYYMMDD-HHMMSS-*
const RENAMED_PATTERN = /^\d{8}-\d{6}-/;

/**
 * Extrait la date EXIF d'une image
 * @param {string} filePath - Chemin du fichier image
 * @returns {Date|null} - Date de prise de vue ou null si non disponible
 */
async function getExifDate(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const parser = exifParser.create(buffer);
    const result = parser.parse();

    // Essayer différents champs de date EXIF
    if (result.tags && result.tags.DateTimeOriginal) {
      return new Date(result.tags.DateTimeOriginal * 1000);
    }
    if (result.tags && result.tags.CreateDate) {
      return new Date(result.tags.CreateDate * 1000);
    }
    if (result.tags && result.tags.ModifyDate) {
      return new Date(result.tags.ModifyDate * 1000);
    }

    return null;
  } catch (error) {
    // Si erreur EXIF (fichier corrompu, pas de données EXIF, etc.)
    return null;
  }
}

/**
 * Vérifie si un fichier a déjà été renommé avec le pattern date
 * @param {string} filename - Nom du fichier
 * @returns {boolean}
 */
function isAlreadyRenamed(filename) {
  return RENAMED_PATTERN.test(filename);
}

/**
 * Formate une date en préfixe pour le nom de fichier
 * @param {Date} date
 * @returns {string} Format: YYYYMMDD-HHMMSS-
 */
function formatDatePrefix(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}-`;
}

/**
 * Renomme un fichier avec son préfixe EXIF
 * @param {string} filePath - Chemin complet du fichier
 * @param {Date} exifDate - Date EXIF
 * @returns {Object} - { success, oldPath, newPath, error }
 */
async function renameWithExif(filePath, exifDate) {
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath);

  // Vérifier si déjà renommé
  if (isAlreadyRenamed(filename)) {
    return {
      success: false,
      oldPath: filePath,
      newPath: filePath,
      skipped: true,
      reason: 'already_renamed'
    };
  }

  const prefix = formatDatePrefix(exifDate);
  const newFilename = prefix + filename;
  const newPath = path.join(dir, newFilename);

  // Vérifier que le nouveau nom n'existe pas déjà
  if (fsSync.existsSync(newPath)) {
    return {
      success: false,
      oldPath: filePath,
      newPath: newPath,
      error: 'File already exists at destination'
    };
  }

  try {
    await fs.rename(filePath, newPath);
    return {
      success: true,
      oldPath: filePath,
      newPath: newPath
    };
  } catch (error) {
    return {
      success: false,
      oldPath: filePath,
      newPath: newPath,
      error: error.message
    };
  }
}

/**
 * Parcourt récursivement un dossier et renomme toutes les images avec leur date EXIF
 * @param {string} dir - Dossier à parcourir
 * @param {Object} stats - Statistiques (modifié en place)
 * @returns {Promise<Object>} - Statistiques du renommage
 */
async function renameImagesInDirectory(dir, stats = null) {
  if (!stats) {
    stats = {
      total: 0,
      renamed: 0,
      skipped: 0,
      alreadyRenamed: 0,
      noExif: 0,
      errors: 0,
      details: []
    };
  }

  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Parcourir récursivement les sous-dossiers
      await renameImagesInDirectory(fullPath, stats);
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);

      if (isImage) {
        stats.total++;

        // Vérifier si déjà renommé
        if (isAlreadyRenamed(item.name)) {
          stats.alreadyRenamed++;
          stats.skipped++;
          continue;
        }

        // Extraire la date EXIF
        const exifDate = await getExifDate(fullPath);

        if (!exifDate) {
          stats.noExif++;
          stats.skipped++;
          stats.details.push({
            file: fullPath,
            status: 'no_exif',
            message: 'Pas de données EXIF disponibles'
          });
          continue;
        }

        // Renommer le fichier
        const result = await renameWithExif(fullPath, exifDate);

        if (result.success) {
          stats.renamed++;
          stats.details.push({
            file: result.oldPath,
            newFile: result.newPath,
            status: 'renamed',
            date: exifDate.toISOString()
          });
          console.log(`✅ Renommé: ${path.basename(result.oldPath)} → ${path.basename(result.newPath)}`);
        } else if (result.skipped) {
          stats.skipped++;
          stats.alreadyRenamed++;
        } else {
          stats.errors++;
          stats.details.push({
            file: result.oldPath,
            status: 'error',
            error: result.error
          });
          console.error(`❌ Erreur: ${result.oldPath} - ${result.error}`);
        }
      }
    }
  }

  return stats;
}

/**
 * Fonction principale pour renommer toutes les images dans le dossier media
 * @param {string} mediaDir - Chemin du dossier media
 * @returns {Promise<Object>} - Statistiques du renommage
 */
async function renameAllImages(mediaDir) {
  console.log('🔄 Début du renommage des images avec dates EXIF...');
  console.log(`📁 Dossier: ${mediaDir}\n`);

  if (!fsSync.existsSync(mediaDir)) {
    console.error(`❌ Le dossier ${mediaDir} n'existe pas`);
    return null;
  }

  const stats = await renameImagesInDirectory(mediaDir);

  console.log('\n📊 Résumé du renommage:');
  console.log(`   Total d'images trouvées: ${stats.total}`);
  console.log(`   ✅ Images renommées: ${stats.renamed}`);
  console.log(`   ⏭️  Images déjà renommées: ${stats.alreadyRenamed}`);
  console.log(`   ⚠️  Images sans EXIF: ${stats.noExif}`);
  console.log(`   ❌ Erreurs: ${stats.errors}`);
  console.log(`   📝 Total ignorées: ${stats.skipped}`);

  return stats;
}

// Export des fonctions
module.exports = {
  getExifDate,
  isAlreadyRenamed,
  formatDatePrefix,
  renameWithExif,
  renameImagesInDirectory,
  renameAllImages
};

// Si exécuté directement en ligne de commande
if (require.main === module) {
  const mediaDir = path.join(__dirname, 'media');

  renameAllImages(mediaDir)
    .then(stats => {
      if (stats) {
        console.log('\n✨ Renommage terminé avec succès!');
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n❌ Erreur lors du renommage:', error);
      process.exit(1);
    });
}
