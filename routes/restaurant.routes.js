import express from 'express';
import {
  getRestaurantDetails,
  createMenuItem,
  getMenuItems,
  updateMenuItem,
  createTable,
  getTables,
  createReservation,
  getReservations,
  createMenu,
  getMenus,
  updateRestaurantFeatures
} from '../controllers/restaurant.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Routes pour le détail du restaurant
router.get('/details/:clusterId', verifyToken, getRestaurantDetails);
router.put('/features/:clusterId', verifyToken, updateRestaurantFeatures);

// Routes pour les articles de menu
router.post('/:clusterId/menu-items', verifyToken, createMenuItem);
router.get('/:clusterId/menu-items', getMenuItems);
router.put('/menu-items/:menuItemId', verifyToken, updateMenuItem);

// Routes pour les menus
router.post('/:clusterId/menus', verifyToken, createMenu);
router.get('/:clusterId/menus', getMenus);

// Routes pour les tables
router.post('/:clusterId/tables', verifyToken, createTable);
router.get('/:clusterId/tables', verifyToken, getTables);

// Routes pour les réservations
router.post('/:clusterId/reservations', createReservation);
router.get('/:clusterId/reservations', verifyToken, getReservations);

export default router; 