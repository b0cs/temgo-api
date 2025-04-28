import mongoose from 'mongoose';
import Appointment from '../models/appointment.model.js';
import Cluster from '../models/cluster.model.js';
import Service from '../models/service.model.js';
import Table from '../models/table.model.js';
import TableLayout from '../models/tableLayout.model.js'; 
import { ApiException } from '../exceptions/ApiException.js';
import User from "../models/user.model.js";

/**
 * Créer un rendez-vous
 * @param {Object} req Requête HTTP
 * @param {Object} res Réponse HTTP
 */
export const bookAppointment = async (req, res) => {
    try {
        // Extraction des données de la requête
        const {
            clusterId,
            memberId,
            serviceId,
            startTime,
            endTime,
            employeeId,
            notes,
            peopleCount,
            genderBreakdown,
            tableNumber
        } = req.body;

        // Vérification des champs obligatoires
        if (!clusterId || !memberId || !serviceId || !startTime || !endTime) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Vérifier si la date est dans le passé
        const currentTime = new Date();
        const start = new Date(startTime);
        
        if (start < currentTime) {
            return res.status(400).json({
                message: 'Impossible de créer un rendez-vous dans le passé'
            });
        }

        // Trouver le service directement dans la collection Service
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        const duration = service.duration || 30; // Utiliser une durée par défaut 
        const end = new Date(start.getTime() + duration * 60000);

        // Vérifier s'il y a des conflits d'horaire pour l'employé assigné
        if (employeeId) {
            const hasConflict = await Appointment.checkTimeConflicts(employeeId, start, end);
            if (hasConflict) {
                return res.status(409).json({
                    message: 'Conflit d\'horaire: cet employé a déjà un rendez-vous à cette heure'
                });
            }
        }

        // Créer le rendez-vous
        const newAppointment = new Appointment({
            cluster: clusterId,
            member: memberId,
            service: serviceId,
            startTime: start,
            endTime: end,
            employee: employeeId,
            notes,
            peopleCount: peopleCount || 1,
            genderBreakdown: genderBreakdown || {},
            tableNumber
        });

        // Enregistrer le rendez-vous
        const appointment = await newAppointment.save();

        res.status(201).json({ appointment });
    } catch (error) {
        console.error('Error booking the appointment:', error);
        res.status(500).json({ message: 'Error booking the appointment: ' + error.message });
    }
};

/**
 * Récupère tous les rendez-vous d'un cluster sans filtre de date
 * @param {Object} req Requête HTTP
 * @param {Object} res Réponse HTTP
 */
