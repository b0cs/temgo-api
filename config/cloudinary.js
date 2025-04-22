import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Configuration de base
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuration du stockage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'temgo-uploads', // Dossier dans Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'gif'], // Formats autorisés
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }] // Redimensionnement optionnel
  }
});

// Création du middleware d'upload
const upload = multer({ storage: storage });

export { cloudinary, upload }; 