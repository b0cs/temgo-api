import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Cluster from '../models/cluster.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

// Connexion à la base de données
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/temgo')
  .then(() => console.log('Connexion à MongoDB établie'))
  .catch(err => {
    console.error('Erreur de connexion à MongoDB:', err);
    process.exit(1);
  });

// Fonction pour créer le cluster admin
async function createAdminCluster() {
  try {
    // Vérifier si un cluster admin existe déjà
    const existingCluster = await Cluster.findOne({ name: 'Temgo Admin' });
    if (existingCluster) {
      console.log('Le cluster admin existe déjà');
      return existingCluster;
    }

    // Créer un nouveau cluster
    const adminCluster = new Cluster({
      name: 'Temgo Admin',
      type: 'HairSalon',
      address: {
        street: '123 Rue Principale',
        city: 'Paris',
        postalCode: '75001',
        department: 'Paris',
        region: 'Île-de-France'
      },
      contact: {
        phone: '0123456789',
        email: 'admin@temgo.com'
      },
      ownerName: 'Admin Temgo',
      services: [
        {
          name: 'Coupe Homme',
          description: 'Coupe et coiffage pour homme',
          price: 25,
          duration: 30,
          available: true
        },
        {
          name: 'Coupe Femme',
          description: 'Coupe et coiffage pour femme',
          price: 45,
          duration: 60,
          available: true
        }
      ]
    });

    const savedCluster = await adminCluster.save();
    console.log('Cluster admin créé avec succès');
    return savedCluster;
  } catch (error) {
    console.error('Erreur lors de la création du cluster admin:', error);
    throw error;
  }
}

// Fonction pour créer l'utilisateur admin
async function createAdminUser(clusterId) {
  try {
    // Vérifier si l'utilisateur admin existe déjà
    const existingUser = await User.findOne({ email: 'admin@temgo.com' });
    if (existingUser) {
      console.log('L\'utilisateur admin existe déjà');
      return existingUser;
    }

    // Générer un mot de passe hashé pour admin123
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Créer l'utilisateur admin
    const adminUser = new User({
      email: 'admin@temgo.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Temgo',
      phone: '0123456789',
      role: 'admin',
      cluster: clusterId,
      permissions: {
        canManageEmployees: true,
        canManageServices: true,
        canManageAppointments: true,
        canViewReports: true,
        canManageSettings: true
      },
      isActive: true,
      lastLogin: new Date()
    });

    const savedUser = await adminUser.save();
    console.log('Utilisateur admin créé avec succès');
    console.log('Email: admin@temgo.com');
    console.log('Mot de passe: admin123');
    return savedUser;
  } catch (error) {
    console.error('Erreur lors de la création de l\'utilisateur admin:', error);
    throw error;
  }
}

// Fonction principale
async function main() {
  try {
    // Créer le cluster admin
    const adminCluster = await createAdminCluster();
    
    // Créer l'utilisateur admin
    await createAdminUser(adminCluster._id);
    
    console.log('Script terminé avec succès');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  }
}

// Exécuter le script
main(); 