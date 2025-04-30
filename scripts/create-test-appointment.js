// Script pour créer un rendez-vous de test afin de vérifier le bon fonctionnement de l'endpoint bulk
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import path from 'path';

// Configurer __dirname pour ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// URI de connexion MongoDB (utiliser variable d'environnement ou valeur par défaut)
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/temgoDB';

// IDs à utiliser (issus des logs)
const CLIENT_ID = '6810c19bc3736cc9495fd366';
const CLUSTER_ID = '6810bf8dc3736cc9495fd271';

async function createTestAppointment() {
  console.log('🔧 Création d\'un rendez-vous de test...');
  console.log(`📊 Client ID: ${CLIENT_ID}`);
  console.log(`📊 Cluster ID: ${CLUSTER_ID}`);
  
  try {
    // Connexion à MongoDB
    console.log('🔄 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connexion établie');
    
    // Vérifier si le client existe
    const client = await mongoose.connection.db.collection('members').findOne({ 
      _id: new mongoose.Types.ObjectId(CLIENT_ID) 
    });
    
    if (!client) {
      console.log('❌ Client introuvable! Impossible de créer un rendez-vous');
      return;
    }
    
    console.log(`✅ Client trouvé: ${client.firstName} ${client.lastName}`);
    
    // Vérifier si le cluster existe
    const cluster = await mongoose.connection.db.collection('clusters').findOne({ 
      _id: new mongoose.Types.ObjectId(CLUSTER_ID) 
    });
    
    if (!cluster) {
      console.log('❌ Cluster introuvable! Impossible de créer un rendez-vous');
      return;
    }
    
    console.log(`✅ Cluster trouvé: ${cluster.name}`);
    
    // Récupérer un service du cluster
    let serviceId;
    
    if (cluster.services && cluster.services.length > 0) {
      serviceId = cluster.services[0]._id;
      console.log(`✅ Service trouvé dans le cluster: ${cluster.services[0].name}`);
    } else {
      // Chercher un service dans la collection services
      const service = await mongoose.connection.db.collection('services').findOne({ 
        cluster: new mongoose.Types.ObjectId(CLUSTER_ID) 
      });
      
      if (!service) {
        console.log('❌ Aucun service trouvé pour ce cluster! Impossible de créer un rendez-vous');
        return;
      }
      
      serviceId = service._id;
      console.log(`✅ Service trouvé: ${service.name}`);
    }
    
    // Créer les dates pour le rendez-vous
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1); // Demain
    startTime.setHours(14, 0, 0, 0); // 14h00
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + 60); // +60 minutes
    
    // Créer le document de rendez-vous
    const appointmentData = {
      cluster: new mongoose.Types.ObjectId(CLUSTER_ID),
      member: new mongoose.Types.ObjectId(CLIENT_ID),
      service: serviceId,
      startTime: startTime,
      endTime: endTime,
      status: 'scheduled',
      peopleCount: 1,
      genderBreakdown: {
        maleCount: 1,
        femaleCount: 0,
        otherCount: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📊 Données du rendez-vous à créer:', appointmentData);
    
    // Insérer le rendez-vous dans la base de données
    const result = await mongoose.connection.db.collection('appointments').insertOne(appointmentData);
    
    if (result.acknowledged) {
      console.log(`✅ Rendez-vous créé avec succès! ID: ${result.insertedId}`);
      
      // Vérifier que le rendez-vous est bien récupérable
      console.log('🔍 Vérification que le rendez-vous est récupérable...');
      
      const appointment = await mongoose.connection.db.collection('appointments').findOne({
        _id: result.insertedId
      });
      
      if (appointment) {
        console.log(`✅ Rendez-vous récupéré avec succès!`);
        console.log(`📊 Date de début: ${appointment.startTime}`);
        
        // Tester la requête utilisée par l'endpoint bulk
        const bulkQuery = {
          member: { $in: [new mongoose.Types.ObjectId(CLIENT_ID)] },
          cluster: new mongoose.Types.ObjectId(CLUSTER_ID)
        };
        
        const bulkResults = await mongoose.connection.db.collection('appointments').find(bulkQuery).toArray();
        
        console.log(`📊 Résultat de la requête bulk: ${bulkResults.length} rendez-vous trouvés`);
        
        if (bulkResults.length === 0) {
          console.log('⚠️ La requête bulk ne trouve pas le rendez-vous créé - il y a un problème!');
        } else {
          console.log('✅ La requête bulk trouve le rendez-vous créé!');
        }
      } else {
        console.log('❌ Impossible de récupérer le rendez-vous créé');
      }
    } else {
      console.log('❌ Échec de la création du rendez-vous');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la création du rendez-vous:', error);
  } finally {
    // Fermer la connexion
    await mongoose.disconnect();
    console.log('✅ Connexion à MongoDB fermée');
  }
}

// Exécuter la création du rendez-vous de test
createTestAppointment()
  .then(() => console.log('✅ Opération terminée'))
  .catch(err => console.error('❌ Erreur:', err)); 