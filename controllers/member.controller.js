import Member from "../models/member.model.js";
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
    const { firstName, lastName, email, phone, passwordHash, role, cluster } = req.body;
    
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
        if (email) {
            const existingMember = await Member.findOne({ email });
            if (existingMember) {
                console.log(`❌ Un membre avec l'email ${email} existe déjà`);
                return res.status(400).json({ message: `Un membre avec l'email ${email} existe déjà` });
            }
        }
        
        // Vérifier si un membre avec ce numéro de téléphone existe déjà
        if (phone) {
            const existingMemberByPhone = await Member.findOne({ phone });
            if (existingMemberByPhone) {
                console.log(`❌ Un membre avec le numéro de téléphone ${phone} existe déjà`);
                return res.status(400).json({ message: `Un membre avec le numéro de téléphone ${phone} existe déjà` });
            }
        }
        
        // Utiliser un mot de passe par défaut si non fourni
        const defaultPasswordHash = passwordHash || 'defaultPassword';
        
        const newMember = new Member({
            firstName,
            lastName,
            email: email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
            phone,
            passwordHash: defaultPasswordHash,
            role: role || 'client',
            cluster
        });

        console.log("✅ Tentative de sauvegarde du nouveau membre");
        const savedMember = await newMember.save();
        console.log("✅ Membre créé avec succès:", savedMember._id);
   
        res.status(201).json({savedMember});
    } catch (error) {
        console.log("❌ Erreur lors de la création du membre:", error.message);
        res.status(400).json({ message: error.message });
    }
}

export const getMembersByCluster = async (req, res) => {
    const { clusterId } = req.params; 
    console.log("clusterId", clusterId);
    try {
        const members = await Member.find({ cluster: clusterId });
        res.status(200).json(members);
    } catch (error) {
        res.status(404).json({ message: error.message });
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
    console.log("Recherche de tous les membres pour le cluster:", clusterId);
    
    try {
        // Vérifier que l'ID du cluster est valide
        if (!mongoose.Types.ObjectId.isValid(clusterId)) {
            return res.status(400).json({ message: "ID de cluster invalide" });
        }
        
        const clusterObjectId = new mongoose.Types.ObjectId(clusterId);
        
        // Récupérer les membres depuis la collection 'members'
        const members = await Member.find({ cluster: clusterObjectId });
        console.log(`Nombre de membres trouvés dans la collection members: ${members.length}`);
        
        // Récupérer les membres depuis la collection 'users' qui ont le rôle 'client'
        const userClients = await mongoose.connection.db.collection('users').find({ 
            cluster: clusterObjectId,
            role: 'client'
        }).toArray();
        console.log(`Nombre de membres trouvés dans la collection users: ${userClients.length}`);
        
        // Récupérer les membres depuis la collection 'clients'
        const clientCollection = await mongoose.connection.db.collection('clients').find({ 
            cluster: clusterObjectId
        }).toArray();
        console.log(`Nombre de membres trouvés dans la collection clients: ${clientCollection.length}`);
        
        // Combiner les résultats en évitant les doublons
        let combinedMembers = [...members];
        
        // Ajouter les clients de la collection users s'ils n'existent pas déjà
        for (const client of userClients) {
            const exists = combinedMembers.some(member => 
                (member.email && client.email && member.email === client.email) || 
                (member._id && client._id && member._id.toString() === client._id.toString())
            );
            if (!exists) {
                combinedMembers.push(client);
            }
        }
        
        // Ajouter les clients de la collection clients s'ils n'existent pas déjà
        for (const client of clientCollection) {
            const exists = combinedMembers.some(member => 
                (member.email && client.email && member.email === client.email) || 
                (member._id && client._id && member._id.toString() === client._id.toString())
            );
            if (!exists) {
                combinedMembers.push(client);
            }
        }
        
        console.log(`Nombre total de membres après fusion: ${combinedMembers.length}`);
        
        res.status(200).json(combinedMembers);
    } catch (error) {
        console.error("Erreur lors de la récupération des membres:", error);
        res.status(500).json({ message: error.message });
    }
};

export const createAppointment = async (req, res) => {
  try {
    const { memberId, serviceId, startTime, clusterId, employeeId, peopleCount } = req.body;
    
    // Vérifier que tous les champs requis sont présents
    if (!memberId || !serviceId || !startTime || !clusterId) {
      return res.status(400).json({ message: 'Tous les champs requis doivent être renseignés' });
    }

    // Vérifier si le membre existe et s'il n'est pas banni
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ message: 'Membre non trouvé' });
    }
    
    // Vérifier si le membre est banni
    if (member.status === 'banned') {
      return res.status(403).json({ 
        message: 'Ce membre est banni et ne peut pas prendre de rendez-vous',
        memberStatus: 'banned'
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
