import User from '../models/user.model.js';
import Appointment from '../models/appointment.model.js';

/**
 * Récupère tous les staffs (employés et managers) d'un cluster
 */
export const getStaffsByCluster = async (req, res) => {
    try {
        const { clusterId } = req.params;
        
        if (!clusterId) {
            return res.status(400).json({ message: 'ID du cluster requis' });
        }
        
        // Récupérer tous les staffs qui sont des employés ou des managers
        const staffs = await User.find({
            cluster: clusterId,
            role: { $in: ['employee', 'manager'] },
            isActive: true
        }).select('-password -permissions -resetPasswordToken -resetPasswordExpires');
        
        if (staffs.length === 0) {
            return res.status(404).json({ message: 'Aucun staff trouvé pour ce cluster' });
        }
        
        res.status(200).json(staffs);
    } catch (error) {
        console.error('Erreur dans getStaffsByCluster:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des staffs', error: error.message });
    }
};

/**
 * Récupère les détails d'un staff/utilisateur spécifique avec ses disponibilités
 */
export const getStaffDetails = async (req, res) => {
    try {
        const { staffId } = req.params;
        
        if (!staffId) {
            return res.status(400).json({ message: 'ID du staff requis' });
        }
        
        // Récupérer les détails du staff
        const staff = await User.findById(staffId)
            .select('-password -permissions -resetPasswordToken -resetPasswordExpires')
            .populate('specialties');
        
        if (!staff) {
            return res.status(404).json({ message: 'Staff non trouvé' });
        }
        
        // Récupérer les rendez-vous à venir pour ce staff
        const upcomingAppointments = await Appointment.find({
            employee: staffId,
            startTime: { $gte: new Date() },
            status: { $nin: ['cancelled', 'no_show'] }
        })
        .populate('service')
        .populate('member')
        .sort({ startTime: 1 })
        .limit(10);
        
        // Calculer les statistiques du staff
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        // Total des rendez-vous du mois
        const monthlyAppointments = await Appointment.countDocuments({
            employee: staffId,
            startTime: { $gte: startOfMonth, $lte: today }
        });
        
        // Rendez-vous complétés ce mois-ci
        const completedAppointments = await Appointment.countDocuments({
            employee: staffId,
            status: 'completed',
            startTime: { $gte: startOfMonth, $lte: today }
        });
        
        // Rendez-vous où le client ne s'est pas présenté
        const noShowAppointments = await Appointment.countDocuments({
            employee: staffId,
            status: 'no_show',
            startTime: { $gte: startOfMonth, $lte: today }
        });
        
        const response = {
            staff,
            upcomingAppointments,
            statistics: {
                monthlyAppointments,
                completedAppointments,
                noShowAppointments,
                completionRate: monthlyAppointments > 0 ? (completedAppointments / monthlyAppointments) * 100 : 0
            }
        };
        
        res.status(200).json(response);
    } catch (error) {
        console.error('Erreur dans getStaffDetails:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des détails du staff', error: error.message });
    }
};

/**
 * Met à jour les informations d'un staff
 */
export const updateStaffDetails = async (req, res) => {
    try {
        const { staffId } = req.params;
        const updates = req.body;
        
        if (!staffId) {
            return res.status(400).json({ message: 'ID du staff requis' });
        }
        
        // Champs autorisés à mettre à jour
        const allowedUpdates = [
            'firstName', 'lastName', 'phone', 'email', 
            'isAvailable', 'absenceStartDate', 'absenceEndDate', 'absenceReason',
            'lunchStart', 'lunchEnd', 'workHours', 'specialties'
        ];
        
        // Filtrer les mises à jour pour n'autoriser que les champs permis
        const filteredUpdates = {};
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });
        
        const staff = await User.findById(staffId);
        if (!staff) {
            return res.status(404).json({ message: 'Staff non trouvé' });
        }
        
        // Vérifier si l'utilisateur est autorisé à modifier ce staff
        // (admin et manager peuvent modifier, un employé ne peut modifier que ses propres infos)
        if (req.user.role === 'employee' && req.user._id.toString() !== staffId) {
            return res.status(403).json({ message: 'Non autorisé à modifier les informations de ce staff' });
        }
        
        // Mise à jour du staff
        const updatedStaff = await User.findByIdAndUpdate(
            staffId,
            { $set: filteredUpdates },
            { new: true, runValidators: true }
        ).select('-password -permissions -resetPasswordToken -resetPasswordExpires');
        
        res.status(200).json(updatedStaff);
    } catch (error) {
        console.error('Erreur dans updateStaffDetails:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour des informations du staff', error: error.message });
    }
};

/**
 * Met à jour la disponibilité d'un staff
 */
export const updateStaffAvailability = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { isAvailable, absenceStartDate, absenceEndDate, absenceReason } = req.body;
        
        if (!staffId) {
            return res.status(400).json({ message: 'ID du staff requis' });
        }
        
        const staff = await User.findById(staffId);
        if (!staff) {
            return res.status(404).json({ message: 'Staff non trouvé' });
        }
        
        // Vérifier si l'utilisateur a les permissions nécessaires
        if (req.user.role === 'employee' && req.user._id.toString() !== staffId) {
            return res.status(403).json({ message: 'Non autorisé à modifier la disponibilité de ce staff' });
        }
        
        // Mise à jour de la disponibilité
        staff.isAvailable = isAvailable;
        
        if (absenceStartDate) staff.absenceStartDate = new Date(absenceStartDate);
        if (absenceEndDate) staff.absenceEndDate = new Date(absenceEndDate);
        if (absenceReason) staff.absenceReason = absenceReason;
        
        await staff.save();
        
        res.status(200).json({
            message: 'Disponibilité mise à jour avec succès',
            staff: {
                _id: staff._id,
                firstName: staff.firstName,
                lastName: staff.lastName,
                isAvailable: staff.isAvailable,
                absenceStartDate: staff.absenceStartDate,
                absenceEndDate: staff.absenceEndDate,
                absenceReason: staff.absenceReason
            }
        });
    } catch (error) {
        console.error('Erreur dans updateStaffAvailability:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la disponibilité', error: error.message });
    }
};

/**
 * Met à jour le statut d'un rendez-vous
 */
export const updateAppointmentStatus = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { status, notes, completionNotes, pricePaid, paymentMethod, paymentStatus } = req.body;
        
        if (!appointmentId) {
            return res.status(400).json({ message: 'ID du rendez-vous requis' });
        }
        
        // Vérifier si le statut est valide
        const validStatuses = ['scheduled', 'completed', 'cancelled', 'no_show', 'in_progress', 'rescheduled'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Statut non valide' });
        }
        
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé' });
        }
        
        // Mise à jour du rendez-vous
        if (status) appointment.status = status;
        if (notes) appointment.notes = notes;
        if (completionNotes) appointment.completionNotes = completionNotes;
        if (pricePaid) appointment.pricePaid = pricePaid;
        if (paymentMethod) appointment.paymentMethod = paymentMethod;
        if (paymentStatus) appointment.paymentStatus = paymentStatus;
        
        await appointment.save();
        
        // Récupérer le rendez-vous mis à jour avec les détails
        const updatedAppointment = await Appointment.findById(appointmentId)
            .populate('member')
            .populate('service')
            .populate('employee');
        
        res.status(200).json({
            message: 'Statut du rendez-vous mis à jour avec succès',
            appointment: updatedAppointment
        });
    } catch (error) {
        console.error('Erreur dans updateAppointmentStatus:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour du statut du rendez-vous', error: error.message });
    }
}; 