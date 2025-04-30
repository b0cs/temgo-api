// Script pour diagnostiquer et corriger les problèmes d'affichage des clients bannis
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

// Vérifier si l'argument pour forcer les corrections est passé
const FORCE_FIX = process.argv.includes('--force');

async function fixClients() {
  console.log('🔍 Démarrage du diagnostic des clients bannis...');
  console.log(`📊 Mode: ${FORCE_FIX ? 'Correction forcée' : 'Diagnostic seulement'}`);
  
  try {
    // Connexion à MongoDB
    console.log('🔄 Tentative de connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connexion à MongoDB établie');

    // 1. Vérifier la collection ClientClusterRelation
    console.log('\n🔍 Vérification de la collection clientclusterrelations...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const hasRelationsCollection = collections.some(coll => 
      coll.name === 'clientclusterrelations' || coll.name === 'client-cluster-relations'
    );
    
    if (!hasRelationsCollection) {
      console.log('⚠️ La collection clientclusterrelations n\'existe pas dans la base de données');
      return;
    }
    
    console.log('✅ Collection clientclusterrelations trouvée');

    // 2. Vérifier les relations qui pourraient avoir des problèmes
    console.log('\n🔍 Recherche de relations client-cluster problématiques...');
    
    // Rechercher les relations où le client est banni mais isActive=true
    const inconsistentRelations = await mongoose.connection.db.collection('clientclusterrelations').find({
      $or: [
        // Cas 1: preferences.banned=true mais isActive=true
        { 'preferences.banned': true, 'isActive': true },
        // Cas 2: isActive=false mais preferences.banned n'existe pas ou est false
        { 'isActive': false, $or: [
          { 'preferences.banned': { $exists: false } },
          { 'preferences.banned': false }
        ]}
      ]
    }).toArray();
    
    console.log(`📊 Nombre de relations inconsistantes trouvées: ${inconsistentRelations.length}`);
    
    if (inconsistentRelations.length > 0) {
      console.log('📝 Détails des problèmes:');
      
      const bannedButActive = inconsistentRelations.filter(r => 
        r.preferences?.banned === true && r.isActive === true
      );
      
      const inactiveButNotBanned = inconsistentRelations.filter(r => 
        r.isActive === false && (!r.preferences?.banned || r.preferences.banned === false)
      );
      
      console.log(`- Relations où le client est marqué comme banni mais isActive=true: ${bannedButActive.length}`);
      console.log(`- Relations où isActive=false mais preferences.banned n'est pas défini ou est false: ${inactiveButNotBanned.length}`);
      
      // Si mode correction, appliquer les corrections
      if (FORCE_FIX) {
        console.log('\n🔧 Application des corrections...');
        
        // Corriger le cas 1: preferences.banned=true mais isActive=true
        if (bannedButActive.length > 0) {
          const result1 = await mongoose.connection.db.collection('clientclusterrelations').updateMany(
            { 'preferences.banned': true, 'isActive': true },
            { $set: { 'isActive': false } }
          );
          
          console.log(`✅ Correction du cas 1 - Relations mises à jour: ${result1.modifiedCount}`);
        }
        
        // Corriger le cas 2: isActive=false mais preferences.banned n'existe pas ou est false
        if (inactiveButNotBanned.length > 0) {
          const result2 = await mongoose.connection.db.collection('clientclusterrelations').updateMany(
            { 'isActive': false, $or: [
              { 'preferences.banned': { $exists: false } },
              { 'preferences.banned': false }
            ]},
            { $set: { 'preferences.banned': true } }
          );
          
          console.log(`✅ Correction du cas 2 - Relations mises à jour: ${result2.modifiedCount}`);
        }
      } else {
        console.log('\n⚠️ Mode diagnostic uniquement. Pour appliquer les corrections, utilisez l\'argument --force');
      }
    } else {
      console.log('✅ Toutes les relations client-cluster sont cohérentes');
    }
    
    // 3. Vérifier les clients bannis dans la collection members
    console.log('\n🔍 Vérification des clients bannis dans la collection members...');
    
    const bannedMembers = await mongoose.connection.db.collection('members').find({
      'status': 'banned'
    }).toArray();
    
    console.log(`📊 Nombre de clients avec status='banned': ${bannedMembers.length}`);
    
    // 4. Vérifier le contrôleur client pour le endpoint getClientsByCluster
    console.log('\n🔍 Pour que l\'affichage des clients bannis fonctionne:');
    console.log('1. Assurez-vous que le contrôleur client.controller.js utilise correctement le paramètre includeBanned');
    console.log('2. Dans le frontend, utilisez le paramètre ?includeBanned=true lors de l\'appel à getClientsByCluster');
    console.log('3. Vérifiez que les clients bannis ont bien isActive=false ET preferences.banned=true');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  } finally {
    // Fermer la connexion
    await mongoose.disconnect();
    console.log('\n✅ Connexion à MongoDB fermée');
  }
}

// Exécuter le diagnostic
fixClients()
  .then(() => console.log('✅ Diagnostic terminé'))
  .catch(err => console.error('❌ Erreur lors du diagnostic:', err)); 