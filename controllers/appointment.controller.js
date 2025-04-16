import mongoose from 'mongoose';
import Appointment from '../models/appointment.model.js';
import Cluster from '../models/cluster.model.js';
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
        /* const table = await Table.findOne({
            cluster: clusterId,
            capacity: { $gte: peopleCount },
            isReserved: false
        });
        if (!table) {
            return res.status(404).json({ message: 'No available table for the requested number of people.' });
        }
        */

        // Préparer le rendez-vous
        const cluster = await Cluster.findById(clusterId);
        const service = cluster.services.id(serviceId);
        console.log(service);
        const duration = service.duration;
        const start = new Date(startTime);
        const end = new Date(start.getTime() + duration * 60000);

        const newAppointment = new Appointment({
            cluster: clusterId,
            member: memberId,
            service: serviceId,
            startTime: start,
            endTime: end,
            // table: table._id  // Sauvegarder la référence à la table
        });

        // Enregistrer le rendez-vous
        await newAppointment.save();

        // Marquer la table comme réservée
       // table.isReserved = true;
        // await table.save();

        res.status(201).json({ message: 'Appointment booked successfully', appointment: newAppointment });
    } catch (error) {
        res.status(500).json({ message: 'Error booking the appointment: ' + error.message });
    }
};


export const getAppointmentsByCluster = async (req, res) => {
    const { clusterId } = req.params;

    if (!clusterId) {
        return res.status(400).json({ message: 'Cluster ID is required' });
    }

    try {
        const clusterExists = await Cluster.exists({ _id: clusterId });
        if (!clusterExists) {
            return res.status(404).json({ message: 'Cluster not found' });
        }

        const results = await Appointment.aggregate([
            { $match: { cluster: new mongoose.Types.ObjectId(clusterId) } },
            { $lookup: {
                from: 'members', 
                localField: 'member',
                foreignField: '_id',
                as: 'memberDetails'
            }},
            { $unwind: '$memberDetails' },
            { $lookup: {
                from: 'clusters', 
                localField: 'cluster',
                foreignField: '_id',
                as: 'clusterDetails'
            }},
            { $unwind: '$clusterDetails' },
            { $unwind: '$clusterDetails.services' },
            { $addFields: {
                isServiceMatch: { $eq: ['$service', '$clusterDetails.services._id'] }
            }},
            { $match: { isServiceMatch: true } },
            { $project: {
                startTime: 1,
                endTime: 1,
                member: {
                    firstName: '$memberDetails.firstName',
                    lastName: '$memberDetails.lastName',
                    email: '$memberDetails.email'
                },
                service: '$clusterDetails.services'
            }}
        ]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'No appointments found for this cluster' });
        }

        res.status(200).json(results);
    } catch (error) {
        console.log(error);
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

export const getAllAppointmentsByDay = async (req, res) => {
    const { clusterId, date } = req.params; // Assurez-vous que la date et l'ID du cluster sont passés en paramètres

    if (!clusterId) {
        return res.status(400).json({ message: 'Cluster ID is required' });
    }
    if (!date) {
        return res.status(400).json({ message: 'Date is required' });
    }

    try {
        const clusterExists = await Cluster.exists({ _id: clusterId });
        if (!clusterExists) {
            return res.status(404).json({ message: 'Cluster not found' });
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0); // Début de la journée

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999); // Fin de la journée

        const results = await Appointment.aggregate([
            { $match: { 
                cluster: new mongoose.Types.ObjectId(clusterId),
                startTime: {
                    $gte: startOfDay,
                    $lt: endOfDay
                }
            }},
            { $lookup: {
                from: 'members', 
                localField: 'member',
                foreignField: '_id',
                as: 'memberDetails'
            }},
            { $unwind: '$memberDetails' },
            { $lookup: {
                from: 'clusters', 
                localField: 'cluster',
                foreignField: '_id',
                as: 'clusterDetails'
            }},
            { $unwind: '$clusterDetails' },
            { $unwind: '$clusterDetails.services' },
            { $addFields: {
                isServiceMatch: { $eq: ['$service', '$clusterDetails.services._id'] }
            }},
            { $match: { isServiceMatch: true } },
            { $project: {
                startTime: 1,
                endTime: 1,
                member: {
                    firstName: '$memberDetails.firstName',
                    lastName: '$memberDetails.lastName',
                    email: '$memberDetails.email'
                },
                service: {
                    name: '$clusterDetails.services.name',
                    description: '$clusterDetails.services.description',
                    price: '$clusterDetails.services.price',
                    duration: '$clusterDetails.services.duration'
                }
            }}
        ]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'No appointments found for this cluster on the specified date' });
        }

        res.status(200).json(results);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error retrieving appointments: ' + error.message });
    }
};
