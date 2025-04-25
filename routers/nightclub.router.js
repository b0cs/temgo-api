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
  getNightclubOccupancyReport,
  updateGenderStats,
  updateReservationGenderStats
} from '../controllers/nightclub.controller.js';

import {
  createNightclubEvent,
  getNightclubEvents,
  getNightclubEventById,
  updateNightclubEvent,
  deleteNightclubEvent,
  updateNightclubEventStatus,
  updateNightclubEventStats
} from '../controllers/nightclub-event.controller.js';

const nightclubRouter = express.Router();

// Middleware d'authentification pour toutes les routes
nightclubRouter.use(authMiddleware);

// Routes pour les boîtes de nuit
nightclubRouter.get('/clubs/:clusterId', getNightclubDetails);
nightclubRouter.put('/clubs/:clusterId/capacity', updateNightclubCapacity);
nightclubRouter.put('/clubs/:clusterId/occupancy', updateNightclubOccupancy);
nightclubRouter.get('/clubs/:clusterId/occupancy-report', getNightclubOccupancyReport);
nightclubRouter.put('/clubs/:id/gender-stats', updateGenderStats);

// Routes pour les tables
nightclubRouter.get('/clubs/:clusterId/tables', getNightclubTables);
nightclubRouter.post('/clubs/:clusterId/tables', createNightclubTable);
nightclubRouter.get('/tables/:tableId', getNightclubTableById);
nightclubRouter.put('/tables/:tableId', updateNightclubTable);
nightclubRouter.get('/tables/availability', checkTableAvailability);

// Routes pour les réservations
nightclubRouter.post('/clubs/:clusterId/reservations', createNightclubReservation);
nightclubRouter.get('/clubs/:clusterId/reservations', getNightclubReservations);
nightclubRouter.get('/reservations/:reservationId', getNightclubReservationById);
nightclubRouter.put('/reservations/:reservationId', updateNightclubReservation);
nightclubRouter.put('/reservations/:reservationId/cancel', cancelNightclubReservation);
nightclubRouter.put('/reservations/:reservationId/gender-stats', updateReservationGenderStats);

// Routes pour les événements
nightclubRouter.post('/clubs/:clusterId/events', createNightclubEvent);
nightclubRouter.get('/clubs/:clusterId/events', getNightclubEvents);
nightclubRouter.get('/events/:eventId', getNightclubEventById);
nightclubRouter.put('/events/:eventId', updateNightclubEvent);
nightclubRouter.delete('/events/:eventId', deleteNightclubEvent);
nightclubRouter.put('/events/:eventId/status', updateNightclubEventStatus);
nightclubRouter.put('/events/:eventId/stats', updateNightclubEventStats);

export default nightclubRouter; 