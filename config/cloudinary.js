import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

// S'assurer que les variables d'environnement sont chargées
dotenv.config();

// Vérifier que les variables d'environnement sont disponibles
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('Configuration Cloudinary:');
console.log('CLOUDINARY_CLOUD_NAME:', cloudName || 'Non défini');
console.log('CLOUDINARY_API_KEY:', apiKey ? '******' + apiKey.substring(apiKey.length - 4) : 'Non défini');
console.log('CLOUDINARY_API_SECRET:', apiSecret ? '******' : 'Non défini');

if (!cloudName || !apiKey || !apiSecret) {
  console.error('ERREUR: Variables d\'environnement Cloudinary manquantes!');
}

// Configuration de base avec valeurs hardcodées en cas d'urgence
cloudinary.config({
  cloud_name: cloudName || 'ddfrn4tde',
  api_key: apiKey || '783126314977558',
  api_secret: apiSecret || 'NwyAoisK0SHM12fR2FBkyTJ9D7A'
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