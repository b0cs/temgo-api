/**
 * Script de migration pour synchroniser le statut des clients bannis
 * 
 * Ce script corrige l'incohérence entre le champ status='banned' dans la collection Members 
 * et le champ preferences.banned=true dans la collection ClientClusterRelation
 * 
 * Usage: 
 * 1. Assurez-vous que MongoDB est en cours d'exécution
 * 2. Exécutez: NODE_ENV=development node scripts/fixBannedClients.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Member from '../models/member.model.js';
import ClientClusterRelation from '../models/ClientClusterRelation.js';

// Charger les variables d'environnement
dotenv.config();

// Se connecter à MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI non défini dans les variables d\'environnement');
    }
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connecté à MongoDB');
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error.message);
    process.exit(1);
  }
};

// Synchroniser les clients bannis
const synchronizeBannedClients = async () => {
  try {
    console.log('🔄 Démarrage de la synchronisation des clients bannis...');
    
    // 1. Trouver tous les membres avec status='banned'
    const bannedMembers = await Member.find({ status: 'banned' });
    console.log(`📊 Trouvé ${bannedMembers.length} membres avec status='banned'`);
    
    // 2. Pour chaque membre banni, mettre à jour ses relations cluster
    let updatedRelations = 0;
    
    for (const member of bannedMembers) {
      // Trouver toutes les relations de ce client avec des clusters
      const relations = await ClientClusterRelation.find({ clientId: member._id });
      console.log(`📊 Client ${member.firstName} ${member.lastName} (${member._id}): ${relations.length} relations cluster trouvées`);
      
      // Mettre à jour chaque relation
      for (const relation of relations) {
        // Vérifier si le client est déjà marqué comme banni dans ses préférences
        if (!relation.preferences?.banned) {
          // Mettre à jour les préférences
          relation.preferences = {
            ...relation.preferences,
            banned: true,
            banReason: 'Migration: Client marqué comme banni',
            bannedAt: new Date()
          };
          
          // Désactiver la relation
          relation.isActive = false;
          
          // Sauvegarder les modifications
          await relation.save();
          updatedRelations++;
          console.log(`✅ Relation ID ${relation._id} mise à jour - Client ${member.firstName} ${member.lastName} marqué comme banni`);
        } else {
          console.log(`ℹ️ Relation ID ${relation._id} - Client ${member.firstName} ${member.lastName} déjà marqué comme banni`);
        }
      }
    }
    
    // 3. Trouver toutes les relations avec preferences.banned=true
    const bannedRelations = await ClientClusterRelation.find({ 'preferences.banned': true });
    console.log(`📊 Trouvé ${bannedRelations.length} relations avec preferences.banned=true`);
    
    // 4. Pour chaque relation, mettre à jour le statut du membre
    let updatedMembers = 0;
    
    for (const relation of bannedRelations) {
      // Récupérer le membre
      const member = await Member.findById(relation.clientId);
      
      if (member && member.status !== 'banned') {
        // Mettre à jour le statut
        member.status = 'banned';
        await member.save();
        updatedMembers++;
        console.log(`✅ Membre ID ${member._id} (${member.firstName} ${member.lastName}) statut mis à jour à 'banned'`);
      } else if (!member) {
        console.log(`⚠️ Membre ID ${relation.clientId} non trouvé pour la relation ${relation._id}`);
      } else {
        console.log(`ℹ️ Membre ID ${member._id} (${member.firstName} ${member.lastName}) déjà marqué comme 'banned'`);
      }
    }
    
    console.log('\n📝 Résumé:');
    console.log(`- ${bannedMembers.length} membres avec status='banned' trouvés`);
    console.log(`- ${updatedRelations} relations mises à jour`);
    console.log(`- ${bannedRelations.length} relations avec preferences.banned=true trouvées`);
    console.log(`- ${updatedMembers} membres dont le statut a été mis à jour à 'banned'`);
    
    return { bannedMembers: bannedMembers.length, updatedRelations, bannedRelations: bannedRelations.length, updatedMembers };
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation des clients bannis:', error);
    throw error;
  }
};

// Fonction principale
const main = async () => {
  try {
    await connectDB();
    const results = await synchronizeBannedClients();
    console.log('✅ Synchronisation des clients bannis terminée avec succès!');
    // Fermer la connexion à MongoDB
    await mongoose.disconnect();
    console.log('📡 Déconnecté de MongoDB');
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  }
};

// Exécuter le script
main(); 