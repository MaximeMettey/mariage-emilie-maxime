# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.0.0] - 2025-11-10

### Ajouté
- Page de connexion avec authentification par code d'accès
- Interface de galerie élégante avec design noir/bordeaux/or
- Support des images (JPG, PNG, GIF, WEBP, BMP)
- Support des vidéos (MP4, WEBM, MOV, AVI, MKV)
- Lecteur vidéo intégré HTML5
- Lightbox pour visualisation plein écran
- Navigation au clavier dans le lightbox (flèches, échap)
- Téléchargement individuel des médias
- Téléchargement par dossier en ZIP
- Téléchargement de tous les médias en ZIP
- Organisation automatique par dossiers (ordre alphabétique)
- Tri des médias par date/heure (EXIF pour photos, modification pour vidéos)
- Interface responsive pour mobile, tablette et desktop
- Lazy loading des images pour meilleures performances
- Sessions persistantes avec cookies
- Documentation complète d'installation et déploiement
- Configuration systemd pour Debian
- Configuration Nginx en reverse proxy
- Support PM2 pour gestion de processus
- Animations fluides et transitions élégantes
- Gestion sécurisée des sessions

### Sécurité
- Authentification requise pour accéder aux médias
- Sessions sécurisées avec secret configurable
- Protection contre les accès non autorisés
- Validation des chemins de fichiers
- Configuration de sécurité systemd (NoNewPrivileges, PrivateTmp, etc.)
