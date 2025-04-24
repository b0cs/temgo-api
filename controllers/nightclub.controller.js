import Cluster from '../models/cluster.model.js';
import NightclubTable from '../models/nightclub-table.model.js';
import NightclubReservation from '../models/nightclub-reservation.model.js';
import mongoose from 'mongoose';

/**
 * Récupérer les détails d'une boîte de nuit
 */
export const getNightclubDetails = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boîte de nuit invalide'
      });
    }
    
    // Récupérer la boîte de nuit
    const nightclub = await Cluster.findById(clusterId);
    
    if (!nightclub) {
      return res.status(404).json({
        success: false,
        message: 'Boîte de nuit non trouvée'
      });
    }
    
    // Vérifier que c'est bien une boîte de nuit
    if (nightclub.type !== 'Nightclub') {
      return res.status(400).json({
        success: false,
        message: 'Ce cluster n\'est pas une boîte de nuit'
      });
    }
    
    res.status(200).json({
      success: true,
      nightclub
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de la boîte de nuit:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Récupérer toutes les tables d'une boîte de nuit
 */
export const getNightclubTables = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { tableType } = req.query;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boîte de nuit invalide'
      });
    }
    
    // Construire la requête
    const query = { cluster: clusterId };
    
    // Filtrer par type de table si spécifié
    if (tableType) {
      query.tableType = tableType;
    }
    
    // Récupérer les tables
    const tables = await NightclubTable.find(query).sort({ tableType: -1, number: 1 });
    
    res.status(200).json({
      success: true,
      count: tables.length,
      tables
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des tables:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Créer une nouvelle table
 */
export const createNightclubTable = async (req, res) => {
  try {
    const { 
      number, name, capacity, tableType, 
      location, pricing, features 
    } = req.body;
    
    const { clusterId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boîte de nuit invalide'
      });
    }
    
    // Vérifier si le numéro de table existe déjà
    const existingTable = await NightclubTable.findOne({ 
      cluster: clusterId,
      number: number
    });
    
    if (existingTable) {
      return res.status(400).json({
        success: false,
        message: `La table numéro ${number} existe déjà`
      });
    }
    
    // Créer la nouvelle table
    const newTable = new NightclubTable({
      number,
      name,
      capacity,
      tableType,
      cluster: clusterId,
      location: location || {},
      pricing: pricing || {},
      features: features || {}
    });
    
    await newTable.save();
    
    res.status(201).json({
      success: true,
      table: newTable
    });
  } catch (error) {
    console.error('Erreur lors de la création de la table:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Récupérer une table par son ID
 */
export const getNightclubTableById = async (req, res) => {
  try {
    const { tableId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de table invalide'
      });
    }
    
    // Récupérer la table
    const table = await NightclubTable.findById(tableId);
    
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table non trouvée'
      });
    }
    
    res.status(200).json({
      success: true,
      table
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la table:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Mettre à jour une table
 */
export const updateNightclubTable = async (req, res) => {
  try {
    const { tableId } = req.params;
    const updates = req.body;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(tableId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de table invalide'
      });
    }
    
    // Vérifier si la table existe
    const table = await NightclubTable.findById(tableId);
    
    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table non trouvée'
      });
    }
    
    // Mettre à jour la table
    const updatedTable = await NightclubTable.findByIdAndUpdate(
      tableId,
      updates,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      table: updatedTable
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la table:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Créer une nouvelle réservation
 */
export const createNightclubReservation = async (req, res) => {
  try {
    const {
      tables, customer, customerInfo, date, arrivalTime,
      bottleService, occasion, vipEntryIncluded, skipLineAccess
    } = req.body;
    
    const { clusterId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boîte de nuit invalide'
      });
    }
    
    // Vérifier les informations obligatoires
    if (!customerInfo || !customerInfo.name || !customerInfo.email || !customerInfo.phone || !customerInfo.numberOfGuests) {
      return res.status(400).json({
        success: false,
        message: 'Informations client manquantes'
      });
    }
    
    if (!date || !arrivalTime) {
      return res.status(400).json({
        success: false,
        message: 'Date et heure d\'arrivée requises'
      });
    }
    
    // Vérifier la disponibilité des tables si réservation avec tables
    if (tables && tables.length > 0) {
      // Vérifier si les tables existent
      for (const tableId of tables) {
        if (!mongoose.Types.ObjectId.isValid(tableId)) {
          return res.status(400).json({
            success: false,
            message: `ID de table invalide: ${tableId}`
          });
        }
        
        const table = await NightclubTable.findById(tableId);
        
        if (!table) {
          return res.status(400).json({
            success: false,
            message: `Table non trouvée: ${tableId}`
          });
        }
        
        if (table.status !== 'available') {
          return res.status(400).json({
            success: false,
            message: `Table ${table.name} n'est pas disponible`
          });
        }
      }
      
      // Vérifier les conflits de réservation
      const tablesAvailable = await NightclubReservation.checkTableAvailability(
        clusterId,
        date,
        tables
      );
      
      if (!tablesAvailable) {
        return res.status(409).json({
          success: false,
          message: 'Une ou plusieurs tables sont déjà réservées pour cette date'
        });
      }
    }
    
    // Créer la réservation
    const newReservation = new NightclubReservation({
      cluster: clusterId,
      tables: tables || [],
      customer,
      customerInfo,
      date,
      arrivalTime,
      bottleService: bottleService || { isRequested: false },
      occasion,
      vipEntryIncluded: vipEntryIncluded || false,
      skipLineAccess: skipLineAccess || false,
      guestListOnly: !tables || tables.length === 0
    });
    
    // Calculer le montant total estimé
    if (bottleService && bottleService.isRequested) {
      newReservation.totalAmount = newReservation.calculateEstimatedTotal();
    }
    
    await newReservation.save();
    
    // Mettre à jour le statut des tables réservées
    if (tables && tables.length > 0) {
      await NightclubTable.updateMany(
        { _id: { $in: tables } },
        { 
          status: 'reserved',
          currentReservation: newReservation._id
        }
      );
    }
    
    res.status(201).json({
      success: true,
      reservation: newReservation
    });
  } catch (error) {
    console.error('Erreur lors de la création de la réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Récupérer toutes les réservations d'une boîte de nuit
 */
export const getNightclubReservations = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { date, status } = req.query;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boîte de nuit invalide'
      });
    }
    
    // Construire la requête
    const query = { cluster: clusterId };
    
    // Filtrer par date si spécifiée
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      query.date = {
        $gte: startDate,
        $lt: endDate
      };
    }
    
    // Filtrer par statut si spécifié
    if (status) {
      query.status = status;
    }
    
    // Récupérer les réservations
    const reservations = await NightclubReservation.find(query)
      .populate('tables')
      .populate('customer', 'firstName lastName email phone')
      .sort({ date: 1, arrivalTime: 1 });
    
    res.status(200).json({
      success: true,
      count: reservations.length,
      reservations
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Récupérer une réservation par son ID
 */
export const getNightclubReservationById = async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de réservation invalide'
      });
    }
    
    // Récupérer la réservation avec les informations associées
    const reservation = await NightclubReservation.findById(reservationId)
      .populate('tables')
      .populate('customer', 'firstName lastName email phone')
      .populate('assignedHost', 'firstName lastName')
      .populate('assignedPromoter', 'firstName lastName');
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }
    
    res.status(200).json({
      success: true,
      reservation
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Mettre à jour une réservation
 */
export const updateNightclubReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const updates = req.body;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de réservation invalide'
      });
    }
    
    // Récupérer la réservation existante
    const reservation = await NightclubReservation.findById(reservationId);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }
    
    // Si les tables sont modifiées, vérifier leur disponibilité
    if (updates.tables && JSON.stringify(updates.tables) !== JSON.stringify(reservation.tables)) {
      // Libérer les tables actuellement réservées
      if (reservation.tables && reservation.tables.length > 0) {
        await NightclubTable.updateMany(
          { _id: { $in: reservation.tables } },
          { 
            status: 'available',
            currentReservation: null
          }
        );
      }
      
      // Vérifier la disponibilité des nouvelles tables
      if (updates.tables.length > 0) {
        const tablesAvailable = await NightclubReservation.checkTableAvailability(
          reservation.cluster,
          updates.date || reservation.date,
          updates.tables,
          reservationId
        );
        
        if (!tablesAvailable) {
          return res.status(409).json({
            success: false,
            message: 'Une ou plusieurs tables sont déjà réservées pour cette date'
          });
        }
        
        // Réserver les nouvelles tables
        await NightclubTable.updateMany(
          { _id: { $in: updates.tables } },
          { 
            status: 'reserved',
            currentReservation: reservationId
          }
        );
      }
    }
    
    // Gérer le changement de statut
    if (updates.status && updates.status !== reservation.status) {
      if (updates.status === 'cancelled') {
        // Si annulation, libérer les tables
        if (reservation.tables && reservation.tables.length > 0) {
          await NightclubTable.updateMany(
            { _id: { $in: reservation.tables } },
            { 
              status: 'available',
              currentReservation: null
            }
          );
        }
      } else if (updates.status === 'arrived') {
        // Si le client est arrivé, mettre à jour l'heure d'arrivée réelle
        updates.actualArrivalTime = new Date();
        
        // Mettre à jour le statut des tables à "occupied"
        if (reservation.tables && reservation.tables.length > 0) {
          await NightclubTable.updateMany(
            { _id: { $in: reservation.tables } },
            { status: 'occupied' }
          );
        }
        
        // Incrémenter l'occupation de la boîte de nuit
        const nightclub = await Cluster.findById(reservation.cluster);
        if (nightclub && nightclub.type === 'Nightclub') {
          if (!nightclub.nightclubInfo) {
            nightclub.nightclubInfo = { currentOccupancy: 0 };
          }
          
          // Ajouter le nombre d'invités à l'occupation actuelle
          const guestCount = reservation.customerInfo.numberOfGuests || 1;
          nightclub.nightclubInfo.currentOccupancy = (nightclub.nightclubInfo.currentOccupancy || 0) + guestCount;
          
          // Vérifier si on dépasse la capacité maximale pour aujourd'hui
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (!nightclub.nightclubInfo.occupancyHistory) {
            nightclub.nightclubInfo.occupancyHistory = [];
          }
          
          const todayRecord = nightclub.nightclubInfo.occupancyHistory.find(record => {
            const recordDate = new Date(record.date);
            recordDate.setHours(0, 0, 0, 0);
            return recordDate.getTime() === today.getTime();
          });
          
          if (!todayRecord) {
            // Créer un nouvel enregistrement pour aujourd'hui
            nightclub.nightclubInfo.occupancyHistory.push({
              date: today,
              maxOccupancy: nightclub.nightclubInfo.currentOccupancy,
              notes: `Réservation ${reservation._id} arrivée`
            });
          } else if (nightclub.nightclubInfo.currentOccupancy > todayRecord.maxOccupancy) {
            // Mettre à jour le maximum si on dépasse
            todayRecord.maxOccupancy = nightclub.nightclubInfo.currentOccupancy;
            todayRecord.notes = `Nouveau maximum - Réservation ${reservation._id}`;
          }
          
          await nightclub.save();
          
          // Vérifier si on approche de la capacité maximale
          const totalCapacity = nightclub.nightclubInfo.totalCapacity || 0;
          if (totalCapacity > 0 && nightclub.nightclubInfo.currentOccupancy >= totalCapacity * 0.9) {
            console.warn(`ATTENTION: La boîte de nuit ${nightclub.name} approche ou dépasse sa capacité maximale!`);
          }
        }
      } else if (updates.status === 'completed') {
        // Si terminé, libérer les tables
        if (reservation.tables && reservation.tables.length > 0) {
          await NightclubTable.updateMany(
            { _id: { $in: reservation.tables } },
            { 
              status: 'available',
              currentReservation: null
            }
          );
        }
        
        // Enregistrer l'heure de départ
        if (!updates.departureTime) {
          updates.departureTime = new Date();
        }
        
        // Décrémenter l'occupation de la boîte de nuit
        const nightclub = await Cluster.findById(reservation.cluster);
        if (nightclub && nightclub.type === 'Nightclub') {
          if (!nightclub.nightclubInfo) {
            nightclub.nightclubInfo = { currentOccupancy: 0 };
          }
          
          // Soustraire le nombre d'invités de l'occupation actuelle
          const guestCount = reservation.customerInfo.numberOfGuests || 1;
          nightclub.nightclubInfo.currentOccupancy = Math.max(
            0, 
            (nightclub.nightclubInfo.currentOccupancy || 0) - guestCount
          );
          
          await nightclub.save();
        }
      } else if (updates.status === 'no_show') {
        // Si no-show, libérer les tables
        if (reservation.tables && reservation.tables.length > 0) {
          await NightclubTable.updateMany(
            { _id: { $in: reservation.tables } },
            { 
              status: 'available',
              currentReservation: null
            }
          );
        }
      }
    }
    
    // Mettre à jour la réservation
    const updatedReservation = await NightclubReservation.findByIdAndUpdate(
      reservationId,
      updates,
      { new: true, runValidators: true }
    ).populate('tables');
    
    res.status(200).json({
      success: true,
      reservation: updatedReservation
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Annuler une réservation
 */
export const cancelNightclubReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { cancellationReason } = req.body;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(reservationId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de réservation invalide'
      });
    }
    
    // Récupérer la réservation
    const reservation = await NightclubReservation.findById(reservationId);
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }
    
    // Vérifier si la réservation peut être annulée
    if (['completed', 'cancelled', 'no_show'].includes(reservation.status)) {
      return res.status(400).json({
        success: false,
        message: `Impossible d'annuler une réservation avec le statut ${reservation.status}`
      });
    }
    
    // Annuler la réservation
    reservation.status = 'cancelled';
    reservation.cancellationReason = cancellationReason || 'Annulation par le client';
    
    await reservation.save();
    
    // Libérer les tables
    if (reservation.tables && reservation.tables.length > 0) {
      await NightclubTable.updateMany(
        { _id: { $in: reservation.tables } },
        { 
          status: 'available',
          currentReservation: null
        }
      );
    }
    
    // Si la réservation était au statut "arrived", décrémenter l'occupation de la boîte de nuit
    if (reservation.status === 'arrived') {
      const nightclub = await Cluster.findById(reservation.cluster);
      if (nightclub && nightclub.type === 'Nightclub') {
        if (!nightclub.nightclubInfo) {
          nightclub.nightclubInfo = { currentOccupancy: 0 };
        }
        
        // Soustraire le nombre d'invités de l'occupation actuelle
        const guestCount = reservation.customerInfo.numberOfGuests || 1;
        nightclub.nightclubInfo.currentOccupancy = Math.max(
          0, 
          (nightclub.nightclubInfo.currentOccupancy || 0) - guestCount
        );
        
        await nightclub.save();
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Réservation annulée avec succès',
      reservation
    });
  } catch (error) {
    console.error('Erreur lors de l\'annulation de la réservation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Vérifier la disponibilité des tables pour une date donnée
 */
export const checkTableAvailability = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { date, tableIds } = req.body;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boîte de nuit invalide'
      });
    }
    
    // Vérifier les paramètres requis
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date requise'
      });
    }
    
    if (!tableIds || !Array.isArray(tableIds) || tableIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs de tables requis'
      });
    }
    
    // Vérifier la disponibilité
    const available = await NightclubReservation.checkTableAvailability(
      clusterId,
      date,
      tableIds
    );
    
    // Si disponible, récupérer les détails des tables
    let tables = [];
    if (available) {
      tables = await NightclubTable.find({ _id: { $in: tableIds } });
    }
    
    res.status(200).json({
      success: true,
      available,
      tables: available ? tables : []
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de disponibilité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Mettre à jour la capacité totale de la boîte de nuit
 */
export const updateNightclubCapacity = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { totalCapacity, doorPolicy, standardEntryFee, vipEntryFee } = req.body;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boîte de nuit invalide'
      });
    }
    
    // Récupérer la boîte de nuit
    const nightclub = await Cluster.findById(clusterId);
    
    if (!nightclub) {
      return res.status(404).json({
        success: false,
        message: 'Boîte de nuit non trouvée'
      });
    }
    
    // Vérifier que c'est bien une boîte de nuit
    if (nightclub.type !== 'Nightclub') {
      return res.status(400).json({
        success: false,
        message: 'Ce cluster n\'est pas une boîte de nuit'
      });
    }
    
    // Initialiser le champ nightclubInfo s'il n'existe pas encore
    if (!nightclub.nightclubInfo) {
      nightclub.nightclubInfo = {};
    }
    
    // Mettre à jour les informations
    if (totalCapacity !== undefined) nightclub.nightclubInfo.totalCapacity = totalCapacity;
    if (doorPolicy !== undefined) nightclub.nightclubInfo.doorPolicy = doorPolicy;
    if (standardEntryFee !== undefined) nightclub.nightclubInfo.standardEntryFee = standardEntryFee;
    if (vipEntryFee !== undefined) nightclub.nightclubInfo.vipEntryFee = vipEntryFee;
    
    await nightclub.save();
    
    res.status(200).json({
      success: true,
      message: 'Informations de capacité mises à jour avec succès',
      nightclub
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la capacité:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Mettre à jour l'occupation actuelle de la boîte de nuit
 */
export const updateNightclubOccupancy = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { currentOccupancy, addToOccupancy, removeFromOccupancy, notes } = req.body;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boîte de nuit invalide'
      });
    }
    
    // Récupérer la boîte de nuit
    const nightclub = await Cluster.findById(clusterId);
    
    if (!nightclub) {
      return res.status(404).json({
        success: false,
        message: 'Boîte de nuit non trouvée'
      });
    }
    
    // Vérifier que c'est bien une boîte de nuit
    if (nightclub.type !== 'Nightclub') {
      return res.status(400).json({
        success: false,
        message: 'Ce cluster n\'est pas une boîte de nuit'
      });
    }
    
    // Initialiser le champ nightclubInfo s'il n'existe pas encore
    if (!nightclub.nightclubInfo) {
      nightclub.nightclubInfo = { currentOccupancy: 0, totalCapacity: 0 };
    }
    
    let updatedOccupancy = nightclub.nightclubInfo.currentOccupancy || 0;
    
    // Mise à jour directe
    if (currentOccupancy !== undefined) {
      updatedOccupancy = currentOccupancy;
    } else {
      // Ajout ou retrait d'un nombre de personnes
      if (addToOccupancy) {
        updatedOccupancy += parseInt(addToOccupancy);
      }
      
      if (removeFromOccupancy) {
        updatedOccupancy -= parseInt(removeFromOccupancy);
      }
    }
    
    // Vérifier que l'occupation n'est pas négative
    updatedOccupancy = Math.max(0, updatedOccupancy);
    
    // Mettre à jour l'occupation actuelle
    nightclub.nightclubInfo.currentOccupancy = updatedOccupancy;
    
    // Si on dépasse la capacité maximale historique pour aujourd'hui, enregistrer dans l'historique
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!nightclub.nightclubInfo.occupancyHistory) {
      nightclub.nightclubInfo.occupancyHistory = [];
    }
    
    const todayRecord = nightclub.nightclubInfo.occupancyHistory.find(record => {
      const recordDate = new Date(record.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
    
    if (!todayRecord) {
      // Créer un nouvel enregistrement pour aujourd'hui
      nightclub.nightclubInfo.occupancyHistory.push({
        date: today,
        maxOccupancy: updatedOccupancy,
        notes: notes || 'Occupation initiale'
      });
    } else if (updatedOccupancy > todayRecord.maxOccupancy) {
      // Mettre à jour le maximum si on dépasse
      todayRecord.maxOccupancy = updatedOccupancy;
      if (notes) {
        todayRecord.notes = notes;
      }
    }
    
    await nightclub.save();
    
    // Vérifier si on approche ou dépasse la capacité
    let warning = null;
    const totalCapacity = nightclub.nightclubInfo.totalCapacity || 0;
    
    if (totalCapacity > 0) {
      const occupancyRate = (updatedOccupancy / totalCapacity) * 100;
      
      if (occupancyRate >= 100) {
        warning = 'ATTENTION: La boîte de nuit a atteint sa capacité maximale!';
      } else if (occupancyRate >= 90) {
        warning = 'ATTENTION: La boîte de nuit est presque à sa capacité maximale (>90%).';
      } else if (occupancyRate >= 80) {
        warning = 'La boîte de nuit est à plus de 80% de sa capacité.';
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Occupation mise à jour avec succès',
      currentOccupancy: updatedOccupancy,
      totalCapacity: nightclub.nightclubInfo.totalCapacity || 0,
      occupancyRate: totalCapacity > 0 ? Math.round((updatedOccupancy / totalCapacity) * 100) : 0,
      warning
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'occupation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

/**
 * Obtenir un rapport d'occupation pour une période donnée
 */
export const getNightclubOccupancyReport = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Valider l'ID
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de boîte de nuit invalide'
      });
    }
    
    // Récupérer la boîte de nuit
    const nightclub = await Cluster.findById(clusterId);
    
    if (!nightclub) {
      return res.status(404).json({
        success: false,
        message: 'Boîte de nuit non trouvée'
      });
    }
    
    // Vérifier que c'est bien une boîte de nuit
    if (nightclub.type !== 'Nightclub') {
      return res.status(400).json({
        success: false,
        message: 'Ce cluster n\'est pas une boîte de nuit'
      });
    }
    
    // Vérifier que l'historique d'occupation existe
    if (!nightclub.nightclubInfo || !nightclub.nightclubInfo.occupancyHistory) {
      return res.status(200).json({
        success: true,
        message: 'Aucun historique d\'occupation trouvé',
        data: []
      });
    }
    
    // Filtrer l'historique par période si spécifiée
    let history = nightclub.nightclubInfo.occupancyHistory;
    
    if (startDate) {
      const start = new Date(startDate);
      history = history.filter(record => new Date(record.date) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      history = history.filter(record => new Date(record.date) <= end);
    }
    
    // Trier par date
    history.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculer des statistiques
    const stats = {
      totalDays: history.length,
      averageMaxOccupancy: history.length > 0 
        ? Math.round(history.reduce((sum, record) => sum + record.maxOccupancy, 0) / history.length) 
        : 0,
      highestOccupancy: history.length > 0 
        ? Math.max(...history.map(record => record.maxOccupancy)) 
        : 0,
      highestOccupancyDate: history.length > 0 
        ? history.reduce((max, record) => record.maxOccupancy > max.maxOccupancy ? record : max, history[0]).date 
        : null
    };
    
    res.status(200).json({
      success: true,
      currentOccupancy: nightclub.nightclubInfo.currentOccupancy || 0,
      totalCapacity: nightclub.nightclubInfo.totalCapacity || 0,
      history,
      stats
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du rapport d\'occupation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
}; 