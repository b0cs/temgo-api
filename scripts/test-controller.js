import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Member from '../models/member.model.js';
import ClientClusterRelation from '../models/ClientClusterRelation.js';

// Charger les variables d'environnement
dotenv.config();

// Définir le cluster ID pour le test
const CLUSTER_ID = '6810bf8dc3736cc9495fd271'; // À remplacer par l'ID du cluster à tester

// Fonction qui simule la fonction getClientsByCluster du contrôleur
async function simulateGetClientsByCluster(clusterId, includeBanned) {
  console.log('🔍 Simulation getClientsByCluster - Request params:', { clusterId, includeBanned });
    
  if (!mongoose.Types.ObjectId.isValid(clusterId)) {
    console.error('ID d\'établissement invalide');
    return [];
  }

  console.time('getClientsByCluster');

  // Approche simplifiée pour récupérer TOUS les clients avec ce cluster ID
  const members = await Member.find({
    cluster: new mongoose.Types.ObjectId(clusterId),
    role: 'client'
  }).lean();
  
  console.log(`✅ Trouvé ${members.length} clients directement associés au cluster dans la collection members`);
  
  // Formatter les clients pour la réponse
  const formattedClients = members.map(member => {
    // Créer un format de réponse cohérent
    return {
      _id: `client_${member._id}`,
      clientId: member._id,
      clusterId: clusterId,
      isActive: member.status !== 'banned' && member.status !== 'deleted',
      joinedAt: member.createdAt || new Date(),
      lastVisit: null,
      totalSpent: 0,
      visitsCount: 0,
      preferences: { 
        banned: member.status === 'banned',
        deleted: member.status === 'deleted'
      },
      favoriteServices: [],
      clientInfo: {
        _id: member._id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        status: member.status,
        deletedAt: member.deletedAt,
        anonymizedData: member.anonymizedData
      }
    };
  });
  
  // Si vous souhaitez filtrer selon le paramètre includeBanned
  let filteredClients = formattedClients;
  
  if (includeBanned === 'true') {
    // Ne garder que les clients bannis
    filteredClients = formattedClients.filter(client => 
      client.clientInfo.status === 'banned' || client.preferences.banned
    );
    console.log(`✅ Filtrage: ${filteredClients.length} clients bannis retenus`);
  } else if (includeBanned !== 'all') {
    // Exclure les clients bannis (comportement par défaut)
    filteredClients = formattedClients.filter(client => 
      client.clientInfo.status !== 'banned' && !client.preferences.banned
    );
    console.log(`✅ Filtrage: ${filteredClients.length} clients actifs retenus (non bannis)`);
  }

  console.timeEnd('getClientsByCluster');
  console.log(`✅ Récupéré au total ${filteredClients.length} clients`);

  return filteredClients;
}

// Fonction principale de test
async function testControllerFunction() {
  try {
    // Se connecter à MongoDB
    console.log('Tentative de connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connecté à MongoDB avec succès');

    // Tester la fonction avec différents paramètres
    console.log('\n1. Test avec includeBanned=true (clients bannis uniquement):');
    const bannedClients = await simulateGetClientsByCluster(CLUSTER_ID, 'true');
    
    console.log('\n2. Test avec includeBanned=false (clients actifs uniquement):');
    const activeClients = await simulateGetClientsByCluster(CLUSTER_ID, 'false');
    
    console.log('\n3. Test avec includeBanned=all (tous les clients):');
    const allClients = await simulateGetClientsByCluster(CLUSTER_ID, 'all');
    
    // Afficher les résultats finaux
    console.log('\n----- RÉSUMÉ DES RÉSULTATS -----');
    console.log(`Clients bannis: ${bannedClients.length}`);
    console.log(`Clients actifs: ${activeClients.length}`);
    console.log(`Total clients: ${allClients.length}`);
    
    // Afficher les détails des clients bannis
    if (bannedClients.length > 0) {
      console.log('\nDétails des clients bannis:');
      bannedClients.forEach((client, index) => {
        console.log(`${index + 1}. ${client.clientInfo.firstName} ${client.clientInfo.lastName}`);
        console.log(`   ID: ${client.clientInfo._id}`);
        console.log(`   Status: ${client.clientInfo.status}`);
        console.log(`   Email: ${client.clientInfo.email}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    // Fermer la connexion
    try {
      await mongoose.disconnect();
      console.log('\n✅ Déconnecté de MongoDB');
    } catch (err) {
      console.error('Erreur lors de la déconnexion:', err);
    }
  }
}

// Exécuter le script de test
testControllerFunction(); 