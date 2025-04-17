import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../models/appointment.model.js';
import Service from '../models/service.model.js';
import Member from '../models/member.model.js';
import Cluster from '../models/cluster.model.js';
import User from '../models/user.model.js';

dotenv.config();

// Connexion à la base de données
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/temgo')
  .then(() => console.log('Connexion à MongoDB établie'))
  .catch(err => {
    console.error('Erreur de connexion à MongoDB:', err);
    process.exit(1);
  });

async function recreateAppointments() {
  try {
    // Trouver l'ID du cluster admin
    const admin = await User.findOne({ email: 'admin@temgo.com' });
    if (!admin) {
      console.error('Utilisateur admin@temgo.com non trouvé');
      process.exit(1);
    }
    const clusterId = admin.cluster;
    console.log(`Cluster de l'admin: ${clusterId}`);
    
    // Récupérer tous les services du cluster
    const services = await Service.find({ cluster: clusterId });
    console.log(`Nombre de services trouvés: ${services.length}`);
    if (services.length === 0) {
      console.error('Aucun service trouvé pour ce cluster. Exécutez d\'abord create-demo-data.js');
      process.exit(1);
    }
    
    // Récupérer tous les membres
    const members = await Member.find({ cluster: clusterId });
    console.log(`Nombre de membres trouvés: ${members.length}`);
    if (members.length === 0) {
      console.error('Aucun membre trouvé pour ce cluster. Exécutez d\'abord create-demo-data.js');
      process.exit(1);
    }
    
    // Supprimer tous les rendez-vous existants
    const deleteResult = await Appointment.deleteMany({});
    console.log(`${deleteResult.deletedCount} rendez-vous supprimés`);
    
    // Créer de nouveaux rendez-vous
    const now = new Date();
    const appointments = [];
    
    for (let i = 0; i < 20; i++) {
      const randomDay = Math.floor(Math.random() * 7); // 0-6 jours à partir d'aujourd'hui
      const appointmentDate = new Date(now);
      appointmentDate.setDate(now.getDate() + randomDay);
      appointmentDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0); // Entre 9h et 17h
      
      const service = services[Math.floor(Math.random() * services.length)];
      const member = members[Math.floor(Math.random() * members.length)];
      
      const endTime = new Date(appointmentDate);
      endTime.setMinutes(endTime.getMinutes() + service.duration);
      
      appointments.push({
        cluster: clusterId,
        member: member._id,
        service: service._id,
        startTime: appointmentDate,
        endTime: endTime,
        status: 'Scheduled'
      });
    }
    
    const createdAppointments = await Appointment.insertMany(appointments);
    console.log(`${createdAppointments.length} nouveaux rendez-vous créés`);
    
    // Vérifier que les rendez-vous ont été créés correctement
    const checkAppointments = await Appointment.find()
      .populate('service')
      .populate('member');
    
    console.log('\nVérification des rendez-vous créés:');
    for (const appt of checkAppointments.slice(0, 5)) { // Afficher les 5 premiers pour vérification
      console.log(`Rendez-vous ${appt._id}:`);
      console.log(`- Service: ${appt.service?.name || 'Non défini'} (ID: ${appt.service?._id || 'Non défini'})`);
      console.log(`- Membre: ${appt.member?.firstName || 'Non défini'} ${appt.member?.lastName || ''} (ID: ${appt.member?._id || 'Non défini'})`);
      console.log(`- Date: ${appt.startTime}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

recreateAppointments(); 