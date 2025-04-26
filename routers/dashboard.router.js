import express from 'express';
import { getDashboardStats, getFinancialStats } from '../controllers/dashboard.controller.js';
// Suppression de l'authentification pour le débogage
// import { verifyToken } from '../middleware/auth.middleware.js';

const dashboardRouter = express.Router();

// Authentification désactivée pour le débogage
// dashboardRouter.use(verifyToken);

// Route pour récupérer les statistiques du dashboard pour un cluster
dashboardRouter.get('/stats/:clusterId', getDashboardStats);

// Route pour récupérer les statistiques financières d'un cluster
dashboardRouter.get('/financial/:clusterId', getFinancialStats);

export default dashboardRouter; 