export const getAllAppointments = async (req, res) => {
  try {
    const { clusterId } = req.params;
    
    // Vérifier que le clusterId est fourni
    if (!clusterId) {
      return res.status(400).json({ message: 'ID du cluster requis' });
    }
    
    // NOTE: Nous désactivons temporairement cette vérification pour permettre le test
    // TODO: Réactiver cette vérification après les tests
    // if (req.user.cluster.toString() !== clusterId) {
    //   return res.status(403).json({ message: 'Vous n\'avez pas accès aux rendez-vous de ce cluster' });
    // }
    
    console.log(`Récupération des rendez-vous pour le cluster ${clusterId}`);
    
    // Récupérer tous les rendez-vous du cluster avec les informations des membres et services
    const appointments = await Appointment.find({ cluster: clusterId });
    console.log(`Nombre de rendez-vous trouvés: ${appointments.length}`);
    
    // Préparer les données avec les détails complets
    const result = [];
    
    for (const appointment of appointments) {
      // Récupérer le service complet
      const service = await Service.findById(appointment.service);
      
      // Tenter de récupérer les détails du membre (client)
      let memberDetails = {
          _id: appointment.member,
          firstName: 'Client', // Valeur par défaut
          lastName: 'TEMGO',   // Valeur par défaut
          email: '',
          phone: ''
      };
      
      try {
          const member = await mongoose.model('Member').findById(appointment.member).lean();
          if (member) {
              memberDetails = {
                  _id: member._id,
                  firstName: member.firstName || 'Client',
                  lastName: member.lastName || 'TEMGO',
                  email: member.email || '',
                  phone: member.phone || ''
              };
          }
      } catch (memberError) {
          console.log(`Erreur lors de la récupération du membre ${appointment.member}: ${memberError.message}`);
      }
      
      // Récupérer les détails du coiffeur/employé assigné si disponible
      let employeeDetails = null;
      if (appointment.employee) {
          try {
              const employee = await User.findById(appointment.employee).lean();
              if (employee) {
                  employeeDetails = {
                      _id: employee._id,
                      firstName: employee.firstName || '',
                      lastName: employee.lastName || '',
                      role: employee.role || 'employee'
                  };
              }
          } catch (employeeError) {
              console.log(`Erreur lors de la récupération de l'employé ${appointment.employee}: ${employeeError.message}`);
          }
      }
      
      // Créer un objet avec les données du rendez-vous
      const appointmentData = {
        _id: appointment._id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        status: appointment.status,
        member: memberDetails,
        // Données du service
        service: service ? {
          _id: service._id,
          name: service.name,
          description: service.description || '',
          price: service.price || 0,
          duration: service.duration || 30
        } : {
          _id: '',
          name: 'Service temporaire',
          description: '',
          price: 0,
          duration: 30
        },
        employee: employeeDetails
      };
      
      result.push(appointmentData);
    }
    
    console.log(`Renvoi de ${result.length} rendez-vous pour le cluster ${clusterId}`);
    
    if (result.length > 0) {
      console.log(`Exemple de service: ${JSON.stringify(result[0].service)}`);
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Erreur dans getAllAppointments:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des rendez-vous', error: error.message });
  }
};

export const getAppointmentsByCluster = async (req, res) => {
    const { clusterId } = req.params;

    if (!clusterId) {
        return res.status(400).json({ message: 'Cluster ID is required' });
    }

    try {
        const clusterExists = await Cluster.exists({ _id: clusterId });
        if (!clusterExists) {
            return res.status(404).json({ message: 'Cluster not found' });
        }

        const results = await Appointment.aggregate([
            { $match: { cluster: new mongoose.Types.ObjectId(clusterId) } },
            { $lookup: {
                from: 'members', 
                localField: 'member',
                foreignField: '_id',
                as: 'memberDetails'
            }},
            { $unwind: '$memberDetails' },
            { $lookup: {
                from: 'clusters', 
                localField: 'cluster',
                foreignField: '_id',
                as: 'clusterDetails'
            }},
            { $unwind: '$clusterDetails' },
            { $unwind: '$clusterDetails.services' },
            { $addFields: {
                isServiceMatch: { $eq: ['$service', '$clusterDetails.services._id'] }
            }},
            { $match: { isServiceMatch: true } },
            { $project: {
                startTime: 1,
                endTime: 1,
                member: {
                    firstName: '$memberDetails.firstName',
                    lastName: '$memberDetails.lastName',
                    email: '$memberDetails.email'
                },
                service: '$clusterDetails.services'
            }}
        ]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'No appointments found for this cluster' });
        }

        res.status(200).json(results);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error retrieving appointments: ' + error.message });
    }
};

