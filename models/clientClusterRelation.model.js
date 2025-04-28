import mongoose from 'mongoose';

const clientClusterRelationSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true
    },
    clusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cluster',
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    preferences: {
      preferredStylists: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff'
      }],
      preferredTreatments: [String],
      notes: String
    },
    lastVisit: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Index pour rechercher rapidement les relations par client et cluster
clientClusterRelationSchema.index({ clientId: 1, clusterId: 1 }, { unique: true });
// Index pour rechercher toutes les relations d'un cluster
clientClusterRelationSchema.index({ clusterId: 1 });
// Index pour rechercher toutes les relations d'un client
clientClusterRelationSchema.index({ clientId: 1 });

const ClientClusterRelation = mongoose.model('ClientClusterRelation', clientClusterRelationSchema);

export default ClientClusterRelation; 