import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { login, createEmployee, getMe, createAdmin, refreshToken } from '../controllers/auth.controller.js';
import { 
    getStaffsByCluster, 
    getStaffDetails, 
    updateStaffDetails, 
    updateStaffAvailability,
    checkStaffAppointments,
    deleteStaff
} from '../controllers/user.controller.js';

const authRouter = express.Router();

// Routes publiques
authRouter.post('/login', login);
// Route pour créer un admin sans authentification (pour les tests/initialisation)
authRouter.post('/admin', createAdmin);
// Route pour rafraîchir le token d'accès
authRouter.post('/refresh', refreshToken);
// Commentées pour l'instant car non implémentées
// authRouter.post('/forgot-password', forgotPassword);
// authRouter.post('/reset-password', resetPassword);

// Routes nécessitant une authentification
authRouter.use(authMiddleware);

// Route pour récupérer les informations de l'utilisateur connecté
authRouter.get('/me', getMe);

// Création d'un employé
authRouter.post('/employee', createEmployee);

// Récupérer tous les staffs d'un cluster
authRouter.get('/staffs/:clusterId', getStaffsByCluster);

// Routes pour la gestion du staff
authRouter.get('/staff/:staffId/details', getStaffDetails);
authRouter.put('/staff/:staffId/update', updateStaffDetails);
authRouter.put('/staff/:staffId/availability', updateStaffAvailability);
authRouter.get('/staff/:staffId/appointments/check', checkStaffAppointments);
authRouter.delete('/staff/:staffId', deleteStaff);

export default authRouter; 