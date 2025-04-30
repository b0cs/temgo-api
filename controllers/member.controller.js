import Member from "../models/member.model.js";
import ClientClusterRelation from "../models/ClientClusterRelation.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Cluster from "../models/cluster.model.js";
import Appointment from "../models/appointment.model.js";
import mongoose from "mongoose";
import Service from "../models/service.model.js";
import User from "../models/user.model.js";
// Need to add security in every controllers to check if the user is authorized to do the action
// Plus security from input data


dotenv.config();
export const createMember = async (req, res) => {
    const { firstName, lastName, email, phone, passwordHash, role, cluster, preferences, confirmed } = req.body;
    
    console.log("🔍 Tentative de création d'un membre avec les données:", {
        firstName, lastName, email, phone, cluster
    });
    
    // Validation des données
    if (!firstName || !lastName) {
        console.log("❌ Erreur: Le prénom et le nom sont requis");
        return res.status(400).json({ message: "Le prénom et le nom sont requis" });
    }
    
    if (phone && typeof phone !== 'string') {
        console.log("❌ Erreur: Le numéro de téléphone doit être une chaîne de caractères");
        return res.status(400).json({ message: "Le numéro de téléphone doit être une chaîne de caractères" });
    }
    
    if (!cluster) {
        console.log("❌ Erreur: L'ID du cluster est requis");
        return res.status(400).json({ message: "L'ID du cluster est requis" });
    }
    
    try {
        // Vérifier si un membre avec cet email existe déjà
        let existingMember = null;
        
        if (email) {
            existingMember = await Member.findOne({ email });
            if (existingMember) {
                console.log(`❌ Un membre avec l'email ${email} existe déjà`);
                
                // Vérifier si une relation existe déjà avec ce cluster
                const existingRelation = await ClientClusterRelation.findOne({
                    clientId: existingMember._id,
                    clusterId: cluster
                });
                
                if (existingRelation) {
                    if (!existingRelation.isActive) {
                        // Réactiver la relation si elle était désactivée
                        existingRelation.isActive = true;
                        await existingRelation.save();
                        return res.status(200).json({ 
                            message: "Client réactivé dans cet établissement",
                            member: existingMember,
                            relation: existingRelation
                        });
                    }
                    return res.status(409).json({ 
                        message: "Ce client est déjà associé à cet établissement",
                        memberId: existingMember._id,
                        memberInfo: {
                            firstName: existingMember.firstName,
                            lastName: existingMember.lastName,
                            email: existingMember.email,
                            phone: existingMember.phone
                        }
                    });
                }
                
                // Si le client existe mais avec un flag confirmé absent, c'est une découverte et non une confirmation
                if (!confirmed) {
                    // Renvoyer les informations du client existant et demander une confirmation
                    return res.status(428).json({
                        message: "Un client avec cet email existe déjà. S'agit-il du même client ?",
                        existingMember: {
                            id: existingMember._id,
                            firstName: existingMember.firstName,
                            lastName: existingMember.lastName,
                            email: existingMember.email,
                            phone: existingMember.phone
                        },
                        requiresConfirmation: true,
                        action: "confirm_existing_member"
                    });
                }
            }
        }
        
        // Vérifier si un membre avec ce numéro de téléphone existe déjà
        if (!existingMember && phone) {
            const existingMemberByPhone = await Member.findOne({ phone });
            if (existingMemberByPhone) {
                console.log(`❌ Un membre avec le numéro de téléphone ${phone} existe déjà`);
                
                // Vérifier si une relation existe déjà
                const existingRelation = await ClientClusterRelation.findOne({
                    clientId: existingMemberByPhone._id,
                    clusterId: cluster
                });
                
                if (existingRelation) {
                    if (!existingRelation.isActive) {
                        // Réactiver la relation si elle était désactivée
                        existingRelation.isActive = true;
                        await existingRelation.save();
                        return res.status(200).json({ 
                            message: "Client réactivé dans cet établissement",
                            member: existingMemberByPhone,
                            relation: existingRelation
                        });
                    }
                    return res.status(409).json({ 
                        message: "Ce client est déjà associé à cet établissement",
                        memberId: existingMemberByPhone._id,
                        memberInfo: {
                            firstName: existingMemberByPhone.firstName,
                            lastName: existingMemberByPhone.lastName,
                            email: existingMemberByPhone.email,
                            phone: existingMemberByPhone.phone
                        }
                    });
                }
                
                // Si le client existe mais avec un flag confirmé absent, c'est une découverte et non une confirmation
                if (!confirmed) {
                    // Renvoyer les informations du client existant et demander une confirmation
                    return res.status(428).json({
                        message: "Un client avec ce numéro de téléphone existe déjà. S'agit-il du même client ?",
                        existingMember: {
                            id: existingMemberByPhone._id,
                            firstName: existingMemberByPhone.firstName,
                            lastName: existingMemberByPhone.lastName,
                            email: existingMemberByPhone.email,
                            phone: existingMemberByPhone.phone
                        },
                        requiresConfirmation: true,
                        action: "confirm_existing_member"
                    });
                }
                
                // Si on arrive ici, c'est que l'utilisateur a confirmé qu'il s'agit du même client,
                // donc on va le réutiliser
                existingMember = existingMemberByPhone;
            }
        }
        
        // Traiter le cas où un client existant est confirmé
        if (existingMember && confirmed) {
            console.log(`✅ Réutilisation du client existant avec ID: ${existingMember._id}`);
            
            // Créer une nouvelle relation pour ce client avec le cluster actuel
            const newRelation = new ClientClusterRelation({
                clientId: existingMember._id,
                clusterId: cluster,
                preferences: preferences || '',
                joinedAt: new Date(),
                isActive: true
            });
            
            await newRelation.save();
            console.log("✅ Relation créée pour le client existant dans le nouvel établissement");
            
            return res.status(201).json({
                message: "Client existant ajouté à l'établissement",
                member: existingMember,
                relation: newRelation
            });
        }
        
        // Si on arrive ici, c'est qu'on doit créer un nouveau client
        
        // Utiliser un mot de passe par défaut si non fourni
        const defaultPasswordHash = passwordHash || 'defaultPassword';
        
        const newMember = new Member({
            firstName,
            lastName,
            email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
            phone,
            passwordHash: defaultPasswordHash,
            role: role || 'client',
            // Cluster est maintenant facultatif, car le client peut appartenir à plusieurs clusters
            // Le conserver pour la rétrocompatibilité
            cluster
        });

        console.log("✅ Tentative de sauvegarde du nouveau membre");
        const savedMember = await newMember.save();
        console.log("✅ Membre créé avec succès:", savedMember._id);
        
        // Si c'est un client, créer également une relation avec le cluster
        if (savedMember.role === 'client') {
            const newRelation = new ClientClusterRelation({
                clientId: savedMember._id,
                clusterId: cluster,
                preferences: preferences || '',
                joinedAt: new Date(),
                isActive: true
            });
            
            await newRelation.save();
            console.log("✅ Relation client-cluster créée avec succès");
            
            return res.status(201).json({
                message: "Nouveau client créé et ajouté à l'établissement",
                member: savedMember,
                relation: newRelation
            });
        }
   
        res.status(201).json({
            message: "Membre créé avec succès",
            member: savedMember
        });
    } catch (error) {
        console.log("❌ Erreur lors de la création du membre:", error.message);
        res.status(400).json({ message: error.message });
    }
}

