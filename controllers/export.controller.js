import Member from '../models/member.model.js';
import Appointment from '../models/appointment.model.js';
import Service from '../models/service.model.js';
import Review from '../models/review.model.js';
import User from '../models/user.model.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Obtenir le chemin du répertoire courant
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Créer le dossier d'export s'il n'existe pas
const exportDir = path.join(__dirname, '..', 'uploads', 'exports');
if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
}

/**
 * Crée la structure de dossiers pour l'exportation et retourne le chemin
 * @param {string} clusterId - L'ID du cluster
 * @param {string} format - Le format d'exportation (csv, json, excel)
 * @returns {string} - Le chemin complet du dossier d'exportation
 */
function createExportDirStructure(clusterId, format) {
    // Créer le dossier principal du cluster s'il n'existe pas
    const clusterDir = path.join(exportDir, clusterId);
    if (!fs.existsSync(clusterDir)) {
        fs.mkdirSync(clusterDir, { recursive: true });
    }
    
    // Créer le sous-dossier par format (csv, json, excel)
    const formatDir = path.join(clusterDir, format);
    if (!fs.existsSync(formatDir)) {
        fs.mkdirSync(formatDir, { recursive: true });
    }
    
    console.log(`📁 Structure de dossiers créée: ${formatDir}`);
    return formatDir;
}

// Configuration de Multer pour le stockage local
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, exportDir);
    },
    filename: function(req, file, cb) {
        const uniqueFileName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueFileName);
    }
});

export const upload = multer({ storage: storage });

/**
 * Exporter les données au format demandé
 */
