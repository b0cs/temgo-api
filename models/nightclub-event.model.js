import mongoose from 'mongoose';
const { Schema } = mongoose;

const nightclubEventSchema = new Schema({
  // Informations de base
  cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true }, // Boîte de nuit concernée
  name: { type: String, required: true }, // Nom de l'événement (ex: "Soirée Caraïbe")
  date: { type: Date, required: true }, // Date de l'événement
  startTime: { type: String, required: true }, // Heure de début (format "HH:MM")
  endTime: { type: String }, // Heure de fin optionnelle (format "HH:MM")
  
  // Description et thème
  description: { type: String }, // Description de l'événement
  theme: { type: String }, // Thème de l'événement (ex: "Caraïbe")
  dressCode: { type: String }, // Code vestimentaire requis
  
  // Artistes et animation
  artists: [{ 
    name: { type: String, required: true }, // Nom de l'artiste/DJ
    role: { type: String }, // Rôle (DJ principal, guest, etc.)
    startTime: { type: String }, // Heure de passage
    endTime: { type: String }, // Fin du set
    bio: { type: String }, // Courte biographie
    imageUrl: { type: String }, // Photo de l'artiste
    socialMedia: {
      instagram: { type: String },
      facebook: { type: String },
      twitter: { type: String },
      soundcloud: { type: String }
    }
  }],
  
  // Tarification
  pricing: {
    standardEntry: { 
      price: { type: Number, required: true, default: 0 }, // Prix d'entrée standard
      description: { type: String }, // Description tarif standard
      includesFeatures: [{ type: String }] // Caractéristiques incluses
    },
    vipEntry: { 
      price: { type: Number, default: 0 }, // Prix d'entrée VIP
      description: { type: String }, // Description tarif VIP 
      includesFeatures: [{ type: String }] // Caractéristiques incluses (ex: coupe-file, accès VIP, etc.)
    },
    earlyBird: {
      available: { type: Boolean, default: false },
      price: { type: Number },
      endDate: { type: Date } // Date limite pour tarif early bird
    },
    groupDiscounts: { type: Boolean, default: false }, // Réductions pour groupes
    groupDiscountDetails: { type: String } // Détails des réductions
  },
  
  // Gestion et organisation
  capacity: { type: Number }, // Capacité maximale spécifique à l'événement
  restrictions: {
    ageLimit: { type: Number, default: 18 }, // Limite d'âge
    idRequired: { type: Boolean, default: true } // Pièce d'identité requise
  },
  
  // Statut et visibilité
  status: { 
    type: String, 
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  isPublic: { type: Boolean, default: true }, // Si l'événement est visible publiquement
  isHighlighted: { type: Boolean, default: false }, // Si l'événement est mis en avant
  
  // Marketing et média
  promoImages: [{ type: String }], // Images promotionnelles
  coverImage: { type: String }, // Image principale
  promoVideo: { type: String }, // URL vidéo promo
  
  // Social et marketing
  socialMedia: {
    facebookEventUrl: { type: String },
    instagramPost: { type: String },
    hashTags: [{ type: String }]
  },
  
  // Statistiques et suivi
  stats: {
    totalAttendees: { type: Number, default: 0 }, // Nombre total de participants
    standardEntries: { type: Number, default: 0 }, // Nombre d'entrées standard
    vipEntries: { type: Number, default: 0 }, // Nombre d'entrées VIP
    revenue: { type: Number, default: 0 }, // Revenu généré
    peakTime: { type: String }, // Heure de pointe
    peakAttendance: { type: Number, default: 0 } // Nombre maximal de personnes présentes simultanément
  },
  
  // Notes internes
  internalNotes: { type: String }, // Notes pour le staff
  
  // Préparatifs et logistique
  setupNotes: { type: String }, // Instructions pour la mise en place
  securityRequirements: { type: String }, // Besoins spécifiques en sécurité
  
  // Contact organisateur
  organizer: {
    name: { type: String },
    email: { type: String },
    phone: { type: String }
  }
}, {
  timestamps: true
});

// Indexation pour recherche efficace
nightclubEventSchema.index({ cluster: 1, date: 1 });
nightclubEventSchema.index({ name: 'text', description: 'text', theme: 'text' }); // Index de texte pour la recherche

const NightclubEvent = mongoose.model('NightclubEvent', nightclubEventSchema);
export default NightclubEvent; 