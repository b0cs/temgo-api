import ClientClusterRelation from '../models/ClientClusterRelation.js';
import Member from '../models/member.model.js';
import Appointment from '../models/appointment.model.js';
import mongoose from 'mongoose';

// Récupérer toutes les relations pour un cluster spécifique
const getRelationsByCluster = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    // Validation de l'ID du cluster
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'ID de cluster invalide' });
    }
    
    // Récupérer toutes les relations pour ce cluster
    const relations = await ClientClusterRelation.find({ clusterId: clusterId })
      .populate('clientId', 'firstName lastName email phone')
      .populate('clusterId', 'name location');
    
    // Enrichir les données avec les rendez-vous récents
    const enrichedRelations = await Promise.all(relations.map(async (relation) => {
      // Récupérer le dernier rendez-vous pour ce client dans ce cluster
      const recentAppointment = await Appointment.findOne({
        clientId: relation.clientId._id,
        clusterId: relation.clusterId._id
      })
      .sort({ date: -1 })
      .limit(1);
      
      // Convertir en objet JavaScript simple
      const relationObject = relation.toObject();
      
      return {
        ...relationObject,
        recentAppointment: recentAppointment || null
      };
    }));
    
    return res.status(200).json(enrichedRelations);
  } catch (error) {
    console.error('Erreur lors de la récupération des relations:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des relations' });
  }
};

// Récupérer une relation spécifique par clientId et clusterId
const getRelation = async (req, res) => {
  try {
    const { clientId, clusterId } = req.params;
    
    // Validation des IDs
    if (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'IDs invalides' });
    }
    
    // Rechercher la relation
    const relation = await ClientClusterRelation.findOne({ 
      clientId: clientId,
      clusterId: clusterId
    })
    .populate('clientId', 'firstName lastName email phone')
    .populate('clusterId', 'name location');
    
    if (!relation) {
      return res.status(404).json({ message: 'Relation non trouvée' });
    }
    
    // Enrichir avec le dernier rendez-vous
    const recentAppointment = await Appointment.findOne({
      clientId: relation.clientId._id,
      clusterId: relation.clusterId._id
    })
    .sort({ date: -1 })
    .limit(1);
    
    const result = {
      ...relation.toObject(),
      recentAppointment: recentAppointment || null
    };
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération de la relation:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération de la relation' });
  }
};

// Créer une nouvelle relation
const createRelation = async (req, res) => {
  try {
    const { clientId, clusterId, preferences } = req.body;
    
    // Validation des données requises
    if (!clientId || !clusterId) {
      return res.status(400).json({ message: 'Les IDs du client et du cluster sont requis' });
    }
    
    // Validation des IDs
    if (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'IDs invalides' });
    }
    
    // Vérifier que le client existe
    const clientExists = await Member.findById(clientId);
    if (!clientExists) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }
    
    // Vérifier que la relation n'existe pas déjà
    const existingRelation = await ClientClusterRelation.findOne({ 
      clientId: clientId, 
      clusterId: clusterId 
    });
    
    if (existingRelation) {
      return res.status(409).json({ message: 'La relation existe déjà' });
    }
    
    // Créer la nouvelle relation
    const newRelation = new ClientClusterRelation({
      clientId,
      clusterId,
      preferences: preferences || {},
      isActive: true
    });
    
    // Sauvegarder la relation
    await newRelation.save();
    
    // Récupérer la relation complète avec les références peuplées
    const savedRelation = await ClientClusterRelation.findById(newRelation._id)
      .populate('clientId', 'firstName lastName email phone')
      .populate('clusterId', 'name location');
    
    return res.status(201).json(savedRelation);
  } catch (error) {
    console.error('Erreur lors de la création de la relation:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la création de la relation' });
  }
};

// Mettre à jour une relation
export const updateRelation = async (req, res) => {
  try {
    const { clientId, clusterId } = req.params;
    const updates = req.body;
    
    // Vérifier la validité des IDs
    if (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'IDs invalides' });
    }
    
    // Vérifier les champs autorisés à la mise à jour
    const allowedUpdates = ['preferences', 'favoriteServices'];
    const updateKeys = Object.keys(updates);
    const isValidUpdate = updateKeys.every(key => allowedUpdates.includes(key));
    
    if (!isValidUpdate) {
      return res.status(400).json({ message: 'Champs de mise à jour non autorisés' });
    }
    
    // Rechercher et mettre à jour la relation
    const relation = await ClientClusterRelation.findOneAndUpdate(
      { clientId: clientId, clusterId: clusterId },
      updates,
      { new: true, runValidators: true }
    );
    
    if (!relation) {
      return res.status(404).json({ message: 'Relation non trouvée' });
    }
    
    return res.status(200).json(relation);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la relation:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer une relation
export const deleteRelation = async (req, res) => {
  try {
    const { clientId, clusterId } = req.params;
    
    // Vérifier la validité des IDs
    if (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'IDs invalides' });
    }
    
    // Vérifier si le client a des rendez-vous à venir dans ce cluster
    const futureAppointments = await Appointment.find({
      member: clientId,
      cluster: clusterId,
      startTime: { $gt: new Date() },
      status: { $nin: ['cancelled', 'no_show'] }
    });
    
    if (futureAppointments.length > 0) {
      return res.status(400).json({
        message: 'Impossible de retirer ce client car il a des rendez-vous à venir',
        appointments: futureAppointments.map(app => ({
          id: app._id,
          date: app.startTime,
          service: app.service?.name || 'Service non spécifié'
        }))
      });
    }
    
    // Supprimer la relation
    const result = await ClientClusterRelation.findOneAndDelete({
      clientId: clientId,
      clusterId: clusterId
    });
    
    if (!result) {
      return res.status(404).json({ message: 'Relation non trouvée' });
    }
    
    return res.status(200).json({ message: 'Relation supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la relation:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Recherche globale de clients
export const searchGlobalClients = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Veuillez fournir un terme de recherche d\'au moins 2 caractères' });
    }
    
    // Créer une expression régulière pour la recherche insensible à la casse
    const searchRegex = new RegExp(q, 'i');
    
    // Rechercher les clients qui correspondent au terme de recherche
    const clients = await Member.find({
      $and: [
        // Doit être un client (pas un employé)
        { role: 'client' },
        // Ne doit pas être supprimé
        { status: { $ne: 'deleted' } },
        // Doit correspondre à au moins l'un des critères de recherche
        {
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
            { phone: searchRegex }
          ]
        }
      ]
    }).select('_id firstName lastName email phone status').limit(50);
    
    return res.status(200).json(clients);
  } catch (error) {
    console.error('Erreur lors de la recherche de clients:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Mettre à jour les statistiques d'une relation après un rendez-vous
export const updateRelationStats = async (clientId, clusterId, visitDate, amount) => {
  try {
    const relation = await ClientClusterRelation.findOne({ clientId: clientId, clusterId: clusterId });
    
    if (!relation) {
      console.error('Relation non trouvée pour la mise à jour des statistiques');
      return false;
    }
    
    // Mettre à jour les statistiques
    relation.visitsCount += 1;
    relation.totalSpent += amount || 0;
    
    if (!relation.lastVisit || new Date(visitDate) > new Date(relation.lastVisit)) {
      relation.lastVisit = visitDate;
    }
    
    await relation.save();
    return true;
  } catch (error) {
    console.error('Erreur lors de la mise à jour des statistiques de relation:', error);
    return false;
  }
};

export default {
  getRelationsByCluster,
  getRelation,
  createRelation,
  updateRelation,
  deleteRelation,
  searchGlobalClients,
  updateRelationStats
}; 