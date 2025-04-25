import User from '../models/user.model.js';
import Appointment from '../models/appointment.model.js';
import mongoose from 'mongoose';

/**
 * Récupère tous les staffs (employés et managers) d'un cluster
 */
export const getStaffsByCluster = async (req, res) => {
    try {
        const { clusterId } = req.params;
        
        console.log("🔍 Recherche de staff pour le cluster:", clusterId);
        
        if (!clusterId) {
            return res.status(400).json({ message: 'ID du cluster requis' });
        }
        
        // Récupérer directement dans la collection users
        console.log("📊 Requête de recherche dans la collection users: { cluster: ", clusterId, ", role: { $in: ['employee', 'manager'] } }");
        
        const userStaff = await mongoose.connection.db.collection('users').find({ 
            cluster: new mongoose.Types.ObjectId(clusterId),
            role: { $in: ['employee', 'manager', 'admin'] },
            isActive: true
        }).toArray();

        console.log("🧑‍💼 Nombre de staffs trouvés dans users:", userStaff.length);
        
        // Récupérer également dans la collection staffs
        console.log("📊 Requête de recherche dans la collection staffs: { cluster: ", clusterId, "}");
        
        const staffCollection = await mongoose.connection.db.collection('staffs').find({ 
            cluster: new mongoose.Types.ObjectId(clusterId)
        }).toArray();
        
        console.log("🧑‍💼 Nombre de staffs trouvés dans staffs:", staffCollection.length);
        
        // Récupérer également dans la collection members (nouveaux employés)
        console.log("📊 Requête de recherche dans la collection members: { cluster: ", clusterId, ", role: { $ne: 'client' } }");
        
        const memberStaff = await mongoose.connection.db.collection('members').find({ 
            cluster: new mongoose.Types.ObjectId(clusterId),
            role: { $ne: 'client' } // Tous sauf les clients
        }).toArray();
        
        console.log("🧑‍💼 Nombre de staffs trouvés dans members:", memberStaff.length);
        
        // Combiner les résultats
        let combinedStaff = [...userStaff];
        
        // Ajouter les staffs de la collection staffs s'ils n'existent pas déjà
        for (const staff of staffCollection) {
            const exists = combinedStaff.some(user => user.email === staff.email);
            if (!exists) {
                combinedStaff.push(staff);
            }
        }
        
        // Ajouter les staffs de la collection members s'ils n'existent pas déjà
        for (const staff of memberStaff) {
            const exists = combinedStaff.some(user => user.email === staff.email);
            if (!exists) {
                combinedStaff.push(staff);
            }
        }
        
        console.log("🧑‍💼 Nombre total de staffs combinés:", combinedStaff.length);
        
        // Formater la réponse pour correspondre à ce qu'attend le client
        const formattedStaff = combinedStaff.map(s => ({
            _id: s._id.toString(),
            email: s.email,
            firstName: s.firstName,
            lastName: s.lastName,
            role: s.role || 'employee',
            phone: s.phone,
            isAvailable: s.isAvailable !== false // Par défaut disponible si le champ n'est pas défini
        }));
        
        console.log("📋 Liste des staffs combinés:", JSON.stringify(formattedStaff, null, 2));
        
        if (formattedStaff.length === 0) {
            return res.status(404).json({ message: 'Aucun staff trouvé pour ce cluster' });
        }
        
        res.status(200).json(formattedStaff);
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
        const { isAvailable, absenceStartDate, absenceEndDate, absenceReason, isIndefinite } = req.body;
        
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
        
        // Réinitialiser les champs d'absence si le staff est disponible
        if (isAvailable) {
            staff.absenceStartDate = undefined;
            staff.absenceEndDate = undefined;
            staff.absenceReason = undefined;
            staff.isIndefinite = false;
        } else {
            // Gérer l'absence indéfinie
            if (isIndefinite) {
                staff.isIndefinite = true;
                // Si l'absence est indéfinie, on ne définit pas de dates
                staff.absenceStartDate = new Date(); // Date actuelle comme début
                staff.absenceEndDate = undefined;
            } else {
                staff.isIndefinite = false;
                // Sinon, on utilise les dates fournies
                if (absenceStartDate) staff.absenceStartDate = new Date(absenceStartDate);
                if (absenceEndDate) staff.absenceEndDate = new Date(absenceEndDate);
            }
            
            if (absenceReason) staff.absenceReason = absenceReason;
        }
        
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
                absenceReason: staff.absenceReason,
                isIndefinite: staff.isIndefinite
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

/**
 * Vérifie si un staff a des rendez-vous en cours ou futurs
 */
export const checkStaffAppointments = async (req, res) => {
    try {
        const { staffId } = req.params;
        
        if (!staffId) {
            return res.status(400).json({ message: 'ID du staff requis' });
        }
        
        // Vérifier si le staff existe
        const staff = await User.findById(staffId);
        if (!staff) {
            return res.status(404).json({ message: 'Staff non trouvé' });
        }
        
        // Date actuelle
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Début de la journée
        
        // Rechercher les rendez-vous où ce staff est assigné
        const appointments = await mongoose.model('Appointment').find({
            employee: staffId,
            startTime: { $gte: today }
        }).sort({ startTime: 1 });
        
        const hasAppointments = appointments.length > 0;
        
        res.status(200).json({
            hasAppointments,
            appointmentsCount: appointments.length,
            appointments: hasAppointments ? appointments : []
        });
    } catch (error) {
        console.error('Erreur dans checkStaffAppointments:', error);
        res.status(500).json({ message: 'Erreur lors de la vérification des rendez-vous', error: error.message });
    }
};

/**
 * Vérifie si un utilisateur est le propriétaire d'un cluster
 * @param {Object} user L'utilisateur à vérifier
 * @param {String} clusterId L'ID du cluster
 * @returns {Promise<Boolean>} true si l'utilisateur est le propriétaire
 */
const isAccountOwner = async (user, clusterId) => {
    try {
        // Si l'utilisateur est admin ou a le rôle 'owner', c'est probablement un propriétaire
        if (user.role === 'admin' || user.role === 'owner') {
            return true;
        }
        
        // Si l'email de l'utilisateur contient le nom du cluster, il est probablement propriétaire
        // Par exemple: resto@temgo.com pour un restaurant
        if (user.email.includes('resto@') || user.email.endsWith('@temgo.com')) {
            return true;
        }
        
        // Vérifier si c'est le premier utilisateur créé pour ce cluster
        const cluster = await mongoose.model('Cluster').findById(clusterId);
        if (cluster && cluster.createdBy && cluster.createdBy.toString() === user._id.toString()) {
            return true;
        }
        
        // Vérifier dans la collection des utilisateurs s'il est marqué comme propriétaire
        const userCount = await User.countDocuments({ 
            cluster: mongoose.Types.ObjectId(clusterId)
        });
        
        // S'il n'y a qu'un seul utilisateur dans le cluster, c'est probablement le propriétaire
        if (userCount <= 1) {
            return true;
        }
        
        // Si l'utilisateur est le seul manager dans le cluster, c'est probablement le propriétaire
        if (user.role === 'manager') {
            const managerCount = await User.countDocuments({
                cluster: mongoose.Types.ObjectId(clusterId),
                role: 'manager'
            });
            
            if (managerCount <= 1) {
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Erreur dans isAccountOwner:', error);
        // En cas de doute, considérer comme non-propriétaire
        return false;
    }
};

/**
 * Supprime un staff après vérification des rendez-vous
 */
export const deleteStaff = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { force = false } = req.query; // option pour forcer la suppression malgré les rendez-vous
        
        if (!staffId) {
            return res.status(400).json({ message: 'ID du staff requis' });
        }
        
        // Vérifier si le staff existe
        const staff = await User.findById(staffId);
        if (!staff) {
            return res.status(404).json({ message: 'Staff non trouvé' });
        }
        
        // Vérifier les permissions (seuls les admins et managers peuvent supprimer des staffs)
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Vous n\'avez pas les permissions pour supprimer un staff' });
        }
        
        // PROTECTION AMÉLIORÉE: Vérifier si c'est un compte propriétaire de cluster
        const isOwner = await isAccountOwner(staff, staff.cluster);
        if (isOwner) {
            return res.status(403).json({ 
                message: 'Impossible de supprimer un compte propriétaire',
                details: 'Ce compte est identifié comme propriétaire de l\'établissement et ne peut pas être supprimé pour assurer le bon fonctionnement de l\'application'
            });
        }
        
        // Vérifier si l'utilisateur a des rendez-vous en cours ou futurs
        if (!force) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Début de la journée
            
            const appointments = await mongoose.model('Appointment').find({
                employee: staffId,
                startTime: { $gte: today }
            }).limit(5); // Limiter à 5 pour ne pas surcharger la réponse
            
            if (appointments.length > 0) {
                return res.status(409).json({
                    message: 'Cet employé a des rendez-vous en cours ou programmés. Veuillez réassigner ces rendez-vous avant de supprimer cet employé.',
                    appointmentsCount: appointments.length,
                    appointments
                });
            }
        }
        
        // Supprimer l'utilisateur
        await User.findByIdAndDelete(staffId);
        
        res.status(200).json({
            message: 'Staff supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur dans deleteStaff:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression du staff', error: error.message });
    }
};

/**
 * Crée un rendez-vous
 */
export const bookAppointment = async (req, res) => {
    try {
        const { 
            clusterId, memberId, serviceId, startTime, endTime, 
            employeeId, notes, peopleCount, genderBreakdown, tableNumber 
        } = req.body;
        
        // Validation des données...
        
        // Création du rendez-vous
        const appointment = new Appointment({
            cluster: clusterId,
            member: memberId,
            service: serviceId,
            startTime,
            endTime,
            employee: employeeId,
            notes,
            peopleCount: peopleCount || 1, // Utiliser le nombre de personnes fourni ou 1 par défaut
            genderBreakdown: genderBreakdown || {}, // Utiliser la répartition par genre si fournie
            tableNumber // Stocker le numéro de table si fourni
        });
        
        // Enregistrement du rendez-vous
        const savedAppointment = await appointment.save();
        
        // Reste du code existant...
    } catch (error) {
        console.error('Erreur dans bookAppointment:', error);
        res.status(500).json({ message: 'Erreur lors de la création du rendez-vous', error: error.message });
    }
}; 