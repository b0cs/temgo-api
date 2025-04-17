import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Obtenir le chemin du fichier actuel et le répertoire parent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '../.env') });

// Définir le schéma utilisateur (copie simplifiée du modèle)
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['admin', 'manager', 'employee'], default: 'admin' },
  permissions: {
    canManageEmployees: { type: Boolean, default: true },
    canManageServices: { type: Boolean, default: true },
    canManageCluster: { type: Boolean, default: true }
  },
  cluster: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware pour hacher le mot de passe
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Créer le modèle utilisateur
const User = mongoose.model('User', userSchema);

// Définir le schéma cluster
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

// Créer le modèle cluster
const Cluster = mongoose.model('Cluster', clusterSchema);

// Fonction pour créer un nouvel utilisateur administrateur
async function createAdminUser() {
  try {
    // Se connecter à MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connecté à MongoDB');
    
    // Vérifier si un cluster existe déjà (utiliser le premier cluster disponible)
    let cluster = await Cluster.findOne();
    
    if (!cluster) {
      // Créer un nouveau cluster si aucun n'existe
      console.log('Aucun cluster trouvé, création d\'un nouveau cluster...');
      
      cluster = new Cluster({
        name: 'Temgo Admin',
        type: 'Administration',
        ownerName: 'Admin',
        services: []
      });
      
      await cluster.save();
      console.log('Nouveau cluster créé:', cluster._id);
    } else {
      console.log('Cluster existant trouvé:', cluster._id);
    }
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email: 'admin@temgo.com' });
    
    if (existingUser) {
      console.log('L\'utilisateur admin@temgo.com existe déjà');
      mongoose.disconnect();
      return;
    }
    
    // Créer le nouvel utilisateur admin
    const admin = new User({
      email: 'admin@temgo.com',
      password: 'admin123', // Sera haché par le middleware
      firstName: 'Admin',
      lastName: 'Temgo',
      role: 'admin',
      cluster: cluster._id,
      permissions: {
        canManageEmployees: true,
        canManageServices: true,
        canManageCluster: true
      }
    });
    
    await admin.save();
    console.log('Utilisateur admin créé avec succès:');
    console.log('- Email: admin@temgo.com');
    console.log('- Mot de passe: admin123');
    console.log('- Cluster ID:', cluster._id);
    
    // Déconnecter de MongoDB
    mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
    
  } catch (error) {
    console.error('Erreur:', error);
    mongoose.disconnect();
  }
}

// Exécuter la fonction
createAdminUser(); 