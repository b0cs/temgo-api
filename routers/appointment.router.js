import express from "express";
import { bookAppointment, getAppointmentsByCluster, getAppointmentsByMember, getAllAppointmentsByDay, cancelAppointment, getAllAppointments, assignEmployeeToAppointment, getStaffByCluster, updateAppointmentAttendance, updateAppointment } from "../controllers/appointment.controller.js";
import { updateAppointmentStatus } from "../controllers/user.controller.js";
import { authMiddleware, checkPermissions } from "../middleware/auth.middleware.js";

const appointmentRouter = express.Router();

// Protéger CERTAINES routes avec l'authentification
// appointmentRouter.use(authMiddleware); // COMMENTÉ POUR LE DÉVELOPPEMENT

// Routes publiques pour le développement (pas d'authentification requise)
// Obtenir tous les staffs d'un cluster (chemin modifié pour éviter les conflits)
appointmentRouter.get("/cluster/staff/:clusterId", getStaffByCluster);

// Obtenir tous les rendez-vous d'un cluster
appointmentRouter.get("/all/:clusterId", getAllAppointments);

// Obtenir les rendez-vous par cluster
appointmentRouter.get("/:clusterId", getAppointmentsByCluster);

// Obtenir les rendez-vous par jour
appointmentRouter.get("/:clusterId/:date", getAllAppointmentsByDay);

// Routes protégées (authentification requise)
appointmentRouter.use(authMiddleware); // Appliquer l'authentification pour les routes suivantes

// Créer un rendez-vous (tous les utilisateurs authentifiés)
appointmentRouter.post("/create", bookAppointment);

// Obtenir les rendez-vous d'un membre
appointmentRouter.get("/info/:memberId", getAppointmentsByMember);

// Annuler un rendez-vous
appointmentRouter.delete("/cancel/:appointmentId", checkPermissions(['canManageAppointments']), cancelAppointment);

// Assigner un employé à un rendez-vous
appointmentRouter.put("/assign/:appointmentId", checkPermissions(['canManageAppointments']), assignEmployeeToAppointment);

// Mettre à jour le statut d'un rendez-vous
appointmentRouter.put("/status/:appointmentId", checkPermissions(['canManageAppointments']), updateAppointmentStatus);

// Mettre à jour un rendez-vous
appointmentRouter.put("/update/:appointmentId", updateAppointment);

// Mettre à jour le statut d'un rendez-vous (honoré ou non)
appointmentRouter.put("/attendance/:appointmentId", updateAppointmentAttendance);

export default appointmentRouter;