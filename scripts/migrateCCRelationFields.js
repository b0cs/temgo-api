// Script pour migrer les champs client/cluster vers clientId/clusterId dans les relations client-cluster
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Obtenir le chemin du fichier actuel
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chargement des variables d'environnement
dotenv.config();

// URL de connexion MongoDB depuis les variables d'environnement
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/temgo';

// Définition du schéma pour Member (client)
const memberSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  passwordHash: String,
  role: String,
  cluster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cluster'
  },
  isActive: Boolean,
  status: String
}, { timestamps: true });

// Définition du schéma pour la collection ClientClusterRelation
const clientClusterRelationSchema = new mongoose.Schema(
  {
    // Anciens champs
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    cluster: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cluster'
    },
    // Nouveaux champs
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member'
    },
    clusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cluster'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    preferences: {
      preferredStylists: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
      }],
      preferredTreatments: [String],
      notes: String
    },
    lastVisit: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Création des modèles
const Member = mongoose.model('Member', memberSchema);
const ClientClusterRelation = mongoose.model('ClientClusterRelation', clientClusterRelationSchema);

// Fonction principale pour effectuer la migration
async function migrateFields() {
  console.log('🔄 Début de la migration des champs client/cluster vers clientId/clusterId...');
  
  try {
    // Connexion à la base de données
    await mongoose.connect(MONGODB_URI);
    console.log(`MongoDB connecté: ${mongoose.connection.host}`);
    
    // PARTIE 1: Migration des relations existantes
    console.log('📊 PARTIE 1: Migration des relations existantes');
    
    // Trouver toutes les relations qui ont les anciens champs mais pas les nouveaux
    const relations = await ClientClusterRelation.find({
      $or: [
        { client: { $exists: true }, clientId: { $exists: false } },
        { cluster: { $exists: true }, clusterId: { $exists: false } }
      ]
    });
    
    console.log(`  ✅ ${relations.length} relations trouvées avec les anciens champs`);
    
    // Compteurs pour le suivi
    let updatedRelations = 0;
    let relationErrors = 0;
    
    // Mise à jour de chaque relation
    for (const relation of relations) {
      try {
        // Copier les valeurs des anciens champs vers les nouveaux
        if (relation.client && !relation.clientId) {
          relation.clientId = relation.client;
        }
        if (relation.cluster && !relation.clusterId) {
          relation.clusterId = relation.cluster;
        }
        
        // Sauvegarder les modifications
        await relation.save();
        updatedRelations++;
      } catch (error) {
        console.error(`  ❌ Erreur lors de la mise à jour de la relation ${relation._id}:`, error);
        relationErrors++;
      }
    }
    
    console.log(`  ✅ Migration partie 1 terminée: ${updatedRelations} relations mises à jour, ${relationErrors} erreurs`);
    
    // PARTIE 2: Création de relations pour les clients existants
    console.log('📊 PARTIE 2: Création de relations pour les clients existants');
    
    // Trouver tous les clients qui ont un cluster mais pas de relation
    const clients = await Member.find({
      role: 'client',
      cluster: { $exists: true, $ne: null },
      status: { $ne: 'deleted' } // Exclure les clients supprimés
    }).lean();
    
    console.log(`  ✅ ${clients.length} clients trouvés avec un cluster`);
    
    // Compteurs pour le suivi
    let createdRelations = 0;
    let clientErrors = 0;
    let skippedClients = 0;
    
    // Pour chaque client, vérifier s'il a déjà une relation et en créer une si nécessaire
    for (const client of clients) {
      try {
        // Vérifier si une relation existe déjà pour ce client et ce cluster
        const existingRelation = await ClientClusterRelation.findOne({
          $or: [
            { client: client._id, cluster: client.cluster },
            { clientId: client._id, clusterId: client.cluster }
          ]
        });
        
        if (existingRelation) {
          skippedClients++;
          continue; // Passer au client suivant
        }
        
        // Créer une nouvelle relation
        const newRelation = new ClientClusterRelation({
          clientId: client._id,
          clusterId: client.cluster,
          isActive: true,
          preferences: {
            preferredStylists: [],
            preferredTreatments: [],
            notes: ''
          }
        });
        
        await newRelation.save();
        createdRelations++;
        
        console.log(`  ✅ Relation créée pour le client ${client.firstName} ${client.lastName} (${client._id})`);
      } catch (error) {
        console.error(`  ❌ Erreur lors de la création de la relation pour le client ${client._id}:`, error);
        clientErrors++;
      }
    }
    
    console.log(`  ✅ Migration partie 2 terminée: ${createdRelations} relations créées, ${skippedClients} clients ignorés, ${clientErrors} erreurs`);
    console.log('🎉 Migration complète terminée');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    // Déconnexion de la base de données
    console.log('📡 Déconnecté de MongoDB');
    await mongoose.disconnect();
  }
}

// Exécuter la migration
migrateFields(); 