import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Charger les variables d'environnement
dotenv.config();

// Schéma utilisateur simplifié pour le script
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['super_admin', 'admin', 'manager', 'employee'], default: 'employee' },
  cluster: { type: mongoose.Schema.Types.ObjectId, ref: 'Cluster', required: true },
  isAvailable: { type: Boolean, default: true },
  workHours: [{
    day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
    isWorking: { type: Boolean, default: true },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '18:00' }
  }],
  lunchStart: { type: String, default: '12:00' },
  lunchEnd: { type: String, default: '13:00' },
  isActive: { type: Boolean, default: true }
});

// Middleware pour hasher le mot de passe avant l'enregistrement
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Créer le modèle
mongoose.model('User', userSchema);
const User = mongoose.model('User');

// Fonction principale
async function addEmployees() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/temgo');
    console.log('Connecté à MongoDB');

    const clusterId = '67ff7963a05ffbb0f61f8d5f'; // ID de votre cluster
    
    // Liste des employés à ajouter
    const employees = [
      {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@temgo.com',
        phone: '0601020304',
        role: 'employee'
      },
      {
        firstName: 'Marie',
        lastName: 'Lambert',
        email: 'marie.lambert@temgo.com',
        phone: '0602030405',
        role: 'employee'
      },
      {
        firstName: 'Luc',
        lastName: 'Martin',
        email: 'luc.martin@temgo.com',
        phone: '0603040506',
        role: 'employee'
      },
      {
        firstName: 'Elodie',
        lastName: 'Blanc',
        email: 'elodie.blanc@temgo.com',
        phone: '0604050607',
        role: 'employee'
      },
      {
        firstName: 'David',
        lastName: 'Nguyen',
        email: 'david.nguyen@temgo.com',
        phone: '0605060708',
        role: 'employee'
      }
    ];
    
    // Ajouter chaque employé
    for (const employee of employees) {
      // Vérifier si l'employé existe déjà
      const existingEmployee = await User.findOne({ email: employee.email });
      if (existingEmployee) {
        console.log(`L'employé ${employee.firstName} ${employee.lastName} existe déjà.`);
        continue;
      }
      
      // Créer le nouvel employé
      const defaultWorkHours = [
        { day: 'monday', isWorking: true, startTime: '09:00', endTime: '18:00' },
        { day: 'tuesday', isWorking: true, startTime: '09:00', endTime: '18:00' },
        { day: 'wednesday', isWorking: true, startTime: '09:00', endTime: '18:00' },
        { day: 'thursday', isWorking: true, startTime: '09:00', endTime: '18:00' },
        { day: 'friday', isWorking: true, startTime: '09:00', endTime: '18:00' },
        { day: 'saturday', isWorking: true, startTime: '09:00', endTime: '16:00' },
        { day: 'sunday', isWorking: false, startTime: '00:00', endTime: '00:00' }
      ];
      
      const newEmployee = new User({
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        password: 'TemgoEmp2025', // Mot de passe par défaut
        role: employee.role,
        cluster: clusterId,
        workHours: defaultWorkHours,
        lunchStart: '12:00',
        lunchEnd: '13:00',
        isAvailable: true
      });
      
      // Sauvegarder l'employé
      await newEmployee.save();
      console.log(`Employé ${employee.firstName} ${employee.lastName} ajouté avec succès.`);
    }

    console.log('Tous les employés ont été ajoutés avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'ajout des employés:', error);
  } finally {
    // Fermer la connexion à MongoDB
    await mongoose.connection.close();
    console.log('Connexion à MongoDB fermée.');
  }
}

// Exécuter la fonction principale
addEmployees(); 