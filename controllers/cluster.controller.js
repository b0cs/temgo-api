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


