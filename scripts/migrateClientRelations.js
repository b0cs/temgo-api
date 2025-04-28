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

// Importer les modèles
import '../models/ClientClusterRelation.js';
import '../models/member.model.js';
import '../models/appointment.model.js';

// Récupérer les modèles depuis mongoose
const Member = mongoose.model('Member');
const ClientClusterRelation = mongoose.model('ClientClusterRelation');
const Appointment = mongoose.model('Appointment');

// Fonction principale de migration
async function migrateClientRelations() {
  try {
    console.log('Démarrage de la migration des relations client-cluster...');
    
    // Se connecter à la base de données
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connecté à MongoDB');
    
    // 1. Récupérer tous les membres qui sont des clients
    const members = await Member.find({ role: 'client' });
    console.log(`${members.length} clients trouvés à migrer`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // 2. Pour chaque client, créer une relation avec son cluster actuel
    for (const member of members) {
      try {
        // Vérifier si le client a un cluster assigné
        if (!member.cluster) {
          console.log(`Client ${member._id} (${member.firstName} ${member.lastName}) n'a pas de cluster assigné, ignoré`);
          continue;
        }
        
        // Vérifier si la relation existe déjà
        const existingRelation = await ClientClusterRelation.findOne({
          client: member._id,
          cluster: member.cluster
        });
        
        if (existingRelation) {
          console.log(`Relation déjà existante pour le client ${member._id} avec le cluster ${member.cluster}, ignorée`);
          continue;
        }
        
        // Récupérer les statistiques du client dans ce cluster (rendez-vous, dépenses, etc.)
        let totalSpent = 0;
        let lastVisit = null;
        let visitsCount = 0;
        
        // Récupérer tous les rendez-vous du client
        const appointments = await Appointment.find({
          member: member._id,
          cluster: member.cluster,
          status: 'completed' // Ne compter que les rendez-vous terminés
        }).populate('service');
        
        // Calculer les statistiques
        if (appointments.length > 0) {
          visitsCount = appointments.length;
          
          // Calculer le montant total dépensé
          for (const appointment of appointments) {
            if (appointment.service && typeof appointment.service.price === 'number') {
              totalSpent += appointment.service.price;
            }
          }
          
          // Trouver la date de dernière visite
          const lastAppointment = appointments.reduce((latest, current) => {
            if (!latest || new Date(current.startTime) > new Date(latest.startTime)) {
              return current;
            }
            return latest;
          }, null);
          
          if (lastAppointment) {
            lastVisit = lastAppointment.startTime;
          }
        }
        
        // Créer la nouvelle relation
        const newRelation = new ClientClusterRelation({
          client: member._id,
          cluster: member.cluster,
          joinedAt: member.createdAt || new Date(),
          lastVisit: lastVisit,
          totalSpent: totalSpent,
          visitsCount: visitsCount,
          preferences: member.notes || '', // Utiliser les notes comme préférences initiales
        });
        
        await newRelation.save();
        successCount++;
        
        console.log(`✅ Relation créée pour le client ${member._id} (${member.firstName} ${member.lastName}) avec le cluster ${member.cluster}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Erreur lors de la migration du client ${member._id}:`, error.message);
      }
    }
    
    console.log(`Migration terminée: ${successCount} relations créées, ${errorCount} erreurs`);
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  } finally {
    // Fermer la connexion à la base de données
    await mongoose.disconnect();
    console.log('Déconnecté de MongoDB');
  }
}

// Exécuter la migration
migrateClientRelations(); 