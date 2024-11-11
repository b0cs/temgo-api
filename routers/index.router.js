import express from 'express';
import serviceRouter from './service.router.js';
import clusterRouter from './cluster.router.js';
import memberRouter from './member.router.js';
import appointmentRouter from './appointment.router.js';
import tableLayoutRouter from './tableLayout.router.js';
import tableRouter from './table.router.js';

const router = express.Router();

// Add more router imports here if needed

router.use('/service', serviceRouter);
router.use('/appointment', appointmentRouter);
router.use("/member", memberRouter);
router.use('/cluster', clusterRouter);
router.use('/table-layout', tableLayoutRouter);
router.use('table', tableRouter);
export default router;

