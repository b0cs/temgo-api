import mongoose from 'mongoose';
const { Schema } = mongoose;

const reviewSchema = new Schema({
  cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true }, // Référence au cluster concerné
  member: { type: Schema.Types.ObjectId, ref: 'Member' }, // Référence au membre du cluster (si applicable)
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true }, // Référence au client qui laisse l'avis
  rating: { type: Number, required: true, min: 1, max: 5 }, // Note attribuée par le client
  comment: { type: String }, // Commentaire laissé par le client
  service: { type: Schema.Types.ObjectId, ref: 'Service', required: true } // Référence au service évalué
}, {
  timestamps: true // Gère automatiquement `createdAt` et `updatedAt`
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;