export const exportData = async (req, res) => {
    try {
        console.log('🔄 Début de l\'exportation de données');
        console.log('🔍 User ID: ', req.user ? req.user.id : 'Aucun utilisateur');
        console.log('🔍 Headers: ', JSON.stringify(req.headers));
        console.log('🔍 Body complet: ', JSON.stringify(req.body));
        console.log('🔍 Params: ', JSON.stringify(req.params));
        
        // Récupération du clusterId depuis les paramètres d'URL
        const clusterId = req.params.clusterId || req.body.clusterId;
        const { startDate, endDate, format, dataTypes, options, siteId } = req.body;
        
        console.log('📋 Types de données demandés:', dataTypes);
        console.log('⚙️ Format d\'exportation demandé:', format);
        console.log('⚙️ Options d\'exportation brutes:', options);
        console.log('⚙️ Type des options:', typeof options);
        
        if (options !== undefined) {
            if (typeof options === 'object') {
                console.log('⚙️ Clés de l\'objet options:', Object.keys(options));
                console.log('⚙️ Valeurs de l\'objet options:', Object.values(options));
            }
            if (Array.isArray(options)) {
                console.log('⚙️ Nombre d\'éléments dans options:', options.length);
                options.forEach((opt, index) => {
                    console.log(`⚙️ Option[${index}]:`, opt, typeof opt);
                });
            }
        }
        
        // Normalisation des options pour gérer différents formats
        let normalizedOptions = [];
        
        if (options) {
            try {
                // Si options est une chaîne JSON, essayer de la parser
                if (typeof options === 'string' && options.trim().startsWith('{')) {
                    try {
                        const parsedOptions = JSON.parse(options);
                        console.log('⚙️ Options JSON parsées:', parsedOptions);
                        
                        // Convertir l'objet parsé en tableau de clés pour les options avec valeur true
                        if (typeof parsedOptions === 'object' && !Array.isArray(parsedOptions)) {
                            for (const [key, value] of Object.entries(parsedOptions)) {
                                if (value === true || value === 'true' || value === 1 || value === '1') {
                                    normalizedOptions.push(key);
                                }
                            }
                        }
                    } catch (jsonError) {
                        console.log('⚙️ Erreur de parsing JSON:', jsonError.message);
                    }
                }
                // Si options est un objet (comme {generate_sample: true, include_client_info: false})
                else if (typeof options === 'object' && !Array.isArray(options)) {
                    for (const [key, value] of Object.entries(options)) {
                        if (value === true || value === 'true' || value === 1 || value === '1') {
                            normalizedOptions.push(key);
                        }
                    }
                } 
                // Si options est un tableau de strings (comme ['generate_sample', 'include_client_info'])
                else if (Array.isArray(options)) {
                    // Filtrer les valeurs non-string et vides
                    normalizedOptions = options.filter(opt => typeof opt === 'string' && opt.trim() !== '');
                } 
                // Si options est une chaîne unique (comme 'generate_sample')
                else if (typeof options === 'string') {
                    // Vérifier si c'est une liste séparée par des virgules
                    if (options.includes(',')) {
                        normalizedOptions = options.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
                    } else {
                        normalizedOptions = [options];
                    }
                }
            } catch (error) {
                console.error('⚙️ Erreur lors de la normalisation des options:', error);
                // En cas d'erreur, utiliser un tableau vide
                normalizedOptions = [];
            }
        }
        
        console.log('⚙️ Options d\'exportation normalisées:', normalizedOptions);
        
        // Vérifier si generate_sample est activé en utilisant les options normalisées
        const generateSample = normalizedOptions.includes('generate_sample');
        console.log('🔍 generateSample explicitement activé:', generateSample);
        
        // Déterminer les autres options
        const includeClientInfo = normalizedOptions.includes('include_client_info');
        const includeServiceDetails = normalizedOptions.includes('include_service_details');
        const includeNotes = normalizedOptions.includes('include_notes');
        const includePayments = normalizedOptions.includes('include_payments');
        
        console.log('🔍 includeClientInfo:', includeClientInfo);
        console.log('🔍 includeServiceDetails:', includeServiceDetails);
        console.log('🔍 includeNotes:', includeNotes);
        console.log('🔍 includePayments:', includePayments);
        
        // Normalisation du format - accepter différentes notations
        let normalizedFormat = format;
        if (format) {
            // Convertir en minuscules et supprimer les espaces
            normalizedFormat = format.toString().toLowerCase().trim();
            
            // Gérer des alias communs
            if (normalizedFormat === 'xlsx' || normalizedFormat === 'xls') {
                normalizedFormat = 'excel';
            } else if (normalizedFormat === 'csv' || normalizedFormat === 'text/csv') {
                normalizedFormat = 'csv';
            } else if (normalizedFormat === 'json' || normalizedFormat === 'application/json') {
                normalizedFormat = 'json';
            }
            
            console.log('⚙️ Format normalisé:', normalizedFormat);
        }
        
        // Vérification des paramètres
        if (!dataTypes || !Array.isArray(dataTypes) || dataTypes.length === 0) {
            console.log('❌ Erreur: Types de données non spécifiés ou invalides');
            return res.status(400).json({ success: false, message: 'Veuillez spécifier les types de données à exporter' });
        }
        
        if (!clusterId || !mongoose.Types.ObjectId.isValid(clusterId)) {
            console.log(`❌ clusterId invalide: ${clusterId}`);
            return res.status(400).json({ success: false, message: 'ID de cluster invalide' });
        }
        
        if (!normalizedFormat || !['csv', 'json', 'excel'].includes(normalizedFormat)) {
            console.log(`❌ Format invalide: ${normalizedFormat}`);
            return res.status(400).json({ 
                success: false, 
                message: 'Format d\'exportation invalide. Formats acceptés: csv, json, excel',
                supportedFormats: ['csv', 'json', 'excel'] 
            });
        }
        
        console.log(`📊 Exportation demandée pour le cluster ${clusterId} au format ${normalizedFormat}`);
        console.log(`📊 Types de données: ${dataTypes.join(', ')}`);
        
        // Ne pas utiliser la méthode de flux pour les réponses partielles
        // Flutter et certains frameworks ne supportent pas bien ce format
        
        if (startDate && endDate) {
            console.log(`📊 Période: ${startDate} - ${endDate}`);
        }
        
        if (options) {
            console.log(`📊 Options: ${JSON.stringify(options)}`);
        }
        
        // Préparer la période de filtrage
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
            console.log(`📊 Filtre de dates configuré: ${JSON.stringify(dateFilter)}`);
        }
        
        // Récupérer les données demandées
        const exportData = {};
        
        if (dataTypes.includes('clients')) {
            console.log('📊 Récupération des clients...');
            const query = { cluster: clusterId, role: 'client' };
            
            if (startDate && endDate) {
                query.createdAt = dateFilter;
            }
            
            try {
                // Récupérer les clients de la collection Member
                const clients = await Member.find(query).lean();
                console.log(`📊 Nombre brut de clients trouvés: ${clients.length}`);
                
                // Si aucun client n'a le champ lastAppointment et appointmentCount, 
                // chercher ces informations dans la collection Appointment
                let appointmentsByClient = {};
                let hasAppointmentData = clients.some(client => client.lastAppointment || client.appointmentCount);
                
                if (!hasAppointmentData && clients.length > 0) {
                    console.log('📊 Calcul dynamique des données de rendez-vous pour les clients...');
                    
                    // Récupérer tous les rendez-vous pour le cluster
                    const appointments = await Appointment.find({ 
                        cluster: clusterId,
                        member: { $in: clients.map(client => client._id) }
                    }).lean();
                    
                    // Regrouper les rendez-vous par client
                    appointments.forEach(appt => {
                        const clientId = appt.member.toString();
                        
                        if (!appointmentsByClient[clientId]) {
                            appointmentsByClient[clientId] = {
                                count: 0,
                                lastAppointment: null
                            };
                        }
                        
                        appointmentsByClient[clientId].count++;
                        
                        // Mettre à jour le dernier rendez-vous s'il est plus récent
                        const apptDate = appt.startTime || appt.date;
                        if (apptDate && (!appointmentsByClient[clientId].lastAppointment || 
                            new Date(apptDate) > new Date(appointmentsByClient[clientId].lastAppointment))) {
                            appointmentsByClient[clientId].lastAppointment = apptDate;
                        }
                    });
                    
                    console.log(`📊 Données de rendez-vous calculées pour ${Object.keys(appointmentsByClient).length} clients`);
                }
                
                // Transformer les données pour l'export
                exportData.clients = clients.map(client => {
                    const clientId = client._id.toString();
                    const appointmentData = appointmentsByClient[clientId] || {};
                    
                    // Utiliser les données de rendez-vous du modèle si disponibles, sinon les données calculées
                    const lastAppointment = client.lastAppointment || appointmentData.lastAppointment;
                    const appointmentCount = client.appointmentCount || appointmentData.count || 0;
                    
                    return {
                        id: clientId,
                        prenom: client.firstName || '',
                        nom: client.lastName || '',
                        email: client.email || 'Non renseigné',
                        telephone: client.phone || 'Non renseigné',
                        dateCreation: client.createdAt ? new Date(client.createdAt).toLocaleString('fr-FR') : 'Non défini',
                        dernierRdv: lastAppointment ? new Date(lastAppointment).toLocaleString('fr-FR') : 'Aucun',
                        nombreRdv: appointmentCount,
                        notes: client.notes || '',
                        preferences: client.preferences || '',
                        statut: client.status || 'Actif',
                        genre: client.gender || 'Non spécifié'
                    };
                });
                
                console.log(`📊 ${exportData.clients.length} clients transformés pour l'export`);
            } catch (error) {
                console.error(`❌ Erreur lors de la récupération des clients: ${error.message}`);
                console.error(error.stack);
                
                // Utiliser la variable generateSample déjà définie
                if (generateSample) {
                    console.log('📊 Génération de données d\'exemple de clients suite à une erreur');
                    exportData.clients = generateSampleData('clients', 10);
                    console.log(`📊 ${exportData.clients.length} clients d'exemple générés`);
                } else {
                    // Ne pas laisser l'erreur arrêter l'exportation, initialiser avec un tableau vide
                    exportData.clients = [];
                }
            }
        }
        
        if (dataTypes.includes('appointments')) {
            console.log('📊 Récupération des rendez-vous...');
            const query = { cluster: clusterId };
            
            if (startDate && endDate) {
                console.log(`📊 DEBUG: Filtrage par date - startDate: ${startDate}, endDate: ${endDate}`);
                query.$or = [
                    { date: dateFilter },
                    { startTime: dateFilter },
                    { createdAt: dateFilter }
                ];
                console.log(`📊 DEBUG: Query finale pour les rendez-vous: ${JSON.stringify(query)}`);
            }
            
            console.log(`📊 DEBUG: Exécution de la requête Appointment.find avec: ${JSON.stringify(query)}`);
            
            try {
                // Utiliser la méthode sans populate par défaut pour éviter les erreurs d'ID non valides
                console.log('📊 Récupération des rendez-vous sans populate...');
                const rawAppointments = await Appointment.find(query).lean();
                console.log(`📊 Nombre de rendez-vous bruts trouvés (sans populate): ${rawAppointments.length}`);
                
                // Transformer les données pour l'export
                exportData.appointments = rawAppointments.map(appt => ({
                    id: appt._id ? appt._id.toString() : 'ID manquant',
                    client: 'ID: ' + (appt.member ? appt.member.toString() : 'Non renseigné'),
                    clientEmail: 'Non disponible (requête sans détails)', 
                    service: 'ID: ' + (appt.service ? appt.service.toString() : 'Non renseigné'),
                    prix: 'Non disponible',
                    duree: 'Non disponible',
                    employe: 'ID: ' + (appt.employee ? appt.employee.toString() : 'Non assigné'),
                    date: appt.date ? new Date(appt.date).toLocaleString('fr-FR') : 
                        appt.startTime ? new Date(appt.startTime).toLocaleString('fr-FR') : 'Non défini',
                    heureDebut: appt.startTime ? new Date(appt.startTime).toLocaleTimeString('fr-FR') : '',
                    heureFin: appt.endTime ? new Date(appt.endTime).toLocaleTimeString('fr-FR') : '',
                    statut: appt.status || 'En attente',
                    paiement: appt.paymentStatus || 'Non payé',
                    notes: appt.notes || ''
                }));
                
                console.log(`📊 ${exportData.appointments.length} rendez-vous récupérés et transformés pour l'export`);
                
                // Si les options demandent des infos détaillées, essayer d'enrichir les données
                const needsDetailedInfo = includeClientInfo || includeServiceDetails || includeNotes || includePayments;
                
                if (needsDetailedInfo && exportData.appointments.length > 0) {
                    console.log('📊 Enrichissement des données de rendez-vous avec les détails...');
                    
                    try {
                        // Récupérer tous les membres, services et employés en une seule requête chacun
                        const memberIds = [...new Set(rawAppointments.filter(a => a.member && mongoose.Types.ObjectId.isValid(a.member)).map(a => a.member))];
                        const serviceIds = [...new Set(rawAppointments.filter(a => a.service && mongoose.Types.ObjectId.isValid(a.service)).map(a => a.service))];
                        const employeeIds = [...new Set(rawAppointments.filter(a => a.employee && mongoose.Types.ObjectId.isValid(a.employee)).map(a => a.employee))];
                        
                        console.log(`📊 Récupération de ${memberIds.length} clients, ${serviceIds.length} services et ${employeeIds.length} employés`);
                        
                        // Récupérer toutes les données en parallèle
                        const [members, services, employees] = await Promise.all([
                            memberIds.length > 0 ? Member.find({ _id: { $in: memberIds } }).lean() : [],
                            serviceIds.length > 0 ? Service.find({ _id: { $in: serviceIds } }).lean() : [],
                            employeeIds.length > 0 ? User.find({ _id: { $in: employeeIds } }).lean() : []
                        ]);
                        
                        console.log(`📊 Données récupérées: ${members.length} clients, ${services.length} services et ${employees.length} employés`);
                        
                        // Créer des maps pour un accès facile
                        const memberMap = {};
                        const serviceMap = {};
                        const employeeMap = {};
                        
                        members.forEach(m => memberMap[m._id.toString()] = m);
                        services.forEach(s => serviceMap[s._id.toString()] = s);
                        employees.forEach(e => employeeMap[e._id.toString()] = e);
                        
                        // Enrichir les données de rendez-vous
                        exportData.appointments = exportData.appointments.map(appt => {
                            // Extraire l'ID du format "ID: xxx"
                            const memberId = appt.client.startsWith('ID: ') ? appt.client.substring(4) : null;
                            const serviceId = appt.service.startsWith('ID: ') ? appt.service.substring(4) : null;
                            const employeeId = appt.employe.startsWith('ID: ') ? appt.employe.substring(4) : null;
                            
                            // Récupérer les objets correspondants
                            const member = memberId && mongoose.Types.ObjectId.isValid(memberId) ? memberMap[memberId] : null;
                            const service = serviceId && mongoose.Types.ObjectId.isValid(serviceId) ? serviceMap[serviceId] : null;
                            const employee = employeeId && mongoose.Types.ObjectId.isValid(employeeId) ? employeeMap[employeeId] : null;
                            
                            // Retourner l'objet enrichi
                            return {
                                ...appt,
                                client: member ? `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Client inconnu' : appt.client,
                                clientEmail: member?.email || appt.clientEmail,
                                service: service?.name || appt.service,
                                prix: service?.price || appt.prix,
                                duree: service?.duration || appt.duree,
                                employe: employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Non assigné' : appt.employe
                            };
                        });
                        
                        console.log(`📊 ${exportData.appointments.length} rendez-vous enrichis avec succès`);
                    } catch (enrichError) {
                        console.error(`⚠️ Erreur lors de l'enrichissement des rendez-vous: ${enrichError.message}`);
                        console.error(enrichError.stack);
                        console.log('📊 Utilisation des données de base sans enrichissement');
                    }
                }
                
            } catch (error) {
                console.error(`❌ Erreur lors de la récupération des rendez-vous: ${error.message}`);
                console.error(error.stack);
                
                // Utiliser la variable generateSample déjà définie
                if (generateSample) {
                    console.log('📊 Génération de données d\'exemple de rendez-vous suite à une erreur');
                    exportData.appointments = generateSampleData('appointments', 10);
                    console.log(`📊 ${exportData.appointments.length} rendez-vous d'exemple générés`);
                } else {
                    // Ne pas laisser l'erreur arrêter l'exportation, initialiser avec un tableau vide
                    exportData.appointments = [];
                }
            }
        }
        
        if (dataTypes.includes('services')) {
            console.log('📊 Récupération des services...');
            const query = { cluster: clusterId };
            
            const services = await Service.find(query).lean();
            
            // Transformer les données pour l'export
            exportData.services = services.map(service => ({
                id: service._id.toString(),
                nom: service.name || '',
                description: service.description || '',
                prix: service.price || 0,
                duree: service.duration || 0,
                couleur: service.color || '#000000',
                disponible: service.available ? 'Oui' : 'Non',
                dateCreation: service.createdAt ? new Date(service.createdAt).toLocaleString('fr-FR') : 'Non défini'
            }));
            
            console.log(`📊 ${exportData.services.length} services récupérés`);
        }
        
        if (dataTypes.includes('reviews')) {
            console.log('📊 Récupération des avis...');
            const query = { cluster: clusterId };
            
            if (startDate && endDate) {
                query.createdAt = dateFilter;
            }
            
            const reviews = await Review.find(query)
                .populate('member', 'firstName lastName email')
                .populate('service', 'name')
                .lean();
            
            // Transformer les données pour l'export
            exportData.reviews = reviews.map(review => ({
                id: review._id.toString(),
                client: review.member ? `${review.member.firstName} ${review.member.lastName}` : 'Client inconnu',
                clientEmail: review.member?.email || 'Non renseigné',
                service: review.service?.name || 'Service inconnu',
                note: review.rating || 0,
                commentaire: review.comment || '',
                dateCreation: review.createdAt ? new Date(review.createdAt).toLocaleString('fr-FR') : 'Non défini',
                reponse: review.response || '',
                dateReponse: review.responseDate ? new Date(review.responseDate).toLocaleString('fr-FR') : 'Pas de réponse'
            }));
            
            console.log(`📊 ${exportData.reviews.length} avis récupérés`);
        }
        
        // Ajout de l'export des employés depuis la collection User
        if (dataTypes.includes('staffs')) {
            console.log('📊 Récupération des employés...');
            const query = { 
                cluster: clusterId,
                role: { $in: ['employee', 'manager'] }  // Récupérer uniquement les employés et managers
            };
            
            if (startDate && endDate) {
                query.createdAt = dateFilter;
            }
            
            try {
                // Récupérer les employés
                const staffs = await User.find(query).lean();
                
                console.log(`📊 DEBUG: Nombre d'employés bruts trouvés: ${staffs.length}`);
                
                // Afficher un échantillon pour le débogage
                if (staffs.length > 0) {
                    console.log(`📊 DEBUG: Premier employé trouvé: ${JSON.stringify(staffs[0])}`);
                }
                
                // Transformer les données pour l'export
                exportData.staffs = staffs.map(staff => ({
                    id: staff._id.toString(),
                    prenom: staff.firstName || '',
                    nom: staff.lastName || '',
                    email: staff.email || 'Non renseigné',
                    telephone: staff.phone || 'Non renseigné',
                    role: staff.role === 'manager' ? 'Manager' : 'Employé',
                    disponible: staff.isAvailable ? 'Oui' : 'Non',
                    heureDebutTravail: staff.workHours && staff.workHours.length > 0 
                        ? staff.workHours.find(h => h.day === 'monday')?.startTime || '09:00'
                        : '09:00',
                    heureFinTravail: staff.workHours && staff.workHours.length > 0 
                        ? staff.workHours.find(h => h.day === 'monday')?.endTime || '18:00'
                        : '18:00',
                    debutPause: staff.lunchStart || '12:00',
                    finPause: staff.lunchEnd || '13:00',
                    dateCreation: staff.createdAt ? new Date(staff.createdAt).toLocaleString('fr-FR') : 'Non défini',
                    statut: staff.isActive ? 'Actif' : 'Inactif'
                }));
                
                console.log(`📊 ${exportData.staffs.length} employés récupérés`);
            } catch (error) {
                console.error(`❌ Erreur lors de la récupération des employés: ${error.message}`);
                console.error(error.stack);
                
                // Utiliser la variable generateSample déjà définie
                if (generateSample) {
                    console.log('📊 Génération de données d\'exemple d\'employés suite à une erreur');
                    exportData.staffs = generateSampleData('staffs', 5);
                    console.log(`📊 ${exportData.staffs.length} employés d'exemple générés`);
                } else {
                    // Ne pas laisser l'erreur arrêter l'exportation, initialiser avec un tableau vide
                    exportData.staffs = [];
                }
            }
        }
        
        // Vérifier si des données ont été trouvées
        let hasData = false;
        let nonEmptyTypes = [];
        let emptyTypes = [];
        
        for (const type of dataTypes) {
            if (exportData[type] && exportData[type].length > 0) {
                hasData = true;
                nonEmptyTypes.push(type);
            } else if (exportData[type]) {
                emptyTypes.push(type);
            }
        }
        
        if (!hasData) {
            console.log('❌ Aucune donnée trouvée pour l\'exportation');
            
            console.log('⚠️ Aucune donnée trouvée, generate_sample activé:', generateSample);
            
            if (generateSample) {
                console.log('📊 Génération de données d\'exemple demandée explicitement');
                
                // Créer des données d'exemple pour chaque type demandé
                for (const dataType of dataTypes) {
                    exportData[dataType] = generateSampleData(dataType, 10); // 10 exemples par type
                }
                
                console.log('📊 Données d\'exemple générées avec succès');
                hasData = true;
            } else {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Aucune donnée trouvée pour l\'exportation. Activez l\'option "Générer des exemples" pour produire des données de démonstration.'
                });
            }
        } else if (emptyTypes.length > 0) {
            console.log(`⚠️ Attention: Aucune donnée trouvée pour ces types: ${emptyTypes.join(', ')}`);
            console.log(`✅ Exportation continuée avec les données disponibles pour: ${nonEmptyTypes.join(', ')}`);
            
            // Si l'option generate_sample est activée, générer des exemples pour les types vides
            if (generateSample && emptyTypes.length > 0) {
                console.log('📊 Génération de données d\'exemple pour les types vides');
                
                for (const emptyType of emptyTypes) {
                    exportData[emptyType] = generateSampleData(emptyType, 5); // 5 exemples par type vide
                    console.log(`📊 ${exportData[emptyType].length} ${emptyType} d'exemple générés`);
                }
            }
        }
        
        // Générer le fichier d'exportation selon le format demandé
        let exportResult;
        
        try {
            // Préparer les options pour les fonctions de génération
            const exportOptions = {
                includeClientInfo,
                includeServiceDetails,
                includeNotes,
                includePayments
            };
            
            console.log(`📊 Génération du fichier au format: ${normalizedFormat}`);
            console.log(`📊 Options activées: `, exportOptions);
            
            if (normalizedFormat === 'csv') {
                exportResult = await generateCSV(exportData, dataTypes, clusterId, exportOptions);
            } else if (normalizedFormat === 'json') {
                exportResult = await generateJSON(exportData, dataTypes, clusterId, exportOptions);
            } else if (normalizedFormat === 'excel') {
                exportResult = await generateExcel(exportData, dataTypes, clusterId, exportOptions);
            } else {
                throw new Error(`Format non supporté: ${normalizedFormat}`);
            }
            
            const { fileName, filePath, recordCount } = exportResult;
            // Inclure le clusterId et le format dans l'URL de téléchargement pour retrouver le fichier
            const downloadUrl = `/api/exports/download/${fileName}?clusterId=${clusterId}&format=${normalizedFormat}`;
            
            console.log(`✅ Exportation réussie! Fichier généré: ${fileName} (${normalizedFormat})`);
            
            // Renvoyer une réponse unique complète au lieu d'une série de réponses partielles
            return res.status(200).json({
                success: true,
                message: 'Exportation réussie',
                fileName,
                filePath,
                downloadUrl,
                format: normalizedFormat,
                dataTypes,
                recordCount,
                options: normalizedOptions,
                availableOptions: {
                    include_client_info: true,
                    include_service_details: true,
                    include_notes: true,
                    include_payments: true,
                    generate_sample: true
                },
                selectedOptions: {
                    include_client_info: includeClientInfo,
                    include_service_details: includeServiceDetails,
                    include_notes: includeNotes,
                    include_payments: includePayments,
                    generate_sample: generateSample
                },
                emptyTypes: emptyTypes.length > 0 ? emptyTypes : undefined,
                timestamp: new Date().toISOString()
            });
            
        } catch (fileError) {
            console.error('❌ Erreur lors de la génération du fichier:', fileError);
            
            return res.status(500).json({
                success: false,
                message: `Erreur lors de la génération du fichier: ${fileError.message}`
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'exportation des données:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'exportation des données',
            error: error.message
        });
    }
};

/**
 * Télécharger un fichier exporté
 */
export const downloadExport = async (req, res) => {
    try {
        const fileName = req.params.fileName;
        const clusterId = req.query.clusterId; // Récupérer le clusterId depuis les paramètres de requête
        const format = req.query.format || determineFormatFromFileName(fileName); // Déterminer le format
        
        console.log(`🔍 Demande de téléchargement du fichier: ${fileName}`);
        console.log('🔍 User ID: ', req.user ? req.user.id : 'Aucun utilisateur');
        console.log('🔍 Headers: ', JSON.stringify(req.headers));
        console.log('🔍 Query params: ', JSON.stringify(req.query));
        console.log('🔍 ClusterId: ', clusterId);
        console.log('🔍 Format: ', format);
        
        // Construire le chemin du fichier selon la nouvelle structure
        let filePath;
        
        if (clusterId && format) {
            // Utiliser la nouvelle structure organisée
            filePath = path.join(exportDir, clusterId, format, fileName);
        } else {
            // Fallback vers l'ancien chemin pour la rétrocompatibilité
            filePath = path.join(exportDir, fileName);
        }
        
        console.log(`🔍 Recherche du fichier à: ${filePath}`);
        
        // Vérifier si le fichier existe
        if (!fs.existsSync(filePath)) {
            console.log(`❌ Fichier non trouvé au chemin spécifique: ${filePath}`);
            
            // Si le chemin direct ne fonctionne pas, essayer de rechercher le fichier dans tous les sous-dossiers
            const foundFilePath = await findFileInExports(fileName);
            
            if (foundFilePath) {
                console.log(`✅ Fichier trouvé à un autre emplacement: ${foundFilePath}`);
                filePath = foundFilePath;
            } else {
                console.log(`❌ Fichier introuvable, même après recherche approfondie.`);
                return res.status(404).json({ success: false, message: 'Fichier non trouvé' });
            }
        }
        
        // Vérifier la taille du fichier (pour logging)
        const stats = fs.statSync(filePath);
        console.log(`📊 Taille du fichier: ${(stats.size / 1024).toFixed(2)} KB`);
        
        console.log(`✅ Fichier trouvé, envoi au client: ${filePath}`);
        
        // Déterminer le type MIME en fonction de l'extension
        let contentType = 'application/octet-stream'; // Par défaut
        const ext = path.extname(fileName).toLowerCase();
        
        if (ext === '.csv') {
            contentType = 'text/csv';
        } else if (ext === '.json') {
            contentType = 'application/json';
        } else if (ext === '.xlsx') {
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }
        
        // Force le téléchargement quel que soit le navigateur
        const userAgent = req.headers['user-agent'] || '';
        const isMSIE = userAgent.includes('MSIE') || userAgent.includes('Trident');
        
        // Encoder le nom de fichier pour gérer les caractères spéciaux
        let encodedFilename;
        if (isMSIE) {
            encodedFilename = encodeURIComponent(fileName);
        } else {
            encodedFilename = `"${fileName.replace(/"/g, '\\"')}"`;
        }
        
        // Configurer les en-têtes pour le téléchargement
        res.setHeader('Content-Disposition', `attachment; filename=${encodedFilename}`);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', 0);
        
        console.log(`✅ En-têtes configurés: Content-Type=${contentType}, Content-Length=${stats.size}`);
        
        // Envoyer le fichier
        console.log(`🚀 Début de l'envoi du fichier...`);
        const fileStream = fs.createReadStream(filePath);
        
        // Ajouter des listeners pour suivre le processus de téléchargement
        fileStream.on('open', () => console.log('✅ Stream ouvert'));
        fileStream.on('end', () => console.log('✅ Téléchargement terminé'));
        fileStream.on('error', (err) => console.error('❌ Erreur de stream:', err));
        
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('❌ Erreur lors du téléchargement du fichier:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors du téléchargement du fichier',
            error: error.message
        });
    }
};

