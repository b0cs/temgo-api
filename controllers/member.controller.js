import Member from "../models/member.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Cluster from "../models/cluster.model.js";
import Appointment from "../models/appointment.model.js";
// Need to add security in every controllers to check if the user is authorized to do the action
// Plus security from input data


dotenv.config();
export const createMember = async (req, res) => {
    const { firstName, lastName, email, phone, passwordHash, role, cluster } = req.body;
    
    try {
        const newMember = new Member({
            firstName,
            lastName,
            email,
            phone,
            passwordHash,
            role,
            cluster
        });

        const savedMember = await newMember.save();
   
        res.status(201).json({savedMember});
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

export const getMembersByCluster = async (req, res) => {
    const { clusterId } = req.params; 
    console.log("clusterId", clusterId);
    try {
        const members = await Member.find({ cluster: clusterId });
        res.status(200).json(members);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const getMemberById = async (req, res) => {
    const { memberId } = req.params;  

    try {
        const member = await Member.findById(memberId);
        res.status(200).json(member);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

export const updateMemberSchedule = async (req, res) => {
    const { memberId } = req.params;
    const { schedule } = req.body;
  
    try {
      const member = await Member.findByIdAndUpdate(memberId, {
        $set: { schedule: schedule }
      }, { new: true });
  
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.status(200).json(member);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  

  export const getScheduleForPeriod = async (req, res) => {
    const { memberId } = req.params;
    const { startDate, duration } = req.query; // startDate=2023-01-01&duration=7 for one week
  
    try {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(duration));
  
      const schedule = await Member.findOne({
        _id: memberId,
        'schedule.date': { $gte: new Date(startDate), $lt: endDate }
      }).select('schedule.$');
  
      if (!schedule) {
        return res.status(404).json({ message: "No schedule found for this period" });
      }
      res.status(200).json(schedule);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  

  export const loginMember = async (req, res) => {
    const { email, password } = req.body;

    try {
        const member = await Member.findOne({ email });
        if (!member) {
            return res.status(404).json({ message: "No member found with this email" });
        }

        member.checkPassword(password, async (error, result) => {
            if (error) {
                return res.status(403).json({ message: error.message });
            }
            if (!result) {
                return res.status(401).json({ message: 'Invalid password or account locked.' });
            }
           
        });

         // TODO: Generate a token and send it as a response instead of memberId
            
         const tokenId = await jwt.sign({ id: member._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION })
      
      res.status(200).json({ message: "Login successful", token: tokenId});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const addMemberAbsence = async (req, res) => {
  const { memberId } = req.params;
  const { startDate, endDate } = req.body;

  try {
      const member = await Member.findById(memberId);
      if (!member) {
          return res.status(404).json({ message: "Member not found" });
      }

      // Convertir les dates en objets Date
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Vérifier s'il existe un chevauchement avec les absences existantes
      const overlap = member.absences.some(absence => {
          const absStart = new Date(absence.startDate);
          const absEnd = new Date(absence.endDate);
          return (start <= absEnd && end >= absStart);
      });

      if (overlap) {
          return res.status(400).json({ message: "The requested absence period overlaps with an existing absence." });
      }

      // Vérifier si des rendez-vous sont prévus pendant cette période
      // Note: Assurez-vous que vous avez un modèle ou une méthode pour récupérer les rendez-vous d'un membre
      const appointments = await Appointment.find({
          memberId: memberId,
          date: { $gte: start, $lte: end }
      });

      if (appointments.length > 0) {
          return res.status(400).json({ message: "There are scheduled appointments during this absence period. Please reschedule or cancel them before setting the absence." });
      }

      // Ajouter la période d'absence
      member.absences.push({ startDate: start, endDate: end });
      await member.save();

      res.status(200).json({ message: "Absence added successfully", absences: member.absences });
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
};
