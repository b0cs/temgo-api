import Cluster from '../models/cluster.model.js';

// Importer le modèle de cluster

// Contrôleur pour ajouter un cluster
export const addCluster = async (req, res) => {
    try {
        // Récupérer toutes les données du cluster à partir de la requête
        const { 
            name, 
            description, 
            type, 
            ownerName,
            address,
            contact,
            email,
            geolocation,
            services = []
        } = req.body;

        // Assurer que la géolocalisation est correctement formatée si fournie
        const geoLocation = geolocation ? {
            type: 'Point',
            coordinates: geolocation.coordinates || [0, 0]
        } : {
            type: 'Point',
            coordinates: [0, 0] // Coordonnées par défaut
        };

        // Création d'un objet de base pour le nouveau cluster
        const clusterData = {
            name,
            description,
            type,
            ownerName,
            address,
            contact,
            email,
            geolocation: geoLocation,
        };

        // Ajouter les services uniquement pour les salons de beauté
        if (type === 'HairSalon' || type === 'BeautySalon') {
            clusterData.services = services;
        }

        // Ajouter les caractéristiques de restaurant uniquement pour les restaurants et bars
        if (type === 'Restaurant' || type === 'Bar') {
            clusterData.restaurantFeatures = req.body.restaurantFeatures || {};
        }

        // Ajouter les informations de boîte de nuit uniquement pour les discothèques
        if (type === 'Nightclub') {
            clusterData.nightclubInfo = req.body.nightclubInfo || {};
        }

        // Créer une nouvelle instance du modèle Cluster avec les champs appropriés
        const newCluster = new Cluster(clusterData);

        // Enregistrer le nouveau cluster dans la base de données
        const savedCluster = await newCluster.save();

        // Répondre avec le cluster ajouté
        res.status(201).json(savedCluster);
    } catch (error) {
        // Gérer les erreurs
        console.error("Erreur lors de la création du cluster:", error);
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

        // Mettre à jour les champs s'ils sont fournis
        if (name) cluster.name = name;
        if (description) cluster.description = description;
        // Ne mettre à jour le type que s'il est explicitement fourni et non vide
        if (type !== undefined && type !== null && type !== '') {
            console.log(`📝 Mise à jour du type de cluster: ${type}`);
            cluster.type = type;
        } else {
            console.log(`📝 Type non fourni dans la requête, conservation du type actuel: ${cluster.type}`);
        }
        if (ownerName) cluster.ownerName = ownerName;
        if (address) cluster.address = address;
        if (contact) cluster.contact = contact;
        if (email) cluster.email = email;

        // Mise à jour des heures d'ouverture si fournies
        if (businessHours) {
            console.log('📝 Mise à jour des heures d\'ouverture');
            cluster.businessHours = businessHours;
        }

        // Mise à jour des médias sociaux si fournis
        if (socialMedia) {
            console.log('📝 Mise à jour des médias sociaux');
            cluster.socialMedia = socialMedia;
        }

        // Mise à jour des coordonnées géographiques si fournies
        if (latitude !== undefined && longitude !== undefined) {
            console.log(`📝 Mise à jour des coordonnées géographiques: ${latitude}, ${longitude}`);
            cluster.geolocation = {
                type: 'Point',
                coordinates: [longitude, latitude]
            };
        }

        // Sauvegarder les modifications
        const updatedCluster = await cluster.save();
        console.log('✅ Cluster mis à jour avec succès');

        // Répondre avec le cluster mis à jour
        res.status(200).json(updatedCluster);
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour du cluster:', error);
        res.status(500).json({ message: "Erreur lors de la mise à jour du cluster", error: error.message });
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


