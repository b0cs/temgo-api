import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Cluster from '../models/cluster.model.js';
import Member from '../models/member.model.js';
import Service from '../models/service.model.js';
import Appointment from '../models/appointment.model.js';
import bcrypt from 'bcrypt';

dotenv.config();

// Connexion à la base de données
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/temgo')
  .then(() => console.log('Connexion à MongoDB établie'))
  .catch(err => {
    console.error('Erreur de connexion à MongoDB:', err);
    process.exit(1);
  });

// Fonction pour créer des services de coiffure
async function createHairServices(clusterId) {
  const services = [
    {
      name: 'Coupe Homme',
      description: 'Coupe et coiffage pour homme',
      price: 25,
      duration: 30,
      cluster: clusterId,
      available: true
    },
    {
      name: 'Coupe Femme',
      description: 'Coupe et coiffage pour femme',
      price: 45,
      duration: 60,
      cluster: clusterId,
      available: true
    },
    {
      name: 'Coloration',
      description: 'Coloration complète des cheveux',
      price: 60,
      duration: 120,
      cluster: clusterId,
      available: true
    },
    {
      name: 'Mèches',
      description: 'Mèches et balayage',
      price: 70,
      duration: 150,
      cluster: clusterId,
      available: true
    },
    {
      name: 'Brushing',
      description: 'Brushing et mise en forme',
      price: 30,
      duration: 45,
      cluster: clusterId,
      available: true
    },
    {
      name: 'Barbe',
      description: 'Taille et entretien de la barbe',
      price: 15,
      duration: 20,
      cluster: clusterId,
      available: true
    },
    {
      name: 'Shampoing',
      description: 'Shampoing et soin du cuir chevelu',
      price: 10,
      duration: 15,
      cluster: clusterId,
      available: true
    },
    {
      name: 'Coiffure Mariage',
      description: 'Coiffure complète pour mariage',
      price: 120,
      duration: 180,
      cluster: clusterId,
      available: true
    },
    {
      name: 'Lissage',
      description: 'Lissage brésilien ou à la kératine',
      price: 150,
      duration: 240,
      cluster: clusterId,
      available: true
    },
    {
      name: 'Coupe Enfant',
      description: 'Coupe pour enfants jusqu\'à 12 ans',
      price: 18,
      duration: 25,
      cluster: clusterId,
      available: true
    }
  ];

  try {
    await Service.deleteMany({ cluster: clusterId });
    console.log('Services existants supprimés pour ce cluster');
    
    const createdServices = await Service.insertMany(services);
    console.log(`${createdServices.length} services créés avec succès`);
    return createdServices;
  } catch (error) {
    console.error('Erreur lors de la création des services:', error);
    throw error;
  }
}

// Fonction pour créer des membres (clients)
async function createMembers(clusterId) {
  const hashPassword = await bcrypt.hash('password123', 10);
  
  const members = [
    {
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'jean.dupont@example.com',
      phone: '0601020304',
      passwordHash: hashPassword,
      role: 'client',
      cluster: clusterId,
      isActive: true
    },
    {
      firstName: 'Marie',
      lastName: 'Martin',
      email: 'marie.martin@example.com',
      phone: '0607080910',
      passwordHash: hashPassword,
      role: 'client',
      cluster: clusterId,
      isActive: true
    },
    {
      firstName: 'Sophie',
      lastName: 'Petit',
      email: 'sophie.petit@example.com',
      phone: '0611121314',
      passwordHash: hashPassword,
      role: 'client',
      cluster: clusterId,
      isActive: true
    },
    {
      firstName: 'Pierre',
      lastName: 'Durand',
      email: 'pierre.durand@example.com',
      phone: '0615161718',
      passwordHash: hashPassword,
      role: 'client',
      cluster: clusterId,
      isActive: true
    },
    {
      firstName: 'Lucie',
      lastName: 'Bernard',
      email: 'lucie.bernard@example.com',
      phone: '0619202122',
      passwordHash: hashPassword,
      role: 'client',
      cluster: clusterId,
      isActive: true
    }
  ];

  try {
    await Member.deleteMany({ cluster: clusterId, role: 'client' });
    console.log('Membres existants supprimés pour ce cluster');
    
    const createdMembers = await Member.insertMany(members);
    console.log(`${createdMembers.length} membres créés avec succès`);
    return createdMembers;
  } catch (error) {
    console.error('Erreur lors de la création des membres:', error);
    throw error;
  }
}

// Fonction pour créer des rendez-vous
async function createAppointments(clusterId, services, members) {
  // Date actuelle
  const now = new Date();
  
  // Créer des rendez-vous pour les 7 prochains jours
  const appointments = [];
  
  for (let i = 0; i < 20; i++) {
    // Générer une date aléatoire dans les 7 prochains jours
    const appointmentDate = new Date(now);
    appointmentDate.setDate(now.getDate() + Math.floor(Math.random() * 7));
    
    // Générer une heure aléatoire entre 9h et 17h
    appointmentDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
    
    // Choisir un service et un membre aléatoires
    const service = services[Math.floor(Math.random() * services.length)];
    const member = members[Math.floor(Math.random() * members.length)];
    
    // Calculer l'heure de fin en fonction de la durée du service
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

  try {
    await Appointment.deleteMany({ cluster: clusterId });
    console.log('Rendez-vous existants supprimés pour ce cluster');
    
    const createdAppointments = await Appointment.insertMany(appointments);
    console.log(`${createdAppointments.length} rendez-vous créés avec succès`);
    return createdAppointments;
  } catch (error) {
    console.error('Erreur lors de la création des rendez-vous:', error);
    throw error;
  }
}

// Fonction principale
async function main() {
  try {
    // Trouver l'utilisateur admin@temgo.com
    const admin = await User.findOne({ email: 'admin@temgo.com' });
    
    if (!admin) {
      console.error('Utilisateur admin@temgo.com non trouvé');
      process.exit(1);
    }
    
    // Vérifier que l'utilisateur a un cluster associé
    if (!admin.cluster) {
      console.error('Aucun cluster associé à admin@temgo.com');
      process.exit(1);
    }
    
    const clusterId = admin.cluster;
    console.log(`Cluster ID trouvé : ${clusterId}`);
    
    // Créer des services pour ce cluster
    const services = await createHairServices(clusterId);
    
    // Créer des membres pour ce cluster
    const members = await createMembers(clusterId);
    
    // Créer des rendez-vous
    await createAppointments(clusterId, services, members);
    
    console.log('Script terminé avec succès');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  }
}

// Exécuter le script
main(); 