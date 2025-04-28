const express = require('express');
const serviceRouter = require('./service.router');
const clusterRouter = require('./cluster.router');
const memberRouter = require('./member.router');
const appointmentRouter = require('./appointment.router');
const tableLayoutRouter = require('./tableLayout.router');
const tableRouter = require('./table.router');
const authRouter = require('./auth.router');
const reviewRouter = require('./review.router');
const imageRouter = require('../routes/image.routes');
const uploadRouter = require('../routes/upload.routes');
const dashboardRouter = require('./dashboard.router');
const exportRouter = require('./export.router');
const restaurantRouter = require('../routes/restaurant.routes');
const nightclubRouter = require('./nightclub.router');
const clientRelationsRouter = require('./client-relations.router');
const clientsRouter = require('./clients.router');
const clientRouter = require('./client.router');

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

module.exports = router;

