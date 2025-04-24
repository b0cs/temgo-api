import mongoose from 'mongoose';
const { Schema } = mongoose;

const nightclubReservationSchema = new Schema({
  // Informations de base
  cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true }, // Boîte de nuit concernée
  tables: [{ type: Schema.Types.ObjectId, ref: 'NightclubTable' }], // Tables réservées
  customer: { 
    type: Schema.Types.ObjectId, 
    ref: 'Member' // Référence au client (si enregistré)
  },
  
  // Informations du client
  customerInfo: {
    name: { type: String, required: true }, // Nom du client principal
    email: { type: String, required: true }, // Email pour confirmation
    phone: { type: String, required: true }, // Téléphone pour contact
    numberOfGuests: { type: Number, required: true }, // Nombre de personnes
    guestNames: [{ type: String }], // Noms des invités (pour liste d'invités)
    notes: { type: String } // Notes spécifiques du client
  },
  
  // Informations temporelles
  date: { type: Date, required: true }, // Date de la réservation
  arrivalTime: { type: String, required: true }, // Heure d'arrivée prévue (format "HH:MM")
  
  // État de la réservation
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'arrived', 'completed', 'cancelled', 'no_show'],
    default: 'pending'
  },
  
  // Processus de confirmation
  confirmationSent: { type: Boolean, default: false }, // Confirmation envoyée
  confirmationSentAt: { type: Date }, // Date d'envoi de la confirmation
  confirmationToken: { type: String }, // Token unique pour confirmation
  isConfirmedByCustomer: { type: Boolean, default: false }, // Si confirmé par le client
  customerConfirmedAt: { type: Date }, // Date de confirmation par le client
  
  // Spécificités boîte de nuit
  bottleService: {
    isRequested: { type: Boolean, default: false }, // Si service bouteille demandé
    bottles: [{ 
      product: { type: String }, // Type de bouteille
      quantity: { type: Number, default: 1 }, // Quantité
      price: { type: Number } // Prix unitaire
    }],
    minimumSpend: { type: Number, default: 0 }, // Dépense minimale
    specialRequests: { type: String } // Demandes spéciales (glaçons, mixers, etc.)
  },
  
  // Occasion
  occasion: { type: String }, // Occasion (anniversaire, enterrement vie garçon/fille, etc.)
  specialOccasionSetup: { type: Boolean, default: false }, // Configuration spéciale requise
  specialOccasionDetails: { type: String }, // Détails pour l'occasion
  
  // Options VIP et entrée
  vipEntryIncluded: { type: Boolean, default: false }, // Entrée VIP incluse
  skipLineAccess: { type: Boolean, default: false }, // Accès sans file d'attente
  guestListOnly: { type: Boolean, default: false }, // Uniquement liste d'invités (sans table)
  
  // Sources et promotions
  source: { type: String, enum: ['website', 'phone', 'app', 'promoter', 'partner', 'walk_in', 'other'], default: 'website' },
  promoterCode: { type: String }, // Code promoteur si applicable
  promoCode: { type: String }, // Code promo si applicable
  
  // Paiements et garanties
  totalAmount: { type: Number }, // Montant total estimé
  depositPaid: { type: Boolean, default: false }, // Si acompte versé
  depositAmount: { type: Number, default: 0 }, // Montant de l'acompte
  depositReference: { type: String }, // Référence du paiement d'acompte
  paymentMethod: { type: String, enum: ['cash', 'card', 'transfer', 'promoter', 'none'], default: 'none' },
  
  // Gestion interne
  internalNotes: { type: String }, // Notes pour le staff
  assignedHost: { type: Schema.Types.ObjectId, ref: 'User' }, // Hôte assigné
  assignedPromoter: { type: Schema.Types.ObjectId, ref: 'User' }, // Promoteur assigné
  
  // Suivi événementiel
  actualArrivalTime: { type: Date }, // Heure d'arrivée réelle
  departureTime: { type: Date }, // Heure de départ
  finalSpend: { type: Number }, // Montant finalement dépensé
  
  // Gestion des problèmes
  cancellationReason: { type: String }, // Raison d'annulation
  noShowAction: { type: String, enum: ['none', 'blacklist', 'require_deposit', 'other'], default: 'none' }, // Action après no-show
  isBlacklisted: { type: Boolean, default: false }, // Client blacklisté
  
  // Statistiques et marketing
  marketingOptIn: { type: Boolean, default: false }, // Accepte de recevoir des offres
  howHeardAboutUs: { type: String }, // Comment le client a connu l'établissement
  feedbackRating: { type: Number, min: 1, max: 5 }, // Évaluation du client
  feedbackComments: { type: String } // Commentaires du client
}, {
  timestamps: true
});

// Indexation pour recherche efficace
nightclubReservationSchema.index({ cluster: 1, date: 1, status: 1 });
nightclubReservationSchema.index({ 'customerInfo.email': 1, 'customerInfo.phone': 1 });
nightclubReservationSchema.index({ date: 1, arrivalTime: 1 });

// Middleware pre-save pour générer un token de confirmation
nightclubReservationSchema.pre('save', async function(next) {
  if (this.isNew && !this.confirmationToken) {
    this.confirmationToken = Math.random().toString(36).substring(2, 15) + 
                             Math.random().toString(36).substring(2, 15);
  }
  next();
});

// Méthode pour vérifier la disponibilité des tables
nightclubReservationSchema.statics.checkTableAvailability = async function(clusterId, date, tables, excludeReservationId = null) {
  // Convertir la date pour la comparaison
  const reservationDate = new Date(date);
  reservationDate.setHours(0, 0, 0, 0);
  
  // Créer la requête pour trouver les réservations qui utilisent ces tables à cette date
  const query = {
    cluster: clusterId,
    tables: { $in: tables },
    date: {
      $gte: reservationDate,
      $lt: new Date(reservationDate.getTime() + 24 * 60 * 60 * 1000)
    },
    status: { $nin: ['cancelled', 'no_show'] }
  };
  
  // Exclure la réservation actuelle si on met à jour
  if (excludeReservationId) {
    query._id = { $ne: excludeReservationId };
  }
  
  const conflictingReservations = await this.find(query);
  return conflictingReservations.length === 0;
};

// Calcul du montant total estimé
nightclubReservationSchema.methods.calculateEstimatedTotal = function() {
  let total = 0;
  
  // Ajouter le minimum spend si défini
  if (this.bottleService.minimumSpend) {
    total += this.bottleService.minimumSpend;
  }
  
  // Ajouter le prix des bouteilles
  if (this.bottleService.isRequested && this.bottleService.bottles.length > 0) {
    total += this.bottleService.bottles.reduce((sum, bottle) => {
      return sum + (bottle.price * bottle.quantity);
    }, 0);
  }
  
  return total;
};

const NightclubReservation = mongoose.model('NightclubReservation', nightclubReservationSchema);
export default NightclubReservation; 