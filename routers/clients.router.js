import express from 'express';
import clientClusterRelationController from '../controllers/clientClusterRelation.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();

// Tous les endpoints nécessitent une authentification
router.use(authMiddleware);

// Recherche globale de clients
router.get('/search', clientClusterRelationController.searchGlobalClients);

export default router; 