import Member from '../models/member.model.js';
import ClientClusterRelation from '../models/ClientClusterRelation.js';
import mongoose from 'mongoose';
import Appointment from '../models/appointment.model.js';

// Récupérer tous les clients d'un établissement
export const getClientsByCluster = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { includeBanned } = req.query; // Paramètre pour inclure les clients bannis
    
    console.log('🔍 getClientsByCluster - Request params:', { clusterId, includeBanned });
    
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'ID d\'établissement invalide' });
    }

    console.time('getClientsByCluster');

    // Approche simplifiée pour récupérer TOUS les clients avec ce cluster ID
    const members = await Member.find({
      cluster: new mongoose.Types.ObjectId(clusterId),
      role: 'client'
    }).lean();
    
    console.log(`✅ Trouvé ${members.length} clients directement associés au cluster dans la collection members`);
    
    // Formatter les clients pour la réponse
    const formattedClients = members.map(member => {
      // Créer un format de réponse cohérent
      return {
        _id: `client_${member._id}`,
        clientId: member._id,
        clusterId: clusterId,
        isActive: member.status !== 'banned' && member.status !== 'deleted',
        joinedAt: member.createdAt || new Date(),
        lastVisit: null,
        totalSpent: 0,
        visitsCount: 0,
        preferences: { 
          banned: member.status === 'banned',
          deleted: member.status === 'deleted'
        },
        favoriteServices: [],
        clientInfo: {
          _id: member._id,
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phone: member.phone,
          status: member.status,
          deletedAt: member.deletedAt,
          anonymizedData: member.anonymizedData
        }
      };
    });
    
    // Si vous souhaitez filtrer selon le paramètre includeBanned
    let filteredClients = formattedClients;
    
    if (includeBanned === 'true') {
      // Ne garder que les clients bannis
      filteredClients = formattedClients.filter(client => 
        client.clientInfo.status === 'banned' || client.preferences.banned
      );
      console.log(`✅ Filtrage: ${filteredClients.length} clients bannis retenus`);
    } else if (includeBanned !== 'all') {
      // Exclure les clients bannis (comportement par défaut)
      filteredClients = formattedClients.filter(client => 
        client.clientInfo.status !== 'banned' && !client.preferences.banned
      );
      console.log(`✅ Filtrage: ${filteredClients.length} clients actifs retenus (non bannis)`);
    }

    console.timeEnd('getClientsByCluster');
    console.log(`✅ Récupéré au total ${filteredClients.length} clients`);

    return res.status(200).json(filteredClients);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des clients:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
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

