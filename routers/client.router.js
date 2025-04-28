import express from 'express';
import { 
  getClientsByCluster,
  getClientClusterRelation,
  searchGlobalClients,
  addExistingClientToCluster,
  updateClientPreferences,
  removeClientFromCluster
} from '../controllers/client.controller.js';
import { verifyToken, checkRole } from '../middleware/auth.middleware.js';

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

export default router; 