/**
 * Détermine le format de fichier à partir du nom de fichier
 */
function determineFormatFromFileName(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    
    if (ext === '.csv') {
        return 'csv';
    } else if (ext === '.json') {
        return 'json';
    } else if (ext === '.xlsx') {
        return 'excel';
    }
    
    return null;
}

/**
 * Recherche un fichier dans tous les sous-dossiers d'export
 */
async function findFileInExports(fileName) {
    // Fonction récursive pour chercher un fichier dans un dossier et ses sous-dossiers
    function searchFileInDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                // Rechercher dans le sous-dossier
                const result = searchFileInDir(fullPath);
                if (result) return result;
            } else if (entry.name === fileName) {
                // Fichier trouvé
                return fullPath;
            }
        }
        
        return null;
    }
    
    return searchFileInDir(exportDir);
}

/**
 * Générer un fichier CSV à partir des données
 */
async function generateCSV(data, dataTypes, clusterId, options = {}) {
    const timestamp = Date.now();
    const fileName = `export_${timestamp}.csv`;
    
    // Créer la structure de dossiers et obtenir le chemin complet
    const exportDirPath = createExportDirStructure(clusterId, 'csv');
    const filePath = path.join(exportDirPath, fileName);
    
    console.log(`📊 Génération du fichier CSV: ${fileName}`);
    
    try {
        let csvWriter;
        
        // Utiliser uniquement le premier type de données (CSV ne supporte pas plusieurs tables)
        const firstDataType = dataTypes[0];
        
        // Appliquer la fonction de formatage pour rendre les données plus présentables
        const formattedData = formatExportData(data, [firstDataType], options);
        const firstDataSet = formattedData[firstDataType] || [];
        
        if (firstDataSet.length === 0) {
            throw new Error(`Aucune donnée disponible pour ${firstDataType}`);
        }
        
        // Déterminer les champs à exclure en fonction des options
        const fieldsToExclude = [];
        
        if (!options.includeNotes) {
            fieldsToExclude.push('Notes');
        }
        
        if (!options.includePayments) {
            fieldsToExclude.push('Paiement');
        }
        
        console.log(`📊 Champs exclus du CSV: ${fieldsToExclude.join(', ')}`);
        
        // Filtrer les données pour exclure certains champs non désirés
        const filteredData = firstDataSet.map(item => {
            const filteredItem = {};
            
            for (const key in item) {
                if (!fieldsToExclude.includes(key)) {
                    filteredItem[key] = item[key];
                }
            }
            
            return filteredItem;
        });
        
        // Déterminer les en-têtes du CSV depuis les clés du premier élément
        const headers = Object.keys(filteredData[0]).map(key => ({
            id: key,
            title: key // Déjà formaté avec les bons noms en français
        }));
        
        // Créer le fichier CSV
        csvWriter = createObjectCsvWriter({
            path: filePath,
            header: headers,
            fieldDelimiter: ';' // Séparateur pour la compatibilité avec Excel
        });
        
        // Écrire les données
        await csvWriter.writeRecords(filteredData);
        
        // Si plusieurs types de données sont demandés, ajouter un message
        if (dataTypes.length > 1) {
            console.log(`⚠️ Note: Le format CSV ne supporte qu'un seul type de données. Seul ${firstDataType} a été exporté.`);
        }
        
        console.log(`📊 Fichier CSV créé: ${filePath}`);
        
        return {
            fileName,
            filePath,
            recordCount: filteredData.length
        };
    } catch (error) {
        console.error('❌ Erreur lors de la génération du CSV:', error);
        throw new Error(`Erreur lors de la génération du CSV: ${error.message}`);
    }
}

