import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Obtenir le chemin du fichier actuel et le répertoire parent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '../.env') });

// Définir le schéma Cluster
const clusterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  ownerName: { type: String, required: true },
  services: [{
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    duration: { type: Number, required: true },
    available: { type: Boolean, default: true }
  }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Cluster = mongoose.model('Cluster', clusterSchema);

// Définir le schéma Member
const memberSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  notes: { type: String },
  cluster: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Member = mongoose.model('Member', memberSchema);

// Définir le schéma Appointment
const appointmentSchema = new mongoose.Schema({
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  service: {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    duration: { type: Number, required: true }
  },
  cluster: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster', required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'confirmed' },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// Fonction pour créer des membres et des rendez-vous de démonstration
async function createDemoAppointments() {
  try {
    // Se connecter à MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connecté à MongoDB');
    
    // Récupérer un cluster existant
    const cluster = await Cluster.findOne();
    
    if (!cluster) {
      console.error('Aucun cluster trouvé. Veuillez d\'abord créer un cluster.');
      mongoose.disconnect();
      return;
    }
    
    console.log('Cluster trouvé:', cluster._id);
    
    // Vérifier s'il y a déjà des membres
    const existingMembers = await Member.find({ cluster: cluster._id });
    let members = existingMembers;
    
    // Si aucun membre n'existe, en créer quelques-uns
    if (existingMembers.length === 0) {
      console.log('Création de membres...');
      
      const newMembers = [
        {
          firstName: 'Emma',
          lastName: 'Dubois',
          email: 'emma.dubois@example.com',
          phone: '0612345678',
          notes: 'Cliente fidèle',
          cluster: cluster._id
        },
        {
          firstName: 'Lucas',
          lastName: 'Martin',
          email: 'lucas.martin@example.com',
          phone: '0687654321',
          notes: 'Préfère les rendez-vous en fin de journée',
          cluster: cluster._id
        },
        {
          firstName: 'Chloé',
          lastName: 'Petit',
          email: 'chloe.petit@example.com',
          phone: '0678912345',
          notes: 'Allergie aux produits contenant du sulfate',
          cluster: cluster._id
        }
      ];
      
      members = await Member.insertMany(newMembers);
      console.log(`${members.length} membres créés`);
    } else {
      console.log(`${existingMembers.length} membres existants trouvés`);
    }
    
    // Récupérer les services du cluster
    let services = cluster.services || [];
    
    // Si aucun service n'existe, en créer quelques-uns
    if (services.length === 0) {
      console.log('Aucun service trouvé. Création de services de démonstration...');
      
      services = [
        {
          name: 'Coupe Homme',
          description: 'Coupe de cheveux pour homme',
          price: 25,
          duration: 30,
          available: true
        },
        {
          name: 'Coupe Femme',
          description: 'Coupe de cheveux pour femme',
          price: 45,
          duration: 60,
          available: true
        },
        {
          name: 'Coloration',
          description: 'Coloration complète',
          price: 60,
          duration: 90,
          available: true
        }
      ];
      
      // Ajouter les services au cluster
      cluster.services = services;
      await cluster.save();
      console.log(`${services.length} services créés`);
    } else {
      console.log(`${services.length} services existants trouvés`);
    }
    
    // Créer des rendez-vous pour aujourd'hui et les jours suivants
    console.log('Création de rendez-vous...');
    
    // Supprimer les rendez-vous existants si nécessaire
    // await Appointment.deleteMany({ cluster: cluster._id });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const appointments = [];
    
    // Créer des rendez-vous pour aujourd'hui et les 3 prochains jours
    for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
      const day = new Date(today);
      day.setDate(day.getDate() + dayOffset);
      
      // Créer 3-5 rendez-vous par jour
      const appointmentsPerDay = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 0; i < appointmentsPerDay; i++) {
        // Heure aléatoire entre 9h et 17h
        const hour = Math.floor(Math.random() * 8) + 9;
        const minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
        
        const startTime = new Date(day);
        startTime.setHours(hour, minute, 0, 0);
        
        // Choisir un membre et un service aléatoire
        const member = members[Math.floor(Math.random() * members.length)];
        const service = services[Math.floor(Math.random() * services.length)];
        
        // Calculer l'heure de fin en fonction de la durée du service
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + service.duration);
        
        appointments.push({
          startTime,
          endTime,
          member: member._id,
          service: {
            _id: service._id || `service_${Math.random().toString(36).substr(2, 9)}`,
            name: service.name,
            description: service.description,
            price: service.price,
            duration: service.duration
          },
          cluster: cluster._id,
          status: ['pending', 'confirmed', 'completed'][Math.floor(Math.random() * 3)],
          notes: Math.random() > 0.7 ? 'Note pour ce rendez-vous' : ''
        });
      }
    }
    
    // Insérer les rendez-vous
    const createdAppointments = await Appointment.insertMany(appointments);
    console.log(`${createdAppointments.length} rendez-vous créés`);
    
    // Déconnecter de MongoDB
    mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
    
  } catch (error) {
    console.error('Erreur:', error);
    mongoose.disconnect();
  }
}

// Exécuter la fonction
createDemoAppointments(); 