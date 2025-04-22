import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as imageController from '../controllers/image.controller.js';

const router = express.Router();

// Middleware d'authentification pour toutes les routes d'images
router.use(authMiddleware);

// Route pour télécharger une image (avec type: featured, gallery, logo, cover)
router.post('/upload/:clusterId', imageController.uploadImage, imageController.addImage);

// Route pour télécharger plusieurs images à la fois (pour la galerie)
router.post('/upload-multiple/:clusterId', imageController.uploadMultipleImages, imageController.addMultipleImages);

// Route alternative pour télécharger plusieurs images (au cas où la première syntaxe poserait problème)
router.post('/:clusterId/upload-multiple', imageController.uploadMultipleImages, imageController.addMultipleImages);

// Route pour récupérer toutes les images d'un cluster
router.get('/:clusterId', imageController.getClusterImages);

// Route pour supprimer une image spécifique
router.delete('/:clusterId/:type/:imageId?', imageController.deleteImage);

// Route pour mettre à jour les métadonnées d'une image de galerie
router.patch('/:clusterId/gallery/:imageId', imageController.updateImageMetadata);

// Route pour réorganiser les images de la galerie
router.patch('/:clusterId/reorder', imageController.reorderGallery);

export default router; 