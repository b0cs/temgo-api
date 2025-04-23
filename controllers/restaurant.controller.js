import Cluster from '../models/cluster.model.js';
import MenuItem from '../models/restaurant-menu-item.model.js';
import Menu from '../models/restaurant-menu.model.js';
import RestaurantTable from '../models/restaurant-table.model.js';
import Reservation from '../models/restaurant-reservation.model.js';
import mongoose from 'mongoose';

/**
 * Obtenir les détails d'un restaurant
 */
export const getRestaurantDetails = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de restaurant invalide'
      });
    }
    
    // Récupérer le restaurant avec les champs pertinents
    const restaurant = await Cluster.findById(clusterId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    // Vérifier que c'est bien un restaurant
    if (restaurant.type !== 'Restaurant' && restaurant.type !== 'Bar') {
      return res.status(400).json({
        success: false,
        message: 'Ce cluster n\'est pas un restaurant'
      });
    }
    
    res.status(200).json({
      success: true,
      restaurant
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des détails du restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des détails du restaurant',
      error: error.message
    });
  }
};

/**
 * Créer un nouveau plat/item de menu
 */
export const createMenuItem = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de restaurant invalide'
      });
    }
    
    // Vérifier que le restaurant existe
    const restaurant = await Cluster.findById(clusterId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    // Vérifier que c'est bien un restaurant
    if (restaurant.type !== 'Restaurant' && restaurant.type !== 'Bar') {
      return res.status(400).json({
        success: false,
        message: 'Ce cluster n\'est pas un restaurant'
      });
    }
    
    // Créer le nouvel article de menu
    const menuItem = new MenuItem({
      ...req.body,
      cluster: clusterId
    });
    
    // Sauvegarder l'article de menu
    await menuItem.save();
    
    res.status(201).json({
      success: true,
      message: 'Article de menu créé avec succès',
      menuItem
    });
  } catch (error) {
    console.error('Erreur lors de la création de l\'article de menu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de l\'article de menu',
      error: error.message
    });
  }
};

/**
 * Récupérer tous les articles de menu d'un restaurant
 */
export const getMenuItems = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { category, available, featured } = req.query;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de restaurant invalide'
      });
    }
    
    // Construire le filtre de recherche
    const filter = { cluster: clusterId };
    
    // Ajouter des filtres supplémentaires si nécessaire
    if (category) filter.category = category;
    if (available === 'true') filter.available = true;
    if (featured === 'true') filter.featured = true;
    
    // Récupérer les articles de menu
    const menuItems = await MenuItem.find(filter)
      .sort({ category: 1, displayOrder: 1, name: 1 });
    
    res.status(200).json({
      success: true,
      count: menuItems.length,
      menuItems
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des articles de menu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des articles de menu',
      error: error.message
    });
  }
};

/**
 * Mettre à jour un article de menu
 */
export const updateMenuItem = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(menuItemId)) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'article de menu invalide'
      });
    }
    
    // Trouver et mettre à jour l'article de menu
    const menuItem = await MenuItem.findByIdAndUpdate(
      menuItemId,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Article de menu non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Article de menu mis à jour avec succès',
      menuItem
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'article de menu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour de l\'article de menu',
      error: error.message
    });
  }
};

/**
 * Créer une table
 */
export const createTable = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de restaurant invalide'
      });
    }
    
    // Vérifier que le restaurant existe
    const restaurant = await Cluster.findById(clusterId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    // Vérifier si un numéro de table similaire existe déjà
    const existingTable = await RestaurantTable.findOne({
      cluster: clusterId,
      number: req.body.number
    });
    
    if (existingTable) {
      return res.status(400).json({
        success: false,
        message: 'Une table avec ce numéro existe déjà dans ce restaurant'
      });
    }
    
    // Créer la nouvelle table
    const table = new RestaurantTable({
      ...req.body,
      cluster: clusterId
    });
    
    // Sauvegarder la table
    await table.save();
    
    res.status(201).json({
      success: true,
      message: 'Table créée avec succès',
      table
    });
  } catch (error) {
    console.error('Erreur lors de la création de la table:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de la table',
      error: error.message
    });
  }
};

/**
 * Récupérer toutes les tables d'un restaurant
 */
