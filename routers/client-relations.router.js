import express from 'express';
import clientClusterRelationController from '../controllers/clientClusterRelation.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Tous les endpoints nécessitent une authentification
router.use(authMiddleware);

// Récupérer toutes les relations pour un cluster
router.get('/cluster/:clusterId', clientClusterRelationController.getRelationsByCluster);

// Récupérer une relation spécifique
router.get('/client/:clientId/cluster/:clusterId', clientClusterRelationController.getRelation);

// Créer une nouvelle relation
router.post('/', clientClusterRelationController.createRelation);

// Mettre à jour une relation
router.put('/client/:clientId/cluster/:clusterId', clientClusterRelationController.updateRelation);

// Supprimer une relation
router.delete('/client/:clientId/cluster/:clusterId', clientClusterRelationController.deleteRelation);

export default router; 