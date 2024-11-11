import express from 'express';
import {
    createMember,
    getMemberById,
    getMembersByCluster,
    getScheduleForPeriod,
    loginMember,
    updateMemberSchedule,
    addMemberAbsence // Assurez-vous d'importer le nouveau contrôleur
} from '../controllers/member.controller.js';

const memberRouter = express.Router();

// POST route for creating a new member
memberRouter.post("/", createMember);

// POST route for member login
memberRouter.post("/login", loginMember);

// GET route for fetching member by ID
memberRouter.get("/info/:memberId", getMemberById);

// GET route for fetching members by cluster
memberRouter.get("/cluster/:clusterId", getMembersByCluster);

// PUT route for updating a member's schedule
memberRouter.put("/schedule/:memberId", updateMemberSchedule);

// GET route to fetch schedule for a period for a member
memberRouter.get("/schedule/:memberId/period", getScheduleForPeriod);

// POST route to add an absence period for a member
memberRouter.post("/absence/:memberId", addMemberAbsence);

export default memberRouter;
