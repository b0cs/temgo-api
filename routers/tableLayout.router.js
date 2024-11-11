import express from 'express';
import {
    createLayout,
    getLayoutByCluster,
    getLayoutById,
    updateLayout,
    deleteLayout
} from '../controllers/tableLayout.controller.js';

const tableLayoutRouter = express.Router();

tableLayoutRouter.get('/tables/available', findAvailableTable);

// POST route to create a new table layout
tableLayoutRouter.post('/', createLayout);

// GET route to fetch layouts by cluster
tableLayoutRouter.get('/cluster/:clusterId', getLayoutByCluster);

// GET route to fetch a specific layout by ID
tableLayoutRouter.get('/:layoutId', getLayoutById);

// PUT route to update a specific layout
tableLayoutRouter.put('/:layoutId', updateLayout);

// DELETE route to delete a specific layout
tableLayoutRouter.delete('/:layoutId', deleteLayout);

export default tableLayoutRouter;
