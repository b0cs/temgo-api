import express from 'express';
import {
    createMember,
    getMemberById,
    getMembersByCluster,
    getScheduleForPeriod,
    loginMember,
    updateMemberSchedule,
    addMemberAbsence,
    getAllMembersByCluster,
    deleteMember,
    getDeletedClientsByCluster
} from '../controllers/member.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import Member from '../models/member.model.js';

const memberRouter = express.Router();

// POST route for creating a new member
memberRouter.post("/", createMember);

// POST route for member login
memberRouter.post("/login", loginMember);

// GET route for fetching member by ID
memberRouter.get("/info/:memberId", getMemberById);

// GET route for fetching members by cluster
memberRouter.get("/cluster/:clusterId", getMembersByCluster);

// GET route for fetching members from all collections
memberRouter.get("/all/:clusterId", getAllMembersByCluster);

// GET route for fetching deleted clients by cluster
memberRouter.get("/deleted/:clusterId", getDeletedClientsByCluster);

// PUT route for updating a member's schedule
memberRouter.put("/schedule/:memberId", updateMemberSchedule);

// GET route to fetch schedule for a period for a member
memberRouter.get("/schedule/:memberId/period", getScheduleForPeriod);

// POST route to add an absence period for a member
memberRouter.post("/absence/:memberId", addMemberAbsence);

// Route pour mettre à jour le statut d'un membre (actif ou banni)
memberRouter.put('/:memberId/status', authMiddleware, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { status } = req.body;
    
    if (!['active', 'banned'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide. Les valeurs possibles sont: active, banned' });
    }
    
    // Chercher le membre dans la base de données
    const member = await Member.findById(memberId);
    
    if (!member) {
      return res.status(404).json({ message: 'Membre non trouvé' });
    }
    
    // Mettre à jour le statut
    member.status = status;
    await member.save();
    
    res.status(200).json({ 
      message: 'Statut du membre mis à jour avec succès', 
      member: { 
        id: member._id, 
        firstName: member.firstName, 
        lastName: member.lastName,
        status: member.status 
      }
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut du membre:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
});

// Route pour supprimer un membre
memberRouter.delete('/:memberId', authMiddleware, deleteMember);

export default memberRouter;
