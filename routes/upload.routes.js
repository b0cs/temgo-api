import express from 'express';
import { upload, cloudinary } from '../config/cloudinary.js';

const router = express.Router();

/**
 * @route POST /api/upload/single
 * @desc Upload une seule image
 * @access Private
 */
router.post('/single', upload.single('image'), async (req, res) => {
  try {
    // req.file contient les informations du fichier uploadé, dont l'url
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    }

    console.log('📸 Image uploadée:', req.file);

    res.json({
      success: true,
      file: {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de l\'upload de l\'image:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route POST /api/upload/multiple
 * @desc Upload plusieurs images
 * @access Private
 */
router.post('/multiple', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    }

    console.log('📸 Images uploadées:', req.files.length);

    const files = req.files.map(file => ({
      url: file.path,
      publicId: file.filename,
      originalName: file.originalname
    }));
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('❌ Erreur lors de l\'upload des images:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route DELETE /api/upload/:publicId
 * @desc Supprimer une image
 * @access Private
 */
router.delete('/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    
    console.log('🗑️ Suppression de l\'image:', publicId);
    
    // Supprimer l'image de Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.json({ success: true, message: 'Image supprimée avec succès' });
    } else {
      res.status(400).json({ success: false, message: 'Échec de la suppression' });
    }
  } catch (error) {
    console.error('❌ Erreur lors de la suppression de l\'image:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router; 