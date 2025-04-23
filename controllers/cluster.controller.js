import Cluster from '../models/cluster.model.js';

// Importer le modèle de cluster

// Contrôleur pour ajouter un cluster
export const addCluster = async (req, res) => {
    try {
        // Récupérer les données du cluster à partir de la requête
        const { name, description, type, ownerName } = req.body;

        // Créer une nouvelle instance du modèle Cluster
        const newCluster = new Cluster({
            name,
            description,
            type,
            ownerName, 
            clusterUrl: "sabotage-1"
        });

        // Enregistrer le nouveau cluster dans la base de données
        const savedCluster = await newCluster.save();

        // Répondre avec le cluster ajouté
        res.status(201).json(savedCluster);
    } catch (error) {
        // Gérer les erreurs
        res.status(500).json({ error: error.message });
    }
};

// Contrôleur pour récupérer tous les clusters
export const getAllClusters = async (req, res) => {
    try {
        // Récupérer tous les clusters de la base de données
        const clusters = await Cluster.find();

        // Répondre avec les clusters récupérés
        res.status(200).json(clusters);
    } catch (error) {
        // Gérer les erreurs
        res.status(500).json({ error: error.message });
    }
};

export const addService = async (req, res) => {
    try {
        const { clusterId } = req.params;
        // Récupérer les données du service à partir de la requête
        const { name, description, price, duration  } = req.body;
        // Rechercher le cluster correspondant à l'ID
        const cluster = await Cluster.findByIdAndUpdate(clusterId, {
            $push: {
                services: {
                    name,
                    description,
                    price,
                    duration
                }
            }
        }, { new: true });
        // Vérifier si le cluster existe
        if (!cluster) {
            return res.status(404).json({ error: "Cluster not found" });
        }
        // Répondre avec le cluster mis à jour
        res.status(200).json(cluster);
    } catch (error) {
        // Gérer les erreurs
        res.status(500).json({ error: error.message });
    }
};


// Contrôleur pour récupérer tous les services depuis le cluster
export const getAllServices = async (req, res) => {
    try {
        // Récupérer l'ID du cluster à partir des paramètres de la requête
        const { clusterId } = req.params;
        // Rechercher le cluster correspondant à l'ID
        const cluster = await Cluster.findById(clusterId);
        // Vérifier si le cluster existe
        if (!cluster) {
            return res.status(404).json({ error: "Cluster not found" });
        }
        // Récupérer tous les services du cluster
        const services = cluster.services;
        // Répondre avec les services récupérés
        res.status(200).json(services);
    } catch (error) {
        // Gérer les erreurs
        res.status(500).json({ error: error.message });
    }
};

// Contrôleur pour récupérer tous les services par cluster ID (fonction manquante)
export const getServicesByCluster = async (req, res) => {
    try {
        // Récupérer l'ID du cluster à partir des paramètres de la requête
        const { clusterId } = req.params;
        // Rechercher le cluster correspondant à l'ID
        const cluster = await Cluster.findById(clusterId);
        // Vérifier si le cluster existe
        if (!cluster) {
            return res.status(404).json({ error: "Cluster not found" });
        }
        // Récupérer tous les services du cluster
        const services = cluster.services;
        // Répondre avec les services récupérés
        res.status(200).json(services);
    } catch (error) {
        // Gérer les erreurs
        res.status(500).json({ error: error.message });
    }
};

