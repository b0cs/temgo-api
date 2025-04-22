import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import Cluster from '../models/cluster.model.js';

// Configuration pour le stockage local des images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Créer le dossier s'il n'existe pas
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Créer un sous-dossier pour le cluster si l'ID est fourni
    if (req.params.clusterId) {
      const clusterDir = path.join(uploadDir, req.params.clusterId);
      if (!fs.existsSync(clusterDir)) {
        fs.mkdirSync(clusterDir, { recursive: true });
      }
      cb(null, clusterDir);
    } else {
      cb(null, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique avec extension
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// Filtrage des types de fichiers
const fileFilter = (req, file, cb) => {
  // Accepter uniquement les images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers image sont autorisés'), false);
  }
};

// Initialisation de multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite à 5MB
  }
});

// Middleware pour le téléchargement d'une image
export const uploadImage = upload.single('image');

// Middleware pour le téléchargement de plusieurs images (max 5)
export const uploadMultipleImages = upload.array('images', 5);

// Fonction pour optimiser une image
const optimizeImage = async (filePath, width = 800) => {
  try {
    await sharp(filePath)
      .resize(width) // Redimensionner à la largeur spécifiée, hauteur auto
      .jpeg({ quality: 80 }) // Compression JPEG
      .toFile(`${filePath}.optimized.jpg`);
    
    // Remplacer l'original par la version optimisée
    fs.unlinkSync(filePath); // Supprimer l'original
    fs.renameSync(`${filePath}.optimized.jpg`, filePath); // Renommer l'optimisé
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'optimisation de l\'image:', error);
    return false;
  }
};

// Ajouter une image (featured, gallery, logo, cover)
export const addImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier image téléchargé' });
    }
    
    const { clusterId } = req.params;
    const { type, title, description, order } = req.body;
    
    // Vérifier que le type est valide
    const validTypes = ['featured', 'gallery', 'logo', 'cover'];
    if (!validTypes.includes(type)) {
      // Supprimer le fichier si le type est invalide
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Type d\'image invalide. Utilisez: featured, gallery, logo, ou cover' });
    }
    
    // Optimiser l'image
    await optimizeImage(req.file.path);
    
    // Obtenir l'URL de l'image (chemin relatif)
    const imageUrl = `/uploads/${clusterId}/${req.file.filename}`;
    
    // Rechercher le cluster
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      // Supprimer le fichier si le cluster n'existe pas
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Cluster non trouvé' });
    }
    
    // Initialiser la structure d'images si elle n'existe pas
    if (!cluster.images) {
      cluster.images = {
        gallery: []
      };
    }
    
    // Mettre à jour selon le type d'image
    switch (type) {
      case 'featured':
        // Supprimer l'ancienne image si elle existe
        if (cluster.images.featured) {
          const oldPath = path.join(process.cwd(), cluster.images.featured.replace(/^\//, ''));
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        cluster.images.featured = imageUrl;
        break;
      
      case 'logo':
        // Supprimer l'ancien logo s'il existe
        if (cluster.images.logoUrl) {
          const oldPath = path.join(process.cwd(), cluster.images.logoUrl.replace(/^\//, ''));
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        cluster.images.logoUrl = imageUrl;
        break;
      
      case 'cover':
        // Supprimer l'ancienne couverture si elle existe
        if (cluster.images.coverUrl) {
          const oldPath = path.join(process.cwd(), cluster.images.coverUrl.replace(/^\//, ''));
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
        cluster.images.coverUrl = imageUrl;
        break;
      
      case 'gallery':
        // Ajouter à la galerie
        const orderValue = order ? parseInt(order, 10) : cluster.images.gallery.length;
        cluster.images.gallery.push({
          url: imageUrl,
          order: orderValue,
          title: title || '',
          description: description || '',
          uploadedAt: new Date()
        });
        break;
    }
    
    // Sauvegarder les changements
    await cluster.save();
    
    res.status(200).json({
      message: 'Image téléchargée avec succès',
      imageUrl,
      type
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'image:', error);
    
    // Essayer de supprimer le fichier en cas d'erreur
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      message: 'Erreur lors du téléchargement de l\'image',
      error: error.message
    });
  }
};

// Télécharger plusieurs images pour la galerie
export const addMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Aucun fichier image téléchargé' });
    }
    
    const { clusterId } = req.params;
    
    // Rechercher le cluster
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      // Supprimer les fichiers si le cluster n'existe pas
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(404).json({ message: 'Cluster non trouvé' });
    }
    
    // Initialiser la structure d'images si elle n'existe pas
    if (!cluster.images) {
      cluster.images = {
        gallery: []
      };
    }
    
    // Optimiser et ajouter chaque image
    const uploadedImages = [];
    let startOrder = cluster.images.gallery.length;
    
    for (const file of req.files) {
      await optimizeImage(file.path);
      
      // Créer l'URL de l'image
      const imageUrl = `/uploads/${clusterId}/${file.filename}`;
      
      // Ajouter à la galerie
      cluster.images.gallery.push({
        url: imageUrl,
        order: startOrder++,
        title: '', // Peut être mis à jour plus tard
        description: '', // Peut être mis à jour plus tard
        uploadedAt: new Date()
      });
      
      uploadedImages.push(imageUrl);
    }
    
    // Sauvegarder les changements
    await cluster.save();
    
    res.status(200).json({
      message: `${req.files.length} images téléchargées avec succès`,
      uploadedImages
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout des images:', error);
    
    // Essayer de supprimer les fichiers en cas d'erreur
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({
      message: 'Erreur lors du téléchargement des images',
      error: error.message
    });
  }
};

// Récupérer toutes les images d'un cluster
export const getClusterImages = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      return res.status(404).json({ message: 'Cluster non trouvé' });
    }
    
    // Préparer la réponse
    const images = {
      featured: cluster.images?.featured || null,
      gallery: cluster.images?.gallery || [],
      logo: cluster.images?.logoUrl || null,
      cover: cluster.images?.coverUrl || null
    };
    
    res.status(200).json(images);
  } catch (error) {
    console.error('Erreur lors de la récupération des images:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des images',
      error: error.message
    });
  }
};

