import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  getNightclubDetails,
  getNightclubTables,
  createNightclubTable,
  getNightclubTableById,
  updateNightclubTable,
  createNightclubReservation,
  getNightclubReservations,
  getNightclubReservationById,
  updateNightclubReservation,
  cancelNightclubReservation,
  checkTableAvailability,
  updateNightclubCapacity,
  updateNightclubOccupancy,
  getNightclubOccupancyReport
} from '../controllers/nightclub.controller.js';

const nightclubRouter = express.Router();

// Middleware d'authentification pour toutes les routes
nightclubRouter.use(authMiddleware);

// Routes pour les détails de la boîte de nuit
nightclubRouter.get('/clubs/:clusterId', getNightclubDetails);

// Routes pour les tables
nightclubRouter.get('/clubs/:clusterId/tables', getNightclubTables);
nightclubRouter.post('/clubs/:clusterId/tables', createNightclubTable);
nightclubRouter.get('/tables/:tableId', getNightclubTableById);
nightclubRouter.put('/tables/:tableId', updateNightclubTable);

// Routes pour les réservations
nightclubRouter.get('/clubs/:clusterId/reservations', getNightclubReservations);
nightclubRouter.post('/clubs/:clusterId/reservations', createNightclubReservation);
nightclubRouter.get('/reservations/:reservationId', getNightclubReservationById);
nightclubRouter.put('/reservations/:reservationId', updateNightclubReservation);
nightclubRouter.post('/reservations/:reservationId/cancel', cancelNightclubReservation);

// Route pour vérifier la disponibilité
nightclubRouter.post('/clubs/:clusterId/check-availability', checkTableAvailability);

// Routes pour la gestion de la capacité et l'occupation
nightclubRouter.put('/clubs/:clusterId/capacity', updateNightclubCapacity);
nightclubRouter.put('/clubs/:clusterId/occupancy', updateNightclubOccupancy);
nightclubRouter.get('/clubs/:clusterId/occupancy-report', getNightclubOccupancyReport);

export default nightclubRouter; 