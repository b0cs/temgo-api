import NightclubEvent from '../models/nightclub-event.model.js';
import Cluster from '../models/cluster.model.js';
import mongoose from 'mongoose';

/**
 * Crée un nouvel événement pour une boîte de nuit
 */
export const createNightclubEvent = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boîte de nuit invalide'
      });
    }
    
    // Vérifier que le cluster existe et est une boîte de nuit
    const cluster = await Cluster.findById(clusterId);
    
    if (!cluster) {
      return res.status(404).json({
        success: false,
        message: 'Boîte de nuit non trouvée'
      });
    }
    
    if (cluster.type !== 'Nightclub') {
      return res.status(400).json({
        success: false,
        message: 'Ce cluster n\'est pas une boîte de nuit'
      });
    }
    
    // Créer l'événement
    const eventData = {
      ...req.body,
      cluster: clusterId
    };
    
    const newEvent = new NightclubEvent(eventData);
    await newEvent.save();
    
    res.status(201).json({
      success: true,
      message: 'Événement créé avec succès',
      event: newEvent
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Récupère tous les événements d'une boîte de nuit
 */
export const getNightclubEvents = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { 
      status, 
      upcoming = 'true', 
      limit = 50, 
      skip = 0, 
      sort = '-date', // Par défaut tri par date descendante
      search 
    } = req.query;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boîte de nuit invalide'
      });
    }
    
    // Créer le filtre de base
    const filter = { cluster: clusterId };
    
    // Ajouter le filtre de statut si fourni
    if (status) {
      filter.status = status;
    }
    
    // Filtrer les événements à venir ou passés
    if (upcoming === 'true') {
      filter.date = { $gte: new Date() };
    } else if (upcoming === 'false') {
      filter.date = { $lt: new Date() };
    }
    
    // Ajouter la recherche textuelle si fournie
    if (search) {
      filter.$text = { $search: search };
    }
    
    // Compter le nombre total d'événements
    const total = await NightclubEvent.countDocuments(filter);
    
    // Récupérer les événements avec pagination et tri
    const events = await NightclubEvent.find(filter)
      .sort(sort)
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      total,
      count: events.length,
      events
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Récupère un événement spécifique par son ID
 */
export const getNightclubEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'événement invalide'
      });
    }
    
    const event = await NightclubEvent.findById(eventId);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      event
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Met à jour un événement existant
 */
export const updateNightclubEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'événement invalide'
      });
    }
    
    // Vérifier que l'événement existe
    const existingEvent = await NightclubEvent.findById(eventId);
    
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }
    
    // Mettre à jour l'événement
    const updatedEvent = await NightclubEvent.findByIdAndUpdate(
      eventId,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Événement mis à jour avec succès',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Supprimer un événement
 */
export const deleteNightclubEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'événement invalide'
      });
    }
    
    // Vérifier que l'événement existe
    const existingEvent = await NightclubEvent.findById(eventId);
    
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }
    
    // Supprimer l'événement
    await NightclubEvent.findByIdAndDelete(eventId);
    
    res.status(200).json({
      success: true,
      message: 'Événement supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Changer le statut d'un événement (publier, annuler, etc.)
 */
export const updateNightclubEventStatus = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'événement invalide'
      });
    }
    
    // Valider le statut
    const validStatuses = ['draft', 'published', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide. Les valeurs autorisées sont: ' + validStatuses.join(', ')
      });
    }
    
    // Mettre à jour le statut
    const updatedEvent = await NightclubEvent.findByIdAndUpdate(
      eventId,
      { $set: { status } },
      { new: true }
    );
    
    if (!updatedEvent) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Statut de l'événement mis à jour: ${status}`,
      event: updatedEvent
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Mettre à jour les statistiques d'un événement
 */
export const updateNightclubEventStats = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { totalAttendees, standardEntries, vipEntries, revenue, peakTime, peakAttendance } = req.body;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'événement invalide'
      });
    }
    
    // Créer l'objet de mise à jour
    const statsUpdate = {};
    
    if (totalAttendees !== undefined) statsUpdate['stats.totalAttendees'] = totalAttendees;
    if (standardEntries !== undefined) statsUpdate['stats.standardEntries'] = standardEntries;
    if (vipEntries !== undefined) statsUpdate['stats.vipEntries'] = vipEntries;
    if (revenue !== undefined) statsUpdate['stats.revenue'] = revenue;
    if (peakTime !== undefined) statsUpdate['stats.peakTime'] = peakTime;
    if (peakAttendance !== undefined) statsUpdate['stats.peakAttendance'] = peakAttendance;
    
    // Mettre à jour les statistiques
    const updatedEvent = await NightclubEvent.findByIdAndUpdate(
      eventId,
      { $set: statsUpdate },
      { new: true }
    );
    
    if (!updatedEvent) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Statistiques de l\'événement mises à jour',
      event: updatedEvent
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
}; 