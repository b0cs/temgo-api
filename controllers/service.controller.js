import Service from '../models/service.model.js';
import Cluster from '../models/cluster.model.js';
import mongoose from 'mongoose';

// Importer le modèle de service


// Ajouter un service
export const addService = async (req, res) => {
    try {
        // Récupérer les données du service à partir de la requête
        const { name, description, price, duration, cluster, color } = req.body;


        // Appliquer la sécurité des inputs avec du trim
        const trimmedName = name.trim();
        const trimmedDescription = description ? description.trim() : '';
        const floatPrice = parseFloat(price);
        const intDuration = parseInt(duration);
        const serviceColor = color || '#9E9E9E'; // Couleur par défaut si non spécifiée

        // Créer une nouvelle instance du modèle de service
        const newService = new Service({
            name: trimmedName,
            description: trimmedDescription,
            price: floatPrice,
            duration: intDuration,
            cluster,
            color: serviceColor
        });

        // Enregistrer le nouveau service dans la base de données
        const savedService = await newService.save();

        // Répondre avec le service ajouté
        res.status(201).json(savedService);
    } catch (error) {
        // Gérer les erreurs
        res.status(500).json({ error: error.message });
    }
};


// Récupérer tous les services
export const getServices = async (req, res) => {
    const { clusterId } = req.params;
    try {
        // Récupérer tous les services de la base de données pour le cluster spécifié
        const services = await Service.find({ cluster: clusterId });

        // Répondre avec les services récupérés
        res.status(200).json(services);
    } catch (error) {
        // Gérer les erreurs
        res.status(500).json({ error: error.message });
    }
};

/**
 * Récupère tous les services disponibles pour un cluster donné
 * @param {Object} req Requête HTTP avec clusterId
 * @param {Object} res Réponse HTTP
 */
export const getServicesByCluster = async (req, res) => {
    const { clusterId } = req.params;
    
    if (!clusterId) {
        return res.status(400).json({ message: 'L\'ID du cluster est requis' });
    }
    
    try {
        // Vérifier si le cluster existe
        const cluster = await Cluster.findById(clusterId);
        if (!cluster) {
            return res.status(404).json({ message: 'Cluster non trouvé' });
        }
        
        // Récupérer tous les services du cluster
        const services = await Service.find({ cluster: clusterId });
        
        res.status(200).json(services);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des services: ' + error.message });
    }
};

/**
 * Met à jour un service existant
 * @param {Object} req Requête HTTP avec l'ID du service et les données à mettre à jour
 * @param {Object} res Réponse HTTP
 */
export const updateService = async (req, res) => {
    const { serviceId } = req.params;
    const { name, description, price, duration, available, color } = req.body;
    
    try {
        const updatedService = await Service.findByIdAndUpdate(
            serviceId, 
            { 
                name, 
                description, 
                price, 
                duration, 
                available,
                color 
            },
            { new: true }
        );
        
        if (!updatedService) {
            return res.status(404).json({ message: 'Service non trouvé' });
        }
        
        res.status(200).json(updatedService);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la mise à jour du service: ' + error.message });
    }
};

/**
 * Supprime un service existant
 * @param {Object} req Requête HTTP avec l'ID du service
 * @param {Object} res Réponse HTTP
 */
export const deleteService = async (req, res) => {
    const { serviceId } = req.params;
    
    try {
        const deletedService = await Service.findByIdAndDelete(serviceId);
        
        if (!deletedService) {
            return res.status(404).json({ message: 'Service introuvable' });
        }
        
        res.status(200).json({ message: 'Service supprimé avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression du service: ' + error.message });
    }
};

