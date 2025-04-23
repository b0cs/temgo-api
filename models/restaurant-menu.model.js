import mongoose from 'mongoose';
const { Schema } = mongoose;

// Schéma pour les sections du menu (ex: entrées, plats, desserts)
const menuSectionSchema = new Schema({
  name: { type: String, required: true }, // Nom de la section
  description: { type: String }, // Description optionnelle
  displayOrder: { type: Number, default: 0 }, // Ordre d'affichage
  items: [{ type: Schema.Types.ObjectId, ref: 'MenuItem' }], // Éléments inclus dans cette section
  image: { type: String }, // Image représentative de la section
  visible: { type: Boolean, default: true } // Possibilité de masquer une section temporairement
});

const menuSchema = new Schema({
  name: { type: String, required: true }, // Nom du menu (ex: "Menu du jour", "Carte Déjeuner")
  description: { type: String }, // Description du menu
  cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true }, // Restaurant associé
  
  // Gestion des périodes de validité
  isDefault: { type: Boolean, default: false }, // S'il s'agit du menu principal par défaut
  startDate: { type: Date }, // Date à partir de laquelle le menu est disponible
  endDate: { type: Date }, // Date jusqu'à laquelle le menu est disponible
  
  // Gestion des moments de la journée
  availableTimes: {
    breakfast: { type: Boolean, default: true },
    lunch: { type: Boolean, default: true },
    dinner: { type: Boolean, default: true },
    allDay: { type: Boolean, default: false } // Disponible toute la journée
  },
  
  // Heures spécifiques d'application (surcharge les valeurs par défaut)
  customTimes: {
    useCustomTimes: { type: Boolean, default: false }, // Utiliser des heures spécifiques
    startTime: { type: String }, // Heure de début (format "HH:MM")
    endTime: { type: String } // Heure de fin (format "HH:MM")
  },
  
  // Jours de la semaine où le menu est disponible
  availableDays: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: true },
    sunday: { type: Boolean, default: true }
  },
  
  // Configuration des sections du menu
  sections: [menuSectionSchema],
  
  // Prix fixe (pour menus complets)
  fixedPrice: { type: Number }, // Prix fixe pour le menu complet
  fixedPriceDescription: { type: String }, // Description du prix fixe (ex: "Entrée + Plat + Dessert")
  
  // Options spéciales
  options: [{
    name: { type: String }, // Nom de l'option (ex: "Formule midi")
    description: { type: String }, // Description de l'option
    price: { type: Number }, // Prix de cette option
    includes: [{ type: String }] // Description de ce qui est inclus
  }],
  
  // Présentation et métadonnées
  image: { type: String }, // Image du menu
  thumbnailImage: { type: String }, // Version miniature
  displayOrder: { type: Number, default: 0 }, // Ordre d'affichage parmi les menus
  isActive: { type: Boolean, default: true }, // État d'activation du menu
  
  // Informations de publication
  publishedVersion: { type: Number, default: 1 }, // Version du menu publiée
  isDraft: { type: Boolean, default: false }, // Si c'est un brouillon
  lastPublishedAt: { type: Date } // Date de dernière publication
}, {
  timestamps: true
});

// Indexation pour la recherche efficace
menuSchema.index({ cluster: 1, isActive: 1, displayOrder: 1 });
menuSchema.index({ startDate: 1, endDate: 1 });

const Menu = mongoose.model('Menu', menuSchema);
export default Menu; 