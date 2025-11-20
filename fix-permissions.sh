#!/bin/bash

# Script pour fixer les permissions des fichiers de données
# Permet à www-data (serveur Node.js) d'écrire dans les fichiers
# tout en gardant l'utilisateur actuel comme propriétaire

set -e

echo "🔐 Configuration des permissions pour les fichiers de données..."

# Détecter l'utilisateur actuel
CURRENT_USER=$(whoami)
WEB_USER="www-data"

# Vérifier si www-data existe
if ! id "$WEB_USER" &>/dev/null; then
    echo "⚠️  L'utilisateur $WEB_USER n'existe pas sur ce système"
    echo "   Le serveur Node.js tourne peut-être sous un autre utilisateur"
    read -p "   Entrez le nom de l'utilisateur du serveur web: " WEB_USER
fi

# Vérifier si on est root ou si on a sudo
if [ "$EUID" -eq 0 ]; then
    echo "✅ Exécution en tant que root"
    SUDO=""
elif command -v sudo &> /dev/null && sudo -n true 2>/dev/null; then
    echo "✅ Permissions sudo disponibles"
    SUDO="sudo"
else
    echo "⚠️  Ce script nécessite des permissions sudo pour :"
    echo "   - Ajouter $WEB_USER au groupe $CURRENT_USER"
    echo "   - Changer les permissions des fichiers"
    echo ""
    echo "Exécutez : sudo bash fix-permissions.sh"
    exit 1
fi

# Créer les fichiers s'ils n'existent pas
echo "📄 Vérification des fichiers de données..."

if [ ! -f "providers.json" ]; then
    if [ -f "providers.json.example" ]; then
        cp providers.json.example providers.json
        echo "   ✓ providers.json créé depuis l'exemple"
    else
        echo '{"providers":[]}' > providers.json
        echo "   ✓ providers.json créé (vide)"
    fi
fi

if [ ! -f "guestbook.json" ]; then
    if [ -f "guestbook.json.example" ]; then
        cp guestbook.json.example guestbook.json
        echo "   ✓ guestbook.json créé depuis l'exemple"
    else
        echo '{"entries":[]}' > guestbook.json
        echo "   ✓ guestbook.json créé (vide)"
    fi
fi

if [ ! -f "app-config.json" ]; then
    echo '{}' > app-config.json
    echo "   ✓ app-config.json créé (vide)"
fi

# Ajouter www-data au groupe de l'utilisateur actuel
echo ""
echo "👥 Configuration des groupes..."
if groups "$WEB_USER" | grep -q "\b$CURRENT_USER\b"; then
    echo "   ✓ $WEB_USER est déjà dans le groupe $CURRENT_USER"
else
    echo "   → Ajout de $WEB_USER au groupe $CURRENT_USER"
    $SUDO usermod -a -G "$CURRENT_USER" "$WEB_USER"
    echo "   ✓ $WEB_USER ajouté au groupe $CURRENT_USER"
    echo "   ⚠️  Redémarrage du serveur web nécessaire pour appliquer les changements"
fi

# Définir les permissions sur les fichiers de données
echo ""
echo "🔧 Application des permissions..."

# Fichiers de données : lecture/écriture pour propriétaire et groupe
DATA_FILES=(
    "providers.json"
    "guestbook.json"
    "app-config.json"
)

for file in "${DATA_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Changer le groupe vers le groupe de l'utilisateur
        $SUDO chgrp "$CURRENT_USER" "$file"
        # Permissions : rw-rw-r-- (664)
        $SUDO chmod 664 "$file"
        echo "   ✓ $file : permissions fixées (664)"
    fi
done

# Dossiers pour uploads et cache
DIRS=(
    "media"
    "music"
    "public/images"
    ".thumbnails"
    ".web-optimized"
)

echo ""
echo "📁 Configuration des dossiers..."
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        $SUDO chgrp -R "$CURRENT_USER" "$dir"
        # Permissions : rwxrwxr-x (775) pour les dossiers
        find "$dir" -type d -exec $SUDO chmod 775 {} \;
        # Permissions : rw-rw-r-- (664) pour les fichiers
        find "$dir" -type f -exec $SUDO chmod 664 {} \;
        echo "   ✓ $dir : permissions récursives fixées"
    else
        mkdir -p "$dir"
        $SUDO chgrp "$CURRENT_USER" "$dir"
        $SUDO chmod 775 "$dir"
        echo "   ✓ $dir : créé avec bonnes permissions"
    fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Configuration des permissions terminée !"
echo ""
echo "📌 Résumé :"
echo "   • Utilisateur web : $WEB_USER"
echo "   • Groupe partagé : $CURRENT_USER"
echo "   • Fichiers données : 664 (rw-rw-r--)"
echo "   • Dossiers : 775 (rwxrwxr-x)"
echo ""
echo "🔄 Pour appliquer les changements de groupe :"
if [ "$SUDO" = "sudo" ]; then
    echo "   sudo systemctl restart apache2   # ou nginx"
    echo "   sudo systemctl restart node      # si service systemd"
    echo "   # ou redémarrer manuellement votre serveur Node.js"
else
    echo "   systemctl restart apache2   # ou nginx"
    echo "   systemctl restart node      # si service systemd"
fi
echo "═══════════════════════════════════════════════════════════"
echo ""