/**
 * Générer un fichier JSON à partir des données
 */
async function generateJSON(data, dataTypes, clusterId, options = {}) {
    const timestamp = Date.now();
    const fileName = `export_${timestamp}.json`;
    
    // Créer la structure de dossiers et obtenir le chemin complet
    const exportDirPath = createExportDirStructure(clusterId, 'json');
    const filePath = path.join(exportDirPath, fileName);
    
    console.log(`📊 Génération du fichier JSON: ${fileName}`);
    
    try {
        // Appliquer la fonction de formatage pour rendre les données plus présentables
        const formattedData = formatExportData(data, dataTypes, options);
        
        // Compter le nombre total d'enregistrements
        const totalRecords = dataTypes.reduce((sum, type) => sum + (formattedData[type]?.length || 0), 0);
        
        // Ajouter des métadonnées
        const jsonData = {
            metadata: {
                exportDate: new Date().toISOString(),
                dateExport: new Date().toLocaleString('fr-FR'),
                cluster: clusterId,
                typesExportes: dataTypes.map(type => {
                    switch(type) {
                        case 'clients': return 'Clients';
                        case 'appointments': return 'Rendez-vous';
                        case 'services': return 'Services';
                        case 'reviews': return 'Avis';
                        case 'staffs': return 'Employés';
                        default: return type;
                    }
                }),
                nombreElements: totalRecords,
                options: {
                    includeClientInfo: options.includeClientInfo || false,
                    includeServiceDetails: options.includeServiceDetails || false,
                    includeNotes: options.includeNotes || false,
                    includePayments: options.includePayments || false
                }
            },
            donnees: formattedData
        };
        
        // Écrire le fichier JSON
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
        
        console.log(`📊 Fichier JSON créé: ${filePath}`);
        
        return {
            fileName,
            filePath,
            recordCount: totalRecords
        };
    } catch (error) {
        console.error('❌ Erreur lors de la génération du JSON:', error);
        throw new Error(`Erreur lors de la génération du JSON: ${error.message}`);
    }
}

