# Installation et Configuration

## Prérequis

- Node.js 14+ et npm
- Serveur web (Apache, Nginx, ou serveur Node.js)

## Installation

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration des droits d'accès

**IMPORTANT** : L'application doit pouvoir lire et écrire dans certains fichiers et dossiers.

#### Fichiers de configuration (lecture/écriture)
```bash
chmod 666 app-config.json
chmod 666 providers.json
chmod 666 guestbook.json
```

#### Dossiers de données (lecture/écriture/création)
```bash
chmod 755 media/
chmod 755 music/
chmod 755 public/images/
chmod 755 public/images/providers/
chmod 755 uploads/
```

#### Configuration récursive (si nécessaire)
```bash
# Pour tous les sous-dossiers de media/
find media/ -type d -exec chmod 755 {} \;
find media/ -type f -exec chmod 644 {} \;

# Pour tous les fichiers uploadés
find uploads/ -type d -exec chmod 755 {} \;
find uploads/ -type f -exec chmod 644 {} \;
```

### 3. Vérification des permissions

Si vous rencontrez des erreurs d'enregistrement de configuration, vérifiez que :

1. **Les fichiers JSON sont modifiables** :
   ```bash
   ls -l app-config.json providers.json guestbook.json
   ```
   Doit afficher `-rw-rw-rw-` ou équivalent

2. **Les dossiers sont accessibles** :
   ```bash
   ls -ld media/ music/ uploads/
   ```
   Doit afficher `drwxr-xr-x` ou équivalent

3. **L'utilisateur qui exécute Node.js a les permissions** :
   ```bash
   # Vérifier l'utilisateur actuel
   whoami

   # Changer le propriétaire si nécessaire (remplacer 'username')
   sudo chown -R username:username .
   ```

## Démarrage

### Mode développement
```bash
npm run dev
```

### Mode production
```bash
npm start
```

L'application sera accessible sur `http://localhost:3000`

## Premier accès

1. Au premier démarrage, vous serez automatiquement redirigé vers `/setup`
2. Configurez :
   - Mot de passe administrateur
   - Mot de passe public (pour les invités)
   - Email administrateur
   - Configuration SMTP (optionnel)
   - Page d'accueil (titre, message, image)

3. Après la configuration initiale, vous pourrez accéder à l'interface d'administration

## Configuration post-installation

### Paramètres dans l'admin

Une fois connecté en tant qu'administrateur (`/admin`), vous pouvez :

#### Onglet Paramètres
- **Email et SMTP** : Configuration pour l'envoi d'emails
- **Page d'accueil** : Titre, message et image de bienvenue
- **Lecteur de musique** : Activer/désactiver et gérer l'autoplay
- **Upload de musiques** : Ajouter/supprimer des fichiers musicaux
- **Page prestataires** : Activer/désactiver l'affichage

#### Onglet Prestataires
- Ajouter/modifier/supprimer des prestataires
- Upload de logos

#### Onglet Validation uploads
- Approuver ou rejeter les photos/vidéos uploadées par les invités

#### Onglet Gestion galerie
- Organiser les médias par catégories et dossiers
- Supprimer des fichiers

#### Onglet Livre d'or
- Modérer les messages (approuver/supprimer)
- Voir les statistiques

## Résolution de problèmes

### "Erreur lors de l'enregistrement de la configuration"

**Cause** : Permissions insuffisantes sur le fichier `app-config.json`

**Solution** :
```bash
chmod 666 app-config.json
# ou
sudo chown $USER:$USER app-config.json
```

### "Impossible d'uploader des fichiers"

**Cause** : Permissions insuffisantes sur les dossiers `uploads/`, `media/` ou `music/`

**Solution** :
```bash
chmod 755 uploads/ media/ music/
chmod 755 public/images/providers/
```

### Le lecteur de musique ne s'affiche pas

**Vérifications** :
1. Le lecteur est activé dans Admin > Paramètres > Lecteur de musique
2. Il y a au moins un fichier musical dans le dossier `music/`
3. Les fichiers musicaux sont accessibles (permissions correctes)

### La page prestataires ou livre d'or n'est pas accessible

**Vérifications** :
1. La page est activée dans Admin > Paramètres > Page prestataires
2. Vous êtes bien authentifié (code d'accès saisi)
3. Rechargez la page après avoir activé/désactivé

## Structure des dossiers

```
.
├── app-config.json         # Configuration de l'application
├── providers.json          # Liste des prestataires
├── guestbook.json         # Messages du livre d'or
├── media/                 # Photos et vidéos validées
│   ├── [Catégorie]/
│   │   └── [Dossier]/
├── music/                 # Fichiers musicaux
├── uploads/               # Uploads en attente de validation
└── public/
    └── images/
        └── providers/     # Logos des prestataires
```

## Sécurité

- Les mots de passe sont hashés avec bcrypt
- Les messages du livre d'or sont protégés contre les attaques XSS
- Rate limiting sur le livre d'or (1 message/jour/IP)
- Authentification requise pour toutes les pages
- Rôles utilisateur : admin / invité

## Support

Pour toute question ou problème, consultez la documentation ou contactez l'administrateur système.
