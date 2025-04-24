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
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }], // Redimensionnement optionnel
    // Utiliser un format de nommage spécifique pour éviter les conflits
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = file.originalname.split('.')[0];
      return `${filename}-${uniqueSuffix}`;
    }
  }
});

// Configuration des limites et filtres
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB max
};

const fileFilter = (req, file, cb) => {
  // Vérifier le type de fichier
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers image sont autorisés'), false);
  }
};

// Création du middleware d'upload avec toutes les options
const upload = multer({ 
  storage: storage,
  limits: limits,
  fileFilter: fileFilter
});

// Exporter la configuration et le middleware
export { cloudinary, upload }; 