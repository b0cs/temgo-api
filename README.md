# TEMGO API

API backend pour l'application TEMGO de gestion de rendez-vous et de clients.

## Déploiement sur Render.com

### Prérequis

1. Compte Cloudinary (pour le stockage des images)
2. Base de données MongoDB (MongoDB Atlas recommandé)
3. Compte Render.com

### Étapes de déploiement

1. **Créer un compte sur Render**
   - Inscrivez-vous sur [render.com](https://render.com)
   - Connectez-vous avec votre compte GitHub

2. **Connecter votre dépôt GitHub**
   - Dans le dashboard, cliquez sur "New +"
   - Choisissez "Web Service"
   - Autorisez Render à accéder à vos dépôts GitHub
   - Sélectionnez le dépôt "temgo-api"

3. **Configurer votre service**
   - Nom : "temgo-api" (ou un autre nom de votre choix)
   - Environnement : Node
   - Branche : "deploy-test" ou "main"
   - Build Command : `npm install`
   - Start Command : `npm start`
   - Sélectionnez le plan approprié

4. **Configurer les variables d'environnement**
   - Ajouter toutes les variables de votre fichier `.env`
   - Inclure les variables Cloudinary :
     ```
     CLOUDINARY_CLOUD_NAME=votre_cloud_name
     CLOUDINARY_API_KEY=votre_api_key
     CLOUDINARY_API_SECRET=votre_api_secret
     ```

## Variables d'environnement

```
PORT=9000                          # Port pour le serveur
MONGODB_URI=mongodb://...          # URI de connexion MongoDB
JWT_SECRET=votre_secret_jwt        # Secret pour JWT
JWT_EXPIRATION=21d                 # Durée de validité du token

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Gestion des uploads

Avec cette configuration, les uploads d'images sont gérés par Cloudinary plutôt que stockés localement, ce qui permet:
- Une persistance des fichiers entre les déploiements
- Un CDN global pour une livraison plus rapide
- Des transformations d'images à la volée
- Une meilleure scalabilité

### Routes disponibles

- `POST /api/upload/single` - Upload d'une seule image
- `POST /api/upload/multiple` - Upload de plusieurs images
- `DELETE /api/upload/:publicId` - Suppression d'une image

## Développement local

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev
```
