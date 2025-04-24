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

// Schéma pour les caractéristiques du restaurant
const restaurantFeaturesSchema = new Schema({
  // Ambiance et style
  cuisine: [{ type: String }], // Types de cuisine (français, italien, etc.)
  priceRange: { type: Number, min: 1, max: 5, default: 2 }, // Niveau de prix (1 = $, 5 = $$$$$)
  atmosphere: [{ type: String }], // Ambiance (décontractée, romantique, etc.)
  dresscode: { type: String, enum: ['casual', 'smart_casual', 'business_casual', 'formal', 'none'], default: 'none' },
  
  // Caractéristiques physiques
  seatingCapacity: { type: Number }, // Capacité d'accueil totale
  privateRooms: { type: Boolean, default: false }, // Salles privées disponibles
  privateRoomCapacity: { type: Number }, // Capacité des salles privées
  outdoorSeating: { type: Boolean, default: false }, // Terrasse extérieure
  barSeating: { type: Boolean, default: false }, // Places au bar
  
  // Options de restauration
  takeout: { type: Boolean, default: false }, // Vente à emporter
  delivery: { type: Boolean, default: false }, // Livraison
  catering: { type: Boolean, default: false }, // Service traiteur
  reservationsRequired: { type: Boolean, default: false }, // Réservation obligatoire
  
  // Accessibilité et confort
  wheelchairAccessible: { type: Boolean, default: false }, // Accessible aux fauteuils roulants
  childFriendly: { type: Boolean, default: true }, // Adapté aux enfants
  petFriendly: { type: Boolean, default: false }, // Animaux acceptés
  parkingAvailable: { type: Boolean, default: false }, // Parking disponible
  
  // Services et options
  wineList: { type: Boolean, default: false }, // Carte des vins
  fullBar: { type: Boolean, default: false }, // Bar complet
  corkageFee: { type: Boolean, default: false }, // Droit de bouchon
  chefTable: { type: Boolean, default: false }, // Table du chef
  privateEvents: { type: Boolean, default: false }, // Événements privés
  liveMusic: { type: Boolean, default: false }, // Musique live
  tvs: { type: Boolean, default: false }, // Télévisions
  
  // Paiement et divers
  creditCardsAccepted: [{ type: String }], // Types de cartes acceptées
  reservationPlatforms: [{ type: String }], // Plateformes de réservation utilisées
  deliveryPlatforms: [{ type: String }], // Plateformes de livraison
  
  // Certifications et distinctions
  awards: [{ 
    name: { type: String }, // Nom de la distinction
    year: { type: Number }, // Année d'obtention
    description: { type: String } // Description
  }],
  
  // Options pour les allergies et régimes alimentaires
  allergiesInfo: { type: Boolean, default: false }, // Informations sur les allergènes disponibles
  dietaryOptions: {
    vegetarian: { type: Boolean, default: false }, // Options végétariennes
    vegan: { type: Boolean, default: false }, // Options véganes
    glutenFree: { type: Boolean, default: false }, // Sans gluten
    dairyFree: { type: Boolean, default: false }, // Sans lactose
    nutFree: { type: Boolean, default: false }, // Sans fruits à coque
    halal: { type: Boolean, default: false }, // Halal
    kosher: { type: Boolean, default: false } // Casher
  },
  
  // Politique de réservation
  reservationPolicy: {
    maxPeoplePerReservation: { type: Number, default: 20 }, // Nombre max de personnes par réservation
    depositRequired: { type: Boolean, default: false }, // Acompte requis
    depositAmount: { type: Number }, // Montant de l'acompte
    cancellationPolicy: { type: String }, // Politique d'annulation
    noShowFee: { type: Boolean, default: false } // Frais en cas de non-présentation
  }
}, { _id: false });

const clusterSchema = new Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['HairSalon', 'BeautySalon', 'Restaurant', 'Bar', 'Cultural', 'Nightclub'] 
  },
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
  
  // Champs spécifiques aux restaurants
  restaurantFeatures: { 
    type: restaurantFeaturesSchema,
    default: () => ({})
  },
  
  // Données pour les salons de beauté et coiffure
  services: [serviceSchema], // Référence aux services offerts
  
  // Général
  reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }], // Référence aux avis laissés par les clients
  isActive: { type: Boolean, default: true, required: true }, // Indique si le cluster est actif
  customUrl: { type: String, unique: true, sparse: true }, // URL personnalisée pour le cluster, optionnellement unique
  
  // Si le type est une boîte de nuit, informations supplémentaires
  nightclubInfo: {
    totalCapacity: { type: Number, default: 0 }, // Capacité totale de la boîte
    currentOccupancy: { type: Number, default: 0 }, // Nombre actuel de personnes dans la boîte
    doorPolicy: { type: String }, // Politique d'entrée (description des critères)
    standardEntryFee: { type: Number, default: 0 }, // Prix d'entrée standard
    vipEntryFee: { type: Number, default: 0 }, // Prix d'entrée VIP
    occupancyHistory: [{ 
      date: { type: Date }, 
      maxOccupancy: { type: Number },
      notes: { type: String }
    }] // Historique de fréquentation pour analyse
  },
}, {
  timestamps: true // Ajoute les champs createdAt et updatedAt automatiquement
});

// Index géospatial pour supporter les requêtes basées sur la localisation
clusterSchema.index({ geolocation: '2dsphere' });

// Méthode pour vérifier si c'est un restaurant
clusterSchema.methods.isRestaurant = function() {
  return this.type === 'Restaurant' || this.type === 'Bar';
};

// Méthode pour vérifier si c'est un salon de beauté
clusterSchema.methods.isBeautySalon = function() {
  return this.type === 'HairSalon' || this.type === 'BeautySalon';
};

const Cluster = mongoose.model('Cluster', clusterSchema);
export default Cluster;