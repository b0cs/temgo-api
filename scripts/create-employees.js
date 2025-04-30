import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Connexion à la base de données
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://admin:cTDJ7cfyJtCIX80c@cluster0.5ctlh.mongodb.net/poctemgo')
  .then(async () => {
    console.log('Connexion à MongoDB établie');
    
    // Récupérer le cluster de l'administrateur
    const db = mongoose.connection.db;
    const admin = await db.collection('users').findOne({ email: 'admin@temgo.com' });
    
    if (!admin) {
      console.error('Utilisateur admin@temgo.com non trouvé');
      process.exit(1);
    }
    
    const clusterId = admin.cluster;
    console.log(`Cluster ID trouvé : ${clusterId}`);
    
    // Créer deux nouveaux employés
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const employees = [
      {
        email: 'employee1@temgo.com',
        password: hashedPassword,
        firstName: 'Employé',
        lastName: 'Un',
        role: 'employee',
        cluster: new mongoose.Types.ObjectId(clusterId),
        isActive: true,
        permissions: {
          canManageEmployees: false,
          canManageServices: false,
          canManageAppointments: true,
          canViewReports: false,
          canManageSettings: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'employee2@temgo.com',
        password: hashedPassword,
        firstName: 'Employé',
        lastName: 'Deux',
        role: 'employee',
        cluster: new mongoose.Types.ObjectId(clusterId),
        isActive: true,
        permissions: {
          canManageEmployees: false,
          canManageServices: false,
          canManageAppointments: true,
          canViewReports: false,
          canManageSettings: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Vérifier si les employés existent déjà
    for (const employee of employees) {
      const existingEmployee = await db.collection('users').findOne({ email: employee.email });
      
      if (existingEmployee) {
        console.log(`L'employé ${employee.email} existe déjà.`);
      } else {
        await db.collection('users').insertOne(employee);
        console.log(`Employé ${employee.email} créé avec succès.`);
      }
    }
    
    // Vérifier que les employés ont été créés
    const allStaff = await db.collection('users').find({ 
      cluster: new mongoose.Types.ObjectId(clusterId),
      role: { $in: ['admin', 'manager', 'employee'] }
    }).toArray();
    
    console.log(`Il y a maintenant ${allStaff.length} membres du staff pour ce cluster:`);
    allStaff.forEach(staff => {
      console.log(`- ${staff.firstName} ${staff.lastName} (${staff.email}) - Rôle: ${staff.role}`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('Erreur de connexion à MongoDB:', err);
    process.exit(1);
  }); 