import mongoose from 'mongoose';
const { Schema } = mongoose;

const serviceSchema = new Schema({
  name: { type: String, required: true }, // Nom du service
  description: { type: String }, // Description du service
  price: { type: Number, required: true }, // Prix du service
  duration: { type: Number, required: true }, // Durée du service en minutes
  available: { type: Boolean, default: true, required: true }, // Disponibilité du service pour être réservé
});

const clusterSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['HairSalon', 'BeautySalon', 'Restaurant', 'Bar', 'Cultural'] },
  address: {
    street: String,
    city: String,
    postalCode: String,
    department: String, 
    region: String 
  },
  // geolocation: {
  //   type: { type: String, enum: ['Point'], default: 'Point'},
  //   coordinates: { type: [Number], index: '2dsphere' } // Format: [longitude, latitude]
  // },
  contact: {
    phone: String,
    email: String
  },
  ownerName: { type: String, required: true }, // Nom du propriétaire du cluster
  services: [serviceSchema], // Référence aux services offerts
  reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }], // Référence aux avis laissés par les clients
  isActive: { type: Boolean, default: true, required: true }, // Indique si le cluster est actif
  customUrl: { type: String, unique: true, sparse: true }, // URL personnalisée pour le cluster, optionnellement unique
}, {
  timestamps: true // Ajoute les champs createdAt et updatedAt automatiquement
});

// Index géospatial pour supporter les requêtes basées sur la localisation
// clusterSchema.index({ geolocation: '2dsphere' });

const Cluster = mongoose.model('Cluster', clusterSchema);
export default Cluster;