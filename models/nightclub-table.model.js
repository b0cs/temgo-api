import mongoose from 'mongoose';
const { Schema } = mongoose;

const nightclubTableSchema = new Schema({
  // Informations de base
  number: { type: Number, required: true }, // Numéro de table
  name: { type: String, required: true }, // Nom de la table (ex: "VIP 1", "Ultra VIP 2")
  capacity: { type: Number, required: true }, // Nombre de places
  cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true }, // Boîte de nuit associée
  
  // Type de table
  tableType: { 
    type: String, 
    enum: ['standard', 'vip', 'ultra_vip', 'premium'], 
    required: true,
    default: 'standard'
  },
  
  // Emplacement
  location: { 
    area: { type: String, enum: ['main_floor', 'mezzanine', 'terrace', 'vip_section', 'ultra_vip_section'], default: 'main_floor' },
    floor: { type: Number, default: 0 }, // Étage (0 = rez-de-chaussée)
    section: { type: String }, // Section (ex: "Près de la piste", "Vue sur DJ")
    positionX: { type: Number }, // Position X sur le plan
    positionY: { type: Number } // Position Y sur le plan
  },
  
  // État et disponibilité
  status: { 
    type: String, 
    enum: ['available', 'reserved', 'occupied', 'maintenance', 'inactive'],
    default: 'available'
  },
  isActive: { type: Boolean, default: true }, // Si la table est activée
  
  // Tarification
  pricing: {
    minimumSpend: { type: Number }, // Dépense minimale requise
    bottleService: { type: Boolean, default: false }, // Service bouteille requis
    entryFee: { type: Number, default: 0 }, // Frais d'entrée supplémentaires
    depositRequired: { type: Boolean, default: false }, // Acompte requis
    depositAmount: { type: Number, default: 0 } // Montant de l'acompte
  },
  
  // Caractéristiques spéciales
  features: {
    hasPrivacyCurtains: { type: Boolean, default: false }, // Rideaux pour intimité
    hasPersonalSpeakers: { type: Boolean, default: false }, // Haut-parleurs privés
    hasChargingStations: { type: Boolean, default: false }, // Stations de recharge
    hasPrivateWaiter: { type: Boolean, default: false }, // Serveur dédié
    hasVIPEntrance: { type: Boolean, default: false }, // Entrée VIP dédiée
    hasLedLights: { type: Boolean, default: false } // Lumières LED personnalisées
  },
  
  // Gestion des réservations
  currentReservation: { type: Schema.Types.ObjectId, ref: 'NightclubReservation' }, // Réservation actuelle
  assignedStaff: { type: Schema.Types.ObjectId, ref: 'User' }, // Personnel assigné
  
  // Images
  image: { type: String }, // Photo de la table
  positionOnMap: { type: String }, // Position sur le plan de la boîte
  
  // Remarques
  notes: { type: String } // Notes internes
}, {
  timestamps: true
});

// Indexation pour recherche efficace
nightclubTableSchema.index({ cluster: 1, number: 1 }, { unique: true });
nightclubTableSchema.index({ tableType: 1, status: 1 });
nightclubTableSchema.index({ 'location.area': 1, capacity: 1 });

// Méthode pour vérifier la disponibilité
nightclubTableSchema.methods.isAvailable = function(date) {
  return this.status === 'available' && this.isActive;
};

const NightclubTable = mongoose.model('NightclubTable', nightclubTableSchema);
export default NightclubTable; 