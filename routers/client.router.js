import express from 'express';
import { 
  getClientsByCluster,
  getClientClusterRelation,
  searchGlobalClients,
  addExistingClientToCluster,
  updateClientPreferences,
  removeClientFromCluster,
  banClient,
  unbanClient
} from '../controllers/client.controller.js';
import { verifyToken, checkRole } from '../middleware/auth.middleware.js';
import { updateClientStatusInCluster } from '../controllers/user.controller.js';

const router = express.Router();

// Routes nécessitant une authentification
router.use(verifyToken);

// Routes pour la gestion des clients
router.get('/cluster/:clusterId', checkRole(['admin', 'manager', 'employee']), getClientsByCluster);
router.get('/relation/:relationId', checkRole(['admin', 'manager', 'employee']), getClientClusterRelation);
router.get('/search', checkRole(['admin', 'manager', 'employee']), searchGlobalClients);
router.post('/add/:clientId', checkRole(['admin', 'manager', 'employee']), addExistingClientToCluster);
router.put('/preferences/:relationId', checkRole(['admin', 'manager', 'employee']), updateClientPreferences);
router.delete('/relation/:relationId', checkRole(['admin', 'manager', 'employee']), removeClientFromCluster);

// Mettre à jour le statut d'un client dans un établissement spécifique (bannir, activer, supprimer)
router.put('/:clientId/cluster/:clusterId/status', updateClientStatusInCluster);

// Bannir un client dans un établissement
router.post('/relation/:relationId/ban', checkRole(['admin', 'manager']), banClient);

// Débannir un client dans un établissement
router.post('/relation/:relationId/unban', checkRole(['admin', 'manager']), unbanClient);

export default router; 