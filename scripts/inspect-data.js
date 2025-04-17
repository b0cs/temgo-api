import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../models/appointment.model.js';
import Service from '../models/service.model.js';
import Cluster from '../models/cluster.model.js';

dotenv.config();

// Connexion à la base de données
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/temgo')
  .then(() => console.log('Connexion à MongoDB établie'))
  .catch(err => {
    console.error('Erreur de connexion à MongoDB:', err);
    process.exit(1);
  });

async function inspectData() {
  try {
    // Récupérer les clusters
    const clusters = await Cluster.find();
    console.log(`Nombre de clusters: ${clusters.length}`);
    for (const cluster of clusters) {
      console.log(`Cluster: ${cluster._id}, Nom: ${cluster.name}`);
    }
    
    // Récupérer les services
    const services = await Service.find();
    console.log(`\nNombre de services: ${services.length}`);
    for (const service of services) {
      console.log(`Service: ${service._id}, Nom: ${service.name}, Cluster: ${service.cluster}`);
    }
    
    // Récupérer les rendez-vous avec les références de service
    console.log("\nAPPOINTMENTS:");
    const appointments = await Appointment.find().populate('service');
    console.log(`\nNombre de rendez-vous: ${appointments.length}`);
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const appt of appointments) {
      const serviceValid = appt.service !== null && appt.service !== undefined;
      if (serviceValid) {
        console.log(`Rendez-vous valide: ${appt._id}, Service: ${appt.service?.name || 'null'}, ServiceID: ${appt.service?._id || 'null'}, Membre: ${appt.member || 'null'}`);
        validCount++;
      } else {
        console.log(`Rendez-vous INVALIDE: ${appt._id}, Service: null, Member: ${appt.member || 'null'}`);
        invalidCount++;
      }
    }
    
    console.log(`\nRésumé: ${validCount} rendez-vous valides, ${invalidCount} rendez-vous invalides`);
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

inspectData(); 