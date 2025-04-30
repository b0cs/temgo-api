import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Member from '../models/member.model.js';

// Charger les variables d'environnement
dotenv.config();

// Définir le cluster ID pour le test
const CLUSTER_ID = '6810bf8dc3736cc9495fd271'; // À remplacer par l'ID du cluster à tester

// Fonction principale
async function testAllClientsRetrieval() {
  try {
    // Se connecter à MongoDB
    console.log('Tentative de connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connecté à MongoDB avec succès');

    // 1. Récupérer tous les clients du cluster
    console.log(`\n1. Récupération de tous les clients du cluster ${CLUSTER_ID}...`);
    
    const allMembers = await Member.find({
      cluster: new mongoose.Types.ObjectId(CLUSTER_ID),
      role: 'client'
    }).lean();
    
    console.log(`✅ Trouvé ${allMembers.length} clients au total`);
    
    // 2. Compter les clients par statut
    console.log('\n2. Répartition des clients par statut:');
    
    const statuses = {};
    allMembers.forEach(member => {
      const status = member.status || 'unknown';
      if (!statuses[status]) {
        statuses[status] = 0;
      }
      statuses[status]++;
    });
    
    for (const [status, count] of Object.entries(statuses)) {
      console.log(`- ${status}: ${count} clients`);
    }
    
    // 3. Afficher les détails de tous les clients
    console.log('\n3. Détails de tous les clients:');
    allMembers.forEach((member, index) => {
      console.log(`\nClient ${index + 1}: ${member.firstName} ${member.lastName}`);
      console.log(`- ID: ${member._id}`);
      console.log(`- Email: ${member.email}`);
      console.log(`- Status: ${member.status || 'Non défini'}`);
      console.log(`- Cluster: ${member.cluster}`);
    });
    
    // 4. Tester le filtrage comme dans le contrôleur
    console.log('\n4. Simulation du filtrage comme dans le contrôleur:');
    
    // 4.1 Filtrer les clients bannis
    const bannedClients = allMembers.filter(client => 
      client.status === 'banned'
    );
    console.log(`- Clients bannis: ${bannedClients.length}`);
    
    // 4.2 Filtrer les clients actifs (non bannis)
    const activeClients = allMembers.filter(client => 
      client.status !== 'banned' && client.status !== 'deleted'
    );
    console.log(`- Clients actifs: ${activeClients.length}`);
    
    // 4.3 Clients supprimés
    const deletedClients = allMembers.filter(client => 
      client.status === 'deleted'
    );
    console.log(`- Clients supprimés: ${deletedClients.length}`);
    
    console.log('\n5. Résumé des clients bannis:');
    if (bannedClients.length > 0) {
      bannedClients.forEach((client, index) => {
        console.log(`${index + 1}. ${client.firstName} ${client.lastName} (${client._id})`);
      });
    } else {
      console.log('Aucun client banni trouvé');
    }
    
    console.log('\n6. Vérifier les relations client-cluster:');
    // Si vous avez besoin de vérifier les relations, ajoutez le code ici
    
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

// Exécuter le script
testAllClientsRetrieval(); 