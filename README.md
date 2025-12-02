# Galerie Photo - Mariage Émilie & Maxime

Galerie photo élégante pour le mariage d'Émilie et Maxime, célébré le 8 Novembre 2025 au Château de Villersexel.

## Caractéristiques

- **Design élégant** : Interface noir/bordeaux/or avec animations fluides
- **Authentification** : Accès protégé par code d'accès
- **Galerie responsive** : Affichage adaptatif sur tous les appareils
- **Support multimédia** : Photos et vidéos avec lecteur intégré
- **Téléchargements** : Médias individuels, par dossier ou tous en ZIP
- **Organisation automatique** : Tri alphabétique des dossiers et des médias
- **Lightbox** : Visualisation plein écran avec navigation au clavier
- **Performances** : Chargement optimisé et lazy loading

## Prérequis

- Node.js 16+ et npm
- Debian 10+ (ou autre distribution Linux)
- Espace disque suffisant pour vos médias

## Installation

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd mariage-emilie-maxime
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration

Créer un fichier `.env` à la racine :

```bash
cp .env.example .env
```

Éditer le fichier `.env` :

```env
# Code d'accès pour la galerie (à personnaliser)
ACCESS_CODE=votre-code-secret

# Port du serveur (3000 par défaut)
PORT=3000

# Secret pour les sessions (générer une chaîne aléatoire longue)
SESSION_SECRET=une-chaine-aleatoire-tres-longue-et-securisee
```

### 4. Fixer les permissions (si nécessaire)

Si vous clonez le projet en tant qu'utilisateur différent de celui qui exécute le serveur Node.js (par exemple : clone avec `mediabox`, serveur sous `www-data`), vous devez configurer les permissions pour permettre l'écriture dans les fichiers de données.

**Symptôme** : Erreurs de permissions lors de l'ajout de prestataires ou du livre d'or.

**Solution automatique** :

```bash
sudo npm run fix-permissions
```

Ce script va :
- Ajouter l'utilisateur web (`www-data`) au groupe de votre utilisateur
- Configurer les permissions sur les fichiers de données (664)
- Configurer les permissions sur les dossiers d'uploads (775)

**Solution manuelle** :

```bash
# Ajouter www-data au groupe de votre utilisateur (ex: mediabox)
sudo usermod -a -G $(whoami) www-data

# Fixer les permissions sur les fichiers de données
sudo chgrp $(whoami) providers.json guestbook.json app-config.json
sudo chmod 664 providers.json guestbook.json app-config.json

# Fixer les permissions sur les dossiers
sudo chgrp -R $(whoami) media music public/images .thumbnails .web-optimized
find media music public/images -type d -exec sudo chmod 775 {} \;
find media music public/images -type f -exec sudo chmod 664 {} \;

# Redémarrer le serveur web pour appliquer les changements de groupe
sudo systemctl restart apache2  # ou nginx, ou votre serveur
```

### 5. Organiser vos médias

Créer des sous-dossiers dans le répertoire `media/` :

```bash
media/
├── 01-ceremonie/
│   ├── photo1.jpg
│   ├── photo2.jpg
│   └── video1.mp4
├── 02-cocktail/
│   └── ...
└── 03-soiree/
    └── ...
```

**Important** :
- Les dossiers sont affichés par ordre alphabétique
- Les médias dans chaque dossier sont triés par ordre alphabétique
- Pour un tri chronologique, utilisez la commande de renommage EXIF (voir section ci-dessous)
- Formats supportés :
  - Images : `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`
  - Vidéos : `.mp4`, `.webm`, `.mov`, `.avi`, `.mkv`

### Renommage automatique avec dates EXIF

Pour trier chronologiquement vos photos, vous pouvez les renommer automatiquement avec leur date de prise de vue :

```bash
npm run rename-exif
```

Cette commande :
- Parcourt toutes les images dans le dossier `media/`
- Extrait la date de prise de vue des données EXIF
- Renomme chaque image avec le préfixe `YYYYMMDD-HHMMSS-`
- Est idempotente : les images déjà renommées sont ignorées
- N'affecte que les images ayant des données EXIF valides

Exemple : `photo.jpg` devient `20251108-143022-photo.jpg`

### Optimisation des images

Pour optimiser toutes les images (génération des thumbnails et versions web) :

```bash
npm run optimize
```

Cette commande :
- Renomme automatiquement les images avec leur date EXIF (si pas déjà fait)
- Génère des versions optimisées WebP (max 2048px, qualité 85%)
- Génère des thumbnails (400x400px)
- Ignore les fichiers déjà optimisés et à jour

**Important** : Si vous avez déjà des fichiers optimisés et que vous renommez vos images, nettoyez d'abord le cache :

```bash
npm run clean-cache   # Supprime les fichiers optimisés orphelins
npm run optimize      # Recrée les optimisations avec les nouveaux noms
```

L'optimisation peut aussi être lancée depuis l'interface d'administration.

