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

export default router;

