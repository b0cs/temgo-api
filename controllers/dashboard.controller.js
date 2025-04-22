import Member from '../models/member.model.js';
import Appointment from '../models/appointment.model.js';
import Service from '../models/service.model.js';
import Cluster from '../models/cluster.model.js';
import mongoose from 'mongoose';

/**
 * Get dashboard stats
 */
export const getDashboardStats = async (req, res) => {
    try {
        const clusterId = req.params.clusterId;
        console.log(`🔍 Demande de statistiques pour le cluster: ${clusterId}`);

        // En mode débogage, définir un utilisateur pour les requêtes
        if (!req.user) {
            console.log('⚠️ Aucun utilisateur trouvé dans la requête, simulation d\'un utilisateur pour le débogage');
            req.user = {
                id: '65c2acfeb12f28d2d88970e8',
                cluster: clusterId
            };
        }

        // Validation du clusterId
        if (!mongoose.Types.ObjectId.isValid(clusterId)) {
            console.log(`❌ clusterId invalide: ${clusterId}`);
            return res.status(400).json({ message: 'Invalid cluster ID format' });
        }

        // Vérification de l'existence du cluster
        const clusterExists = await Cluster.exists({ _id: clusterId });
        console.log(`Vérification existence cluster: ${clusterExists ? 'trouvé' : 'non trouvé'}`);
        
        // Si le cluster n'existe pas, renvoyer un message d'erreur
        if (!clusterExists) {
            console.log(`❌ Cluster non trouvé: ${clusterId}`);
            
            // En mode débogage, renvoyer des données de test
            if (process.env.NODE_ENV === 'debug') {
                console.log('⚠️ Mode débogage activé, utilisation de données statiques pour le débogage');
                
                // Données de test pour le frontend
                const testData = {
                    clientCount: 25,
                    appointmentCount: 18,
                    serviceCount: 12,
                    completedAppointmentCount: 10,
                    totalRevenue: 1500,
                    
                    // Statistiques des clients
                    clientStats: [
                        { category: 'Nouveaux', count: 10, color: '#4CAF50' },
                        { category: 'Fidèles', count: 15, color: '#2196F3' }
                    ],
                    
                    // Top des services
                    topServices: [
                        { name: 'Coupe Homme', count: 8 },
                        { name: 'Coupe Femme', count: 6 },
                        { name: 'Coloration', count: 4 },
                        { name: 'Massage', count: 3 },
                        { name: 'Manucure', count: 2 }
                    ],
                    
                    // Rendez-vous par jour
                    appointmentsByDay: [
                        { _id: '2025-04-15', count: 3 },
                        { _id: '2025-04-16', count: 5 },
                        { _id: '2025-04-17', count: 4 },
                        { _id: '2025-04-18', count: 6 },
                        { _id: '2025-04-19', count: 2 },
                        { _id: '2025-04-20', count: 0 },
                        { _id: '2025-04-21', count: 3 }
                    ]
                };
                
                console.log('✅ Données statiques renvoyées: ', JSON.stringify(testData));
                return res.status(200).json(testData);
            }
            
            return res.status(404).json({ message: 'Cluster not found' });
        }

        console.log('✅ Cluster trouvé, traitement des données en cours...');

        // Compter les clients directement avec countDocuments
        const clientCount = await Member.countDocuments({ 
            cluster: clusterId, 
            role: 'client' 
        });
        console.log(`📊 Nombre de clients pour le cluster ${clusterId}: ${clientCount}`);

        // Obtenir les statistiques des clients (nouveaux vs fidèles)
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const newClients = await Member.countDocuments({
            cluster: clusterId,
            role: 'client',
            createdAt: { $gte: oneMonthAgo }
        });

        const loyalClients = clientCount - newClients;
        
        console.log(`📊 Statistiques clients calculées - Nouveaux: ${newClients}, Fidèles: ${loyalClients}`);
        
        const clientStats = [
            { category: 'Nouveaux', count: newClients, color: '#4CAF50' },
            { category: 'Fidèles', count: loyalClients, color: '#2196F3' }
        ];
        
        console.log(`📊 Statistiques clients transformées: ${JSON.stringify(clientStats)}`);

        // Compter les rendez-vous
        const appointmentCount = await Appointment.countDocuments({ cluster: clusterId });
        console.log(`📊 Nombre de rendez-vous pour le cluster ${clusterId}: ${appointmentCount}`);
        
        // Compter les rendez-vous complétés
        const completedAppointmentCount = await Appointment.countDocuments({ 
            cluster: clusterId,
            status: 'completed'
        });
        console.log(`📊 Nombre de rendez-vous complétés pour le cluster ${clusterId}: ${completedAppointmentCount}`);
        
        // Compter les services
        const serviceCount = await Service.countDocuments({ cluster: clusterId });
        console.log(`📊 Nombre de services pour le cluster ${clusterId}: ${serviceCount}`);

        // Top des services les plus réservés
        const serviceStats = await Appointment.aggregate([
            { $match: { cluster: new mongoose.Types.ObjectId(clusterId) } },
            { $lookup: {
                from: "services",
                localField: "service",
                foreignField: "_id",
                as: "serviceDetails"
            }},
            { $unwind: "$serviceDetails" },
            {
                $group: {
                    _id: "$service",
                    name: { $first: "$serviceDetails.name" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $project: {
                    name: 1,
                    count: 1,
                    _id: 0
                }
            }
        ]);
        console.log(`📊 Top des services: ${JSON.stringify(serviceStats)}`);

        // Calculer les revenus
        const completedAppointments = await Appointment.find({
            cluster: clusterId,
            status: 'completed'
        }).populate('service');

        let totalRevenue = 0;
        completedAppointments.forEach(appointment => {
            if (appointment.service && appointment.service.price) {
                totalRevenue += appointment.service.price;
            }
        });
        console.log(`📊 Revenu total pour le cluster ${clusterId}: ${totalRevenue}`);

        // Résumé des rendez-vous par jour
        const currentDate = new Date();
        const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0));
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        console.log(`📊 Récupération des rendez-vous depuis: ${startOfWeek}`);

        const appointmentsByDay = await Appointment.aggregate([
            {
                $match: {
                    cluster: new mongoose.Types.ObjectId(clusterId),
                    start: { $gte: startOfWeek }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$start" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        console.log(`📊 Rendez-vous par jour: ${JSON.stringify(appointmentsByDay)}`);

        // Assembler et renvoyer toutes les statistiques
        const dashboardStats = {
            clientCount,
            clientStats,
            appointmentCount,
            completedAppointmentCount,
            serviceCount,
            totalRevenue,
            topServices: serviceStats,
            appointmentsByDay
        };

        console.log(`✅ Statistiques générées avec succès pour ${clusterId}:`);
        console.log(`✅ clientCount: ${clientCount}`);
        console.log(`✅ appointmentCount: ${appointmentCount}`);
        console.log(`✅ serviceCount: ${serviceCount}`);
        console.log(`✅ completedAppointmentCount: ${completedAppointmentCount}`);
        console.log(`✅ totalRevenue: ${totalRevenue}`);
        
        return res.status(200).json(dashboardStats);

    } catch (error) {
        console.error(`❌ Erreur lors de la génération des statistiques:`, error);
        return res.status(500).json({ message: 'Error retrieving dashboard stats', error: error.message });
    }
}; 