## Démarrage

### Mode développement

```bash
npm run dev
```

### Mode production

```bash
npm start
```

L'application sera accessible sur `http://localhost:3000` (ou le port configuré).

## Déploiement sur Debian

### Option 1 : Service systemd (recommandé)

#### 1. Créer un utilisateur dédié

```bash
sudo useradd -r -s /bin/false galerie-mariage
```

#### 2. Déplacer l'application

```bash
sudo mkdir -p /var/www/galerie-mariage
sudo cp -r . /var/www/galerie-mariage/
sudo chown -R galerie-mariage:galerie-mariage /var/www/galerie-mariage
```

#### 3. Créer le service systemd

Créer le fichier `/etc/systemd/system/galerie-mariage.service` :

```ini
[Unit]
Description=Galerie Photo Mariage Emilie et Maxime
After=network.target

[Service]
Type=simple
User=galerie-mariage
WorkingDirectory=/var/www/galerie-mariage
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

# Sécurité
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/galerie-mariage/media

[Install]
WantedBy=multi-user.target
```

#### 4. Démarrer le service

```bash
sudo systemctl daemon-reload
sudo systemctl enable galerie-mariage
sudo systemctl start galerie-mariage
sudo systemctl status galerie-mariage
```

### Option 2 : PM2

```bash
# Installer PM2 globalement
sudo npm install -g pm2

# Démarrer l'application
pm2 start server.js --name galerie-mariage

# Configurer le démarrage automatique
pm2 startup systemd
pm2 save
```

### Option 3 : Reverse Proxy avec Nginx

Pour exposer l'application sur le port 80/443 :

#### 1. Installer Nginx

```bash
sudo apt update
sudo apt install nginx
```

#### 2. Configurer Nginx

Créer `/etc/nginx/sites-available/galerie-mariage` :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Augmenter la taille max pour les téléchargements
    client_max_body_size 500M;
}
```

#### 3. Activer la configuration

```bash
sudo ln -s /etc/nginx/sites-available/galerie-mariage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. HTTPS avec Let's Encrypt (optionnel)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

## Configuration du pare-feu

```bash
# Autoriser le port de l'application
sudo ufw allow 3000/tcp

# Ou si vous utilisez Nginx
sudo ufw allow 'Nginx Full'
```

## Gestion des médias

### Ajouter des photos/vidéos

1. Copier les fichiers dans le dossier approprié :
   ```bash
   sudo cp mes-photos/* /var/www/galerie-mariage/media/01-ceremonie/
   sudo chown galerie-mariage:galerie-mariage /var/www/galerie-mariage/media/01-ceremonie/*
   ```

2. Les médias seront automatiquement détectés au prochain chargement de la page

### Sauvegarde

```bash
# Sauvegarder tous les médias
sudo tar -czf galerie-backup-$(date +%Y%m%d).tar.gz /var/www/galerie-mariage/media/
```

## Sécurité

### Recommandations

1. **Code d'accès fort** : Utilisez un code complexe dans `.env`
2. **HTTPS** : Activez SSL/TLS avec Let's Encrypt
3. **Pare-feu** : Limitez l'accès aux ports nécessaires
4. **Permissions** : Les fichiers doivent appartenir à l'utilisateur du service
5. **Mises à jour** : Gardez Node.js et les dépendances à jour

### Changer le code d'accès

1. Modifier la variable `ACCESS_CODE` dans `.env`
2. Redémarrer le service :
   ```bash
   sudo systemctl restart galerie-mariage
   ```

## Dépannage

### Les médias n'apparaissent pas

- Vérifier les permissions : `ls -la media/`
- Vérifier les formats de fichiers supportés
- Consulter les logs : `sudo journalctl -u galerie-mariage -f`

### Problème de connexion

- Vérifier que le service tourne : `sudo systemctl status galerie-mariage`
- Vérifier les ports : `sudo netstat -tlnp | grep node`
- Vérifier le pare-feu : `sudo ufw status`

### Erreur de téléchargement ZIP

- Vérifier l'espace disque : `df -h`
- Vérifier les permissions du dossier media/

## Monitoring

### Voir les logs en temps réel

```bash
# Avec systemd
sudo journalctl -u galerie-mariage -f

# Avec PM2
pm2 logs galerie-mariage
```

### Vérifier l'utilisation des ressources

```bash
# Avec systemd
sudo systemctl status galerie-mariage

# Avec PM2
pm2 monit
```

## Architecture technique

- **Backend** : Node.js + Express
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Sessions** : express-session avec cookies
- **Médias** : Lecture directe du système de fichiers
- **EXIF** : exif-parser pour les métadonnées photos
- **ZIP** : archiver pour les téléchargements groupés

## Licence

MIT

## Support

Pour toute question ou problème, consulter les logs ou ouvrir une issue sur le dépôt Git.

---

**Bon mariage Émilie & Maxime ! 🎉**