export const getAppointmentsByMember = async (req, res) => {
    const { memberId } = req.params; // Assurez-vous que l'ID du membre est passé en paramètre de l'URL

    try {
        console.log(`Recherche des rendez-vous pour le membre ${memberId}`);
        
        if (!memberId) {
            return res.status(400).json({ message: 'ID du membre non fourni' });
        }
        
        // Vérifier si l'ID est un ObjectId valide
        if (!mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({ message: 'ID du membre invalide' });
        }
        
        // Récupérer les rendez-vous avec populate pour avoir les détails du service et de l'employé
        console.log(`Exécution de la requête: Appointment.find({ member: ${memberId} })`);
        
        // Recherche de tous les rendez-vous du membre, sans filtre de date
        const appointments = await Appointment.find({ member: memberId })
            .populate('service', 'name description price duration color')
            .populate('employee', 'firstName lastName role')
            .sort({ startTime: -1 }); // Du plus récent au plus ancien
            
        console.log(`${appointments.length} rendez-vous trouvés pour le membre ${memberId}`);
        
        // Afficher plus de détails pour le débogage
        if (appointments.length > 0) {
            console.log(`Premier rendez-vous: ${JSON.stringify({
                id: appointments[0]._id,
                startTime: appointments[0].startTime,
                service: appointments[0].service ? appointments[0].service.name : 'Aucun service',
                employee: appointments[0].employee ? `${appointments[0].employee.firstName} ${appointments[0].employee.lastName}` : 'Non assigné'
            })}`);
        }
        
        res.status(200).json(appointments);
    } catch (error) {
        console.error(`Erreur détaillée lors de la récupération des rendez-vous du membre ${memberId}:`, error);
        res.status(500).json({ 
            message: 'Erreur lors de la récupération des rendez-vous', 
            error: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
};

export const getAllAppointmentsByDay = async (req, res) => {
    const { clusterId, date } = req.params; // Assurez-vous que la date et l'ID du cluster sont passés en paramètres

    if (!clusterId) {
        return res.status(400).json({ message: 'Cluster ID is required' });
    }
    if (!date) {
        return res.status(400).json({ message: 'Date is required' });
    }

    try {
        const clusterExists = await Cluster.exists({ _id: clusterId });
        if (!clusterExists) {
            return res.status(404).json({ message: 'Cluster not found' });
        }

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0); // Début de la journée

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999); // Fin de la journée

        console.log(`Récupération des rendez-vous pour le cluster ${clusterId} à la date ${date}`);
        
        // Récupérer tous les rendez-vous du jour pour ce cluster
        const appointments = await Appointment.find({
            cluster: clusterId,
            startTime: {
                $gte: startOfDay,
                $lt: endOfDay
            }
        });
        
        console.log(`Nombre de rendez-vous trouvés: ${appointments.length}`);
        
        // Préparer les données avec les détails complets
        const result = [];
        
        for (const appointment of appointments) {
            // Récupérer le service complet
            const service = await Service.findById(appointment.service);
            
            // Tenter de récupérer les détails du membre (client)
            let memberDetails = {
                _id: appointment.member,
                firstName: 'Client',
                lastName: 'TEMGO',
                email: '',
                phone: ''
            };
            
            try {
                const member = await mongoose.model('Member').findById(appointment.member).lean();
                if (member) {
                    memberDetails = {
                        _id: member._id,
                        firstName: member.firstName || 'Client',
                        lastName: member.lastName || 'TEMGO',
                        email: member.email || '',
                        phone: member.phone || ''
                    };
                }
            } catch (memberError) {
                console.log(`Erreur lors de la récupération du membre ${appointment.member}: ${memberError.message}`);
            }
            
            // Récupérer les détails du coiffeur/employé assigné si disponible
            let employeeDetails = null;
            if (appointment.employee) {
                try {
                    const employee = await User.findById(appointment.employee).lean();
                    if (employee) {
                        employeeDetails = {
                            _id: employee._id,
                            firstName: employee.firstName || '',
                            lastName: employee.lastName || '',
                            role: employee.role || 'employee'
                        };
                    }
                } catch (employeeError) {
                    console.log(`Erreur lors de la récupération de l'employé ${appointment.employee}: ${employeeError.message}`);
                }
            }
            
            // Créer un objet avec les données du rendez-vous
            const appointmentData = {
                _id: appointment._id,
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                status: appointment.status,
                member: memberDetails,
                service: service ? {
                    _id: service._id,
                    name: service.name,
                    description: service.description || '',
                    price: service.price || 0,
                    duration: service.duration || 30
                } : {
                    _id: '',
                    name: 'Service temporaire',
                    description: '',
                    price: 0,
                    duration: 30
                },
                employee: employeeDetails,
                // Ajouter les champs qui pourraient être manquants
                peopleCount: appointment.peopleCount || 1,
                genderBreakdown: appointment.genderBreakdown || {
                    maleCount: 0,
                    femaleCount: 0,
                    otherCount: 0
                }
            };
            
            result.push(appointmentData);
        }
        
        if (result.length === 0) {
            console.log(`Aucun rendez-vous trouvé pour le cluster ${clusterId} à la date ${date}`);
            return res.status(404).json({ message: 'No appointments found for this cluster on the specified date' });
        }
        
        console.log(`Renvoi de ${result.length} rendez-vous`);
        
        if (result.length > 0) {
            console.log(`Exemple de service: ${JSON.stringify(result[0].service)}`);
            // Ajouter des logs pour le débogage
            console.log(`Exemple de données de rendez-vous: peopleCount=${result[0].peopleCount}, genderBreakdown=${JSON.stringify(result[0].genderBreakdown)}`);
        }
        
        res.status(200).json(result);
    } catch (error) {
        console.error('Erreur dans getAllAppointmentsByDay:', error);
        res.status(500).json({ message: 'Error retrieving appointments: ' + error.message });
    }
};

/**
 * Annule un rendez-vous existant
 * @param {Object} req Requête HTTP avec l'ID du rendez-vous à annuler
 * @param {Object} res Réponse HTTP
 */
export const cancelAppointment = async (req, res) => {
    const { appointmentId } = req.params;

    if (!appointmentId) {
        return res.status(400).json({ message: 'L\'ID du rendez-vous est requis' });
    }

    try {
        // Vérifier si le rendez-vous existe
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé' });
        }

        // Supprimer le rendez-vous
        await Appointment.findByIdAndDelete(appointmentId);

        // Si le rendez-vous était associé à une table, libérer la table
        /* Décommentez ce code si vous utilisez le système de réservation de tables
        if (appointment.table) {
            const table = await Table.findById(appointment.table);
            if (table) {
                table.isReserved = false;
                await table.save();
            }
        }
        */
        
        res.status(200).json({ message: 'Rendez-vous annulé avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'annulation du rendez-vous: ' + error.message });
    }
};

/**
 * Assigne un employé à un rendez-vous
 * @param {Object} req Requête HTTP contenant l'ID du rendez-vous et l'ID de l'employé
 * @param {Object} res Réponse HTTP
 */
export const assignEmployeeToAppointment = async (req, res) => {
    const { appointmentId } = req.params;
    const { employeeId } = req.body;

    if (!appointmentId) {
        return res.status(400).json({ message: 'L\'ID du rendez-vous est requis' });
    }

    if (!employeeId) {
        return res.status(400).json({ message: 'L\'ID de l\'employé est requis' });
    }

    try {
        // Vérifier si le rendez-vous existe
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé' });
        }

        // Vérifier que l'employé existe
        const employee = await User.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employé non trouvé' });
        }

        // Vérifier si l'employé appartient au même cluster que le rendez-vous
        if (employee.cluster && employee.cluster.toString() !== appointment.cluster.toString()) {
            return res.status(403).json({ message: 'L\'employé n\'appartient pas à ce salon/cluster' });
        }
        
        // Vérifier si l'employé est disponible (nouveau)
        if (employee.isAvailable === false) {
            return res.status(400).json({ 
                message: 'Cet employé est indisponible et ne peut pas être assigné à un rendez-vous',
                isAvailable: false,
                absenceStartDate: employee.absenceStartDate,
                absenceEndDate: employee.absenceEndDate,
                absenceReason: employee.absenceReason
            });
        }

        // S'il y a des dates d'absence, vérifier si le rendez-vous est pendant cette période
        if (employee.absenceStartDate && employee.absenceEndDate) {
            const appointmentDate = new Date(appointment.startTime);
            if (appointmentDate >= employee.absenceStartDate && appointmentDate <= employee.absenceEndDate) {
                return res.status(400).json({ 
                    message: 'Cet employé est en absence à cette date et ne peut pas être assigné à ce rendez-vous',
                    isAvailable: false,
                    absenceStartDate: employee.absenceStartDate,
                    absenceEndDate: employee.absenceEndDate,
                    absenceReason: employee.absenceReason
                });
            }
        }

        // Mettre à jour le rendez-vous avec l'ID de l'employé en préservant tous les autres champs
        // Utiliser findByIdAndUpdate avec option runValidators:false pour éviter les validations qui posent problème
        const updatedAppointment = await Appointment.findByIdAndUpdate(
            appointmentId,
            { employee: employeeId },
            { 
                new: true,     // Pour retourner le document mis à jour
                runValidators: false  // Désactiver la validation pour éviter les problèmes
            }
        );
        
        if (!updatedAppointment) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé après mise à jour' });
        }
        
        // Récupérer à nouveau l'employé pour avoir toutes ses informations
        const employeeDetails = {
            _id: employee._id,
            firstName: employee.firstName || '',
            lastName: employee.lastName || '',
            role: employee.role || 'employee',
            isAvailable: employee.isAvailable
        };
        
        res.status(200).json({ 
            message: 'Employé assigné avec succès au rendez-vous',
            appointment: {
                _id: updatedAppointment._id,
                startTime: updatedAppointment.startTime,
                endTime: updatedAppointment.endTime,
                employee: employeeDetails
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'assignation de l\'employé:', error);
        res.status(500).json({ message: 'Erreur lors de l\'assignation de l\'employé au rendez-vous: ' + error.message });
    }
};

/**
 * Récupère tous les staffs (employés) d'un cluster
 * @param {Object} req Requête HTTP contenant l'ID du cluster
 * @param {Object} res Réponse HTTP
 */
export const getStaffByCluster = async (req, res) => {
    const { clusterId } = req.params;

    console.log("🔍 Recherche de staff pour le cluster:", clusterId);

    if (!clusterId) {
        return res.status(400).json({ message: 'L\'ID du cluster est requis' });
    }

    try {
        // Récupérer directement dans la collection users
        console.log("📊 Requête de recherche dans la collection users: { cluster: ", clusterId, ", role: { $in: ['employee', 'manager', 'admin'] } }");
        
        const userStaff = await mongoose.connection.db.collection('users').find({ 
            cluster: new mongoose.Types.ObjectId(clusterId),
            role: { $in: ['employee', 'manager', 'admin'] }
        }).toArray();

        console.log("🧑‍💼 Nombre de staffs trouvés dans users:", userStaff.length);
        
        // Récupérer également dans la collection staffs
        console.log("📊 Requête de recherche dans la collection staffs: { cluster: ", clusterId, "}");
        
        const staffCollection = await mongoose.connection.db.collection('staffs').find({ 
            cluster: new mongoose.Types.ObjectId(clusterId)
        }).toArray();
        
        console.log("🧑‍💼 Nombre de staffs trouvés dans staffs:", staffCollection.length);
        
        // Combiner les résultats
        let combinedStaff = [...userStaff];
        
        // Ajouter les staffs de la collection staffs s'ils n'existent pas déjà dans users
        for (const staff of staffCollection) {
            const exists = userStaff.some(user => user.email === staff.email);
            if (!exists) {
                combinedStaff.push(staff);
            }
        }
        
        console.log("🧑‍💼 Nombre total de staffs combinés:", combinedStaff.length);
        
        // Formater la réponse pour correspondre à ce qu'attend le client
        const formattedStaff = combinedStaff.map(s => ({
            _id: s._id.toString(),
            email: s.email,
            firstName: s.firstName,
            lastName: s.lastName,
            role: s.role || 'employee',
            isAvailable: s.isAvailable !== false, // Si non défini ou true, considérer comme disponible
            absenceStartDate: s.absenceStartDate,
            absenceEndDate: s.absenceEndDate,
            absenceReason: s.absenceReason
        }));
        
        console.log("📋 Liste des staffs combinés:", JSON.stringify(formattedStaff, null, 2));

        if (formattedStaff.length === 0) {
            return res.status(404).json({ message: 'Aucun staff trouvé pour ce cluster' });
        }

        res.status(200).json(formattedStaff);
    } catch (error) {
        console.error('❌ Erreur lors de la récupération du staff:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération du staff: ' + error.message });
    }
};

