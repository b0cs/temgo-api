import Service from '../models/service.model.js';

// Importer le modèle de service


// Ajouter un service
export const addService = async (req, res) => {
    try {
        // Récupérer les données du service à partir de la requête
        const { name, description, price, duration, cluster} = req.body;


        // Appliquer la sécurité des inputs avec du trim
        const trimmedName = name.trim();
        const trimmedDescription = description.trim();
        const floatPrice = parseFloat(price);
        const intDuration = parseInt(duration);

        // Créer une nouvelle instance du modèle de service
        const newService = new Service({

            name: trimmedName,
            description: trimmedDescription,
            price: floatPrice,
            duration: intDuration,
            cluster

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
        // Récupérer tous les services de la base de données
        const services = await Service.find(clusterId);


        // Répondre avec les services récupérés
        res.status(200).json(services);
    } catch (error) {
        // Gérer les erreurs
        res.status(500).json({ error: error.message });
    }
};

