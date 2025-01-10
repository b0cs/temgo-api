import express from 'express';
import {
createTable,
getTables,
getTableById,
updateTable,
deleteTable
} from '../controllers/table.controller.js';
const tableRouter = express.Router();
tableRouter.post('/tables', createTable);
tableRouter.get('/tables/:clusterId', getTables);
tableRouter.get('/tables/table/:tableId', getTableById);
tableRouter.put('/tables/table/:tableId', updateTable);
tableRouter.delete('/tables/table/:tableId', deleteTable);
export default tableRouter;