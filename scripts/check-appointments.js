// Script de diagnostic pour les appointments
// Compatible avec ESM (ECMAScript Modules)
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

async function runDiagnostic() {
  console.log('🔍 Démarrage du diagnostic des appointments...');
  console.log(`📊 URI MongoDB: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`); // Masquer les identifiants

  try {
    // Connexion à MongoDB
    console.log('🔄 Tentative de connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connexion à MongoDB établie');

    // Vérifier la collection appointments
    console.log('🔍 Vérification de la collection appointments...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const hasAppointmentsCollection = collections.some(coll => coll.name === 'appointments');
    
    if (!hasAppointmentsCollection) {
      console.log('⚠️ La collection appointments n\'existe pas dans la base de données');
      return;
    }
    
    console.log('✅ Collection appointments trouvée');

    // Vérifier le nombre total d'appointments
    const totalAppointments = await mongoose.connection.db.collection('appointments').countDocuments();
    console.log(`📊 Nombre total de rendez-vous: ${totalAppointments}`);

    // Vérifier si des rendez-vous existent pour le cluster et client spécifique
    const clusterId = '6810bf8dc3736cc9495fd271'; // ID du cluster mentionné dans les logs
    const clientId = '6810c19bc3736cc9495fd366'; // ID du client mentionné dans les logs
    
    console.log(`🔍 Recherche de rendez-vous pour le client ${clientId} dans le cluster ${clusterId}...`);
    
    // Vérifier le client
    const client = await mongoose.connection.db.collection('members').findOne({ _id: new mongoose.Types.ObjectId(clientId) });
    if (!client) {
      console.log(`⚠️ Le client avec ID ${clientId} n'existe pas dans la base de données`);
    } else {
      console.log(`✅ Client trouvé: ${client.firstName} ${client.lastName} (${client.email})`);
      
      // Vérifier le statut du client
      console.log(`📊 Statut du client: ${client.status || 'non défini'}`);
      
      // Vérifier si le client est banni
      if (client.status === 'banned') {
        console.log('⚠️ Ce client est banni, ce qui pourrait affecter l\'affichage des rendez-vous');
      }
    }
    
    // Vérifier le cluster
    const cluster = await mongoose.connection.db.collection('clusters').findOne({ _id: new mongoose.Types.ObjectId(clusterId) });
    if (!cluster) {
      console.log(`⚠️ Le cluster avec ID ${clusterId} n'existe pas dans la base de données`);
    } else {
      console.log(`✅ Cluster trouvé: ${cluster.name}`);
    }
    
    // Vérifier les rendez-vous du client dans le cluster
    const appointmentsForClient = await mongoose.connection.db.collection('appointments').find({
      member: new mongoose.Types.ObjectId(clientId),
      cluster: new mongoose.Types.ObjectId(clusterId)
    }).toArray();
    
    console.log(`📊 Nombre de rendez-vous trouvés pour ce client dans ce cluster: ${appointmentsForClient.length}`);
    
    if (appointmentsForClient.length === 0) {
      // Vérifier les rendez-vous du client sans filtre de cluster
      const allClientAppointments = await mongoose.connection.db.collection('appointments').find({
        member: new mongoose.Types.ObjectId(clientId)
      }).toArray();
      
      console.log(`📊 Nombre de rendez-vous trouvés pour ce client tous clusters confondus: ${allClientAppointments.length}`);
      
      if (allClientAppointments.length > 0) {
        console.log('⚠️ Le client a des rendez-vous mais dans d\'autres clusters:');
        const clusterIds = [...new Set(allClientAppointments.map(a => a.cluster.toString()))];
        console.log('📊 Clusters avec rendez-vous pour ce client:', clusterIds);
      }
      
      // Vérifier les rendez-vous du cluster
      const clusterAppointments = await mongoose.connection.db.collection('appointments').find({
        cluster: new mongoose.Types.ObjectId(clusterId)
      }).limit(5).toArray();
      
      console.log(`📊 Exemple de rendez-vous pour ce cluster: ${clusterAppointments.length} trouvés`);
      
      if (clusterAppointments.length > 0) {
        console.log('📊 Clients avec rendez-vous dans ce cluster:');
        const memberIds = [...new Set(clusterAppointments.map(a => a.member.toString()))];
        console.log(memberIds);
      }
    } else {
      // Afficher les détails des rendez-vous trouvés
      console.log('📊 Détails des rendez-vous trouvés:');
      for (const appt of appointmentsForClient) {
        console.log(`- ID: ${appt._id}, Date: ${appt.startTime}, Status: ${appt.status}`);
      }
    }
    
    // Tester la requête avec les mêmes paramètres que l'endpoint bulk
    console.log('🔍 Test direct de la requête bulk avec les mêmes paramètres...');
    
    const bulkQuery = {
      member: { $in: [new mongoose.Types.ObjectId(clientId)] },
      cluster: new mongoose.Types.ObjectId(clusterId)
    };
    
    console.log('📊 Requête bulk:', JSON.stringify(bulkQuery));
    
    const bulkResults = await mongoose.connection.db.collection('appointments').find(bulkQuery).toArray();
    console.log(`📊 Résultats de la requête bulk: ${bulkResults.length} trouvés`);
    
    // Vérifier la relation client-cluster
    console.log('🔍 Vérification de la relation client-cluster...');
    const clientClusterRelation = await mongoose.connection.db.collection('clientclusterrelations').findOne({
      clientId: new mongoose.Types.ObjectId(clientId),
      clusterId: new mongoose.Types.ObjectId(clusterId)
    });
    
    if (!clientClusterRelation) {
      console.log('⚠️ Aucune relation trouvée entre ce client et ce cluster');
    } else {
      console.log('✅ Relation client-cluster trouvée');
      console.log(`📊 Statut de la relation: isActive=${clientClusterRelation.isActive}`);
      
      if (clientClusterRelation.preferences && clientClusterRelation.preferences.banned) {
        console.log('⚠️ Ce client est banni dans ce cluster selon la relation');
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  } finally {
    // Fermer la connexion
    await mongoose.disconnect();
    console.log('✅ Connexion à MongoDB fermée');
  }
}

// Exécuter le diagnostic
runDiagnostic()
  .then(() => console.log('✅ Diagnostic terminé'))
  .catch(err => console.error('❌ Erreur lors du diagnostic:', err)); 