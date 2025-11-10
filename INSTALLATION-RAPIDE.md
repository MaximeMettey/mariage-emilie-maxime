# Installation Rapide

Guide d'installation en 5 minutes sur Debian.

## Prérequis

Installer Node.js si ce n'est pas déjà fait :

```bash
# Installer Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Installation

```bash
# 1. Se placer dans le dossier du projet
cd mariage-emilie-maxime

# 2. Installer les dépendances
npm install

# 3. Le fichier .env est déjà configuré avec :
#    - Code d'accès : mariage2025
#    - Port : 3000
#    (vous pouvez le modifier dans .env)

# 4. Créer quelques dossiers de test dans media/
mkdir -p media/01-ceremonie
mkdir -p media/02-cocktail
mkdir -p media/03-soiree

# 5. Démarrer l'application
npm start
```

L'application sera accessible sur : **http://localhost:3000**

Code d'accès par défaut : **mariage2025**

## Ajouter vos photos

Copiez simplement vos photos et vidéos dans les sous-dossiers de `media/` :

```bash
# Exemple
cp /chemin/vers/vos/photos/*.jpg media/01-ceremonie/
cp /chemin/vers/vos/videos/*.mp4 media/02-cocktail/
```

Rechargez la page, vos médias apparaîtront automatiquement !

## Accès depuis le réseau local

Pour accéder depuis d'autres appareils sur votre réseau local :

1. Trouvez votre adresse IP :
   ```bash
   hostname -I
   ```

2. Accédez depuis un autre appareil :
   ```
   http://VOTRE_IP:3000
   ```

3. Ouvrez le port dans le pare-feu si nécessaire :
   ```bash
   sudo ufw allow 3000/tcp
   ```

## Pour déployer en production

Consultez le fichier **README.md** pour :
- Configuration avec systemd (service permanent)
- Configuration avec Nginx (HTTPS)
- Sécurisation avancée
- Monitoring et logs

## Personnalisation

### Changer le code d'accès

Éditez le fichier `.env` :
```env
ACCESS_CODE=votre-nouveau-code
```

Redémarrez l'application.

### Changer le port

Éditez le fichier `.env` :
```env
PORT=8080
```

Redémarrez l'application.

## Problèmes courants

**Les photos n'apparaissent pas ?**
- Vérifiez que les fichiers sont bien dans des sous-dossiers de `media/`
- Vérifiez les formats supportés (jpg, png, mp4, etc.)

**Impossible de se connecter ?**
- Vérifiez que le serveur est bien démarré
- Vérifiez le code d'accès dans `.env`
- Consultez les logs dans la console

**Erreur lors du téléchargement ZIP ?**
- Vérifiez l'espace disque disponible
- Essayez de télécharger un dossier à la fois

## Arrêter l'application

Appuyez sur `Ctrl+C` dans le terminal.
