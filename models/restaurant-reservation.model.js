import mongoose from 'mongoose';
const { Schema } = mongoose;

const reservationSchema = new Schema({
  // Informations de base
  cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true }, // Restaurant concerné
  tables: [{ type: Schema.Types.ObjectId, ref: 'RestaurantTable' }], // Tables réservées (peut être plusieurs)
  customer: { 
    type: Schema.Types.ObjectId, 
    ref: 'Member' // Référence au client (si enregistré)
  },
  
  // Informations du client (si pas enregistré ou informations spécifiques à cette réservation)
  customerInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    numberOfGuests: { type: Number, required: true },
    notes: { type: String } // Notes spécifiques du client
  },
  
  // Informations temporelles
  date: { type: Date, required: true }, // Date de la réservation
  time: { type: String, required: true }, // Heure de la réservation (format "HH:MM")
  duration: { type: Number, default: 120 }, // Durée prévue en minutes (par défaut 2h)
  
  // État de la réservation
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },
  
  // Processus de confirmation
  confirmationSent: { type: Boolean, default: false }, // Si un mail/SMS de confirmation a été envoyé
  confirmationSentAt: { type: Date }, // Date d'envoi de la confirmation
  confirmationToken: { type: String }, // Token unique pour la confirmation
  isConfirmedByCustomer: { type: Boolean, default: false }, // Si le client a confirmé
  customerConfirmedAt: { type: Date }, // Date de confirmation par le client
  
  // Détails supplémentaires
  source: { type: String, enum: ['website', 'phone', 'walk_in', 'app', 'partner', 'other'], default: 'website' }, // Source de la réservation
  specialRequests: { type: String }, // Demandes spéciales (allergie, occasion spéciale, etc.)
  occasion: { type: String }, // Occasion (anniversaire, etc.)
  
  // Préférences de table
  tablePreferences: {
    area: { type: String, enum: ['indoor', 'outdoor', 'bar', 'private', 'no_preference'], default: 'no_preference' },
    isQuietArea: { type: Boolean }, // Préférence pour une zone calme
    isNearWindow: { type: Boolean }, // Préférence pour être près d'une fenêtre
    isAccessible: { type: Boolean } // Besoin d'accessibilité
  },
  
  // Informations pour le restaurant
  internalNotes: { type: String }, // Notes internes pour le staff
  reminderSent: { type: Boolean, default: false }, // Si un rappel a été envoyé
  reminderSentAt: { type: Date }, // Date d'envoi du rappel
  
  // Détails du repas (remplis après le service)
  mealDetails: {
    actualSeatedTime: { type: Date }, // Heure d'arrivée réelle
    actualEndTime: { type: Date }, // Heure de départ réelle
    totalSpent: { type: Number }, // Montant total dépensé
    billNumber: { type: String }, // Numéro de facture
    feedbackScore: { type: Number, min: 1, max: 5 }, // Note donnée par le client
    feedbackComments: { type: String } // Commentaires du client
  },
  
  // Gestion des attentes
  isWaitlist: { type: Boolean, default: false }, // Si c'est une entrée en liste d'attente
  waitlistPosition: { type: Number }, // Position sur la liste d'attente
  
  // Paiements et garanties
  depositPaid: { type: Boolean, default: false }, // Si un acompte a été versé
  depositAmount: { type: Number }, // Montant de l'acompte
  cancellationPolicy: { type: String }, // Politique d'annulation appliquée
  paymentMethod: { type: String, enum: ['cash', 'card', 'transfer', 'none'], default: 'none' },
  paymentReference: { type: String }, // Référence de paiement
  
  // Gestion par l'équipe
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' }, // Membre du personnel assigné
  lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Dernière personne à avoir modifié
  cancellationReason: { type: String }, // Raison d'annulation
  noShowAction: { type: String, enum: ['none', 'blacklist', 'require_deposit', 'other'], default: 'none' } // Action suite à un no-show
}, {
  timestamps: true
});

// Indexation pour la recherche efficace
reservationSchema.index({ cluster: 1, date: 1, status: 1 });
reservationSchema.index({ 'customerInfo.email': 1, 'customerInfo.phone': 1 });
reservationSchema.index({ date: 1, time: 1 });

// Middleware pre-save
reservationSchema.pre('save', async function(next) {
  // Si c'est une nouvelle réservation, générer un token de confirmation
  if (this.isNew && !this.confirmationToken) {
    this.confirmationToken = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);
  }
  
  next();
});

// Méthode pour vérifier la disponibilité des tables
reservationSchema.statics.checkTableAvailability = async function(clusterId, date, time, duration, tableIds, excludeReservationId = null) {
  // Convertir l'heure (HH:MM) en objet Date pour la comparaison
  const requestDate = new Date(date);
  const [hours, minutes] = time.split(':').map(Number);
  requestDate.setHours(hours, minutes, 0, 0);
  
  // Calculer l'heure de fin en fonction de la durée (en minutes)
  const endTime = new Date(requestDate.getTime() + duration * 60000);
  
  // Créer la requête pour trouver les réservations qui se chevauchent
  const query = {
    cluster: clusterId,
    tables: { $in: tableIds },
    status: { $nin: ['cancelled', 'no_show'] },
    $or: [
      // Réservation qui commence pendant notre créneau
      { date: requestDate.toISOString().split('T')[0], time: { $gte: time, $lt: endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) } },
      // Réservation qui finit pendant notre créneau
      // (Ceci est simplifié - pour une implémentation complète, il faudrait calculer précisément l'heure de fin)
      { date: requestDate.toISOString().split('T')[0], time: { $lt: time } }
    ]
  };
  
  // Exclure la réservation actuelle si on vérifie pour une mise à jour
  if (excludeReservationId) {
    query._id = { $ne: excludeReservationId };
  }
  
  const overlappingReservations = await this.find(query);
  return overlappingReservations.length === 0;
};

const Reservation = mongoose.model('Reservation', reservationSchema);
export default Reservation; 