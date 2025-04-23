import mongoose from 'mongoose';
const { Schema } = mongoose;

// Schéma pour les options et variations d'un plat
const menuItemOptionSchema = new Schema({
  name: { type: String, required: true }, // Nom de l'option (ex: "Cuisson", "Accompagnement")
  choices: [{
    name: { type: String, required: true }, // Choix possible (ex: "Saignant", "À point")
    price: { type: Number, default: 0 }, // Supplément de prix pour cette option
    available: { type: Boolean, default: true } // Disponibilité de cette option
  }],
  required: { type: Boolean, default: false }, // Si une sélection est obligatoire
  multiSelect: { type: Boolean, default: false } // Si plusieurs choix sont possibles
});

/* Commenté - Pourra être ajouté plus tard selon les besoins des restaurateurs partenaires
// Schéma pour les informations nutritionnelles
const nutritionInfoSchema = new Schema({
  calories: { type: Number },
  fat: { type: Number }, // en grammes
  carbs: { type: Number }, // en grammes
  protein: { type: Number }, // en grammes
  allergens: [{ type: String }] // Liste des allergènes
}, { _id: false });
*/

const menuItemSchema = new Schema({
  name: { type: String, required: true }, // Nom du plat
  description: { type: String }, // Description du plat
  price: { type: Number, required: true }, // Prix de base
  category: { type: String, required: true }, // Catégorie (entrée, plat, dessert, etc.)
  subCategory: { type: String }, // Sous-catégorie optionnelle
  cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true }, // Restaurant associé
  
  // Gestion de la disponibilité
  available: { type: Boolean, default: true },
  
  /* Commenté - Fonctionnalités avancées à implémenter plus tard
  availableFrom: { type: Date }, // Disponibilité à partir d'une certaine date (promotions temporaires)
  availableUntil: { type: Date }, // Disponibilité jusqu'à une certaine date
  availableTimes: { // Disponibilité selon les moments de la journée
    breakfast: { type: Boolean, default: true },
    lunch: { type: Boolean, default: true },
    dinner: { type: Boolean, default: true }
  },
  */
  
  // Images et présentation
  image: { type: String }, // URL de l'image du plat
  thumbnailImage: { type: String }, // Version miniature pour les listes
  
  // Options et personnalisation
  options: [menuItemOptionSchema],
  
  // Informations supplémentaires de base
  preparationTime: { type: Number }, // Temps de préparation en minutes
  spicyLevel: { type: Number, min: 0, max: 5, default: 0 }, // Niveau de piquant
  vegetarian: { type: Boolean, default: false },
  vegan: { type: Boolean, default: false },
  glutenFree: { type: Boolean, default: false },
  featured: { type: Boolean, default: true }, // Mise en avant sur le menu
  
  /* Commenté - Fonctionnalités avancées à implémenter plus tard
  // Informations nutritionnelles détaillées
  nutritionInfo: { type: nutritionInfoSchema, default: () => ({}) },
  
  // Gestion interne
  sku: { type: String }, // Code de référence unique
  costPrice: { type: Number }, // Prix de revient (interne)
  profitMargin: { type: Number }, // Marge bénéficiaire en pourcentage
  
  // Préférences d'affichage
  displayOrder: { type: Number, default: 0 }, // Ordre d'affichage dans la catégorie
  displayOnMenu: { type: Boolean, default: true }, // Afficher sur le menu public
  
  // Statistiques
  popularity: { type: Number, default: 0 }, // Score de popularité calculé
  totalOrders: { type: Number, default: 0 }, // Nombre total de commandes
  
  // Promotions
  discountType: { type: String, enum: ['none', 'percentage', 'fixed_amount'], default: 'none' },
  discountValue: { type: Number, default: 0 }, // Valeur de la remise (% ou montant fixe)
  discountFrom: { type: Date }, // Début de la promotion
  discountUntil: { type: Date }, // Fin de la promotion
  */
  
  // Tags et recherche
  tags: [{ type: String }], // Tags pour la recherche et le filtrage
  searchKeywords: [{ type: String }] // Mots-clés supplémentaires pour la recherche
}, {
  timestamps: true
});

// Indexation pour la recherche
menuItemSchema.index({ name: 'text', description: 'text', tags: 'text', searchKeywords: 'text' });
menuItemSchema.index({ cluster: 1, category: 1 });
menuItemSchema.index({ available: 1 });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export default MenuItem; 