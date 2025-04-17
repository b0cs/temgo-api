import mongoose from 'mongoose';
import User from '../models/user.model.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/temgo')
  .then(() => console.log('Connecté à MongoDB'))
  .catch(err => {
    console.error('Erreur de connexion MongoDB:', err);
    process.exit(1);
  });

const createEmployees = async () => {
  try {
    // ID du cluster (celui que vous utilisez actuellement dans l'application)
    // Remplacez par l'ID de votre cluster
    const clusterId = "67ff7963a05ffbb0f61f8d5f"; // À remplacer par l'ID réel du cluster
    
    // Liste des employés à créer
    const employees = [
      {
        firstName: "Marie",
        lastName: "Dubois",
        email: "marie.dubois@temgo.com",
        phone: "0611223344",
        role: "employee",
        specialties: [],
        // Défini pour des tests de disponibilité variés
        workHours: [
          { day: 'monday', isWorking: true, startTime: '08:30', endTime: '17:30' },
          { day: 'tuesday', isWorking: true, startTime: '08:30', endTime: '17:30' },
          { day: 'wednesday', isWorking: true, startTime: '08:30', endTime: '17:30' },
          { day: 'thursday', isWorking: true, startTime: '08:30', endTime: '17:30' },
          { day: 'friday', isWorking: true, startTime: '08:30', endTime: '17:30' },
          { day: 'saturday', isWorking: false },
          { day: 'sunday', isWorking: false }
        ]
      },
      {
        firstName: "Thomas",
        lastName: "Martin",
        email: "thomas.martin@temgo.com",
        phone: "0622334455",
        role: "employee",
        specialties: [],
        workHours: [
          { day: 'monday', isWorking: true, startTime: '09:00', endTime: '18:00' },
          { day: 'tuesday', isWorking: true, startTime: '09:00', endTime: '18:00' },
          { day: 'wednesday', isWorking: true, startTime: '09:00', endTime: '18:00' },
          { day: 'thursday', isWorking: true, startTime: '09:00', endTime: '18:00' },
          { day: 'friday', isWorking: true, startTime: '09:00', endTime: '18:00' },
          { day: 'saturday', isWorking: true, startTime: '09:00', endTime: '14:00' },
          { day: 'sunday', isWorking: false }
        ]
      },
      {
        firstName: "Sophie",
        lastName: "Bernard",
        email: "sophie.bernard@temgo.com",
        phone: "0633445566",
        role: "employee",
        specialties: [],
        workHours: [
          { day: 'monday', isWorking: false },
          { day: 'tuesday', isWorking: true, startTime: '10:00', endTime: '19:00' },
          { day: 'wednesday', isWorking: true, startTime: '10:00', endTime: '19:00' },
          { day: 'thursday', isWorking: true, startTime: '10:00', endTime: '19:00' },
          { day: 'friday', isWorking: true, startTime: '10:00', endTime: '19:00' },
          { day: 'saturday', isWorking: true, startTime: '10:00', endTime: '17:00' },
          { day: 'sunday', isWorking: false }
        ]
      },
      {
        firstName: "Lucas",
        lastName: "Petit",
        email: "lucas.petit@temgo.com",
        phone: "0644556677",
        role: "employee",
        specialties: [],
        workHours: [
          { day: 'monday', isWorking: true, startTime: '09:30', endTime: '18:30' },
          { day: 'tuesday', isWorking: true, startTime: '09:30', endTime: '18:30' },
          { day: 'wednesday', isWorking: true, startTime: '09:30', endTime: '18:30' },
          { day: 'thursday', isWorking: true, startTime: '09:30', endTime: '18:30' },
          { day: 'friday', isWorking: true, startTime: '09:30', endTime: '18:30' },
          { day: 'saturday', isWorking: false },
          { day: 'sunday', isWorking: false }
        ],
        lunchStart: "13:00", 
        lunchEnd: "14:00"
      },
      {
        firstName: "Emma",
        lastName: "Robert",
        email: "emma.robert@temgo.com",
        phone: "0655667788",
        role: "manager", // Un manager pour tester les permissions
        specialties: [],
        workHours: [
          { day: 'monday', isWorking: true, startTime: '08:00', endTime: '17:00' },
          { day: 'tuesday', isWorking: true, startTime: '08:00', endTime: '17:00' },
          { day: 'wednesday', isWorking: true, startTime: '08:00', endTime: '17:00' },
          { day: 'thursday', isWorking: true, startTime: '08:00', endTime: '17:00' },
          { day: 'friday', isWorking: true, startTime: '08:00', endTime: '17:00' },
          { day: 'saturday', isWorking: false },
          { day: 'sunday', isWorking: false }
        ]
      }
    ];

    // Mot de passe commun pour tous les employés (pour faciliter les tests)
    const password = "Temgo2024";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Créer les employés dans la base de données
    for (const employee of employees) {
      const newEmployee = new User({
        ...employee,
        password: hashedPassword,
        cluster: clusterId
      });

      await newEmployee.save();
      console.log(`Employé créé: ${employee.firstName} ${employee.lastName}`);
    }

    console.log('Tous les employés ont été créés avec succès!');
    console.log('Mot de passe commun pour tous: ' + password);
  } catch (error) {
    console.error('Erreur lors de la création des employés:', error);
  } finally {
    // Fermer la connexion MongoDB
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  }
};

// Exécuter la fonction
createEmployees(); 