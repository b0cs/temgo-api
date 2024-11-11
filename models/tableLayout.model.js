import mongoose from 'mongoose';
const { Schema } = mongoose;

const tableItemSchema = new Schema({
    number: Number,      // Number of table      
    x: Number,                   
    y: Number,                   
    width: Number,               
    height: Number,            
    space: String                
});

const layoutSchema = new Schema({
    clusterId: { type: Schema.Types.ObjectId, ref: 'Cluster' }, 
    layoutItems: [tableItemSchema],                             
    spaceName: { type: String, default: 'General' }             
});

const TableLayout = mongoose.model('TableLayout', layoutSchema);
export default TableLayout;
