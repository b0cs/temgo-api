import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configurer __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Se connecter à MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connecté: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Erreur de connexion à MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Fonction principale pour la migration
const migrateClientRelations = async () => {
  try {
    console.log('🔄 Début de la migration des champs client/cluster vers clientId/clusterId...');
    
    // Connexion à la base de données
    const conn = await connectDB();
    
    // Accéder directement à la collection pour effectuer les mises à jour
    const collection = conn.connection.db.collection('clientclusterrelations');
    
    // 1. Trouver toutes les relations qui utilisent les anciens champs
    const relations = await collection.find({
      $or: [
        { client: { $exists: true } },
        { cluster: { $exists: true } }
      ]
    }).toArray();
    
    console.log(`✅ ${relations.length} relations trouvées avec les anciens champs`);
    
    // 2. Migrer chaque relation
    let successCount = 0;
    let errorCount = 0;
    
    for (const relation of relations) {
      try {
        // Préparation des mises à jour
        const updates = {};
        
        // Mettre à jour le champ client en clientId s'il existe
        if (relation.client) {
          updates.clientId = relation.client;
        }
        
        // Mettre à jour le champ cluster en clusterId s'il existe
        if (relation.cluster) {
          updates.clusterId = relation.cluster;
        }
        
        // Effectuer la mise à jour seulement si des champs doivent être modifiés
        if (Object.keys(updates).length > 0) {
          await collection.updateOne(
            { _id: relation._id },
            { $set: updates }
          );
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Erreur lors de la migration de la relation ${relation._id}:`, err);
        errorCount++;
      }
    }
    
    console.log(`✅ Migration terminée: ${successCount} relations mises à jour, ${errorCount} erreurs`);
    
    // 3. Vérifier qu'il n'y a plus de relations sans les nouveaux champs
    const remainingOldFormat = await collection.countDocuments({
      $or: [
        { clientId: { $exists: false } },
        { clusterId: { $exists: false } }
      ]
    });
    
    if (remainingOldFormat > 0) {
      console.log(`⚠️ Attention: ${remainingOldFormat} relations n'ont toujours pas les nouveaux champs`);
    } else {
      console.log('🎉 Toutes les relations ont maintenant les nouveaux champs');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    // Fermer la connexion à la base de données
    await mongoose.disconnect();
    console.log('📡 Déconnecté de MongoDB');
  }
};

// Exécuter la migration
migrateClientRelations(); 