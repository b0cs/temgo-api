import { v4 as uuidv4 } from 'uuid';
import Cluster from '../models/cluster.model.js';
import { upload, cloudinary } from '../config/cloudinary.js';

// Vérification des identifiants Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ ERREUR CRITIQUE: Variables Cloudinary manquantes dans le contrôleur d\'images!');
  console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || 'manquant');
  console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'présent' : 'manquant');
  console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'présent' : 'manquant');
}

// Middleware pour le téléchargement d'une image
export const uploadImage = upload.single('image');

// Middleware pour le téléchargement de plusieurs images (max 5)
export const uploadMultipleImages = upload.array('images', 5);

// Ajouter une image (featured, gallery, logo, cover)
export const addImage = async (req, res) => {
  try {
    console.log('📄 Démarrage de l\'upload d\'image');
    console.log('📄 Requête:', {
      body: req.body,
      clusterId: req.params.clusterId,
      file: req.file ? {
        path: req.file.path,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'Aucun fichier'
    });
    
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier image téléchargé' });
    }
    
    const { clusterId } = req.params;
    const { type, title, description, order } = req.body;
    
    // Vérifier que le type est valide
    const validTypes = ['featured', 'gallery', 'logo', 'cover'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Type d\'image invalide. Utilisez: featured, gallery, logo, ou cover' });
    }
    
    // Obtenir l'URL de l'image depuis Cloudinary
    const imageUrl = req.file.path;
    const publicId = req.file.filename;
    
    console.log('📄 Image téléchargée sur Cloudinary:', { 
      url: imageUrl, 
      publicId,
      fileInfo: req.file
    });
    
    // Vérifier si l'image a bien été téléchargée sur Cloudinary
    try {
      // Vérifier que l'image existe sur Cloudinary
      const cloudinaryResult = await cloudinary.api.resource(publicId);
      console.log('📄 Vérification Cloudinary réussie:', cloudinaryResult);
    } catch (cloudinaryError) {
      console.error('❌ Erreur lors de la vérification Cloudinary:', cloudinaryError);
      // Continuer malgré l'erreur pour le diagnostic
    }
    
    // Rechercher le cluster
    console.log('📄 Recherche du cluster:', clusterId);
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      console.error('❌ Cluster non trouvé:', clusterId);
      // Supprimer l'image de Cloudinary si le cluster n'existe pas
      try {
        await cloudinary.uploader.destroy(publicId);
        console.log('📄 Image supprimée de Cloudinary après échec de recherche du cluster');
      } catch (deleteError) {
        console.error('❌ Erreur lors de la suppression de l\'image après échec:', deleteError);
      }
      return res.status(404).json({ message: 'Cluster non trouvé' });
    }
    console.log('📄 Cluster trouvé:', cluster._id);
    
    // Initialiser la structure d'images si elle n'existe pas
    if (!cluster.images) {
      console.log('📄 Initialisation de la structure d\'images pour le cluster');
      cluster.images = {
        gallery: []
      };
    }
    
    // Mettre à jour selon le type d'image
    console.log('📄 Type d\'image à traiter:', type);
    switch (type) {
      case 'featured':
        // Supprimer l'ancienne image de Cloudinary si elle existe
        if (cluster.images.featured) {
          const oldPublicId = extractPublicIdFromUrl(cluster.images.featured);
          if (oldPublicId) {
            await cloudinary.uploader.destroy(oldPublicId);
          }
        }
        cluster.images.featured = imageUrl;
        break;
      
      case 'logo':
        // Supprimer l'ancien logo de Cloudinary s'il existe
        if (cluster.images.logoUrl) {
          const oldPublicId = extractPublicIdFromUrl(cluster.images.logoUrl);
          if (oldPublicId) {
            await cloudinary.uploader.destroy(oldPublicId);
          }
        }
        cluster.images.logoUrl = imageUrl;
        break;
      
      case 'cover':
        // Supprimer l'ancienne couverture de Cloudinary si elle existe
        if (cluster.images.coverUrl) {
          const oldPublicId = extractPublicIdFromUrl(cluster.images.coverUrl);
          if (oldPublicId) {
            await cloudinary.uploader.destroy(oldPublicId);
          }
        }
        cluster.images.coverUrl = imageUrl;
        break;
      
      case 'gallery':
        // Ajouter à la galerie
        const orderValue = order ? parseInt(order, 10) : cluster.images.gallery.length;
        cluster.images.gallery.push({
          url: imageUrl,
          publicId: publicId,
          order: orderValue,
          title: title || '',
          description: description || '',
          uploadedAt: new Date()
        });
        break;
    }
    
    // Sauvegarder les changements
    console.log('📄 Sauvegarde des changements au cluster');
    try {
      await cluster.save();
      console.log('📄 Cluster sauvegardé avec succès');
    } catch (saveError) {
      console.error('❌ Erreur lors de la sauvegarde du cluster:', saveError);
      throw saveError;
    }
    
    res.status(200).json({
      message: 'Image téléchargée avec succès',
      imageUrl,
      publicId,
      type
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de l\'image:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Essayer de supprimer l'image de Cloudinary en cas d'erreur
    if (req.file && req.file.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
        console.log('📄 Image supprimée de Cloudinary après échec général');
      } catch (deleteError) {
        console.error('❌ Erreur lors de la suppression de l\'image après échec:', deleteError);
      }
    }
    
    res.status(500).json({
      message: 'Erreur lors du téléchargement de l\'image',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
      // Supprimer les images de Cloudinary si le cluster n'existe pas
      for (const file of req.files) {
        await cloudinary.uploader.destroy(file.filename);
      }
      return res.status(404).json({ message: 'Cluster non trouvé' });
    }
    
    // Initialiser la structure d'images si elle n'existe pas
    if (!cluster.images) {
      cluster.images = {
        gallery: []
      };
    }
    
    // Ajouter chaque image
    const uploadedImages = [];
    let startOrder = cluster.images.gallery.length;
    
    for (const file of req.files) {
      // Obtenir l'URL de Cloudinary
      const imageUrl = file.path;
      const publicId = file.filename;
      
      // Ajouter à la galerie
      cluster.images.gallery.push({
        url: imageUrl,
        publicId: publicId,
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
    
    // Essayer de supprimer les images de Cloudinary en cas d'erreur
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          await cloudinary.uploader.destroy(file.filename);
        } catch (deleteError) {
          console.error('Erreur lors de la suppression de l\'image après échec:', deleteError);
        }
      }
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
    let publicId;
    
    switch (type) {
      case 'featured':
        imageUrl = cluster.images.featured;
        if (!imageUrl) {
          return res.status(404).json({ message: 'Image principale non trouvée' });
        }
        
        // Extraire l'ID public pour la suppression
        publicId = extractPublicIdFromUrl(imageUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
        
        // Mettre à jour le cluster
        cluster.images.featured = null;
        break;
      
      case 'logo':
        imageUrl = cluster.images.logoUrl;
        if (!imageUrl) {
          return res.status(404).json({ message: 'Logo non trouvé' });
        }
        
        // Extraire l'ID public pour la suppression
        publicId = extractPublicIdFromUrl(imageUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
        }
        
        // Mettre à jour le cluster
        cluster.images.logoUrl = null;
        break;
      
      case 'cover':
        imageUrl = cluster.images.coverUrl;
        if (!imageUrl) {
          return res.status(404).json({ message: 'Image de couverture non trouvée' });
        }
        
        // Extraire l'ID public pour la suppression
        publicId = extractPublicIdFromUrl(imageUrl);
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
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
        publicId = cluster.images.gallery[imageIndex].publicId || extractPublicIdFromUrl(imageUrl);
        
        // Supprimer de Cloudinary
        if (publicId) {
          await cloudinary.uploader.destroy(publicId);
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

// Fonction utilitaire pour extraire l'ID public de Cloudinary à partir d'une URL
function extractPublicIdFromUrl(url) {
  if (!url) return null;
  
  try {
    // Format typique d'une URL Cloudinary:
    // https://res.cloudinary.com/[cloud_name]/image/upload/v[version]/[public_id].[extension]
    const urlParts = url.split('/');
    const filenameParts = urlParts[urlParts.length - 1].split('.');
    
    // Si c'est une URL Cloudinary valide
    if (url.includes('cloudinary.com') && urlParts.includes('upload')) {
      // Extraire le public_id avec le chemin complet après "upload/"
      const uploadIndex = urlParts.indexOf('upload');
      if (uploadIndex !== -1) {
        // Joindre tous les segments après "upload" jusqu'à l'extension
        const publicIdParts = urlParts.slice(uploadIndex + 1);
        const lastPart = publicIdParts[publicIdParts.length - 1];
        const extension = lastPart.split('.').pop();
        
        // Reconstruire le public_id en joignant les parties et en supprimant l'extension
        let publicId = publicIdParts.join('/');
        if (extension) {
          publicId = publicId.substring(0, publicId.lastIndexOf('.' + extension));
        }
        
        return publicId;
      }
    }
    
    // Fallback si ce n'est pas une URL Cloudinary standard
    return filenameParts[0];
  } catch (error) {
    console.error('Erreur lors de l\'extraction du public_id:', error);
    return null;
  }
} 