/**
 * Générer un fichier Excel à partir des données
 */
async function generateExcel(data, dataTypes, clusterId, options = {}) {
    const timestamp = Date.now();
    const fileName = `export_${timestamp}.xlsx`;
    
    // Créer la structure de dossiers et obtenir le chemin complet
    const exportDirPath = createExportDirStructure(clusterId, 'excel');
    const filePath = path.join(exportDirPath, fileName);
    
    console.log(`📊 Génération du fichier Excel: ${fileName}`);
    
    try {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Temgo Export';
        workbook.created = new Date();
        
        let totalRecords = 0;
        
        // Formater les données pour les rendre plus présentables
        const formattedData = formatExportData(data, dataTypes, options);
        
        // Ajouter des onglets pour chaque type de données
        for (const dataType of dataTypes) {
            if (!formattedData[dataType] || formattedData[dataType].length === 0) continue;
            
            totalRecords += formattedData[dataType].length;
            
            // Titre de l'onglet en français
            let sheetName;
            switch(dataType) {
                case 'clients': sheetName = 'Clients'; break;
                case 'appointments': sheetName = 'Rendez-vous'; break;
                case 'services': sheetName = 'Services'; break;
                case 'reviews': sheetName = 'Avis'; break;
                case 'staffs': sheetName = 'Employés'; break;
                default: sheetName = dataType.charAt(0).toUpperCase() + dataType.slice(1);
            }
            
            const worksheet = workbook.addWorksheet(sheetName);
            
            const records = formattedData[dataType];
            const headers = Object.keys(records[0]);
            
            // Configuration des colonnes
            worksheet.columns = headers.map(header => ({
                header: header, // Déjà formaté en français
                key: header,
                width: 18 // Largeur par défaut un peu plus grande
            }));
            
            // Appliquer un style moderne pour tout le tableau
            worksheet.properties.defaultRowHeight = 22;
            
            // Style des en-têtes
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF333333' } // Noir
            };
            worksheet.getRow(1).font = { 
                bold: true,
                color: { argb: 'FFFFFFFF' } // Blanc
            };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 28;
            
            // Style des cellules et formatage des valeurs
            for (let i = 0; i < records.length; i++) {
                const row = worksheet.addRow(records[i]);
                
                // Style de base pour les lignes de données
                row.eachCell((cell, colNumber) => {
                    // Alignement et bordures
                    cell.alignment = { vertical: 'middle' };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
                        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
                        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
                        right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
                    };
                    
                    // Style alterné pour les lignes
                    if (i % 2 === 1) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFF9F9F9' } // Gris très léger
                        };
                    }
                });
            }
            
            // Activer le filtrage et le tri
            worksheet.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: 1, column: headers.length }
            };
            
            // Figer la première ligne (en-têtes)
            worksheet.views = [
                { state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }
            ];
            
            // Ajuster la largeur des colonnes en fonction du contenu
            worksheet.columns.forEach(column => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
                    if (rowNumber > 1) { // Skip header
                        const columnLength = cell.value ? cell.value.toString().length : 0;
                        if (columnLength > maxLength) {
                            maxLength = columnLength;
                        }
                    }
                });
                column.width = Math.min(Math.max(maxLength + 3, 12), 50); // Min 12, Max 50
            });
        }
        
        // Créer une feuille d'informations
        const infoSheet = workbook.addWorksheet('Informations');
        
        infoSheet.columns = [
            { header: 'Propriété', key: 'property', width: 25 },
            { header: 'Valeur', key: 'value', width: 50 }
        ];
        
        // Style des en-têtes de la feuille d'info
        infoSheet.getRow(1).font = { bold: true };
        infoSheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF333333' }
        };
        infoSheet.getRow(1).font = {
            bold: true,
            color: { argb: 'FFFFFFFF' }
        };
        infoSheet.getRow(1).height = 28;
        infoSheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
        
        // Déterminer quelles options sont actives
        const activeOptions = [];
        if (options.includeClientInfo) activeOptions.push('Informations clients détaillées');
        if (options.includeServiceDetails) activeOptions.push('Détails des services');
        if (options.includeNotes) activeOptions.push('Notes');
        if (options.includePayments) activeOptions.push('Informations de paiement');
        
        // Ajouter les métadonnées
        const infoRows = [
            { property: 'Date d\'exportation', value: new Date().toLocaleString('fr-FR') },
            { property: 'ID du salon', value: clusterId },
            { property: 'Types de données', value: dataTypes.map(type => {
                switch(type) {
                    case 'clients': return 'Clients';
                    case 'appointments': return 'Rendez-vous';
                    case 'services': return 'Services';
                    case 'reviews': return 'Avis';
                    case 'staffs': return 'Employés';
                    default: return type;
                }
            }).join(', ') },
            { property: 'Nombre total d\'éléments', value: totalRecords },
            { property: 'Options activées', value: activeOptions.length > 0 ? activeOptions.join(', ') : 'Aucune option spécifique' }
        ];
        
        infoSheet.addRows(infoRows);
        
        // Formater les cellules d'info
        for (let i = 0; i < infoRows.length; i++) {
            const row = i + 2; // +2 car la ligne 1 est l'en-tête
            
            // Style des cellules
            infoSheet.getRow(row).eachCell((cell, colNumber) => {
                cell.alignment = { vertical: 'middle' };
                cell.border = {
                    bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } }
                };
                
                // Style alterné
                if (i % 2 === 1) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF9F9F9' }
                    };
                }
                
                // Premier colonne en gras
                if (colNumber === 1) {
                    cell.font = { bold: true };
                }
            });
        }
        
        // Ajuster automatiquement la largeur
        infoSheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, (cell, rowNumber) => {
                const columnLength = cell.value ? cell.value.toString().length : 0;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = Math.min(Math.max(maxLength + 3, 15), 70);
        });
        
        // Sauvegarder le fichier
        await workbook.xlsx.writeFile(filePath);
        
        console.log(`📊 Fichier Excel créé: ${filePath}`);
        
        return {
            fileName,
            filePath,
            recordCount: totalRecords
        };
    } catch (error) {
        console.error('❌ Erreur lors de la génération de l\'Excel:', error);
        throw new Error(`Erreur lors de la génération de l'Excel: ${error.message}`);
    }
}