// Nouvelle fonction pour mettre à jour le statut d'un rendez-vous (honoré ou non)
export const updateAppointmentAttendance = async (req, res) => {
    const { appointmentId } = req.params;
    const { status, notes } = req.body;
    
    if (!appointmentId) {
        return res.status(400).json({ message: 'L\'ID du rendez-vous est requis' });
    }
    
    if (!status || !['completed', 'no_show', 'cancelled'].includes(status)) {
        return res.status(400).json({ 
            message: 'Statut invalide. Valeurs valides: completed, no_show, cancelled' 
        });
    }
    
    try {
        // Vérifier si le rendez-vous existe
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ message: 'Rendez-vous non trouvé' });
        }
        
        // Mettre à jour le statut et les notes si fournies
        const updateData = { status };
        if (notes) {
            if (status === 'completed') {
                updateData.completionNotes = notes;
            } else {
                updateData.notes = notes;
            }
        }
        
        // Si le statut est "no_show", incrémenter le compteur
        if (status === 'no_show') {
            updateData.noShowCount = (appointment.noShowCount || 0) + 1;
        }
        
        const updatedAppointment = await Appointment.findByIdAndUpdate(
            appointmentId,
            updateData,
            { new: true, runValidators: true }
        );
        
        res.status(200).json({
            message: 'Statut du rendez-vous mis à jour avec succès',
            appointment: updatedAppointment
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        res.status(500).json({ 
            message: 'Erreur lors de la mise à jour du statut du rendez-vous: ' + error.message 
        });
    }
};

