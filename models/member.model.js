import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
const { Schema } = mongoose;

// Schéma pour gérer les horaires journaliers des membres
const dayScheduleSchema = new Schema({
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  start: { type: String, required: true }, // Heure de début du travail
  end: { type: String, required: true },   // Heure de fin du travail
  off: { type: Boolean, default: false }   // Indique si le membre est en congé ce jour-là
});

// Schéma pour gérer les périodes d'absence des membres
const absenceSchema = new Schema({
  startDate: { type: Date, required: true }, // Date de début de l'absence
  endDate: { type: Date, required: true }    // Date de fin de l'absence
});

// Schéma principal pour les membres
const memberSchema = new Schema({
  firstName: { type: String, required: true }, // Prénom du membre
  lastName: { type: String, required: true },  // Nom de famille du membre
  email: { type: String, required: true, unique: true }, // Email, doit être unique
  phone: { type: String, unique: true }, // Téléphone, doit être unique
  passwordHash: { type: String, required: true }, // Mot de passe hashé pour la sécurité
  role: { type: String, required: true }, // Rôle du membre dans l'entreprise
  cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true }, // Référence au cluster associé
  isActive: { type: Boolean, default: true }, // Indique si le compte du membre est actif
  schedule: { // Horaire hebdomadaire détaillé par jour
    monday: dayScheduleSchema,
    tuesday: dayScheduleSchema,
    wednesday: dayScheduleSchema,
    thursday: dayScheduleSchema,
    friday: dayScheduleSchema,
    saturday: dayScheduleSchema,
    sunday: dayScheduleSchema
  },
  absences: [absenceSchema], // Liste des périodes d'absence
  loginAttempts: { type: Number, default: 0 }, // Compteur de tentatives de connexion infructueuses
  lockUntil: { type: Date }, // Date jusqu'à laquelle le compte est verrouillé en cas de trop nombreuses tentatives
  gender: {
    type: String,
    enum: ["male", "female", "other", ""],
    default: "",
  },
  status: {
    type: String,
    enum: ["active", "banned"],
    default: "active",
  },
}, {
  timestamps: true // Gère automatiquement les champs createdAt et updatedAt
});

// Middleware pour hasher le mot de passe avant de sauvegarder le document
memberSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Méthode pour vérifier le mot de passe lors de la connexion
memberSchema.methods.checkPassword = async function(password, callback) {
  const member = this;

  // Vérifie si le compte est verrouillé
  if (member.lockUntil && member.lockUntil > Date.now()) {
    return callback(new Error('Account is locked'), false);
  }

  // Vérifie si le mot de passe est correct
  const isMatch = await bcrypt.compare(password, member.passwordHash);
  if (!isMatch) {
    member.loginAttempts += 1; // Incrémente le compteur de tentatives infructueuses
    if (member.loginAttempts >= 15) {
      member.lockUntil = Date.now() + 1000 * 60 * 60 * 24; // Verrouille le compte pour 24 heures
    } else if (member.loginAttempts >= 5) {
      let lockTime = member.loginAttempts >= 10 ? 30 : 10; // Verrouille le compte pour 10 ou 30 minutes
      member.lockUntil = Date.now() + 1000 * 60 * lockTime;
    }
    await member.save(); // Sauvegarde l'état du membre
    return callback(new Error('Invalid password. Account locked if too many failed attempts.'), false);
  }

  // Réinitialise le compteur de tentatives et le verrouillage si le mot de passe est correct
  member.loginAttempts = 0;
  member.lockUntil = null;
  await member.save();
  return callback(null, member);
};

memberSchema.index({ email: 1 }); // Index pour optimiser les recherches par email
memberSchema.index({ cluster: 1 }); // Index pour optimiser les recherches par cluster

const Member = mongoose.model('Member', memberSchema);
export default Member;
