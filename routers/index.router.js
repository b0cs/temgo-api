import express from 'express';
import serviceRouter from './service.router.js';
import clusterRouter from './cluster.router.js';
import memberRouter from './member.router.js';
import appointmentRouter from './appointment.router.js';
import tableLayoutRouter from './tableLayout.router.js';
import tableRouter from './table.router.js';
import authRouter from './auth.router.js';
import reviewRouter from './review.router.js';
import imageRouter from '../routes/image.routes.js';
import uploadRouter from '../routes/upload.routes.js';
import dashboardRouter from './dashboard.router.js';
import exportRouter from './export.router.js';
import restaurantRouter from '../routes/restaurant.routes.js';
import nightclubRouter from './nightclub.router.js';
import clientRelationsRouter from './client-relations.router.js';
import clientsRouter from './clients.router.js';
import clientRouter from './client.router.js';

const router = express.Router();

// Routes d'authentification
router.use('/auth', authRouter);

// Routes pour les services
router.use('/service', serviceRouter);

// Routes pour les rendez-vous
router.use('/appointment', appointmentRouter);

// Routes pour les clusters
router.use('/cluster', clusterRouter);

// Routes pour les membres
router.use('/member', memberRouter);

// Routes pour les avis
router.use('/reviews', reviewRouter);

// Routes pour les tables
router.use('/table', tableRouter);

// Routes pour les layouts de tables
router.use('/tableLayout', tableLayoutRouter);

// Routes pour les images
router.use('/images', imageRouter);

// Routes pour l'upload via Cloudinary
router.use('/upload', uploadRouter);

// Routes pour le dashboard
router.use('/dashboard', dashboardRouter);

// Routes pour l'exportation de données
router.use('/exports', exportRouter);

// Routes pour les restaurants
router.use('/restaurant', restaurantRouter);

// Routes pour les boîtes de nuit
router.use('/nightclub', nightclubRouter);

// Routes pour les relations client-cluster
router.use('/client-relations', clientRelationsRouter);

// Routes pour la recherche globale de clients
router.use('/clients', clientsRouter);

// Routes pour la gestion des clients dans les établissements
router.use('/client', clientRouter);

export default router;