export const getTables = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { status, location, capacity } = req.query;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de restaurant invalide'
      });
    }
    
    // Construire le filtre de recherche
    const filter = { cluster: clusterId };
    
    // Ajouter des filtres supplémentaires si nécessaire
    if (status) filter.status = status;
    if (location) filter['location.area'] = location;
    if (capacity) filter.capacity = { $gte: parseInt(capacity) };
    
    // Récupérer les tables
    const tables = await RestaurantTable.find(filter)
      .sort({ number: 1 });
    
    res.status(200).json({
      success: true,
      count: tables.length,
      tables
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des tables:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des tables',
      error: error.message
    });
  }
};

/**
 * Créer une réservation de table
 */
export const createReservation = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de restaurant invalide'
      });
    }
    
    // Récupérer les données de la réservation
    const { tables, date, time, duration, customerInfo } = req.body;
    
    // Vérifier que les tables existent et appartiennent au restaurant
    if (tables && tables.length > 0) {
      // Vérifier la disponibilité des tables
      const isAvailable = await Reservation.checkTableAvailability(
        clusterId,
        date,
        time,
        duration || 120,
        tables
      );
      
      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          message: 'Une ou plusieurs tables demandées ne sont pas disponibles à cette heure'
        });
      }
    }
    
    // Créer la réservation
    const reservation = new Reservation({
      ...req.body,
      cluster: clusterId
    });
    
    // Sauvegarder la réservation
    await reservation.save();
    
    // Mettre à jour le statut des tables si nécessaire
    if (tables && tables.length > 0) {
      await RestaurantTable.updateMany(
        { _id: { $in: tables } },
        { 
          status: 'reserved',
          currentReservation: reservation._id
        }
      );
    }
    
    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      reservation
    });
  } catch (error) {
    console.error('Erreur lors de la création de la réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de la réservation',
      error: error.message
    });
  }
};

/**
 * Récupérer les réservations d'un restaurant
 */
export const getReservations = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { date, status } = req.query;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de restaurant invalide'
      });
    }
    
    // Construire le filtre de recherche
    const filter = { cluster: clusterId };
    
    // Ajouter des filtres supplémentaires si nécessaire
    if (date) {
      // Convertir en objet Date
      const searchDate = new Date(date);
      searchDate.setHours(0, 0, 0, 0);
      
      // Créer la plage de dates pour un jour complet
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      filter.date = {
        $gte: searchDate,
        $lt: nextDay
      };
    }
    
    if (status) filter.status = status;
    
    // Récupérer les réservations
    const reservations = await Reservation.find(filter)
      .populate('tables')
      .sort({ date: 1, time: 1 });
    
    res.status(200).json({
      success: true,
      count: reservations.length,
      reservations
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des réservations',
      error: error.message
    });
  }
};

/**
 * Créer un menu (ensemble d'items)
 */
export const createMenu = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de restaurant invalide'
      });
    }
    
    // Vérifier que le restaurant existe
    const restaurant = await Cluster.findById(clusterId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    // Créer le nouveau menu
    const menu = new Menu({
      ...req.body,
      cluster: clusterId
    });
    
    // Sauvegarder le menu
    await menu.save();
    
    res.status(201).json({
      success: true,
      message: 'Menu créé avec succès',
      menu
    });
  } catch (error) {
    console.error('Erreur lors de la création du menu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du menu',
      error: error.message
    });
  }
};

/**
 * Récupérer les menus d'un restaurant
 */
export const getMenus = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de restaurant invalide'
      });
    }
    
    // Récupérer les menus
    const menus = await Menu.find({ cluster: clusterId, isActive: true })
      .sort({ displayOrder: 1 });
    
    res.status(200).json({
      success: true,
      count: menus.length,
      menus
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des menus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des menus',
      error: error.message
    });
  }
};

/**
 * Mettre à jour les caractéristiques d'un restaurant
 */
export const updateRestaurantFeatures = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de restaurant invalide'
      });
    }
    
    // Vérifier que le restaurant existe
    const restaurant = await Cluster.findById(clusterId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant non trouvé'
      });
    }
    
    // Mettre à jour les caractéristiques du restaurant
    restaurant.restaurantFeatures = {
      ...restaurant.restaurantFeatures,
      ...req.body
    };
    
    // Sauvegarder les modifications
    await restaurant.save();
    
    res.status(200).json({
      success: true,
      message: 'Caractéristiques du restaurant mises à jour avec succès',
      restaurantFeatures: restaurant.restaurantFeatures
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des caractéristiques du restaurant:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour des caractéristiques du restaurant',
      error: error.message
    });
  }
}; 