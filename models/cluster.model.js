import mongoose from 'mongoose';
const { Schema } = mongoose;

const serviceSchema = new Schema({
  name: { type: String, required: true }, // Nom du service
  description: { type: String }, // Description du service
  price: { type: Number, required: true }, // Prix du service
  duration: { type: Number, required: true }, // Durée du service en minutes
  available: { type: Boolean, default: true, required: true }, // Disponibilité du service pour être réservé
});

// Schéma pour les horaires d'ouverture
const businessHoursSchema = new Schema({
  monday: {
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: '09:00' },
    closeTime: { type: String, default: '18:00' },
    lunchStart: { type: String, default: '12:00' },
    lunchEnd: { type: String, default: '14:00' },
    isOpenAllDay: { type: Boolean, default: false } // Ouvert en continu (pas de pause déjeuner)
  },
  tuesday: {
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: '09:00' },
    closeTime: { type: String, default: '18:00' },
    lunchStart: { type: String, default: '12:00' },
    lunchEnd: { type: String, default: '14:00' },
    isOpenAllDay: { type: Boolean, default: false }
  },
  wednesday: {
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: '09:00' },
    closeTime: { type: String, default: '18:00' },
    lunchStart: { type: String, default: '12:00' },
    lunchEnd: { type: String, default: '14:00' },
    isOpenAllDay: { type: Boolean, default: false }
  },
  thursday: {
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: '09:00' },
    closeTime: { type: String, default: '18:00' },
    lunchStart: { type: String, default: '12:00' },
    lunchEnd: { type: String, default: '14:00' },
    isOpenAllDay: { type: Boolean, default: false }
  },
  friday: {
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: '09:00' },
    closeTime: { type: String, default: '18:00' },
    lunchStart: { type: String, default: '12:00' },
    lunchEnd: { type: String, default: '14:00' },
    isOpenAllDay: { type: Boolean, default: false }
  },
  saturday: {
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: '10:00' },
    closeTime: { type: String, default: '18:00' },
    lunchStart: { type: String, default: '12:00' },
    lunchEnd: { type: String, default: '14:00' },
    isOpenAllDay: { type: Boolean, default: false }
  },
  sunday: {
    isOpen: { type: Boolean, default: false },
    openTime: { type: String, default: '10:00' },
    closeTime: { type: String, default: '17:00' },
    lunchStart: { type: String, default: '12:00' },
    lunchEnd: { type: String, default: '14:00' },
    isOpenAllDay: { type: Boolean, default: false }
  },
  // Configuration pour les jours fériés
  holidays: {
    default: {
      isOpen: { type: Boolean, default: false }, // Fermé par défaut les jours fériés
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' },
      isOpenAllDay: { type: Boolean, default: false },
      useRegularHours: { type: Boolean, default: true } // Utiliser les horaires par défaut
    },
    // Jours fériés spécifiques
    new_year: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' },
      isOpenAllDay: { type: Boolean, default: false },
      useRegularHours: { type: Boolean, default: true }
    },
    easter_monday: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' },
      isOpenAllDay: { type: Boolean, default: false },
      useRegularHours: { type: Boolean, default: true }
    },
    labor_day: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' },
      isOpenAllDay: { type: Boolean, default: false },
      useRegularHours: { type: Boolean, default: true }
    },
    victory_day: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' },
      isOpenAllDay: { type: Boolean, default: false },
      useRegularHours: { type: Boolean, default: true }
    },
    ascension: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' },
      isOpenAllDay: { type: Boolean, default: false },
      useRegularHours: { type: Boolean, default: true }
    },
    pentecost_monday: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' },
      isOpenAllDay: { type: Boolean, default: false },
      useRegularHours: { type: Boolean, default: true }
    },
    national_day: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' },
      isOpenAllDay: { type: Boolean, default: false },
      useRegularHours: { type: Boolean, default: true }
    },
    assumption: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' },
      isOpenAllDay: { type: Boolean, default: false },
      useRegularHours: { type: Boolean, default: true }
    },
    all_saints: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' },
      isOpenAllDay: { type: Boolean, default: false },
      useRegularHours: { type: Boolean, default: true }
    },
    armistice: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' },
      isOpenAllDay: { type: Boolean, default: false },
      useRegularHours: { type: Boolean, default: true }
    },
    christmas: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: '10:00' },
      closeTime: { type: String, default: '17:00' },
      isOpenAllDay: { type: Boolean, default: false },
      useRegularHours: { type: Boolean, default: true }
    }
  }
});

// Schéma pour les réseaux sociaux
const socialMediaSchema = new Schema({
  facebook: { type: String },
  instagram: { type: String },
  twitter: { type: String },
  linkedin: { type: String },
  youtube: { type: String },
  tiktok: { type: String },
  website: { type: String }
});

const clusterSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['HairSalon', 'BeautySalon', 'Restaurant', 'Bar', 'Cultural'] },
  address: { type: String },
  geolocation: {
    type: { type: String, enum: ['Point'], default: 'Point'},
    coordinates: { type: [Number], index: '2dsphere' } // Format: [longitude, latitude]
  },
  contact: { type: String }, // Numéro de téléphone principal
  email: { type: String }, // Email du salon (nouveau champ)
  description: { type: String },
  ownerName: { type: String, required: true }, // Nom du propriétaire du cluster
  businessHours: { type: businessHoursSchema, default: () => ({}) }, // Horaires d'ouverture
  socialMedia: { type: socialMediaSchema, default: () => ({}) }, // Réseaux sociaux
  
  // Ajout du champ pour les images
  images: {
    featured: { type: String }, // Image principale/mise en avant
    gallery: [{ 
      url: { type: String, required: true }, // URL de l'image (locale ou S3)
      order: { type: Number, default: 0 }, // Ordre d'affichage
      title: { type: String }, // Titre optionnel
      description: { type: String }, // Description optionnelle
      isActive: { type: Boolean, default: true }, // Pour désactiver sans supprimer
      uploadedAt: { type: Date, default: Date.now } // Date d'ajout
    }],
    logoUrl: { type: String }, // Logo du salon
    coverUrl: { type: String }, // Image de couverture pour l'en-tête
  },
  
  services: [serviceSchema], // Référence aux services offerts
  reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }], // Référence aux avis laissés par les clients
  isActive: { type: Boolean, default: true, required: true }, // Indique si le cluster est actif
  customUrl: { type: String, unique: true, sparse: true }, // URL personnalisée pour le cluster, optionnellement unique
}, {
  timestamps: true // Ajoute les champs createdAt et updatedAt automatiquement
});

// Index géospatial pour supporter les requêtes basées sur la localisation
clusterSchema.index({ geolocation: '2dsphere' });

const Cluster = mongoose.model('Cluster', clusterSchema);
export default Cluster;