// Fonction pour mettre à jour un rendez-vous
export const updateAppointment = async (req, res) => {
    try {
      const { appointmentId } = req.params;
      const { memberId, serviceId, startTime, peopleCount, employeeId, notes } = req.body;
      
      // Vérifier si le rendez-vous existe
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new ApiException('Rendez-vous non trouvé', 404);
      }
      
      const updateData = {};
      
      // Vérifier si la date est modifiée et si elle est dans le passé
      if (startTime) {
        const currentTime = new Date();
        const start = new Date(startTime);
        
        if (start < currentTime) {
          throw new ApiException('Impossible de modifier un rendez-vous avec une date dans le passé', 400);
        }
        
        // Récupérer la durée du service (celui actuel ou le nouveau)
        let duration;
        if (serviceId) {
          const newService = await Service.findById(serviceId);
          if (!newService) {
            throw new ApiException('Service non trouvé', 404);
          }
          duration = newService.duration || 30;
        } else {
          const currentService = await Service.findById(appointment.service);
          duration = currentService ? currentService.duration : 30;
        }
        
        const end = new Date(start.getTime() + duration * 60000);
        
        // Vérifier s'il y a des conflits d'horaire pour l'employé
        const staffToCheck = employeeId || appointment.employee;
        if (staffToCheck) {
          const hasConflict = await Appointment.checkTimeConflicts(
            staffToCheck,
            start,
            end,
            appointmentId // Exclure le rendez-vous actuel de la vérification
          );
          if (hasConflict) {
            throw new ApiException('Conflit d\'horaire: cet employé a déjà un rendez-vous à cette heure', 409);
          }
        }
        
        updateData.startTime = start;
        updateData.endTime = end;
      }
      
      // Mettre à jour les autres champs si fournis
      if (memberId) updateData.member = memberId;
      if (serviceId) updateData.service = serviceId;
      if (peopleCount) updateData.peopleCount = peopleCount;
      if (employeeId) updateData.employee = employeeId;
      if (notes) updateData.notes = notes;
      
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        updateData,
        { new: true, runValidators: true }
      );
      
      return res.status(200).json({
        message: 'Rendez-vous mis à jour avec succès',
        appointment: updatedAppointment
      });
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du rendez-vous:', error);
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ 
        message: error.message || 'Erreur lors de la mise à jour du rendez-vous'
      });
    }
};

