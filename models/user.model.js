import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Schéma pour les heures de travail
const workHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  isWorking: {
    type: Boolean,
    default: true
  },
  startTime: {
    type: String,
    default: '09:00'
  },
  endTime: {
    type: String,
    default: '18:00'
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager', 'employee'],
    default: 'employee'
  },
  cluster: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cluster',
    required: true
  },
  permissions: {
    canManageEmployees: { type: Boolean, default: false },
    canManageServices: { type: Boolean, default: false },
    canManageAppointments: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: false },
    canManageSettings: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Nouveaux champs pour la disponibilité
  isAvailable: {
    type: Boolean,
    default: true
  },
  absenceStartDate: {
    type: Date
  },
  absenceEndDate: {
    type: Date
  },
  absenceReason: {
    type: String
  },
  // Horaires de déjeuner
  lunchStart: {
    type: String,
    default: '12:00'
  },
  lunchEnd: {
    type: String,
    default: '13:00'
  },
  // Jours et heures de travail
  workHours: {
    type: [workHoursSchema],
    default: [
      { day: 'monday', isWorking: true, startTime: '09:00', endTime: '18:00' },
      { day: 'tuesday', isWorking: true, startTime: '09:00', endTime: '18:00' },
      { day: 'wednesday', isWorking: true, startTime: '09:00', endTime: '18:00' },
      { day: 'thursday', isWorking: true, startTime: '09:00', endTime: '18:00' },
      { day: 'friday', isWorking: true, startTime: '09:00', endTime: '18:00' },
      { day: 'saturday', isWorking: true, startTime: '09:00', endTime: '16:00' },
      { day: 'sunday', isWorking: false, startTime: '00:00', endTime: '00:00' }
    ]
  },
  // Spécialités du coiffeur (références aux services du cluster)
  specialties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  // Autres champs existants
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Méthode pour comparer le mot de passe
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Middleware pour hasher le mot de passe avant l'enregistrement
userSchema.pre('save', async function(next) {
  // Hasher le mot de passe seulement s'il a été modifié ou est nouveau
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Définir les permissions par défaut basées sur le rôle
userSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    switch (this.role) {
      case 'super_admin':
        this.permissions = {
          canManageEmployees: true,
          canManageServices: true,
          canManageAppointments: true,
          canViewReports: true,
          canManageSettings: true
        };
        break;
      case 'admin':
        this.permissions = {
          canManageEmployees: true,
          canManageServices: true,
          canManageAppointments: true,
          canViewReports: true,
          canManageSettings: true
        };
        break;
      case 'manager':
        this.permissions = {
          canManageEmployees: true,
          canManageServices: true,
          canManageAppointments: true,
          canViewReports: true,
          canManageSettings: false
        };
        break;
      case 'employee':
        this.permissions = {
          canManageEmployees: false,
          canManageServices: false,
          canManageAppointments: true,
          canViewReports: false,
          canManageSettings: false
        };
        break;
    }
  }
  next();
});

// Méthode pour vérifier si un utilisateur est disponible à une date et heure spécifique
userSchema.methods.isAvailableAt = function(date, startTime, endTime) {
  // Si l'utilisateur est marqué comme non disponible
  if (!this.isAvailable) {
    return false;
  }
  
  // Vérifier si l'utilisateur est en absence
  if (this.absenceStartDate && this.absenceEndDate) {
    const appointmentDate = new Date(date);
    if (appointmentDate >= this.absenceStartDate && appointmentDate <= this.absenceEndDate) {
      return false;
    }
  }
  
  // Vérifier le jour de la semaine
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = days[new Date(date).getDay()];
  
  // Trouver les heures de travail pour ce jour
  const workDay = this.workHours.find(day => day.day === dayOfWeek);
  if (!workDay || !workDay.isWorking) {
    return false;
  }
  
  // Convertir les heures en minutes pour une comparaison facile
  const convertToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const appointmentStart = convertToMinutes(startTime);
  const appointmentEnd = convertToMinutes(endTime);
  const workStart = convertToMinutes(workDay.startTime);
  const workEnd = convertToMinutes(workDay.endTime);
  const lunchStart = convertToMinutes(this.lunchStart);
  const lunchEnd = convertToMinutes(this.lunchEnd);
  
  // Vérifier si l'heure du RDV est pendant les heures de travail
  if (appointmentStart < workStart || appointmentEnd > workEnd) {
    return false;
  }
  
  // Vérifier si l'heure du RDV chevauche la pause déjeuner
  if ((appointmentStart >= lunchStart && appointmentStart < lunchEnd) || 
      (appointmentEnd > lunchStart && appointmentEnd <= lunchEnd) ||
      (appointmentStart <= lunchStart && appointmentEnd >= lunchEnd)) {
    return false;
  }
  
  return true;
};

// Ne pas renvoyer le mot de passe lors des requêtes JSON
userSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    delete ret.password;
    return ret;
  }
});

const User = mongoose.model('User', userSchema);

export default User; 