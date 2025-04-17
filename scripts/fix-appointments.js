import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../models/appointment.model.js';
import Cluster from '../models/cluster.model.js';
import Service from '../models/service.model.js';

dotenv.config();

// Connexion à la base de données
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/temgo')
  .then(() => console.log('Connexion à MongoDB établie'))
  .catch(err => {
    console.error('Erreur de connexion à MongoDB:', err);
    process.exit(1);
  });

// Fonction pour corriger les rendez-vous
async function fixAppointments() {
  try {
    // 1. Récupérer tous les rendez-vous
    const appointments = await Appointment.find();
    console.log(`Nombre total de rendez-vous : ${appointments.length}`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // 2. Pour chaque rendez-vous
    for (const appointment of appointments) {
      try {
        // Récupérer le cluster associé au rendez-vous
        const cluster = await Cluster.findById(appointment.cluster);
        if (!cluster) {
          console.log(`Cluster ${appointment.cluster} non trouvé pour le rendez-vous ${appointment._id}`);
          continue;
        }
        
        // Vérifier si le service existe
        const serviceExists = await Service.findById(appointment.service);
        if (!serviceExists) {
          console.log(`Service ${appointment.service} non trouvé pour le rendez-vous ${appointment._id}`);
          
          // Récupérer les services du cluster
          const services = await Service.find({ cluster: appointment.cluster });
          if (services.length > 0) {
            // Utiliser un service aléatoire du cluster
            const randomIndex = Math.floor(Math.random() * services.length);
            const newService = services[randomIndex];
            
            // Mettre à jour le rendez-vous avec ce service
            appointment.service = newService._id;
            
            // Mettre à jour l'heure de fin en fonction de la durée du service
            const duration = newService.duration || 30; // En minutes
            const endTime = new Date(appointment.startTime);
            endTime.setMinutes(endTime.getMinutes() + duration);
            appointment.endTime = endTime;
            
            await appointment.save();
            updatedCount++;
            console.log(`Rendez-vous ${appointment._id} mis à jour avec le service ${newService.name}`);
          } else {
            console.log(`Aucun service disponible pour le cluster ${appointment.cluster}`);
            errorCount++;
          }
        }
      } catch (e) {
        console.error(`Erreur lors du traitement du rendez-vous ${appointment._id}:`, e);
        errorCount++;
      }
    }
    
    console.log(`Traitement terminé. ${updatedCount} rendez-vous mis à jour, ${errorCount} erreurs.`);
    process.exit(0);
  } catch (error) {
    console.error('Erreur globale:', error);
    process.exit(1);
  }
}

// Exécuter la fonction
fixAppointments(); 