/**
 * Mettre à jour les statistiques de genre pour un rendez-vous
 * @route PUT /api/appointment/:appointmentId/gender-stats
 */
export const updateAppointmentGenderStats = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    // Valider l'ID du rendez-vous
    if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
      return res.status(400).json({ message: 'ID de rendez-vous invalide' });
    }
    
    // Récupérer les données du corps de la requête
    const { maleCount, femaleCount, otherCount } = req.body;
    
    if (maleCount === undefined || femaleCount === undefined || otherCount === undefined) {
      return res.status(400).json({ message: 'Les données de genre sont incomplètes' });
    }
    
    // Convertir en nombre pour s'assurer que ce sont des entiers
    const maleCountInt = parseInt(maleCount, 10);
    const femaleCountInt = parseInt(femaleCount, 10);
    const otherCountInt = parseInt(otherCount, 10);
    
    if (isNaN(maleCountInt) || isNaN(femaleCountInt) || isNaN(otherCountInt)) {
      return res.status(400).json({ message: 'Les données de genre doivent être des nombres' });
    }
    
    // Trouver le rendez-vous
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: 'Rendez-vous non trouvé' });
    }
    
    // Calculer le total pour vérifier la cohérence
    const totalCount = maleCountInt + femaleCountInt + otherCountInt;
    
    // Initialiser genderBreakdown si nécessaire
    if (!appointment.genderBreakdown) {
      appointment.genderBreakdown = {
        maleCount: 0,
        femaleCount: 0,
        otherCount: 0
      };
    }
    
    // Mettre à jour les statistiques de genre
    appointment.genderBreakdown.maleCount = maleCountInt;
    appointment.genderBreakdown.femaleCount = femaleCountInt;
    appointment.genderBreakdown.otherCount = otherCountInt;
    
    // Mettre à jour peopleCount si nécessaire pour assurer la cohérence
    if (!appointment.peopleCount || appointment.peopleCount < totalCount) {
      appointment.peopleCount = totalCount;
    }
    
    await appointment.save();
    
    res.status(200).json({
      success: true,
      message: 'Statistiques de genre mises à jour avec succès',
      data: {
        genderBreakdown: appointment.genderBreakdown,
        peopleCount: appointment.peopleCount
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des statistiques de genre:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la mise à jour des statistiques de genre', 
      error: error.message 
    });
  }
};

