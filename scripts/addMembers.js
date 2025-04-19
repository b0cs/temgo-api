import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

// Charger les variables d'environnement
dotenv.config();

// Schéma pour les membres
const memberSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true },
  cluster: { type: mongoose.Schema.Types.ObjectId, required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Middleware pour hasher le mot de passe avant l'enregistrement
memberSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Créer le modèle
mongoose.model('Member', memberSchema);
const Member = mongoose.model('Member');

// Fonction pour hasher un mot de passe
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Fonction principale
async function addEmployees() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/temgo');
    console.log('Connecté à MongoDB');

    const clusterId = '67ff7963a05ffbb0f61f8d5f'; // ID de votre cluster
    
    // Liste des employés à ajouter avec des numéros de téléphone uniques
    const employees = [
      {
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@temgo.com',
        phone: '0711223344',
        password: 'TemgoEmp2025',
        role: 'employee'
      },
      {
        firstName: 'Marie',
        lastName: 'Lambert',
        email: 'marie.lambert@temgo.com',
        phone: '0722334455',
        password: 'TemgoEmp2025',
        role: 'employee'
      },
      {
        firstName: 'Luc',
        lastName: 'Martin',
        email: 'luc.martin@temgo.com',
        phone: '0733445566',
        password: 'TemgoEmp2025',
        role: 'employee'
      },
      {
        firstName: 'Elodie',
        lastName: 'Blanc',
        email: 'elodie.blanc@temgo.com',
        phone: '0744556677',
        password: 'TemgoEmp2025',
        role: 'coloriste'
      },
      {
        firstName: 'David',
        lastName: 'Nguyen',
        email: 'david.nguyen@temgo.com',
        phone: '0755667788',
        password: 'TemgoEmp2025',
        role: 'barbier'
      }
    ];
    
    // Ajouter chaque employé
    for (const employee of employees) {
      try {
        // Vérifier si l'employé existe déjà
        const existingEmployee = await Member.findOne({ email: employee.email });
        if (existingEmployee) {
          console.log(`L'employé ${employee.firstName} ${employee.lastName} existe déjà.`);
          continue;
        }
        
        // Hashage du mot de passe
        const passwordHash = await hashPassword(employee.password);
        
        // Créer le nouvel employé
        const newEmployee = new Member({
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone,
          passwordHash: passwordHash,
          role: employee.role,
          cluster: new mongoose.Types.ObjectId(clusterId)
        });
        
        // Sauvegarder l'employé
        await newEmployee.save();
        console.log(`Employé ${employee.firstName} ${employee.lastName} ajouté avec succès.`);
      } catch (empError) {
        console.error(`Erreur lors de l'ajout de l'employé ${employee.firstName} ${employee.lastName}:`, empError.message);
      }
    }

    console.log('Opération terminée.');
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