/**
 * Génère des données d'exemple pour l'exportation
 */
function generateSampleData(dataType, count) {
    console.log(`📊 Génération de ${count} données d'exemple pour ${dataType}`);
    
    const samples = [];
    const now = new Date();
    
    switch (dataType) {
        case 'appointments':
            for (let i = 0; i < count; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - Math.floor(Math.random() * 30)); // Date dans les 30 derniers jours
                
                samples.push({
                    "Client": `Client Exemple ${i + 1}`,
                    "Service": ['Coupe', 'Coloration', 'Brushing', 'Soin', 'Coiffure'][Math.floor(Math.random() * 5)],
                    "Date": date.toLocaleString('fr-FR'),
                    "Heure de début": `${Math.floor(Math.random() * 8) + 9}:${['00', '15', '30', '45'][Math.floor(Math.random() * 4)]}`,
                    "Heure de fin": `${Math.floor(Math.random() * 8) + 10}:${['00', '15', '30', '45'][Math.floor(Math.random() * 4)]}`,
                    "Statut": ['Confirmé', 'En attente', 'Annulé', 'Terminé'][Math.floor(Math.random() * 4)],
                    "Employé": [`Sarah D.`, `Thomas M.`, `Julie L.`, `Marc B.`, `Lucie F.`][Math.floor(Math.random() * 5)],
                    "Prix": `${Math.floor(Math.random() * 50) + 20} €`,
                    "Durée": `${[30, 45, 60, 90, 120][Math.floor(Math.random() * 5)]} min`,
                    "Paiement": ['Payé', 'En attente', 'Remboursé'][Math.floor(Math.random() * 3)],
                    "Notes": `Notes d'exemple pour le rendez-vous ${i + 1}`
                });
            }
            break;
            
        case 'clients':
            for (let i = 0; i < count; i++) {
                const creationDate = new Date(now);
                creationDate.setMonth(creationDate.getMonth() - Math.floor(Math.random() * 12));
                
                samples.push({
                    "Prénom": ['Marie', 'Jean', 'Sophie', 'Pierre', 'Emma', 'Thomas', 'Julie', 'Nicolas'][Math.floor(Math.random() * 8)],
                    "Nom": ['Dupont', 'Martin', 'Dubois', 'Leroy', 'Petit', 'Moreau', 'Simon', 'Laurent'][Math.floor(Math.random() * 8)],
                    "Email": `client${i + 1}@exemple.com`,
                    "Téléphone": `06${Math.floor(10000000 + Math.random() * 90000000)}`,
                    "Date d'inscription": creationDate.toLocaleString('fr-FR'),
                    "Dernier rendez-vous": Math.random() > 0.3 ? new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleString('fr-FR') : 'Aucun',
                    "Nombre de rendez-vous": Math.floor(Math.random() * 10),
                    "Statut": Math.random() > 0.1 ? 'Actif' : 'Inactif',
                    "Préférences": Math.random() > 0.7 ? 'Préfère les rendez-vous le matin' : '',
                    "Notes": Math.random() > 0.5 ? `Préférences du client ${i + 1}` : ''
                });
            }
            break;
            
        case 'services':
            const services = [
                { nom: 'Coupe Homme', prix: 25, duree: 30 },
                { nom: 'Coupe Femme', prix: 35, duree: 45 },
                { nom: 'Coloration', prix: 60, duree: 90 },
                { nom: 'Brushing', prix: 30, duree: 30 },
                { nom: 'Balayage', prix: 80, duree: 120 },
                { nom: 'Soin capillaire', prix: 40, duree: 45 },
                { nom: 'Coiffure de mariage', prix: 120, duree: 180 },
                { nom: 'Épilation sourcils', prix: 15, duree: 15 },
                { nom: 'Manucure', prix: 35, duree: 45 },
                { nom: 'Pédicure', prix: 40, duree: 60 }
            ];
            
            for (let i = 0; i < Math.min(count, services.length); i++) {
                const creationDate = new Date(now);
                creationDate.setMonth(creationDate.getMonth() - Math.floor(Math.random() * 12));
                
                samples.push({
                    "Nom": services[i].nom,
                    "Description": `Description du service ${services[i].nom}`,
                    "Prix": `${services[i].prix} €`,
                    "Durée (min)": services[i].duree,
                    "Couleur": ['#FF5733', '#33FF57', '#5733FF', '#33A0FF', '#FF33A0'][Math.floor(Math.random() * 5)],
                    "Disponible": Math.random() > 0.1 ? 'Oui' : 'Non',
                    "Date de création": creationDate.toLocaleString('fr-FR')
                });
            }
            break;
            
        case 'reviews':
            for (let i = 0; i < count; i++) {
                const creationDate = new Date(now);
                creationDate.setDate(creationDate.getDate() - Math.floor(Math.random() * 90)); // Dans les 90 derniers jours
                
                const hasResponse = Math.random() > 0.3;
                const responseDate = new Date(creationDate);
                responseDate.setDate(responseDate.getDate() + Math.floor(Math.random() * 5) + 1); // 1-5 jours après
                
                samples.push({
                    "Client": `Client Exemple ${i + 1}`,
                    "Service": ['Coupe', 'Coloration', 'Brushing', 'Soin', 'Coiffure'][Math.floor(Math.random() * 5)],
                    "Note": Math.floor(Math.random() * 3) + 3, // 3-5 étoiles
                    "Commentaire": `Commentaire d'exemple pour le service. ${Math.random() > 0.5 ? 'Très satisfait.' : 'Bonne expérience.'}`,
                    "Date": creationDate.toLocaleString('fr-FR'),
                    "Réponse": hasResponse ? `Merci pour votre retour! Nous sommes heureux que vous ayez apprécié votre visite.` : '',
                    "Date de réponse": hasResponse ? responseDate.toLocaleString('fr-FR') : 'Pas de réponse'
                });
            }
            break;
            
        // Génération d'exemples pour les employés
        case 'staffs':
            // Liste de noms d'employés fictifs
            const staffNames = [
                { prenom: 'Sophie', nom: 'Martin', gender: 'f' },
                { prenom: 'Thomas', nom: 'Bernard', gender: 'm' },
                { prenom: 'Julie', nom: 'Petit', gender: 'f' },
                { prenom: 'Nicolas', nom: 'Durand', gender: 'm' },
                { prenom: 'Camille', nom: 'Leroy', gender: 'f' },
                { prenom: 'Alexandre', nom: 'Moreau', gender: 'm' },
                { prenom: 'Emma', nom: 'Dubois', gender: 'f' },
                { prenom: 'Antoine', nom: 'Richard', gender: 'm' }
            ];
            
            // Options d'horaires de travail
            const workTimes = [
                { debut: '08:00', fin: '16:00', debutPause: '12:00', finPause: '13:00' },
                { debut: '09:00', fin: '17:00', debutPause: '12:30', finPause: '13:30' },
                { debut: '10:00', fin: '18:00', debutPause: '13:00', finPause: '14:00' },
                { debut: '08:30', fin: '16:30', debutPause: '12:00', finPause: '13:00' },
                { debut: '09:30', fin: '17:30', debutPause: '12:30', finPause: '13:30' }
            ];
            
            for (let i = 0; i < count; i++) {
                const staffIndex = i % staffNames.length;
                const staffName = staffNames[staffIndex];
                const timeIndex = i % workTimes.length;
                const workTime = workTimes[timeIndex];
                
                const creationDate = new Date(now);
                creationDate.setMonth(creationDate.getMonth() - Math.floor(Math.random() * 24)); // Créé dans les 2 dernières années
                
                const isManager = i === 0; // Le premier est manager, les autres sont employés
                
                samples.push({
                    "Prénom": staffName.prenom,
                    "Nom": staffName.nom,
                    "Email": `${staffName.prenom.toLowerCase()}.${staffName.nom.toLowerCase()}@example.com`,
                    "Téléphone": `06${Math.floor(10000000 + Math.random() * 90000000)}`,
                    "Rôle": isManager ? 'Manager' : 'Employé',
                    "Disponible": Math.random() > 0.1 ? 'Oui' : 'Non', // 90% sont disponibles
                    "Début de journée": workTime.debut,
                    "Fin de journée": workTime.fin,
                    "Début de pause": workTime.debutPause,
                    "Fin de pause": workTime.finPause,
                    "Date d'inscription": creationDate.toLocaleString('fr-FR')
                });
            }
            break;
            
        default:
            // Structure générique pour les autres types de données
            for (let i = 0; i < count; i++) {
                samples.push({
                    "Nom": `Exemple ${dataType} ${i + 1}`,
                    "Description": `Description de l'exemple ${i + 1} pour ${dataType}`,
                    "Date": new Date(now - Math.random() * 90 * 24 * 60 * 60 * 1000).toLocaleString('fr-FR'),
                    "Valeur": Math.floor(Math.random() * 100)
                });
            }
    }
    
    return samples;
}