export const getMembersByCluster = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    console.log(`🔍 Recherche des membres du cluster ${clusterId}`);
    
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'ID de cluster invalide' });
    }
    
    // Requête simple pour récupérer TOUS les membres du cluster, y compris les bannis
    // Ne pas filtrer sur le statut pour récupérer à la fois les membres actifs et bannis
    const members = await Member.find({ 
      cluster: clusterId,
      role: 'client',
    });
    
    console.log(`✅ ${members.length} membres trouvés pour le cluster ${clusterId}`);
    
    res.status(200).json(members);
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des membres: ${error.message}`);
    res.status(500).json({ message: 'Erreur lors de la récupération des membres', error: error.message });
  }
};

export const getMemberById = async (req, res) => {
    const { memberId } = req.params;  

    try {
        const member = await Member.findById(memberId);
        res.status(200).json(member);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const updateMemberSchedule = async (req, res) => {
    const { memberId } = req.params;
    const { schedule } = req.body;
  
    try {
      const member = await Member.findByIdAndUpdate(memberId, {
        $set: { schedule: schedule }
      }, { new: true });
  
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.status(200).json(member);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  

  export const getScheduleForPeriod = async (req, res) => {
    const { memberId } = req.params;
    const { startDate, duration } = req.query; // startDate=2023-01-01&duration=7 for one week
  
    try {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(duration));
  
      const schedule = await Member.findOne({
        _id: memberId,
        'schedule.date': { $gte: new Date(startDate), $lt: endDate }
      }).select('schedule.$');
  
      if (!schedule) {
        return res.status(404).json({ message: "No schedule found for this period" });
      }
      res.status(200).json(schedule);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  

  export const loginMember = async (req, res) => {
    const { email, password } = req.body;

    try {
        const member = await Member.findOne({ email });
        if (!member) {
            return res.status(404).json({ message: "No member found with this email" });
        }

        member.checkPassword(password, async (error, result) => {
            if (error) {
                return res.status(403).json({ message: error.message });
            }
            if (!result) {
                return res.status(401).json({ message: 'Invalid password or account locked.' });
            }
           
        });

         // TODO: Generate a token and send it as a response instead of memberId
            
         const tokenId = await jwt.sign({ id: member._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION })
      
      res.status(200).json({ message: "Login successful", token: tokenId});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addMemberAbsence = async (req, res) => {
  const { memberId } = req.params;
  const { startDate, endDate } = req.body;

  try {
      const member = await Member.findById(memberId);
      if (!member) {
          return res.status(404).json({ message: "Member not found" });
      }

      // Convertir les dates en objets Date
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Vérifier s'il existe un chevauchement avec les absences existantes
      const overlap = member.absences.some(absence => {
          const absStart = new Date(absence.startDate);
          const absEnd = new Date(absence.endDate);
          return (start <= absEnd && end >= absStart);
      });

      if (overlap) {
          return res.status(400).json({ message: "The requested absence period overlaps with an existing absence." });
      }

      // Vérifier si des rendez-vous sont prévus pendant cette période
      // Note: Assurez-vous que vous avez un modèle ou une méthode pour récupérer les rendez-vous d'un membre
      const appointments = await Appointment.find({
          memberId: memberId,
          date: { $gte: start, $lte: end }
      });

      if (appointments.length > 0) {
          return res.status(400).json({ message: "There are scheduled appointments during this absence period. Please reschedule or cancel them before setting the absence." });
      }

      // Ajouter la période d'absence
      member.absences.push({ startDate: start, endDate: end });
      await member.save();

      res.status(200).json({ message: "Absence added successfully", absences: member.absences });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};

export const getAllMembersByCluster = async (req, res) => {
    const { clusterId } = req.params;
    const { status } = req.query;
    
    console.log("🔍 Recherche de tous les membres pour le cluster:", clusterId, "avec le statut:", status);
    
    try {
        // Vérifier d'abord si on doit utiliser les relations many-to-many
        const relationsExist = await ClientClusterRelation.exists({ clusterId: clusterId });
        
        if (relationsExist) {
            console.log("🔄 Utilisation des relations client-cluster (many-to-many)");
            
            // Chercher les relations pour ce cluster
            const relations = await ClientClusterRelation.find({ clusterId: clusterId })
                .populate({
                    path: 'clientId',
                    select: 'firstName lastName email phone status',
                    match: status ? { status } : { status: { $nin: ['deleted', 'banned'] } } // Exclure les clients supprimés ET bannis par défaut
                })
                .sort({ updatedAt: -1 });
            
            // Filtrer les relations dont le client a été supprimé ou est null
            const validRelations = relations.filter(relation => relation.clientId !== null);
            
            // Transformer la réponse pour inclure les informations du client directement
            const formattedRelations = validRelations.map(relation => {
                const client = relation.clientId;
                return {
                    _id: relation._id,
                    clientId: relation.clientId._id,
                    firstName: client.firstName,
                    lastName: client.lastName,
                    email: client.email,
                    phone: client.phone,
                    status: client.status,
                    relationId: relation._id,
                    joinedAt: relation.joinedAt,
                    lastVisit: relation.lastVisit,
                    totalSpent: relation.totalSpent,
                    visitsCount: relation.visitsCount,
                    preferences: relation.preferences || client.notes
                };
            });
            
            console.log(`✅ ${formattedRelations.length} clients trouvés via les relations`);
            return res.status(200).json(formattedRelations);
        }
        
        const query = { cluster: clusterId };
        if (status) {
            query.status = status;
        } else {
            // Par défaut, ne pas inclure les clients supprimés ou bannis
            query.status = { $nin: ['deleted', 'banned'] };
        }
        
        // Chercher dans la collection members
        const members = await Member.find(query);
        
        // Chercher dans la collection users
        const users = await mongoose.connection.db.collection('users').find({
            cluster: new mongoose.Types.ObjectId(clusterId),
            role: 'client',
            ...(status ? { status } : { status: { $nin: ['deleted', 'banned'] } })
        }).toArray();
        
        // Chercher dans la collection clients
        const clients = await mongoose.connection.db.collection('clients').find({
            cluster: new mongoose.Types.ObjectId(clusterId),
            ...(status ? { status } : { status: { $nin: ['deleted', 'banned'] } })
        }).toArray();
        
        // Fusionner les résultats
        const allMembers = [...members, ...users, ...clients];
        console.log(`✅ ${allMembers.length} membres trouvés au total`);
        
        res.status(200).json(allMembers);
    } catch (error) {
        console.error("❌ Erreur lors de la recherche des membres:", error);
        res.status(404).json({ message: error.message });
    }
};

export const createAppointment = async (req, res) => {
  try {
    const { memberId, serviceId, startTime, clusterId, employeeId, peopleCount } = req.body;
    
    // Vérifier que tous les champs requis sont présents
    if (!memberId || !serviceId || !startTime || !clusterId) {
      return res.status(400).json({ message: 'Tous les champs requis doivent être renseignés' });
    }

    // Vérifier si le membre existe
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ message: 'Membre non trouvé' });
    }
    
    // Vérifier si le membre est banni globalement
    if (member.status === 'banned') {
      console.log(`🚫 Tentative de rendez-vous pour membre banni globalement: ${memberId}`);
      return res.status(403).json({ 
        message: 'Ce membre est banni et ne peut pas prendre de rendez-vous',
        memberStatus: 'banned'
      });
    }

    // Vérifier si le client est banni spécifiquement dans ce cluster
    const clientClusterRelation = await mongoose.model('ClientClusterRelation').findOne({
      clientId: memberId,
      clusterId: clusterId
    });
    
    if (clientClusterRelation && 
        (!clientClusterRelation.isActive && 
         clientClusterRelation.preferences && 
         clientClusterRelation.preferences.banned)) {
      console.log(`🚫 Tentative de rendez-vous pour membre banni dans ce cluster: ${memberId}`);
      return res.status(403).json({ 
        message: 'Ce membre est banni dans cet établissement et ne peut pas prendre de rendez-vous',
        memberStatus: 'banned_in_cluster'
      });
    }

    // Vérifier si le service existe
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Service non trouvé' });
    }

    // Vérifier si le cluster existe
    const cluster = await Cluster.findById(clusterId);
    if (!cluster) {
      return res.status(404).json({ message: 'Cluster non trouvé' });
    }
    
    // Vérifier si le client a une relation avec ce cluster
    const hasRelation = await ClientClusterRelation.findOne({ 
      clientId: memberId, 
      clusterId: clusterId 
    });
    
    // Si le membre est un client et qu'il n'a pas de relation avec ce cluster, créer une relation
    if (member.role === 'client' && !hasRelation) {
      const newRelation = new ClientClusterRelation({
        clientId: memberId,
        clusterId: clusterId,
        joinedAt: new Date()
      });
      
      await newRelation.save();
      console.log(`✅ Relation client-cluster créée automatiquement lors de la prise de rendez-vous`);
    }

    // Vérifier les conflits si un employé est spécifié
    if (employeeId) {
      const employee = await User.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: 'Employé non trouvé' });
      }

      // Vérifier s'il y a des rendez-vous existants pour cet employé à ce moment
      const conflictingAppointments = await Appointment.find({
        employee: employeeId,
        startTime: { $lte: new Date(startTime) },
        endTime: { $gte: new Date(startTime) },
        status: { $nin: ['cancelled', 'completed'] }
      });

      if (conflictingAppointments.length > 0) {
        return res.status(409).json({
          message: 'Cet employé a déjà un rendez-vous prévu à ce moment',
          conflicts: conflictingAppointments
        });
      }
    }

    // Calcul de la date de fin basée sur la durée du service
    const startTimeDate = new Date(startTime);
    const endTimeDate = new Date(startTimeDate.getTime() + service.duration * 60000);

    // Créer le nouveau rendez-vous
    const newAppointment = new Appointment({
      member: memberId,
      service: serviceId,
      cluster: clusterId,
      startTime: startTimeDate,
      endTime: endTimeDate,
      status: 'scheduled',
      peopleCount: peopleCount || 1
    });

    // Assigner un employé si spécifié
    if (employeeId) {
      newAppointment.employee = employeeId;
    }

    // Sauvegarder le rendez-vous
    await newAppointment.save();

    // Récupérer le rendez-vous avec les détails du membre, du service et de l'employé
    const populatedAppointment = await Appointment.findById(newAppointment._id)
      .populate('member', 'firstName lastName email')
      .populate('service', 'name price duration')
      .populate('employee', 'firstName lastName')
      .populate('cluster', 'name');

    res.status(201).json({
      message: 'Rendez-vous créé avec succès',
      appointment: populatedAppointment
    });
  } catch (error) {
    console.error('Erreur lors de la création du rendez-vous:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// Supprimer un client (soft delete)
export const deleteMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    
    console.log(`🔍 Tentative de suppression du membre ${memberId}`);
    
    // Vérifier si l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      console.log(`❌ ID invalide: ${memberId}`);
      return res.status(400).json({ message: 'ID de membre invalide' });
    }
    
    // Chercher le membre dans toutes les collections
    let member = await Member.findById(memberId);
    
    if (!member) {
      // Essayer dans la collection users
      member = await mongoose.connection.db.collection('users').findOne({ 
        _id: new mongoose.Types.ObjectId(memberId),
        role: 'client'
      });
    }
    
    if (!member) {
      // Essayer dans la collection clients
      member = await mongoose.connection.db.collection('clients').findOne({ 
        _id: new mongoose.Types.ObjectId(memberId)
      });
    }
    
    if (!member) {
      console.log(`❌ Membre non trouvé dans aucune collection: ${memberId}`);
      return res.status(404).json({ message: 'Membre non trouvé' });
    }

    console.log(`✅ Membre trouvé: ${member.firstName} ${member.lastName}`);

    // Vérifier les rendez-vous futurs
    const futureAppointments = await Appointment.find({
      member: memberId,
      startTime: { $gte: new Date() }
    }).populate('service', 'name');

    console.log(`📅 Nombre de rendez-vous futurs trouvés: ${futureAppointments.length}`);

    if (futureAppointments.length > 0) {
      console.log(`⚠️ Rendez-vous à venir trouvés pour le membre ${memberId}`);
      return res.status(400).json({
        message: 'Impossible de supprimer ce client car il a des rendez-vous à venir',
        appointments: futureAppointments.map(app => ({
          id: app._id,
          date: app.startTime,
          service: app.service ? app.service.name : 'Service inconnu'
        }))
      });
    }

    // Anonymiser les données
    const anonymizedData = {
      firstName: `Client_${member._id.toString().substring(0, 6)}`,
      lastName: 'Supprimé',
      email: `deleted_${member._id}@temgo.com`,
      phone: `deleted_${member._id}`
    };

    // Mettre à jour le membre dans la collection appropriée
    if (member instanceof Member) {
      member.status = 'deleted';
      member.deletedAt = new Date();
      member.anonymizedData = anonymizedData;
      member.firstName = anonymizedData.firstName;
      member.lastName = anonymizedData.lastName;
      member.email = anonymizedData.email;
      member.phone = anonymizedData.phone;
      await member.save();
    } else {
      // Pour les autres collections, utiliser updateOne avec le nom de la collection
      const collectionName = member.constructor.modelName === 'User' ? 'users' : 'clients';
      await mongoose.connection.db.collection(collectionName).updateOne(
        { _id: member._id },
        {
          $set: {
            status: 'deleted',
            deletedAt: new Date(),
            anonymizedData,
            firstName: anonymizedData.firstName,
            lastName: anonymizedData.lastName,
            email: anonymizedData.email,
            phone: anonymizedData.phone
          }
        }
      );
    }

    console.log(`✅ Membre ${memberId} supprimé avec succès`);

    res.status(200).json({
      message: 'Client supprimé avec succès',
      member: {
        id: member._id,
        status: 'deleted',
        deletedAt: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du client:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du client' });
  }
};

// Récupérer les clients supprimés d'un cluster
export const getDeletedClientsByCluster = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    console.log('🔍 getDeletedClientsByCluster - Request params:', { clusterId });
    
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'ID d\'établissement invalide' });
    }

    console.time('getDeletedClientsByCluster');

    // Récupérer les membres supprimés liés à ce cluster
    const deletedMembers = await Member.find({
      cluster: new mongoose.Types.ObjectId(clusterId),
      status: 'deleted',
      role: 'client'
    }).select('_id firstName lastName email phone status deletedAt anonymizedData');

    console.timeEnd('getDeletedClientsByCluster');
    console.log(`✅ Récupéré ${deletedMembers.length} clients supprimés dans le cluster ${clusterId}`);

    // Si nous avons trouvé des clients supprimés, les retourner
    if (deletedMembers.length > 0) {
      // Détails des clients supprimés pour débogage
      deletedMembers.forEach(member => {
        console.log(`- Client supprimé: ${member.firstName} ${member.lastName} (${member._id})`);
        console.log(`  Email: ${member.email}, Tél: ${member.phone}`);
        console.log(`  Supprimé le: ${member.deletedAt}`);
      });
    } else {
      console.log('✅ Aucun client supprimé trouvé dans ce cluster');
    }

    return res.status(200).json(deletedMembers);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des clients supprimés:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};