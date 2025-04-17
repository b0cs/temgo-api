import mongoose from 'mongoose';
const { Schema } = mongoose;

const appointmentSchema = new Schema({
    cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    employee: { type: Schema.Types.ObjectId, ref: 'User' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { 
        type: String, 
        enum: ['scheduled', 'completed', 'cancelled', 'no_show', 'in_progress', 'rescheduled'],
        default: 'scheduled' 
    },
    notes: { type: String }, // Notes sur le rendez-vous
    completionNotes: { type: String }, // Notes ajoutées lors de la completion du rendez-vous
    pricePaid: { type: Number }, // Prix effectivement payé (peut être différent du prix standard)
    paymentMethod: { type: String, enum: ['cash', 'card', 'transfer', 'other'] },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
    followUpRequired: { type: Boolean, default: false }, // Si un suivi est nécessaire
    followUpDate: { type: Date }, // Date suggérée pour le suivi
    rescheduledFrom: { type: Schema.Types.ObjectId, ref: 'Appointment' }, // Si ce RDV est un report d'un autre
    cancellationReason: { type: String }, // Raison d'annulation
    noShowCount: { type: Number, default: 0 }, // Nombre de fois où le client ne s'est pas présenté
}, { timestamps: true });

appointmentSchema.index({ startTime: 1, endTime: 1, cluster: 1, member: 1, service: 1 });

// Méthode pour vérifier les conflits d'horaire avec d'autres rendez-vous
appointmentSchema.statics.checkTimeConflicts = async function(employeeId, startTime, endTime, excludeId = null) {
    const query = {
        employee: employeeId,
        status: { $nin: ['cancelled', 'no_show'] },
        $or: [
            // RDV commençant pendant le nouveau RDV
            { startTime: { $gte: startTime, $lt: endTime } },
            // RDV se terminant pendant le nouveau RDV
            { endTime: { $gt: startTime, $lte: endTime } },
            // RDV englobant le nouveau RDV
            { startTime: { $lte: startTime }, endTime: { $gte: endTime } }
        ]
    };

    // Exclure le rendez-vous actuel si on met à jour un rendez-vous existant
    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    const conflictingAppointments = await this.find(query);
    return conflictingAppointments.length > 0;
};

// Middleware pour mettre à jour automatiquement le noShowCount si le statut passe à no_show
appointmentSchema.pre('save', async function(next) {
    if (this.isModified('status') && this.status === 'no_show') {
        this.noShowCount += 1;
    }
    next();
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
