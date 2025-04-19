import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Schéma pour le personnel (staff)
const staffSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  role: { type: String, default: 'coiffeur' },
  cluster: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Cluster' },
  isAvailable: { type: Boolean, default: true },
  workHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' },
    lunchStart: { type: String, default: '12:00' },
    lunchEnd: { type: String, default: '13:00' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Créer le modèle
mongoose.model('Staff', staffSchema);
const Staff = mongoose.model('Staff');

// Fonction principale
async function addStaff() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/temgo');
    console.log('Connecté à MongoDB');

    const clusterId = '67ff7963a05ffbb0f61f8d5f'; // ID de votre cluster
    
    // Liste du personnel à ajouter
    const staffMembers = [
      {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@temgo.com',
        phone: '0601020304',
        role: 'coiffeur'
      },
      {
        firstName: 'Marie',
        lastName: 'Lambert',
        email: 'marie.lambert@temgo.com',
        phone: '0602030405',
        role: 'coiffeuse'
      },
      {
        firstName: 'Luc',
        lastName: 'Martin',
        email: 'luc.martin@temgo.com',
        phone: '0603040506',
        role: 'barbier'
      },
      {
        firstName: 'Elodie',
        lastName: 'Blanc',
        email: 'elodie.blanc@temgo.com',
        phone: '0604050607',
        role: 'coloriste'
      },
      {
        firstName: 'David',
        lastName: 'Nguyen',
        email: 'david.nguyen@temgo.com',
        phone: '0605060708',
        role: 'coiffeur'
      }
    ];

    // Ajouter chaque membre du personnel
    for (const staffMember of staffMembers) {
      // Vérifier si le membre du personnel existe déjà
      const existingStaff = await Staff.findOne({ email: staffMember.email });
      if (existingStaff) {
        console.log(`Le membre du personnel ${staffMember.firstName} ${staffMember.lastName} existe déjà.`);
        continue;
      }
      
      // Créer le nouveau membre du personnel
      const newStaff = new Staff({
        firstName: staffMember.firstName,
        lastName: staffMember.lastName,
        email: staffMember.email,
        phone: staffMember.phone,
        role: staffMember.role,
        cluster: clusterId,
        workHours: {
          start: '09:00',
          end: '18:00',
          lunchStart: '12:00',
          lunchEnd: '13:00'
        }
      });
      
      // Sauvegarder le membre du personnel
      await newStaff.save();
      console.log(`Membre du personnel ${staffMember.firstName} ${staffMember.lastName} ajouté avec succès.`);
    }

    console.log('Tous les membres du personnel ont été ajoutés avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'ajout du personnel:', error);
  } finally {
    // Fermer la connexion à MongoDB
    await mongoose.connection.close();
    console.log('Connexion à MongoDB fermée.');
  }
}

// Exécuter la fonction principale
addStaff(); 