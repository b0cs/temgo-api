import mongoose from 'mongoose';
const { Schema } = mongoose;

const appointmentSchema = new Schema({
    cluster: { type: Schema.Types.ObjectId, ref: 'Cluster', required: true },
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' }
}, { timestamps: true });

appointmentSchema.index({ startTime: 1, endTime: 1, cluster: 1, member: 1, service: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
