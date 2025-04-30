import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Member from '../models/member.model.js';
import ClientClusterRelation from '../models/ClientClusterRelation.js';

// Charger les variables d'environnement
dotenv.config();

// Définir le cluster ID pour le test
const CLUSTER_ID = '6810bf8dc3736cc9495fd271'; // À remplacer par l'ID du cluster à tester

// Fonction principale
async function testBannedClientsRetrieval() {
  try {
    // Se connecter à MongoDB
    console.log('Tentative de connexion à MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connecté à MongoDB avec succès');

    // 1. Trouver les clients bannis via les relations ClientClusterRelation
    console.log('\n1. Recherche des clients bannis via les relations...');
    
    // 1.1 Relations avec isActive=false
    const inactiveRelations = await ClientClusterRelation.find({
      clusterId: new mongoose.Types.ObjectId(CLUSTER_ID),
      isActive: false
    }).populate('clientId', 'firstName lastName email phone status');
    
    console.log(`Trouvé ${inactiveRelations.length} relations inactives`);
    
    // 1.2 Relations avec preferences.banned=true
    const bannedRelations = await ClientClusterRelation.find({
      clusterId: new mongoose.Types.ObjectId(CLUSTER_ID),
      'preferences.banned': true
    }).populate('clientId', 'firstName lastName email phone status');
    
    console.log(`Trouvé ${bannedRelations.length} relations avec banned=true dans les préférences`);
    
    // 1.3 Toutes les relations avec le cluster
    const allRelations = await ClientClusterRelation.find({
      clusterId: new mongoose.Types.ObjectId(CLUSTER_ID)
    }).populate('clientId', 'firstName lastName email phone status');
    
    console.log(`Trouvé ${allRelations.length} relations totales avec ce cluster`);
    
    // Afficher les détails des relations
    console.log('\nDétails des relations inactives:');
    inactiveRelations.forEach((rel, index) => {
      console.log(`${index + 1}. Relation ID: ${rel._id}`);
      console.log(`   Client: ${rel.clientId?.firstName} ${rel.clientId?.lastName}`);
      console.log(`   Client ID: ${rel.clientId?._id}`);
      console.log(`   Status: ${rel.clientId?.status}`);
      console.log(`   isActive: ${rel.isActive}`);
      console.log(`   Banned dans preferences: ${rel.preferences?.banned === true}`);
    });
    
    // 2. Trouver les clients bannis directement dans la collection members
    console.log('\n2. Recherche des clients bannis dans la collection members...');
    
    // 2.1 Clients avec status=banned
    const bannedMembers = await Member.find({
      status: 'banned',
      role: 'client'
    }).select('_id firstName lastName email phone status cluster');
    
    console.log(`Trouvé ${bannedMembers.length} clients avec status='banned'`);
    
    // 2.2 Clients avec status=banned liés au cluster
    const bannedMembersInCluster = await Member.find({
      cluster: new mongoose.Types.ObjectId(CLUSTER_ID),
      status: 'banned',
      role: 'client'
    }).select('_id firstName lastName email phone status');
    
    console.log(`Trouvé ${bannedMembersInCluster.length} clients avec status='banned' liés au cluster`);
    
    // Afficher les détails des clients bannis
    console.log('\nDétails des clients bannis dans members:');
    bannedMembers.forEach((member, index) => {
      console.log(`${index + 1}. Client ID: ${member._id}`);
      console.log(`   Nom: ${member.firstName} ${member.lastName}`);
      console.log(`   Email: ${member.email}`);
      console.log(`   Cluster: ${member.cluster}`);
      console.log(`   Dans le cluster cible: ${member.cluster?.toString() === CLUSTER_ID}`);
    });
    
    // 3. Fusion des résultats uniques
    console.log('\n3. Fusion des résultats pour récupérer tous les clients bannis uniques...');
    
    // Collecter tous les IDs clients des relations
    const bannedClientIdsFromRelations = new Set();
    inactiveRelations.forEach(rel => {
      if (rel.clientId?._id) {
        bannedClientIdsFromRelations.add(rel.clientId._id.toString());
      }
    });
    
    bannedRelations.forEach(rel => {
      if (rel.clientId?._id) {
        bannedClientIdsFromRelations.add(rel.clientId._id.toString());
      }
    });
    
    // Collecter tous les IDs clients bannis directement
    const bannedClientIdsFromMembers = new Set();
    bannedMembersInCluster.forEach(member => {
      bannedClientIdsFromMembers.add(member._id.toString());
    });
    
    // Fusionner les ensembles
    const allBannedClientIds = new Set([
      ...bannedClientIdsFromRelations,
      ...bannedClientIdsFromMembers
    ]);
    
    console.log(`✅ Total final: ${allBannedClientIds.size} clients bannis uniques`);
    console.log('Liste des IDs de clients bannis:');
    console.log(Array.from(allBannedClientIds));
    
    // 4. Vérification complète en utilisant plusieurs approches
    console.log('\n4. Recherche exhaustive avec plusieurs approches...');
    
    // 4.1 Pipeline d'agrégation pour trouver tous les clients qui pourraient être bannis
    const pipeline = [
      // Match clients in the cluster
      {
        $match: {
          clusterId: new mongoose.Types.ObjectId(CLUSTER_ID)
        }
      },
      // Lookup from members collection
      {
        $lookup: {
          from: 'members',
          localField: 'clientId',
          foreignField: '_id',
          as: 'clientInfo'
        }
      },
      // Unwind clientInfo array
      {
        $unwind: {
          path: '$clientInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      // Match clients who are banned or inactive
      {
        $match: {
          $or: [
            { 'clientInfo.status': 'banned' },
            { isActive: false, 'preferences.banned': true }
          ]
        }
      },
      // Project needed fields
      {
        $project: {
          _id: 1,
          clientId: 1,
          'clientInfo._id': 1,
          'clientInfo.firstName': 1,
          'clientInfo.lastName': 1,
          'clientInfo.status': 1,
          isActive: 1,
          'preferences.banned': 1
        }
      }
    ];
    
    const potentiallyBannedClients = await ClientClusterRelation.aggregate(pipeline);
    console.log(`Trouvé ${potentiallyBannedClients.length} clients potentiellement bannis via agrégation`);
    
    // Afficher les détails
    console.log('\nDétails des clients potentiellement bannis:');
    potentiallyBannedClients.forEach((client, index) => {
      console.log(`${index + 1}. Relation ID: ${client._id}`);
      console.log(`   Client ID: ${client.clientInfo?._id}`);
      console.log(`   Nom: ${client.clientInfo?.firstName} ${client.clientInfo?.lastName}`);
      console.log(`   Status: ${client.clientInfo?.status}`);
      console.log(`   isActive: ${client.isActive}`);
      console.log(`   Banned in preferences: ${client.preferences?.banned === true}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    // Fermer la connexion
    await mongoose.disconnect();
    console.log('\n✅ Déconnecté de MongoDB');
  }
}

// Exécuter le script
testBannedClientsRetrieval(); 