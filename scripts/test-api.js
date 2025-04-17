import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

dotenv.config();

// Connexion à la base de données
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/temgo')
  .then(() => console.log('Connexion à MongoDB établie'))
  .catch(err => {
    console.error('Erreur de connexion à MongoDB:', err);
    process.exit(1);
  });

// Générer un token JWT valide pour l'admin
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'votre-secret-jwt',
    { expiresIn: '1h' }
  );
};

async function testAPI() {
  try {
    // Trouver l'utilisateur admin
    const admin = await User.findOne({ email: 'admin@temgo.com' });
    if (!admin) {
      console.error('Utilisateur admin@temgo.com non trouvé');
      process.exit(1);
    }
    
    const clusterId = admin.cluster;
    console.log(`ID du cluster à tester: ${clusterId}`);
    
    // Générer un token pour l'admin
    const token = generateToken(admin._id);
    
    // Test de l'API
    console.log('Appel de l\'API /api/appointment/all/:clusterId...');
    try {
      const response = await axios.get(`http://localhost:9000/api/appointment/all/${clusterId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`Statut de la réponse: ${response.status}`);
      console.log(`Nombre de rendez-vous reçus: ${response.data.length}`);
      
      // Analyser les 3 premiers rendez-vous
      if (response.data.length > 0) {
        console.log('\nDétails des 3 premiers rendez-vous:');
        for (let i = 0; i < Math.min(3, response.data.length); i++) {
          const appt = response.data[i];
          console.log(`\nRendez-vous ${i+1}:`);
          console.log(`- ID: ${appt._id}`);
          
          // Vérifier le service
          console.log('- Service:');
          if (appt.service) {
            console.log(`  • Type: ${typeof appt.service}`);
            console.log(`  • Contenu: ${JSON.stringify(appt.service)}`);
          } else {
            console.log('  • Null ou undefined');
          }
          
          // Vérifier le membre
          console.log('- Membre:');
          if (appt.member) {
            console.log(`  • Type: ${typeof appt.member}`);
            console.log(`  • Contenu: ${JSON.stringify(appt.member)}`);
          } else {
            console.log('  • Null ou undefined');
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'appel API:');
      if (error.response) {
        console.error(`Statut: ${error.response.status}`);
        console.error(`Message: ${JSON.stringify(error.response.data)}`);
      } else {
        console.error(error.message);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

testAPI(); 