/**
 * Récupérer les options d'exportation disponibles
 */
export const getExportOptions = async (req, res) => {
    try {
        // Liste des options d'exportation disponibles
        const availableOptions = {
            // Options pour le contenu
            include_client_info: {
                label: "Inclure les informations clients détaillées",
                description: "Ajoute les détails complets des clients (email, téléphone, etc.)",
                default: true
            },
            include_service_details: {
                label: "Inclure les détails des services",
                description: "Ajoute les détails complets des services (prix, durée, etc.)",
                default: true
            },
            include_notes: {
                label: "Inclure les notes",
                description: "Inclut les champs de notes dans l'export",
                default: false
            },
            include_payments: {
                label: "Inclure les informations de paiement",
                description: "Inclut les informations de paiement dans l'export",
                default: false
            },
            
            // Options spéciales
            generate_sample: {
                label: "Générer des exemples",
                description: "Génère des données d'exemple si aucune donnée n'est trouvée",
                default: false
            }
        };
        
        // Liste des formats d'exportation disponibles
        const availableFormats = [
            { value: "csv", label: "CSV (.csv)", description: "Format texte compatible avec Excel et autres tableurs" },
            { value: "excel", label: "Excel (.xlsx)", description: "Format Excel avec onglets multiples" },
            { value: "json", label: "JSON (.json)", description: "Format structuré pour l'importation dans d'autres systèmes" }
        ];
        
        // Liste des types de données exportables
        const availableDataTypes = [
            { value: "clients", label: "Clients", description: "Liste des clients" },
            { value: "appointments", label: "Rendez-vous", description: "Liste des rendez-vous" },
            { value: "services", label: "Services", description: "Liste des services proposés" },
            { value: "reviews", label: "Avis", description: "Liste des avis clients" },
            { value: "staffs", label: "Employés", description: "Liste des employés" }
        ];
        
        return res.status(200).json({
            success: true,
            options: availableOptions,
            formats: availableFormats,
            dataTypes: availableDataTypes
        });
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des options d\'exportation:', error);
        return res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des options d\'exportation',
            error: error.message
        });
    }
};

