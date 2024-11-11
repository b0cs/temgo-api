import Appointment from '../models/appointment.model.js';
import Service from '../models/service.model.js';
import Table from '../models/table.model.js';
import TableLayout from '../models/tableLayout.model.js'; 

/**
 * Créer un rendez-vous
 * @param {Object} req Requête HTTP
 * @param {Object} res Réponse HTTP
 */
export const bookAppointment = async (req, res) => {
    const { clusterId, memberId, serviceId, startTime, peopleCount } = req.body;

    try {
        // Trouver une table disponible
        const table = await Table.findOne({
            cluster: clusterId,
            capacity: { $gte: peopleCount },
            isReserved: false
        });

        if (!table) {
            return res.status(404).json({ message: 'No available table for the requested number of people.' });
        }

        // Préparer le rendez-vous
        const service = await Service.findById(serviceId);
        const duration = service.duration;
        const start = new Date(startTime);
        const end = new Date(start.getTime() + duration * 60000);

        const newAppointment = new Appointment({
            cluster: clusterId,
            member: memberId,
            service: serviceId,
            startTime: start,
            endTime: end,
            table: table._id  // Sauvegarder la référence à la table
        });

        // Enregistrer le rendez-vous
        await newAppointment.save();

        // Marquer la table comme réservée
        table.isReserved = true;
        await table.save();

        res.status(201).json({ message: 'Appointment booked successfully', appointment: newAppointment });
    } catch (error) {
        res.status(500).json({ message: 'Error booking the appointment: ' + error.message });
    }
};


export const getAppointmentsByCluster = async (req, res) => {
    const { clusterId } = req.params; // Assurez-vous que l'ID du cluster est passé en paramètre de l'URL

    try {
        const appointments = await Appointment.find({ cluster: clusterId })
            .populate('member', 'firstName lastName email') // Sélection spécifique des champs pour member
            .populate('service', 'name description'); // Sélection spécifique des champs pour service
        res.status(200).json(appointments);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving appointments: ' + error.message });
    }
};

export const getAppointmentsByMember = async (req, res) => {
    const { memberId } = req.params; // Assurez-vous que l'ID du membre est passé en paramètre de l'URL

    try {
        const appointments = await Appointment.find({ member: memberId })
            .populate('cluster', 'name location') // Sélection spécifique des champs pour cluster
            .populate('service', 'name description')
            .populate('member', 'firstName lastName email'); // Sélection spécifique des champs pour member
        res.status(200).json(appointments);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving appointments: ' + error.message });
    }
};