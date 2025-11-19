#!/usr/bin/env node

/**
 * Script de nettoyage du cache
 * Supprime les fichiers dans .web-optimized et .thumbnails qui ne correspondent plus
 * à aucun fichier dans le dossier media
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

const MEDIA_DIR = path.join(__dirname, 'media');
const THUMBNAILS_DIR = path.join(__dirname, '.thumbnails');
const WEB_OPTIMIZED_DIR = path.join(__dirname, '.web-optimized');

// Extensions de fichiers supportés
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

/**
 * Fonction pour générer un hash du chemin du fichier (identique à server.js)
 */
function getFileHash(filePath) {
    return crypto.createHash('md5').update(filePath).digest('hex');
}

/**
 * Scanner récursivement le dossier media et collecter tous les hash valides
 */
async function collectValidHashes(dir, relativePath = '', validHashes = new Set()) {
    if (!fsSync.existsSync(dir)) {
        return validHashes;
    }

    const items = await fs.readdir(dir, { withFileTypes: true });

    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const relPath = relativePath ? `${relativePath}/${item.name}` : item.name;

        if (item.isDirectory()) {
            // Ignorer le dossier Pending (pas dans la galerie publique)
            if (item.name !== 'Pending') {
                await collectValidHashes(fullPath, relPath, validHashes);
            }
        } else if (item.isFile()) {
            const ext = path.extname(item.name).toLowerCase();
            const isImage = IMAGE_EXTENSIONS.includes(ext);
            const isVideo = VIDEO_EXTENSIONS.includes(ext);

            if (isImage || isVideo) {
                // Calculer le hash comme dans server.js
                const fileHash = getFileHash(relPath);
                validHashes.add(fileHash);
            }
        }
    }

    return validHashes;
}

/**
 * Nettoyer un dossier de cache
 */
async function cleanCacheDirectory(cacheDir, cacheName, validHashes) {
    if (!fsSync.existsSync(cacheDir)) {
        console.log(`📁 Le dossier ${cacheName} n'existe pas, rien à nettoyer.`);
        return { total: 0, deleted: 0, kept: 0 };
    }

    const files = await fs.readdir(cacheDir);
    let deleted = 0;
    let kept = 0;

    console.log(`\n🔍 Analyse du dossier ${cacheName}...`);

    for (const file of files) {
        const filePath = path.join(cacheDir, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
            // Extraire le hash du nom de fichier (format: hash.webp)
            const fileHash = path.basename(file, path.extname(file));

            if (!validHashes.has(fileHash)) {
                // Fichier orphelin, le supprimer
                try {
                    await fs.unlink(filePath);
                    deleted++;
                    console.log(`  ❌ Supprimé: ${file}`);
                } catch (error) {
                    console.error(`  ⚠️  Erreur lors de la suppression de ${file}:`, error.message);
                }
            } else {
                kept++;
            }
        }
    }

    return { total: files.length, deleted, kept };
}

/**
 * Fonction principale
 */
async function main() {
    console.log('🧹 Nettoyage du cache en cours...\n');
    console.log('═'.repeat(60));

    try {
        // Étape 1 : Collecter tous les hash valides depuis le dossier media
        console.log('\n📂 Analyse du dossier media...');
        const validHashes = await collectValidHashes(MEDIA_DIR);
        console.log(`✅ ${validHashes.size} fichiers médias trouvés`);

        // Étape 2 : Nettoyer .web-optimized
        console.log('\n' + '═'.repeat(60));
        const webOptimizedStats = await cleanCacheDirectory(
            WEB_OPTIMIZED_DIR,
            '.web-optimized',
            validHashes
        );

        // Étape 3 : Nettoyer .thumbnails
        console.log('\n' + '═'.repeat(60));
        const thumbnailsStats = await cleanCacheDirectory(
            THUMBNAILS_DIR,
            '.thumbnails',
            validHashes
        );

        // Résumé
        console.log('\n' + '═'.repeat(60));
        console.log('\n📊 RÉSUMÉ DU NETTOYAGE\n');
        console.log(`📁 .web-optimized:`);
        console.log(`   • Total: ${webOptimizedStats.total} fichiers`);
        console.log(`   • Supprimés: ${webOptimizedStats.deleted} fichiers`);
        console.log(`   • Conservés: ${webOptimizedStats.kept} fichiers`);

        console.log(`\n📁 .thumbnails:`);
        console.log(`   • Total: ${thumbnailsStats.total} fichiers`);
        console.log(`   • Supprimés: ${thumbnailsStats.deleted} fichiers`);
        console.log(`   • Conservés: ${thumbnailsStats.kept} fichiers`);

        const totalDeleted = webOptimizedStats.deleted + thumbnailsStats.deleted;
        console.log(`\n🗑️  Total supprimé: ${totalDeleted} fichiers`);

        console.log('\n' + '═'.repeat(60));
        console.log('✨ Nettoyage terminé avec succès!\n');

    } catch (error) {
        console.error('\n❌ Erreur lors du nettoyage:', error);
        process.exit(1);
    }
}

// Exécuter le script
main();
