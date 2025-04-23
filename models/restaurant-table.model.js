import mongoose from 'mongoose';
const { Schema } = mongoose;

const tableSchema = new Schema({
  number: { type: Number, required: true }, // Numéro de table
  name: { type: String }, // Nom optionnel de la table (ex: "Terrasse 1", "Salón VIP")
  capacity: { type: Number, required: true }, // Nombre de places
  cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true }, // Restaurant associé
  
  // Emplacement physique
  location: { 
    area: { type: String, enum: ['indoor', 'outdoor', 'bar', 'private', 'other'], default: 'indoor' }, // Zone de la table
    floor: { type: Number, default: 0 }, // Étage (0 = rez-de-chaussée)
    section: { type: String }, // Section optionnelle (ex: "Côté fenêtre")
    positionX: { type: Number }, // Position X sur le plan du restaurant
    positionY: { type: Number } // Position Y sur le plan du restaurant
  },
  
  // État et disponibilité
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'reserved', 'maintenance', 'inactive'],
    default: 'available'
  },
  isActive: { type: Boolean, default: true }, // Si la table est activée ou non
  
  // Caractéristiques de base
  features: {
    isHighTable: { type: Boolean, default: false }, // Table haute
    isBoothSeating: { type: Boolean, default: false }, // Table en alcôve
    isNearWindow: { type: Boolean, default: false }, // Près d'une fenêtre
    isAccessible: { type: Boolean, default: false }, // Accessible PMR
    /* Commenté - Fonctionnalités avancées à implémenter plus tard
    isQuiet: { type: Boolean, default: false }, // Zone calme
    isPrivate: { type: Boolean, default: false }, // Espace privatif
    hasPlugs: { type: Boolean, default: false }, // Prises électriques
    isRomantic: { type: Boolean, default: false }, // Table romantique
    isBusinessFriendly: { type: Boolean, default: false }, // Adaptée aux repas d'affaires
    isKidFriendly: { type: Boolean, default: false } // Adaptée aux enfants
    */
  },
  
  // Forme et dimensions
  shape: { type: String, enum: ['round', 'rectangular', 'square', 'oval', 'custom'], default: 'rectangular' }, // Forme de la table
  
  /* Commenté - Fonctionnalités avancées à implémenter plus tard
  dimensions: {
    width: { type: Number }, // Largeur en cm
    length: { type: Number }, // Longueur en cm
    diameter: { type: Number } // Diamètre pour tables rondes
  },
  
  // Metadonnées et divers
  minimumSpend: { type: Number }, // Dépense minimale requise (le cas échéant)
  
  // Configuration
  canBeCombined: { type: Boolean, default: false }, // Si la table peut être combinée avec d'autres
  combinableWith: [{ type: Schema.Types.ObjectId, ref: 'RestaurantTable' }], // Tables avec lesquelles elle peut être combinée
  maxReservationTime: { type: Number }, // Durée maximale de réservation en minutes
  turnoverTime: { type: Number, default: 15 }, // Temps de préparation entre deux réservations
  
  // Statistiques
  totalReservations: { type: Number, default: 0 }, // Nombre total de réservations
  averageOccupancy: { type: Number, default: 0 }, // Taux d'occupation moyen
  popularity: { type: Number, default: 0 }, // Popularité de la table (calcul interne)
  */
  
  // Gestion des réservations
  currentReservation: { type: Schema.Types.ObjectId, ref: 'Reservation' }, // Réservation actuelle
  assignedServer: { type: Schema.Types.ObjectId, ref: 'User' }, // Serveur assigné
  
  // Images
  image: { type: String }, // Photo de la table
  positionOnMap: { type: String }, // Image du plan avec la table en surbrillance
  
  // Remarques
  notes: { type: String } // Notes internes supplémentaires
}, {
  timestamps: true
});

// Indexation pour la recherche efficace
tableSchema.index({ cluster: 1, number: 1 }, { unique: true }); // Numéro de table unique par restaurant
tableSchema.index({ status: 1, isActive: 1 });
tableSchema.index({ 'location.area': 1, capacity: 1 });

// Méthode pour vérifier la disponibilité
tableSchema.methods.checkAvailability = function(date, startTime, endTime) {
  // Logique simplifiée - la table est disponible si son statut est 'available'
  return this.status === 'available';
};

// Middleware pré-sauvegarde
tableSchema.pre('save', function(next) {
  // Si le statut est "occupied", assurons-nous qu'il y a une réservation actuelle
  if (this.status === 'occupied' && !this.currentReservation) {
    console.warn(`Table ${this.number} marquée comme occupée mais sans réservation associée.`);
  }
  
  next();
});

const RestaurantTable = mongoose.model('RestaurantTable', tableSchema);
export default RestaurantTable; 