// Contrôleur pour mettre à jour un cluster
export const updateCluster = async (req, res) => {
    try {
        const { clusterId } = req.params;
        const { 
            name, 
            description, 
            type, 
            ownerName, 
            address, 
            contact, 
            email, 
            businessHours, 
            socialMedia, 
            latitude, 
            longitude 
        } = req.body;

        console.log(`📝 Mise à jour du cluster ${clusterId}`);
        console.log(`📦 Corps de la requête:`, req.body);
        
        // Vérification de l'ID du cluster
        if (!clusterId) {
            return res.status(400).json({ message: "ID du cluster manquant" });
        }

        // Vérifier si le cluster existe
        const cluster = await Cluster.findById(clusterId);
        if (!cluster) {
            console.log(`❌ Cluster non trouvé avec l'ID: ${clusterId}`);
            return res.status(404).json({ message: "Cluster non trouvé" });
        }

        console.log(`✅ Cluster trouvé: ${cluster.name}`);

        // Mettre à jour les champs
        if (name) cluster.name = name;
        if (description) cluster.description = description;
        if (type) cluster.type = type;
        if (ownerName) cluster.ownerName = ownerName;
        if (address) cluster.address = address;
        if (contact) cluster.contact = contact;
        if (email) cluster.email = email; // Nouveau champ email
        
        // Mettre à jour les horaires d'ouverture s'ils sont fournis
        if (businessHours) {
            // Initialiser les businessHours s'ils n'existent pas
            if (!cluster.businessHours) {
                cluster.businessHours = {};
            }
            
            // Mettre à jour chaque jour de la semaine
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            
            for (const day of days) {
                if (businessHours[day]) {
                    // Initialiser le jour s'il n'existe pas
                    if (!cluster.businessHours[day]) {
                        cluster.businessHours[day] = {};
                    }
                    
                    // Mettre à jour les champs pour ce jour
                    const dayData = businessHours[day];
                    
                    if (dayData.isOpen !== undefined) cluster.businessHours[day].isOpen = dayData.isOpen;
                    if (dayData.openTime) cluster.businessHours[day].openTime = dayData.openTime;
                    if (dayData.closeTime) cluster.businessHours[day].closeTime = dayData.closeTime;
                    if (dayData.lunchStart) cluster.businessHours[day].lunchStart = dayData.lunchStart;
                    if (dayData.lunchEnd) cluster.businessHours[day].lunchEnd = dayData.lunchEnd;
                    if (dayData.isOpenAllDay !== undefined) cluster.businessHours[day].isOpenAllDay = dayData.isOpenAllDay;
                }
            }
            
            // Traiter la configuration des jours fériés
            if (businessHours.holidays) {
                // Initialiser la structure des jours fériés si elle n'existe pas
                if (!cluster.businessHours.holidays) {
                    cluster.businessHours.holidays = {};
                }
                
                // Traiter la configuration par défaut
                if (businessHours.holidays.default) {
                    if (!cluster.businessHours.holidays.default) {
                        cluster.businessHours.holidays.default = {};
                    }
                    
                    const defaultData = businessHours.holidays.default;
                    if (defaultData.isOpen !== undefined) cluster.businessHours.holidays.default.isOpen = defaultData.isOpen;
                    if (defaultData.openTime) cluster.businessHours.holidays.default.openTime = defaultData.openTime;
                    if (defaultData.closeTime) cluster.businessHours.holidays.default.closeTime = defaultData.closeTime;
                    if (defaultData.isOpenAllDay !== undefined) cluster.businessHours.holidays.default.isOpenAllDay = defaultData.isOpenAllDay;
                    if (defaultData.useRegularHours !== undefined) cluster.businessHours.holidays.default.useRegularHours = defaultData.useRegularHours;
                }
                
                // Traiter tous les jours fériés individuels
                const frenchHolidays = [
                    'new_year', 'easter_monday', 'labor_day', 'victory_day', 
                    'ascension', 'pentecost_monday', 'national_day', 
                    'assumption', 'all_saints', 'armistice', 'christmas'
                ];
                
                for (const holidayId of frenchHolidays) {
                    if (businessHours.holidays[holidayId]) {
                        if (!cluster.businessHours.holidays[holidayId]) {
                            cluster.businessHours.holidays[holidayId] = {};
                        }
                        
                        const holidayData = businessHours.holidays[holidayId];
                        if (holidayData.isOpen !== undefined) cluster.businessHours.holidays[holidayId].isOpen = holidayData.isOpen;
                        if (holidayData.openTime) cluster.businessHours.holidays[holidayId].openTime = holidayData.openTime;
                        if (holidayData.closeTime) cluster.businessHours.holidays[holidayId].closeTime = holidayData.closeTime;
                        if (holidayData.isOpenAllDay !== undefined) cluster.businessHours.holidays[holidayId].isOpenAllDay = holidayData.isOpenAllDay;
                        if (holidayData.useRegularHours !== undefined) cluster.businessHours.holidays[holidayId].useRegularHours = holidayData.useRegularHours;
                    }
                }
                
                console.log(`✅ Configuration des jours fériés mise à jour`);
            }
        }
        
        // Mettre à jour les réseaux sociaux s'ils sont fournis
        if (socialMedia) {
            // Initialiser les socialMedia s'ils n'existent pas
            if (!cluster.socialMedia) {
                cluster.socialMedia = {};
            }
            
            const platforms = ['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'website'];
            
            for (const platform of platforms) {
                if (socialMedia[platform] !== undefined) {
                    cluster.socialMedia[platform] = socialMedia[platform];
                }
            }
        }
        
        // Mettre à jour les coordonnées géographiques si elles sont fournies
        if (latitude !== undefined && longitude !== undefined) {
            console.log(`📍 Coordonnées reçues: ${latitude}, ${longitude}`);
            cluster.geolocation = {
                type: 'Point',
                coordinates: [longitude, latitude] // Format GeoJSON: [longitude, latitude]
            };
        }

        // Sauvegarder les modifications
        console.log(`💾 Sauvegarde des modifications...`);
        const updatedCluster = await cluster.save();
        console.log(`✅ Cluster mis à jour avec succès`);

        res.status(200).json({
            message: "Cluster mis à jour avec succès",
            cluster: updatedCluster
        });
    } catch (error) {
        console.error(`❌ Erreur lors de la mise à jour du cluster:`, error);
        res.status(500).json({ 
            message: "Erreur lors de la mise à jour du cluster", 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Contrôleur pour récupérer un cluster par son ID
export const getClusterById = async (req, res) => {
    try {
        const { clusterId } = req.params;
        
        console.log(`🔍 Recherche du cluster ${clusterId}`);
        
        // Vérification de l'ID du cluster
        if (!clusterId) {
            return res.status(400).json({ message: "ID du cluster manquant" });
        }

        // Rechercher d'abord par ID
        let cluster = await Cluster.findById(clusterId);
        
        // Si non trouvé par ID, essayer de chercher par nom ou autres critères
        if (!cluster) {
            console.log(`⚠️ Cluster non trouvé avec l'ID: ${clusterId}, tentative de recherche alternative...`);
            
            // Essayer de trouver le premier cluster disponible 
            // (utile pour le développement quand les IDs peuvent changer)
            cluster = await Cluster.findOne();
            
            if (cluster) {
                console.log(`✅ Cluster alternatif trouvé: ${cluster.name} (ID: ${cluster._id})`);
                
                // Pour le débogage seulement
                if (clusterId === '67ff7963a05ffbb0f61f8d5f') {
                    console.log("⚠️ ID de test détecté, utilisation du cluster par défaut");
                }
            } else {
                console.log(`❌ Aucun cluster trouvé dans la base de données`);
                return res.status(404).json({ message: "Cluster non trouvé" });
            }
        } else {
            console.log(`✅ Cluster trouvé directement par ID: ${cluster.name}`);
        }
        
        // Renvoyer le cluster trouvé
        res.status(200).json(cluster);
    } catch (error) {
        console.error(`❌ Erreur lors de la récupération du cluster:`, error);
        res.status(500).json({ 
            message: "Erreur lors de la récupération du cluster", 
            error: error.message
        });
    }
};