// Bannir un client dans un établissement spécifique
export const banClient = async (req, res) => {
  try {
    const { relationId } = req.params;
    const { reason } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(relationId)) {
      return res.status(400).json({ message: 'ID de relation invalide' });
    }

    // Rechercher la relation client-cluster
    const relation = await ClientClusterRelation.findById(relationId);
    if (!relation) {
      return res.status(404).json({ message: 'Relation client-cluster non trouvée' });
    }

    // Vérifier si le client a des rendez-vous à venir
    const futureAppointments = await Appointment.find({
      member: relation.clientId,
      cluster: relation.clusterId,
      startTime: { $gt: new Date() },
      status: { $nin: ['cancelled', 'no_show'] }
    });
    
    if (futureAppointments.length > 0) {
      return res.status(400).json({
        message: 'Impossible de bannir ce client car il a des rendez-vous à venir',
        appointments: futureAppointments.map(app => ({
          id: app._id,
          date: app.startTime,
          service: app.service?.name || 'Service non spécifié'
        }))
      });
    }

    // Mettre à jour les préférences pour marquer le client comme banni
    relation.preferences = {
      ...relation.preferences,
      banned: true,
      banReason: reason || 'Aucune raison spécifiée',
      bannedAt: new Date()
    };
    
    // Désactiver la relation
    relation.isActive = false;

    // Enregistrer les modifications
    await relation.save();

    // Également mettre à jour le statut du client dans la collection members
    try {
      const member = await Member.findById(relation.clientId);
      if (member) {
        member.status = 'banned';
        await member.save();
        console.log(`Client ${member.firstName} ${member.lastName} banni et statut mis à jour à 'banned'`);
      }
    } catch (memberError) {
      console.error('Erreur lors de la mise à jour du statut membre:', memberError);
      // Ne pas bloquer l'opération principale si cette étape échoue
    }

    return res.status(200).json({
      message: 'Client banni avec succès',
      relation: relation
    });
  } catch (error) {
    console.error('Erreur lors du bannissement du client:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Débannir un client dans un établissement spécifique
export const unbanClient = async (req, res) => {
  try {
    const { relationId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(relationId)) {
      return res.status(400).json({ message: 'ID de relation invalide' });
    }

    // Rechercher la relation client-cluster
    const relation = await ClientClusterRelation.findById(relationId);
    if (!relation) {
      return res.status(404).json({ message: 'Relation client-cluster non trouvée' });
    }

    // Vérifier si le client est banni
    if (!relation.preferences?.banned) {
      return res.status(400).json({ message: 'Ce client n\'est pas banni' });
    }

    // Mettre à jour les préférences pour débannir le client
    relation.preferences = {
      ...relation.preferences,
      banned: false,
      banReason: undefined,
      bannedAt: undefined
    };
    
    // Réactiver la relation
    relation.isActive = true;

    // Enregistrer les modifications
    await relation.save();

    // Également mettre à jour le statut du client dans la collection members si nécessaire
    try {
      const member = await Member.findById(relation.clientId);
      if (member && member.status === 'banned') {
        member.status = 'active';
        await member.save();
        console.log(`Client ${member.firstName} ${member.lastName} débanni et statut mis à jour à 'active'`);
      }
    } catch (memberError) {
      console.error('Erreur lors de la mise à jour du statut membre:', memberError);
      // Ne pas bloquer l'opération principale si cette étape échoue
    }

    return res.status(200).json({
      message: 'Client débanni avec succès',
      relation: relation
    });
  } catch (error) {
    console.error('Erreur lors du débannissement du client:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Récupérer tous les clients d'un établissement (méthode simplifiée)
export const getAllClientsByCluster = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    console.log('🔍 getAllClientsByCluster - Request params:', { clusterId });
    
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'ID d\'établissement invalide' });
    }

    console.time('getAllClientsByCluster');

    // Récupérer toutes les relations pour ce cluster, sans aucun filtrage
    const relations = await ClientClusterRelation.find({ 
      clusterId: new mongoose.Types.ObjectId(clusterId)
    }).populate('clientId', 'firstName lastName email phone status deletedAt anonymizedData');

    console.log(`✅ Récupéré ${relations.length} relations clients du cluster`);

    // Formater les données pour la réponse
    const formattedClients = relations.map(relation => {
      // Vérifier si relation.clientId existe et n'est pas null
      if (!relation.clientId) {
        console.log('⚠️ Relation sans clientId valide trouvée:', relation._id);
        return null;
      }
      
      return {
        _id: relation._id,
        clientId: relation.clientId._id,
        clusterId: relation.clusterId,
        isActive: relation.isActive,
        joinedAt: relation.joinedAt,
        lastVisit: relation.lastVisit,
        totalSpent: relation.totalSpent,
        visitsCount: relation.visitsCount,
        preferences: relation.preferences,
        favoriteServices: relation.favoriteServices,
        clientInfo: {
          _id: relation.clientId._id,
          firstName: relation.clientId.firstName,
          lastName: relation.clientId.lastName,
          email: relation.clientId.email,
          phone: relation.clientId.phone,
          status: relation.clientId.status,
          deletedAt: relation.clientId.deletedAt,
          anonymizedData: relation.clientId.anonymizedData
        }
      };
    }).filter(client => client !== null); // Filtrer les relations sans clientId valide

    // Récupérer également tous les clients dans la collection members avec status 'banned'
    // qui appartiennent à ce cluster, même s'ils n'ont pas de relation active
    try {
      const bannedMembers = await Member.find({
        cluster: new mongoose.Types.ObjectId(clusterId),
        status: 'banned'
      }).select('_id firstName lastName email phone status');
      
      console.log(`🔍 Trouvé ${bannedMembers.length} clients bannis dans la collection members`);
      
      if (bannedMembers.length > 0) {
        // Créer une liste des IDs clients déjà dans les relations formatées
        const existingClientIds = new Set(formattedClients.map(client => 
          client.clientInfo._id.toString()
        ));
        
        // Filtrer pour ne garder que les clients bannis qui ne sont pas déjà inclus
        const newBannedClients = bannedMembers.filter(member => 
          !existingClientIds.has(member._id.toString())
        );
        
        console.log(`🔍 Ajout de ${newBannedClients.length} clients bannis supplémentaires`);
        
        // Convertir ces clients bannis au même format que les relations
        const formattedBannedClients = newBannedClients.map(member => {
          return {
            _id: `banned_${member._id}`, // ID unique pour cette relation virtuelle
            clientId: member._id,
            clusterId: clusterId,
            isActive: false,
            joinedAt: member.createdAt || new Date(),
            lastVisit: null,
            totalSpent: 0,
            visitsCount: 0,
            preferences: { banned: true },
            favoriteServices: [],
            clientInfo: {
              _id: member._id,
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              phone: member.phone,
              status: 'banned'
            }
          };
        });
        
        // Ajouter ces clients bannis à la liste
        formattedClients.push(...formattedBannedClients);
      }
    } catch (error) {
      console.error('⚠️ Erreur lors de la récupération des clients bannis:', error);
      // Ne pas bloquer l'opération principale si cette étape échoue
    }

    // Rechercher également les relations inactives (désactivées) qui peuvent contenir des clients bannis
    try {
      const inactiveRelations = await ClientClusterRelation.find({
        clusterId: new mongoose.Types.ObjectId(clusterId),
        isActive: false,
        'preferences.banned': true
      }).populate('clientId', 'firstName lastName email phone status');
      
      console.log(`🔍 Trouvé ${inactiveRelations.length} relations inactives avec clients bannis`);
      
      if (inactiveRelations.length > 0) {
        // Créer une liste des IDs relations déjà dans les relations formatées
        const existingRelationIds = new Set(formattedClients.map(client => 
          client._id.toString()
        ));
        
        // Filtrer pour ne garder que les relations qui ne sont pas déjà incluses
        const newInactiveRelations = inactiveRelations.filter(relation => 
          !existingRelationIds.has(relation._id.toString()) &&
          relation.clientId !== null
        );
        
        console.log(`🔍 Ajout de ${newInactiveRelations.length} relations inactives supplémentaires`);
        
        // Convertir ces relations au format standard
        const formattedInactiveRelations = newInactiveRelations.map(relation => {
          return {
            _id: relation._id,
            clientId: relation.clientId._id,
            clusterId: relation.clusterId,
            isActive: false,
            joinedAt: relation.joinedAt,
            lastVisit: relation.lastVisit,
            totalSpent: relation.totalSpent,
            visitsCount: relation.visitsCount,
            preferences: relation.preferences,
            favoriteServices: relation.favoriteServices,
            clientInfo: {
              _id: relation.clientId._id,
              firstName: relation.clientId.firstName,
              lastName: relation.clientId.lastName,
              email: relation.clientId.email,
              phone: relation.clientId.phone,
              status: relation.clientId.status || 'banned'
            }
          };
        });
        
        // Ajouter ces relations inactives à la liste
        formattedClients.push(...formattedInactiveRelations);
      }
    } catch (error) {
      console.error('⚠️ Erreur lors de la récupération des relations inactives:', error);
      // Ne pas bloquer l'opération principale si cette étape échoue
    }

    // Récupérer également les clients supprimés du cluster directement à partir de la collection members
    try {
      const deletedMembers = await Member.find({
        cluster: new mongoose.Types.ObjectId(clusterId),
        status: 'deleted'
      }).select('_id firstName lastName email phone status deletedAt anonymizedData');
      
      if (deletedMembers.length > 0) {
        console.log(`🔍 Récupération directe de ${deletedMembers.length} clients supprimés supplémentaires`);
        
        // Convertir ces clients supprimés au même format que les relations
        const deletedClients = deletedMembers.map(member => {
          return {
            _id: `deleted_${member._id}`, // Identifiant unique pour cette "relation"
            clientId: member._id,
            clusterId: clusterId,
            isActive: false,
            joinedAt: member.createdAt || new Date(),
            lastVisit: null,
            totalSpent: 0,
            visitsCount: 0,
            preferences: { deleted: true },
            favoriteServices: [],
            clientInfo: {
              _id: member._id,
              firstName: member.firstName,
              lastName: member.lastName,
              email: member.email,
              phone: member.phone,
              status: 'deleted',
              deletedAt: member.deletedAt,
              anonymizedData: member.anonymizedData
            }
          };
        });
        
        // Ajouter ces clients supprimés à la liste, en évitant les doublons
        const existingClientIds = new Set(formattedClients.map(client => client.clientInfo._id.toString()));
        const uniqueDeletedClients = deletedClients.filter(client => 
          !existingClientIds.has(client.clientInfo._id.toString())
        );
        
        if (uniqueDeletedClients.length > 0) {
          console.log(`✅ Ajout de ${uniqueDeletedClients.length} clients supprimés uniques à la réponse`);
          formattedClients.push(...uniqueDeletedClients);
        }
      }
    } catch (memberError) {
      console.error('⚠️ Erreur lors de la récupération des clients supprimés:', memberError);
      // Ne pas bloquer l'opération principale si cette étape échoue
    }

    console.timeEnd('getAllClientsByCluster');
    console.log(`✅ Total final: ${formattedClients.length} clients (actifs, bannis et supprimés inclus)`);

    return res.status(200).json(formattedClients);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des clients:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Méthode pour changer le statut d'un client (banned -> active)
export const changeClientStatus = async (req, res) => {
  try {
    const { clientId, clusterId } = req.params;
    const { status } = req.body;
    
    console.log(`🔄 Changement du statut du client ${clientId} vers ${status} pour le cluster ${clusterId}`);
    
    if (!mongoose.Types.ObjectId.isValid(clientId) || !mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'ID invalide' });
    }
    
    if (!status || (status !== 'active' && status !== 'banned')) {
      return res.status(400).json({ message: 'Statut invalide. Valeurs acceptées: active, banned' });
    }
    
    // Vérifier si le client existe
    const client = await Member.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client introuvable' });
    }
    
    // Trouver la relation client-cluster
    const relation = await ClientClusterRelation.findOne({
      clientId,
      clusterId
    });
    
    if (!relation) {
      return res.status(404).json({ message: 'Relation client-cluster introuvable' });
    }
    
    // Réactiver le client
    if (status === 'active') {
      if (client.status === 'banned') {
        // Mettre à jour le statut du client si banni globalement
        client.status = 'active';
        await client.save();
      }
      
      // Mettre à jour la relation (isActive et preferences.banned)
      relation.isActive = true;
      if (!relation.preferences) {
        relation.preferences = {};
      }
      relation.preferences.banned = false;
      await relation.save();
      
      console.log(`✅ Client ${clientId} réactivé avec succès`);
      return res.status(200).json({ 
        message: 'Client réactivé avec succès',
        client: {
          _id: client._id,
          firstName: client.firstName,
          lastName: client.lastName,
          status: client.status
        },
        relation: {
          _id: relation._id,
          isActive: relation.isActive,
          preferences: relation.preferences
        }
      });
    } 
    // Bannir le client
    else if (status === 'banned') {
      // Vérifier les rendez-vous à venir avant de bannir
      const futureAppointments = await Appointment.find({
        member: clientId,
        cluster: clusterId,
        startTime: { $gte: new Date() },
        status: { $nin: ['cancelled', 'completed'] }
      }).populate('service', 'name');
      
      if (futureAppointments.length > 0) {
        console.log(`⚠️ Impossible de bannir le client car il a ${futureAppointments.length} rendez-vous à venir`);
        return res.status(400).json({
          message: 'Impossible de bannir ce client car il a des rendez-vous à venir',
          appointments: futureAppointments.map(app => ({
            id: app._id,
            date: app.startTime,
            service: app.service ? app.service.name : 'Service inconnu'
          }))
        });
      }
      
      // Mettre à jour le statut du client
      client.status = 'banned';
      await client.save();
      
      // Mettre à jour la relation
      relation.isActive = false;
      if (!relation.preferences) {
        relation.preferences = {};
      }
      relation.preferences.banned = true;
      await relation.save();
      
      console.log(`✅ Client ${clientId} banni avec succès`);
      return res.status(200).json({ 
        message: 'Client banni avec succès',
        client: {
          _id: client._id,
          firstName: client.firstName,
          lastName: client.lastName,
          status: client.status
        },
        relation: {
          _id: relation._id,
          isActive: relation.isActive,
          preferences: relation.preferences
        }
      });
    }
  } catch (error) {
    console.error(`❌ Erreur lors du changement de statut du client: ${error.message}`);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
}; 