// Supprimer une image
export const deleteImage = async (req, res) => {
  try {
    const { clusterId, imageId, type } = req.params;
    
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      return res.status(404).json({ message: 'Cluster non trouvé' });
    }
    
    // Initialiser la structure d'images si elle n'existe pas
    if (!cluster.images) {
      return res.status(404).json({ message: 'Aucune image trouvée' });
    }
    
    let imageUrl;
    
    switch (type) {
      case 'featured':
        imageUrl = cluster.images.featured;
        if (!imageUrl) {
          return res.status(404).json({ message: 'Image principale non trouvée' });
        }
        
        // Supprimer le fichier
        const featuredPath = path.join(process.cwd(), imageUrl.replace(/^\//, ''));
        if (fs.existsSync(featuredPath)) {
          fs.unlinkSync(featuredPath);
        }
        
        // Mettre à jour le cluster
        cluster.images.featured = null;
        break;
      
      case 'logo':
        imageUrl = cluster.images.logoUrl;
        if (!imageUrl) {
          return res.status(404).json({ message: 'Logo non trouvé' });
        }
        
        // Supprimer le fichier
        const logoPath = path.join(process.cwd(), imageUrl.replace(/^\//, ''));
        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
        }
        
        // Mettre à jour le cluster
        cluster.images.logoUrl = null;
        break;
      
      case 'cover':
        imageUrl = cluster.images.coverUrl;
        if (!imageUrl) {
          return res.status(404).json({ message: 'Image de couverture non trouvée' });
        }
        
        // Supprimer le fichier
        const coverPath = path.join(process.cwd(), imageUrl.replace(/^\//, ''));
        if (fs.existsSync(coverPath)) {
          fs.unlinkSync(coverPath);
        }
        
        // Mettre à jour le cluster
        cluster.images.coverUrl = null;
        break;
      
      case 'gallery':
        // Pour la galerie, on a besoin de l'ID de l'image
        if (!imageId) {
          return res.status(400).json({ message: 'ID de l\'image requis pour la galerie' });
        }
        
        // Trouver l'image dans la galerie
        const imageIndex = cluster.images.gallery.findIndex(img => img._id.toString() === imageId);
        if (imageIndex === -1) {
          return res.status(404).json({ message: 'Image non trouvée dans la galerie' });
        }
        
        imageUrl = cluster.images.gallery[imageIndex].url;
        
        // Supprimer le fichier
        const galleryPath = path.join(process.cwd(), imageUrl.replace(/^\//, ''));
        if (fs.existsSync(galleryPath)) {
          fs.unlinkSync(galleryPath);
        }
        
        // Retirer l'image de la galerie
        cluster.images.gallery.splice(imageIndex, 1);
        
        // Mettre à jour les ordres des images restantes
        cluster.images.gallery.forEach((img, idx) => {
          img.order = idx;
        });
        break;
      
      default:
        return res.status(400).json({ message: 'Type d\'image invalide' });
    }
    
    // Sauvegarder les changements
    await cluster.save();
    
    res.status(200).json({
      message: 'Image supprimée avec succès',
      type
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image:', error);
    res.status(500).json({
      message: 'Erreur lors de la suppression de l\'image',
      error: error.message
    });
  }
};

// Mettre à jour les métadonnées d'une image de la galerie
export const updateImageMetadata = async (req, res) => {
  try {
    const { clusterId, imageId } = req.params;
    const { title, description, order } = req.body;
    
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      return res.status(404).json({ message: 'Cluster non trouvé' });
    }
    
    // Vérifier si la galerie existe
    if (!cluster.images || !cluster.images.gallery) {
      return res.status(404).json({ message: 'Galerie non trouvée' });
    }
    
    // Trouver l'image dans la galerie
    const imageIndex = cluster.images.gallery.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      return res.status(404).json({ message: 'Image non trouvée dans la galerie' });
    }
    
    // Mettre à jour les métadonnées
    if (title !== undefined) {
      cluster.images.gallery[imageIndex].title = title;
    }
    
    if (description !== undefined) {
      cluster.images.gallery[imageIndex].description = description;
    }
    
    if (order !== undefined) {
      const newOrder = parseInt(order, 10);
      
      // Vérifier que l'ordre est valide
      if (isNaN(newOrder) || newOrder < 0 || newOrder >= cluster.images.gallery.length) {
        return res.status(400).json({ 
          message: `L'ordre doit être compris entre 0 et ${cluster.images.gallery.length - 1}` 
        });
      }
      
      // Mettre à jour l'ordre des images
      const currentOrder = cluster.images.gallery[imageIndex].order;
      
      // Déplacer les images entre l'ancien et le nouvel ordre
      if (newOrder > currentOrder) {
        // Déplacer vers le bas
        for (let i = 0; i < cluster.images.gallery.length; i++) {
          if (i === imageIndex) {
            cluster.images.gallery[i].order = newOrder;
          } else if (cluster.images.gallery[i].order > currentOrder && cluster.images.gallery[i].order <= newOrder) {
            cluster.images.gallery[i].order--;
          }
        }
      } else if (newOrder < currentOrder) {
        // Déplacer vers le haut
        for (let i = 0; i < cluster.images.gallery.length; i++) {
          if (i === imageIndex) {
            cluster.images.gallery[i].order = newOrder;
          } else if (cluster.images.gallery[i].order >= newOrder && cluster.images.gallery[i].order < currentOrder) {
            cluster.images.gallery[i].order++;
          }
        }
      }
    }
    
    // Sauvegarder les changements
    await cluster.save();
    
    res.status(200).json({
      message: 'Métadonnées de l\'image mises à jour avec succès',
      image: cluster.images.gallery[imageIndex]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des métadonnées:', error);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour des métadonnées',
      error: error.message
    });
  }
};

// Réorganiser les images de la galerie
export const reorderGallery = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { newOrder } = req.body;
    
    // Vérifier que newOrder est un tableau valide
    if (!Array.isArray(newOrder) || newOrder.length === 0) {
      return res.status(400).json({ message: 'Format de réorganisation invalide' });
    }
    
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      return res.status(404).json({ message: 'Cluster non trouvé' });
    }
    
    // Vérifier si la galerie existe
    if (!cluster.images || !cluster.images.gallery || cluster.images.gallery.length === 0) {
      return res.status(404).json({ message: 'Galerie vide' });
    }
    
    // Vérifier que tous les IDs sont valides
    const galleryIds = cluster.images.gallery.map(img => img._id.toString());
    for (const item of newOrder) {
      if (!galleryIds.includes(item.id)) {
        return res.status(400).json({ 
          message: 'ID d\'image invalide dans la nouvelle organisation',
          invalidId: item.id
        });
      }
    }
    
    // Mettre à jour l'ordre des images
    for (const item of newOrder) {
      const imageIndex = cluster.images.gallery.findIndex(img => img._id.toString() === item.id);
      if (imageIndex !== -1) {
        cluster.images.gallery[imageIndex].order = item.order;
      }
    }
    
    // Sauvegarder les changements
    await cluster.save();
    
    res.status(200).json({
      message: 'Galerie réorganisée avec succès',
      gallery: cluster.images.gallery.sort((a, b) => a.order - b.order)
    });
  } catch (error) {
    console.error('Erreur lors de la réorganisation de la galerie:', error);
    res.status(500).json({
      message: 'Erreur lors de la réorganisation de la galerie',
      error: error.message
    });
  }
}; 