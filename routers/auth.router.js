import express from 'express';
import {
  login,
  registerCluster,
  createEmployee,
  getEmployees,
  updateEmployee,
  changePassword,
  forgotPassword,
  resetPassword,
  getMe
} from '../controllers/auth.controller.js';
import { authMiddleware, checkRole, isSuperAdmin } from '../middleware/auth.middleware.js';
import { 
    getStaffsByCluster, 
    getStaffDetails, 
    updateStaffDetails, 
    updateStaffAvailability
} from '../controllers/user.controller.js';

const authRouter = express.Router();

// Routes publiques
authRouter.post('/login', login);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);

// Routes nécessitant une authentification
authRouter.use(authMiddleware);

// Route pour récupérer les informations de l'utilisateur connecté
authRouter.get('/me', getMe);

// Routes pour changer son propre mot de passe
authRouter.post('/change-password', changePassword);

// Routes pour la gestion des employés (admin et manager)
authRouter.post('/employees', checkRole(['admin', 'manager']), createEmployee);
authRouter.get('/employees', checkRole(['admin', 'manager']), getEmployees);
authRouter.put('/employees/:id', checkRole(['admin', 'manager']), updateEmployee);

// Routes réservées aux super administrateurs
authRouter.post('/register-cluster', isSuperAdmin, registerCluster);

// Récupérer tous les staffs d'un cluster
authRouter.get('/staffs/:clusterId', getStaffsByCluster);

// Récupérer les détails d'un staff spécifique
authRouter.get('/staff/:staffId', getStaffDetails);

// Mettre à jour les informations d'un staff
authRouter.put('/staff/:staffId', updateStaffDetails);

// Mettre à jour les informations d'un staff (autre chemin)
authRouter.put('/staff/:staffId/update', updateStaffDetails);

// Mettre à jour la disponibilité d'un staff
authRouter.put('/staff/:staffId/availability', updateStaffAvailability);

export default authRouter; 