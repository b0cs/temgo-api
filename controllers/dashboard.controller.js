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

/**
 * Récupérer les données financières (chiffre d'affaires) d'un cluster pour une période donnée
 */
export const getFinancialStats = async (req, res) => {
    try {
        const { clusterId } = req.params;
        const { startDate, endDate } = req.query;
        
        console.log(`🔍 Demande de statistiques financières pour le cluster: ${clusterId}`);
        console.log(`🔍 Période: du ${startDate || 'début'} au ${endDate || 'aujourd\'hui'}`);
        
        // Validation du clusterId
        if (!mongoose.Types.ObjectId.isValid(clusterId)) {
            console.log(`❌ clusterId invalide: ${clusterId}`);
            return res.status(400).json({ message: 'Format d\'ID de cluster invalide' });
        }

        // Vérification de l'existence du cluster
        const clusterExists = await Cluster.exists({ _id: clusterId });
        
        if (!clusterExists) {
            console.log(`❌ Cluster non trouvé: ${clusterId}`);
            return res.status(404).json({ message: 'Cluster introuvable' });
        }
        
        // Préparer les dates pour le filtrage
        let startDateTime = startDate ? new Date(startDate) : new Date();
        if (!startDate) {
            // Par défaut, début du mois en cours
            startDateTime = new Date(startDateTime.getFullYear(), startDateTime.getMonth(), 1);
        }
        startDateTime.setHours(0, 0, 0, 0);
        
        let endDateTime = endDate ? new Date(endDate) : new Date();
        endDateTime.setHours(23, 59, 59, 999);
        
        console.log(`📅 Dates formatées - Début: ${startDateTime.toISOString()}, Fin: ${endDateTime.toISOString()}`);
        
        // Récupérer tous les rendez-vous complétés pour la période
        const completedAppointments = await Appointment.find({
            cluster: clusterId,
            status: 'completed',
            startTime: { $gte: startDateTime, $lte: endDateTime }
        }).populate('service').populate('member');
        
        console.log(`📊 Nombre de rendez-vous complétés trouvés: ${completedAppointments.length}`);
        
        // Calculer les revenus par jour
        const dailyRevenue = [];
        const serviceRevenue = {};
        
        // Initialiser un tableau pour chaque jour de la période
        const dateRange = getDateRange(startDateTime, endDateTime);
        dateRange.forEach(date => {
            dailyRevenue.push({
                date: date.toISOString().split('T')[0], // Format YYYY-MM-DD
                revenue: 0
            });
        });
        
        // Calculer les revenus
        let totalRevenueTTC = 0;
        
        completedAppointments.forEach(appointment => {
            if (appointment.service && appointment.service.price) {
                const appointmentDate = new Date(appointment.startTime);
                const dateStr = appointmentDate.toISOString().split('T')[0];
                const price = appointment.service.price;
                
                // Ajouter au revenu total
                totalRevenueTTC += price;
                
                // Ajouter au revenu journalier
                const dayIndex = dailyRevenue.findIndex(day => day.date === dateStr);
                if (dayIndex !== -1) {
                    dailyRevenue[dayIndex].revenue += price;
                }
                
                // Ajouter aux statistiques des services
                const serviceId = appointment.service._id.toString();
                const serviceName = appointment.service.name;
                
                if (!serviceRevenue[serviceId]) {
                    serviceRevenue[serviceId] = {
                        name: serviceName,
                        revenue: 0,
                        count: 0
                    };
                }
                
                serviceRevenue[serviceId].revenue += price;
                serviceRevenue[serviceId].count += 1;
            }
        });
        
        // Convertir les stats des services en tableau et trier par revenu
        const topServices = Object.values(serviceRevenue)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5); // Prendre les 5 meilleurs
        
        console.log(`💰 Revenu total: ${totalRevenueTTC}€`);
        console.log(`📊 Top services: ${JSON.stringify(topServices.slice(0, 2))}`);
        
        // Calculer les données du mois précédent pour comparaison
        const previousPeriodStart = new Date(startDateTime);
        previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
        
        const previousPeriodEnd = new Date(endDateTime);
        previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);
        
        const previousAppointments = await Appointment.find({
            cluster: clusterId,
            status: 'completed',
            startTime: { $gte: previousPeriodStart, $lte: previousPeriodEnd }
        }).populate('service');
        
        let previousPeriodRevenue = 0;
        
        previousAppointments.forEach(appointment => {
            if (appointment.service && appointment.service.price) {
                previousPeriodRevenue += appointment.service.price;
            }
        });
        
        // Calculer le pourcentage de changement
        const percentageChange = previousPeriodRevenue > 0
            ? ((totalRevenueTTC - previousPeriodRevenue) / previousPeriodRevenue) * 100
            : 0;
        
        console.log(`📊 Revenu période précédente: ${previousPeriodRevenue}€`);
        console.log(`📊 Évolution: ${percentageChange.toFixed(2)}%`);
        
        // Calculer les valeurs HT et TVA (TVA à 20% par défaut)
        const vatRate = 20.0;
        const totalRevenueHT = totalRevenueTTC / (1 + (vatRate / 100));
        const totalVAT = totalRevenueTTC - totalRevenueHT;
        
        // Assembler la réponse
        const financialData = {
            totalRevenueTTC,
            totalRevenueHT,
            totalVAT,
            vatRate,
            dailyRevenue,
            topServices,
            comparisonWithPreviousPeriod: {
                previousPeriodRevenue,
                percentageChange
            },
            month: startDateTime.getMonth() + 1, // 1-12 (Janvier = 1)
            year: startDateTime.getFullYear()
        };
        
        console.log('✅ Statistiques financières générées avec succès');
        return res.status(200).json(financialData);
        
    } catch (error) {
        console.error(`❌ Erreur lors de la génération des statistiques financières:`, error);
        return res.status(500).json({ 
            message: 'Erreur lors de la récupération des statistiques financières', 
            error: error.message 
        });
    }
};

/**
 * Fonction utilitaire pour générer un tableau de dates entre deux dates
 */
function getDateRange(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
} 