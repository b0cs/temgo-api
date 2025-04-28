import Member from '../models/member.model.js';
import ClientClusterRelation from '../models/ClientClusterRelation.js';
import mongoose from 'mongoose';

// Récupérer tous les clients d'un établissement
export const getClientsByCluster = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'ID d\'établissement invalide' });
    }

    // Trouver toutes les relations pour cet établissement
    const relations = await ClientClusterRelation.find({ 
      clusterId, 
      isActive: true 
    }).populate('clientId', 'firstName lastName email phone');

    return res.status(200).json(relations);
  } catch (error) {
    console.error('Erreur lors de la récupération des clients:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer une relation client-établissement spécifique
export const getClientClusterRelation = async (req, res) => {
  try {
    const { relationId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(relationId)) {
      return res.status(400).json({ message: 'ID de relation invalide' });
    }

    const relation = await ClientClusterRelation.findById(relationId)
      .populate('clientId', 'firstName lastName email phone')
      .populate('clusterId', 'name address');

    if (!relation) {
      return res.status(404).json({ message: 'Relation non trouvée' });
    }

    return res.status(200).json(relation);
  } catch (error) {
    console.error('Erreur lors de la récupération de la relation:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Rechercher des clients globaux avec une sécurité renforcée
export const searchGlobalClients = async (req, res) => {
  try {
    const { query, clusterId } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Terme de recherche requis' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'ID d\'établissement invalide' });
    }

    // Recherche avec une expression régulière insensible à la casse
    const searchRegex = new RegExp(query, 'i');
    
    // Rechercher les clients qui correspondent à la requête
    const clients = await Member.find({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ],
      role: 'client',
      status: { $ne: 'deleted' }
    }).lean();
    
    // Récupérer les IDs des clients déjà associés à cet établissement
    const existingRelations = await ClientClusterRelation.find({ 
      clusterId, 
      clientId: { $in: clients.map(client => client._id) }
    });
    
    const existingClientIds = existingRelations.map(relation => 
      relation.clientId.toString()
    );
    
    // Filtrer et transformer les données pour la sécurité
    const secureClients = clients.map(client => {
      const isInCluster = existingClientIds.includes(client._id.toString());
      
      // Déterminer combien d'informations partager selon que le client est déjà dans l'établissement ou non
      if (isInCluster) {
        // Client déjà dans l'établissement - montrer toutes les informations
        return {
          _id: client._id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          alreadyInCluster: true
        };
      } else {
        // Client d'un autre établissement - informations limitées et masquées partiellement
        // Anonymiser partiellement l'email et le téléphone
        const maskedEmail = client.email ? 
          client.email.replace(/^(.{2})(.*)(@.*)$/, '$1*****$3') : '';
        
        const maskedPhone = client.phone ? 
          client.phone.replace(/^(.{2})(.*)(.{2})$/, '$1*****$3') : '';
        
        return {
          _id: client._id,
          firstName: client.firstName,
          lastName: client.lastName, 
          email: maskedEmail,
          phone: maskedPhone,
          alreadyInCluster: false,
          needsConfirmation: true // Indiquer qu'une confirmation est nécessaire
        };
      }
    });

    return res.status(200).json(secureClients);
  } catch (error) {
    console.error('Erreur lors de la recherche des clients:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Ajouter un client existant à un établissement
export const addExistingClientToCluster = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { clusterId, confirmed } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'IDs invalides' });
    }

    // Vérifier que le client existe
    const clientExists = await Member.findOne({ _id: clientId, role: 'client' });
    if (!clientExists) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }

    // Vérifier si la relation existe déjà
    const existingRelation = await ClientClusterRelation.findOne({ 
      clientId, 
      clusterId 
    });
    
    if (existingRelation) {
      // Si la relation existe mais n'est pas active, la réactiver
      if (!existingRelation.isActive) {
        existingRelation.isActive = true;
        await existingRelation.save();
        return res.status(200).json({
          message: 'Client réactivé dans cet établissement',
          relation: existingRelation
        });
      }
      return res.status(409).json({ message: 'Ce client est déjà associé à cet établissement' });
    }

    // Vérifier si le client appartient à d'autres établissements
    const otherRelations = await ClientClusterRelation.countDocuments({
      clientId,
      clusterId: { $ne: clusterId }
    });

    // Si le client existe dans d'autres établissements et que la confirmation n'a pas été fournie
    if (otherRelations > 0 && !confirmed) {
      // Retourner les informations sur le client pour demander une confirmation
      return res.status(428).json({
        message: 'Confirmation requise: ce client existe dans d\'autres établissements',
        client: {
          _id: clientExists._id,
          firstName: clientExists.firstName,
          lastName: clientExists.lastName,
          email: clientExists.email,
          phone: clientExists.phone
        },
        requiresConfirmation: true
      });
    }

    // Créer une nouvelle relation
    const newRelation = new ClientClusterRelation({
      clientId,
      clusterId,
      isActive: true,
      preferences: {
        preferredStylists: [],
        preferredTreatments: [],
        notes: ''
      }
    });

    await newRelation.save();
    
    return res.status(201).json({
      message: 'Client ajouté à l\'établissement',
      relation: newRelation
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du client à l\'établissement:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour les préférences d'un client dans un établissement
export const updateClientPreferences = async (req, res) => {
  try {
    const { relationId } = req.params;
    const { preferredStylists, preferredTreatments, notes } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(relationId)) {
      return res.status(400).json({ message: 'ID de relation invalide' });
    }

    const relation = await ClientClusterRelation.findById(relationId);
    if (!relation) {
      return res.status(404).json({ message: 'Relation non trouvée' });
    }

    // Mettre à jour les préférences
    relation.preferences = {
      preferredStylists: preferredStylists || relation.preferences.preferredStylists,
      preferredTreatments: preferredTreatments || relation.preferences.preferredTreatments,
      notes: notes !== undefined ? notes : relation.preferences.notes
    };

    await relation.save();
    
    return res.status(200).json(relation);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un client d'un établissement (désactivation)
export const removeClientFromCluster = async (req, res) => {
  try {
    const { relationId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(relationId)) {
      return res.status(400).json({ message: 'ID de relation invalide' });
    }

    const relation = await ClientClusterRelation.findById(relationId);
    if (!relation) {
      return res.status(404).json({ message: 'Relation non trouvée' });
    }

    // Désactiver la relation au lieu de la supprimer
    relation.isActive = false;
    await relation.save();
    
    return res.status(200).json({ message: 'Client retiré de l\'établissement avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du client:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
}; 