/**
 * Fonction utilitaire pour formater les données exportées, les rendre plus présentables 
 * et masquer les détails techniques de la base de données
 */
function formatExportData(data, dataTypes, options = {}) {
  const formattedData = {};
  
  // Pour chaque type de données
  dataTypes.forEach(type => {
    if (!data[type] || data[type].length === 0) {
      formattedData[type] = [];
      return;
    }
    
    // Selon le type de données, appliquer une transformation spécifique
    switch (type) {
      case 'clients':
        formattedData[type] = data[type].map(client => ({
          "Prénom": client.prenom || client.firstName || '',
          "Nom": client.nom || client.lastName || '',
          "Email": client.email || 'Non renseigné',
          "Téléphone": client.telephone || client.phone || 'Non renseigné',
          "Date d'inscription": client.dateCreation || (client.createdAt ? new Date(client.createdAt).toLocaleString('fr-FR') : 'Non défini'),
          "Dernier rendez-vous": client.dernierRdv || 'Aucun',
          "Nombre de rendez-vous": client.nombreRdv || 0,
          "Statut": client.statut || client.status || 'Actif',
          "Préférences": client.preferences || '',
          ...(options.includeNotes ? {"Notes": client.notes || ''} : {})
        }));
        break;
        
      case 'appointments':
        formattedData[type] = data[type].map(appt => ({
          "Client": appt.client && appt.client.startsWith('ID:') ? 'Client' : appt.client || 'Client inconnu',
          "Service": appt.service && appt.service.startsWith('ID:') ? 'Service' : appt.service || 'Service inconnu',
          "Date": appt.date || 'Non défini',
          "Heure de début": appt.heureDebut || '',
          "Heure de fin": appt.heureFin || '',
          "Statut": appt.statut || 'En attente',
          "Employé": appt.employe && appt.employe.startsWith('ID:') ? 'Employé' : appt.employe || 'Non assigné',
          "Prix": typeof appt.prix === 'number' ? `${appt.prix} €` : appt.prix || 'Non défini',
          "Durée": typeof appt.duree === 'number' ? `${appt.duree} min` : appt.duree || 'Non défini',
          ...(options.includePayments ? {"Paiement": appt.paiement || 'Non payé'} : {}),
          ...(options.includeNotes ? {"Notes": appt.notes || ''} : {})
        }));
        break;
        
      case 'services':
        formattedData[type] = data[type].map(service => ({
          "Nom": service.nom || service.name || '',
          "Description": service.description || '',
          "Prix": typeof service.prix === 'number' ? `${service.prix} €` : service.prix || '0 €',
          "Durée (min)": service.duree || service.duration || 0,
          "Couleur": service.couleur || service.color || '#000000',
          "Disponible": service.disponible === 'Oui' || service.available ? 'Oui' : 'Non',
          "Date de création": service.dateCreation || (service.createdAt ? new Date(service.createdAt).toLocaleString('fr-FR') : 'Non défini')
        }));
        break;
        
      case 'reviews':
        formattedData[type] = data[type].map(review => ({
          "Client": review.client || 'Client inconnu',
          "Service": review.service || 'Service inconnu',
          "Note": review.note || review.rating || 0,
          "Commentaire": review.commentaire || review.comment || '',
          "Date": review.dateCreation || (review.createdAt ? new Date(review.createdAt).toLocaleString('fr-FR') : 'Non défini'),
          "Réponse": review.reponse || review.response || '',
          "Date de réponse": review.dateReponse || review.responseDate || 'Pas de réponse'
        }));
        break;
        
      case 'staffs':
        formattedData[type] = data[type].map(staff => ({
          "Prénom": staff.prenom || staff.firstName || '',
          "Nom": staff.nom || staff.lastName || '',
          "Email": staff.email || 'Non renseigné',
          "Téléphone": staff.telephone || staff.phone || 'Non renseigné',
          "Rôle": staff.role === 'manager' ? 'Manager' : 'Employé',
          "Disponible": staff.disponible === 'Oui' || staff.isAvailable ? 'Oui' : 'Non',
          "Début de journée": staff.heureDebutTravail || '',
          "Fin de journée": staff.heureFinTravail || '',
          "Début de pause": staff.debutPause || staff.lunchStart || '',
          "Fin de pause": staff.finPause || staff.lunchEnd || ''
        }));
        break;
      
      default:
        // Pour les autres types, conserver les données telles quelles
        formattedData[type] = data[type];
    }
  });
  
  return formattedData;
}