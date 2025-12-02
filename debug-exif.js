const fs = require('fs').promises;
const path = require('path');
const exifParser = require('exif-parser');

/**
 * Script de debug pour voir les données EXIF d'une image
 * Usage: node debug-exif.js chemin/vers/image.jpg
 */

async function debugExif(filePath) {
  console.log(`\n🔍 Analyse EXIF de: ${filePath}`);
  console.log('═'.repeat(80));

  try {
    // Vérifier que le fichier existe
    const stats = await fs.stat(filePath);
    console.log(`\n📊 Informations fichier:`);
    console.log(`   Taille: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   Modifié (mtime): ${stats.mtime.toISOString()}`);
    console.log(`   Créé (birthtime): ${stats.birthtime.toISOString()}`);

    // Lire et parser EXIF
    const buffer = await fs.readFile(filePath);
    const parser = exifParser.create(buffer);
    const result = parser.parse();

    console.log(`\n📸 Données EXIF:`);

    if (!result.tags || Object.keys(result.tags).length === 0) {
      console.log(`   ❌ Aucune donnée EXIF trouvée!`);
      return;
    }

    console.log(`\n   Tous les tags trouvés:`);
    const sortedTags = Object.entries(result.tags).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [key, value] of sortedTags) {
      if (typeof value === 'number' && key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
        // C'est probablement une date en timestamp Unix
        const date = new Date(value * 1000);
        console.log(`   ${key}: ${value} → ${date.toISOString()} (${date.toLocaleString('fr-FR')})`);
      } else if (typeof value === 'object') {
        console.log(`   ${key}: ${JSON.stringify(value)}`);
      } else {
        console.log(`   ${key}: ${value}`);
      }
    }

    // Afficher les dates importantes
    console.log(`\n📅 Dates importantes pour le renommage:`);

    if (result.tags.DateTimeOriginal) {
      const date = new Date(result.tags.DateTimeOriginal * 1000);
      console.log(`   ✅ DateTimeOriginal (priorité 1): ${date.toISOString()}`);
      console.log(`      → ${date.toLocaleString('fr-FR')}`);
    } else {
      console.log(`   ❌ DateTimeOriginal: non trouvé`);
    }

    if (result.tags.DateTime) {
      const date = new Date(result.tags.DateTime * 1000);
      console.log(`   ⚠️  DateTime (priorité 2): ${date.toISOString()}`);
      console.log(`      → ${date.toLocaleString('fr-FR')}`);
    } else {
      console.log(`   ❌ DateTime: non trouvé`);
    }

    if (result.tags.CreateDate) {
      const date = new Date(result.tags.CreateDate * 1000);
      console.log(`   ⚠️  CreateDate (priorité 3): ${date.toISOString()}`);
      console.log(`      → ${date.toLocaleString('fr-FR')}`);
    } else {
      console.log(`   ❌ CreateDate: non trouvé`);
    }

    if (result.tags.ModifyDate) {
      const date = new Date(result.tags.ModifyDate * 1000);
      console.log(`   ⚠️  ModifyDate: ${date.toISOString()}`);
      console.log(`      → ${date.toLocaleString('fr-FR')}`);
    }

    // Image size
    if (result.imageSize) {
      console.log(`\n🖼️  Dimensions: ${result.imageSize.width}x${result.imageSize.height}`);
    }

    // Modèle d'appareil
    if (result.tags.Model) {
      console.log(`\n📷 Appareil: ${result.tags.Model}`);
    }
    if (result.tags.Make) {
      console.log(`   Fabricant: ${result.tags.Make}`);
    }

    console.log('\n' + '═'.repeat(80));

  } catch (error) {
    console.error(`\n❌ Erreur lors de la lecture:`, error.message);
  }
}

// Main
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: node debug-exif.js <chemin-image>

Exemples:
  node debug-exif.js media/Photos/IMG_1234.jpg
  node debug-exif.js "media/Photos Mariage/photo.JPG"
`);
    process.exit(1);
  }

  const filePath = args[0];
  debugExif(filePath);
}

module.exports = { debugExif };