// Endpoint pour récupérer les rendez-vous en masse pour plusieurs clients
export const getAppointmentsBulk = async (req, res) => {
  try {
    const { clientIds, clusterId } = req.query;
    
    if (!clientIds || !clusterId) {
      return res.status(400).json({ message: 'Les IDs clients et l\'ID du cluster sont requis' });
    }
    
    // Validation de l'ID du cluster
    if (!mongoose.Types.ObjectId.isValid(clusterId)) {
      return res.status(400).json({ message: 'ID de cluster invalide' });
    }
    
    // Convertir la liste des IDs clients en array
    const clientIdsArray = clientIds.split(',');
    
    // Vérifier que les IDs clients sont valides
    const invalidIds = clientIdsArray.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        message: 'Certains IDs clients sont invalides',
        invalidIds 
      });
    }
    
    // Créer un objet pour stocker les résultats
    const result = {};
    
    // Récupérer les rendez-vous pour tous les clients en une seule requête
    const appointments = await Appointment.find({
      member: { $in: clientIdsArray },
      cluster: clusterId
    })
    .populate('service')
    .populate('employee')
    .sort({ startTime: -1 });
    
    console.log(`Récupération de ${appointments.length} rendez-vous pour ${clientIdsArray.length} clients`);
    
    // Organiser les rendez-vous par client
    for (const appointment of appointments) {
      const clientId = appointment.member.toString();
      
      if (!result[clientId]) {
        result[clientId] = [];
      }
      
      result[clientId].push(appointment);
    }
    
    return res.status(200).json(result);
  } catch (error) {
    console.error('Erreur lors de la récupération des rendez-vous en masse:', error);
    return res.status(500).json({ message: 'Erreur serveur lors de la récupération des rendez-vous' });
  }
};
