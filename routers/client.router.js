import express from 'express';
import { 
  getClientsByCluster,
  getClientClusterRelation,
  searchGlobalClients,
  addExistingClientToCluster,
  updateClientPreferences,
  removeClientFromCluster
} from '../controllers/client.controller.js';
import { verifyToken, isStaff } from '../middleware/auth.middleware.js';

const router = express.Router();

// Routes nécessitant une authentification
router.use(verifyToken);

// Routes pour la gestion des clients
router.get('/cluster/:clusterId', isStaff, getClientsByCluster);
router.get('/relation/:relationId', isStaff, getClientClusterRelation);
router.get('/search', isStaff, searchGlobalClients);
router.post('/add/:clientId', isStaff, addExistingClientToCluster);
router.put('/preferences/:relationId', isStaff, updateClientPreferences);
router.delete('/relation/:relationId', isStaff, removeClientFromCluster);

export default router; 