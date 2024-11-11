import mongoose from 'mongoose';
const { Schema } = mongoose;

const tableSchema = new Schema({
    number: Number,
    minCapacity: Number,
    isReserved: { type: Boolean, default: false },
    cluster: { type: Schema.Types.ObjectId, ref: 'Cluster' }
});

const Table = mongoose.model('Table', tableSchema);
export default Table;
