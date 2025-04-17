import mongoose from 'mongoose';
const { Schema } = mongoose;

const serviceSchema = new Schema({
  name: { type: String, required: true }, // Nom du service
  description: { type: String }, // Description du service
  price: { type: Number, required: true }, // Prix du service
  duration: { type: Number, required: true }, // Durée du service en minutes
  cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true }, // Référence au cluster offrant ce service
  available: { type: Boolean, default: true, required: true }, // Disponibilité du service pour être réservé
  color: { type: String, default: '#9E9E9E' }, // Couleur associée au service (au format hexadécimal)
}, {
  timestamps: true // Ajoute les champs createdAt et updatedAt automatiquement   
});

const Service = mongoose.model('Service', serviceSchema);
export default Service;